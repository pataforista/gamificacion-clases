import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { cleanLines } from '../utils/rng';
import { useNotifications } from './NotificationContext';

const COLORS = [
  '#00FFFF', '#FF00FF', '#FFFF00', '#FF6600', '#00FF00',
  '#FF0066', '#6666FF', '#00CCFF', '#FF9900', '#99FF00',
  '#CC00FF', '#00FFCC',
];

const POINTER_ANGLE = -Math.PI / 2; // 12 o'clock

const Ruleta = ({ items = [] }) => {
  const { alert } = useNotifications();
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const animRef = useRef(null);

  const [options, setOptions] = useState([]);
  const [inputText, setInputText] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [history, setHistory] = useState([]);

  // Sync from shared pickerItems on first load
  useEffect(() => {
    if (items.length > 0 && options.length === 0) {
      setOptions(items);
      setInputText(items.join('\n'));
    }
  }, [items]); // eslint-disable-line

  const drawWheel = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = cx - 14;
    const opts = options.length > 0 ? options : ['Sin opciones'];
    const n = opts.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw segments
    opts.forEach((opt, i) => {
      const start = rotation + i * arc;
      const end = start + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      const fontSize = Math.max(9, Math.min(14, 120 / n));
      ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
      ctx.fillStyle = '#000';
      const maxChars = Math.max(6, Math.floor(180 / n));
      const label = opt.length > maxChars ? opt.slice(0, maxChars - 1) + '…' : opt;
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 3;
      ctx.fillText(label, r - 8, fontSize / 3);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a0033';
    ctx.fill();
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer at top (12 o'clock)
    const px = cx + (r + 2) * Math.cos(POINTER_ANGLE);
    const py = cy + (r + 2) * Math.sin(POINTER_ANGLE);
    const angle = POINTER_ANGLE + Math.PI; // points inward
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(
      px + 22 * Math.cos(angle - 0.4),
      py + 22 * Math.sin(angle - 0.4)
    );
    ctx.lineTo(
      px + 22 * Math.cos(angle + 0.4),
      py + 22 * Math.sin(angle + 0.4)
    );
    ctx.closePath();
    ctx.fillStyle = '#FF00FF';
    ctx.fill();
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [options]);

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [options, drawWheel]);

  const getWinnerIndex = (rotation) => {
    const opts = options.length > 0 ? options : ['Sin opciones'];
    const n = opts.length;
    const arc = (2 * Math.PI) / n;
    // Which segment is under the pointer (POINTER_ANGLE)?
    const offset = ((POINTER_ANGLE - rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return Math.floor(offset / arc) % n;
  };

  const spin = async () => {
    if (spinning) return;
    if (options.length < 2) {
      return await alert('Faltan opciones', 'Agrega al menos 2 opciones para girar la ruleta.');
    }

    setWinner(null);
    setSpinning(true);
    // Random speed between 5 and 10 full rotations worth
    velocityRef.current = 0.22 + Math.random() * 0.15;

    const animate = () => {
      rotationRef.current += velocityRef.current;
      velocityRef.current *= 0.983;
      drawWheel(rotationRef.current);

      if (velocityRef.current > 0.002) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        const idx = getWinnerIndex(rotationRef.current);
        const won = options[idx];
        setWinner(won);
        setHistory(prev => [won, ...prev].slice(0, 8));
        setSpinning(false);
        confetti({ particleCount: 100, spread: 70, origin: { x: 0.5, y: 0.35 } });
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    setOptions(cleanLines(e.target.value));
    setWinner(null);
  };

  return (
    <div className="grid">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2>Ruleta</h2>

        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          style={{ cursor: spinning ? 'wait' : 'pointer', maxWidth: '100%' }}
          onClick={spin}
        />

        <div className="divider" style={{ width: '100%', margin: '1rem 0' }} />

        <div className="row" style={{ justifyContent: 'center', width: '100%' }}>
          <button className="btn primary" onClick={spin} disabled={spinning} style={{ flex: 1 }}>
            {spinning ? 'Girando…' : '¡Girar!'}
          </button>
          <button className="btn" onClick={() => setWinner(null)}>
            Limpiar
          </button>
        </div>

        {winner && (
          <div
            className="out"
            style={{
              color: 'var(--good)',
              marginTop: '1rem',
              textAlign: 'center',
              fontSize: '2.5rem',
              textShadow: '0 0 20px rgba(255,102,0,0.7)',
            }}
          >
            🎉 {winner}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Opciones ({options.length})</h2>
        <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Una opción por línea</label>
        <textarea
          value={inputText}
          onChange={handleTextChange}
          rows={10}
          placeholder="Escribe las opciones aquí&#10;Opción A&#10;Opción B&#10;Opción C"
          style={{ width: '100%', marginTop: '0.5rem' }}
        />

        {history.length > 0 && (
          <>
            <div className="divider" />
            <h2>Historial</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  className="smallout"
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>{h}</span>
                  <span className="muted">#{i + 1}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Ruleta;

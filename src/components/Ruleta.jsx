import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { cleanLines, RNG } from '../utils/rng';
import { useAudio } from './AudioContext';
import { useNotifications } from './NotificationContext';

const COLORS = [
  '#00D9FF', '#FF006E', '#FFD60A', '#FF9500', '#CCFF00',
  '#FF6B9D', '#8338EC', '#38B6A8', '#FF9500', '#CCFF00',
  '#8338EC', '#00D9FF',
];

const POINTER_ANGLE = -Math.PI / 2; // 12 o'clock

const Ruleta = ({ items = [] }) => {
  const { playSFX } = useAudio();
  const { alert } = useNotifications();
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const animRef = useRef(null);
  const lastIdxRef = useRef(0);

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
    ctx.strokeStyle = 'rgba(255, 0, 110, 0.3)';
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
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#FF006E';
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
    ctx.fillStyle = '#FF006E';
    ctx.fill();
    ctx.strokeStyle = '#FFD60A';
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
    // Which segment is under the pointer (POINTER_ANGLE)
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
    // Random speed using crypto RNG
    velocityRef.current = 0.22 + (RNG.int(0, 150) / 1000);

    const animate = () => {
      rotationRef.current += velocityRef.current;
      velocityRef.current *= 0.983;
      drawWheel(rotationRef.current);

      if (velocityRef.current > 0.002) {
        // Play click sound when passing segments
        const currentIdx = getWinnerIndex(rotationRef.current);
        if (currentIdx !== lastIdxRef.current) {
          playSFX('click');
          lastIdxRef.current = currentIdx;
        }
        animRef.current = requestAnimationFrame(animate);
      } else {
        const idx = getWinnerIndex(rotationRef.current);
        const won = options[idx];
        setWinner(won);
        setHistory(prev => [won, ...prev].slice(0, 8));
        setSpinning(false);
        playSFX('correct');
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
        <h2>Ruleta de Decisiones</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>Gira la ruleta para elegir un tema, una actividad o un estudiante al azar.</p>

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
import { useNotifications } from './NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  '#00D9FF', '#FF006E', '#FFD60A', '#FF9500', '#CCFF00',
  '#FF6B9D', '#8338EC', '#38B6A8', '#FF9500', '#CCFF00',
  '#8338EC', '#00D9FF',
];

const POINTER_ANGLE = -Math.PI / 2; // 12 o'clock

const Ruleta = ({ items = [] }) => {
  const { playSFX } = useAudio();
  const { alert } = useNotifications();
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const animRef = useRef(null);
  const lastIdxRef = useRef(0);

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
    ctx.strokeStyle = 'rgba(255, 0, 110, 0.3)';
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
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#FF006E';
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
    ctx.fillStyle = '#FF006E';
    ctx.fill();
    ctx.strokeStyle = '#FFD60A';
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
    // Which segment is under the pointer (POINTER_ANGLE)
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
    // Random speed using crypto RNG
    velocityRef.current = 0.22 + (RNG.int(0, 150) / 1000);

    const animate = () => {
      rotationRef.current += velocityRef.current;
      velocityRef.current *= 0.983;
      drawWheel(rotationRef.current);

      if (velocityRef.current > 0.002) {
        // Play click sound when passing segments
        const currentIdx = getWinnerIndex(rotationRef.current);
        if (currentIdx !== lastIdxRef.current) {
          playSFX('click');
          lastIdxRef.current = currentIdx;
        }
        animRef.current = requestAnimationFrame(animate);
      } else {
        const idx = getWinnerIndex(rotationRef.current);
        const won = options[idx];
        setWinner(won);
        setHistory(prev => [won, ...prev].slice(0, 8));
        setSpinning(false);
        playSFX('correct');
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
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <h2>Ruleta de Decisiones</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>Gira la ruleta para elegir un tema, una actividad o un estudiante al azar.</p>

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
          <AnimatePresence>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,213,10,0.95)',
                color: '#000',
                padding: '2rem 3rem',
                borderRadius: '30px',
                border: '5px solid #000',
                boxShadow: '0 0 50px var(--memphis-yellow)',
                zIndex: 10,
                textAlign: 'center',
                minWidth: '280px',
                pointerEvents: 'auto'
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase' }}>¡Eso cuate, el ganador es!</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '10px 0' }}>{winner}</div>
              <button className="btn primary" onClick={() => setWinner(null)}>¡Dale!</button>
            </motion.div>
          </AnimatePresence>
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

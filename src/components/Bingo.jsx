import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { RNG } from '../utils/rng';
import { useAudio } from './AudioContext';

const RANGES = [20, 30, 50, 75, 90];

const Bingo = () => {
  const { playSFX } = useAudio();
  const [maxNum, setMaxNum] = useState(30);
  const [called, setCalled] = useState([]);
  const [current, setCurrent] = useState(null);
  const [rolling, setRolling] = useState(false);
  const timerRef = useRef(null);

  const remaining = Array.from({ length: maxNum }, (_, i) => i + 1).filter(n => !called.includes(n));
  const done = remaining.length === 0;

  const draw = useCallback(() => {
    if (rolling || done) return;

    setRolling(true);
    let ticks = 0;
    const total = 12;

    timerRef.current = setInterval(() => {
      // Show random flicker during animation
      const pool = Array.from({ length: maxNum }, (_, i) => i + 1).filter(n => !called.includes(n));
      if (pool.length === 0) { clearInterval(timerRef.current); setRolling(false); return; }
      setCurrent(pool[RNG.int(0, pool.length - 1)]);
      ticks++;

      if (ticks >= total) {
        clearInterval(timerRef.current);
        // Final pick
        const finalPool = Array.from({ length: maxNum }, (_, i) => i + 1).filter(n => !called.includes(n));
        const chosen = finalPool[RNG.int(0, finalPool.length - 1)];
        setCurrent(chosen);
        setCalled(prev => [...prev, chosen]);
        setRolling(false);
        playSFX('boing');

        if (navigator.vibrate) navigator.vibrate(120);
        if (finalPool.length === 1) {
          // Last number!
          confetti({ particleCount: 200, spread: 80, origin: { x: 0.5, y: 0.4 } });
        }
      }
    }, 70);
  }, [rolling, done, called, maxNum]);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCalled([]);
    setCurrent(null);
    setRolling(false);
  };

  const handleRangeChange = (e) => {
    reset();
    setMaxNum(Number(e.target.value));
  };

  const calledSorted = [...called].sort((a, b) => a - b);

  return (
    <div className="grid">
      {/* Left: caller panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2>Bingo — Cantador</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>Genera números al azar sin repeticiones para dinámicas de bingo en clase.</p>

        <div className="row" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Rango:</span>
          {RANGES.map(r => (
            <button
              key={r}
              className={`btn${maxNum === r ? ' primary' : ''}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              onClick={() => { reset(); setMaxNum(r); }}
            >
              1–{r}
            </button>
          ))}
        </div>

        <div className="divider" />

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '160px',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current || 'none'}
              initial={{ scale: 0.5, opacity: 0, rotate: rolling ? -10 : 0 }}
              animate={{ 
                scale: rolling ? [1, 1.1, 1] : 1, 
                opacity: 1, 
                rotate: rolling ? [0, 5, -5, 0] : 0 
              }}
              transition={{ 
                duration: rolling ? 0.2 : 0.5, 
                type: "spring",
                repeat: rolling ? Infinity : 0
              }}
              className="mono"
              style={{
                fontSize: 'clamp(5rem, 18vw, 8rem)',
                fontWeight: 900,
                color: rolling ? 'var(--memphis-magenta)' : (current ? 'var(--memphis-cyan)' : 'var(--muted)'),
                textShadow: 'none',
                userSelect: 'none',
              }}
            >
              {current ?? '—'}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="divider" />

        <div className="row" style={{ justifyContent: 'center' }}>
          <button
            className="btn primary"
            onClick={draw}
            disabled={rolling || done}
            style={{ flex: 1, fontSize: '1rem', padding: '0.8rem' }}
          >
            {done ? '¡Todos sacados!' : rolling ? 'Sacando…' : '🎱 Sacar número'}
          </button>
          <button className="btn warn" onClick={reset}>
            Reiniciar
          </button>
        </div>

        <div
          className="smallout"
          style={{ marginTop: '1rem', textAlign: 'center' }}
        >
          {called.length} de {maxNum} números sacados &nbsp;·&nbsp;
          <span style={{ color: 'var(--memphis-cyan)', fontWeight: 700 }}>{remaining.length} restantes</span>
        </div>

        {/* Progress bar */}
        <div className="health-container" style={{ marginTop: '0.75rem' }}>
          <div
            className="health-bar"
            style={{ width: `${(called.length / maxNum) * 100}%` }}
          />
          <div className="health-text">
            {Math.round((called.length / maxNum) * 100)}%
          </div>
        </div>
      </div>

      {/* Right: number grid */}
      <div className="card">
        <h2>Números Cantados</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))',
            gap: '0.4rem',
            maxHeight: '480px',
            overflowY: 'auto',
          }}
        >
          {Array.from({ length: maxNum }, (_, i) => i + 1).map(n => {
            const isCalled = called.includes(n);
            const isCurrent = n === current;
            return (
              <div
                key={n}
                style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: maxNum > 50 ? '0.75rem' : '0.9rem',
                  background: isCalled
                    ? (isCurrent ? 'var(--memphis-magenta)' : 'var(--memphis-cyan)')
                    : '#FFFFFF',
                  color: isCalled ? '#FFFFFF' : 'var(--muted)',
                  border: isCurrent ? '3px solid var(--memphis-yellow)' : '2px solid var(--memphis-magenta)',
                  boxShadow: isCurrent
                    ? '4px 4px 0px rgba(255,213,10,0.4)'
                    : isCalled
                    ? 'none'
                    : 'none',
                  transition: 'all 0.25s ease',
                  userSelect: 'none',
                }}
              >
                {n}
              </div>
            );
          })}
        </div>

        {calledSorted.length > 0 && (
          <>
            <div className="divider" />
            <div className="smallout" style={{ lineHeight: '1.8' }}>
              <span className="muted">Orden de salida: </span>
              {called.join(' · ')}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Bingo;

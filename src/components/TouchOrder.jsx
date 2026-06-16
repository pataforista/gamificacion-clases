import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { RNG } from '../utils/rng';

const MEDALS = ['🥇', '🥈', '🥉'];

// Color scheme by position within a round
const posStyle = (pos, total) => {
    if (pos === 0) return { border: 'var(--primary)',  bg: 'rgba(99,102,241,0.35)',  glow: 'rgba(99,102,241,0.5)' };
    if (pos === 1) return { border: '#c0c0c0',         bg: 'rgba(192,192,192,0.2)',  glow: 'rgba(192,192,192,0.3)' };
    if (pos === 2) return { border: '#cd7f32',         bg: 'rgba(205,127,50,0.2)',   glow: 'rgba(205,127,50,0.3)' };
    if (pos === total - 1 && total > 3) return { border: '#f87171', bg: 'rgba(248,113,113,0.15)', glow: 'rgba(248,113,113,0.25)' };
    return             { border: 'var(--good)',        bg: 'rgba(45,212,191,0.2)',   glow: 'rgba(45,212,191,0.3)' };
};

const TouchOrder = ({ pickerItems = [] }) => {
    const [touches,   setTouches]   = useState({});      // { id: {x, y} }
    const [results,   setResults]   = useState({});      // { id: {turn, name} }
    const [countdown, setCountdown] = useState(null);    // 3 | 2 | 1 | null
    const [nextTurn,  setNextTurn]  = useState(1);       // next turn number to assign
    const [history,   setHistory]   = useState([]);      // [{ startTurn, count }]
    const [phase,     setPhase]     = useState('waiting'); // 'waiting' | 'counting' | 'done'

    // Refs — stable references that avoid stale closures in event handlers
    const touchesRef  = useRef({});
    const nextTurnRef = useRef(1);
    const phaseRef    = useRef('waiting');
    const padRef      = useRef(null);
    const timerRef    = useRef(null);
    const intervalRef = useRef(null);

    // Helper: keep phase state and ref in sync
    const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p); };

    // ─── Reset for next round ───────────────────────────────────────────
    const resetRound = useCallback(() => {
        setResults({});
        setPhaseSync('waiting');
    }, []);

    // ─── Cancel a running countdown ──────────────────────────────────────────
    const cancelCountdown = useCallback(() => {
        clearTimeout(timerRef.current);  timerRef.current  = null;
        clearInterval(intervalRef.current); intervalRef.current = null;
        setCountdown(null);
        setPhaseSync('waiting');
    }, []); 

    // ─── Assign turns after countdown reaches 0 ──────────────────────────────
    const assignTurns = useCallback(() => {
        timerRef.current = null;
        const ids = Object.keys(touchesRef.current);
        if (!ids.length) { setPhaseSync('waiting'); return; }

        // Random shuffle using RNG
        const shuffled = RNG.shuffle(ids);
        const startTurn = nextTurnRef.current;
        const res = {};
        
        // Pick names if available
        const names = pickerItems.length > 0 ? RNG.shuffle(pickerItems) : [];

        shuffled.forEach((id, i) => {
            res[id] = {
                turn: startTurn + i,
                name: names[i % names.length] || null,
                x: touchesRef.current[id]?.x ?? 0,
                y: touchesRef.current[id]?.y ?? 0,
            };
        });

        const newNext = startTurn + shuffled.length;
        nextTurnRef.current = newNext;

        setResults(res);
        setNextTurn(newNext);
        setHistory(h => [...h, { startTurn, count: shuffled.length, details: Object.values(res) }]);
        setCountdown(null);
        setPhaseSync('done');

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        
        // Voice announcement
        if ('speechSynthesis' in window) {
            const winner = Object.values(res).find(r => r.turn === startTurn);
            if (winner) {
                const msg = new SpeechSynthesisUtterance(`¡Eso cuate! El ganador es ${winner.name || 'el número ' + winner.turn}`);
                msg.lang = 'es-MX';
                msg.rate = 1.1;
                window.speechSynthesis.speak(msg);
            }
        }

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.5 },
            colors: ['#6366f1', '#2dd4bf', '#f59e0b'],
        });
    }, [pickerItems]); 

    // ─── Start 3-second countdown ────────────────────────────────────────────
    const startCountdown = useCallback(() => {
        if (timerRef.current) return; // already running
        setResults({});
        setCountdown(3);
        setPhaseSync('counting');

        let count = 3;
        intervalRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }, 1000);

        timerRef.current = setTimeout(assignTurns, 3000);
    }, [assignTurns]);

    // ─── Pointer event handlers ───────
    const handlePointerDown = useCallback((e) => {
        const pad = padRef.current;
        if (pad) {
            try {
                pad.setPointerCapture(e.pointerId);
            } catch { /* setPointerCapture no soportado en este navegador */ }
        }
        const t = { ...touchesRef.current };
        t[e.pointerId] = { x: e.clientX, y: e.clientY };
        touchesRef.current = t;
        setTouches({ ...t });

        // Start countdown on first pointer down
        if (phaseRef.current === 'waiting') startCountdown();
        
        // GESTURE: If 2 pointers touch in 'done' state -> reset round
        if (phaseRef.current === 'done' && Object.keys(t).length >= 2) {
            resetRound();
        }
    }, [startCountdown, resetRound]);

    const handlePointerMove = useCallback((e) => {
        const t = { ...touchesRef.current };
        if (t[e.pointerId]) {
            t[e.pointerId] = { x: e.clientX, y: e.clientY };
            touchesRef.current = t;
            setTouches({ ...t });
        }
    }, []);

    const handlePointerUp = useCallback((e) => {
        const pad = padRef.current;
        if (pad) {
            try {
                pad.releasePointerCapture(e.pointerId);
            } catch { /* setPointerCapture no soportado en este navegador */ }
        }
        const t = { ...touchesRef.current };
        delete t[e.pointerId];
        touchesRef.current = t;
        setTouches({ ...t });

        // When ALL pointers are removed:
        if (Object.keys(t).length === 0) {
            if (phaseRef.current === 'counting') {
                cancelCountdown();
            }
            // PERSISTENCE: If in 'done' state, we DO NOT reset to 'waiting' automatically.
            // The results stay until resetRound() is called.
        }
    }, [cancelCountdown]);

    useEffect(() => {
        const pad = padRef.current;
        if (!pad) return;
        pad.addEventListener('pointerdown',   handlePointerDown);
        pad.addEventListener('pointermove',   handlePointerMove);
        pad.addEventListener('pointerup',     handlePointerUp);
        pad.addEventListener('pointercancel', handlePointerUp);
        return () => {
            pad.removeEventListener('pointerdown',   handlePointerDown);
            pad.removeEventListener('pointermove',   handlePointerMove);
            pad.removeEventListener('pointerup',     handlePointerUp);
            pad.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [handlePointerDown, handlePointerMove, handlePointerUp]);

    useEffect(() => () => {
        clearTimeout(timerRef.current);
        clearInterval(intervalRef.current);
    }, []);

    const resetAll = () => {
        cancelCountdown();
        touchesRef.current  = {};
        nextTurnRef.current = 1;
        setTouches({});
        setResults({});
        setHistory([]);
        setNextTurn(1);
    };

    const touchCount  = Object.keys(touches).length;
    const hasHistory  = history.length > 0;
    const sortedResults = useMemo(() => 
        Object.values(results).sort((a, b) => a.turn - b.turn), 
    [results]);

    // Responsive circle calculation
    const padWidth = padRef.current?.clientWidth || 400;
    const baseSize = Math.max(90, padWidth * 0.15);
    const winnerSize = baseSize * 1.5;

    const activeDots = phase === 'done'
        ? Object.entries(results).map(([id, res]) => ({ id, pos: { x: res.x, y: res.y }, res }))
        : Object.entries(touches).map(([id, t]) => ({ id, pos: t, res: results[id] }));

    return (
        <div className="grid">
            <div className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Orden por toque</h2>
                    <div className="row">
                        {phase === 'done' && (
                             <button className="btn primary good" onClick={resetRound}>
                                Siguiente Ronda
                            </button>
                        )}
                        {nextTurn > 1 && (
                            <button className="btn warn" onClick={resetAll} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                                ↺ Reiniciar todo
                            </button>
                        )}
                    </div>
                </div>

                <div
                    ref={padRef}
                    style={{
                        position: 'relative',
                        background: 'var(--bg)',
                        height: 'clamp(260px, 55vmin, 450px)',
                        borderRadius: '24px',
                        border: phase === 'counting' ? '3px dashed var(--primary)'
                              : phase === 'done'     ? '3px solid var(--good)'
                              :                        '3px dashed var(--line)',
                        overflow: 'hidden',
                        touchAction: 'none',
                        transition: 'border-color 0.3s ease',
                        userSelect: 'none',
                    }}
                >
                    {/* Giant Countdown Overlay */}
                    <AnimatePresence>
                        {countdown !== null && (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                key={countdown}
                                style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 'clamp(4rem, 20vmin, 12rem)', fontWeight: 900,
                                    color: 'var(--primary)', textShadow: '0 0 50px var(--primary)',
                                    pointerEvents: 'none', zIndex: 10,
                                }}
                            >
                                {countdown}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Podium Summary Overlay */}
                    <AnimatePresence>
                        {phase === 'done' && sortedResults.length > 0 && (
                            <motion.div
                                initial={{ y: -100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="podium-overlay"
                                style={{
                                    position: 'absolute', top: '8%', left: '50%',
                                    transform: 'translateX(-50%)', zIndex: 20,
                                    background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
                                    padding: '1rem 1.4rem', borderRadius: '20px',
                                    border: '2px solid var(--primary)', textAlign: 'center',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    maxWidth: 'min(340px, 88vw)', width: 'max-content',
                                    maxHeight: '75%', overflowY: 'auto',
                                }}
                            >
                                <h3 style={{ marginBottom: '0.75rem', color: 'var(--primary)', letterSpacing: '0.08em', fontSize: '0.95rem' }}>🏆 TURNO ASIGNADO</h3>
                                {sortedResults.map((res, i) => {
                                    const isFirst = i === 0;
                                    const isLast  = i === sortedResults.length - 1 && sortedResults.length > 1;
                                    return (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            fontSize: isFirst ? '1.3rem' : '0.95rem', fontWeight: 900,
                                            marginBottom: '0.35rem', opacity: isLast && !isFirst ? 0.75 : 1,
                                        }}>
                                            <span>{i < 3 ? MEDALS[i] : isLast ? '🔴' : '🎯'}</span>
                                            <span style={{ color: isFirst ? '#fbbf24' : isLast ? '#f87171' : 'white', flex: 1, textAlign: 'left' }}>
                                                {res.name || `Turno #${res.turn}`}
                                            </span>
                                            {isFirst && (
                                                <span style={{ fontSize: '0.55rem', background: 'rgba(250,204,21,0.2)', color: '#fbbf24', padding: '2px 5px', borderRadius: '4px', fontWeight: 900, whiteSpace: 'nowrap' }}>
                                                    PRIMERO
                                                </span>
                                            )}
                                            {isLast && (
                                                <span style={{ fontSize: '0.55rem', background: 'rgba(248,113,113,0.15)', color: '#f87171', padding: '2px 5px', borderRadius: '4px', fontWeight: 900, whiteSpace: 'nowrap' }}>
                                                    ÚLTIMO
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                <button className="btn primary good" style={{ marginTop: '0.75rem', width: '100%' }} onClick={resetRound}>
                                    LISTO PARA OTRA
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Empty-state hint */}
                    {touchCount === 0 && phase === 'waiting' && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '0.75rem', color: 'var(--muted)',
                            pointerEvents: 'none', opacity: 0.6,
                        }}>
                            <span style={{ fontSize: '4.5rem', animation: 'pulse 2s infinite' }}>👆</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                {hasHistory ? `Próximo: #${nextTurn}` : 'Coloca tus dedos para sortear'}
                            </span>
                        </div>
                    )}

                    {/* Touch dots — rendered from results when done (persist after lifting fingers) */}
                    <AnimatePresence>
                        {activeDots.map(({ id, pos, res }) => {
                            const rect = padRef.current?.getBoundingClientRect();
                            if (!rect) return null;

                            const hasTurn    = res !== undefined;
                            const turnNum    = hasTurn ? res.turn : -1;
                            const posInRound = hasTurn ? sortedResults.findIndex(r => r.turn === turnNum) : -1;
                            const total      = sortedResults.length;
                            const isLast     = hasTurn && posInRound === total - 1 && total > 1;
                            const styles     = hasTurn ? posStyle(posInRound, total) : null;

                            const isWinner  = posInRound === 0;
                            const finalSize = hasTurn ? (isWinner ? winnerSize : baseSize) : baseSize * 0.8;

                            return (
                                <motion.div
                                    key={id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: 1,
                                        opacity: 1,
                                        left: pos.x - rect.left,
                                        top: pos.y - rect.top,
                                        width: finalSize,
                                        height: finalSize,
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                        scale: { type: 'spring', stiffness: 300, damping: 20 },
                                        default: { duration: 0.2 }
                                    }}
                                    style={{
                                        position:     'absolute',
                                        borderRadius: '50%',
                                        border:       hasTurn
                                                        ? `${isWinner ? '6px' : '4px'} solid ${styles.border}`
                                                        : '3px solid rgba(255,255,255,0.4)',
                                        transform:    'translate(-50%, -50%)',
                                        background:   hasTurn ? styles.bg : 'rgba(255,255,255,0.1)',
                                        boxShadow:    hasTurn
                                                        ? `0 0 ${isWinner ? '60px' : '40px'} ${styles.glow}`
                                                        : 'none',
                                        display:      'flex',
                                        flexDirection:'column',
                                        alignItems:   'center',
                                        justifyContent:'center',
                                        gap:          '2px',
                                        pointerEvents:'none',
                                        zIndex:       isWinner ? 5 : 2,
                                        animation:    isWinner ? 'winner-glow-pulsar 2s infinite' : 'none'
                                    }}
                                >
                                    {hasTurn && (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -20 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                                        >
                                            <span style={{ fontSize: isWinner ? '2.5rem' : '1.6rem', lineHeight: 1 }}>
                                                {posInRound < 3 ? MEDALS[posInRound] : isLast ? '🔴' : '🎯'}
                                            </span>
                                            <span style={{
                                                color: '#fff', fontWeight: 900,
                                                fontSize: isWinner ? '1.3rem' : '0.9rem',
                                                lineHeight: 1, textAlign: 'center', padding: '0 5px'
                                            }}>
                                                {res.name || `#${res.turn}`}
                                            </span>
                                            {isWinner && (
                                                <span style={{ fontSize: '0.55rem', color: '#fbbf24', fontWeight: 900, letterSpacing: '0.05em' }}>
                                                    ¡PRIMERO!
                                                </span>
                                            )}
                                            {isLast && (
                                                <span style={{ fontSize: '0.55rem', color: '#f87171', fontWeight: 900, letterSpacing: '0.05em' }}>
                                                    ÚLTIMO
                                                </span>
                                            )}
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                <div className="smallout" style={{ marginTop: '1rem' }}>
                    {phase === 'done'
                        ? '✅ Resultados fijados. Pulsa "Siguiente Ronda" o toca con 2 dedos para reiniciar.'
                        : phase === 'counting'
                        ? '⏳ ¡No te muevas! Calculando justicia...'
                        : 'Mantén los dedos presionados 3 segundos para asignar turnos.'}
                </div>
            </div>

            {/* ── History panel ─────────────── */}
            {hasHistory && (
                <div className="card">
                    <h2>Historial de Rondas</h2>
                    <div className="orderlist">
                        {history.slice().reverse().map(({ count, details }, ri) => (
                            <div key={ri} style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--line)',
                                borderRadius: '16px',
                                marginBottom: '1rem'
                            }}>
                                <div className="muted" style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                                    RONDA {history.length - ri} · {count} PARTICIPANTES
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {details.map((res, i) => (
                                        <span key={i} className="pill" style={{ 
                                            background: i === 0 ? 'rgba(99,102,241,0.2)' : 'var(--bg-secondary)',
                                            border: `1px solid ${i === 0 ? 'var(--primary)' : 'var(--line)'}`,
                                            fontWeight: 800
                                        }}>
                                            {i < 3 ? MEDALS[i] : '🎯'} {res.name || `#${res.turn}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TouchOrder;

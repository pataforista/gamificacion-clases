import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { RNG } from '../utils/rng';

const MEDALS = ['🥇', '🥈', '🥉'];

// Color scheme by position within a round
const posStyle = (pos) => {
    if (pos === 0) return { border: 'var(--primary)',  bg: 'rgba(99,102,241,0.35)',  glow: 'rgba(99,102,241,0.5)' };
    if (pos === 1) return { border: '#c0c0c0',         bg: 'rgba(192,192,192,0.2)',  glow: 'rgba(192,192,192,0.3)' };
    if (pos === 2) return { border: '#cd7f32',         bg: 'rgba(205,127,50,0.2)',   glow: 'rgba(205,127,50,0.3)' };
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
                name: names[i % names.length] || null
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

    // ─── Touch event handlers ───────
    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        const t = { ...touchesRef.current };
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            t[touch.identifier] = { x: touch.clientX, y: touch.clientY };
        }
        touchesRef.current = t;
        setTouches({ ...t });

        // Start countdown on first finger down
        if (phaseRef.current === 'waiting') startCountdown();
        
        // GESTURE: If 2 fingers touch in 'done' state -> reset round
        if (phaseRef.current === 'done' && Object.keys(t).length >= 2) {
            resetRound();
        }
    }, [startCountdown, resetRound]);

    const handleTouchMove = useCallback((e) => {
        e.preventDefault();
        const t = { ...touchesRef.current };
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (t[touch.identifier]) {
                t[touch.identifier] = { x: touch.clientX, y: touch.clientY };
            }
        }
        touchesRef.current = t;
        setTouches({ ...t });
    }, []);

    const handleTouchEnd = useCallback((e) => {
        e.preventDefault();
        const t = { ...touchesRef.current };
        for (let i = 0; i < e.changedTouches.length; i++) {
            delete t[e.changedTouches[i].identifier];
        }
        touchesRef.current = t;
        setTouches({ ...t });

        // When ALL fingers are removed:
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
        pad.addEventListener('touchstart',  handleTouchStart, { passive: false });
        pad.addEventListener('touchmove',   handleTouchMove,  { passive: false });
        pad.addEventListener('touchend',    handleTouchEnd,   { passive: false });
        pad.addEventListener('touchcancel', handleTouchEnd,   { passive: false });
        return () => {
            pad.removeEventListener('touchstart',  handleTouchStart);
            pad.removeEventListener('touchmove',   handleTouchMove);
            pad.removeEventListener('touchend',    handleTouchEnd);
            pad.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

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
                        background: '#0a0a0b',
                        height: '450px',
                        borderRadius: '24px',
                        border: phase === 'counting' ? '2px dashed var(--primary)'
                              : phase === 'done'     ? '2px solid var(--good)'
                              :                        '2px dashed #444',
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
                                    fontSize: '12rem', fontWeight: 900,
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
                                    position: 'absolute', top: '10%', left: '50%',
                                    transform: 'translateX(-50%)', zIndex: 20,
                                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                                    padding: '1.5rem 2rem', borderRadius: '24px',
                                    border: '2px solid var(--primary)', textAlign: 'center',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)', minWidth: '280px'
                                }}
                            >
                                <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', letterSpacing: '0.1em' }}>🏆 PODIO DE TURNO</h3>
                                {sortedResults.slice(0, 3).map((res, i) => (
                                    <div key={i} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '1rem', 
                                        fontSize: i === 0 ? '1.8rem' : '1.2rem', fontWeight: 900,
                                        marginBottom: '0.5rem', justifyContent: 'center'
                                    }}>
                                        <span>{MEDALS[i]}</span>
                                        <span style={{ color: i === 0 ? 'var(--good)' : 'white' }}>
                                            {res.name || `Turno #${res.turn}`}
                                        </span>
                                    </div>
                                ))}
                                <button className="btn primary good" style={{ marginTop: '1rem', width: '100%' }} onClick={resetRound}>
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
                            gap: '0.75rem', color: 'rgba(255,255,255,0.15)',
                            pointerEvents: 'none',
                        }}>
                            <span style={{ fontSize: '4.5rem', animation: 'pulse 2s infinite' }}>👆</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                {hasHistory ? `Próximo: #${nextTurn}` : 'Coloca tus dedos para sortear'}
                            </span>
                        </div>
                    )}

                    {/* Touch dots */}
                    <AnimatePresence>
                        {Object.entries(touches).map(([id, t]) => {
                            const rect = padRef.current?.getBoundingClientRect();
                            if (!rect) return null;

                            const res        = results[id];
                            const hasTurn    = res !== undefined;
                            const turnNum    = hasTurn ? res.turn : -1;
                            const posInRound = hasTurn ? sortedResults.findIndex(r => r.turn === turnNum) : -1;
                            const styles     = hasTurn ? posStyle(posInRound) : null;

                            const isWinner = posInRound === 0;
                            const finalSize = hasTurn ? (isWinner ? winnerSize : baseSize) : baseSize * 0.8;

                            return (
                                <motion.div
                                    key={id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ 
                                        scale: 1, 
                                        opacity: 1,
                                        left: t.x - rect.left,
                                        top: t.y - rect.top,
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
                                        gap:          '4px',
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
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                        >
                                            <span style={{ fontSize: isWinner ? '3rem' : '1.8rem', lineHeight: 1 }}>
                                                {posInRound < 3 ? MEDALS[posInRound] : '🎯'}
                                            </span>
                                            <span style={{
                                                color: '#fff', fontWeight: 900,
                                                fontSize: isWinner ? '1.5rem' : '1rem',
                                                lineHeight: 1, textAlign: 'center', padding: '0 5px'
                                            }}>
                                                {res.name || `#${res.turn}`}
                                            </span>
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
                        {history.slice().reverse().map(({ startTurn, count, details }, ri) => (
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

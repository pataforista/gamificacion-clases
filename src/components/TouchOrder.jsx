import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

const MEDALS = ['🥇', '🥈', '🥉'];

// Color scheme by position within a round
const posStyle = (pos) => {
    if (pos === 0) return { border: 'var(--primary)',  bg: 'rgba(99,102,241,0.35)',  glow: 'rgba(99,102,241,0.5)' };
    if (pos === 1) return { border: '#c0c0c0',         bg: 'rgba(192,192,192,0.2)',  glow: 'rgba(192,192,192,0.3)' };
    if (pos === 2) return { border: '#cd7f32',         bg: 'rgba(205,127,50,0.2)',   glow: 'rgba(205,127,50,0.3)' };
    return             { border: 'var(--good)',        bg: 'rgba(45,212,191,0.2)',   glow: 'rgba(45,212,191,0.3)' };
};

const TouchOrder = () => {
    const [touches,   setTouches]   = useState({});      // { id: {x, y} }
    const [results,   setResults]   = useState({});      // { id: globalTurnNum }
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

    // ─── Cancel a running countdown ──────────────────────────────────────────
    const cancelCountdown = useCallback(() => {
        clearTimeout(timerRef.current);  timerRef.current  = null;
        clearInterval(intervalRef.current); intervalRef.current = null;
        setCountdown(null);
        setPhaseSync('waiting');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Assign turns after countdown reaches 0 ──────────────────────────────
    const assignTurns = useCallback(() => {
        timerRef.current = null;
        const ids = Object.keys(touchesRef.current);
        if (!ids.length) { setPhaseSync('waiting'); return; }

        // Random shuffle
        const shuffled = [...ids].sort(() => Math.random() - 0.5);
        const startTurn = nextTurnRef.current;
        const res = {};
        shuffled.forEach((id, i) => { res[id] = startTurn + i; });

        const newNext = startTurn + shuffled.length;
        nextTurnRef.current = newNext;

        setResults(res);
        setNextTurn(newNext);
        setHistory(h => [...h, { startTurn, count: shuffled.length }]);
        setCountdown(null);
        setPhaseSync('done');

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        confetti({
            particleCount: 60,
            spread: 55,
            origin: { y: 0.55 },
            colors: ['#6366f1', '#2dd4bf', '#f59e0b'],
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    // ─── Touch event handlers (stable refs so listeners are added once) ───────
    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        const t = { ...touchesRef.current };
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            t[touch.identifier] = { x: touch.clientX, y: touch.clientY };
        }
        touchesRef.current = t;
        setTouches({ ...t });
        // Start countdown on first finger down (any count ≥ 1)
        if (phaseRef.current === 'waiting') startCountdown();
    }, [startCountdown]);

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
                // Fingers lifted mid-countdown → cancel
                cancelCountdown();
            } else if (phaseRef.current === 'done') {
                // Fingers lifted after results shown → ready for next round
                setResults({});
                setPhaseSync('waiting');
            }
        }
    }, [cancelCountdown]);

    // Register event listeners once on mount
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

    // Cleanup timers on unmount
    useEffect(() => () => {
        clearTimeout(timerRef.current);
        clearInterval(intervalRef.current);
    }, []);

    // ─── Reset everything ────────────────────────────────────────────────────
    const resetAll = () => {
        cancelCountdown();
        touchesRef.current  = {};
        nextTurnRef.current = 1;
        setTouches({});
        setResults({});
        setHistory([]);
        setNextTurn(1);
    };

    // Derived values for rendering
    const touchCount  = Object.keys(touches).length;
    const hasHistory  = history.length > 0;
    // Sorted turn numbers in the current round (for computing position/medal)
    const sortedTurns = Object.values(results).sort((a, b) => a - b);

    return (
        <div className="grid">

            {/* ── Main pad card ─────────────────────────────────────────── */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Orden por toque</h2>
                    {nextTurn > 1 && (
                        <button className="btn warn" onClick={resetAll} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                            ↺ Reiniciar todo
                        </button>
                    )}
                </div>

                {/* Next-turn indicator */}
                {nextTurn > 1 && (
                    <div style={{
                        marginBottom: '1rem', padding: '0.5rem 1rem', borderRadius: '12px',
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                        fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600,
                    }}>
                        Siguiente turno a asignar: <strong>#{nextTurn}</strong>
                    </div>
                )}

                {/* Touch pad */}
                <div
                    ref={padRef}
                    style={{
                        position: 'relative',
                        background: '#0a0a0b',
                        height: '380px',
                        borderRadius: '24px',
                        border: phase === 'counting' ? '1px dashed var(--primary)'
                              : phase === 'done'     ? '1px solid var(--good)'
                              :                        '1px dashed #444',
                        overflow: 'hidden',
                        touchAction: 'none',
                        transition: 'border-color 0.3s ease',
                        userSelect: 'none',
                    }}
                >
                    {/* Big countdown number in background */}
                    {countdown !== null && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9rem', fontWeight: 900,
                            color: 'rgba(99,102,241,0.18)',
                            pointerEvents: 'none', zIndex: 1,
                        }}>
                            {countdown}
                        </div>
                    )}

                    {/* Empty-state hint */}
                    {touchCount === 0 && phase === 'waiting' && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '0.75rem', color: 'rgba(255,255,255,0.15)',
                            pointerEvents: 'none',
                        }}>
                            <span style={{ fontSize: '3.5rem' }}>👆</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                {hasHistory ? `Próximo turno: #${nextTurn}` : 'Pon uno o más dedos aquí'}
                            </span>
                        </div>
                    )}

                    {/* Touch dots */}
                    {Object.entries(touches).map(([id, t]) => {
                        const rect = padRef.current?.getBoundingClientRect();
                        if (!rect) return null;

                        const turn       = results[id];
                        const hasTurn    = turn !== undefined;
                        const posInRound = hasTurn ? sortedTurns.indexOf(turn) : -1;
                        const styles     = hasTurn ? posStyle(posInRound) : null;

                        return (
                            <div
                                key={id}
                                style={{
                                    position:     'absolute',
                                    left:         t.x - rect.left,
                                    top:          t.y - rect.top,
                                    width:        hasTurn ? '112px' : '78px',
                                    height:       hasTurn ? '112px' : '78px',
                                    borderRadius: '50%',
                                    border:       hasTurn
                                                    ? `3px solid ${styles.border}`
                                                    : '2px solid rgba(255,255,255,0.28)',
                                    transform:    'translate(-50%, -50%)',
                                    background:   hasTurn ? styles.bg : 'rgba(255,255,255,0.07)',
                                    boxShadow:    hasTurn ? `0 0 28px ${styles.glow}` : 'none',
                                    display:      'flex',
                                    flexDirection:'column',
                                    alignItems:   'center',
                                    justifyContent:'center',
                                    gap:          '2px',
                                    transition:   'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    pointerEvents:'none',
                                    zIndex:       2,
                                }}
                            >
                                {hasTurn ? (
                                    <>
                                        <span style={{ fontSize: posInRound === 0 ? '1.8rem' : '1.3rem', lineHeight: 1 }}>
                                            {posInRound < 3 ? MEDALS[posInRound] : '🎯'}
                                        </span>
                                        <span style={{
                                            color: '#fff', fontWeight: 900,
                                            fontSize: posInRound === 0 ? '1.5rem' : '1.1rem',
                                            lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                                        }}>
                                            #{turn}
                                        </span>
                                    </>
                                ) : countdown !== null ? (
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.2rem', fontWeight: 700 }}>
                                        {countdown}
                                    </span>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <div className="smallout" style={{ marginTop: '1rem' }}>
                    {phase === 'done'
                        ? '✅ ¡Turnos asignados! Retira los dedos para continuar con la siguiente ronda.'
                        : phase === 'counting'
                        ? '⏳ ¡Mantén los dedos quietos…!'
                        : hasHistory
                        ? '↩ Los turnos se acumulan entre rondas. Pulsa "Reiniciar todo" para empezar de cero.'
                        : 'Coloca uno o más dedos y mantén 3 segundos para asignar turnos de forma aleatoria.'}
                </div>
            </div>

            {/* ── History panel (appears after first round) ─────────────── */}
            {hasHistory && (
                <div className="card">
                    <h2>Historial · {nextTurn - 1} turno{nextTurn > 2 ? 's' : ''} asignado{nextTurn > 2 ? 's' : ''}</h2>
                    <div className="orderlist">
                        {history.map(({ startTurn, count }, ri) => (
                            <div key={ri} style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--line)',
                                borderRadius: '14px',
                            }}>
                                <div style={{
                                    fontSize: '0.72rem', color: 'var(--muted)',
                                    fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem',
                                }}>
                                    Ronda {ri + 1} · {count} {count === 1 ? 'participante' : 'participantes'}
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {Array.from({ length: count }, (_, i) => {
                                        const t = startTurn + i;
                                        return (
                                            <span key={i} style={{
                                                padding: '0.28rem 0.65rem',
                                                borderRadius: '8px',
                                                background: i === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${i === 0 ? 'var(--primary)' : 'var(--line)'}`,
                                                fontSize: '0.85rem', fontWeight: 700,
                                                color: i === 0 ? 'var(--primary)' : 'var(--text)',
                                            }}>
                                                {i < 3 ? MEDALS[i] : '🎯'} #{t}
                                            </span>
                                        );
                                    })}
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

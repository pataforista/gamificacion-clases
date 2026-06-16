import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { RNG } from '../utils/rng';

const COLOR_WINNER = { border: '#fbbf24', bg: 'rgba(251,191,36,0.25)', glow: 'rgba(251,191,36,0.6)' };
const COLOR_LOSER  = { border: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', glow: 'rgba(0,0,0,0)' };

const TouchOrderUneven = ({ pickerItems = [] }) => {
    const [winnerLabel, setWinnerLabel] = useState('Sale');
    const [loserLabel,  setLoserLabel]  = useState('Se queda');

    const [touches,   setTouches]   = useState({});
    const [results,   setResults]   = useState({});   // { id: { group:'winner'|'loser', name, x, y } }
    const [countdown, setCountdown] = useState(null);
    const [phase,     setPhase]     = useState('waiting');
    const [history,   setHistory]   = useState([]);

    const touchesRef  = useRef({});
    const phaseRef    = useRef('waiting');
    const padRef      = useRef(null);
    const timerRef    = useRef(null);
    const intervalRef = useRef(null);

    const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p); };

    const resetRound = useCallback(() => {
        setResults({});
        setPhaseSync('waiting');
    }, []);

    const cancelCountdown = useCallback(() => {
        clearTimeout(timerRef.current);     timerRef.current   = null;
        clearInterval(intervalRef.current); intervalRef.current = null;
        setCountdown(null);
        setPhaseSync('waiting');
    }, []);

    const assignGroups = useCallback(() => {
        timerRef.current = null;
        const ids = Object.keys(touchesRef.current);
        if (!ids.length) { setPhaseSync('waiting'); return; }

        const shuffled = RNG.shuffle(ids);
        const names    = pickerItems.length > 0 ? RNG.shuffle([...pickerItems]) : [];

        const res = {};
        shuffled.forEach((id, i) => {
            res[id] = {
                group: i === 0 ? 'winner' : 'loser',
                name:  names[i] || null,
                x:     touchesRef.current[id]?.x ?? 0,
                y:     touchesRef.current[id]?.y ?? 0,
            };
        });

        const winner = Object.values(res).find(r => r.group === 'winner');
        const losers = Object.values(res).filter(r => r.group === 'loser');

        setResults(res);
        setHistory(h => [...h, { count: ids.length, winnerLabel, loserLabel, winner, losers }]);
        setCountdown(null);
        setPhaseSync('done');

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        if ('speechSynthesis' in window && winner) {
            const msg = new SpeechSynthesisUtterance(`¡${winner.name || winnerLabel}!`);
            msg.lang = 'es-MX'; msg.rate = 1.0;
            window.speechSynthesis.speak(msg);
        }

        confetti({ particleCount: 120, spread: 70, origin: { y: 0.5 }, colors: ['#fbbf24', '#6366f1', '#2dd4bf'] });
    }, [pickerItems, winnerLabel, loserLabel]);

    const startCountdown = useCallback(() => {
        if (timerRef.current) return;
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

        timerRef.current = setTimeout(assignGroups, 3000);
    }, [assignGroups]);

    const handlePointerDown = useCallback((e) => {
        const pad = padRef.current;
        if (pad) { try { pad.setPointerCapture(e.pointerId); } catch {} }
        const t = { ...touchesRef.current, [e.pointerId]: { x: e.clientX, y: e.clientY } };
        touchesRef.current = t;
        setTouches({ ...t });

        if (phaseRef.current === 'waiting') startCountdown();
        if (phaseRef.current === 'done' && Object.keys(t).length >= 2) resetRound();
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
        if (pad) { try { pad.releasePointerCapture(e.pointerId); } catch {} }
        const t = { ...touchesRef.current };
        delete t[e.pointerId];
        touchesRef.current = t;
        setTouches({ ...t });

        if (Object.keys(t).length === 0 && phaseRef.current === 'counting') cancelCountdown();
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
        touchesRef.current = {};
        setTouches({});
        setResults({});
        setHistory([]);
    };

    const touchCount   = Object.keys(touches).length;
    const hasHistory   = history.length > 0;
    const winnerResult = useMemo(() => Object.values(results).find(r => r.group === 'winner'), [results]);
    const loserResults = useMemo(() => Object.values(results).filter(r => r.group === 'loser'), [results]);

    const padWidth   = padRef.current?.clientWidth || 400;
    const baseSize   = Math.max(80, padWidth * 0.13);
    const winnerSize = baseSize * 1.8;

    const activeDots = phase === 'done'
        ? Object.entries(results).map(([id, res]) => ({ id, pos: { x: res.x, y: res.y }, res }))
        : Object.entries(touches).map(([id, t]) => ({ id, pos: t, res: results[id] }));

    return (
        <div className="grid">
            <div className="card" style={{ position: 'relative' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Dedo Disparejo</h2>
                    <div className="row">
                        {phase === 'done' && (
                            <button className="btn primary good" onClick={resetRound}>Siguiente Ronda</button>
                        )}
                        {hasHistory && (
                            <button className="btn warn" onClick={resetAll} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                                ↺ Reiniciar todo
                            </button>
                        )}
                    </div>
                </div>

                {/* Labels config */}
                <div style={{
                    display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem',
                    padding: '0.9rem 1.2rem', background: 'var(--bg-secondary)',
                    borderRadius: '16px', border: '1px solid var(--line)',
                    alignItems: 'flex-end',
                }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800, display: 'block', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>
                            ⭐ EL QUE SALE (1)
                        </label>
                        <input
                            type="text"
                            value={winnerLabel}
                            onChange={e => setWinnerLabel(e.target.value)}
                            style={{
                                width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px',
                                border: '2px solid #fbbf24', background: 'var(--bg)',
                                color: 'var(--fg)', fontSize: '0.9rem', fontWeight: 700,
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>
                            LOS QUE SE QUEDAN (RESTO)
                        </label>
                        <input
                            type="text"
                            value={loserLabel}
                            onChange={e => setLoserLabel(e.target.value)}
                            style={{
                                width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px',
                                border: '2px solid var(--line)', background: 'var(--bg)',
                                color: 'var(--fg)', fontSize: '0.9rem', fontWeight: 700,
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                </div>

                {/* Touch pad */}
                <div
                    ref={padRef}
                    style={{
                        position: 'relative',
                        background: 'var(--bg)',
                        height: 'clamp(260px, 55vmin, 450px)',
                        borderRadius: '24px',
                        border: phase === 'counting' ? '3px dashed var(--primary)'
                              : phase === 'done'     ? '3px solid #fbbf24'
                              :                        '3px dashed var(--line)',
                        overflow: 'hidden',
                        touchAction: 'none',
                        transition: 'border-color 0.3s ease',
                        userSelect: 'none',
                    }}
                >
                    {/* Countdown */}
                    <AnimatePresence>
                        {countdown !== null && (
                            <motion.div
                                key={countdown}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
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

                    {/* Result overlay */}
                    <AnimatePresence>
                        {phase === 'done' && winnerResult && (
                            <motion.div
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                style={{
                                    position: 'absolute', top: '6%', left: '50%',
                                    transform: 'translateX(-50%)', zIndex: 20,
                                    background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
                                    padding: '1rem 1.6rem', borderRadius: '20px',
                                    border: '2px solid #fbbf24', textAlign: 'center',
                                    boxShadow: '0 0 40px rgba(251,191,36,0.35), 0 20px 50px rgba(0,0,0,0.5)',
                                    maxWidth: 'min(320px, 88vw)', width: 'max-content',
                                    maxHeight: '78%', overflowY: 'auto',
                                }}
                            >
                                <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '0.2rem' }}>⭐</div>
                                <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.12em', marginBottom: '0.15rem' }}>
                                    {winnerLabel.toUpperCase()}
                                </div>
                                <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.7rem' }}>
                                    {winnerResult.name || '¡Ese!'}
                                </div>
                                {loserResults.length > 0 && (
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '0.5rem', marginBottom: '0.6rem' }}>
                                        <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>
                                            {loserLabel.toUpperCase()} · {loserResults.length}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {loserResults.map((r, i) => (
                                                <span key={i} style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.85rem' }}>
                                                    {r.name || `P${i + 2}`}{i < loserResults.length - 1 ? ',' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <button className="btn primary good" style={{ width: '100%' }} onClick={resetRound}>
                                    OTRA RONDA
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
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Todos ponen un dedo</span>
                            <span style={{ fontSize: '0.85rem' }}>
                                Solo 1 {winnerLabel.toLowerCase()} · el resto {loserLabel.toLowerCase()}
                            </span>
                        </div>
                    )}

                    {/* Dots — winner big & golden, losers small & grey */}
                    <AnimatePresence>
                        {activeDots.map(({ id, pos, res }) => {
                            const rect = padRef.current?.getBoundingClientRect();
                            if (!rect) return null;

                            const assigned = res !== undefined;
                            const isWinner = assigned && res.group === 'winner';
                            const colors   = assigned ? (isWinner ? COLOR_WINNER : COLOR_LOSER) : null;
                            const dotSize  = assigned ? (isWinner ? winnerSize : baseSize * 0.78) : baseSize * 0.85;

                            return (
                                <motion.div
                                    key={id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: 1,
                                        opacity: assigned && !isWinner ? 0.45 : 1,
                                        left:   pos.x - rect.left,
                                        top:    pos.y - rect.top,
                                        width:  dotSize,
                                        height: dotSize,
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                        scale:   { type: 'spring', stiffness: 300, damping: 20 },
                                        default: { duration: 0.25 },
                                    }}
                                    style={{
                                        position:      'absolute',
                                        borderRadius:  '50%',
                                        border:        assigned
                                            ? `${isWinner ? '5px' : '2px'} solid ${colors.border}`
                                            : '3px solid rgba(255,255,255,0.4)',
                                        transform:     'translate(-50%, -50%)',
                                        background:    assigned ? colors.bg : 'rgba(255,255,255,0.1)',
                                        boxShadow:     isWinner ? `0 0 60px ${colors.glow}` : 'none',
                                        display:       'flex',
                                        flexDirection: 'column',
                                        alignItems:    'center',
                                        justifyContent:'center',
                                        gap:           '2px',
                                        pointerEvents: 'none',
                                        zIndex:        isWinner ? 5 : 2,
                                        animation:     isWinner ? 'winner-glow-pulsar 2s infinite' : 'none',
                                    }}
                                >
                                    {assigned && (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -20 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                                        >
                                            {isWinner ? (
                                                <>
                                                    <span style={{ fontSize: `${winnerSize * 0.33}px`, lineHeight: 1 }}>⭐</span>
                                                    <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: `${winnerSize * 0.13}px`, lineHeight: 1, textAlign: 'center', padding: '0 4px' }}>
                                                        {res.name || winnerLabel}
                                                    </span>
                                                    <span style={{ fontSize: `${winnerSize * 0.08}px`, color: '#fbbf24', fontWeight: 900, letterSpacing: '0.05em' }}>
                                                        ¡SALE!
                                                    </span>
                                                </>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 900, fontSize: `${baseSize * 0.26}px`, lineHeight: 1 }}>
                                                    ✗
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
                    {phase === 'done' && winnerResult
                        ? `⭐ ${winnerResult.name || winnerLabel} sale · ${loserResults.length} se quedan. Toca con 2 dedos para repetir.`
                        : phase === 'counting'
                        ? '⏳ ¡No te muevas! Eligiendo al elegido...'
                        : `Todos ponen un dedo y aguantan 3 segundos · solo 1 ${winnerLabel.toLowerCase()}.`}
                </div>
            </div>

            {/* History */}
            {hasHistory && (
                <div className="card">
                    <h2>Historial</h2>
                    <div className="orderlist">
                        {history.slice().reverse().map((round, ri) => (
                            <div key={ri} style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--line)',
                                borderRadius: '16px',
                                marginBottom: '1rem',
                            }}>
                                <div className="muted" style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                                    RONDA {history.length - ri} · {round.count} DEDOS
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="pill" style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid #fbbf24', fontWeight: 800 }}>
                                        ⭐ {round.winner?.name || round.winnerLabel}
                                    </span>
                                    {round.losers.length > 0 && (
                                        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>vs</span>
                                    )}
                                    {round.losers.map((r, i) => (
                                        <span key={i} className="pill" style={{ fontWeight: 700, opacity: 0.55 }}>
                                            {r.name || `P${i + 2}`}
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

export default TouchOrderUneven;

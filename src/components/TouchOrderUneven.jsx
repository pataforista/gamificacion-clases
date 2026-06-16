import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { RNG } from '../utils/rng';

const COLOR_A = { border: 'var(--primary)', bg: 'rgba(99,102,241,0.35)', glow: 'rgba(99,102,241,0.5)' };
const COLOR_B = { border: 'var(--good)',    bg: 'rgba(45,212,191,0.25)',  glow: 'rgba(45,212,191,0.45)' };

const TouchOrderUneven = ({ pickerItems = [] }) => {
    const [groupAName,  setGroupAName]  = useState('Equipo A');
    const [groupBName,  setGroupBName]  = useState('Equipo B');
    const [groupACount, setGroupACount] = useState(1);

    const [touches,   setTouches]   = useState({});
    const [results,   setResults]   = useState({});   // { id: { group:'A'|'B', name:string|null } }
    const [countdown, setCountdown] = useState(null);
    const [phase,     setPhase]     = useState('waiting');
    const [history,   setHistory]   = useState([]);

    const touchesRef = useRef({});
    const phaseRef   = useRef('waiting');
    const padRef     = useRef(null);
    const timerRef   = useRef(null);
    const intervalRef = useRef(null);

    const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p); };

    const resetRound = useCallback(() => {
        setResults({});
        setPhaseSync('waiting');
    }, []);

    const cancelCountdown = useCallback(() => {
        clearTimeout(timerRef.current);    timerRef.current   = null;
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

        // Clamp so Group B always has at least 1 member (unless only 1 finger total)
        const clampedA = ids.length === 1
            ? 1
            : Math.min(Math.max(1, groupACount), ids.length - 1);

        const res = {};
        shuffled.forEach((id, i) => {
            res[id] = { group: i < clampedA ? 'A' : 'B', name: names[i] || null };
        });

        const snapshotA = shuffled.slice(0, clampedA).map((_, i) => res[shuffled[i]]);
        const snapshotB = shuffled.slice(clampedA).map((_, i) => res[shuffled[clampedA + i]]);

        setResults(res);
        setHistory(h => [...h, { count: ids.length, groupAName, groupBName, groupA: snapshotA, groupB: snapshotB }]);
        setCountdown(null);
        setPhaseSync('done');

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        confetti({ particleCount: 80, spread: 65, origin: { y: 0.5 }, colors: ['#6366f1', '#2dd4bf', '#f59e0b'] });
    }, [pickerItems, groupACount, groupAName, groupBName]);

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
    const groupAResults = useMemo(() => Object.values(results).filter(r => r.group === 'A'), [results]);
    const groupBResults = useMemo(() => Object.values(results).filter(r => r.group === 'B'), [results]);

    const padWidth  = padRef.current?.clientWidth || 400;
    const baseSize  = Math.max(85, padWidth * 0.15);

    return (
        <div className="grid">
            <div className="card" style={{ position: 'relative' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Asignación Dispareja</h2>
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

                {/* Configuration panel */}
                <div style={{
                    display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem',
                    padding: '1rem 1.2rem', background: 'var(--bg-secondary)',
                    borderRadius: '16px', border: '1px solid var(--line)',
                    alignItems: 'flex-end',
                }}>
                    <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, display: 'block', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>
                            GRUPO A
                        </label>
                        <input
                            type="text"
                            value={groupAName}
                            onChange={e => setGroupAName(e.target.value)}
                            style={{
                                width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px',
                                border: '2px solid var(--primary)', background: 'var(--bg)',
                                color: 'var(--fg)', fontSize: '0.9rem', fontWeight: 700,
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 800, display: 'block', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>
                            CANTIDAD A
                        </label>
                        <div className="row" style={{ gap: '0.4rem' }}>
                            <button
                                className="btn"
                                onClick={() => setGroupACount(c => Math.max(1, c - 1))}
                                style={{ padding: '0.35rem 0.65rem', fontSize: '1.1rem', lineHeight: 1 }}
                            >−</button>
                            <span style={{ minWidth: '2rem', textAlign: 'center', fontWeight: 900, fontSize: '1.3rem' }}>
                                {groupACount}
                            </span>
                            <button
                                className="btn"
                                onClick={() => setGroupACount(c => c + 1)}
                                style={{ padding: '0.35rem 0.65rem', fontSize: '1.1rem', lineHeight: 1 }}
                            >+</button>
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--good)', fontWeight: 800, display: 'block', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>
                            GRUPO B (RESTO)
                        </label>
                        <input
                            type="text"
                            value={groupBName}
                            onChange={e => setGroupBName(e.target.value)}
                            style={{
                                width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px',
                                border: '2px solid var(--good)', background: 'var(--bg)',
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
                        height: '450px',
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
                    {/* Countdown overlay */}
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
                                    fontSize: '12rem', fontWeight: 900,
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
                        {phase === 'done' && Object.keys(results).length > 0 && (
                            <motion.div
                                initial={{ y: -90, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                style={{
                                    position: 'absolute', top: '8%', left: '50%',
                                    transform: 'translateX(-50%)', zIndex: 20,
                                    background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
                                    padding: '1.4rem 1.8rem', borderRadius: '24px',
                                    border: '2px solid var(--line)', textAlign: 'center',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)', minWidth: '280px',
                                }}
                            >
                                <h3 style={{ marginBottom: '1rem', letterSpacing: '0.08em', color: 'var(--fg)' }}>
                                    ⚡ GRUPOS ASIGNADOS
                                </h3>
                                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '0.7rem', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>
                                            {groupAName.toUpperCase()} ({groupAResults.length})
                                        </div>
                                        {groupAResults.map((r, i) => (
                                            <div key={i} style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>
                                                {r.name || `Participante ${i + 1}`}
                                            </div>
                                        ))}
                                    </div>
                                    {groupBResults.length > 0 && (
                                        <>
                                            <div style={{ width: '1px', background: 'var(--line)', alignSelf: 'stretch' }} />
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ color: 'var(--good)', fontWeight: 900, fontSize: '0.7rem', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>
                                                    {groupBName.toUpperCase()} ({groupBResults.length})
                                                </div>
                                                {groupBResults.map((r, i) => (
                                                    <div key={i} style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>
                                                        {r.name || `Participante ${groupAResults.length + i + 1}`}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
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
                            gap: '0.75rem', color: 'var(--muted)',
                            pointerEvents: 'none', opacity: 0.6,
                        }}>
                            <span style={{ fontSize: '4.5rem', animation: 'pulse 2s infinite' }}>👆</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                Coloca los dedos para dividir grupos
                            </span>
                            <span style={{ fontSize: '0.85rem' }}>
                                {groupACount} → {groupAName} · resto → {groupBName}
                            </span>
                        </div>
                    )}

                    {/* Touch dots */}
                    <AnimatePresence>
                        {Object.entries(touches).map(([id, t]) => {
                            const rect = padRef.current?.getBoundingClientRect();
                            if (!rect) return null;

                            const res      = results[id];
                            const assigned = res !== undefined;
                            const colors   = assigned ? (res.group === 'A' ? COLOR_A : COLOR_B) : null;

                            return (
                                <motion.div
                                    key={id}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: 1, opacity: 1,
                                        left: t.x - rect.left,
                                        top:  t.y - rect.top,
                                        width:  baseSize,
                                        height: baseSize,
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                        scale:   { type: 'spring', stiffness: 300, damping: 20 },
                                        default: { duration: 0.2 },
                                    }}
                                    style={{
                                        position:      'absolute',
                                        borderRadius:  '50%',
                                        border:        assigned ? `4px solid ${colors.border}` : '3px solid rgba(255,255,255,0.4)',
                                        transform:     'translate(-50%, -50%)',
                                        background:    assigned ? colors.bg : 'rgba(255,255,255,0.1)',
                                        boxShadow:     assigned ? `0 0 40px ${colors.glow}` : 'none',
                                        display:       'flex',
                                        flexDirection: 'column',
                                        alignItems:    'center',
                                        justifyContent:'center',
                                        gap:           '2px',
                                        pointerEvents: 'none',
                                        zIndex:        2,
                                    }}
                                >
                                    {assigned && (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -20 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                        >
                                            <span style={{
                                                fontWeight: 900, lineHeight: 1,
                                                fontSize:   `${baseSize * 0.38}px`,
                                                color:      colors.border,
                                                textShadow: `0 0 10px ${colors.glow}`,
                                            }}>
                                                {res.group}
                                            </span>
                                            {res.name && (
                                                <span style={{
                                                    color: '#fff', fontWeight: 800,
                                                    fontSize: `${baseSize * 0.13}px`,
                                                    lineHeight: 1.2, textAlign: 'center',
                                                    padding: '0 4px',
                                                    maxWidth: `${baseSize - 12}px`,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {res.name}
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
                        ? `✅ ${groupAResults.length} en ${groupAName} · ${groupBResults.length} en ${groupBName}. Toca con 2 dedos para nueva ronda.`
                        : phase === 'counting'
                        ? '⏳ ¡No te muevas! Dividiendo grupos...'
                        : `Mantén los dedos 3 segundos · ${groupACount} irán a ${groupAName}, el resto a ${groupBName}.`}
                </div>
            </div>

            {/* History panel */}
            {hasHistory && (
                <div className="card">
                    <h2>Historial de Divisiones</h2>
                    <div className="orderlist">
                        {history.slice().reverse().map((round, ri) => (
                            <div key={ri} style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--line)',
                                borderRadius: '16px',
                                marginBottom: '1rem',
                            }}>
                                <div className="muted" style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.75rem' }}>
                                    RONDA {history.length - ri} · {round.count} PARTICIPANTES
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 900, marginBottom: '0.4rem' }}>
                                            {round.groupAName} ({round.groupA.length})
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {round.groupA.map((r, i) => (
                                                <span key={i} className="pill" style={{
                                                    background: 'rgba(99,102,241,0.2)',
                                                    border: '1px solid var(--primary)', fontWeight: 700,
                                                }}>
                                                    A · {r.name || `P${i + 1}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {round.groupB.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--good)', fontWeight: 900, marginBottom: '0.4rem' }}>
                                                {round.groupBName} ({round.groupB.length})
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {round.groupB.map((r, i) => (
                                                    <span key={i} className="pill" style={{
                                                        background: 'rgba(45,212,191,0.2)',
                                                        border: '1px solid var(--good)', fontWeight: 700,
                                                    }}>
                                                        B · {r.name || `P${round.groupA.length + i + 1}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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

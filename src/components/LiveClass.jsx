import React, { useState, useEffect, useRef } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { useNotifications } from './NotificationContext';
import { useAudio } from './AudioContext';
import { RNG } from '../utils/rng';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Shuffle } from 'lucide-react';
import TrafficLight from './TrafficLight';

// Lightweight "NdM" dice roller for the quick dice in this view. Avoids pulling
// the heavy rpg-dice-roller (and mathjs) into the initial bundle — the full
// notation engine lives in the dedicated, lazy-loaded "Dado" tab.
const rollFormula = (formula) => {
    const match = /^(\d+)d(\d+)$/i.exec(String(formula).trim());
    if (!match) throw new Error(`Fórmula no soportada: ${formula}`);
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    let total = 0;
    for (let i = 0; i < count; i++) total += RNG.int(1, sides);
    return total;
};

const LiveClass = ({ pickerItems = [] }) => {
    const { state, updateState } = usePersistence();
    const { alert, notify } = useNotifications();
    const audio = useAudio();

    const [lastWinner, setLastWinner] = useState(null);
    const [quickResult, setQuickResult] = useState(null);
    const [localTimer, setLocalTimer] = useState(0);
    const wasActiveRef = useRef(false);
    const audioRef = useRef(audio);
    useEffect(() => { audioRef.current = audio; });

    // Mirror the global red-code timer for display only
    useEffect(() => {
        if (!state.isRedCodeActive || !state.redCodeEndTime) {
            if (wasActiveRef.current) {
                audio.stop();
                wasActiveRef.current = false;
            }
            setLocalTimer(0);
            return;
        }
        wasActiveRef.current = true;
        const tick = () => {
            const diff = Math.max(0, Math.ceil((state.redCodeEndTime - Date.now()) / 1000));
            setLocalTimer(diff);
        };
        tick();
        const interval = setInterval(tick, 250);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.isRedCodeActive, state.redCodeEndTime]);

    // Detener la música si se sale de esta pestaña mientras seguía sonando el
    // temporizador (evita que la pista quede reproduciéndose tras desmontar).
    // (vía ref: `audio` cambia de identidad al sonar la pista y con él como
    // dependencia esta limpieza cortaba la música recién iniciada).
    useEffect(() => () => {
        if (wasActiveRef.current) {
            audioRef.current.stop();
            wasActiveRef.current = false;
        }
    }, []);

    const startRedCode = (seconds = 30) => {
        const endTime = Date.now() + (seconds * 1000);
        updateState({
            traffic: 'red',
            isRedCodeActive: true,
            redCodeEndTime: endTime,
        });
        audio.play('thinking');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    };

    const stopRedCode = () => {
        updateState({ isRedCodeActive: false, redCodeEndTime: null });
        audio.stop();
    };

    const setTraffic = (color) => {
        updateState({ traffic: color });
        if (navigator.vibrate) navigator.vibrate(50);
        audio.playSFX('click');
    };

    const quickPick = () => {
        if (lastWinner === "...") return; // already rolling
        if (pickerItems.length === 0) {
            return alert("Sin Alumnos", "Ingresa nombres en la pestaña Sorteo.");
        }
        audio.playSFX('drumroll');
        setLastWinner("...");
        setTimeout(() => {
            const key = RNG.keyFromItems("live_pick", pickerItems);
            const chosen = RNG.pick(pickerItems, key);
            setLastWinner(chosen);
            audio.playSFX('boing');
            if (navigator.vibrate) navigator.vibrate(100);
            notify(`¡Turno de ${chosen}!`, 'achievement', '🎲');
        }, 1500);
    };

    const quickRoll = (formula) => {
        try {
            const total = rollFormula(formula);
            setQuickResult({ formula, total });
            audio.playSFX('boing');
            if (navigator.vibrate) navigator.vibrate(40);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="grid live-grid">
            {/* SEMÁFORO Y CONTROL PRINCIPAL */}
            <div className="card card-main live-main">
                <h2>Semáforo y tiempo</h2>
                <TrafficLight value={state.traffic || 'green'} onChange={setTraffic} />

                <div className="divider"></div>

                {!state.isRedCodeActive ? (
                    <div className="quick-timer">
                        <span className="quick-timer-label"><Timer size={18} aria-hidden /> Código rojo</span>
                        <div className="quick-timer-options">
                            <button className="btn" onClick={() => startRedCode(15)}>15 s</button>
                            <button className="btn" onClick={() => startRedCode(30)}>30 s</button>
                            <button className="btn" onClick={() => startRedCode(60)}>1 min</button>
                            <button className="btn" onClick={() => startRedCode(120)}>2 min</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div className="out" style={{ color: 'var(--error)' }}>{localTimer}s</div>
                        <button className="btn danger" onClick={stopRedCode}>Detener código rojo</button>
                    </div>
                )}
            </div>

            {/* SORTEO RÁPIDO */}
            <div className="card">
                <h2>Siguiente turno</h2>
                <div className="out" style={{ fontSize: 'var(--fs-xl)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={lastWinner}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={lastWinner && lastWinner !== "..." ? "win-text" : ""}
                        >
                            {lastWinner || <span className="empty-hint">Nadie todavía</span>}
                        </motion.div>
                    </AnimatePresence>
                </div>
                <button className="btn primary" style={{ width: '100%', padding: '1rem' }} onClick={quickPick}>
                    <Shuffle size={18} aria-hidden /> Sortear ahora
                </button>
            </div>

            {/* DADOS RÁPIDOS */}
            <div className="card">
                <h2>Dados rápidos</h2>
                <div className="out" style={{ fontSize: 'var(--fs-xl)', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    {quickResult ? (
                        <>
                            <div style={{ fontSize: 'var(--fs-base)', color: 'var(--muted)' }}>{quickResult.formula}</div>
                            <div>{quickResult.total}</div>
                        </>
                    ) : <span className="empty-hint">Elige un dado</span>}
                </div>
                <div className="quick-dice-grid">
                    <button className="btn-quick-dice btn" onClick={() => quickRoll('1d20')}>d20</button>
                    <button className="btn-quick-dice btn" onClick={() => quickRoll('2d10')}>2d10</button>
                    <button className="btn-quick-dice btn" onClick={() => quickRoll('1d6')}>1d6</button>
                    <button className="btn-quick-dice btn" onClick={() => quickRoll('1d100')}>d100</button>
                </div>
            </div>
        </div>
    );
};

export default LiveClass;

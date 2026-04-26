import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { useNotifications } from './NotificationContext';
import { useAudio } from './AudioContext';
import { RNG } from '../utils/rng';
import { DiceRoller } from 'rpg-dice-roller';
import { motion, AnimatePresence } from 'motion/react';

const roller = new DiceRoller();

const LiveClass = ({ pickerItems = [] }) => {
    const { state, updateState } = usePersistence();
    const { alert, notify } = useNotifications();
    const audio = useAudio();
    
    const [lastWinner, setLastWinner] = useState(null);
    const [quickResult, setQuickResult] = useState(null);
    const [localTimer, setLocalTimer] = useState(0);

    // Sync local timer with global end time
    useEffect(() => {
        let interval;
        if (state.isRedCodeActive && state.redCodeEndTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.max(0, Math.ceil((state.redCodeEndTime - now) / 1000));
                setLocalTimer(diff);
                
                if (diff === 0) {
                    updateState({ isRedCodeActive: false });
                    audio.stop();
                    audio.playSFX('buzzer');
                    if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
                    clearInterval(interval);
                }
            }, 1000);
        } else {
            setLocalTimer(0);
        }
        return () => clearInterval(interval);
    }, [state.isRedCodeActive, state.redCodeEndTime, updateState, audio]);

    const startRedCode = (seconds = 30) => {
        const endTime = Date.now() + (seconds * 1000);
        updateState({ 
            traffic: 'red', 
            isRedCodeActive: true, 
            redCodeEndTime: endTime 
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
        if (pickerItems.length === 0) {
            return alert("Sin Alumnos", "Ingresa nombres en la pestaña Sorteo.");
        }
        audio.playSFX('drumroll');
        setLastWinner("...");
        setTimeout(() => {
            const chosen = RNG.pick(pickerItems, "live_pick");
            setLastWinner(chosen);
            audio.playSFX('boing');
            if (navigator.vibrate) navigator.vibrate(100);
            notify(`¡Turno de ${chosen}!`, 'achievement', '🎲');
        }, 1500);
    };

    const quickRoll = (formula) => {
        try {
            const roll = roller.roll(formula);
            setQuickResult({ formula, total: roll.total });
            audio.playSFX('boing');
            if (navigator.vibrate) navigator.vibrate(40);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="grid">
            {/* SEMAFORO Y CONTROL PRINCIPAL */}
            <div className="card full-width" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Gestión de Clase en Vivo</h2>
                    <div className={`pill active-${state.traffic}`} style={{ background: `var(--traffic-${state.traffic})`, color: 'black' }}>
                        {state.traffic.toUpperCase()}
                    </div>
                </div>

                <div className="traffic-row" style={{ marginTop: '20px', height: '120px' }}>
                    <button 
                        className={`traffic-btn ${state.traffic === 'green' ? 'active' : ''}`}
                        style={{ background: 'var(--traffic-green)', color: '#000', fontSize: '1rem' }}
                        onClick={() => setTraffic('green')}
                    >
                        LIBRE
                    </button>
                    <button 
                        className={`traffic-btn ${state.traffic === 'yellow' ? 'active' : ''}`}
                        style={{ background: 'var(--traffic-yellow)', color: '#000', fontSize: '1rem' }}
                        onClick={() => setTraffic('yellow')}
                    >
                        DUDAS
                    </button>
                    <button 
                        className={`traffic-btn ${state.traffic === 'red' ? 'active' : ''}`}
                        style={{ background: 'var(--traffic-red)', color: '#000', fontSize: '1rem' }}
                        onClick={() => setTraffic('red')}
                    >
                        SILENCIO
                    </button>
                </div>

                <div className="divider"></div>

                <div className="row" style={{ justifyContent: 'center', gap: '20px' }}>
                    {!state.isRedCodeActive ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className="muted" style={{ marginBottom: '10px' }}>Temporizador Rápido</div>
                            <div className="row">
                                <button className="btn warn" onClick={() => startRedCode(15)}>15s</button>
                                <button className="btn warn" onClick={() => startRedCode(30)}>30s</button>
                                <button className="btn warn" onClick={() => startRedCode(60)}>60s</button>
                                <button className="btn warn" onClick={() => startRedCode(120)}>2m</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div className="out" style={{ color: 'var(--traffic-red)', fontSize: '5rem' }}>{localTimer}s</div>
                            <button className="btn primary error" onClick={stopRedCode}>DETENER CÓDIGO ROJO</button>
                        </div>
                    )}
                </div>
            </div>

            {/* SORTEO RÁPIDO */}
            <div className="card">
                <h2>Siguiente Turno</h2>
                <div className="out" style={{ fontSize: '2.5rem', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={lastWinner}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={lastWinner && lastWinner !== "..." ? "win-text" : ""}
                        >
                            {lastWinner || "—"}
                        </motion.div>
                    </AnimatePresence>
                </div>
                <button className="btn primary good" style={{ width: '100%', padding: '1.2rem' }} onClick={quickPick}>
                    🎲 SORTEAR AHORA
                </button>
            </div>

            {/* DADOS RÁPIDOS */}
            <div className="card">
                <h2>Dados Rápidos</h2>
                <div className="out" style={{ fontSize: '3rem', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    {quickResult ? (
                        <>
                            <div style={{ fontSize: '1rem', color: 'var(--muted)' }}>{quickResult.formula}</div>
                            <div style={{ color: 'var(--primary)' }}>{quickResult.total}</div>
                        </>
                    ) : "—"}
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

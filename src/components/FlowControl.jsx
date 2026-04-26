import React, { useState, useEffect, useRef } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { useNotifications } from './NotificationContext';
import { useAudio } from './AudioContext';
import { RNG } from '../utils/rng';
import Cubes from './Cubes';

const FlowControl = ({ pickerItems = [] }) => {
    const { state, updateState } = usePersistence();
    const { alert } = useNotifications();
    const audio = useAudio();
    const [duration, setDuration] = useState(30);
    const [timer, setTimer] = useState(30);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [leader, setLeader] = useState("—");
    const [enableAudio, setEnableAudio] = useState(false);
    const timerIntervalRef = useRef(null);

    useEffect(() => {
        if (!isTimerRunning) {
            clearInterval(timerIntervalRef.current);
            if (enableAudio) audio.stop();
            return;
        }

        // Play music if code red is active and audio is enabled
        if (state.traffic === 'red' && enableAudio) {
            audio.play('thinking');
        }

        timerIntervalRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerIntervalRef.current);
                    setIsTimerRunning(false);
                    if (enableAudio) audio.stop();
                    if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerIntervalRef.current);
    }, [isTimerRunning, state.traffic, enableAudio, audio]);

    const startTimer = () => {
        setTimer(duration);
        setIsTimerRunning(true);
        updateState({ traffic: "red" });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    };

    const setTraffic = (color) => {
        updateState({ traffic: color });
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const pickLeader = async () => {
        if (pickerItems.length === 0) {
            return await alert("Sin Alumnos", "Primero ingresa nombres en la pestaña Sorteo.");
        }
        const chosen = RNG.pick(pickerItems, "leader");
        setLeader(chosen);
    };

    const trafficLabels = {
        green: "Trabajo libre / Equipo",
        yellow: "Transición / Dudas",
        red: "Explicación (Silencio)"
    };

    return (
        <div className="grid">
            <div className={`card ${state.traffic === 'red' && isTimerRunning ? 'code-red' : ''}`}>
                <h2>Temporizador de "Código Rojo"</h2>
                <div className="out">{timer}s</div>
                <div className="divider"></div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                        Duración: {duration}s
                    </label>
                    <input
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={duration}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setDuration(val);
                            if (!isTimerRunning) setTimer(val);
                        }}
                        style={{ width: '100%' }}
                    />
                </div>
                <div className="row">
                    <button className="btn warn" onClick={startTimer}>⚡ INICIAR</button>
                    <button className="btn" onClick={() => setIsTimerRunning(false)}>Detener</button>
                    <button className="btn" onClick={() => { setTimer(duration); setIsTimerRunning(false); }}>Reset</button>
                </div>
            </div>

            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
                    <Cubes gridSize={8} faceColor="#2dd4bf" borderStyle="1px solid rgba(255,255,255,0.05)" />
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2>Semáforo de Atención</h2>
                    <div className="smallout">Controla el ruido y la fase de la clase.</div>
                    <div className="traffic-row" style={{ marginTop: '20px', gap: '0.5rem' }}>
                        <button
                            className={`traffic-btn ${state.traffic === 'green' ? 'active' : ''}`}
                            data-state="green"
                            onClick={() => setTraffic('green')}
                        >
                            LIBRE
                        </button>
                        <button
                            className={`traffic-btn ${state.traffic === 'yellow' ? 'active' : ''}`}
                            data-state="yellow"
                            onClick={() => setTraffic('yellow')}
                        >
                            DUDAS
                        </button>
                        <button
                            className={`traffic-btn ${state.traffic === 'red' ? 'active' : ''}`}
                            data-state="red"
                            onClick={() => setTraffic('red')}
                        >
                            SILENCIO
                        </button>
                    </div>
                    <div className="divider"></div>
                    <div style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', color: `var(--traffic-${state.traffic})` }}>
                        {trafficLabels[state.traffic] || "Libre"}
                    </div>
                    <div className="divider"></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>🎵 Música en Código Rojo</span>
                        <button
                            className={`btn ${enableAudio ? 'primary' : ''}`}
                            onClick={() => setEnableAudio(!enableAudio)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                        >
                            {enableAudio ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Gestión de Aula</h2>
                <p className="muted" style={{ marginBottom: '1rem' }}>Controla el ruido y las transiciones mediante el semáforo y la señal de silencio.</p>
                <div className="smallout">Selecciona al responsable del grupo hoy.</div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn primary good" onClick={pickLeader}>Asignar Líder</button>
                </div>
                <div className="out" style={{ fontSize: '24px' }}>{leader}</div>
            </div>
        </div>
    );
};

export default FlowControl;

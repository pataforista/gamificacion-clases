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
    const [leader, setLeader] = useState(state.currentLeader || "—");
    const [enableAudio, setEnableAudio] = useState(false);
    const [tick, setTick] = useState(0);
    const audioStartedRef = useRef(false);

    // Live tick for displayed timer
    useEffect(() => {
        if (!state.isRedCodeActive || !state.redCodeEndTime) {
            setTick(0);
            return;
        }
        const i = setInterval(() => setTick((t) => t + 1), 250);
        return () => clearInterval(i);
    }, [state.isRedCodeActive, state.redCodeEndTime]);

    const remaining = state.isRedCodeActive && state.redCodeEndTime
        ? Math.max(0, Math.ceil((state.redCodeEndTime - Date.now()) / 1000))
        : duration;

    // Audio gate: start music when red-code becomes active with toggle on, stop otherwise
    useEffect(() => {
        if (state.isRedCodeActive && enableAudio && !audioStartedRef.current) {
            audio.play('thinking');
            audioStartedRef.current = true;
        }
        if ((!state.isRedCodeActive || !enableAudio) && audioStartedRef.current) {
            audio.stop();
            audioStartedRef.current = false;
        }
    }, [state.isRedCodeActive, enableAudio, audio]);

    // tick is read here only to keep `remaining` fresh on rerender
    void tick;

    const startTimer = () => {
        const endTime = Date.now() + duration * 1000;
        updateState({
            traffic: 'red',
            isRedCodeActive: true,
            redCodeEndTime: endTime,
        });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    };

    const stopTimer = () => {
        updateState({ isRedCodeActive: false, redCodeEndTime: null });
    };

    const setTraffic = (color) => {
        updateState({ traffic: color });
        if (color !== 'red') {
            // changing away from red disarms the timer
            if (state.isRedCodeActive) updateState({ isRedCodeActive: false, redCodeEndTime: null });
        }
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const pickLeader = async () => {
        if (pickerItems.length === 0) {
            return await alert("Sin Alumnos", "Primero ingresa nombres en la pestaña Sorteo.");
        }
        const chosen = RNG.pick(pickerItems, RNG.keyFromItems("leader", pickerItems));
        setLeader(chosen);
        updateState({ currentLeader: chosen });
    };

    const trafficLabels = {
        green: "Trabajo libre / Equipo",
        yellow: "Transición / Dudas",
        red: "Explicación (Silencio)"
    };

    return (
        <div className="grid">
            <div className={`card ${state.traffic === 'red' && state.isRedCodeActive ? 'code-red' : ''}`}>
                <h2>Temporizador de "Código Rojo"</h2>
                <div className="out">{remaining}s</div>
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
                        onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                        style={{ width: '100%' }}
                    />
                </div>
                <div className="row">
                    <button className="btn warn" onClick={startTimer} disabled={state.isRedCodeActive}>⚡ INICIAR</button>
                    <button className="btn" onClick={stopTimer} disabled={!state.isRedCodeActive}>Detener</button>
                </div>
            </div>

            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
                    <Cubes gridSize={8} faceColor="var(--secondary)" borderStyle="1px solid rgba(127,127,127,0.15)" />
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

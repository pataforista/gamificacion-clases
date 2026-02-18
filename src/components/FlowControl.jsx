import React, { useState, useEffect, useRef } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { RNG } from '../utils/rng';
import Cubes from './Cubes';

const FlowControl = ({ pickerItems = [] }) => {
    const { state, updateState } = usePersistence();
    const [timer, setTimer] = useState(30);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [leader, setLeader] = useState("—");
    const timerIntervalRef = useRef(null);

    useEffect(() => {
        if (isTimerRunning && timer > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            clearInterval(timerIntervalRef.current);
            if (timer === 0) setIsTimerRunning(false);
        }
        return () => clearInterval(timerIntervalRef.current);
    }, [isTimerRunning, timer]);

    const startTimer = () => {
        setTimer(30);
        setIsTimerRunning(true);
        updateState({ traffic: "red" });
    };

    const setTraffic = (color) => {
        updateState({ traffic: color });
    };

    const pickLeader = () => {
        if (pickerItems.length === 0) return alert("Primero ingresa nombres en la pestaña Sorteo");
        const chosen = RNG.pick(pickerItems, "leader");
        setLeader(chosen);
    };

    const trafficLabels = {
        green: "Trabajo libre / Equipo",
        yellow: "Transicin / Dudas",
        red: "Explicacin (Silencio)"
    };

    return (
        <div className="grid">
            <div className={`card ${state.traffic === 'red' && isTimerRunning ? 'code-red' : ''}`}>
                <h2>Temporizador de "Cdigo Rojo"</h2>
                <div className="out">{timer}</div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn warn" onClick={startTimer}>⚡ INICIAR CDIGO ROJO</button>
                    <button className="btn" onClick={() => setIsTimerRunning(false)}>Detener</button>
                    <button className="btn" onClick={() => { setTimer(30); setIsTimerRunning(false); }}>Reset 30s</button>
                </div>
            </div>

            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
                    <Cubes gridSize={8} faceColor="#2dd4bf" borderStyle="1px solid rgba(255,255,255,0.05)" />
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2>Semforo de Atencin</h2>
                    <div className="smallout">Controla el ruido y la fase de la clase.</div>
                    <div className="traffic-row" style={{ marginTop: '20px', gap: '0.5rem' }}>
                        <button
                            className={`traffic-btn ${state.traffic === 'green' ? 'active' : ''}`}
                            style={{ background: 'var(--traffic-green)', color: 'var(--traffic-green)' }}
                            onClick={() => setTraffic('green')}
                        />
                        <button
                            className={`traffic-btn ${state.traffic === 'yellow' ? 'active' : ''}`}
                            style={{ background: 'var(--traffic-yellow)', color: 'var(--traffic-yellow)' }}
                            onClick={() => setTraffic('yellow')}
                        />
                        <button
                            className={`traffic-btn ${state.traffic === 'red' ? 'active' : ''}`}
                            style={{ background: 'var(--traffic-red)', color: 'var(--traffic-red)' }}
                            onClick={() => setTraffic('red')}
                        />
                    </div>
                    <div className="divider"></div>
                    <div style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', color: `var(--traffic-${state.traffic})` }}>
                        {trafficLabels[state.traffic] || "Libre"}
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Lder de Guardia</h2>
                <div className="smallout">Selecciona al responsable del grupo hoy.</div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn primary good" onClick={pickLeader}>Asignar Lder</button>
                </div>
                <div className="out" style={{ fontSize: '24px' }}>{leader}</div>
            </div>
        </div>
    );
};

export default FlowControl;

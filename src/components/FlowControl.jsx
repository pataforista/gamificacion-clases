import React, { useState, useEffect, useRef } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { useNotifications } from './NotificationContext';
import { useAudio } from './AudioContext';
import { RNG } from '../utils/rng';
import { useFullscreen } from '../hooks/useFullscreen';
import { Maximize2, Minimize2, Play, Music, Crown } from 'lucide-react';
import TrafficLight from './TrafficLight';

const FlowControl = ({ pickerItems = [] }) => {
    const { state, updateState } = usePersistence();
    const { alert } = useNotifications();
    const audio = useAudio();
    const [duration, setDuration] = useState(30);
    const [leader, setLeader] = useState(state.currentLeader || "—");
    const [enableAudio, setEnableAudio] = useState(false);
    const [tick, setTick] = useState(0);
    const audioStartedRef = useRef(false);
    const audioRef = useRef(audio);
    useEffect(() => { audioRef.current = audio; });
    const fsRef = useRef(null);
    const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(fsRef);

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
        // `audio` cambia de identidad al empezar/parar la pista: depender de él
        // re-ejecutaba el efecto y la música entraba en un bucle play/pausa.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.isRedCodeActive, enableAudio]);

    // Detener la música si el componente se desmonta (cambio de pestaña) mientras
    // sonaba: sin esto la pista de "thinking" seguía reproduciéndose sin control,
    // ya que el estado local `enableAudio` se reinicia al volver a montar.
    useEffect(() => () => {
        if (audioStartedRef.current) {
            audioRef.current.stop();
            audioStartedRef.current = false;
        }
    }, []);

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
            <div ref={fsRef} className={`card card-main fs-card ${state.traffic === 'red' && state.isRedCodeActive ? 'code-red' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Código rojo</h2>
                    <button className="btn btn-sm" onClick={toggleFullscreen}>
                        {isFullscreen ? <><Minimize2 size={16} aria-hidden /> Salir</> : <><Maximize2 size={16} aria-hidden /> Proyector</>}
                    </button>
                </div>
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
                    <button className="btn primary" onClick={startTimer} disabled={state.isRedCodeActive}><Play size={16} aria-hidden /> Iniciar</button>
                    <button className="btn" onClick={stopTimer} disabled={!state.isRedCodeActive}>Detener</button>
                </div>
            </div>

            <div className="card">
                <div>
                    <h2>Semáforo de atención</h2>
                    <p className="muted">Controla el ruido y la fase de la clase.</p>
                    <TrafficLight value={state.traffic || 'green'} onChange={setTraffic} compact />
                    <p className="traffic-caption">{trafficLabels[state.traffic] || trafficLabels.green}</p>
                    <div className="divider"></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Music size={18} aria-hidden /> Música en código rojo</span>
                        <button
                            className={`btn btn-sm ${enableAudio ? 'selected' : ''}`}
                            aria-pressed={enableAudio}
                            onClick={() => setEnableAudio(!enableAudio)}
                        >
                            {enableAudio ? 'Activada' : 'Apagada'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Líder del día</h2>
                <p className="muted" style={{ marginBottom: '1rem' }}>Sortea quién coordina al grupo hoy.</p>
                <div className="row">
                    <button className="btn" onClick={pickLeader}><Crown size={16} aria-hidden /> Asignar Líder</button>
                </div>
                <div className="out" style={{ fontSize: 'var(--fs-lg)' }}>{leader !== '—' ? leader : <span className="empty-hint">Sin asignar</span>}</div>
            </div>
        </div>
    );
};

export default FlowControl;

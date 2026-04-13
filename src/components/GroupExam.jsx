import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from './NotificationContext';
import { useAudio, WAITING_TRACKS } from './AudioContext';
import { RNG } from '../utils/rng';
import confetti from 'canvas-confetti';
import BoardGame from './BoardGame';
import AvatarSelector from './AvatarSelector';

const GroupExam = ({ pickerItems = [] }) => {
    const { alert } = useNotifications();
    const audio = useAudio();
    const [exam, setExam] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [scores, setScores] = useState({});
    const [selectedTrack, setSelectedTrack] = useState('jeopardy');
    const [activeTeam, setActiveTeam] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    
    // NEW GAME SHOW FEATURES
    const [settings, setSettings] = useState({
        timer: true,
        rebote: true,
        jokers: true,
        suspense: true,
        duration: 25
    });

    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const [roboTeam, setRoboTeam] = useState(null);
    const [hiddenOptions, setHiddenOptions] = useState([]);
    const [teamLog, setTeamLog] = useState({}); // { teamName: { jokers: { fifty: bool, expert: bool } } }
    
    const [teamAvatars, setTeamAvatars] = useState({});
    const [visualScores, setVisualScores] = useState({}); // Separate from real scores
    const [setupPhase, setSetupPhase] = useState('upload'); // upload, avatar, game

    const timerRef = useRef(null);

    // Stop audio when exam closes or component unmounts
    useEffect(() => {
        if (!exam) audio.stop();
        stopTimer();
    }, [exam]);

    // TIMER LOGIC
    useEffect(() => {
        if (isTimerActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleTimeOut();
                        return 0;
                    }
                    if (prev <= 5) audio.playSFX('tick');
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isTimerActive, timeLeft]);

    const stopTimer = () => {
        setIsTimerActive(false);
        clearInterval(timerRef.current);
    };

    const handleTimeOut = () => {
        audio.stop();
        audio.playSFX('buzzer');
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        setFeedback({ type: 'incorrect', msg: '⏳ ¡TIEMPO AGOTADO! ' + RNG.getFlavor('wrong') });
        if (settings.rebote) startRoboPhase();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if (!data.questions || !Array.isArray(data.questions)) {
                    throw new Error("Formato inválido: falta array 'questions'");
                }
                setExam(data);
                setCurrentQuestion(0);
                setFeedback(null);

                const initialScores = {};
                const initialVisual = {};
                pickerItems.forEach(item => {
                    initialScores[item] = 0;
                    initialVisual[item] = 0;
                });
                setScores(initialScores);
                setVisualScores(initialVisual);
                
                audio.playSFX('intro');
                setSetupPhase('avatar');
            } catch {
                audio.playSFX('incorrect');
                await alert("Error de Archivo", "El archivo JSON no es válido o tiene un formato incorrecto.");
            }
        };
        reader.readAsText(file);
    };

    const nextTurn = async () => {
        if (pickerItems.length === 0) {
            return await alert("Sin Equipos", "Ingresa nombres o equipos en la pestaña Sorteo para asignar turnos.");
        }
        // Play waiting music
        audio.play(selectedTrack);
        const chosen = RNG.pick(pickerItems, "exam_turn");
        setActiveTeam(chosen);
        setFeedback(null);
        setRoboTeam(null);
        setHiddenOptions([]);
        
        if (settings.timer) {
            setTimeLeft(settings.duration);
            setIsTimerActive(true);
        }

        if (navigator.vibrate) navigator.vibrate(80);
    };

    const startRoboPhase = () => {
        stopTimer();
        const otherTeams = pickerItems.filter(t => t !== activeTeam);
        if (otherTeams.length === 0) return;
        
        // Balanced pick for robo
        const robo = otherTeams[RNG.pickBalancedIndex(otherTeams.length, "robo_balance")];
        setRoboTeam(robo);
        setFeedback(null); // Fix: Remove feedback so options are clickable again
        
        if (settings.timer) {
            setTimeLeft(10); // Less time for robo phase tension!
            setIsTimerActive(true);
        }

        audio.playSFX('boing');
        if (navigator.vibrate) navigator.vibrate(100);
    };

    const answer = async (isCorrect, isRobo = false) => {
        const team = isRobo ? roboTeam : activeTeam;
        if (!team) return;

        stopTimer();
        audio.stop();

        if (settings.suspense && !isRobo) {
            setIsRevealing(true);
            audio.playSFX('drumroll');
            await new Promise(r => setTimeout(r, 3000));
            setIsRevealing(false);
        }

        if (isCorrect) {
            const xp = isRobo ? 5 : 10;
            setScores(prev => ({ ...prev, [team]: (prev[team] || 0) + xp }));
            
            // ILLUSION OF PROGRESS (Visual only)
            // Scale: board has 100 tiles. Each question should move them ~ (100 / totalQuestions)
            const baseVisual = 100 / (exam?.questions.length || 10);
            const randomExtra = RNG.int(-3, 8); // Biased positive
            setVisualScores(prev => ({ ...prev, [team]: (prev[team] || 0) + Math.max(1, baseVisual + randomExtra) }));

            if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            audio.playSFX('correct');
            audio.playSFX('applause');
            setFeedback({ type: 'correct', msg: RNG.getFlavor('correct') + ` +${xp} XP.` });
            setRoboTeam(null);
        } else {
            if (navigator.vibrate) navigator.vibrate(200);
            audio.playSFX('incorrect');
            setFeedback({ type: 'incorrect', msg: RNG.getFlavor('wrong') });
            
            // Random small visual setback or keep position
            const setback = RNG.int(0, 2); 
            setVisualScores(prev => ({ ...prev, [team]: Math.max(0, (prev[team] || 0) - setback) }));

            if (!isRobo && settings.rebote) {
                setTimeout(startRoboPhase, 1500);
            } else {
                setRoboTeam(null);
            }
        }

        // Si es la última pregunta, sonar "lose" o "fin" si se equivocaron o terminó el juego
        if (currentQuestion === exam.questions.length - 1) {
            if (!isCorrect) {
                 setTimeout(() => audio.playSFX('lose'), 1000);
            }
        }
    };

    const question = exam?.questions?.[currentQuestion];

    return (
        <div className="grid">
            <div className={`card full-width`} style={{ gridColumn: 'span 2' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2>Examen Grupal</h2>
                    {setupPhase === 'game' && (
                        <button className="btn" onClick={() => {
                            if(window.confirm('¿Seguro que quieres cerrar el examen? Se perderá el progreso.')) {
                                setExam(null);
                                setSetupPhase('upload');
                            }
                        }}>🛑 Cerrar Examen</button>
                    )}
                </div>

                {setupPhase === 'upload' && (
                    <div>
                        <p className="muted" style={{ marginBottom: '1rem' }}>Sube un archivo JSON para gamificar evaluaciones por equipos con música y efectos.</p>
                        <p>Importa el JSON del examen para comenzar la dinámica.</p>
                        <div className="row" style={{ margin: '15px 0' }}>
                            <input type="file" accept=".json" onChange={handleFileUpload} />
                            <button className="btn" onClick={() => setShowGuide(!showGuide)}>
                                {showGuide ? 'Ocultar Guía' : 'Ver Estructura JSON'}
                            </button>
                            <button className="btn" onClick={() => {
                                const template = {
                                    questions: [
                                        {
                                            text: "¿Pregunta de ejemplo?",
                                            options: ["A", "B", "C", "D"],
                                            correctIndex: 0
                                        }
                                    ]
                                };
                                navigator.clipboard.writeText(JSON.stringify(template, null, 2));
                                alert("Copiado al portapapeles", "Pega el código en un archivo .json");
                            }}>
                                📋 Copiar Plantilla
                            </button>
                        </div>

                        {showGuide && (
                            <div className="smallout" style={{ textAlign: 'left', background: 'var(--bg-secondary)', border: '2px dashed var(--line)', color: 'var(--text)', padding: '1rem', borderRadius: '12px' }}>
                                <strong>Estructura requerida:</strong>
                                <pre style={{ fontSize: '12px', marginTop: '10px', color: 'var(--memphis-purple)', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                                    {`{
  "questions": [
    {
      "text": "¿Pregunta?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    }
  ]
}`}
                                </pre>
                            </div>
                        )}

                        <div className="divider"></div>
                        <h3>Ajustes del Game Show</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '10px' }}>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.timer} onChange={e => setSettings({...settings, timer: e.target.checked})} />
                                Temporizador ({settings.duration}s)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.rebote} onChange={e => setSettings({...settings, rebote: e.target.checked})} />
                                Sistema de Rebote
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.jokers} onChange={e => setSettings({...settings, jokers: e.target.checked})} />
                                Comodines (50/50)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.suspense} onChange={e => setSettings({...settings, suspense: e.target.checked})} />
                                Suspenso (Redoble)
                            </label>
                        </div>
                        {settings.timer && (
                            <input 
                                type="range" min="5" max="60" step="5" 
                                value={settings.duration} 
                                onChange={e => setSettings({...settings, duration: parseInt(e.target.value)})}
                                style={{ width: '100%', marginTop: '10px' }}
                            />
                        )}
                    </div>
                )}

                {setupPhase === 'avatar' && (
                    <AvatarSelector 
                        teams={pickerItems} 
                        onComplete={(selections) => {
                            setTeamAvatars(selections);
                            setSetupPhase('game');
                        }} 
                    />
                )}

                {setupPhase === 'game' && exam && currentQuestion >= 0 && (
                    <div className="game-grid-split" style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '2rem', 
                        alignItems: 'flex-start',
                        justifyContent: 'center'
                    }}>
                        {/* LEFT PANEL: BOARD */}
                        <div style={{ flex: '1 1 500px', maxWidth: '650px' }}>
                            <BoardGame 
                                teams={pickerItems} 
                                totalSteps={100} 
                                scores={visualScores} 
                                avatars={teamAvatars} 
                            />
                        </div>

                        {/* RIGHT PANEL: INFO & QUESTIONS */}
                        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* NEW MINI SCOREBOARD */}
                            <div className="card" style={{ padding: '1rem', border: '3px solid var(--line)', marginBottom: 0 }}>
                                <h4 style={{ margin: '0 0 1rem 0', textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.7 }}>🏆 Clasificación</h4>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: '8px'
                                }}>
                                    {Object.entries(scores).map(([team, val]) => (
                                        <div key={team} style={{ 
                                            padding: '6px 10px',
                                            background: activeTeam === team ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                                            color: activeTeam === team ? '#fff' : 'var(--text)', 
                                            border: '2px solid var(--line)', 
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem'
                                        }}>
                                            <span>{teamAvatars[team]}</span>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 900 }}>{val} XP</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="row" style={{ justifyContent: 'space-between', color: 'var(--text)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                <span>📺 Pregunta {currentQuestion + 1} / {exam.questions.length}</span>
                                <span style={{ color: 'var(--primary)' }}>Progreso: {Math.round(((currentQuestion + 1) / exam.questions.length) * 100)}%</span>
                            </div>

                            {settings.timer && isTimerActive && (
                                <div className="timer-bar-container" style={{ width: '100%', height: '14px', background: 'rgba(0,0,0,0.1)', border: '2px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div className="timer-bar" style={{ 
                                        width: `${(timeLeft / settings.duration) * 100}%`, 
                                        height: '100%', 
                                        background: timeLeft <= 5 ? 'var(--error)' : 'var(--good)',
                                        transition: 'width 1s linear'
                                    }}></div>
                                </div>
                            )}

                            {roboTeam && (
                                <div className="card shake" style={{ background: 'var(--warn)', color: '#000', textAlign: 'center', padding: '1rem', border: '4px solid var(--line)' }}>
                                    <h3 style={{ margin: 0 }}>🚨 ¡ROBO DE PUNTOS! 🚨</h3>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>Turno para: {roboTeam}</div>
                                </div>
                            )}

                            {!roboTeam && !activeTeam && !feedback && (
                                <div className="card pulse" style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-secondary)', border: '4px dashed var(--primary)' }}>
                                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>Siguiente Participante</h3>
                                    <button className="btn good" style={{ width: '100%', fontSize: '1.5rem', padding: '1rem', boxShadow: '4px 4px 0px var(--line)' }} onClick={nextTurn}>
                                        🎲 ASIGNAR TURNO
                                    </button>
                                </div>
                            )}

                            {!roboTeam && activeTeam && !feedback && (
                                <div className="card pulse" style={{ background: 'var(--primary)', color: '#fff', border: '4px solid var(--line)', textAlign: 'center', padding: '1rem' }}>
                                    <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>🎙️ PREGUNTA AL AIRE</h3>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{activeTeam}</div>
                                </div>
                            )}

                            {question && (
                                <div className="exam-content" style={{ marginTop: 0 }}>
                                    <div className="exam-question" style={{ background: 'var(--bg-secondary)', color: 'var(--text)', border: '4px solid var(--line)', boxShadow: '6px 6px 0px var(--line)' }}>
                                        {question.text}
                                    </div>
                                    <div className="exam-options" style={{ gridTemplateColumns: '1fr' }}>
                                        {question.options.map((opt, i) => (
                                            <button
                                                key={i}
                                                disabled={!!feedback || isRevealing || hiddenOptions.includes(i)}
                                                className={`btn exam-option ${feedback && i === question.correctIndex ? 'correct' : ''}`}
                                                style={{ 
                                                    visibility: hiddenOptions.includes(i) ? 'hidden' : 'visible',
                                                    width: '100%',
                                                    border: '3px solid var(--line)',
                                                    background: 'var(--bg)',
                                                    color: 'var(--text)',
                                                    marginBottom: '0.5rem'
                                                }}
                                                onClick={() => answer(i === question.correctIndex, !!roboTeam)}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {feedback && (
                                <div className={`smallout ${feedback.type}`} style={{ 
                                    background: feedback.type === 'correct' ? 'var(--good)' : 'var(--error)',
                                    color: '#000',
                                    border: '4px solid var(--line)',
                                    boxShadow: '8px 8px 0px var(--line)',
                                    padding: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>{feedback.msg}</div>
                                    <button className="btn primary" style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--line)', width: '100%', fontSize: '1.2rem' }} onClick={() => {
                                        setFeedback(null);
                                        setActiveTeam(null);
                                        setRoboTeam(null);
                                        setHiddenOptions([]);
                                        if (currentQuestion >= exam.questions.length - 1) {
                                            setCurrentQuestion(-1);
                                            audio.playSFX('intro');
                                        } else {
                                            setCurrentQuestion(prev => prev + 1);
                                        }
                                    }}>
                                        {currentQuestion >= exam.questions.length - 1 ? '¡Ver Gran Final! 🏆' : 'Siguiente Pregunta ➡'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {exam && currentQuestion === -1 && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--memphis-yellow)' }}>🏆 {RNG.getFlavor('final')}</h2>
                        <div className="podium" style={{ marginTop: '2rem' }}>
                            {Object.entries(scores)
                                .sort((a, b) => b[1] - a[1])
                                .map(([team, val], i) => (
                                    <div key={team} className="card" style={{ 
                                        margin: '10px 0', 
                                        padding: '1rem',
                                        background: i === 0 ? 'rgba(255,213,10,0.1)' : 'transparent',
                                        borderColor: i === 0 ? 'var(--memphis-yellow)' : 'var(--line)'
                                    }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                                            {i === 0 ? '🥇 Ganador Absoluto' : i === 1 ? '🥈 Segundo Lugar' : i === 2 ? '🥉 Tercer Lugar' : `#${i+1}`}
                                        </div>
                                        <div style={{ fontSize: '1.5rem' }}>{team}</div>
                                        <div className="pill" style={{ display: 'inline-block', marginTop: '5px' }}>{val} XP</div>
                                    </div>
                                ))
                            }
                        </div>
                        <button className="btn primary" style={{ marginTop: '2rem' }} onClick={() => setExam(null)}>Reiniciar Juego</button>
                    </div>
                )}
            </div>

            {exam && (
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h2>🎵 Música de Espera</h2>
                    <div className="smallout" style={{ marginBottom: '1rem' }}>Selecciona la música que suena mientras los equipos piensan.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {Object.entries(WAITING_TRACKS).map(([key, track]) => (
                            <button
                                key={key}
                                className={`btn ${selectedTrack === key ? 'primary' : ''}`}
                                onClick={() => setSelectedTrack(key)}
                                style={{
                                    background: selectedTrack === key ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    borderColor: selectedTrack === key ? 'transparent' : 'var(--line)',
                                }}
                            >
                                {track.name}
                            </button>
                        ))}
                    </div>
                    {audio.isPlaying && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(45,212,191,0.1)', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--good)' }}>
                            🎵 {WAITING_TRACKS[audio.currentTrack]?.name || 'Reproduciendo...'} en curso
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default GroupExam;

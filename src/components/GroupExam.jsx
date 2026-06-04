import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from './NotificationContext';
import { useAudio, WAITING_TRACKS } from './AudioContext';
import { RNG } from '../utils/rng';
import confetti from 'canvas-confetti';
import BoardGame from './BoardGame';
import AvatarSelector from './AvatarSelector';

const GroupExam = ({ pickerItems = [] }) => {
    const { alert, confirm } = useNotifications();
    const audio = useAudio();
    const [exam, setExam] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [scores, setScores] = useState({});
    const [selectedTrack, setSelectedTrack] = useState('jeopardy');
    const [activeTeam, setActiveTeam] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [showMusicMenu, setShowMusicMenu] = useState(false);
    
    // NEW GAME SHOW FEATURES
    const [settings, setSettings] = useState({
        timer: true,
        rebote: true,
        jokers: true,
        suspense: true,
        duration: 25,
        quickMode: false
    });

    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const [roboTeam, setRoboTeam] = useState(null);
    const [hiddenOptions, setHiddenOptions] = useState([]);
    const [teamLog, setTeamLog] = useState({}); // { teamName: { jokers: { fifty: bool, expert: bool } } }
    
    // Updated for multiple jokers: { [teamName]: { fifty: bool, shield: bool, freeze: bool } }
    const [usedJokers, setUsedJokers] = useState({});
    const [activeJoker, setActiveJoker] = useState(null);
    const [wrongOptions, setWrongOptions] = useState([]);
    const [wager, setWager] = useState(0);
    const [wagerConfirmed, setWagerConfirmed] = useState(false);
    const [speedBonusAwarded, setSpeedBonusAwarded] = useState(false);

    const [editedQuestions, setEditedQuestions] = useState([
        { text: "Â¿CuÃ¡l es el Ã³rgano mÃ¡s grande del cuerpo humano?", options: ["El corazÃ³n", "El hÃ­gado", "La piel", "Los pulmones"], correctIndex: 2, explanation: "La piel es el Ã³rgano mÃ¡s grande del cuerpo humano, cubriendo toda la superficie externa." }
    ]);
    
    const [teamAvatars, setTeamAvatars] = useState({});
    const [visualScores, setVisualScores] = useState({}); // Separate from real scores
    const [setupPhase, setSetupPhase] = useState('upload'); // upload, edit, avatar, game

    const validateExamJSON = (data) => {
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error("El archivo debe contener una lista llamada 'questions'.");
        }
        if (data.questions.length === 0) {
            throw new Error("La lista 'questions' no puede estar vacÃ­a.");
        }
        data.questions.forEach((q, idx) => {
            if (!q.text || typeof q.text !== 'string') {
                throw new Error(`La pregunta ${idx + 1} no tiene un texto vÃ¡lido.`);
            }
            if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
                throw new Error(`La pregunta ${idx + 1} debe tener al menos 2 opciones.`);
            }
            if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                throw new Error(`La pregunta ${idx + 1} tiene un 'correctIndex' invÃ¡lido (${q.correctIndex}). Debe corresponder al Ã­ndice de una de sus opciones (0 a ${q.options.length - 1}).`);
            }
        });
    };

    const timerRef = useRef(null);
    const handleTimeOutRef = useRef(null);

    // Stop audio when exam closes or component unmounts
    useEffect(() => {
        if (!exam) audio.stop();
        stopTimer();
    }, [exam]);

    // Keep handleTimeOut reference fresh to avoid stale closures in the timer interval
    useEffect(() => {
        handleTimeOutRef.current = handleTimeOut;
    });

    // TIMER LOGIC
    useEffect(() => {
        if (isTimerActive) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        if (handleTimeOutRef.current) handleTimeOutRef.current();
                        return 0;
                    }
                    if (prev <= 5) audio.playSFX('tick');
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isTimerActive, currentQuestion, activeTeam, roboTeam, audio]);

    const stopTimer = () => {
        setIsTimerActive(false);
        clearInterval(timerRef.current);
    };

    const handleTimeOut = () => {
        audio.stop();
        audio.playSFX('buzzer');
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        setFeedback({ type: 'incorrect', msg: 'â³ Â¡TIEMPO AGOTADO! ' + RNG.getFlavor('wrong') });
        if (settings.rebote) startRoboPhase();
    };

    const useFiftyFifty = () => {
        if (!question || !activeTeam) return;
        const correctIdx = question.correctIndex;
        const incorrectIndices = question.options
            .map((_, idx) => idx)
            .filter(idx => idx !== correctIdx);
        
        // Randomly pick 2 incorrect indices to hide
        const shuffled = RNG.shuffle(incorrectIndices);
        const toHide = shuffled.slice(0, 2);
        
        setHiddenOptions(toHide);
        setUsedJokers(prev => ({
            ...prev,
            [activeTeam]: {
                ...(prev[activeTeam] || { fifty: false, shield: false, freeze: false }),
                fifty: true
            }
        }));
        audio.playSFX('click');
    };

    const useShield = () => {
        if (!activeTeam) return;
        setActiveJoker('shield');
        setUsedJokers(prev => ({
            ...prev,
            [activeTeam]: {
                ...(prev[activeTeam] || { fifty: false, shield: false, freeze: false }),
                shield: true
            }
        }));
        audio.playSFX('click');
        if (navigator.vibrate) navigator.vibrate(60);
    };

    const useFreeze = () => {
        if (!activeTeam) return;
        stopTimer();
        setUsedJokers(prev => ({
            ...prev,
            [activeTeam]: {
                ...(prev[activeTeam] || { fifty: false, shield: false, freeze: false }),
                freeze: true
            }
        }));
        audio.playSFX('boing');
        if (navigator.vibrate) navigator.vibrate(60);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                validateExamJSON(data);
                
                setExam(data);
                setEditedQuestions(data.questions);
                setCurrentQuestion(0);
                setFeedback(null);

                const initialScores = {};
                const initialVisual = {};
                const initialJokers = {};
                pickerItems.forEach(item => {
                    initialScores[item] = 0;
                    initialVisual[item] = 0;
                    initialJokers[item] = { fifty: false, shield: false, freeze: false };
                });
                setScores(initialScores);
                setVisualScores(initialVisual);
                setUsedJokers(initialJokers);
                
                audio.playSFX('intro');
                setSetupPhase('avatar');
            } catch (err) {
                audio.playSFX('incorrect');
                await alert("Error de Archivo", err.message || "El archivo JSON no es vÃ¡lido o tiene un formato ¡Incorrecto.");
            }
        };
        reader.readAsText(file);
    const addQuestion = () => {
        setEditedQuestions(prev => [
            ...prev,
            {
                text: "",
                options: ["OpciÃ³n A", "OpciÃ³n B", "OpciÃ³n C", "OpciÃ³n D"],
                correctIndex: 0,
                explanation: ""
            }
        ]);
        audio.playSFX('click');
    };

    const removeQuestion = (index) => {
        setEditedQuestions(prev => prev.filter((_, idx) => idx !== index));
        audio.playSFX('click');
    };

    const updateQuestion = (index, field, value) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx === index) {
                return { ...q, [field]: value };
            }
            return q;
        }));
    };

    const updateOption = (qIndex, oIndex, value) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx === qIndex) {
                const newOpts = [...q.options];
                newOpts[oIndex] = value;
                return { ...q, options: newOpts };
            }
            return q;
        }));
    };

    const addOption = (qIndex) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx === qIndex) {
                if (q.options.length >= 4) return q;
                return { ...q, options: [...q.options, `OpciÃ³n ${String.fromCharCode(65 + q.options.length)}`] };
            }
            return q;
        }));
        audio.playSFX('click');
    };

    const removeOption = (qIndex, oIndex) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx === qIndex) {
                if (q.options.length <= 2) return q;
                const newOpts = q.options.filter((_, oi) => oi !== oIndex);
                let newCorrect = q.correctIndex;
                if (q.correctIndex >= newOpts.length) {
                    newCorrect = 0;
                }
                return { ...q, options: newOpts, correctIndex: newCorrect };
            }
            return q;
        }));
        audio.playSFX('click');
    };

    const saveAndStart = async () => {
        try {
            const data = { questions: editedQuestions };
            validateExamJSON(data);
            
            setExam(data);
            setCurrentQuestion(0);
            setFeedback(null);

            const initialScores = {};
            const initialVisual = {};
            const initialJokers = {};
            pickerItems.forEach(item => {
                initialScores[item] = 0;
                initialVisual[item] = 0;
                initialJokers[item] = { fifty: false, shield: false, freeze: false };
            });
            setScores(initialScores);
            setVisualScores(initialVisual);
            setUsedJokers(initialJokers);
            
            audio.playSFX('intro');
            setSetupPhase('avatar');
        } catch (err) {
            audio.playSFX('incorrect');
            await alert("Error en Examen", err.message || "Las preguntas no son vÃ¡lidas.");
        }
    };

    const exportExamJSON = () => {
        try {
            const data = { questions: editedQuestions };
            validateExamJSON(data);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `examen-medclass-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            audio.playSFX('correct');
        } catch (err) {
            audio.playSFX('incorrect');
            alert("Error al Exportar", err.message || "Las preguntas tienen errores y no se pueden exportar.");
        }
    };

    const startEditing = () => {
        audio.playSFX('click');
        if (exam && exam.questions) {
            setEditedQuestions(exam.questions);
        }
        setSetupPhase('edit');
    };

    const nextTurn = async () => {
        if (pickerItems.length === 0) {
            return await alert("Sin Equipos", "Ingresa nombres o equipos en la pestaña Sorteo para asignar turnos.");
        }
        
        // Reset turn-specific states
        setActiveJoker(null);
        setWrongOptions([]);
        setSpeedBonusAwarded(false);
        setWagerConfirmed(false);
        setWager(0);

        // Play waiting music
        audio.play(selectedTrack);
        const chosen = RNG.pick(pickerItems, "exam_turn");
        setActiveTeam(chosen);
        setFeedback(null);
        setRoboTeam(null);
        setHiddenOptions([]);
        
        if (settings.timer && !settings.quickMode) {
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

    const answer = async (optionIndex, isRobo = false) => {
        const team = isRobo ? roboTeam : activeTeam;
        if (!team) return;

        const isCorrect = optionIndex === question.correctIndex;
        stopTimer();
        audio.stop();

        if (settings.suspense && !isRobo) {
            setIsRevealing(true);
            audio.playSFX('drumroll');
            await new Promise(r => setTimeout(r, 2500));
            setIsRevealing(false);
        }

        if (isCorrect) {
            let xp = isRobo ? 5 : 10;
            let speedBonusMsg = "";
            
            // Check speed bonus (answered in <= 7 seconds)
            if (!isRobo && settings.timer && timeLeft >= (settings.duration - 7)) {
                xp += 3;
                setSpeedBonusAwarded(true);
                speedBonusMsg = " ⚡ ¡BONO DE VELOCIDAD! (+3 XP)";
            }

            // Check wager in the final question
            const isLastQ = currentQuestion === exam.questions.length - 1;
            if (isLastQ && !isRobo && wagerConfirmed) {
                xp = wager;
            }

            setScores(prev => ({ ...prev, [team]: (prev[team] || 0) + xp }));
            
            // Visual score increment
            const baseVisual = 100 / (exam?.questions.length || 10);
            const randomExtra = RNG.int(-2, 4);
            const visualMove = Math.max(1, baseVisual + randomExtra);
            setVisualScores(prev => ({ ...prev, [team]: (prev[team] || 0) + visualMove }));

            if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            audio.playSFX('correct');
            
            // Play victory sound if it's the last question
            if (isLastQ) {
                setTimeout(() => audio.playSFX('victory'), 800);
            } else {
                audio.playSFX('applause');
            }
            
            setFeedback({ 
                type: 'correct', 
                msg: RNG.getFlavor('correct') + ` +${xp} XP.${speedBonusMsg}`,
                explanation: question.explanation || ""
            });
            setRoboTeam(null);
        } else {
            // Add to wrong options so we can style/disable it
            setWrongOptions(prev => [...prev, optionIndex]);
            
            if (navigator.vibrate) navigator.vibrate(200);

            let xpLoss = 0;
            let shieldProtected = false;
            
            // Check shield joker
            if (!isRobo && activeJoker === 'shield') {
                shieldProtected = true;
            }

            // Check wager loss in the final question
            const isLastQ = currentQuestion === exam.questions.length - 1;
            if (isLastQ && !isRobo && wagerConfirmed) {
                xpLoss = wager;
                setScores(prev => ({ ...prev, [team]: Math.max(0, (prev[team] || 0) - xpLoss) }));
            }

            // Small visual setback on board
            if (!shieldProtected) {
                const setback = isLastQ && !isRobo && wagerConfirmed ? Math.round(wager / 2) : RNG.int(1, 3);
                setVisualScores(prev => ({ ...prev, [team]: Math.max(0, (prev[team] || 0) - setback) }));
            }

            const shieldMsg = shieldProtected ? " 🛡️ ¡El Escudo evitó penalizaciones!" : "";
            const wagerMsg = xpLoss > 0 ? ` Perdió ${xpLoss} XP.` : "";

            if (!isRobo && settings.rebote) {
                audio.playSFX('incorrect');
                // Set temporary feedback to indicate incorrect answer, but keep options clickable for robo phase
                setFeedback({
                    type: 'incorrect_temporary',
                    msg: `¡Incorrecto para ${team}!${shieldMsg}${wagerMsg} Pasando al rebote...`
                });
                setTimeout(startRoboPhase, 1800);
            } else {
                audio.playSFX('incorrect_heavy');
                // End of question resolution (either robo failed, or rebote is disabled)
                setFeedback({
                    type: 'incorrect',
                    msg: `¡Incorrecto!${shieldMsg}${wagerMsg}`,
                    explanation: question.explanation || ""
                });
                setRoboTeam(null);
            }
        }

        // Play final sound if last question resolved
        const isLastQuestion = currentQuestion === exam.questions.length - 1;
        if (isLastQuestion && (optionIndex === question.correctIndex || (isRobo || !settings.rebote))) {
            if (optionIndex !== question.correctIndex) {
                 setTimeout(() => audio.playSFX('lose'), 1200);
            } else {
                 setTimeout(() => audio.playSFX('victory'), 1200);
            }
        }
    };

    const question = exam?.questions?.[currentQuestion];

    return (
        <div className="grid">
            <div className={`card full-width`} style={{ gridColumn: 'span 2' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h2>Examen Grupal</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <button 
                                className="btn" 
                                style={{ background: 'var(--bg-secondary)', border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 900 }}
                                onClick={() => {
                                    audio.unlock();
                                    audio.playSFX('click');
                                    setShowMusicMenu(!showMusicMenu);
                                }}
                            >
                                ðŸ“» Configurar Audio
                            </button>
                            <AnimatePresence>
                                {showMusicMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        style={{ position: 'absolute', top: '100%', right: 0, marginTop: '10px', background: 'var(--bg)', border: '3px solid var(--line)', padding: '10px', borderRadius: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '200px', boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}
                                    >
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '5px', color: 'var(--muted)' }}>Elegir Pista:</div>
                                        {Object.entries(WAITING_TRACKS).map(([key, track]) => (
                                            <button key={key} style={{ padding: '8px', background: selectedTrack === key ? 'var(--primary)' : 'transparent', color: selectedTrack === key ? 'white' : 'var(--text)', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: selectedTrack === key ? 'bold' : 'normal' }} onClick={() => { setSelectedTrack(key); setShowMusicMenu(false); audio.play(key); }}>
                                                {track.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {setupPhase === 'game' && (
                            <button className="btn" onClick={async () => {
                                if(await confirm('Â¿Cerrar Examen?', 'Â¿Seguro que quieres cerrar el examen? Se perderÃ¡ el progreso.')) {
                                    setExam(null);
                                    setSetupPhase('upload');
                                }
                            }}>ðŸ›‘ Cerrar Examen</button>
                        )}
                    </div>
                </div>

                {setupPhase === 'upload' && (
                    <div>
                        <p className="muted" style={{ marginBottom: '1rem' }}>Sube un archivo JSON para gamificar evaluaciones por equipos con mÃºsica y efectos.</p>
                        <p>Importa el JSON del examen o utiliza el editor visual para crearlo.</p>
                        <div className="row" style={{ margin: '15px 0', flexWrap: 'wrap', gap: '10px' }}>
                            <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} id="json-upload-input" />
                            <label htmlFor="json-upload-input" className="btn" style={{ cursor: 'pointer', display: 'inline-block', border: '2px solid var(--line)', background: 'var(--bg)' }}>
                                ðŸ“ Subir Archivo JSON
                            </label>
                            <button className="btn primary" onClick={startEditing}>
                                âœï¸ DiseÃ±ar Examen (Editor)
                            </button>
                            <button className="btn" onClick={() => setShowGuide(!showGuide)}>
                                {showGuide ? 'Ocultar GuÃ­a' : 'Ver Estructura JSON'}
                            </button>
                            <button className="btn" onClick={() => {
                                const template = {
                                    questions: [
                                        {
                                            text: "Â¿Pregunta de ejemplo?",
                                            options: ["A", "B", "C", "D"],
                                            correctIndex: 0
                                        }
                                    ]
                                };
                                navigator.clipboard.writeText(JSON.stringify(template, null, 2));
                                alert("Copiado al portapapeles", "Pega el cÃ³digo en un archivo .json");
                            }}>
                                ðŸ“‹ Copiar Plantilla
                            </button>
                        </div>

                        {showGuide && (
                            <div className="smallout" style={{ textAlign: 'left', background: 'var(--bg-secondary)', border: '2px dashed var(--line)', color: 'var(--text)', padding: '1rem', borderRadius: '12px' }}>
                                <strong>Estructura requerida:</strong>
                                <pre style={{ fontSize: '12px', marginTop: '10px', color: 'var(--memphis-purple)', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
                                    {`{
  "questions": [
    {
      "text": "Â¿Pregunta?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "RetroalimentaciÃ³n de la pregunta."
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
                                Comodines (50/50, Escudo, Congelar)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.suspense} onChange={e => setSettings({...settings, suspense: e.target.checked})} />
                                Suspenso (Redoble)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.quickMode} onChange={e => setSettings({...settings, quickMode: e.target.checked})} />
                                Modo RÃ¡pido (Sin Tiempo)
                            </label>
                        </div>
                        {settings.timer && (
                            <input 
                                type="range" min="5" max="120" step="5" 
                                value={settings.duration} 
                                onChange={e => setSettings({...settings, duration: parseInt(e.target.value)})}
                                style={{ width: '100%', marginTop: '10px' }}
                            />
                        )}
                    </div>
                )}

                {setupPhase === 'edit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button className="btn primary" onClick={addQuestion}>âž• AÃ±adir Pregunta</button>
                                <button className="btn good" style={{ background: 'var(--good)', color: 'white' }} onClick={saveAndStart}>ðŸŽ® Guardar y Jugar</button>
                                <button className="btn" onClick={exportExamJSON} disabled={editedQuestions.length === 0}>ðŸ“¥ Exportar JSON</button>
                            </div>
                            <button className="btn" onClick={() => setSetupPhase('upload')}>â†©ï¸ Volver</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                            {editedQuestions.map((q, qIdx) => (
                                <div key={qIdx} className="card" style={{ background: 'var(--bg-secondary)', border: '2px solid var(--line)', padding: '1rem', position: 'relative', marginBottom: '0.5rem' }}>
                                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                        <h4 style={{ margin: 0, color: 'var(--primary)', fontWeight: 900 }}>Pregunta #{qIdx + 1}</h4>
                                        {editedQuestions.length > 1 && (
                                            <button className="btn error" style={{ padding: '2px 8px', fontSize: '0.8rem', background: 'var(--error)', color: 'white' }} onClick={() => removeQuestion(qIdx)}>âœ• Eliminar</button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Texto de la Pregunta:</label>
                                        <input 
                                            type="text" 
                                            placeholder="Escribe la pregunta aquÃ­..." 
                                            value={q.text} 
                                            onChange={e => updateQuestion(qIdx, 'text', e.target.value)} 
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text)' }} 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Opciones (marca la correcta):</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input 
                                                        type="radio" 
                                                        name={`correct-${qIdx}`} 
                                                        checked={q.correctIndex === oIdx} 
                                                        onChange={() => updateQuestion(qIdx, 'correctIndex', oIdx)} 
                                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }} 
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={opt} 
                                                        onChange={e => updateOption(qIdx, oIdx, e.target.value)} 
                                                        style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }} 
                                                    />
                                                    {q.options.length > 2 && (
                                                        <button 
                                                            className="btn error" 
                                                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--error)', color: 'white' }} 
                                                            onClick={() => removeOption(qIdx, oIdx)}
                                                        >
                                                            âœ•
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {q.options.length < 4 && (
                                            <button 
                                                className="btn" 
                                                style={{ alignSelf: 'flex-start', marginTop: '5px', padding: '4px 10px', fontSize: '0.8rem' }} 
                                                onClick={() => addOption(qIdx)}
                                            >
                                                âž• AÃ±adir OpciÃ³n
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ExplicaciÃ³n DidÃ¡ctica (opcional):</label>
                                        <textarea 
                                            placeholder="Explica por quÃ© esta es la respuesta correcta para retroalimentar a la clase..." 
                                            value={q.explanation || ""} 
                                            onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)} 
                                            rows="2"
                                            style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {setupPhase === 'avatar' && (
                    <AvatarSelector 
                        teams={pickerItems} 
                        onComplete={(selections) => {
                            setTeamAvatars(selections);
                            setSetupPhase('game');
                            // Start first turn automatically if quick mode or just to save clicks
                            nextTurn(); 
                        }} 
                    />
                )}

                {setupPhase === 'game' && exam && currentQuestion >= 0 && (
                    <div className="game-dashboard" style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(110px, 0.7fr) 2.5fr 1.2fr',
                        gap: 'clamp(0.5rem, 1.2vw, 1.5rem)',
                        alignItems: 'start'
                    }}>
                        {/* LEFT COLUMN: RANKING */}
                        <div className="card" style={{ padding: 'clamp(0.4rem, 1vw, 1rem)', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '3px solid var(--line)' }}>
                            <h4 style={{ margin: '0 0 0.2rem 0', textTransform: 'uppercase', fontSize: '0.65rem', opacity: 0.7 }}>ðŸ† ClasificaciÃ³n</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.5vh, 8px)' }}>
                                <AnimatePresence>
                                {Object.entries(visualScores)
                                    .sort((a, b) => b[1] - a[1]) // Sort by visual position on board
                                    .map(([team, vScore], idx) => {
                                        const val = scores[team] || 0; // Show actual XP
                                        const isActive = (roboTeam || activeTeam) === team;
                                        return (
                                            <motion.div key={team} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{
                                                padding: 'clamp(3px, 0.6vh, 6px) 6px',
                                                background: isActive ? 'var(--primary)' : 'var(--bg-secondary)',
                                                color: isActive ? 'white' : 'var(--text)',
                                                border: isActive ? '2px solid var(--text)' : '2px solid var(--line)',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                fontSize: 'clamp(0.6rem, 1.1vw, 0.75rem)',
                                                boxShadow: isActive ? '0 8px 12px rgba(0,0,0,0.2)' : 'none',
                                                transition: 'background 0.3s ease, box-shadow 0.3s ease',
                                                position: 'relative'
                                            }}>
                                                <span style={{ fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
                                                    {(teamAvatars[team]?.startsWith('data:image') || teamAvatars[team]?.includes('.png'))
                                                        ? <img src={teamAvatars[team]} alt={team} style={{width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover'}} /> 
                                                        : (teamAvatars[team] || 'ðŸ‘¤')}
                                                </span>
                                                <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div style={{ fontSize: '0.55rem', opacity: 0.7, fontWeight: 900 }}>RANK {idx + 1}</div>
                                                    <div style={{ fontWeight: 900 }}>{val} XP</div>
                                                </div>
                                                {isActive && <div className="pulse" style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></div>}
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* CENTER COLUMN: BOARD */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: '5px', borderRadius: '18px', border: '4px solid var(--line)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '100%' }}>
                                <BoardGame 
                                    teams={pickerItems} 
                                    totalSteps={100} 
                                    scores={visualScores} 
                                    avatars={teamAvatars} 
                                    activeTeam={roboTeam || activeTeam}
                                />
                            </div>
                            <div className="row" style={{ justifyContent: 'space-between', color: 'var(--text)', fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)', padding: '0 0.2rem' }}>
                                <span>ðŸ“º Pregunta {currentQuestion + 1} / {exam.questions.length}</span>
                                <span style={{ color: 'var(--primary)' }}>{Math.round(((currentQuestion + 1) / exam.questions.length) * 100)}% Completado</span>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: QUESTIONS & CONTROLS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.35rem, 0.7vh, 1rem)' }}>
                            {settings.timer && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div className="timer-bar-container" style={{ flex: 1, height: 'clamp(10px, 1.5vh, 14px)', background: 'rgba(0,0,0,0.1)', border: '2px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                                        <div className="timer-bar" style={{ 
                                            width: isTimerActive ? `${(timeLeft / settings.duration) * 100}%` : '0%', 
                                            height: '100%', 
                                            background: timeLeft <= 5 ? 'var(--error)' : 'var(--good)',
                                            transition: 'width 1s linear'
                                        }}></div>
                                    </div>
                                    {isTimerActive && ( // Show only when timer is running
                                        <button className="btn" style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 900, background: 'var(--bg-secondary)', borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => {
                                            audio.playSFX('click');
                                            setTimeLeft(prev => prev + 15);
                                        }}>
                                            +15s
                                        </button>
                                    )}
                                </div>
                            )}

                            {roboTeam && (
                                <div className="card shake" style={{ background: 'var(--warn)', color: '#000', textAlign: 'center', padding: 'clamp(0.4rem, 0.8vh, 1rem)', marginBottom: 0, border: '4px solid var(--line)', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                                    <h3 style={{ margin: 0, fontSize: 'clamp(0.75rem, 1.3vw, 0.9rem)' }}>ðŸš¨ Â¡ROBO DE PUNTOS! ðŸš¨</h3>
                                    <div style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', fontWeight: 900 }}>{roboTeam}</div>
                                </div>
                            )}

                            {!roboTeam && !activeTeam && !feedback && (
                                <div className="card" style={{ textAlign: 'center', padding: 'clamp(0.6rem, 1.2vh, 1.5rem)', marginBottom: 0, background: 'var(--bg-secondary)', border: '4px dashed var(--primary)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: 'clamp(0.85rem, 1.4vw, 1rem)' }}>Siguiente Participante</h3>
                                    <button className="btn primary" style={{ width: '100%', fontSize: 'clamp(1rem, 1.7vw, 1.2rem)', padding: 'clamp(0.5rem, 1vh, 1rem)' }} onClick={nextTurn}>
                                        ðŸŽ² ASIGNAR TURNO
                                    </button>
                                </div>
                            )}

                            {/* Gran Final Wager Screen */}
                            {exam && currentQuestion === exam.questions.length - 1 && activeTeam && !wagerConfirmed && !feedback && !roboTeam && (
                                <div className="card" style={{ background: 'var(--bg-secondary)', border: '4px solid var(--primary)', padding: '1rem', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                                    <h3 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>ðŸ† LA GRAN FINAL ðŸ†</h3>
                                    <p style={{ fontSize: '0.85rem', margin: '10px 0', color: 'var(--text)' }}>
                                        Es la Ãºltima pregunta. El equipo <strong>{activeTeam}</strong> tiene <strong>{scores[activeTeam] || 0} XP</strong>.
                                    </p>
                                    <div style={{ margin: '15px 0' }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                                            Â¿CuÃ¡ntos puntos deseas apostar?
                                        </label>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max={scores[activeTeam] || 0} 
                                            value={wager} 
                                            onChange={e => setWager(parseInt(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', marginTop: '5px' }}>
                                            {wager} XP
                                        </div>
                                    </div>
                                    <button 
                                        className="btn primary" 
                                        style={{ width: '100%' }} 
                                        onClick={() => {
                                            audio.playSFX('click');
                                            setWagerConfirmed(true);
                                            // Start the timer when the wager is confirmed
                                            if (settings.timer && !settings.quickMode) {
                                                setTimeLeft(settings.duration);
                                                setIsTimerActive(true);
                                            }
                                        }}
                                    >
                                        Confirmar Apuesta y Ver Pregunta
                                    </button>
                                </div>
                            )}

                            {!roboTeam && activeTeam && !feedback && (exam && currentQuestion !== exam.questions.length - 1 || wagerConfirmed) && (
                                <div className="card" style={{ background: 'var(--primary)', color: '#fff', border: '4px solid var(--line)', textAlign: 'center', padding: 'clamp(0.4rem, 0.8vh, 1rem)', marginBottom: 0, boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}>
                                    <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontSize: 'clamp(0.65rem, 1.1vw, 0.8rem)' }}>ðŸŽ™ï¸ PREGUNTA AL AIRE</h3>
                                    <div style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)', fontWeight: 900 }}>{activeTeam}</div>
                                    {wagerConfirmed && (
                                        <div style={{ fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', marginTop: '5px', fontWeight: 'bold' }}>
                                            Apuesta: {wager} XP
                                        </div>
                                    )}
                                    {settings.jokers && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                                            {!usedJokers[activeTeam]?.fifty && (
                                                <button 
                                                    className="btn warn" 
                                                    style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text)', borderColor: 'var(--line)', boxShadow: 'none' }}
                                                    onClick={useFiftyFifty}
                                                >
                                                    ðŸŒ“ ComodÃ­n 50/50
                                                </button>
                                            )}
                                            {!usedJokers[activeTeam]?.shield && !activeJoker && (
                                                <button 
                                                    className="btn info" 
                                                    style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text)', borderColor: 'var(--line)', boxShadow: 'none' }}
                                                    onClick={useShield}
                                                >
                                                    ðŸ›¡ï¸ ComodÃ­n Escudo (No retrocede)
                                                </button>
                                            )}
                                            {activeJoker === 'shield' && (
                                                <div style={{ fontSize: '0.8rem', color: '#ffeb3b', fontWeight: 'bold', marginTop: '5px' }}>ðŸ›¡ï¸ Escudo Activo para este turno</div>
                                            )}
                                            {!usedJokers[activeTeam]?.freeze && settings.timer && isTimerActive && (
                                                <button 
                                                    className="btn success" 
                                                    style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text)', borderColor: 'var(--line)', boxShadow: 'none' }}
                                                    onClick={useFreeze}
                                                >
                                                    â±ï¸ Congelar Tiempo
                                                </button>
                                            )}
                                            {!isTimerActive && usedJokers[activeTeam]?.freeze && (
                                                <div style={{ fontSize: '0.8rem', color: '#ffeb3b', fontWeight: 'bold', marginTop: '5px' }}>â±ï¸ Tiempo Congelado para este turno</div>
                                            )}
                                             {question && (exam && currentQuestion !== exam.questions.length - 1 || wagerConfirmed || roboTeam) && (
                                <div className="exam-content" style={{ marginTop: 0 }}>
                                    <div className="exam-question" style={{ background: 'var(--bg-secondary)', fontSize: 'clamp(0.85rem, 1.4vw, 1rem)', color: 'var(--text)', border: '3px solid var(--line)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', padding: 'clamp(0.6rem, 1.1vw, 1.2rem)' }}>
                                        {question.text}
                                    </div>
                                    <div className="exam-options" style={{ gap: 'clamp(5px, 0.7vh, 10px)', marginTop: 'clamp(0.4rem, 0.7vh, 1rem)' }}>
                                        {question.options.map((opt, i) => {
                                            const isResolved = feedback && feedback.type !== 'incorrect_temporary';
                                            let bg = 'var(--bg)';
                                            let fg = 'var(--text)';
                                            let border = '2px solid var(--line)';
                                            
                                            if (isResolved && i === question.correctIndex) {
                                                bg = 'var(--good)';
                                                fg = 'white';
                                                border = '2px solid var(--good)';
                                            } else if (wrongOptions.includes(i)) {
                                                bg = 'var(--error)';
                                                fg = 'white';
                                                border = '2px solid var(--error)';
                                            }

                                            return (
                                                <button
                                                    key={i}
                                                    disabled={!!feedback || isRevealing || hiddenOptions.includes(i) || wrongOptions.includes(i)}
                                                    className={`btn exam-option`}
                                                    style={{
                                                        visibility: hiddenOptions.includes(i) ? 'hidden' : 'visible',
                                                        width: '100%',
                                                        border: border,
                                                        background: bg,
                                                        color: fg,
                                                        padding: 'clamp(7px, 1.1vh, 14px)',
                                                        fontSize: 'clamp(0.78rem, 1.2vw, 0.95rem)',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => answer(i, !!roboTeam)}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {feedback && feedback.type !== 'incorrect_temporary' && (
                                <div className={`smallout ${feedback.type}`} style={{
                                    background: feedback.type === 'correct' ? 'var(--good)' : 'var(--error)',
                                    color: 'white',
                                    border: '4px solid var(--line)',
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
                                    padding: 'clamp(0.6rem, 1.2vh, 1.5rem)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', fontWeight: 900, marginBottom: '0.5rem' }}>{feedback.msg}</div>
                                    
                                    {feedback.explanation && (
                                        <div style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', margin: '10px 0', textAlign: 'left', borderLeft: '4px solid white' }}>
                                            <strong>ðŸ’¡ ExplicaciÃ³n:</strong> {feedback.explanation}
                                        </div>
                                    )}

                                    <button className="btn primary" style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--line)', width: '100%', fontSize: 'clamp(0.9rem, 1.4vw, 1.1rem)' }} onClick={() => {
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
                                        {currentQuestion >= exam.questions.length - 1 ? 'Â¡¡Ver Gran Final! 🏆ðŸ†' : 'Siguiente Pregunta âž¡'}
                                    </button>
                                </div>
                            )}

                            {feedback && feedback.type === 'incorrect_temporary' && (
                                <div className="card shake" style={{ background: 'var(--error)', color: 'white', textAlign: 'center', padding: '10px', border: '3px solid var(--line)', margin: 0 }}>
                                    <div style={{ fontWeight: 'bold' }}>{feedback.msg}</div>
                                </div>
                            )}Ÿ†' : 'Siguiente Pregunta âž¡'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {exam && currentQuestion === -1 && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>ðŸ† {RNG.getFlavor('final')}</h2>
                        <div className="podium" style={{ marginTop: '2rem' }}>
                            {Object.entries(scores)
                                .sort((a, b) => b[1] - a[1])
                                .map(([team, val], i) => (
                                    <div key={team} className="card" style={{ 
                                        margin: '10px 0', 
                                        padding: '1rem',
                                        background: i === 0 ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                        borderColor: i === 0 ? 'var(--primary)' : 'var(--line)'
                                    }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                                            {i === 0 ? 'ðŸ¥‡ Ganador Absoluto' : i === 1 ? 'ðŸ¥ˆ Segundo Lugar' : i === 2 ? 'ðŸ¥‰ Tercer Lugar' : `#${i+1}`}
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



        </div>
    );
};

export default GroupExam;

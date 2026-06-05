import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from './NotificationContext';
import { useAudio, WAITING_TRACKS } from './AudioContext';
import { RNG } from '../utils/rng';
import confetti from 'canvas-confetti';
import BoardGame from './BoardGame';
import AvatarSelector from './AvatarSelector';

// Helper: detect whether an avatar value is an image (path/data) or an emoji
const isImageAvatar = (value) =>
    typeof value === 'string' && (value.startsWith('data:image') || value.startsWith('/') || value.startsWith('http') || value.includes('.png'));

const emptyJokers = () => ({ fifty: false, shield: false, freeze: false });

const GroupExam = ({ pickerItems = [] }) => {
    const { alert, confirm } = useNotifications();
    const audio = useAudio();

    const [exam, setExam] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [scores, setScores] = useState({});
    const [visualScores, setVisualScores] = useState({}); // Board progress, separate from real XP
    const [selectedTrack, setSelectedTrack] = useState('jeopardy');
    const [activeTeam, setActiveTeam] = useState(null);
    const [roboTeam, setRoboTeam] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [showMusicMenu, setShowMusicMenu] = useState(false);

    // Game show settings
    const [settings, setSettings] = useState({
        timer: true,
        rebote: true,
        jokers: true,
        suspense: true,
        duration: 25,
        quickMode: false,
        shuffleQuestions: false,
        shuffleOptions: false,
    });

    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const [hiddenOptions, setHiddenOptions] = useState([]);
    const [wrongOptions, setWrongOptions] = useState([]);

    // Per-team jokers used across the whole game: { [team]: { fifty, shield, freeze } }
    const [usedJokers, setUsedJokers] = useState({});
    const [activeJoker, setActiveJoker] = useState(null);

    // Gran Final wager
    const [wager, setWager] = useState(0);
    const [wagerConfirmed, setWagerConfirmed] = useState(false);

    const [editedQuestions, setEditedQuestions] = useState([
        {
            text: "¿Cuál es el órgano más grande del cuerpo humano?",
            options: ["El corazón", "El hígado", "La piel", "Los pulmones"],
            correctIndex: 2,
            explanation: "La piel es el órgano más grande del cuerpo humano, cubriendo toda la superficie externa."
        }
    ]);

    const [teamAvatars, setTeamAvatars] = useState({});
    const [setupPhase, setSetupPhase] = useState('upload'); // upload, edit, avatar, game

    // Audio volume control
    const [isMuted, setIsMuted] = useState(false);
    const prevVolume = useRef(audio.volume ?? 0.7);

    const timerRef = useRef(null);
    const handleTimeOutRef = useRef(null);

    const validateExamJSON = (data) => {
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error("El archivo debe contener una lista llamada 'questions'.");
        }
        if (data.questions.length === 0) {
            throw new Error("La lista 'questions' no puede estar vacía.");
        }
        data.questions.forEach((q, idx) => {
            if (!q.text || typeof q.text !== 'string') {
                throw new Error(`La pregunta ${idx + 1} no tiene un texto válido.`);
            }
            if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
                throw new Error(`La pregunta ${idx + 1} debe tener al menos 2 opciones.`);
            }
            if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                throw new Error(`La pregunta ${idx + 1} tiene un 'correctIndex' inválido (${q.correctIndex}). Debe corresponder al índice de una de sus opciones (0 a ${q.options.length - 1}).`);
            }
        });
    };

    // Build the playable exam from raw questions, applying shuffle settings.
    const buildExam = (questions) => {
        let qs = questions.map(q => ({ ...q, options: [...q.options] }));
        if (settings.shuffleOptions) {
            qs = qs.map(q => {
                const order = RNG.shuffle(q.options.map((_, i) => i));
                return {
                    ...q,
                    options: order.map(i => q.options[i]),
                    correctIndex: order.indexOf(q.correctIndex),
                };
            });
        }
        if (settings.shuffleQuestions) {
            qs = RNG.shuffle(qs);
        }
        return { questions: qs };
    };

    const resetScoreboards = () => {
        const initialScores = {};
        const initialVisual = {};
        const initialJokers = {};
        pickerItems.forEach(item => {
            initialScores[item] = 0;
            initialVisual[item] = 0;
            initialJokers[item] = emptyJokers();
        });
        setScores(initialScores);
        setVisualScores(initialVisual);
        setUsedJokers(initialJokers);
    };

    // Stop audio/timer when the exam closes or component unmounts
    useEffect(() => {
        if (!exam) audio.stop();
        stopTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam]);

    // Keep handleTimeOut reference fresh to avoid stale closures inside the interval
    useEffect(() => {
        handleTimeOutRef.current = handleTimeOut;
    });

    // Timer countdown
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

    const question = exam?.questions?.[currentQuestion];
    const isLastQuestion = !!exam && currentQuestion === exam.questions.length - 1;

    // Keyboard shortcuts for projector/classroom use: 1-9 answer, Enter advances feedback.
    useEffect(() => {
        if (setupPhase !== 'game' || !exam) return;
        const handler = (e) => {
            if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

            if (feedback && feedback.type !== 'incorrect_temporary' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                advanceAfterFeedback();
                return;
            }

            const responder = roboTeam || activeTeam;
            const canAnswer = question && responder && !feedback && !isRevealing &&
                (!isLastQuestion || wagerConfirmed || roboTeam);
            if (canAnswer && /^[1-9]$/.test(e.key)) {
                const idx = parseInt(e.key, 10) - 1;
                if (idx < question.options.length && !hiddenOptions.includes(idx) && !wrongOptions.includes(idx)) {
                    e.preventDefault();
                    answer(idx, !!roboTeam);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setupPhase, exam, feedback, isRevealing, activeTeam, roboTeam, hiddenOptions, wrongOptions, wagerConfirmed, currentQuestion]);

    // Celebrate the podium when the game ends
    useEffect(() => {
        if (currentQuestion === -1 && exam) {
            const burst = () => confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 } });
            burst();
            const t1 = setTimeout(burst, 500);
            const t2 = setTimeout(burst, 1100);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [currentQuestion, exam]);

    const stopTimer = () => {
        setIsTimerActive(false);
        clearInterval(timerRef.current);
    };

    const handleTimeOut = () => {
        audio.stop();
        audio.playSFX('buzzer');
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        setFeedback({ type: 'incorrect', msg: '⏳ ¡TIEMPO AGOTADO! ' + RNG.getFlavor('wrong'), explanation: question?.explanation || "" });
        if (settings.rebote) {
            setFeedback(null);
            startRoboPhase();
        }
    };

    // ---- Audio controls ----
    const toggleMute = () => {
        if (isMuted) {
            audio.changeVolume(prevVolume.current || 0.7);
            setIsMuted(false);
        } else {
            prevVolume.current = audio.volume;
            audio.changeVolume(0);
            setIsMuted(true);
        }
        audio.playSFX('click');
    };

    // ---- Jokers ----
    const useFiftyFifty = () => {
        if (!question || !activeTeam) return;
        const incorrect = question.options.map((_, i) => i).filter(i => i !== question.correctIndex);
        const toHide = RNG.shuffle(incorrect).slice(0, Math.min(2, incorrect.length));
        setHiddenOptions(toHide);
        setUsedJokers(prev => ({ ...prev, [activeTeam]: { ...(prev[activeTeam] || emptyJokers()), fifty: true } }));
        audio.playSFX('click');
    };

    const useShield = () => {
        if (!activeTeam) return;
        setActiveJoker('shield');
        setUsedJokers(prev => ({ ...prev, [activeTeam]: { ...(prev[activeTeam] || emptyJokers()), shield: true } }));
        audio.playSFX('click');
        if (navigator.vibrate) navigator.vibrate(60);
    };

    const useFreeze = () => {
        if (!activeTeam) return;
        stopTimer();
        setUsedJokers(prev => ({ ...prev, [activeTeam]: { ...(prev[activeTeam] || emptyJokers()), freeze: true } }));
        audio.playSFX('boing');
        if (navigator.vibrate) navigator.vibrate(60);
    };

    // ---- Editor ----
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                validateExamJSON(data);

                setExam(buildExam(data.questions));
                setEditedQuestions(data.questions);
                setCurrentQuestion(0);
                setFeedback(null);
                resetScoreboards();

                audio.playSFX('intro');
                setSetupPhase('avatar');
            } catch (err) {
                audio.playSFX('incorrect');
                await alert("Error de Archivo", err.message || "El archivo JSON no es válido o tiene un formato incorrecto.");
            }
        };
        reader.readAsText(file);
    };

    const addQuestion = () => {
        setEditedQuestions(prev => [
            ...prev,
            { text: "", options: ["Opción A", "Opción B", "Opción C", "Opción D"], correctIndex: 0, explanation: "" }
        ]);
        audio.playSFX('click');
    };

    const duplicateQuestion = (index) => {
        setEditedQuestions(prev => {
            const copy = { ...prev[index], options: [...prev[index].options] };
            const next = [...prev];
            next.splice(index + 1, 0, copy);
            return next;
        });
        audio.playSFX('click');
    };

    const moveQuestion = (index, dir) => {
        setEditedQuestions(prev => {
            const target = index + dir;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        audio.playSFX('click');
    };

    const removeQuestion = (index) => {
        setEditedQuestions(prev => prev.filter((_, idx) => idx !== index));
        audio.playSFX('click');
    };

    const updateQuestion = (index, field, value) => {
        setEditedQuestions(prev => prev.map((q, idx) => (idx === index ? { ...q, [field]: value } : q)));
    };

    const updateOption = (qIndex, oIndex, value) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx !== qIndex) return q;
            const newOpts = [...q.options];
            newOpts[oIndex] = value;
            return { ...q, options: newOpts };
        }));
    };

    const addOption = (qIndex) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx !== qIndex || q.options.length >= 4) return q;
            return { ...q, options: [...q.options, `Opción ${String.fromCharCode(65 + q.options.length)}`] };
        }));
        audio.playSFX('click');
    };

    const removeOption = (qIndex, oIndex) => {
        setEditedQuestions(prev => prev.map((q, idx) => {
            if (idx !== qIndex || q.options.length <= 2) return q;
            const newOpts = q.options.filter((_, oi) => oi !== oIndex);
            let newCorrect = q.correctIndex;
            if (oIndex === q.correctIndex) newCorrect = 0;
            else if (oIndex < q.correctIndex) newCorrect = q.correctIndex - 1;
            return { ...q, options: newOpts, correctIndex: newCorrect };
        }));
        audio.playSFX('click');
    };

    const saveAndStart = async () => {
        try {
            const data = { questions: editedQuestions };
            validateExamJSON(data);

            setExam(buildExam(editedQuestions));
            setCurrentQuestion(0);
            setFeedback(null);
            resetScoreboards();

            audio.playSFX('intro');
            setSetupPhase('avatar');
        } catch (err) {
            audio.playSFX('incorrect');
            await alert("Error en Examen", err.message || "Las preguntas no son válidas.");
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
            a.download = `examen-medclass-${new Date().toISOString().slice(0, 10)}.json`;
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
        if (exam && exam.questions) setEditedQuestions(exam.questions);
        setSetupPhase('edit');
    };

    // ---- Gameplay ----
    const nextTurn = async () => {
        if (pickerItems.length === 0) {
            return await alert("Sin Equipos", "Ingresa nombres o equipos en la pestaña Sorteo para asignar turnos.");
        }

        setActiveJoker(null);
        setWrongOptions([]);
        setHiddenOptions([]);
        setWagerConfirmed(false);
        setWager(0);
        setFeedback(null);
        setRoboTeam(null);

        audio.play(selectedTrack);
        const chosen = RNG.pick(pickerItems, "exam_turn");
        setActiveTeam(chosen);

        if (settings.timer && !settings.quickMode && !isLastQuestion) {
            setTimeLeft(settings.duration);
            setIsTimerActive(true);
        }

        if (navigator.vibrate) navigator.vibrate(80);
    };

    const startRoboPhase = () => {
        stopTimer();
        const otherTeams = pickerItems.filter(t => t !== activeTeam);
        if (otherTeams.length === 0) return;

        const robo = otherTeams[RNG.pickBalancedIndex(otherTeams.length, "robo_balance")];
        setRoboTeam(robo);
        setFeedback(null); // keep options clickable for the rebound team

        if (settings.timer) {
            setTimeLeft(10); // Less time for rebound tension
            setIsTimerActive(true);
        }

        audio.playSFX('boing');
        if (navigator.vibrate) navigator.vibrate(100);
    };

    const revealAnswer = async () => {
        if (!question) return;
        stopTimer();
        audio.stop();
        const reveal = () => setFeedback({
            type: 'revealed',
            msg: '👁️ Respuesta revelada por el docente',
            explanation: question.explanation || ""
        });
        if (settings.suspense) {
            setIsRevealing(true);
            audio.playSFX('drumroll');
            await new Promise(r => setTimeout(r, 1500));
            setIsRevealing(false);
        }
        reveal();
        setRoboTeam(null);
    };

    const advanceAfterFeedback = () => {
        setFeedback(null);
        setActiveTeam(null);
        setRoboTeam(null);
        setHiddenOptions([]);
        setWrongOptions([]);
        setActiveJoker(null);
        setWagerConfirmed(false);
        setWager(0);
        if (currentQuestion >= exam.questions.length - 1) {
            setCurrentQuestion(-1);
            audio.stop();
            audio.playSFX('intro');
        } else {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const answer = async (optionIndex, isRobo = false) => {
        const team = isRobo ? roboTeam : activeTeam;
        if (!team || !question) return;

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

            if (!isRobo && settings.timer && !settings.quickMode && timeLeft >= (settings.duration - 7)) {
                xp += 3;
                speedBonusMsg = " ⚡ ¡BONO DE VELOCIDAD! (+3 XP)";
            }

            if (isLastQuestion && !isRobo && wagerConfirmed) {
                xp = wager;
            }

            setScores(prev => ({ ...prev, [team]: (prev[team] || 0) + xp }));

            const baseVisual = 100 / (exam?.questions.length || 10);
            const visualMove = Math.max(1, baseVisual + RNG.int(-2, 4));
            setVisualScores(prev => ({ ...prev, [team]: (prev[team] || 0) + visualMove }));

            if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            audio.playSFX('correct');

            if (isLastQuestion) {
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
            setWrongOptions(prev => [...prev, optionIndex]);
            if (navigator.vibrate) navigator.vibrate(200);

            const shieldProtected = !isRobo && activeJoker === 'shield';

            let xpLoss = 0;
            if (isLastQuestion && !isRobo && wagerConfirmed) {
                xpLoss = wager;
                setScores(prev => ({ ...prev, [team]: Math.max(0, (prev[team] || 0) - xpLoss) }));
            }

            if (!shieldProtected) {
                const setback = (isLastQuestion && !isRobo && wagerConfirmed) ? Math.round(wager / 2) : RNG.int(1, 3);
                setVisualScores(prev => ({ ...prev, [team]: Math.max(0, (prev[team] || 0) - setback) }));
            }

            const shieldMsg = shieldProtected ? " 🛡️ ¡El Escudo evitó penalizaciones!" : "";
            const wagerMsg = xpLoss > 0 ? ` Perdió ${xpLoss} XP.` : "";

            if (!isRobo && settings.rebote) {
                audio.playSFX('incorrect');
                setFeedback({ type: 'incorrect_temporary', msg: `¡Incorrecto para ${team}!${shieldMsg}${wagerMsg} Pasando al rebote...` });
                setTimeout(startRoboPhase, 1800);
            } else {
                audio.playSFX('incorrect_heavy');
                setFeedback({
                    type: 'incorrect',
                    msg: `¡Incorrecto! ${RNG.getFlavor('wrong')}${shieldMsg}${wagerMsg}`,
                    explanation: question.explanation || ""
                });
                setRoboTeam(null);
                if (isLastQuestion) setTimeout(() => audio.playSFX('lose'), 1200);
            }
        }
    };

    const exportResults = () => {
        const standings = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([team, xp], i) => ({ posicion: i + 1, equipo: team, xp }));
        const blob = new Blob([JSON.stringify({ fecha: new Date().toISOString(), resultados: standings }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultados-examen-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        audio.playSFX('correct');
    };

    const replaySameTeams = () => {
        resetScoreboards();
        setExam(buildExam(editedQuestions));
        setCurrentQuestion(0);
        setFeedback(null);
        setActiveTeam(null);
        setRoboTeam(null);
        setSetupPhase('game');
        audio.playSFX('intro');
        nextTurn();
    };

    const renderAvatar = (team, size = 24) => {
        const av = teamAvatars[team];
        if (isImageAvatar(av)) {
            return <img src={av} alt={team} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
        }
        return <span style={{ fontSize: `${size * 0.8}px`, lineHeight: 1 }}>{av || '👤'}</span>;
    };

    const showQuestionBlock = question && (activeTeam || roboTeam) && (!isLastQuestion || wagerConfirmed || roboTeam);

    return (
        <div className="grid">
            <div className="card full-width" style={{ gridColumn: 'span 2' }}>
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
                                📻 Configurar Audio
                            </button>
                            <AnimatePresence>
                                {showMusicMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        style={{ position: 'absolute', top: '100%', right: 0, marginTop: '10px', background: 'var(--bg)', border: '3px solid var(--line)', padding: '12px', borderRadius: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '230px', boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}
                                    >
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '2px', color: 'var(--muted)' }}>Elegir Pista:</div>
                                        {Object.entries(WAITING_TRACKS).map(([key, track]) => (
                                            <button key={key} style={{ padding: '8px', background: selectedTrack === key ? 'var(--primary)' : 'transparent', color: selectedTrack === key ? 'white' : 'var(--text)', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: selectedTrack === key ? 'bold' : 'normal' }} onClick={() => { setSelectedTrack(key); audio.play(key); }}>
                                                {track.name}
                                            </button>
                                        ))}
                                        <div className="divider" style={{ margin: '6px 0' }}></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button className="btn" style={{ padding: '4px 10px' }} onClick={toggleMute}>
                                                {isMuted ? '🔇' : '🔊'}
                                            </button>
                                            <input
                                                type="range" min="0" max="1" step="0.05"
                                                value={isMuted ? 0 : (audio.volume ?? 0.7)}
                                                onChange={e => {
                                                    const v = parseFloat(e.target.value);
                                                    audio.changeVolume(v);
                                                    setIsMuted(v === 0);
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                        <button className="btn" style={{ padding: '6px', marginTop: '4px' }} onClick={() => { audio.stop(); }}>
                                            ⏹️ Detener Música
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {setupPhase === 'game' && (
                            <button className="btn" onClick={async () => {
                                if (await confirm('¿Cerrar Examen?', '¿Seguro que quieres cerrar el examen? Se perderá el progreso.')) {
                                    setExam(null);
                                    setSetupPhase('upload');
                                }
                            }}>🛑 Cerrar Examen</button>
                        )}
                    </div>
                </div>

                {/* ===================== UPLOAD PHASE ===================== */}
                {setupPhase === 'upload' && (
                    <div>
                        <p className="muted" style={{ marginBottom: '1rem' }}>Sube un archivo JSON para gamificar evaluaciones por equipos con música y efectos.</p>
                        <p>Importa el JSON del examen o utiliza el editor visual para crearlo.</p>
                        <div className="row" style={{ margin: '15px 0', flexWrap: 'wrap', gap: '10px' }}>
                            <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} id="json-upload-input" />
                            <label htmlFor="json-upload-input" className="btn" style={{ cursor: 'pointer', display: 'inline-block', border: '2px solid var(--line)', background: 'var(--bg)' }}>
                                📁 Subir Archivo JSON
                            </label>
                            <button className="btn primary" onClick={startEditing}>
                                ✏️ Diseñar Examen (Editor)
                            </button>
                            <button className="btn" onClick={() => setShowGuide(!showGuide)}>
                                {showGuide ? 'Ocultar Guía' : 'Ver Estructura JSON'}
                            </button>
                            <button className="btn" onClick={() => {
                                const template = {
                                    questions: [
                                        { text: "¿Pregunta de ejemplo?", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "Retroalimentación opcional." }
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
      "correctIndex": 0,
      "explanation": "Retroalimentación de la pregunta."
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
                                <input type="checkbox" checked={settings.timer} onChange={e => setSettings({ ...settings, timer: e.target.checked })} />
                                Temporizador ({settings.duration}s)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.rebote} onChange={e => setSettings({ ...settings, rebote: e.target.checked })} />
                                Sistema de Rebote
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.jokers} onChange={e => setSettings({ ...settings, jokers: e.target.checked })} />
                                Comodines (50/50, Escudo, Congelar)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.suspense} onChange={e => setSettings({ ...settings, suspense: e.target.checked })} />
                                Suspenso (Redoble)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.quickMode} onChange={e => setSettings({ ...settings, quickMode: e.target.checked })} />
                                Modo Rápido (Sin Tiempo)
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.shuffleQuestions} onChange={e => setSettings({ ...settings, shuffleQuestions: e.target.checked })} />
                                Barajar Preguntas
                            </label>
                            <label className="row" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={settings.shuffleOptions} onChange={e => setSettings({ ...settings, shuffleOptions: e.target.checked })} />
                                Barajar Opciones
                            </label>
                        </div>
                        {settings.timer && (
                            <input
                                type="range" min="5" max="120" step="5"
                                value={settings.duration}
                                onChange={e => setSettings({ ...settings, duration: parseInt(e.target.value) })}
                                style={{ width: '100%', marginTop: '10px' }}
                            />
                        )}
                    </div>
                )}

                {/* ===================== EDIT PHASE ===================== */}
                {setupPhase === 'edit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button className="btn primary" onClick={addQuestion}>➕ Añadir Pregunta</button>
                                <button className="btn good" style={{ background: 'var(--good)', color: 'white' }} onClick={saveAndStart}>🎮 Guardar y Jugar</button>
                                <button className="btn" onClick={exportExamJSON} disabled={editedQuestions.length === 0}>📥 Exportar JSON</button>
                                <span className="pill" style={{ fontSize: '0.8rem' }}>{editedQuestions.length} pregunta{editedQuestions.length !== 1 ? 's' : ''}</span>
                            </div>
                            <button className="btn" onClick={() => setSetupPhase('upload')}>↩️ Volver</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                            {editedQuestions.map((q, qIdx) => (
                                <div key={qIdx} className="card" style={{ background: 'var(--bg-secondary)', border: '2px solid var(--line)', padding: '1rem', position: 'relative', marginBottom: '0.5rem' }}>
                                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '8px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--primary)', fontWeight: 900 }}>Pregunta #{qIdx + 1}</h4>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} disabled={qIdx === 0} onClick={() => moveQuestion(qIdx, -1)} title="Subir">▲</button>
                                            <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} disabled={qIdx === editedQuestions.length - 1} onClick={() => moveQuestion(qIdx, 1)} title="Bajar">▼</button>
                                            <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => duplicateQuestion(qIdx)} title="Duplicar">⧉ Duplicar</button>
                                            {editedQuestions.length > 1 && (
                                                <button className="btn error" style={{ padding: '2px 8px', fontSize: '0.8rem', background: 'var(--error)', color: 'white' }} onClick={() => removeQuestion(qIdx)}>✕ Eliminar</button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Texto de la Pregunta:</label>
                                        <input
                                            type="text"
                                            placeholder="Escribe la pregunta aquí..."
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
                                                        <button className="btn error" style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--error)', color: 'white' }} onClick={() => removeOption(qIdx, oIdx)}>✕</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {q.options.length < 4 && (
                                            <button className="btn" style={{ alignSelf: 'flex-start', marginTop: '5px', padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => addOption(qIdx)}>
                                                ➕ Añadir Opción
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Explicación Didáctica (opcional):</label>
                                        <textarea
                                            placeholder="Explica por qué esta es la respuesta correcta para retroalimentar a la clase..."
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

                {/* ===================== AVATAR PHASE ===================== */}
                {setupPhase === 'avatar' && (
                    <AvatarSelector
                        teams={pickerItems}
                        onComplete={(selections) => {
                            setTeamAvatars(selections);
                            setSetupPhase('game');
                            nextTurn();
                        }}
                    />
                )}

                {/* ===================== GAME PHASE ===================== */}
                {setupPhase === 'game' && exam && currentQuestion >= 0 && (
                    <div className="game-dashboard" style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(100px, 0.6fr) 2fr 1.6fr',
                        gap: 'clamp(0.5rem, 1.2vw, 1.5rem)',
                        alignItems: 'start'
                    }}>
                        {/* LEFT: RANKING */}
                        <div className="card" style={{ padding: 'clamp(0.4rem, 1vw, 1rem)', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '3px solid var(--line)' }}>
                            <h4 style={{ margin: '0 0 0.2rem 0', textTransform: 'uppercase', fontSize: '0.65rem', opacity: 0.7 }}>🏆 Clasificación</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.5vh, 8px)' }}>
                                <AnimatePresence>
                                    {Object.entries(visualScores)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([team], idx) => {
                                            const val = scores[team] || 0;
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
                                                    <span style={{ display: 'flex', alignItems: 'center' }}>{renderAvatar(team, 24)}</span>
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

                        {/* CENTER: BOARD */}
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
                            <div className="row" style={{ justifyContent: 'space-between', color: 'var(--text)', fontWeight: 'bold', fontSize: 'clamp(0.8rem, 1.3vw, 1.15rem)', padding: '0 0.2rem' }}>
                                <span>📺 Pregunta {currentQuestion + 1} / {exam.questions.length}</span>
                                <span style={{ color: 'var(--primary)' }}>{Math.round(((currentQuestion + 1) / exam.questions.length) * 100)}% Completado</span>
                            </div>
                        </div>

                        {/* RIGHT: QUESTIONS & CONTROLS */}
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
                                    {isTimerActive && (
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
                                    <h3 style={{ margin: 0, fontSize: 'clamp(0.75rem, 1.3vw, 0.9rem)' }}>🚨 ¡ROBO DE PUNTOS! 🚨</h3>
                                    <div style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', fontWeight: 900 }}>{roboTeam}</div>
                                </div>
                            )}

                            {!roboTeam && !activeTeam && !feedback && (
                                <div className="card" style={{ textAlign: 'center', padding: 'clamp(0.6rem, 1.2vh, 1.5rem)', marginBottom: 0, background: 'var(--bg-secondary)', border: '4px dashed var(--primary)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: 'clamp(0.85rem, 1.4vw, 1rem)' }}>Siguiente Participante</h3>
                                    <button className="btn primary" style={{ width: '100%', fontSize: 'clamp(1rem, 1.7vw, 1.2rem)', padding: 'clamp(0.5rem, 1vh, 1rem)' }} onClick={nextTurn}>
                                        🎲 ASIGNAR TURNO
                                    </button>
                                </div>
                            )}

                            {/* Gran Final wager */}
                            {isLastQuestion && activeTeam && !wagerConfirmed && !feedback && !roboTeam && (
                                <div className="card" style={{ background: 'var(--bg-secondary)', border: '4px solid var(--primary)', padding: '1rem', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                                    <h3 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>🏆 LA GRAN FINAL 🏆</h3>
                                    <p style={{ fontSize: '0.85rem', margin: '10px 0', color: 'var(--text)' }}>
                                        Es la última pregunta. El equipo <strong>{activeTeam}</strong> tiene <strong>{scores[activeTeam] || 0} XP</strong>.
                                    </p>
                                    <div style={{ margin: '15px 0' }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>¿Cuántos puntos deseas apostar?</label>
                                        <input
                                            type="range" min="0" max={scores[activeTeam] || 0}
                                            value={wager}
                                            onChange={e => setWager(parseInt(e.target.value))}
                                            style={{ width: '100%' }}
                                        />
                                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', marginTop: '5px' }}>{wager} XP</div>
                                    </div>
                                    <button className="btn primary" style={{ width: '100%' }} onClick={() => {
                                        audio.playSFX('click');
                                        setWagerConfirmed(true);
                                        if (settings.timer && !settings.quickMode) {
                                            setTimeLeft(settings.duration);
                                            setIsTimerActive(true);
                                        }
                                    }}>
                                        Confirmar Apuesta y Ver Pregunta
                                    </button>
                                </div>
                            )}

                            {/* Active team header + jokers */}
                            {!roboTeam && activeTeam && !feedback && (!isLastQuestion || wagerConfirmed) && (
                                <div className="card" style={{ background: 'var(--primary)', color: '#fff', border: '4px solid var(--line)', textAlign: 'center', padding: 'clamp(0.4rem, 0.8vh, 1rem)', marginBottom: 0, boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}>
                                    <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontSize: 'clamp(0.7rem, 1.1vw, 0.95rem)' }}>🎙️ PREGUNTA AL AIRE</h3>
                                    <div style={{ fontSize: 'clamp(1.3rem, 2vw, 2rem)', fontWeight: 900 }}>{activeTeam}</div>
                                    {wagerConfirmed && (
                                        <div style={{ fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', marginTop: '5px', fontWeight: 'bold' }}>Apuesta: {wager} XP</div>
                                    )}
                                    {settings.jokers && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                                            {!usedJokers[activeTeam]?.fifty && (
                                                <button className="btn" style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text)', borderColor: 'var(--line)', boxShadow: 'none' }} onClick={useFiftyFifty}>
                                                    🌓 Comodín 50/50
                                                </button>
                                            )}
                                            {!usedJokers[activeTeam]?.shield && !activeJoker && (
                                                <button className="btn" style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text)', borderColor: 'var(--line)', boxShadow: 'none' }} onClick={useShield}>
                                                    🛡️ Comodín Escudo (No retrocede)
                                                </button>
                                            )}
                                            {activeJoker === 'shield' && (
                                                <div style={{ fontSize: '0.8rem', color: '#ffeb3b', fontWeight: 'bold', marginTop: '5px' }}>🛡️ Escudo Activo para este turno</div>
                                            )}
                                            {!usedJokers[activeTeam]?.freeze && settings.timer && isTimerActive && (
                                                <button className="btn" style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text)', borderColor: 'var(--line)', boxShadow: 'none' }} onClick={useFreeze}>
                                                    ⏱️ Congelar Tiempo
                                                </button>
                                            )}
                                            {!isTimerActive && usedJokers[activeTeam]?.freeze && (
                                                <div style={{ fontSize: '0.8rem', color: '#ffeb3b', fontWeight: 'bold', marginTop: '5px' }}>⏱️ Tiempo Congelado para este turno</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Question + options */}
                            {showQuestionBlock && (
                                <div className="exam-content" style={{ marginTop: 0 }}>
                                    <div className="exam-question" style={{ background: 'var(--bg-secondary)', fontSize: 'clamp(1.05rem, 2.1vw, 2rem)', lineHeight: 1.3, color: 'var(--text)', border: '3px solid var(--line)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', padding: 'clamp(0.7rem, 1.3vw, 1.4rem)' }}>
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
                                                    className="btn exam-option"
                                                    style={{
                                                        visibility: hiddenOptions.includes(i) ? 'hidden' : 'visible',
                                                        width: '100%',
                                                        border,
                                                        background: bg,
                                                        color: fg,
                                                        padding: 'clamp(9px, 1.3vh, 18px)',
                                                        fontSize: 'clamp(0.95rem, 1.5vw, 1.45rem)',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                                        transition: 'all 0.2s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px'
                                                    }}
                                                    onClick={() => answer(i, !!roboTeam)}
                                                >
                                                    <span style={{ opacity: 0.55, fontWeight: 900, fontSize: 'clamp(0.7rem, 1vw, 1rem)' }}>{i + 1}.</span>
                                                    <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
                                                    {isResolved && i === question.correctIndex && <span style={{ fontWeight: 900 }}>✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {!feedback && !isRevealing && (
                                        <button className="btn" style={{ width: '100%', marginTop: '8px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--muted)', border: '2px dashed var(--line)' }} onClick={revealAnswer}>
                                            👁️ Revelar respuesta (sin puntos)
                                        </button>
                                    )}
                                    <div style={{ marginTop: '6px', fontSize: '0.65rem', textAlign: 'center', color: 'var(--muted)' }}>
                                        Atajos: teclas 1-{question.options.length} para responder · Enter para continuar
                                    </div>
                                </div>
                            )}

                            {/* Resolved feedback */}
                            {feedback && feedback.type !== 'incorrect_temporary' && (
                                <div className={`smallout ${feedback.type}`} style={{
                                    background: feedback.type === 'correct' ? 'var(--good)' : feedback.type === 'revealed' ? 'var(--secondary)' : 'var(--error)',
                                    color: 'white',
                                    border: '4px solid var(--line)',
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
                                    padding: 'clamp(0.6rem, 1.2vh, 1.5rem)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 'clamp(1.1rem, 2vw, 1.8rem)', fontWeight: 900, marginBottom: '0.5rem' }}>{feedback.msg}</div>

                                    {question && (
                                        <div style={{ fontSize: 'clamp(1rem, 1.7vw, 1.5rem)', fontWeight: 800, background: 'rgba(0,0,0,0.22)', padding: 'clamp(8px, 1vw, 14px)', borderRadius: '10px', margin: '10px 0' }}>
                                            ✅ Respuesta correcta: {question.options[question.correctIndex]}
                                        </div>
                                    )}

                                    {feedback.explanation && (
                                        <div style={{ fontSize: 'clamp(0.95rem, 1.4vw, 1.3rem)', lineHeight: 1.35, background: 'rgba(0,0,0,0.2)', padding: 'clamp(10px, 1.1vw, 16px)', borderRadius: '8px', margin: '10px 0', textAlign: 'left', borderLeft: '4px solid white' }}>
                                            <strong>💡 Explicación:</strong> {feedback.explanation}
                                        </div>
                                    )}

                                    <button className="btn primary" style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--line)', width: '100%', fontSize: 'clamp(1rem, 1.5vw, 1.3rem)', padding: 'clamp(0.5rem, 1vh, 0.9rem)' }} onClick={advanceAfterFeedback}>
                                        {isLastQuestion ? '🏆 ¡Ver Gran Final!' : 'Siguiente Pregunta ➡'}
                                    </button>
                                </div>
                            )}

                            {/* Temporary "wrong, rebound coming" feedback */}
                            {feedback && feedback.type === 'incorrect_temporary' && (
                                <div className="card shake" style={{ background: 'var(--error)', color: 'white', textAlign: 'center', padding: '10px', border: '3px solid var(--line)', margin: 0 }}>
                                    <div style={{ fontWeight: 'bold' }}>{feedback.msg}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===================== RESULTS PHASE ===================== */}
                {exam && currentQuestion === -1 && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>🏆 {RNG.getFlavor('final')}</h2>
                        <div className="podium" style={{ marginTop: '2rem' }}>
                            {Object.entries(scores)
                                .sort((a, b) => b[1] - a[1])
                                .map(([team, val], i) => (
                                    <div key={team} className="card" style={{
                                        margin: '10px 0',
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        justifyContent: 'center',
                                        background: i === 0 ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                        borderColor: i === 0 ? 'var(--primary)' : 'var(--line)'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center' }}>{renderAvatar(team, 40)}</span>
                                        <div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                                                {i === 0 ? '🥇 Ganador Absoluto' : i === 1 ? '🥈 Segundo Lugar' : i === 2 ? '🥉 Tercer Lugar' : `#${i + 1}`}
                                            </div>
                                            <div style={{ fontSize: '1.5rem' }}>{team}</div>
                                            <div className="pill" style={{ display: 'inline-block', marginTop: '5px' }}>{val} XP</div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        <div className="row" style={{ justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2rem' }}>
                            <button className="btn primary" onClick={replaySameTeams}>🔁 Jugar de nuevo (mismos equipos)</button>
                            <button className="btn" onClick={exportResults}>📊 Exportar Resultados</button>
                            <button className="btn" onClick={() => { setExam(null); setSetupPhase('upload'); }}>🆕 Nuevo Examen</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupExam;

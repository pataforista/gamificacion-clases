import React, { useState } from 'react';
import { RNG } from '../utils/rng';
import confetti from 'canvas-confetti';

const GroupExam = ({ pickerItems = [] }) => {
    const [exam, setExam] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [scores, setScores] = useState({});
    const [activeTeam, setActiveTeam] = useState(null);
    const [feedback, setFeedback] = useState(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                setExam(data);
                setCurrentQuestion(0);
                setFeedback(null);
                // Initialize scores for picker items if they are "teams"
                const initialScores = {};
                pickerItems.forEach(item => initialScores[item] = 0);
                setScores(initialScores);
            } catch (err) {
                alert("Error al leer el JSON del examen.");
            }
        };
        reader.readAsText(file);
    };

    const nextTurn = () => {
        if (pickerItems.length === 0) return alert("Ingresa nombres/equipos en Sorteo para asignar turnos.");
        const chosen = RNG.pick(pickerItems, "exam_turn");
        setActiveTeam(chosen);
        setFeedback(null);
    };

    const answer = (isCorrect) => {
        if (!activeTeam) return alert("Primero asigna un turno a un equipo.");

        if (isCorrect) {
            setScores(prev => ({ ...prev, [activeTeam]: (prev[activeTeam] || 0) + 10 }));
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setFeedback({ type: 'correct', msg: '¡Correcto! +10 puntos.' });
        } else {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            setFeedback({ type: 'incorrect', msg: 'Incorrecto.' });
        }
    };

    const question = exam?.questions?.[currentQuestion];

    return (
        <div className="grid">
            <div className="card">
                <h2>Examen Grupal</h2>
                {!exam ? (
                    <div>
                        <p>Importa el JSON del examen para comenzar la dinmica.</p>
                        <input type="file" accept=".json" onChange={handleFileUpload} />
                    </div>
                ) : (
                    <div>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                            <span>Pregunta {currentQuestion + 1} de {exam.questions.length}</span>
                            <button className="btn" onClick={() => setExam(null)}>Cerrar Examen</button>
                        </div>
                        <div className="divider"></div>

                        {question && (
                            <div className="exam-content">
                                <div className="exam-question">{question.text}</div>
                                <div className="exam-options">
                                    {question.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            className={`btn exam-option ${feedback && i === question.correctIndex ? 'correct' : ''}`}
                                            onClick={() => answer(i === question.correctIndex)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {feedback && (
                            <div className={`smallout ${feedback.type}`} style={{ marginTop: '20px' }}>
                                {feedback.msg}
                                <div className="row" style={{ marginTop: '10px' }}>
                                    <button className="btn" onClick={() => {
                                        setCurrentQuestion(prev => Math.min(prev + 1, exam.questions.length - 1));
                                        setFeedback(null);
                                        setActiveTeam(null);
                                    }}>Siguiente Pregunta</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="card">
                <h2>Marcador y Turnos</h2>
                <div className="row">
                    <button className="btn good" onClick={nextTurn}>Asignar Turno</button>
                    {activeTeam && <div className="pill" style={{ background: 'var(--good)', color: 'white' }}>Turno de: {activeTeam}</div>}
                </div>
                <div className="divider"></div>
                <div className="score-list">
                    {Object.entries(scores).map(([team, score]) => (
                        <div key={team} className={`score-item ${team === activeTeam ? 'active' : ''}`}>
                            <span>{team}</span>
                            <span className="mono">{score} XP</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GroupExam;

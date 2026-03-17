import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { RNG, cleanLines } from '../utils/rng';
import { useNotifications } from './NotificationContext';

const DEFAULT_QUESTIONS = [
  { q: '¿Cuál es el hueso más largo del cuerpo humano?', a: 'Fémur' },
  { q: '¿Cuántos pares de nervios craneales existen?', a: '12' },
  { q: '¿Qué estructura conecta el músculo al hueso?', a: 'Tendón' },
  { q: '¿Cuál es el valor normal de presión arterial sistólica?', a: '120 mmHg' },
  { q: '¿Qué enzima digiere las proteínas en el estómago?', a: 'Pepsina' },
];

const DEFAULT_SECONDS = 30;

const Trivia = ({ pickerItems = [] }) => {
  const { alert } = useNotifications();

  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [inputQA, setInputQA] = useState(
    DEFAULT_QUESTIONS.map(q => `${q.q}|${q.a}`).join('\n')
  );
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [timeLeft, setTimeLeft] = useState(null);
  const [active, setActive] = useState(false);
  const [currentQ, setCurrentQ] = useState(null);
  const [student, setStudent] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [round, setRound] = useState(0);

  const timerRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback((secs) => {
    stopTimer();
    setTimeLeft(secs);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          setActive(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const pickQuestion = async () => {
    if (questions.length === 0) {
      return await alert('Sin preguntas', 'Agrega preguntas en el formato: pregunta|respuesta (una por línea).');
    }

    stopTimer();
    setShowAnswer(false);
    setActive(true);
    setRound(r => r + 1);

    // Pick random question
    const key = RNG.keyFromItems(`trivia-${round}`, questions.map(q => q.q));
    const idx = questions.findIndex(q => q.q === RNG.pick(questions.map(q => q.q), key));
    setCurrentQ(questions[idx >= 0 ? idx : 0]);

    // Pick random student if available
    if (pickerItems.length > 0) {
      const sKey = RNG.keyFromItems(`student-${round}`, pickerItems);
      setStudent(RNG.pick(pickerItems, sKey));
    } else {
      setStudent(null);
    }

    startTimer(seconds);
    if (navigator.vibrate) navigator.vibrate(80);
  };

  const handleCorrect = () => {
    stopTimer();
    setActive(false);
    setShowAnswer(true);
    setScore(s => ({ ...s, correct: s.correct + 1 }));
    confetti({ particleCount: 80, spread: 50, origin: { x: 0.5, y: 0.4 } });
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
  };

  const handleWrong = () => {
    stopTimer();
    setActive(false);
    setShowAnswer(true);
    setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    if (navigator.vibrate) navigator.vibrate([200]);
  };

  const resetAll = () => {
    stopTimer();
    setActive(false);
    setCurrentQ(null);
    setStudent(null);
    setShowAnswer(false);
    setTimeLeft(null);
    setScore({ correct: 0, wrong: 0 });
    setRound(0);
  };

  const handleQAChange = (e) => {
    setInputQA(e.target.value);
    const parsed = cleanLines(e.target.value)
      .map(line => {
        const sep = line.indexOf('|');
        if (sep === -1) return null;
        const q = line.slice(0, sep).trim();
        const a = line.slice(sep + 1).trim();
        return q && a ? { q, a } : null;
      })
      .filter(Boolean);
    setQuestions(parsed);
  };

  const timerPct = timeLeft != null && seconds > 0 ? (timeLeft / seconds) * 100 : 100;
  const timerColor =
    timerPct > 50 ? 'var(--neon-cyan)' :
    timerPct > 25 ? 'var(--neon-yellow)' :
    'var(--neon-magenta)';

  const total = score.correct + score.wrong;

  return (
    <div className="grid">
      {/* Left: active question */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2>Trivia Relámpago ⚡</h2>

        {/* Score bar */}
        <div className="row" style={{ marginBottom: '1rem', gap: '0.5rem' }}>
          <span className="pill" style={{ borderColor: 'var(--neon-lime)', color: 'var(--neon-lime)', background: 'rgba(0,255,0,0.08)' }}>
            ✓ {score.correct}
          </span>
          <span className="pill" style={{ borderColor: 'var(--neon-magenta)', color: 'var(--neon-magenta)', background: 'rgba(255,0,255,0.08)' }}>
            ✗ {score.wrong}
          </span>
          {total > 0 && (
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {Math.round((score.correct / total) * 100)}% correctas
            </span>
          )}
        </div>

        {/* Timer bar */}
        {timeLeft != null && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="health-container" style={{ borderColor: timerColor }}>
              <div
                className="health-bar"
                style={{
                  width: `${timerPct}%`,
                  background: `linear-gradient(90deg, ${timerColor}, ${timerColor})`,
                  boxShadow: `0 0 10px ${timerColor}`,
                  transition: 'width 0.9s linear, background 0.5s ease',
                }}
              />
              <div className="health-text" style={{ color: timerPct < 30 ? '#000' : 'white' }}>
                {timeLeft}s
              </div>
            </div>
          </div>
        )}

        {/* Question display */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentQ ? (
            <>
              {student && (
                <div
                  className="pill"
                  style={{
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    borderColor: 'var(--neon-yellow)',
                    color: 'var(--neon-yellow)',
                    background: 'rgba(255,255,0,0.08)',
                    fontSize: '0.9rem',
                    padding: '0.3rem 0.8rem',
                  }}
                >
                  👤 {student}
                </div>
              )}

              <div className="exam-question">
                {currentQ.q}
              </div>

              {showAnswer ? (
                <div
                  className="smallout"
                  style={{
                    background: 'rgba(255,102,0,0.1)',
                    border: '2px solid var(--good)',
                    color: 'var(--good)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '1rem',
                  }}
                >
                  ✅ {currentQ.a}
                </div>
              ) : active ? (
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn good" onClick={handleCorrect} style={{ flex: 1, padding: '0.8rem' }}>
                    ✓ Correcto
                  </button>
                  <button className="btn warn" onClick={handleWrong} style={{ flex: 1, padding: '0.8rem' }}>
                    ✗ Incorrecto
                  </button>
                  <button className="btn" onClick={() => { setShowAnswer(true); stopTimer(); setActive(false); }}>
                    Ver respuesta
                  </button>
                </div>
              ) : (
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn good" onClick={handleCorrect} style={{ flex: 1 }}>
                    ✓ Correcto
                  </button>
                  <button className="btn warn" onClick={handleWrong} style={{ flex: 1 }}>
                    ✗ Incorrecto
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              className="smallout"
              style={{ textAlign: 'center', padding: '2rem', fontSize: '1rem' }}
            >
              Pulsa "Nueva pregunta" para comenzar
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="row" style={{ justifyContent: 'center' }}>
          <button
            className="btn primary"
            onClick={pickQuestion}
            style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }}
          >
            ⚡ Nueva pregunta
          </button>
          <button className="btn" onClick={resetAll}>Reiniciar</button>
        </div>

        {/* Timer setting */}
        <div className="row" style={{ marginTop: '0.75rem', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: '0.8rem' }}>Tiempo:</span>
          {[15, 30, 45, 60].map(s => (
            <button
              key={s}
              className={`btn${seconds === s ? ' primary' : ''}`}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setSeconds(s)}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      {/* Right: question bank editor */}
      <div className="card">
        <h2>Banco de preguntas ({questions.length})</h2>
        <div className="smallout" style={{ marginBottom: '0.75rem' }}>
          Formato: <code style={{ color: 'var(--neon-cyan)' }}>pregunta|respuesta</code> (una por línea)
        </div>
        <textarea
          value={inputQA}
          onChange={handleQAChange}
          rows={14}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
          placeholder="¿Cuál es el hueso más largo?|Fémur&#10;¿Cuántos pares craneales hay?|12"
        />

        {questions.length > 0 && (
          <>
            <div className="divider" />
            <h2>Vista previa</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
              {questions.map((q, i) => (
                <div key={i} className="smallout" style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--muted)', minWidth: '1.5rem' }}>{i + 1}.</span>
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{q.q}</div>
                    <div style={{ color: 'var(--good)', fontSize: '0.75rem' }}>→ {q.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Trivia;

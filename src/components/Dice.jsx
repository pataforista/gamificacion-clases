import React, { useState, useRef, useMemo } from 'react';
import { DiceRoller, NumberGenerator } from 'rpg-dice-roller';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistence } from '../hooks/usePersistence';
import { useAudio } from './AudioContext';
import { RNG } from '../utils/rng';
import './Dice.css';

// Configure the global dice roller engine
NumberGenerator.generator.engine = NumberGenerator.engines.browserCrypto;

const PolyhedralDice = ({ value, type, isRolling, theme }) => {
    const getShape = (type) => {
        switch (type) {
            case '4': return {
                path: "M 50,15 L 90,85 L 10,85 Z",
                lines: "M 50,15 L 50,85 M 90,85 L 50,55 M 10,85 L 50,55"
            };
            case '8': return {
                path: "M 50,10 L 85,50 L 50,90 L 15,50 Z",
                lines: "M 50,10 L 50,90 M 15,50 L 85,50 M 50,10 L 15,50 M 50,10 L 85,50 M 50,90 L 15,50 M 50,90 L 85,50"
            };
            case '10': return {
                path: "M 50,5 L 90,40 L 50,95 L 10,40 Z",
                lines: "M 50,5 L 50,95 M 10,40 L 90,40 M 50,5 L 10,40 M 50,5 L 90,40 M 50,95 L 10,40 M 50,95 L 90,40"
            };
            case '12': return {
                path: "M 50,5 L 92,35 L 76,85 L 24,85 L 8,35 Z",
                lines: "M 50,5 L 24,85 M 50,5 L 76,85 M 92,35 L 8,35"
            };
            case '20': return {
                path: "M 50,5 L 90,25 L 90,75 L 50,95 L 10,75 L 10,25 Z",
                lines: "M 50,5 L 50,95 M 10,25 L 90,75 M 10,75 L 90,25 M 50,5 L 10,25 M 50,5 L 90,25 M 10,25 L 10,75 M 90,25 L 90,75 M 10,75 L 50,95 M 90,75 L 50,95"
            };
            default: // D6
                return {
                    path: "M 20,20 L 80,20 L 80,80 L 20,80 Z",
                    lines: ""
                };
        }
    };

    const shape = getShape(type);

    return (
        <motion.div
            className={`poly-dice-container theme-${theme}`}
            animate={isRolling ? {
                rotate: [0, 90, 180, 270, 360],
                scale: [1, 1.3, 0.7, 1.2, 1], // Squash and stretch
                x: [0, 10, -10, 10, 0],
                y: [0, -20, 0, -10, 0]
            } : {
                rotate: [0, 15, -15, 0], // Small wobble on stop
                scale: [1, 1.1, 1],
                x: 0,
                y: 0
            }}
            transition={isRolling ? {
                duration: 0.4,
                repeat: Infinity,
                ease: "easeInOut"
            } : {
                type: "spring",
                stiffness: 400,
                damping: 15
            }}
        >
            <svg viewBox="0 0 100 100" className="poly-dice-svg">
                <path d={shape.path} className="poly-dice-face" />
                {shape.lines && <path d={shape.lines} className="poly-dice-lines" />}
                <text x="50" y="55" className="poly-dice-text">
                    {isRolling ? "?" : value}
                </text>
            </svg>
        </motion.div>
    );
};

const Dice = () => {
    const { playSFX } = useAudio();
    const { state, updateState } = usePersistence();
    const [result, setResult] = useState(null);
    const [detail, setDetail] = useState("");
    const [individualRolls, setIndividualRolls] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    const [diceType, setDiceType] = useState("6");
    const [diceCount, setDiceCount] = useState(1);
    const [diceMod, setDiceMod] = useState(0);
    const [formula, setFormula] = useState("");
    const [rollMode, setRollMode] = useState("normal");
    const [theme, setTheme] = useState("medical");

    const roller = useMemo(() => new DiceRoller(), []);

    const roll = () => {
        setIsRolling(true);
        setResult("...");
        setDetail("Lanzando dados...");
        setIndividualRolls([]);
        playSFX('click');

        setTimeout(() => {
            let f = `${diceCount}d${diceType}`;
            try {
                const rollResult = roller.roll(f);
                const total = rollResult.total;
                
                setResult(total);
                
                // CRIT / FUMBLE LOGIC
                if (diceCount === 1 && diceType === "20") {
                    if (total === 20) setDetail("🏆 ¡ESO, CUATE! ¡CRÍTICO NATAL!");
                    else if (total === 1) setDetail("💀 ¡PERDISTE CUATE! ¡PIFIA TOTAL!");
                    else setDetail(`Resultado: ${total}`);
                } else {
                    setDetail(`Total: ${total}`);
                }

                let rolls = [];
                if (rollResult.rolls && rollResult.rolls[0] && rollResult.rolls[0].results) {
                    rolls = rollResult.rolls[0].results
                        .filter(r => typeof r.value === 'number')
                        .map(r => r.value);
                }

                setIndividualRolls(rolls);
                playSFX('boing');

                // VIBRATION
                if (navigator.vibrate) {
                    if (diceCount === 1 && diceType === "20") {
                        if (total === 20) navigator.vibrate([100, 50, 100, 50, 100]);
                        else if (total === 1) navigator.vibrate(400);
                        else navigator.vibrate(40);
                    } else {
                        navigator.vibrate(40);
                    }
                }

                const newHistory = [
                    {
                        id: Date.now(),
                        formula: f,
                        total: total,
                        time: new Date().toLocaleTimeString()
                    },
                    ...(state.rollHistory || [])
                ].slice(0, 10);
                updateState({ rollHistory: newHistory });

                setIsRolling(false);
            } catch (e) {
                console.error("Roll error:", e);
                setResult("Error");
                setDetail("Parámetros inválidos");
                setIsRolling(false);
            }
        }, 800);
    };

    const rollFormula = () => {
        if (!formula.trim()) return;
        setIsRolling(true);
        setResult("...");
        setIndividualRolls([]);
        playSFX('click');

        setTimeout(() => {
            try {
                const rollResult = roller.roll(formula);
                const total = rollResult.total;
                const output = rollResult.toString();

                setResult(total);
                setDetail(output);
                playSFX('boing');

                const newHistory = [
                    {
                        id: Date.now(),
                        formula: formula,
                        total: total,
                        time: new Date().toLocaleTimeString()
                    },
                    ...(state.rollHistory || [])
                ].slice(0, 10);
                updateState({ rollHistory: newHistory });

                if (rollResult.rolls && rollResult.rolls[0] && rollResult.rolls[0].results) {
                    const rolls = rollResult.rolls[0].results
                        .filter(r => typeof r.value === 'number')
                        .map(r => r.value);
                    setIndividualRolls(rolls);
                }
            } catch (e) {
                console.error("Formula roll error:", e);
                setResult("Error");
                setDetail("Fórmula inválida");
            }
            setIsRolling(false);
            if (navigator.vibrate) navigator.vibrate(20);
        }, 1000);
    };

    return (
        <div className="grid">
            <div className={`card theme-${theme}`}>
                <h2>Mesa de Dados</h2>
                <p className="muted" style={{ marginBottom: '1rem' }}>Lanza dados virtuales con física divertida para decidir puntos o eventos.</p>
                <div className="dice-tray-container">
                    <div className="dice-tray" style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        justifyContent: 'center',
                        minHeight: '180px',
                        padding: '30px',
                        alignItems: 'center'
                    }}>
                        <AnimatePresence mode="popLayout">
                            {individualRolls.length > 0 ? (
                                individualRolls.map((val, i) => (
                                    <motion.div
                                        key={`${i}-${val}`}
                                        initial={{ scale: 0, opacity: 0, rotate: -180, x: RNG.int(-50, 50), y: RNG.int(-50, 50) }}
                                        animate={{ scale: 1, opacity: 1, rotate: RNG.int(-15, 15), x: 0, y: 0 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.1 }}
                                        style={{ margin: '10px' }}
                                    >
                                        <PolyhedralDice
                                            value={val}
                                            type={diceType}
                                            isRolling={isRolling}
                                            theme={theme}
                                        />
                                    </motion.div>
                                ))
                            ) : isRolling ? (
                                Array.from({ length: diceCount }).map((_, i) => (
                                    <PolyhedralDice
                                        key={i}
                                        type={diceType}
                                        isRolling={true}
                                        theme={theme}
                                    />
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.5 }}
                                    className="muted"
                                >
                                    Tira los dados para ver el resultado
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="divider"></div>

                <div className="row">
                    <div>
                        <label>Tipo</label><br />
                        <select value={diceType} onChange={e => setDiceType(e.target.value)}>
                            <option value="4">d4</option>
                            <option value="6">d6</option>
                            <option value="8">d8</option>
                            <option value="10">d10</option>
                            <option value="12">d12</option>
                            <option value="20">d20</option>
                        </select>
                    </div>
                    <div>
                        <label>Cantidad</label><br />
                        <input type="number" min="1" max="20" value={diceCount} onChange={e => setDiceCount(parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                        <label>Mod (+/-)</label><br />
                        <input type="number" value={diceMod} onChange={e => setDiceMod(parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label>Modo Especial</label><br />
                        <select value={rollMode} onChange={e => setRollMode(e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="kh1">Ventaja (Mejor)</option>
                            <option value="kl1">Desventaja (Peor)</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Piel (Skin)</label><br />
                        <select value={theme} onChange={e => setTheme(e.target.value)}>
                            <option value="medical">Médico</option>
                            <option value="neon">Neón</option>
                            <option value="classic">Clásico</option>
                        </select>
                    </div>
                </div>

                <div className="row" style={{ marginTop: '15px' }}>
                    <input
                        type="text"
                        placeholder="Fórmula (ej: 2d20kh1 + 5)"
                        value={formula}
                        onChange={e => setFormula(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button className="btn good" onClick={rollFormula}>Fórmula</button>
                </div>

                <div className="row" style={{ marginTop: '15px' }}>
                    <button className="btn primary good" onClick={roll} disabled={isRolling}>Tirar</button>
                    <button className="btn" onClick={() => { setDiceType("10"); setDiceCount(2); setDiceMod(0); setRollMode("normal"); }}>Dificultad (2d10)</button>
                    <button className="btn" onClick={() => { updateState({ rollHistory: [] }); setResult(null); setIndividualRolls([]); }}>Limpiar Todo</button>
                </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h2>Récords y Log</h2>
                <p className="muted" style={{ marginBottom: '1rem' }}>Sigue el historial de tus lanzamientos y fórmulas recientes.</p>
                <div className="out" style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{result || "—"}</div>
                <div className="smallout" style={{ marginBottom: '20px' }}>{detail || "Esperando tirada..."}</div>

                <div className="history-list">
                    {(state.rollHistory || []).map((h) => (
                        <div key={h.id} className="history-item" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '10px',
                            borderBottom: '1px solid var(--line)',
                            fontSize: '0.8rem'
                        }}>
                            <span className="mono">{h.formula}</span>
                            <span style={{ fontWeight: 800, color: 'var(--good)' }}>{h.total}</span>
                            <span className="muted">{h.time}</span>
                        </div>
                    ))}
                    {(!state.rollHistory || state.rollHistory.length === 0) && (
                        <div className="muted">No hay tiradas recientes.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dice;

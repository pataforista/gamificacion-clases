import React, { useState, useRef, useMemo } from 'react';
import { DiceRoller, NumberGenerator } from 'rpg-dice-roller';
import { usePersistence } from '../hooks/usePersistence';
import { RNG } from '../utils/rng';
import './Dice.css';

const Dice = () => {
    const { state, updateState } = usePersistence();
    const [result, setResult] = useState(null);
    const [detail, setDetail] = useState("");
    const [individualRolls, setIndividualRolls] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    const [diceType, setDiceType] = useState("6");
    const [diceCount, setDiceCount] = useState(1);
    const [diceMod, setDiceMod] = useState(0);
    const [formula, setFormula] = useState("");
    const [rollMode, setRollMode] = useState("normal"); // normal, kh1 (advantage), kl1 (disadvantage)
    const [theme, setTheme] = useState("medical"); // medical, neon, classic
    const cubeRefs = useRef([]);

    // Synthesize dice sound (Web Audio API)
    const playDiceSound = (type = 'roll') => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            if (type === 'roll') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            } else {
                // 'hit' sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            }

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.warn("Audio unavailable", e);
        }
    };

    // Custom RNG to ensure high entropy results
    const customGen = new NumberGenerator();
    customGen.next = () => {
        // NumberGenerator.next expects a float [0, 1)
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    };
    const roller = new DiceRoller(customGen);

    const getRotation = (val) => {
        const rotations = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(-180deg) rotateY(0deg)',
            3: 'rotateX(0deg) rotateY(-90deg)',
            4: 'rotateX(0deg) rotateY(90deg)',
            5: 'rotateX(-90deg) rotateY(0deg)',
            6: 'rotateX(90deg) rotateY(0deg)'
        };
        return rotations[val] || rotations[1];
    };

    const roll = () => {
        setIsRolling(true);
        setResult("...");
        setDetail("Lanzando dados...");
        setIndividualRolls([]);
        playDiceSound('roll');

        setTimeout(() => {
            let f = `${diceCount}d${diceType}`;
            if (rollMode !== "normal" && diceCount > 1) {
                f += rollMode; // e.g., 2d20kh1
            }
            f += `${diceMod >= 0 ? "+" : ""}${diceMod}`;

            try {
                const rollResult = roller.roll(f);
                setResult(rollResult.total);
                setDetail(rollResult.toString());

                // Get individual dice results
                // rpg-dice-roller result object can be complex when using modifiers
                const rolls = rollResult.rolls[0].rolls.map(r => r.value);
                setIndividualRolls(rolls);
                playDiceSound('hit');

                // Update Persistence History
                const newHistory = [
                    {
                        id: Date.now(),
                        formula: f,
                        total: rollResult.total,
                        time: new Date().toLocaleTimeString()
                    },
                    ...(state.rollHistory || [])
                ].slice(0, 10);
                updateState({ rollHistory: newHistory });

                setIsRolling(false);

                // Update rotations for d6 cubes
                if (diceType === "6") {
                    rolls.forEach((val, idx) => {
                        if (cubeRefs.current[idx]) {
                            cubeRefs.current[idx].style.transform = getRotation(val);
                        }
                    });
                }
            } catch (e) {
                setResult("Error");
                setDetail("Parámetros inválidos");
                setIsRolling(false);
            }

            if (navigator.vibrate) navigator.vibrate(15);
        }, 600);
    };

    const rollFormula = () => {
        if (!formula.trim()) return;
        setIsRolling(true);
        setResult("...");
        setIndividualRolls([]);

        setTimeout(() => {
            try {
                const rollResult = roller.roll(formula);
                setResult(rollResult.total);
                setDetail(rollResult.toString());
                playDiceSound('hit');

                // Update Persistence History
                const newHistory = [
                    {
                        id: Date.now(),
                        formula: formula,
                        total: rollResult.total,
                        time: new Date().toLocaleTimeString()
                    },
                    ...(state.rollHistory || [])
                ].slice(0, 10);
                updateState({ rollHistory: newHistory });

                // Try to extract individual rolls if possible
                if (rollResult.rolls && rollResult.rolls[0] && rollResult.rolls[0].rolls) {
                    setIndividualRolls(rollResult.rolls[0].rolls.map(r => r.value));

                    if (formula.toLowerCase().includes("d6") && !formula.includes("+") && !formula.includes("-")) {
                        // Attempt animation if it's a simple d6 roll
                        setTimeout(() => {
                            rollResult.rolls[0].rolls.forEach((r, idx) => {
                                if (cubeRefs.current[idx]) {
                                    cubeRefs.current[idx].style.transform = getRotation(r.value);
                                }
                            });
                        }, 50);
                    }
                }
            } catch (e) {
                setResult("Error");
                setDetail("Fórmula inválida");
            }
            setIsRolling(false);
            if (navigator.vibrate) navigator.vibrate(20);
        }, 600);
    };

    return (
        <div className="grid">
            <div className={`card theme-${theme}`}>
                <h2>Mesa de Dados</h2>
                <div className="dice-tray-container">
                    <div className="dice-tray" style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        justifyContent: 'center',
                        minHeight: diceType === "6" ? '180px' : '100px',
                        padding: '30px'
                    }}>
                        {diceType === "6" ? (
                            Array.from({ length: diceCount }).map((_, i) => (
                                <div key={i} className="scene" style={{ margin: '0' }}>
                                    <div
                                        ref={el => cubeRefs.current[i] = el}
                                        className={`cube ${isRolling ? 'rolling' : ''}`}
                                    >
                                        <div className="face front">1</div>
                                        <div className="face back">2</div>
                                        <div className="face right">3</div>
                                        <div className="face left">4</div>
                                        <div className="face top">5</div>
                                        <div className="face bottom">6</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            individualRolls.map((val, i) => (
                                <div key={i} className="dice-result-pill">
                                    <span className="dice-shape">{diceType}</span>
                                    <span className="dice-value">{val}</span>
                                </div>
                            ))
                        )}
                        {individualRolls.length === 0 && !isRolling && (
                            <div className="muted" style={{ opacity: 0.5 }}>Tira los dados para ver el resultado</div>
                        )}
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
                        <input type="number" min="1" max="20" value={diceCount} onChange={e => setDiceCount(parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label>Mod (+/-)</label><br />
                        <input type="number" value={diceMod} onChange={e => setDiceMod(parseInt(e.target.value))} />
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
                    <button className="btn" onClick={() => { updateState({ rollHistory: [] }); setResult(null); }}>Limpiar Todo</button>
                </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'auto' }}>
                <h2>Récords y Log</h2>
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

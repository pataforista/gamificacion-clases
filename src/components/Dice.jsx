import React, { useState, useRef } from 'react';
import { DiceRoller } from 'rpg-dice-roller';
import { RNG } from '../utils/rng';
import './Dice.css';

const Dice = () => {
    const [result, setResult] = useState(null);
    const [detail, setDetail] = useState("");
    const [isRolling, setIsRolling] = useState(false);
    const [diceType, setDiceType] = useState("6");
    const [diceCount, setDiceCount] = useState(1);
    const [diceMod, setDiceMod] = useState(0);
    const [formula, setFormula] = useState("");
    const cubeRef = useRef(null);

    const roller = new DiceRoller();

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

        setTimeout(() => {
            const f = `${diceCount}d${diceType}${diceMod >= 0 ? "+" : ""}${diceMod}`;
            const rollResult = roller.roll(f);
            setResult(rollResult.total);
            setDetail(rollResult.toString());
            setIsRolling(false);

            if (diceType === "6" && diceCount === 1 && cubeRef.current) {
                cubeRef.current.style.transform = getRotation(rollResult.total);
            }

            if (navigator.vibrate) navigator.vibrate(15);
        }, 600);
    };

    const rollFormula = () => {
        if (!formula.trim()) return;
        setIsRolling(true);
        setResult("...");

        setTimeout(() => {
            try {
                const rollResult = roller.roll(formula);
                setResult(rollResult.total);
                setDetail(rollResult.toString());
            } catch (e) {
                setResult("Error");
                setDetail("Frmula invlida");
            }
            setIsRolling(false);
            if (navigator.vibrate) navigator.vibrate(20);
        }, 600);
    };

    return (
        <div className="card">
            <h2>Visualizador 3D</h2>
            <div className="scene">
                <div ref={cubeRef} className={`cube ${isRolling ? 'rolling' : ''}`} aria-label="Dado 3D" role="img">
                    <div className="face front">1</div>
                    <div className="face back">2</div>
                    <div className="face right">3</div>
                    <div className="face left">4</div>
                    <div className="face top">5</div>
                    <div className="face bottom">6</div>
                </div>
            </div>
            <div className="divider"></div>
            <div className="out">{result || "—"}</div>
            <div className="smallout">{detail}</div>

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
                    <input type="number" min="1" value={diceCount} onChange={e => setDiceCount(parseInt(e.target.value))} />
                </div>
                <div>
                    <label>Mod (+/-)</label><br />
                    <input type="number" value={diceMod} onChange={e => setDiceMod(parseInt(e.target.value))} />
                </div>
            </div>

            <div className="row" style={{ marginTop: '15px' }}>
                <input
                    type="text"
                    placeholder="Frmula (ej: 2d20 + 5)"
                    value={formula}
                    onChange={e => setFormula(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button className="btn good" onClick={rollFormula}>Frmula</button>
            </div>

            <div className="row" style={{ marginTop: '15px' }}>
                <button className="btn primary good" onClick={roll} disabled={isRolling}>Tirar</button>
                <button className="btn" onClick={() => { setDiceType("10"); setDiceCount(2); setDiceMod(0); }}>Dificultad (2d10)</button>
                <button className="btn" onClick={() => { setResult(null); setDetail(""); }}>Limpiar</button>
            </div>
        </div>
    );
};

export default Dice;

import React, { useState } from 'react';
import { RNG, cleanLines } from '../utils/rng';
import Shuffle from './Shuffle';
import AnimatedList from './AnimatedList';

const Picker = ({ onItemsChange }) => {
    const [inputText, setInputText] = useState("Opción A\nOpción B\nOpción C\nOpción D");
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);

    const handleTextChange = (e) => {
        const text = e.target.value;
        setInputText(text);
        if (onItemsChange) onItemsChange(cleanLines(text));
    };

    const pickOne = () => {
        const items = cleanLines(inputText);
        if (items.length === 0) return;
        const key = RNG.keyFromItems("picker", items);
        const chosen = RNG.pick(items, key);
        setResult(chosen);
        setHistory((prev) => [chosen, ...prev].slice(0, 10));
    };

    return (
        <div className="grid">
            <div className="card">
                <h2>Sorteo / Ruleta de nombres</h2>
                <label>Opciones (una por línea)</label>
                <textarea
                    value={inputText}
                    onChange={handleTextChange}
                    rows={6}
                    style={{ width: '100%', marginTop: '10px' }}
                />

                <div className="divider"></div>

                <div className="row">
                    <button className="btn good" onClick={pickOne}>Elegir 1</button>
                    <button className="btn" onClick={() => setHistory([])}>Limpiar Historial</button>
                </div>

                <div className="out" style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {result ? (
                        <Shuffle
                            text={result}
                            key={result}
                            shuffleTimes={5}
                            duration={0.5}
                            className="win-text"
                            style={{ fontSize: '48px', fontWeight: 900 }}
                        />
                    ) : "—"}
                </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                <h2>Historial Reciente</h2>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    {history.length > 0 ? (
                        <AnimatedList
                            items={history}
                            displayScrollbar={false}
                            itemClassName="orderitem"
                        />
                    ) : (
                        <div className="smallout">Sin sorteos recientes.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Picker;

import React, { useState } from 'react';
import { RNG, cleanLines } from '../utils/rng';
import { useNotifications } from './NotificationContext';
import Shuffle from './Shuffle';
import AnimatedList from './AnimatedList';

const Picker = ({ onItemsChange, items = [] }) => {
    const { alert } = useNotifications();
    const [inputText, setInputText] = useState(items.join('\n') || "Opción A\nOpción B\nOpción C\nOpción D");
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);

    const handleTextChange = (e) => {
        const text = e.target.value;
        setInputText(text);
        if (onItemsChange) onItemsChange(cleanLines(text));
    };

    const pickOne = async () => {
        const cleaned = cleanLines(inputText);
        if (cleaned.length === 0) {
            return await alert("Faltan Datos", "Escribe algunos nombres o términos primero para poder sortear.");
        }
        const key = RNG.keyFromItems("picker", cleaned);
        const chosen = RNG.pick(cleaned, key);
        setResult(chosen);
        setHistory((prev) => [chosen, ...prev].slice(0, 10));
    };

    return (
        <div className="grid">
            <div className="card">
                <h2>Sorteo de Participación</h2>
                <p className="muted" style={{ marginBottom: '1rem' }}>Ingresa los nombres de los alumnos o equipos para rifar turnos de forma justa.</p>
                
                <div className="row" style={{ marginBottom: '1rem' }}>
                    <button className="btn" onClick={() => {
                        const demoNames = ['Ana García', 'Luis Pérez', 'María Rodríguez', 'Juan C.', 'Elena S.', 'Dr. House'];
                        setInputText(demoNames.join('\n'));
                        if (onItemsChange) onItemsChange(demoNames);
                    }}>
                        ✨ Cargar Demo
                    </button>
                    <button className="btn" onClick={() => {
                        setInputText('');
                        if (onItemsChange) onItemsChange([]);
                        setResult(null);
                    }}>
                        🗑️ Limpiar Todo
                    </button>
                </div>

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

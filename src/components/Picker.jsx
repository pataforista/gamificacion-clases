import React, { useState, useEffect, useRef } from 'react';
import { RNG, cleanLines } from '../utils/rng';
import { useNotifications } from './NotificationContext';
import { usePersistence } from '../hooks/usePersistence';
import Shuffle from './Shuffle';
import AnimatedList from './AnimatedList';

const newRosterId = () => (crypto.randomUUID && crypto.randomUUID()) || `roster-${Date.now()}`;

const Picker = ({ onItemsChange, items = [] }) => {
    const { alert, confirm, notify } = useNotifications();
    const { state, updateState } = usePersistence();
    const savedRosters = state.savedRosters || [];
    const [rosterName, setRosterName] = useState('');
    const [inputText, setInputText] = useState(items.join('\n'));
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const lastSyncRef = useRef(items.join('\n'));

    // Keep textarea in sync with shared roster when it changes from another tab
    useEffect(() => {
        const joined = items.join('\n');
        if (joined !== lastSyncRef.current && joined !== inputText) {
            setInputText(joined);
            lastSyncRef.current = joined;
        }
    }, [items, inputText]);

    const handleTextChange = (e) => {
        const text = e.target.value;
        setInputText(text);
        lastSyncRef.current = text;
        if (onItemsChange) onItemsChange(cleanLines(text));
    };

    const saveRoster = async () => {
        const rosterItems = cleanLines(inputText);
        if (rosterItems.length === 0) {
            return await alert('Lista vacía', 'Escribe algunos nombres antes de guardar la lista.');
        }
        const name = rosterName.trim() || `Lista ${savedRosters.length + 1}`;
        const existing = savedRosters.find(r => r.name.toLowerCase() === name.toLowerCase());
        let next;
        if (existing) {
            const ok = await confirm('Actualizar lista', `Ya existe una lista llamada "${name}". ¿Reemplazar sus nombres por los actuales?`);
            if (!ok) return;
            next = savedRosters.map(r => (r.id === existing.id ? { ...r, items: rosterItems } : r));
        } else {
            next = [...savedRosters, { id: newRosterId(), name, items: rosterItems }];
        }
        updateState({ savedRosters: next });
        setRosterName('');
        notify(`Lista "${name}" guardada`, 'achievement', '📚');
    };

    const loadRoster = (r) => {
        const joined = r.items.join('\n');
        setInputText(joined);
        lastSyncRef.current = joined;
        if (onItemsChange) onItemsChange(r.items);
        setResult(null);
        notify(`Lista "${r.name}" activada`, 'achievement', '✅');
    };

    const deleteRoster = async (r) => {
        const ok = await confirm('Borrar lista', `¿Borrar la lista "${r.name}"? Esta acción no se puede deshacer.`);
        if (!ok) return;
        updateState({ savedRosters: savedRosters.filter(x => x.id !== r.id) });
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
                    <button className="btn" onClick={async () => {
                        const ok = await confirm("Limpiar lista", "¿Borrar todos los nombres? Esta acción no se puede deshacer.");
                        if (!ok) return;
                        setInputText('');
                        lastSyncRef.current = '';
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
                    <button className="btn primary good" onClick={pickOne}>🎲 Elegir alumno</button>
                    <button className="btn" onClick={() => setHistory([])} disabled={history.length === 0}>Limpiar Historial</button>
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

            <div className="card">
                <h2>Mis listas de clase</h2>
                <p className="muted" style={{ marginBottom: '1rem' }}>Guarda varias listas (grupos) y cámbialas con un clic. Se guardan en este dispositivo.</p>
                <div className="row" style={{ gap: '8px' }}>
                    <input
                        type="text"
                        value={rosterName}
                        onChange={e => setRosterName(e.target.value)}
                        placeholder="Nombre de la lista (ej. 2° A)"
                        style={{ flex: 1 }}
                    />
                    <button className="btn primary" onClick={saveRoster}>💾 Guardar actual</button>
                </div>
                <div className="divider"></div>
                {savedRosters.length === 0 ? (
                    <div className="smallout">Aún no has guardado listas. Escribe nombres arriba y pulsa "Guardar actual".</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {savedRosters.map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', border: '2px solid var(--line)', borderRadius: '12px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                                    <div className="muted" style={{ fontSize: '0.75rem' }}>{r.items.length} alumno(s)</div>
                                </div>
                                <button className="btn good" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => loadRoster(r)}>Cargar</button>
                                <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => deleteRoster(r)} title="Borrar lista">🗑️</button>
                            </div>
                        ))}
                    </div>
                )}
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

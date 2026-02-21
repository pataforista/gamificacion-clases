import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from './NotificationContext';
import { RNG } from '../utils/rng';

const Teams = ({ pickerItems = [] }) => {
    const { alert } = useNotifications();
    const [teamCount, setTeamCount] = useState(2);
    const [teams, setTeams] = useState([]);

    const generateTeams = async () => {
        const items = [...pickerItems];
        if (items.length === 0) {
            return await alert("Sin Alumnos", "Primero ingresa nombres en la pestaña Sorteo para generar equipos.");
        }

        // Shuffle items
        for (let i = items.length - 1; i > 0; i--) {
            const j = RNG.int(0, i);
            [items[i], items[j]] = [items[j], items[i]];
        }

        const result = Array.from({ length: teamCount }, () => []);
        items.forEach((item, i) => {
            result[i % teamCount].push(item);
        });
        setTeams(result);
    };

    return (
        <div className="grid">
            <div className="card">
                <h2>Generador de Equipos</h2>
                <div className="smallout">Divide los nombres del Sorteo en grupos equilibrados.</div>
                <div className="divider"></div>
                <div className="row">
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Equipos</label><br />
                        <input
                            type="number"
                            min="2"
                            max="10"
                            value={teamCount}
                            onChange={e => setTeamCount(parseInt(e.target.value))}
                            style={{ width: '80px', marginTop: '5px' }}
                        />
                    </div>
                    <button className="btn primary good" onClick={generateTeams}>Generar</button>
                    <button className="btn" onClick={() => setTeams([])}>Limpiar</button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                <AnimatePresence>
                    {teams.map((team, i) => (
                        <motion.div
                            key={`team-${i}-${teams.length}`}
                            className="card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <h3 style={{ color: 'var(--primary)', fontWeight: 800 }}>Equipo {i + 1}</h3>
                            <ul style={{ listStyle: 'none', marginTop: '15px' }}>
                                {team.map((member, j) => (
                                    <motion.li
                                        key={j}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: (i * 0.1) + (j * 0.05) }}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '8px',
                                            marginBottom: '6px',
                                            fontSize: '0.9rem',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        {member}
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Teams;

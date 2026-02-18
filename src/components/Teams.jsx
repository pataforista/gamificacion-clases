import React, { useState } from 'react';
import { RNG, cleanLines } from '../utils/rng';

const Teams = ({ pickerItems = [] }) => {
    const [teamCount, setTeamCount] = useState(2);
    const [teams, setTeams] = useState([]);

    const generateTeams = () => {
        const items = [...pickerItems];
        if (items.length === 0) return alert("Primero ingresa nombres en la pestaña Sorteo");

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
                        <label>Número de equipos</label><br />
                        <input
                            type="number"
                            min="2"
                            value={teamCount}
                            onChange={e => setTeamCount(parseInt(e.target.value))}
                            style={{ width: '80px' }}
                        />
                    </div>
                    <button className="btn primary good" onClick={generateTeams}>Generar</button>
                    <button className="btn" onClick={() => setTeams([])}>Limpiar</button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {teams.map((team, i) => (
                    <div key={i} className="card">
                        <h3>Equipo {i + 1}</h3>
                        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                            {team.map((member, j) => (
                                <li key={j} style={{ padding: '4px 0' }}>{member}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Teams;

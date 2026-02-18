import React from 'react';
import { usePersistence } from '../hooks/usePersistence';
import CountUp from './CountUp';

const BADGES = [
    { id: 'eye', name: 'Ojo Clnico', icon: '👁️', detail: 'Detectar un sntoma clave' },
    { id: 'heart', name: 'Empata', icon: '❤️', detail: 'Resolver conflicto tico' },
    { id: 'brain', name: 'Genio', icon: '🧠', detail: 'Diferencial complejo' },
    { id: 'fast', name: 'Velocidad', icon: '⚡', detail: 'Resolver bajo presin' },
];

const RPGDash = () => {
    const { state, updateState, resetState } = usePersistence();

    const getRank = (xp) => {
        if (xp >= 1000) return "Jefe/a de Servicio";
        if (xp >= 500) return "Adjunto/a";
        if (xp >= 250) return "Residente Senior";
        if (xp >= 100) return "Residente";
        return "Interno/a";
    };

    const handleXP = (amount) => {
        updateState({ xp: Math.max(0, state.xp + amount) });
    };

    const handleHealth = (amount) => {
        updateState({ health: Math.min(100, Math.max(0, state.health + amount)) });
    };

    const toggleBadge = (id) => {
        const badges = state.badges.includes(id)
            ? state.badges.filter(b => b !== id)
            : [...state.badges, id];
        updateState({ badges });
    };

    const exportData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "quickrand_progress.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="grid">
            <div className="card">
                <h2>Jerarqua Mdica</h2>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--good)' }}>{getRank(state.xp)}</div>
                    <div className="pill">XP: <CountUp to={state.xp} from={state.xp - 10} duration={0.5} className="mono" /></div>
                </div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn good" onClick={() => handleXP(10)}>+10 XP (Acierto)</button>
                    <button className="btn" onClick={() => handleXP(50)}>+50 XP (Caso Resuelto)</button>
                </div>
            </div>

            <div className="card">
                <h2>Energa del Grupo</h2>
                <div className="health-container">
                    <div className="health-bar" style={{ width: `${state.health}%` }}></div>
                    <div className="health-text">{state.health} / 100</div>
                </div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn warn" onClick={() => handleHealth(-10)}>Dao (Error)</button>
                    <button className="btn good" onClick={() => handleHealth(10)}>Heal (Recuperacin)</button>
                </div>
            </div>

            <div className="card">
                <h2>Logros Mdicos (Badges)</h2>
                <div className="badge-grid">
                    {BADGES.map((b) => (
                        <div
                            key={b.id}
                            className={`badge ${state.badges.includes(b.id) ? 'unlocked' : ''}`}
                            onClick={() => toggleBadge(b.id)}
                            title={b.detail}
                        >
                            {b.icon}
                            <div className="badge-name">{b.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card">
                <h2>Gestin de Datos</h2>
                <div className="smallout">Exporta el progreso para usarlo en otra clase o navegador.</div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn primary" onClick={exportData}>Exportar JSON</button>
                    <button className="btn warn" onClick={resetState}>Reset Total</button>
                </div>
            </div>
        </div>
    );
};

export default RPGDash;

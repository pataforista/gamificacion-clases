import React, { useState, useEffect, useRef } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { useNotifications } from './NotificationContext';
import { useGSAP } from '@gsap/react';
import CountUp from './CountUp';
import confetti from 'canvas-confetti';
import gsap from 'gsap';

const BADGES = [
    { id: 'eye', name: 'Ojo Clínico', icon: '👁️', detail: 'Detectar un síntoma clave' },
    { id: 'heart', name: 'Empatía', icon: '❤️', detail: 'Resolver conflicto ético' },
    { id: 'brain', name: 'Genio', icon: '🧠', detail: 'Diferencial complejo' },
    { id: 'fast', name: 'Velocidad', icon: '⚡', detail: 'Resolver bajo presión' },
];

const RPGDash = () => {
    const { state, updateState, resetState } = usePersistence();
    const { notify, confirm } = useNotifications();
    const [promotion, setPromotion] = useState(null);
    const prevRankRef = useRef(null);

    const getRank = (xp) => {
        if (xp >= 1000) return "Jefe/a de Servicio";
        if (xp >= 500) return "Adjunto/a";
        if (xp >= 250) return "Residente Senior";
        if (xp >= 100) return "Residente";
        return "Interno/a";
    };

    useEffect(() => {
        const currentRank = getRank(state.xp);
        if (prevRankRef.current && prevRankRef.current !== currentRank && state.xp > 0) {
            const ranks = ["Interno/a", "Residente", "Residente Senior", "Adjunto/a", "Jefe/a de Servicio"];
            if (ranks.indexOf(currentRank) > ranks.indexOf(prevRankRef.current)) {
                setPromotion(currentRank);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#6366f1', '#2dd4bf', '#f59e0b']
                });

                if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

                setTimeout(() => setPromotion(null), 4000);
            }
        }
        prevRankRef.current = currentRank;
    }, [state.xp]);

    const handleXP = (amount) => {
        updateState({ xp: Math.max(0, state.xp + amount) });
        if (amount > 0) {
            notify(`+${amount} XP ganado`, 'xp', '📈');
        }
    };

    const handleHealth = (amount) => {
        updateState({ health: Math.min(100, Math.max(0, state.health + amount)) });
    };

    const toggleBadge = (id) => {
        const isUnlocked = state.badges.includes(id);
        const badges = isUnlocked
            ? state.badges.filter(b => b !== id)
            : [...state.badges, id];
        updateState({ badges });

        if (!isUnlocked) {
            const badge = BADGES.find(b => b.id === id);
            notify(`¡Logro Desbloqueado: ${badge.name}!`, 'achievement', badge.icon);
        }
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

    const handleReset = async () => {
        const confirmed = await confirm(
            "Reiniciar Todo",
            "¿Estás seguro de que deseas reiniciar TODO el progreso médico? Esta acción no se puede deshacer."
        );
        if (confirmed) {
            resetState();
        }
    };

    return (
        <>
            <div className="grid">
                <div className="card">
                    <h2>Jerarquía Médica</h2>
                    <p className="muted" style={{ marginBottom: '1rem' }}>Sigue tu evolución profesional y acumula experiencia.</p>
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
                    <h2>Energía del Grupo</h2>
                    <div className="health-container">
                        <div className="health-bar" style={{ width: `${state.health}%` }}></div>
                        <div className="health-text">{state.health} / 100</div>
                    </div>
                    <div className="divider"></div>
                    <div className="row">
                        <button className="btn warn" onClick={() => handleHealth(-10)}>Daño (Error)</button>
                        <button className="btn good" onClick={() => handleHealth(10)}>Heal (Recuperación)</button>
                    </div>
                </div>

                <div className="card">
                    <h2>Logros Médicos (Badges)</h2>
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
                    <h2>Gestión de Datos</h2>
                    <div className="smallout">Exporta el progreso para usarlo en otra clase o navegador.</div>
                    <div className="divider"></div>
                    <div className="row">
                        <button className="btn primary" onClick={exportData}>Exportar JSON</button>
                        <button className="btn warn" onClick={handleReset}>Reset Total</button>
                    </div>
                </div>
            </div>

            {promotion && (
                <div className="promotion-overlay" onClick={() => setPromotion(null)}>
                    <PromotionStars />
                    <div className="promotion-content">
                        <div className="promotion-badge">🎓</div>
                        <div className="promotion-title">¡ASCENSO LOGRADO!</div>
                        <div className="promotion-rank">{promotion}</div>
                        <div className="smallout" style={{ background: 'transparent' }}>Tu prestigio médico ha crecido.</div>
                    </div>
                </div>
            )}
        </>
    );
};

const PromotionStars = () => {
    const containerRef = useRef();

    useGSAP(() => {
        const stars = containerRef.current.querySelectorAll('.star');
        stars.forEach((star) => {
            gsap.set(star, {
                x: '50%',
                y: '50%',
                scale: 0,
                opacity: 1,
            });
            gsap.to(star, {
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: Math.random() * 2 + 0.5,
                duration: 2 + Math.random() * 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: Math.random() * 2
            });
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="promotion-stars">
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="star">✨</div>
            ))}
        </div>
    );
};

export default RPGDash;

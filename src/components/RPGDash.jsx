import React, { useState, useEffect, useRef } from 'react';
import { usePersistence } from '../hooks/usePersistence';
import { useNotifications } from './NotificationContext';
import { useGSAP } from '@gsap/react';
import CountUp from './CountUp';
import confetti from 'canvas-confetti';
import gsap from 'gsap';
import { RNG } from '../utils/rng';

const BADGES = [
    { id: 'eye', name: 'Ojo Clínico', nameGen: 'Gran Observador', icon: '👁️', detail: 'Detectar un síntoma o detalle clave' },
    { id: 'heart', name: 'Empatía', nameGen: 'Colaborador', icon: '❤️', detail: 'Resolver conflicto o ayudar a otros' },
    { id: 'brain', name: 'Genio', nameGen: 'Mente Brillante', icon: '🧠', detail: 'Razonamiento complejo' },
    { id: 'fast', name: 'Velocidad', nameGen: 'Rayos', icon: '⚡', detail: 'Resolver bajo presión' },
];

const RPGDash = () => {
    const { state, updateState, resetState } = usePersistence();
    const { notify, confirm } = useNotifications();
    const [promotion, setPromotion] = useState(null);
    const prevRankRef = useRef(null);

    // Mode handling: 'medical' | 'general'
    const mode = state.rpgMode || 'medical';

    const getRank = (xp) => {
        if (mode === 'medical') {
            if (xp >= 1000) return "Jefe/a de Servicio";
            if (xp >= 500) return "Adjunto/a";
            if (xp >= 250) return "Residente Senior";
            if (xp >= 100) return "Residente";
            return "Interno/a";
        } else {
            if (xp >= 1000) return "Maestro/a";
            if (xp >= 500) return "Experto/a";
            if (xp >= 250) return "Veterano/a";
            if (xp >= 100) return "Aprendiz";
            return "Novato/a";
        }
    };

    const getNextRankInfo = (xp) => {
        const nextThresholds = [100, 250, 500, 1000];
        const nextTarget = nextThresholds.find(t => xp < t);
        if (!nextTarget) return null;
        
        const nextRank = getRank(nextTarget);
        return { next: nextRank, needed: nextTarget - xp };
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Jerarquía</h2>
                        <select 
                            className="pill" 
                            value={mode} 
                            onChange={(e) => updateState({ rpgMode: e.target.value })}
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '2px 8px' }}
                        >
                            <option value="medical">🩺 Médico</option>
                            <option value="general">🎓 General</option>
                        </select>
                    </div>
                    <p className="muted" style={{ marginBottom: '1rem' }}>Sigue tu evolución {mode === 'medical' ? 'profesional' : 'académica'} y acumula experiencia.</p>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <motion.div 
                                key={getRank(state.xp)}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}
                            >
                                {getRank(state.xp)}
                            </motion.div>
                            {getNextRankInfo(state.xp) && (
                                <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                    Próximo: {getNextRankInfo(state.xp).next} (Faltan {getNextRankInfo(state.xp).needed} XP)
                                </div>
                            )}
                        </div>
                        <motion.div 
                            key={state.xp}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="pill"
                        >
                            XP: <CountUp to={state.xp} from={state.xp - 10} duration={0.5} className="mono" />
                        </motion.div>
                    </div>
                    <div className="divider"></div>
                    <div className="row">
                        <button className="btn good" onClick={() => handleXP(10)}>+10 XP (Acierto)</button>
                        <button className="btn" onClick={() => handleXP(50)}>+50 XP (Gran Logro)</button>
                    </div>
                </div>

                <div className="card">
                    <h2>Energía del Grupo</h2>
                    <div className="health-container">
                        <motion.div 
                            className="health-bar" 
                            animate={{ width: `${state.health}%` }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        />
                        <div className="health-text">{state.health} / 100</div>
                    </div>
                    <div className="divider"></div>
                    <div className="row">
                        <button className="btn warn" onClick={() => handleHealth(-10)}>Daño (Fallo)</button>
                        <button className="btn good" onClick={() => handleHealth(10)}>Heal (Recuperación)</button>
                    </div>
                </div>

                <div className="card">
                    <h2>Logros (Insignias)</h2>
                    <motion.div 
                        className="badge-grid"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.1 } }
                        }}
                    >
                        {BADGES.map((b) => (
                            <motion.div
                                key={b.id}
                                variants={{
                                    hidden: { scale: 0, opacity: 0 },
                                    visible: { scale: 1, opacity: 1 }
                                }}
                                whileHover={{ scale: 1.1 }}
                                className={`badge ${state.badges.includes(b.id) ? 'unlocked' : ''}`}
                                onClick={() => toggleBadge(b.id)}
                                title={b.detail}
                                style={{ 
                                    position: 'relative',
                                    animation: state.badges.includes(b.id) ? 'badge-spin 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none'
                                }}
                            >
                                {b.icon}
                                <div className="badge-name">{mode === 'medical' ? b.name : b.nameGen}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                    <button className="btn" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => notify("Proyección de logros activada", "achievement", "📽️")}>
                        📺 Proyectar Logros
                    </button>
                </div>

                <div className="card">
                    <h2>Gestión de Datos</h2>
                    <div className="smallout">Exporta el progreso para usarlo en otra clase.</div>
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
                        <div className="promotion-title">¡SUBIDA DE NIVEL!</div>
                        <div className="promotion-rank">{promotion}</div>
                        <div className="smallout" style={{ background: 'transparent' }}>Tu prestigio {mode === 'medical' ? 'médico' : 'académico'} ha crecido.</div>
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
                x: `${RNG.float() * 100}%`,
                y: `${RNG.float() * 100}%`,
                scale: RNG.float() * 2 + 0.5,
                duration: 2 + RNG.float() * 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: RNG.float() * 2
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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { RNG } from '../utils/rng';
import { useFullscreen } from '../hooks/useFullscreen';
import { useAudio } from './AudioContext';

// Tiempo de espera desde el ÚLTIMO dedo que se apoya. Cada dedo nuevo reinicia
// la cuenta, así nadie se queda fuera por llegar tarde.
const HOLD_MS = 2500;

// Un color estable por dedo: cada participante reconoce su propio círculo.
const FINGER_COLORS = [
    '#ff5c8a', '#4cc9f0', '#ffd166', '#8be28b', '#b28dff', '#ff9f5a',
    '#5eead4', '#f472b6', '#a3e635', '#60a5fa', '#fb7185', '#facc15',
];

const clamp = (min, v, max) => Math.min(max, Math.max(min, v));

const TouchOrder = () => {
    const { playSFX } = useAudio();

    const [mode,      setMode]      = useState(() => (localStorage.getItem('touch-mode') === 'one' ? 'one' : 'order'));
    const [soundOn,   setSoundOn]   = useState(() => localStorage.getItem('touch-sound') !== 'off');
    const [pickLabel, setPickLabel] = useState(() => localStorage.getItem('touch-label') || 'Sale');

    const [touches,  setTouches]  = useState({});   // { pointerId: { nx, ny, color } } — coords normalizadas 0..1
    const [results,  setResults]  = useState(null); // null | { pointerId: { rank, nx, ny, color } }
    const [phase,    setPhase]    = useState('waiting'); // 'waiting' | 'counting' | 'done'
    const [progress, setProgress] = useState(0);    // 0..1 de la cuenta atrás
    const [round,    setRound]    = useState(0);
    const [pad,      setPad]      = useState({ w: 0, h: 0 }); // tamaño REAL medido de la mesa
    // Modo inmersivo: la mesa ocupa TODA la pantalla del teléfono. No usa la
    // Fullscreen API (iOS no la soporta en elementos que no sean <video>), sino
    // una capa fija de 100dvh; en escritorio/Android se pide además fullscreen.
    // En teléfonos y tabletas se abre expandida de entrada: es donde más falta
    // hace el espacio. Si el usuario la cierra, se recuerda.
    const [immersive, setImmersive] = useState(() => (
        // Pantalla pequeña o dispositivo táctil (celular, tableta, pizarrón):
        // ahí la mesa vale más que el resto de la interfaz.
        window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
        && localStorage.getItem('touch-immersive') !== 'off'
    ));

    const stageRef   = useRef(null);
    const padRef     = useRef(null);
    const rectRef    = useRef(null);
    const touchesRef = useRef({});
    const phaseRef   = useRef('waiting');
    const deadlineRef = useRef(0);
    const rafRef     = useRef(null);
    const tickRef    = useRef(-1);
    const colorRef   = useRef(0);

    // Espejos en refs para que los handlers de puntero sean estables y no haya
    // que re-suscribir los listeners al cambiar de modo.
    const soundRef = useRef(soundOn);
    const modeRef  = useRef(mode);

    const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(stageRef);

    // Con la mesa expandida, la página de detrás no debe poder desplazarse
    // (evita el "rebote" y el arrastre para recargar en el móvil).
    useEffect(() => {
        if (!immersive) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [immersive]);

    const toggleImmersive = useCallback(() => {
        const next = !immersive;
        setImmersive(next);
        localStorage.setItem('touch-immersive', next ? 'on' : 'off');
        // La Fullscreen API es un extra (escritorio/Android): si falla o no
        // existe, la capa fija ya ocupa toda la pantalla.
        if (next !== isFullscreen) toggleFullscreen();
    }, [immersive, isFullscreen, toggleFullscreen]);

    useEffect(() => { soundRef.current = soundOn; localStorage.setItem('touch-sound', soundOn ? 'on' : 'off'); }, [soundOn]);
    useEffect(() => { modeRef.current = mode;    localStorage.setItem('touch-mode', mode); }, [mode]);
    useEffect(() => { localStorage.setItem('touch-label', pickLabel); }, [pickLabel]);

    // ─── Medición real de la mesa ────────────────────────────────────────────
    // El tamaño de los círculos y la posición de los dedos se calculan SIEMPRE
    // a partir de esta medición (no de un valor supuesto durante el render), y
    // se recalculan al redimensionar, rotar o entrar en pantalla completa.
    useEffect(() => {
        const el = padRef.current;
        if (!el) return;
        const measure = () => {
            const r = el.getBoundingClientRect();
            rectRef.current = r;
            setPad(prev => (Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
                ? prev
                : { w: r.width, h: r.height }));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, { passive: true });
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure);
        };
    }, []);

    // Diámetro ÚNICO para todos los círculos: no cambia al asignar turnos ni al
    // entrar un dedo nuevo, sólo si cambia el tamaño de la mesa.
    const dotSize = useMemo(() => {
        const base = Math.min(pad.w || 420, pad.h || 420);
        return Math.round(clamp(64, base * 0.2, 148));
    }, [pad.w, pad.h]);

    const setPhaseSync = useCallback((p) => { phaseRef.current = p; setPhase(p); }, []);

    const stopTicker = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }, []);

    // ─── Sorteo ──────────────────────────────────────────────────────────────
    const finish = useCallback(() => {
        stopTicker();
        setProgress(0);

        const ids = Object.keys(touchesRef.current);
        if (!ids.length) { setPhaseSync('waiting'); return; }

        const order = RNG.shuffle(ids);
        const res = {};
        order.forEach((id, i) => {
            const t = touchesRef.current[id];
            res[id] = { rank: i, nx: t.nx, ny: t.ny, color: t.color };
        });

        setResults(res);
        setRound(r => r + 1);
        setPhaseSync('done');

        if (navigator.vibrate) navigator.vibrate([120, 60, 180]);
        if (soundRef.current) playSFX(modeRef.current === 'one' ? 'correct_alt' : 'boing');

        // Confeti desde el dedo ganador, no desde el centro de la pantalla.
        const first = res[order[0]];
        const r = rectRef.current;
        if (first && r) {
            confetti({
                particleCount: 70,
                spread: 65,
                startVelocity: 32,
                scalar: 0.9,
                origin: {
                    x: clamp(0, (r.left + first.nx * r.width) / window.innerWidth, 1),
                    y: clamp(0, (r.top + first.ny * r.height) / window.innerHeight, 1),
                },
                colors: [first.color, '#ffffff', '#ffd166'],
            });
        }
    }, [playSFX, setPhaseSync, stopTicker]);

    // Arranca (o reinicia) la cuenta atrás. Cada dedo nuevo la reinicia.
    const arm = useCallback(() => {
        deadlineRef.current = performance.now() + HOLD_MS;
        tickRef.current = -1;
        setPhaseSync('counting');
        if (rafRef.current) return; // el bucle ya corre: sólo se movió la meta

        const loop = () => {
            const left = deadlineRef.current - performance.now();
            if (left <= 0) { rafRef.current = null; finish(); return; }

            const p = 1 - left / HOLD_MS;
            setProgress(prev => (Math.abs(prev - p) > 0.015 ? p : prev));

            const sec = Math.ceil(left / 1000);
            if (sec !== tickRef.current) {
                tickRef.current = sec;
                if (navigator.vibrate) navigator.vibrate(15);
                if (soundRef.current) playSFX('tick');
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, [finish, playSFX, setPhaseSync]);

    const cancel = useCallback(() => {
        stopTicker();
        setProgress(0);
        setPhaseSync('waiting');
    }, [setPhaseSync, stopTicker]);

    const newRound = useCallback(() => {
        stopTicker();
        setProgress(0);
        setResults(null);
        if (Object.keys(touchesRef.current).length) arm();
        else setPhaseSync('waiting');
    }, [arm, setPhaseSync, stopTicker]);

    // ─── Punteros (dedos, lápiz o ratón) ─────────────────────────────────────
    const onDown = useCallback((e) => {
        const el = padRef.current;
        // Los controles que viven dentro de la mesa (botón "Otra ronda") no
        // cuentan como dedo.
        if (!el || e.target !== el) return;

        const r = el.getBoundingClientRect();
        rectRef.current = r;
        if (!r.width || !r.height) return;

        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch { /* no soportado */ }

        // Un dedo nuevo tras un resultado empieza ronda nueva al instante.
        if (phaseRef.current === 'done') setResults(null);

        const t = { ...touchesRef.current };
        t[e.pointerId] = {
            nx: clamp(0, (e.clientX - r.left) / r.width, 1),
            ny: clamp(0, (e.clientY - r.top) / r.height, 1),
            color: FINGER_COLORS[colorRef.current++ % FINGER_COLORS.length],
        };
        touchesRef.current = t;
        setTouches(t);
        arm();
    }, [arm]);

    const onMove = useCallback((e) => {
        const prev = touchesRef.current[e.pointerId];
        const r = rectRef.current;
        if (!prev || !r || !r.width || !r.height) return;
        const t = { ...touchesRef.current };
        t[e.pointerId] = {
            ...prev,
            nx: clamp(0, (e.clientX - r.left) / r.width, 1),
            ny: clamp(0, (e.clientY - r.top) / r.height, 1),
        };
        touchesRef.current = t;
        setTouches(t);
    }, []);

    const onUp = useCallback((e) => {
        const el = padRef.current;
        if (el) { try { el.releasePointerCapture(e.pointerId); } catch { /* no soportado */ } }
        if (!touchesRef.current[e.pointerId]) return;

        const t = { ...touchesRef.current };
        delete t[e.pointerId];
        touchesRef.current = t;
        setTouches(t);

        // Si se levantan todos los dedos antes del final, se cancela el sorteo.
        if (!Object.keys(t).length && phaseRef.current === 'counting') cancel();
    }, [cancel]);

    useEffect(() => {
        const el = padRef.current;
        if (!el) return;
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
        return () => {
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
        };
    }, [onDown, onMove, onUp]);

    useEffect(() => () => stopTicker(), [stopTicker]);

    const switchMode = (next) => {
        if (next === mode) return;
        stopTicker();
        setProgress(0);
        setResults(null);
        setRound(0);
        setMode(next);
        if (Object.keys(touchesRef.current).length) arm();
        else setPhaseSync('waiting');
    };

    const resetAll = () => {
        stopTicker();
        touchesRef.current = {};
        setTouches({});
        setResults(null);
        setProgress(0);
        setRound(0);
        setPhaseSync('waiting');
    };

    const touchCount = Object.keys(touches).length;
    const done = phase === 'done' && !!results;

    const dots = useMemo(() => (done
        ? Object.entries(results).map(([id, r]) => ({ id, ...r, assigned: true }))
        : Object.entries(touches).map(([id, t]) => ({ id, ...t, assigned: false, rank: -1 }))
    ), [done, results, touches]);

    const secondsLeft = Math.max(1, Math.ceil(((1 - progress) * HOLD_MS) / 1000));

    const hint = done
        ? (mode === 'one'
            ? `⭐ ${pickLabel || 'Sale'}: el dedo marcado. Toca otra vez para repetir.`
            : 'Turnos asignados. Toca de nuevo para una ronda nueva.')
        : phase === 'counting'
            ? `Sin mover los dedos… ${secondsLeft}`
            : `Cada participante apoya un dedo. El sorteo salta ${HOLD_MS / 1000} s después del último dedo.`;

    return (
        <div className="grid">
            <div className="card">
                <div className="touch-head">
                    <h2>Orden por toque</h2>
                    {round > 0 && (
                        <button className="btn subtle" onClick={resetAll}>↺ Reiniciar</button>
                    )}
                </div>

                <div className={`touch-stage${immersive ? ' is-immersive' : ''}`} ref={stageRef}>
                    <div className="touch-bar">
                        <div className="seg" role="group" aria-label="Modo de sorteo">
                            <button type="button" className={mode === 'order' ? 'on' : ''} onClick={() => switchMode('order')}>
                                Orden completo
                            </button>
                            <button type="button" className={mode === 'one' ? 'on' : ''} onClick={() => switchMode('one')}>
                                Elegir a uno
                            </button>
                        </div>

                        {mode === 'one' && (
                            <input
                                className="touch-label-input"
                                value={pickLabel}
                                onChange={(e) => setPickLabel(e.target.value)}
                                maxLength={18}
                                aria-label="Qué le toca al elegido"
                                placeholder="Sale"
                            />
                        )}

                        <span className="touch-round">
                            {touchCount > 0
                                ? `${touchCount} ${touchCount === 1 ? 'dedo' : 'dedos'}`
                                : round > 0 ? `Ronda ${round}` : ''}
                        </span>

                        <div className="touch-actions">
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setSoundOn(s => !s)}
                                aria-pressed={soundOn}
                                title={soundOn ? 'Silenciar' : 'Activar sonido'}
                            >
                                {soundOn ? '🔊' : '🔇'}
                            </button>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={toggleImmersive}
                                title={immersive ? 'Salir de pantalla completa' : 'Mesa a pantalla completa'}
                                aria-label={immersive ? 'Salir de pantalla completa' : 'Mesa a pantalla completa'}
                            >
                                {immersive ? '✕' : '⛶'}
                            </button>
                        </div>
                    </div>

                    <div
                        ref={padRef}
                        className={`touch-pad ${phase === 'counting' ? 'is-counting' : ''} ${done ? 'is-done' : ''}`}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        {/* Cuenta atrás de fondo: se ve de lejos sin tapar los dedos */}
                        {phase === 'counting' && (
                            <div className="touch-countdown" aria-hidden>{secondsLeft}</div>
                        )}

                        {/* Estado vacío */}
                        {touchCount === 0 && !done && (
                            <div className="touch-empty">
                                <span className="touch-empty-icon" aria-hidden>👆</span>
                                <strong>Un dedo cada uno, aquí dentro</strong>
                                <span>
                                    {mode === 'one'
                                        ? `Sólo uno ${(pickLabel || 'sale').toLowerCase()}`
                                        : 'Se reparte el orden de participación'}
                                </span>
                            </div>
                        )}

                        <AnimatePresence>
                            {dots.map((d) => {
                                const half = dotSize / 2 + 4;
                                const cx = clamp(half, d.nx * pad.w, Math.max(half, pad.w - half));
                                const cy = clamp(half, d.ny * pad.h, Math.max(half, pad.h - half));

                                const isFirst = d.assigned && d.rank === 0;
                                const isOut   = d.assigned && mode === 'one' && !isFirst;
                                // Anillo de progreso POR FUERA del círculo, para que no
                                // se confunda con el borde de color del dedo.
                                const ringBox = dotSize + 18;
                                const ringR   = ringBox / 2 - 4;

                                return (
                                    <motion.div
                                        key={d.id}
                                        className={`touch-dot${isFirst ? ' is-first' : ''}`}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: isOut ? 0.34 : 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        // Muelle sin rebote: el círculo aparece y se queda del
                                        // MISMO tamaño, nunca crece ni se encoge después.
                                        transition={{ type: 'spring', stiffness: 420, damping: 42 }}
                                        style={{
                                            left: cx,
                                            top: cy,
                                            width: dotSize,
                                            height: dotSize,
                                            borderColor: d.color,
                                            color: d.color, // lo usa el pulso (currentColor)
                                            background: `${d.color}2b`,
                                            boxShadow: isFirst ? `0 0 46px ${d.color}` : 'none',
                                            zIndex: isFirst ? 4 : 3,
                                        }}
                                    >
                                        {/* Anillo de progreso mientras se cuenta */}
                                        {!d.assigned && phase === 'counting' && (
                                            <svg className="touch-ring" viewBox={`0 0 ${ringBox} ${ringBox}`} aria-hidden>
                                                <circle
                                                    cx={ringBox / 2} cy={ringBox / 2} r={ringR}
                                                    fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5"
                                                />
                                                <circle
                                                    cx={ringBox / 2} cy={ringBox / 2} r={ringR}
                                                    fill="none" stroke={d.color} strokeWidth="5" strokeLinecap="round"
                                                    strokeDasharray={2 * Math.PI * ringR}
                                                    strokeDashoffset={2 * Math.PI * ringR * (1 - progress)}
                                                />
                                            </svg>
                                        )}

                                        {d.assigned && mode === 'order' && (
                                            <span className="touch-num" style={{ fontSize: dotSize * 0.46 }}>
                                                {d.rank + 1}
                                            </span>
                                        )}

                                        {d.assigned && mode === 'one' && (isFirst ? (
                                            <>
                                                <span style={{ fontSize: dotSize * 0.3, lineHeight: 1 }} aria-hidden>⭐</span>
                                                <span className="touch-num" style={{ fontSize: dotSize * 0.15, letterSpacing: '0.04em' }}>
                                                    {(pickLabel || 'Sale').toUpperCase()}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="touch-num" style={{ fontSize: dotSize * 0.3, opacity: 0.7 }}>✗</span>
                                        ))}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {done && (
                            <button type="button" className="touch-again" onClick={newRound}>
                                Otra ronda
                            </button>
                        )}
                    </div>

                    <p className="touch-hint">{hint}</p>
                </div>
            </div>
        </div>
    );
};

export default TouchOrder;

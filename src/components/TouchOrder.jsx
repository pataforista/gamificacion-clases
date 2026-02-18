import React, { useState, useRef, useEffect } from 'react';
import { RNG } from '../utils/rng';

const TouchOrder = () => {
    const [touches, setTouches] = useState({});
    const [winnerId, setWinnerId] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const padRef = useRef(null);
    const timerRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    const handleTouchStart = (e) => {
        e.preventDefault();
        const newTouches = { ...touches };
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            newTouches[t.identifier] = { x: t.clientX, y: t.clientY, startTime: Date.now() };
        }
        setTouches(newTouches);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        const newTouches = { ...touches };
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (newTouches[t.identifier]) {
                newTouches[t.identifier].x = t.clientX;
                newTouches[t.identifier].y = t.clientY;
            }
        }
        setTouches(newTouches);
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        const newTouches = { ...touches };
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            delete newTouches[t.identifier];
        }
        setTouches(newTouches);
    };

    const startCountdown = () => {
        if (timerRef.current) return;

        setWinnerId(null);
        setCountdown(3);

        let count = 3;
        countdownIntervalRef.current = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                clearInterval(countdownIntervalRef.current);
            }
        }, 1000);

        timerRef.current = setTimeout(() => {
            const ids = Object.keys(touches);
            if (ids.length > 0) {
                const winner = ids[Math.floor(Math.random() * ids.length)];
                setWinnerId(winner);
                setCountdown(null);
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
            timerRef.current = null;
        }, 3000);
    };

    const cancelCountdown = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setCountdown(null);
        setWinnerId(null);
    };

    useEffect(() => {
        const touchCount = Object.keys(touches).length;
        if (touchCount >= 2 && !winnerId && !countdown) {
            startCountdown();
        } else if (touchCount < 2) {
            cancelCountdown();
        }
    }, [touches]);

    useEffect(() => {
        const pad = padRef.current;
        if (!pad) return;
        pad.addEventListener('touchstart', handleTouchStart, { passive: false });
        pad.addEventListener('touchmove', handleTouchMove, { passive: false });
        pad.addEventListener('touchend', handleTouchEnd, { passive: false });
        pad.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        return () => {
            pad.removeEventListener('touchstart', handleTouchStart);
            pad.removeEventListener('touchmove', handleTouchMove);
            pad.removeEventListener('touchend', handleTouchEnd);
            pad.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [touches]);

    // Logic to "capture" participants if they hold for > 600ms (simplified for React)
    // In a real app we'd use a timer per touch, but for MVP we'll just show markers

    return (
        <div className="grid">
            <div className="card">
                <h2>Orden por Multi-Touch</h2>
                <div className="smallout">Coloca varios dedos en el panel y mantenlos para capturarlos.</div>
                <div
                    ref={padRef}
                    className="touchpad"
                    style={{
                        position: 'relative',
                        background: '#0a0a0b',
                        height: '400px',
                        borderRadius: '24px',
                        border: '1px dashed #444',
                        marginTop: '20px',
                        overflow: 'hidden',
                        touchAction: 'none'
                    }}
                >
                    {countdown !== null && (
                        <div className="touch-countdown">
                            {countdown}
                        </div>
                    )}

                    {Object.entries(touches).map(([id, t]) => {
                        const rect = padRef.current?.getBoundingClientRect();
                        if (!rect) return null;
                        const isWinner = winnerId === id;
                        return (
                            <div
                                key={id}
                                className={`dot ${isWinner ? 'winner' : 'active'}`}
                                style={{
                                    left: t.x - rect.left,
                                    top: t.y - rect.top,
                                    position: 'absolute',
                                    width: isWinner ? '120px' : '80px',
                                    height: isWinner ? '120px' : '80px',
                                    borderRadius: '50%',
                                    border: isWinner ? '4px solid var(--primary)' : '2px solid var(--good)',
                                    transform: 'translate(-50%, -50%)',
                                    background: isWinner ? 'rgba(99, 102, 241, 0.4)' : 'rgba(45, 212, 191, 0.2)',
                                    transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s'
                                }}
                            >
                                {isWinner && <div className="winner-label">¡ELEGIDO!</div>}
                            </div>
                        );
                    })}
                </div>
                <div className="divider"></div>
                <div className="smallout">
                    {winnerId ? "¡Sorteo completado! Retira los dedos para reiniciar." :
                        countdown ? "Mantén los dedos quietos..." :
                            "Esperando al menos 2 dedos..."}
                </div>
            </div>
        </div>
    );
};

export default TouchOrder;

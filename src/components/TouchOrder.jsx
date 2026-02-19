import React, { useState, useRef, useEffect } from 'react';

const TouchOrder = () => {
    const [touches, setTouches] = useState({});
    const [results, setResults] = useState({}); // { id: orderNumber }
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

        setResults({});
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
                // Shuffle logic
                const shuffled = [...ids].sort(() => Math.random() - 0.5);
                const orderResults = {};
                shuffled.forEach((id, index) => {
                    orderResults[id] = index + 1;
                });

                setResults(orderResults);
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
        setResults({});
    };

    useEffect(() => {
        const touchCount = Object.keys(touches).length;
        const resultCount = Object.keys(results).length;

        if (touchCount >= 2 && resultCount === 0 && !countdown) {
            startCountdown();
        } else if (touchCount < 2 && !resultCount) {
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

    return (
        <div className="grid">
            <div className="card">
                <h2>Orden por Multi-Touch</h2>
                <div className="smallout">Coloca varios dedos y obtén un orden aleatorio para todos.</div>
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
                        const order = results[id];
                        const isWinner = order === 1; // Highlight the first one
                        const hasResult = order !== undefined;

                        return (
                            <div
                                key={id}
                                className={`dot ${hasResult ? 'active' : ''}`}
                                style={{
                                    left: t.x - rect.left,
                                    top: t.y - rect.top,
                                    position: 'absolute',
                                    width: hasResult ? '100px' : '80px',
                                    height: hasResult ? '100px' : '80px',
                                    borderRadius: '50%',
                                    border: isWinner ? '4px solid var(--primary)' : hasResult ? '2px solid var(--good)' : '2px solid rgba(255,255,255,0.2)',
                                    transform: 'translate(-50%, -50%)',
                                    background: isWinner ? 'rgba(99, 102, 241, 0.4)' : hasResult ? 'rgba(45, 212, 191, 0.2)' : 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                {hasResult && (
                                    <div style={{
                                        color: '#fff',
                                        fontWeight: 900,
                                        fontSize: isWinner ? '2rem' : '1.5rem',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        {order}º
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="divider"></div>
                <div className="smallout">
                    {Object.keys(results).length > 0 ? "¡Orden asignado! Retira los dedos para reiniciar." :
                        countdown ? "Mantén los dedos quietos..." :
                            "Esperando al menos 2 dedos..."}
                </div>
            </div>
        </div>
    );
};

export default TouchOrder;

import React, { useState, useRef, useEffect } from 'react';
import { RNG } from '../utils/rng';

const TouchOrder = () => {
    const [touches, setTouches] = useState({});
    const [participants, setParticipants] = useState([]);
    const [order, setOrder] = useState([]);
    const [turnIndex, setTurnIndex] = useState(-1);
    const padRef = useRef(null);

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

    const generateOrder = () => {
        if (participants.length < 2) return alert("Coloca varios dedos en el panel para capturar participantes.");
        const items = [...participants];
        for (let i = items.length - 1; i > 0; i--) {
            const j = RNG.int(0, i);
            [items[i], items[j]] = [items[j], items[i]];
        }
        setOrder(items);
        setTurnIndex(0);
    };

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
                    style={{ position: 'relative', background: '#0a0a0b', height: '300px', borderRadius: '24px', border: '1px dashed #444', marginTop: '20px', overflow: 'hidden' }}
                >
                    {Object.entries(touches).map(([id, t]) => {
                        const rect = padRef.current?.getBoundingClientRect();
                        if (!rect) return null;
                        return (
                            <div
                                key={id}
                                className="dot active"
                                style={{
                                    left: t.x - rect.left,
                                    top: t.y - rect.top,
                                    position: 'absolute',
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--good)',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'rgba(45, 212, 191, 0.2)'
                                }}
                            />
                        );
                    })}
                </div>
                <div className="divider"></div>
                <div className="row">
                    <button className="btn primary good" onClick={() => setParticipants(Object.keys(touches).map(id => `Participante ${id}`))}>Capturar Actuales</button>
                    <button className="btn" onClick={generateOrder}>Generar Orden</button>
                    <button className="btn" onClick={() => { setOrder([]); setTurnIndex(-1); setParticipants([]); }}>Reset</button>
                </div>
            </div>

            <div className="card">
                <h2>Orden de Intervencin</h2>
                <div className="orderlist">
                    {order.map((p, i) => (
                        <div key={i} className={`orderitem ${i === turnIndex ? 'active' : ''}`}>
                            <span>{p}</span>
                            <span className="pill">#{i + 1}</span>
                        </div>
                    ))}
                    {order.length > 0 && turnIndex < order.length - 1 && (
                        <button className="btn" onClick={() => setTurnIndex(prev => prev + 1)} style={{ marginTop: '10px' }}>Siguiente Turno</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TouchOrder;

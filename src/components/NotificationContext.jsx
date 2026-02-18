import React, { createContext, useContext, useState, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import './Notifications.css';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const notify = useCallback((msg, type = 'xp', icon = '⭐') => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, msg, type, icon }]);

        // Auto-remove after 4s
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
    }, []);

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <div className="notification-container">
                {notifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

const NotificationItem = ({ notification }) => {
    const containerRef = React.useRef();

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { x: 100, opacity: 0, scale: 0.8 },
            { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
        );

        // Exit animation before removal
        gsap.to(containerRef.current, {
            opacity: 0,
            x: 50,
            scale: 0.9,
            delay: 3.5,
            duration: 0.5,
            ease: 'power2.in'
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className={`notification ${notification.type}`}>
            <div className="notification-icon">{notification.icon}</div>
            <div className="notification-content">
                <div className="notification-title">{notification.type === 'xp' ? 'Progreso' : 'Logro'}</div>
                <div className="notification-msg">{notification.msg}</div>
            </div>
        </div>
    );
};

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const Dialog = ({ isOpen, title, message, onConfirm, onCancel, type = 'alert' }) => {
    const confirmRef = useRef(null);
    const cancelRef = useRef(null);

    // Esc cierra (equivale a "Cancelar"). El foco inicial va a "Entendido" en
    // los avisos y a "Cancelar" en las confirmaciones, para que un Enter
    // distraído nunca borre nada.
    useEffect(() => {
        if (!isOpen) return;
        (type === 'confirm' ? cancelRef : confirmRef).current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onCancel, type]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    key="dialog"
                    role={type === 'confirm' ? 'alertdialog' : 'dialog'}
                    aria-modal="true"
                    aria-labelledby="dialog-title"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        pointerEvents: 'none'
                    }}
                >
                    <motion.div
                        className="dialog-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />

                    <motion.div
                        className="dialog-panel"
                        initial={{ opacity: 0, y: 16, rotate: -1.5 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                    >
                        <div className="dialog-icon" aria-hidden>
                            {type === 'confirm' ? '❓' : '⚠️'}
                        </div>
                        <h2 id="dialog-title">{title}</h2>
                        <p>{message}</p>
                        <div className="dialog-actions">
                            {type === 'confirm' && (
                                <button ref={cancelRef} className="btn" onClick={onCancel}>
                                    Cancelar
                                </button>
                            )}
                            <button ref={confirmRef} className="btn primary" onClick={onConfirm}>
                                {type === 'confirm' ? 'Confirmar' : 'Entendido'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Dialog;

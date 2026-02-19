import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const Dialog = ({ isOpen, title, message, onConfirm, onCancel, type = 'alert' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    pointerEvents: 'none'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            pointerEvents: 'auto'
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '400px',
                            background: 'rgba(20, 20, 25, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '28px',
                            padding: '30px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'auto',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            fontSize: '2.5rem',
                            marginBottom: '15px'
                        }}>
                            {type === 'confirm' ? '❓' : '⚠️'}
                        </div>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            marginBottom: '10px',
                            color: '#fff'
                        }}>
                            {title}
                        </h2>

                        <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.6',
                            marginBottom: '25px',
                            fontSize: '0.95rem'
                        }}>
                            {message}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center'
                        }}>
                            {type === 'confirm' && (
                                <button
                                    className="btn"
                                    onClick={onCancel}
                                    style={{ flex: 1, padding: '12px' }}
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                className="btn primary"
                                onClick={onConfirm}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: type === 'confirm' ? 'var(--warn)' : 'var(--primary)'
                                }}
                            >
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

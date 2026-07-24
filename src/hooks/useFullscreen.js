import { useState, useEffect, useCallback } from 'react';

// Pantalla completa sobre un elemento concreto (una card de herramienta), para
// proyectar Ruleta, Bingo o el temporizador a tamaño de aula. Usa la Fullscreen
// API estándar; si el navegador la rechaza (o no la soporta) falla en silencio.
export function useFullscreen(ref) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, [ref]);

    const toggle = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (ref.current?.requestFullscreen) {
                await ref.current.requestFullscreen();
            }
        } catch (err) {
            console.warn('Fullscreen no disponible:', err);
        }
    }, [ref]);

    return { isFullscreen, toggle };
}

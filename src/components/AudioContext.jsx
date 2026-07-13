import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';

const AudioCtx = createContext();

export const useAudio = () => {
    const context = useContext(AudioCtx);
    if (!context) {
        throw new Error('useAudio debe usarse dentro de AudioProvider');
    }
    return context;
};

// Colección de canciones de espera/transición estables.
// Todas son locales (las sintetizadas se regeneran con
// `node scripts/generate-sounds.mjs`), así que funcionan offline
// desde la primera carga.
export const WAITING_TRACKS = {
    jeopardy: { name: 'Jeopardy Tema', url: '/sounds/Jeopardy-Theme.mp3' },
    cien_mexicanos: { name: '100 Mexicanos Dijeron', url: '/sounds/100-Mexicanos-dijieron-Tiempo-en-el-Relo.mp3' },
    fun: { name: 'Divertido', url: '/sounds/musica-divertida.mp3' },
    tension: { name: 'Tensión Máxima', url: '/sounds/musica-tension.mp3' },
    dance: { name: 'Energía', url: '/sounds/musica-energia.mp3' },
    thinking: { name: 'Pensando...', url: '/sounds/musica-pensando.mp3' },
};

export const GAME_SFX = {
  intro: '/sounds/musica intro para juego.mp3',
  correct: '/sounds/100-Mexicanos-Dijieron-Respuesta-Correct.mp3',
  correct_alt: '/sounds/buena.mp3',
  incorrect: '/sounds/error 2.mp3',
  incorrect_heavy: '/sounds/error.mp3',
  lose: '/sounds/sfx-lose.mp3',
  click: '/sounds/sfx-click.mp3',
  boing: '/sounds/sfx-boing.mp3',
  applause: '/sounds/aplausos.mp3',
  victory: '/sounds/100-Mexicanos-Dijeron-Musica-de-triunfo_Media.mp3',
  buzzer: '/sounds/sfx-buzzer.mp3',
  drumroll: '/sounds/sfx-drumroll.mp3',
  tick: '/sounds/sfx-tick.mp3',
};

// Cache for SFX elements to prevent memory leaks
const sfxCache = {};

export const AudioProvider = ({ children }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [volume, setVolume] = useState(0.7);
    const audioRef = useRef(new Audio());

    const play = useCallback((trackKey, loop = true) => {
        const track = WAITING_TRACKS[trackKey];
        if (!track) {
            console.warn(`Track not found: ${trackKey}`);
            return;
        }

        const audio = audioRef.current;

        // Si ya está sonando, no reiniciar
        if (isPlaying && currentTrack === trackKey) return;

        // Detener audio actual
        audio.pause();
        audio.currentTime = 0;

        // Configurar nuevo audio
        audio.src = track.url;
        audio.volume = volume;
        audio.loop = loop;

        let playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => console.warn('Audio play error:', err));
        }

        setCurrentTrack(trackKey);
        setIsPlaying(true);
    }, [isPlaying, currentTrack, volume]);

    const stop = useCallback(() => {
        const audio = audioRef.current;
        if (!audio.paused) {
            audio.pause();
        }
        audio.currentTime = 0;
        setIsPlaying(false);
        setCurrentTrack(null);
    }, []);

    const pause = useCallback(() => {
        audioRef.current.pause();
        setIsPlaying(false);
    }, []);

    const resume = useCallback(() => {
        if (currentTrack) {
            audioRef.current.play().catch(err => console.warn('Audio resume error:', err));
            setIsPlaying(true);
        }
    }, [currentTrack]);

    const changeVolume = useCallback((newVolume) => {
        const vol = Math.max(0, Math.min(1, newVolume));
        setVolume(vol);
        audioRef.current.volume = vol;
    }, []);

    const playSFX = useCallback((sfxKey) => {
        const url = GAME_SFX[sfxKey];
        if (!url) {
            console.warn(`SFX not found: ${sfxKey}`);
            return;
        }
        let sfx = sfxCache[url];
        if (!sfx) {
            sfx = new Audio(url);
            sfxCache[url] = sfx;
        }
        sfx.volume = volume;
        sfx.currentTime = 0;
        sfx.play().catch(err => console.warn('SFX play error:', err));
    }, [volume]);

    const unlock = useCallback(() => {
        // Reproducir un buffer silencioso minúsculo para activar AudioContext
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        silentAudio.play().then(() => console.log("Audio desbloqueado")).catch(() => {});
        if (currentTrack) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    }, [currentTrack]);

    // Memoizado para que los consumidores (y los efectos que dependen de
    // `audio`) no se re-ejecuten en cada render del provider.
    const value = useMemo(() => ({
        isPlaying,
        currentTrack,
        volume,
        play,
        playSFX,
        stop,
        pause,
        resume,
        unlock,
        changeVolume,
    }), [isPlaying, currentTrack, volume, play, playSFX, stop, pause, resume, unlock, changeVolume]);

    return (
        <AudioCtx.Provider value={value}>
            {children}
        </AudioCtx.Provider>
    );
};

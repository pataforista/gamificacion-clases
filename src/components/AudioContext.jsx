import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const AudioCtx = createContext();

export const useAudio = () => {
    const context = useContext(AudioCtx);
    if (!context) {
        throw new Error('useAudio debe usarse dentro de AudioProvider');
    }
    return context;
};

// Colección de canciones de espera/transición estables
export const WAITING_TRACKS = {
    jeopardy: { name: 'Jeopardy', url: 'https://www.soundjay.com/misc/game-show-bells-a11.mp3' },
    cien_mexicanos: { name: '100 Mexicanos Dijeron', url: 'https://www.soundjay.com/button/sounds/button-30.mp3' },
    fun: { name: 'Divertido', url: 'https://assets.mixkit.co/music/preview/mixkit-just-chill-16.mp3' },
    tension: { name: 'Tensión Máxima', url: 'https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3' },
    dance: { name: 'Energía', url: 'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3' },
};

export const GAME_SFX = {
  intro: 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-changing-tab-206.mp3',
  correct: '/sounds/buena.mp3',
  incorrect: '/sounds/error.mp3',
  lose: 'https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-game-over-470.mp3',
  click: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3',
  boing: 'https://assets.mixkit.co/sfx/preview/mixkit-cartoon-toy-whistle-316.mp3',
  applause: '/sounds/aplausos.mp3',
  buzzer: 'https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3',
  drumroll: 'https://assets.mixkit.co/sfx/preview/mixkit-drum-roll-566.mp3',
  tick: 'https://assets.mixkit.co/sfx/preview/mixkit-tick-tock-clock-timer-1045.mp3',
};

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
        const sfx = new Audio(url);
        sfx.volume = volume;
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

    const value = {
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
    };

    return (
        <AudioCtx.Provider value={value}>
            {children}
        </AudioCtx.Provider>
    );
};

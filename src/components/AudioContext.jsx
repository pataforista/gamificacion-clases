import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const AudioCtx = createContext();

export const useAudio = () => {
    const context = useContext(AudioCtx);
    if (!context) {
        throw new Error('useAudio debe usarse dentro de AudioProvider');
    }
    return context;
};

// Colección de canciones de espera/transición
export const WAITING_TRACKS = {
    jeopardy: {
        name: 'Jeopardy',
        url: 'https://assets.mixkit.co/active_storage/music/38-38-200bpm-pop-synth-rock.mp3',
    },
    cien_mexicanos: {
        name: '100 Mexicanos Dijeron',
        url: 'https://assets.mixkit.co/active_storage/music/32-classic-game-show-loop-32-bars.mp3',
    },
    game_show: {
        name: 'Game Show',
        url: 'https://assets.mixkit.co/active_storage/music/29-fun-game-show-synth-loop-1-bar.mp3',
    },
    thinking: {
        name: 'Tiempo para Pensar',
        url: 'https://assets.mixkit.co/active_storage/music/43-dramatic-synth-loop.mp3',
    },
};

export const AudioProvider = ({ children }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [volume, setVolume] = useState(0.3);
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

        audio.play().catch(err => console.warn('Audio play error:', err));

        setCurrentTrack(trackKey);
        setIsPlaying(true);
    }, [isPlaying, currentTrack, volume]);

    const stop = useCallback(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
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

    const value = {
        isPlaying,
        currentTrack,
        volume,
        play,
        stop,
        pause,
        resume,
        changeVolume,
    };

    return (
        <AudioCtx.Provider value={value}>
            {children}
        </AudioCtx.Provider>
    );
};

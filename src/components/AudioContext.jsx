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
    cien_mexicanos: { id: '100mex', name: '100 Mexicanos', url: 'https://assets.mixkit.co/active_storage/music/32-classic-game-show-loop-32-bars.mp3' },
    fun: { id: 'fun', name: 'Showbiz Fun', url: 'https://assets.mixkit.co/active_storage/music/29-fun-game-show-synth-loop-1-bar.mp3' },
    tension: { id: 'tension', name: 'Tensión Máxima', url: 'https://assets.mixkit.co/active_storage/music/43-dramatic-synth-loop.mp3' },
    karma: { id: 'karma', name: 'Karma (High Energy)', url: 'https://assets.mixkit.co/active_storage/music/38-38-200bpm-pop-synth-rock.mp3' },
    dance: { id: 'dance', name: 'Cena de Gala', url: 'https://assets.mixkit.co/active_storage/music/28-fun-game-show-circus-loop.mp3' },
    chill: { id: 'chill', name: 'Relajado', url: 'https://assets.mixkit.co/active_storage/music/26-retro-game-disco-loop.mp3' },
};

export const GAME_SFX = {
  intro: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/132/132-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  boing: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3',
  applause: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
  buzzer: 'https://assets.mixkit.co/active_storage/sfx/1073/1073-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/147/147-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/612/612-preview.mp3',
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

    const value = {
        isPlaying,
        currentTrack,
        volume,
        play,
        playSFX,
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

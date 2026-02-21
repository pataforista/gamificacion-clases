import { useState, useEffect } from 'react';

const STORAGE_KEY = "quickrand_state";

const DEFAULT_STATE = {
    xp: 0,
    health: 100,
    badges: [],
    traffic: "green",
    rollHistory: [],
    pickerItems: ["Opción A", "Opción B", "Opción C", "Opción D"],
    lastReset: new Date().toISOString()
};

export function usePersistence() {
    const [state, setState] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return DEFAULT_STATE;
        try {
            return JSON.parse(saved);
        } catch {
            return DEFAULT_STATE;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const updateState = (updates) => {
        setState((prev) => ({ ...prev, ...updates }));
    };

    const resetState = () => {
        const newState = { ...DEFAULT_STATE, lastReset: new Date().toISOString() };
        setState(newState);
    };

    return { state, updateState, resetState };
}

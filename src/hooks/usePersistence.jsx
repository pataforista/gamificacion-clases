import { useState, useEffect, useContext, createContext, useCallback } from 'react';

const STORAGE_KEY = "quickrand_state";

const DEFAULT_STATE = {
    xp: 0,
    health: 100,
    badges: [],
    traffic: "green",
    rollHistory: [],
    pickerItems: ["Opción A", "Opción B", "Opción C", "Opción D"],
    redCodeEndTime: null,
    isRedCodeActive: false,
    customTitle: "",
    customSubtitle: "",
    rpgMode: "medical",
    lastReset: null,
};

const loadInitial = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { ...DEFAULT_STATE, lastReset: new Date().toISOString() };
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
    } catch {
        return { ...DEFAULT_STATE, lastReset: new Date().toISOString() };
    }
};

const PersistenceContext = createContext(null);

export const PersistenceProvider = ({ children }) => {
    const [state, setState] = useState(loadInitial);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn("Persistence save failed:", err);
        }
    }, [state]);

    const updateState = useCallback((updates) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    const resetState = useCallback((preserveRoster = false) => {
        setState((prev) => ({
            ...DEFAULT_STATE,
            pickerItems: preserveRoster ? prev.pickerItems : DEFAULT_STATE.pickerItems,
            customTitle: preserveRoster ? prev.customTitle : "",
            customSubtitle: preserveRoster ? prev.customSubtitle : "",
            rpgMode: prev.rpgMode,
            lastReset: new Date().toISOString(),
        }));
    }, []);

    return (
        <PersistenceContext.Provider value={{ state, updateState, resetState }}>
            {children}
        </PersistenceContext.Provider>
    );
};

export function usePersistence() {
    const ctx = useContext(PersistenceContext);
    if (!ctx) {
        throw new Error("usePersistence debe usarse dentro de PersistenceProvider");
    }
    return ctx;
}

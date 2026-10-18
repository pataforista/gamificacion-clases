import { useState, useEffect, useContext, createContext, useCallback } from 'react';

import { DEFAULT_MECANICAS, CATEGORIA_IDS, EXTRA_IDS, NIVELES } from '../data/mecanicas';

const STORAGE_KEY = "quickrand_state";

const DEFAULT_STATE = {
    xp: 0,
    health: 100,
    badges: [],
    traffic: "green",
    rollHistory: [],
    pickerItems: ["Opción A", "Opción B", "Opción C", "Opción D"],
    savedRosters: [], // [{ id, name, items: string[] }] — listas de clase guardadas
    redCodeEndTime: null,
    isRedCodeActive: false,
    customTitle: "",
    customSubtitle: "",
    rpgMode: "medical",
    mecanicas: DEFAULT_MECANICAS, // configuración del Sorteo de mecánicas
    lastReset: null,
};

// Un respaldo importado o un localStorage dañado con tipos inesperados (p. ej.
// `badges` que no es lista) tumbaría la app en cada arranque, porque el estado
// se vuelve a guardar tal cual. Se corrigen los tipos campo por campo.
const sanitize = (raw) => {
    const s = { ...DEFAULT_STATE, ...(raw && typeof raw === 'object' ? raw : {}) };
    const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
    const strList = (v) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' || typeof x === 'number').map(String) : []);
    s.xp = Math.max(0, num(s.xp, 0));
    s.health = Math.min(100, Math.max(0, num(s.health, 100)));
    s.badges = strList(s.badges);
    s.pickerItems = strList(s.pickerItems);
    s.rollHistory = Array.isArray(s.rollHistory) ? s.rollHistory.filter(h => h && typeof h === 'object') : [];
    s.savedRosters = Array.isArray(s.savedRosters)
        ? s.savedRosters
            .filter(r => r && typeof r === 'object' && typeof r.name === 'string')
            .map(r => ({ ...r, id: r.id || `roster-${r.name}`, items: strList(r.items) }))
        : [];
    if (!['green', 'yellow', 'red'].includes(s.traffic)) s.traffic = 'green';
    if (!['medical', 'general'].includes(s.rpgMode)) s.rpgMode = 'medical';
    const mec = s.mecanicas && typeof s.mecanicas === 'object' ? s.mecanicas : {};
    const sub = (v, validos, d) => (Array.isArray(v) ? v.filter(x => validos.includes(x)) : d);
    s.mecanicas = {
        nivel: Object.keys(NIVELES).includes(mec.nivel) ? mec.nivel : DEFAULT_MECANICAS.nivel,
        categorias: sub(mec.categorias, CATEGORIA_IDS, DEFAULT_MECANICAS.categorias),
        extras: sub(mec.extras, EXTRA_IDS, DEFAULT_MECANICAS.extras),
        pensarAntes: typeof mec.pensarAntes === 'boolean' ? mec.pensarAntes : DEFAULT_MECANICAS.pensarAntes,
    };
    s.customTitle = typeof s.customTitle === 'string' ? s.customTitle : '';
    s.customSubtitle = typeof s.customSubtitle === 'string' ? s.customSubtitle : '';
    if (s.triviaQA !== undefined && typeof s.triviaQA !== 'string') delete s.triviaQA;
    // Un "código rojo" que ya venció (p. ej. se cerró la pestaña a mitad) no
    // debe reaparecer al abrir la app.
    if (!s.isRedCodeActive || !num(s.redCodeEndTime, 0) || s.redCodeEndTime < Date.now()) {
        s.isRedCodeActive = false;
        s.redCodeEndTime = null;
    }
    return s;
};

const loadInitial = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { ...DEFAULT_STATE, lastReset: new Date().toISOString() };
        return sanitize(JSON.parse(saved));
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

    // Reemplaza el estado completo desde un respaldo importado. Se fusiona sobre
    // los valores por defecto para tolerar respaldos antiguos a los que les
    // falten claves nuevas (y descartar cualquier clave desconocida sobrante).
    const importState = useCallback((incoming) => {
        if (!incoming || typeof incoming !== 'object') return;
        setState(sanitize({
            ...incoming,
            lastReset: incoming.lastReset || new Date().toISOString(),
        }));
    }, []);

    const resetState = useCallback((preserveRoster = false) => {
        setState((prev) => ({
            ...DEFAULT_STATE,
            pickerItems: preserveRoster ? prev.pickerItems : DEFAULT_STATE.pickerItems,
            savedRosters: preserveRoster ? (prev.savedRosters || []) : [],
            customTitle: preserveRoster ? prev.customTitle : "",
            customSubtitle: preserveRoster ? prev.customSubtitle : "",
            rpgMode: prev.rpgMode,
            mecanicas: prev.mecanicas,
            lastReset: new Date().toISOString(),
        }));
    }, []);

    return (
        <PersistenceContext.Provider value={{ state, updateState, resetState, importState }}>
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

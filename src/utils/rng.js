export const cleanLines = (str) =>
    (str || "")
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

export const RNG = {
    _bags: new Map(),

    int(min, max) {
        const range = max - min + 1;
        // Rejection sampling: descartar valores por encima del último múltiplo
        // completo de `range` para no sesgar los primeros valores del rango.
        const limit = Math.floor(4294967296 / range) * range;
        const array = new Uint32Array(1);
        do {
            crypto.getRandomValues(array);
        } while (array[0] >= limit);
        return min + (array[0] % range);
    },

    float() {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / 4294967296;
    },

    shuffle(arr) {
        const items = [...arr];
        for (let i = items.length - 1; i > 0; i--) {
            const j = this.int(0, i);
            [items[i], items[j]] = [items[j], items[i]];
        }
        return items;
    },

    pick(arr, key = "default") {
        if (!arr || arr.length === 0) return null;
        const idx = this.pickBalancedIndex(arr.length, key);
        return arr[idx];
    },

    keyFromItems(scope, arr) {
        const normalized = (arr || [])
            .map((v) => String(v).trim().toLowerCase())
            .sort()
            .join("||");
        return `${scope}:${normalized}`;
    },

    pickBalancedIndex(listLength, key) {
        if (listLength <= 0) return 0;
        const bagKey = `bag-${key}`;
        // Using sessionStorage to avoid multi-window state corruption
        let state = {};
        try { state = JSON.parse(sessionStorage.getItem('rng_bags') || '{}') || {}; } catch { state = {}; }
        let bag = Array.isArray(state[bagKey]) ? state[bagKey] : [];

        // Si la lista cambió de tamaño (p. ej. menos equipos), la bolsa vieja
        // tiene índices que ya no existen: se rehace en vez de repetir nombres.
        if (bag.length === 0 || bag.some(i => !Number.isInteger(i) || i >= listLength)) {
            bag = Array.from({ length: listLength }, (_, i) => i);
        }

        const randIdx = this.int(0, bag.length - 1);
        const resultIdx = bag.splice(randIdx, 1)[0];

        state[bagKey] = bag;
        try { sessionStorage.setItem('rng_bags', JSON.stringify(state)); } catch { /* sin almacenamiento */ }

        return resultIdx;
    },

    MEXICAN_FLAVOR: {
        correct: [
            "¡Eso, cuate!",
            "¡Ándale, vas bien!",
            "¡Le atinaste!",
            "¡Qué pro, compa!",
            "¡Zas! Directo al premio",
            "¡Bien bajado ese balón!",
            "¡Excelente, cuate!"
        ],
        wrong: [
            "¡Lástima, Margarito!",
            "¡Perdiste, cuate!",
            "¡Ni con la catafixia!",
            "¡Híjole, qué mala suerte!",
            "¡Adiós!",
            "¡Lástima!",
            "¡Sigue participando!"
        ],
        final: [
            "¡Gracias por participar!",
            "¿Te lo llevas o lo catafixias?",
            "¡La gran final ha terminado!",
            "¡Pásale a la catafixia!"
        ]
    },

    getFlavor(type) {
        const list = this.MEXICAN_FLAVOR[type] || this.MEXICAN_FLAVOR.correct;
        return list[this.int(0, list.length - 1)];
    },

    resetBag(key) {
        const bagKey = `bag-${key}`;
        try {
            const state = JSON.parse(sessionStorage.getItem('rng_bags') || '{}');
            delete state[bagKey];
            sessionStorage.setItem('rng_bags', JSON.stringify(state));
        } catch (e) {
            console.error(e);
        }
    },
};

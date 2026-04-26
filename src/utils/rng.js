export const cleanLines = (str) =>
    (str || "")
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

export const RNG = {
    _bags: new Map(),

    int(min, max) {
        const range = max - min + 1;
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
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
        const state = JSON.parse(sessionStorage.getItem('rng_bags') || '{}');
        let bag = state[bagKey] || [];

        if (bag.length === 0) {
            bag = Array.from({ length: listLength }, (_, i) => i);
        }

        const randIdx = this.int(0, bag.length - 1);
        const resultIdx = bag.splice(randIdx, 1)[0];

        state[bagKey] = bag;
        sessionStorage.setItem('rng_bags', JSON.stringify(state));

        return resultIdx % listLength;
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
        this._bags.delete(key);
    },
};

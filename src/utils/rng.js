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

    pick(arr, key = "default") {
        if (!arr || arr.length === 0) return null;
        const idx = this.pickBalancedIndex(key, arr.length);
        return arr[idx];
    },

    keyFromItems(scope, arr) {
        const normalized = (arr || [])
            .map((v) => String(v).trim().toLowerCase())
            .sort()
            .join("||");
        return `${scope}:${normalized}`;
    },

    pickBalancedIndex(key, size) {
        if (size <= 0) return -1;
        let bag = this._bags.get(key);

        if (!bag || bag.length === 0 || bag.max_size !== size) {
            bag = Array.from({ length: size }, (_, i) => i);
            bag.max_size = size;
            for (let i = bag.length - 1; i > 0; i--) {
                const j = this.int(0, i);
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        const idx = bag.pop();
        this._bags.set(key, bag);
        return idx;
    },

    resetBag(key) {
        this._bags.delete(key);
    },
};

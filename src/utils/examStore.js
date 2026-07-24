// Biblioteca local de exámenes guardada en IndexedDB.
//
// Se usa IndexedDB (y no localStorage) porque los exámenes pueden incluir
// imágenes incrustadas como data URL: varias imágenes superarían fácilmente el
// límite de ~5 MB de localStorage. IndexedDB ofrece mucho más espacio y no
// obliga a reserializar todo el estado en cada cambio.

const DB_NAME = 'medclass';
const STORE = 'exams';
const VERSION = 1;

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('Este navegador no soporta almacenamiento local de exámenes.'));
            return;
        }
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('No se pudo abrir la base de datos.'));
    });
    return dbPromise;
}

function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
}

export function newExamId() {
    return (crypto.randomUUID && crypto.randomUUID()) || `exam-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Devuelve la metadata de los exámenes (sin las preguntas completas) ordenada
// por actualización más reciente, para pintar la lista sin cargar imágenes.
export async function listExams() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readonly').getAll();
        req.onsuccess = () => {
            const rows = (req.result || []).map((e) => ({
                id: e.id,
                name: e.name,
                count: Array.isArray(e.questions) ? e.questions.length : 0,
                updatedAt: e.updatedAt || 0,
            }));
            rows.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(rows);
        };
        req.onerror = () => reject(req.error);
    });
}

export async function getExam(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readonly').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

export async function saveExam({ id, name, questions }) {
    const db = await openDB();
    const record = {
        id: id || newExamId(),
        name: (name || 'Examen sin título').trim(),
        questions,
        updatedAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteExam(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * storage-service.js
 * Único punto de acceso a IndexedDB.
 * Todos los servicios (progress, study, exam) pasan por aquí.
 *
 * DB: study-app-db  version: 1
 * Stores: flashcardProgress, flashcardReviews, quizAttempts,
 *         examAttempts, studySettings, studyState
 */

import {
  DB_NAME,
  DB_VERSION,
  STORE_FLASHCARD_PROGRESS,
  STORE_QUIZ_ATTEMPTS,
  STORE_EXAM_ATTEMPTS,
  STORE_STUDY_SETTINGS,
} from '../config.js';

// Nombres de stores adicionales no incluidos en config.js inicial
export const STORE_FLASHCARD_REVIEWS = 'flashcardReviews';
export const STORE_STUDY_STATE       = 'studyState';

/** Conexión singleton a la DB */
let _db = null;

/**
 * Abre (o reutiliza) la conexión a IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db         = event.target.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // ── flashcardProgress ─────────────────────────────────────
        const fpStore = db.createObjectStore(STORE_FLASHCARD_PROGRESS, { keyPath: 'id' });
        fpStore.createIndex('by-certification',        'certificationId',                   { unique: false });
        fpStore.createIndex('by-certification-module', ['certificationId', 'moduleId'],      { unique: false });
        fpStore.createIndex('by-next-review',          'nextReview',                         { unique: false });
        fpStore.createIndex('by-confidence',           'confidence',                         { unique: false });

        // ── flashcardReviews ──────────────────────────────────────
        const frStore = db.createObjectStore(STORE_FLASHCARD_REVIEWS, { keyPath: 'id', autoIncrement: true });
        frStore.createIndex('by-flashcard', ['certificationId', 'moduleId', 'flashcardId'], { unique: false });
        frStore.createIndex('by-date',      'reviewedAt',                                   { unique: false });

        // ── quizAttempts ──────────────────────────────────────────
        const qaStore = db.createObjectStore(STORE_QUIZ_ATTEMPTS, { keyPath: 'id', autoIncrement: true });
        qaStore.createIndex('by-certification',        'certificationId',                   { unique: false });
        qaStore.createIndex('by-certification-module', ['certificationId', 'moduleId'],      { unique: false });
        qaStore.createIndex('by-date',                 'attemptedAt',                        { unique: false });

        // ── examAttempts ──────────────────────────────────────────
        const eaStore = db.createObjectStore(STORE_EXAM_ATTEMPTS, { keyPath: 'id', autoIncrement: true });
        eaStore.createIndex('by-certification', 'certificationId', { unique: false });
        eaStore.createIndex('by-exam',          'examId',          { unique: false });
        eaStore.createIndex('by-date',          'attemptedAt',      { unique: false });

        // ── studySettings ─────────────────────────────────────────
        db.createObjectStore(STORE_STUDY_SETTINGS, { keyPath: 'key' });

        // ── studyState ────────────────────────────────────────────
        db.createObjectStore(STORE_STUDY_STATE, { keyPath: 'key' });
      }

      // Migraciones futuras:
      // if (oldVersion < 2) { ... }
    };

    request.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    request.onerror    = (e) => reject(new Error(`IndexedDB error: ${e.target.error}`));
  });
}

/** Resetea la conexión (útil para tests). */
export function resetDB() { _db = null; }

// ── CRUD genérico ─────────────────────────────────────────────────

/**
 * Lee un registro por key.
 * @template T
 * @param {string} storeName
 * @param {string|number} key
 * @returns {Promise<T|undefined>}
 */
export async function get(storeName, key) {
  const db = await openDB();
  return idbRequest(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
}

/**
 * Lee todos los registros de un store.
 * @template T
 * @param {string} storeName
 * @returns {Promise<T[]>}
 */
export async function getAll(storeName) {
  const db = await openDB();
  return idbRequest(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

/**
 * Lee todos los registros que coincidan con un índice y valor.
 * @template T
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey|IDBKeyRange} query
 * @returns {Promise<T[]>}
 */
export async function getAllByIndex(storeName, indexName, query) {
  const db    = await openDB();
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  const index = store.index(indexName);
  return idbRequest(index.getAll(query));
}

/**
 * Lee todos los registros de un índice dentro de un rango de clave.
 * Útil para índices compuestos.
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBKeyRange} range
 * @returns {Promise<any[]>}
 */
export async function getAllByRange(storeName, indexName, range) {
  const db    = await openDB();
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  const index = store.index(indexName);
  return idbRequest(index.getAll(range));
}

/**
 * Inserta o actualiza un registro (put).
 * @param {string} storeName
 * @param {object} record
 * @returns {Promise<IDBValidKey>} clave del registro guardado
 */
export async function put(storeName, record) {
  const db = await openDB();
  return idbRequest(db.transaction(storeName, 'readwrite').objectStore(storeName).put(record));
}

/**
 * Inserta sin sobrescribir (add). Lanza si ya existe.
 * @param {string} storeName
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export async function add(storeName, record) {
  const db = await openDB();
  return idbRequest(db.transaction(storeName, 'readwrite').objectStore(storeName).add(record));
}

/**
 * Elimina un registro por key.
 * @param {string} storeName
 * @param {string|number} key
 */
export async function remove(storeName, key) {
  const db = await openDB();
  return idbRequest(db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key));
}

/**
 * Limpia todos los registros de un store (útil para importación).
 * @param {string} storeName
 */
export async function clearStore(storeName) {
  const db = await openDB();
  return idbRequest(db.transaction(storeName, 'readwrite').objectStore(storeName).clear());
}

/**
 * Ejecuta múltiples puts en una única transacción atómica.
 * Si falla cualquiera, se hace rollback completo.
 *
 * @param {Array<{ storeName: string, records: object[] }>} operations
 * @returns {Promise<void>}
 */
export async function putBatch(operations) {
  const db         = await openDB();
  const storeNames = [...new Set(operations.map(op => op.storeName))];
  const tx         = db.transaction(storeNames, 'readwrite');

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(new Error(`Batch transaction failed: ${tx.error}`));
    tx.onabort    = () => reject(new Error('Batch transaction aborted'));

    for (const { storeName, records } of operations) {
      const store = tx.objectStore(storeName);
      for (const record of records) {
        store.put(record);
      }
    }
  });
}

/**
 * Importación transaccional completa: limpia y repuebla múltiples stores
 * en una sola transacción. Si falla, nada se escribe.
 *
 * @param {Array<{ storeName: string, records: object[] }>} storeData
 * @returns {Promise<void>}
 */
export async function importTransactional(storeData) {
  const db         = await openDB();
  const storeNames = storeData.map(s => s.storeName);
  const tx         = db.transaction(storeNames, 'readwrite');

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(new Error(`Import transaction failed: ${tx.error}`));
    tx.onabort    = () => reject(new Error('Import transaction aborted'));

    for (const { storeName, records } of storeData) {
      const store = tx.objectStore(storeName);
      store.clear();
      for (const record of records) {
        store.put(record);
      }
    }
  });
}

// ── Helper interno ─────────────────────────────────────────────────
function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror   = (e) => reject(e.target.error);
  });
}

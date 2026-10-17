/**
 * config.js
 * Constantes globales de la aplicación.
 * No importar otros módulos aquí para evitar dependencias circulares.
 */

export const APP_VERSION = '1.0.0';

// Se incrementa al cambiar la estructura de caches del Service Worker
export const CACHE_VERSION = `v${APP_VERSION}`;
export const CACHE_APP_SHELL = `app-shell-${CACHE_VERSION}`;
export const CACHE_CONTENT   = `content-${CACHE_VERSION}`;

// IndexedDB
export const DB_NAME    = 'study-app-db';
export const DB_VERSION = 1;

// Stores de IndexedDB
export const STORE_FLASHCARD_PROGRESS = 'flashcardProgress';
export const STORE_QUIZ_ATTEMPTS      = 'quizAttempts';
export const STORE_EXAM_ATTEMPTS      = 'examAttempts';
export const STORE_STUDY_SETTINGS     = 'studySettings';

// Paths de contenido (relativos a la raíz del servidor)
export const CONTENT_BASE_PATH = './content';
export const CATALOG_PATH      = `${CONTENT_BASE_PATH}/catalog.json`;

// localStorage keys (solo preferencias visuales)
export const LS_THEME = 'theme';

// Schemas soportados
export const SUPPORTED_SCHEMA_VERSIONS = ['1.0'];

// Límites del algoritmo de repetición espaciada
export const SPACED_REPETITION_MAX_DAYS = 60;

// Valores por defecto de configuración de estudio
export const DEFAULT_DAILY_GOAL   = 30;
export const DEFAULT_SESSION_SIZE = 10;

// Export/import
export const EXPORT_VERSION = '1';

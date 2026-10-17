/**
 * study-service.js
 * Motor de sesión de estudio.
 *
 * Responsabilidades:
 *   - buildStudySession(): construir lista de flashcards con priorización
 *   - updateStudyState(): guardar la última actividad del usuario
 *   - getStudyState(): leer la última actividad para "Continuar estudiando"
 *   - getStudySettings() / saveStudySetting()
 *
 * Prioridad de selección (SPEC §10):
 *   1. Tarjetas vencidas (due)
 *   2. Tarjetas nuevas (reviewCount === 0)
 *   3. Repaso adicional (opcional, relleno)
 *
 * La learningQueue (reaprendizaje intra-sesión) se gestiona en flashcard.js
 * ya que es estado volátil de la sesión, no persistido.
 */

import { get, put, getAllByIndex, getAllByRange } from './storage-service.js';
import { STORE_FLASHCARD_REVIEWS, STORE_STUDY_STATE } from './storage-service.js';
import {
  STORE_FLASHCARD_PROGRESS,
  STORE_STUDY_SETTINGS,
  DEFAULT_DAILY_GOAL,
  DEFAULT_SESSION_SIZE,
} from '../config.js';
import { getDueFlashcards, getModuleProgressRecords } from './progress-service.js';
import { isDue } from '../utils/dates.js';

// ── Sesión de estudio ─────────────────────────────────────────────

/**
 * Construye la lista de flashcards para una sesión.
 *
 * @param {string}   certId
 * @param {string}   moduleId
 * @param {object[]} allFlashcards  - Array de Flashcard desde el módulo JSON
 * @param {object}   [opts]
 * @param {string}   [opts.mode]    - "mixed" | "due-only" | "new-only"
 * @param {number}   [opts.size]    - Máx tarjetas en la sesión
 * @returns {Promise<Flashcard[]>}
 */
export async function buildStudySession(certId, moduleId, allFlashcards, opts = {}) {
  const sessionSize = opts.size ?? await getSessionSize();
  const mode        = opts.mode ?? 'mixed';

  // Obtener registros de progreso del módulo
  const progressRecords = await getModuleProgressRecords(certId, moduleId);
  const progressMap     = new Map(progressRecords.map(r => [r.flashcardId, r]));

  // Clasificar tarjetas
  const due    = [];
  const newCards = [];
  const review = []; // estudiadas no vencidas (relleno)

  for (const card of allFlashcards) {
    const rec = progressMap.get(card.id);
    if (!rec || rec.reviewCount === 0) {
      newCards.push(card);
    } else if (rec.status !== 'suspended' && isDue(rec.nextReview)) {
      due.push(card);
    } else {
      review.push(card);
    }
  }

  // Construir sesión según modo
  let selected = [];
  if (mode === 'due-only') {
    selected = due.slice(0, sessionSize);
  } else if (mode === 'new-only') {
    selected = newCards.slice(0, sessionSize);
  } else {
    // mixed: due primero, luego nuevas, luego repaso
    selected = [
      ...due.slice(0, sessionSize),
      ...newCards.slice(0, Math.max(0, sessionSize - due.length)),
      ...review.slice(0, Math.max(0, sessionSize - due.length - newCards.length)),
    ].slice(0, sessionSize);
  }

  return selected;
}

// ── Study State ("Continuar estudiando") ─────────────────────────

/**
 * Guarda la última actividad del usuario.
 * Se llama cuando el usuario navega a una vista de estudio.
 *
 * @param {'flashcards'|'quiz'|'exam'} type
 * @param {string} certificationId
 * @param {string} route   - Hash route completa, ej: "#/certification/aws-saa/module/iam/flashcards"
 * @param {object} [extra] - { moduleId?, examId? }
 */
export async function updateStudyState(type, certificationId, route, extra = {}) {
  try {
    await put(STORE_STUDY_STATE, {
      key: 'lastActivity',
      value: {
        type,
        certificationId,
        moduleId:  extra.moduleId  ?? null,
        examId:    extra.examId    ?? null,
        route,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    // No crítico: si falla, el usuario simplemente no puede "continuar"
    console.warn('[StudyService] No se pudo guardar studyState:', err);
  }
}

/**
 * Lee la última actividad del usuario.
 * @returns {Promise<StudyState|null>}
 */
export async function getStudyState() {
  try {
    const record = await get(STORE_STUDY_STATE, 'lastActivity');
    return record?.value ?? null;
  } catch {
    return null;
  }
}

// ── Configuración de estudio ──────────────────────────────────────

/**
 * Lee una configuración de estudio por clave.
 * @param {string} key
 * @param {*}      defaultValue
 */
export async function getStudySetting(key, defaultValue = null) {
  try {
    const record = await get(STORE_STUDY_SETTINGS, key);
    return record?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Guarda una configuración de estudio.
 * @param {string} key
 * @param {*}      value
 */
export async function saveStudySetting(key, value) {
  await put(STORE_STUDY_SETTINGS, { key, value });
}

/**
 * Inicializa la configuración por defecto si no existe.
 */
export async function initDefaultSettings() {
  const defaults = [
    { key: 'dailyGoal',   value: DEFAULT_DAILY_GOAL },
    { key: 'sessionSize', value: DEFAULT_SESSION_SIZE },
    { key: 'appVersion',  value: '1.0.0' },
    { key: 'lastBackup',  value: null },
  ];
  for (const { key, value } of defaults) {
    const existing = await get(STORE_STUDY_SETTINGS, key);
    if (existing == null) await put(STORE_STUDY_SETTINGS, { key, value });
  }
}

/**
 * Lee el sessionSize configurado.
 * @returns {Promise<number>}
 */
export async function getSessionSize() {
  return getStudySetting('sessionSize', DEFAULT_SESSION_SIZE);
}

/**
 * Lee el dailyGoal configurado.
 * @returns {Promise<number>}
 */
export async function getDailyGoal() {
  return getStudySetting('dailyGoal', DEFAULT_DAILY_GOAL);
}

/**
 * Cuenta cuántas tarjetas ha evaluado el usuario hoy en total.
 * Usa flashcardReviews filtrado por fecha.
 * @param {string} certId
 * @returns {Promise<number>}
 */
export async function getReviewedTodayCount(certId) {
  try {
    const allReviews = await getAllByIndex(STORE_FLASHCARD_REVIEWS, 'by-date', null);
    const today      = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return allReviews.filter(r =>
      r.certificationId === certId &&
      r.reviewedAt.startsWith(today)
    ).length;
  } catch {
    return 0;
  }
}

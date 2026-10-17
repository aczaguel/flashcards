/**
 * progress-service.js
 * Lógica de negocio de progreso del estudiante.
 *
 * Responsabilidades:
 *   - Guardar evaluaciones de flashcards (flashcardProgress + flashcardReviews)
 *   - Calcular progress, mastery y ModuleStatus por módulo/certificación
 *   - Obtener tarjetas vencidas (due)
 *
 * TODO Fase 11: completar getCertificationProgress con fórmulas reales.
 */

import {
  get, put, add, getAllByIndex, getAllByRange,
  STORE_FLASHCARD_REVIEWS, STORE_STUDY_STATE,
} from './storage-service.js';
import {
  STORE_FLASHCARD_PROGRESS,
  STORE_QUIZ_ATTEMPTS,
  STORE_EXAM_ATTEMPTS,
} from '../config.js';
import { calculateNextReview, updateStreak } from '../utils/spaced-repetition.js';
import { nowISO, isDue }                     from '../utils/dates.js';
import { makeProgressKey }                   from '../utils/helpers.js';

// ── Guardar evaluación ─────────────────────────────────────────────

/**
 * Guarda la evaluación de una flashcard.
 * Actualiza flashcardProgress y agrega un registro en flashcardReviews.
 *
 * @param {string} certId
 * @param {string} moduleId
 * @param {string} flashcardId
 * @param {string} confidence  "UNKNOWN" | "HARD" | "GOOD" | "EASY"
 */
export async function saveFlashcardEvaluation(certId, moduleId, flashcardId, confidence) {
  const id  = makeProgressKey(certId, moduleId, flashcardId);
  const now = nowISO();

  // Cargar progreso existente o crear nuevo
  const existing = await get(STORE_FLASHCARD_PROGRESS, id);
  const prevStreak   = existing?.streak       ?? 0;
  const prevInterval = existing?.intervalDays ?? 1;
  const reviewCount  = (existing?.reviewCount ?? 0) + 1;

  const newStreak    = updateStreak(prevStreak, confidence);
  const { intervalDays, nextReview } = calculateNextReview(confidence, prevInterval);

  const updated = {
    id,
    certificationId: certId,
    moduleId,
    flashcardId,
    confidence,
    reviewCount,
    streak:       newStreak,
    intervalDays,
    lastReviewed: now,
    nextReview,
    status:       existing?.status ?? 'active',
    createdAt:    existing?.createdAt ?? now,
    updatedAt:    now,
  };

  // Historial de revisión
  const review = {
    certificationId:      certId,
    moduleId,
    flashcardId,
    reviewedAt:           now,
    rating:               confidence,
    previousStreak:       prevStreak,
    newStreak,
    previousIntervalDays: prevInterval,
    newIntervalDays:      intervalDays,
  };

  await Promise.all([
    put(STORE_FLASHCARD_PROGRESS, updated),
    add(STORE_FLASHCARD_REVIEWS,  review),
  ]);

  return updated;
}

// ── Leer progreso ─────────────────────────────────────────────────

/**
 * Obtiene el progreso actual de una flashcard.
 * @returns {Promise<FlashcardProgress|null>}
 */
export async function getFlashcardProgress(certId, moduleId, flashcardId) {
  return get(STORE_FLASHCARD_PROGRESS, makeProgressKey(certId, moduleId, flashcardId));
}

/**
 * Obtiene todo el progreso de un módulo.
 * Usa el índice compuesto [certificationId, moduleId].
 * @returns {Promise<FlashcardProgress[]>}
 */
export async function getModuleProgressRecords(certId, moduleId) {
  const range = IDBKeyRange.only([certId, moduleId]);
  return getAllByRange(STORE_FLASHCARD_PROGRESS, 'by-certification-module', range);
}

/**
 * Obtiene tarjetas vencidas de un módulo (nextReview <= now).
 * @returns {Promise<FlashcardProgress[]>}
 */
export async function getDueFlashcards(certId, moduleId) {
  const records = await getModuleProgressRecords(certId, moduleId);
  const now     = new Date();
  return records.filter(r => r.status === 'active' && isDue(r.nextReview));
}

/**
 * Obtiene progreso calculado de un módulo para la UI.
 * Fase 5-10: versión básica.
 * Fase 11: se expande con fórmulas completas.
 */
export async function getModuleProgress(certId, moduleId, totalFlashcards = 0, quizPassingScore = 80) {
  const records  = await getModuleProgressRecords(certId, moduleId);
  const due      = records.filter(r => r.status === 'active' && isDue(r.nextReview));
  const studied  = records.filter(r => r.reviewCount > 0);
  const mastered = records.filter(r => r.confidence === 'EASY' && r.streak >= 3);

  const total    = totalFlashcards || records.length || 1;
  const progress = Math.round((studied.length / total) * 100);

  // Último quiz del módulo
  const quizAttempts = await getAllByRange(STORE_QUIZ_ATTEMPTS, 'by-certification-module', IDBKeyRange.only([certId, moduleId]));
  const lastQuiz     = quizAttempts.length ? quizAttempts.at(-1) : null;
  const avgQuizScore = quizAttempts.length
    ? quizAttempts.reduce((s, a) => s + a.score, 0) / quizAttempts.length
    : null;

  const mastery = computeMastery(mastered.length, total, avgQuizScore, studied);

  const status = deriveStatus(progress, due.length, lastQuiz?.score ?? null, quizPassingScore, mastery);

  return {
    moduleId,
    totalFlashcards:   total,
    studiedFlashcards: studied.length,
    masteredFlashcards: mastered.length,
    dueToday:          due.length,
    progress,
    mastery,
    lastQuizScore:     lastQuiz?.score ?? null,
    status,
  };
}

/**
 * Obtiene progreso calculado de toda una certificación.
 * Fase 11: incluye desglose completo por módulo.
 *
 * Requiere el manifest para saber cuántas flashcards tiene cada módulo
 * y su passingScore. Si no se pasa, trabaja solo con IndexedDB.
 *
 * @param {string}  certId
 * @param {object}  [manifest]  - CertificationManifest (opcional, mejora precisión)
 * @param {object}  [moduleMap] - { moduleId: StudyModule } (opcional)
 */
export async function getCertificationProgress(certId, manifest = null, moduleMap = null) {
  // Obtener todos los records de la cert
  const allRecords = await getAllByIndex(STORE_FLASHCARD_PROGRESS, 'by-certification', certId);
  const due        = allRecords.filter(r => r.status === 'active' && isDue(r.nextReview));
  const studied    = allRecords.filter(r => r.reviewCount > 0);
  const mastered   = allRecords.filter(r => r.confidence === 'EASY' && r.streak >= 3);
  const total      = allRecords.length || 1;

  const progress = Math.round((studied.length / total) * 100);

  const allQuizAttempts = await getAllByIndex(STORE_QUIZ_ATTEMPTS, 'by-certification', certId);
  const avgQuizScore    = allQuizAttempts.length
    ? allQuizAttempts.reduce((s, a) => s + a.score, 0) / allQuizAttempts.length
    : null;
  const lastQuizAttempt = allQuizAttempts.at(-1) ?? null;

  const allExamAttempts = await getAllByIndex(STORE_EXAM_ATTEMPTS, 'by-certification', certId);
  const bestExamScore   = allExamAttempts.length ? Math.max(...allExamAttempts.map(a => a.score)) : null;
  const lastExamAttempt = allExamAttempts.at(-1) ?? null;

  const avgStreak = studied.length
    ? Math.round(studied.reduce((s, r) => s + r.streak, 0) / studied.length)
    : 0;

  const mastery = computeMastery(mastered.length, total, avgQuizScore, studied);
  const status  = deriveStatus(progress, due.length, lastQuizAttempt?.score ?? null, 80, mastery);

  // ── Progreso por módulo ──────────────────────────────────────────
  const moduleEntries = manifest?.modules ?? [];
  const modules = await Promise.all(
    moduleEntries.map(async (entry) => {
      const modData       = moduleMap?.[entry.id];
      const totalInModule = modData?.flashcards?.length ?? 0;
      const passingScore  = modData?.quiz?.passingScore ?? 80;
      return getModuleProgress(certId, entry.id, totalInModule, passingScore)
        .then(mp => ({ ...mp, name: entry.name }))
        .catch(() => ({
          moduleId: entry.id, name: entry.name,
          totalFlashcards: 0, studiedFlashcards: 0, masteredFlashcards: 0,
          dueToday: 0, progress: 0, mastery: 0, lastQuizScore: null,
          status: 'NOT_STARTED',
        }));
    })
  );

  return {
    certificationId:    certId,
    totalFlashcards:    total,
    studiedFlashcards:  studied.length,
    masteredFlashcards: mastered.length,
    dueToday:           due.length,
    avgStreak,
    progress,
    mastery,
    avgQuizScore,
    lastQuizScore:  lastQuizAttempt?.score       ?? null,
    lastQuizDate:   lastQuizAttempt?.attemptedAt ?? null,
    bestExamScore,
    lastExamScore:  lastExamAttempt?.score       ?? null,
    lastExamDate:   lastExamAttempt?.attemptedAt ?? null,
    status,
    modules,
  };
}

// ── Helpers internos ───────────────────────────────────────────────

/**
 * Calcula mastery según la fórmula del SPEC §7.
 */
function computeMastery(masteredCount, total, avgQuizScore, studiedRecords) {
  const flashPart  = total > 0 ? (masteredCount / total) * 0.5 * 100 : 0;
  const quizPart   = (avgQuizScore ?? 0) * 0.3;
  const avgStreak  = studiedRecords.length
    ? studiedRecords.reduce((s, r) => s + r.streak, 0) / studiedRecords.length
    : 0;
  const streakPart = Math.min(avgStreak / 10, 1.0) * 0.2 * 100;
  return Math.min(100, Math.round(flashPart + quizPart + streakPart));
}

/**
 * Deriva ModuleStatus con la precedencia del SPEC §7.
 *
 * 1. MASTERED         → mastery >= 90
 * 2. REVIEW_REQUIRED  → dueToday > 0 && progress > 0
 * 3. COMPLETED        → progress === 100 && lastQuizScore >= passingScore
 * 4. IN_PROGRESS      → progress > 0
 * 5. NOT_STARTED      → default
 */
export function deriveStatus(progress, dueToday, lastQuizScore, passingScore = 80, mastery = 0) {
  if (mastery >= 90)                                                   return 'MASTERED';
  if (dueToday > 0 && progress > 0)                                   return 'REVIEW_REQUIRED';
  if (progress >= 100 && lastQuizScore !== null && lastQuizScore >= passingScore) return 'COMPLETED';
  if (progress > 0)                                                    return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

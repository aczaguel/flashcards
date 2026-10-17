/**
 * spaced-repetition.js
 * Algoritmo de repetición espaciada — Study App v1.2
 *
 * Basado en intervalDays (no en reviewCount), evitando el bug donde
 * una tarjeta difícil vista 20 veces salta a 60 días con una sola EASY.
 *
 * Documentado en SPEC.md §9.
 */

import { addDays } from './dates.js';

export const MAX_INTERVAL = 60; // días

/**
 * Calcula el nuevo intervalDays y la fecha de próxima revisión.
 *
 * @param {string} confidence       - "UNKNOWN" | "HARD" | "GOOD" | "EASY"
 * @param {number} previousInterval - intervalDays actual en FlashcardProgress
 * @returns {{ intervalDays: number, nextReview: string }}  ISO 8601
 */
export function calculateNextReview(confidence, previousInterval = 1) {
  let days;

  switch (confidence) {
    case 'UNKNOWN': days = 1;                                               break;
    case 'HARD':    days = 2;                                               break;
    case 'GOOD':    days = Math.max(3, previousInterval * 2);              break;
    case 'EASY':    days = Math.max(7, Math.round(previousInterval * 2.5)); break;
    default:        days = 1;
  }

  days = Math.min(days, MAX_INTERVAL);

  return {
    intervalDays: days,
    nextReview:   addDays(new Date().toISOString(), days),
  };
}

/**
 * Actualiza el streak según la evaluación.
 *
 * UNKNOWN → 0  (reset completo)
 * HARD    → max(0, streak - 1)  (penalización parcial)
 * GOOD    → streak + 1
 * EASY    → streak + 1
 *
 * @param {number} currentStreak
 * @param {string} confidence
 * @returns {number}
 */
export function updateStreak(currentStreak, confidence) {
  switch (confidence) {
    case 'UNKNOWN': return 0;
    case 'HARD':    return Math.max(0, currentStreak - 1);
    case 'GOOD':
    case 'EASY':    return currentStreak + 1;
    default:        return currentStreak;
  }
}

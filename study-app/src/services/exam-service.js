/**
 * exam-service.js
 * Motor de scoring para quizzes y exámenes finales.
 *
 * Responsabilidades:
 *   - scoreQuiz()   — puntúa un intento de quiz y lo guarda en IndexedDB
 *   - scoreExam()   — puntúa un intento de examen y lo guarda en IndexedDB
 *   - getQuizHistory()  — historial de intentos de un módulo
 *   - getExamHistory()  — historial de intentos de un examen
 */

import { add, getAllByIndex, getAllByRange } from './storage-service.js';
import { STORE_QUIZ_ATTEMPTS, STORE_EXAM_ATTEMPTS } from '../config.js';
import { nowISO } from '../utils/dates.js';

// ── Scoring ───────────────────────────────────────────────────────

/**
 * Evalúa si una respuesta a una pregunta es correcta.
 * Soporta single-choice, multiple-choice y true-false.
 *
 * @param {Question}  question
 * @param {string[]}  selectedAnswers  - IDs de opciones seleccionadas
 * @returns {boolean}
 */
export function isAnswerCorrect(question, selectedAnswers) {
  const correct  = [...question.correctAnswers].sort();
  const selected = [...selectedAnswers].sort();
  if (correct.length !== selected.length) return false;
  return correct.every((ans, i) => ans === selected[i]);
}

/**
 * Calcula el score (0-100) de un conjunto de respuestas.
 *
 * @param {Question[]} questions
 * @param {Map<string, string[]>} answersMap  - questionId → selectedAnswers[]
 * @returns {{ score: number, correctCount: number, results: QuestionResult[] }}
 */
export function calculateScore(questions, answersMap) {
  let correctCount = 0;
  const results = questions.map(q => {
    const selected = answersMap.get(q.id) ?? [];
    const correct  = isAnswerCorrect(q, selected);
    if (correct) correctCount++;
    return {
      questionId:      q.id,
      selectedAnswers: selected,
      correctAnswers:  q.correctAnswers,
      correct,
      explanation:     q.explanation ?? null,
      tags:            q.tags        ?? [],
      moduleId:        q.moduleId    ?? null,
    };
  });
  const score = questions.length > 0
    ? Math.round((correctCount / questions.length) * 100)
    : 0;
  return { score, correctCount, results };
}

/**
 * Guarda un intento de quiz en IndexedDB y retorna el resultado.
 *
 * @param {string}    certId
 * @param {string}    moduleId
 * @param {Question[]} questions
 * @param {Map<string, string[]>} answersMap
 * @param {number}    passingScore
 * @param {number}    durationSeconds
 * @returns {Promise<QuizAttemptResult>}
 */
export async function scoreQuiz(certId, moduleId, questions, answersMap, passingScore, durationSeconds = 0) {
  const { score, correctCount, results } = calculateScore(questions, answersMap);
  const passed = score >= passingScore;

  const attempt = {
    certificationId: certId,
    moduleId,
    attemptedAt:     nowISO(),
    durationSeconds,
    totalQuestions:  questions.length,
    correctAnswers:  correctCount,
    score,
    passed,
    answers: results.map(r => ({
      questionId:      r.questionId,
      selectedAnswers: r.selectedAnswers,
      correct:         r.correct,
    })),
  };

  const id = await add(STORE_QUIZ_ATTEMPTS, attempt);
  return { ...attempt, id, results, passingScore };
}

/**
 * Guarda un intento de examen en IndexedDB y retorna el resultado.
 *
 * @param {string}    certId
 * @param {string}    examId
 * @param {Question[]} questions
 * @param {Map<string, string[]>} answersMap
 * @param {number}    passingScore
 * @param {number}    durationSeconds
 * @returns {Promise<ExamAttemptResult>}
 */
export async function scoreExam(certId, examId, questions, answersMap, passingScore, durationSeconds = 0) {
  const { score, correctCount, results } = calculateScore(questions, answersMap);
  const passed = score >= passingScore;

  const attempt = {
    certificationId: certId,
    examId,
    attemptedAt:     nowISO(),
    durationSeconds,
    totalQuestions:  questions.length,
    correctAnswers:  correctCount,
    score,
    passed,
    answers: results.map(r => ({
      questionId:      r.questionId,
      selectedAnswers: r.selectedAnswers,
      correct:         r.correct,
      moduleId:        r.moduleId,
    })),
  };

  const id = await add(STORE_EXAM_ATTEMPTS, attempt);
  return { ...attempt, id, results, passingScore };
}

// ── Historial ─────────────────────────────────────────────────────

/**
 * Obtiene el historial de intentos de quiz de un módulo.
 * @returns {Promise<QuizAttempt[]>}
 */
export async function getQuizHistory(certId, moduleId) {
  try {
    const range = IDBKeyRange.only([certId, moduleId]);
    const attempts = await getAllByRange(STORE_QUIZ_ATTEMPTS, 'by-certification-module', range);
    return [...attempts].sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
  } catch {
    return [];
  }
}

/**
 * Obtiene el historial de intentos de un examen final.
 * @returns {Promise<ExamAttempt[]>}
 */
export async function getExamHistory(certId, examId) {
  try {
    const attempts = await getAllByIndex(STORE_EXAM_ATTEMPTS, 'by-exam', examId);
    return attempts
      .filter(a => a.certificationId === certId)
      .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
  } catch {
    return [];
  }
}

/**
 * Agrupa errores por tag para mostrar "áreas a reforzar".
 * @param {QuestionResult[]} results
 * @returns {Array<{ tag: string, count: number }>} ordenado por count desc
 */
export function getWeakAreas(results) {
  const tagCounts = {};
  for (const r of results) {
    if (!r.correct) {
      for (const tag of (r.tags ?? [])) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
  }
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Agrupa errores por moduleId (para exámenes).
 * @param {QuestionResult[]} results
 * @returns {Array<{ moduleId: string, count: number }>}
 */
export function getWeakModules(results) {
  const moduleCounts = {};
  for (const r of results) {
    if (!r.correct && r.moduleId) {
      moduleCounts[r.moduleId] = (moduleCounts[r.moduleId] ?? 0) + 1;
    }
  }
  return Object.entries(moduleCounts)
    .map(([moduleId, count]) => ({ moduleId, count }))
    .sort((a, b) => b.count - a.count);
}

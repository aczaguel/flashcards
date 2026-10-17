/**
 * quiz.js
 * Motor de quiz por módulo.
 * Soporta: single-choice, multiple-choice, true-false.
 * Guarda intentos en IndexedDB. Muestra resultado con áreas a reforzar.
 */

import { getModule, isContentError }         from '../services/content-service.js';
import { scoreQuiz, getQuizHistory, getWeakAreas } from '../services/exam-service.js';
import { updateStudyState }                  from '../services/study-service.js';
import { router }                            from '../router.js';
import { escapeHtml }                        from '../utils/helpers.js';
import { formatDate }                        from '../utils/dates.js';

// ── Estado de sesión ──────────────────────────────────────────────
let quizState = null; // { certId, moduleId, questions, answersMap, startTime, passingScore }

// ── Entrada pública ───────────────────────────────────────────────
export function renderQuiz(certificationId, moduleId) {
  const app = document.getElementById('app');
  if (!app) return null;
  app.innerHTML = buildShell(certificationId, moduleId);
  startQuiz(certificationId, moduleId);
  return null;
}

function buildShell(certId, moduleId) {
  return `
    <header class="app-header">
      <button class="btn btn--ghost btn--sm" id="quiz-back-btn" aria-label="Volver al módulo">← Volver</button>
      <span class="text-secondary text-sm" id="quiz-progress-label" aria-live="polite"></span>
    </header>
    <main class="page" id="quiz-main">
      <div class="loading-spinner" aria-label="Cargando quiz…"></div>
    </main>`.trim();
}

async function startQuiz(certId, moduleId) {
  document.getElementById('quiz-back-btn')?.addEventListener('click', () => {
    quizState = null;
    router.navigate(`/certification/${certId}/module/${moduleId}`);
  });

  const moduleData = await getModule(certId, moduleId);
  if (isContentError(moduleData)) {
    document.getElementById('quiz-main').innerHTML =
      `<div class="error-message" role="alert"><strong>Error</strong>${escapeHtml(moduleData.message)}</div>`;
    return;
  }

  if (!moduleData.quiz?.questions?.length) {
    document.getElementById('quiz-main').innerHTML =
      `<div class="card"><p class="text-secondary">Este módulo no tiene quiz disponible.</p></div>`;
    return;
  }

  quizState = {
    certId,
    moduleId,
    questions:    moduleData.quiz.questions,
    passingScore: moduleData.quiz.passingScore ?? 80,
    answersMap:   new Map(),   // questionId → string[]
    currentIndex: 0,
    startTime:    Date.now(),
    submitted:    false,
  };

  await updateStudyState('quiz', certId,
    `#/certification/${certId}/module/${moduleId}/quiz`, { moduleId });

  renderQuestion();
}

// ── Renderizar pregunta ───────────────────────────────────────────
function renderQuestion() {
  const main = document.getElementById('quiz-main');
  if (!main || !quizState) return;

  const { questions, currentIndex } = quizState;
  const total   = questions.length;
  const q       = questions[currentIndex];
  const current = currentIndex + 1;

  // Barra de progreso de navegación
  const label = document.getElementById('quiz-progress-label');
  if (label) label.textContent = `Pregunta ${current} / ${total}`;

  const existing = quizState.answersMap.get(q.id) ?? [];

  main.innerHTML = `
    <div class="quiz-session">
      <!-- Progreso -->
      <div class="quiz-progress-bar" role="progressbar"
           aria-valuenow="${current}" aria-valuemin="1" aria-valuemax="${total}"
           aria-label="Pregunta ${current} de ${total}">
        <div class="quiz-progress-bar__fill" style="width:${Math.round((current/total)*100)}%"></div>
      </div>

      <!-- Pregunta -->
      <div class="quiz-question card" id="quiz-q-card">
        <div class="quiz-question__meta">
          <span class="badge badge--in-progress">Pregunta ${current}</span>
          <span class="badge badge--not-started">${escapeHtml(typeLabel(q.type))}</span>
        </div>
        <p class="quiz-question__text" id="quiz-q-text">${escapeHtml(q.question)}</p>

        <div class="quiz-options" id="quiz-options" role="group"
             aria-labelledby="quiz-q-text">
          ${q.options.map(opt => buildOptionHTML(q, opt, existing)).join('')}
        </div>

        ${q.type === 'multiple-choice'
          ? `<p class="text-muted text-xs" style="margin-top:var(--spacing-xs)">
               Selecciona todas las correctas.</p>`
          : ''}
      </div>

      <!-- Navegación -->
      <div class="quiz-nav">
        ${currentIndex > 0
          ? `<button class="btn btn--secondary" id="quiz-prev-btn">← Anterior</button>`
          : `<span></span>`}
        ${currentIndex < questions.length - 1
          ? `<button class="btn btn--primary" id="quiz-next-btn">Siguiente →</button>`
          : `<button class="btn btn--primary" id="quiz-submit-btn">Enviar respuestas ✓</button>`}
      </div>
    </div>`.trim();

  // Opciones — click
  main.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => toggleOption(q, btn.dataset.optionId));
  });

  main.getElementById?.('quiz-prev-btn') ??
    document.getElementById('quiz-prev-btn')
    ?.addEventListener('click', () => { quizState.currentIndex--; renderQuestion(); });

  document.getElementById('quiz-next-btn')
    ?.addEventListener('click', () => { quizState.currentIndex++; renderQuestion(); });

  document.getElementById('quiz-submit-btn')
    ?.addEventListener('click', () => submitQuiz());
}

function buildOptionHTML(question, opt, selectedAnswers) {
  const isSelected = selectedAnswers.includes(opt.id);
  const inputType  = question.type === 'multiple-choice' ? 'checkbox' : 'radio';
  return `
    <button class="quiz-option ${isSelected ? 'quiz-option--selected' : ''}"
            data-option-id="${escapeHtml(opt.id)}"
            role="${inputType}"
            aria-checked="${isSelected}"
            aria-label="${escapeHtml(opt.text)}">
      <span class="quiz-option__indicator" aria-hidden="true">
        ${inputType === 'checkbox'
          ? (isSelected ? '☑' : '☐')
          : (isSelected ? '◉' : '○')}
      </span>
      <span class="quiz-option__text">${escapeHtml(opt.text)}</span>
    </button>`.trim();
}

function toggleOption(question, optionId) {
  if (!quizState) return;
  const current = quizState.answersMap.get(question.id) ?? [];

  let next;
  if (question.type === 'multiple-choice') {
    // Toggle
    next = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
  } else {
    // single-choice / true-false: solo una opción
    next = [optionId];
  }

  quizState.answersMap.set(question.id, next);
  renderQuestion(); // Re-renderizar con nueva selección
}

// ── Submit ────────────────────────────────────────────────────────
async function submitQuiz() {
  if (!quizState || quizState.submitted) return;
  quizState.submitted = true;

  const durationSeconds = Math.round((Date.now() - quizState.startTime) / 1000);

  const result = await scoreQuiz(
    quizState.certId,
    quizState.moduleId,
    quizState.questions,
    quizState.answersMap,
    quizState.passingScore,
    durationSeconds
  );

  renderResult(result);
}

// ── Resultado ─────────────────────────────────────────────────────
function renderResult(result) {
  const main = document.getElementById('quiz-main');
  if (!main) return;

  const label = document.getElementById('quiz-progress-label');
  if (label) label.textContent = 'Resultado';

  const { certId, moduleId } = quizState;
  const weakAreas = getWeakAreas(result.results);

  const scoreColor = result.passed ? 'var(--color-success)' : 'var(--color-danger)';

  main.innerHTML = `
    <div class="quiz-result">
      <!-- Score -->
      <div class="quiz-result__score-card card">
        <div class="quiz-result__score" style="color:${scoreColor}" aria-label="Puntuación ${result.score}%">
          ${result.score}%
        </div>
        <div class="quiz-result__fraction">
          ${result.correctAnswers} / ${result.totalQuestions} correctas
        </div>
        <div class="quiz-result__verdict ${result.passed ? 'quiz-result__verdict--pass' : 'quiz-result__verdict--fail'}">
          ${result.passed ? '✅ APROBADO' : '❌ REPROBADO'}
        </div>
        <div class="text-muted text-sm">Mínimo requerido: ${result.passingScore}%</div>
      </div>

      <!-- Áreas a reforzar -->
      ${weakAreas.length ? `
        <div class="quiz-result__weak card">
          <h2 class="quiz-result__section-title">📌 Áreas a reforzar</h2>
          <ul class="quiz-result__weak-list">
            ${weakAreas.map(w => `
              <li class="quiz-result__weak-item">
                <span class="badge badge--review-required">${escapeHtml(w.tag)}</span>
                <span class="text-muted text-sm">${w.count} error${w.count > 1 ? 'es' : ''}</span>
              </li>`).join('')}
          </ul>
        </div>` : ''}

      <!-- Detalle de preguntas -->
      <div class="quiz-result__detail card">
        <h2 class="quiz-result__section-title">Detalle de respuestas</h2>
        ${result.results.map((r, i) => buildQuestionDetail(r, quizState.questions[i])).join('')}
      </div>

      <!-- Acciones -->
      <div class="quiz-result__actions">
        <button class="btn btn--secondary btn--full" id="quiz-retry-btn">🔁 Intentar de nuevo</button>
        <a href="#/certification/${escapeHtml(certId)}/module/${escapeHtml(moduleId)}"
           class="btn btn--primary btn--full">← Volver al módulo</a>
      </div>
    </div>`.trim();

  document.getElementById('quiz-retry-btn')?.addEventListener('click', () => {
    quizState = null;
    renderQuiz(certId, moduleId);
  });
}

function buildQuestionDetail(result, question) {
  const icon = result.correct ? '✅' : '❌';
  const correctTexts = question.options
    .filter(o => question.correctAnswers.includes(o.id))
    .map(o => escapeHtml(o.text))
    .join(', ');
  const selectedTexts = question.options
    .filter(o => result.selectedAnswers.includes(o.id))
    .map(o => escapeHtml(o.text))
    .join(', ') || '<em>Sin respuesta</em>';

  return `
    <div class="quiz-question-detail ${result.correct ? 'quiz-question-detail--correct' : 'quiz-question-detail--wrong'}">
      <div class="quiz-question-detail__header">
        <span aria-hidden="true">${icon}</span>
        <p class="quiz-question-detail__text">${escapeHtml(question.question)}</p>
      </div>
      ${!result.correct ? `
        <div class="quiz-question-detail__answers">
          <div class="quiz-question-detail__answer">
            <span class="text-muted text-xs">Tu respuesta:</span>
            <span class="text-sm" style="color:var(--color-danger)">${selectedTexts}</span>
          </div>
          <div class="quiz-question-detail__answer">
            <span class="text-muted text-xs">Respuesta correcta:</span>
            <span class="text-sm" style="color:var(--color-success)">${correctTexts}</span>
          </div>
        </div>` : ''}
      ${result.explanation
        ? `<p class="quiz-question-detail__explanation">${escapeHtml(result.explanation)}</p>`
        : ''}
    </div>`.trim();
}

function typeLabel(type) {
  return { 'single-choice': 'Selección única', 'multiple-choice': 'Selección múltiple', 'true-false': 'Verdadero/Falso' }[type] ?? type;
}

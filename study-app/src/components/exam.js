/**
 * exam.js
 * Motor de examen final multi-módulo.
 * Similar a quiz.js pero con: shuffle, timer opcional, historial de intentos
 * y áreas a reforzar por módulo.
 */

import { getExam, isContentError }                     from '../services/content-service.js';
import { scoreExam, getExamHistory, getWeakModules }   from '../services/exam-service.js';
import { updateStudyState }                             from '../services/study-service.js';
import { router }                                       from '../router.js';
import { escapeHtml, shuffleArray, formatPercent }      from '../utils/helpers.js';
import { formatDate, formatRelativeDate }               from '../utils/dates.js';

// ── Estado ────────────────────────────────────────────────────────
let examState = null;
let timerInterval = null;

export function renderExam(certificationId, examId) {
  const app = document.getElementById('app');
  if (!app) return null;
  app.innerHTML = buildShell();
  startExam(certificationId, examId);
  return { destroy: () => stopTimer() };
}

function buildShell() {
  return `
    <header class="app-header">
      <button class="btn btn--ghost btn--sm" id="exam-back-btn" aria-label="Volver">← Volver</button>
      <span class="text-secondary text-sm" id="exam-meta" aria-live="polite"></span>
    </header>
    <main class="page" id="exam-main">
      <div class="loading-spinner" aria-label="Cargando examen…"></div>
    </main>`.trim();
}

async function startExam(certId, examId) {
  document.getElementById('exam-back-btn')?.addEventListener('click', () => {
    stopTimer();
    examState = null;
    router.navigate(`/certification/${certId}`);
  });

  const examData = await getExam(certId, examId);
  if (isContentError(examData)) {
    document.getElementById('exam-main').innerHTML =
      `<div class="error-message" role="alert"><strong>Error</strong>${escapeHtml(examData.message)}</div>`;
    return;
  }

  // Aplicar shuffle
  let questions = [...examData.questions];
  if (examData.exam.shuffleQuestions !== false) shuffleArray(questions);
  if (examData.exam.shuffleOptions !== false) {
    questions = questions.map(q => ({
      ...q,
      options: shuffleArray([...q.options]),
    }));
  }

  examState = {
    certId,
    examId,
    examMeta:     examData.exam,
    questions,
    answersMap:   new Map(),
    currentIndex: 0,
    startTime:    Date.now(),
    submitted:    false,
    timeLimit:    examData.exam.timeLimit ?? null, // minutos
    secondsLeft:  examData.exam.timeLimit ? examData.exam.timeLimit * 60 : null,
  };

  await updateStudyState('exam', certId,
    `#/certification/${certId}/exam/${examId}`, { examId });

  // Timer
  if (examState.secondsLeft !== null) {
    startTimer();
  }

  renderExamQuestion();
}

// ── Timer ─────────────────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (!examState || examState.submitted) { stopTimer(); return; }
    examState.secondsLeft--;
    updateTimerDisplay();
    if (examState.secondsLeft <= 0) {
      stopTimer();
      submitExam();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerDisplay() {
  const meta = document.getElementById('exam-meta');
  if (!meta || !examState) return;
  const { currentIndex, questions, secondsLeft } = examState;
  const progressText = `${currentIndex + 1} / ${questions.length}`;
  if (secondsLeft !== null) {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const s = (secondsLeft % 60).toString().padStart(2, '0');
    const urgent = secondsLeft <= 60;
    meta.innerHTML = `<span>${progressText}</span>
      <span class="exam-timer ${urgent ? 'exam-timer--urgent' : ''}" aria-live="assertive">⏱ ${m}:${s}</span>`;
  } else {
    meta.textContent = progressText;
  }
}

// ── Renderizar pregunta ───────────────────────────────────────────
function renderExamQuestion() {
  const main = document.getElementById('exam-main');
  if (!main || !examState) return;

  const { questions, currentIndex, answersMap } = examState;
  const total   = questions.length;
  const q       = questions[currentIndex];
  const current = currentIndex + 1;
  const existing = answersMap.get(q.id) ?? [];
  const answered = answersMap.size;

  main.innerHTML = `
    <div class="quiz-session">
      <div class="quiz-progress-bar" role="progressbar"
           aria-valuenow="${current}" aria-valuemin="1" aria-valuemax="${total}">
        <div class="quiz-progress-bar__fill" style="width:${Math.round((current/total)*100)}%"></div>
      </div>

      <div class="card">
        <div class="quiz-question__meta">
          <span class="badge badge--in-progress">Pregunta ${current}</span>
          ${q.moduleId ? `<span class="badge badge--not-started">${escapeHtml(q.moduleId)}</span>` : ''}
          <span class="badge badge--not-started">${escapeHtml(typeLabel(q.type))}</span>
        </div>
        <p class="quiz-question__text" id="exam-q-text">${escapeHtml(q.question)}</p>
        <div class="quiz-options" id="exam-options" role="group" aria-labelledby="exam-q-text">
          ${q.options.map(opt => buildOptionHTML(q, opt, existing)).join('')}
        </div>
        ${q.type === 'multiple-choice'
          ? `<p class="text-muted text-xs" style="margin-top:var(--spacing-xs)">Selecciona todas las correctas.</p>`
          : ''}
      </div>

      <!-- Navegación + contador de respondidas -->
      <div class="quiz-nav">
        ${currentIndex > 0
          ? `<button class="btn btn--secondary" id="exam-prev-btn">← Anterior</button>`
          : `<span></span>`}
        <span class="text-muted text-xs">${answered} / ${total} respondidas</span>
        ${currentIndex < questions.length - 1
          ? `<button class="btn btn--primary" id="exam-next-btn">Siguiente →</button>`
          : `<button class="btn btn--primary" id="exam-submit-btn">Finalizar examen ✓</button>`}
      </div>
    </div>`.trim();

  updateTimerDisplay();

  main.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => toggleExamOption(q, btn.dataset.optionId));
  });
  document.getElementById('exam-prev-btn')
    ?.addEventListener('click', () => { examState.currentIndex--; renderExamQuestion(); });
  document.getElementById('exam-next-btn')
    ?.addEventListener('click', () => { examState.currentIndex++; renderExamQuestion(); });
  document.getElementById('exam-submit-btn')
    ?.addEventListener('click', () => submitExam());
}

function buildOptionHTML(question, opt, selectedAnswers) {
  const isSelected = selectedAnswers.includes(opt.id);
  const inputType  = question.type === 'multiple-choice' ? 'checkbox' : 'radio';
  return `
    <button class="quiz-option ${isSelected ? 'quiz-option--selected' : ''}"
            data-option-id="${escapeHtml(opt.id)}"
            role="${inputType}" aria-checked="${isSelected}"
            aria-label="${escapeHtml(opt.text)}">
      <span class="quiz-option__indicator" aria-hidden="true">
        ${inputType === 'checkbox' ? (isSelected ? '☑' : '☐') : (isSelected ? '◉' : '○')}
      </span>
      <span class="quiz-option__text">${escapeHtml(opt.text)}</span>
    </button>`.trim();
}

function toggleExamOption(question, optionId) {
  if (!examState) return;
  const current = examState.answersMap.get(question.id) ?? [];
  let next;
  if (question.type === 'multiple-choice') {
    next = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
  } else {
    next = [optionId];
  }
  examState.answersMap.set(question.id, next);
  renderExamQuestion();
}

// ── Submit ────────────────────────────────────────────────────────
async function submitExam() {
  if (!examState || examState.submitted) return;
  stopTimer();
  examState.submitted = true;

  const durationSeconds = Math.round((Date.now() - examState.startTime) / 1000);
  const result = await scoreExam(
    examState.certId,
    examState.examId,
    examState.questions,
    examState.answersMap,
    examState.examMeta.passingScore,
    durationSeconds
  );

  const history = await getExamHistory(examState.certId, examState.examId);
  renderExamResult(result, history);
}

// ── Resultado ─────────────────────────────────────────────────────
function renderExamResult(result, history) {
  const main = document.getElementById('exam-main');
  if (!main || !examState) return;

  const meta = document.getElementById('exam-meta');
  if (meta) meta.textContent = 'Resultado';

  const { certId, examId } = examState;
  const weakModules = getWeakModules(result.results);
  const scoreColor  = result.passed ? 'var(--color-success)' : 'var(--color-danger)';
  const bestScore   = history.length ? Math.max(...history.map(a => a.score)) : result.score;

  main.innerHTML = `
    <div class="quiz-result">
      <!-- Score -->
      <div class="quiz-result__score-card card">
        <h1 class="quiz-result__score" style="color:${scoreColor}">${result.score}%</h1>
        <div class="quiz-result__fraction">${result.correctAnswers} / ${result.totalQuestions} correctas</div>
        <div class="quiz-result__verdict ${result.passed ? 'quiz-result__verdict--pass' : 'quiz-result__verdict--fail'}">
          ${result.passed ? '✅ APROBADO' : '❌ REPROBADO'}
        </div>
        <div class="text-muted text-sm">Mínimo requerido: ${result.passingScore}%</div>
      </div>

      <!-- Historial -->
      ${history.length > 1 ? `
        <div class="card">
          <h2 class="quiz-result__section-title">📊 Historial de intentos</h2>
          <div class="exam-history">
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-item__value">${history.length}</div>
                <div class="stat-item__label">Intentos</div>
              </div>
              <div class="stat-item">
                <div class="stat-item__value">${bestScore}%</div>
                <div class="stat-item__label">Mejor score</div>
              </div>
            </div>
            <ul class="exam-history__list">
              ${[...history].reverse().slice(0, 5).map((a, i) => `
                <li class="exam-history__item">
                  <span class="text-muted text-xs">#${history.length - i}</span>
                  <span class="text-sm">${formatRelativeDate(a.attemptedAt)}</span>
                  <span class="badge ${a.passed ? 'badge--completed' : 'badge--review-required'}">${a.score}%</span>
                </li>`).join('')}
            </ul>
          </div>
        </div>` : ''}

      <!-- Áreas a reforzar por módulo -->
      ${weakModules.length ? `
        <div class="card">
          <h2 class="quiz-result__section-title">📌 Áreas a reforzar por módulo</h2>
          <ul class="quiz-result__weak-list">
            ${weakModules.map(w => `
              <li class="quiz-result__weak-item">
                <span class="badge badge--review-required">${escapeHtml(w.moduleId)}</span>
                <span class="text-muted text-sm">${w.count} error${w.count > 1 ? 'es' : ''}</span>
              </li>`).join('')}
          </ul>
        </div>` : ''}

      <!-- Detalle de preguntas -->
      <div class="card quiz-result__detail">
        <h2 class="quiz-result__section-title">Detalle de respuestas</h2>
        ${result.results.map((r, i) => buildQuestionDetail(r, examState.questions[i])).join('')}
      </div>

      <!-- Acciones -->
      <div class="quiz-result__actions">
        <button class="btn btn--secondary btn--full" id="exam-retry-btn">🔁 Intentar de nuevo</button>
        <a href="#/certification/${escapeHtml(certId)}"
           class="btn btn--primary btn--full">← Volver a la certificación</a>
      </div>
    </div>`.trim();

  document.getElementById('exam-retry-btn')?.addEventListener('click', () => {
    const { certId, examId } = examState;
    examState = null;
    renderExam(certId, examId);
  });
}

function buildQuestionDetail(result, question) {
  if (!question) return '';
  const icon         = result.correct ? '✅' : '❌';
  const correctTexts = question.options
    .filter(o => question.correctAnswers.includes(o.id))
    .map(o => escapeHtml(o.text)).join(', ');
  const selectedTexts = question.options
    .filter(o => result.selectedAnswers.includes(o.id))
    .map(o => escapeHtml(o.text)).join(', ') || '<em>Sin respuesta</em>';

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
      ${result.explanation ? `<p class="quiz-question-detail__explanation">${escapeHtml(result.explanation)}</p>` : ''}
    </div>`.trim();
}

function typeLabel(type) {
  return { 'single-choice': 'Única', 'multiple-choice': 'Múltiple', 'true-false': 'V/F' }[type] ?? type;
}

/**
 * flashcard.js
 * Motor de sesión de flashcards.
 *
 * Fase 6: UI completa sin persistencia (evaluaciones se registran en memoria).
 * Fase 7: se conecta con progress-service para persistir en IndexedDB.
 * Fase 8: se conecta con study-service para sesiones con priorización.
 *
 * Teclado:
 *   Space / Enter → revelar respuesta
 *   1             → No sabía (UNKNOWN)
 *   2             → Difícil  (HARD)
 *   3             → Bien     (GOOD)
 *   4             → Fácil    (EASY)
 *   ←             → tarjeta anterior (solo después de revelar)
 */

import { getModule, isContentError } from '../services/content-service.js';
import { router }                    from '../router.js';
import { escapeHtml }                from '../utils/helpers.js';

// Importaciones dinámicas
let saveEvalFn        = null;
let buildSessionFn    = null;
let updateStateFn     = null;

async function tryLoadServices() {
  try {
    const pm = await import('../services/progress-service.js');
    saveEvalFn = pm.saveFlashcardEvaluation;
  } catch { /* sin persistencia aún */ }
  try {
    const sm = await import('../services/study-service.js');
    buildSessionFn = sm.buildStudySession;
    updateStateFn  = sm.updateStudyState;
  } catch { /* sin study-service aún */ }
}

// ── Estado de sesión (en memoria) ────────────────────────────────
let session = null; // { certId, moduleId, cards[], index, revealed, results[] }

// ── Entrada pública ───────────────────────────────────────────────
export function renderFlashcards(certificationId, moduleId) {
  const app = document.getElementById('app');
  if (!app) return null;
  app.innerHTML = buildLoadingShell(certificationId, moduleId);
  startSession(certificationId, moduleId);
  return null;
}

function buildLoadingShell(certId, moduleId) {
  return `
    <header class="app-header">
      <button class="btn btn--ghost btn--sm" id="fc-back-btn" aria-label="Volver al módulo">← Volver</button>
      <span class="app-header__brand" style="font-size:var(--font-size-sm);color:var(--text-secondary)" id="fc-progress-label"></span>
    </header>
    <main class="page" id="fc-main">
      <div class="loading-spinner" aria-label="Cargando flashcards…"></div>
    </main>`.trim();
}

async function startSession(certId, moduleId) {
  await tryLoadServices();

  const moduleData = await getModule(certId, moduleId);
  if (isContentError(moduleData)) {
    document.getElementById('fc-main').innerHTML =
      `<div class="error-message" role="alert"><strong>Error</strong>${escapeHtml(moduleData.message)}</div>`;
    return;
  }

  // Construir lista de tarjetas usando buildStudySession con priorización
  let cards = moduleData.flashcards;
  if (buildSessionFn) {
    try {
      // Leer mode desde query param (?mode=due-only)
      const urlMode = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('mode');
      const opts = urlMode ? { mode: urlMode } : {};
      const session = await buildSessionFn(certId, moduleId, moduleData.flashcards, opts);
      if (session && session.length > 0) cards = session;
    } catch { /* usar todas */ }
  }

  // Guardar studyState
  if (updateStateFn) {
    try {
      await updateStateFn('flashcards', certId,
        `#/certification/${certId}/module/${moduleId}/flashcards`,
        { moduleId });
    } catch { /* no crítico */ }
  }

  session = {
    certId,
    moduleId,
    cards:    [...cards],
    index:    0,
    revealed: false,
    results:  [],            // { cardId, confidence }
    learning: [],            // learningQueue — se usa en Fase 8
  };

  // Botón volver
  document.getElementById('fc-back-btn')?.addEventListener('click', () => {
    cleanup();
    router.navigate(`/certification/${certId}/module/${moduleId}`);
  });

  renderCard();
}

// ── Renderizar tarjeta actual ─────────────────────────────────────
function renderCard() {
  const main = document.getElementById('fc-main');
  if (!main || !session) return;

  // Fin de sesión
  if (session.index >= session.cards.length) {
    renderSummary();
    return;
  }

  const card     = session.cards[session.index];
  const total    = session.cards.length;
  const current  = session.index + 1;
  const pct      = Math.round(((current - 1) / total) * 100);

  // Barra de progreso de sesión
  const label = document.getElementById('fc-progress-label');
  if (label) label.textContent = `${current} / ${total}`;

  main.innerHTML = `
    <div class="fc-session">
      <!-- Barra de sesión -->
      <div class="fc-session-bar" role="progressbar"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progreso sesión ${pct}%">
        <div class="fc-session-bar__fill" style="width:${pct}%"></div>
      </div>

      <!-- Tarjeta -->
      <div class="fc-card-wrap" id="fc-card-wrap">
        <div class="fc-card ${session.revealed ? 'fc-card--revealed' : ''}"
             id="fc-card"
             role="region"
             aria-label="Flashcard ${current} de ${total}">

          <!-- Frente -->
          <div class="fc-card__face fc-card__face--front">
            <div class="fc-card__tags">
              ${card.difficulty ? `<span class="badge badge--${diffBadge(card.difficulty)}">${escapeHtml(card.difficulty)}</span>` : ''}
              ${(card.tags || []).slice(0, 3).map(t => `<span class="badge badge--not-started">${escapeHtml(t)}</span>`).join('')}
            </div>
            <p class="fc-card__question">${escapeHtml(card.question)}</p>
            <button class="btn btn--primary fc-reveal-btn" id="fc-reveal-btn"
                    aria-label="Revelar respuesta (Space)">
              Ver respuesta
            </button>
          </div>

          <!-- Reverso -->
          <div class="fc-card__face fc-card__face--back" aria-hidden="${!session.revealed}">
            <div class="fc-card__answer-label">Respuesta</div>
            <p class="fc-card__answer">${escapeHtml(card.answer)}</p>
            ${card.explanation
              ? `<p class="fc-card__explanation">${escapeHtml(card.explanation)}</p>`
              : ''}
          </div>
        </div>
      </div>

      <!-- Botones de evaluación -->
      <div class="fc-eval ${session.revealed ? 'fc-eval--visible' : ''}"
           id="fc-eval" aria-label="¿Cómo te fue?">
        <p class="fc-eval__label">¿Cómo te fue?</p>
        <div class="fc-eval__buttons">
          <button class="btn fc-eval-btn fc-eval-btn--unknown" data-confidence="UNKNOWN"
                  aria-label="No sabía (tecla 1)">
            <span aria-hidden="true">😰</span> No sabía
          </button>
          <button class="btn fc-eval-btn fc-eval-btn--hard" data-confidence="HARD"
                  aria-label="Difícil (tecla 2)">
            <span aria-hidden="true">😓</span> Difícil
          </button>
          <button class="btn fc-eval-btn fc-eval-btn--good" data-confidence="GOOD"
                  aria-label="Bien (tecla 3)">
            <span aria-hidden="true">🙂</span> Bien
          </button>
          <button class="btn fc-eval-btn fc-eval-btn--easy" data-confidence="EASY"
                  aria-label="Fácil (tecla 4)">
            <span aria-hidden="true">😄</span> Fácil
          </button>
        </div>
      </div>
    </div>`.trim();

  // Eventos
  document.getElementById('fc-reveal-btn')?.addEventListener('click', revealAnswer);
  document.querySelectorAll('.fc-eval-btn').forEach(btn => {
    btn.addEventListener('click', () => evaluate(btn.dataset.confidence));
  });

  // Teclado
  document.addEventListener('keydown', handleKeydown);
}

function revealAnswer() {
  if (!session || session.revealed) return;
  session.revealed = true;

  const card = document.getElementById('fc-card');
  if (card) card.classList.add('fc-card--revealed');

  const back = document.querySelector('.fc-card__face--back');
  if (back) back.removeAttribute('aria-hidden');

  const evalEl = document.getElementById('fc-eval');
  if (evalEl) evalEl.classList.add('fc-eval--visible');

  // Ocultar botón revelar
  const revealBtn = document.getElementById('fc-reveal-btn');
  if (revealBtn) revealBtn.style.display = 'none';

  // Foco al primer botón de evaluación para accesibilidad
  document.querySelector('.fc-eval-btn')?.focus();
}

async function evaluate(confidence) {
  if (!session || !session.revealed) return;

  const card = session.cards[session.index];

  // Guardar resultado local
  session.results.push({ cardId: card.id, confidence });

  // Persistir en IndexedDB (Fase 7+)
  if (saveEvalFn) {
    try {
      await saveEvalFn(session.certId, session.moduleId, card.id, confidence);
    } catch (err) {
      console.warn('[Flashcard] No se pudo guardar evaluación:', err);
    }
  }

  // Reaprendizaje: UNKNOWN → reinsertar al final (Fase 8: límite 2 veces)
  const learnCount = session.learning.filter(id => id === card.id).length;
  if (confidence === 'UNKNOWN' && learnCount < 2) {
    session.learning.push(card.id);
    session.cards.push(card); // Reinserta al final
  }

  // Siguiente tarjeta
  session.index++;
  session.revealed = false;
  document.removeEventListener('keydown', handleKeydown);
  renderCard();
}

function handleKeydown(e) {
  if (!session) return;

  // Evitar activar shortcuts mientras se escribe en un input
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

  switch (e.key) {
    case ' ':
    case 'Enter':
      e.preventDefault();
      if (!session.revealed) revealAnswer();
      break;
    case '1': if (session.revealed) evaluate('UNKNOWN'); break;
    case '2': if (session.revealed) evaluate('HARD');    break;
    case '3': if (session.revealed) evaluate('GOOD');    break;
    case '4': if (session.revealed) evaluate('EASY');    break;
  }
}

// ── Resumen de sesión ─────────────────────────────────────────────
function renderSummary() {
  const main = document.getElementById('fc-main');
  if (!main || !session) return;

  document.removeEventListener('keydown', handleKeydown);

  const label = document.getElementById('fc-progress-label');
  if (label) label.textContent = 'Sesión completada';

  const results = session.results;
  const counts = {
    UNKNOWN: results.filter(r => r.confidence === 'UNKNOWN').length,
    HARD:    results.filter(r => r.confidence === 'HARD').length,
    GOOD:    results.filter(r => r.confidence === 'GOOD').length,
    EASY:    results.filter(r => r.confidence === 'EASY').length,
  };
  // Solo contar evaluaciones únicas de la primera pasada
  const unique  = session.results.slice(0, session.cards.length - session.learning.length);
  const studied = unique.length;
  const certId  = session.certId;
  const moduleId = session.moduleId;

  main.innerHTML = `
    <div class="fc-summary">
      <div class="fc-summary__icon" aria-hidden="true">🎉</div>
      <h1 class="fc-summary__title">¡Sesión completada!</h1>
      <p class="fc-summary__subtitle">Revisaste ${studied} tarjeta${studied !== 1 ? 's' : ''}.</p>

      <div class="fc-summary__results">
        <div class="fc-summary__result fc-summary__result--unknown">
          <span class="fc-summary__result-emoji" aria-hidden="true">😰</span>
          <span class="fc-summary__result-count">${counts.UNKNOWN}</span>
          <span class="fc-summary__result-label">No sabía</span>
        </div>
        <div class="fc-summary__result fc-summary__result--hard">
          <span class="fc-summary__result-emoji" aria-hidden="true">😓</span>
          <span class="fc-summary__result-count">${counts.HARD}</span>
          <span class="fc-summary__result-label">Difícil</span>
        </div>
        <div class="fc-summary__result fc-summary__result--good">
          <span class="fc-summary__result-emoji" aria-hidden="true">🙂</span>
          <span class="fc-summary__result-count">${counts.GOOD}</span>
          <span class="fc-summary__result-label">Bien</span>
        </div>
        <div class="fc-summary__result fc-summary__result--easy">
          <span class="fc-summary__result-emoji" aria-hidden="true">😄</span>
          <span class="fc-summary__result-count">${counts.EASY}</span>
          <span class="fc-summary__result-label">Fácil</span>
        </div>
      </div>

      <div class="fc-summary__actions">
        <button class="btn btn--primary btn--full" id="fc-again-btn">
          🔁 Estudiar de nuevo
        </button>
        <a href="#/certification/${escapeHtml(certId)}/module/${escapeHtml(moduleId)}"
           class="btn btn--secondary btn--full">
          ← Volver al módulo
        </a>
      </div>
    </div>`.trim();

  document.getElementById('fc-again-btn')?.addEventListener('click', () => {
    startSession(certId, moduleId);
  });
}

function cleanup() {
  document.removeEventListener('keydown', handleKeydown);
  session = null;
}

function diffBadge(difficulty) {
  return { basic: 'completed', intermediate: 'in-progress', advanced: 'review-required' }[difficulty] ?? 'not-started';
}

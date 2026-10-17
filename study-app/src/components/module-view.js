/**
 * module-view.js
 * Vista de un módulo: acceso a flashcards y quiz.
 */

import { getModule, isContentError } from '../services/content-service.js';
import { router }                    from '../router.js';
import { escapeHtml }                from '../utils/helpers.js';

let getProgressFn = null;
async function tryLoadProgress() {
  try {
    const mod = await import('../services/progress-service.js');
    getProgressFn = mod.getModuleProgress;
  } catch { /* sin progress-service aún */ }
}

export function renderModuleView(certificationId, moduleId) {
  const app = document.getElementById('app');
  if (!app) return null;
  app.innerHTML = buildShell(certificationId, moduleId);
  loadModule(certificationId, moduleId);
  return null;
}

function buildShell(certId, moduleId) {
  return `
    <header class="app-header">
      <a href="#/" class="app-header__brand" aria-label="Inicio">📚 Study App</a>
    </header>
    <main class="page">
      <nav class="breadcrumb" aria-label="Navegación">
        <a href="#/" class="breadcrumb__item breadcrumb__item--link">Inicio</a>
        <span class="breadcrumb__separator" aria-hidden="true">›</span>
        <a href="#/certification/${escapeHtml(certId)}" class="breadcrumb__item breadcrumb__item--link"
           id="cert-crumb">${escapeHtml(certId)}</a>
        <span class="breadcrumb__separator" aria-hidden="true">›</span>
        <span class="breadcrumb__item" id="module-crumb">${escapeHtml(moduleId)}</span>
      </nav>
      <div id="module-content" aria-live="polite">
        <div class="loading-spinner" aria-label="Cargando módulo…"></div>
      </div>
    </main>`.trim();
}

async function loadModule(certId, moduleId) {
  const contentEl = document.getElementById('module-content');
  if (!contentEl) return;

  await tryLoadProgress();

  const [moduleData, modProgress] = await Promise.all([
    getModule(certId, moduleId),
    getProgressFn ? getProgressFn(certId, moduleId).catch(() => null) : Promise.resolve(null),
  ]);

  if (isContentError(moduleData)) {
    contentEl.innerHTML = `<div class="error-message" role="alert">
      <strong>Error al cargar el módulo</strong>${escapeHtml(moduleData.message)}</div>`;
    return;
  }

  // Actualizar breadcrumbs con nombres reales
  const certCrumb = document.getElementById('cert-crumb');
  const modCrumb  = document.getElementById('module-crumb');
  if (modCrumb) modCrumb.textContent = moduleData.module.name;

  contentEl.innerHTML = buildModuleView(certId, moduleData, modProgress);
}

function buildModuleView(certId, moduleData, modProgress) {
  const mod      = moduleData.module;
  const cards    = moduleData.flashcards;
  const quiz     = moduleData.quiz;
  const due      = modProgress?.dueToday     ?? 0;
  const studied  = modProgress?.studiedFlashcards ?? 0;
  const prog     = modProgress?.progress     ?? 0;
  const mastery  = modProgress?.mastery      ?? 0;
  const status   = modProgress?.status       ?? 'NOT_STARTED';

  const statusLabel = {
    NOT_STARTED:     'Sin empezar',
    IN_PROGRESS:     'En progreso',
    REVIEW_REQUIRED: 'Repaso pendiente',
    COMPLETED:       'Completado',
    MASTERED:        '⭐ Dominado',
  }[status] ?? '';

  const dueSection = due > 0
    ? `<div class="alert alert--warning" role="status">
         📅 Tienes <strong>${due}</strong> tarjeta${due !== 1 ? 's' : ''} pendiente${due !== 1 ? 's' : ''} de repaso hoy.
       </div>`
    : '';

  return `
    <div class="section-header">
      <div style="display:flex;align-items:center;gap:var(--spacing-sm);flex-wrap:wrap">
        <h1 class="section-title">${escapeHtml(mod.name)}</h1>
        <span class="badge badge--${status.toLowerCase().replace('_','-')}">${escapeHtml(statusLabel)}</span>
      </div>
      ${mod.description ? `<p class="section-subtitle">${escapeHtml(mod.description)}</p>` : ''}
      ${mod.estimatedMinutes ? `<p class="text-muted text-sm">~${mod.estimatedMinutes} min estimados</p>` : ''}
    </div>

    ${dueSection}

    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-item__value">${cards.length}</div>
        <div class="stat-item__label">Flashcards</div>
      </div>
      <div class="stat-item">
        <div class="stat-item__value">${studied}</div>
        <div class="stat-item__label">Estudiadas</div>
      </div>
      <div class="stat-item">
        <div class="stat-item__value">${Math.round(prog)}%</div>
        <div class="stat-item__label">Progreso</div>
      </div>
      <div class="stat-item">
        <div class="stat-item__value">${Math.round(mastery)}%</div>
        <div class="stat-item__label">Dominio</div>
      </div>
    </div>

    <div class="module-actions">
      ${due > 0
        ? `<a href="#/certification/${escapeHtml(certId)}/module/${escapeHtml(mod.id)}/flashcards?mode=due-only"
              class="btn btn--primary btn--full"
              aria-label="Repasar ${due} tarjetas pendientes">
             📅 Repasar pendientes (${due})
           </a>`
        : ''}
      <a href="#/certification/${escapeHtml(certId)}/module/${escapeHtml(mod.id)}/flashcards"
         class="btn ${due > 0 ? 'btn--secondary' : 'btn--primary'} btn--full"
         aria-label="Estudiar todas las flashcards del módulo ${escapeHtml(mod.name)}">
        📚 ${studied > 0 ? 'Estudiar todo' : 'Comenzar a estudiar'}
      </a>
      ${quiz?.questions?.length
        ? `<a href="#/certification/${escapeHtml(certId)}/module/${escapeHtml(mod.id)}/quiz"
              class="btn btn--secondary btn--full"
              aria-label="Hacer el quiz del módulo ${escapeHtml(mod.name)}">
             ✏️ Quiz del módulo (${quiz.questions.length} preguntas)
           </a>`
        : ''}
    </div>

    <hr class="divider">

    <section>
      <h2 style="font-size:var(--font-size-md);font-weight:var(--font-weight-medium);
                 color:var(--text-secondary);margin-bottom:var(--spacing-sm)">
        Vista previa de flashcards
      </h2>
      <ul class="flashcard-preview-list" aria-label="Flashcards del módulo">
        ${cards.slice(0, 5).map((card, i) => `
          <li class="flashcard-preview-item">
            <span class="flashcard-preview-num text-muted text-sm">${i + 1}</span>
            <span class="flashcard-preview-q">${escapeHtml(card.question)}</span>
            ${card.difficulty ? `<span class="badge badge--${card.difficulty === 'basic' ? 'not-started' : card.difficulty === 'advanced' ? 'review-required' : 'in-progress'}">${escapeHtml(card.difficulty)}</span>` : ''}
          </li>`).join('')}
        ${cards.length > 5 ? `<li class="text-muted text-sm" style="padding:var(--spacing-xs) 0">+ ${cards.length - 5} tarjetas más</li>` : ''}
      </ul>
    </section>`.trim();
}

/**
 * dashboard.js
 * Vista principal: lista de certificaciones con progress y mastery.
 * FASE 4 — carga el catálogo, muestra cards básicas.
 * FASE 11 — actualizará las métricas reales desde IndexedDB.
 */

import { getCatalog, isContentError } from '../services/content-service.js';
import { progressBarHTML }            from './progress-bar.js';
import { router }                     from '../router.js';
import { escapeHtml }                 from '../utils/helpers.js';

// Importación dinámica — disponible en Fase 8+
let getStateFn = null;
// Importación dinámica — no existe aún en Fase 4, se usará en Fase 11
let getProgressFn = null;
async function tryLoadProgress() {
  try {
    const mod = await import('../services/progress-service.js');
    getProgressFn = mod.getCertificationProgress;
  } catch {
    // progress-service aún no existe (Fase 4-10)
  }
  try {
    const sm = await import('../services/study-service.js');
    getStateFn = sm.getStudyState;
  } catch { /* sin study-service aún */ }
}

/** Renderiza el shell del dashboard y arranca la carga asíncrona. */
export function renderDashboard() {
  const app = document.getElementById('app');
  if (!app) return null;

  app.innerHTML = buildShell();
  loadDashboard();
  return null;
}

function buildShell() {
  return `
    <header class="app-header">
      <a href="#/" class="app-header__brand" aria-label="Study App — Inicio">
        📚 <span>Study App</span>
      </a>
      <div class="app-header__actions">
        <a href="#/settings" class="btn btn--ghost btn--sm" aria-label="Configuración">⚙️</a>
      </div>
    </header>
    <main class="page" id="dashboard-main">
      <div class="section-header">
        <h1 class="section-title">Mis certificaciones</h1>
        <p class="section-subtitle">Selecciona una certificación para estudiar.</p>
      </div>
      <div id="certifications-list" aria-live="polite">
        <div class="loading-spinner" aria-label="Cargando certificaciones…"></div>
      </div>
    </main>`.trim();
}

async function loadDashboard() {
  const listEl = document.getElementById('certifications-list');
  if (!listEl) return;

  // Intentar cargar progress-service y study-service si están disponibles
  await tryLoadProgress();

  const catalog = await getCatalog();

  // Cargar studyState para "Continuar estudiando"
  let studyState = null;
  if (getStateFn) {
    try { studyState = await getStateFn(); } catch { /* no crítico */ }
  }
  if (isContentError(catalog)) {
    listEl.innerHTML = buildError(
      'No se pudo cargar el catálogo',
      catalog.message,
      catalog.details
    );
    return;
  }

  const enabled = catalog.certifications.filter(c => c.enabled);
  if (enabled.length === 0) {
    listEl.innerHTML = `
      <div class="card">
        <p class="text-secondary">No hay certificaciones habilitadas.</p>
        <p class="text-muted text-sm">Agrega una entrada con <code>enabled: true</code> en <code>catalog.json</code>.</p>
      </div>`;
    return;
  }

  // Cargar progress por cert (disponible en Fase 11+, null antes)
  const progressMap = {};
  if (getProgressFn) {
    await Promise.allSettled(
      enabled.map(async c => {
        try { progressMap[c.id] = await getProgressFn(c.id); } catch { /* sin datos aún */ }
      })
    );
  }

  listEl.innerHTML = enabled.map(cert => buildCertCard(cert, progressMap[cert.id])).join('');

  // Banner "Continuar estudiando"
  if (studyState?.route) {
    const banner = document.createElement('div');
    banner.className = 'alert alert--info';
    banner.setAttribute('role', 'status');
    const activityLabel = {
      flashcards: '📚 Flashcards',
      quiz:       '✏️ Quiz',
      exam:       '📝 Examen',
    }[studyState.type] ?? 'Estudio';
    banner.innerHTML = `
      <span>${activityLabel} — ${escapeHtml(studyState.certificationId)}
        ${studyState.moduleId ? ` / ${escapeHtml(studyState.moduleId)}` : ''}</span>
      <a href="${escapeHtml(studyState.route)}" class="btn btn--sm btn--primary" style="margin-left:auto">
        Continuar →
      </a>`;
    const dashMain = document.getElementById('dashboard-main');
    if (dashMain) {
      const sectionHeader = dashMain.querySelector('.section-header');
      if (sectionHeader) sectionHeader.after(banner);
    }
  }

  // Delegación de eventos — click en cualquier card o botón
  listEl.addEventListener('click', e => {
    const card = e.target.closest('[data-cert-id]');
    if (card) router.navigate(`/certification/${card.dataset.certId}`);
  });
}

function buildCertCard(cert, progress) {
  const prog    = progress?.progress ?? 0;
  const mastery = progress?.mastery  ?? 0;
  const due     = progress?.dueToday ?? 0;
  const lastExam = progress?.lastExamScore != null
    ? `Último examen: ${Math.round(progress.lastExamScore)}%`
    : 'Sin exámenes aún';

  const dueLabel = due > 0
    ? `<span class="badge badge--review-required">${due} pendientes hoy</span>`
    : prog > 0
      ? `<span class="badge badge--completed">Al día</span>`
      : `<span class="badge badge--not-started">Sin empezar</span>`;

  return `
    <article class="card card--interactive" data-cert-id="${escapeHtml(cert.id)}"
             role="button" tabindex="0"
             aria-label="Ir a ${escapeHtml(cert.name)}"
             onkeydown="if(event.key==='Enter'||event.key===' '){this.click()}">
      <div class="card__header">
        <div>
          <div class="cert-card__icon-title">
            ${cert.icon ? `<span aria-hidden="true">${escapeHtml(cert.icon)}</span>` : ''}
            <h2 class="card__title">${escapeHtml(cert.name)}</h2>
          </div>
          <p class="card__description">${escapeHtml(cert.description)}</p>
        </div>
        ${dueLabel}
      </div>

      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-item__value">${Math.round(prog)}%</div>
          <div class="stat-item__label">Progreso</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value">${Math.round(mastery)}%</div>
          <div class="stat-item__label">Dominio</div>
        </div>
      </div>

      ${progressBarHTML({ value: prog, label: 'Avance', size: 'sm' })}

      <div class="card__footer">
        <span class="text-muted text-sm">${escapeHtml(lastExam)}</span>
        <button class="btn btn--primary btn--sm" style="margin-left:auto"
                aria-label="Estudiar ${escapeHtml(cert.name)}">
          Continuar →
        </button>
      </div>
    </article>`.trim();
}

function buildError(title, message, details = []) {
  const detailsHTML = details.length
    ? `<ul class="error-details">${details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
    : '';
  return `
    <div class="error-message" role="alert">
      <strong>${escapeHtml(title)}</strong>
      ${escapeHtml(message)}
      ${detailsHTML}
    </div>`;
}

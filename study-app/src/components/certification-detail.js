/**
 * certification-detail.js
 * Dashboard de una certificación: stats + lista de módulos.
 * Fase 5: carga manifest y muestra módulos.
 * Fase 11: actualiza con métricas reales de progress/mastery.
 */

import { getManifest, getModule, isContentError } from '../services/content-service.js';
import { progressBarHTML }                         from './progress-bar.js';
import { certStatsHTML, moduleRowHTML }            from './statistics.js';
import { router }                                  from '../router.js';
import { escapeHtml }                              from '../utils/helpers.js';

let getProgressFn = null;
async function tryLoadProgress() {
  try {
    const mod = await import('../services/progress-service.js');
    getProgressFn = mod.getCertificationProgress;
  } catch { /* sin progress-service aún */ }
}

export function renderCertificationDetail(certificationId) {
  const app = document.getElementById('app');
  if (!app) return null;

  app.innerHTML = buildShell(certificationId);
  loadDetail(certificationId);
  return null;
}

function buildShell(certId) {
  return `
    <header class="app-header">
      <a href="#/" class="app-header__brand" aria-label="Study App — Inicio">📚 Study App</a>
      <div class="app-header__actions">
        <a href="#/settings" class="btn btn--ghost btn--sm" aria-label="Configuración">⚙️</a>
      </div>
    </header>
    <main class="page">
      <nav class="breadcrumb" aria-label="Navegación">
        <a href="#/" class="breadcrumb__item breadcrumb__item--link">Inicio</a>
        <span class="breadcrumb__separator" aria-hidden="true">›</span>
        <span class="breadcrumb__item" id="cert-name-crumb">${escapeHtml(certId)}</span>
      </nav>
      <div id="cert-detail-content" aria-live="polite">
        <div class="loading-spinner" aria-label="Cargando certificación…"></div>
      </div>
    </main>`.trim();
}

async function loadDetail(certId) {
  const contentEl = document.getElementById('cert-detail-content');
  if (!contentEl) return;

  await tryLoadProgress();

  const manifest = await getManifest(certId);
  if (isContentError(manifest)) {
    contentEl.innerHTML = buildError(manifest.message, manifest.details);
    return;
  }

  // Cargar todos los módulos para tener totalFlashcards por módulo
  const moduleMap = {};
  await Promise.allSettled(
    manifest.modules.map(async entry => {
      try {
        const mod = await getModule(certId, entry.id);
        if (!isContentError(mod)) moduleMap[entry.id] = mod;
      } catch { /* ignorar módulos que fallen */ }
    })
  );

  // Calcular progreso con desglose por módulo
  let progress = null;
  if (getProgressFn) {
    try { progress = await getProgressFn(certId, manifest, moduleMap); } catch { /* sin datos aún */ }
  }

  // Actualizar breadcrumb con nombre real
  const crumb = document.getElementById('cert-name-crumb');
  if (crumb) crumb.textContent = manifest.name;

  contentEl.innerHTML = buildDetail(manifest, progress, certId);

  // Delegación de eventos en lista de módulos
  contentEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-module-id]');
    if (btn) router.navigate(`/certification/${escapeHtml(certId)}/module/${btn.dataset.moduleId}`);
  });
}

function buildDetail(manifest, progress, certId) {
  // Ordenar módulos por order
  const sortedModules = [...manifest.modules].sort((a, b) => a.order - b.order);

  // Construir filas de módulos usando statistics.js si hay datos
  const modulesHTML = sortedModules.map(mod => {
    const modProgress = progress?.modules?.find(m => m.moduleId === mod.id);
    if (modProgress) return moduleRowHTML(modProgress, certId);
    // Fallback sin datos
    return buildModuleRow(mod, null);
  }).join('');

  return `
    <div class="section-header">
      <h1 class="section-title">${escapeHtml(manifest.name)}</h1>
      <p class="section-subtitle">${escapeHtml(manifest.description)}</p>
      ${manifest.totalEstimatedHours
        ? `<p class="text-muted text-sm">~${manifest.totalEstimatedHours}h estimadas</p>`
        : ''}
    </div>

    ${progress ? certStatsHTML(progress) : buildBasicStats(progress)}

    <hr class="divider">

    <section aria-label="Módulos">
      <h2 class="section-title" style="font-size:var(--font-size-lg);margin-bottom:var(--spacing-md)">
        Módulos
      </h2>
      <div class="modules-list">
        ${modulesHTML}
      </div>
    </section>

    ${manifest.exams?.length ? buildExamsSection(manifest) : ''}`.trim();
}

function buildModuleRow(mod, modProgress) {
  const prog    = modProgress?.progress ?? 0;
  const status  = modProgress?.status  ?? 'NOT_STARTED';
  const due     = modProgress?.dueToday ?? 0;

  const statusBadge = {
    NOT_STARTED:     '<span class="badge badge--not-started">Sin empezar</span>',
    IN_PROGRESS:     '<span class="badge badge--in-progress">En progreso</span>',
    REVIEW_REQUIRED: '<span class="badge badge--review-required">Repasar</span>',
    COMPLETED:       '<span class="badge badge--completed">Completado</span>',
    MASTERED:        '<span class="badge badge--mastered">⭐ Dominado</span>',
  }[status] ?? '';

  const dueText = due > 0
    ? `<span class="text-muted text-xs">${due} pendientes</span>`
    : '';

  return `
    <article class="card card--interactive module-card"
             data-module-id="${escapeHtml(mod.id)}"
             role="button" tabindex="0"
             aria-label="Abrir módulo ${escapeHtml(mod.name)}"
             onkeydown="if(event.key==='Enter'||event.key===' '){this.click()}">
      <div class="module-card__header">
        <div>
          <h3 class="module-card__title">${escapeHtml(mod.name)}</h3>
          ${mod.description ? `<p class="module-card__desc text-sm text-secondary">${escapeHtml(mod.description)}</p>` : ''}
        </div>
        <div class="module-card__badges">
          ${statusBadge}
          ${dueText}
        </div>
      </div>
      ${progressBarHTML({ value: prog, size: 'sm', showValue: prog > 0 })}
    </article>`.trim();
}

function buildExamsSection(manifest) {
  const items = manifest.exams.map(exam => `
    <a href="#/certification/${escapeHtml(manifest.certificationId)}/exam/${escapeHtml(exam.id)}"
       class="card card--interactive" style="display:block;text-decoration:none;color:inherit"
       aria-label="Examen: ${escapeHtml(exam.name)}">
      <div class="card__header">
        <h3 class="card__title">📝 ${escapeHtml(exam.name)}</h3>
      </div>
      ${exam.description ? `<p class="card__description">${escapeHtml(exam.description)}</p>` : ''}
    </a>`).join('');

  return `
    <hr class="divider">
    <section aria-label="Exámenes">
      <h2 class="section-title" style="font-size:var(--font-size-lg);margin-bottom:var(--spacing-md)">
        Exámenes
      </h2>
      ${items}
    </section>`;
}

function buildBasicStats(progress) {
  return `
    <div class="stat-grid">
      <div class="stat-item"><div class="stat-item__value">0%</div><div class="stat-item__label">Progreso</div></div>
      <div class="stat-item"><div class="stat-item__value">0%</div><div class="stat-item__label">Dominio</div></div>
      <div class="stat-item"><div class="stat-item__value">0</div><div class="stat-item__label">Estudiadas</div></div>
      <div class="stat-item"><div class="stat-item__value">0</div><div class="stat-item__label">Pendientes hoy</div></div>
    </div>`;
}

function buildError(message, details = []) {
  const detailsHTML = details.length
    ? `<ul>${details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
    : '';
  return `<div class="error-message" role="alert">
    <strong>Error al cargar la certificación</strong>
    ${escapeHtml(message)}${detailsHTML}
  </div>`;
}

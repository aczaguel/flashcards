/**
 * statistics.js
 * Componente de estadísticas detalladas de una certificación.
 * Se incluye dentro de certification-detail.js en Fase 11.
 *
 * Exporta helpers de renderizado para reutilizar en dashboard y detalle.
 */

import { progressBarHTML } from './progress-bar.js';
import { escapeHtml, formatPercent } from '../utils/helpers.js';
import { formatRelativeDate, formatDate } from '../utils/dates.js';

/**
 * Renderiza el bloque de estadísticas de una certificación.
 * @param {CertificationProgress} progress
 * @returns {string} HTML
 */
export function certStatsHTML(progress) {
  if (!progress) return '';

  const prog    = progress.progress  ?? 0;
  const mastery = progress.mastery   ?? 0;
  const due     = progress.dueToday  ?? 0;

  return `
    <section class="cert-stats" aria-label="Estadísticas de la certificación">

      <!-- Progress y Mastery: métricas independientes -->
      <div class="cert-stats__metrics">
        <div class="cert-stats__metric">
          <div class="cert-stats__metric-header">
            <span class="cert-stats__metric-label">Progreso</span>
            <span class="cert-stats__metric-hint text-xs text-muted">Cobertura de contenido</span>
          </div>
          ${progressBarHTML({ value: prog, showValue: true })}
        </div>
        <div class="cert-stats__metric">
          <div class="cert-stats__metric-header">
            <span class="cert-stats__metric-label">Dominio</span>
            <span class="cert-stats__metric-hint text-xs text-muted">Calidad del aprendizaje*</span>
          </div>
          ${progressBarHTML({
            value:   mastery,
            showValue: true,
            variant: mastery >= 90 ? 'success' : mastery >= 50 ? '' : 'warning',
          })}
        </div>
      </div>

      <p class="cert-stats__mastery-note text-xs text-muted">
        * El dominio es un indicador basado en autoevaluación y quizzes, no una medición científica.
      </p>

      <!-- Grid de stats -->
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-item__value">${progress.studiedFlashcards ?? 0}</div>
          <div class="stat-item__label">Tarjetas estudiadas</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value">${progress.masteredFlashcards ?? 0}</div>
          <div class="stat-item__label">Tarjetas dominadas</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value" style="color:${due > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">
            ${due}
          </div>
          <div class="stat-item__label">Pendientes hoy</div>
        </div>
        <div class="stat-item">
          <div class="stat-item__value">${progress.avgStreak ?? 0}</div>
          <div class="stat-item__label">Racha promedio</div>
        </div>
      </div>

      <!-- Quizzes y exámenes -->
      ${quizExamStatsHTML(progress)}

    </section>`.trim();
}

/**
 * Bloque de stats de quizzes y exámenes.
 */
function quizExamStatsHTML(progress) {
  const hasQuiz = progress.lastQuizScore !== null;
  const hasExam = progress.lastExamScore !== null;
  if (!hasQuiz && !hasExam) return '';

  return `
    <div class="cert-stats__quiz-exam">
      ${hasQuiz ? `
        <div class="cert-stats__score-row">
          <span class="text-sm text-secondary">Último quiz:</span>
          <span class="badge ${progress.lastQuizScore >= 80 ? 'badge--completed' : 'badge--review-required'}">
            ${Math.round(progress.lastQuizScore)}%
          </span>
          <span class="text-xs text-muted">${formatRelativeDate(progress.lastQuizDate)}</span>
        </div>` : ''}
      ${hasExam ? `
        <div class="cert-stats__score-row">
          <span class="text-sm text-secondary">Último examen:</span>
          <span class="badge ${progress.lastExamScore >= 72 ? 'badge--completed' : 'badge--review-required'}">
            ${Math.round(progress.lastExamScore)}%
          </span>
          ${progress.bestExamScore !== null ? `
            <span class="text-xs text-muted">Mejor: ${Math.round(progress.bestExamScore)}%</span>` : ''}
        </div>` : ''}
    </div>`.trim();
}

/**
 * Renderiza la fila de un módulo en la lista de módulos.
 * @param {ModuleProgress} modProgress
 * @param {string} certId
 */
export function moduleRowHTML(modProgress, certId) {
  const prog   = modProgress.progress ?? 0;
  const mastery = modProgress.mastery ?? 0;
  const status = modProgress.status  ?? 'NOT_STARTED';
  const due    = modProgress.dueToday ?? 0;

  const statusBadge = {
    NOT_STARTED:     `<span class="badge badge--not-started">Sin empezar</span>`,
    IN_PROGRESS:     `<span class="badge badge--in-progress">En progreso</span>`,
    REVIEW_REQUIRED: `<span class="badge badge--review-required">Repasar</span>`,
    COMPLETED:       `<span class="badge badge--completed">Completado</span>`,
    MASTERED:        `<span class="badge badge--mastered">⭐ Dominado</span>`,
  }[status] ?? '';

  return `
    <article class="card card--interactive module-card"
             data-module-id="${escapeHtml(modProgress.moduleId)}"
             role="button" tabindex="0"
             aria-label="Abrir módulo ${escapeHtml(modProgress.name ?? modProgress.moduleId)}"
             onkeydown="if(event.key==='Enter'||event.key===' '){this.click()}">
      <div class="module-card__header">
        <div>
          <h3 class="module-card__title">${escapeHtml(modProgress.name ?? modProgress.moduleId)}</h3>
          <div style="display:flex;gap:var(--spacing-xs);margin-top:var(--spacing-xs);flex-wrap:wrap">
            ${statusBadge}
            ${due > 0 ? `<span class="badge badge--review-required">${due} pendientes</span>` : ''}
          </div>
        </div>
        <div class="module-card__stats text-xs text-muted" style="text-align:right;flex-shrink:0">
          <div>Progreso: ${Math.round(prog)}%</div>
          <div>Dominio: ${Math.round(mastery)}%</div>
        </div>
      </div>
      ${progressBarHTML({ value: prog, size: 'sm', showValue: false })}
    </article>`.trim();
}

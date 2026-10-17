/**
 * app.js
 * Punto de entrada de Study App.
 * 1. Aplica tema guardado
 * 2. Registra Service Worker
 * 3. Registra rutas
 * 4. Inicia el router
 */

import { router } from './router.js';
import { LS_THEME } from './config.js';

import { renderDashboard }           from './components/dashboard.js';
import { renderCertificationDetail } from './components/certification-detail.js';
import { renderModuleView }          from './components/module-view.js';
import { renderFlashcards }          from './components/flashcard.js';
import { renderQuiz }                from './components/quiz.js';
import { renderExam }                from './components/exam.js';
import { renderSettings }            from './components/settings.js';

// ── 1. Aplicar tema guardado ──────────────────────────────────────
function applyTheme() {
  const saved       = localStorage.getItem(LS_THEME);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme       = saved ?? (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  // Escuchar cambios del sistema (sin preferencia guardada)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem(LS_THEME)) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

// ── 2. Service Worker ─────────────────────────────────────────────
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    console.info('[App] SW registrado:', reg.scope);

    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });
  } catch (err) {
    console.warn('[App] SW no registrado:', err);
  }
}

function showUpdateBanner() {
  const app = document.getElementById('app');
  if (!app) return;
  const banner = document.createElement('div');
  banner.className = 'alert alert--info update-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <span>Nueva versión disponible.</span>
    <button class="btn btn--sm btn--primary" id="sw-update-btn">Actualizar</button>`;
  app.prepend(banner);
  document.getElementById('sw-update-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
}

// ── 3. Rutas ─────────────────────────────────────────────────────
function registerRoutes() {
  router.register('/', () => renderDashboard());

  router.register('/certification/:id',
    ({ id }) => renderCertificationDetail(id));

  router.register('/certification/:id/module/:moduleId',
    ({ id, moduleId }) => renderModuleView(id, moduleId));

  router.register('/certification/:id/module/:moduleId/flashcards',
    ({ id, moduleId }) => renderFlashcards(id, moduleId));

  router.register('/certification/:id/module/:moduleId/quiz',
    ({ id, moduleId }) => renderQuiz(id, moduleId));

  router.register('/certification/:id/exam/:examId',
    ({ id, examId }) => renderExam(id, examId));

  router.register('/settings', () => renderSettings());
}

// ── 4. Init ───────────────────────────────────────────────────────
async function init() {
  applyTheme();
  registerRoutes();
  router.start();
  registerServiceWorker(); // no bloquea el render
}

init();

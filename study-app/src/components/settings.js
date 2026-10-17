/**
 * settings.js
 * Vista de configuración: export/import de progreso, preferencias, tema.
 */

import {
  getAll, clearStore, importTransactional,
  STORE_FLASHCARD_REVIEWS, STORE_STUDY_STATE,
} from '../services/storage-service.js';
import {
  STORE_FLASHCARD_PROGRESS, STORE_QUIZ_ATTEMPTS,
  STORE_EXAM_ATTEMPTS, STORE_STUDY_SETTINGS,
  APP_VERSION, EXPORT_VERSION, LS_THEME,
} from '../config.js';
import { validate }           from '../utils/validators.js';
import { escapeHtml }         from '../utils/helpers.js';
import { nowISO, formatDate } from '../utils/dates.js';
import {
  getStudySetting, saveStudySetting, getDailyGoal, getSessionSize,
} from '../services/study-service.js';
import { router } from '../router.js';

// ── Entrada pública ───────────────────────────────────────────────
export function renderSettings() {
  const app = document.getElementById('app');
  if (!app) return null;
  app.innerHTML = buildShell();
  loadSettings();
  return null;
}

function buildShell() {
  return `
    <header class="app-header">
      <a href="#/" class="app-header__brand" aria-label="Study App — Inicio">📚 Study App</a>
    </header>
    <main class="page">
      <nav class="breadcrumb" aria-label="Navegación">
        <a href="#/" class="breadcrumb__item breadcrumb__item--link">Inicio</a>
        <span class="breadcrumb__separator" aria-hidden="true">›</span>
        <span class="breadcrumb__item">Configuración</span>
      </nav>
      <div class="section-header">
        <h1 class="section-title">Configuración</h1>
      </div>
      <div id="settings-content" aria-live="polite">
        <div class="loading-spinner" aria-label="Cargando configuración…"></div>
      </div>
    </main>`.trim();
}

async function loadSettings() {
  const contentEl = document.getElementById('settings-content');
  if (!contentEl) return;

  const [dailyGoal, sessionSize, lastBackup, theme] = await Promise.all([
    getDailyGoal(),
    getSessionSize(),
    getStudySetting('lastBackup', null),
    Promise.resolve(localStorage.getItem(LS_THEME) ?? 'light'),
  ]);

  contentEl.innerHTML = buildSettingsHTML({ dailyGoal, sessionSize, lastBackup, theme });
  bindEvents();
}

function buildSettingsHTML({ dailyGoal, sessionSize, lastBackup, theme }) {
  return `
    <!-- Tema -->
    <section class="settings-section card" aria-labelledby="theme-heading">
      <h2 class="settings-section__title" id="theme-heading">🎨 Apariencia</h2>
      <div class="settings-row">
        <label class="settings-label" for="theme-select">Tema</label>
        <select id="theme-select" class="settings-select" aria-label="Seleccionar tema">
          <option value="light" ${theme === 'light' ? 'selected' : ''}>☀️ Claro</option>
          <option value="dark"  ${theme === 'dark'  ? 'selected' : ''}>🌙 Oscuro</option>
        </select>
      </div>
    </section>

    <!-- Estudio -->
    <section class="settings-section card" aria-labelledby="study-heading">
      <h2 class="settings-section__title" id="study-heading">📚 Estudio</h2>
      <div class="settings-row">
        <label class="settings-label" for="daily-goal-input">Meta diaria (tarjetas)</label>
        <input type="number" id="daily-goal-input" class="settings-input"
               value="${Number(dailyGoal)}" min="1" max="200"
               aria-label="Meta diaria de tarjetas a repasar" />
      </div>
      <div class="settings-row">
        <label class="settings-label" for="session-size-input">Tamaño de sesión</label>
        <input type="number" id="session-size-input" class="settings-input"
               value="${Number(sessionSize)}" min="1" max="100"
               aria-label="Número máximo de tarjetas por sesión" />
      </div>
      <button class="btn btn--secondary btn--sm" id="save-study-settings-btn">
        Guardar preferencias
      </button>
      <div id="study-settings-status" role="status" aria-live="polite" class="text-sm" style="min-height:20px"></div>
    </section>

    <!-- Backup -->
    <section class="settings-section card" aria-labelledby="backup-heading">
      <h2 class="settings-section__title" id="backup-heading">💾 Progreso</h2>
      <p class="text-secondary text-sm">
        Exporta tu progreso para hacer una copia de seguridad o transferirlo a otro dispositivo.
      </p>
      ${lastBackup ? `<p class="text-muted text-xs">Último export: ${formatDate(lastBackup)}</p>` : ''}

      <div class="settings-actions">
        <button class="btn btn--primary" id="export-btn">
          ⬇️ Exportar progreso
        </button>
        <label class="btn btn--secondary" for="import-file-input" style="cursor:pointer">
          ⬆️ Importar progreso
        </label>
        <input type="file" id="import-file-input" accept=".json"
               style="display:none" aria-label="Seleccionar archivo de progreso" />
      </div>

      <div id="import-status" role="status" aria-live="polite" class="text-sm" style="min-height:24px;margin-top:var(--spacing-sm)"></div>
    </section>

    <!-- Info -->
    <section class="settings-section card" aria-labelledby="info-heading">
      <h2 class="settings-section__title" id="info-heading">ℹ️ Acerca de</h2>
      <p class="text-secondary text-sm">Study App v${escapeHtml(APP_VERSION)}</p>
      <p class="text-muted text-xs">Motor genérico de estudio con flashcards y repetición espaciada.</p>
    </section>`.trim();
}

// ── Eventos ───────────────────────────────────────────────────────
function bindEvents() {
  // Tema
  document.getElementById('theme-select')?.addEventListener('change', e => {
    const theme = e.target.value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME, theme);
  });

  // Guardar configuración de estudio
  document.getElementById('save-study-settings-btn')?.addEventListener('click', async () => {
    const goal    = parseInt(document.getElementById('daily-goal-input')?.value ?? '30');
    const size    = parseInt(document.getElementById('session-size-input')?.value ?? '10');
    const statusEl = document.getElementById('study-settings-status');

    if (isNaN(goal) || goal < 1 || isNaN(size) || size < 1) {
      if (statusEl) statusEl.textContent = '⚠️ Valores inválidos.';
      return;
    }

    await Promise.all([
      saveStudySetting('dailyGoal',   goal),
      saveStudySetting('sessionSize', size),
    ]);
    if (statusEl) {
      statusEl.textContent = '✅ Guardado.';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
    }
  });

  // Exportar
  document.getElementById('export-btn')?.addEventListener('click', exportProgress);

  // Importar
  document.getElementById('import-file-input')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) importProgress(file);
    e.target.value = ''; // reset para poder seleccionar el mismo archivo de nuevo
  });
}

// ── Export ────────────────────────────────────────────────────────
async function exportProgress() {
  const statusEl = document.getElementById('import-status');
  if (statusEl) statusEl.textContent = '⏳ Exportando…';

  try {
    const [
      flashcardProgress, flashcardReviews, quizAttempts,
      examAttempts, studySettings, studyState,
    ] = await Promise.all([
      getAll(STORE_FLASHCARD_PROGRESS),
      getAll(STORE_FLASHCARD_REVIEWS),
      getAll(STORE_QUIZ_ATTEMPTS),
      getAll(STORE_EXAM_ATTEMPTS),
      getAll(STORE_STUDY_SETTINGS),
      getAll(STORE_STUDY_STATE),
    ]);

    const exportData = {
      schemaVersion: '1.0',
      exportVersion: EXPORT_VERSION,
      appVersion:    APP_VERSION,
      exportedAt:    nowISO(),
      data: {
        flashcardProgress,
        flashcardReviews,
        quizAttempts,
        examAttempts,
        studySettings,
        studyState,
      },
    };

    // Registrar fecha del último backup
    await saveStudySetting('lastBackup', exportData.exportedAt);

    // Descargar archivo
    const json     = JSON.stringify(exportData, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `study-progress-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (statusEl) statusEl.textContent = '✅ Progreso exportado correctamente.';

    // Actualizar label de último backup
    const lastBackupEls = document.querySelectorAll('.text-xs');
    // Recarga la sección sin hacer full reload
    setTimeout(() => loadSettings(), 500);

  } catch (err) {
    console.error('[Settings] Export error:', err);
    if (statusEl) statusEl.textContent = `❌ Error al exportar: ${escapeHtml(err.message)}`;
  }
}

// ── Import ────────────────────────────────────────────────────────
async function importProgress(file) {
  const statusEl = document.getElementById('import-status');
  if (statusEl) statusEl.textContent = '⏳ Leyendo archivo…';

  // 1. Leer archivo
  let text;
  try {
    text = await file.text();
  } catch {
    if (statusEl) statusEl.textContent = '❌ No se pudo leer el archivo.';
    return;
  }

  // 2. Parsear JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (statusEl) statusEl.textContent = '❌ El archivo no es JSON válido.';
    return;
  }

  // 3. Validar estructura completa
  const validation = validate(data, 'progress-export');
  if (!validation.valid) {
    const errList = validation.errors.slice(0, 3).map(e => escapeHtml(e)).join('; ');
    if (statusEl) statusEl.innerHTML = `❌ Archivo inválido: ${errList}`;
    console.error('[Settings] Import validation errors:', validation.errors);
    return;
  }

  // 4. Verificar exportVersion compatible
  if (data.exportVersion !== EXPORT_VERSION) {
    if (statusEl) statusEl.textContent =
      `❌ Versión de exportación incompatible (encontrado: ${data.exportVersion}, soportado: ${EXPORT_VERSION}).`;
    return;
  }

  // 5. Mostrar resumen y pedir confirmación
  const { flashcardProgress, quizAttempts, examAttempts } = data.data;
  const summary = [
    `${flashcardProgress.length} registros de flashcards`,
    `${quizAttempts.length} intentos de quiz`,
    `${examAttempts.length} intentos de examen`,
  ].join(', ');

  if (statusEl) {
    statusEl.innerHTML = `
      <div class="import-confirm" role="dialog" aria-modal="true" aria-label="Confirmar importación">
        <p class="text-sm">Se importará: <strong>${escapeHtml(summary)}</strong></p>
        <p class="text-xs text-muted">Esta acción sobreescribirá todo el progreso actual.</p>
        <div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-sm)">
          <button class="btn btn--danger btn--sm" id="confirm-import-btn">
            ⚠️ Confirmar importación
          </button>
          <button class="btn btn--secondary btn--sm" id="cancel-import-btn">
            Cancelar
          </button>
        </div>
      </div>`;
  }

  document.getElementById('cancel-import-btn')?.addEventListener('click', () => {
    if (statusEl) statusEl.textContent = '';
  });

  document.getElementById('confirm-import-btn')?.addEventListener('click', async () => {
    await executeImport(data, statusEl);
  });
}

async function executeImport(data, statusEl) {
  if (statusEl) statusEl.textContent = '⏳ Importando…';

  try {
    // 6. Importación transaccional completa
    await importTransactional([
      { storeName: STORE_FLASHCARD_PROGRESS, records: data.data.flashcardProgress },
      { storeName: STORE_FLASHCARD_REVIEWS,  records: data.data.flashcardReviews  },
      { storeName: STORE_QUIZ_ATTEMPTS,      records: data.data.quizAttempts      },
      { storeName: STORE_EXAM_ATTEMPTS,      records: data.data.examAttempts      },
      { storeName: STORE_STUDY_SETTINGS,     records: data.data.studySettings     },
      { storeName: STORE_STUDY_STATE,        records: data.data.studyState        },
    ]);

    if (statusEl) statusEl.textContent = '✅ Progreso importado correctamente. Recargando…';
    setTimeout(() => { router.navigate('/'); }, 1500);

  } catch (err) {
    console.error('[Settings] Import transaction failed:', err);
    if (statusEl) statusEl.textContent =
      `❌ La importación falló. Ningún dato fue modificado. Error: ${escapeHtml(err.message)}`;
  }
}

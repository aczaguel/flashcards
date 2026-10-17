/**
 * sw.js — Service Worker de Study App v1.2
 *
 * Estrategias:
 *   - App shell (HTML, CSS, JS):  Cache First
 *   - content/*.json:             Network First con fallback a cache
 *
 * Invalidación: al cambiar CACHE_VERSION se crean nuevos caches y
 * se eliminan los anteriores en activate. El usuario recibe notificación.
 */

const APP_VERSION   = '1.0.0';
const CACHE_VERSION = `v${APP_VERSION}`;
const CACHE_SHELL   = `app-shell-${CACHE_VERSION}`;
const CACHE_CONTENT = `content-${CACHE_VERSION}`;

/** App shell — archivos a pre-cachear en install */
const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/main.css',
  './assets/css/themes.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './src/app.js',
  './src/router.js',
  './src/config.js',
  // Services
  './src/services/content-service.js',
  './src/services/storage-service.js',
  './src/services/progress-service.js',
  './src/services/study-service.js',
  './src/services/exam-service.js',
  // Components
  './src/components/dashboard.js',
  './src/components/certification-detail.js',
  './src/components/module-view.js',
  './src/components/flashcard.js',
  './src/components/quiz.js',
  './src/components/exam.js',
  './src/components/progress-bar.js',
  './src/components/statistics.js',
  './src/components/settings.js',
  // Utils
  './src/utils/validators.js',
  './src/utils/spaced-repetition.js',
  './src/utils/dates.js',
  './src/utils/helpers.js',
  // Icons
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-maskable.svg',
];

// ── Install: pre-cachear app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  console.info(`[SW] Installing ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache failed (non-fatal):', err))
  );
});

// ── Activate: limpiar caches obsoletos ──────────────────────────
self.addEventListener('activate', (event) => {
  console.info(`[SW] Activating ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(n => n !== CACHE_SHELL && n !== CACHE_CONTENT)
          .map(n => { console.info('[SW] Deleting old cache:', n); return caches.delete(n); })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: aplicar estrategia según tipo de recurso ────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo same-origin
  if (url.origin !== self.location.origin) return;

  // JSON de contenido → Network First
  if (url.pathname.includes('/content/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(event.request, CACHE_CONTENT));
    return;
  }

  // Navegación (HTML) → Cache First con fallback a index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(cacheFirstWithFallback(event.request));
    return;
  }

  // Resto (CSS, JS, iconos) → Cache First
  event.respondWith(cacheFirst(event.request, CACHE_SHELL));
});

// ── Estrategias ─────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso no disponible offline', { status: 503 });
  }
}

async function cacheFirstWithFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback a index.html (SPA)
    const fallback = await caches.match('./index.html');
    return fallback ?? new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: true, message: 'Contenido no disponible offline. Abre este módulo con conexión primero.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

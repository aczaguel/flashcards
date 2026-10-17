/**
 * router.js
 * Hash-based SPA router.
 * Escucha cambios en window.location.hash y renderiza la vista correspondiente.
 *
 * Uso:
 *   router.register('/', dashboardComponent);
 *   router.register('/certification/:id', certDetailComponent);
 *   router.start();
 */

class Router {
  constructor() {
    /** @type {Array<{ pattern: string, regex: RegExp, keys: string[], handler: Function }>} */
    this._routes = [];

    /** @type {Function|null} Vista activa — para llamar destroy() si existe */
    this._currentView = null;

    this._onHashChange = this._onHashChange.bind(this);
  }

  /**
   * Registra una ruta.
   * @param {string}   pattern  - Ej: '/', '/certification/:id', '/certification/:id/module/:moduleId'
   * @param {Function} handler  - Función que recibe (params) y retorna un elemento DOM o null
   */
  register(pattern, handler) {
    const keys = [];
    // Convertir :param en grupos de captura
    const regexStr = pattern
      .replace(/\//g, '\\/')
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      });

    this._routes.push({
      pattern,
      regex: new RegExp(`^${regexStr}$`),
      keys,
      handler,
    });
  }

  /**
   * Inicia el router: escucha hashchange y renderiza la ruta actual.
   */
  start() {
    window.addEventListener('hashchange', this._onHashChange);
    // Renderizar ruta inicial
    this._onHashChange();
  }

  /**
   * Navega programáticamente a una ruta.
   * @param {string} path - Ej: '/certification/aws-saa'
   */
  navigate(path) {
    window.location.hash = path;
  }

  /** Detiene el router y limpia listeners. */
  stop() {
    window.removeEventListener('hashchange', this._onHashChange);
  }

  _onHashChange() {
    // hash puede ser '' o '#' o '#/ruta'
    const hash = window.location.hash;
    const path = hash.startsWith('#') ? hash.slice(1) : hash;
    const normalizedPath = path === '' ? '/' : path;

    this._dispatch(normalizedPath);
  }

  _dispatch(path) {
    for (const route of this._routes) {
      const match = path.match(route.regex);
      if (match) {
        // Construir params desde los grupos de captura
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });

        // Destruir vista anterior si tiene cleanup
        if (this._currentView && typeof this._currentView.destroy === 'function') {
          this._currentView.destroy();
        }
        this._currentView = null;

        // Llamar al handler
        const view = route.handler(params);
        if (view) {
          this._currentView = view;
        }
        return;
      }
    }

    // Ninguna ruta coincide → redirigir a inicio
    console.warn(`[Router] No route found for: ${path}`);
    this.navigate('/');
  }
}

export const router = new Router();

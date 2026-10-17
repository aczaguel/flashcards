/**
 * content-service.js
 * Responsabilidad: fetch, validación y caché en memoria de todo el contenido JSON.
 *
 * API pública:
 *   getCatalog()                          → Catalog | ContentError
 *   getManifest(certificationId)          → CertificationManifest | ContentError
 *   getModule(certificationId, moduleId)  → StudyModule | ContentError
 *   clearCache()                          → void  (útil para tests)
 *
 * Errores:
 *   Todos los métodos retornan un objeto con { error: true, message, details? }
 *   en lugar de lanzar excepciones. Esto permite a los componentes mostrar
 *   mensajes de error sin romper la app.
 */

import { CATALOG_PATH, CONTENT_BASE_PATH, SUPPORTED_SCHEMA_VERSIONS } from '../config.js';
import { parseAndValidate } from '../utils/validators.js';

// ── Caché en memoria ─────────────────────────────────────────────
// Se limpia solo explícitamente (tests) o al recargar la página.
const _cache = {
  catalog: null,          // Catalog | null
  manifests: new Map(),   // certId → CertificationManifest
  modules: new Map(),     // "${certId}::${moduleId}" → StudyModule
};

// ── Helpers internos ─────────────────────────────────────────────

/**
 * Fetch + parse + validate en un solo paso.
 * @param {string} url
 * @param {string} schemaName
 * @returns {Promise<{data: object}|{error: true, message: string, details: string[]}>}
 */
async function fetchAndValidate(url, schemaName) {
  let text;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        error: true,
        message: `No se pudo cargar: ${url}`,
        details: [`HTTP ${response.status} ${response.statusText}`],
      };
    }
    text = await response.text();
  } catch (networkError) {
    return {
      error: true,
      message: `Error de red al cargar: ${url}`,
      details: [networkError.message],
    };
  }

  const result = parseAndValidate(text, schemaName, url);
  if (!result.valid) {
    console.error(`[ContentService] Validación fallida: ${url}`, result.errors);
    return {
      error: true,
      message: `El archivo "${url}" no cumple con Study Content Schema v1`,
      details: result.errors,
    };
  }

  return { data: result.data };
}

/**
 * Verifica que la versión del schema sea compatible.
 * (La validación ya lo hace, pero esta función genera un mensaje más claro
 * para mostrar en la UI si se detecta una versión futura incompatible.)
 */
function checkSchemaVersion(data, sourcePath) {
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(data.schemaVersion)) {
    return {
      error: true,
      message: `Versión de schema no compatible en: ${sourcePath}`,
      details: [
        `Se encontró schemaVersion "${data.schemaVersion}".`,
        `Versiones soportadas: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
        'Actualiza Study App para poder usar este contenido.',
      ],
    };
  }
  return null;
}

// ── API pública ──────────────────────────────────────────────────

/**
 * Carga y valida catalog.json.
 * Usa caché en memoria después del primer fetch.
 *
 * @returns {Promise<import('../types.js').Catalog | ContentError>}
 */
export async function getCatalog() {
  if (_cache.catalog) return _cache.catalog;

  const result = await fetchAndValidate(CATALOG_PATH, 'catalog');
  if (result.error) return result;

  const versionError = checkSchemaVersion(result.data, CATALOG_PATH);
  if (versionError) return versionError;

  _cache.catalog = result.data;
  return result.data;
}

/**
 * Carga y valida el manifest de una certificación.
 * Usa caché en memoria después del primer fetch.
 *
 * @param {string} certificationId  - Ej: 'aws-saa'
 * @returns {Promise<CertificationManifest | ContentError>}
 */
export async function getManifest(certificationId) {
  if (_cache.manifests.has(certificationId)) {
    return _cache.manifests.get(certificationId);
  }

  // Primero necesitamos el catálogo para encontrar la ruta del manifest
  const catalog = await getCatalog();
  if (catalog.error) return catalog;

  const entry = catalog.certifications.find(c => c.id === certificationId);
  if (!entry) {
    return {
      error: true,
      message: `Certificación no encontrada: "${certificationId}"`,
      details: [`Las certificaciones disponibles son: ${catalog.certifications.map(c => c.id).join(', ')}`],
    };
  }

  if (!entry.enabled) {
    return {
      error: true,
      message: `La certificación "${certificationId}" está deshabilitada`,
      details: ['Cambia enabled a true en catalog.json para activarla'],
    };
  }

  const manifestUrl = `${CONTENT_BASE_PATH}/${entry.manifest}`;
  const result = await fetchAndValidate(manifestUrl, 'certification-manifest');
  if (result.error) return result;

  const versionError = checkSchemaVersion(result.data, manifestUrl);
  if (versionError) return versionError;

  _cache.manifests.set(certificationId, result.data);
  return result.data;
}

/**
 * Carga y valida un módulo de forma lazy (solo cuando se necesita).
 * Usa caché en memoria después del primer fetch.
 *
 * @param {string} certificationId  - Ej: 'aws-saa'
 * @param {string} moduleId         - Ej: 'iam'
 * @returns {Promise<StudyModule | ContentError>}
 */
export async function getModule(certificationId, moduleId) {
  const cacheKey = `${certificationId}::${moduleId}`;
  if (_cache.modules.has(cacheKey)) {
    return _cache.modules.get(cacheKey);
  }

  const manifest = await getManifest(certificationId);
  if (manifest.error) return manifest;

  const moduleEntry = manifest.modules.find(m => m.id === moduleId);
  if (!moduleEntry) {
    return {
      error: true,
      message: `Módulo no encontrado: "${moduleId}" en "${certificationId}"`,
      details: [`Módulos disponibles: ${manifest.modules.map(m => m.id).join(', ')}`],
    };
  }

  // La ruta del archivo es relativa a la carpeta de la certificación
  const certFolder = manifest.certificationId; // Ej: 'aws-saa'
  const moduleUrl  = `${CONTENT_BASE_PATH}/${certFolder}/${moduleEntry.file}`;
  const result     = await fetchAndValidate(moduleUrl, 'module');
  if (result.error) return result;

  const versionError = checkSchemaVersion(result.data, moduleUrl);
  if (versionError) return versionError;

  _cache.modules.set(cacheKey, result.data);
  return result.data;
}

/**
 * Carga y valida un examen final.
 *
 * @param {string} certificationId
 * @param {string} examId
 * @returns {Promise<Exam | ContentError>}
 */
export async function getExam(certificationId, examId) {
  const manifest = await getManifest(certificationId);
  if (manifest.error) return manifest;

  const examEntry = manifest.exams.find(e => e.id === examId);
  if (!examEntry) {
    return {
      error: true,
      message: `Examen no encontrado: "${examId}" en "${certificationId}"`,
      details: [`Exámenes disponibles: ${manifest.exams.map(e => e.id).join(', ')}`],
    };
  }

  const certFolder = manifest.certificationId;
  const examUrl    = `${CONTENT_BASE_PATH}/${certFolder}/${examEntry.file}`;
  const result     = await fetchAndValidate(examUrl, 'exam');
  if (result.error) return result;

  const versionError = checkSchemaVersion(result.data, examUrl);
  if (versionError) return versionError;

  return result.data;
}

/**
 * Limpia el caché en memoria.
 * Útil para tests o para forzar una recarga de contenido.
 */
export function clearCache() {
  _cache.catalog = null;
  _cache.manifests.clear();
  _cache.modules.clear();
}

/**
 * Retorna true si el resultado es un error de contenido.
 * @param {any} result
 * @returns {boolean}
 */
export function isContentError(result) {
  return result !== null && typeof result === 'object' && result.error === true;
}

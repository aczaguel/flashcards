/**
 * helpers.js
 * Utilidades genéricas reutilizables.
 */

/**
 * Mezcla un array aleatoriamente (Fisher-Yates in-place).
 * @template T
 * @param {T[]} array
 * @returns {T[]} El mismo array mezclado
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Escapa caracteres HTML para evitar XSS al insertar contenido de JSON en el DOM.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/**
 * Formatea un porcentaje para mostrar en UI.
 * @param {number} value  - 0-100
 * @param {number} [decimals=0]
 * @returns {string}  Ej: "75%" o "75.5%"
 */
export function formatPercent(value, decimals = 0) {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${Math.round(value * 10 ** decimals) / 10 ** decimals}%`;
}

/**
 * Clamp — limita un número entre min y max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Genera un ID de clave compuesta para IndexedDB.
 * @param {string} certId
 * @param {string} moduleId
 * @param {string} flashcardId
 * @returns {string}
 */
export function makeProgressKey(certId, moduleId, flashcardId) {
  return `${certId}::${moduleId}::${flashcardId}`;
}

/**
 * Trunca un string a maxLength caracteres y agrega '…' si es necesario.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength) {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

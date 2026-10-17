/**
 * dates.js
 * Utilidades de fecha para el algoritmo de repetición espaciada.
 * Todas las fechas se manejan en ISO 8601 (UTC).
 */

/**
 * Retorna la fecha actual como string ISO 8601.
 * @returns {string}
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Suma N días a una fecha y retorna ISO 8601.
 * @param {Date|string} date - Fecha base
 * @param {number} days      - Días a sumar (puede ser negativo)
 * @returns {string}
 */
export function addDays(date, days) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * Verifica si una fecha ISO está en el pasado o es ahora (vencida).
 * @param {string|null} isoDate
 * @returns {boolean}
 */
export function isDue(isoDate) {
  if (!isoDate) return true; // Sin fecha → considerar vencida
  return new Date(isoDate) <= new Date();
}

/**
 * Diferencia en días entre dos fechas ISO (date2 - date1).
 * Puede ser negativo si date2 < date1.
 * @param {string} isoDate1
 * @param {string} isoDate2
 * @returns {number}
 */
export function diffDays(isoDate1, isoDate2) {
  const d1 = new Date(isoDate1);
  const d2 = new Date(isoDate2);
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Formatea una fecha ISO para mostrar en la UI (fecha relativa simple).
 * @param {string|null} isoDate
 * @returns {string}  Ej: "Hoy", "Ayer", "Hace 3 días", "En 5 días"
 */
export function formatRelativeDate(isoDate) {
  if (!isoDate) return 'Nunca';

  const diff = diffDays(new Date().toISOString(), isoDate);

  if (diff === 0)  return 'Hoy';
  if (diff === -1) return 'Ayer';
  if (diff === 1)  return 'Mañana';
  if (diff < 0)   return `Hace ${Math.abs(diff)} días`;
  return `En ${diff} días`;
}

/**
 * Formatea una fecha ISO a formato local legible.
 * @param {string|null} isoDate
 * @param {string} [locale='es-MX']
 * @returns {string}
 */
export function formatDate(isoDate, locale = 'es-MX') {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

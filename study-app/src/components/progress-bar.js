/**
 * progress-bar.js
 * Componente de barra de progreso reutilizable.
 *
 * Uso:
 *   progressBarHTML({ value, label, showValue, variant })
 *   → retorna string HTML para insertar en el DOM
 *
 * Nunca usa innerHTML directamente con datos del usuario —
 * todos los valores se sanitizan con escapeHtml/Number.
 */

import { escapeHtml, formatPercent } from '../utils/helpers.js';

/**
 * @param {object} opts
 * @param {number}  opts.value      - Porcentaje 0-100
 * @param {string}  [opts.label]    - Etiqueta izquierda
 * @param {boolean} [opts.showValue=true] - Mostrar porcentaje a la derecha
 * @param {string}  [opts.variant]  - '' | 'success' | 'warning'
 * @param {string}  [opts.size]     - '' | 'sm'
 * @returns {string} HTML
 */
export function progressBarHTML({ value = 0, label = '', showValue = true, variant = '', size = '' }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const fillClass = variant ? `progress-bar__fill--${escapeHtml(variant)}` : '';
  const sizeClass  = size   ? `progress-bar--${escapeHtml(size)}`          : '';

  const labelPart = label
    ? `<span class="progress-bar__name">${escapeHtml(label)}</span>`
    : '';
  const valuePart = showValue
    ? `<span class="progress-bar__value">${formatPercent(pct)}</span>`
    : '';
  const headerRow = (labelPart || valuePart)
    ? `<div class="progress-bar__label">${labelPart}${valuePart}</div>`
    : '';

  return `
    <div class="progress-bar ${sizeClass}" role="progressbar"
         aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
         ${label ? `aria-label="${escapeHtml(label)} ${formatPercent(pct)}"` : ''}>
      ${headerRow}
      <div class="progress-bar__track">
        <div class="progress-bar__fill ${fillClass}" style="width:${pct}%"></div>
      </div>
    </div>`.trim();
}

/**
 * progress-service.test.js
 * Tests para src/services/progress-service.js (funciones puras exportadas).
 *
 * deriveStatus() es la función clave: pure, sin IndexedDB.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { deriveStatus } from '../../src/services/progress-service.js';

// ══════════════════════════════════════════════════════════════════
// deriveStatus — precedencia del SPEC §7
// ══════════════════════════════════════════════════════════════════

describe('deriveStatus — precedencia', () => {

  // 1. MASTERED → mastery >= 90
  it('MASTERED cuando mastery >= 90', () => {
    assert.equal(deriveStatus(100, 0, 95, 80, 90), 'MASTERED');
    assert.equal(deriveStatus(100, 5, 95, 80, 95), 'MASTERED'); // MASTERED > REVIEW_REQUIRED
    assert.equal(deriveStatus(50,  0, null, 80, 90), 'MASTERED'); // incluso con progress bajo
  });

  // 2. REVIEW_REQUIRED → dueToday > 0 && progress > 0 (solo si mastery < 90)
  it('REVIEW_REQUIRED cuando hay tarjetas vencidas y algo de progreso', () => {
    assert.equal(deriveStatus(50, 3, null, 80, 50), 'REVIEW_REQUIRED');
    assert.equal(deriveStatus(10, 1, 60, 80, 0),   'REVIEW_REQUIRED');
  });

  it('no REVIEW_REQUIRED si progress === 0 (nunca estudiado)', () => {
    assert.notEqual(deriveStatus(0, 5, null, 80, 0), 'REVIEW_REQUIRED');
  });

  it('no REVIEW_REQUIRED si mastery >= 90 (MASTERED tiene precedencia)', () => {
    assert.equal(deriveStatus(100, 3, 95, 80, 90), 'MASTERED');
  });

  // 3. COMPLETED → progress === 100 && lastQuizScore >= passingScore
  it('COMPLETED cuando progress 100 y quiz aprobado', () => {
    assert.equal(deriveStatus(100, 0, 85, 80, 0), 'COMPLETED');
    assert.equal(deriveStatus(100, 0, 80, 80, 0), 'COMPLETED'); // exactamente el mínimo
  });

  it('no COMPLETED si quiz no aprobado', () => {
    assert.notEqual(deriveStatus(100, 0, 75, 80, 0), 'COMPLETED');
  });

  it('no COMPLETED si progress < 100', () => {
    assert.notEqual(deriveStatus(99, 0, 90, 80, 0), 'COMPLETED');
  });

  it('no COMPLETED si no hay quiz aún', () => {
    assert.notEqual(deriveStatus(100, 0, null, 80, 0), 'COMPLETED');
  });

  // 4. IN_PROGRESS → progress > 0
  it('IN_PROGRESS cuando progress > 0 sin otras condiciones', () => {
    assert.equal(deriveStatus(50, 0, null, 80, 0), 'IN_PROGRESS');
    assert.equal(deriveStatus(1,  0, null, 80, 0), 'IN_PROGRESS');
    assert.equal(deriveStatus(99, 0, 50,   80, 0), 'IN_PROGRESS'); // quiz no aprobado
  });

  // 5. NOT_STARTED → default
  it('NOT_STARTED cuando progress === 0', () => {
    assert.equal(deriveStatus(0, 0, null, 80, 0),  'NOT_STARTED');
    assert.equal(deriveStatus(0, 0, null, 80, 50), 'NOT_STARTED');
  });

  // Precedencia completa con escenario conflictivo
  it('MASTERED > REVIEW_REQUIRED: mastery 90 con tarjetas vencidas → MASTERED', () => {
    assert.equal(deriveStatus(100, 8, 95, 80, 90), 'MASTERED');
  });

  it('REVIEW_REQUIRED > COMPLETED: tarjetas vencidas con progress 100 y quiz OK → REVIEW_REQUIRED', () => {
    assert.equal(deriveStatus(100, 2, 85, 80, 50), 'REVIEW_REQUIRED');
  });

  it('REVIEW_REQUIRED > IN_PROGRESS: tarjetas vencidas con progress parcial → REVIEW_REQUIRED', () => {
    assert.equal(deriveStatus(60, 4, null, 80, 0), 'REVIEW_REQUIRED');
  });

  it('COMPLETED > IN_PROGRESS: progress 100 con quiz OK, sin vencidas → COMPLETED', () => {
    assert.equal(deriveStatus(100, 0, 82, 80, 60), 'COMPLETED');
  });

  // Valores límite
  it('passingScore personalizado de 72', () => {
    assert.equal(deriveStatus(100, 0, 72, 72, 0), 'COMPLETED');
    assert.equal(deriveStatus(100, 0, 71, 72, 0), 'IN_PROGRESS');
  });

  it('mastery exactamente 90 → MASTERED', () => {
    assert.equal(deriveStatus(100, 0, 85, 80, 90), 'MASTERED');
  });

  it('mastery 89 → no MASTERED', () => {
    assert.notEqual(deriveStatus(100, 0, 85, 80, 89), 'MASTERED');
  });

});

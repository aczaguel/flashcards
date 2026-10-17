/**
 * import-export.test.js
 * Tests del flujo de validación de study-progress.json.
 * Prueba la lógica de validación sin depender de IndexedDB.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validate, parseAndValidate } from '../../src/utils/validators.js';
import { EXPORT_VERSION, APP_VERSION } from '../../src/config.js';

// ── Fixture base ──────────────────────────────────────────────────
function validExport(overrides = {}) {
  return {
    schemaVersion: '1.0',
    exportVersion: EXPORT_VERSION,
    appVersion:    APP_VERSION,
    exportedAt:    '2026-09-25T10:00:00.000Z',
    data: {
      flashcardProgress: [],
      flashcardReviews:  [],
      quizAttempts:      [],
      examAttempts:      [],
      studySettings:     [],
      studyState:        [],
    },
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════
// Validación de structure
// ══════════════════════════════════════════════════════════════════

describe('import-export — validación de estructura', () => {

  it('acepta un export válido vacío', () => {
    const r = validate(validExport(), 'progress-export');
    assert.equal(r.valid, true, `Errores: ${r.errors.join('; ')}`);
  });

  it('acepta un export con datos reales', () => {
    const data = validExport({
      data: {
        flashcardProgress: [
          { id: 'aws-saa::iam::iam-001', certificationId: 'aws-saa', moduleId: 'iam',
            flashcardId: 'iam-001', confidence: 'EASY', reviewCount: 5, streak: 3,
            intervalDays: 28, lastReviewed: '2026-09-20T00:00:00Z',
            nextReview: '2026-10-18T00:00:00Z', status: 'active',
            createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z' },
        ],
        flashcardReviews: [
          { certificationId: 'aws-saa', moduleId: 'iam', flashcardId: 'iam-001',
            reviewedAt: '2026-09-20T00:00:00Z', rating: 'EASY',
            previousStreak: 2, newStreak: 3, previousIntervalDays: 10, newIntervalDays: 28 },
        ],
        quizAttempts:  [],
        examAttempts:  [],
        studySettings: [{ key: 'dailyGoal', value: 30 }],
        studyState:    [],
      },
    });
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, true, `Errores: ${r.errors.join('; ')}`);
  });

});

// ══════════════════════════════════════════════════════════════════
// Casos de rechazo
// ══════════════════════════════════════════════════════════════════

describe('import-export — casos de rechazo', () => {

  it('rechaza JSON sintácticamente inválido', () => {
    const r = parseAndValidate('{ bad json }', 'progress-export');
    assert.equal(r.valid, false);
    assert.equal(r.data, null);
  });

  it('rechaza cuando falta schemaVersion', () => {
    const data = validExport();
    delete data.schemaVersion;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.toLowerCase().includes('schemaversion')));
  });

  it('rechaza schemaVersion incompatible', () => {
    const data = validExport({ schemaVersion: '99.0' });
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando falta exportVersion', () => {
    const data = validExport();
    delete data.exportVersion;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.toLowerCase().includes('exportversion')));
  });

  it('rechaza exportVersion no numérica', () => {
    const data = validExport({ exportVersion: 'v1' });
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando falta appVersion', () => {
    const data = validExport();
    delete data.appVersion;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.toLowerCase().includes('appversion')));
  });

  it('rechaza cuando falta exportedAt', () => {
    const data = validExport();
    delete data.exportedAt;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando falta el objeto data', () => {
    const data = validExport();
    delete data.data;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.toLowerCase().includes('data')));
  });

  it('rechaza cuando falta flashcardProgress en data', () => {
    const data = validExport();
    delete data.data.flashcardProgress;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando falta flashcardReviews en data (nuevo en v1.2)', () => {
    const data = validExport();
    delete data.data.flashcardReviews;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando falta studyState en data (nuevo en v1.2)', () => {
    const data = validExport();
    delete data.data.studyState;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando un store es objeto en lugar de array', () => {
    const data = validExport();
    data.data.quizAttempts = {};
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

  it('rechaza cuando un store es null', () => {
    const data = validExport();
    data.data.examAttempts = null;
    const r = validate(data, 'progress-export');
    assert.equal(r.valid, false);
  });

});

// ══════════════════════════════════════════════════════════════════
// Lógica de compatibilidad de versión
// ══════════════════════════════════════════════════════════════════

describe('import-export — compatibilidad de versión', () => {

  it('EXPORT_VERSION está definido y es string numérico', () => {
    assert.ok(typeof EXPORT_VERSION === 'string');
    assert.ok(/^\d+$/.test(EXPORT_VERSION), 'EXPORT_VERSION debe ser dígitos');
  });

  it('un export con exportVersion diferente es detectado por la lógica de settings.js', () => {
    // La lógica de settings.js compara data.exportVersion !== EXPORT_VERSION
    const data = validExport({ exportVersion: '999' });
    const r = validate(data, 'progress-export'); // El validador acepta cualquier dígito
    assert.equal(r.valid, true); // válido estructuralmente
    // La incompatibilidad la detecta settings.js en runtime
    const isCompatible = data.exportVersion === EXPORT_VERSION;
    assert.equal(isCompatible, false, 'Versión 999 no es compatible con la actual');
  });

  it('un export con la versión actual es compatible', () => {
    const data = validExport();
    assert.equal(data.exportVersion === EXPORT_VERSION, true);
  });

});

// ══════════════════════════════════════════════════════════════════
// Roundtrip de datos
// ══════════════════════════════════════════════════════════════════

describe('import-export — roundtrip', () => {

  it('un objeto exportado puede re-parsearse y validarse correctamente', () => {
    const original = validExport({
      data: {
        flashcardProgress: [{ id: 'test::mod::card-001' }],
        flashcardReviews:  [{ flashcardId: 'card-001' }],
        quizAttempts:      [{ score: 85 }],
        examAttempts:      [],
        studySettings:     [{ key: 'dailyGoal', value: 20 }],
        studyState:        [{ key: 'lastActivity', value: { type: 'flashcards' } }],
      },
    });

    const json     = JSON.stringify(original);
    const result   = parseAndValidate(json, 'progress-export');
    assert.equal(result.valid, true, `Errores: ${result.errors.join('; ')}`);
    assert.ok(result.data !== null);
    assert.equal(result.data.data.flashcardProgress.length, 1);
    assert.equal(result.data.data.studySettings[0].value, 20);
  });

});

/**
 * validators.test.js
 * Tests unitarios para src/utils/validators.js
 *
 * Ejecutar: node --experimental-vm-modules tests/unit/validators.test.js
 * O con el runner configurado en tests/README.md
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolver rutas relativas al directorio del proyecto
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// Importar el validador
import { validate, parseAndValidate } from '../../src/utils/validators.js';

// Cargar fixtures
function loadFixture(name) {
  return JSON.parse(
    readFileSync(path.join(ROOT, 'tests', 'fixtures', name), 'utf-8')
  );
}

// ── Helpers de test ──────────────────────────────────────────────

function assertValid(result, context = '') {
  assert.equal(result.valid, true,
    `${context} debería ser válido. Errores: ${result.errors.join('; ')}`
  );
  assert.equal(result.errors.length, 0,
    `${context} no debería tener errores`
  );
}

function assertInvalid(result, context = '') {
  assert.equal(result.valid, false,
    `${context} debería ser inválido`
  );
  assert.ok(result.errors.length > 0,
    `${context} debe tener al menos 1 error`
  );
}

function assertErrorContains(result, substring) {
  const found = result.errors.some(e => e.toLowerCase().includes(substring.toLowerCase()));
  assert.ok(found,
    `Se esperaba un error que contenga "${substring}". Errores actuales: ${result.errors.join('; ')}`
  );
}

// ══════════════════════════════════════════════════════════════════
// CATALOG
// ══════════════════════════════════════════════════════════════════

describe('validate — catalog', () => {

  it('acepta un catálogo válido', () => {
    const data = loadFixture('valid-catalog.json');
    assertValid(validate(data, 'catalog'), 'valid-catalog.json');
  });

  it('acepta catálogo con array vacío de certifications', () => {
    const data = { schemaVersion: '1.0', certifications: [] };
    assertValid(validate(data, 'catalog'));
  });

  it('rechaza cuando falta schemaVersion', () => {
    const data = { certifications: [] };
    const result = validate(data, 'catalog');
    assertInvalid(result);
    assertErrorContains(result, 'schemaVersion');
  });

  it('rechaza schemaVersion no soportada', () => {
    const data = { schemaVersion: '99.0', certifications: [] };
    const result = validate(data, 'catalog');
    assertInvalid(result);
    assertErrorContains(result, 'schemaVersion');
  });

  it('rechaza cuando falta certifications', () => {
    const data = { schemaVersion: '1.0' };
    const result = validate(data, 'catalog');
    assertInvalid(result);
    assertErrorContains(result, 'certifications');
  });

  it('rechaza certificación sin id', () => {
    const data = {
      schemaVersion: '1.0',
      certifications: [{
        name: 'Test', description: 'Desc', manifest: 'test/manifest.json', enabled: true
      }]
    };
    const result = validate(data, 'catalog');
    assertInvalid(result);
    assertErrorContains(result, 'id');
  });

  it('rechaza id con formato inválido (mayúsculas)', () => {
    const data = {
      schemaVersion: '1.0',
      certifications: [{
        id: 'AWS-SAA', name: 'Test', description: 'Desc',
        manifest: 'test/manifest.json', enabled: true
      }]
    };
    const result = validate(data, 'catalog');
    assertInvalid(result);
    assertErrorContains(result, 'id');
  });

  it('rechaza enabled no booleano', () => {
    const data = {
      schemaVersion: '1.0',
      certifications: [{
        id: 'aws-saa', name: 'Test', description: 'Desc',
        manifest: 'test/manifest.json', enabled: 'yes'
      }]
    };
    const result = validate(data, 'catalog');
    assertInvalid(result);
    assertErrorContains(result, 'enabled');
  });

});

// ══════════════════════════════════════════════════════════════════
// CERTIFICATION MANIFEST
// ══════════════════════════════════════════════════════════════════

describe('validate — certification-manifest', () => {

  const validManifest = () => ({
    schemaVersion: '1.0',
    contentVersion: '1.0.0',
    certificationId: 'aws-saa',
    name: 'AWS SAA',
    description: 'Descripción',
    language: 'es-MX',
    modules: [{ id: 'iam', order: 1, name: 'IAM', file: 'modules/01-iam.json' }],
    exams: []
  });

  it('acepta un manifest válido', () => {
    assertValid(validate(validManifest(), 'certification-manifest'));
  });

  it('rechaza cuando falta language', () => {
    const data = validManifest();
    delete data.language;
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'language');
  });

  it('rechaza language con formato inválido', () => {
    const data = { ...validManifest(), language: 'español' };
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'language');
  });

  it('rechaza modules vacío', () => {
    const data = { ...validManifest(), modules: [] };
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'modules');
  });

  it('rechaza módulo sin order', () => {
    const data = validManifest();
    data.modules[0] = { id: 'iam', name: 'IAM', file: 'modules/01-iam.json' };
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'order');
  });

  it('rechaza order menor a 1', () => {
    const data = validManifest();
    data.modules[0].order = 0;
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'order');
  });

  it('rechaza cuando falta contentVersion', () => {
    const data = validManifest();
    delete data.contentVersion;
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'contentversion');
  });

  it('rechaza contentVersion con formato inválido (no semver)', () => {
    const data = { ...validManifest(), contentVersion: '1.0' };
    const result = validate(data, 'certification-manifest');
    assertInvalid(result);
    assertErrorContains(result, 'contentversion');
  });

  it('acepta contentVersion "2.3.1"', () => {
    const data = { ...validManifest(), contentVersion: '2.3.1' };
    assertValid(validate(data, 'certification-manifest'));
  });

});

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════

describe('validate — module', () => {

  it('acepta un módulo válido (fixture)', () => {
    const data = loadFixture('valid-module.json');
    assertValid(validate(data, 'module'), 'valid-module.json');
  });

  it('rechaza el módulo inválido (fixture)', () => {
    const data = loadFixture('invalid-module.json');
    const result = validate(data, 'module');
    assertInvalid(result, 'invalid-module.json');
  });

  it('rechaza flashcard sin answer', () => {
    const data = loadFixture('valid-module.json');
    // Eliminar answer de la primera tarjeta
    delete data.flashcards[0].answer;
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'answer');
  });

  it('rechaza flashcard con answer vacío', () => {
    const data = loadFixture('valid-module.json');
    data.flashcards[0].answer = '';
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'answer');
  });

  it('rechaza flashcard con id en formato incorrecto', () => {
    const data = loadFixture('valid-module.json');
    data.flashcards[0].id = 'bad_id';
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'id');
  });

  it('rechaza difficulty inválida', () => {
    const data = loadFixture('valid-module.json');
    data.flashcards[0].difficulty = 'expert';
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'difficulty');
  });

  it('rechaza passingScore fuera de rango', () => {
    const data = loadFixture('valid-module.json');
    data.quiz.passingScore = 150;
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'passingscore');
  });

  it('rechaza pregunta sin correctAnswers', () => {
    const data = loadFixture('valid-module.json');
    data.quiz.questions[0].correctAnswers = [];
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'correctanswers');
  });

  it('rechaza tipo de pregunta inválido', () => {
    const data = loadFixture('valid-module.json');
    data.quiz.questions[0].type = 'open-ended';
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'type');
  });

  it('rechaza pregunta con menos de 2 opciones', () => {
    const data = loadFixture('valid-module.json');
    data.quiz.questions[0].options = [{ id: 'a', text: 'Solo una' }];
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'options');
  });

  it('rechaza módulo sin language', () => {
    const data = loadFixture('valid-module.json');
    delete data.language;
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'language');
  });

  it('rechaza type incorrecto', () => {
    const data = loadFixture('valid-module.json');
    data.type = 'exam';
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'type');
  });

  it('rechaza cuando falta contentVersion', () => {
    const data = loadFixture('valid-module.json');
    delete data.contentVersion;
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'contentversion');
  });

  it('rechaza contentVersion con formato inválido (no semver)', () => {
    const data = loadFixture('valid-module.json');
    data.contentVersion = '1.0';
    const result = validate(data, 'module');
    assertInvalid(result);
    assertErrorContains(result, 'contentversion');
  });

  it('acepta contentVersion en cualquier semver válido', () => {
    const data = loadFixture('valid-module.json');
    data.contentVersion = '3.1.0';
    assertValid(validate(data, 'module'));
  });

});

// ══════════════════════════════════════════════════════════════════
// EXAM
// ══════════════════════════════════════════════════════════════════

describe('validate — exam', () => {

  const validExam = () => ({
    schemaVersion: '1.0',
    type: 'exam',
    certificationId: 'aws-saa',
    language: 'es-MX',
    exam: {
      id: 'final',
      name: 'Examen Final',
      passingScore: 72,
      shuffleQuestions: true,
      shuffleOptions: true
    },
    questions: [
      {
        id: 'exam-q001',
        type: 'single-choice',
        moduleId: 'iam',
        question: '¿Cuál es la función principal de IAM?',
        options: [
          { id: 'a', text: 'Gestionar identidades' },
          { id: 'b', text: 'Almacenar datos' }
        ],
        correctAnswers: ['a'],
        explanation: 'IAM gestiona identidades y permisos.'
      }
    ]
  });

  it('acepta un examen válido', () => {
    const data = {
      schemaVersion: '1.0',
      type: 'exam',
      certificationId: 'aws-saa',
      language: 'es-MX',
      exam: { id: 'final', name: 'Examen Final', passingScore: 72 },
      questions: [{
        id: 'exam-q001',
        type: 'single-choice',
        question: '¿Pregunta?',
        options: [{ id: 'a', text: 'Opción A' }, { id: 'b', text: 'Opción B' }],
        correctAnswers: ['a']
      }]
    };
    assertValid(validate(data, 'exam'));
  });

  it('rechaza type incorrecto', () => {
    const data = {
      schemaVersion: '1.0', type: 'module',
      certificationId: 'aws-saa', language: 'es-MX',
      exam: { id: 'final', name: 'Test', passingScore: 72 },
      questions: [{
        id: 'exam-q001', type: 'single-choice', question: '?',
        options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
        correctAnswers: ['a']
      }]
    };
    const result = validate(data, 'exam');
    assertInvalid(result);
    assertErrorContains(result, 'type');
  });

  it('rechaza passingScore inválido', () => {
    const data = {
      schemaVersion: '1.0', type: 'exam',
      certificationId: 'aws-saa', language: 'es-MX',
      exam: { id: 'final', name: 'Test', passingScore: 0 },
      questions: [{
        id: 'exam-q001', type: 'single-choice', question: '?',
        options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
        correctAnswers: ['a']
      }]
    };
    const result = validate(data, 'exam');
    assertInvalid(result);
    assertErrorContains(result, 'passingscore');
  });

  it('rechaza questions vacío', () => {
    const data = {
      schemaVersion: '1.0', type: 'exam',
      certificationId: 'aws-saa', language: 'es-MX',
      exam: { id: 'final', name: 'Test', passingScore: 72 },
      questions: []
    };
    const result = validate(data, 'exam');
    assertInvalid(result);
    assertErrorContains(result, 'questions');
  });

});

// ══════════════════════════════════════════════════════════════════
// parseAndValidate
// ══════════════════════════════════════════════════════════════════

describe('parseAndValidate', () => {

  it('parsea y valida un JSON válido', () => {
    const json = JSON.stringify({ schemaVersion: '1.0', certifications: [] });
    const result = parseAndValidate(json, 'catalog');
    assert.equal(result.valid, true);
    assert.ok(result.data !== null);
  });

  it('retorna error en JSON sintácticamente inválido', () => {
    const result = parseAndValidate('{ invalid json }', 'catalog');
    assert.equal(result.valid, false);
    assert.equal(result.data, null);
    assertErrorContains(result, 'json inválido');
  });

  it('retorna error en JSON válido pero schema incorrecto', () => {
    const json = JSON.stringify({ schemaVersion: '1.0' }); // sin certifications
    const result = parseAndValidate(json, 'catalog');
    assert.equal(result.valid, false);
    assert.equal(result.data, null);
  });

  it('rechaza schema desconocido', () => {
    const result = validate({}, 'unknown-schema');
    assert.equal(result.valid, false);
    assertErrorContains(result, 'schema desconocido');
  });

});

// ══════════════════════════════════════════════════════════════════
// PROGRESS EXPORT (schema v1.2)
// ══════════════════════════════════════════════════════════════════

describe('validate — progress-export', () => {

  const validExport = () => ({
    schemaVersion: '1.0',
    exportVersion: '1',
    appVersion: '1.0.0',
    exportedAt: '2026-09-25T10:00:00.000Z',
    data: {
      flashcardProgress: [],
      flashcardReviews:  [],
      quizAttempts:      [],
      examAttempts:      [],
      studySettings:     [],
      studyState:        [],
    },
  });

  it('acepta un export válido', () => {
    assertValid(validate(validExport(), 'progress-export'));
  });

  it('acepta export con datos no vacíos', () => {
    const data = validExport();
    data.data.flashcardProgress = [{ id: 'aws-saa::iam::iam-001', certificationId: 'aws-saa' }];
    assertValid(validate(data, 'progress-export'));
  });

  it('rechaza cuando falta exportVersion', () => {
    const data = validExport();
    delete data.exportVersion;
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'exportversion');
  });

  it('rechaza exportVersion no numérica', () => {
    const data = { ...validExport(), exportVersion: 'v1' };
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'exportversion');
  });

  it('rechaza cuando falta appVersion', () => {
    const data = validExport();
    delete data.appVersion;
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'appversion');
  });

  it('rechaza cuando falta exportedAt', () => {
    const data = validExport();
    delete data.exportedAt;
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'exportedat');
  });

  it('rechaza cuando falta el objeto data', () => {
    const data = validExport();
    delete data.data;
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'data');
  });

  it('rechaza cuando falta flashcardReviews en data (nuevo en v1.2)', () => {
    const data = validExport();
    delete data.data.flashcardReviews;
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'flashcardreviews');
  });

  it('rechaza cuando falta studyState en data (nuevo en v1.2)', () => {
    const data = validExport();
    delete data.data.studyState;
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'studystate');
  });

  it('rechaza cuando un store no es array', () => {
    const data = validExport();
    data.data.quizAttempts = {};
    const result = validate(data, 'progress-export');
    assertInvalid(result);
    assertErrorContains(result, 'quizattempts');
  });

});

/**
 * content-loader.test.js
 * Tests unitarios para src/services/content-service.js
 *
 * Ejecutar: node --test tests/unit/content-loader.test.js
 *
 * Estrategia de mocking:
 *   - Se reemplaza global.fetch con una función controlada por cada test.
 *   - Se llama clearCache() antes de cada test para evitar contaminación.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// Cargar fixtures desde disco
function loadFixture(name) {
  return readFileSync(path.join(ROOT, 'tests', 'fixtures', name), 'utf-8');
}

function loadContent(relPath) {
  return readFileSync(path.join(ROOT, 'content', relPath), 'utf-8');
}

// ── Importar el módulo bajo test ─────────────────────────────────
import {
  getCatalog,
  getManifest,
  getModule,
  clearCache,
  isContentError,
} from '../../src/services/content-service.js';

// ── Mock de fetch ────────────────────────────────────────────────

/**
 * Crea un mock de fetch que retorna responses controladas.
 * @param {Object} urlMap - { [url]: { status, body } }
 */
function mockFetch(urlMap) {
  global.fetch = async (url) => {
    // Normalizar: quitar ./ del inicio y query strings
    const normalizedUrl = String(url).replace(/^\.\//, '');

    // Buscar coincidencia parcial (el fetch usa rutas relativas, los tests las normalizan)
    const key = Object.keys(urlMap).find(k => normalizedUrl.includes(k));

    if (!key) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      };
    }

    const { status = 200, body } = urlMap[key];
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => body,
    };
  };
}

beforeEach(() => {
  clearCache();
});

// ══════════════════════════════════════════════════════════════════
// getCatalog
// ══════════════════════════════════════════════════════════════════

describe('getCatalog', () => {

  it('carga y valida el catalog.json real del proyecto', async () => {
    mockFetch({
      'catalog.json': { body: loadContent('catalog.json') },
    });

    const result = await getCatalog();

    assert.equal(isContentError(result), false, `Error inesperado: ${result?.message}`);
    assert.equal(result.schemaVersion, '1.0');
    assert.ok(Array.isArray(result.certifications));
    assert.ok(result.certifications.length > 0);
    assert.equal(result.certifications[0].id, 'aws-saa');
  });

  it('usa caché en la segunda llamada (no hace segundo fetch)', async () => {
    let fetchCount = 0;
    global.fetch = async () => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        text: async () => loadContent('catalog.json'),
      };
    };

    await getCatalog();
    await getCatalog();

    assert.equal(fetchCount, 1, 'fetch debería llamarse solo una vez gracias al caché');
  });

  it('retorna error cuando el servidor responde 404', async () => {
    mockFetch({
      'catalog.json': { status: 404, body: 'Not Found' },
    });

    const result = await getCatalog();

    assert.equal(isContentError(result), true);
    assert.ok(result.message.includes('catalog.json') || result.message.toLowerCase().includes('no se pudo'));
  });

  it('retorna error cuando hay un fallo de red', async () => {
    global.fetch = async () => { throw new Error('Network error'); };

    const result = await getCatalog();

    assert.equal(isContentError(result), true);
    assert.ok(result.message.toLowerCase().includes('red') || result.message.toLowerCase().includes('network'));
  });

  it('retorna error cuando el JSON es inválido', async () => {
    mockFetch({
      'catalog.json': { body: '{ invalid json }' },
    });

    const result = await getCatalog();

    assert.equal(isContentError(result), true);
  });

  it('retorna error cuando el catalog no cumple el schema', async () => {
    const invalidCatalog = JSON.stringify({ schemaVersion: '1.0' }); // sin certifications
    mockFetch({ 'catalog.json': { body: invalidCatalog } });

    const result = await getCatalog();

    assert.equal(isContentError(result), true);
    assert.ok(result.details && result.details.length > 0);
  });

  it('retorna error cuando la schemaVersion es incompatible', async () => {
    const futureCatalog = JSON.stringify({ schemaVersion: '99.0', certifications: [] });
    mockFetch({ 'catalog.json': { body: futureCatalog } });

    const result = await getCatalog();

    // El validador rechaza versiones no soportadas — el error puede venir
    // del validador (mensaje de schema) o de checkSchemaVersion (mensaje de compatibilidad)
    assert.equal(isContentError(result), true);
    assert.ok(result.details && result.details.length > 0,
      'Debe incluir detalles del error de versión');
  });

});

// ══════════════════════════════════════════════════════════════════
// getManifest
// ══════════════════════════════════════════════════════════════════

describe('getManifest', () => {

  it('carga y valida el manifest.json real de aws-saa', async () => {
    mockFetch({
      'catalog.json':      { body: loadContent('catalog.json') },
      'manifest.json':     { body: loadContent('aws-saa/manifest.json') },
    });

    const result = await getManifest('aws-saa');

    assert.equal(isContentError(result), false, `Error inesperado: ${result?.message}`);
    assert.equal(result.certificationId, 'aws-saa');
    assert.equal(result.language, 'es-MX');
    assert.ok(Array.isArray(result.modules));
    assert.ok(result.modules.length >= 1);
    assert.equal(result.modules[0].id, 'iam');
  });

  it('retorna error para una certificación que no existe en el catálogo', async () => {
    mockFetch({
      'catalog.json': { body: loadContent('catalog.json') },
    });

    const result = await getManifest('certificacion-inexistente');

    assert.equal(isContentError(result), true);
    assert.ok(result.message.toLowerCase().includes('no encontrada') ||
              result.message.toLowerCase().includes('certificación'));
  });

  it('retorna error para una certificación deshabilitada', async () => {
    const catalogWithDisabled = JSON.stringify({
      schemaVersion: '1.0',
      certifications: [{
        id: 'disabled-cert',
        name: 'Disabled',
        description: 'Test',
        manifest: 'disabled-cert/manifest.json',
        enabled: false,
      }],
    });
    mockFetch({ 'catalog.json': { body: catalogWithDisabled } });

    const result = await getManifest('disabled-cert');

    assert.equal(isContentError(result), true);
    assert.ok(result.message.toLowerCase().includes('deshabilitada') ||
              result.message.toLowerCase().includes('disabled'));
  });

  it('usa caché en la segunda llamada al manifest', async () => {
    let manifestFetchCount = 0;
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('catalog.json')) {
        return { ok: true, status: 200, text: async () => loadContent('catalog.json') };
      }
      if (u.includes('manifest.json')) {
        manifestFetchCount++;
        return { ok: true, status: 200, text: async () => loadContent('aws-saa/manifest.json') };
      }
      return { ok: false, status: 404, text: async () => '' };
    };

    await getManifest('aws-saa');
    await getManifest('aws-saa');

    assert.equal(manifestFetchCount, 1, 'manifest.json debería descargarse solo una vez');
  });

});

// ══════════════════════════════════════════════════════════════════
// getModule
// ══════════════════════════════════════════════════════════════════

describe('getModule', () => {

  it('carga y valida el módulo IAM real del proyecto', async () => {
    mockFetch({
      'catalog.json':   { body: loadContent('catalog.json') },
      'manifest.json':  { body: loadContent('aws-saa/manifest.json') },
      '01-iam.json':    { body: loadContent('aws-saa/modules/01-iam.json') },
    });

    const result = await getModule('aws-saa', 'iam');

    assert.equal(isContentError(result), false, `Error inesperado: ${result?.message}`);
    assert.equal(result.type, 'study-module');
    assert.equal(result.certificationId, 'aws-saa');
    assert.equal(result.language, 'es-MX');
    assert.equal(result.module.id, 'iam');
    assert.ok(Array.isArray(result.flashcards));
    assert.ok(result.flashcards.length >= 5);
    assert.ok(isObject(result.quiz));
    assert.ok(Array.isArray(result.quiz.questions));
    assert.ok(result.quiz.questions.length >= 3);
  });

  it('las flashcards tienen todos los campos requeridos', async () => {
    mockFetch({
      'catalog.json':  { body: loadContent('catalog.json') },
      'manifest.json': { body: loadContent('aws-saa/manifest.json') },
      '01-iam.json':   { body: loadContent('aws-saa/modules/01-iam.json') },
    });

    const result = await getModule('aws-saa', 'iam');
    assert.equal(isContentError(result), false);

    result.flashcards.forEach((card, i) => {
      assert.ok(typeof card.id === 'string' && card.id.length > 0,
        `flashcard[${i}].id requerido`);
      assert.ok(typeof card.question === 'string' && card.question.length > 0,
        `flashcard[${i}].question requerido`);
      assert.ok(typeof card.answer === 'string' && card.answer.length > 0,
        `flashcard[${i}].answer requerido`);
    });
  });

  it('retorna error para un módulo que no existe en el manifest', async () => {
    mockFetch({
      'catalog.json':  { body: loadContent('catalog.json') },
      'manifest.json': { body: loadContent('aws-saa/manifest.json') },
    });

    const result = await getModule('aws-saa', 'modulo-inexistente');

    assert.equal(isContentError(result), true);
    assert.ok(result.message.toLowerCase().includes('no encontrado') ||
              result.message.toLowerCase().includes('módulo'));
  });

  it('retorna error cuando el archivo del módulo responde 404', async () => {
    mockFetch({
      'catalog.json':  { body: loadContent('catalog.json') },
      'manifest.json': { body: loadContent('aws-saa/manifest.json') },
      '01-iam.json':   { status: 404, body: 'Not Found' },
    });

    const result = await getModule('aws-saa', 'iam');

    assert.equal(isContentError(result), true);
  });

  it('retorna error cuando el módulo no cumple el schema', async () => {
    const invalidModule = JSON.stringify({
      schemaVersion: '1.0',
      type: 'study-module',
      certificationId: 'aws-saa',
      language: 'es-MX',
      module: { id: 'iam', order: 1, name: 'IAM' },
      flashcards: [], // vacío — viola minItems: 1
      quiz: { passingScore: 80, questions: [] },
    });

    mockFetch({
      'catalog.json':  { body: loadContent('catalog.json') },
      'manifest.json': { body: loadContent('aws-saa/manifest.json') },
      '01-iam.json':   { body: invalidModule },
    });

    const result = await getModule('aws-saa', 'iam');

    assert.equal(isContentError(result), true);
    assert.ok(result.details && result.details.length > 0);
  });

  it('usa caché: el mismo módulo no se descarga dos veces', async () => {
    let moduleFetchCount = 0;
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('catalog.json'))  return { ok: true, status: 200, text: async () => loadContent('catalog.json') };
      if (u.includes('manifest.json')) return { ok: true, status: 200, text: async () => loadContent('aws-saa/manifest.json') };
      if (u.includes('01-iam.json'))   { moduleFetchCount++; return { ok: true, status: 200, text: async () => loadContent('aws-saa/modules/01-iam.json') }; }
      return { ok: false, status: 404, text: async () => '' };
    };

    await getModule('aws-saa', 'iam');
    await getModule('aws-saa', 'iam');

    assert.equal(moduleFetchCount, 1, 'El módulo debería descargarse solo una vez');
  });

});

// ══════════════════════════════════════════════════════════════════
// isContentError
// ══════════════════════════════════════════════════════════════════

describe('isContentError', () => {

  it('retorna true para un objeto de error', () => {
    assert.equal(isContentError({ error: true, message: 'test' }), true);
  });

  it('retorna false para un objeto de datos válido', () => {
    assert.equal(isContentError({ schemaVersion: '1.0', certifications: [] }), false);
  });

  it('retorna false para null', () => {
    assert.equal(isContentError(null), false);
  });

  it('retorna false para string', () => {
    assert.equal(isContentError('error'), false);
  });

});

// ── Helper local ─────────────────────────────────────────────────
function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ══════════════════════════════════════════════════════════════════
// contentVersion — validación en content-loader (Fase 15)
// ══════════════════════════════════════════════════════════════════

describe('content-loader — contentVersion', () => {

  beforeEach(() => clearCache());

  it('el manifest.json real incluye contentVersion válido', () => {
    const manifest = JSON.parse(loadContent('aws-saa/manifest.json'));
    assert.ok(typeof manifest.contentVersion === 'string');
    assert.ok(/^\d+\.\d+\.\d+$/.test(manifest.contentVersion),
      `contentVersion "${manifest.contentVersion}" no es semver`);
  });

  it('el módulo 01-iam.json real incluye contentVersion válido', () => {
    const mod = JSON.parse(loadContent('aws-saa/modules/01-iam.json'));
    assert.ok(typeof mod.contentVersion === 'string');
    assert.ok(/^\d+\.\d+\.\d+$/.test(mod.contentVersion));
  });

  it('el módulo 02-ec2.json real incluye contentVersion válido', () => {
    const mod = JSON.parse(loadContent('aws-saa/modules/02-ec2.json'));
    assert.ok(typeof mod.contentVersion === 'string');
    assert.ok(/^\d+\.\d+\.\d+$/.test(mod.contentVersion));
  });

  it('retorna error cuando el manifest no tiene contentVersion', async () => {
    const manifestSinCV = JSON.parse(loadContent('aws-saa/manifest.json'));
    delete manifestSinCV.contentVersion;

    mockFetch2({
      'catalog.json':  { body: loadContent('catalog.json') },
      'manifest.json': { body: JSON.stringify(manifestSinCV) },
    });

    const result = await getManifest('aws-saa');
    assert.equal(isContentError(result), true, 'Debería fallar sin contentVersion');
  });

  it('retorna error cuando el módulo no tiene contentVersion', async () => {
    const moduleSinCV = JSON.parse(loadContent('aws-saa/modules/01-iam.json'));
    delete moduleSinCV.contentVersion;

    mockFetch2({
      'catalog.json':  { body: loadContent('catalog.json') },
      'manifest.json': { body: loadContent('aws-saa/manifest.json') },
      '01-iam.json':   { body: JSON.stringify(moduleSinCV) },
    });

    const result = await getModule('aws-saa', 'iam');
    assert.equal(isContentError(result), true, 'Debería fallar sin contentVersion');
  });

  it('los IDs de flashcards son únicos dentro del módulo IAM', () => {
    const mod = JSON.parse(loadContent('aws-saa/modules/01-iam.json'));
    const ids = mod.flashcards.map(f => f.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'IDs de flashcards no son únicos');
  });

  it('los IDs de preguntas son únicos dentro del quiz IAM', () => {
    const mod = JSON.parse(loadContent('aws-saa/modules/01-iam.json'));
    const ids = mod.quiz.questions.map(q => q.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'IDs de preguntas no son únicos');
  });

  it('todos los correctAnswers referencian IDs de opciones existentes', () => {
    const mod = JSON.parse(loadContent('aws-saa/modules/01-iam.json'));
    for (const q of mod.quiz.questions) {
      const optionIds = new Set(q.options.map(o => o.id));
      for (const ans of q.correctAnswers) {
        assert.ok(optionIds.has(ans),
          `Pregunta ${q.id}: correctAnswer "${ans}" no existe en options`);
      }
    }
  });

  it('el examen final tiene todas las preguntas con moduleId definido', () => {
    const exam = JSON.parse(loadContent('aws-saa/exams/final.json'));
    for (const q of exam.questions) {
      assert.ok(typeof q.moduleId === 'string' && q.moduleId.length > 0,
        `Pregunta ${q.id} del examen no tiene moduleId`);
    }
  });

});

function mockFetch2(urlMap) {
  global.fetch = async (url) => {
    const normalizedUrl = String(url).replace(/^\.\//, '');
    const key = Object.keys(urlMap).find(k => normalizedUrl.includes(k));
    if (!key) return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
    const { status = 200, body } = urlMap[key];
    return { ok: status < 300, status, statusText: 'OK', text: async () => body };
  };
}

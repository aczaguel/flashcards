/**
 * validators.js
 * Validador custom de archivos JSON contra Study Content Schema v1.
 *
 * No implementa el estándar JSON Schema completo — valida estructura,
 * tipos y campos requeridos de forma directa y sin dependencias externas.
 *
 * API principal:
 *   validate(data, schemaName) → { valid: boolean, errors: string[] }
 *
 * Schemas soportados:
 *   'catalog'                  → catalog.json
 *   'certification-manifest'   → manifest.json  (requiere contentVersion)
 *   'module'                   → module.json     (requiere contentVersion)
 *   'exam'                     → exam.json
 *   'progress-export'          → study-progress.json
 *
 * v1.2: Agregado contentVersion (semver) a certification-manifest y module.
 *       Actualizado validateProgressExport para schema formal con exportVersion y data{}.
 */

import { SUPPORTED_SCHEMA_VERSIONS } from '../config.js';

// ── Helpers internos ────────────────────────────────────────────

/**
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

function err(errors, message) {
  errors.push(message);
}

function isString(v)  { return typeof v === 'string'; }
function isBoolean(v) { return typeof v === 'boolean'; }
function isNumber(v)  { return typeof v === 'number' && !isNaN(v); }
function isInteger(v) { return Number.isInteger(v); }
function isArray(v)   { return Array.isArray(v); }
function isObject(v)  { return v !== null && typeof v === 'object' && !Array.isArray(v); }

const ID_PATTERN        = /^[a-z0-9-]+$/;
const BCP47_PATTERN     = /^[a-z]{2}(-[A-Z]{2})?$/;
const VERSION_PATTERN   = /^\d+\.\d+$/;
const SEMVER_PATTERN    = /^\d+\.\d+\.\d+$/;
const FLASHCARD_ID_PAT  = /^[a-z0-9-]+-\d{3,}$/;
const QUESTION_ID_PAT   = /^[a-z0-9-]+-q\d{3,}$/;

/**
 * Verifica que la schemaVersion sea soportada.
 */
function validateSchemaVersion(data, errors) {
  if (!isString(data.schemaVersion)) {
    err(errors, 'schemaVersion es requerido y debe ser un string (Ej: "1.0")');
    return false;
  }
  if (!VERSION_PATTERN.test(data.schemaVersion)) {
    err(errors, `schemaVersion "${data.schemaVersion}" no tiene formato válido (Ej: "1.0")`);
    return false;
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(data.schemaVersion)) {
    err(errors, `schemaVersion "${data.schemaVersion}" no es compatible. Versiones soportadas: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}`);
    return false;
  }
  return true;
}

// ── Validadores por tipo ─────────────────────────────────────────

/**
 * Valida contentVersion (semver: MAJOR.MINOR.PATCH).
 * Requerido en certification-manifest y module.
 */
function validateContentVersion(data, errors) {
  if (!isString(data.contentVersion) || !SEMVER_PATTERN.test(data.contentVersion)) {
    err(errors, `contentVersion es requerido y debe seguir semver (Ej: "1.0.0"). Recibido: "${data.contentVersion ?? 'undefined'}"`);
    return false;
  }
  return true;
}

/**
 * Valida catalog.json
 */
function validateCatalog(data, errors) {
  if (!isObject(data)) { err(errors, 'El catálogo debe ser un objeto JSON'); return; }
  validateSchemaVersion(data, errors);

  if (!isArray(data.certifications)) {
    err(errors, 'certifications es requerido y debe ser un array');
    return;
  }

  data.certifications.forEach((cert, i) => {
    const prefix = `certifications[${i}]`;

    if (!isObject(cert)) { err(errors, `${prefix} debe ser un objeto`); return; }

    if (!isString(cert.id) || !ID_PATTERN.test(cert.id))
      err(errors, `${prefix}.id es requerido y debe ser kebab-case (Ej: "aws-saa")`);

    if (!isString(cert.name) || cert.name.length === 0)
      err(errors, `${prefix}.name es requerido`);

    if (!isString(cert.description) || cert.description.length === 0)
      err(errors, `${prefix}.description es requerido`);

    if (!isString(cert.manifest) || cert.manifest.length === 0)
      err(errors, `${prefix}.manifest es requerido (Ej: "aws-saa/manifest.json")`);

    if (!isBoolean(cert.enabled))
      err(errors, `${prefix}.enabled es requerido y debe ser boolean`);
  });
}

/**
 * Valida certification manifest.json
 */
function validateCertificationManifest(data, errors) {
  if (!isObject(data)) { err(errors, 'El manifest debe ser un objeto JSON'); return; }
  validateSchemaVersion(data, errors);
  validateContentVersion(data, errors);

  if (!isString(data.certificationId) || !ID_PATTERN.test(data.certificationId))
    err(errors, 'certificationId es requerido y debe ser kebab-case');

  if (!isString(data.name) || data.name.length === 0)
    err(errors, 'name es requerido');

  if (!isString(data.description) || data.description.length === 0)
    err(errors, 'description es requerido');

  if (!isString(data.language) || !BCP47_PATTERN.test(data.language))
    err(errors, 'language es requerido y debe ser BCP 47 (Ej: "es-MX", "en-US")');

  if (!isArray(data.modules) || data.modules.length === 0)
    err(errors, 'modules es requerido y debe tener al menos 1 módulo');
  else {
    data.modules.forEach((mod, i) => {
      const prefix = `modules[${i}]`;
      if (!isObject(mod)) { err(errors, `${prefix} debe ser un objeto`); return; }

      if (!isString(mod.id) || !ID_PATTERN.test(mod.id))
        err(errors, `${prefix}.id es requerido y debe ser kebab-case`);

      if (!isInteger(mod.order) || mod.order < 1)
        err(errors, `${prefix}.order es requerido y debe ser un entero >= 1`);

      if (!isString(mod.name) || mod.name.length === 0)
        err(errors, `${prefix}.name es requerido`);

      if (!isString(mod.file) || mod.file.length === 0)
        err(errors, `${prefix}.file es requerido`);
    });
  }

  if (!isArray(data.exams))
    err(errors, 'exams es requerido (puede ser un array vacío [])');
  else {
    data.exams.forEach((exam, i) => {
      const prefix = `exams[${i}]`;
      if (!isObject(exam)) { err(errors, `${prefix} debe ser un objeto`); return; }

      if (!isString(exam.id) || !ID_PATTERN.test(exam.id))
        err(errors, `${prefix}.id es requerido y debe ser kebab-case`);

      if (!isString(exam.name) || exam.name.length === 0)
        err(errors, `${prefix}.name es requerido`);

      if (!isString(exam.file) || exam.file.length === 0)
        err(errors, `${prefix}.file es requerido`);
    });
  }
}

/**
 * Valida una pregunta de quiz o examen.
 */
function validateQuestion(q, prefix, errors) {
  if (!isObject(q)) { err(errors, `${prefix} debe ser un objeto`); return; }

  if (!isString(q.id) || !QUESTION_ID_PAT.test(q.id))
    err(errors, `${prefix}.id debe tener formato {moduleId}-q{NNN} (Ej: "iam-q001")`);

  const validTypes = ['single-choice', 'multiple-choice', 'true-false'];
  if (!isString(q.type) || !validTypes.includes(q.type))
    err(errors, `${prefix}.type debe ser uno de: ${validTypes.join(', ')}`);

  if (!isString(q.question) || q.question.length === 0)
    err(errors, `${prefix}.question es requerido`);

  if (!isArray(q.options) || q.options.length < 2)
    err(errors, `${prefix}.options debe tener al menos 2 opciones`);
  else {
    q.options.forEach((opt, oi) => {
      if (!isObject(opt)) { err(errors, `${prefix}.options[${oi}] debe ser un objeto`); return; }
      if (!isString(opt.id) || opt.id.length === 0)
        err(errors, `${prefix}.options[${oi}].id es requerido`);
      if (!isString(opt.text) || opt.text.length === 0)
        err(errors, `${prefix}.options[${oi}].text es requerido`);
    });
  }

  if (!isArray(q.correctAnswers) || q.correctAnswers.length === 0)
    err(errors, `${prefix}.correctAnswers es requerido y debe tener al menos 1 elemento`);
}

/**
 * Valida module.json
 */
function validateModule(data, errors) {
  if (!isObject(data)) { err(errors, 'El módulo debe ser un objeto JSON'); return; }
  validateSchemaVersion(data, errors);
  validateContentVersion(data, errors);

  if (data.type !== 'study-module')
    err(errors, 'type debe ser "study-module"');

  if (!isString(data.certificationId) || !ID_PATTERN.test(data.certificationId))
    err(errors, 'certificationId es requerido y debe ser kebab-case');

  if (!isString(data.language) || !BCP47_PATTERN.test(data.language))
    err(errors, 'language es requerido y debe ser BCP 47 (Ej: "es-MX")');

  // module metadata
  if (!isObject(data.module)) {
    err(errors, 'module es requerido y debe ser un objeto');
  } else {
    const m = data.module;
    if (!isString(m.id) || !ID_PATTERN.test(m.id))
      err(errors, 'module.id es requerido y debe ser kebab-case');
    if (!isInteger(m.order) || m.order < 1)
      err(errors, 'module.order es requerido y debe ser un entero >= 1');
    if (!isString(m.name) || m.name.length === 0)
      err(errors, 'module.name es requerido');
  }

  // flashcards
  if (!isArray(data.flashcards) || data.flashcards.length === 0) {
    err(errors, 'flashcards es requerido y debe tener al menos 1 tarjeta');
  } else {
    data.flashcards.forEach((card, i) => {
      const prefix = `flashcards[${i}]`;
      if (!isObject(card)) { err(errors, `${prefix} debe ser un objeto`); return; }

      if (!isString(card.id) || !FLASHCARD_ID_PAT.test(card.id))
        err(errors, `${prefix}.id debe tener formato {moduleId}-{NNN} (Ej: "iam-001")`);

      if (!isString(card.question) || card.question.length === 0)
        err(errors, `${prefix}.question es requerido`);

      if (!isString(card.answer) || card.answer.length === 0)
        err(errors, `${prefix}.answer es requerido`);

      if (card.difficulty !== undefined) {
        const valid = ['basic', 'intermediate', 'advanced'];
        if (!valid.includes(card.difficulty))
          err(errors, `${prefix}.difficulty debe ser: ${valid.join(', ')}`);
      }
    });
  }

  // quiz
  if (!isObject(data.quiz)) {
    err(errors, 'quiz es requerido y debe ser un objeto');
  } else {
    if (!isInteger(data.quiz.passingScore) || data.quiz.passingScore < 1 || data.quiz.passingScore > 100)
      err(errors, 'quiz.passingScore es requerido y debe ser un entero entre 1 y 100');

    if (!isArray(data.quiz.questions) || data.quiz.questions.length === 0)
      err(errors, 'quiz.questions es requerido y debe tener al menos 1 pregunta');
    else
      data.quiz.questions.forEach((q, i) =>
        validateQuestion(q, `quiz.questions[${i}]`, errors)
      );
  }
}

/**
 * Valida exam.json
 */
function validateExam(data, errors) {
  if (!isObject(data)) { err(errors, 'El examen debe ser un objeto JSON'); return; }
  validateSchemaVersion(data, errors);

  if (data.type !== 'exam')
    err(errors, 'type debe ser "exam"');

  if (!isString(data.certificationId) || !ID_PATTERN.test(data.certificationId))
    err(errors, 'certificationId es requerido y debe ser kebab-case');

  if (!isString(data.language) || !BCP47_PATTERN.test(data.language))
    err(errors, 'language es requerido y debe ser BCP 47 (Ej: "es-MX")');

  if (!isObject(data.exam)) {
    err(errors, 'exam es requerido y debe ser un objeto');
  } else {
    const e = data.exam;
    if (!isString(e.id) || !ID_PATTERN.test(e.id))
      err(errors, 'exam.id es requerido y debe ser kebab-case');
    if (!isString(e.name) || e.name.length === 0)
      err(errors, 'exam.name es requerido');
    if (!isInteger(e.passingScore) || e.passingScore < 1 || e.passingScore > 100)
      err(errors, 'exam.passingScore es requerido y debe ser un entero entre 1 y 100');
  }

  if (!isArray(data.questions) || data.questions.length === 0)
    err(errors, 'questions es requerido y debe tener al menos 1 pregunta');
  else
    data.questions.forEach((q, i) =>
      validateQuestion(q, `questions[${i}]`, errors)
    );
}

/**
 * Valida study-progress.json (export/import) — schema v1.2.
 *
 * Formato esperado:
 * {
 *   schemaVersion: "1.0",
 *   exportVersion: "1",
 *   appVersion: string,
 *   exportedAt: string (ISO 8601),
 *   data: {
 *     flashcardProgress: [],
 *     flashcardReviews:  [],
 *     quizAttempts:      [],
 *     examAttempts:      [],
 *     studySettings:     [],
 *     studyState:        []
 *   }
 * }
 */
function validateProgressExport(data, errors) {
  if (!isObject(data)) { err(errors, 'El archivo de progreso debe ser un objeto JSON'); return; }
  validateSchemaVersion(data, errors);

  // exportVersion — entero como string, actualmente "1"
  if (!isString(data.exportVersion) || !/^\d+$/.test(data.exportVersion))
    err(errors, 'exportVersion es requerido y debe ser un entero como string (Ej: "1")');

  if (!isString(data.appVersion) || data.appVersion.length === 0)
    err(errors, 'appVersion es requerido');

  if (!isString(data.exportedAt) || data.exportedAt.length === 0)
    err(errors, 'exportedAt es requerido (ISO 8601)');

  // data object con los stores
  if (!isObject(data.data)) {
    err(errors, 'data es requerido y debe ser un objeto con los stores');
    return;
  }

  const requiredStores = [
    'flashcardProgress',
    'flashcardReviews',
    'quizAttempts',
    'examAttempts',
    'studySettings',
    'studyState',
  ];

  for (const store of requiredStores) {
    if (!isArray(data.data[store]))
      err(errors, `data.${store} es requerido y debe ser un array`);
  }
}

// ── API pública ─────────────────────────────────────────────────

const VALIDATORS = {
  'catalog':                  validateCatalog,
  'certification-manifest':   validateCertificationManifest,
  'module':                   validateModule,
  'exam':                     validateExam,
  'progress-export':          validateProgressExport,
};

/**
 * Valida un objeto de datos contra un schema conocido.
 *
 * @param {unknown}  data        - Objeto JS ya parseado (no string JSON)
 * @param {string}   schemaName  - 'catalog' | 'certification-manifest' | 'module' | 'exam' | 'progress-export'
 * @returns {ValidationResult}
 */
export function validate(data, schemaName) {
  const validator = VALIDATORS[schemaName];
  if (!validator) {
    return {
      valid: false,
      errors: [`Schema desconocido: "${schemaName}". Schemas válidos: ${Object.keys(VALIDATORS).join(', ')}`],
    };
  }

  const errors = [];
  validator(data, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parsea y valida un string JSON.
 * Retorna el objeto parseado si es válido, o null con errores si falla.
 *
 * @param {string}   jsonString
 * @param {string}   schemaName
 * @param {string}   [sourcePath]  - Para mensajes de error más descriptivos
 * @returns {{ data: object|null, valid: boolean, errors: string[] }}
 */
export function parseAndValidate(jsonString, schemaName, sourcePath = '') {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return {
      data: null,
      valid: false,
      errors: [`JSON inválido${sourcePath ? ` en ${sourcePath}` : ''}: ${e.message}`],
    };
  }

  const result = validate(data, schemaName);
  return { data: result.valid ? data : null, ...result };
}

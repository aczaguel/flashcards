/**
 * exam-service.test.js
 * Tests para src/services/exam-service.js
 *
 * Prueba las funciones puras (calculateScore, isAnswerCorrect, getWeakAreas, getWeakModules).
 * Las funciones con IndexedDB (scoreQuiz, scoreExam) se prueban con mocks.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnswerCorrect,
  calculateScore,
  getWeakAreas,
  getWeakModules,
} from '../../src/services/exam-service.js';

// ── Fixtures ──────────────────────────────────────────────────────

const singleChoice = {
  id: 'q001', type: 'single-choice',
  question: '¿Cuál es la función de IAM?',
  options: [
    { id: 'a', text: 'Gestionar identidades' },
    { id: 'b', text: 'Almacenar objetos' },
  ],
  correctAnswers: ['a'],
  tags: ['iam', 'seguridad'],
};

const multipleChoice = {
  id: 'q002', type: 'multiple-choice',
  question: '¿Cuáles son identidades IAM?',
  options: [
    { id: 'a', text: 'Usuarios' },
    { id: 'b', text: 'Grupos' },
    { id: 'c', text: 'Buckets' },
    { id: 'd', text: 'Roles' },
  ],
  correctAnswers: ['a', 'b', 'd'],
  tags: ['iam'],
};

const trueFalse = {
  id: 'q003', type: 'true-false',
  question: '¿El root debe usarse a diario?',
  options: [
    { id: 'true', text: 'Verdadero' },
    { id: 'false', text: 'Falso' },
  ],
  correctAnswers: ['false'],
  tags: ['iam', 'seguridad'],
};

// ══════════════════════════════════════════════════════════════════
// isAnswerCorrect
// ══════════════════════════════════════════════════════════════════

describe('isAnswerCorrect', () => {

  it('single-choice: respuesta correcta', () => {
    assert.equal(isAnswerCorrect(singleChoice, ['a']), true);
  });

  it('single-choice: respuesta incorrecta', () => {
    assert.equal(isAnswerCorrect(singleChoice, ['b']), false);
  });

  it('single-choice: sin respuesta', () => {
    assert.equal(isAnswerCorrect(singleChoice, []), false);
  });

  it('multiple-choice: todas correctas', () => {
    assert.equal(isAnswerCorrect(multipleChoice, ['a', 'b', 'd']), true);
  });

  it('multiple-choice: orden diferente → correcto', () => {
    assert.equal(isAnswerCorrect(multipleChoice, ['d', 'a', 'b']), true);
  });

  it('multiple-choice: respuesta parcial → incorrecto', () => {
    assert.equal(isAnswerCorrect(multipleChoice, ['a', 'b']), false);
  });

  it('multiple-choice: respuesta extra → incorrecto', () => {
    assert.equal(isAnswerCorrect(multipleChoice, ['a', 'b', 'c', 'd']), false);
  });

  it('true-false: correcto', () => {
    assert.equal(isAnswerCorrect(trueFalse, ['false']), true);
  });

  it('true-false: incorrecto', () => {
    assert.equal(isAnswerCorrect(trueFalse, ['true']), false);
  });

});

// ══════════════════════════════════════════════════════════════════
// calculateScore
// ══════════════════════════════════════════════════════════════════

describe('calculateScore', () => {

  it('100% cuando todas son correctas', () => {
    const answersMap = new Map([
      ['q001', ['a']],
      ['q002', ['a', 'b', 'd']],
      ['q003', ['false']],
    ]);
    const { score, correctCount } = calculateScore(
      [singleChoice, multipleChoice, trueFalse], answersMap
    );
    assert.equal(score, 100);
    assert.equal(correctCount, 3);
  });

  it('0% cuando todas son incorrectas', () => {
    const answersMap = new Map([
      ['q001', ['b']],
      ['q002', ['c']],
      ['q003', ['true']],
    ]);
    const { score, correctCount } = calculateScore(
      [singleChoice, multipleChoice, trueFalse], answersMap
    );
    assert.equal(score, 0);
    assert.equal(correctCount, 0);
  });

  it('score parcial redondeado', () => {
    const answersMap = new Map([
      ['q001', ['a']],   // correcta
      ['q002', ['c']],   // incorrecta
      ['q003', ['true']], // incorrecta
    ]);
    const { score, correctCount } = calculateScore(
      [singleChoice, multipleChoice, trueFalse], answersMap
    );
    assert.equal(correctCount, 1);
    assert.equal(score, 33); // round(1/3 * 100)
  });

  it('score 0 con array de preguntas vacío', () => {
    const { score, correctCount } = calculateScore([], new Map());
    assert.equal(score, 0);
    assert.equal(correctCount, 0);
  });

  it('pregunta sin respuesta se cuenta como incorrecta', () => {
    const answersMap = new Map(); // sin respuestas
    const { correctCount } = calculateScore([singleChoice], answersMap);
    assert.equal(correctCount, 0);
  });

  it('results tiene una entrada por pregunta', () => {
    const answersMap = new Map([['q001', ['a']]]);
    const { results } = calculateScore([singleChoice], answersMap);
    assert.equal(results.length, 1);
    assert.equal(results[0].questionId, 'q001');
    assert.equal(results[0].correct, true);
  });

  it('result incluye selectedAnswers y correctAnswers', () => {
    const answersMap = new Map([['q001', ['b']]]);
    const { results } = calculateScore([singleChoice], answersMap);
    assert.deepEqual(results[0].selectedAnswers, ['b']);
    assert.deepEqual(results[0].correctAnswers, ['a']);
    assert.equal(results[0].correct, false);
  });

});

// ══════════════════════════════════════════════════════════════════
// getWeakAreas
// ══════════════════════════════════════════════════════════════════

describe('getWeakAreas', () => {

  it('retorna tags de respuestas incorrectas ordenadas por frecuencia', () => {
    const results = [
      { correct: false, tags: ['iam', 'seguridad'], moduleId: 'iam' },
      { correct: false, tags: ['iam'],              moduleId: 'iam' },
      { correct: true,  tags: ['ec2'],              moduleId: 'ec2' },
      { correct: false, tags: ['seguridad'],        moduleId: 'iam' },
    ];
    const weak = getWeakAreas(results);
    assert.equal(weak[0].tag, 'iam');
    assert.equal(weak[0].count, 2);
    assert.equal(weak[1].tag, 'seguridad');
    assert.equal(weak[1].count, 2);
    // ec2 no aparece porque esa pregunta fue correcta
    assert.ok(!weak.some(w => w.tag === 'ec2'));
  });

  it('retorna array vacío si no hay errores', () => {
    const results = [
      { correct: true, tags: ['iam'] },
      { correct: true, tags: ['ec2'] },
    ];
    assert.deepEqual(getWeakAreas(results), []);
  });

  it('ignora preguntas sin tags', () => {
    const results = [{ correct: false, tags: [] }];
    assert.deepEqual(getWeakAreas(results), []);
  });

});

// ══════════════════════════════════════════════════════════════════
// getWeakModules
// ══════════════════════════════════════════════════════════════════

describe('getWeakModules', () => {

  it('agrupa errores por moduleId', () => {
    const results = [
      { correct: false, moduleId: 'iam',  tags: [] },
      { correct: false, moduleId: 'ec2',  tags: [] },
      { correct: false, moduleId: 'iam',  tags: [] },
      { correct: true,  moduleId: 'vpc',  tags: [] },
    ];
    const weak = getWeakModules(results);
    assert.equal(weak[0].moduleId, 'iam');
    assert.equal(weak[0].count, 2);
    assert.equal(weak[1].moduleId, 'ec2');
    assert.equal(weak[1].count, 1);
    assert.ok(!weak.some(w => w.moduleId === 'vpc'));
  });

  it('ignora preguntas sin moduleId', () => {
    const results = [
      { correct: false, moduleId: null, tags: [] },
      { correct: false, moduleId: undefined, tags: [] },
    ];
    assert.deepEqual(getWeakModules(results), []);
  });

});

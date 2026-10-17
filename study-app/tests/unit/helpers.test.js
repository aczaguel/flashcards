/**
 * helpers.test.js
 * Tests para src/utils/helpers.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  shuffleArray, escapeHtml, formatPercent,
  clamp, makeProgressKey, truncate,
} from '../../src/utils/helpers.js';

describe('shuffleArray', () => {
  it('retorna el mismo array (in-place)', () => {
    const arr      = [1, 2, 3, 4, 5];
    const returned = shuffleArray(arr);
    assert.strictEqual(returned, arr);
  });

  it('mantiene los mismos elementos', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffleArray(arr);
    assert.deepEqual([...arr].sort(), [1, 2, 3, 4, 5]);
  });

  it('array de 1 elemento no cambia', () => {
    const arr = [42];
    shuffleArray(arr);
    assert.deepEqual(arr, [42]);
  });

  it('array vacío no lanza error', () => {
    assert.doesNotThrow(() => shuffleArray([]));
  });
});

describe('escapeHtml', () => {
  it('escapa < > & " \'', () => {
    assert.equal(escapeHtml('<b>test</b>'), '&lt;b&gt;test&lt;/b&gt;');
    assert.equal(escapeHtml('a & b'), 'a &amp; b');
    assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
    assert.equal(escapeHtml("it's"), 'it&#039;s');
  });

  it('cadena sin caracteres especiales no cambia', () => {
    assert.equal(escapeHtml('hello world'), 'hello world');
  });

  it('retorna cadena vacía para no-string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(123), '');
  });

  it('previene XSS básico', () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped   = escapeHtml(malicious);
    assert.ok(!escaped.includes('<script>'));
    assert.ok(escaped.includes('&lt;script&gt;'));
  });
});

describe('formatPercent', () => {
  it('formatea entero sin decimales por defecto', () => {
    assert.equal(formatPercent(75), '75%');
    assert.equal(formatPercent(0),  '0%');
    assert.equal(formatPercent(100),'100%');
  });

  it('redondea al entero más cercano', () => {
    assert.equal(formatPercent(33.3), '33%');
    assert.equal(formatPercent(66.7), '67%');
  });

  it('retorna 0% para NaN o null', () => {
    assert.equal(formatPercent(NaN),  '0%');
    assert.equal(formatPercent(null), '0%');
  });
});

describe('clamp', () => {
  it('retorna el valor si está dentro del rango', () => {
    assert.equal(clamp(5, 0, 10), 5);
  });

  it('retorna min si el valor es menor', () => {
    assert.equal(clamp(-5, 0, 10), 0);
  });

  it('retorna max si el valor es mayor', () => {
    assert.equal(clamp(15, 0, 10), 10);
  });

  it('funciona con valores límite', () => {
    assert.equal(clamp(0,   0, 10), 0);
    assert.equal(clamp(10,  0, 10), 10);
  });
});

describe('makeProgressKey', () => {
  it('construye la clave correcta', () => {
    assert.equal(
      makeProgressKey('aws-saa', 'iam', 'iam-001'),
      'aws-saa::iam::iam-001'
    );
  });

  it('clave es determinista', () => {
    const k1 = makeProgressKey('c1', 'm1', 'f1');
    const k2 = makeProgressKey('c1', 'm1', 'f1');
    assert.equal(k1, k2);
  });

  it('claves con mismo moduleId pero diferente certId son distintas', () => {
    const k1 = makeProgressKey('aws-saa', 'iam', 'iam-001');
    const k2 = makeProgressKey('aws-dev', 'iam', 'iam-001');
    assert.notEqual(k1, k2);
  });
});

describe('truncate', () => {
  it('no trunca si cabe', () => {
    assert.equal(truncate('hello', 10), 'hello');
  });

  it('trunca y agrega …', () => {
    assert.equal(truncate('hello world', 8), 'hello w…');
  });

  it('retorna cadena vacía para no-string', () => {
    assert.equal(truncate(null, 10), '');
  });
});

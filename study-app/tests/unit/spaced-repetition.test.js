/**
 * spaced-repetition.test.js
 * Tests para src/utils/spaced-repetition.js
 *
 * Ejecutar: node --test tests/unit/spaced-repetition.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateNextReview,
  updateStreak,
  MAX_INTERVAL,
} from '../../src/utils/spaced-repetition.js';

// ── Helpers ──────────────────────────────────────────────────────

function days(result) {
  return result.intervalDays;
}

function nextReviewIsAfterNow(result) {
  return new Date(result.nextReview) > new Date();
}

// ══════════════════════════════════════════════════════════════════
// calculateNextReview — intervalos
// ══════════════════════════════════════════════════════════════════

describe('calculateNextReview — intervalos', () => {

  it('UNKNOWN → siempre 1 día sin importar el intervalo anterior', () => {
    assert.equal(days(calculateNextReview('UNKNOWN', 1)),  1);
    assert.equal(days(calculateNextReview('UNKNOWN', 30)), 1);
    assert.equal(days(calculateNextReview('UNKNOWN', 60)), 1);
  });

  it('HARD → siempre 2 días sin importar el intervalo anterior', () => {
    assert.equal(days(calculateNextReview('HARD', 1)),  2);
    assert.equal(days(calculateNextReview('HARD', 20)), 2);
    assert.equal(days(calculateNextReview('HARD', 60)), 2);
  });

  it('GOOD → max(3, prev * 2)', () => {
    assert.equal(days(calculateNextReview('GOOD', 1)),  3);   // max(3, 2)=3
    assert.equal(days(calculateNextReview('GOOD', 2)),  4);   // max(3, 4)=4
    assert.equal(days(calculateNextReview('GOOD', 3)),  6);
    assert.equal(days(calculateNextReview('GOOD', 6)),  12);
    assert.equal(days(calculateNextReview('GOOD', 30)), 60);  // techo
  });

  it('EASY → max(7, round(prev * 2.5))', () => {
    assert.equal(days(calculateNextReview('EASY', 1)),  7);   // max(7, 3)=7
    assert.equal(days(calculateNextReview('EASY', 3)),  8);   // round(7.5)=8 — wait: max(7, round(3*2.5))=max(7,8)=8
    assert.equal(days(calculateNextReview('EASY', 4)),  10);
    assert.equal(days(calculateNextReview('EASY', 10)), 25);
    assert.equal(days(calculateNextReview('EASY', 24)), 60);  // round(60)=60 — techo
  });

  it('techo de 60 días para GOOD con intervalo grande', () => {
    assert.equal(days(calculateNextReview('GOOD', 100)), MAX_INTERVAL);
  });

  it('techo de 60 días para EASY con intervalo grande', () => {
    assert.equal(days(calculateNextReview('EASY', 50)), MAX_INTERVAL);
  });

  it('tarjeta difícil NO salta a 60 días: reviewCount=20, primera EASY', () => {
    // Escenario del bug que resuelve v1.2:
    // en v1.1 sería 20×7=140→techo 60. En v1.2 parte de intervalDays=1 siempre.
    // Una tarjeta nueva (intervalDays=1) con EASY → 7 días, no 60.
    assert.equal(days(calculateNextReview('EASY', 1)), 7);
  });

  it('nextReview es una fecha ISO en el futuro', () => {
    const result = calculateNextReview('GOOD', 3);
    assert.ok(typeof result.nextReview === 'string');
    assert.ok(nextReviewIsAfterNow(result));
  });

  it('devuelve 1 día con confidence desconocida (fallback)', () => {
    assert.equal(days(calculateNextReview('UNKNOWN_VALUE', 5)), 1);
  });

  it('devuelve intervalDays y nextReview en cada llamada', () => {
    const r = calculateNextReview('GOOD', 3);
    assert.ok('intervalDays' in r);
    assert.ok('nextReview'   in r);
  });

});

// ══════════════════════════════════════════════════════════════════
// calculateNextReview — progresión de intervalos
// ══════════════════════════════════════════════════════════════════

describe('calculateNextReview — progresión real', () => {

  it('GOOD: secuencia 1→3→6→12→24→48→60', () => {
    let interval = 1;
    const expected = [3, 6, 12, 24, 48, 60];
    for (const exp of expected) {
      const result = calculateNextReview('GOOD', interval);
      assert.equal(result.intervalDays, exp, `Con prev=${interval} esperaba ${exp}`);
      interval = result.intervalDays;
    }
  });

  it('EASY: secuencia 1→7→18→45→60', () => {
    let interval = 1;
    const expected = [7, 18, 45, 60]; // round(7*2.5)=18, round(18*2.5)=45, round(45*2.5)=113→60
    for (const exp of expected) {
      const result = calculateNextReview('EASY', interval);
      assert.equal(result.intervalDays, exp, `Con prev=${interval} esperaba ${exp}`);
      interval = result.intervalDays;
    }
  });

});

// ══════════════════════════════════════════════════════════════════
// updateStreak
// ══════════════════════════════════════════════════════════════════

describe('updateStreak', () => {

  it('UNKNOWN resetea streak a 0', () => {
    assert.equal(updateStreak(0,  'UNKNOWN'), 0);
    assert.equal(updateStreak(5,  'UNKNOWN'), 0);
    assert.equal(updateStreak(10, 'UNKNOWN'), 0);
  });

  it('HARD decrementa streak en 1 con mínimo 0', () => {
    assert.equal(updateStreak(0, 'HARD'), 0); // min 0
    assert.equal(updateStreak(1, 'HARD'), 0);
    assert.equal(updateStreak(3, 'HARD'), 2);
    assert.equal(updateStreak(5, 'HARD'), 4);
  });

  it('GOOD incrementa streak en 1', () => {
    assert.equal(updateStreak(0, 'GOOD'), 1);
    assert.equal(updateStreak(2, 'GOOD'), 3);
    assert.equal(updateStreak(9, 'GOOD'), 10);
  });

  it('EASY incrementa streak en 1', () => {
    assert.equal(updateStreak(0, 'EASY'), 1);
    assert.equal(updateStreak(4, 'EASY'), 5);
  });

  it('HARD no convierte en negativo con streak=0', () => {
    assert.equal(updateStreak(0, 'HARD'), 0);
  });

  it('secuencia EASY×2, HARD, EASY → streak correcto', () => {
    let s = 0;
    s = updateStreak(s, 'EASY');   // 1
    s = updateStreak(s, 'EASY');   // 2
    s = updateStreak(s, 'HARD');   // 1  (descuenta, no congela)
    s = updateStreak(s, 'EASY');   // 2
    assert.equal(s, 2);
    // Con la semántica anterior (HARD congela) sería 3 — el bug que corrige v1.2
  });

  it('UNKNOWN en medio de una racha reinicia a 0', () => {
    let s = 7;
    s = updateStreak(s, 'UNKNOWN');
    assert.equal(s, 0);
    s = updateStreak(s, 'GOOD');
    assert.equal(s, 1);
  });

  it('confidence desconocida no modifica streak', () => {
    assert.equal(updateStreak(5, 'INVALID'), 5);
  });

});

// ══════════════════════════════════════════════════════════════════
// Escenarios integrados
// ══════════════════════════════════════════════════════════════════

describe('escenarios integrados', () => {

  it('5 EASY consecutivas → streak=5, interval=60 (techo)', () => {
    let streak = 0, interval = 1;
    for (let i = 0; i < 5; i++) {
      streak   = updateStreak(streak, 'EASY');
      interval = calculateNextReview('EASY', interval).intervalDays;
    }
    assert.equal(streak, 5);
    assert.equal(interval, MAX_INTERVAL);
  });

  it('EASY×3, UNKNOWN → streak=0, interval=1', () => {
    let streak = 0, interval = 1;
    for (let i = 0; i < 3; i++) {
      streak   = updateStreak(streak, 'EASY');
      interval = calculateNextReview('EASY', interval).intervalDays;
    }
    streak   = updateStreak(streak, 'UNKNOWN');
    interval = calculateNextReview('UNKNOWN', interval).intervalDays;

    assert.equal(streak,   0);
    assert.equal(interval, 1);
  });

  it('tarjeta mastered requiere streak>=3 con EASY', () => {
    let streak = 0;
    streak = updateStreak(streak, 'EASY'); // 1
    streak = updateStreak(streak, 'EASY'); // 2
    assert.ok(streak < 3, 'aún no mastered');
    streak = updateStreak(streak, 'EASY'); // 3
    assert.ok(streak >= 3, 'ahora mastered');
  });

});

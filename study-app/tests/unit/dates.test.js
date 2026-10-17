/**
 * dates.test.js
 * Tests para src/utils/dates.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { addDays, isDue, diffDays, formatRelativeDate, nowISO } from '../../src/utils/dates.js';

describe('nowISO', () => {
  it('retorna una cadena ISO 8601 válida', () => {
    const now = nowISO();
    assert.ok(typeof now === 'string');
    assert.ok(!isNaN(new Date(now).getTime()));
  });
});

describe('addDays', () => {
  it('suma días correctamente', () => {
    const base   = '2026-01-01T00:00:00.000Z';
    const result = addDays(base, 7);
    const d      = new Date(result);
    assert.equal(d.getUTCDate(), 8);
  });

  it('suma 0 días retorna la misma fecha', () => {
    const base   = '2026-06-15T12:00:00.000Z';
    const result = addDays(base, 0);
    assert.equal(new Date(result).getUTCDate(), 15);
  });

  it('suma días negativos (resta)', () => {
    const base   = '2026-06-15T00:00:00.000Z';
    const result = addDays(base, -3);
    assert.equal(new Date(result).getUTCDate(), 12);
  });

  it('retorna una cadena ISO 8601', () => {
    const result = addDays('2026-01-01T00:00:00.000Z', 1);
    assert.ok(typeof result === 'string');
    assert.ok(!isNaN(new Date(result).getTime()));
  });
});

describe('isDue', () => {
  it('retorna true para fecha en el pasado', () => {
    assert.equal(isDue('2020-01-01T00:00:00.000Z'), true);
  });

  it('retorna true para fecha null (nunca revisada)', () => {
    assert.equal(isDue(null), true);
  });

  it('retorna false para fecha en el futuro', () => {
    const future = addDays(new Date().toISOString(), 10);
    assert.equal(isDue(future), false);
  });

  it('fecha de ahora aproximada es due', () => {
    // Una fecha de hace 1 segundo es due
    const past = new Date(Date.now() - 1000).toISOString();
    assert.equal(isDue(past), true);
  });
});

describe('diffDays', () => {
  it('diferencia positiva', () => {
    assert.equal(diffDays('2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z'), 7);
  });

  it('diferencia negativa', () => {
    assert.equal(diffDays('2026-01-08T00:00:00.000Z', '2026-01-01T00:00:00.000Z'), -7);
  });

  it('misma fecha retorna 0', () => {
    const d = '2026-06-01T12:00:00.000Z';
    assert.equal(diffDays(d, d), 0);
  });
});

describe('formatRelativeDate', () => {
  it('retorna "Nunca" para null', () => {
    assert.equal(formatRelativeDate(null), 'Nunca');
  });

  it('retorna "Hoy" para fecha de hoy', () => {
    const today = new Date().toISOString();
    assert.equal(formatRelativeDate(today), 'Hoy');
  });

  it('retorna "Mañana" para fecha de mañana', () => {
    const tomorrow = addDays(new Date().toISOString(), 1);
    assert.equal(formatRelativeDate(tomorrow), 'Mañana');
  });

  it('retorna "Ayer" para fecha de ayer', () => {
    const yesterday = addDays(new Date().toISOString(), -1);
    assert.equal(formatRelativeDate(yesterday), 'Ayer');
  });

  it('retorna "En N días" para fecha futura', () => {
    const future = addDays(new Date().toISOString(), 5);
    assert.equal(formatRelativeDate(future), 'En 5 días');
  });

  it('retorna "Hace N días" para fecha pasada', () => {
    const past = addDays(new Date().toISOString(), -10);
    assert.equal(formatRelativeDate(past), 'Hace 10 días');
  });
});

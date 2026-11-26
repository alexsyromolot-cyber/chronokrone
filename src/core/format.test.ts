import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { formatNumber, suffixForTier } from './format';

describe('suffixForTier', () => {
  it('liefert K, M, B, T und danach Buchstabenpaare', () => {
    expect([1, 2, 3, 4].map(suffixForTier)).toEqual(['K', 'M', 'B', 'T']);
    expect(suffixForTier(5)).toBe('aa');
    expect(suffixForTier(6)).toBe('ab');
    expect(suffixForTier(5 + 26)).toBe('ba');
    expect(suffixForTier(4 + 26 * 26)).toBe('zz');
  });
});

describe('formatNumber', () => {
  it('zeigt kleine Zahlen abgerundet', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999.9)).toBe('999');
    expect(formatNumber(2.567, { smallDecimals: 1 })).toBe('2,5');
    expect(formatNumber(3, { smallDecimals: 2 })).toBe('3');
  });

  it('nutzt drei gültige Stellen mit Suffix', () => {
    expect(formatNumber(1000)).toBe('1,00K');
    expect(formatNumber(12_345)).toBe('12,3K');
    expect(formatNumber(123_456)).toBe('123K');
    expect(formatNumber(4.56e6)).toBe('4,56M');
    expect(formatNumber(7e9)).toBe('7,00B');
    expect(formatNumber(1e12)).toBe('1,00T');
    expect(formatNumber(1e15)).toBe('1,00aa');
    expect(formatNumber(2.5e18)).toBe('2,50ab');
  });

  it('springt an der Rundungsgrenze in die nächste Stufe', () => {
    expect(formatNumber(999_999)).toBe('1,00M');
  });

  it('kann den Dezimalpunkt für Englisch setzen', () => {
    expect(formatNumber(1234, { decimalSeparator: '.' })).toBe('1.23K');
  });

  it('kommt weit über 1e308 hinaus', () => {
    expect(formatNumber(new Decimal('1e309'))).toBe('1,00' + suffixForTier(103));
    expect(formatNumber(new Decimal('5e3000'))).toBe('5,00e3000');
  });

  it('behandelt Sonderfälle', () => {
    expect(formatNumber(-1500)).toBe('-1,50K');
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(NaN)).toBe('?');
  });
});

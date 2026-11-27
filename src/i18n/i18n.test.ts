import { afterEach, describe, expect, it } from 'vitest';
import { de } from './de';
import { en } from './en';
import { decimalSeparator, setLocale, t } from './index';

describe('i18n', () => {
  afterEach(() => setLocale('de'));

  it('hat in beiden Sprachen dieselben Schlüssel', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });

  it('wechselt Sprache und Dezimaltrennzeichen', () => {
    expect(t('res.gold')).toBe('Gold');
    expect(decimalSeparator()).toBe(',');
    setLocale('en');
    expect(t('app.title')).toBe('Chronocrown');
    expect(decimalSeparator()).toBe('.');
  });
});

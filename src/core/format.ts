/**
 * Zentrale Zahlenformatierung. JEDE Zahl, die der Spieler sieht, läuft hier durch,
 * damit Schreibweise und Rundung überall gleich sind.
 *
 * Schema: 999 → 1,00K → 1,00M → 1,00B → 1,00T → 1,00aa → 1,00ab … → 1,00zz
 * Danach wissenschaftlich (1,23e2046). Zahlen jenseits von 1e308 sind dank
 * break_eternity.js kein Problem; JavaScripts `number` würde dort zu Infinity.
 */
import Decimal, { type DecimalSource } from 'break_eternity.js';

/** Kurze Suffixe für 10^3 bis 10^12. Englische Kürzel, wie im Genre üblich. */
const SHORT_SUFFIXES = ['', 'K', 'M', 'B', 'T'] as const;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
/** aa … zz = 26 × 26 Stufen nach T. */
const LETTER_TIERS = LETTERS.length * LETTERS.length;
const MAX_SUFFIX_TIER = SHORT_SUFFIXES.length - 1 + LETTER_TIERS;

export interface FormatOptions {
  /** Dezimaltrennzeichen, abhängig von der Sprache (de: ",", en: "."). */
  decimalSeparator?: string;
  /** Nachkommastellen für Zahlen unter 1000 (z. B. Produktion pro Sekunde). */
  smallDecimals?: number;
}

/** Suffix für eine Tausender-Stufe (1 = K, 5 = aa, 6 = ab, …). */
export function suffixForTier(tier: number): string {
  if (tier < SHORT_SUFFIXES.length) return SHORT_SUFFIXES[tier] ?? '';
  const i = tier - SHORT_SUFFIXES.length;
  return (LETTERS[Math.floor(i / LETTERS.length)] ?? '') + (LETTERS[i % LETTERS.length] ?? '');
}

/**
 * Mantisse mit drei gültigen Stellen: 1,23 / 12,3 / 123.
 * So bleibt die Breite der Anzeige konstant und nichts springt im Layout.
 */
function mantissaString(m: number, sep: string): string {
  const decimals = m < 10 ? 2 : m < 100 ? 1 : 0;
  return m.toFixed(decimals).replace('.', sep);
}

export function formatNumber(value: DecimalSource, options: FormatOptions = {}): string {
  const sep = options.decimalSeparator ?? ',';
  const d = new Decimal(value);

  if (d.isNan()) return '?';
  if (d.sign < 0) return '-' + formatNumber(d.neg(), options);
  if (!d.isFinite()) return '∞';

  if (d.lt(1000)) {
    const n = d.toNumber();
    const decimals = options.smallDecimals ?? 0;
    // Abrunden statt runden: "1000" anzeigen, obwohl man 999,6 hat, würde
    // einen Kauf versprechen, der noch nicht geht.
    const factor = 10 ** decimals;
    const floored = Math.floor(n * factor) / factor;
    // Ganzzahlige Werte ohne Nachkommastellen, sonst flackert "5,00" ↔ "5,05".
    return (Number.isInteger(floored) ? String(floored) : floored.toFixed(decimals)).replace('.', sep);
  }

  // Exponent ermitteln. Für extrem große Zahlen (mehrere Exponenten-Ebenen) ist
  // die Ausgabe von break_eternity selbst die einzig sinnvolle.
  const exponent = Math.floor(d.log10().toNumber());
  if (!Number.isFinite(exponent) || exponent > Number.MAX_SAFE_INTEGER) return d.toString();

  let tier = Math.floor(exponent / 3);
  if (tier > MAX_SUFFIX_TIER) return scientific(d, exponent, sep);

  let mantissa = d.div(Decimal.pow(10, tier * 3)).toNumber();
  // Rundungsgrenze: 999,999K soll als 1,00M erscheinen, nicht als "1000K".
  if (Number(mantissa.toFixed(mantissa < 10 ? 2 : mantissa < 100 ? 1 : 0)) >= 1000) {
    tier++;
    mantissa /= 1000;
    if (tier > MAX_SUFFIX_TIER) return scientific(d, exponent + 1, sep);
  }
  return mantissaString(mantissa, sep) + suffixForTier(tier);
}

function scientific(d: Decimal, exponent: number, sep: string): string {
  const mantissa = d.div(Decimal.pow(10, exponent)).toNumber();
  return mantissa.toFixed(2).replace('.', sep) + 'e' + exponent;
}

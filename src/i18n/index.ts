/**
 * Minimale i18n-Schicht. Bewusst ohne Bibliothek: Wir brauchen nur Schlüssel → Text
 * und später Platzhalter. Texte stehen nie im Code, sondern in de.ts / en.ts.
 */
import { de, type MessageKey, type Messages } from './de';
import { en } from './en';

export type Locale = 'de' | 'en';

const catalogs: Record<Locale, Messages> = { de, en };
let current: Locale = 'de';

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Dezimaltrennzeichen passend zur Sprache, für `formatNumber`. */
export function decimalSeparator(): string {
  return current === 'de' ? ',' : '.';
}

/**
 * Text holen. Platzhalter wie `{name}` werden aus `params` ersetzt.
 * Fehlt ein Text, erscheint der Schlüssel – auffällig, aber kein Absturz.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let text = catalogs[current][key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

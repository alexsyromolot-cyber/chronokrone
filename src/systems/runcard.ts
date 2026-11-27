/**
 * Run-Karte: die wichtigsten Zahlen eines Spielstands zum Teilen – ohne Konto, ohne Server.
 * Als Code (kurzer Text zum Einfügen) und als Bild (PNG aus einem Canvas).
 *
 * Code-Format: "CK1." + Base64(JSON). Die Versionsnummer erlaubt spätere Erweiterungen.
 * Reine Logik ohne DOM – das Bild zeichnet ui/runcard-panel.ts.
 */
import Decimal from 'break_eternity.js';
import type { GameState } from './state';

export interface RunCard {
  v: 1;
  /** Spitzname (frei wählbar, höchstens 24 Zeichen). */
  name: string;
  /** Höchste Zahl: insgesamt verdientes Gold als Text (break_eternity). */
  highest: string;
  /** Schnellster Entwicklungssprung in Sekunden (null = noch keiner). */
  fastestJump: number | null;
  epoch: number;
  loops: number;
  seals: number;
  finaleWins: number;
  /** Bestzeiten bis zum Mutterschiff je Fluch-Kombination (Sekunden). */
  challenges: Record<string, number>;
  playtime: number;
  kills: number;
  achievements: number;
}

export const NAME_MAX = 24;
const PREFIX = 'CK1.';

export function cleanName(name: string): string {
  // Steuerzeichen raus: Der Name landet im Bild und in fremden Codes.
  const printable = [...name].filter((c) => c.charCodeAt(0) >= 32).join('');
  return printable.trim().slice(0, NAME_MAX);
}

export function runCardOf(state: GameState, name: string): RunCard {
  return {
    v: 1,
    name: cleanName(name),
    highest: new Decimal(state.stats.goldEarned).toString(),
    fastestJump: state.stats.fastestJump > 0 ? state.stats.fastestJump : null,
    epoch: state.epoch,
    loops: state.loop.count,
    seals: state.loop.seals,
    finaleWins: state.finale.wins,
    challenges: { ...state.loop.best },
    playtime: state.time,
    kills: state.stats.kills,
    achievements: Object.keys(state.achievements).length,
  };
}

/** UTF-8-sicheres Base64 (Spitznamen dürfen Umlaute haben). */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(code: string): string {
  const bin = atob(code);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeRunCard(card: RunCard): string {
  return PREFIX + toBase64(JSON.stringify(card));
}

/** Liest einen Code; null, wenn er kaputt oder unbekannt ist. Prüft jedes Feld – fremder Text ist Eingabe. */
export function decodeRunCard(code: string): RunCard | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(fromBase64(trimmed.slice(PREFIX.length))) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const challenges: Record<string, number> = {};
    if (raw.challenges && typeof raw.challenges === 'object') {
      for (const [k, v] of Object.entries(raw.challenges as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) challenges[k.slice(0, 80)] = v;
      }
    }
    return {
      v: 1,
      name: cleanName(typeof raw.name === 'string' ? raw.name : ''),
      highest: typeof raw.highest === 'string' ? raw.highest.slice(0, 40) : '0',
      fastestJump: typeof raw.fastestJump === 'number' ? raw.fastestJump : null,
      epoch: num(raw.epoch),
      loops: num(raw.loops),
      seals: num(raw.seals),
      finaleWins: num(raw.finaleWins),
      challenges,
      playtime: num(raw.playtime),
      kills: num(raw.kills),
      achievements: num(raw.achievements),
    };
  } catch {
    return null;
  }
}

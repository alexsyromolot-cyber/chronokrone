/**
 * Rückblick und Ausgeruht-Bonus – statt Offline-Produktion.
 *
 * Während man weg ist, läuft nichts weiter. Kommt man nach mindestens RETURN_AFTER zurück,
 * zeigt das Spiel die letzte Sitzung im Zeitraffer und gibt einen Ausgeruht-Bonus:
 *   Dauer = 5 Minuten je Stunde Abwesenheit, mindestens 2, höchstens 15 Minuten
 *   Wirkung: doppelte Erfahrung für alle Einheiten
 * So lohnt sich die Pause, ohne dass das Spiel ohne dich weiterläuft.
 */
import type { GameState } from './state';

export const RECAP = {
  returnAfterMs: 5 * 60 * 1000,
  restedMinutesPerHour: 5,
  restedMinMinutes: 2,
  restedMaxMinutes: 15,
  xpMultiplier: 2,
} as const;

/** Werte, die der Rückblick vergleicht. */
export interface SessionSnapshot {
  time: number;
  kills: number;
  wins: number;
  buildingsBuilt: number;
  goldEarned: number;
  skillRanksBought: number;
  research: number;
  achievements: number;
  epoch: number;
}

export function snapshot(state: GameState): SessionSnapshot {
  return {
    time: state.time,
    kills: state.stats.kills,
    wins: state.stats.wins,
    buildingsBuilt: state.stats.buildingsBuilt,
    goldEarned: state.stats.goldEarned,
    skillRanksBought: state.stats.skillRanksBought,
    research: Object.keys(state.research).length,
    achievements: Object.keys(state.achievements).length,
    epoch: state.epoch,
  };
}

/** Unterschied zwischen Sitzungsbeginn und jetzt – das, was im Zeitraffer gezeigt wird. */
export function sessionDiff(state: GameState): SessionSnapshot | null {
  const start = state.session.start;
  if (!start) return null;
  const now = snapshot(state);
  return {
    time: now.time - start.time,
    kills: now.kills - start.kills,
    wins: now.wins - start.wins,
    buildingsBuilt: now.buildingsBuilt - start.buildingsBuilt,
    goldEarned: now.goldEarned - start.goldEarned,
    skillRanksBought: now.skillRanksBought - start.skillRanksBought,
    research: now.research - start.research,
    achievements: now.achievements - start.achievements,
    epoch: now.epoch - start.epoch,
  };
}

/** Beim Speichern: Zeitpunkt und Zusammenfassung der laufenden Sitzung festhalten. */
export function noteSave(state: GameState, nowMs: number): void {
  state.session.lastSeenAt = nowMs;
  state.session.lastSummary = sessionDiff(state);
}

/**
 * Beim Laden: Wer lange genug weg war, bekommt den Rückblick auf die letzte Sitzung und
 * den Ausgeruht-Bonus. Danach beginnt eine neue Sitzung. Rückgabe: was der Rückblick zeigt.
 */
export function welcomeBack(
  state: GameState,
  nowMs: number,
): { summary: SessionSnapshot; awayMs: number; restedMinutes: number } | null {
  const last = state.session.lastSeenAt;
  const summary = state.session.lastSummary;
  state.session.start = snapshot(state);
  if (!last || !summary) return null;
  const awayMs = nowMs - last;
  if (awayMs < RECAP.returnAfterMs) return null;
  const hours = awayMs / 3_600_000;
  const restedMinutes = Math.min(
    RECAP.restedMaxMinutes,
    Math.max(RECAP.restedMinMinutes, hours * RECAP.restedMinutesPerHour),
  );
  state.session.restedUntil = state.time + restedMinutes * 60;
  return { summary, awayMs, restedMinutes };
}

export function isRested(state: GameState): boolean {
  return state.time < state.session.restedUntil;
}

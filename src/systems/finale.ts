/**
 * Das Finale: In der letzten Epoche führt die fertige Zeitmaschine nicht weiter in die Zukunft,
 * sondern direkt zum Mutterschiff. Eine besondere Schlacht auf der höchsten Belagerungsstufe;
 * in der letzten Welle kommt das Mutterschiff selbst (Phasen siehe FINALE in data/enemies.ts).
 * Wer gewinnt, sieht den Abspann – danach wartet die Zeitschleife.
 */
import { EPOCHS } from '../data/epochs';
import { ENEMIES, FINALE } from '../data/enemies';
import type { MessageKey } from '../i18n/de';
import { addTimeline } from './achievements';
import { startBattle, startBattleBlocker } from './battle';
import { addLog, type Enemy, type GameState } from './state';

export const isLastEpoch = (state: GameState) => state.epoch >= EPOCHS.length;

export function finaleBlocker(state: GameState): MessageKey | null {
  if (!isLastEpoch(state)) return 'reason.unknown';
  if (state.timeMachineAt === null) return 'reason.noTimeMachine';
  return startBattleBlocker(state, state.siegeLevel);
}

export function startFinale(state: GameState): MessageKey | null {
  const blocker = finaleBlocker(state);
  if (blocker) return blocker;
  startBattle(state, state.siegeLevel);
  state.battle!.final = true;
  state.battle!.phase = 0;
  addLog(state, 'narrator.finaleStart');
  return null;
}

/**
 * Nach jedem Treffer auf den Endgegner: unter eine Phasen-Schwelle gefallen?
 * Dann ruft er Begleiter. Gibt die Zahl der zu spawnenden Begleiter zurück.
 */
export function bossPhase(state: GameState, boss: Enemy): number {
  const b = state.battle;
  if (!b || !ENEMIES[boss.type].boss) return 0;
  const phase = b.phase ?? 0;
  const threshold = FINALE.phases[phase];
  if (threshold === undefined || boss.hp / boss.maxHp > threshold) return 0;
  b.phase = phase + 1;
  addLog(state, phase === 0 ? 'narrator.bossPhase1' : 'narrator.bossPhase2');
  return FINALE.escortsPerPhase;
}

/** Sieg über das Mutterschiff: Abspann, Zeitstrahl, Bestzeit. */
export function winFinale(state: GameState): void {
  const first = state.finale.wonAt === null;
  state.finale.wonAt = state.time;
  state.finale.wins++;
  if (first) state.epochTimes.push(state.time - state.epochStartedAt);
  addTimeline(state, `finale.${state.loop.count}`, { loop: state.loop.count + 1 });
  addLog(state, 'narrator.finaleWon');
  state.fx.push({ kind: 'finale' });
}

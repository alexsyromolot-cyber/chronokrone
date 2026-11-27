/**
 * Kampf- und Dorfphase, Ergebnisfenster, Ereignis-Pause und Hofbefehl-Countdown.
 * Reine Logik: Die Oberfläche liest nur `phase()`, `isPaused()` und `state.scene`.
 */
import { SCENE } from '../data/scene';
import { EVENTS } from '../data/events';
import type { MessageKey } from '../i18n/de';
import { startBattle, startBattleBlocker } from './battle';
import { addLog, type GameState } from './state';

export type Phase = 'battle' | 'village';

/** Kampf, solange eine Schlacht läuft oder ihr Ergebnis noch nicht weggeklickt ist. */
export function phase(state: GameState): Phase {
  return state.battle || state.scene.result ? 'battle' : 'village';
}

/** Ereignisse mit echter Entscheidung (mehr als eine Antwort) halten das Spiel an. */
export function isDecisionEvent(id: string): boolean {
  return (EVENTS.find((e) => e.id === id)?.options.length ?? 0) > 1;
}

/** Läuft die Zeit gerade nicht weiter? (Offenes Entscheidungs-Ereignis.) */
export function isPaused(state: GameState): boolean {
  const ev = state.events.active;
  return !!ev && isDecisionEvent(ev.id);
}

/** Ergebnisfenster schließen: zurück ins Dorf. */
export function dismissResult(state: GameState): MessageKey | null {
  if (!state.scene.result) return 'reason.unknown';
  state.scene.result = null;
  return null;
}

/**
 * Hofbefehl „Schlacht starten“: Countdown im Dorf statt Kampf im Hintergrund.
 * Schlägt fehl, wenn gerade nichts zu starten wäre (dann protokolliert der Hofbefehl den Grund).
 */
export function requestBattle(state: GameState): MessageKey | null {
  if (state.scene.result) return 'reason.resultOpen';
  if (state.scene.countdown !== null) return 'reason.countdownRunning';
  const blocker = startBattleBlocker(state, state.siegeLevel);
  if (blocker) return blocker;
  state.scene.countdown = SCENE.orderCountdown;
  return null;
}

export function cancelCountdown(state: GameState): MessageKey | null {
  if (state.scene.countdown === null) return 'reason.unknown';
  state.scene.countdown = null;
  addLog(state, 'narrator.countdownCancelled');
  return null;
}

/** Countdown herunterzählen; bei 0 zur Mauer aufbrechen (falls dann noch möglich). */
export function tickScene(state: GameState, dt: number): void {
  if (state.scene.countdown === null) return;
  // Hat der Spieler inzwischen selbst eine Schlacht begonnen, ist der Countdown hinfällig.
  if (state.battle || state.scene.result) {
    state.scene.countdown = null;
    return;
  }
  state.scene.countdown -= dt;
  if (state.scene.countdown > 0) return;
  state.scene.countdown = null;
  startBattle(state);
}

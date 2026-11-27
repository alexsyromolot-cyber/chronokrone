/**
 * Ein Logik-Tick für das ganze Spiel. Die Reihenfolge ist bewusst:
 * erst produziert die Burg (läuft auch während der Schlacht), dann die Schlacht,
 * zuletzt prüfen wir, ob neue Bereiche erscheinen.
 */
import { startBattle, tickBattle } from './battle';
import { tickCastle } from './castle';
import { checkUnlocks } from './progression';
import { tickSpells } from './spells';
import { tickOrders } from './orders';
import { tickEvents } from './events';
import { tickMarket } from './trade';
import { checkAchievements } from './achievements';
import { addLog, createInitialState, type GameState } from './state';

const MAX_FX = 200;

export function tick(state: GameState, dt: number): void {
  state.time += dt;
  tickCastle(state, dt);
  tickBattle(state, dt);
  tickSpells(state, dt);
  tickOrders(state, dt);
  tickEvents(state, dt);
  tickMarket(state, dt);
  state.achievementTimer -= dt;
  if (state.achievementTimer <= 0) {
    state.achievementTimer = 1;
    checkAchievements(state);
  }
  checkUnlocks(state);
  // Effekte holt der Renderer jeden Frame ab. Beim Vorspulen (ohne Frames) würden sie
  // sich sonst unbegrenzt stapeln – also nur die neuesten behalten.
  if (state.fx.length > MAX_FX) state.fx.splice(0, state.fx.length - MAX_FX);
}

/**
 * Neues Spiel: kein Intro – direkt in die erste Schlacht mit drei Bauern.
 */
export function newGame(seed?: number): GameState {
  const state = createInitialState(seed);
  addLog(state, 'narrator.boot');
  startBattle(state, 0);
  return state;
}

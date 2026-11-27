/**
 * Prüft, ob neue Bereiche erscheinen (wachsendes Layout), und lässt den Erzähler sie ankündigen.
 */
import { UNLOCKS, type UnlockCondition } from '../data/progression';
import { addLog, type GameState } from './state';

function isMet(state: GameState, c: UnlockCondition): boolean {
  switch (c.kind) {
    case 'battlesFought':
      return state.stats.battles >= c.count;
    case 'buildings':
      return state.stats.buildingsBuilt >= c.count;
    case 'skillPointsEarned':
      return state.stats.skillPointsEarned >= c.count;
    case 'kills':
      return state.stats.kills >= c.count;
    case 'wins':
      return state.stats.wins >= c.count;
    case 'hasBuilding':
      return state.tiles.some((t) => t.building === c.building);
    case 'timeParts':
      return Object.keys(state.timeParts).length >= c.count;
  }
}

export function checkUnlocks(state: GameState): void {
  for (const u of UNLOCKS) {
    if (!state.unlocked[u.id] && isMet(state, u.condition)) {
      state.unlocked[u.id] = true;
      addLog(state, u.narrator);
    }
  }
}

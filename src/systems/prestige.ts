/**
 * Entwicklungssprung: die Zeitmaschine bringt die Burg in die nächste Epoche.
 *
 * Was bleibt:     Forschung, Zauberstufen, Bestiarium, Chronik, Zeitsplitter, Statistik, Einstellungen
 * Was zurückgeht: Gebäude, Karte, Ressourcen, Einheiten (wieder drei Bauern), Skills, Spezialisierungen,
 *                 Ausrüstung, Mauerausbau, Belagerungsstufen, Zeitmaschinenteile
 * Ausgleich:      Zeitsplitter für die Chronik, gelernte Skillpunkte kommen als Umskill-Tokens zurück,
 *                 Start-Boni aus der Chronik – damit sich der Sprung wie ein Aufstieg anfühlt.
 */
import Decimal from 'break_eternity.js';
import { epochDef, EPOCHS, SHARDS } from '../data/epochs';
import { CLASSES, START_UNITS, type ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { addTimeline } from './achievements';
import { chronicleBonus } from './chronicle';
import { totalSkillRanks } from './skills';
import { addLog, buildTiles, emptyResources, type GameState } from './state';

/** Splitter = 10 × Epoche + 3 × Belagerungsstufe + 1 je 5 Skill-Stufen */
export function shardsForJump(state: GameState): number {
  return (
    SHARDS.perEpoch * state.epoch +
    SHARDS.perSiege * state.siegeLevel +
    Math.floor(totalSkillRanks(state) / SHARDS.perSkillRanks)
  );
}

/** Tokens = alle gelernten Skill-Stufen + nicht ausgegebene Skillpunkte + Chronik-Bonus */
export function tokensForJump(state: GameState): number {
  const unspent = Object.values(state.skillPoints).reduce((a, b) => a + b, 0);
  return totalSkillRanks(state) + unspent + chronicleBonus(state, 'bonusTokens');
}

export function jumpBlocker(state: GameState): MessageKey | null {
  if (state.timeMachineAt === null) return 'reason.noTimeMachine';
  if (state.battle) return 'reason.battleRunning';
  if (state.epoch >= EPOCHS.length) return 'reason.lastEpoch';
  return null;
}

export function performJump(state: GameState): MessageKey | null {
  const blocker = jumpBlocker(state);
  if (blocker) return blocker;

  const shards = shardsForJump(state);
  const tokens = tokensForJump(state);
  state.epochTimes.push(state.time - state.epochStartedAt);
  state.shards += shards;
  state.totalShards += shards;
  state.respecTokens += tokens;

  state.epoch += 1;
  state.epochStartedAt = state.time;
  resetForEpoch(state);

  state.fx.push({ kind: 'jump', epoch: state.epoch, shards, tokens });
  addTimeline(state, `jump.${state.epoch}`, { epoch: `@epoch.${epochDef(state.epoch).id}` });
  addLog(state, state.epoch === 2 ? 'narrator.firstJump' : 'narrator.jump', {
    epoch: `@epoch.${epochDef(state.epoch).id}`,
    shards,
  });
  return null;
}

/** Neue Epoche aufbauen und die Start-Boni der Chronik anwenden. */
export function resetForEpoch(state: GameState): void {
  const map = epochDef(state.epoch).map;
  state.tiles = buildTiles(map);
  state.resources = emptyResources();
  state.skills = {};
  state.specs = {};
  state.gear = {};
  state.skillPoints = Object.fromEntries(Object.keys(CLASSES).map((c) => [c, 0])) as Record<ClassId, number>;
  state.wallUpgrades = 0;
  state.siegeLevel = 0;
  state.battle = null;
  state.lastBattle = null;
  state.timeParts = {};
  state.oracle = false;
  state.timeMachineAt = null;
  state.scrapPity = 0;
  state.market = { prices: {}, history: {}, timer: 0 };
  state.power = { fuel: 1 };
  state.reactor = { throttle: 0.5, heat: 0, fuel: 1, warned: false, meltdowns: 0 };

  // Chronik: Veteranen starten auf höherem Level, der Bergfried größer, Vorräte im Lager.
  const startLevel = 1 + chronicleBonus(state, 'startLevel');
  state.units = START_UNITS.map((classId, i) => ({ id: i + 1, classId, level: startLevel, xp: 0 }));
  state.nextUnitId = START_UNITS.length + 1;
  const keep = state.tiles.find((t) => t.building === 'keep');
  if (keep) keep.level += chronicleBonus(state, 'startKeep');
  const supplies = chronicleBonus(state, 'startResources');
  for (const id of ['gold', 'wood', 'stone'] as const) state.resources[id] = new Decimal(supplies);
  // Landvermesser: Felder rund um den Bergfried sind schon gerodet.
  const extra = chronicleBonus(state, 'startTiles');
  const around = state.tiles
    .filter((t) => !t.unlocked && Math.abs(t.x - map.keep.x) <= 1 && Math.abs(t.y - map.keep.y) <= 1)
    .slice(0, extra);
  for (const t of around) t.unlocked = true;
}

/** Ein Umskill-Token einer Klasse als Skillpunkt gutschreiben. */
export function useToken(state: GameState, classId: ClassId): MessageKey | null {
  if (state.respecTokens < 1) return 'reason.noTokens';
  state.respecTokens -= 1;
  state.skillPoints[classId] += 1;
  return null;
}

/**
 * Zeitschleife und Fluch-Siegel. Formeln und Regeln in data/loop.ts.
 */
import { epochDef } from '../data/epochs';
import type { MapDef } from '../data/map';
import { START_UNITS, type ClassId } from '../data/units';
import {
  CURSE_IDS,
  CURSE_NUMBERS,
  LOOP,
  LOOP_RULE_NUMBERS,
  LOOP_RULES,
  type CurseId,
  type LoopRuleId,
} from '../data/loop';
import type { MessageKey } from '../i18n/de';
import { addTimeline } from './achievements';
import { resetForEpoch, shardsForJump } from './prestige';
import { addLog, type GameState } from './state';

/** Regel der laufenden Schleife (null im ersten Durchgang). */
export function loopRule(state: GameState): LoopRuleId | null {
  if (state.loop.count === 0) return null;
  return LOOP_RULES[(state.loop.count - 1) % LOOP_RULES.length]!;
}

/** Regel, die die NÄCHSTE Schleife bringt (für die Vorschau). */
export function nextLoopRule(state: GameState): LoopRuleId {
  return LOOP_RULES[state.loop.count % LOOP_RULES.length]!;
}

export const hasCurse = (state: GameState, id: CurseId) => state.loop.curses.includes(id);

/** Lebenspunkte-Faktor der Aliens (Fluch „Zähe Aliens“). */
export function alienHpMult(state: GameState): number {
  return hasCurse(state, 'toughAliens') ? CURSE_NUMBERS.toughAliensMult : 1;
}

/** Tempo-Faktor der Aliens (Regel „Flinke Aliens“). */
export function alienSpeedMult(state: GameState): number {
  return loopRule(state) === 'swiftAliens' ? LOOP_RULE_NUMBERS.swiftSpeed : 1;
}

/** Beute-Faktor (Regel „Flinke Aliens“). */
export function alienGoldMult(state: GameState): number {
  return loopRule(state) === 'swiftAliens' ? LOOP_RULE_NUMBERS.swiftGold : 1;
}

/** Zusätzlicher Nahkampf-Panzer (Regel „Gepanzerte Aliens“). */
export function extraMeleeArmor(state: GameState): number {
  return loopRule(state) === 'armoredAliens' ? LOOP_RULE_NUMBERS.extraMeleeArmor : 0;
}

/** Mauer-Faktor (Fluch „Mürbe Mauern“). */
export function wallMult(state: GameState): number {
  return hasCurse(state, 'frailWalls') ? CURSE_NUMBERS.frailWallsMult : 1;
}

/** Klick-Faktor (Fluch „Lahmer Finger“). */
export function clickMult(state: GameState): number {
  return hasCurse(state, 'weakClicks') ? CURSE_NUMBERS.weakClicksMult : 1;
}

/** Sekunden, um die die Wut früher einsetzt (Fluch „Kurze Lunte“). */
export function enrageHead(state: GameState): number {
  return hasCurse(state, 'shortFuse') ? CURSE_NUMBERS.shortFuseSeconds : 0;
}

/** Startaufstellung der Schleife (Regel „Andere Startaufstellung“). */
export function startUnits(state: GameState): ClassId[] {
  return loopRule(state) === 'altStart' ? [...LOOP_RULE_NUMBERS.altStartUnits] : [...START_UNITS];
}

/** Karte spiegeln (Regel „Spiegelwelt“): links ↔ rechts. */
export function loopMap(state: GameState, map: MapDef): MapDef {
  if (loopRule(state) !== 'mirror') return map;
  const flip = (x: number) => map.width - 1 - x;
  return {
    ...map,
    terrain: map.terrain.map((row) => [...row].reverse().join('')),
    keep: { x: flip(map.keep.x), y: map.keep.y },
    startUnlocked: map.startUnlocked.map((p) => ({ x: flip(p.x), y: p.y })),
  };
}

/** Bonus der Schleifen-Siegel auf Produktion und Schaden. */
export function sealBonus(state: GameState): number {
  return LOOP.sealBonus * state.loop.seals;
}

/** Produktionsfaktor aus Siegeln und Fluch „Magere Jahre“. */
export function loopProductionFactor(state: GameState): number {
  return (1 + sealBonus(state)) * (hasCurse(state, 'lean') ? CURSE_NUMBERS.leanMult : 1);
}

/** Schlüssel für Bestzeiten: sortierte Flüche, '' = ohne Fluch. */
export function curseKey(curses: string[]): string {
  return [...curses].sort().join('+');
}

/** Siegel, die das Abschließen der laufenden Schleife bringt. */
export function sealsForLoop(state: GameState): number {
  return 1 + LOOP.sealPerCurse * state.loop.curses.length;
}

/** Zeitsplitter-Faktor durch Flüche. */
export function curseShardMult(state: GameState): number {
  return 1 + LOOP.shardBonusPerCurse * state.loop.curses.length;
}

export function toggleCurse(state: GameState, id: string): MessageKey | null {
  if (!CURSE_IDS.includes(id as CurseId)) return 'reason.unknown';
  if (state.finale.wonAt === null) return 'reason.needsFinale';
  const list = state.loop.nextCurses;
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else if (list.length >= LOOP.maxCurses) return 'reason.maxCount';
  else list.push(id);
  return null;
}

export function loopBlocker(state: GameState): MessageKey | null {
  if (state.finale.wonAt === null) return 'reason.needsFinale';
  if (state.battle) return 'reason.battleRunning';
  return null;
}

/**
 * Neue Schleife: Bestzeit festhalten, Siegel und Splitter gutschreiben, zurück in Epoche 1.
 */
export function startLoop(state: GameState): MessageKey | null {
  const blocker = loopBlocker(state);
  if (blocker) return blocker;
  const loop = state.loop;
  const key = curseKey(loop.curses);
  const time = state.finale.wonAt! - loop.startedAt;
  if (loop.best[key] === undefined || time < loop.best[key]!) loop.best[key] = time;

  const shards = Math.round(shardsForJump(state) * curseShardMult(state));
  state.shards += shards;
  state.totalShards += shards;
  loop.seals += sealsForLoop(state);
  loop.count++;
  loop.curses = [...loop.nextCurses];
  loop.startedAt = state.time;
  state.finale.wonAt = null;

  state.epoch = 1;
  state.epochStartedAt = state.time;
  state.research = {};
  state.spells = {};
  resetForEpoch(state);

  addTimeline(state, `loop.${loop.count}`, { n: loop.count });
  addLog(state, 'narrator.loopStart', {
    n: loop.count,
    rule: `@loop.rule.${loopRule(state)}`,
    epoch: `@epoch.${epochDef(1).id}`,
  });
  state.fx.push({ kind: 'jump', epoch: 1, shards, tokens: 0 });
  return null;
}

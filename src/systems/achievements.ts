/**
 * Achievements prüfen und freischalten, Kennzahlen für die Statistik-Seite, Zeitstrahl.
 */
import { ACHIEVEMENT_BONUS, ACHIEVEMENTS, FAST_EPOCH_SECONDS, type MetricId } from '../data/achievements';
import { ENEMIES } from '../data/enemies';
import { addLog, type GameState } from './state';

/** Aktueller Wert einer Kennzahl. Lebenslange Zähler stehen in state.stats. */
export function metric(state: GameState, id: MetricId): number {
  const s = state.stats;
  switch (id) {
    case 'kills':
    case 'wins':
    case 'battles':
    case 'clicks':
    case 'buildingsBuilt':
    case 'eventsSeen':
    case 'dronesCaught':
    case 'diceGames':
    case 'miracles':
    case 'recruits':
    case 'spellsCast':
    case 'skillRanksBought':
    case 'goldEarned':
    case 'scrapCollected':
    case 'retreats':
    case 'noClickWins':
    case 'diceJackpots':
    case 'ordersExecuted':
    case 'timeMachines':
    case 'highestSiege':
    case 'maxBuildingLevel':
    case 'maxUnitLevel':
      return s[id];
    case 'research':
      return Object.keys(state.research).length;
    case 'bestiary':
      return Object.keys(state.bestiary).length;
    case 'elites':
      return (Object.keys(state.bestiary) as (keyof typeof ENEMIES)[]).filter((e) => ENEMIES[e].elite).length;
    case 'jumps':
      return state.epochTimes.length;
    case 'totalShards':
      return state.totalShards;
    case 'chronicleRanks':
      return Object.values(state.chronicle).reduce((a, b) => a + (b ?? 0), 0);
    case 'playHours':
      return state.time / 3600;
    case 'firstDefeat':
      // Die allererste Schlacht ist immer verloren – wer eine Schlacht hinter sich hat, hat sie erlebt.
      return s.battles > 0 ? 1 : 0;
    case 'fastEpoch':
      return state.epochTimes.some((t) => t < FAST_EPOCH_SECONDS) ? 1 : 0;
  }
}

export function achievementCount(state: GameState): number {
  return Object.keys(state.achievements).length;
}

/** Multiplikator auf Produktion und Schaden: 1 + 0,01 × Anzahl. */
export function achievementMultiplier(state: GameState): number {
  return 1 + ACHIEVEMENT_BONUS * achievementCount(state);
}

/** Neu erreichte Achievements freischalten. Läuft einmal pro Sekunde, nicht jeden Tick. */
export function checkAchievements(state: GameState): void {
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id] !== undefined) continue;
    if (metric(state, a.metric) >= a.threshold) {
      state.achievements[a.id] = state.time;
      state.fx.push({ kind: 'achievement', id: a.id });
      // Stufe mit führendem Leerzeichen – geheime Erfolge haben keine, dann bleibt nichts übrig.
      const tier = achievementTier(a.id);
      addLog(state, 'narrator.achievement', { name: `@achm.${a.metric}`, tier: tier ? ` ${tier}` : '' });
    }
  }
}

/** Meilenstein auf dem Fortschritts-Zeitstrahl festhalten (nur beim ersten Mal). */
export function addTimeline(state: GameState, key: string, params?: Record<string, string | number>): void {
  if (state.timeline.some((e) => e.key === key)) return;
  state.timeline.push(params ? { time: state.time, key, params } : { time: state.time, key });
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Stufe als römische Zahl ("kills.3" → "III"); geheime Achievements haben keine. */
export function achievementTier(id: string): string {
  const n = Number(id.split('.')[1]);
  return Number.isInteger(n) ? (ROMAN[n] ?? String(n)) : '';
}

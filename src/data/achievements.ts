/**
 * Achievements: Jeder gibt dauerhaft +1 % auf Produktion und Schaden (multiplikativ als
 * 1 + 0,01 × Anzahl). Sie bleiben bei jedem Sprung erhalten.
 *
 * Die meisten entstehen aus „Leitern“: eine Kennzahl und mehrere Schwellen. Ein paar sind
 * geheim – ihre Bedingung bleibt verborgen, bis man sie zufällig erfüllt.
 */

export type MetricId =
  | 'kills'
  | 'wins'
  | 'battles'
  | 'highestSiege'
  | 'buildingsBuilt'
  | 'maxBuildingLevel'
  | 'recruits'
  | 'maxUnitLevel'
  | 'research'
  | 'skillRanksBought'
  | 'spellsCast'
  | 'clicks'
  | 'goldEarned'
  | 'scrapCollected'
  | 'bestiary'
  | 'elites'
  | 'timeMachines'
  | 'jumps'
  | 'totalShards'
  | 'chronicleRanks'
  | 'eventsSeen'
  | 'dronesCaught'
  | 'diceGames'
  | 'playHours'
  | 'ordersExecuted'
  // geheime
  | 'firstDefeat'
  | 'miracles'
  | 'retreats'
  | 'noClickWins'
  | 'diceJackpots'
  | 'fastEpoch';

export interface AchievementDef {
  id: string;
  metric: MetricId;
  threshold: number;
  secret?: boolean;
}

const LADDERS: [MetricId, number[]][] = [
  ['kills', [10, 100, 500, 1000, 5000, 10000, 50000, 100000]],
  ['wins', [1, 5, 10, 25, 50, 100, 250]],
  ['battles', [10, 50, 100, 250, 500]],
  ['highestSiege', [2, 3, 5, 7, 9, 12, 15, 20]],
  ['buildingsBuilt', [1, 5, 10, 25, 50, 100]],
  ['maxBuildingLevel', [5, 10, 25, 50, 75, 100]],
  ['recruits', [1, 5, 10, 25, 50, 100]],
  ['maxUnitLevel', [5, 10, 20, 30, 50]],
  ['research', [1, 5, 10, 15, 20]],
  ['skillRanksBought', [1, 10, 25, 50, 100, 250]],
  ['spellsCast', [1, 10, 50, 200, 500]],
  ['clicks', [10, 100, 1000, 5000, 10000, 50000]],
  ['goldEarned', [100, 1e3, 1e4, 1e5, 1e6, 1e9, 1e12]],
  ['scrapCollected', [1, 10, 50, 200, 1000]],
  ['bestiary', [1, 3, 5, 8]],
  ['elites', [1, 2, 3, 4]],
  ['timeMachines', [1, 3, 5]],
  ['jumps', [1, 2, 3, 5, 10]],
  ['totalShards', [10, 50, 100, 250, 500, 1000]],
  ['chronicleRanks', [1, 5, 10, 25, 50]],
  ['eventsSeen', [1, 10, 25, 50]],
  ['dronesCaught', [1, 10, 25, 50, 100]],
  ['diceGames', [1, 10, 50]],
  ['playHours', [0.5, 1, 2, 5, 10, 20]],
  ['ordersExecuted', [1, 100, 1000]],
];

const SECRETS: AchievementDef[] = [
  { id: 'secret.firstDefeat', metric: 'firstDefeat', threshold: 1, secret: true },
  { id: 'secret.miracle', metric: 'miracles', threshold: 1, secret: true },
  { id: 'secret.coward', metric: 'retreats', threshold: 10, secret: true },
  { id: 'secret.pacifist', metric: 'noClickWins', threshold: 1, secret: true },
  { id: 'secret.jackpot', metric: 'diceJackpots', threshold: 1, secret: true },
  { id: 'secret.speedrun', metric: 'fastEpoch', threshold: 1, secret: true },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...LADDERS.flatMap(([metric, steps]) =>
    steps.map((threshold, i) => ({ id: `${metric}.${i + 1}`, metric, threshold })),
  ),
  ...SECRETS,
];

/** Bonus je Achievement auf Produktion und Schaden. */
export const ACHIEVEMENT_BONUS = 0.01;
/** Eine Epoche schneller als das zählt für das geheime „Zeitraser“-Achievement. */
export const FAST_EPOCH_SECONDS = 45 * 60;

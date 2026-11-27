/**
 * Der komplette Spielzustand als ein schlichtes Objekt. Alle Systeme lesen und
 * verändern dieses Objekt; Darstellung und UI lesen es nur.
 *
 * Warum ein großes Objekt statt vieler Klassen? Es lässt sich trivial speichern,
 * vergleichen, kopieren und in Tests von Hand aufbauen.
 */
import Decimal from 'break_eternity.js';
import type { RngState } from '../core/rng';
import type { BuildingId } from '../data/buildings';
import type { EnemyId } from '../data/enemies';
import type { ChronicleId } from '../data/chronicle';
import { epochDef } from '../data/epochs';
import { TERRAIN_CODES, type MapDef, type TerrainId } from '../data/map';
import { LOG_LIMIT, type UnlockId } from '../data/progression';
import type { GearSlot } from '../data/gear';
import type { OrderRule } from '../data/orders';
import type { DiceBet, EventId } from '../data/events';
import type { ResearchId } from '../data/research';
import type { SpecPath } from '../data/skills';
import type { SpellId } from '../data/spells';
import { RESOURCE_IDS, type ResourceId } from '../data/resources';
import { CLASSES, START_UNITS, type ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';

export interface Unit {
  id: number;
  classId: ClassId;
  level: number;
  xp: number;
}

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainId;
  unlocked: boolean;
  building: BuildingId | null;
  level: number;
}

export interface Enemy {
  id: number;
  type: EnemyId;
  x: number;
  /** Position im vorigen Tick – der Renderer interpoliert zwischen prevX und x. */
  prevX: number;
  /** Spur 0–2, damit Aliens nicht exakt übereinander laufen. */
  lane: number;
  hp: number;
  maxHp: number;
}

export interface BattleState {
  siege: number;
  wave: number;
  /** Höchste Welle, die komplett besiegt wurde (für den Wellen-Bonus). */
  clearedWaves: number;
  /** Seit dem letzten Shake angesammelter Mauerschaden. */
  wallDamageAcc: number;
  /** Sekunden bis zur nächsten Welle. */
  waveTimer: number;
  /** Noch zu spawnende Gegner der aktuellen Welle. */
  toSpawn: number;
  spawnTimer: number;
  enemies: Enemy[];
  nextEnemyId: number;
  wallHp: number;
  wallMaxHp: number;
  elapsed: number;
  kills: number;
  goldEarned: number;
  /** Abklingzeit je Truppe (unit.id → Sekunden bis zum nächsten Schlag). */
  cooldowns: Record<number, number>;
  /** Klicks in dieser Schlacht (für das geheime Pazifisten-Achievement). */
  clicks: number;
  /** Abklingzeit je Zauber in Sekunden. */
  spellCooldowns: Partial<Record<SpellId, number>>;
  /** Restdauer der Bauernmiliz und Zeit bis zu ihrem nächsten Schlag. */
  militiaLeft: number;
  militiaTimer: number;
  /** Elitegegner, der als letzter Gegner dieser Schlacht noch erscheinen soll. */
  pendingElite: EnemyId | null;
}

export interface BattleSummary {
  result: 'won' | 'lost';
  siege: number;
  wave: number;
  kills: number;
  goldEarned: number;
  seconds: number;
}

export interface LogEntry {
  key: MessageKey;
  params?: Record<string, string | number>;
  time: number;
}

/** Kurzlebige Ereignisse für Effekte (Zahlen, Partikel, Shake). Werden nicht gespeichert. */
export type FxEvent =
  | { kind: 'hit'; x: number; lane: number; amount: number; byClick: boolean }
  | { kind: 'shot'; toX: number; lane: number; color: string; slot: number }
  | { kind: 'kill'; x: number; lane: number; enemy: EnemyId; gold: number; scrap: boolean }
  | { kind: 'wallHit' }
  | { kind: 'levelUp'; unitId: number }
  | { kind: 'milestone' }
  | { kind: 'battleEnd'; result: 'won' | 'lost' }
  | { kind: 'spell'; spell: SpellId }
  | { kind: 'jump'; epoch: number; shards: number; tokens: number }
  | { kind: 'drone'; gold: number }
  | { kind: 'achievement'; id: string }
  | { kind: 'crit'; x: number; lane: number };

export interface Stats {
  battles: number;
  wins: number;
  kills: number;
  clicks: number;
  highestWave: number;
  skillPointsEarned: number;
  buildingsBuilt: number;
  eventsSeen: number;
  dronesCaught: number;
  diceGames: number;
  miracles: number;
  recruits: number;
  spellsCast: number;
  skillRanksBought: number;
  goldEarned: number;
  scrapCollected: number;
  retreats: number;
  noClickWins: number;
  diceJackpots: number;
  ordersExecuted: number;
  timeMachines: number;
  highestSiege: number;
  maxBuildingLevel: number;
  maxUnitLevel: number;
}

export interface Settings {
  /** Autosave-Intervall in Sekunden (5–120). */
  autosaveSeconds: number;
  reducedMotion: boolean;
  locale: 'de' | 'en';
}

export interface OrdersState {
  rules: OrderRule[];
  nextId: number;
  /** Sekunden bis zum nächsten Durchgang. */
  timer: number;
  log: { time: number; ruleId: number; ok: boolean; reason?: MessageKey }[];
  /** War die Bedingung beim letzten Durchgang wahr? (für einmalige Meldungen) */
  lastTrue: Record<number, boolean>;
}

export function emptyOrders(): OrdersState {
  return { rules: [], nextId: 1, timer: 0, log: [], lastTrue: {} };
}

export interface EventsState {
  /** Sekunden bis zum nächsten Ereignis. */
  timer: number;
  active: { id: EventId; expiresAt: number; params: Record<string, string | number> } | null;
  /** Zeitlich begrenzte Produktions-Boni (Regen, gute Ernte …). */
  buffs: { resource: ResourceId | 'all'; mult: number; until: number }[];
  /** Alien-Drohne am Himmel: Restflugzeit und Spur. */
  drone: { left: number; lane: number } | null;
  droneTimer: number;
  lastDice: { d1: number; d2: number; bet: DiceBet; stake: number; payout: number } | null;
}

export interface GameState {
  /** Spielzeit in Sekunden (nur aktive Zeit, keine Offline-Zeit). */
  time: number;
  /** Aktuelle Epoche (1 = Finsteres Mittelalter). */
  epoch: number;
  /** Spielzeit, zu der die aktuelle Epoche begann. */
  epochStartedAt: number;
  /** Zeitsplitter (Prestige-Währung) und insgesamt verdiente. */
  shards: number;
  totalShards: number;
  /** Ränge in der Chronik (dauerhaft). */
  chronicle: Partial<Record<ChronicleId, number>>;
  /** Umskill-Tokens: beim Sprung zurückgegebene Skillpunkte, frei einer Klasse zuweisbar. */
  respecTokens: number;
  /** Dauer jeder abgeschlossenen Epoche in Sekunden (für Statistik und Run-Karte). */
  epochTimes: number[];
  rng: RngState;
  resources: Record<ResourceId, Decimal>;
  tiles: Tile[];
  units: Unit[];
  nextUnitId: number;
  skillPoints: Record<ClassId, number>;
  skills: Record<string, number>;
  /** Gewählte Spezialisierung je Klasse. */
  specs: Partial<Record<ClassId, SpecPath>>;
  /** Ausrüstungsstufe je Klasse und Slot. */
  gear: Partial<Record<ClassId, Partial<Record<GearSlot, number>>>>;
  /** Zauberstufen (0 bzw. fehlend = nicht gelernt). */
  spells: Partial<Record<SpellId, number>>;
  /** Erbeutete Zeitmaschinenteile (je Elitegegner eines). */
  timeParts: Partial<Record<EnemyId, boolean>>;
  /** Rechenorakel gebaut? */
  oracle: boolean;
  /** Spielzeit, zu der die Zeitmaschine fertig wurde (null = noch nicht). */
  timeMachineAt: number | null;
  /** Freigeschaltete Achievements (id → Spielzeit). Bleiben bei jedem Sprung. */
  achievements: Record<string, number>;
  /** Fortschritts-Zeitstrahl: erste Male und große Momente. */
  timeline: { time: number; key: string; params?: Record<string, string | number> }[];
  /** Sekunden bis zur nächsten Achievement-Prüfung. */
  achievementTimer: number;
  /** Ereignisse, Drohne, Würfel. */
  events: EventsState;
  /** Hofbefehle (bleiben beim Sprung erhalten). */
  orders: OrdersState;
  /** Abgeschlossene Forschung. */
  research: Partial<Record<ResearchId, boolean>>;
  wallUpgrades: number;
  /** Höchste freigeschaltete Belagerungsstufe (0 = erste). */
  siegeLevel: number;
  battle: BattleState | null;
  lastBattle: BattleSummary | null;
  unlocked: Partial<Record<UnlockId, boolean>>;
  /** Abschüsse je Alien-Typ; ein Eintrag > 0 heißt „im Bestiarium“. */
  bestiary: Partial<Record<EnemyId, number>>;
  /** Fehlversuche seit dem letzten Schrott-Drop (Pity-Zähler). */
  scrapPity: number;
  log: LogEntry[];
  stats: Stats;
  settings: Settings;
  /** Nicht gespeichert, siehe FxEvent. */
  fx: FxEvent[];
}

/** Raster aus einer Kartendefinition: Bergfried und Startfelder frei, Rest unerschlossen. */
export function buildTiles(map: MapDef): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const code = map.terrain[y]?.[x] ?? 'g';
      const isKeep = x === map.keep.x && y === map.keep.y;
      tiles.push({
        x,
        y,
        terrain: TERRAIN_CODES[code] ?? 'grass',
        unlocked: isKeep || map.startUnlocked.some((p) => p.x === x && p.y === y),
        building: isKeep ? 'keep' : null,
        level: isKeep ? 1 : 0,
      });
    }
  }

  return tiles;
}

export function emptyResources(): Record<ResourceId, Decimal> {
  return Object.fromEntries(RESOURCE_IDS.map((id) => [id, new Decimal(0)])) as Record<ResourceId, Decimal>;
}

export function createInitialState(seed = Date.now()): GameState {
  const tiles = buildTiles(epochDef(1).map);
  const resources = Object.fromEntries(RESOURCE_IDS.map((id) => [id, new Decimal(0)])) as Record<
    ResourceId,
    Decimal
  >;
  const skillPoints = Object.fromEntries(Object.keys(CLASSES).map((id) => [id, 0])) as Record<
    ClassId,
    number
  >;

  return {
    time: 0,
    epoch: 1,
    epochStartedAt: 0,
    shards: 0,
    totalShards: 0,
    chronicle: {},
    respecTokens: 0,
    epochTimes: [],
    rng: { seed: seed | 0 },
    resources,
    tiles,
    units: START_UNITS.map((classId, i) => ({ id: i + 1, classId, level: 1, xp: 0 })),
    nextUnitId: START_UNITS.length + 1,
    skillPoints,
    skills: {},
    research: {},
    orders: emptyOrders(),
    achievements: {},
    timeline: [],
    achievementTimer: 0,
    // Erstes Ereignis nach 3 Minuten, erste Drohne nach 2 Minuten – nicht schon in der ersten Schlacht.
    events: { timer: 180, active: null, buffs: [], drone: null, droneTimer: 120, lastDice: null },
    timeParts: {},
    oracle: false,
    timeMachineAt: null,
    specs: {},
    gear: {},
    spells: {},
    wallUpgrades: 0,
    siegeLevel: 0,
    battle: null,
    lastBattle: null,
    unlocked: {},
    bestiary: {},
    scrapPity: 0,
    log: [],
    stats: {
      battles: 0,
      wins: 0,
      kills: 0,
      clicks: 0,
      highestWave: 0,
      skillPointsEarned: 0,
      buildingsBuilt: 0,
      eventsSeen: 0,
      dronesCaught: 0,
      diceGames: 0,
      miracles: 0,
      recruits: 0,
      spellsCast: 0,
      skillRanksBought: 0,
      goldEarned: 0,
      scrapCollected: 0,
      retreats: 0,
      noClickWins: 0,
      diceJackpots: 0,
      ordersExecuted: 0,
      timeMachines: 0,
      highestSiege: 0,
      maxBuildingLevel: 1,
      maxUnitLevel: 1,
    },
    settings: { autosaveSeconds: 30, reducedMotion: false, locale: 'de' },
    fx: [],
  };
}

export function addLog(state: GameState, key: MessageKey, params?: Record<string, string | number>): void {
  state.log.push(params ? { key, params, time: state.time } : { key, time: state.time });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

/**
 * Ein einfacher Spieler-Bot für die Simulation: startet Schlachten, klickt Aliens,
 * kauft das Sinnvollste, das er sich leisten kann. Er spielt absichtlich „okay“,
 * nicht perfekt – so bilden die Zahlen einen normalen Spieler ab.
 */
import { BUILDINGS, type BuildingId } from '../data/buildings';
import { BATTLE } from '../data/enemies';
import { GEAR_SLOTS } from '../data/gear';
import { RESEARCH } from '../data/research';
import { SPELL_IDS } from '../data/spells';
import { SKILLS } from '../data/skills';
import type { ClassId } from '../data/units';
import { dispatch, type Action } from '../systems/actions';
import { buildingAvailable, countBuildings, inBounds, neighbors } from '../systems/castle';
import type { GameState, Tile } from '../systems/state';
import { troops } from '../systems/units';

export interface BotOptions {
  /** Klicks pro Sekunde während der Schlacht. */
  clicksPerSecond: number;
  /** Reaktionszeit zwischen zwei Schlachten in Sekunden. */
  pauseBetweenBattles: number;
}

export const DEFAULT_BOT: BotOptions = { clicksPerSecond: 3, pauseBetweenBattles: 4 };

/** Bestes freies Feld für ein Gebäude: passendes Gelände zuerst, dann Nachbarboni. */
function bestTile(state: GameState, id: BuildingId): Tile | undefined {
  const def = BUILDINGS[id];
  const free = state.tiles.filter((t) => t.unlocked && !t.building);
  const nb = def.neighborBonus;
  const score = (t: Tile) =>
    (def.terrainBonus?.[t.terrain] ?? 1) +
    (nb ? neighbors(state, t).filter((n) => n.building === nb.building).length * nb.bonus : 0);
  return free.sort((a, b) => score(b) - score(a))[0];
}

/** Reihenfolge, in der der Bot jedes Gebäude einmal baut, sobald es erforscht ist. */
const BUILD_ORDER: BuildingId[] = [
  'lumberHut',
  'quarry',
  'barracks',
  'monastery',
  'mine',
  'herbGarden',
  'sawmill',
  'storehouse',
  'smelter',
  'alchemy',
  'archeryRange',
  'tavern',
  'smithy',
  'scriptorium',
  'workshop',
  'mageTower',
];

const RECRUIT_ORDER: ClassId[] = [
  'monk',
  'woodcutter',
  'miner',
  'herbalist',
  'knight',
  'archer',
  'warlock',
  'peasant',
];

/** Kaufwünsche in Prioritätsreihenfolge; der erste, der klappt, wird gekauft. */
function wishes(state: GameState): Action[] {
  // Das große Ziel zuerst: Rechenorakel und Zeitmaschine, sobald möglich.
  const list: Action[] = [{ type: 'buildTimeMachine' }, { type: 'buildOracle' }];
  for (const s of SKILLS) list.push({ type: 'buySkill', skillId: s.id });

  // Forschung: die günstigste verfügbare zuerst.
  for (const r of [...RESEARCH].sort((a, b) => a.cost - b.cost)) list.push({ type: 'research', id: r.id });

  const locked = state.tiles.find(
    (x) => !x.unlocked && inBounds(state, x) && neighbors(state, x).some((n) => n.unlocked),
  );
  for (const id of BUILD_ORDER) {
    if (countBuildings(state, id) === 0 && buildingAvailable(state, id) === null) {
      const t = bestTile(state, id);
      if (t) list.push({ type: 'build', x: t.x, y: t.y, building: id });
      // Kein Platz für ein fehlendes Gebäude? Dann ist Roden der nächste Wunsch.
      else if (locked) list.push({ type: 'clearTile', x: locked.x, y: locked.y });
    }
  }
  for (const c of RECRUIT_ORDER) list.push({ type: 'recruit', classId: c });
  for (const spell of SPELL_IDS) list.push({ type: 'upgradeSpell', spell });
  for (const c of RECRUIT_ORDER) {
    for (const slot of GEAR_SLOTS) list.push({ type: 'craftGear', classId: c, slot });
  }

  // Günstigstes Upgrade zuerst: Gebäude nach Level sortiert.
  const built = state.tiles.filter((t) => t.building).sort((a, b) => a.level - b.level);
  for (const t of built) list.push({ type: 'upgrade', x: t.x, y: t.y });

  const t = bestTile(state, 'lumberHut');
  if (t) list.push({ type: 'build', x: t.x, y: t.y, building: 'lumberHut' });
  if (locked) list.push({ type: 'clearTile', x: locked.x, y: locked.y });
  list.push({ type: 'upgradeWall' });
  return list;
}

export class Bot {
  private clickTimer = 0;
  private idleTimer = 0;
  private shopTimer = 0;
  readonly purchases: { time: number; action: Action; label?: string }[] = [];

  constructor(private readonly options: BotOptions = DEFAULT_BOT) {}

  /** Einmal pro Logik-Tick aufrufen. */
  act(state: GameState, dt: number): void {
    const b = state.battle;
    if (b) {
      this.idleTimer = 0;
      this.clickTimer -= dt;
      if (this.clickTimer <= 0 && b.enemies.length > 0) {
        this.clickTimer = 1 / this.options.clicksPerSecond;
        // Der vorderste Alien ist der gefährlichste.
        const target = b.enemies.reduce((a, e) => (e.x < a.x ? e : a));
        if (target.x < BATTLE.spawnX - 10) dispatch(state, { type: 'clickEnemy', enemyId: target.id });
      }
      // Zauber: Steinregen und Miliz sofort, Segen erst bei angeschlagener Mauer.
      if (b.enemies.length >= 3) dispatch(state, { type: 'castSpell', spell: 'stoneRain' });
      if (b.enemies.length >= 2) dispatch(state, { type: 'castSpell', spell: 'militia' });
      if (state.battle && b.wallHp < b.wallMaxHp * 0.6)
        dispatch(state, { type: 'castSpell', spell: 'blessing' });
    } else {
      this.idleTimer += dt;
      if (this.idleTimer >= this.options.pauseBetweenBattles && troops(state).length > 0) {
        dispatch(state, { type: 'startBattle' });
      }
    }

    // Einkaufen einmal pro Sekunde reicht – Menschen klicken auch nicht schneller.
    this.shopTimer -= dt;
    if (this.shopTimer > 0) return;
    this.shopTimer = 1;
    for (const action of wishes(state)) {
      if (dispatch(state, action) === null) {
        const tile =
          action.type === 'upgrade'
            ? state.tiles.find((t) => t.x === action.x && t.y === action.y)
            : undefined;
        this.purchases.push(
          tile
            ? { time: state.time, action, label: `${tile.building} → Lv ${tile.level}` }
            : { time: state.time, action },
        );
        return;
      }
    }
  }
}

/**
 * Ein einfacher Spieler-Bot für die Simulation: startet Schlachten, klickt Aliens,
 * kauft das Sinnvollste, das er sich leisten kann. Er spielt absichtlich „okay“,
 * nicht perfekt – so bilden die Zahlen einen normalen Spieler ab.
 */
import { BUILDINGS, type BuildingId } from '../data/buildings';
import { BATTLE } from '../data/enemies';
import { GEAR_SLOTS } from '../data/gear';
import { CHRONICLE } from '../data/chronicle';
import { RESEARCH } from '../data/research';
import { BASE_PRICES } from '../data/market';
import { price, TRADABLE } from '../systems/trade';
import { powerNetwork } from '../systems/power';
import { heatRate, reactorTile } from '../systems/reactor';
import { REACTOR } from '../data/reactor';
import { resourceCap } from '../systems/resources';
import { SPELL_IDS } from '../data/spells';
import { SKILLS } from '../data/skills';
import type { ClassId } from '../data/units';
import { dispatch, type Action } from '../systems/actions';
import { chronicleBlocker, chronicleCost } from '../systems/chronicle';
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
  // Strom: dorthin, wo möglichst viele noch nicht angeschlossene Erzeuger angrenzen.
  if (id === 'powerPlant' || id === 'pylon') {
    const net = powerNetwork(state);
    const gridTiles = state.tiles.filter((t) => t.building === 'powerPlant' || t.building === 'pylon');
    const gain = (t: Tile) =>
      neighbors(state, t).filter(
        (n) => n.building && !net.connected.has(n) && !gridTiles.includes(n) && n.level > 0,
      ).length;
    const candidates =
      id === 'pylon' ? free.filter((t) => neighbors(state, t).some((n) => gridTiles.includes(n))) : free;
    return candidates.sort((a, b) => gain(b) - gain(a)).find((t) => gain(t) >= (id === 'pylon' ? 1 : 0));
  }
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
  'coalMine',
  'market',
  'gearWorks',
  'steamFoundry',
  'copperMine',
  'wireWorks',
  'powerPlant',
  'teslaTower',
  'uraniumMine',
  'rodFactory',
  'reactor',
  'coolingTower',
  'bunker',
];

const RECRUIT_ORDER: ClassId[] = [
  'monk',
  'woodcutter',
  'miner',
  'herbalist',
  'knight',
  'archer',
  'warlock',
  'stoker',
  'steamKnight',
  'lineman',
  'teslaLancer',
  'prospector',
  'rayPaladin',
  'peasant',
];

/** Kaufwünsche in Prioritätsreihenfolge; der erste, der klappt, wird gekauft. */
function wishes(state: GameState): Action[] {
  // Das große Ziel zuerst: Rechenorakel und Zeitmaschine, sobald möglich.
  const list: Action[] = [{ type: 'buildTimeMachine' }, { type: 'buildOracle' }];
  for (const s of SKILLS) list.push({ type: 'buySkill', skillId: s.id });

  // Forschung: die günstigste verfügbare zuerst.
  for (const r of [...RESEARCH].sort((a, b) => a.cost - b.cost)) list.push({ type: 'research', id: r.id });

  // Markt: volle Lager zu guten Preisen verkaufen – wie ein Spieler, der auf grüne Kurse wartet.
  for (const id of TRADABLE) {
    const full = state.resources[id].gte(resourceCap(state, id).mul(0.8));
    if (full && price(state, id) >= (BASE_PRICES[id] ?? 1) * 1.05)
      list.push({ type: 'marketSell', resource: id });
  }

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

  // Reaktor heißer als die Kühlung bei voller Kraft? Dann ein weiterer Kühlturm (höchstens 4).
  if (reactorTile(state) && heatRate(state, 1, 1) > 0 && countBuildings(state, 'coolingTower') < 4) {
    const ct =
      buildingAvailable(state, 'coolingTower') === null ? bestTile(state, 'coolingTower') : undefined;
    if (ct) list.unshift({ type: 'build', x: ct.x, y: ct.y, building: 'coolingTower' });
  }
  const pylonTile = buildingAvailable(state, 'pylon') === null ? bestTile(state, 'pylon') : undefined;
  if (pylonTile) list.unshift({ type: 'build', x: pylonTile.x, y: pylonTile.y, building: 'pylon' });

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
      // Zeitmaschine fertig? Sofort springen – zwischen zwei Schlachten.
      if (state.timeMachineAt !== null && dispatch(state, { type: 'jump' }) === null) {
        this.purchases.push({ time: state.time, action: { type: 'jump' } });
      }
      this.idleTimer += dt;
      if (this.idleTimer >= this.options.pauseBetweenBattles && troops(state).length > 0) {
        dispatch(state, { type: 'startBattle' });
      }
    }

    // Chronik: immer den günstigsten Knoten. Tokens: an die Klasse mit den meisten Einheiten.
    for (;;) {
      const cheapest = CHRONICLE.filter((c) => chronicleBlocker(state, c.id) === null).sort(
        (a, b) => chronicleCost(state, a.id) - chronicleCost(state, b.id),
      )[0];
      if (!cheapest) break;
      dispatch(state, { type: 'buyChronicle', id: cheapest.id });
    }
    if (state.respecTokens > 0) {
      const counts = new Map<ClassId, number>();
      for (const u of state.units) counts.set(u.classId, (counts.get(u.classId) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top) dispatch(state, { type: 'useToken', classId: top[0] });
    }

    // Ereignisse: die „aktive“ Antwort wählen; Drohnen fangen.
    const ev = state.events.active;
    if (ev) {
      const choice =
        {
          stableFire: 'extinguish',
          merchant: 'trade',
          defector: 'buy',
          rain: 'ok',
          harvest: 'ok',
          bard: 'listen',
          sandstorm: 'shelter',
          meltdown: 'contain',
        }[ev.id] ?? 'decline';
      if (dispatch(state, { type: 'eventChoice', option: choice }) !== null)
        dispatch(state, { type: 'eventChoice', option: 'decline' });
    }
    if (state.events.drone) dispatch(state, { type: 'catchDrone' });

    // Reaktor: höchste Leistung, bei der die Hitze in den nächsten 30 s unter 75 % bleibt.
    if (reactorTile(state)) {
      const safe = [...REACTOR.throttles]
        .reverse()
        .find((th) => heatRate(state, th, 1) <= 0 || state.reactor.heat + heatRate(state, th, 1) * 30 < 0.75);
      const want = safe ?? 0;
      if (state.reactor.throttle !== want) dispatch(state, { type: 'setThrottle', throttle: want });
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

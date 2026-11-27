/**
 * Alles, was der Spieler tun kann, als Datenobjekt („Aktion“).
 *
 * Warum der Umweg? UI, Tastenkürzel, Simulation und später die Hofbefehle
 * (Automatisierung) lösen exakt dieselben Aktionen aus. Damit gibt es nur einen
 * Weg, den Spielzustand zu verändern – und nur eine Stelle zum Testen.
 */
import { BATTLE } from '../data/enemies';
import type { BuildingId } from '../data/buildings';
import type { UnlockId } from '../data/progression';
import type { ChronicleId } from '../data/chronicle';
import type { GearSlot } from '../data/gear';
import type { OrderRule } from '../data/orders';
import type { DiceBet } from '../data/events';
import type { ResourceId } from '../data/resources';
import type { ResearchId } from '../data/research';
import type { SpellId } from '../data/spells';
import type { ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { clickEnemy, endBattle, startBattle } from './battle';
import { build, clearTile, tileAt, upgrade } from './castle';
import { canAfford, exceedsCap, pay, scaledCost, type Cost } from './resources';
import { checkUnlocks } from './progression';
import { craftGear } from './gear';
import { doResearch } from './research';
import { castSpell, upgradeSpell } from './spells';
import { buildOracle, buildTimeMachine } from './timemachine';
import { buyChronicle } from './chronicle';
import { performJump, useToken } from './prestige';
import { setOrders } from './orders';
import { catchDrone, resolveEvent, rollDice } from './events';
import { buy, sell } from './trade';
import { equipCard, unequipCard } from './power';
import { setThrottle } from './reactor';
import { startFinale } from './finale';
import { cancelCountdown, dismissResult, requestBattle } from './scene';
import { startLoop, toggleCurse } from './loop';
import { buySkill } from './skills';
import type { GameState } from './state';
import { recruit } from './units';

export type Action =
  | { type: 'startBattle'; siege?: number }
  | { type: 'retreat' }
  | { type: 'clickEnemy'; enemyId: number }
  | { type: 'build'; x: number; y: number; building: BuildingId }
  | { type: 'upgrade'; x: number; y: number }
  | { type: 'clearTile'; x: number; y: number }
  | { type: 'recruit'; classId: ClassId }
  | { type: 'buySkill'; skillId: string }
  | { type: 'upgradeWall' }
  | { type: 'research'; id: ResearchId }
  | { type: 'castSpell'; spell: SpellId }
  | { type: 'upgradeSpell'; spell: SpellId }
  | { type: 'craftGear'; classId: ClassId; slot: GearSlot }
  | { type: 'buildOracle' }
  | { type: 'buildTimeMachine' }
  | { type: 'jump' }
  | { type: 'buyChronicle'; id: ChronicleId }
  | { type: 'useToken'; classId: ClassId }
  | { type: 'setOrders'; rules: OrderRule[] }
  | { type: 'eventChoice'; option: string }
  | { type: 'catchDrone' }
  | { type: 'rollDice'; bet: DiceBet }
  | { type: 'marketSell'; resource: ResourceId }
  | { type: 'marketBuy'; resource: ResourceId }
  | { type: 'equipCard'; cardId: string }
  | { type: 'unequipCard'; cardId: string }
  | { type: 'setThrottle'; throttle: number }
  | { type: 'startFinale' }
  | { type: 'dismissResult' }
  | { type: 'requestBattle' }
  | { type: 'cancelCountdown' }
  | { type: 'toggleCurse'; curse: string }
  | { type: 'startLoop' };

/** Kosten der nächsten Mauerverstärkung = wallUpgradeCost × wallUpgradeGrowth^Stufe */
export function wallUpgradeCost(state: GameState): Cost {
  return scaledCost(BATTLE.wallUpgradeCost, BATTLE.wallUpgradeGrowth, state.wallUpgrades);
}

export function wallUpgradeBlocker(state: GameState): MessageKey | null {
  if (!state.unlocked.wall) return 'reason.unknown';
  const cost = wallUpgradeCost(state);
  if (exceedsCap(state, cost)) return 'reason.exceedsCap';
  if (!canAfford(state, cost)) return 'reason.tooExpensive';
  return null;
}

/** Welcher Bereich muss sichtbar sein, damit eine Aktion erlaubt ist? */
const REQUIRED_UNLOCK: Partial<Record<Action['type'], UnlockId>> = {
  build: 'castle',
  upgrade: 'castle',
  clearTile: 'castle',
  recruit: 'recruit',
  buySkill: 'skills',
  upgradeWall: 'wall',
  research: 'research',
  upgradeSpell: 'research',
  craftGear: 'recruit',
  buildOracle: 'research',
  buildTimeMachine: 'timeMachine',
  jump: 'timeMachine',
  setOrders: 'orders',
  eventChoice: 'castle',
  catchDrone: 'castle',
  rollDice: 'castle',
  marketSell: 'castle',
  marketBuy: 'castle',
  equipCard: 'castle',
  unequipCard: 'castle',
  setThrottle: 'castle',
  startFinale: 'castle',
  toggleCurse: 'castle',
  startLoop: 'castle',
};

/**
 * Führt eine Aktion aus. Rückgabe: null bei Erfolg, sonst der Grund als Textschlüssel.
 * Nach Erfolg werden Freischaltungen sofort geprüft – nicht erst im nächsten Tick –,
 * damit z. B. „Anwerben“ direkt nach dem ersten Gebäude erscheint.
 */
export function dispatch(state: GameState, action: Action): MessageKey | null {
  const needed = REQUIRED_UNLOCK[action.type];
  if (needed && !state.unlocked[needed]) return 'reason.notYet';
  const result = execute(state, action);
  if (result === null) checkUnlocks(state);
  return result;
}

function execute(state: GameState, action: Action): MessageKey | null {
  switch (action.type) {
    case 'startBattle':
      // Erst das Ergebnisfenster schließen – sonst wäre der Spieler noch in der Kampfphase.
      if (state.scene.result) return 'reason.resultOpen';
      return startBattle(state, action.siege);
    case 'retreat':
      if (!state.battle) return 'reason.unknown';
      state.stats.retreats++;
      endBattle(state, 'lost', true);
      return null;
    case 'clickEnemy':
      return clickEnemy(state, action.enemyId) ? null : 'reason.unknown';
    case 'build':
    case 'upgrade':
    case 'clearTile': {
      const tile = tileAt(state, action.x, action.y);
      if (!tile) return 'reason.unknown';
      if (action.type === 'build') return build(state, tile, action.building);
      if (action.type === 'upgrade') return upgrade(state, tile);
      return clearTile(state, tile);
    }
    case 'recruit':
      return recruit(state, action.classId);
    case 'buySkill':
      return buySkill(state, action.skillId);
    case 'research':
      return doResearch(state, action.id);
    case 'castSpell':
      return castSpell(state, action.spell);
    case 'upgradeSpell':
      return upgradeSpell(state, action.spell);
    case 'craftGear':
      return craftGear(state, action.classId, action.slot);
    case 'buildOracle':
      return buildOracle(state);
    case 'buildTimeMachine':
      return buildTimeMachine(state);
    case 'jump':
      return performJump(state);
    case 'buyChronicle':
      return buyChronicle(state, action.id);
    case 'useToken':
      return useToken(state, action.classId);
    case 'setOrders':
      return setOrders(state, action.rules);
    case 'eventChoice':
      return resolveEvent(state, action.option);
    case 'catchDrone':
      return catchDrone(state);
    case 'rollDice':
      return rollDice(state, action.bet);
    case 'marketSell':
      return sell(state, action.resource);
    case 'marketBuy':
      return buy(state, action.resource);
    case 'equipCard':
      return equipCard(state, action.cardId);
    case 'unequipCard':
      return unequipCard(state, action.cardId);
    case 'setThrottle':
      return setThrottle(state, action.throttle);
    case 'startFinale':
      return startFinale(state);
    case 'dismissResult':
      return dismissResult(state);
    case 'requestBattle':
      return requestBattle(state);
    case 'cancelCountdown':
      return cancelCountdown(state);
    case 'toggleCurse':
      return toggleCurse(state, action.curse);
    case 'startLoop':
      return startLoop(state);
    case 'upgradeWall': {
      const blocker = wallUpgradeBlocker(state);
      if (blocker) return blocker;
      pay(state, wallUpgradeCost(state));
      state.wallUpgrades++;
      return null;
    }
  }
}

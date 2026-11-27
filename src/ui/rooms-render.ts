/**
 * Füllt die Räume des Dorfs mit ihren (vorerst unveränderten) Panels. Es wird nur der offene
 * Raum neu geschrieben – „pro Raum ist nur sichtbar, was dort gebraucht wird“, und es spart Arbeit.
 */
import type { RoomId } from '../data/rooms';
import { SPELL_IDS } from '../data/spells';
import { t } from '../i18n';
import { spellLevel } from '../systems/spells';
import type { GameState } from '../systems/state';
import { achievementsHtml, statsHtml } from './achievements-panel';
import { castleHtml, type CastleUi } from './castle-panel';
import { chronicleHtml } from './chronicle-panel';
import { el, esc, setHtml } from './dom';
import { completionHtml } from './finale-panel';
import { loopHtml } from './loop-panel';
import { companionsHtml, marketHtml } from './market-panel';
import { ordersHtml, ordersLogHtml } from './orders-panel';
import { wallUpgradeHtml } from './panels-top';
import { bestiaryHtml, unitsHtml } from './people-panels';
import { relicsHtml } from './reactor-panel';
import { researchHtml } from './research-panel';
import { skillsHtml } from './skills-panel';
import { spellbookHtml } from './spells-panel';
import { timeMachineHtml } from './timemachine-panel';

export type Reveal = (panel: HTMLElement, visible: boolean) => void;

/** Raum-Container ein-/ausblenden; gibt true zurück, wenn der Raum gerade neu geöffnet wurde. */
export function showRoom(room: RoomId | null, reducedMotion: boolean): boolean {
  let opened = false;
  for (const node of document.querySelectorAll<HTMLElement>('#rooms .room')) {
    const visible = node.dataset.room === room;
    if (node.hidden === !visible) continue;
    node.hidden = !visible;
    if (visible) {
      opened = true;
      if (!reducedMotion) {
        node.classList.add('room-enter');
        node.addEventListener('animationend', () => node.classList.remove('room-enter'), { once: true });
      }
    }
  }
  return opened;
}

export function renderRoom(state: GameState, room: RoomId | null, castleUi: CastleUi, reveal: Reveal): void {
  switch (room) {
    case 'bau':
      setHtml(el('#castle-body'), castleHtml(state, castleUi));
      reveal(el('#wall-panel'), !!state.unlocked.wall);
      if (state.unlocked.wall) setHtml(el('#wall-body'), wallUpgradeHtml(state));
      break;
    case 'kaserne':
      setHtml(el('#units-body'), unitsHtml(state));
      break;
    case 'uebung':
      setHtml(el('#skills-body'), skillsHtml(state));
      break;
    case 'bibliothek':
      setHtml(el('#research-body'), researchHtml(state));
      break;
    case 'werkstatt':
      setHtml(el('#timemachine-body'), timeMachineHtml(state));
      break;
    case 'thronsaal': {
      reveal(el('#orders'), !!state.unlocked.orders);
      if (state.unlocked.orders) {
        setHtml(el('#orders-body'), ordersHtml(state));
        setHtml(el('#orders-log'), ordersLogHtml(state));
      }
      const anySpell = SPELL_IDS.some((id) => spellLevel(state, id) > 0);
      reveal(el('#spells'), anySpell);
      if (anySpell) setHtml(el('#spells-body'), spellbookHtml(state));
      break;
    }
    case 'markt': {
      const built = state.tiles.some((tile) => tile.building === 'market' && tile.level > 0);
      setHtml(
        el('#market-body'),
        built ? marketHtml(state) : `<p class="hint">${esc(t('room.marketBuild'))}</p>`,
      );
      break;
    }
    case 'schatzkammer': {
      reveal(el('#bestiary'), !!state.unlocked.bestiary);
      if (state.unlocked.bestiary) setHtml(el('#bestiary-body'), bestiaryHtml(state));
      // Begleiter gibt es ab Epoche 2 usw.; einmal gefunden, bleibt eine Sammlung sichtbar.
      const companions = state.epoch >= 2 || Object.keys(state.companions).length > 0;
      reveal(el('#companions'), companions);
      if (companions) setHtml(el('#companions-body'), companionsHtml(state));
      const relics = state.epoch >= 4 || Object.keys(state.relics).length > 0;
      reveal(el('#relics'), relics);
      if (relics) setHtml(el('#relics-body'), relicsHtml(state));
      const completion = state.epoch >= 5 || state.loop.count > 0;
      reveal(el('#completion'), completion);
      if (completion) setHtml(el('#completion-body'), completionHtml(state));
      const anyAchievement = Object.keys(state.achievements).length > 0;
      reveal(el('#achievements'), anyAchievement);
      if (anyAchievement) setHtml(el('#achievements-body'), achievementsHtml(state));
      break;
    }
    case 'chronik': {
      const chronicle = state.totalShards > 0;
      reveal(el('#chronicle'), chronicle);
      if (chronicle) setHtml(el('#chronicle-body'), chronicleHtml(state));
      const loop = state.finale.wins > 0 || state.loop.count > 0;
      reveal(el('#loop'), loop);
      if (loop) setHtml(el('#loop-body'), loopHtml(state));
      break;
    }
    case 'archiv':
      setHtml(el('#stats-body'), statsHtml(state));
      break;
    case null:
      break;
  }
}

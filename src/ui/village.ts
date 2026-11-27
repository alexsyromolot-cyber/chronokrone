/**
 * Dorfphase: Reiterleiste mit Pixel-Icons und die Leiste „Zur Mauer“ (Stufenwahl, Karten).
 */
import { ROOM_RESOURCES, type RoomId } from '../data/rooms';
import { t, tk } from '../i18n';
import { spriteUrl } from '../render/pixel';
import { ROOM_ICONS } from '../render/icons';
import { BATTLE } from '../data/enemies';
import { startBattleBlocker } from '../systems/battle';
import { roomUnlocked, visibleRooms } from '../systems/rooms';
import type { GameState } from '../systems/state';
import { esc, num, reasonText, tip } from './dom';
import { action } from './panels-top';

/** UI-Zustand des Dorfs (nicht gespeichert): offener Raum, gewählte Stufe, Karten-Ablage offen. */
export interface VillageUi {
  room: RoomId;
  siege: number | null;
  cardsOpen: boolean;
}

/** Offener Raum – fällt auf den ersten freien zurück, falls er (noch) nicht da ist. */
export function currentRoom(state: GameState, ui: VillageUi): RoomId | null {
  if (roomUnlocked(state, ui.room)) return ui.room;
  return visibleRooms(state).find((r) => !r.locked)?.id ?? null;
}

export function tabsHtml(state: GameState, room: RoomId | null): string {
  return visibleRooms(state)
    .map(({ id, locked }) => {
      const name = tk(`room.${id}`);
      const label = locked ? `${name}\n${tk(`room.locked.${id}`)}` : name;
      return `<button class="tab ${id === room ? 'active' : ''} ${locked ? 'locked' : ''}" data-room-tab="${id}" aria-label="${esc(name)}" ${tip(label)}>
        <img src="${spriteUrl(ROOM_ICONS[id])}" alt="">${locked ? '<span class="lock">🔒</span>' : ''}
      </button>`;
    })
    .join('');
}

export function roomResources(room: RoomId | null) {
  return room ? ROOM_RESOURCES[room] : 'all';
}

/** „Zur Mauer“ mit Stufenwahl; Karten werden direkt vor der Schlacht gelegt. */
export function prepHtml(state: GameState, ui: VillageUi, cardsVisible: boolean): string {
  const siege = Math.min(ui.siege ?? state.siegeLevel, state.siegeLevel);
  const blocker = startBattleBlocker(state, siege);
  const options = Array.from({ length: state.siegeLevel + 1 }, (_, s) => s)
    .reverse()
    .map(
      (s) =>
        `<option value="${s}" ${s === siege ? 'selected' : ''}>${esc(t('battle.siege', { siege: s + 1 }))}</option>`,
    )
    .join('');
  const siegeTip =
    t('village.siegeTip') +
    '\n' +
    t('battle.siegeTip', { hp: num(BATTLE.hpGrowthPerSiege, 1), gold: num(BATTLE.goldGrowthPerSiege, 1) });
  const siegePicker = state.unlocked.siege
    ? `<select class="siege-select" data-siege-select ${tip(siegeTip)} aria-label="${esc(t('village.siege'))}">${options}</select>`
    : '';
  const cards = cardsVisible
    ? `<button class="btn ${ui.cardsOpen ? 'primary' : ''}" data-cards-toggle ${tip(t('village.cardsTip'))}>${esc(t('village.cards'))}</button>`
    : '';
  return `<button class="btn primary to-wall" id="start-battle" ${blocker ? 'disabled' : ''} ${action({ type: 'startBattle', siege })} ${tip(
    blocker ? reasonText(blocker) : t('village.toWallTip'),
  )}>⚔ ${esc(t('village.toWall'))}</button>${siegePicker}${cards}`;
}

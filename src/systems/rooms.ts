/**
 * Wann welcher Raum des Dorfs erscheint – abgeleitet aus den bestehenden Freischaltungen,
 * damit das Spieltempo gleich bleibt. Reine Logik (testbar ohne DOM).
 */
import { ROOM_IDS, type RoomId } from '../data/rooms';
import { SPELL_IDS } from '../data/spells';
import { spellLevel } from './spells';
import type { GameState } from './state';

export function roomUnlocked(state: GameState, id: RoomId): boolean {
  const u = state.unlocked;
  switch (id) {
    case 'bau':
    case 'kaserne':
    case 'archiv':
      return !!u.castle;
    case 'uebung':
      return !!u.skills;
    case 'bibliothek':
      return !!u.research;
    case 'werkstatt':
      return !!u.timeMachine;
    case 'thronsaal':
      return !!u.orders || SPELL_IDS.some((s) => spellLevel(state, s) > 0);
    case 'markt':
      return state.epoch >= 2;
    case 'schatzkammer':
      return !!u.bestiary;
    case 'chronik':
      return state.totalShards > 0 || state.finale.wins > 0 || state.loop.count > 0;
  }
}

/**
 * Angekündigt, aber noch zu: zeigt ein Schloss. Damit die Leiste am Anfang nicht voller
 * Schlösser hängt, erscheinen gesperrte Räume erst, sobald es das Dorf überhaupt gibt –
 * und der Markt erst kurz vor seiner Epoche (ab der Zeitmaschine).
 */
export function roomAnnounced(state: GameState, id: RoomId): boolean {
  if (!state.unlocked.castle) return false;
  if (id === 'markt') return !!state.unlocked.timeMachine || state.epoch >= 2;
  return true;
}

export function visibleRooms(state: GameState): { id: RoomId; locked: boolean }[] {
  return ROOM_IDS.filter((id) => roomUnlocked(state, id) || roomAnnounced(state, id)).map((id) => ({
    id,
    locked: !roomUnlocked(state, id),
  }));
}

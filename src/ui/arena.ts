/**
 * Kampfphase: HUD-Karte (Stufe, Welle, Mauer, Wut, Beute) und die Truppenleiste rechts.
 * Einheiten haben keine eigenen Lebenspunkte – der Balken zeigt deshalb die Erfahrung bis
 * zum nächsten Level (das, was in der Schlacht tatsächlich wächst).
 */
import { BATTLE } from '../data/enemies';
import { CLASSES } from '../data/units';
import { t, tk } from '../i18n';
import { spriteUrl } from '../render/pixel';
import { UNIT_SPRITES } from '../render/sprites';
import type { GameState } from '../systems/state';
import { troops, xpForNext } from '../systems/units';
import { esc, num, tip } from './dom';
import { battleHudHtml } from './panels-top';

/** Sekunden bis zur Wut, solange sie noch nicht da ist. */
function enrageIn(state: GameState): number | null {
  const b = state.battle;
  if (!b) return null;
  const left = BATTLE.enrageAfter - b.elapsed;
  return left > 0 && left <= 60 ? Math.ceil(left) : null;
}

export function arenaHudHtml(state: GameState): string {
  const b = state.battle;
  if (!b) return '';
  const rage = enrageIn(state);
  return `${battleHudHtml(state)}
    <div class="hud-row">
      <span class="chip loot" ${tip(t('hud.lootTip'))}>${esc(t('hud.loot', { gold: num(b.goldEarned) }))}</span>
      ${rage !== null ? `<span class="chip warn">${esc(t('hud.enrageIn', { s: rage }))}</span>` : ''}
    </div>`;
}

export function troopListHtml(state: GameState): string {
  const team = troops(state);
  if (team.length === 0) return `<p class="hint">${esc(t('troops.none'))}</p>`;
  const rows = team
    .map((u) => {
      const need = xpForNext(u.level);
      const share = Math.min(1, u.xp / need);
      return `<li ${tip(`${tk(`class.${u.classId}`)} · Lv ${u.level}\nXP ${num(u.xp)}/${num(need)}`)}>
        <img src="${spriteUrl(UNIT_SPRITES[u.classId])}" alt="">
        <div class="troop-info"><span>${esc(tk(`class.${u.classId}`))}</span><small>Lv ${u.level}</small>
          <span class="bar-mini"><span style="width:${(share * 100).toFixed(0)}%;background:${CLASSES[u.classId].color}"></span></span></div>
      </li>`;
    })
    .join('');
  return `<h3>${esc(t('troops.title'))}</h3><ul>${rows}</ul>`;
}

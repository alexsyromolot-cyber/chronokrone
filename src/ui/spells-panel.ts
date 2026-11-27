/**
 * Zauber: Knöpfe in der Schlacht (mit Abklingbalken und Tastenkürzel 1–3) und das
 * Zauberbuch zum Aufwerten.
 */
import { SPELL_IDS, SPELLS, type SpellId } from '../data/spells';
import { t, tk } from '../i18n';
import { globalBonus } from '../systems/skills';
import {
  castBlocker,
  spellLevel,
  spellDamage,
  spellPower,
  spellUpgradeBlocker,
  spellUpgradeCost,
} from '../systems/spells';
import type { GameState } from '../systems/state';
import { costHtml, esc, num, pct, reasonText, tip } from './dom';
import { action } from './panels-top';

/** Angriffszauber zeigen Faktor und Schaden, der Segen einen Prozentwert. */
function shown(state: GameState, id: SpellId): string {
  return id === 'blessing' ? pct(spellPower(state, id)) : num(spellPower(state, id), 2);
}

function effectText(state: GameState, id: SpellId): string {
  return tk(`spell.${id}.fx`, { v: shown(state, id), dmg: num(spellDamage(state, id), 1) });
}

function powerTip(state: GameState, id: SpellId): string {
  const def = SPELLS[id];
  return `${tk(`spell.${id}`)}\n${effectText(state, id)}\n${t('spells.powerTip', {
    base: id === 'blessing' ? pct(def.power) : num(def.power, 2),
    per: pct(def.perLevel),
    sp: pct(globalBonus(state, 'spellPower')),
    v: shown(state, id),
  })}\n${t('spells.cooldown', { s: def.cooldown })}`;
}

/** Zauberknöpfe für das Schlacht-HUD; leer, solange kein Zauber erforscht ist. */
export function spellButtonsHtml(state: GameState): string {
  const b = state.battle;
  if (!b) return '';
  const buttons = SPELL_IDS.filter((id) => spellLevel(state, id) > 0).map((id) => {
    const cd = b.spellCooldowns[id] ?? 0;
    const ready = castBlocker(state, id) === null;
    const fill = ready ? 100 : 100 - (cd / SPELLS[id].cooldown) * 100;
    return `<button class="btn spell ${ready ? 'ready' : ''}" ${ready ? '' : 'disabled'} ${action({ type: 'castSpell', spell: id })} ${tip(
      powerTip(state, id),
    )} style="--fill:${fill.toFixed(0)}%;--spell:${SPELLS[id].color}">
      <kbd>${SPELLS[id].key}</kbd> ${esc(tk(`spell.${id}`))}${ready ? '' : ` · ${Math.ceil(cd)} s`}
    </button>`;
  });
  return buttons.length ? `<div class="hud-row spells">${buttons.join('')}</div>` : '';
}

export function spellbookHtml(state: GameState): string {
  return SPELL_IDS.filter((id) => spellLevel(state, id) > 0)
    .map((id) => {
      const def = SPELLS[id];
      const blocker = spellUpgradeBlocker(state, id);
      const maxed = blocker === 'reason.maxRank';
      return `<div class="option">
        <span class="spell-dot" style="background:${def.color}"></span>
        <div><strong>${esc(tk(`spell.${id}`))}</strong> <span class="lv">${esc(
          t('spells.level', { level: spellLevel(state, id), max: def.maxLevel }),
        )}</span>
          <p class="desc" ${tip(powerTip(state, id))}>${esc(effectText(state, id))} ⓘ</p>
          ${maxed ? '' : costHtml(state, spellUpgradeCost(state, id))}</div>
        <button class="btn" ${blocker ? 'disabled' : ''} ${action({ type: 'upgradeSpell', spell: id })} ${tip(
          blocker ? reasonText(blocker) : t('spells.upgrade'),
        )}>${esc(t('spells.upgrade'))}</button>
      </div>`;
    })
    .join('');
}

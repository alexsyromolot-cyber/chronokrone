/**
 * Leute (Einheiten + Anwerben), Skilltrees und Bestiarium.
 */
import { BESTIARY_TIERS, ENEMIES, type EnemyId } from '../data/enemies';
import { bestiaryBonus } from '../systems/battle';
import { GEAR, GEAR_EFFECTS, GEAR_SLOTS } from '../data/gear';
import { CLASS_ORDER, CLASSES, type ClassId } from '../data/units';
import { t, tk } from '../i18n';
import { gearBlocker, gearCost, gearTier } from '../systems/gear';
import type { GameState, Unit } from '../systems/state';
import {
  attackInterval,
  attributesOf,
  damageBonus,
  recruitBlocker,
  recruitCost,
  troopCapacity,
  troops,
  unitDamage,
  workPower,
  xpForNext,
} from '../systems/units';
import { spriteUrl } from '../render/pixel';
import { ENEMY_SPRITES, UNIT_SPRITES } from '../render/sprites';
import { costHtml, esc, num, pct, reasonText, tip } from './dom';
import { action, xpFormulaParams } from './panels-top';

function unitRow(state: GameState, unit: Unit, index: number): string {
  const def = CLASSES[unit.classId];
  const attrs = attributesOf(unit);
  const need = xpForNext(unit.level);
  const attrHtml = (['str', 'dex', 'mag', 'end'] as const)
    .map((a) => `<span>${esc(t(`attr.${a}`))} ${num(attrs[a], 1)}</span>`)
    .join('');
  let role: string;
  let roleTip: string;
  if (def.role === 'troop') {
    role = t('units.damage', {
      dmg: num(unitDamage(state, unit), 1),
      sec: num(attackInterval(state, unit), 2),
    });
    roleTip = t('units.damageTip', {
      base: def.baseDamage,
      attr: t(`attr.${def.mainAttr}`),
      str: num(attrs[def.mainAttr], 1),
      bonus: pct(damageBonus(state, unit)),
      interval: def.attackInterval,
      dex: num(attrs.dex, 1),
    });
  } else {
    role = t('units.work', { pct: pct(workPower(unit)) });
    roleTip = t('units.workTip', { attr: t(`attr.${def.mainAttr}`), value: num(attrs[def.mainAttr], 1) });
  }
  return `<li class="unit">
    <img src="${spriteUrl(UNIT_SPRITES[unit.classId])}" alt="">
    <div class="unit-main">
      <div><strong>${esc(t(`class.${unit.classId}`))} ${index}</strong> <span class="lv">${esc(t('units.level', { level: unit.level }))}</span></div>
      <div class="bar xp" ${tip(t('units.xpTip', { xp: num(unit.xp, 1), need, ...xpFormulaParams() }))}><div class="fill" style="width:${Math.min(
        100,
        (unit.xp / need) * 100,
      ).toFixed(1)}%"></div></div>
      <div class="attrs" ${tip(t('attr.tip'))}>${attrHtml}</div>
      <div class="role" ${tip(roleTip)}>${esc(role)}</div>
    </div>
  </li>`;
}

export function unitsHtml(state: GameState): string {
  const counters: Partial<Record<ClassId, number>> = {};
  const rows = state.units
    .map((u) => {
      counters[u.classId] = (counters[u.classId] ?? 0) + 1;
      return unitRow(state, u, counters[u.classId]!);
    })
    .join('');

  const recruit = CLASS_ORDER.map((c) => {
    const blocker = recruitBlocker(state, c);
    const def = CLASSES[c];
    if (blocker === 'reason.requiresBuilding') return '';
    return `<div class="option">
      <img src="${spriteUrl(UNIT_SPRITES[c])}" alt="">
      <div><strong>${esc(t(`class.${c}`))}</strong><p class="desc">${esc(t(`class.${c}.desc`))}</p>${costHtml(state, recruitCost(state, c))}</div>
      <button class="btn" ${blocker ? 'disabled' : ''} ${action({ type: 'recruit', classId: c })} ${tip(
        `${t('units.recruitTip', { growth: num(def.costGrowth, 2) })}${blocker ? `\n${reasonText(blocker)}` : ''}`,
      )}>${esc(t('units.recruit'))}</button>
    </div>`;
  }).join('');

  return `<p class="tag">${esc(t('units.troops', { n: troops(state).length, max: troopCapacity(state) }))}</p>
    ${state.unlocked.recruit ? `<div class="recruit">${recruit}</div>` : ''}
    <ul class="unit-list">${rows}</ul>
    ${gearHtml(state)}`;
}

/** Ausrüstung je Klasse: drei Slots, eine Stufe gilt für alle Einheiten der Klasse. */
export function gearHtml(state: GameState): string {
  if (!state.tiles.some((tile) => tile.building === 'smithy' || tile.building === 'scriptorium')) return '';
  const rows = CLASS_ORDER.filter((c) => state.units.some((u) => u.classId === c))
    .map((c) => {
      const role = CLASSES[c].role;
      const slots = GEAR_SLOTS.map((slot) => {
        const tier = gearTier(state, c, slot);
        const def = GEAR[slot];
        const blocker = gearBlocker(state, c, slot);
        const fx =
          slot === 'weapon'
            ? t(role === 'troop' ? 'gear.weaponTroop' : 'gear.weaponGatherer', {
                v: pct(role === 'troop' ? GEAR_EFFECTS.weaponDamage : GEAR_EFFECTS.weaponProduction),
              })
            : slot === 'armor'
              ? t('gear.armorFx', { v: GEAR_EFFECTS.armorEndurance })
              : t('gear.talismanFx', { v: pct(GEAR_EFFECTS.talismanXp) });
        const tipText = `${tk(`gear.${slot}`)}: ${fx}\n${t('gear.costTip')}${blocker && tier < def.maxTier ? `\n${reasonText(blocker)}` : ''}`;
        return `<button class="gear-slot ${tier > 0 ? 'owned' : ''}" ${blocker ? 'disabled' : ''} ${action({
          type: 'craftGear',
          classId: c,
          slot,
        })} ${tip(tipText)}>
          <span class="name">${esc(tk(`gear.${slot}`))} ${esc(t('gear.tier', { tier, max: def.maxTier }))}</span>
          ${tier < def.maxTier ? costHtml(state, gearCost(state, c, slot)) : ''}
        </button>`;
      }).join('');
      return `<div class="gear-row"><img src="${spriteUrl(UNIT_SPRITES[c])}" alt=""><strong>${esc(t(`class.${c}`))}</strong>${slots}</div>`;
    })
    .join('');
  return `<h3 class="sub">${esc(t('gear.title'))}</h3>${rows}`;
}

export function bestiaryHtml(state: GameState): string {
  return (Object.keys(ENEMIES) as EnemyId[])
    .map((id) => {
      const kills = state.bestiary[id] ?? 0;
      if (!kills)
        return `<li class="beast unknown"><span class="silhouette"></span>${esc(t('bestiary.unknown'))}</li>`;
      return `<li class="beast">
        <img src="${spriteUrl(ENEMY_SPRITES[id])}" alt="">
        <div><strong>${esc(t(`enemy.${id}`))}</strong>${ENEMIES[id].elite ? ` <span class="tag elite">${esc(t('bestiary.elite'))}</span>` : ''}
        <span class="lv">${esc(t('bestiary.kills', { n: kills }))}</span>
        <span class="good" ${tip(t('bestiary.bonusTip', { tiers: BESTIARY_TIERS.join(' / ') }))}>${esc(
          t('bestiary.bonus', { pct: pct(bestiaryBonus(state, id)) }),
        )}</span>
        <p class="desc">${esc(t(`enemy.${id}.desc`))}</p></div>
      </li>`;
    })
    .join('');
}

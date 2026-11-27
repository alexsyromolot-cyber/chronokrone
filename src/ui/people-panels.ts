/**
 * Leute (Einheiten + Anwerben), Skilltrees und Bestiarium.
 */
import { ENEMIES, type EnemyId } from '../data/enemies';
import { SKILLS } from '../data/skills';
import { CLASSES, type ClassId } from '../data/units';
import { t } from '../i18n';
import type { MessageKey } from '../i18n/de';
import { skillBlocker, skillBonus, skillRank } from '../systems/skills';
import type { GameState, Unit } from '../systems/state';
import { BARRACKS } from '../data/buildings';
import {
  attackInterval,
  attributesOf,
  barracksLevel,
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

const CLASS_ORDER: ClassId[] = ['peasant', 'knight', 'woodcutter'];

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
    const bonus =
      skillBonus(state, unit.classId, 'damageMult') + BARRACKS.damageBonusPerLevel * barracksLevel(state);
    role = t('units.damage', { dmg: num(unitDamage(state, unit), 1), sec: num(attackInterval(unit), 2) });
    roleTip = t('units.damageTip', {
      base: def.baseDamage,
      str: num(attrs.str, 1),
      bonus: pct(bonus),
      interval: def.attackInterval,
      dex: num(attrs.dex, 1),
    });
  } else {
    role = t('units.work', { pct: pct(workPower(unit)) });
    roleTip = t('class.woodcutter.desc');
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
    <ul class="unit-list">${rows}</ul>`;
}

export function skillsHtml(state: GameState): string {
  return CLASS_ORDER.filter((c) => state.units.some((u) => u.classId === c))
    .map((c) => {
      const nodes = SKILLS.filter((s) => s.classId === c)
        .map((s) => {
          const rank = skillRank(state, s.id);
          const blocker = skillBlocker(state, s.id);
          const req = s.requires
            ? `\n${t('skills.requires', { name: t(`skill.${s.requires}` as MessageKey) })}`
            : '';
          const tipText = `${t(`skill.${s.id}` as MessageKey)}\n${t(`skill.${s.id}.desc` as MessageKey)}${req}${blocker ? `\n${reasonText(blocker)}` : ''}`;
          return `<button class="skill ${rank >= s.maxRank ? 'maxed' : ''} ${rank > 0 ? 'learned' : ''}" ${
            blocker ? 'disabled' : ''
          } ${action({ type: 'buySkill', skillId: s.id })} ${tip(tipText)} style="grid-column:${s.pos[0] + 1};grid-row:${s.pos[1] + 1}">
            <span class="name">${esc(t(`skill.${s.id}` as MessageKey))}</span>
            <span class="rank">${esc(t('skills.rank', { rank, max: s.maxRank }))}</span>
          </button>`;
        })
        .join('');
      return `<div class="tree">
        <h4><img src="${spriteUrl(UNIT_SPRITES[c])}" alt=""> ${esc(t(`class.${c}`))}
          <span class="points ${state.skillPoints[c] > 0 ? 'has' : ''}">${esc(t('skills.points', { n: state.skillPoints[c] }))}</span></h4>
        <div class="nodes">${nodes}</div>
      </div>`;
    })
    .join('');
}

export function bestiaryHtml(state: GameState): string {
  return (Object.keys(ENEMIES) as EnemyId[])
    .map((id) => {
      const kills = state.bestiary[id] ?? 0;
      if (!kills)
        return `<li class="beast unknown"><span class="silhouette"></span>${esc(t('bestiary.unknown'))}</li>`;
      return `<li class="beast">
        <img src="${spriteUrl(ENEMY_SPRITES[id])}" alt="">
        <div><strong>${esc(t(`enemy.${id}`))}</strong> <span class="lv">${esc(t('bestiary.kills', { n: kills }))}</span>
        <p class="desc">${esc(t(`enemy.${id}.desc`))}</p></div>
      </li>`;
    })
    .join('');
}

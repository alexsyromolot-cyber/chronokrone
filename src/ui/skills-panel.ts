/**
 * Skilltrees: je Klasse ein 4×4-Icon-Raster. Zeilen 0–1 allgemein, Zeilen 2–3 die beiden
 * Spezialisierungswege. Beschreibungen entstehen aus dem Effekt (data/skills.ts).
 */
import { CLASS_SCOPED, SKILLS, type SkillDef } from '../data/skills';
import { CLASS_ORDER, type ClassId } from '../data/units';
import { t, tk } from '../i18n';
import { hasResearch } from '../systems/research';
import { canSpecialize, skillBlocker, skillRank } from '../systems/skills';
import type { GameState } from '../systems/state';
import { spriteUrl } from '../render/pixel';
import { UNIT_SPRITES } from '../render/sprites';
import { esc, num, pct, reasonText, tip } from './dom';
import { action } from './panels-top';

/** Text wie „+50 % Schaden je Stufe“ aus Effektart und Wert. */
export function skillEffectText(skill: SkillDef): string {
  const { kind, perRank, building } = skill.effect;
  let v: string;
  if (kind === 'rangeAdd' || kind === 'goldPerSecond') v = num(perRank, 2);
  else v = pct(perRank);
  const fx = tk(`skillfx.${kind}`, {
    v,
    building: building ? tk(`building.${building}`) : '',
    cls: tk(`class.${skill.classId}`),
  });
  const text = skill.maxRank > 1 ? t('skills.perRank', { fx }) : fx;
  return CLASS_SCOPED.includes(kind) ? text : `${text} (${t('skills.global')})`;
}

/** Rasterzeile: Zeile 3 der Darstellung gehört der Wege-Beschriftung, Spezialisierungen rutschen eins tiefer. */
function gridRow(s: SkillDef): number {
  return s.pos[1] + 1 + (s.pos[1] >= 2 ? 1 : 0);
}

function nodeHtml(state: GameState, s: SkillDef): string {
  const rank = skillRank(state, s.id);
  const blocker = skillBlocker(state, s.id);
  const req = s.requires ? `\n${t('skills.requires', { name: tk(`skill.${s.requires}`) })}` : '';
  const tipText = `${tk(`skill.${s.id}`)}\n${skillEffectText(s)}${req}${blocker && rank < s.maxRank ? `\n${reasonText(blocker)}` : ''}`;
  const chosen = state.specs[s.classId];
  const classes = ['skill'];
  if (rank >= s.maxRank) classes.push('maxed');
  if (rank > 0) classes.push('learned');
  if (s.spec) classes.push(`spec-${s.spec}`);
  if (s.spec && chosen && chosen !== s.spec) classes.push('closed');
  return `<button class="${classes.join(' ')}" ${blocker ? 'disabled' : ''} ${action({ type: 'buySkill', skillId: s.id })} ${tip(
    tipText,
  )} style="grid-column:${s.pos[0] + 1};grid-row:${gridRow(s)}">
    <span class="name">${esc(tk(`skill.${s.id}`))}</span>
    <span class="rank">${esc(t('skills.rank', { rank, max: s.maxRank }))}</span>
  </button>`;
}

function specLine(state: GameState, c: ClassId): string {
  const chosen = state.specs[c];
  if (chosen)
    return `<p class="spec-line good">${esc(t('skills.specChosen', { spec: tk(`spec.${c}.${chosen}`) }))}</p>`;
  if (hasResearch(state, 'specialization') && canSpecialize(state, c)) {
    return `<p class="spec-line ready">${esc(t('skills.specOpen'))}</p>`;
  }
  return `<p class="spec-line hint">${esc(t('skills.specHint'))}</p>`;
}

export function skillsHtml(state: GameState): string {
  return CLASS_ORDER.filter((c) => state.units.some((u) => u.classId === c))
    .map((c) => {
      const nodes = SKILLS.filter((s) => s.classId === c)
        .map((s) => nodeHtml(state, s))
        .join('');
      return `<div class="tree">
        <h4><img src="${spriteUrl(UNIT_SPRITES[c])}" alt=""> ${esc(t(`class.${c}`))}
          <span class="points ${state.skillPoints[c] > 0 ? 'has' : ''}">${esc(t('skills.points', { n: state.skillPoints[c] }))}</span></h4>
        ${specLine(state, c)}
        <div class="nodes">
          <span class="path-label a">${esc(t('skills.pathA', { spec: tk(`spec.${c}.a`) }))}</span>
          <span class="path-label b">${esc(t('skills.pathB', { spec: tk(`spec.${c}.b`) }))}</span>
          ${nodes}
        </div>
      </div>`;
    })
    .join('');
}

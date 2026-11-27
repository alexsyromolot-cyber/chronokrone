/**
 * Zeitschleife: Siegel, Regel der nächsten Schleife, Fluch-Auswahl, Bestzeiten.
 * Erscheint unter der Zeitmaschine, sobald das Mutterschiff einmal gefallen ist.
 */
import {
  CURSE_IDS,
  CURSE_NUMBERS,
  LOOP,
  LOOP_RULE_NUMBERS,
  type CurseId,
  type LoopRuleId,
} from '../data/loop';
import { t, tk } from '../i18n';
import {
  curseShardMult,
  loopBlocker,
  loopRule,
  nextLoopRule,
  sealBonus,
  sealsForLoop,
} from '../systems/loop';
import { shardsForJump } from '../systems/prestige';
import type { GameState } from '../systems/state';
import { esc, num, pct, reasonText, tip } from './dom';
import { action } from './panels-top';

export function ruleText(id: LoopRuleId): string {
  const N = LOOP_RULE_NUMBERS;
  return tk(`loop.rule.${id}.desc`, {
    speed: pct(N.swiftSpeed - 1),
    gold: pct(N.swiftGold - 1),
    armor: pct(N.extraMeleeArmor),
  });
}

export function curseText(id: CurseId): string {
  const N = CURSE_NUMBERS;
  return tk(`curse.${id}.desc`, {
    pct: pct(id === 'frailWalls' ? N.frailWallsMult : id === 'weakClicks' ? N.weakClicksMult : N.leanMult),
    mult: N.toughAliensMult,
    s: N.shortFuseSeconds,
  });
}

export const hms = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export function curseListText(curses: string[]): string {
  return curses.length ? curses.map((c) => tk(`curse.${c}`)).join(', ') : t('loop.noCurses');
}

/** Status der laufenden Schleife – auch vor dem Finale sichtbar, sobald man in einer Schleife ist. */
function currentHtml(state: GameState): string {
  const rule = loopRule(state);
  if (!rule) return '';
  return `<p ${tip(ruleText(rule))}>${esc(t('loop.current', { n: state.loop.count, rule: tk(`loop.rule.${rule}`) }))} ⓘ</p>
    <p class="hint">${esc(t('loop.currentCurses', { list: curseListText(state.loop.curses) }))}</p>`;
}

export function loopHtml(state: GameState): string {
  const seals = `<p>${esc(
    t('loop.seals', {
      seals: num(state.loop.seals, 1),
      pct: pct(sealBonus(state)),
      per: pct(LOOP.sealBonus),
    }),
  )}</p>`;
  if (state.finale.wonAt === null) return currentHtml(state) + seals;

  const next = nextLoopRule(state);
  const curses = CURSE_IDS.map((id) => {
    const on = state.loop.nextCurses.includes(id);
    return `<label class="curse ${on ? 'on' : ''}" ${tip(curseText(id))}>
      <input type="checkbox" ${on ? 'checked' : ''} ${action({ type: 'toggleCurse', curse: id })}>
      <b>${esc(tk(`curse.${id}`))}</b> <small>${esc(curseText(id))}</small></label>`;
  }).join('');
  const best = Object.entries(state.loop.best)
    .sort((a, b) => a[1] - b[1])
    .map(
      ([key, sec]) =>
        `<li>${esc(t('loop.best', { curses: curseListText(key ? key.split('+') : []), time: hms(sec) }))}</li>`,
    )
    .join('');
  const blocker = loopBlocker(state);
  return `${currentHtml(state)}
    <p>${esc(t('loop.intro'))}</p>
    ${seals}
    <p class="good">${esc(t('loop.gain', { seals: num(sealsForLoop(state), 1), shards: Math.round(shardsForJump(state) * curseShardMult(state)) }))}</p>
    <p>${esc(t('loop.nextRule', { rule: tk(`loop.rule.${next}`), desc: ruleText(next) }))}</p>
    <h3>${esc(t('loop.cursesTitle', { n: state.loop.nextCurses.length, max: LOOP.maxCurses }))}</h3>
    <p class="hint">${esc(t('loop.cursesHint', { shards: pct(LOOP.shardBonusPerCurse), seal: num(LOOP.sealPerCurse, 1) }))}</p>
    <div class="curses">${curses}</div>
    <h3>${esc(t('loop.bestTitle'))}</h3>
    ${best ? `<ul class="best-times">${best}</ul>` : `<p class="hint">${esc(t('loop.bestNone'))}</p>`}
    <div class="buy"><button class="btn primary jump" data-loop="1" ${blocker ? `disabled ${tip(reasonText(blocker))}` : ''}>${esc(t('loop.button'))}</button></div>`;
}

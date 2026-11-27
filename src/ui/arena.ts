/**
 * Kampf-Overlay im Stil „Mittelalter mit Zeitreise“: Holztafeln mit Eisenbeschlag und
 * Messing-Zahnrädern (Grafiken aus `npm run sprites`, siehe scripts/sprites/ui.mjs).
 *
 * Links: Belagerung – Pergamentband mit Stufe, acht Zahnräder als Wellen (wie die Stunden
 * einer Uhr), Mauer als Steinbalken, Sanduhr bis zur Wut, Beutel mit der Beute.
 * Rechts: Truppen als Porträts in Taschenuhr-Medaillons, Level in römischen Zahlen.
 * Einheiten haben keine eigenen Lebenspunkte – der Messingbalken zeigt die Erfahrung.
 */
import { BATTLE } from '../data/enemies';
import { CLASSES } from '../data/units';
import { t, tk } from '../i18n';
import figuresUrl from '../assets/sprites/figures.png';
import figuresAtlas from '../assets/sprites/figures.json';
import gearOn from '../assets/ui/gear-on.png';
import gearOff from '../assets/ui/gear-off.png';
import pouchUrl from '../assets/ui/pouch.png';
import hg0 from '../assets/ui/hourglass-0.png';
import hg1 from '../assets/ui/hourglass-1.png';
import hg2 from '../assets/ui/hourglass-2.png';
import hg3 from '../assets/ui/hourglass-3.png';
import hg4 from '../assets/ui/hourglass-4.png';
import hgAngry from '../assets/ui/hourglass-angry.png';
import { spriteUrl } from '../render/pixel';
import { UNIT_SPRITES } from '../render/sprites';
import { clickDamage, eliteForSiege, enrageFactor, wallMaxHp } from '../systems/battle';
import { isRested } from '../systems/recap';
import { keepLevel } from '../systems/resources';
import { skillBonus } from '../systems/skills';
import type { GameState, Unit } from '../systems/state';
import { attributesOf, troops, xpForNext } from '../systems/units';
import { esc, num, pct, tip } from './dom';
import { action } from './panels-top';

const HOURGLASS = [hg0, hg1, hg2, hg3, hg4];
const frames = (figuresAtlas as { frames: Record<string, { frame: { x: number; y: number } }> }).frames;

/** Römische Zahl fürs Level – passt zur Zeit, bis 3999 reicht es locker. */
export function roman(n: number): string {
  if (n < 1 || n > 3999) return String(n);
  const table: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let out = '';
  for (const [v, s] of table) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Porträt: Kopf und Schultern aus dem neuen Figuren-Atlas, sonst die alte Grafik. */
function portrait(unit: Unit): string {
  const f = frames[`${unit.classId}_idle_0`]?.frame;
  if (!f) return `<img class="portrait" src="${spriteUrl(UNIT_SPRITES[unit.classId])}" alt="">`;
  // Ausschnitt 12×12 um den Kopf (ab 10, 2 im 32er-Bild), dreifach vergrößert.
  const x = -(f.x + 10) * 3;
  const y = -(f.y + 2) * 3;
  return `<span class="portrait" style="background-image:url(${figuresUrl});background-position:${x}px ${y}px"></span>`;
}

export function arenaHudHtml(state: GameState): string {
  const b = state.battle;
  if (!b) return '';
  const extras: string[] = [];
  if (state.events.drone) extras.push(`<div class="hud-note drone-hint">${esc(t('drone.hint'))}</div>`);
  if (isRested(state)) {
    const left = Math.ceil(state.session.restedUntil - state.time);
    const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    extras.push(
      `<div class="hud-note rested" ${tip(t('hud.restedTip'))}>${esc(t('hud.rested', { time }))}</div>`,
    );
  }
  const elite = eliteForSiege(b.siege);
  if (elite && b.wave < BATTLE.wavesPerBattle) {
    const name = state.bestiary[elite] ? tk(`enemy.${elite}`) : '???';
    extras.push(`<div class="hud-note elite-hint">${esc(t('battle.eliteHint', { name }))}</div>`);
  }

  // Wellen als Zahnräder einer Uhr: vergangene glänzen in Messing.
  const wave = Math.max(1, b.wave);
  const gears = Array.from(
    { length: BATTLE.wavesPerBattle },
    (_, i) => `<img src="${i < wave ? gearOn : gearOff}" alt="">`,
  ).join('');

  const wallPct = Math.max(0, b.wallHp / b.wallMaxHp);
  const endurance = troops(state).reduce((s, u) => s + attributesOf(u).end, 0);
  const wallTip = t('battle.wallTip', {
    base: BATTLE.wallBaseHp,
    per: BATTLE.wallHpPerUpgrade,
    upgrades: state.wallUpgrades,
    end: num(endurance, 1),
    skill: pct(skillBonus(state, 'knight', 'wallHpMult')),
  });

  // Sanduhr: läuft bis zur Wut ab, danach glüht sie rot.
  const rage = enrageFactor(b.elapsed);
  const left = BATTLE.enrageAfter - b.elapsed;
  const glass =
    rage > 1 ? hgAngry : HOURGLASS[Math.min(4, Math.floor((b.elapsed / BATTLE.enrageAfter) * 5))]!;
  const rageText =
    rage > 1 ? t('battle.enrage', { x: num(rage, 1) }) : t('hud.rageIn', { s: Math.ceil(left) });
  const rageTip = t('battle.enrageTip', { after: BATTLE.enrageAfter, doubling: BATTLE.enrageDoubling });

  return `<div class="ribbon">${esc(t('battle.siege', { siege: b.siege + 1 }))}</div>
    <div class="hud-line waves" ${tip(t('battle.wave', { wave, total: BATTLE.wavesPerBattle }))}>
      <span class="gears">${gears}</span><span>${esc(t('battle.wave', { wave, total: BATTLE.wavesPerBattle }))}</span>
    </div>
    <div class="hud-line" ${tip(wallTip)}>
      <span class="stonebar ${wallPct < 0.3 ? 'low' : ''}"><i style="width:${(wallPct * 100).toFixed(1)}%"></i></span>
      <span>${esc(t('battle.wall', { hp: Math.ceil(b.wallHp), max: b.wallMaxHp }))}</span>
    </div>
    <div class="hud-line ${rage > 1 ? 'angry' : ''}" ${tip(rageTip)}><img class="hg" src="${glass}" alt=""><span>${esc(rageText)}</span></div>
    <div class="hud-line loot" ${tip(t('hud.lootTip'))}><img class="pouch" src="${pouchUrl}" alt=""><span>${esc(t('hud.loot', { gold: num(b.goldEarned) }))}</span></div>
    ${extras.join('')}
    <div class="hud-foot">
      <span class="hud-note" ${tip(t('battle.clickTip', { base: BATTLE.clickDamage, keep: keepLevel(state) }))}>${esc(
        t('battle.clickHint', { dmg: num(clickDamage(state)) }),
      )}</span>
      <button class="sign" ${action({ type: 'retreat' })} ${tip(`${num(wallMaxHp(state))} LP`)}>${esc(t('battle.retreat'))}</button>
    </div>`;
}

export function troopListHtml(state: GameState): string {
  const team = troops(state);
  const head = `<div class="ribbon">${esc(t('troops.title'))}</div>`;
  if (team.length === 0) return `${head}<p class="hud-note">${esc(t('troops.none'))}</p>`;
  const rows = team
    .map((u) => {
      const need = xpForNext(u.level);
      const share = Math.min(1, u.xp / need);
      return `<li ${tip(`${tk(`class.${u.classId}`)} · Lv ${u.level}\nXP ${num(u.xp)}/${num(need)}`)}>
        <span class="medal">${portrait(u)}</span>
        <div class="troop-info"><span>${esc(tk(`class.${u.classId}`))}</span><b class="lvl">${roman(u.level)}</b>
          <span class="gauge"><span style="width:${(share * 100).toFixed(0)}%;--c:${CLASSES[u.classId].color}"></span></span></div>
      </li>`;
    })
    .join('');
  return `${head}<ul>${rows}</ul>`;
}

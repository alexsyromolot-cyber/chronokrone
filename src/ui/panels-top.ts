/**
 * Ressourcenleiste, Schlacht-HUD und Erzähler-Log.
 */
import { BATTLE } from '../data/enemies';
import { RESOURCES, RESOURCE_IDS, type ResourceId } from '../data/resources';
import { UNIT_FORMULAS } from '../data/units';
import { t } from '../i18n';
import { wallUpgradeBlocker, wallUpgradeCost, type Action } from '../systems/actions';
import { clickDamage, wallMaxHp } from '../systems/battle';
import { productionRates } from '../systems/castle';
import { keepLevel, resourceCap } from '../systems/resources';
import { skillBonus } from '../systems/skills';
import type { GameState } from '../systems/state';
import { attributesOf, troops } from '../systems/units';
import { costHtml, esc, num, pct, tip } from './dom';

export function action(a: Action): string {
  return `data-action="${esc(JSON.stringify(a))}"`;
}

function resourceVisible(state: GameState, id: ResourceId): boolean {
  if (id === 'gold') return state.stats.kills > 0;
  if (id === 'scrap')
    return state.resources.scrap.gt(0) || !!state.log.find((l) => l.key === 'narrator.firstScrap');
  return !!state.unlocked.castle;
}

export function resourcesHtml(state: GameState): string {
  const rates = productionRates(state);
  return RESOURCE_IDS.filter((id) => resourceVisible(state, id))
    .map((id) => {
      const cap = resourceCap(state, id);
      const value = state.resources[id];
      const full = value.gte(cap);
      const def = RESOURCES[id];
      const tipText = t('res.tip', {
        name: t(`res.${id}`),
        value: num(value),
        cap: num(cap),
        rate: num(rates[id], 2),
        base: def.baseCap,
        growth: num(def.capGrowth, 2),
      });
      return `<div class="res res-${id} ${full ? 'full' : ''}" ${tip(tipText)}>
        <span class="res-dot"></span><span class="res-name">${esc(t(`res.${id}`))}</span>
        <span class="res-val">${num(value)}</span><span class="res-cap">/${num(cap)}</span>
        ${rates[id] > 0 ? `<span class="res-rate">+${num(rates[id], 1)}/s</span>` : ''}
      </div>`;
    })
    .join('');
}

export function battleHudHtml(state: GameState): string {
  const b = state.battle;
  const parts: string[] = [];

  if (b) {
    const wallPct = Math.max(0, b.wallHp / b.wallMaxHp);
    const endurance = troops(state).reduce((s, u) => s + attributesOf(u).end, 0);
    const wallTip = t('battle.wallTip', {
      base: BATTLE.wallBaseHp,
      per: BATTLE.wallHpPerUpgrade,
      upgrades: state.wallUpgrades,
      end: num(endurance, 1),
      skill: pct(skillBonus(state, 'knight', 'wallHpMult')),
    });
    parts.push(`<div class="hud-row">
      <span class="tag">${esc(t('battle.siege', { siege: b.siege + 1 }))}</span>
      <span class="tag">${esc(t('battle.wave', { wave: Math.max(1, b.wave), total: BATTLE.wavesPerBattle }))}</span>
      <div class="bar wall-bar" ${tip(wallTip)}><div class="fill" style="width:${(wallPct * 100).toFixed(1)}%"></div>
        <span>${esc(t('battle.wall', { hp: Math.ceil(b.wallHp), max: b.wallMaxHp }))}</span></div>
      <button class="btn small" ${action({ type: 'retreat' })}>${esc(t('battle.retreat'))}</button>
    </div>`);
    parts.push(
      `<div class="hint" ${tip(t('battle.clickTip', { base: BATTLE.clickDamage, keep: keepLevel(state) }))}>${esc(
        t('battle.clickHint', { dmg: num(clickDamage(state)) }),
      )}</div>`,
    );
    return parts.join('');
  }

  const last = state.lastBattle;
  if (last) {
    const head =
      last.result === 'won'
        ? t('battle.won', { total: BATTLE.wavesPerBattle })
        : t('battle.lost', { wave: last.wave });
    parts.push(`<div class="result ${last.result}"><strong>${esc(head)}</strong>
      <span>${esc(t('battle.summary', { kills: last.kills, gold: num(last.goldEarned), seconds: Math.round(last.seconds) }))}</span></div>`);
  } else {
    parts.push(`<div class="hint">${esc(t('battle.idle'))}</div>`);
  }

  const startLabel = state.stats.battles > 0 ? t('battle.again') : t('battle.start');
  const siegeButtons: string[] = [];
  if (state.unlocked.siege) {
    const siegeTip = t('battle.siegeTip', {
      hp: num(BATTLE.hpGrowthPerSiege, 1),
      gold: num(BATTLE.goldGrowthPerSiege, 1),
    });
    for (let s = 0; s <= state.siegeLevel; s++) {
      siegeButtons.push(
        `<button class="btn small ${s === state.siegeLevel ? 'primary' : ''}" ${action({ type: 'startBattle', siege: s })} ${tip(siegeTip)}>${esc(
          t('battle.siege', { siege: s + 1 }),
        )}</button>`,
      );
    }
  }
  parts.push(`<div class="hud-row">
    <button class="btn primary" id="start-battle" ${action({ type: 'startBattle' })}>${esc(startLabel)} <kbd>␣</kbd></button>
    ${siegeButtons.join('')}
  </div>`);

  if (state.unlocked.wall) {
    const blocker = wallUpgradeBlocker(state);
    parts.push(`<div class="hud-row">
      <button class="btn" ${blocker ? 'disabled' : ''} ${action({ type: 'upgradeWall' })} ${tip(
        t('battle.wallTip', {
          base: BATTLE.wallBaseHp,
          per: BATTLE.wallHpPerUpgrade,
          upgrades: state.wallUpgrades,
          end: num(
            troops(state).reduce((s, u) => s + attributesOf(u).end, 0),
            1,
          ),
          skill: pct(skillBonus(state, 'knight', 'wallHpMult')),
        }),
      )}>${esc(t('castle.wallUpgrade', { hp: BATTLE.wallHpPerUpgrade }))} · ${num(wallMaxHp(state))} LP</button>
      ${costHtml(state, wallUpgradeCost(state))}
    </div>`);
  }
  return parts.join('');
}

export function logHtml(state: GameState): string {
  const lines = [...state.log]
    .reverse()
    .map((entry) => {
      const mm = String(Math.floor(entry.time / 60)).padStart(2, '0');
      const ss = String(Math.floor(entry.time % 60)).padStart(2, '0');
      return `<li><time>${mm}:${ss}</time> ${esc(t(entry.key, entry.params))}</li>`;
    })
    .join('');
  return `<ul class="log-list">${lines}</ul>`;
}

/** Parameter der XP-Formel für Tooltips. */
export function xpFormulaParams() {
  return { xpBase: UNIT_FORMULAS.xpBase, xpGrowth: num(UNIT_FORMULAS.xpGrowth, 1) };
}

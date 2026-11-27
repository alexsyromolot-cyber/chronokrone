/**
 * Chronik: dauerhafter Baum für Zeitsplitter. Erscheint nach dem ersten Sprung
 * (oder sobald es Zeitsplitter gibt).
 */
import { CHRONICLE, type ChronicleDef } from '../data/chronicle';
import { t, tk } from '../i18n';
import { chronicleBlocker, chronicleCost, chronicleRank } from '../systems/chronicle';
import type { GameState } from '../systems/state';
import { esc, num, pct, reasonText, tip } from './dom';
import { action } from './panels-top';

/** Anteile als Prozent, Anzahlen/Level als Zahl. */
function effectText(def: ChronicleDef): string {
  const share = ['production', 'damage', 'click', 'xp', 'knowledge'].includes(def.effect);
  const fx = tk(`chronfx.${def.effect}`, { v: share ? pct(def.perRank) : num(def.perRank) });
  return t('chronicle.perRank', { fx });
}

export function chronicleHtml(state: GameState): string {
  const nodes = CHRONICLE.map((def) => {
    const rank = chronicleRank(state, def.id);
    const blocker = chronicleBlocker(state, def.id);
    const endless = def.maxRank === Infinity;
    const maxed = !endless && rank >= def.maxRank;
    const rankText = endless
      ? t('chronicle.rank', { rank })
      : t('chronicle.rankMax', { rank, max: def.maxRank });
    const tipText = [
      tk(`chronicle.${def.id}`),
      effectText(def),
      endless ? t('chronicle.endless') : '',
      t('chronicle.costTip', { base: def.baseCost, growth: num(def.costGrowth, 1) }),
      def.requires ? `← ${tk(`chronicle.${def.requires}`)}` : '',
      blocker && !maxed ? reasonText(blocker) : '',
    ]
      .filter(Boolean)
      .join('\n');
    const cls = maxed
      ? 'done'
      : blocker === 'reason.requiresChronicle'
        ? 'locked'
        : blocker
          ? 'pending'
          : 'ready';
    return `<button class="node ${cls}" style="grid-column:${def.pos[0] + 1};grid-row:${def.pos[1] + 1}" ${
      blocker ? 'disabled' : ''
    } ${action({ type: 'buyChronicle', id: def.id })} ${tip(tipText)}>
      <span class="name">${esc(tk(`chronicle.${def.id}`))}</span>
      <span class="cost">${esc(rankText)}${maxed ? '' : ` · ${esc(t('chronicle.cost', { cost: chronicleCost(state, def.id) }))}`}</span>
    </button>`;
  }).join('');
  return `<p class="shards">${esc(t('chronicle.shards', { n: state.shards }))}</p>
    <div class="research-grid chronicle-grid">${nodes}</div>`;
}

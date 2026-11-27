/**
 * Hofbefehle-Baukasten: Regeln aus Auswahllisten zusammenklicken, Reihenfolge = Priorität.
 * Jede Änderung erzeugt eine neue Regel-Liste und läuft als Aktion „setOrders“ durch dispatch().
 */
import { BUILDINGS, type BuildingId } from '../data/buildings';
import {
  ACTION_KINDS,
  CONDITION_KINDS,
  defaultAction,
  defaultCondition,
  type OrderAction,
  type OrderCondition,
  type OrderRule,
} from '../data/orders';
import { RESOURCE_IDS } from '../data/resources';
import { SPELL_IDS } from '../data/spells';
import { CLASS_ORDER } from '../data/units';
import { t, tk } from '../i18n';
import { orderStage, orderStageNumber } from '../systems/orders';
import type { GameState } from '../systems/state';
import { esc, num, reasonText } from './dom';

function select(path: string, value: string, options: [string, string][]): string {
  return `<select data-order="${path}">${options
    .map(([v, label]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(label)}</option>`)
    .join('')}</select>`;
}

function numberInput(path: string, value: number): string {
  return `<input type="number" min="0" step="any" data-order="${path}" value="${value}">`;
}

const resourceOptions = (): [string, string][] => RESOURCE_IDS.map((r) => [r, tk(`res.${r}`)]);

function conditionHtml(c: OrderCondition, path: string): string {
  const kind = select(
    `${path}.kind`,
    c.kind,
    CONDITION_KINDS.map((k) => [k, tk(`ocond.${k}`)]),
  );
  switch (c.kind) {
    case 'resourceAtLeast':
      return `${kind} ${select(`${path}.resource`, c.resource, resourceOptions())} ≥ ${numberInput(`${path}.value`, c.value)}`;
    case 'resourceFull':
      return `${kind} ${select(`${path}.resource`, c.resource, resourceOptions())} ≥ ${numberInput(`${path}.percent`, c.percent)} %`;
    case 'wallBelow':
      return `${kind} &lt; ${numberInput(`${path}.percent`, c.percent)} %`;
    case 'enemiesAtLeast':
      return `${kind} ≥ ${numberInput(`${path}.count`, c.count)}`;
    default:
      return kind;
  }
}

function actionHtml(a: OrderAction, path: string): string {
  const kind = select(
    `${path}.kind`,
    a.kind,
    ACTION_KINDS.map((k) => [k, tk(`oact.${k}`)]),
  );
  switch (a.kind) {
    case 'castSpell':
      return `${kind} ${select(
        `${path}.spell`,
        a.spell,
        SPELL_IDS.map((s) => [s, tk(`spell.${s}`)]),
      )}`;
    case 'upgradeCheapest': {
      const ids = (Object.keys(BUILDINGS) as BuildingId[]).map((b): [string, string] => [
        b,
        tk(`building.${b}`),
      ]);
      return `${kind} ${select(`${path}.building`, a.building, ids)}`;
    }
    case 'recruit':
      return `${kind} ${select(
        `${path}.classId`,
        a.classId,
        CLASS_ORDER.map((c) => [c, tk(`class.${c}`)]),
      )}`;
    default:
      return kind;
  }
}

export function ordersHtml(state: GameState): string {
  const stage = orderStage(state);
  const rules = state.orders.rules;
  const rows = rules
    .map((rule, i) => {
      const conds = rule.conditions
        .map((c, j) => {
          const join =
            j === 0
              ? ''
              : select(`${i}.join`, rule.join, [
                  ['and', t('orders.and')],
                  ['or', t('orders.or')],
                ]);
          return `${join} ${conditionHtml(c, `${i}.conditions.${j}`)}`;
        })
        .join(' ');
      const canAddCond = rule.conditions.length < stage.maxConditions;
      return `<li class="rule ${rule.enabled ? '' : 'off'}">
        <span class="rule-no">${i + 1}</span>
        <label><input type="checkbox" data-order="${i}.enabled" ${rule.enabled ? 'checked' : ''}> ${esc(t('orders.enabled'))}</label>
        <strong>${esc(t('orders.if'))}</strong> ${conds}
        ${canAddCond ? `<button class="btn small" data-order-btn="addCond:${i}">${esc(t('orders.addCond'))}</button>` : ''}
        <strong>${esc(t('orders.then'))}</strong> ${actionHtml(rule.action, `${i}.action`)}
        <span class="rule-tools">
          ${stage.reorder && i > 0 ? `<button class="btn small" data-order-btn="up:${i}" aria-label="↑">↑</button>` : ''}
          ${stage.reorder && i < rules.length - 1 ? `<button class="btn small" data-order-btn="down:${i}" aria-label="↓">↓</button>` : ''}
          <button class="btn small danger" data-order-btn="remove:${i}" aria-label="✕">✕</button>
        </span>
      </li>`;
    })
    .join('');
  const canAdd = rules.length < stage.maxRules;
  const maxRules = stage.maxRules === Infinity ? '∞' : num(stage.maxRules);
  return `<p class="hint">${esc(t('orders.stage', { n: orderStageNumber(state), rules: maxRules, conds: stage.maxConditions }))}</p>
    ${rules.length ? `<ol class="rules">${rows}</ol>` : `<p class="hint">${esc(t('orders.empty'))}</p>`}
    ${canAdd ? `<button class="btn" data-order-btn="add">${esc(t('orders.add'))}</button>` : ''}`;
}

/**
 * Das Log steht in einem eigenen Block: Es ändert sich ständig, und würde es den Baukasten
 * mit neu zeichnen, klappte jede neue Zeile eine gerade geöffnete Auswahlliste zu.
 */
export function ordersLogHtml(state: GameState): string {
  const rules = state.orders.rules;
  const log = [...state.orders.log]
    .reverse()
    .slice(0, 10)
    .map((l) => {
      const n = rules.findIndex((r) => r.id === l.ruleId) + 1 || '?';
      const mm = `${Math.floor(l.time / 60)}:${String(Math.floor(l.time % 60)).padStart(2, '0')}`;
      const text = l.ok
        ? t(
            rules.find((r) => r.id === l.ruleId)?.action.kind === 'notify'
              ? 'orders.logNotify'
              : 'orders.logOk',
            { n },
          )
        : t('orders.logFail', { n, reason: reasonText(l.reason ?? null) });
      return `<li class="${l.ok ? 'good' : 'hint'}"><time>${mm}</time> ${esc(text)}</li>`;
    })
    .join('');
  return log ? `<h3 class="sub">${esc(t('orders.log'))}</h3><ul class="log-list order-log">${log}</ul>` : '';
}

/** Kopie der Regeln, damit Änderungen erst über dispatch wirksam werden. */
function cloneRules(state: GameState): OrderRule[] {
  return structuredClone(state.orders.rules);
}

/** Auswahlliste/Eingabe geändert → neue Regel-Liste (oder null, wenn nichts zu tun ist). */
export function rulesAfterChange(
  state: GameState,
  el: HTMLInputElement | HTMLSelectElement,
): OrderRule[] | null {
  const path = el.dataset.order?.split('.') ?? [];
  const rules = cloneRules(state);
  const rule = rules[Number(path[0])];
  if (!rule) return null;
  const value = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : el.value;
  const [, field, idx, key] = path;
  if (field === 'enabled') rule.enabled = Boolean(value);
  else if (field === 'join') rule.join = value === 'or' ? 'or' : 'and';
  else if (field === 'conditions' && idx !== undefined && key) {
    const i = Number(idx);
    const current = rule.conditions[i];
    if (!current) return null;
    if (key === 'kind') rule.conditions[i] = defaultCondition(String(value) as OrderCondition['kind']);
    else (current as unknown as Record<string, unknown>)[key] = key === 'resource' ? value : Number(value);
  } else if (field === 'action' && idx) {
    // Bei Aktionen steht der Schlüssel direkt hinter „action“.
    if (idx === 'kind') rule.action = defaultAction(String(value) as OrderAction['kind']);
    else (rule.action as unknown as Record<string, unknown>)[idx] = value;
  } else return null;
  return rules;
}

/** Knopf im Baukasten → neue Regel-Liste. */
export function rulesAfterButton(state: GameState, command: string): OrderRule[] | null {
  const [cmd, arg] = command.split(':');
  const i = Number(arg);
  const rules = cloneRules(state);
  switch (cmd) {
    case 'add':
      rules.push({
        id: state.orders.nextId,
        enabled: true,
        join: 'and',
        conditions: [defaultCondition('noBattle')],
        action: defaultAction('startBattle'),
      });
      return rules;
    case 'remove':
      rules.splice(i, 1);
      return rules;
    case 'up':
    case 'down': {
      const j = cmd === 'up' ? i - 1 : i + 1;
      if (!rules[i] || !rules[j]) return null;
      [rules[i], rules[j]] = [rules[j]!, rules[i]!];
      return rules;
    }
    case 'addCond':
      rules[i]?.conditions.push(defaultCondition('resourceFull'));
      return rules;
    default:
      return null;
  }
}

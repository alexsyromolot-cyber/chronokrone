/**
 * `npx tsx src/dev/diagnose.ts [Minuten]` – spielt mit dem Bot bis zur angegebenen Minute
 * und zeigt, warum der Bot nichts mehr kauft (Blocker je Wunsch). Werkzeug fürs Balancing.
 */
import { FixedStepLoop } from '../core/loop';
import { BUILDINGS, type BuildingId } from '../data/buildings';
import { RESEARCH } from '../data/research';
import { RESOURCE_IDS } from '../data/resources';
import { CLASS_ORDER } from '../data/units';
import { t } from '../i18n';
import {
  buildingAvailable,
  buildCost,
  clearBlocker,
  clearCost,
  inBounds as inB,
  productionRates,
  upgradeBlocker,
  upgradeCost,
} from '../systems/castle';
import { newGame, tick } from '../systems/game';
import { resourceCap } from '../systems/resources';
import { researchBlocker } from '../systems/research';
import { recruitBlocker } from '../systems/units';
import { Bot } from './bot';

const minutes = Number(process.argv[2] ?? 45);
const state = newGame(42);
const bot = new Bot();
const loop = new FixedStepLoop((dt) => {
  bot.act(state, dt);
  tick(state, dt);
});
loop.fastForward(minutes * 60);

const rates = productionRates(state);
console.log(`=== Stand nach ${minutes} min ===`);
for (const id of RESOURCE_IDS) {
  console.log(
    `${id.padEnd(10)} ${state.resources[id].toNumber().toFixed(0).padStart(7)} / ${resourceCap(state, id).toNumber().toFixed(0).padStart(6)}  ${rates[id] >= 0 ? '+' : ''}${rates[id].toFixed(2)}/s`,
  );
}
const fmt = (c: Record<string, { toNumber(): number } | undefined>) =>
  Object.entries(c)
    .map(([k, v]) => `${v?.toNumber().toFixed(0)} ${k}`)
    .join(', ');
console.log('\n--- Gebäude ---');
for (const tile of state.tiles.filter((x) => x.building)) {
  console.log(
    `${tile.building} Lv ${tile.level}: ${t(upgradeBlocker(state, tile) ?? 'castle.running')} (${fmt(upgradeCost(tile))})`,
  );
}
console.log('\n--- Nicht gebaut ---');
for (const id of Object.keys(BUILDINGS) as BuildingId[]) {
  if (!state.tiles.some((x) => x.building === id))
    console.log(`${id}: ${buildingAvailable(state, id) ?? 'verfügbar'} (${fmt(buildCost(state, id))})`);
}
console.log('\n--- Forschung offen ---');
for (const r of RESEARCH.filter((x) => !state.research[x.id]))
  console.log(`${r.id} (${r.cost}): ${researchBlocker(state, r.id)}`);
console.log('\n--- Anwerben ---');
for (const c of CLASS_ORDER) console.log(`${c}: ${recruitBlocker(state, c) ?? 'ok'}`);
console.log(
  `\nFreie Felder: ${state.tiles.filter((x) => x.unlocked && !x.building).length}, gerodet: ${state.tiles.filter((x) => x.unlocked).length}`,
);
console.log(`Truppen/Einheiten: ${state.units.map((u) => `${u.classId}${u.level}`).join(' ')}`);
console.log(`Letzte Schlacht: ${JSON.stringify(state.lastBattle)}`);

// Rodungs-Kandidaten
const cands = state.tiles.filter((x) => !x.unlocked && inB(state, x));
console.log(`\nRodbar im Bereich: ${cands.length}, Kosten ${fmt(clearCost(state))}`);
for (const c of cands.slice(0, 6)) console.log(`  (${c.x},${c.y}) ${clearBlocker(state, c)}`);

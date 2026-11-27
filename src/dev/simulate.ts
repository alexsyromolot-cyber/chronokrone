/**
 * `npm run simulate [-- --minutes 15 --seed 42]`
 *
 * Spielt mit dem Bot einen Durchlauf und gibt eine Progressionskurve aus:
 * wann welcher Bereich erscheint, Schlachten, Käufe und vor allem Wartezeiten
 * über 60 Sekunden (Design-Säule 1: „nächster Kauf nie mehr als 60 s entfernt“).
 */
import { FixedStepLoop } from '../core/loop';
import { formatNumber } from '../core/format';
import { t } from '../i18n';
import { newGame, tick } from '../systems/game';
import { productionRates } from '../systems/castle';
import { Bot } from './bot';
import fs from 'node:fs';
import { deserialize, serialize } from '../save/serialize';

/** Speicherpunkt: --save-at <Epoche> <Datei> sichert den Stand beim Erreichen der Epoche, --load <Datei> startet dort. */
function textArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

const minutes = arg('minutes', 15);
const seed = arg('seed', 42);

const loadFile = textArg('load');
const state = loadFile ? deserialize(fs.readFileSync(loadFile, 'utf8')).state : newGame(seed);
const saveAt = arg('save-at', 0);
const saveFile = process.argv[process.argv.indexOf('--save-at') + 2];
let saved = false;
const startTime = state.time;
const bot = new Bot();
const loop = new FixedStepLoop((dt) => {
  bot.act(state, dt);
  tick(state, dt);
});

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const timeline: string[] = [];
// Beim Laden eines Speicherpunkts nur neue Einträge zeigen. Das Log ist gedeckelt –
// deshalb über die Zeit statt über den Index verfolgen.
let logSeenTime = state.time;
let battlesSeen = 0;
const snapshots: string[] = [];

for (let second = 1; second <= minutes * 60; second++) {
  loop.fastForward(1);
  if (saveAt && !saved && state.epoch >= saveAt && saveFile) {
    fs.writeFileSync(saveFile, serialize(state));
    saved = true;
  }
  if (state.finale.wonAt !== null && !state.battle) {
    timeline.push(`${mmss(state.time)}  *** FINALE GEWONNEN – Simulation endet ***`);
    break;
  }
  for (const entry of state.log) {
    if (entry.time <= logSeenTime) continue;
    const text = t(entry.key, entry.params);
    timeline.push(`${mmss(entry.time)}  [Erzähler] ${text.slice(0, 70)}`);
  }
  logSeenTime = state.log.at(-1)?.time ?? logSeenTime;
  if (state.stats.battles > battlesSeen && state.lastBattle) {
    battlesSeen = state.stats.battles;
    const l = state.lastBattle;
    timeline.push(
      `${mmss(state.time)}  Schlacht ${battlesSeen}: ${l.result === 'won' ? 'SIEG' : 'verloren'} · Stufe ${l.siege + 1} · Welle ${l.wave} · ${l.kills} Kills · ${Math.round(l.goldEarned)} Gold · ${Math.round(l.seconds)} s`,
    );
  }
  if (second % 60 === 0) {
    const r = state.resources;
    const rates = productionRates(state);
    snapshots.push(
      `${mmss(second)}  Gold ${formatNumber(r.gold)}  Holz ${formatNumber(r.wood)} (+${rates.wood.toFixed(1)}/s)  Stein ${formatNumber(r.stone)} (+${rates.stone.toFixed(1)}/s)  Schrott ${formatNumber(r.scrap)}  Einheiten ${state.units.length}  Gebäude ${state.tiles.filter((t) => t.building).length}`,
    );
  }
}

console.log(`\n=== Chronokrone-Simulation: ${minutes} min, Seed ${seed} ===\n`);
console.log('--- Ereignisse ---');
for (const line of timeline) console.log(line);

console.log('\n--- Käufe ---');
let last = startTime;
const gaps: string[] = [];
for (const p of bot.purchases) {
  const a = p.action;
  const what =
    'building' in a
      ? `${a.type} ${a.building}`
      : 'classId' in a
        ? `${a.type} ${a.classId}`
        : 'skillId' in a
          ? `${a.type} ${a.skillId}`
          : a.type === 'upgrade'
            ? `upgrade ${p.label ?? ''}`
            : a.type;
  console.log(`${mmss(p.time)}  ${what}`);
  if (p.time - last > 60) gaps.push(`${mmss(last)} → ${mmss(p.time)} (${Math.round(p.time - last)} s)`);
  last = p.time;
}
if (state.time - last > 60) gaps.push(`${mmss(last)} → Ende (${Math.round(state.time - last)} s)`);

console.log('\n--- Minutenstände ---');
for (const s of snapshots) console.log(s);

state.epochTimes.forEach((sec, i) =>
  console.log(`\nEpoche ${i + 1} abgeschlossen nach ${mmss(sec)} (${i < 4 ? 'Sprung' : 'Finale'})`),
);
if (state.finale.wonAt !== null)
  console.log(`Finale gewonnen nach ${mmss(state.finale.wonAt)} Gesamtspielzeit`);
console.log(
  `Aktuell: Epoche ${state.epoch} seit ${mmss(state.time - state.epochStartedAt)} · Zeitsplitter ${state.shards} (gesamt ${state.totalShards}) · Chronik ${JSON.stringify(state.chronicle)}`,
);
const tm = state.timeMachineAt === null ? 'nicht fertig' : mmss(state.timeMachineAt - state.epochStartedAt);
console.log(
  `\nZeitmaschine: ${tm} · Teile: ${Object.keys(state.timeParts).length}/4 · Orakel: ${state.oracle ? 'ja' : 'nein'}`,
);
console.log('\n--- Wartezeiten über 60 s ---');
console.log(gaps.length ? gaps.join('\n') : 'keine 🎉');
console.log(
  `\nKäufe gesamt: ${bot.purchases.length} · Schlachten: ${state.stats.battles} (Siege: ${state.stats.wins}) · Belagerungsstufe: ${state.siegeLevel + 1}`,
);
console.log(
  `Sammlungen: Begleiter ${Object.keys(state.companions).length} · Karten ${Object.keys(state.cards).length} · Relikte ${Object.keys(state.relics).length} · Kernschmelzen (diese Epoche) ${state.reactor.meltdowns}`,
);

/**
 * Isometrischer Bauplatz (Darstellung). Die Logik bleibt das quadratische Raster mit
 * Nachbarschaft – hier wird es nur als Rautenfläche gezeichnet:
 *   Bildschirm-x = (x − y) × 32,  Bildschirm-y = (x + y) × 16   (Rauten 64×32)
 * Grafiken aus `npm run sprites` (scripts/sprites/iso.mjs), als Ausschnitte eines Blatts.
 *
 * Auf dem Raster: Gelände, Gebäude (Ausbaustufe je Level-Meilenstein), Produktion pro
 * Gebäude, Level-Plakette, Engpässe rot, Bonus-Linien zum gewählten Gebäude, Sammler.
 * Im Bau-Modus zeigt jedes freie Feld, welchen Bonus das gewählte Gebäude dort bekäme.
 */
import { BUILDINGS, BUILDING_MILESTONES, type BuildingId } from '../data/buildings';
import { t, tk } from '../i18n';
import isoBuildingsUrl from '../assets/sprites/iso-buildings.png';
import isoBuildingsAtlas from '../assets/sprites/iso-buildings.json';
import isoTerrainUrl from '../assets/sprites/iso-terrain.png';
import isoTerrainAtlas from '../assets/sprites/iso-terrain.json';
import isoWorkersUrl from '../assets/sprites/iso-workers.png';
import isoWorkersAtlas from '../assets/sprites/iso-workers.json';
import {
  buildingAvailable,
  inBounds,
  neighbors,
  placementPreview,
  recipeBottleneck,
  recipeRate,
  tileProduction,
  workerClassFor,
  workersAt,
} from '../systems/castle';
import { powerBonus } from '../systems/power';
import { surveyBounds } from '../systems/research';
import { isConnected, rosetteBonus } from '../systems/starship';
import type { GameState, Tile } from '../systems/state';
import { esc, num, pct, tip } from './dom';
import { uiIcon } from './ui-icons';
import { spriteUrl } from '../render/pixel';
import { BUILDING_SPRITES } from '../render/sprites';

interface Atlas {
  frames: Record<string, { x: number; y: number; w: number; h: number }>;
  size: { w: number; h: number };
}
const BLD = isoBuildingsAtlas as Atlas;
const TER = isoTerrainAtlas as Atlas;
const WRK = isoWorkersAtlas as Atlas;

const sx = (x: number, y: number, rows: number) => (x - y + rows - 1) * 32;
const sy = (x: number, y: number) => (x + y) * 16 + 64;

/** CSS-Hintergrund für einen Ausschnitt aus einem Blatt. */
function bg(url: string, atlas: Atlas, name: string): string {
  const f = atlas.frames[name];
  if (!f) return '';
  return `background-image:url(${url});background-position:-${f.x}px -${f.y}px;background-size:${atlas.size.w}px ${atlas.size.h}px`;
}

/** Ausbaustufe: 0 schlicht, 1 ab dem 1. Meilenstein (Fahne), 2 ab dem 2. (Goldbeschlag). */
export function buildingStage(level: number): number {
  return BUILDING_MILESTONES.filter((m) => level >= m).length >= 2
    ? 2
    : level >= BUILDING_MILESTONES[0]
      ? 1
      : 0;
}

function buildingSprite(id: BuildingId, level: number): string {
  const stage = buildingStage(level);
  return BLD.frames[`${id}_${stage}`]
    ? bg(isoBuildingsUrl, BLD, `${id}_${stage}`)
    : bg(isoBuildingsUrl, BLD, `generic_${stage}`);
}

/** CSS-Hintergrund des Iso-Bilds eines Gebäudes (für die Karte in der Seitenleiste). */
export function isoBuildingStyle(id: BuildingId, level: number): string {
  return buildingSprite(id, level);
}

/** Was ein Gebäude pro Sekunde liefert – als kleine Zahl über dem Dach. */
function prodLabel(state: GameState, tile: Tile): string {
  const p = tileProduction(state, tile);
  if (p) {
    const icon = uiIcon(`res-${p.resource}`);
    return `<span class="iso-prod">${icon ? `<img src="${icon}" alt="">` : ''}+${num(p.total, 1)}</span>`;
  }
  const recipe = tile.building ? BUILDINGS[tile.building].recipe : undefined;
  if (recipe) {
    const [out, n] = Object.entries(recipe.outputs)[0] as [string, number];
    const icon = uiIcon(`res-${out}`);
    return `<span class="iso-prod">${icon ? `<img src="${icon}" alt="">` : ''}+${num(recipeRate(state, tile) * n, 2)}</span>`;
  }
  return '';
}

/** Nachbarn, die dem gewählten Gebäude einen Bonus geben – als Linien mit Wert. */
function bonusLines(state: GameState, tile: Tile, rows: number, lo: number): string {
  if (!tile.building) return '';
  const def = BUILDINGS[tile.building];
  const links: { n: Tile; text: string }[] = [];
  for (const n of neighbors(state, tile)) {
    if (def.neighborBonus && n.building === def.neighborBonus.building)
      links.push({ n, text: `+${pct(def.neighborBonus.bonus)} %` });
    else if (n.building === 'tavern' && workerClassFor(tile.building))
      links.push({ n, text: t('iso.tavern') });
  }
  const cx = (x: number, y: number) => sx(x - lo, y - lo, rows) + 32;
  const cy = (x: number, y: number) => sy(x - lo, y - lo) + 16;
  const lines = links
    .map(
      ({ n }) =>
        `<line x1="${cx(tile.x, tile.y)}" y1="${cy(tile.x, tile.y)}" x2="${cx(n.x, n.y)}" y2="${cy(n.x, n.y)}" />`,
    )
    .join('');
  const labels = links
    .map(({ n, text }) => {
      const x = (cx(tile.x, tile.y) + cx(n.x, n.y)) / 2;
      const y = (cy(tile.x, tile.y) + cy(n.x, n.y)) / 2;
      return `<span class="iso-link" style="left:${x}px;top:${y}px">${esc(text)}</span>`;
    })
    .join('');
  return links.length ? `<svg class="iso-lines" aria-hidden="true">${lines}</svg>${labels}` : '';
}

function workersHtml(state: GameState, tile: Tile, x: number, y: number): string {
  const list = workersAt(state, tile);
  return list
    .map((u, i) => {
      const id = WRK.frames[`${u.classId}_0`] ? u.classId : 'generic';
      const f = WRK.frames[`${id}_0`]!;
      // Jeder Sammler läuft ein Stück auf seinem Feld hin und her (CSS), versetzt gestartet.
      return `<span class="iso-worker" style="left:${x + 18 + i * 14}px;top:${y + 10 + i * 4}px;background-image:url(${isoWorkersUrl});background-size:${WRK.size.w}px ${WRK.size.h}px;--bx:-${f.x}px;--by:-${f.y}px;animation-delay:${-i * 1.3}s"></span>`;
    })
    .join('');
}

export interface IsoUi {
  selected: { x: number; y: number } | null;
  /** Produktionszahlen an allen Gebäuden zeigen (sonst nur am gewählten). */
  numbers: boolean;
  /** Bau-Modus: gewähltes Gebäude aus dem Katalog. */
  build: BuildingId | null;
}

export function isoGridHtml(state: GameState, ui: IsoUi): string {
  // Nur der erschlossene Bereich plus ein Ring Nebel – der Rest der Karte ist (noch) unwichtig
  // und würde das Bild nur kleiner machen.
  const b = surveyBounds(state);
  const lo = Math.max(0, b.min - 1);
  const hi = b.max + 1;
  const shown = state.tiles.filter((t) => t.x >= lo && t.x <= hi && t.y >= lo && t.y <= hi);
  const rows = Math.max(...shown.map((t) => t.y)) - lo + 1;
  const cols = Math.max(...shown.map((t) => t.x)) - lo + 1;
  const width = (cols + rows) * 32;
  const height = (cols + rows) * 16 + 64 + 8;
  const parts: string[] = [];
  const sorted = [...shown].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
  for (const tile of sorted) {
    const x = sx(tile.x - lo, tile.y - lo, rows);
    const y = sy(tile.x - lo, tile.y - lo);
    const z = (tile.x + tile.y) * 10;
    const fog = !tile.unlocked && !inBounds(state, tile);
    // Freie Felder in drei Varianten (fest je Feld), damit Flächen nicht gekachelt wirken.
    const variant = ['', '_v1', '_v2'][(tile.x * 7 + tile.y * 3) % 3];
    const terrain = `${tile.terrain}${tile.unlocked ? variant : fog ? '_fog' : '_locked'}`;
    const selected = ui.selected?.x === tile.x && ui.selected.y === tile.y;
    const label = tile.building
      ? tk(`building.${tile.building}`)
      : tile.unlocked
        ? tk(`terrain.${tile.terrain}`)
        : t(fog ? 'castle.fog' : 'castle.locked');

    // Bau-Modus: Vorschau, welchen Bonus das gewählte Gebäude auf diesem freien Feld bekäme.
    let preview = '';
    if (ui.build && tile.unlocked && !tile.building) {
      const p = placementPreview(state, tile, ui.build);
      const text = p.adrift ? '⚠' : p.score > 0 ? `+${pct(p.score)} %` : '–';
      // Eigene Ebene über Bäumen und Gebäuden, damit die Vorschau nie verdeckt ist.
      preview = `<span class="iso-preview ${p.adrift ? 'bad' : p.score > 0 ? 'good' : 'none'}" style="left:${x}px;top:${y + 11}px">${esc(text)}</span>`;
    }
    const cls = ['iso-tile'];
    if (selected) cls.push('selected');
    if (!tile.unlocked) cls.push(fog ? 'fog' : 'locked');
    if (ui.build && tile.unlocked && !tile.building) cls.push('placeable');
    parts.push(
      `<button class="${cls.join(' ')}" data-select="${tile.x},${tile.y}" aria-label="${esc(label)}" ${tip(label)} style="left:${x}px;top:${y}px;z-index:${z};${bg(isoTerrainUrl, TER, terrain)}">${!tile.unlocked && !fog ? '<span class="iso-q">?</span>' : ''}</button>`,
    );

    if (preview) parts.push(preview);
    if (tile.terrain === 'forest' && !tile.building && !fog) {
      parts.push(
        `<span class="iso-deco ${tile.unlocked ? '' : 'dim'}" style="left:${x}px;top:${y - 64}px;z-index:${z + 1};${bg(isoBuildingsUrl, BLD, 'deco_forest')}"></span>`,
      );
    }
    if (tile.building) {
      const bad = !!recipeBottleneck(state, tile);
      const bcls = ['iso-bld'];
      if (bad) bcls.push('bad');
      if (!isConnected(state, tile)) bcls.push('adrift');
      else if (rosetteBonus(state, tile) > 0) bcls.push('lit');
      if (powerBonus(state, tile) > 0) bcls.push('powered');
      // Gebäude ohne eigene Iso-Grafik (spätere Epochen) tragen ihr altes Symbol als Schild.
      const sign = BLD.frames[`${tile.building}_0`]
        ? ''
        : `<img class="iso-sign" src="${spriteUrl(BUILDING_SPRITES[tile.building])}" alt="">`;
      parts.push(
        `<span class="${bcls.join(' ')}" style="left:${x}px;top:${y - 64}px;z-index:${z + 2};${buildingSprite(tile.building, tile.level)}">${sign}
          <span class="iso-lvl">${tile.level}</span>${ui.numbers || selected ? prodLabel(state, tile) : ''}${bad ? `<span class="iso-alert" ${tip(t('iso.bottleneck'))}>!</span>` : ''}</span>`,
      );
      parts.push(workersHtml(state, tile, x, y));
    }
  }
  const sel = ui.selected
    ? state.tiles.find((t) => t.x === ui.selected!.x && t.y === ui.selected!.y)
    : undefined;
  const lines = sel && sel.x >= lo && sel.y >= lo ? bonusLines(state, sel, rows, lo) : '';
  return `<div class="iso-grid ${ui.build ? 'building' : ''}" style="width:${width}px;height:${height}px">${parts.join('')}${lines}</div>`;
}

/** Bau-Katalog am unteren Rand: alles, was gerade gebaut werden darf. */
export function catalogHtml(state: GameState, ui: IsoUi): string {
  const ids = (Object.keys(BUILDINGS) as BuildingId[]).filter((id) => buildingAvailable(state, id) === null);
  if (ids.length === 0) return '';
  const items = ids
    .map((id) => {
      const f = BLD.frames[`${id}_0`] ? `${id}_0` : 'generic_0';
      return `<button class="iso-cat ${ui.build === id ? 'active' : ''}" data-build-pick="${id}" ${tip(`${tk(`building.${id}`)}\n${tk(`building.${id}.desc`)}`)} aria-label="${esc(tk(`building.${id}`))}">
        <span class="iso-cat-img" style="${bg(isoBuildingsUrl, BLD, f)}"></span></button>`;
    })
    .join('');
  const numbers = `<button class="sign iso-numbers ${ui.numbers ? 'on' : ''}" data-iso-numbers ${tip(t('iso.numbersTip'))}>${esc(t('iso.numbers'))}</button>`;
  return `<div class="iso-catalog"><span class="iso-cat-title">${esc(t(ui.build ? 'iso.buildMode' : 'iso.catalog'))}</span>${items}${numbers}</div>`;
}

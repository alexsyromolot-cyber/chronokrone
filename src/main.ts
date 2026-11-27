/**
 * Einstiegspunkt im Browser: lädt den Spielstand, startet Logik-Loop und Darstellung
 * und verbindet Eingaben (Klicks, Tasten) mit Aktionen. Hier – und nur hier – treffen
 * DOM, requestAnimationFrame und Spiellogik aufeinander.
 */
import './style.css';
import { FixedStepLoop } from './core/loop';
import { installDebugPanel } from './dev/debug-panel';
import { getLocale, setLocale, t, tk } from './i18n';
import type { MessageKey } from './i18n/de';
import { BattleScene } from './render/battle-scene';
import { fromExportString, toExportString } from './save/serialize';
import { SaveManager } from './save/save-manager';
import { LocalStorageBackend } from './save/storage';
import { dispatch, type Action } from './systems/actions';
import { startBattle } from './systems/battle';
import { newGame, tick } from './systems/game';
import { addLog, type GameState } from './systems/state';
import { castleHtml, type CastleUi } from './ui/castle-panel';
import { el, setHtml } from './ui/dom';
import { battleHudHtml, logHtml, resourcesHtml } from './ui/panels-top';
import { bestiaryHtml, unitsHtml } from './ui/people-panels';
import { skillsHtml } from './ui/skills-panel';
import { spellbookHtml, spellButtonsHtml } from './ui/spells-panel';
import { SPELL_IDS, SPELLS } from './data/spells';
import { spellLevel } from './systems/spells';
import { researchHtml } from './ui/research-panel';
import { timeMachineHtml } from './ui/timemachine-panel';
import { installTooltips } from './ui/tooltip';
import { chronicleHtml } from './ui/chronicle-panel';
import { showModal } from './ui/modal';
import { EPOCHS, epochDef } from './data/epochs';
import { shardsForJump, tokensForJump } from './systems/prestige';

const saves = new SaveManager(new LocalStorageBackend());

function loadOrCreate(): GameState {
  const { state, recovered } = saves.load();
  if (!state) return newGame();
  addLog(state, 'narrator.loaded');
  // Noch nie eine Schlacht beendet (z. B. während der ersten neu geladen)? Dann direkt wieder hinein –
  // sonst stünde man ohne Burg und ohne Ziel vor einem leeren Bildschirm.
  if (state.stats.battles === 0) startBattle(state, 0);
  if (recovered) showToast(t('save.loadFailed'));
  return state;
}

let state = loadOrCreate();
setLocale(state.settings.locale);

const loop = new FixedStepLoop((dt) => tick(state, dt));
const castleUi: CastleUi = { selected: { x: 2, y: 3 } };
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => state.settings.reducedMotion || prefersReducedMotion.matches;

// ---------- Toast ----------
let toastTimer = 0;
function showToast(text: string): void {
  const box = document.querySelector<HTMLElement>('#toast');
  if (!box) return;
  box.textContent = text;
  box.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => box.classList.remove('show'), 2200);
}

// ---------- Panels ----------
const panels = {
  castle: el('#castle'),
  units: el('#units'),
  skills: el('#skills'),
  research: el('#research'),
  spells: el('#spells'),
  timemachine: el('#timemachine'),
  chronicle: el('#chronicle'),
  bestiary: el('#bestiary'),
};

/** Bereich einblenden – beim ersten Mal mit kleinem Einführungsmoment. */
function reveal(panel: HTMLElement, visible: boolean): void {
  if (panel.hidden === !visible) return;
  panel.hidden = !visible;
  if (visible && !reducedMotion()) {
    panel.classList.add('intro');
    panel.addEventListener('animationend', () => panel.classList.remove('intro'), { once: true });
  }
}

/**
 * Zeitpunkt, bis zu dem die Panels nicht neu geschrieben werden, weil gerade ein Knopf
 * gedrückt wird (sonst ginge der Klick verloren). Als Frist statt als Flag: Ein verpasstes
 * pointerup – z. B. Loslassen außerhalb des Fensters – kann die Oberfläche so nie einfrieren.
 */
let holdRenderUntil = 0;
function renderPanels(): void {
  // Während die Maus gedrückt ist, nichts neu schreiben – sonst geht der Klick verloren.
  if (performance.now() < holdRenderUntil) return;
  setHtml(el('#resources'), resourcesHtml(state));
  setHtml(el('#battle-hud'), battleHudHtml(state) + spellButtonsHtml(state));
  setHtml(el('#log-body'), logHtml(state));

  reveal(panels.castle, !!state.unlocked.castle);
  reveal(panels.units, !!state.unlocked.castle);
  reveal(panels.skills, !!state.unlocked.skills);
  reveal(panels.research, !!state.unlocked.research);
  reveal(panels.timemachine, !!state.unlocked.timeMachine);
  const chronicleVisible = state.totalShards > 0;
  reveal(panels.chronicle, chronicleVisible);
  if (chronicleVisible) setHtml(el('#chronicle-body'), chronicleHtml(state));
  applyEpoch();
  if (state.unlocked.timeMachine) setHtml(el('#timemachine-body'), timeMachineHtml(state));
  const anySpell = SPELL_IDS.some((id) => spellLevel(state, id) > 0);
  reveal(panels.spells, anySpell);
  if (anySpell) setHtml(el('#spells-body'), spellbookHtml(state));
  reveal(panels.bestiary, !!state.unlocked.bestiary);
  if (state.unlocked.castle) setHtml(el('#castle-body'), castleHtml(state, castleUi));
  if (state.unlocked.castle) setHtml(el('#units-body'), unitsHtml(state));
  if (state.unlocked.skills) setHtml(el('#skills-body'), skillsHtml(state));
  if (state.unlocked.research) setHtml(el('#research-body'), researchHtml(state));
  if (state.unlocked.bestiary) setHtml(el('#bestiary-body'), bestiaryHtml(state));
}

/**
 * Epochen-Look: Die Palette der Epoche ersetzt die Farb-Tokens der Oberfläche.
 * Läuft bei jedem Panel-Update, tut aber nur beim Wechsel etwas.
 */
let shownEpoch = 0;
function applyEpoch(): void {
  if (shownEpoch === state.epoch) return;
  const firstShow = shownEpoch === 0;
  shownEpoch = state.epoch;
  const p = epochDef(state.epoch).palette;
  const root = document.documentElement.style;
  root.setProperty('--torch', p.accent);
  root.setProperty('--panel', p.panel);
  root.setProperty('--bg', p.background);
  root.setProperty('--panel-2', p.panel2);
  root.setProperty('--line', p.line);
  document.body.dataset.epoch = String(state.epoch);
  el('#epoch-label').textContent = t('epoch.title', {
    n: state.epoch,
    name: tk(`epoch.${epochDef(state.epoch).id}`),
  });
  if (!firstShow) celebrateJump();
}

/** Die Feier nach dem Sprung: „Prestige ist ein Fest, kein Verlust.“ */
let lastJump: { shards: number; tokens: number } = { shards: 0, tokens: 0 };
function celebrateJump(): void {
  const name = tk(`epoch.${epochDef(state.epoch).id}`);
  const lines = [t('jump.celebrateSub', lastJump), t('jump.celebrateHint')];
  if (state.epoch > EPOCHS.length) lines.push(t('jump.lastEpoch', { epoch: name }));
  showModal({
    title: t('jump.celebrate', { epoch: name }),
    lines,
    variant: `celebrate ${reducedMotion() ? '' : 'animated'}`,
    buttons: [{ label: t('jump.continue'), primary: true }],
  });
}

/** Vor dem Sprung genau sagen, was bleibt und was neu beginnt. */
function confirmJump(): void {
  const next = tk(`epoch.${epochDef(state.epoch + 1).id}`);
  const shards = shardsForJump(state);
  const tokens = tokensForJump(state);
  showModal({
    title: t('jump.confirmTitle', { epoch: next }),
    lines: [t('jump.gain', { shards, tokens }), t('jump.keeps'), t('jump.resets')],
    buttons: [
      { label: t('jump.cancel') },
      {
        label: t('jump.go'),
        primary: true,
        onClick: () => {
          lastJump = { shards, tokens };
          run({ type: 'jump' });
          save();
        },
      },
    ],
  });
}

function applyStaticTexts(): void {
  document.documentElement.lang = getLocale();
  document.title = t('app.title');
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n as MessageKey);
  }
  el('#autosave-label').textContent = t('save.autosave', { s: state.settings.autosaveSeconds });
  el('#epoch-label').textContent = t('epoch.title', {
    n: state.epoch,
    name: tk(`epoch.${epochDef(state.epoch).id}`),
  });
  el<HTMLSelectElement>('#autosave').value = String(state.settings.autosaveSeconds);
}

function run(actionToRun: Action): void {
  const reason = dispatch(state, actionToRun);
  if (reason) showToast(t(reason));
  holdRenderUntil = 0;
  renderPanels();
}

// ---------- Speichern ----------
let lastSave = Date.now();
function save(manual = false): void {
  saves.save(state);
  lastSave = Date.now();
  if (manual) showToast(t('save.saved'));
}

/** Neues Spiel; der alte Hauptstand wird gelöscht, die Backups bleiben. */
function resetGame(): void {
  saves.reset();
  state = newGame();
  setLocale(state.settings.locale);
  applyStaticTexts();
  for (const p of Object.values(panels)) p.hidden = true;
  save();
  renderPanels();
}

// ---------- Eingaben ----------
function installInput(debug: { toggle(): void }): void {
  document.addEventListener('pointerdown', (e) => {
    // Nur Knöpfe in Panels betreffen; Klicks ins Schlachtfeld halten nichts auf.
    if ((e.target as HTMLElement).closest('.panel button, .panel [data-select]')) {
      holdRenderUntil = performance.now() + 600;
    }
  });
  window.addEventListener('pointerup', () => (holdRenderUntil = 0));
  window.addEventListener('pointercancel', () => (holdRenderUntil = 0));

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const actionEl = target.closest<HTMLElement>('[data-action]');
    if (actionEl && !(actionEl as HTMLButtonElement).disabled) {
      run(JSON.parse(actionEl.dataset.action ?? '{}') as Action);
      return;
    }
    if (target.closest('[data-jump]')) {
      confirmJump();
      return;
    }
    const tileEl = target.closest<HTMLElement>('[data-select]');
    if (tileEl) {
      const [x, y] = (tileEl.dataset.select ?? '0,0').split(',').map(Number);
      castleUi.selected = { x: x ?? 0, y: y ?? 0 };
      renderPanels();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      debug.toggle();
      return;
    }
    if ((e.target as HTMLElement).closest('input, select, textarea')) return;
    const spell = SPELL_IDS.find((id) => SPELLS[id].key === e.key);
    if (spell && state.battle) {
      run({ type: 'castSpell', spell });
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.battle) run({ type: 'startBattle' });
    } else if (e.key.toLowerCase() === 's' && !e.ctrlKey) {
      save(true);
    } else if (e.key === 'Escape') {
      castleUi.selected = null;
      renderPanels();
    }
  });

  el('#save').addEventListener('click', () => save(true));
  el('#lang').addEventListener('click', () => {
    state.settings.locale = getLocale() === 'de' ? 'en' : 'de';
    setLocale(state.settings.locale);
    applyStaticTexts();
    renderPanels();
  });
  el('#export').addEventListener('click', () => {
    const text = toExportString(state);
    navigator.clipboard?.writeText(text).then(
      () => showToast(t('save.exported')),
      () => prompt(t('save.export'), text),
    );
  });
  el('#import').addEventListener('click', () => {
    const text = prompt(t('save.importPrompt'));
    if (!text) return;
    try {
      state = fromExportString(text);
      setLocale(state.settings.locale);
      applyStaticTexts();
      save();
      renderPanels();
    } catch {
      showToast(t('save.importFailed'));
    }
  });
  el<HTMLSelectElement>('#autosave').addEventListener('change', (e) => {
    state.settings.autosaveSeconds = Number((e.target as HTMLSelectElement).value);
    applyStaticTexts();
  });

  // Beim Verlassen oder Verstecken des Tabs sofort speichern – kein Spielstandverlust.
  document.addEventListener('visibilitychange', () => document.hidden && save());
  window.addEventListener('pagehide', () => save());
}

async function start(): Promise<void> {
  applyStaticTexts();
  installTooltips(el('#tooltip'));

  const debug = installDebugPanel(el('#debug'), {
    getState: () => state,
    loop,
    resetSave: resetGame,
    rerender: renderPanels,
  });
  if (import.meta.env.DEV) {
    const btn = el('#debug-toggle');
    btn.hidden = false;
    btn.addEventListener('click', () => debug.toggle());
  }
  installInput(debug);

  const scene = await BattleScene.create(el('#stage'), el('#fx-layer'), {
    onEnemyClick: (enemyId) => run({ type: 'clickEnemy', enemyId }),
    reducedMotion,
  });

  let last = performance.now();
  let panelTimer = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    loop.advance(now - last);
    last = now;
    scene.update(state, loop.alpha, dt);

    // Panels 5× pro Sekunde reichen; sie ändern ihr DOM ohnehin nur bei echten Änderungen.
    panelTimer += dt;
    if (panelTimer >= 0.2) {
      panelTimer = 0;
      renderPanels();
    }
    if (Date.now() - lastSave >= state.settings.autosaveSeconds * 1000) save();
    requestAnimationFrame(frame);
  };
  renderPanels();
  requestAnimationFrame(frame);

  // Zugriff für den Playwright-Test und für Neugierige in der Konsole.
  (window as unknown as { __chronokrone: unknown }).__chronokrone = {
    get state() {
      return state;
    },
    loop,
    save,
    run,
    reset: resetGame,
  };
  document.body.dataset.ready = 'true';
}

void start();

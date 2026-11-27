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
import { defaultStorage } from './save/storage';
import { openRunCard } from './ui/runcard-panel';
import { dispatch, type Action } from './systems/actions';
import { startBattle } from './systems/battle';
import { newGame, tick } from './systems/game';
import { addLog, type FxEvent, type GameState } from './systems/state';
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
import { audio } from './audio/engine';
import { sfx, updateMusic } from './audio/player';
import { applySetting, settingsHtml } from './ui/settings-panel';
import { showRecap } from './ui/recap';
import { welcomeBack } from './systems/recap';
import { chronicleHtml } from './ui/chronicle-panel';
import { companionsHtml } from './ui/market-panel';
import { cardsHtml } from './ui/cards-panel';
import { relicsHtml } from './ui/reactor-panel';
import { completionHtml, showCredits } from './ui/finale-panel';
import { loopHtml } from './ui/loop-panel';
import { curseShardMult, sealsForLoop } from './systems/loop';
import { eventHtml, seasonHtml } from './ui/events-panel';
import { achievementsHtml, achievementTitle, statsHtml } from './ui/achievements-panel';
import { ACHIEVEMENTS } from './data/achievements';
import { ordersHtml, ordersLogHtml, rulesAfterButton, rulesAfterChange } from './ui/orders-panel';
import { showModal } from './ui/modal';
import { EPOCHS, epochDef } from './data/epochs';
import { shardsForJump, tokensForJump } from './systems/prestige';

const saves = new SaveManager(defaultStorage());

/** Rückblick auf die letzte Sitzung, falls man lange genug weg war (wird nach dem Start gezeigt). */
let pendingRecap: ReturnType<typeof welcomeBack> = null;

function loadOrCreate(): GameState {
  const { state, recovered } = saves.load();
  if (!state) {
    const fresh = newGame();
    welcomeBack(fresh, Date.now());
    return fresh;
  }
  pendingRecap = welcomeBack(state, Date.now());
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
  orders: el('#orders'),
  event: el('#event'),
  achievements: el('#achievements'),
  companions: el('#companions'),
  cards: el('#cards'),
  relics: el('#relics'),
  completion: el('#completion'),
  loop: el('#loop'),
  stats: el('#stats'),
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
  reveal(panels.orders, !!state.unlocked.orders);
  if (state.unlocked.orders) {
    setHtml(el('#orders-body'), ordersHtml(state));
    setHtml(el('#orders-log'), ordersLogHtml(state));
  }
  const anyAchievement = Object.keys(state.achievements).length > 0;
  reveal(panels.achievements, anyAchievement);
  if (anyAchievement) setHtml(el('#achievements-body'), achievementsHtml(state));
  // Begleiter gibt es ab Epoche 2; einmal gefunden, bleibt die Sammlung sichtbar.
  const companionsVisible = state.epoch >= 2 || Object.keys(state.companions).length > 0;
  reveal(panels.companions, companionsVisible);
  if (companionsVisible) setHtml(el('#companions-body'), companionsHtml(state));
  const cardsVisible = state.epoch >= 3 || Object.keys(state.cards).length > 0;
  reveal(panels.cards, cardsVisible);
  if (cardsVisible) setHtml(el('#cards-body'), cardsHtml(state));
  const relicsVisible = state.epoch >= 4 || Object.keys(state.relics).length > 0;
  reveal(panels.relics, relicsVisible);
  if (relicsVisible) setHtml(el('#relics-body'), relicsHtml(state));
  const completionVisible = state.epoch >= 5 || state.loop.count > 0;
  reveal(panels.completion, completionVisible);
  if (completionVisible) setHtml(el('#completion-body'), completionHtml(state));
  const loopVisible = state.finale.wins > 0 || state.loop.count > 0;
  reveal(panels.loop, loopVisible);
  if (loopVisible) setHtml(el('#loop-body'), loopHtml(state));
  reveal(panels.stats, !!state.unlocked.castle);
  if (state.unlocked.castle) setHtml(el('#stats-body'), statsHtml(state));
  reveal(panels.event, !!state.events.active);
  if (state.events.active) setHtml(el('#event-body'), eventHtml(state));
  setHtml(el('#season-label'), state.unlocked.castle ? seasonHtml(state) : '');
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

/** Abspann nach dem Finale (und auf Wunsch erneut aus dem Zeitmaschinen-Bereich). */
function openCredits(): void {
  const extra =
    state.finale.wonAt !== null ? [{ label: t('credits.loop'), primary: true, onClick: confirmLoop }] : [];
  showCredits(state, reducedMotion(), extra);
}

const loopShards = () => Math.round(shardsForJump(state) * curseShardMult(state));

/** Vor der Zeitschleife genau sagen, was bleibt und was neu beginnt. */
function confirmLoop(): void {
  showModal({
    title: t('loop.confirmTitle', { n: state.loop.count + 1 }),
    lines: [
      t('loop.gain', { seals: sealsForLoop(state), shards: loopShards() }),
      t('loop.keeps'),
      t('loop.resets'),
    ],
    buttons: [
      { label: t('jump.cancel') },
      {
        label: t('loop.go'),
        primary: true,
        onClick: () => {
          lastJump = { shards: loopShards(), tokens: 0 };
          run({ type: 'startLoop' });
          save();
        },
      },
    ],
  });
}

/** Einstellungen anwenden: Schriftgröße, Lautstärken. */
function applySettings(): void {
  const s = state.settings;
  document.documentElement.style.setProperty('--font-scale', String(s.fontScale));
  audio.setVolumes(s.sfxVolume, s.musicVolume);
}

function toggleSettings(show?: boolean): void {
  const box = el('#settings');
  const visible = show ?? box.hidden;
  if (visible) setHtml(box, settingsHtml(state.settings));
  box.hidden = !visible;
}

/** M: alles stumm bzw. die vorigen Lautstärken zurück. */
let mutedFrom: { sfx: number; music: number } | null = null;
function toggleMute(): void {
  const s = state.settings;
  if (mutedFrom) {
    s.sfxVolume = mutedFrom.sfx;
    s.musicVolume = mutedFrom.music;
    mutedFrom = null;
  } else {
    mutedFrom = { sfx: s.sfxVolume, music: s.musicVolume };
    s.sfxVolume = 0;
    s.musicVolume = 0;
  }
  applySettings();
  showToast(t(mutedFrom ? 'settings.muted' : 'settings.unmuted'));
}

/** Soundeffekte zu den Ereignissen der Schlacht. */
function soundFor(fx: FxEvent): void {
  switch (fx.kind) {
    case 'hit':
      sfx(fx.byClick ? 'click' : 'hit');
      break;
    case 'kill':
    case 'crit':
    case 'wallHit':
    case 'levelUp':
    case 'drone':
    case 'achievement':
    case 'jump':
      sfx(fx.kind);
      break;
    case 'battleEnd':
      sfx(fx.result === 'won' ? 'battleWon' : 'battleLost');
      break;
    case 'spell':
      sfx(fx.spell === 'blessing' ? 'heal' : 'spell');
      break;
    case 'milestone':
      sfx('levelUp');
      break;
    case 'finale':
      sfx('jump');
      openCredits();
      break;
  }
}

function applyStaticTexts(): void {
  document.documentElement.lang = getLocale();
  document.title = t('app.title');
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n as MessageKey);
  }

  el('#epoch-label').textContent = t('epoch.title', {
    n: state.epoch,
    name: tk(`epoch.${epochDef(state.epoch).id}`),
  });
}

function run(actionToRun: Action): void {
  const reason = dispatch(state, actionToRun);
  if (reason) showToast(t(reason));
  // Hörbare Rückmeldung für Käufe; Kampf-Aktionen klingen über ihre Effekte.
  const quiet = ['clickEnemy', 'castSpell', 'startBattle', 'retreat', 'catchDrone', 'setOrders'];
  if (!quiet.includes(actionToRun.type))
    sfx(reason ? 'deny' : actionToRun.type === 'build' ? 'build' : 'buy');
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
    const orderBtn = target.closest<HTMLElement>('[data-order-btn]');
    if (orderBtn) {
      const rules = rulesAfterButton(state, orderBtn.dataset.orderBtn ?? '');
      if (rules) run({ type: 'setOrders', rules });
      return;
    }
    if (target.closest('[data-jump]')) {
      confirmJump();
      return;
    }
    if (target.closest('[data-runcard]')) {
      openRunCard(state, epochDef(state.epoch).palette.accent, (name) => (state.settings.nickname = name));
      return;
    }
    if (target.closest('[data-loop]')) {
      confirmLoop();
      return;
    }
    if (target.closest('[data-credits]')) {
      openCredits();
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
    } else if (e.key.toLowerCase() === 'r' && state.battle) {
      run({ type: 'retreat' });
    } else if (e.key.toLowerCase() === 'm') {
      toggleMute();
    } else if (e.key.toLowerCase() === 'o') {
      toggleSettings();
    } else if (e.key === 'Escape') {
      toggleSettings(false);
      document.querySelector('.modal-backdrop')?.remove();
      castleUi.selected = null;
      renderPanels();
    }
  });

  // Baukasten der Hofbefehle: Auswahllisten, Zahlenfelder, Häkchen.
  document.addEventListener('change', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('[data-order]');
    if (!input) return;
    const rules = rulesAfterChange(state, input);
    if (rules) run({ type: 'setOrders', rules });
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
  // Einstellungen: eigenes Fenster, Änderungen wirken sofort.
  el('#settings-toggle').addEventListener('click', () => toggleSettings());
  el('#settings').addEventListener('input', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('[data-setting]');
    if (!input) return;
    const before = state.settings.locale;
    applySetting(state.settings, input);
    applySettings();
    if (state.settings.locale !== before) {
      setLocale(state.settings.locale);
      applyStaticTexts();
      renderPanels();
    }
    // Nur die Beschriftungen mit Prozentwerten neu schreiben – Schieberegler behalten den Fokus.
    if (input instanceof HTMLSelectElement || input.type === 'checkbox')
      setHtml(el('#settings'), settingsHtml(state.settings));
  });
  el('#settings').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-settings-close]')) toggleSettings(false);
  });

  // Audio darf erst nach einer Nutzeraktion starten.
  const unlockAudio = () => audio.unlock();
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);
  document.addEventListener('visibilitychange', () => audio.setHidden(document.hidden));

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
    onDroneClick: () => run({ type: 'catchDrone' }),
    onFx: soundFor,
    onAchievement: (id) => {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) showToast(`★ ${achievementTitle(id, def.metric)}`);
    },
    reducedMotion,
  });

  let last = performance.now();
  let panelTimer = 0;
  let lastEvent = state.events.active;
  applySettings();
  const frame = (now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    loop.advance(now - last);
    last = now;
    // Neues Ereignis? Kurzer Hinweiston.
    if (state.events.active && state.events.active !== lastEvent) sfx('event');
    lastEvent = state.events.active;
    scene.update(state, loop.alpha, dt);
    if (state.settings.musicVolume > 0) updateMusic(state.epoch);

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
  if (pendingRecap) showRecap(pendingRecap, reducedMotion());
}

void start();

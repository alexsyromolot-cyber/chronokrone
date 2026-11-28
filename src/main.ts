/**
 * Einstiegspunkt im Browser: lädt den Spielstand, startet Logik-Loop und Darstellung
 * und verbindet Eingaben (Klicks, Tasten) mit Aktionen. Hier – und nur hier – treffen
 * DOM, requestAnimationFrame und Spiellogik aufeinander.
 */
import './style.css';
import './shell.css';
import './hud.css';
import './iso.css';
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
import type { CastleUi } from './ui/castle-panel';
import type { BuildingId } from './data/buildings';
import { el, setHtml } from './ui/dom';
import { resourcesHtml } from './ui/panels-top';
import { spellButtonsHtml } from './ui/spells-panel';
import { SPELL_IDS, SPELLS } from './data/spells';
import { installTooltips } from './ui/tooltip';
import { audio } from './audio/engine';
import { sfx, updateMusic } from './audio/player';
import { applySetting, settingsHtml } from './ui/settings-panel';
import { showRecap } from './ui/recap';
import { welcomeBack } from './systems/recap';
import { cardsHtml } from './ui/cards-panel';
import { showCredits } from './ui/finale-panel';
import { curseShardMult, sealsForLoop } from './systems/loop';
import { seasonHtml } from './ui/events-panel';
import { achievementTitle } from './ui/achievements-panel';
import { ACHIEVEMENTS } from './data/achievements';
import { rulesAfterButton, rulesAfterChange } from './ui/orders-panel';
import { showModal } from './ui/modal';
import { EPOCHS, epochDef } from './data/epochs';
import { shardsForJump, tokensForJump } from './systems/prestige';
import { BATTLE_RESOURCES, type RoomId } from './data/rooms';
import { phase } from './systems/scene';
import { roomUnlocked } from './systems/rooms';
import { Shell } from './ui/shell';
import { pushToast, type ToastKind } from './ui/toasts';
import { countdownHtml, eventModalHtml, resultHtml } from './ui/overlays';
import { narratorHtml, narratorLogHtml } from './ui/narrator';
import { arenaHudHtml, troopListHtml } from './ui/arena';
import { currentRoom, prepHtml, roomResources, tabsHtml, type VillageUi } from './ui/village';
import { renderRoom, showRoom } from './ui/rooms-render';
import { uiIcon } from './ui/ui-icons';

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
const castleUi: CastleUi = { selected: { x: 2, y: 3 }, build: null, numbers: false };
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => state.settings.reducedMotion || prefersReducedMotion.matches;

// ---------- Meldungen ----------
function showToast(text: string, kind: ToastKind = 'info'): void {
  pushToast(text, kind);
}

// ---------- Szenen ----------
const shell = new Shell(el('#app'), el('#gate'));
/** UI-Zustand des Dorfs: offener Raum, gewählte Belagerungsstufe, Karten-Ablage. */
const villageUi: VillageUi = { room: 'bau', siege: null, cardsOpen: false };
let narratorOpen = false;

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
  const shown = shell.phase ?? phase(state);
  const room = currentRoom(state, villageUi);

  // Ressourcenleiste: nur, was in dieser Phase bzw. diesem Raum zählt.
  setHtml(
    el('#resources'),
    resourcesHtml(state, shown === 'battle' ? BATTLE_RESOURCES : roomResources(room)),
  );

  if (shown === 'battle') {
    setHtml(el('#battle-hud'), arenaHudHtml(state));
    setHtml(el('#troop-list'), troopListHtml(state));
    setHtml(el('#spell-bar'), spellButtonsHtml(state));
  } else {
    renderVillage(room);
  }

  // Immer da: Erzähler, Countdown, Fenster in der Mitte.
  setHtml(el('#narrator'), narratorHtml(state));
  const log = el('#narrator-log');
  log.hidden = !narratorOpen;
  if (narratorOpen) setHtml(log, narratorLogHtml(state));
  const countdown = el('#countdown');
  countdown.hidden = state.scene.countdown === null;
  if (!countdown.hidden) setHtml(countdown, countdownHtml(state));
  renderOverlay();

  setHtml(el('#season-label'), state.unlocked.castle ? seasonHtml(state) : '');
  applyEpoch();
}

/** Dorf: Reiterleiste, „Zur Mauer“, und nur der offene Raum wird geschrieben. */
function renderVillage(room: RoomId | null): void {
  setHtml(el('#room-tabs'), tabsHtml(state, room));
  const cardsVisible = state.epoch >= 3 || Object.keys(state.cards).length > 0;
  const cards =
    cardsVisible && villageUi.cardsOpen ? `<div class="float cards-pop">${cardsHtml(state)}</div>` : '';
  setHtml(el('#prep'), prepHtml(state, villageUi, cardsVisible) + cards);
  el('#room-title').textContent = room ? tk(`room.${room}`) : '';
  showRoom(room, reducedMotion());
  renderRoom(state, room, castleUi, reveal);
  if (room === 'bau') fitIsoZoom();
}

/**
 * Bauplatz so groß wie möglich, aber ganzzahlig vergrößert (scharfe Pixel): 2× bis 4×,
 * je nachdem, wie viel Platz neben der Seitenleiste ist.
 */
function fitIsoZoom(): void {
  const wrap = document.querySelector<HTMLElement>('.iso-wrap');
  const grid = document.querySelector<HTMLElement>('.iso-grid');
  if (!wrap || !grid) return;
  const natural = parseFloat(grid.style.width) || 1;
  const zoom = Math.max(2, Math.min(4, Math.floor(wrap.clientWidth / natural)));
  el('#castle-body').style.setProperty('--iso-zoom', String(zoom));
}

/** Ereignis (pausiert das Spiel) hat Vorrang vor dem Ergebnisfenster der Schlacht. */
function renderOverlay(): void {
  const box = el('#overlay');
  const html = state.events.active
    ? eventModalHtml(state)
    : state.scene.result && shell.phase === 'battle'
      ? resultHtml(state)
      : '';
  box.hidden = html === '';
  if (html) setHtml(box, html);
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
  // Knöpfe mit Pixel-Symbol: Beschriftung als Tooltip und für Screenreader.
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
    const label = t(node.dataset.i18nLabel as MessageKey);
    node.setAttribute('aria-label', label);
    node.dataset.tip = label;
    const url = node.dataset.icon ? uiIcon(`btn-${node.dataset.icon}`) : null;
    // Sprachknopf zeigt das Kürzel der anderen Sprache (EN/DE), die anderen ihr Symbol.
    if (url) node.innerHTML = `<img src="${url}" alt="">`;
    else node.textContent = label.slice(0, 2).toUpperCase();
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
  villageUi.room = 'bau';
  shownEpoch = 0; // neues Spiel ist kein Zeitsprung – keine Feier
  save();
  renderPanels();
}

// ---------- Eingaben ----------
function installInput(debug: { toggle(): void }): void {
  document.addEventListener('pointerdown', (e) => {
    // Nur Knöpfe in Panels betreffen; Klicks ins Schlachtfeld halten nichts auf.
    if ((e.target as HTMLElement).closest('#app button, #overlay button, [data-select]')) {
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
    const tab = target.closest<HTMLElement>('[data-room-tab]');
    if (tab) {
      const id = tab.dataset.roomTab as RoomId;
      if (roomUnlocked(state, id)) {
        villageUi.room = id;
        holdRenderUntil = 0;
        renderPanels();
      } else showToast(tk(`room.locked.${id}`));
      return;
    }
    if (target.closest('[data-cards-toggle]')) {
      villageUi.cardsOpen = !villageUi.cardsOpen;
      renderPanels();
      return;
    }
    if (target.closest('[data-narrator-close]')) {
      narratorOpen = false;
      renderPanels();
      return;
    }
    if (target.closest('[data-narrator]')) {
      narratorOpen = !narratorOpen;
      renderPanels();
      return;
    }
    if (target.closest('[data-iso-numbers]')) {
      castleUi.numbers = !castleUi.numbers;
      renderPanels();
      return;
    }
    // Bau-Katalog: Gebäude wählen (noch einmal klicken = Bau-Modus aus).
    const pick = target.closest<HTMLElement>('[data-build-pick]');
    if (pick) {
      const id = pick.dataset.buildPick as BuildingId;
      castleUi.build = castleUi.build === id ? null : id;
      holdRenderUntil = 0;
      renderPanels();
      return;
    }
    const tileEl = target.closest<HTMLElement>('[data-select]');
    if (tileEl) {
      const [x = 0, y = 0] = (tileEl.dataset.select ?? '0,0').split(',').map(Number);
      castleUi.selected = { x, y };
      // Im Bau-Modus baut ein Klick auf ein freies Feld direkt das gewählte Gebäude.
      const tile = state.tiles.find((t) => t.x === x && t.y === y);
      if (castleUi.build && tile?.unlocked && !tile.building) {
        run({ type: 'build', x, y, building: castleUi.build });
        if (tile.building) castleUi.build = null;
        return;
      }
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
      // Leertaste: im Dorf zur Mauer (gewählte Stufe), nach der Schlacht zurück ins Dorf.
      if (state.scene.result && !state.battle) run({ type: 'dismissResult' });
      else if (phase(state) === 'village')
        run({ type: 'startBattle', siege: Math.min(villageUi.siege ?? state.siegeLevel, state.siegeLevel) });
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
      narratorOpen = false;
      castleUi.selected = null;
      castleUi.build = null;
      renderPanels();
    }
  });

  // Baukasten der Hofbefehle: Auswahllisten, Zahlenfelder, Häkchen.
  document.addEventListener('change', (e) => {
    const siege = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-siege-select]');
    if (siege) {
      villageUi.siege = Number(siege.value);
      renderPanels();
      return;
    }
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
  // Vollbild (Browser und Electron): Alex spielt meist so.
  el('#fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  });
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
      if (def) showToast(achievementTitle(id, def.metric), 'achievement');
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
    // Szene folgt der Logik: bei Phasenwechsel Tor zu, tauschen, Tor auf.
    shell.sync(phase(state), reducedMotion(), () => {
      holdRenderUntil = 0;
      renderPanels();
    });
    // Das Schlachtfeld nur zeichnen, wenn man es sieht (im Dorf läuft ohnehin keine Schlacht).
    if (shell.phase === 'battle') scene.update(state, loop.alpha, dt);
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

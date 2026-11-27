/**
 * Darstellung der Abwehrschlacht (PixiJS). Liest den Spielzustand, verändert ihn nie –
 * Klicks auf Aliens werden als Rückruf nach außen gemeldet und dort als Aktion ausgeführt.
 *
 * Interne Auflösung 320×180, auf ein ganzzahliges Vielfaches skaliert (scharfe Pixel).
 */
import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { BATTLE, ENEMIES } from '../data/enemies';
import { t } from '../i18n';
import { epochDef, type EpochPalette } from '../data/epochs';
import { DRONE } from '../data/events';
import type { FxEvent, GameState } from '../systems/state';
import { attackInterval, troops } from '../systems/units';
import { Effects } from './effects';
import { spriteTexture } from './pixel';
import { ENEMY_SPRITES, UNIT_SPRITES } from './sprites';
import { VIEW_H, VIEW_W } from './view';

export { VIEW_H, VIEW_W };
const GROUND_Y = 146;
const WALL_LEFT = 40;
const WALL_TOP = 100;
const LANE_STEP = 7;

export interface BattleSceneOptions {
  onEnemyClick: (enemyId: number) => void;
  onDroneClick: () => void;
  onAchievement?: (id: string) => void;
  /** Jedes Effekt-Ereignis, z. B. für Soundeffekte. */
  onFx?: (fx: FxEvent) => void;
  reducedMotion: () => boolean;
}

export class BattleScene {
  private readonly defenders = new Map<number, Sprite>();
  private readonly enemies = new Map<
    number,
    { sprite: Sprite; hpBar: Graphics; glow: Graphics; lastHp: number; flash: number; base: number }
  >();
  private readonly defenderLayer = new Container();
  private readonly enemyLayer = new Container();
  private readonly torches: Graphics[] = [];
  private readonly effects: Effects;
  /** Die Alien-Drohne (Minispiel): fliegt oben über den Himmel. */
  private drone: Sprite | null = null;
  private time = 0;
  private shake = 0;
  /** Das umgebende Element bestimmt die verfügbare Breite (host selbst schrumpft aufs Canvas). */
  private readonly sizer: HTMLElement;
  /** Hintergrund und Mauer hängen von der Epochen-Palette ab und werden beim Sprung neu gezeichnet. */
  private background = new Container();
  private wall = new Container();
  private palette: EpochPalette = epochDef(1).palette;
  private paletteEpoch = 1;
  /** Wolken ziehen langsam über den Himmel (Parallaxe). */
  private clouds = new Container();

  private constructor(
    private readonly app: Application,
    host: HTMLElement,
    fxLayer: HTMLElement,
    private readonly options: BattleSceneOptions,
  ) {
    this.sizer = host.parentElement ?? host;
    const particleLayer = new Container();
    this.background = this.drawBackground();
    this.wall = this.drawWall();
    app.stage.addChild(this.background, this.enemyLayer, this.wall, this.defenderLayer, particleLayer);
    this.effects = new Effects(particleLayer, fxLayer);
    app.canvas.addEventListener('pointerdown', (e) => this.handlePointer(e));
    new ResizeObserver(() => this.resize()).observe(this.sizer);
    this.resize();
  }

  static async create(
    host: HTMLElement,
    fxLayer: HTMLElement,
    options: BattleSceneOptions,
  ): Promise<BattleScene> {
    const app = new Application();
    await app.init({
      width: VIEW_W,
      height: VIEW_H,
      background: '#0b0f1a',
      antialias: false,
      autoStart: false,
      // Kein Pixi-eigener Ticker: Unser Haupt-Loop entscheidet, wann gezeichnet wird.
      sharedTicker: false,
    });
    app.ticker.stop();
    host.prepend(app.canvas);
    return new BattleScene(app, host, fxLayer, options);
  }

  /** Größtes ganzzahliges Vielfaches von 320×180, das in den Container passt. */
  resize(): void {
    // Ganzzahlig skalieren (scharfe Pixel) – passend in Breite UND Höhe der Arena.
    const byHeight = this.sizer.clientHeight > 0 ? this.sizer.clientHeight / VIEW_H : Infinity;
    const scale = Math.max(1, Math.floor(Math.min(this.sizer.clientWidth / VIEW_W, byHeight)));
    const style = this.app.canvas.style;
    style.width = `${VIEW_W * scale}px`;
    style.height = `${VIEW_H * scale}px`;
  }

  private drawBackground(): Container {
    const bg = new Container();
    const sky = new Graphics();
    // Nachthimmel in Bändern statt Verlauf – passt zur Pixelart.
    const p = this.palette;
    const bands = p.sky;
    bands.forEach((c, i) => sky.rect(0, i * 22, VIEW_W, 22).fill(c));
    for (let i = 0; i < 50; i++)
      sky.rect((i * 89) % VIEW_W, (i * 47) % 100, 1, 1).fill(i % 6 ? p.stars : '#f3ead7');
    sky
      .rect(270, 18, 10, 10)
      .fill('#e8e2c8')
      .rect(268, 20, 2, 6)
      .fill('#e8e2c8')
      .rect(272, 20, 3, 3)
      .fill('#c9c2a3');
    // Waldrand am Horizont mit Meteor-Glut dahinter.
    sky.rect(200, 108, 60, 14).fill('#3a2230');
    sky.rect(216, 104, 28, 6).fill(p.glow);
    for (let x = 0; x < VIEW_W; x += 6) {
      const h = 10 + ((x * 7) % 9);
      sky.rect(x, 122 - h, 6, h).fill(p.treeline);
      sky.rect(x + 2, 122 - h - 3, 2, 3).fill(p.treeline);
    }
    const ground = new Graphics().rect(0, 122, VIEW_W, VIEW_H - 122).fill(p.ground);
    ground.rect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y).fill(p.groundDark);
    for (let x = 0; x < VIEW_W; x += 13) ground.rect(x, GROUND_Y + ((x * 3) % 20), 2, 1).fill('#2a3d2c');
    // Mondschein als weicher Hof.
    const moon = new Graphics()
      .circle(275, 23, 16)
      .fill({ color: '#e8e2c8', alpha: 0.08 })
      .circle(275, 23, 9)
      .fill({ color: '#e8e2c8', alpha: 0.1 });
    // Warmer Lichtschein der Fackeln auf dem Boden vor der Mauer.
    const lightPool = new Graphics()
      .ellipse(BATTLE.wallX - 10, GROUND_Y + 2, 46, 8)
      .fill({ color: '#f2b33d', alpha: 0.07 })
      .ellipse(BATTLE.wallX - 10, GROUND_Y + 2, 24, 4)
      .fill({ color: '#f2b33d', alpha: 0.08 });
    this.clouds = new Container();
    for (let i = 0; i < 4; i++) {
      const c = new Graphics();
      const w = 30 + ((i * 17) % 25);
      c.rect(0, 2, w, 4)
        .fill({ color: p.stars, alpha: 0.18 })
        .rect(6, 0, w - 14, 3)
        .fill({ color: p.stars, alpha: 0.14 });
      c.position.set((i * 97) % VIEW_W, 14 + i * 13);
      this.clouds.addChild(c);
    }
    // Dunkle Ränder (Vignette) – lenkt den Blick zur Mitte und macht die Nacht kälter.
    const vignette = new Graphics();
    for (let i = 0; i < 6; i++) {
      const a = 0.05;
      vignette
        .rect(0, 0, VIEW_W, 3 + i * 3)
        .fill({ color: '#000000', alpha: a })
        .rect(0, VIEW_H - 3 - i * 3, VIEW_W, 3 + i * 3)
        .fill({ color: '#000000', alpha: a })
        .rect(VIEW_W - 4 - i * 4, 0, 4 + i * 4, VIEW_H)
        .fill({ color: '#000000', alpha: a });
    }
    bg.addChild(sky, moon, this.clouds, ground, lightPool, vignette);
    return bg;
  }

  private drawWall(): Container {
    const wall = new Container();
    const g = new Graphics();
    const p = this.palette;
    this.torches.length = 0;
    g.rect(WALL_LEFT, WALL_TOP, BATTLE.wallX - WALL_LEFT, GROUND_Y - WALL_TOP).fill(p.wall);
    for (let y = WALL_TOP + 4; y < GROUND_Y; y += 8) {
      const offset = (y / 8) % 2 ? 0 : 4;
      for (let x = WALL_LEFT + offset; x < BATTLE.wallX; x += 8) g.rect(x, y, 7, 1).fill(p.wallDark);
    }
    for (let x = WALL_LEFT; x < BATTLE.wallX; x += 8) g.rect(x, WALL_TOP - 5, 5, 5).fill(p.wall);
    g.rect(0, WALL_TOP + 20, WALL_LEFT, GROUND_Y - WALL_TOP - 20).fill('#2a2d3b');
    wall.addChild(g);
    // Fackeln: warmes Licht gegen die kalte Nacht.
    for (const x of [WALL_LEFT + 2, BATTLE.wallX - 4]) {
      const torch = new Graphics()
        .circle(x + 1, WALL_TOP - 9, 6)
        .fill({ color: '#f2b33d', alpha: 0.18 })
        .rect(x, WALL_TOP - 8, 2, 5)
        .fill('#5a3a22')
        .rect(x, WALL_TOP - 11, 2, 3)
        .fill('#f2b33d');
      this.torches.push(torch);
      wall.addChild(torch);
    }
    return wall;
  }

  /** Nach einem Epochenwechsel Himmel, Boden und Mauer in der neuen Palette zeichnen. */
  private applyEpoch(epoch: number): void {
    if (epoch === this.paletteEpoch) return;
    this.paletteEpoch = epoch;
    this.palette = epochDef(epoch).palette;
    const stage = this.app.stage;
    const bgIndex = stage.getChildIndex(this.background);
    const wallIndex = stage.getChildIndex(this.wall);
    this.background.destroy({ children: true });
    this.wall.destroy({ children: true });
    this.background = this.drawBackground();
    this.wall = this.drawWall();
    stage.addChildAt(this.background, bgIndex);
    stage.addChildAt(this.wall, wallIndex);
  }

  /** Klick in Feld-Koordinaten umrechnen und den nächsten Alien im Klickradius treffen. */
  private handlePointer(e: PointerEvent): void {
    const rect = this.app.canvas.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const fy = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    // Die Drohne hat Vorrang – sie ist selten und schnell weg.
    if (this.drone?.visible) {
      const d = this.drone;
      if (Math.hypot(d.x + d.width / 2 - fx, d.y + d.height / 2 - fy) <= BATTLE.clickRadius + 4) {
        this.options.onDroneClick();
        return;
      }
    }
    let best: { id: number; d: number } | null = null;
    for (const [id, view] of this.enemies) {
      const s = view.sprite;
      // Aliens sind unten mittig verankert: x ist die Mitte, y der Fußpunkt.
      const cx = s.x;
      const cy = s.y - s.height / 2;
      const d = Math.hypot(cx - fx, cy - fy);
      if (d <= BATTLE.clickRadius && (!best || d < best.d)) best = { id, d };
    }
    if (best) this.options.onEnemyClick(best.id);
  }

  private enemyY(lane: number, height: number): number {
    return GROUND_Y - height - lane * LANE_STEP;
  }

  private syncDefenders(state: GameState): void {
    const team = troops(state);
    const alive = new Set(team.map((u) => u.id));
    for (const [id, sprite] of this.defenders) {
      if (!alive.has(id)) {
        sprite.destroy();
        this.defenders.delete(id);
      }
    }
    team.forEach((unit, i) => {
      let sprite = this.defenders.get(unit.id);
      if (!sprite) {
        sprite = new Sprite(spriteTexture(UNIT_SPRITES[unit.classId]));
        this.defenders.set(unit.id, sprite);
        this.defenderLayer.addChild(sprite);
      }
      const pos = this.defenderPos(i, sprite.height);
      // Kurzer Ausfallschritt direkt nach einem Schlag.
      const cd = state.battle?.cooldowns[unit.id] ?? 0;
      const lunge = !this.options.reducedMotion() && cd > attackInterval(state, unit) * 0.8 ? 2 : 0;
      const breathe = this.options.reducedMotion()
        ? 0
        : Math.round(Math.sin(this.time * 2.5 + unit.id) * 0.6);
      sprite.position.set(pos.x + lunge, pos.y + breathe);
    });
  }

  private syncDrone(state: GameState): void {
    const d = state.events.drone;
    if (!d) {
      if (this.drone) this.drone.visible = false;
      return;
    }
    if (!this.drone) {
      this.drone = new Sprite(spriteTexture(ENEMY_SPRITES.brummdrohne));
      this.drone.tint = 0xffe66d;
      this.app.stage.addChild(this.drone);
    }
    const progress = 1 - d.left / DRONE.flightTime;
    this.drone.visible = true;
    this.drone.position.set(
      Math.round(VIEW_W + 10 - progress * (VIEW_W + 40)),
      Math.round(24 + d.lane * 14 + Math.sin(this.time * 5) * 3),
    );
  }

  /** Platz der i-ten Truppe: die ersten vier auf dem Wehrgang, der Rest dahinter in Reihen. */
  private defenderPos(i: number, height: number): { x: number; y: number } {
    if (i < 4) return { x: WALL_LEFT + 1 + i * 8, y: WALL_TOP - height };
    const j = i - 4;
    return { x: 34 - (j % 4) * 9, y: GROUND_Y - height - Math.floor(j / 4) * 5 };
  }

  private syncEnemies(state: GameState, alpha: number): void {
    const list = state.battle?.enemies ?? [];
    const alive = new Set(list.map((e) => e.id));
    for (const [id, view] of this.enemies) {
      if (!alive.has(id)) {
        view.sprite.destroy();
        view.hpBar.destroy();
        view.glow.destroy();
        this.enemies.delete(id);
      }
    }
    for (const e of list) {
      let view = this.enemies.get(e.id);
      if (!view) {
        const sprite = new Sprite(spriteTexture(ENEMY_SPRITES[e.type]));
        const elite = !!ENEMIES[e.type].elite;
        // Anker unten mittig: Stauchen und Wippen passieren dann „auf dem Boden“.
        sprite.anchor.set(0.5, 1);
        const base = ENEMIES[e.type].boss ? 3 : elite ? 2 : 1;
        sprite.scale.set(base);
        const hpBar = new Graphics();
        const glow = new Graphics();
        if (elite) glow.circle(0, 0, 18 * (base / 2)).fill({ color: ENEMIES[e.type].color, alpha: 0.25 });
        this.enemyLayer.addChild(glow, sprite, hpBar);
        view = { sprite, hpBar, glow, lastHp: e.hp, flash: 0, base };
        this.enemies.set(e.id, view);
      }
      if (e.hp < view.lastHp) view.flash = 0.12;
      view.lastHp = e.hp;
      view.flash = Math.max(0, view.flash - 1 / 60);

      const reduced = this.options.reducedMotion();
      const moving = e.x > BATTLE.wallX;
      const flying = e.type === 'brummdrohne' || e.type === 'brummkoenigin';
      const h = view.sprite.height;
      // Gehen: kleines Wippen im Schritt; Fliegen: sanftes Schweben; an der Mauer: Hämmern.
      const bob = reduced
        ? 0
        : flying
          ? Math.round(Math.sin(this.time * 6 + e.id) * 2) - 8
          : moving
            ? -Math.round(Math.abs(Math.sin(this.time * 8 + e.id)) * 1.5)
            : -Math.round(Math.max(0, Math.sin(this.time * 14 + e.id)) * 2);
      const x = e.prevX + (e.x - e.prevX) * alpha;
      const w = view.sprite.width;
      const footY = this.enemyY(e.lane, h) + h + bob;
      view.sprite.position.set(Math.round(x + w / 2), Math.round(footY));
      // Treffer: kurz gestaucht und durchscheinend.
      const squash = view.flash > 0 && !reduced ? 0.85 : 1;
      view.sprite.scale.set(view.base * (2 - squash), view.base * squash);
      view.sprite.alpha = view.flash > 0 ? 0.65 : 1;
      if (view.base > 1) {
        view.glow.position.set(Math.round(x + w / 2), Math.round(footY - h / 2));
        view.glow.alpha = reduced ? 0.6 : 0.6 + 0.4 * Math.sin(this.time * 4);
      }
      const y = footY - h;

      view.hpBar.clear();
      if (e.hp < e.maxHp) {
        const w = view.sprite.width;
        view.hpBar
          .rect(Math.round(x), Math.round(y) - 3, w, 2)
          .fill('#3a1d26')
          .rect(Math.round(x), Math.round(y) - 3, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 2)
          .fill(ENEMIES[e.type].color);
      }
    }
  }

  /** Effekte aus dem Zustand abholen und den Puffer leeren. */
  private consumeFx(state: GameState): void {
    const reduced = this.options.reducedMotion();
    for (const fx of state.fx) {
      this.options.onFx?.(fx);
      switch (fx.kind) {
        case 'shot': {
          const from = this.defenderPos(fx.slot, 12);
          this.effects.projectile(from.x + 8, from.y + 4, fx.toX + 6, this.enemyY(fx.lane, 8), fx.color);
          break;
        }
        case 'hit':
          this.effects.number(
            fx.x + 6,
            this.enemyY(fx.lane, 10) - 4,
            fx.amount,
            fx.byClick ? 'click' : 'hit',
          );
          break;
        case 'kill':
          this.effects.burst(
            fx.x + 6,
            this.enemyY(fx.lane, 10) + 4,
            ENEMIES[fx.enemy].color,
            reduced ? 4 : 12,
          );
          this.effects.loot(fx.x + 6, this.enemyY(fx.lane, 10) - 12, fx.gold, fx.scrap);
          break;
        case 'wallHit':
          this.shake = Math.max(this.shake, 2);
          break;
        case 'milestone':
          this.shake = Math.max(this.shake, 6);
          break;
        case 'levelUp': {
          const sprite = this.defenders.get(fx.unitId);
          if (sprite) this.effects.text(sprite.x + 6, sprite.y - 4, t('fx.levelUp'), 'level');
          break;
        }
        case 'battleEnd':
          break;
        case 'achievement':
          this.options.onAchievement?.(fx.id);
          break;
        case 'drone':
          this.effects.burst(this.drone?.x ?? 160, this.drone?.y ?? 30, '#ffe66d', reduced ? 4 : 16);
          this.effects.text(
            (this.drone?.x ?? 160) + 6,
            (this.drone?.y ?? 30) + 10,
            `+${Math.round(fx.gold)}`,
            'gold',
          );
          break;
        case 'crit':
          this.effects.text(fx.x + 6, this.enemyY(fx.lane, 10) - 14, t('fx.crit'), 'click');
          break;
        case 'spell':
          if (fx.spell === 'stoneRain') {
            for (const view of this.enemies.values()) {
              this.effects.burst(view.sprite.x + 6, view.sprite.y, '#b8bccb', reduced ? 3 : 10);
            }
            this.shake = Math.max(this.shake, 4);
          } else if (fx.spell === 'blessing') {
            this.effects.burst(56, 110, '#7ed37e', reduced ? 6 : 24);
          } else {
            this.effects.text(40, 120, '⚑ ⚑ ⚑', 'gold');
          }
          break;
      }
    }
    state.fx.length = 0;
  }

  /** Einmal pro Frame. `alpha` = Anteil zwischen zwei Logik-Ticks (für flüssige Bewegung). */
  update(state: GameState, alpha: number, dtSeconds: number): void {
    this.time += dtSeconds;
    this.applyEpoch(state.epoch);
    this.syncDefenders(state);
    this.syncEnemies(state, alpha);
    this.syncDrone(state);
    this.consumeFx(state);
    this.effects.update(dtSeconds);

    const reduced = this.options.reducedMotion();
    this.torches.forEach((t, i) => (t.alpha = reduced ? 1 : 0.8 + 0.2 * Math.sin(this.time * 9 + i * 2)));
    if (!reduced) {
      this.clouds.children.forEach((c, i) => {
        c.x -= dtSeconds * (2 + i * 0.8);
        if (c.x < -60) c.x = VIEW_W + 10;
      });
    }
    if (this.shake > 0 && !reduced) {
      this.app.stage.position.set(
        Math.round((Math.random() - 0.5) * this.shake),
        Math.round((Math.random() - 0.5) * this.shake),
      );
      this.shake = Math.max(0, this.shake - dtSeconds * 20);
    } else {
      this.shake = 0;
      this.app.stage.position.set(0, 0);
    }
    this.app.render();
  }
}

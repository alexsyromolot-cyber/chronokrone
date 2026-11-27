/**
 * Menschliche Figuren 32×32 als Baukasten (Blick nach rechts, Füße auf y = 30).
 * Jede Klasse = Farben + Kopfbedeckung + Rumpf-Stil + Waffe. Jede Animation = Folge von Posen.
 * Klassen müssen an Silhouette UND Farbe erkennbar sein – deshalb hat jede eine eigene
 * Kopf-Silhouette (Hut, Helm, Kapuze …) und eine eigene Waffe.
 */
import { Pix, mix, ramp } from './lib.mjs';

const SKIN = ramp('#e8b48a');
const BOOT = ramp('#4a3424');
const STEEL = ramp('#b8c0d0');
const WOOD = ramp('#9a6a3a');
const DARK = '#1a1420';

/** Klassen-Definitionen. Farben werden zu Rampen; Stile steuern die Zeichenfunktionen. */
export const FIGURES = {
  peasant: {
    torso: '#8a6a3a',
    legs: '#6a5a40',
    hair: '#7a4a24',
    head: 'strawhat',
    style: 'tunic',
    weapon: 'pitchfork',
  },
  knight: {
    torso: '#8d93a6',
    legs: '#5d6274',
    head: 'helmet',
    style: 'armor',
    weapon: 'sword',
    shield: '#a33a3a',
    plume: '#d9483b',
  },
  woodcutter: {
    torso: '#4f7d45',
    legs: '#5a4a34',
    hair: '#a0582a',
    head: 'beanie',
    beanie: '#b83a2a',
    style: 'vest',
    weapon: 'axe',
  },
  archer: {
    torso: '#3f6b3a',
    legs: '#4a3a2a',
    hair: '#c08a50',
    head: 'hood',
    hood: '#2f5a2e',
    style: 'tunic',
    weapon: 'bow',
  },
  warlock: {
    torso: '#5a3a8a',
    legs: '#3a2a5a',
    head: 'wizard',
    hat: '#4a2a7a',
    style: 'robe',
    weapon: 'staff',
    orb: '#9ad8ff',
  },
  miner: {
    torso: '#7a6a5a',
    legs: '#4a4a52',
    hair: '#3a2a1a',
    head: 'minerhelmet',
    helmet: '#d8a830',
    style: 'vest',
    weapon: 'pickaxe',
  },
  herbalist: {
    torso: '#7a9a4a',
    legs: '#5a4a34',
    hair: '#d8b070',
    head: 'scarf',
    scarf: '#c06a8a',
    style: 'robe',
    weapon: 'sickle',
  },
  monk: {
    torso: '#7a5a3a',
    legs: '#6a4a30',
    hair: '#5a3a24',
    head: 'tonsure',
    style: 'robe',
    weapon: 'book',
  },
};

/**
 * Pose: by = Körper hoch/runter, lean = Oberkörper vor/zurück, feet = [hinten, vorne] Fußversatz,
 * arm = Winkel des Waffenarms in Grad (0 = nach vorn, negativ = nach oben), flash = Treffer.
 */
export const POSES = {
  idle: [
    { by: 0, lean: 0, feet: [0, 0], arm: 30 },
    { by: 0, lean: 0, feet: [0, 0], arm: 26 },
    { by: 1, lean: 0, feet: [0, 0], arm: 34 },
    { by: 1, lean: 0, feet: [0, 0], arm: 32 },
  ],
  walk: [
    { by: 0, lean: 1, feet: [-2, 2], arm: 40 },
    { by: -1, lean: 1, feet: [0, 0], arm: 30 },
    { by: 0, lean: 1, feet: [2, -2], arm: 20 },
    { by: -1, lean: 1, feet: [0, 0], arm: 30 },
  ],
  attack: [
    { by: 0, lean: -1, feet: [-1, 1], arm: -100 },
    { by: 0, lean: 2, feet: [-2, 3], arm: 15 },
    { by: 0, lean: 1, feet: [-1, 2], arm: 45 },
  ],
  hit: [
    { by: 0, lean: -2, feet: [1, -1], arm: 60, flash: true },
    { by: 0, lean: -1, feet: [0, 0], arm: 50 },
  ],
};

function legs(p, def, pose) {
  const r = ramp(def.legs);
  const hip = 21 + pose.by;
  // Hinteres Bein etwas dunkler – Tiefe ohne zweite Farbe.
  const back = r.map((c) => mix(c, '#101018', 0.25));
  p.cyl(13 + pose.feet[0], hip, 3, 29 - hip, back);
  p.rect(12 + pose.feet[0], 29, 5, 2, BOOT[1]);
  p.cyl(16 + pose.feet[1], hip, 3, 29 - hip, r);
  p.rect(16 + pose.feet[1], 29, 5, 2, BOOT[2]);
  p.set(16 + pose.feet[1], 29, BOOT[3]);
}

function torso(p, def, pose) {
  const r = ramp(def.torso);
  const x = 11 + pose.lean;
  const y = 13 + pose.by;
  if (def.style === 'robe') {
    // Gewand bis über die Knie, unten ausgestellt.
    p.poly(
      [
        [x + 1, y],
        [x + 9, y],
        [x + 11, y + 15],
        [x - 1, y + 15],
      ],
      r[2],
    );
    p.cyl(x, y, 10, 9, r);
    for (let j = 9; j < 15; j++) {
      p.set(x - 1 + Math.floor(j / 6), y + j, r[3]);
      p.set(x + 10 - Math.floor(j / 7), y + j, r[1]);
    }
    p.rect(x, y + 8, 10, 1, mix(r[1], '#3a2010', 0.4));
  } else {
    p.cyl(x, y, 10, 9, r);
    if (def.style === 'armor') {
      // Brustplatte mit Glanzkante und Kettenhemd-Saum.
      p.rect(x + 3, y + 1, 1, 6, r[4]);
      p.rect(x, y + 8, 10, 1, r[1]);
      for (let i = 0; i < 10; i += 2) p.set(x + i, y + 9, r[3]);
      p.rect(x + 6, y + 2, 2, 2, def.plume);
    } else if (def.style === 'vest') {
      p.rect(x + 3, y, 4, 8, mix(r[2], '#e8d8b0', 0.35));
      p.rect(x + 4, y + 1, 2, 7, mix(r[1], '#e8d8b0', 0.3));
    }
    // Gürtel mit Schnalle.
    p.rect(x, y + 7, 10, 1, '#3a2614');
    p.set(x + 6, y + 7, '#e8c070');
  }
}

function head(p, def, pose) {
  const cx = 16.5 + pose.lean;
  const cy = 8.5 + pose.by;
  p.ball(cx, cy, 4, 4, SKIN);
  // Gesichtsfläche: Das Gesicht schaut nach rechts, also in den Schatten der Kugel.
  // Eine eigene helle Fläche hält es lesbar.
  for (let y = Math.floor(cy - 2); y <= Math.floor(cy + 2); y++)
    for (let x = Math.floor(cx); x <= Math.floor(cx + 3); x++) if (p.get(x, y)) p.set(x, y, SKIN[2]);
  p.set(cx + 1, cy - 1, SKIN[3]);
  // Auge, Augenbraue, Nase: Blick nach rechts.
  p.set(cx + 2, cy, DARK);
  p.set(cx + 2, cy - 2, mix(def.hair ?? '#3a2a1a', DARK, 0.3));
  p.set(cx + 4, cy + 1, SKIN[1]);
  p.set(cx + 1, cy + 3, SKIN[1]);
  const hair = def.hair ? ramp(def.hair) : null;
  const x = Math.floor(cx - 4);
  const y = Math.floor(cy - 4);
  switch (def.head) {
    case 'strawhat': {
      const s = ramp('#e0c060');
      p.rect(x - 2, y + 2, 13, 1, s[2]);
      p.rect(x - 1, y + 3, 11, 1, s[1]);
      p.cyl(x + 1, y - 1, 7, 3, s);
      p.rect(x + 1, y + 1, 7, 1, '#a33a2a');
      if (hair) p.rect(x, y + 4, 2, 3, hair[2]);
      break;
    }
    case 'helmet': {
      p.ball(cx, cy - 0.5, 4.5, 4.2, STEEL);
      p.rect(x + 5, y + 3, 4, 1, DARK); // Sehschlitz
      p.rect(x + 2, y - 2, 2, 3, def.plume);
      p.set(x + 1, y - 3, def.plume);
      p.rect(x, y + 6, 9, 1, STEEL[1]);
      break;
    }
    case 'beanie': {
      const b = ramp(def.beanie);
      p.cyl(x, y - 1, 9, 4, b);
      p.rect(x, y + 2, 9, 1, b[3]);
      p.set(x + 1, y - 2, b[4]);
      if (hair) p.rect(x, y + 3, 2, 3, hair[2]);
      break;
    }
    case 'hood': {
      const h = ramp(def.hood);
      p.poly(
        [
          [x - 1, y + 8],
          [x - 1, y + 1],
          [x + 3, y - 2],
          [x + 8, y - 1],
          [x + 9, y + 2],
          [x + 6, y + 2],
          [x + 4, y + 8],
        ],
        h[2],
      );
      p.rect(x, y, 3, 7, h[1]);
      p.set(x + 4, y - 1, h[3]);
      p.set(x + 5, y - 1, h[4]);
      break;
    }
    case 'wizard': {
      const w = ramp(def.hat);
      p.rect(x - 2, y + 2, 13, 1, w[1]);
      p.poly(
        [
          [x, y + 2],
          [x + 8, y + 2],
          [x + 5, y - 6],
          [x + 1, y - 7],
        ],
        w[2],
      );
      p.set(x + 2, y - 4, w[4]);
      p.set(x + 4, y - 1, '#ffe66d');
      // Bart: der Hexenmeister ist alt genug, um alles besser zu wissen.
      p.poly(
        [
          [cx - 1, cy + 2],
          [cx + 4, cy + 2],
          [cx + 2, cy + 7],
        ],
        '#d8d8e0',
      );
      break;
    }
    case 'minerhelmet': {
      const m = ramp(def.helmet);
      p.ball(cx, cy - 1.5, 4.5, 3, m);
      p.rect(x - 1, y + 3, 11, 1, m[1]);
      p.rect(x + 7, y + 1, 2, 2, '#fff6b0'); // Grubenlampe
      p.set(x + 9, y + 1, '#ffe66d');
      break;
    }
    case 'scarf': {
      const s = ramp(def.scarf);
      p.cyl(x, y - 1, 9, 4, s);
      p.rect(x - 1, y + 2, 3, 5, s[1]);
      if (hair) p.rect(x + 1, y + 3, 1, 2, hair[2]);
      break;
    }
    case 'tonsure': {
      if (hair) {
        p.rect(x, y + 1, 9, 2, hair[2]);
        p.rect(x, y + 3, 2, 3, hair[1]);
      }
      p.rect(x + 2, y - 0, 5, 1, SKIN[3]);
      break;
    }
  }
}

function backArm(p, def, pose) {
  const r = ramp(def.torso);
  p.cyl(
    12 + pose.lean,
    14 + pose.by,
    2,
    6,
    r.map((c) => mix(c, '#101018', 0.3)),
  );
}

/** Waffenarm + Waffe. Gibt die Handposition zurück (für Effekte wie den Pfeil). */
function frontArm(p, def, pose) {
  const r = ramp(def.torso);
  const sx = 18 + pose.lean;
  const sy = 14 + pose.by;
  const a = (pose.arm * Math.PI) / 180;
  const hx = Math.round(sx + Math.cos(a) * 5);
  const hy = Math.round(sy + Math.sin(a) * 5);
  weapon(p, def, pose, hx, hy, a);
  p.line(sx, sy, hx, hy, r[2], 2);
  p.set(sx, sy, r[3]);
  p.rect(hx, hy, 2, 2, SKIN[2]);
  return [hx, hy];
}

function weapon(p, def, pose, hx, hy, a) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  // Für Stangenwaffen zeigt der Schaft senkrecht zur Armrichtung nach oben.
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const shaft = (len, col) => {
    p.line(hx - ux * 4, hy - uy * 4, hx + ux * len, hy + uy * len, col);
    return [hx + ux * len, hy + uy * len];
  };
  switch (def.weapon) {
    case 'pitchfork': {
      const [tx, ty] = shaft(10, WOOD[2]);
      for (const o of [-2, 0, 2])
        p.line(tx + dx * o, ty + dy * o, tx + dx * o + ux * 3, ty + dy * o + uy * 3, STEEL[3]);
      p.line(tx - dx * 2, ty - dy * 2, tx + dx * 2, ty + dy * 2, STEEL[2]);
      break;
    }
    case 'sword': {
      p.line(hx, hy, hx + ux * 11, hy + uy * 11, STEEL[3]);
      p.line(hx + 1, hy, hx + 1 + ux * 10, hy + uy * 10, STEEL[1]);
      p.line(hx - dx * 2, hy - dy * 2, hx + dx * 2, hy + dy * 2, '#c08a30');
      // Schild am anderen Arm, vor dem Körper.
      const s = ramp(def.shield);
      const sx = 10 + pose.lean;
      const sy = 15 + pose.by;
      p.poly(
        [
          [sx, sy],
          [sx + 6, sy],
          [sx + 6, sy + 5],
          [sx + 3, sy + 8],
          [sx, sy + 5],
        ],
        s[2],
      );
      p.rect(sx + 1, sy + 1, 1, 4, s[4]);
      p.rect(sx + 3, sy + 1, 1, 6, '#e8c070');
      break;
    }
    case 'axe': {
      const [tx, ty] = shaft(9, WOOD[2]);
      p.poly(
        [
          [tx, ty],
          [tx + dx * 4, ty + dy * 4],
          [tx + dx * 5 - ux * 4, ty + dy * 5 - uy * 4],
          [tx - ux * 3, ty - uy * 3],
        ],
        STEEL[2],
      );
      p.line(tx + dx * 4, ty + dy * 4, tx + dx * 5 - ux * 4, ty + dy * 5 - uy * 4, STEEL[4]);
      break;
    }
    case 'bow': {
      // Bogen senkrecht vor dem Körper, Sehne gespannt beim Angriff.
      const bx = hx + 2;
      const pull = pose.arm < 0 ? 3 : 0;
      for (let j = -7; j <= 7; j++) p.set(bx + Math.round(2 - (j * j) / 25), hy + j, WOOD[j < 0 ? 3 : 2]);
      p.line(bx - 1 - pull, hy, bx, hy - 7, '#e8e2c8');
      p.line(bx - 1 - pull, hy, bx, hy + 7, '#e8e2c8');
      if (pull) p.line(bx - 1 - pull, hy, bx + 6, hy, '#d8c8a0');
      break;
    }
    case 'staff': {
      const [tx, ty] = shaft(12, WOOD[1]);
      const glow = pose.arm < 0 ? '#ffffff' : def.orb;
      p.ball(tx, ty - 1, 2.2, 2.2, ramp(glow));
      p.set(tx - 3, ty - 3, pose.arm < 0 ? '#ffe66d' : null);
      break;
    }
    case 'pickaxe': {
      const [tx, ty] = shaft(9, WOOD[2]);
      p.line(
        tx - dx * 4 + ux * 1,
        ty - dy * 4 + uy * 1,
        tx + dx * 4 + ux * 1,
        ty + dy * 4 + uy * 1,
        STEEL[2],
      );
      p.set(tx + dx * 4, ty + dy * 4, STEEL[4]);
      break;
    }
    case 'sickle': {
      p.line(hx, hy, hx + ux * 4, hy + uy * 4, WOOD[2]);
      const cx = hx + ux * 6;
      const cy = hy + uy * 6;
      for (let k = 0; k < 7; k++) {
        const t = (k / 6) * Math.PI;
        p.set(cx + Math.cos(t + a) * 3, cy + Math.sin(t + a) * 3, STEEL[k < 3 ? 4 : 3]);
      }
      // Kräuterkorb auf dem Rücken.
      p.rect(9 + pose.lean, 16 + pose.by, 3, 4, WOOD[1]);
      p.set(9 + pose.lean, 15 + pose.by, '#7ed37e');
      p.set(11 + pose.lean, 15 + pose.by, '#a0e080');
      break;
    }
    case 'book': {
      const b = ramp('#7a2a2a');
      p.rect(hx, hy - 2, 5, 4, b[2]);
      p.rect(hx, hy - 2, 5, 1, b[3]);
      p.rect(hx + 4, hy - 1, 1, 3, '#f3ead7');
      p.set(hx + 2, hy, '#e8c070');
      break;
    }
  }
}

export function drawFigure(def, pose) {
  const p = new Pix(32, 32);
  backArm(p, def, pose);
  legs(p, def, pose);
  torso(p, def, pose);
  head(p, def, pose);
  frontArm(p, def, pose);
  p.outline();
  return pose.flash ? p.flashed(0.55) : p;
}

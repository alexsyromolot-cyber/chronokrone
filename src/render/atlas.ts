/**
 * Lädt die von `npm run sprites` erzeugten Sprite-Sheets (src/assets/sprites/).
 *
 * Bilder werden über ein <img> geladen statt über fetch – das funktioniert im Browser,
 * auf GitHub Pages und in der Desktop-App (file://) gleichermaßen. Das Atlas-JSON ist
 * per Import im Bundle, braucht also gar keinen Netzwerkzugriff.
 */
import { Rectangle, Texture } from 'pixi.js';
import figuresUrl from '../assets/sprites/figures.png';
import figuresAtlas from '../assets/sprites/figures.json';
import skyUrl from '../assets/sprites/backdrop-1-sky.png';
import farUrl from '../assets/sprites/backdrop-1-far.png';
import forestUrl from '../assets/sprites/backdrop-1-forest.png';
import groundUrl from '../assets/sprites/backdrop-1-ground.png';
import castleUrl from '../assets/sprites/backdrop-1-castle.png';

export type AnimName = 'idle' | 'walk' | 'attack' | 'hit';

interface AtlasJson {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  animations: Record<string, string[]>;
}

async function loadTexture(url: string): Promise<Texture> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const tex = Texture.from(img);
  // Pixelart: nie weichzeichnen.
  tex.source.scaleMode = 'nearest';
  return tex;
}

export class Atlas {
  private readonly anims = new Map<string, Texture[]>();

  private constructor(
    base: Texture,
    atlas: AtlasJson,
    readonly backdrop: Record<'sky' | 'far' | 'forest' | 'ground' | 'castle', Texture>,
  ) {
    const frame = new Map<string, Texture>();
    for (const [name, f] of Object.entries(atlas.frames)) {
      frame.set(
        name,
        new Texture({
          source: base.source,
          frame: new Rectangle(f.frame.x, f.frame.y, f.frame.w, f.frame.h),
        }),
      );
    }
    for (const [name, list] of Object.entries(atlas.animations)) {
      this.anims.set(
        name,
        list.map((n) => frame.get(n)!),
      );
    }
  }

  static async load(): Promise<Atlas> {
    const [base, sky, far, forest, ground, castle] = await Promise.all(
      [figuresUrl, skyUrl, farUrl, forestUrl, groundUrl, castleUrl].map(loadTexture),
    );
    return new Atlas(base!, figuresAtlas as AtlasJson, {
      sky: sky!,
      far: far!,
      forest: forest!,
      ground: ground!,
      castle: castle!,
    });
  }

  /** Bilder einer Animation, z. B. ('knight', 'attack'); null, wenn es (noch) keine neue Grafik gibt. */
  anim(id: string, name: AnimName): Texture[] | null {
    return this.anims.get(`${id}_${name}`) ?? null;
  }
}

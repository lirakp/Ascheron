import Phaser from 'phaser';
import { tilesetCanvas } from '../gfx/tiles';
import { MONSTER_DRAWERS, monsterCanvas } from '../gfx/monsters';
import { canvas, PB } from '../gfx/pixel';
import { iconCanvas } from '../gfx/icons';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    // Pixel-Schrift laden (mit Zeitlimit, falls offline)
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const ready = fonts ? Promise.race([Promise.all([fonts.load('16px "Pixelify Sans"'), fonts.load('700 16px "Pixelify Sans"')]), new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
    void ready.then(() => this.build(), () => this.build());
  }

  build(): void {
    this.textures.addCanvas('tiles', tilesetCanvas());
    for (const k of Object.keys(MONSTER_DRAWERS)) this.textures.addCanvas(k, monsterCanvas(k));
    // kleine Effekt-Texturen
    const [px, pctx] = canvas(4, 4); pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, 4, 4); this.textures.addCanvas('px', px);
    const [dot, dctx] = canvas(32, 32);
    const g = dctx.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    dctx.fillStyle = g; dctx.fillRect(0, 0, 32, 32); this.textures.addCanvas('glow', dot);
    // Sichtfeld-Maske für Dungeons (dunkel mit Loch)
    const [v, vctx] = canvas(1024, 768);
    const vg = vctx.createRadialGradient(512, 384, 30, 512, 384, 150);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.45)'); vg.addColorStop(1, 'rgba(0,0,0,0.96)');
    vctx.fillStyle = vg; vctx.fillRect(0, 0, 1024, 768);
    this.textures.addCanvas('vision', v);
    // Truhe (geschlossen/offen) und Moorkraut im Icon-Stil
    const chest = (open: boolean) => {
      const p = new PB(16, 14);
      if (open) { p.rect(2, 3, 12, 3, '#3a2414'); p.rect(1, 6, 14, 7, '#9a6a3a'); p.rect(1, 8, 14, 1, '#c8a050'); }
      else { p.rect(1, 2, 14, 11, '#9a6a3a'); p.rect(1, 6, 14, 1, '#c8a050'); p.rect(7, 5, 2, 3, '#f0c35a'); }
      p.bevel(0.3, 0.3); p.outline('#0a0b12');
      const [c, ctx] = canvas(16, 14); p.draw(ctx, 0, 0); return c;
    };
    this.textures.addCanvas('chest', chest(false));
    this.textures.addCanvas('chest_open', chest(true));
    this.textures.addCanvas('herb', iconCanvas('herb', 1));
    // Staub (Kreidekriecher-Hinweis)
    const [du, duc] = canvas(2, 2); duc.fillStyle = '#e8e3d8'; duc.fillRect(0, 0, 2, 2); this.textures.addCanvas('dust', du);
    this.scene.start('Title');
  }
}

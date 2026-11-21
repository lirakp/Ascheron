import Phaser from 'phaser';
import { tilesetCanvas } from '../gfx/tiles';
import { MONSTER_DRAWERS, monsterCanvas, humanMonsterCanvas } from '../gfx/monsters';
import { MONSTERS } from '../data/monsters';
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
    for (const m of Object.values(MONSTERS)) if (m.human && !this.textures.exists(m.sprite)) this.textures.addCanvas(m.sprite, humanMonsterCanvas(m.human.app, m.human.weapon));
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
    // Boden-Details für Dungeons (transparent, passen auf jeden Untergrund)
    const deco = (draw: (p: PB) => void) => { const p = new PB(16, 16); draw(p); const [c, ctx] = canvas(16, 16); p.draw(ctx, 0, 0); return c; };
    this.textures.addCanvas('deco_crack', deco((p) => { p.line(2, 3, 6, 6, 'rgba(10,11,18,0.55)'); p.line(6, 6, 5, 11, 'rgba(10,11,18,0.55)'); p.line(6, 6, 11, 8, 'rgba(10,11,18,0.55)'); p.set(7, 7, 'rgba(255,255,255,0.12)'); }));
    this.textures.addCanvas('deco_puddle', deco((p) => { p.ellipse(8, 9, 6, 3.5, 'rgba(20,40,64,0.75)'); p.ellipse(7, 8, 4, 2, 'rgba(40,70,100,0.7)'); p.rect(5, 8, 3, 1, 'rgba(140,180,220,0.7)'); p.set(11, 10, 'rgba(140,180,220,0.6)'); }));
    this.textures.addCanvas('deco_pebbles', deco((p) => { for (const [x, y] of [[3, 4], [11, 6], [7, 12], [13, 13]]) { p.rect(x, y, 2, 1, 'rgba(10,11,18,0.45)'); p.set(x, y - 1, 'rgba(255,255,255,0.18)'); } }));
    this.textures.addCanvas('deco_web', deco((p) => { for (let i = 0; i < 9; i++) { p.set(i, 0, 'rgba(210,214,226,0.7)'); p.set(0, i, 'rgba(210,214,226,0.7)'); p.set(i, i, 'rgba(190,194,206,0.55)'); } p.line(0, 5, 5, 0, 'rgba(190,194,206,0.55)'); p.line(0, 8, 8, 0, 'rgba(170,174,186,0.45)'); }));
    // Dornenfallen: versteckter Glanz, aufgedeckt, ausgelöst
    this.textures.addCanvas('trap_hint', deco((p) => { p.set(7, 7, 'rgba(255,240,200,0.5)'); p.set(10, 10, 'rgba(255,240,200,0.35)'); }));
    const spikes = (up: boolean) => { const p = new PB(16, 16); for (const [x, y] of [[3, 4], [8, 3], [12, 5], [5, 9], [10, 10], [3, 13], [13, 12]]) { if (up) { p.rect(x, y - 2, 1, 3, '#c8b890'); p.set(x, y - 3, '#e8e0c8'); p.set(x - 1, y, '#3a5a2a'); p.set(x + 1, y, '#3a5a2a'); } else { p.set(x, y, '#c8b890'); p.set(x + 1, y, '#3a5a2a'); } } if (up) { p.bevel(0.2, 0.2); p.outline('#0a0b12'); } const [c, ctx] = canvas(16, 16); p.draw(ctx, 0, 0); return c; };
    this.textures.addCanvas('trap_seen', spikes(false));
    this.textures.addCanvas('trap_sprung', spikes(true));
    // Staub (Kreidekriecher-Hinweis)
    const [du, duc] = canvas(2, 2); duc.fillStyle = '#e8e3d8'; duc.fillRect(0, 0, 2, 2); this.textures.addCanvas('dust', du);
    this.scene.start('Title');
  }
}

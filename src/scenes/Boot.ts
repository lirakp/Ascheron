import Phaser from 'phaser';
import { tilesetCanvas } from '../gfx/tiles';
import { MONSTER_DRAWERS, monsterCanvas } from '../gfx/monsters';
import { canvas } from '../gfx/pixel';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
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
    // Truhe
    const [ch, cctx] = canvas(14, 12);
    cctx.fillStyle = '#140f0b'; cctx.fillRect(0, 1, 14, 11);
    cctx.fillStyle = '#7a5230'; cctx.fillRect(1, 2, 12, 9);
    cctx.fillStyle = '#5a3a20'; cctx.fillRect(1, 5, 12, 1);
    cctx.fillStyle = '#d8b060'; cctx.fillRect(6, 5, 2, 3);
    this.textures.addCanvas('chest', ch);
    const [cho, coctx] = canvas(14, 12);
    coctx.fillStyle = '#140f0b'; coctx.fillRect(0, 3, 14, 9);
    coctx.fillStyle = '#3a2410'; coctx.fillRect(1, 4, 12, 3);
    coctx.fillStyle = '#7a5230'; coctx.fillRect(1, 7, 12, 4);
    this.textures.addCanvas('chest_open', cho);
    // Moorkraut
    const [hb, hctx] = canvas(10, 10);
    hctx.fillStyle = '#2a4020'; hctx.fillRect(4, 4, 2, 6);
    hctx.fillStyle = '#7ab04a'; hctx.fillRect(1, 2, 3, 3); hctx.fillRect(6, 1, 3, 3); hctx.fillRect(3, 0, 3, 3);
    hctx.fillStyle = '#c8d870'; hctx.fillRect(4, 1, 1, 1);
    this.textures.addCanvas('herb', hb);
    // Staub (Kreidekriecher-Hinweis)
    const [du, duc] = canvas(2, 2); duc.fillStyle = '#e8e3d8'; duc.fillRect(0, 0, 2, 2); this.textures.addCanvas('dust', du);
    this.scene.start('Title');
  }
}

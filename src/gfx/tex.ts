import Phaser from 'phaser';
import type { Appearance } from '../data/types';
import { charSheet, CW, CH } from './chars';

export function addSheet(scene: Phaser.Scene, key: string, cnv: HTMLCanvasElement, fw: number, fh: number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, cnv)!;
  const n = Math.floor(cnv.width / fw);
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
}

const DIRS = ['down', 'left', 'right', 'up'];
/** Legt Spritesheet und Lauf-Animationen für eine Figur an. */
export function ensureChar(scene: Phaser.Scene, key: string, app: Appearance, force = false): void {
  if (scene.textures.exists(key) && !force) return;
  addSheet(scene, key, charSheet(app), CW, CH);
  DIRS.forEach((d, i) => {
    const k = `${key}_walk_${d}`;
    if (scene.anims.exists(k)) scene.anims.remove(k);
    scene.anims.create({ key: k, frames: [1, 0, 2, 0].map((f) => ({ key, frame: i * 3 + f })), frameRate: 8, repeat: -1 });
  });
}
export const dirIndex = (d: string) => DIRS.indexOf(d);

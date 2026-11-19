// Kampfhintergründe als Pixel-Szenen (320×180, dreifach skaliert) im flachen Stil mit Kanten.
import { canvas, shade, PB } from './pixel';

type Ctx = CanvasRenderingContext2D;
const R = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function bands(c: Ctx, cols: string[], y0: number, y1: number): void {
  const h = (y1 - y0) / cols.length;
  cols.forEach((col, i) => R(c, 0, Math.round(y0 + i * h), 320, Math.ceil(h) + 1, col));
}
function bricks(c: Ctx, x0: number, y0: number, w: number, h: number, base: string, mortar: string, light: string, bw = 16, bh = 8): void {
  R(c, x0, y0, w, h, mortar);
  for (let y = y0, row = 0; y < y0 + h; y += bh, row++) {
    for (let x = x0 - (row % 2 ? bw / 2 : 0); x < x0 + w; x += bw) {
      const xx = Math.max(x, x0), ww = Math.min(x + bw - 1, x0 + w) - xx;
      if (ww <= 0) continue;
      R(c, xx, y, ww, bh - 1, base);
      R(c, xx, y, ww, 1, light);
    }
  }
}
function sprite(c: Ctx, w: number, h: number, draw: (p: PB) => void, x: number, y: number): void {
  const p = new PB(w, h); draw(p); p.bevel(0.25, 0.3); p.outline('#05060b'); p.draw(c, x, y);
}
function moonAt(c: Ctx, x: number, y: number, col: string): void {
  sprite(c, 26, 26, (p) => { p.ellipse(12.5, 12.5, 11.5, 11.5, col); p.ellipse(8, 9, 2.5, 2, shade(col, -0.15)); p.ellipse(16, 16, 2, 1.5, shade(col, -0.15)); }, x, y);
}
function deadTree(c: Ctx, x: number, y: number, h: number, col: string): void {
  sprite(c, 30, h + 2, (p) => {
    p.rect(14, 4, 3, h - 4, col);
    p.line(15, h * 0.45, 4, h * 0.2, col); p.line(15, h * 0.35, 26, h * 0.1, col); p.line(15, h * 0.6, 24, h * 0.45, col);
  }, x, y - h);
}

const BG: Record<string, (c: Ctx) => void> = {
  moor: (c) => {
    bands(c, ['#0d1428', '#121c34', '#18263f', '#1f3248', '#28404f'], 0, 96);
    moonAt(c, 250, 18, '#e8e2cc');
    // ferne Hügel
    c.fillStyle = '#1a2a30'; c.beginPath(); c.moveTo(0, 96);
    for (let x = 0; x <= 320; x += 20) c.lineTo(x, 84 + Math.round(Math.sin(x / 37) * 6));
    c.lineTo(320, 110); c.lineTo(0, 110); c.fill();
    R(c, 0, 96, 320, 14, '#22363a');
    for (const [x, h] of [[10, 52], [70, 40], [130, 58], [200, 44], [285, 50]]) deadTree(c, x, 112, h, '#2a2e3a');
    // Boden
    R(c, 0, 110, 320, 70, '#3f5a36');
    R(c, 0, 110, 320, 2, '#577a48');
    for (const [x, y, w] of [[20, 130, 40], [120, 150, 60], [230, 128, 50], [60, 166, 44], [250, 164, 40]]) { R(c, x, y, w, 4, '#2f4a40'); R(c, x + 2, y, w - 4, 1, '#41634f'); }
    for (let i = 0; i < 26; i++) { const x = (i * 53) % 316, y = 116 + ((i * 29) % 60); R(c, x, y, 1, 2, '#2f4630'); R(c, x + 2, y, 1, 2, '#2f4630'); R(c, x + 1, y - 1, 1, 2, '#6a9050'); }
  },
  blut: (c) => {
    bands(c, ['#1a0508', '#2a080c', '#3a0c10', '#4a1216', '#5a1a1a'], 0, 96);
    moonAt(c, 250, 18, '#d8303a');
    c.fillStyle = '#2a0c10'; c.beginPath(); c.moveTo(0, 96);
    for (let x = 0; x <= 320; x += 20) c.lineTo(x, 84 + Math.round(Math.sin(x / 37) * 6));
    c.lineTo(320, 110); c.lineTo(0, 110); c.fill();
    for (const [x, h] of [[10, 52], [70, 40], [130, 58], [200, 44], [285, 50]]) deadTree(c, x, 112, h, '#1a0a0e');
    R(c, 0, 110, 320, 70, '#3a1a1c'); R(c, 0, 110, 320, 2, '#5a2a2a');
    for (const [x, y, w] of [[20, 130, 40], [120, 150, 60], [230, 128, 50]]) { R(c, x, y, w, 4, '#5a0e14'); R(c, x + 2, y, w - 4, 1, '#8a1e24'); }
  },
  sewer: (c) => {
    bricks(c, 0, 0, 320, 100, '#3a4a40', '#212b26', '#4c5e52', 20, 10);
    for (const x of [40, 160, 280]) { sprite(c, 24, 30, (p) => { p.ellipse(11.5, 14, 11, 14, '#0c120f'); p.rect(0, 14, 24, 16, '#0c120f'); }, x - 12, 30); }
    R(c, 0, 100, 320, 14, '#2d4538'); R(c, 0, 100, 320, 1, '#1c2a22');
    for (let x = 6; x < 320; x += 40) R(c, x, 105, 14, 1, '#4a6a58');
    R(c, 0, 114, 320, 66, '#3b443c'); R(c, 0, 114, 320, 2, '#556055');
    for (let x = 0; x < 320; x += 32) R(c, x, 116, 1, 64, '#2c332d');
  },
  chalk: (c) => {
    bands(c, ['#2a3248', '#3a4560', '#4c5a74', '#62708a', '#75839c'], 0, 110);
    for (const [x, w, h] of [[-20, 110, 70], [70, 90, 52], [150, 120, 78], [250, 100, 60]]) {
      sprite(c, w, h + 2, (p) => { for (let y = 0; y < h; y++) { const half = (w / 2) * (y / h); p.rect(Math.round(w / 2 - half), y, Math.round(half * 2), 1, '#e4ded0'); } }, x, 110 - h);
    }
    R(c, 0, 108, 320, 72, '#cfc8b8'); R(c, 0, 108, 320, 2, '#ece6da');
    for (let i = 0; i < 18; i++) R(c, (i * 47) % 310, 118 + ((i * 31) % 56), 5, 1, '#b4ac9a');
  },
  stone: (c) => {
    bricks(c, 0, 0, 320, 110, '#454a5c', '#262a36', '#575d72');
    for (const x of [60, 250]) { sprite(c, 10, 24, (p) => { p.rect(3, 6, 4, 18, '#3a3022'); p.ellipse(4.5, 4, 4, 4, '#f0a040'); }, x, 40); }
    R(c, 0, 110, 320, 70, '#3d404e'); R(c, 0, 110, 320, 2, '#5a5e70');
    for (let y = 118; y < 180; y += 14) R(c, 0, y, 320, 1, '#2d2f3b');
    for (let x = 0; x < 320; x += 28) R(c, x, 112, 1, 68, '#2d2f3b');
  },
  tower: (c) => {
    bricks(c, 0, 0, 320, 110, '#24262f', '#15171d', '#2e313c');
    for (let y = 0; y < 60; y += 4) { R(c, 238, y, 3, 3, '#d8d0bc'); R(c, 238, y, 3, 1, '#f0ead8'); }
    for (const x of [30, 120]) R(c, x, 30, 18, 40, '#0a0b10');
    R(c, 32, 32, 14, 36, '#1c2a44'); R(c, 122, 32, 14, 36, '#1c2a44');
    R(c, 0, 110, 320, 70, '#2e3140'); R(c, 0, 110, 320, 3, '#4a4e60');
    for (let x = 0; x < 320; x += 40) R(c, x, 113, 1, 67, '#202330');
  },
};

export function battleBg(kind: string): HTMLCanvasElement {
  const [cv, ctx] = canvas(320, 180);
  (BG[kind] ?? BG.moor)(ctx);
  return cv;
}

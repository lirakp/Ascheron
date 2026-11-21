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
  thorn: (c) => {
    bands(c, ['#0c1a14', '#10241a', '#163020', '#1c3a26', '#224430'], 0, 104);
    moonAt(c, 40, 16, '#e8d8d8');
    // Heckenwand mit Rosen
    for (let x = -10; x < 330; x += 34) sprite(c, 40, 70, (p) => { p.ellipse(20, 36, 18, 32, '#2c4a2a'); p.rect(2, 36, 36, 34, '#2c4a2a'); for (const [rx, ry] of [[10, 20], [26, 30], [16, 46], [30, 54], [8, 58]]) { p.rect(rx, ry, 3, 3, '#c0303a'); p.set(rx, ry, '#e8505a'); } for (const [tx, ty] of [[6, 30], [33, 22], [20, 12], [12, 40]]) p.set(tx, ty, '#c8b890'); }, x, 36 + ((x / 34) % 2) * 6);
    // Torbogen in der Mitte
    sprite(c, 60, 70, (p) => { p.ellipse(30, 30, 28, 28, '#1e3420'); p.rect(2, 30, 56, 40, '#1e3420'); p.ellipse(30, 34, 18, 20, '#0a120c'); p.rect(12, 34, 36, 36, '#0a120c'); }, 130, 36);
  },
  memory: (c) => {
    bands(c, ['#1c2030', '#252a3c', '#2f3548', '#3a4256', '#465066'], 0, 104);
    // schwebende Bruchstücke von Räumen
    for (const [x, y, w, h] of [[30, 20, 40, 26], [120, 40, 30, 20], [210, 14, 50, 30], [270, 56, 30, 18], [80, 64, 26, 16]]) sprite(c, w + 2, h + 2, (p) => { p.rect(0, 0, w, h, '#5c6474'); p.rect(2, 2, w - 4, h - 4, '#3a4256'); p.rect(4, 4, Math.round(w / 3), Math.round(h / 3), '#8a96b0'); }, x, y);
    for (let i = 0; i < 40; i++) R(c, (i * 71) % 320, (i * 37) % 100, 1, 1, '#c8d8f0');
  },
  tower: (c) => {
    bricks(c, 0, 0, 320, 110, '#24262f', '#15171d', '#2e313c');
    for (let y = 0; y < 60; y += 4) { R(c, 238, y, 3, 3, '#d8d0bc'); R(c, 238, y, 3, 1, '#f0ead8'); }
    for (const x of [30, 120]) R(c, x, 30, 18, 40, '#0a0b10');
    R(c, 32, 32, 14, 36, '#1c2a44'); R(c, 122, 32, 14, 36, '#1c2a44');
    R(c, 0, 110, 320, 70, '#2e3140'); R(c, 0, 110, 320, 3, '#4a4e60');
    for (let x = 0; x < 320; x += 40) R(c, x, 113, 1, 67, '#202330');
  },

  holy: (c) => {
    bands(c, ['#6a7aa8', '#8494bc', '#a0aecc', '#c0c8d8', '#dcdcd0'], 0, 104);
    // Kathedrale in der Ferne
    sprite(c, 90, 76, (p) => { p.rect(20, 30, 50, 46, '#d8d0b8'); p.rect(38, 0, 14, 76, '#e4dcc4'); p.rect(44, 0, 2, 6, '#f0c35a'); p.rect(8, 40, 14, 36, '#c8c0a8'); p.rect(68, 40, 14, 36, '#c8c0a8'); p.ellipse(45, 40, 7, 7, '#5a8ac8'); for (const x of [26, 60]) p.rect(x, 50, 4, 10, '#4a5a7a'); }, 115, 30);
    // Weizenfelder
    c.fillStyle = '#b89a48'; c.beginPath(); c.moveTo(0, 104); for (let x = 0; x <= 320; x += 16) c.lineTo(x, 96 + Math.round(Math.sin(x / 29) * 3)); c.lineTo(320, 110); c.lineTo(0, 110); c.fill();
    for (let i = 0; i < 60; i++) R(c, (i * 37) % 320, 96 + ((i * 13) % 10), 1, 3, '#e0c060');
    for (const x of [30, 290]) sprite(c, 8, 30, (p) => { p.rect(3, 4, 2, 26, '#6a5030'); p.rect(0, 2, 8, 6, '#d8d0b8'); p.set(4, 4, '#f0c35a'); }, x, 76);
  },
  snow: (c) => {
    bands(c, ['#5a6a88', '#6e7e9a', '#8494ae', '#9eacc2', '#b8c4d4'], 0, 104);
    for (const [x, w, h] of [[-30, 130, 80], [80, 110, 64], [170, 140, 88], [280, 90, 60]]) sprite(c, w, h + 2, (p) => { for (let y = 0; y < h; y++) { const half = (w / 2) * (y / h); p.rect(Math.round(w / 2 - half), y, Math.round(half * 2), 1, y < h * 0.3 ? '#eef2f6' : '#6a7488'); } }, x, 104 - h);
    for (const x of [14, 60, 240, 300]) sprite(c, 18, 34, (p) => { for (let y = 0; y < 28; y++) { const half = 1 + (y % 9) * 0.9; p.rect(Math.round(9 - half), y, Math.round(half * 2), 1, y % 9 < 2 ? '#e8eef4' : '#2c4a3a'); } p.rect(8, 28, 2, 6, '#4a3424'); }, x, 72);
    for (let i = 0; i < 50; i++) R(c, (i * 61) % 320, (i * 23) % 100, 1, 1, '#f4f8fc');
  },
  desert: (c) => {
    bands(c, ['#c86a3a', '#d8844a', '#e4a05a', '#ecbc72', '#f0d090'], 0, 104);
    sprite(c, 26, 26, (p) => { p.ellipse(12.5, 12.5, 11.5, 11.5, '#fff0c0'); }, 60, 20);
    for (const [x, w, hh, col] of [[-40, 200, 22, '#c8945a'], [120, 240, 28, '#d4a468'], [40, 180, 14, '#dcb070']] as [number, number, number, string][]) { c.fillStyle = col; c.beginPath(); c.moveTo(x, 106); c.quadraticCurveTo(x + w / 2, 106 - hh * 2, x + w, 106); c.fill(); }
    for (const x of [30, 250]) sprite(c, 30, 44, (p) => { p.rect(14, 10, 3, 34, '#7a5a34'); for (const [dx, dy] of [[-12, 4], [12, 4], [-8, -2], [8, -2], [0, -5]]) p.line(15, 10, 15 + dx, 10 + dy + 6, '#4a7a3a'); }, x, 62);
    sprite(c, 50, 40, (p) => { p.rect(4, 10, 42, 30, '#c8a070'); p.rect(0, 6, 50, 6, '#d8b080'); p.rect(20, 22, 10, 18, '#5a3a24'); for (const x of [8, 36]) p.rect(x, 16, 5, 6, '#5a3a24'); }, 150, 66);
  },
  forest: (c) => {
    bands(c, ['#1a2a24', '#203428', '#263e2e', '#2e4834', '#36523a'], 0, 104);
    for (let i = 0; i < 9; i++) { const x = i * 38 - 12, hh = 70 + (i * 17) % 26; sprite(c, 34, hh, (p) => { p.rect(14, hh - 30, 6, 30, '#4a3424'); p.ellipse(17, 22, 16, 22, i % 2 ? '#2e5a34' : '#376a3a'); p.ellipse(10, 30, 9, 10, '#2a5030'); p.ellipse(25, 28, 9, 10, '#3a7040'); }, x, 106 - hh); }
    for (let i = 0; i < 16; i++) R(c, (i * 47) % 320, 20 + ((i * 19) % 60), 1, 6 + (i % 3) * 4, 'rgba(240,230,170,0.25)');
  },
  cave: (c) => {
    R(c, 0, 0, 320, 110, '#14121c');
    for (let i = 0; i < 14; i++) { const x = i * 24 + ((i * 7) % 10), hh = 14 + (i * 13) % 30; sprite(c, 14, hh, (p) => { for (let y = 0; y < hh; y++) { const w = Math.max(1, Math.round(7 * (1 - y / hh))); p.rect(7 - w, y, w * 2, 1, '#2a2634'); } }, x, 0); }
    for (const [x, y, col] of [[40, 60, '#8a5ac8'], [120, 80, '#5ac8c8'], [270, 70, '#8a5ac8'], [200, 50, '#c85aa8']] as [number, number, string][]) sprite(c, 10, 16, (p) => { p.rect(3, 2, 4, 14, col); p.rect(0, 8, 3, 8, shade(col, -0.2)); p.rect(7, 6, 3, 10, shade(col, 0.15)); }, x, y);
    // Ruinen der Höhlenstadt
    sprite(c, 80, 50, (p) => { p.rect(0, 20, 20, 30, '#2e2a3a'); p.rect(30, 6, 22, 44, '#34304a'); p.rect(60, 26, 20, 24, '#2e2a3a'); for (const [x, y] of [[6, 28], [36, 14], [42, 30], [66, 34]]) p.rect(x, y, 4, 6, '#0a0810'); }, 120, 58);
  },
  frozen: (c) => {
    bands(c, ['#7a8090', '#868c9a', '#9298a4', '#a0a4ac', '#aeb0b4'], 0, 104);
    // Wolke steht still, Vogel in der Luft erstarrt
    sprite(c, 60, 16, (p) => { p.ellipse(30, 8, 28, 7, '#c0c2c8'); }, 40, 18);
    sprite(c, 9, 5, (p) => { p.line(0, 0, 4, 3, '#3a3c44'); p.line(4, 3, 8, 0, '#3a3c44'); }, 200, 30);
    for (const [x, hh] of [[20, 50], [100, 64], [190, 44], [270, 58]]) sprite(c, 24, hh, (p) => { p.rect(2, 10, 20, hh - 10, '#8a8c94'); p.rect(0, 6, 24, 6, '#9a9ca4'); p.rect(6, hh - 18, 6, 18, '#5a5c64'); }, x, 106 - hh);
    for (const x of [70, 160, 240]) sprite(c, 12, 26, (p) => { p.ellipse(6, 4, 3, 3, '#a0a2a8'); p.rect(3, 7, 6, 12, '#a0a2a8'); p.rect(3, 19, 2, 7, '#a0a2a8'); p.rect(7, 19, 2, 7, '#a0a2a8'); p.line(9, 9, 12, 4, '#a0a2a8'); }, x, 80);
  },
  ash: (c) => {
    bands(c, ['#1a0c0c', '#2a1210', '#3a1a14', '#4a2418', '#5a3020'], 0, 104);
    moonAt(c, 250, 16, '#c86040');
    sprite(c, 120, 70, (p) => { p.rect(10, 20, 100, 50, '#2a1418'); for (let x = 10; x < 110; x += 12) p.rect(x, 12, 6, 10, '#2a1418'); p.rect(50, 0, 20, 70, '#341a1e'); p.rect(56, 40, 8, 30, '#0a0406'); p.rect(58, 6, 4, 4, '#e86040'); }, 100, 36);
    for (let i = 0; i < 40; i++) R(c, (i * 67) % 320, (i * 29) % 104, 1, 1, i % 3 ? '#8a7a70' : '#e86040');
  },
};

// Perspektivischer Kampfboden: Platten mit Fugen, die zum Fluchtpunkt laufen.
const FLOOR: Record<string, { base: string; alt: string; line: string; lip: string; light: string; edge?: string }> = {
  moor: { base: '#6a5a44', alt: '#61523e', line: '#463a2c', lip: '#2e261c', light: '#8a7658', edge: '#577a48' },
  blut: { base: '#5a3030', alt: '#522a2a', line: '#3a1a1c', lip: '#200c0e', light: '#7a4440', edge: '#5a2a2a' },
  sewer: { base: '#4a544c', alt: '#434d45', line: '#2c332d', lip: '#161c18', light: '#66726a' },
  chalk: { base: '#c8c0ae', alt: '#bdb5a2', line: '#9a927e', lip: '#6a6458', light: '#e2dccc' },
  stone: { base: '#4e5262', alt: '#474b5a', line: '#2d2f3b', lip: '#16171f', light: '#6a6e82' },
  thorn: { base: '#4a5e3a', alt: '#435636', line: '#2c3c24', lip: '#16200f', light: '#62784a', edge: '#c0303a' },
  memory: { base: '#5c6474', alt: '#566070', line: '#3a4050', lip: '#1c2030', light: '#7a8296' },
  tower: { base: '#3e4252', alt: '#383c4b', line: '#23252f', lip: '#101118', light: '#585c70' },
  holy: { base: '#c8bfa4', alt: '#bdb498', line: '#8e8672', lip: '#5a5444', light: '#e4dcc4', edge: '#f0c35a' },
  snow: { base: '#d4dce6', alt: '#c6d0dc', line: '#98a4b4', lip: '#5a6478', light: '#f0f4f8' },
  desert: { base: '#d8b070', alt: '#cca464', line: '#a07a44', lip: '#6a4a24', light: '#ecc888' },
  forest: { base: '#4a5a34', alt: '#43532f', line: '#2c381f', lip: '#141c0e', light: '#627a44', edge: '#3a6a3a' },
  cave: { base: '#34304a', alt: '#2e2a42', line: '#1c1a2a', lip: '#0a0810', light: '#4a4462', edge: '#8a5ac8' },
  frozen: { base: '#8e9098', alt: '#868890', line: '#6a6c74', lip: '#3a3c44', light: '#a8aab0' },
  ash: { base: '#3a2a26', alt: '#342420', line: '#1e1412', lip: '#0e0806', light: '#54403a', edge: '#e86040' },
};
function floor(c: Ctx, kind: string): void {
  const f = FLOOR[kind] ?? FLOOR.stone;
  const y0 = 104, y1 = 180, vx = 160, vy = 20;
  // Zeilenhöhen wachsen nach vorn (Perspektive)
  const rows: number[] = [y0];
  let h = 5;
  while (rows[rows.length - 1] < y1) { rows.push(Math.min(y1, rows[rows.length - 1] + h)); h = Math.round(h * 1.35); }
  for (let r = 0; r < rows.length - 1; r++) {
    const ya = rows[r], yb = rows[r + 1];
    for (let y = ya; y < yb; y++) {
      // x-Position der Fugen auf dieser Höhe
      const t = (y - vy) / (y0 - vy);
      for (let x = 0; x < 320; x++) {
        const u = (x - vx) / t;
        const col = Math.floor((u + 1000) / 36);
        const ofs = r % 2 ? 0.5 : 0;
        const cc = Math.floor((u + 1000) / 36 + ofs);
        const seam = Math.abs(((u + 1000) / 36 + ofs) - Math.round((u + 1000) / 36 + ofs)) * 36 * t < 0.6;
        let color = (cc + r) % 2 ? f.base : f.alt;
        if (y === ya) color = f.light;
        if (y === yb - 1) color = f.line;
        if (seam) color = f.line;
        c.fillStyle = color; c.fillRect(x, y, 1, 1);
        void col;
      }
    }
  }
  // Vorderkante oben (Lippe) und Rand
  R(c, 0, y0 - 2, 320, 2, f.lip);
  if (f.edge) for (let x = 0; x < 320; x += 6) { R(c, x, y0 - 3, 2, 2, f.edge); R(c, x + 3, y0 - 2, 1, 1, f.edge); }
  // Risse und Steinchen als Details
  for (const [x, y, w] of [[40, 128, 6], [212, 141, 8], [120, 160, 7], [280, 120, 5], [76, 172, 9]]) { R(c, x, y, w, 1, f.line); R(c, x + w - 1, y + 1, 3, 1, f.line); }
  // Vignette nach unten zu den Rändern
  c.fillStyle = 'rgba(5,6,11,0.25)'; c.fillRect(0, 172, 320, 8);
}

export function battleBg(kind: string, withFloor = true): HTMLCanvasElement {
  const [cv, ctx] = canvas(320, 180);
  (BG[kind] ?? BG.moor)(ctx);
  if (withFloor) floor(ctx, kind);
  return cv;
}

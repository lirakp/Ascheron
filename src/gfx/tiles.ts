import { PB, shade, canvas } from './pixel';
import { mulberry32 } from '../core/state';

export const T = {
  GRASS: 0, GRASS2: 1, PATH: 2, COBBLE: 3, BOG: 4, SEA: 5, SAND: 6, REED: 7, DEADTREE: 8, ROCK: 9,
  WALL: 10, PALISADE: 11, ROOF_R: 12, ROOF_G: 13, HWALL: 14, DOOR: 15, CHALK: 16, CHALKROCK: 17, ENTRANCE: 18, GRATE: 19,
  PLANK: 20, RUIN: 21, DFLOOR: 22, DWALL: 23, CFLOOR: 24, CWALL: 25, SWATER: 26, SFLOOR: 27, EXIT: 28, SAFE: 29,
  BENCH: 30, WINDOW: 31, CHURCHWALL: 32, WELL: 33, FLOWER: 34, TREE: 35, ROOF_B: 36, BLOOD: 37, STAIRS: 38, FENCE: 39,
  STALL: 40, DTOP: 41, CTOP: 42, SIGN: 43, DEEPSEA: 44, BONES: 45, PLATFORM: 46, LADDER: 47, TOWERBG: 48, CHAIN: 49, LAMP: 50,
} as const;
export const TILE_COUNT = 51;

const SOLID = new Set<number>([T.BOG, T.SEA, T.DEADTREE, T.ROCK, T.WALL, T.PALISADE, T.ROOF_R, T.ROOF_G, T.HWALL, T.DOOR, T.CHALKROCK,
  T.ENTRANCE, T.GRATE, T.RUIN, T.DWALL, T.CWALL, T.SWATER, T.BENCH, T.WINDOW, T.CHURCHWALL, T.WELL, T.TREE, T.ROOF_B, T.FENCE, T.STALL,
  T.DTOP, T.CTOP, T.SIGN, T.DEEPSEA, T.STAIRS, T.EXIT, T.LAMP]);
export const isSolid = (t: number) => SOLID.has(t);

type TD = (p: PB, r: () => number) => void;
const noise = (p: PB, r: () => number, base: string, vars: string[], amt = 0.25) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, r() < amt ? vars[Math.floor(r() * vars.length)] : base);
};
const brick = (p: PB, base: string, mortar: string, rows = 4) => {
  const h = 16 / rows;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor(y / h);
    const off = row % 2 ? 4 : 0;
    const edge = y % h === 0 || (x + off) % 8 === 0;
    p.set(x, y, edge ? mortar : (x + y) % 7 === 0 ? shade(base, 0.08) : base);
  }
};

const D: Record<number, TD> = {
  [T.GRASS]: (p, r) => { noise(p, r, '#4f5a33', ['#5c6a3b', '#46502d', '#66733f'], 0.35); },
  [T.GRASS2]: (p, r) => { noise(p, r, '#424d2c', ['#3a4426', '#4f5a33', '#56502e'], 0.4); },
  [T.PATH]: (p, r) => { noise(p, r, '#6b5a40', ['#75644a', '#5f5038', '#82705a'], 0.35); },
  [T.COBBLE]: (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = (x % 5 === 0) || (y % 4 === 0 && (x + Math.floor(y / 4) * 2) % 5 !== 2); p.set(x, y, e ? '#4a4640' : r() < 0.2 ? '#7a756c' : '#6a655c'); } },
  [T.BOG]: (p, r) => { noise(p, r, '#2f3a2c', ['#34442f', '#283326', '#3c4a2f'], 0.3); for (let i = 0; i < 3; i++) p.set(r() * 16, r() * 16, '#56664a'); },
  [T.SEA]: (p, r) => { noise(p, r, '#2a4a62', ['#2f5470', '#264358'], 0.3); for (let i = 0; i < 2; i++) { const x = r() * 12, y = r() * 16; p.line(x, y, x + 3, y, '#4f7a96'); } },
  [T.DEEPSEA]: (p, r) => { noise(p, r, '#1f3a50', ['#23405a', '#1b3346'], 0.3); },
  [T.SAND]: (p, r) => { noise(p, r, '#a8956a', ['#b5a274', '#9a885f'], 0.35); },
  [T.REED]: (p, r) => { noise(p, r, '#4f5a33', ['#46502d'], 0.3); for (let i = 0; i < 5; i++) { const x = 2 + r() * 12; p.line(x, 15, x + (r() - 0.5) * 2, 6 + r() * 4, '#8a8a4a'); p.set(x, 6 + r() * 3, '#6a4a2a'); } },
  [T.DEADTREE]: (p, r) => { noise(p, r, '#4f5a33', ['#46502d'], 0.3); p.rect(7, 6, 2, 10, '#3a2e22'); p.line(8, 8, 3, 2, '#3a2e22'); p.line(8, 7, 13, 1, '#3a2e22'); p.line(8, 10, 12, 6, '#3a2e22'); p.set(2, 1, '#3a2e22'); },
  [T.TREE]: (p, r) => { noise(p, r, '#4f5a33', ['#46502d'], 0.3); p.rect(7, 11, 2, 5, '#4a3626'); p.ellipse(8, 6, 6.5, 6, (x, y) => (r() < 0.3 ? '#3a5a2a' : y > 8 ? '#28401f' : '#33502a')); },
  [T.ROCK]: (p, r) => { noise(p, r, '#4f5a33', ['#46502d'], 0.3); p.ellipse(8, 9, 7, 6, (x, y) => (y < 7 ? '#8a857c' : r() < 0.3 ? '#6a665e' : '#77726a')); },
  [T.WALL]: (p) => { brick(p, '#6e6a62', '#4a4741'); },
  [T.PALISADE]: (p) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) p.set(x, y, x % 4 === 0 ? '#3a2c1e' : y < 2 && x % 4 === 2 ? '#3a2c1e' : '#6a5238'); },
  [T.ROOF_R]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 3 ? '#5a2a20' : (x + (Math.floor(y / 4) % 2) * 2) % 4 === 0 ? '#7a3a2a' : '#8f4632'); },
  [T.ROOF_G]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 3 ? '#3a3c40' : (x + (Math.floor(y / 4) % 2) * 2) % 4 === 0 ? '#50545a' : '#5c6068'); },
  [T.ROOF_B]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 3 ? '#2a3448' : (x + (Math.floor(y / 4) % 2) * 2) % 4 === 0 ? '#3a4a66' : '#445676'); },
  [T.HWALL]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, x % 8 === 0 || y === 15 ? '#5a4430' : y % 5 === 0 ? '#c8b898' : '#d8c8a6'); },
  [T.WINDOW]: (p) => { D[T.HWALL](p, () => 0.5); p.rect(4, 4, 8, 7, '#3a3020'); p.rect(5, 5, 6, 5, '#e8c070'); p.line(8, 5, 8, 9, '#3a3020'); p.line(5, 7, 10, 7, '#3a3020'); },
  [T.DOOR]: (p) => { D[T.HWALL](p, () => 0.5); p.rect(3, 2, 10, 14, '#4a3020'); p.rect(4, 3, 8, 13, '#6a4428'); p.line(8, 3, 8, 15, '#4a3020'); p.set(10, 9, '#d8b060'); },
  [T.CHURCHWALL]: (p) => { brick(p, '#8a8478', '#5a564e'); p.rect(5, 2, 6, 10, '#2a2a3a'); p.rect(6, 3, 4, 8, '#5a7ac8'); p.set(7, 4, '#e8c060'); p.set(8, 6, '#c84a4a'); p.set(7, 8, '#6ac86a'); p.ellipse(8, 3, 2, 1, '#5a7ac8'); },
  [T.CHALK]: (p, r) => { noise(p, r, '#b8b2a2', ['#c8c2b2', '#a8a292', '#d0cabb'], 0.35); },
  [T.CHALKROCK]: (p, r) => { noise(p, r, '#b8b2a2', ['#a8a292'], 0.3); p.ellipse(8, 9, 7, 6.5, (x, y) => (y < 6 ? '#ece8de' : r() < 0.3 ? '#cfc9ba' : '#ddd8cb')); },
  [T.ENTRANCE]: (p, r) => { noise(p, r, '#6a655c', ['#5a554c'], 0.3); p.ellipse(8, 11, 7, 8, '#77726a'); p.ellipse(8, 12, 5, 6, '#0a0806'); p.rect(3, 12, 10, 4, '#0a0806'); p.set(5, 7, '#a83a2a'); p.set(11, 7, '#a83a2a'); },
  [T.GRATE]: (p) => { D[T.COBBLE](p, () => 0.5); p.rect(2, 2, 12, 12, '#2a2622'); for (let i = 3; i < 14; i += 2) p.line(i, 3, i, 12, '#5a5650'); },
  [T.PLANK]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 0 ? '#3a2c1e' : (x + y * 3) % 9 === 0 ? '#5a4430' : '#7a5c3c'); },
  [T.RUIN]: (p, r) => { brick(p, '#5e5a54', '#3a3834'); for (let i = 0; i < 6; i++) p.set(r() * 16, r() * 6, null); for (let i = 0; i < 5; i++) p.set(r() * 16, r() * 16, '#4a6a3a'); },
  [T.DFLOOR]: (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x % 8 === 0 || y % 8 === 0) ? '#2a2622' : r() < 0.2 ? '#4a4540' : '#3f3a35'); },
  [T.DWALL]: (p, r) => { brick(p, '#4e4840', '#2a2622'); for (let x = 0; x < 16; x++) p.set(x, 15, '#1e1a17'); void r; },
  [T.DTOP]: (p, r) => { noise(p, r, '#1f1b18', ['#25201c', '#1a1714'], 0.3); },
  [T.CFLOOR]: (p, r) => { noise(p, r, '#a8a292', ['#b8b2a2', '#9a9484', '#c2bcae'], 0.35); for (let i = 0; i < 2; i++) p.set(r() * 16, r() * 16, '#8a8474'); },
  [T.CWALL]: (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y > 13 ? '#7a7464' : r() < 0.25 ? '#d8d2c4' : y % 5 === 0 ? '#b8b2a2' : '#cac4b6'); },
  [T.CTOP]: (p, r) => { noise(p, r, '#5a5548', ['#625c50', '#4e4a40'], 0.3); },
  [T.SWATER]: (p, r) => { noise(p, r, '#2e3a2a', ['#344230', '#28331f', '#3e4a2a'], 0.3); for (let i = 0; i < 2; i++) { const x = r() * 12; p.line(x, r() * 16, x + 3, r() * 16, '#4a5a3a'); } },
  [T.SFLOOR]: (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x % 8 === 0 || y % 4 === 0) ? '#2a2a24' : r() < 0.2 ? '#4a4a3c' : '#3e3e32'); },
  [T.EXIT]: (p, r) => { D[T.DFLOOR](p, r); p.ellipse(8, 8, 7, 7, '#e8d8a0'); p.ellipse(8, 8, 5, 5, '#fff4c8'); p.ellipse(8, 8, 2, 2, '#ffffff'); },
  [T.SAFE]: (p, r) => { D[T.DFLOOR](p, r); p.ellipse(8, 8, 6, 6, '#4a6a8a'); p.ellipse(8, 8, 5, 5, '#3f3a35'); p.line(8, 3, 8, 13, '#6a9aca'); p.line(3, 8, 13, 8, '#6a9aca'); },
  [T.BENCH]: (p, r) => { D[T.DFLOOR](p, r); p.rect(1, 5, 14, 6, '#5a5650'); p.rect(1, 5, 14, 2, '#77726a'); p.rect(2, 11, 2, 3, '#4a4640'); p.rect(12, 11, 2, 3, '#4a4640'); },
  [T.WELL]: (p, r) => { D[T.COBBLE](p, r); p.ellipse(8, 9, 7, 6, '#6e6a62'); p.ellipse(8, 9, 4.5, 3.5, '#1a2a3a'); p.rect(2, 1, 1, 8, '#4a3020'); p.rect(13, 1, 1, 8, '#4a3020'); p.rect(2, 1, 12, 1, '#4a3020'); },
  [T.FLOWER]: (p, r) => { D[T.GRASS](p, r); for (let i = 0; i < 4; i++) { const x = 2 + r() * 12, y = 2 + r() * 12; p.set(x, y, '#c8a8d8'); p.set(x, y + 1, '#3a5a2a'); } },
  [T.BLOOD]: (p, r) => { D[T.DFLOOR](p, r); p.ellipse(8, 9, 5, 3, '#5a1a18'); p.set(3, 4, '#5a1a18'); },
  [T.STAIRS]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 0 ? '#1e1a17' : shade('#5a544c', -y / 30)); },
  [T.FENCE]: (p, r) => { D[T.GRASS](p, r); p.rect(0, 6, 16, 2, '#6a5238'); p.rect(0, 11, 16, 2, '#6a5238'); for (let x = 1; x < 16; x += 5) p.rect(x, 4, 2, 11, '#4a3626'); },
  [T.STALL]: (p, r) => { D[T.COBBLE](p, r); p.rect(1, 8, 14, 7, '#6a4a2c'); for (let x = 0; x < 16; x++) for (let y = 1; y < 7; y++) p.set(x, y, Math.floor(x / 3) % 2 ? '#c8b898' : '#a83a2a'); p.set(4, 9, '#c8a040'); p.set(9, 10, '#6a9a3a'); p.set(12, 9, '#a85a2a'); },
  [T.SIGN]: (p, r) => { D[T.COBBLE](p, r); p.rect(7, 8, 2, 8, '#4a3626'); p.rect(2, 2, 12, 7, '#7a5c3c'); p.rect(3, 3, 10, 5, '#8a6a48'); p.line(4, 5, 11, 5, '#3a2c1e'); },
  [T.BONES]: (p, r) => { D[T.DFLOOR](p, r); p.line(3, 10, 9, 8, '#d8d0bc'); p.set(2, 10, '#e8e0cc'); p.set(10, 8, '#e8e0cc'); p.ellipse(11, 11, 2, 2, '#d8d0bc'); p.set(11, 11, '#2a2622'); },
  [T.PLATFORM]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 3 ? '#8a8478' : y === 3 ? '#4a4640' : (x + y) % 6 === 0 ? '#4e4a44' : '#5e5a52'); },
  [T.LADDER]: (p) => { p.rect(3, 0, 2, 16, '#6a4a2c'); p.rect(11, 0, 2, 16, '#6a4a2c'); for (let y = 2; y < 16; y += 5) p.rect(3, y, 10, 2, '#8a6a44'); },
  [T.TOWERBG]: (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / 4), off = row % 2 ? 4 : 0; p.set(x, y, (y % 4 === 0 || (x + off) % 8 === 0) ? '#1c1916' : r() < 0.15 ? '#2c2824' : '#26221e'); } },
  [T.CHAIN]: (p, r) => { D[T.TOWERBG](p, r); for (let y = 0; y < 16; y++) { p.set(8, y, y % 4 < 2 ? '#d8d0bc' : '#a8a090'); if (y % 4 === 1) { p.set(7, y, '#a8a090'); p.set(9, y, '#a8a090'); } } },
  [T.LAMP]: (p, r) => { D[T.COBBLE](p, r); p.rect(7, 4, 2, 12, '#2a2622'); p.rect(5, 1, 6, 4, '#2a2622'); p.rect(6, 2, 4, 2, '#f0c060'); },
};

export function tilesetCanvas(): HTMLCanvasElement {
  const [c, ctx] = canvas(16 * TILE_COUNT, 16);
  for (let i = 0; i < TILE_COUNT; i++) {
    const p = new PB(16, 16);
    const fn = D[i];
    if (fn) fn(p, mulberry32(1000 + i * 17));
    p.draw(ctx, i * 16, 0);
  }
  return c;
}

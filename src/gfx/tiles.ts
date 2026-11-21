import { PB, shade, canvas } from './pixel';

export const T = {
  GRASS: 0, GRASS2: 1, PATH: 2, COBBLE: 3, BOG: 4, SEA: 5, SAND: 6, REED: 7, DEADTREE: 8, ROCK: 9,
  WALL: 10, PALISADE: 11, ROOF_R: 12, ROOF_G: 13, HWALL: 14, DOOR: 15, CHALK: 16, CHALKROCK: 17, ENTRANCE: 18, GRATE: 19,
  PLANK: 20, RUIN: 21, DFLOOR: 22, DWALL: 23, CFLOOR: 24, CWALL: 25, SWATER: 26, SFLOOR: 27, EXIT: 28, SAFE: 29,
  BENCH: 30, WINDOW: 31, CHURCHWALL: 32, WELL: 33, FLOWER: 34, TREE: 35, ROOF_B: 36, BLOOD: 37, STAIRS: 38, FENCE: 39,
  STALL: 40, DTOP: 41, CTOP: 42, SIGN: 43, DEEPSEA: 44, BONES: 45, PLATFORM: 46, LADDER: 47, TOWERBG: 48, CHAIN: 49, LAMP: 50,
  DWALL_MOSS: 51, DWALL_CRACK: 52, TORCH: 53, DFLOOR_CRACK: 54, PUDDLE: 55, RUBBLE: 56, CWALL_FOSSIL: 57, CFLOOR_CRACK: 58, PIPE: 59, COBWEB: 60, BANNER: 61,
  HEDGE: 62, HEDGE_TOP: 63, GARDEN: 64, THORN_GATE: 65, ROSEBED: 66,
  MFLOOR: 67, MWALL: 68, MTOP: 69, MIRROR: 70, HUT: 71,
  SNOW: 72, SNOW2: 73, PINE: 74, ICE: 75, FROZEN: 76, FROZEN_TREE: 77, DUNE: 78, DUNE2: 79, PALM: 80, DESERT_ROCK: 81,
  OAK: 82, FOREST: 83, MARBLE: 84, CAVE: 85, CAVE_WALL: 86, CRYSTAL: 87, ASH: 88, ASH2: 89, CHARRED: 90, MOUNTAIN: 91,
  FIELD: 92, RIVER: 93, STATUE: 94, REDWALL: 95, TENT: 96, CAVE_GATE: 97, MINE: 98, SANDSTONE: 99, RUIN_GRAY: 100,
} as const;
export const TILE_COUNT = 101;

const SOLID = new Set<number>([T.BOG, T.SEA, T.DEADTREE, T.ROCK, T.WALL, T.PALISADE, T.ROOF_R, T.ROOF_G, T.HWALL, T.DOOR, T.CHALKROCK,
  T.ENTRANCE, T.GRATE, T.RUIN, T.DWALL, T.CWALL, T.SWATER, T.BENCH, T.WINDOW, T.CHURCHWALL, T.WELL, T.TREE, T.ROOF_B, T.FENCE, T.STALL,
  T.DTOP, T.CTOP, T.SIGN, T.DEEPSEA, T.STAIRS, T.EXIT, T.LAMP, T.DWALL_MOSS, T.DWALL_CRACK, T.TORCH, T.CWALL_FOSSIL, T.PIPE, T.BANNER, T.RUBBLE, T.HEDGE, T.HEDGE_TOP, T.THORN_GATE, T.ROSEBED, T.MWALL, T.MTOP, T.MIRROR, T.HUT,
  T.PINE, T.ICE, T.FROZEN_TREE, T.PALM, T.DESERT_ROCK, T.OAK, T.CAVE_WALL, T.CRYSTAL, T.CHARRED, T.MOUNTAIN, T.RIVER, T.STATUE, T.REDWALL, T.TENT, T.CAVE_GATE, T.MINE, T.SANDSTONE, T.RUIN_GRAY]);
export const isSolid = (t: number) => SOLID.has(t);

type TD = (p: PB) => void;

// Palette – flach, leicht entsättigt, Schatten mit Blaustich
const C = {
  grass: '#4f7040', grassD: '#41603a', grassL: '#638a4c',
  moor: '#4b6b3e', moorD: '#3e5c36', moorL: '#5e8249',
  path: '#8c7454', pathD: '#745f44', pathL: '#a38a66',
  cob: '#6c707c', cobD: '#4a4e5c', cobL: '#888c98',
  bog: '#2f4a40', bogL: '#41634f', bogD: '#243a33',
  sea: '#2f5d8e', seaL: '#4f82b6', seaD: '#244a74', deep: '#213f66',
  sand: '#c4ab7c', sandD: '#ab9264',
  wood: '#7a5a3a', woodD: '#5a4028', woodL: '#96714a',
  stone: '#7a7e8a', stoneD: '#4e5262', stoneL: '#979ba7',
  plaster: '#d8ccb0', beam: '#6a4a30',
  chalk: '#d4cdbd', chalkD: '#bab2a0', chalkL: '#e8e2d6',
  dfl: '#3d404e', dflD: '#2d2f3b', dflL: '#4a4e5e',
  dwall: '#565a6c', dtop: '#1a1c26',
  sfl: '#3b443c', water: '#2d4538', waterL: '#3f5c4a',
};
const fill = (p: PB, c: string) => p.rect(0, 0, 16, 16, c);
const tuft = (p: PB, x: number, y: number, c: string, l: string) => { p.set(x, y, c); p.set(x + 2, y, c); p.set(x + 1, y - 1, l); p.set(x + 1, y, c); };
const obj = (p: PB, draw: (o: PB) => void, light = 0.3, dark = 0.3) => {
  const o = new PB(16, 16); draw(o); o.bevel(light, dark); o.outline('#0a0b12');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = o.get(x, y); if (c) p.set(x, y, c); }
};
const bricks = (p: PB, base: string, mortar: string, light: string, rows = 4) => {
  const h = 16 / rows;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor(y / h), off = row % 2 ? 4 : 0, yy = y % h;
    const edge = yy === h - 1 || (x + off) % 8 === 7;
    p.set(x, y, edge ? mortar : yy === 0 ? light : base);
  }
};
const grass = (p: PB) => { fill(p, C.grass); tuft(p, 2, 4, C.grassD, C.grassL); tuft(p, 10, 2, C.grassD, C.grassL); tuft(p, 6, 11, C.grassD, C.grassL); tuft(p, 12, 13, C.grassD, C.grassL); };
const moor = (p: PB) => { fill(p, C.moor); tuft(p, 3, 6, C.moorD, C.moorL); tuft(p, 11, 10, C.moorD, C.moorL); p.set(7, 2, C.moorD); p.set(14, 5, C.moorD); p.set(1, 13, C.moorD); };
const cobble = (p: PB) => {
  fill(p, C.cobD);
  const stones: [number, number, number, number][] = [[0, 0, 7, 4], [8, 0, 8, 4], [0, 5, 4, 5], [5, 5, 6, 5], [12, 5, 4, 5], [0, 11, 8, 5], [9, 11, 7, 5]];
  for (const [x, y, w, h] of stones) { p.rect(x, y, w - 1, h - 1, C.cob); p.rect(x, y, w - 1, 1, C.cobL); p.rect(x, y, 1, h - 1, C.cobL); }
};
const dfloor = (p: PB) => { fill(p, C.dfl); for (let i = 0; i < 16; i++) { p.set(i, 7, C.dflD); p.set(i, 15, C.dflD); p.set(7, i, C.dflD); p.set(15, i, C.dflD); p.set(i, 0, C.dflL); p.set(0, i, C.dflL); p.set(i, 8, C.dflL); p.set(8, i, C.dflL); } };
const plaster = (p: PB) => { fill(p, C.plaster); p.rect(0, 0, 16, 2, C.beam); p.rect(0, 14, 16, 2, C.beam); p.rect(0, 0, 2, 16, C.beam); p.rect(2, 2, 14, 1, shade(C.plaster, 0.25)); };
const roof = (p: PB, base: string) => { const d = shade(base, -0.3), l = shade(base, 0.22); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const yy = y % 4, off = Math.floor(y / 4) % 2 ? 4 : 0; p.set(x, y, yy === 3 ? d : (x + off) % 8 === 0 ? d : yy === 0 ? l : base); } };

const D: Record<number, TD> = {
  [T.GRASS]: grass,
  [T.GRASS2]: moor,
  [T.PATH]: (p) => { fill(p, C.path); p.rect(3, 4, 2, 1, C.pathD); p.rect(10, 9, 3, 1, C.pathD); p.set(6, 13, C.pathL); p.set(13, 2, C.pathL); p.set(1, 10, C.pathL); },
  [T.COBBLE]: cobble,
  [T.BOG]: (p) => { fill(p, C.bog); p.rect(2, 4, 5, 1, C.bogL); p.rect(9, 10, 5, 1, C.bogL); p.rect(4, 12, 3, 1, C.bogD); p.rect(11, 3, 3, 1, C.bogD); },
  [T.SEA]: (p) => { fill(p, C.sea); p.rect(2, 3, 4, 1, C.seaL); p.rect(9, 9, 5, 1, C.seaL); p.rect(5, 13, 3, 1, C.seaD); },
  [T.DEEPSEA]: (p) => { fill(p, C.deep); p.rect(4, 6, 3, 1, C.seaD); p.rect(11, 12, 3, 1, C.seaD); },
  [T.SAND]: (p) => { fill(p, C.sand); p.set(3, 3, C.sandD); p.set(11, 6, C.sandD); p.set(6, 12, C.sandD); p.set(14, 13, C.sandD); },
  [T.REED]: (p) => { moor(p); for (const [x, y] of [[3, 6], [5, 3], [8, 7], [11, 4], [13, 8]]) { p.rect(x, y + 3, 1, 14 - y - 3, '#8f9a52'); p.rect(x + 1, y + 5, 1, 14 - y - 5, '#6a7a3a'); p.rect(x, y, 1, 3, '#7a5232'); p.set(x, y, '#9a6a3a'); } },
  [T.DEADTREE]: (p) => { moor(p); obj(p, (o) => { o.rect(7, 5, 2, 11, '#5a4636'); o.line(8, 7, 3, 2, '#5a4636'); o.line(8, 6, 13, 1, '#5a4636'); o.line(8, 9, 12, 5, '#5a4636'); }); },
  [T.TREE]: (p) => { grass(p); obj(p, (o) => { o.rect(7, 11, 2, 5, '#6a4a30'); o.ellipse(8, 6.5, 6.5, 6, '#3f7a3a'); o.ellipse(6, 5, 2, 1.5, '#4f9446'); }); },
  [T.ROCK]: (p) => { moor(p); obj(p, (o) => { o.ellipse(8, 10, 6.5, 5, '#8a8e9a'); o.rect(4, 11, 9, 3, '#767a86'); }); },
  [T.WALL]: (p) => bricks(p, C.stone, C.stoneD, C.stoneL),
  [T.PALISADE]: (p) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) { const c = x % 4; p.set(x, y, c === 3 ? C.woodD : c === 0 ? C.woodL : C.wood); } for (let x = 0; x < 16; x += 4) { p.set(x + 1, 0, null); p.set(x + 2, 0, C.woodL); } p.rect(0, 9, 16, 2, C.woodD); },
  [T.ROOF_R]: (p) => roof(p, '#a84a3a'),
  [T.ROOF_G]: (p) => roof(p, '#5c6478'),
  [T.ROOF_B]: (p) => roof(p, '#3f5a8a'),
  [T.HWALL]: plaster,
  [T.WINDOW]: (p) => { plaster(p); p.rect(4, 4, 8, 8, C.beam); p.rect(5, 5, 6, 6, '#f0c868'); p.rect(5, 5, 6, 1, '#fff0b0'); p.rect(7, 5, 2, 6, C.beam); p.rect(5, 7, 6, 2, C.beam); },
  [T.DOOR]: (p) => { plaster(p); p.rect(3, 2, 10, 14, '#3a2818'); p.rect(4, 3, 8, 13, '#7a5232'); p.rect(4, 3, 8, 1, '#96704a'); p.rect(7, 3, 2, 13, '#5a3a22'); p.rect(10, 9, 1, 2, '#f0c35a'); },
  [T.CHURCHWALL]: (p) => { bricks(p, '#8e8e9c', '#5a5c6c', '#a8a8b6'); p.rect(5, 2, 6, 11, '#2a2e44'); p.rect(6, 3, 4, 9, '#4f7ad0'); p.rect(6, 3, 2, 4, '#e0b04a'); p.rect(8, 7, 2, 3, '#c84a5a'); p.rect(6, 9, 2, 3, '#5ab06a'); },
  [T.CHALK]: (p) => { fill(p, C.chalk); p.rect(3, 4, 3, 1, C.chalkD); p.rect(10, 11, 4, 1, C.chalkD); p.set(12, 3, C.chalkL); p.set(5, 12, C.chalkL); },
  [T.CHALKROCK]: (p) => { D[T.CHALK](p); obj(p, (o) => { o.ellipse(8, 10, 6.5, 5.5, '#ece6d8'); o.rect(4, 12, 9, 2, '#d8d0c0'); }); },
  [T.ENTRANCE]: (p) => { fill(p, C.cobD); obj(p, (o) => { o.ellipse(8, 10, 7.5, 7.5, '#7e8290'); o.rect(1, 10, 15, 6, '#7e8290'); }); p.ellipse(8, 11, 4.5, 5, '#06070c'); p.rect(4, 11, 9, 5, '#06070c'); p.set(5, 7, '#e0503a'); p.set(11, 7, '#e0503a'); },
  [T.GRATE]: (p) => { cobble(p); obj(p, (o) => { o.rect(2, 2, 12, 12, '#3a3e4a'); }); p.rect(3, 3, 10, 10, '#0c0e16'); for (let i = 4; i < 13; i += 2) p.rect(i, 3, 1, 10, '#6a6e7c'); },
  [T.PLANK]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 3 ? C.woodD : y % 4 === 0 ? C.woodL : C.wood); p.set(3, 1, C.woodD); p.set(12, 9, C.woodD); },
  [T.RUIN]: (p) => { moor(p); obj(p, (o) => { o.rect(0, 3, 16, 13, C.stone); o.rect(0, 1, 9, 2, C.stone); for (let x = 0; x < 16; x++) { o.set(x, 8, C.stoneD); } o.set(5, 8, C.stone); o.set(11, 3, null); o.set(12, 3, null); o.set(12, 4, null); }); p.rect(2, 13, 2, 1, '#5ab04a'); },
  [T.DFLOOR]: dfloor,
  [T.DWALL]: (p) => { bricks(p, C.dwall, '#383b4a', '#6c7084'); p.rect(0, 14, 16, 2, '#0e0f16'); },
  [T.DTOP]: (p) => { fill(p, C.dtop); p.rect(0, 0, 16, 1, '#232634'); },
  [T.CFLOOR]: (p) => { fill(p, '#bab2a0'); for (let i = 0; i < 16; i++) { p.set(i, 15, '#a39a88'); p.set(15, i, '#a39a88'); p.set(i, 0, '#ccc4b2'); } p.rect(5, 6, 3, 1, '#a39a88'); },
  [T.CWALL]: (p) => { bricks(p, '#d8d2c4', '#a8a090', '#eee8dc', 3); p.rect(0, 14, 16, 2, '#6a6458'); },
  [T.CTOP]: (p) => { fill(p, '#4e4a44'); p.rect(0, 0, 16, 1, '#5e5a52'); },
  [T.SWATER]: (p) => { fill(p, C.water); p.rect(2, 4, 5, 1, C.waterL); p.rect(9, 11, 5, 1, C.waterL); p.rect(0, 0, 16, 1, '#1c2a22'); },
  [T.SFLOOR]: (p) => { fill(p, C.sfl); for (let i = 0; i < 16; i++) { p.set(i, 7, '#2c332d'); p.set(i, 15, '#2c332d'); p.set(i, 0, '#4a544a'); p.set(i, 8, '#4a544a'); } for (let y = 0; y < 16; y++) { p.set((y < 8 ? 7 : 11), y, '#2c332d'); } },
  [T.EXIT]: (p) => { dfloor(p); obj(p, (o) => { o.ellipse(8, 8, 6.5, 6.5, '#f0d88a'); o.ellipse(8, 8, 4, 4, '#fff6d0'); }, 0.4, 0.2); },
  [T.SAFE]: (p) => { dfloor(p); obj(p, (o) => { o.ellipse(8, 8, 6, 6, '#4f86c8'); o.ellipse(8, 8, 4, 4, C.dfl); o.rect(7, 3, 2, 10, '#8ac0f0'); o.rect(3, 7, 10, 2, '#8ac0f0'); }, 0.3, 0.3); },
  [T.BENCH]: (p) => { dfloor(p); obj(p, (o) => { o.rect(1, 4, 14, 6, '#7a7e8c'); o.rect(2, 10, 2, 4, '#5a5e6c'); o.rect(12, 10, 2, 4, '#5a5e6c'); }); },
  [T.WELL]: (p) => { cobble(p); obj(p, (o) => { o.ellipse(8, 10, 7, 5.5, '#7a7e8a'); o.rect(2, 1, 1, 9, '#7a5232'); o.rect(13, 1, 1, 9, '#7a5232'); o.rect(2, 1, 12, 2, '#a84a3a'); }); p.ellipse(8, 10, 4, 2.5, '#1f3d66'); },
  [T.FLOWER]: (p) => { grass(p); for (const [x, y, c] of [[3, 4, '#e8a8d8'], [11, 3, '#f0e070'], [7, 10, '#e8a8d8'], [13, 12, '#a8c8f0']] as [number, number, string][]) { p.set(x, y, c); p.set(x - 1, y, shade(c, -0.3)); p.set(x + 1, y, shade(c, -0.3)); p.set(x, y - 1, shade(c, 0.3)); p.set(x, y + 1, '#2f5a2a'); } },
  [T.BLOOD]: (p) => { dfloor(p); p.ellipse(8, 9, 5, 3, '#6a1820'); p.ellipse(7, 8, 2, 1, '#8a2830'); p.set(3, 4, '#6a1820'); },
  [T.STAIRS]: (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const st = Math.floor(y / 4); p.set(x, y, y % 4 === 0 ? shade('#7a7e8c', -st * 0.18 + 0.15) : shade('#5a5e6c', -st * 0.18)); } },
  [T.FENCE]: (p) => { grass(p); obj(p, (o) => { o.rect(0, 6, 16, 2, C.wood); o.rect(0, 11, 16, 2, C.wood); for (let x = 2; x < 16; x += 6) o.rect(x, 4, 2, 11, C.woodD); }, 0.25, 0.2); },
  [T.STALL]: (p) => { cobble(p); obj(p, (o) => { o.rect(1, 8, 14, 7, C.wood); for (let x = 0; x < 16; x++) for (let y = 1; y < 7; y++) o.set(x, y, Math.floor(x / 4) % 2 ? '#e8dcc0' : '#c0483a'); }); p.set(4, 9, '#f0c35a'); p.set(8, 9, '#6ab04a'); p.set(12, 9, '#d8783a'); },
  [T.SIGN]: (p) => { cobble(p); obj(p, (o) => { o.rect(7, 8, 2, 8, C.woodD); o.rect(2, 2, 12, 7, C.wood); }); p.rect(4, 4, 8, 1, '#3a2818'); p.rect(4, 6, 6, 1, '#3a2818'); },
  [T.BONES]: (p) => { dfloor(p); obj(p, (o) => { o.line(3, 11, 9, 9, '#e8e0cc'); o.ellipse(11.5, 11, 2, 2, '#e8e0cc'); }, 0.2, 0.25); p.set(11, 11, '#1a1c26'); },
  [T.PLATFORM]: (p) => { fill(p, '#5e6272'); p.rect(0, 0, 16, 3, '#9a9eac'); p.rect(0, 3, 16, 1, '#3a3d4a'); for (let x = 0; x < 16; x += 8) p.rect(x, 4, 1, 12, '#4a4e5c'); },
  [T.LADDER]: (p) => { p.rect(3, 0, 2, 16, C.wood); p.rect(11, 0, 2, 16, C.wood); p.rect(3, 0, 1, 16, C.woodL); p.rect(11, 0, 1, 16, C.woodL); for (let y = 2; y < 16; y += 5) { p.rect(3, y, 10, 2, C.woodL); p.rect(3, y + 1, 10, 1, C.woodD); } },
  [T.TOWERBG]: (p) => bricks(p, '#24262f', '#181a21', '#2c2f3a'),
  [T.CHAIN]: (p) => { D[T.TOWERBG](p); for (let y = 0; y < 16; y += 4) { p.rect(7, y, 2, 3, '#d8d0bc'); p.set(7, y, '#f0ead8'); p.set(8, y + 2, '#a8a090'); } },
  [T.DWALL_MOSS]: (p) => { D[T.DWALL](p); for (const [x, y, w] of [[1, 0, 5], [2, 1, 3], [9, 0, 6], [11, 1, 3], [12, 2, 1], [3, 2, 1]]) p.rect(x, y, w, 1, '#4a7a3e'); p.set(4, 3, '#4a7a3e'); p.set(13, 3, '#3a6432'); p.set(5, 9, '#4a7a3e'); p.set(6, 9, '#3a6432'); },
  [T.DWALL_CRACK]: (p) => { D[T.DWALL](p); p.line(5, 1, 7, 5, '#1a1c26'); p.line(7, 5, 6, 9, '#1a1c26'); p.line(7, 5, 10, 7, '#1a1c26'); p.set(8, 5, '#7a7e92'); },
  [T.TORCH]: (p) => { D[T.DWALL](p); obj(p, (o) => { o.rect(7, 7, 2, 6, '#6a4a30'); o.rect(6, 6, 4, 2, '#3a3e4a'); o.rect(6, 2, 4, 4, '#f08a2a'); o.rect(7, 1, 2, 2, '#f8d050'); }, 0.35, 0.2); p.set(7, 3, '#fff2b0'); },
  [T.BANNER]: (p) => { D[T.DWALL](p); obj(p, (o) => { o.rect(3, 1, 10, 1, '#3a3e4a'); o.rect(4, 2, 8, 9, '#7a2a30'); o.set(4, 11, '#7a2a30'); o.set(11, 11, '#7a2a30'); o.rect(5, 11, 6, 1, '#7a2a30'); o.rect(7, 4, 2, 4, '#d8b050'); o.rect(6, 5, 4, 1, '#d8b050'); }, 0.25, 0.3); },
  [T.DFLOOR_CRACK]: (p) => { D[T.DFLOOR](p); p.line(2, 3, 6, 6, '#22242e'); p.line(6, 6, 5, 11, '#22242e'); p.line(6, 6, 11, 8, '#22242e'); p.set(10, 12, '#56596a'); p.set(3, 13, '#56596a'); },
  [T.PUDDLE]: (p) => { D[T.DFLOOR](p); p.ellipse(8, 9, 6, 3.5, '#22344a'); p.ellipse(7, 8, 4, 2, '#2c4460'); p.rect(5, 8, 3, 1, '#5a7aa0'); p.set(11, 10, '#5a7aa0'); },
  [T.RUBBLE]: (p) => { D[T.DFLOOR](p); obj(p, (o) => { o.ellipse(5, 10, 3.5, 2.5, '#6a6e7e'); o.ellipse(11, 9, 3, 2.5, '#5e6272'); o.ellipse(8, 5, 2.5, 2, '#727688'); o.ellipse(9, 12, 2, 1.5, '#5e6272'); }, 0.3, 0.3); },
  [T.CWALL_FOSSIL]: (p) => { D[T.CWALL](p); p.ellipse(8, 6, 3.5, 3.5, '#b8b09e'); p.ellipse(8, 6, 2, 2, '#d8d2c4'); p.set(8, 6, '#a39a88'); p.line(4, 10, 12, 11, '#c0b8a6'); },
  [T.CFLOOR_CRACK]: (p) => { D[T.CFLOOR](p); p.line(3, 2, 7, 7, '#948c78'); p.line(7, 7, 12, 9, '#948c78'); p.rect(10, 12, 2, 1, '#d8d2c4'); },
  [T.PIPE]: (p) => { D[T.DWALL](p); obj(p, (o) => { o.ellipse(8, 8, 5.5, 5.5, '#6a5a3a'); }, 0.3, 0.3); p.ellipse(8, 8, 3.5, 3.5, '#0c0e10'); p.rect(7, 11, 2, 5, '#3f6a4e'); p.set(7, 13, '#5a9070'); },
  [T.COBWEB]: (p) => { D[T.DFLOOR](p); for (let i = 0; i < 9; i++) { p.set(i, 0, '#b8bcc8'); p.set(0, i, '#b8bcc8'); p.set(i, i, '#9a9eac'); } p.line(0, 5, 5, 0, '#9a9eac'); p.line(0, 8, 8, 0, '#8a8e9c'); },
  [T.HEDGE]: (p) => {
    fill(p, '#2c4a2a');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = (x * 7 + y * 13) % 11; if (v === 0) p.set(x, y, '#3f6a38'); if (v === 5) p.set(x, y, '#1e3420'); }
    for (const [x, y] of [[3, 3], [10, 6], [6, 11], [13, 12]]) { p.set(x, y, '#c8b890'); p.set(x + 1, y - 1, '#c8b890'); }
    p.set(8, 3, '#c0303a'); p.set(9, 3, '#e04a50'); p.set(8, 2, '#e04a50');
    p.rect(0, 14, 16, 2, '#0e1a10');
  },
  [T.HEDGE_TOP]: (p) => { fill(p, '#15241a'); for (let x = 0; x < 16; x += 3) p.set(x, (x * 5) % 16, '#20361f'); p.rect(0, 0, 16, 1, '#2a4228'); },
  [T.GARDEN]: (p) => { fill(p, '#3e5a34'); for (const [x, y] of [[0, 0, 8, 8], [8, 8, 8, 8]] as number[][]) p.rect(x, y, 8, 8, '#45633a'); p.rect(0, 7, 16, 1, '#344d2c'); p.rect(7, 0, 1, 16, '#344d2c'); tuft(p, 2, 4, '#2f4a2a', '#5a8048'); tuft(p, 11, 12, '#2f4a2a', '#5a8048'); },
  [T.ROSEBED]: (p) => { D[T.GARDEN](p); obj(p, (o) => { o.ellipse(8, 10, 7, 5, '#2f5a2c'); for (const [x, y] of [[5, 8], [10, 9], [8, 12], [12, 12]]) { o.rect(x, y, 2, 2, '#c0303a'); } }, 0.3, 0.3); },
  [T.THORN_GATE]: (p) => { moor(p); obj(p, (o) => { o.ellipse(8, 9, 8, 8, '#2c4a2a'); o.rect(0, 9, 16, 7, '#2c4a2a'); }, 0.25, 0.3); p.ellipse(8, 11, 4.5, 5, '#06070c'); p.rect(4, 11, 9, 5, '#06070c'); for (const [x, y] of [[3, 4], [12, 5], [8, 2], [2, 9], [13, 10]]) p.set(x, y, '#c0303a'); },
  [T.MFLOOR]: (p) => { fill(p, '#5c6474'); for (let i = 0; i < 16; i++) { p.set(i, 15, '#4a5160'); p.set(15, i, '#4a5160'); p.set(i, 0, '#6c7486'); p.set(0, i, '#6c7486'); } p.set(5, 6, '#7a8296'); p.set(11, 10, '#7a8296'); },
  [T.MWALL]: (p) => { bricks(p, '#7a8294', '#4f5668', '#9aa2b4'); p.rect(0, 14, 16, 2, '#22262f'); p.set(4, 5, '#b8c0d0'); },
  [T.MTOP]: (p) => { fill(p, '#262a35'); p.rect(0, 0, 16, 1, '#323746'); },
  [T.MIRROR]: (p) => { D[T.MFLOOR](p); obj(p, (o) => { o.rect(3, 0, 10, 15, '#8a7a5a'); o.rect(4, 1, 8, 12, '#3a4458'); o.rect(5, 2, 2, 6, '#9ab0d0'); }, 0.3, 0.3); },
  [T.HUT]: (p) => { D[T.SAND](p); obj(p, (o) => { o.rect(1, 6, 14, 10, '#7a5a3a'); for (let y = 0; y < 7; y++) o.rect(8 - y - 1, y, (y + 1) * 2, 1, '#5c6478'); }, 0.25, 0.3); p.rect(6, 10, 4, 6, '#06070c'); p.rect(2, 8, 2, 2, '#e8c070'); },
  [T.SNOW]: (p) => { fill(p, '#dfe6ee'); p.set(3, 4, '#c4cfdc'); p.set(11, 9, '#c4cfdc'); p.set(7, 13, '#c4cfdc'); p.set(13, 2, '#ffffff'); p.set(2, 11, '#ffffff'); },
  [T.SNOW2]: (p) => { fill(p, '#d2dae6'); p.rect(4, 6, 3, 1, '#bcc8d6'); p.rect(10, 12, 4, 1, '#bcc8d6'); p.set(8, 3, '#ffffff'); },
  [T.PINE]: (p) => { D[T.SNOW](p); obj(p, (o) => { o.rect(7, 12, 2, 4, '#5a4030'); for (let y = 1; y < 13; y++) { const w = Math.round(y * 0.55) + 1; o.rect(8 - w, y, w * 2, 1, y % 4 === 0 ? '#2a4a3a' : '#33584a'); } o.set(8, 1, '#ffffff'); o.rect(6, 4, 4, 1, '#e8eef4'); o.rect(5, 8, 6, 1, '#e8eef4'); }); },
  [T.ICE]: (p) => { fill(p, '#a8c8e0'); p.line(2, 3, 7, 6, '#d8ecf8'); p.line(9, 10, 14, 12, '#d8ecf8'); p.rect(4, 12, 3, 1, '#8ab0cc'); },
  [T.FROZEN]: (p) => { fill(p, '#7a7e84'); tuft(p, 3, 5, '#6a6e74', '#9a9ea4'); tuft(p, 11, 11, '#6a6e74', '#9a9ea4'); p.set(8, 2, '#8a8e94'); },
  [T.FROZEN_TREE]: (p) => { D[T.FROZEN](p); obj(p, (o) => { o.rect(7, 9, 2, 7, '#5a5a60'); o.ellipse(8, 6, 6, 5.5, '#9aa0a8'); o.ellipse(6, 5, 2, 1.5, '#b8bec6'); }, 0.25, 0.3); },
  [T.DUNE]: (p) => { fill(p, '#d8b878'); p.line(0, 5, 7, 3, '#c8a868'); p.line(7, 3, 15, 6, '#e8cc90'); p.line(2, 12, 12, 10, '#c8a868'); },
  [T.DUNE2]: (p) => { fill(p, '#ccac6c'); p.line(1, 9, 9, 7, '#e0c486'); p.line(9, 7, 15, 9, '#b89a5c'); p.set(5, 3, '#b89a5c'); },
  [T.PALM]: (p) => { D[T.DUNE](p); obj(p, (o) => { for (let y = 5; y < 16; y++) o.set(8 + Math.round(Math.sin(y / 3)), y, '#8a6238'); for (const [dx, dy] of [[-6, 2], [6, 2], [-5, -1], [5, -1], [0, -3]]) o.line(8, 4, 8 + dx, 4 + dy, '#4a8a3a'); o.rect(7, 4, 3, 2, '#5a3a20'); }, 0.25, 0.25); },
  [T.DESERT_ROCK]: (p) => { D[T.DUNE](p); obj(p, (o) => { o.ellipse(8, 10, 7, 5.5, '#b8875a'); o.rect(3, 11, 10, 3, '#a07448'); o.line(5, 7, 10, 8, '#c89a6a'); }); },
  [T.OAK]: (p) => { D[T.FOREST](p); obj(p, (o) => { o.rect(6, 10, 4, 6, '#5a4030'); o.ellipse(8, 6, 7.5, 6.5, '#2f6a32'); o.ellipse(5, 4, 3, 2, '#3f8040'); o.ellipse(11, 7, 2.5, 2, '#285a2a'); }); },
  [T.FOREST]: (p) => { fill(p, '#3a5a30'); tuft(p, 3, 6, '#2c4a26', '#4c7038'); tuft(p, 10, 12, '#2c4a26', '#4c7038'); p.set(12, 3, '#6a5a38'); p.set(5, 13, '#6a5a38'); },
  [T.MARBLE]: (p) => { fill(p, '#d8d4cc'); p.rect(0, 7, 16, 1, '#b8b4ac'); p.rect(7, 0, 1, 7, '#b8b4ac'); p.rect(11, 8, 1, 8, '#b8b4ac'); p.rect(0, 0, 16, 1, '#ecead4'); p.set(3, 3, '#c8c4bc'); },
  [T.CAVE]: (p) => { fill(p, '#3a3644'); p.rect(2, 5, 3, 1, '#2c2834'); p.rect(9, 11, 4, 1, '#2c2834'); p.set(12, 3, '#4a4656'); p.set(5, 13, '#4a4656'); },
  [T.CAVE_WALL]: (p) => { fill(p, '#24202c'); obj(p, (o) => { o.ellipse(5, 9, 5, 6, '#3c3648'); o.ellipse(12, 7, 4, 7, '#363042'); }, 0.2, 0.3); },
  [T.CRYSTAL]: (p) => { D[T.CAVE](p); obj(p, (o) => { o.rect(5, 6, 3, 9, '#8a5ad8'); o.rect(9, 3, 3, 12, '#6a4ac0'); o.set(6, 5, '#c8a8ff'); o.set(10, 2, '#c8a8ff'); }, 0.4, 0.3); },
  [T.ASH]: (p) => { fill(p, '#4a4444'); p.set(4, 4, '#5a5252'); p.set(11, 10, '#5a5252'); p.set(7, 13, '#3a3434'); p.set(13, 6, '#8a3a2a'); },
  [T.ASH2]: (p) => { fill(p, '#423c3c'); p.rect(3, 9, 4, 1, '#363030'); p.set(10, 4, '#5a5252'); p.set(2, 2, '#a04a2a'); },
  [T.CHARRED]: (p) => { D[T.ASH](p); obj(p, (o) => { o.rect(7, 4, 2, 12, '#1e1a1a'); o.line(8, 7, 3, 3, '#1e1a1a'); o.line(8, 6, 13, 2, '#1e1a1a'); }, 0.2, 0.2); },
  [T.MOUNTAIN]: (p) => { fill(p, '#5a5e6a'); obj(p, (o) => { for (let y = 0; y < 16; y++) { const w = Math.round(y * 0.6) + 2; o.rect(8 - w, y, w * 2, 1, '#6e7380'); } o.rect(6, 0, 4, 3, '#e8eef4'); o.rect(5, 3, 2, 1, '#e8eef4'); }, 0.25, 0.3); },
  [T.FIELD]: (p) => { fill(p, '#b89a48'); for (let x = 1; x < 16; x += 3) { p.rect(x, 2, 1, 12, '#d8bc60'); p.set(x, 1, '#e8d080'); p.set(x + 1, 8, '#9a7c38'); } },
  [T.RIVER]: (p) => { fill(p, '#356ea0'); p.rect(1, 4, 5, 1, '#5a96c8'); p.rect(8, 9, 6, 1, '#5a96c8'); p.rect(3, 13, 4, 1, '#2a5a86'); },
  [T.STATUE]: (p) => { D[T.FROZEN](p); obj(p, (o) => { o.ellipse(8, 3, 2.5, 2.5, '#9aa0a8'); o.rect(6, 6, 5, 6, '#8a9098'); o.rect(5, 7, 1, 4, '#8a9098'); o.rect(11, 6, 2, 1, '#8a9098'); o.rect(6, 12, 2, 4, '#7a8088'); o.rect(9, 12, 2, 3, '#7a8088'); }, 0.25, 0.3); },
  [T.REDWALL]: (p) => { bricks(p, '#5a2228', '#2a0e12', '#7a3036'); p.set(4, 4, '#c0303a'); p.set(12, 10, '#c0303a'); },
  [T.TENT]: (p) => { D[T.FOREST](p); obj(p, (o) => { for (let y = 2; y < 15; y++) { const w = Math.round((y - 2) * 0.55) + 1; o.rect(8 - w, y, w * 2, 1, '#8a7a5a'); } o.rect(7, 9, 2, 6, '#2a2420'); }, 0.3, 0.3); },
  [T.CAVE_GATE]: (p) => { fill(p, '#5a5e6a'); obj(p, (o) => { o.ellipse(8, 9, 8, 8, '#4a4e5a'); o.rect(0, 9, 16, 7, '#4a4e5a'); }, 0.25, 0.3); p.ellipse(8, 11, 5, 5.5, '#05050a'); p.rect(3, 11, 11, 5, '#05050a'); p.set(6, 8, '#8a5ad8'); p.set(10, 7, '#8a5ad8'); },
  [T.MINE]: (p) => { fill(p, '#5a5e6a'); obj(p, (o) => { o.rect(1, 2, 14, 14, '#6a4a30'); o.rect(1, 2, 14, 2, '#8a6238'); }, 0.25, 0.3); p.rect(4, 5, 8, 11, '#06070c'); p.rect(4, 5, 1, 11, '#5a4030'); p.rect(11, 5, 1, 11, '#5a4030'); },
  [T.SANDSTONE]: (p) => bricks(p, '#c8a070', '#9a7650', '#e0bc8a'),
  [T.RUIN_GRAY]: (p) => { D[T.FROZEN](p); obj(p, (o) => { o.rect(1, 4, 14, 12, '#8a8e96'); for (let x = 1; x < 15; x += 4) o.rect(x, 2, 2, 2, '#8a8e96'); o.rect(6, 9, 4, 7, '#5a5e66'); }, 0.25, 0.3); },
  [T.LAMP]: (p) => { cobble(p); obj(p, (o) => { o.rect(7, 5, 2, 11, '#2a2e3a'); o.rect(5, 1, 6, 5, '#2a2e3a'); }); p.rect(6, 2, 4, 3, '#f8d068'); p.rect(6, 2, 4, 1, '#fff2b0'); },
};

export function tilesetCanvas(): HTMLCanvasElement {
  const [c, ctx] = canvas(16 * TILE_COUNT, 16);
  for (let i = 0; i < TILE_COUNT; i++) {
    const p = new PB(16, 16);
    D[i]?.(p);
    p.draw(ctx, i * 16, 0);
  }
  return c;
}

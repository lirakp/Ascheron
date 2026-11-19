import { T } from '../gfx/tiles';
import { mulberry32 } from './state';

export const MW = 100, MH = 70;

export interface Building { x: number; y: number; w: number; h: number; roof: number; wall: number; label: string; service: string; }
export interface WorldMap {
  tiles: number[][];
  doors: Map<string, { service: string; label: string }>;
  signs: Map<string, string>;
  herbs: { id: string; x: number; y: number }[];
  labels: { x: number; y: number; text: string }[];
  town: { x0: number; y0: number; x1: number; y1: number };
  moorZone: { x0: number; y0: number; x1: number; y1: number };
  freeSpots: [number, number][];
}

export const BUILDINGS: Building[] = [
  { x: 17, y: 18, w: 9, h: 5, roof: T.ROOF_G, wall: T.HWALL, label: 'Abenteurergilde', service: 'gilde' },
  { x: 33, y: 17, w: 7, h: 6, roof: T.ROOF_B, wall: T.CHURCHWALL, label: 'Kapelle des Sanktuariums', service: 'kirche' },
  { x: 17, y: 27, w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Wechselstube des Konsortiums', service: 'konsortium' },
  { x: 34, y: 27, w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Schmied & Krämer', service: 'haendler' },
  { x: 17, y: 35, w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Gasthaus „Zur Krähe“', service: 'gasthaus' },
  { x: 38, y: 40, w: 4, h: 4, roof: T.ROOF_G, wall: T.HWALL, label: 'Die Rostige Münze', service: 'muenze' },
  { x: 25, y: 40, w: 6, h: 4, roof: T.ROOF_G, wall: T.HWALL, label: 'Waisenhaus', service: 'waisenhaus' },
  { x: 33, y: 34, w: 4, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Wohnhaus', service: 'haus' },
];

export function buildWorld(): WorldMap {
  const r = mulberry32(4242);
  const t: number[][] = [];
  for (let y = 0; y < MH; y++) { t.push([]); for (let x = 0; x < MW; x++) t[y].push(r() < 0.3 ? T.GRASS2 : T.GRASS); }
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < MW && y < MH) t[y][x] = v; };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < MW && y < MH ? t[y][x] : -1);
  const doors = new Map<string, { service: string; label: string }>();
  const signs = new Map<string, string>();
  const labels: { x: number; y: number; text: string }[] = [];

  // Küste im Westen
  for (let y = 0; y < MH; y++) {
    const edge = 7 + Math.round(Math.sin(y / 5) * 1.5 + Math.sin(y / 2.3) * 0.7);
    for (let x = 0; x < edge + 3; x++) set(x, y, x < edge - 3 ? T.DEEPSEA : x < edge ? T.SEA : T.SAND);
  }
  // Moor im Osten: Tümpel, Schilf, tote Bäume
  for (let y = 2; y < MH - 2; y++) for (let x = 48; x < MW - 2; x++) {
    const n = Math.sin(x / 4.1) * Math.cos(y / 3.7) + Math.sin((x + y) / 6.3) * 0.6;
    if (n > 1.05) set(x, y, T.BOG);
    else if (n > 0.85) set(x, y, T.REED);
    else if (r() < 0.025) set(x, y, T.DEADTREE);
    else if (r() < 0.04) set(x, y, T.REED);
  }
  // Wäldchen im Nordosten
  for (let y = 2; y < 18; y++) for (let x = 44; x < 70; x++) if (r() < 0.22) set(x, y, T.TREE);
  // Kreidehang im Südosten
  for (let y = 46; y < MH - 1; y++) for (let x = 70; x < MW - 1; x++) {
    const d = Math.hypot((x - 84) / 15, (y - 57) / 11);
    if (d < 1) set(x, y, r() < 0.12 ? T.CHALKROCK : T.CHALK);
  }
  set(82, 54, T.ENTRANCE); set(81, 54, T.CHALKROCK); set(83, 54, T.CHALKROCK); set(82, 53, T.CHALKROCK);
  labels.push({ x: 82, y: 52, text: 'Weißer Hang' });

  // Rand des Kartenausschnitts
  for (let x = 0; x < MW; x++) { if (get(x, 0) !== T.DEEPSEA) set(x, 0, T.TREE); if (get(x, MH - 1) !== T.DEEPSEA) set(x, MH - 1, T.TREE); }
  for (let y = 0; y < MH; y++) { set(MW - 1, y, T.TREE); }

  // Stadt Krähenfurt
  const town = { x0: 14, y0: 15, x1: 44, y1: 46 };
  for (let y = town.y0; y <= town.y1; y++) for (let x = town.x0; x <= town.x1; x++) {
    const border = x === town.x0 || x === town.x1 || y === town.y0 || y === town.y1;
    set(x, y, border ? T.PALISADE : r() < 0.4 ? T.GRASS2 : T.GRASS);
  }
  // Straßen
  for (let y = town.y0; y <= town.y1; y++) for (let x = 28; x <= 30; x++) set(x, y, T.COBBLE);
  for (let x = town.x0; x <= town.x1; x++) for (let y = 31; y <= 32; y++) set(x, y, T.COBBLE);
  for (let x = 16; x <= 42; x++) { set(x, 24, T.COBBLE); set(x, 39, T.COBBLE); }
  for (let y = 24; y <= 39; y++) { set(16, y, T.COBBLE); set(42, y, T.COBBLE); }
  // Marktplatz
  for (let y = 26; y <= 34; y++) for (let x = 25; x <= 33; x++) set(x, y, T.COBBLE);
  set(29, 29, T.WELL);
  set(26, 27, T.STALL); set(32, 27, T.STALL); set(26, 33, T.STALL);
  set(30, 33, T.GRATE); // Kanalisation
  set(27, 26, T.LAMP); set(31, 26, T.LAMP); set(27, 34, T.LAMP); set(31, 34, T.LAMP);
  labels.push({ x: 29, y: 25.3, text: 'Marktplatz' });
  // Tore
  for (const x of [28, 29, 30]) set(x, town.y0, T.COBBLE);
  for (const y of [31, 32]) { set(town.x1, y, T.COBBLE); set(town.x0, y, T.COBBLE); }
  for (const y of [town.y1]) for (const x of [28, 29, 30]) set(x, y, T.COBBLE);
  signs.set(`27,${town.y0 + 1}`, 'Nordtor. Dahinter der alte Turm – „Wer wartet, dem bleibt das Herz stehen.“');
  set(27, town.y0 + 1, T.SIGN);
  // Gebäude
  for (const b of BUILDINGS) {
    if (!b.w) continue;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const wallRow = y === b.y + b.h - 1;
      set(x, y, wallRow ? (x % 2 === 0 && b.wall === T.HWALL ? T.WINDOW : b.wall) : b.roof);
    }
    const dx = b.x + Math.floor(b.w / 2), dy = b.y + b.h - 1;
    set(dx, dy, T.DOOR);
    doors.set(`${dx},${dy}`, { service: b.service, label: b.label });
    // Weg zur Tür
    if (get(dx, dy + 1) !== T.COBBLE) set(dx, dy + 1, T.PATH);
    labels.push({ x: b.x + b.w / 2, y: b.y - 0.6, text: b.label });
  }
  // Zäune, Blumen
  for (let x = 33; x <= 39; x++) if (get(x, 23) !== T.COBBLE && get(x, 23) !== T.PATH) set(x, 23, T.FLOWER);
  for (let x = 17; x <= 23; x++) if (get(x, 44) === T.GRASS || get(x, 44) === T.GRASS2) set(x, 44, T.FENCE);

  // Straße nach Norden zum Nordtor
  for (let y = 3; y < town.y0; y++) for (let x = 29; x <= 30; x++) set(x, y, T.PATH);
  // Ruinen um den Nordtor-Dungeon
  for (let x = 24; x <= 36; x++) { if (x < 28 || x > 31) { set(x, 2, T.RUIN); set(x, 8, x % 3 ? T.RUIN : T.GRASS); } }
  for (let y = 2; y <= 8; y++) { set(24, y, y % 4 ? T.RUIN : T.GRASS2); set(36, y, T.RUIN); }
  set(30, 4, T.ENTRANCE); set(29, 4, T.RUIN); set(31, 4, T.RUIN); set(30, 3, T.RUIN); set(29, 3, T.RUIN); set(31, 3, T.RUIN);
  labels.push({ x: 30, y: 1.6, text: 'Nordtor-Turm' });
  // Straße nach Osten ins Moor
  for (let x = town.x1; x < MW - 4; x++) { const yy = 31 + Math.round(Math.sin(x / 7) * 2); set(x, yy, T.PATH); set(x, yy + 1, T.PATH); if (get(x, yy - 1) === T.BOG) set(x, yy - 1, T.REED); if (get(x, yy + 2) === T.BOG) set(x, yy + 2, T.REED); }
  set(MW - 4, 30, T.SIGN); signs.set(`${MW - 4},30`, 'Nach Eschenwacht. Die Grenze ist wegen der Elfenjagd gesperrt. (Weitere Reiche folgen.)');
  for (let y = 26; y < 38; y++) set(MW - 3, y, T.ROCK);
  // Weg zum Kreidehang
  for (let y = 33; y < 54; y++) { const xx = 80 + Math.round(Math.sin(y / 4) * 1.5); set(xx, y, T.PATH); set(xx + 1, y, T.PATH); }
  for (let y = 53; y < 56; y++) for (let x = 79; x <= 85; x++) if (get(x, y) === T.CHALK || get(x, y) === T.CHALKROCK) if (!(x === 82 && y === 54) && !(y === 53 && x === 82) && x !== 81 && x !== 83) set(x, y, T.CHALK);
  set(82, 55, T.CHALK); set(82, 53, T.CHALKROCK);
  // Straße nach Süden & Westen
  for (let y = town.y1; y < MH - 1; y++) for (let x = 28; x <= 29; x++) set(x, y, T.PATH);
  for (let x = 9; x < town.x0; x++) { set(x, 31, T.PATH); set(x, 32, T.PATH); }
  for (let x = 6; x <= 9; x++) { set(x, 31, T.PLANK); set(x, 32, T.PLANK); }
  set(11, 30, T.SIGN); signs.set('11,30', 'Steg nach Schlackenhafen – Hochburg der Rostigen Münze. (Weitere Orte folgen.)');
  set(29, MH - 3, T.SIGN); signs.set(`29,${MH - 3}`, 'Nach Aurelsfeste, Sitz des Sanktuariums. Die Straße ist nach dem letzten Ausbruch unpassierbar. (Folgt.)');
  labels.push({ x: 70, y: 28.5, text: 'Moore von Rabenmark' });

  // Kräuter im Moor
  const herbs: { id: string; x: number; y: number }[] = [];
  const freeSpots: [number, number][] = [];
  const hr = mulberry32(77);
  let tries = 0;
  while (herbs.length < 16 && tries++ < 5000) {
    const x = 47 + Math.floor(hr() * 48), y = 4 + Math.floor(hr() * 60);
    if (get(x, y) === T.GRASS || get(x, y) === T.GRASS2) herbs.push({ id: `h${x}_${y}`, x, y });
  }
  for (let y = 5; y < MH - 5; y++) for (let x = 50; x < MW - 6; x++) if ((get(x, y) === T.GRASS || get(x, y) === T.GRASS2) && get(x, y + 1) !== T.BOG) freeSpots.push([x, y]);
  return { tiles: t, doors, signs, herbs, labels, town, moorZone: { x0: 47, y0: 3, x1: 95, y1: 66 }, freeSpots };
}

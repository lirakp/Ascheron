// Kartengenerator für alle Reiche außer Rabenmark (siehe worldmap.ts).
import { T, isSolid } from '../gfx/tiles';
import { mulberry32 } from './state';
import type { RegionId } from '../data/regions';
import { MW, MH, WorldMap, Exit } from './worldmap';

type Setter = (x: number, y: number, v: number) => void;

interface BDef { w: number; h: number; roof: number; wall: number; label: string; service: string }

export function emptyMap(): Omit<WorldMap, 'tiles'> {
  return { doors: new Map(), signs: new Map(), herbs: [], labels: [], town: { x0: -1, y0: -1, x1: -1, y1: -1 }, moorZone: { x0: 0, y0: 0, x1: 0, y1: 0 }, freeSpots: [], towns: [], areas: [], exits: [], spawns: {}, lore: new Map(), npcSpots: [] };
}

/** Baut eine Stadt mit zwei Straßen, Marktplatz und Gebäuden (Türen zur Straße). */
function town(m: WorldMap, set: Setter, o: { name: string; x0: number; y0: number; w: number; h: number; wall: number; ground: number; street: number; buildings: BDef[]; gates: ('n' | 's' | 'w' | 'e')[] }): void {
  const { x0, y0, w, h } = o;
  const x1 = x0 + w - 1, y1 = y0 + h - 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? o.wall : o.ground);
  const midY = y0 + Math.floor(h / 2), cx = x0 + Math.floor(w / 2);
  const streetA = midY, streetB = y1 - 2;
  for (let x = x0 + 1; x < x1; x++) { set(x, streetA, o.street); set(x, streetA + 1, o.street); set(x, streetB, o.street); }
  for (let y = y0 + 1; y < y1; y++) { set(cx, y, o.street); set(cx + 1, y, o.street); }
  for (const g of o.gates) {
    if (g === 'w') { set(x0, streetA, o.street); set(x0, streetA + 1, o.street); }
    if (g === 'e') { set(x1, streetA, o.street); set(x1, streetA + 1, o.street); }
    if (g === 'n') { set(cx, y0, o.street); set(cx + 1, y0, o.street); }
    if (g === 's') { set(cx, y1, o.street); set(cx + 1, y1, o.street); }
  }
  // Gebäude: obere Reihe endet über Straße A, untere Reihe endet über Straße B
  const rows: [number, number][] = [[streetA - 1, x0 + 2], [streetB - 1, x0 + 2]];
  let row = 0;
  for (const b of o.buildings) {
    let [bottom, bx] = rows[row];
    if (bx + b.w > x1 - 1 || (bx <= cx + 1 && bx + b.w > cx)) {
      if (bx <= cx + 1 && bx + b.w > cx && bx + b.w <= x1 - 1) { bx = cx + 3; }
      if (bx + b.w > x1 - 1) { row++; if (row >= rows.length) break; [bottom, bx] = rows[row]; }
    }
    const top = bottom - b.h + 1;
    if (top <= y0 + (row === 0 ? 0 : 1)) continue;
    for (let y = top; y <= bottom; y++) for (let x = bx; x < bx + b.w; x++) set(x, y, y === bottom ? (x % 2 === 0 && b.wall === T.HWALL ? T.WINDOW : b.wall) : b.roof);
    const dx = bx + Math.floor(b.w / 2);
    set(dx, bottom, T.DOOR);
    m.doors.set(`${dx},${bottom}`, { service: b.service, label: b.label });
    m.labels.push({ x: bx + b.w / 2, y: top - 0.6, text: b.label });
    rows[row][1] = bx + b.w + 1;
  }
  m.towns.push({ name: o.name, x0, y0, x1, y1 });
  m.labels.push({ x: cx + 1, y: y0 - 0.8, text: o.name });
  for (let i = 0; i < 6; i++) m.npcSpots.push([cx - 4 + i * 2, streetA + (i % 2)]);
}

function road(set: Setter, get: (x: number, y: number) => number, a: [number, number], b: [number, number], tile: number, keep: number[] = []): void {
  const [ax, ay] = a, [bx, by] = b;
  const put = (x: number, y: number) => { const t = get(x, y); if (t === T.DOOR || keep.includes(t)) return; set(x, y, tile); set(x + 1, y, tile); };
  for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) put(x, ay);
  for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) put(bx, y);
}

function exitRect(m: WorldMap, side: 'n' | 's' | 'w' | 'e', at: number, to: RegionId, label: string): [number, number] {
  let e: Exit;
  let entry: [number, number];
  if (side === 'w') { e = { x0: 0, y0: at - 2, x1: 1, y1: at + 2, to, label }; entry = [4, at]; }
  else if (side === 'e') { e = { x0: MW - 2, y0: at - 2, x1: MW - 1, y1: at + 2, to, label }; entry = [MW - 5, at]; }
  else if (side === 'n') { e = { x0: at - 2, y0: 0, x1: at + 2, y1: 1, to, label }; entry = [at, 4]; }
  else { e = { x0: at - 2, y0: MH - 2, x1: at + 2, y1: MH - 1, to, label }; entry = [at, MH - 5]; }
  m.exits.push(e);
  m.spawns[to] = entry;
  m.labels.push({ x: (e.x0 + e.x1) / 2 + (side === 'w' ? 3 : side === 'e' ? -3 : 0), y: (e.y0 + e.y1) / 2 + (side === 'n' ? 3 : side === 's' ? -3 : 0), text: '→ ' + label });
  return entry;
}

function base(fill: (x: number, y: number, r: () => number) => number, seed: number): { m: WorldMap; set: Setter; get: (x: number, y: number) => number; r: () => number } {
  const r = mulberry32(seed);
  const tiles: number[][] = [];
  for (let y = 0; y < MH; y++) { tiles.push([]); for (let x = 0; x < MW; x++) tiles[y].push(fill(x, y, r)); }
  const m = { ...emptyMap(), tiles } as WorldMap;
  const set: Setter = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y][x] = v; };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < MW && y < MH ? tiles[y][x] : -1);
  return { m, set, get, r };
}

function border(set: Setter, tile: number): void {
  for (let x = 0; x < MW; x++) { set(x, 0, tile); set(x, MH - 1, tile); }
  for (let y = 0; y < MH; y++) { set(0, y, tile); set(MW - 1, y, tile); }
}
function clearExits(m: WorldMap, set: Setter, tile: number): void {
  for (const e of m.exits) for (let y = e.y0; y <= e.y1; y++) for (let x = e.x0; x <= e.x1; x++) set(x, y, tile);
}
function finish(m: WorldMap, walkable: number[], herbTile: number[] = walkable): WorldMap {
  const inTown = (x: number, y: number) => m.towns.some((t) => x >= t.x0 - 1 && x <= t.x1 + 1 && y >= t.y0 - 1 && y <= t.y1 + 1);
  for (let y = 3; y < MH - 3; y++) for (let x = 3; x < MW - 3; x++) {
    const t = m.tiles[y][x];
    if (walkable.includes(t) && !inTown(x, y) && !isSolid(m.tiles[y + 1][x])) m.freeSpots.push([x, y]);
  }
  const hr = mulberry32(MW * 7 + m.freeSpots.length);
  for (let i = 0; i < 10 && m.freeSpots.length; i++) {
    const [x, y] = m.freeSpots[Math.floor(hr() * m.freeSpots.length)];
    if (herbTile.includes(m.tiles[y][x])) m.herbs.push({ id: `h${x}_${y}`, x, y });
  }
  return m;
}

// ---------------------------------------------------------------- Schlackenhafen
function schlackenhafen(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => (x < 22 || y > 56 ? (x < 16 || y > 62 ? T.DEEPSEA : T.SEA) : rr() < 0.3 ? T.GRASS2 : T.PATH), 501);
  // Docks
  for (let x = 10; x < 30; x++) for (const y of [24, 25, 40, 41]) set(x, y, T.PLANK);
  for (let y = 44; y < 60; y++) for (const x of [40, 41, 62, 63]) set(x, y, T.PLANK);
  town(m, set, { name: 'Schlackenhafen', x0: 28, y0: 14, w: 46, h: 30, wall: T.PALISADE, ground: T.PATH, street: T.COBBLE, gates: ['e', 'w', 's'], buildings: [
    { w: 9, h: 5, roof: T.ROOF_G, wall: T.HWALL, label: 'Die Rostige Münze (Zentrale)', service: 'muenze' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Gasthaus „Zum Teerfass“', service: 'gasthaus' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Krämer & Seilerei', service: 'haendler' },
    { w: 8, h: 4, roof: T.ROOF_G, wall: T.HWALL, label: 'Die Käfige', service: 'sklavenmarkt' },
    { w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Wechselstube', service: 'konsortium' },
  ] });
  for (let x = 74; x < MW; x++) { set(x, 29, T.PATH); set(x, 30, T.PATH); }
  exitRect(m, 'e', 30, 'rabenmark', 'Rabenmark');
  border(set, T.DEEPSEA); clearExits(m, set, T.PATH);
  for (let y = 2; y < MH - 2; y++) for (let x = 76; x < MW - 2; x++) if (get(x, y) === T.GRASS2 && r() < 0.06) set(x, y, T.DEADTREE);
  m.areas.push({ name: 'Die Docks', x: 20, y: 32, r: 10 });
  m.lore.set('20,24', 'Ein Käfig auf dem Steg, leer. Im Holz eingeritzt: ein Name in elfischer Schrift und darunter, kleiner: „Goldwacht“.');
  return finish(m, [T.PATH, T.GRASS2]);
}

// ---------------------------------------------------------------- Aurelsfeste
function aurelsfeste(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => { const f = Math.sin(x / 6) * Math.cos(y / 5); return f > 0.55 ? T.FIELD : rr() < 0.25 ? T.GRASS2 : T.GRASS; }, 502);
  // Fluss von Nord nach Süd mit Brücke
  for (let y = 0; y < MH; y++) { const x = 70 + Math.round(Math.sin(y / 7) * 3); set(x, y, T.RIVER); set(x + 1, y, T.RIVER); }
  for (let i = 0; i < 40; i++) set(Math.floor(r() * MW), Math.floor(r() * MH), T.TREE);
  town(m, set, { name: 'Lumenhall', x0: 34, y0: 18, w: 30, h: 26, wall: T.WALL, ground: T.MARBLE, street: T.MARBLE, gates: ['w', 'e', 'n', 's'], buildings: [
    { w: 9, h: 6, roof: T.ROOF_B, wall: T.CHURCHWALL, label: 'Kathedrale des Lichts', service: 'kirche' },
    { w: 8, h: 5, roof: T.ROOF_G, wall: T.HWALL, label: 'Gildenzentrale', service: 'gilde' },
    { w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Konsortium', service: 'konsortium' },
    { w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Pilgerbedarf', service: 'haendler' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Herberge „Zum Lichtstrahl“', service: 'gasthaus' },
    { w: 6, h: 4, roof: T.ROOF_B, wall: T.CHURCHWALL, label: 'Katakomben', service: 'katakomben' },
  ] });
  const c: [number, number] = [48, 31];
  for (const [side, at, to, label] of [['w', 31, 'rabenmark', 'Rabenmark'], ['e', 31, 'eschenwacht', 'Eschenwacht'], ['n', 49, 'kaldrion', 'Kaldrion'], ['s', 49, 'veyrath', 'Veyrath']] as const) {
    const entry = exitRect(m, side, at, to, label);
    road(set, get, entry, c, T.PATH, [T.MARBLE, T.WALL, T.CHURCHWALL, T.HWALL, T.WINDOW, T.ROOF_B, T.ROOF_G, T.ROOF_R]);
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (get(x, y) === T.PATH && (get(x - 1, y) === T.RIVER || get(x + 2, y) === T.RIVER)) { /* */ }
  for (let x = 66; x < 76; x++) { if (get(x, 31) === T.RIVER) set(x, 31, T.PLANK); if (get(x, 32) === T.RIVER) set(x, 32, T.PLANK); }
  border(set, T.TREE); clearExits(m, set, T.PATH);
  m.areas.push({ name: 'Pilgerweg', x: 20, y: 31, r: 10 }, { name: 'Weizenfelder', x: 20, y: 55, r: 14 });
  m.lore.set('48,10', 'Ein Kraterrand, frisch geläutert. Die Erde ist weiß wie Asche. Auf einem Pfahl: „Geläutert durch das Sanktuarium. Spende: 500 Gold.“');
  set(48, 10, T.SIGN);
  return finish(m, [T.GRASS, T.GRASS2, T.FIELD]);
}

// ---------------------------------------------------------------- Kaldrion
function kaldrion(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => { const n = Math.sin(x / 5.3) * Math.cos(y / 4.1) + Math.sin((x + y) / 9); return n > 1.15 ? T.MOUNTAIN : n > 0.75 && rr() < 0.5 ? T.PINE : rr() < 0.3 ? T.SNOW2 : T.SNOW; }, 503);
  for (let y = 44; y < 56; y++) for (let x = 12; x < 28; x++) if (Math.hypot((x - 20) / 8, (y - 50) / 6) < 1) set(x, y, T.ICE);
  town(m, set, { name: 'Frosthald', x0: 36, y0: 34, w: 28, h: 22, wall: T.WALL, ground: T.SNOW2, street: T.COBBLE, gates: ['s', 'n', 'e', 'w'], buildings: [
    { w: 8, h: 5, roof: T.ROOF_G, wall: T.HWALL, label: 'Abenteurergilde', service: 'gilde' },
    { w: 7, h: 5, roof: T.ROOF_B, wall: T.CHURCHWALL, label: 'Kapelle', service: 'kirche' },
    { w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Pelze & Proviant', service: 'haendler' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Gasthaus „Eiszapfen“', service: 'gasthaus' },
  ] });
  // Eisenherz: Zwergenbinge im Gebirge (Westen)
  for (let y = 8; y < 26; y++) for (let x = 4; x < 26; x++) set(x, y, Math.hypot((x - 15) / 11, (y - 17) / 9) < 1 ? T.CAVE : T.MOUNTAIN);
  for (let x = 11; x < 20; x++) { set(x, 14, T.ROOF_G); set(x, 15, T.ROOF_G); set(x, 16, x % 2 ? T.WALL : T.WINDOW); }
  set(15, 16, T.DOOR); m.doors.set('15,16', { service: 'zwergenschmiede', label: 'Eisenherz – Zwergenschmiede' });
  for (let x = 20; x < 26; x++) { set(x, 20, T.CAVE); set(x, 21, T.CAVE); }
  m.labels.push({ x: 15, y: 12.4, text: 'Eisenherz' });
  m.towns.push({ name: 'Eisenherz', x0: 5, y0: 9, x1: 25, y1: 25 });
  // Mine & Höhle zu den Nachtklüften
  set(80, 18, T.MINE); m.labels.push({ x: 80, y: 16.4, text: 'Verlassene Mine' });
  set(50, 8, T.CAVE_GATE); m.labels.push({ x: 50, y: 6.4, text: '→ Nachtklüfte' });
  m.exits.push({ x0: 50, y0: 8, x1: 50, y1: 8, to: 'nachtkluefte', label: 'Die Nachtklüfte' }); m.spawns.nachtkluefte = [50, 10];
  const c: [number, number] = [49, 44];
  for (const [side, at, to, label] of [['s', 49, 'aurelsfeste', 'Aurelsfeste'], ['e', 40, 'erstarrt', 'Erstarrte Lande']] as const) road(set, get, exitRect(m, side, at, to, label), c, T.PATH, [T.COBBLE, T.WALL, T.HWALL, T.WINDOW, T.ROOF_B, T.ROOF_G, T.ROOF_R, T.CHURCHWALL]);
  road(set, get, [26, 21], c, T.PATH, [T.COBBLE, T.WALL, T.HWALL, T.WINDOW, T.ROOF_G, T.ROOF_R, T.CHURCHWALL, T.ROOF_B]);
  road(set, get, [80, 19], c, T.PATH, [T.COBBLE, T.WALL, T.HWALL, T.WINDOW, T.ROOF_G, T.ROOF_R, T.CHURCHWALL, T.ROOF_B]);
  road(set, get, [50, 9], c, T.PATH, [T.COBBLE, T.WALL, T.HWALL, T.WINDOW, T.ROOF_G, T.ROOF_R, T.CHURCHWALL, T.ROOF_B]);
  border(set, T.MOUNTAIN); clearExits(m, set, T.PATH); set(50, 8, T.CAVE_GATE);
  m.areas.push({ name: 'Eisenherz', x: 15, y: 17, r: 9 }, { name: 'Frostsee', x: 20, y: 50, r: 9 }, { name: 'Östliche Pässe', x: 85, y: 40, r: 12 });
  void r;
  return finish(m, [T.SNOW, T.SNOW2]);
}

// ---------------------------------------------------------------- Veyrath
function veyrath(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => (y > 60 ? (y > 64 ? T.DEEPSEA : T.SEA) : y > 57 ? T.SAND : rr() < 0.4 ? T.DUNE2 : T.DUNE), 504);
  for (let i = 0; i < 50; i++) { const x = Math.floor(r() * MW), y = Math.floor(r() * 56); set(x, y, r() < 0.5 ? T.DESERT_ROCK : T.PALM); }
  for (const [ox, oy] of [[18, 20], [82, 16], [75, 45]]) { for (let y = oy - 3; y <= oy + 3; y++) for (let x = ox - 4; x <= ox + 4; x++) if (Math.hypot((x - ox) / 4, (y - oy) / 3) < 0.7) set(x, y, T.SEA); else if (Math.hypot((x - ox) / 5, (y - oy) / 4) < 1) set(x, y, r() < 0.5 ? T.PALM : T.GRASS); }
  town(m, set, { name: 'Goldwacht', x0: 34, y0: 30, w: 32, h: 26, wall: T.SANDSTONE, ground: T.SAND, street: T.COBBLE, gates: ['n', 's', 'w'], buildings: [
    { w: 9, h: 5, roof: T.ROOF_R, wall: T.HWALL, label: 'Konsortium (Zentrale)', service: 'konsortium' },
    { w: 8, h: 5, roof: T.ROOF_G, wall: T.HWALL, label: 'Abenteurergilde', service: 'gilde' },
    { w: 9, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Großer Sklavenmarkt', service: 'sklavenmarkt' },
    { w: 6, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Basar', service: 'haendler' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Karawanserei', service: 'gasthaus' },
  ] });
  for (let y = 56; y < 62; y++) for (const x of [48, 49]) set(x, y, T.PLANK);
  set(22, 40, T.ENTRANCE); m.labels.push({ x: 22, y: 38.4, text: 'Versunkene Zisterne' });
  const c: [number, number] = [49, 43];
  for (const [side, at, to, label] of [['n', 49, 'aurelsfeste', 'Aurelsfeste'], ['w', 30, 'rabenmark', 'Rabenmark']] as const) road(set, get, exitRect(m, side, at, to, label), c, T.PATH, [T.COBBLE, T.SANDSTONE, T.HWALL, T.WINDOW, T.ROOF_G, T.ROOF_R]);
  road(set, get, [22, 41], c, T.PATH, [T.COBBLE, T.SANDSTONE, T.HWALL, T.WINDOW, T.ROOF_G, T.ROOF_R]);
  border(set, T.DESERT_ROCK); clearExits(m, set, T.PATH);
  m.areas.push({ name: 'Oase', x: 18, y: 20, r: 6 }, { name: 'Oase', x: 82, y: 16, r: 6 }, { name: 'Hafen von Goldwacht', x: 49, y: 59, r: 6 });
  return finish(m, [T.DUNE, T.DUNE2]);
}

// ---------------------------------------------------------------- Eschenwacht
function eschenwacht(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => { const n = Math.sin(x / 4.3) * Math.cos(y / 3.9) + Math.sin((x - y) / 7); return n > 0.6 ? T.OAK : rr() < 0.1 ? T.OAK : rr() < 0.3 ? T.GRASS2 : T.FOREST; }, 505);
  for (let y = 0; y < MH; y++) { const x = 28 + Math.round(Math.sin(y / 6) * 3); set(x, y, T.RIVER); set(x + 1, y, T.RIVER); }
  town(m, set, { name: 'Dornwall', x0: 56, y0: 24, w: 28, h: 22, wall: T.WALL, ground: T.FOREST, street: T.COBBLE, gates: ['w', 'e'], buildings: [
    { w: 8, h: 5, roof: T.ROOF_G, wall: T.HWALL, label: 'Abenteurergilde', service: 'gilde' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Ausrüster', service: 'haendler' },
    { w: 7, h: 4, roof: T.ROOF_R, wall: T.HWALL, label: 'Gasthaus „Zur Axt“', service: 'gasthaus' },
    { w: 7, h: 4, roof: T.ROOF_G, wall: T.HWALL, label: 'Kopfgeldstube', service: 'kopfgeld' },
  ] });
  for (const [x, y] of [[15, 15], [40, 55], [88, 58]]) { set(x, y, T.TENT); set(x + 2, y, T.TENT); }
  set(14, 52, T.THORN_GATE); m.labels.push({ x: 14, y: 50.4, text: 'Der Ahnenhain' });
  set(44, 6, T.CAVE_GATE); m.labels.push({ x: 44, y: 4.4, text: '→ Nachtklüfte' });
  m.exits.push({ x0: 44, y0: 6, x1: 44, y1: 6, to: 'nachtkluefte', label: 'Die Nachtklüfte' }); m.spawns.nachtkluefte = [44, 8];
  const c: [number, number] = [69, 35];
  const keep = [T.COBBLE, T.WALL, T.HWALL, T.WINDOW, T.ROOF_G, T.ROOF_R];
  for (const [side, at, to, label] of [['w', 35, 'aurelsfeste', 'Aurelsfeste'], ['e', 35, 'dornenreich', 'Aschfeld']] as const) road(set, get, exitRect(m, side, at, to, label), c, T.PATH, keep);
  road(set, get, [14, 53], c, T.PATH, keep); road(set, get, [44, 7], c, T.PATH, keep);
  for (let y = 0; y < MH; y++) for (let x = 24; x < 34; x++) if (get(x, y) === T.PATH && (get(x, y - 1) === T.RIVER || get(x, y + 1) === T.RIVER || get(x - 1, y) === T.RIVER)) set(x, y, T.PLANK);
  for (let x = 24; x < 34; x++) for (let y = 0; y < MH; y++) if (get(x, y) === T.RIVER && (get(x - 1, y) === T.PATH || get(x - 1, y) === T.PLANK || get(x + 1, y) === T.PATH || get(x + 1, y) === T.PLANK)) set(x, y, T.PLANK);
  border(set, T.OAK); clearExits(m, set, T.PATH); set(44, 6, T.CAVE_GATE);
  m.areas.push({ name: 'Jägerlager', x: 15, y: 15, r: 5 }, { name: 'Gerodete Lichtung', x: 40, y: 55, r: 6 });
  void r;
  return finish(m, [T.FOREST, T.GRASS2]);
}

// ---------------------------------------------------------------- Nachtklüfte
function nachtkluefte(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => { const n = Math.sin(x / 3.7) * Math.cos(y / 3.3) + Math.sin((x * 1.3 + y) / 6); return n > 0.7 ? T.CAVE_WALL : n > 0.6 && rr() < 0.4 ? T.CRYSTAL : T.CAVE; }, 506);
  // Leere Höhlenstädte
  for (const [ox, oy, name] of [[30, 30, 'Myr’Thalas'], [72, 44, 'Vael Doran']] as const) {
    for (let y = oy - 7; y <= oy + 7; y++) for (let x = ox - 10; x <= ox + 10; x++) set(x, y, T.CAVE);
    for (let i = 0; i < 9; i++) { const bx = ox - 9 + (i % 3) * 7, by = oy - 6 + Math.floor(i / 3) * 5; for (let x = bx; x < bx + 4; x++) { set(x, by, T.RUIN); set(x, by + 1, r() < 0.5 ? T.RUIN : T.CAVE); } }
    m.labels.push({ x: ox, y: oy - 8.4, text: name });
    m.areas.push({ name, x: ox, y: oy, r: 10 });
  }
  set(30, 30, T.STATUE); m.lore.set('30,30', 'Ein Schrein aus schwarzem Stein. Darauf, in dunkelelfischer Schrift: „Wir haben den Schatten nicht gewählt. Er hat uns gewählt.“ Daneben frische Blumen. Jemand kommt noch hierher.');
  set(72, 47, T.ENTRANCE); m.labels.push({ x: 72, y: 49.6, text: 'Die Leere Stadt' });
  const keep = [T.RUIN, T.STATUE];
  for (const [side, at, to, label] of [['n', 50, 'kaldrion', 'Kaldrion'], ['s', 50, 'eschenwacht', 'Eschenwacht']] as const) road(set, get, exitRect(m, side, at, to, label), [50, 35], T.CAVE, keep);
  road(set, get, [30, 31], [50, 35], T.CAVE, keep); road(set, get, [72, 46], [50, 35], T.CAVE, keep);
  border(set, T.CAVE_WALL); clearExits(m, set, T.CAVE);
  return finish(m, [T.CAVE]);
}

// ---------------------------------------------------------------- Erstarrte Lande
function erstarrt(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => (rr() < 0.05 ? T.FROZEN_TREE : T.FROZEN), 507);
  // Valmor: Ruinen mit erstarrten Menschen
  for (let y = 18; y < 52; y++) for (let x = 40; x < 80; x++) if (Math.hypot((x - 60) / 20, (y - 35) / 17) < 1) set(x, y, r() < 0.12 ? T.RUIN_GRAY : T.FROZEN);
  const statues: [number, number, string][] = [
    [55, 30, 'Eine Frau, mitten im Lauf erstarrt, ein Kind auf dem Arm. Ihr Mund ist offen. Seit vierhundert Jahren ruft sie einen Namen.'],
    [63, 33, 'Ein Bäcker, der Brot aus dem Ofen zieht. Das Brot ist noch warm. Es wird immer warm sein.'],
    [58, 40, 'Ein Soldat, das Schwert halb gezogen, den Blick nach Norden. Was er dort sah, steht ihm noch im Gesicht.'],
    [66, 38, 'Ein alter König auf einem Balkon aus Stein. Nein – nur eine Statue des Königs. Darunter: „Valmor vergeht nie.“ Jemand hat „nie“ zerkratzt.'],
    [52, 36, 'Ein Mädchen, das eine Motte fangen will. Die Motte ist das Einzige, das sich bewegt.'],
  ];
  for (const [x, y, text] of statues) { set(x, y, T.STATUE); m.lore.set(`${x},${y}`, text); }
  set(60, 35, T.ENTRANCE); m.labels.push({ x: 60, y: 33.4, text: 'Der Graue Brunnen' });
  m.labels.push({ x: 60, y: 17, text: 'Valmor' });
  m.areas.push({ name: 'Valmor', x: 60, y: 35, r: 18 });
  road(set, get, exitRect(m, 'w', 35, 'kaldrion', 'Kaldrion'), [60, 36], T.FROZEN, [T.STATUE, T.ENTRANCE]);
  border(set, T.FROZEN_TREE); clearExits(m, set, T.FROZEN);
  return finish(m, [T.FROZEN]);
}

// ---------------------------------------------------------------- Das Eiserne Dornenreich
function dornenreich(): WorldMap {
  const { m, set, get, r } = base((x, y, rr) => (rr() < 0.05 ? T.CHARRED : rr() < 0.4 ? T.ASH2 : T.ASH), 508);
  town(m, set, { name: 'Dornfeste', x0: 52, y0: 18, w: 34, h: 30, wall: T.REDWALL, ground: T.ASH2, street: T.COBBLE, gates: ['w'], buildings: [
    { w: 10, h: 6, roof: T.ROOF_G, wall: T.REDWALL, label: 'Thronsaal der Königin', service: 'koenigin' },
    { w: 8, h: 4, roof: T.ROOF_G, wall: T.REDWALL, label: 'Waffenkammer', service: 'waffenkammer' },
    { w: 8, h: 4, roof: T.ROOF_G, wall: T.REDWALL, label: 'Kaserne', service: 'kaserne' },
  ] });
  for (let i = 0; i < 12; i++) { const x = 20 + Math.floor(r() * 25), y = 10 + Math.floor(r() * 50); set(x, y, T.HEDGE); set(x + 1, y, T.ROSEBED); }
  road(set, get, exitRect(m, 'w', 33, 'eschenwacht', 'Eschenwacht'), [68, 33], T.PATH, [T.COBBLE, T.REDWALL, T.ROOF_G]);
  border(set, T.CHARRED); clearExits(m, set, T.PATH);
  m.areas.push({ name: 'Das Aschfeld', x: 30, y: 35, r: 25 });
  return finish(m, [T.ASH, T.ASH2]);
}

const BUILDERS: Partial<Record<RegionId, () => WorldMap>> = { schlackenhafen, aurelsfeste, kaldrion, veyrath, eschenwacht, nachtkluefte, erstarrt, dornenreich };
const cache = new Map<RegionId, WorldMap>();
export function buildRegionMap(id: RegionId): WorldMap | null {
  const b = BUILDERS[id];
  if (!b) return null;
  if (!cache.has(id)) cache.set(id, b());
  const c = cache.get(id)!;
  return { ...c, tiles: c.tiles.map((row) => [...row]) };
}

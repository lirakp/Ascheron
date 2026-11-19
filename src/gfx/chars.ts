import type { Appearance } from '../data/types';
import { RACES } from '../data/races';
import { PB, shade, canvas } from './pixel';

export const CW = 16, CH = 24;
// Richtungen: 0 unten, 1 links, 2 rechts, 3 oben – je 3 Frames (Stand, Schritt A, Schritt B)

export function bodyMetrics(a: Appearance) {
  const short = RACES[a.race].short_stature;
  const hy = short ? 5 : 2;
  const by = hy + 8;
  const bh = short ? 5 : 6;
  let half = a.build === 'schmal' ? 3 : a.build === 'normal' ? 4 : 5;
  if (short) half = Math.min(5, half + 1);
  return { short, hy, by, bh, half, ly: by + bh };
}

function drawAnimalEars(p: PB, a: Appearance, hy: number, dir: number): void {
  const fur = a.hair, inner = shade(a.skin, 0.25);
  const L = (pts: [number, number][], c: string) => pts.forEach(([x, y]) => p.set(x, y, c));
  const side = dir === 1 || dir === 2;
  const ears: Record<string, () => void> = {
    wolf: () => { if (side) { L([[8, hy - 1], [9, hy - 1], [9, hy - 2], [8, hy - 2], [9, hy - 3]], fur); p.set(8, hy - 1, inner); } else { L([[4, hy - 1], [5, hy - 1], [4, hy - 2], [5, hy - 2], [4, hy - 3], [10, hy - 1], [11, hy - 1], [10, hy - 2], [11, hy - 2], [11, hy - 3]], fur); if (dir === 0) { p.set(5, hy - 1, inner); p.set(10, hy - 1, inner); } } },
    fuchs: () => { if (side) { L([[8, hy - 1], [9, hy - 1], [10, hy - 1], [8, hy - 2], [9, hy - 2], [9, hy - 3], [9, hy - 4]], fur); p.set(9, hy - 2, inner); } else { L([[3, hy], [4, hy - 1], [5, hy - 1], [3, hy - 1], [4, hy - 2], [3, hy - 2], [4, hy - 3], [3, hy - 4], [12, hy], [11, hy - 1], [10, hy - 1], [12, hy - 1], [11, hy - 2], [12, hy - 2], [11, hy - 3], [12, hy - 4]], fur); if (dir === 0) { p.set(4, hy - 1, inner); p.set(11, hy - 1, inner); p.set(4, hy - 2, '#f4efe6'); p.set(11, hy - 2, '#f4efe6'); } } },
    katze: () => { if (side) { L([[8, hy - 1], [9, hy - 1], [9, hy - 2]], fur); } else { L([[4, hy - 1], [5, hy - 1], [4, hy - 2], [10, hy - 1], [11, hy - 1], [11, hy - 2]], fur); if (dir === 0) { p.set(5, hy - 1, inner); p.set(10, hy - 1, inner); } } },
    baer: () => { if (side) { L([[8, hy - 1], [9, hy - 1], [8, hy], [9, hy]], fur); } else { L([[3, hy - 1], [4, hy - 1], [3, hy], [11, hy - 1], [12, hy - 1], [12, hy]], fur); if (dir === 0) { p.set(4, hy - 1, inner); p.set(11, hy - 1, inner); } } },
    hase: () => { if (side) { for (let y = hy - 6; y < hy; y++) { p.set(9, y, fur); p.set(10, y + 1, fur); } p.set(9, hy - 3, inner); } else { for (let y = hy - 6; y < hy; y++) { p.set(5, y, fur); p.set(6, y, fur); p.set(9, y, fur); p.set(10, y, fur); } if (dir === 0) for (let y = hy - 5; y < hy - 1; y++) { p.set(5, y, inner); p.set(10, y, inner); } } },
  };
  ears[a.beast]();
}

function drawTail(p: PB, a: Appearance, y0: number, dir: number): void {
  const fur = a.hair;
  if (dir === 0) { // von vorn: nur Spitze seitlich
    if (a.beast === 'fuchs' || a.beast === 'wolf') { p.set(13, y0 + 2, fur); p.set(13, y0 + 3, a.beast === 'fuchs' ? '#f4efe6' : fur); }
    return;
  }
  if (dir === 3) {
    const t: Record<string, [number, number, string][]> = {
      fuchs: [[7, 0, fur], [8, 0, fur], [6, 1, fur], [7, 1, fur], [8, 1, fur], [9, 1, fur], [6, 2, fur], [7, 2, fur], [8, 2, fur], [9, 2, fur], [7, 3, '#f4efe6'], [8, 3, '#f4efe6']],
      wolf: [[7, 0, fur], [8, 0, fur], [7, 1, fur], [8, 1, fur], [7, 2, fur], [8, 2, shade(fur, -0.2)], [8, 3, fur]],
      katze: [[8, 0, fur], [8, 1, fur], [9, 2, fur], [10, 2, fur], [10, 1, fur]],
      baer: [[7, 0, fur], [8, 0, fur]],
      hase: [[7, 0, '#f4efe6'], [8, 0, '#f4efe6'], [7, 1, '#f4efe6'], [8, 1, '#e2ddd4']],
    };
    for (const [x, y, c] of t[a.beast]) p.set(x, y0 + y, c);
    return;
  }
  // Seitenansicht (links schauend): Schwanz hinten rechts
  const s: Record<string, [number, number, string][]> = {
    fuchs: [[11, 0, fur], [12, 0, fur], [12, 1, fur], [13, 1, fur], [13, 2, fur], [14, 2, '#f4efe6'], [12, 2, fur], [13, 3, '#f4efe6']],
    wolf: [[11, 0, fur], [12, 1, fur], [13, 1, fur], [13, 2, fur]],
    katze: [[11, 0, fur], [12, 0, fur], [13, -1, fur], [13, -2, fur]],
    baer: [[11, 0, fur]],
    hase: [[11, 0, '#f4efe6'], [12, 0, '#f4efe6'], [11, 1, '#e2ddd4']],
  };
  for (const [x, y, c] of s[a.beast]) p.set(x, y0 + y, c);
}

function drawHairFront(p: PB, a: Appearance, hy: number, by: number): void {
  const h = a.hair, hd = shade(a.hair, -0.25);
  const st = a.hairStyle;
  if (st === 'glatze') return;
  // Haarkappe
  for (let x = 4; x <= 11; x++) { p.set(x, hy, h); p.set(x, hy + 1, h); }
  for (let x = 5; x <= 10; x++) p.set(x, hy - 1, h);
  p.set(4, hy + 2, h); p.set(11, hy + 2, h);
  if (st === 'kurz') { p.set(5, hy + 2, h); p.set(10, hy + 2, hd); }
  if (st === 'scheitel') { for (let x = 5; x <= 8; x++) p.set(x, hy + 2, h); p.set(5, hy + 3, h); p.set(4, hy + 3, h); }
  if (st === 'wuschel') { for (let x = 3; x <= 12; x++) p.set(x, hy, h); p.set(3, hy + 1, h); p.set(12, hy + 1, h); p.set(4, hy - 2, h); p.set(7, hy - 2, h); p.set(10, hy - 2, h); p.set(6, hy + 2, h); p.set(9, hy + 2, hd); }
  if (st === 'lang' || st === 'zopf' || st === 'dutt') { for (let x = 5; x <= 10; x++) if (x !== 7 && x !== 8) p.set(x, hy + 2, h); }
  if (st === 'lang') { for (let y = hy + 2; y <= by + 3; y++) { p.set(3, y, y > hy + 4 ? hd : h); p.set(12, y, y > hy + 4 ? hd : h); } p.set(4, hy + 3, h); p.set(11, hy + 3, h); }
  if (st === 'zopf') { p.set(12, hy + 2, h); p.set(12, hy + 3, hd); }
  if (st === 'dutt') { p.rect(6, hy - 3, 4, 2, h); p.set(7, hy - 3, hd); }
}

function drawHairBack(p: PB, a: Appearance, hy: number, by: number): void {
  const h = a.hair, hd = shade(a.hair, -0.25);
  if (a.hairStyle === 'glatze') return;
  p.rect(4, hy - 0, 8, 7, h);
  for (let x = 5; x <= 10; x++) p.set(x, hy - 1, h);
  for (let x = 5; x <= 10; x++) p.set(x, hy + 7, hd);
  if (a.hairStyle === 'wuschel') { p.rect(3, hy, 10, 6, h); p.set(5, hy - 2, h); p.set(9, hy - 2, h); }
  if (a.hairStyle === 'lang') { p.rect(4, hy + 7, 8, 5, h); for (let x = 4; x <= 11; x++) p.set(x, hy + 12, hd); }
  if (a.hairStyle === 'zopf') { p.rect(7, hy + 7, 2, 5, h); p.set(7, hy + 12, hd); p.set(8, hy + 12, hd); }
  if (a.hairStyle === 'dutt') p.rect(6, hy - 3, 4, 3, h);
  void by;
}

function drawHairSide(p: PB, a: Appearance, hy: number, by: number): void {
  const h = a.hair, hd = shade(a.hair, -0.25);
  if (a.hairStyle === 'glatze') return;
  for (let x = 5; x <= 11; x++) p.set(x, hy, h);
  for (let x = 6; x <= 11; x++) p.set(x, hy - 1, h);
  for (let y = hy + 1; y <= hy + 4; y++) for (let x = 9; x <= 11; x++) p.set(x, y, h);
  p.set(5, hy + 1, h); p.set(6, hy + 1, h); p.set(7, hy + 1, h);
  if (a.hairStyle === 'wuschel') { p.set(4, hy, h); p.set(12, hy + 1, h); p.set(12, hy + 3, h); p.set(7, hy - 2, h); }
  if (a.hairStyle === 'lang') for (let y = hy + 4; y <= by + 3; y++) { p.set(10, y, hd); p.set(11, y, h); }
  if (a.hairStyle === 'zopf') { p.set(12, hy + 3, h); p.set(13, hy + 4, h); p.set(13, hy + 5, h); p.set(13, hy + 6, hd); }
  if (a.hairStyle === 'dutt') { p.set(10, hy - 2, h); p.set(11, hy - 2, h); p.set(11, hy - 1, h); p.set(12, hy - 1, h); }
  if (a.hairStyle === 'scheitel') { p.set(5, hy + 2, h); p.set(6, hy + 2, h); }
  if (a.hairStyle === 'kurz') p.set(9, hy + 5, hd);
}

export function drawCharFrame(a: Appearance, dir: number, frame: number, raw = false): PB {
  const p = new PB(CW, CH);
  const m = bodyMetrics(a);
  const { hy, by, bh, half, ly } = m;
  const race = RACES[a.race];
  const skin = a.skin, skinD = shade(a.skin, -0.18);
  const cloth = a.cloth, clothD = shade(a.cloth, -0.28), cloth2 = a.cloth2, boots = '#3a2a1e';
  const side = dir === 1 || dir === 2;
  const bob = frame === 0 ? 0 : 0;
  const tx0 = 8 - half, tx1 = 7 + half;

  // Schwanz hinter dem Körper
  if (race.ears === 'tier' && (dir === 3 || side)) drawTail(p, a, by + bh - 2, dir === 3 ? 3 : 1);

  // Beine
  const legC = a.outfit === 'hose' ? cloth2 : a.outfit === 'rock' ? shade(cloth2, -0.1) : cloth2;
  if (!side) {
    const lUp = frame === 1 ? 1 : 0, rUp = frame === 2 ? 1 : 0;
    for (let y = ly; y < 22; y++) { if (y < 22 - lUp) { p.set(5, y, legC); p.set(6, y, legC); } if (y < 22 - rUp) { p.set(9, y, legC); p.set(10, y, shade(legC, -0.15)); } }
    p.rect(5, 22 - lUp, 2, 2 - (lUp ? 0 : 0), boots); p.rect(9, 22 - rUp, 2, 2, boots);
    if (lUp) p.set(5, 23, null), p.set(6, 23, null);
    if (rUp) p.set(9, 23, null), p.set(10, 23, null);
  } else {
    if (frame === 0) { p.rect(6, ly, 4, 22 - ly, legC); p.rect(6, 22, 4, 2, boots); p.set(5, 23, boots); }
    else {
      const f = frame === 1;
      // vorderes Bein (links = Blickrichtung), hinteres Bein
      const fx = f ? 4 : 9, bx = f ? 9 : 5;
      for (let y = ly; y < 22; y++) { p.set(bx, y, shade(legC, -0.2)); p.set(bx + 1, y, shade(legC, -0.2)); }
      p.rect(bx, 22, 2, 2, shade(boots, -0.2));
      for (let y = ly; y < 22; y++) { const xx = fx + (y > ly + 2 ? (f ? 0 : 1) : (f ? 1 : 0)); p.set(xx, y, legC); p.set(xx + 1, y, legC); }
      p.rect(fx, 22, 3, 2, boots);
    }
  }

  // Rumpf
  const torsoBottom = a.outfit === 'robe' ? 21 : by + bh - 1;
  for (let y = by; y <= torsoBottom; y++) {
    let x0 = side ? 5 : tx0, x1 = side ? 10 : tx1;
    if (a.gender === 'w' && !side && a.outfit !== 'robe' && (y === by + 2 || y === by + 3) && half > 3) { x0++; x1--; }
    if (a.outfit === 'robe' && y > by + bh - 1) { x0 = side ? 5 : Math.min(tx0, 4); x1 = side ? 11 : Math.max(tx1, 11); }
    for (let x = x0; x <= x1; x++) p.set(x, y, x === x1 ? clothD : cloth);
  }
  if (a.outfit === 'robe') { p.rect(side ? 5 : 5, 22, side ? 6 : 6, 2, boots); for (let y = by + bh; y <= 21; y++) p.set(side ? 8 : 7, y, clothD); }
  if (a.outfit === 'rock') { for (let x = (side ? 4 : tx0 - 1); x <= (side ? 11 : tx1 + 1); x++) { p.set(x, ly, cloth); p.set(x, ly + 1, clothD); } if (!side) for (let x = tx0; x <= tx1; x++) p.set(x, ly + 2, x % 2 ? clothD : cloth); }
  // Gürtel / Akzent
  if (a.outfit !== 'robe') for (let x = side ? 5 : tx0; x <= (side ? 10 : tx1); x++) p.set(x, by + bh - 2, '#4a3422');
  else for (let x = side ? 5 : tx0; x <= (side ? 10 : tx1); x++) p.set(x, by + 3, cloth2);
  if (!side && dir === 0) { p.set(7, by, shade(cloth, 0.2)); p.set(8, by, shade(cloth, 0.2)); }

  // Arme
  if (!side) {
    const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const lx = tx0 - 1, rx = tx1 + 1;
    for (let y = by; y < by + bh - 1; y++) { p.set(lx, y + Math.max(0, swing), clothD); p.set(rx, y + Math.max(0, -swing), clothD); }
    p.set(lx, by + bh - 1 + Math.max(0, swing), skin); p.set(rx, by + bh - 1 + Math.max(0, -swing), skin);
  } else {
    if (!raw) {
      const sw = frame === 1 ? -1 : frame === 2 ? 1 : 0;
      for (let y = by + 1; y < by + bh; y++) p.set(7 + (y > by + 2 ? sw : 0), y, clothD);
      p.set(7 + sw, by + bh, skin);
    }
  }

  // Kopf
  if (!side) {
    p.rect(4, hy, 8, 8, skin);
    for (let y = hy; y < hy + 8; y++) p.set(11, y, skinD);
    p.set(4, hy, null); p.set(11, hy, null); p.set(4, hy + 7, null); p.set(11, hy + 7, null);
    // Ohren
    if (race.ears === 'mensch') { p.set(3, hy + 4, skin); p.set(12, hy + 4, skinD); }
    if (race.ears === 'elf') { [[3, hy + 4], [3, hy + 3], [2, hy + 3], [2, hy + 2], [1, hy + 1]].forEach(([x, y]) => p.set(x, y, skin)); [[12, hy + 4], [12, hy + 3], [13, hy + 3], [13, hy + 2], [14, hy + 1]].forEach(([x, y]) => p.set(x, y, skinD)); }
    if (race.ears === 'elfkurz') { [[3, hy + 4], [3, hy + 3], [2, hy + 2]].forEach(([x, y]) => p.set(x, y, skin)); [[12, hy + 4], [12, hy + 3], [13, hy + 2]].forEach(([x, y]) => p.set(x, y, skinD)); }
    if (dir === 0) {
      p.set(6, hy + 4, a.eyes); p.set(9, hy + 4, a.eyes);
      p.set(6, hy + 5, shade(a.eyes, -0.4)); p.set(9, hy + 5, shade(a.eyes, -0.4));
      p.set(7, hy + 6, skinD); p.set(8, hy + 6, skinD);
      // Bart
      const bc = a.hair, bcD = shade(a.hair, -0.2);
      if (a.beard === 'stoppel') for (let x = 5; x <= 10; x++) if (x % 2 === 0) p.set(x, hy + 7, bcD);
      if (a.beard === 'kurz') { for (let x = 4; x <= 11; x++) p.set(x, hy + 7, bc); for (let x = 5; x <= 10; x++) if (x < 7 || x > 8) p.set(x, hy + 6, bc); p.set(4, hy + 5, bc); p.set(11, hy + 5, bc); }
      if (a.beard === 'lang') { for (let x = 4; x <= 11; x++) p.set(x, hy + 7, bc); for (let x = 5; x <= 10; x++) if (x < 7 || x > 8) p.set(x, hy + 6, bc); p.set(4, hy + 5, bc); p.set(11, hy + 5, bc); p.rect(5, by, 6, 2, bc); p.rect(6, by + 2, 4, 1, bcD); p.set(7, by + 3, bcD); }
      drawHairFront(p, a, hy, by);
      if (a.tattoo) { p.set(10, hy + 5, '#a0202a'); p.set(10, hy + 6, '#a0202a'); p.set(9, hy + 6, '#a0202a'); }
    } else {
      drawHairBack(p, a, hy, by);
      if (race.ears === 'tier') { /* keine Menschenohren */ }
    }
    if (race.ears === 'tier') drawAnimalEars(p, a, hy, dir);
    if (race.ears === 'tier' && dir === 0) drawTail(p, a, by + 1, 0);
  } else {
    // Seitenkopf (Blick nach links)
    p.rect(5, hy, 7, 8, skin);
    p.set(5, hy, null); p.set(11, hy + 7, null); p.set(5, hy + 7, null);
    p.set(4, hy + 4, skin); // Nase
    p.set(6, hy + 4, a.eyes); p.set(6, hy + 5, shade(a.eyes, -0.4));
    p.set(5, hy + 6, skinD);
    if (race.ears === 'mensch') p.set(9, hy + 4, skinD);
    if (race.ears === 'elf') [[9, hy + 4], [10, hy + 3], [11, hy + 2], [12, hy + 1], [13, hy]].forEach(([x, y]) => p.set(x, y, skinD));
    if (race.ears === 'elfkurz') [[9, hy + 4], [10, hy + 3], [11, hy + 2]].forEach(([x, y]) => p.set(x, y, skinD));
    const bc = a.hair;
    if (a.beard === 'kurz' || a.beard === 'lang') { for (let x = 5; x <= 9; x++) p.set(x, hy + 7, bc); p.set(6, hy + 6, bc); p.set(8, hy + 6, bc); p.set(9, hy + 5, bc); }
    if (a.beard === 'lang') { p.rect(5, by, 3, 3, bc); p.set(5, by + 3, bc); }
    if (a.beard === 'stoppel') { p.set(6, hy + 7, shade(bc, -0.2)); p.set(8, hy + 7, shade(bc, -0.2)); }
    drawHairSide(p, a, hy, by);
    if (race.ears === 'tier') drawAnimalEars(p, a, hy, dir);
    if (a.tattoo) { p.set(7, hy + 5, '#a0202a'); p.set(8, hy + 6, '#a0202a'); }
  }
  void bob;
  if (raw) return p;
  const out = dir === 2 ? p.mirrorX() : p;
  out.bevel(0.14, 0.2);
  out.outline('#0a0b12');
  return out;
}

/** Erzeugt ein Spritesheet (12 Frames à 16×24) als Canvas. */
export function charSheet(a: Appearance): HTMLCanvasElement {
  const [c, ctx] = canvas(CW * 12, CH);
  for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) drawCharFrame(a, d, f).draw(ctx, (d * 3 + f) * CW, 0);
  return c;
}

export function charPortrait(a: Appearance, scale: number, dir = 0): HTMLCanvasElement {
  const [c, ctx] = canvas(CW * scale, CH * scale);
  drawCharFrame(a, dir, 0).draw(ctx, 0, 0, scale);
  return c;
}

// ---------------------------------------------------------------- Kampfposen
export type Pose = 'ready' | 'windup' | 'strike' | 'cast' | 'hurt';
export const POSES: Pose[] = ['ready', 'windup', 'strike', 'cast', 'hurt'];
export type WeaponKind = 'sword' | 'spear' | 'mace' | 'staff' | 'crossbow';
export const BW = 36, BH = 28;

function drawWeapon(p: PB, kind: WeaponKind, hx: number, hy: number, dx: number, dy: number): void {
  const n = Math.hypot(dx, dy); dx /= n; dy /= n;
  const at = (t: number): [number, number] => [Math.round(hx + dx * t), Math.round(hy + dy * t)];
  const seg = (t0: number, t1: number, c: string) => { for (let t = t0; t <= t1; t += 0.5) { const [x, y] = at(t); p.set(x, y, c); } };
  const px = -dy, py = dx; // senkrecht zur Waffe
  if (kind === 'sword') {
    seg(-2, 0, '#6a4a30');
    seg(1, 9, '#c8ceda'); seg(9, 10, '#eef2f8');
    for (const s of [-1.5, -1, 1, 1.5]) p.set(Math.round(hx + dx + px * s), Math.round(hy + dy + py * s), '#e0b04a');
  } else if (kind === 'spear') {
    seg(-5, 11, '#8a6238'); seg(11, 14, '#c8ceda');
    const [tx, ty] = at(12); p.set(Math.round(tx + px), Math.round(ty + py), '#c8ceda'); p.set(Math.round(tx - px), Math.round(ty - py), '#c8ceda');
    const [rx, ry] = at(10); p.set(rx, ry, '#b83a32');
  } else if (kind === 'mace') {
    seg(-1, 7, '#7a5232');
    const [mx, my] = at(8); p.rect(mx - 1, my - 1, 3, 3, '#a8aebb'); p.set(mx - 2, my, '#a8aebb'); p.set(mx + 2, my, '#a8aebb'); p.set(mx, my - 2, '#a8aebb'); p.set(mx, my + 2, '#a8aebb');
  } else if (kind === 'staff') {
    seg(-4, 10, '#8a6238');
    const [ox, oy] = at(11); p.rect(ox - 1, oy - 1, 2, 2, '#6ad0ff'); p.set(ox, oy - 1, '#d8f4ff');
  } else {
    seg(-1, 5, '#8a6238');
    for (let s = -3; s <= 3; s++) { const [bx, by] = at(5 - Math.abs(s) * 0.5); p.set(Math.round(bx + px * s), Math.round(by + py * s), '#d8d0bc'); }
    seg(5, 6, '#c8ceda');
  }
}

/** Kampf-Frame (Blick nach rechts) mit Arm und Waffe in der jeweiligen Pose. */
export function battleFrame(a: Appearance, pose: Pose, weapon: WeaponKind): PB {
  const body = drawCharFrame(a, 1, pose === 'strike' ? 1 : pose === 'hurt' ? 2 : 0, true);
  const { by, bh } = bodyMetrics(a);
  const ox = 12, oy = 4;
  const p = new PB(BW, BH);
  const lean = pose === 'hurt' ? 1 : pose === 'strike' ? -1 : 0;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const c = body.get(x, y); if (c) p.set(ox + x + (y < by + 2 ? lean : 0), oy + y, c); }
  const sleeve = shade(a.cloth, -0.28), skin = a.skin;
  const sx = ox + 8 + lean, sy = oy + by + 1;
  const pose_: Record<Pose, [number, number, number, number]> = {
    ready: [ox + 6, oy + by + bh - 1, -0.45, -1],
    windup: [ox + 11, oy + by - 3, 0.7, -1],
    strike: [ox + 2, oy + by + 2, -1, 0.12],
    cast: [ox + 4, oy + by - 3, -0.25, -1],
    hurt: [ox + 11, oy + by + bh - 1, 0.9, 0.7],
  };
  const [hx, hy, dx, dy] = pose_[pose];
  drawWeapon(p, weapon, hx, hy, dx, dy);
  p.line(sx, sy, hx, hy, sleeve);
  p.set(hx, hy, skin);
  if (pose === 'cast') { p.set(hx - 1, hy - 1, '#fff2b0'); p.set(hx - 2, hy, '#f0c35a'); p.set(hx, hy - 2, '#f0c35a'); }
  const out = p.mirrorX();
  out.bevel(0.14, 0.2);
  out.outline('#0a0b12');
  return out;
}

export function battleSheet(a: Appearance, weapon: WeaponKind): HTMLCanvasElement {
  const [c, ctx] = canvas(BW * POSES.length, BH);
  POSES.forEach((pose, i) => battleFrame(a, pose, weapon).draw(ctx, i * BW, 0));
  return c;
}

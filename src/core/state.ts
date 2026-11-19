import type { GameState, Member, Stats, ItemInst, Appearance, ClassId, El, Rank } from '../data/types';
import { RACES, CLASSES } from '../data/races';
import { GEAR, gearDefToInst, ITEMS } from '../data/items';
import { baseDungeons, QUESTS, RANK_ORDER } from '../data/world';
import { RANK_ELEMENTS, levelElementCap } from '../data/magic';

const SAVE_KEY = 'ascheron_save_v1';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export let G: GameState = null as unknown as GameState;

export function newUid(): string { G.uid++; return 'u' + G.uid; }

export function makeMember(id: string, name: string, app: Appearance, cls: ClassId, level: number, elements: El[], isPlayer = false): Member {
  const m: Member = { id, name, app, cls, level, xp: 0, hp: 1, mp: 0, mp2: 0, equip: {}, elements: [...new Set(elements)], isPlayer };
  return m;
}

export function newGame(player: Member): void {
  G = {
    version: 1, party: [], silver: 85, inv: { heiltrank: 4, proviant: 6, kraeuterbund: 1 }, gear: [], rp: 0, advRank: 'D',
    day: 0, quests: {}, dungeons: baseDungeons(), formulas: [], flags: {}, pos: { x: 27 * 16, y: 38 * 16 }, blutmond: 0,
    rep: { gilde: 0, kirche: 0, konsortium: 0, muenze: 0 }, kills: {}, nextDungeonDay: 9, uid: 0, herbsTaken: [], log: [],
  };
  for (const q of QUESTS) G.quests[q.id] = { status: 'offen', progress: 0 };
  addMember(player);
  fullHeal(player);
}

export function addMember(m: Member): void {
  const c = CLASSES[m.cls];
  const w = gearDefToInst(c.weapon, newUid());
  const a = gearDefToInst(c.armor, newUid());
  G.gear.push(w, a);
  m.equip.weapon = w.uid;
  m.equip.armor = a.uid;
  G.party.push(m);
  fullHeal(m);
}

export function gearOf(uid?: string): ItemInst | undefined {
  return uid ? G.gear.find((g) => g.uid === uid) : undefined;
}

export function isHalf(m: Member): boolean { return !!RACES[m.app.race].mana2; }

export function stats(m: Member): Stats {
  const c = CLASSES[m.cls];
  const r = RACES[m.app.race].mods;
  const L = m.level - 1;
  const s: Stats = {
    hp: Math.round((c.base.hp + c.grow.hp * L) * r.hp),
    mp: Math.round((c.base.mp + c.grow.mp * L) * r.mp),
    atk: Math.round((c.base.atk + c.grow.atk * L) * r.atk),
    def: Math.round((c.base.def + c.grow.def * L) * r.def),
    mag: Math.round((c.base.mag + c.grow.mag * L) * r.mag),
    spd: Math.round((c.base.spd + c.grow.spd * L) * r.spd),
  };
  for (const slot of ['weapon', 'armor', 'trinket'] as const) {
    const g = gearOf(m.equip[slot]);
    if (!g) continue;
    for (const k of Object.keys(g.stats) as (keyof Stats)[]) s[k] += g.stats[k] ?? 0;
  }
  s.spd = Math.max(1, s.spd);
  return s;
}

/** Zweiter Fluss: bei Halbwesen ist mp der starke (Eltern-)Fluss und mp2 der menschliche C-Fluss. */
export function maxMp2(m: Member): number {
  if (!isHalf(m)) return 0;
  return Math.round((8 + m.level * 1.6) * (m.tattoo ? 1.8 : 1));
}

export function fullHeal(m: Member): void {
  const s = stats(m);
  m.hp = s.hp; m.mp = s.mp; m.mp2 = maxMp2(m);
}

const RANK_UP: Record<Rank, Rank> = { D: 'C', C: 'B', B: 'A', A: 'S', S: 'SS', SS: 'SS' };
/** Mana-Rang. Das Dornen-Tattoo hebt ihn um eine Stufe – bei Halbwesen nur den schwächeren Fluss. */
export function manaRank(m: Member): Rank {
  const r = RACES[m.app.race].mana;
  return m.tattoo && !isHalf(m) ? RANK_UP[r] : r;
}
export function manaRank2(m: Member): Rank | null {
  const r = RACES[m.app.race].mana2;
  if (!r) return null;
  return m.tattoo ? RANK_UP[r] : r;
}

export function maxElements(m: Member): number {
  return Math.min(RANK_ELEMENTS[manaRank(m)], levelElementCap(m.level));
}

export function xpForLevel(level: number): number { return Math.round(40 * Math.pow(level, 1.55)); }

export function giveXp(m: Member, amount: number): string[] {
  const msgs: string[] = [];
  if (m.app.race === 'mensch') amount = Math.round(amount * 1.15);
  m.xp += amount;
  while (m.xp >= xpForLevel(m.level)) {
    m.xp -= xpForLevel(m.level);
    const before = maxElements(m);
    m.level++;
    const s = stats(m);
    m.hp = s.hp; m.mp = s.mp; m.mp2 = maxMp2(m);
    msgs.push(`${m.name} erreicht Stufe ${m.level}!`);
    if (maxElements(m) > before) msgs.push(`${m.name} kann jetzt ${maxElements(m)} Elemente verbinden.`);
  }
  return msgs;
}

export function addItem(id: string, n = 1): void { G.inv[id] = (G.inv[id] ?? 0) + n; if (G.inv[id] <= 0) delete G.inv[id]; }
export function hasItem(id: string, n = 1): boolean { return (G.inv[id] ?? 0) >= n; }

export function money(silver: number): string {
  const s = Math.max(0, Math.round(silver));
  const p = Math.floor(s / 10000), g = Math.floor((s % 10000) / 100), si = s % 100;
  const parts: string[] = [];
  if (p) parts.push(`${p} Platin`);
  if (g) parts.push(`${g} Gold`);
  if (si || parts.length === 0) parts.push(`${si} Silber`);
  return parts.join(' ');
}

export function priceFor(base: number, sellerHuman = true): number {
  const p = G.party[0];
  const mk = sellerHuman ? RACES[p.app.race].markup + (p.tattoo ? 0.25 : 0) : 0;
  return Math.round(base * (1 + mk));
}

export function rankAtLeast(r: Rank, min: Rank): boolean { return RANK_ORDER.indexOf(r) >= RANK_ORDER.indexOf(min); }

export function itemName(id: string): string { return ITEMS[id]?.name ?? GEAR[id]?.name ?? id; }

export function log(msg: string): void { G.log.unshift(msg); G.log.length = Math.min(G.log.length, 40); }

export function save(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch { /* Speicher evtl. blockiert */ }
}
export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
export function load(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    G = JSON.parse(raw) as GameState;
    migrate();
    return true;
  } catch { return false; }
}
export function setState(s: GameState): void { G = s; }

/** Ältere Spielstände um neue Aufträge und Dungeons ergänzen. */
function migrate(): void {
  for (const q of QUESTS) if (!G.quests[q.id]) G.quests[q.id] = { status: 'offen', progress: 0 };
  const base = baseDungeons();
  for (const [id, d] of Object.entries(base)) if (!G.dungeons[id]) G.dungeons[id] = d;
  G.flags = G.flags ?? {};
}

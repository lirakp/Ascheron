import { lebensaufgabeProgress } from './events';
import { G, mulberry32, addItem, newUid, fullHeal, log, stats } from './state';
import type { DungeonState, ItemInst, Rank } from '../data/types';
import { MONSTERS } from '../data/monsters';
import { rollDungeonGear } from '../data/items';
import { QUESTS, RANK_ORDER, RANK_META } from '../data/world';
import { EL_NAME } from '../data/magic';

export interface WorldEvent { text: string; kind: '' | 'big' | 'bad'; }

const BLUTMOND_CHANCE: Record<Rank, number> = { D: 0.25, C: 0.45, B: 0.6, A: 0.75, S: 0.9, SS: 1 };

/** Lässt Zeit vergehen. Fristen laufen, außer für den Dungeon, in dem der Trupp gerade lebt. */
export function advanceTime(days: number, insideDungeon?: string): WorldEvent[] {
  const ev: WorldEvent[] = [];
  const before = Math.floor(G.day);
  G.day += days;
  const whole = Math.floor(G.day) - before;
  for (let i = 0; i < whole; i++) {
    if (G.blutmond > 0) {
      G.blutmond--;
      if (G.blutmond === 0) {
        ev.push({ text: 'Der Blutmond verblasst. Blutkerne zerfallen zu Staub.', kind: 'big' });
        delete G.inv.blutkern;
      }
    }
    for (const d of Object.values(G.dungeons)) {
      if (d.solved || d.broken || d.id === insideDungeon) continue;
      d.frist--;
      if (d.frist === 5) ev.push({ text: `Die Frist von „${d.name}“ läuft in 5 Tagen ab!`, kind: 'bad' });
      if (d.frist <= 0) {
        d.broken = true;
        ev.push({ text: `AUSBRUCH: „${d.name}“ wurde nicht gelöst. Monster strömen ins Land.`, kind: 'bad' });
        log(`${d.name} ist ausgebrochen.`);
        if (Math.random() < BLUTMOND_CHANCE[d.rank] && G.blutmond === 0) {
          G.blutmond = 6;
          ev.push({ text: 'Der Mond färbt sich rot. BLUTMOND – Physische Dungeons werden zu Blut-Dungeons.', kind: 'bad' });
          log('Ein Blutmond ist aufgegangen.');
        }
      }
    }
    const broken = Object.values(G.dungeons).filter((d) => d.broken && !d.solved).length;
    if (broken >= 3 && !G.flags.schmetterling) {
      G.flags.schmetterling = true;
      ev.push({ text: 'Bauern berichten von Schmetterlingen über den Mooren. Die Stille Architektin ist nahe – zu viele Ausbrüche.', kind: 'bad' });
    }
    if (G.day >= G.nextDungeonDay) {
      const d = spawnRandomDungeon();
      G.nextDungeonDay = G.day + 8 + Math.floor(Math.random() * 7);
      if (d) ev.push({ text: `Die Gilde meldet einen neuen Dungeon: „${d.name}“ (Rang ${d.shownRank}).`, kind: 'big' });
    }
  }
  return ev;
}

const PREFIX = ['Versunkene', 'Stille', 'Graue', 'Nasse', 'Hohle', 'Kalte', 'Krumme'];
const NOUNS: Record<string, string[]> = {
  stone: ['Gruft', 'Grube', 'Halle', 'Kammer'],
  chalk: ['Kreidegrube', 'Kalkhöhle', 'Weißschlucht'],
  sewer: ['Zisterne', 'Abflussgrotte', 'Schlammgrotte'],
  thorn: ['Rosenhecke', 'Dornengarten', 'Rankenlabyrinth'],
  memory: ['Gruft', 'Kammer', 'Grube'],
};

export let freeSpotsRef: [number, number][] = [];
export function setFreeSpots(s: [number, number][]): void { freeSpotsRef = s; }

const REGION_POOLS: Record<string, { themes: string[]; pools: Record<string, string[]>; where: string; rank?: Rank }> = {
  rabenmark: { themes: ['memory', 'thorn', 'stone', 'chalk', 'sewer', 'stone'], where: 'im Moor', pools: { stone: ['aschhund', 'hohlmann', 'hohlmann'], chalk: ['kreidekriecher', 'kreidekriecher', 'hohlmann'], sewer: ['kanalwuerger', 'hohlmann'], thorn: ['rankenweber', 'hohlmann'], memory: ['nachhall', 'erinnerungsschatten'] } },
  schlackenhafen: { themes: ['sewer', 'memory'], where: 'am Hafen', pools: { sewer: ['kanalwuerger', 'bandit'], memory: ['nachhall', 'erinnerungsschatten'] } },
  aurelsfeste: { themes: ['stone', 'chalk', 'memory', 'stone'], where: 'bei Lumenhall', rank: 'C', pools: { stone: ['bandit', 'hohlmann', 'hohlmann'], chalk: ['kreidekriecher', 'bandit'], memory: ['nachhall', 'erinnerungsschatten'] } },
  kaldrion: { themes: ['stone', 'stone', 'memory'], where: 'im Gebirge', rank: 'B', pools: { stone: ['frostwolf', 'frostwolf', 'runenwaechter'], memory: ['nachhall', 'erinnerungsschatten'] } },
  veyrath: { themes: ['sewer', 'stone', 'memory'], where: 'in den Dünen', rank: 'B', pools: { sewer: ['duenenskorpion', 'blindwurm'], stone: ['duenenskorpion', 'sklavenjaeger'], memory: ['nachhall', 'erinnerungsschatten'] } },
  eschenwacht: { themes: ['thorn', 'stone', 'memory'], where: 'im Wald', rank: 'B', pools: { thorn: ['rankenweber', 'elfenjaeger'], stone: ['elfenjaeger', 'aschhund'], memory: ['nachhall', 'erinnerungsschatten'] } },
};

export function spawnRandomDungeon(): DungeonState | null {
  const r = Math.random;
  const region = G.region ?? 'rabenmark';
  const cfg = REGION_POOLS[region];
  if (!cfg) return null; // In Nachtklüften, Erstarrten Landen und Dornenreich entstehen keine neuen Dungeons
  const roll = r();
  // Erinnerungs-Dungeons sind selten (ca. 10 %), Dorn-Dungeons etwa 15 % (wo es sie gibt)
  let theme = cfg.themes.includes('memory') && roll < 0.1 ? 'memory' : cfg.themes.includes('thorn') && roll < 0.25 ? 'thorn' : cfg.themes.filter((t) => t !== 'memory')[Math.floor(r() * cfg.themes.filter((t) => t !== 'memory').length)];
  if (!cfg.pools[theme]) theme = Object.keys(cfg.pools)[0];
  const pool = cfg.pools[theme];
  const baseRank: Rank = cfg.rank ?? (G.advRank === 'D' ? (r() < 0.75 ? 'D' : 'C') : (r() < 0.5 ? 'C' : 'D'));
  const thorn = theme === 'thorn', memory = theme === 'memory';
  const spots = freeSpotsRef.filter(([x, y]) => Object.values(G.dungeons).every((d) => (d.region ?? 'rabenmark') !== region || Math.hypot(d.x - x, d.y - y) > 8));
  if (!spots.length) return null;
  const [x, y] = spots[Math.floor(r() * spots.length)];
  const id = 'z' + Math.floor(G.day) + '_' + Math.floor(r() * 1000);
  const name = `${PREFIX[Math.floor(r() * PREFIX.length)]} ${NOUNS[theme][Math.floor(r() * NOUNS[theme].length)]} ${cfg.where}`;
  const rank: Rank = memory ? 'A' : thorn && baseRank === 'D' ? 'C' : baseRank;
  const d: DungeonState = {
    id, name, theme: theme as DungeonState['theme'], rank, shownRank: memory ? (r() < 0.5 ? 'D' : 'C') : rank, type: memory ? 'Erinnerung' : thorn ? 'Dorn' : 'Physisch', shownType: 'Physisch', story: Math.floor(r() * 3), enemies: pool, boss: memory ? '' : thorn && region === 'rabenmark' ? 'rankenweber_elite' : pool[0] + '_elite',
    rooms: rank === 'D' ? 6 : 8, frist: 18 + Math.floor(r() * 14), solved: false, broken: false, x, y, seed: Math.floor(r() * 99999), generated: true, region,
  };
  G.dungeons[id] = d;
  log(`Neuer Dungeon gemeldet: ${name}`);
  return d;
}

export function rollDrops(monsterId: string, rng: () => number = Math.random): { items: string[]; gear: ItemInst[] } {
  const base = MONSTERS[monsterId] ?? MONSTERS[monsterId.replace('_elite', '')];
  const items: string[] = [];
  const gear: ItemInst[] = [];
  if (!base) return { items, gear };
  let drops = base.drops;
  if (monsterId.endsWith('_elite')) drops = [...drops, { item: 'kern_mittel', chance: 1 }, { item: '#schlafend', chance: 1 }];
  for (const d of drops) {
    if (rng() > d.chance) continue;
    const n = d.qty ? d.qty[0] + Math.floor(rng() * (d.qty[1] - d.qty[0] + 1)) : 1;
    for (let i = 0; i < n; i++) {
      if (d.item === '#schlafend') gear.push(rollDungeonGear(rng, base.rank, newUid()));
      else items.push(d.item);
    }
  }
  if (G.blutmond > 0 && rng() < 0.4) items.push('blutkern');
  return { items, gear };
}

export function grantLoot(items: string[], gear: ItemInst[]): void {
  for (const i of items) addItem(i, 1);
  for (const g of gear) G.gear.push(g);
}

export function onKill(monsterId: string): void {
  const id = monsterId.replace('_elite', '');
  lebensaufgabeProgress('kill', id);
  G.kills[id] = (G.kills[id] ?? 0) + 1;
  for (const q of QUESTS) {
    const st = G.quests[q.id];
    if (q.kind === 'kill' && q.target === id && st.status === 'angenommen') {
      st.progress++;
      if (st.progress >= q.goal) st.status = 'erfuellt';
    }
  }
}

export function onDungeonSolved(id: string): void {
  const d = G.dungeons[id];
  lebensaufgabeProgress('dungeon', id);
  d.solved = true;
  log(`${d.name} gelöst.`);
  for (const q of QUESTS) {
    const st = G.quests[q.id];
    if (q.kind === 'dungeon' && q.target === id && (st.status === 'angenommen' || st.status === 'offen')) { st.status = 'erfuellt'; st.progress = 1; }
  }
  // Freie Dungeons zahlen eine Lösungsprämie über die Gilde
  if (d.type === 'Erinnerung') G.flags['bounty_' + id] = 320;
  else if (d.generated) G.flags['bounty_' + id] = d.rank === 'C' ? 90 : 40;
}

export function questCollectReady(qid: string): boolean {
  const q = QUESTS.find((x) => x.id === qid)!;
  return q.kind === 'collect' && (G.inv[q.target] ?? 0) >= q.goal;
}

export function canRankUp(): Rank | null {
  const i = RANK_ORDER.indexOf(G.advRank);
  const next = RANK_ORDER[i + 1];
  if (!next || next === 'S') return null;
  return G.rp >= RANK_META[next].rpNeeded ? next : null;
}

export interface FeeCost { text: string; apply: () => void; }
/** Die Fee der zeitlosen Wünsche: Wiederbelebung gegen eine Erinnerung. */
export function feeCost(): FeeCost {
  const opts: FeeCost[] = [];
  const p = G.party[0];
  if (p.elements.length > 1) {
    const e = p.elements[Math.floor(Math.random() * p.elements.length)];
    opts.push({ text: `Du vergisst alles, was du über ${EL_NAME[e]} gelernt hast.`, apply: () => { p.elements = p.elements.filter((x) => x !== e); G.formulas = G.formulas.filter((f) => !f.split('+').includes(e)); } });
  }
  const comp = G.party.filter((m) => !m.isPlayer);
  if (comp.length) {
    const c = comp[Math.floor(Math.random() * comp.length)];
    opts.push({ text: `${c.name} wird sich nicht mehr an dich erinnern – und den Trupp verlassen, sobald ihr draußen seid.`, apply: () => { G.flags['vergessen_' + c.id] = true; } });
  }
  if (G.rp >= 2) opts.push({ text: 'Die Gilde vergisst deine letzten Taten (−2 Rangpunkte).', apply: () => { G.rp = Math.max(0, G.rp - 2); } });
  if (G.formulas.length > 2) opts.push({ text: 'Alle Zauberformeln, die du entdeckt hast, verblassen aus deinem Gedächtnis.', apply: () => { G.formulas = []; } });
  opts.push({ text: 'Ein Jahr deiner Kindheit gehört nun der Fee. Niemand wird es je erzählen können.', apply: () => { G.flags.kindheit = ((G.flags.kindheit as number) ?? 0) + 1; } });
  return opts[Math.floor(Math.random() * opts.length)];
}

export function healParty(): void { for (const m of G.party) fullHeal(m); }

export function partyAlive(): boolean { return G.party.some((m) => m.hp > 0); }
export function reviveAll(frac = 1): void { for (const m of G.party) { const s = stats(m); m.hp = Math.max(m.hp, Math.round(s.hp * frac)); } }

export const rng = mulberry32;

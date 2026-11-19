// Balancing-Simulation: spielt Kernkämpfe vielfach durch (npx tsx scripts/balance.ts)
import { newGame, makeMember, addMember, stats, G, newUid, xpForLevel, mulberry32, maxElements } from '../src/core/state';
import { MONSTERS, eliteOf, MonsterDef, AttackDef } from '../src/data/monsters';
import { RECRUITS } from '../src/data/world';
import { RACES, CLASSES } from '../src/data/races';
import { gearDefToInst } from '../src/data/items';
import { physDamage, enemyDamage, spellDamage, healAmount, blessAmount, roll, turnInterval } from '../src/core/combat';
import type { ClassId, RaceId, El, Member } from '../src/data/types';

interface Skill { name: string; parry: number; dodge: number; precise: number; bell: number }
const SKILLS: Skill[] = [
  { name: 'Anfänger', parry: 0.1, dodge: 0.25, precise: 0.25, bell: 0.55 },
  { name: 'Mittel', parry: 0.4, dodge: 0.5, precise: 0.5, bell: 0.8 },
  { name: 'Geübt', parry: 0.7, dodge: 0.8, precise: 0.75, bell: 0.95 },
];

interface F { name: string; side: 'p' | 'e'; hp: number; max: number; atk: number; def: number; mag: number; spd: number; mp: number; next: number; ap: number; m?: Member; d?: MonsterDef; alive: boolean; parent?: F; parts: F[]; st: Record<string, number>; rose?: boolean; herz: number; defending?: boolean }

let rng = mulberry32(1);
const R = () => rng();

function mkEnemy(id: string): F[] {
  const d = id.endsWith('_elite') ? eliteOf(id.replace('_elite', '')) : MONSTERS[id];
  const f: F = { name: d.name, side: 'e', hp: d.hp, max: d.hp, atk: d.atk, def: d.def, mag: d.mag, spd: d.spd, mp: 0, next: 0, ap: 0, d, alive: true, parts: [], st: {}, herz: 0 };
  const out = [f];
  const part = d.id === 'kreidemutter' ? 'kreidemutter_flanke' : d.id === 'gloeckner' ? 'gloeckner_kloeppel' : null;
  if (part) { const pd = MONSTERS[part]; const p: F = { name: pd.name, side: 'e', hp: pd.hp, max: pd.hp, atk: 0, def: pd.def, mag: 0, spd: 0, mp: 0, next: 1e9, ap: 0, d: pd, alive: true, parent: f, parts: [], st: {}, herz: 0 }; f.parts.push(p); out.push(p); }
  return out;
}

function party(spec: { race: RaceId; cls: ClassId; level: number; weapon?: string; armor?: string }[], companions: string[], level: number): Member[] {
  const p0 = spec[0];
  const pl = makeMember('p', 'Spieler', { ...RECRUITS[0].app, race: p0.race }, p0.cls, p0.level, [...CLASSES[p0.cls].elements, ...RACES[p0.race].native], true);
  newGame(pl);
  for (const id of companions) { const rc = RECRUITS.find((r) => r.id === id)!; addMember(makeMember(rc.id, rc.name, rc.app, rc.cls, level, [...rc.elements, ...RACES[rc.app.race].native])); }
  const ups: Record<ClassId, [string, string]> = { bollwerk: ['kriegshammer', 'kettenhemd'], speer: ['hellebarde', 'kettenhemd'], kleriker: ['bannstab', 'magierrobe'], pfadfinder: ['repetier', 'wuergerleder'], geschuetz: ['bannstab', 'magierrobe'] };
  for (const m of G.party) {
    if (spec[0].weapon === 'C') { const [w, a] = ups[m.cls]; const wi = gearDefToInst(w, newUid()), ai = gearDefToInst(a, newUid()); G.gear.push(wi, ai); m.equip.weapon = wi.uid; m.equip.armor = ai.uid; }
    const s = stats(m); m.hp = s.hp; m.mp = s.mp;
  }
  return G.party;
}

function bestSpell(m: Member, enemy: F): { els: El[]; power: number; cost: number; aoe: boolean } | null {
  const cap = maxElements(m);
  const weak = enemy.d?.weak ?? [];
  const known = m.elements.filter((e) => e !== 'licht' || true);
  const dmgEls = known.filter((e) => ['feuer', 'eis', 'wasser', 'wind', 'elektro', 'licht'].includes(e));
  if (!dmgEls.length) return null;
  const w = dmgEls.find((e) => weak.includes(e)) ?? dmgEls[0];
  if (cap >= 2 && dmgEls.length >= 2) { const other = dmgEls.find((e) => e !== w && !((e === 'feuer' && w === 'eis') || (e === 'eis' && w === 'feuer') || (e === 'wasser' && w === 'elektro') || (e === 'elektro' && w === 'wasser')))!; if (other) return { els: [w, other], power: 1.54, cost: 9, aoe: false }; }
  return { els: [w], power: 1.15, cost: 4, aoe: false };
}

interface Result { win: boolean; rounds: number; hpLeft: number; potions: number }

function fight(members: Member[], enemies: string[], sk: Skill, potions = 3, carry?: F[]): Result & { P: F[]; potionsLeft: number } {
  const P: F[] = carry ?? members.map((m) => { const s = stats(m); return { name: m.name, side: 'p' as const, hp: s.hp, max: s.hp, atk: s.atk, def: s.def, mag: s.mag, spd: s.spd, mp: s.mp, next: 0, ap: 1, m, alive: true, parts: [], st: {}, herz: 0 }; });
  for (const p of P) { p.st = {}; p.herz = 0; p.ap = 1; }
  let E: F[] = enemies.flatMap(mkEnemy);
  const all = () => [...P, ...E];
  for (const f of all()) if (f.spd > 0) f.next = (100 / f.spd) * (0.5 + R() * 0.6);
  let rounds = 0, used = 0;
  const hit = (t: F, raw: number, info: { precise?: boolean; licht?: boolean } = {}) => {
    if (!t.alive) return;
    if (t.st.verkrustet) return;
    t.hp -= roll(raw, R, !!t.st.wehrlos);
    if (t.hp <= 0) {
      if (t.d?.id.startsWith('hohlmann') && !t.rose && !info.precise && !info.licht) { t.rose = true; t.hp = Math.round(t.max * 0.4); return; }
      t.alive = false;
      if (t.parent && t.parent.alive) { if (t.parent.d!.id === 'kreidemutter') t.parent.alive = false; else { t.parent.st.wehrlos = 99; t.parent.def = 0; t.parent.atk = Math.round(t.parent.atk * 0.5); } }
      for (const pp of t.parts) pp.alive = false;
    }
  };
  while (rounds < 300) {
    const eAlive = E.filter((e) => e.alive && !e.parent);
    const pAlive = P.filter((p) => p.alive);
    if (!eAlive.length) { for (const p of P) if (!p.alive) { p.alive = true; p.hp = 1; } return { win: true, rounds, hpLeft: P.reduce((a, p) => a + Math.max(0, p.hp), 0) / P.reduce((a, p) => a + p.max, 0), potions: used, P, potionsLeft: potions }; }
    if (!pAlive.length) return { win: false, rounds, hpLeft: 0, potions: used, P, potionsLeft: potions };
    const f = all().filter((x) => x.alive && x.spd > 0).sort((a, b) => a.next - b.next)[0];
    f.next += turnInterval(f.spd, !!(f.st.langsam || f.st.kreide));
    rounds++;
    f.defending = false;
    if (f.st.brand) { f.hp -= Math.max(1, Math.round(f.max * 0.06)); if (f.hp <= 0) { f.alive = false; continue; } }
    if (f.st.muede && R() < 0.35) { tick(f); continue; }
    if (f.side === 'p') {
      const m = f.m!;
      const targets = E.filter((e) => e.alive);
      // Zielwahl: Schwachstellen-Teile zuerst
      const flank = targets.find((e) => e.d?.part && !e.st.verkrustet);
      const tgt = flank ?? targets.filter((e) => !e.d?.part).sort((a, b) => a.hp - b.hp)[0];
      const low = P.filter((p) => p.alive && p.hp < p.max * 0.45).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (low && m.elements.includes('licht') && m.elements.includes('wasser') && f.mp >= 9) { f.mp -= 9; low.hp = Math.min(low.max, low.hp + healAmount(f.mag, 1.6)); }
      else if (low && low.hp < low.max * 0.3 && potions > 0) { potions--; used++; low.hp = Math.min(low.max, low.hp + 45); }
      else if (m.cls === 'kleriker' && f.ap >= 2 && P.some((p) => p.alive && p.hp < p.max * 0.6)) { f.ap -= 2; for (const p of P) if (p.alive) p.hp = Math.min(p.max, p.hp + blessAmount(f.mag)); }
      else if ((m.cls === 'geschuetz' || m.cls === 'kleriker') && tgt && bestSpell(m, tgt) && f.mp >= bestSpell(m, tgt)!.cost) {
        const sp = bestSpell(m, tgt)!; f.mp -= sp.cost;
        hit(tgt, spellDamage(f.mag, sp.power, tgt.def, { weak: sp.els.some((e) => tgt.d!.weak.includes(e)), resist: sp.els.some((e) => tgt.d!.resist.includes(e)), undeadLicht: !!tgt.d?.undead && sp.els.includes('licht') }), { licht: sp.els.includes('licht') });
      } else if (tgt) {
        const tech = CLASSES[m.cls].tech;
        let mult = 1, ign = 0, precise = R() < sk.precise;
        if (f.ap >= 2 && (tech === 'durchstoss' || tech === 'gezielter_schuss')) { f.ap -= 2; mult = tech === 'durchstoss' ? 1.7 : 2.2; ign = tech === 'durchstoss' ? 1 : 0; if (tech === 'gezielter_schuss') precise = true; }
        else if (f.ap >= 2 && tech === 'schildwall') { f.ap -= 2; f.st.schildwall = 2; f.st.taunt = 2; tick(f); continue; }
        if (precise) f.ap = Math.min(5, f.ap + 1);
        hit(tgt, physDamage(f.atk, mult, tgt.def, precise && mult === 1 ? true : precise, ign), { precise });
      }
    } else {
      const d = f.d!;
      const kl = f.parts.find((p) => p.d!.id === 'gloeckner_kloeppel');
      const fl = f.parts.find((p) => p.d!.id === 'kreidemutter_flanke');
      let pool = d.attacks.filter((a) => !(a.special === 'laeuten' && (!kl?.alive || f.st.wehrlos)) && !(a.special === 'beschwoeren' && E.filter((e) => e.alive && !e.parent).length >= 4) && !(a.special === 'verhaerten' && (!fl?.alive || fl.st.verkrustet)));
      if (f.st.wehrlos) pool = [{ name: 'x', hits: 1, power: 0.6, kind: 'parry', windup: 0, gap: 0, target: 'one' } as AttackDef];
      const tot = pool.reduce((a, x) => a + (x.weight ?? 1), 0);
      let r = R() * tot; let atk = pool[0];
      for (const a of pool) { r -= a.weight ?? 1; if (r <= 0) { atk = a; break; } }
      if (atk.special === 'beschwoeren') { const n = 1 + (R() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) { const k = mkEnemy('kreidekriecher')[0]; k.next = f.next + 5; E.push(k); } }
      else if (atk.special === 'verhaerten') fl!.st.verkrustet = 2;
      else if (atk.special === 'laeuten') { for (let s = 0; s < 3; s++) if (R() > sk.bell) for (const p of P) if (p.alive) { p.herz++; if (p.herz >= 3) { p.alive = false; p.hp = 0; } } }
      else {
        const alive = P.filter((p) => p.alive);
        const taunt = alive.find((p) => p.st.taunt);
        const targets = atk.target === 'all' ? alive : [taunt ?? alive[Math.floor(R() * alive.length)]];
        let allParried = atk.hits > 0;
        for (let i = 0; i < atk.hits; i++) {
          const instinct = targets.some((t) => t.m && (t.m.app.race === 'tiermensch' || t.m.app.race === 'halbtier'));
          const roll2 = R();
          const res = atk.kind === 'parry' && roll2 < sk.parry ? 'parry' : roll2 < sk.dodge + (instinct ? 0.1 : 0) ? 'dodge' : 'hit';
          if (res !== 'parry') allParried = false;
          for (const t of targets) {
            if (!t.alive) continue;
            if (res === 'parry') { t.ap = Math.min(5, t.ap + 1); continue; }
            if (res === 'dodge') continue;
            hit(t, enemyDamage(f.atk, atk.power, t.def, { schildwall: !!t.st.schildwall, defending: t.defending }));
            if (atk.status === 'brand' && R() < (atk.statusChance ?? 0.3)) t.st.brand = 3;
            if (atk.status === 'muede' && R() < (atk.statusChance ?? 0.3)) t.st.muede = 3;
          }
        }
        if (allParried && atk.target !== 'all' && targets[0].alive) hit(f, targets[0].atk * 0.9 * (22 / (22 + f.def)), { precise: true });
      }
    }
    tick(f);
  }
  return { win: false, rounds, hpLeft: 0, potions: used, P, potionsLeft: potions };
  function tick(f: F) { for (const k of Object.keys(f.st)) { if (k === 'wehrlos') continue; f.st[k]--; if (f.st[k] <= 0) delete f.st[k]; } for (const e of E) if (e.parent && e.st.verkrustet && f === e.parent) { /* läuft über Elternzug */ } }
}

interface Scenario { name: string; party: () => Member[]; enemies: string[]; potions: number; note: string }
const S: Scenario[] = [
  { name: 'Moor: 2 Aschhunde', note: 'Solo, Stufe 1, Mensch Speer', party: () => party([{ race: 'mensch', cls: 'speer', level: 1 }], [], 1), enemies: ['aschhund', 'aschhund'], potions: 3 },
  { name: 'Moor: 1 Aschhund', note: 'Solo, Stufe 1, Mensch Geschütz', party: () => party([{ race: 'mensch', cls: 'geschuetz', level: 1 }], [], 1), enemies: ['aschhund'], potions: 3 },
  { name: 'Kanal: Kanalwürger + Hohlmann', note: 'Solo, Stufe 2, Speer', party: () => party([{ race: 'mensch', cls: 'speer', level: 2 }], [], 2), enemies: ['kanalwuerger', 'hohlmann'], potions: 3 },
  { name: 'Kanal-Boss: Alter Kanalwürger', note: 'Solo, Stufe 3, Speer', party: () => party([{ race: 'mensch', cls: 'speer', level: 3 }], [], 3), enemies: ['kanalwuerger_alt'], potions: 3 },
  { name: 'Kanal-Boss: Alter Kanalwürger', note: 'Duo, Stufe 3, Speer + Brann', party: () => party([{ race: 'mensch', cls: 'speer', level: 3 }], ['brann'], 3), enemies: ['kanalwuerger_alt'], potions: 3 },
  { name: 'Kreide: 2 Kriecher + Hohlmann', note: 'Duo, Stufe 4, Speer + Brann', party: () => party([{ race: 'mensch', cls: 'speer', level: 4 }], ['brann'], 4), enemies: ['kreidekriecher', 'kreidekriecher', 'hohlmann'], potions: 3 },
  { name: 'Kreidemutter', note: 'Duo, Stufe 4, Speer + Brann', party: () => party([{ race: 'mensch', cls: 'speer', level: 4 }], ['brann'], 4), enemies: ['kreidemutter'], potions: 4 },
  { name: 'Kreidemutter', note: 'Duo, Stufe 5, Speer + Brann, C-Ausrüstung', party: () => party([{ race: 'mensch', cls: 'speer', level: 5, weapon: 'C' }], ['brann'], 5), enemies: ['kreidemutter'], potions: 4 },
  { name: 'Kreidemutter', note: 'Trio, Stufe 5, + Tamin, C-Ausrüstung', party: () => party([{ race: 'mensch', cls: 'speer', level: 5, weapon: 'C' }], ['brann', 'tamin'], 5), enemies: ['kreidemutter'], potions: 4 },
  { name: 'Nordtor: 2 Sitzer', note: 'Trio, Stufe 6, C-Ausrüstung', party: () => party([{ race: 'mensch', cls: 'speer', level: 6, weapon: 'C' }], ['brann', 'tamin'], 6), enemies: ['sitzer', 'sitzer'], potions: 4 },
  { name: 'Glöckner', note: 'Duo, Stufe 6, C-Ausrüstung', party: () => party([{ race: 'mensch', cls: 'speer', level: 6, weapon: 'C' }], ['brann'], 6), enemies: ['gloeckner'], potions: 4 },
  { name: 'Glöckner', note: 'Trio, Stufe 6, C-Ausrüstung', party: () => party([{ race: 'mensch', cls: 'speer', level: 6, weapon: 'C' }], ['brann', 'tamin'], 6), enemies: ['gloeckner'], potions: 4 },
  { name: 'Freier Dungeon-Anführer (Aschhund)', note: 'Duo, Stufe 4', party: () => party([{ race: 'mensch', cls: 'speer', level: 4 }], ['brann'], 4), enemies: ['aschhund_elite'], potions: 3 },
];

const N = Number(process.argv[2] ?? 400);
const filter = process.argv[3];
console.log(`Balancing-Simulation, ${N} Kämpfe je Zeile\n`);
console.log('Kampf'.padEnd(38) + 'Aufstellung'.padEnd(42) + SKILLS.map((s) => s.name.padEnd(26)).join(''));
for (const sc of S) {
  if (filter && !sc.name.includes(filter)) continue;
  const cells: string[] = [];
  for (const sk of SKILLS) {
    rng = mulberry32(42);
    let wins = 0, rounds = 0, hp = 0, pot = 0;
    for (let i = 0; i < N; i++) { const r = fight(sc.party(), sc.enemies, sk, sc.potions); if (r.win) { wins++; hp += r.hpLeft; } rounds += r.rounds; pot += r.potions; }
    cells.push(`${String(Math.round((wins / N) * 100)).padStart(3)}% Sieg, ${String(Math.round((hp / Math.max(1, wins)) * 100)).padStart(2)}% LP, ${(rounds / N).toFixed(0).padStart(3)} Z`.padEnd(26));
  }
  console.log(sc.name.padEnd(38) + sc.note.padEnd(42) + cells.join(''));
}
console.log('\nErfahrung bis Stufe: ' + [2, 3, 4, 5, 6, 7].map((l) => { let t = 0; for (let i = 1; i < l; i++) t += xpForLevel(i); return `St.${l}: ${t}`; }).join(' · '));

// ---------------------------------------------------------------- Dungeon-Durchläufe mit Abnutzung
interface Run { name: string; note: string; party: () => Member[]; fights: string[][]; restAt: number; potions: number }
const RUNS: Run[] = [
  { name: 'Kanalisation komplett', note: 'Solo, Stufe 2→3', party: () => party([{ race: 'mensch', cls: 'speer', level: 2 }], [], 2),
    fights: [['kanalwuerger'], ['kanalwuerger', 'hohlmann'], ['kanalwuerger'], ['hohlmann', 'kanalwuerger'], ['kanalwuerger'], ['kanalwuerger_alt']], restAt: 3, potions: 3 },
  { name: 'Kreidedungeon komplett', note: 'Duo, Stufe 4, + Brann', party: () => party([{ race: 'mensch', cls: 'speer', level: 4 }], ['brann'], 4),
    fights: [['kreidekriecher', 'kreidekriecher'], ['hohlmann', 'kreidekriecher'], ['kreidekriecher', 'kreidekriecher', 'hohlmann'], ['hohlmann'], ['kreidekriecher', 'hohlmann'], ['kreidekriecher', 'kreidekriecher'], ['hohlmann', 'kreidekriecher'], ['kreidemutter']], restAt: 4, potions: 4 },
  { name: 'Nordtor komplett', note: 'Trio, Stufe 5, C-Ausr.', party: () => party([{ race: 'mensch', cls: 'speer', level: 5, weapon: 'C' }], ['brann', 'tamin'], 5),
    fights: [['sitzer'], ['sitzer', 'hohlmann'], ['sitzer', 'sitzer'], ['hohlmann', 'sitzer'], ['gloeckner']], restAt: 3, potions: 4 },
];
if (!filter) {
  console.log('\nDungeon-Durchläufe (Leben und Mana bleiben zwischen den Kämpfen, eine Rast in der Mitte)');
  console.log('Durchlauf'.padEnd(38) + 'Aufstellung'.padEnd(42) + SKILLS.map((s) => s.name.padEnd(26)).join(''));
  for (const run of RUNS) {
    const cells: string[] = [];
    for (const sk of SKILLS) {
      rng = mulberry32(7);
      let ok = 0, bossHp = 0;
      for (let i = 0; i < N; i++) {
        const members = run.party();
        let carry: F[] | undefined; let pots = run.potions; let alive = true; let lastHp = 0;
        for (let k = 0; k < run.fights.length; k++) {
          if (k === run.restAt && carry) for (const p of carry) { p.hp = p.max; p.mp = stats(p.m!).mp; }
          if (k === run.fights.length - 1 && carry) lastHp = carry.reduce((a, p) => a + p.hp, 0) / carry.reduce((a, p) => a + p.max, 0);
          const r = fight(members, run.fights[k], sk, pots, carry);
          carry = r.P; pots = r.potionsLeft;
          if (!r.win) { alive = false; break; }
        }
        if (alive) ok++;
        bossHp += lastHp;
      }
      cells.push(`${String(Math.round((ok / N) * 100)).padStart(3)}% durch, Boss mit ${String(Math.round((bossHp / N) * 100)).padStart(2)}% LP`.padEnd(26));
    }
    console.log(run.name.padEnd(38) + run.note.padEnd(42) + cells.join(''));
  }
}

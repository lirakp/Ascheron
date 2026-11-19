import type { El, Rank } from './types';

export interface AttackDef {
  name: string;
  hits: number;
  power: number;
  windup: number; // ms bis zum ersten Treffer
  gap: number; // ms zwischen Treffern
  kind: 'parry' | 'dodge'; // parry: parierbar (gold); dodge: nur ausweichen (rot)
  target: 'one' | 'all';
  status?: string;
  statusChance?: number;
  text?: string;
  weight?: number;
  special?: 'laeuten' | 'beschwoeren' | 'verhaerten' | 'ziehen' | 'zurueckschneiden' | 'bluehen';
}

export interface MonsterDef {
  id: string;
  name: string;
  rank: Rank;
  hp: number; atk: number; def: number; mag: number; spd: number;
  xp: number;
  weak: El[];
  resist: El[];
  undead?: boolean;
  boss?: boolean;
  attacks: AttackDef[];
  drops: { item: string; chance: number; qty?: [number, number] }[];
  sprite: string;
  scale?: number;
  desc: string;
  part?: string; // Teil eines Bosses
  eyes?: number; // Rankenweber: erst nach allen getroffenen Rosenaugen tötbar
}

const A = (name: string, hits: number, power: number, kind: 'parry' | 'dodge', extra: Partial<AttackDef> = {}): AttackDef =>
  ({ name, hits, power, kind, windup: 900, gap: 380, target: 'one', weight: 1, ...extra });

export const MONSTERS: Record<string, MonsterDef> = {
  kanalwuerger: {
    id: 'kanalwuerger', name: 'Kanalwürger', rank: 'D', hp: 38, atk: 8, def: 3, mag: 2, spd: 7, xp: 14,
    weak: ['elektro'], resist: ['wasser'],
    attacks: [
      A('Würgegriff', 1, 1.2, 'parry', { windup: 1100 }),
      A('Sechs Hände', 3, 0.55, 'parry', { gap: 300 }),
    ],
    drops: [{ item: 'kern_klein', chance: 0.9 }, { item: 'wuergerhaut', chance: 0.5 }],
    sprite: 'm_kanalwuerger', desc: 'Blinder, aalartiger Körper von drei Metern mit sechs menschenähnlichen Händen. Zieht Opfer unter Wasser.',
  },
  kanalwuerger_alt: {
    id: 'kanalwuerger_alt', name: 'Alter Kanalwürger', rank: 'D', hp: 200, atk: 14, def: 4, mag: 3, spd: 7, xp: 60, boss: true,
    weak: ['elektro'], resist: ['wasser'],
    attacks: [
      A('Sechs Hände', 4, 0.5, 'parry', { gap: 260 }),
      A('In die Tiefe ziehen', 1, 1.6, 'dodge', { windup: 1300, status: 'ertrinken', statusChance: 1, text: 'Er will dich unter Wasser ziehen – nur Ausweichen hilft!' }),
      A('Schwanzpeitsche', 1, 0.8, 'parry', { target: 'all', windup: 1000 }),
    ],
    drops: [{ item: 'kern_mittel', chance: 1 }, { item: 'wuergerhaut', chance: 1, qty: [2, 3] }],
    sprite: 'm_kanalwuerger', scale: 1.6, desc: 'Ein Kanalwürger, der zu lange im Dunkeln gefressen hat.',
  },
  aschhund: {
    id: 'aschhund', name: 'Aschhund', rank: 'D', hp: 32, atk: 9, def: 3, mag: 2, spd: 13, xp: 12,
    weak: ['wasser', 'eis'], resist: ['feuer'],
    attacks: [
      A('Glutbiss', 2, 0.6, 'parry', { gap: 340, windup: 750, status: 'brand', statusChance: 0.3 }),
      A('Anspringen', 1, 1.1, 'parry', { windup: 650 }),
    ],
    drops: [{ item: 'glutkern', chance: 0.6 }, { item: 'aschzahn', chance: 0.7 }],
    sprite: 'm_aschhund', desc: 'Haarlos, augenlos, mit Glut im Maul. Aschhunde vergessen nie – vor ihnen gibt es keine Flucht.',
  },
  kreidekriecher: {
    id: 'kreidekriecher', name: 'Kreidekriecher', rank: 'D', hp: 30, atk: 10, def: 5, mag: 2, spd: 9, xp: 10,
    weak: ['wasser'], resist: ['erde'],
    attacks: [
      A('Kreidebiss', 1, 1.0, 'parry', { windup: 800, status: 'kreide', statusChance: 0.5, text: 'Weiße Masse härtet in der Wunde aus.' }),
      A('Fallenlassen', 1, 1.3, 'dodge', { windup: 1000 }),
    ],
    drops: [{ item: 'kreide', chance: 0.6, qty: [1, 2] }],
    sprite: 'm_kreidekriecher', desc: 'Armlange Tausendfüßler mit kreideverkrusteten Segmenten. Unter ihnen rieselt feiner Staub.',
  },
  hohlmann: {
    id: 'hohlmann', name: 'Hohlmann', rank: 'D', hp: 50, atk: 12, def: 4, mag: 1, spd: 5, xp: 16, undead: true,
    weak: ['licht'], resist: ['schatten'],
    attacks: [
      A('Schwerer Hieb', 1, 1.3, 'parry', { windup: 1300 }),
      A('Umklammern', 2, 0.6, 'parry', { windup: 1100, gap: 500 }),
    ],
    drops: [{ item: 'kern_klein', chance: 0.6 }, { item: 'plakette', chance: 0.35 }, { item: '#schlafend', chance: 0.18 }],
    sprite: 'm_hohlmann', desc: 'Ein toter Abenteurer, vom Dungeon ausgehöhlt. Steht wieder auf, bis der Kopf vom Hals getrennt ist – mit einem präzisen Treffer oder mit Licht.',
  },
  kreidemutter: {
    id: 'kreidemutter', name: 'Kreidemutter', rank: 'C', hp: 480, atk: 22, def: 14, mag: 6, spd: 6, xp: 180, boss: true,
    weak: ['wasser'], resist: ['erde', 'feuer'],
    attacks: [
      A('Kreidelawine', 1, 1.3, 'dodge', { target: 'all', windup: 1300, text: 'Eine Wand aus Kreide stürzt herab!' }),
      A('Mütterliche Umarmung', 2, 0.85, 'parry', { windup: 1000, gap: 450 }),
      A('Brut', 0, 0, 'parry', { special: 'beschwoeren', text: 'Aus ihrem Bauch kriechen Kreidekriecher.', weight: 0.6 }),
      A('Verkrusten', 0, 0, 'parry', { special: 'verhaerten', text: 'Kreide überzieht die pochende Flanke.', weight: 1.1 }),
    ],
    drops: [{ item: 'kern_kopf', chance: 1 }, { item: 'opfermuenzen', chance: 1 }, { item: '#schlafend', chance: 1 }],
    sprite: 'm_kreidemutter', scale: 1, desc: 'Ein atmender Berg aus Kreide und Fleisch. Ihre Schwachstelle: die pochende, dünne Stelle an der Flanke.',
  },
  kreidemutter_flanke: {
    id: 'kreidemutter_flanke', name: 'Pochende Flanke', rank: 'C', hp: 170, atk: 0, def: 5, mag: 0, spd: 1, xp: 0, part: 'kreidemutter',
    weak: ['wasser'], resist: [], attacks: [], drops: [],
    sprite: 'm_flanke', desc: 'Dünn, pochend, verletzlich. Zerstört sie, und die Kreidemutter fällt.',
  },
  sitzer: {
    id: 'sitzer', name: 'Sitzer', rank: 'C', hp: 170, atk: 25, def: 5, mag: 4, spd: 6, xp: 26,
    weak: ['licht'], resist: ['schatten'],
    attacks: [
      A('Kopf auf die Schulter', 1, 0.8, 'parry', { windup: 1500, status: 'muede', statusChance: 0.7, text: 'Bleierne Müdigkeit kriecht in die Glieder.' }),
      A('Langsames Fressen', 3, 0.45, 'parry', { windup: 1200, gap: 600 }),
    ],
    drops: [{ item: 'kern_klein', chance: 0.7 }, { item: 'altbrot', chance: 0.3 }],
    sprite: 'm_sitzer', desc: 'Kapuzengestalten ohne Gesicht, nur ein runder Mund mit Zähnen im Kreis. Sie bewegen sich nur, wenn niemand hinsieht. Riechen nach altem Brot.',
  },
  gloeckner: {
    id: 'gloeckner', name: 'Glöckner', rank: 'C', hp: 900, atk: 36, def: 8, mag: 6, spd: 7, xp: 240, boss: true,
    weak: ['elektro'], resist: ['schatten'],
    attacks: [
      A('Läuten', 0, 0, 'dodge', { special: 'laeuten', weight: 1.8, text: '„Ich läute für alle, die warten.“' }),
      A('Kettenschwung', 2, 0.8, 'parry', { windup: 1000, gap: 420 }),
      A('Bronzeschlag', 1, 1.3, 'dodge', { windup: 1200, target: 'all' }),
    ],
    drops: [{ item: 'glockenbronze', chance: 1 }, { item: 'kern_mittel', chance: 1 }, { item: '#schlafend', chance: 1 }],
    sprite: 'm_gloeckner', desc: 'Dürrer grauer Riese, kopfüber an einer Knochenkette. Statt Kopf eine Bronzeglocke, deren Klöppel ein toter Abenteurer ist.',
  },
  gloeckner_kloeppel: {
    id: 'gloeckner_kloeppel', name: 'Klöppel', rank: 'C', hp: 240, atk: 0, def: 7, mag: 0, spd: 1, xp: 0, part: 'gloeckner',
    weak: ['licht'], resist: [], attacks: [], drops: [], undead: true,
    sprite: 'm_kloeppel', desc: 'Ein toter Abenteurer als Klöppel. Ohne ihn ist der Glöckner wehrlos.',
  },
  blutgaenger: {
    id: 'blutgaenger', name: 'Blutgänger', rank: 'C', hp: 55, atk: 12, def: 4, mag: 3, spd: 9, xp: 24, undead: true,
    weak: ['licht', 'feuer'], resist: [],
    attacks: [
      A('Auseinanderzerren', 2, 0.7, 'parry', { gap: 360 }),
      A('Tiefes Summen', 1, 0.9, 'dodge', { target: 'all', windup: 1300, text: 'Alle summen dasselbe tiefe Lied.' }),
    ],
    drops: [{ item: 'blutkern', chance: 0.8 }],
    sprite: 'm_blutgaenger', desc: 'Hautlose Gestalten aus rotem, nassem Fleisch. Sie gehen rückwärts, mit nach hinten gedrehtem Kopf.',
  },
};

export const THORN_MONSTERS: Record<string, MonsterDef> = {
  rankenweber: {
    id: 'rankenweber', name: 'Rankenweber', rank: 'C', hp: 120, atk: 20, def: 6, mag: 6, spd: 11, xp: 48, eyes: 4,
    weak: ['feuer'], resist: ['dendro', 'wasser'],
    attacks: [
      A('Dornenseide', 2, 0.6, 'parry', { gap: 330, status: 'langsam', statusChance: 0.5, text: 'Klebrige Dornenfäden.' }),
      A('Einspinnen', 1, 1.0, 'dodge', { windup: 1200, status: 'kokon', statusChance: 0.8, text: 'Er will dich in einen Kokon spinnen!' }),
      A('Rosenbiss', 1, 1.2, 'parry', { windup: 800 }),
    ],
    drops: [{ item: 'dornenseide', chance: 0.8 }, { item: 'kern_klein', chance: 0.7 }],
    sprite: 'm_rankenweber', desc: 'Spinnen aus geflochtenen Dornenranken mit Rosen als Augen, die echtes Blut bluten. Tötbar erst, wenn alle Rosenaugen getroffen sind.',
  },
  gaertnerin: {
    id: 'gaertnerin', name: 'Gärtnerin', rank: 'B', hp: 1000, atk: 34, def: 12, mag: 10, spd: 8, xp: 420, boss: true,
    weak: ['feuer'], resist: ['dendro', 'erde'],
    attacks: [
      A('Zurückschneiden', 2, 0.95, 'parry', { special: 'zurueckschneiden', windup: 1100, gap: 420, weight: 1.4, text: '„Was aus der Reihe wächst, wird geschnitten.“' }),
      A('Rankenpeitsche', 1, 0.9, 'dodge', { target: 'all', windup: 1250 }),
      A('Blühen', 0, 0, 'parry', { special: 'bluehen', weight: 0.7, text: 'Der Dornenkäfig um die rote Rose öffnet sich – kurz.' }),
    ],
    drops: [{ item: 'herzrose', chance: 1 }, { item: 'kern_mittel', chance: 1, qty: [2, 2] }, { item: '#schlafend', chance: 1 }, { item: '#schlafend', chance: 1 }],
    sprite: 'm_gaertnerin', desc: 'Eine Frauengestalt aus geflochtenen Ranken mit breitem Dornenhut und Gartenscheren statt Händen. Ihr Herz ist die einzige rote Rose im Garten.',
  },
  gaertnerin_herz: {
    id: 'gaertnerin_herz', name: 'Rote Herzrose', rank: 'B', hp: 240, atk: 0, def: 4, mag: 0, spd: 0, xp: 0, part: 'gaertnerin',
    weak: ['feuer'], resist: [], attacks: [], drops: [],
    sprite: 'm_herzrose', desc: 'Das Herz der Gärtnerin in einem Käfig aus Dornen. Für Träger des Dornen-Tattoos öffnen sich die Dornen.',
  },
  inquisitor: {
    id: 'inquisitor', name: 'Inquisitor', rank: 'B', hp: 200, atk: 29, def: 9, mag: 14, spd: 10, xp: 90,
    weak: ['schatten'], resist: ['licht'],
    attacks: [
      A('Bannlicht', 1, 1.2, 'dodge', { windup: 1100, text: 'Für Aurelion!' }),
      A('Ketzerkette', 3, 0.5, 'parry', { gap: 300, status: 'langsam', statusChance: 0.4 }),
    ],
    drops: [{ item: 'kern_mittel', chance: 0.6 }, { item: 'heiltrank2', chance: 0.5 }],
    sprite: 'm_inquisitor', desc: 'Ein Jäger der Kirche. Er spürt die Manasignatur des Dornen-Tattoos.',
  },
};
Object.assign(MONSTERS, THORN_MONSTERS);

export function eliteOf(id: string): MonsterDef {
  const b = MONSTERS[id];
  return {
    ...b, id: b.id + '_elite', name: b.name + '-Anführer', boss: true,
    hp: Math.round(b.hp * 3.6), atk: Math.round(b.atk * 1.45), def: b.def + 2, xp: b.xp * 4, scale: 1.5,
    drops: [...b.drops, { item: 'kern_mittel', chance: 1 }, { item: '#schlafend', chance: 1 }],
  };
}

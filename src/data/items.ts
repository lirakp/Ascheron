import type { Rank, Stats, ItemInst } from './types';

export interface ItemDef {
  id: string;
  name: string;
  kind: 'consumable' | 'material' | 'key' | 'gear';
  price: number; // Silber (Kaufpreis bzw. Ankaufwert)
  desc: string;
  heal?: number; mana?: number; revive?: boolean; cleanse?: boolean;
  slot?: 'weapon' | 'armor' | 'trinket';
  rank?: Rank;
  stats?: Partial<Stats>;
}

export const ITEMS: Record<string, ItemDef> = {
  heiltrank: { id: 'heiltrank', name: 'Kleiner Heiltrank', kind: 'consumable', price: 30, heal: 45, desc: 'Stellt 45 LP wieder her.' },
  heiltrank2: { id: 'heiltrank2', name: 'Heiltrank', kind: 'consumable', price: 80, heal: 120, desc: 'Stellt 120 LP wieder her.' },
  manatrank: { id: 'manatrank', name: 'Manatrank', kind: 'consumable', price: 40, mana: 25, desc: 'Füllt 25 Mana auf (beide Flüsse).' },
  riechsalz: { id: 'riechsalz', name: 'Riechsalz', kind: 'consumable', price: 60, revive: true, desc: 'Holt Bewusstlose mit 30 % LP zurück.' },
  kraeuterbund: { id: 'kraeuterbund', name: 'Kräuterbund', kind: 'consumable', price: 15, cleanse: true, heal: 10, desc: 'Entfernt Brand, Kreide, Müdigkeit und Blutung.' },
  stilleglocke: { id: 'stilleglocke', name: 'Stilleglocke', kind: 'consumable', price: 55, desc: 'Eine Glocke ohne Klöppel aus der Kapelle. Im Kampf: Stille auf alle Feinde. In einer Erinnerungsschleife verhindert sie einen Störenfried-Bruch.' },
  proviant: { id: 'proviant', name: 'Tagesration', kind: 'consumable', price: 5, desc: 'In Dungeons zwingend. Ohne Proviant zehrt der Hunger am Trupp.' },

  moorkraut: { id: 'moorkraut', name: 'Moorkraut', kind: 'material', price: 3, desc: 'Bitteres Kraut aus den Mooren von Rabenmark.' },
  kern_klein: { id: 'kern_klein', name: 'Kleiner Monsterkern', kind: 'material', price: 15, desc: 'Das Konsortium kauft Monsterkerne an.' },
  kern_mittel: { id: 'kern_mittel', name: 'Mittlerer Monsterkern', kind: 'material', price: 70, desc: 'Ein faustgroßer Kern, warm in der Hand.' },
  kern_kopf: { id: 'kern_kopf', name: 'Kopfgroßer, pochender Kern', kind: 'material', price: 400, desc: 'Der Kern der Kreidemutter. Er pocht noch.' },
  glutkern: { id: 'glutkern', name: 'Glutkern', kind: 'material', price: 25, desc: 'Aus der Brust eines Aschhunds. Glimmt tagelang.' },
  blutkern: { id: 'blutkern', name: 'Blutkern', kind: 'material', price: 30, desc: 'Nach dem Blutmond wertlos – jetzt verkaufen!' },
  wuergerhaut: { id: 'wuergerhaut', name: 'Würgerhaut', kind: 'material', price: 10, desc: 'Ergibt wasserfestes Leder.' },
  aschzahn: { id: 'aschzahn', name: 'Aschhundzahn', kind: 'material', price: 6, desc: 'Noch warm.' },
  kreide: { id: 'kreide', name: 'Kreidebrocken', kind: 'material', price: 3, desc: 'Weiß und seltsam schwer.' },
  glockenbronze: { id: 'glockenbronze', name: 'Glockenbronze', kind: 'material', price: 160, desc: 'Ein Stück der Glocke des Glöckners. Summt leise.' },
  opfermuenzen: { id: 'opfermuenzen', name: 'Gehortete Münzen', kind: 'material', price: 140, desc: 'Münzen der Opfer der Kreidemutter. Das Konsortium wechselt sie (2 % Gebühr).' },
  altbrot: { id: 'altbrot', name: 'Altes Brot', kind: 'material', price: 1, desc: 'Riecht nach Sitzer.' },
  dornenseide: { id: 'dornenseide', name: 'Dornenseide', kind: 'material', price: 35, desc: 'Reißfest und blutig. Schneider zahlen gut.' },
  herzrose: { id: 'herzrose', name: 'Rote Herzrose', kind: 'material', price: 900, desc: 'Das Herz der Gärtnerin. Sie verwelkt nicht.' },
  erinnerungssplitter: { id: 'erinnerungssplitter', name: 'Erinnerungssplitter', kind: 'material', price: 180, desc: 'Ein Stück fremder Vergangenheit, kalt wie Glas. Sammler zahlen viel.' },
  plakette: { id: 'plakette', name: 'Kalte Seelenplakette', kind: 'key', price: 0, desc: 'Die Plakette eines toten Abenteurers. Die Gilde zahlt für die Rückgabe.' },
};

// Weltliche Ausrüstung (D bis B): sofort nutzbar, ohne Tribut
export const GEAR: Record<string, ItemDef> = {
  streitkolben: { id: 'streitkolben', name: 'Eisenstreitkolben', kind: 'gear', slot: 'weapon', rank: 'D', price: 40, stats: { atk: 4, def: 1 }, desc: 'Schwer und ehrlich.' },
  speer: { id: 'speer', name: 'Eschenspeer', kind: 'gear', slot: 'weapon', rank: 'D', price: 40, stats: { atk: 5, spd: 1 }, desc: 'Lang genug, um über einen Schild zu stechen.' },
  armbrust: { id: 'armbrust', name: 'Jagdarmbrust', kind: 'gear', slot: 'weapon', rank: 'D', price: 45, stats: { atk: 5 }, desc: 'Leicht und präzise.' },
  eichenstab: { id: 'eichenstab', name: 'Eichenstab', kind: 'gear', slot: 'weapon', rank: 'D', price: 35, stats: { atk: 1, mag: 3, mp: 4 }, desc: 'Leitet Mana einigermaßen.' },
  schwert: { id: 'schwert', name: 'Eisenschwert', kind: 'gear', slot: 'weapon', rank: 'D', price: 45, stats: { atk: 5 }, desc: 'Ein gewöhnliches Schwert.' },
  kriegshammer: { id: 'kriegshammer', name: 'Zwergenhammer', kind: 'gear', slot: 'weapon', rank: 'C', price: 160, stats: { atk: 9, def: 2 }, desc: 'Aus Eisenherz, mit Runen geschlagen.' },
  hellebarde: { id: 'hellebarde', name: 'Hellebarde', kind: 'gear', slot: 'weapon', rank: 'C', price: 160, stats: { atk: 10, spd: 1 }, desc: 'Für Raumkontrolle und Luftabwehr.' },
  langschwert: { id: 'langschwert', name: 'Stahl-Langschwert', kind: 'gear', slot: 'weapon', rank: 'C', price: 150, stats: { atk: 9 }, desc: 'Gute Schmiedearbeit aus Krähenfurt.' },
  bannstab: { id: 'bannstab', name: 'Eschenstab mit Bannkristall', kind: 'gear', slot: 'weapon', rank: 'C', price: 170, stats: { atk: 2, mag: 7, mp: 10 }, desc: 'Ein Kristall bündelt das Mana.' },
  repetier: { id: 'repetier', name: 'Repetierarmbrust', kind: 'gear', slot: 'weapon', rank: 'C', price: 170, stats: { atk: 9, spd: 2 }, desc: 'Drei Bolzen, schnell nachgeladen.' },
  runenaxt: { id: 'runenaxt', name: 'Runenaxt (B)', kind: 'gear', slot: 'weapon', rank: 'B', price: 520, stats: { atk: 15, def: 2 }, desc: 'Maximum normaler Schmiedekunst.' },

  lederwams: { id: 'lederwams', name: 'Lederwams', kind: 'gear', slot: 'armor', rank: 'D', price: 30, stats: { def: 3 }, desc: 'Besser als nichts.' },
  leinenrobe: { id: 'leinenrobe', name: 'Leinenrobe', kind: 'gear', slot: 'armor', rank: 'D', price: 30, stats: { def: 1, mp: 6 }, desc: 'Leicht, mit eingenähten Zeichen.' },
  kettenhemd: { id: 'kettenhemd', name: 'Kettenhemd', kind: 'gear', slot: 'armor', rank: 'C', price: 140, stats: { def: 7, spd: -1 }, desc: 'Klirrt bei jedem Schritt.' },
  wuergerleder: { id: 'wuergerleder', name: 'Würgerleder-Wams', kind: 'gear', slot: 'armor', rank: 'C', price: 120, stats: { def: 5, hp: 15 }, desc: 'Wasserfest, aus der Haut von Kanalwürgern.' },
  magierrobe: { id: 'magierrobe', name: 'Robe des Geschützmeisters', kind: 'gear', slot: 'armor', rank: 'C', price: 150, stats: { def: 3, mag: 3, mp: 12 }, desc: 'Mit Silberfaden bestickt.' },
  platte: { id: 'platte', name: 'Plattenpanzer (B)', kind: 'gear', slot: 'armor', rank: 'B', price: 480, stats: { def: 13, spd: -2, hp: 20 }, desc: 'Für Frontkämpfer, die Türen bewachen.' },

  bronzering: { id: 'bronzering', name: 'Bronzering', kind: 'gear', slot: 'trinket', rank: 'D', price: 50, stats: { hp: 12 }, desc: 'Ein schlichter Ring.' },
  amulett: { id: 'amulett', name: 'Sanktuariums-Amulett', kind: 'gear', slot: 'trinket', rank: 'C', price: 150, stats: { mag: 3, mp: 8 }, desc: 'Gesegnet. Angeblich.' },
  krallenkette: { id: 'krallenkette', name: 'Krallenkette', kind: 'gear', slot: 'trinket', rank: 'C', price: 130, stats: { atk: 3, spd: 1 }, desc: 'Aus Aschhundzähnen.' },
};

export function gearDefToInst(defId: string, uid: string): ItemInst {
  const d = GEAR[defId];
  return { uid, def: defId, name: d.name, slot: d.slot!, rank: d.rank!, stats: { ...d.stats }, value: d.price };
}

const SLEEP_NAMES: Record<'weapon' | 'armor' | 'trinket', string[]> = {
  weapon: ['Kreideklinge', 'Moorspeer', 'Hohlmanns Axt', 'Knochenglocken-Kolben', 'Schlackendolch', 'Glutzahn-Säbel', 'Grauer Bolzenwerfer', 'Kanalstab'],
  armor: ['Brustpanzer eines Toten', 'Kreidegrauer Mantel', 'Rabenfeder-Wams', 'Kettenhaube der Vergessenen'],
  trinket: ['Glimmender Talisman', 'Ring aus Grabeisen', 'Zahnkette', 'Kalte Brosche'],
};

// Dungeon-Ausrüstung: fällt schlafend und muss bei der Gilde definiert werden
export function rollDungeonGear(rng: () => number, dungeonRank: Rank, uid: string): ItemInst {
  const r = rng();
  const slot: 'weapon' | 'armor' | 'trinket' = r < 0.5 ? 'weapon' : r < 0.8 ? 'armor' : 'trinket';
  const roll = rng();
  // In D–B-Dungeons fällt selten A-Ausrüstung (mit Tribut)
  // Erinnerungs-Dungeons (Rang A+) haben Top-Beute
  const rank: Rank = dungeonRank === 'A' || dungeonRank === 'S' || dungeonRank === 'SS' ? (roll < 0.4 ? 'A' : 'B') : roll < 0.06 ? 'A' : roll < 0.3 ? 'B' : 'C';
  const mult = { D: 0.7, C: 1, B: 1.6, A: 2.5, S: 4, SS: 6 }[rank] * (dungeonRank === 'C' ? 1.1 : 1);
  const names = SLEEP_NAMES[slot];
  const name = names[Math.floor(rng() * names.length)] + ` (${rank})`;
  const stats: Partial<Stats> = {};
  if (slot === 'weapon') { stats.atk = Math.round(8 * mult); if (rng() < 0.4) stats.mag = Math.round(4 * mult); if (rng() < 0.3) stats.spd = Math.round(1 * mult); }
  if (slot === 'armor') { stats.def = Math.round(6 * mult); if (rng() < 0.4) stats.hp = Math.round(12 * mult); }
  if (slot === 'trinket') { const k = (['atk', 'mag', 'hp', 'mp', 'spd'] as const)[Math.floor(rng() * 5)]; stats[k] = Math.round((k === 'hp' ? 14 : k === 'mp' ? 10 : 3) * mult); }
  const inst: ItemInst = { uid, def: 'dungeon', name, slot, rank, stats, sleeping: true, value: Math.round(60 * mult * mult), origin: 'Dungeon' };
  if (rank === 'A') inst.tribut = rng() < 0.6 ? { kind: 'blut', amount: 4 } : { kind: 'mana', amount: 3 };
  return inst;
}

export const ACTIVATION_FEE: Record<Rank, number> = { D: 10, C: 25, B: 70, A: 220, S: 5000, SS: 20000 };

export const STAT_NAME: Record<keyof Stats, string> = { hp: 'LP', mp: 'Mana', atk: 'Angriff', def: 'Verteidigung', mag: 'Magie', spd: 'Tempo' };
export function statLine(s: Partial<Stats>): string {
  return (Object.keys(s) as (keyof Stats)[]).filter((k) => s[k]).map((k) => `${STAT_NAME[k]} ${s[k]! > 0 ? '+' : ''}${s[k]}`).join(', ');
}

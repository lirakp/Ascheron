export type El = 'feuer' | 'eis' | 'wasser' | 'erde' | 'dendro' | 'wind' | 'elektro' | 'schatten' | 'licht';
export type Rank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
export type Gender = 'm' | 'w';
export type RaceId = 'mensch' | 'zwerg' | 'tiermensch' | 'elf' | 'dunkelelf' | 'halbzwerg' | 'halbtier' | 'halbelf' | 'halbdunkelelf';
export type ClassId = 'bollwerk' | 'speer' | 'kleriker' | 'pfadfinder' | 'geschuetz';
export type BeastKind = 'wolf' | 'fuchs' | 'katze' | 'baer' | 'hase';
export type HairStyle = 'kurz' | 'lang' | 'zopf' | 'dutt' | 'wuschel' | 'scheitel' | 'glatze';
export type Beard = 'keiner' | 'stoppel' | 'kurz' | 'lang';
export type Build = 'schmal' | 'normal' | 'kraeftig';
export type Outfit = 'hose' | 'rock' | 'robe';

export interface Appearance {
  gender: Gender;
  race: RaceId;
  beast: BeastKind;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: string;
  beard: Beard;
  build: Build;
  outfit: Outfit;
  cloth: string;
  cloth2: string;
  tattoo?: boolean;
}

export interface Stats { hp: number; mp: number; atk: number; def: number; mag: number; spd: number; }

export interface Member {
  id: string;
  name: string;
  app: Appearance;
  cls: ClassId;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  mp2: number; // zweiter Manafluss (nur Halbwesen)
  equip: { weapon?: string; armor?: string; trinket?: string };
  elements: El[];
  isPlayer?: boolean;
  hireCost?: number;
  tattoo?: boolean;
}

export interface ItemInst {
  uid: string;
  def: string;
  name: string;
  slot: 'weapon' | 'armor' | 'trinket';
  rank: Rank;
  stats: Partial<Stats>;
  sleeping?: boolean;
  tribut?: { kind: 'blut' | 'mana' | 'ausdauer'; amount: number };
  value: number; // in Silber
  origin?: string;
  curse?: string;
  curseStats?: Partial<Stats>;
}

export interface QuestState { status: 'offen' | 'angenommen' | 'erfuellt' | 'abgegeben'; progress: number; }

export interface DungeonState {
  id: string;
  name: string;
  theme: 'sewer' | 'chalk' | 'stone' | 'moor' | 'thorn';
  rank: Rank;
  shownRank: string;
  type: 'Physisch' | 'Blut' | 'Dorn';
  enemies: string[];
  boss: string;
  rooms: number;
  frist: number; // Tage bis Ausbruch
  solved: boolean;
  broken: boolean;
  tower?: boolean;
  x: number; y: number; // Eingang auf der Weltkarte (Tiles)
  seed: number;
  generated?: boolean;
}

export interface GameState {
  version: number;
  party: Member[];
  silver: number;
  inv: Record<string, number>;
  gear: ItemInst[];
  rp: number;
  advRank: Rank;
  day: number;
  quests: Record<string, QuestState>;
  dungeons: Record<string, DungeonState>;
  formulas: string[];
  flags: Record<string, number | boolean | string>;
  pos: { x: number; y: number };
  blutmond: number;
  rep: { gilde: number; kirche: number; konsortium: number; muenze: number };
  kills: Record<string, number>;
  nextDungeonDay: number;
  uid: number;
  herbsTaken: string[];
  log: string[];
}

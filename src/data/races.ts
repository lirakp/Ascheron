import type { RaceId, Rank, El, ClassId, Stats, BeastKind } from './types';

export interface RaceDef {
  name: string;
  short: string;
  mana: Rank; // natürliches Maximum (bei Halbwesen: der stärkere Fluss)
  mana2?: Rank; // zweiter Fluss (Halbwesen: der menschliche C-Fluss)
  half?: RaceId; // Elternvolk bei Halbwesen
  magic: string;
  status: string;
  passive: string;
  tech: string;
  native: El[];
  mods: Stats;
  ears: 'mensch' | 'elf' | 'elfkurz' | 'tier';
  short_stature: boolean;
  skins: string[];
  markup: number; // Aufschlag bei menschlichen Händlern
  tattoo: string;
}

const HUMAN_SKINS = ['#f3d2b3', '#e8bb94', '#d29a6e', '#a9714a', '#7a4f33', '#553522'];
const ELF_SKINS = ['#f6dfca', '#eed0b4', '#e2bf9c', '#cfa985', '#b48a66'];
const DARK_SKINS = ['#7d7f96', '#6a6c88', '#5d5274', '#4a4a63', '#8f8aa8', '#3d3a52'];

export const RACES: Record<RaceId, RaceDef> = {
  mensch: {
    name: 'Mensch', short: 'Mensch', mana: 'C',
    magic: 'Sehr kleiner Manakreislauf, arkan schwach. Beherrschen Grundmagie aller Elemente und als einzige erweiterte Magie die Heilung.',
    status: 'Herrschende Klasse – Könige, Gilden und Militär. Gleichen ihre Schwäche mit Ausrüstung und Gesetzen aus.',
    passive: 'Anpassungsfähig: +15 % Erfahrung.',
    tech: 'klingenwirbel', native: [],
    mods: { hp: 1, mp: 0.8, atk: 1.05, def: 1, mag: 0.85, spd: 1 },
    ears: 'mensch', short_stature: false, skins: HUMAN_SKINS, markup: 0,
    tattoo: 'Dornen-Tattoo hebt das Mana auf B.',
  },
  zwerg: {
    name: 'Zwerg', short: 'Zwerg', mana: 'B',
    magic: 'Dichte Kanäle für Runenschmiede und Erdbarrieren.',
    status: 'Freie Handwerker, geschätzte Schmiede. In Kaldrion leben sie frei als Schmiede und Bergleute.',
    passive: 'Runenkundig: +20 % Verteidigung, Schmiede gewähren 10 % Rabatt.',
    tech: 'runenhieb', native: ['erde'],
    mods: { hp: 1.15, mp: 0.9, atk: 1.05, def: 1.2, mag: 0.9, spd: 0.85 },
    ears: 'mensch', short_stature: true, skins: HUMAN_SKINS, markup: 0,
    tattoo: 'Dornen-Tattoo hebt das Mana auf A.',
  },
  tiermensch: {
    name: 'Tiermensch', short: 'Tiermensch', mana: 'B',
    magic: 'Instinktive Körperverstärkung, Sinne und Tempo.',
    status: 'Werden in den Menschenreichen häufig versklavt. Viele Händler begegnen ihnen mit Misstrauen.',
    passive: 'Instinkt: deutlich größeres Ausweich-Fenster, +25 % Tempo.',
    tech: 'raubtiersprung', native: [],
    mods: { hp: 1.05, mp: 0.85, atk: 1.1, def: 0.95, mag: 0.8, spd: 1.25 },
    ears: 'tier', short_stature: false, skins: HUMAN_SKINS, markup: 0.15,
    tattoo: 'Dornen-Tattoo hebt das Mana auf A.',
  },
  elf: {
    name: 'Elf', short: 'Elf', mana: 'S',
    magic: 'Naturgewalten, Flüche und Hochmagie ohne Hilfsmittel.',
    status: 'Gejagt und versklavt. In Eschenwacht ist die Elfenjagd ein Gewerbe – zeig deine Ohren mit Bedacht.',
    passive: 'Hochmagie: Mana-Maximum S, +35 % Magie, aber zerbrechlicher Körper.',
    tech: 'naturruf', native: ['dendro', 'wind'],
    mods: { hp: 0.85, mp: 1.4, atk: 0.9, def: 0.85, mag: 1.35, spd: 1.05 },
    ears: 'elf', short_stature: false, skins: ELF_SKINS, markup: 0.3,
    tattoo: 'Dornen-Tattoo hebt Elfen auf göttlichen Rang SS.',
  },
  dunkelelf: {
    name: 'Dunkelelf', short: 'Dunkelelf', mana: 'S',
    magic: 'Beherrschen den Schatten von Natur aus, dazu Flüche und Hochmagie.',
    status: 'Gelten der Kirche als „Gottlose“. Die Nachtklüfte unter Kaldrion sind fast leer gejagt.',
    passive: 'Schattenblut: Mana-Maximum S, Schatten-Zauber +30 %.',
    tech: 'schattenstich', native: ['schatten'],
    mods: { hp: 0.85, mp: 1.35, atk: 0.95, def: 0.85, mag: 1.3, spd: 1.1 },
    ears: 'elf', short_stature: false, skins: DARK_SKINS, markup: 0.4,
    tattoo: 'Dornen-Tattoo hebt Dunkelelfen auf göttlichen Rang SS.',
  },
  halbzwerg: {
    name: 'Halbzwerg', short: 'Halbzwerg', mana: 'B', mana2: 'C', half: 'zwerg',
    magic: 'Zwei getrennte Manaflüsse: ein menschlicher (C) und ein zwergischer (B). Zu 90–95 % zwergisch im Aussehen.',
    status: 'Werden meist für Vollblut-Zwerge gehalten. Hohe Kleriker erkennen die zwei Flüsse.',
    passive: 'Doppelfluss: zwei Manaleisten, Grundmagie aus dem menschlichen Fluss.',
    tech: 'doppelwirken', native: ['erde'],
    mods: { hp: 1.1, mp: 0.85, atk: 1.05, def: 1.15, mag: 0.9, spd: 0.9 },
    ears: 'mensch', short_stature: true, skins: HUMAN_SKINS, markup: 0,
    tattoo: 'Dornen-Tattoo hebt nur den schwächeren Fluss: C auf B.',
  },
  halbtier: {
    name: 'Halb-Tiermensch', short: 'Halbtier', mana: 'B', mana2: 'C', half: 'tiermensch',
    magic: 'Zwei getrennte Manaflüsse: menschlich (C) und tierisch (B). Optisch fast vollständig Tiermensch.',
    status: 'Werden meist für Vollblut-Tiermenschen gehalten – und entsprechend versklavt oder gemieden.',
    passive: 'Doppelfluss und Instinkt: zwei Manaleisten, größeres Ausweich-Fenster.',
    tech: 'doppelwirken', native: [],
    mods: { hp: 1.05, mp: 0.85, atk: 1.05, def: 0.95, mag: 0.85, spd: 1.18 },
    ears: 'tier', short_stature: false, skins: HUMAN_SKINS, markup: 0.15,
    tattoo: 'Dornen-Tattoo hebt nur den schwächeren Fluss: C auf B.',
  },
  halbelf: {
    name: 'Halbelf', short: 'Halbelf', mana: 'S', mana2: 'C', half: 'elf',
    magic: 'Zwei getrennte Manaflüsse: menschlich (C) und elfisch (S). Ideal für Schild und Heilung zugleich.',
    status: 'Werden für Vollblut-Elfen gehalten und gejagt. Die Kirche kauft erkannte Halbwesen gern in ihren Dienst frei.',
    passive: 'Doppelfluss: zwei Manaleisten, Hochmagie aus dem elfischen Fluss.',
    tech: 'doppelwirken', native: ['dendro'],
    mods: { hp: 0.9, mp: 1.25, atk: 0.95, def: 0.9, mag: 1.2, spd: 1.05 },
    ears: 'elfkurz', short_stature: false, skins: ELF_SKINS, markup: 0.3,
    tattoo: 'Dornen-Tattoo hebt nur den schwächeren Fluss: C auf B.',
  },
  halbdunkelelf: {
    name: 'Halb-Dunkelelf', short: 'Halbdunkelelf', mana: 'S', mana2: 'C', half: 'dunkelelf',
    magic: 'Zwei getrennte Manaflüsse: menschlich (C) und dunkelelfisch (S). Der Schatten liegt im Blut.',
    status: 'Für die Kirche „Gottlose“, für Sklavenhändler wertvolle Ware. Kaum jemand ahnt das menschliche Erbe.',
    passive: 'Doppelfluss und Schattenblut: zwei Manaleisten, Schatten +20 %.',
    tech: 'doppelwirken', native: ['schatten'],
    mods: { hp: 0.9, mp: 1.2, atk: 1, def: 0.9, mag: 1.2, spd: 1.1 },
    ears: 'elfkurz', short_stature: false, skins: DARK_SKINS, markup: 0.4,
    tattoo: 'Dornen-Tattoo hebt nur den schwächeren Fluss: C auf B.',
  },
};

export const RACE_ORDER: RaceId[] = ['mensch', 'zwerg', 'tiermensch', 'elf', 'dunkelelf', 'halbzwerg', 'halbtier', 'halbelf', 'halbdunkelelf'];

export const BEASTS: Record<BeastKind, string> = { wolf: 'Wolf', fuchs: 'Fuchs', katze: 'Katze', baer: 'Bär', hase: 'Hase' };

export interface ClassDef {
  name: string;
  short: string;
  desc: string;
  base: Stats;
  grow: Stats;
  tech: string;
  elements: El[];
  weapon: string;
  armor: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  bollwerk: {
    name: 'Frontkämpfer (Bollwerk)', short: 'Bollwerk',
    desc: 'Vorhut mit Turmschild, Platte und Streitkolben. Blockiert Gänge und zieht Angriffe auf sich.',
    base: { hp: 62, mp: 10, atk: 9, def: 9, mag: 4, spd: 7 },
    grow: { hp: 10, mp: 1, atk: 1.6, def: 1.7, mag: 0.5, spd: 0.5 },
    tech: 'schildwall', elements: ['erde'], weapon: 'streitkolben', armor: 'lederwams',
  },
  speer: {
    name: 'Speerkämpfer/in', short: 'Speer',
    desc: 'Midline mit Speer oder Hellebarde. Stiche über den Schild, Raumkontrolle, Luftabwehr.',
    base: { hp: 48, mp: 12, atk: 11, def: 6, mag: 5, spd: 10 },
    grow: { hp: 7.5, mp: 1.2, atk: 2.0, def: 1.0, mag: 0.6, spd: 0.8 },
    tech: 'durchstoss', elements: ['elektro'], weapon: 'speer', armor: 'lederwams',
  },
  kleriker: {
    name: 'Kleriker (Seelenhüter)', short: 'Kleriker',
    desc: 'Zentrum mit Amulett und Stab. Heilung, Mentalschutz und der Stille-Zauber gegen Schreie. Die Kirche leiht Kleriker:innen ihre Licht-Bücher.',
    base: { hp: 42, mp: 24, atk: 6, def: 5, mag: 10, spd: 8 },
    grow: { hp: 6.5, mp: 3, atk: 0.8, def: 0.9, mag: 1.8, spd: 0.6 },
    tech: 'segen', elements: ['licht', 'wasser'], weapon: 'eichenstab', armor: 'leinenrobe',
  },
  pfadfinder: {
    name: 'Pfadfinder (Fallenbrecher)', short: 'Pfadfinder',
    desc: 'Zehn Schritte voraus, mit Armbrust und Linsen. Erkennt Hinterhalte und findet Verborgenes.',
    base: { hp: 42, mp: 14, atk: 10, def: 5, mag: 6, spd: 12 },
    grow: { hp: 6.5, mp: 1.4, atk: 1.7, def: 0.8, mag: 0.7, spd: 1.0 },
    tech: 'gezielter_schuss', elements: ['wind'], weapon: 'armbrust', armor: 'lederwams',
  },
  geschuetz: {
    name: 'Arkaner Geschützmeister', short: 'Geschütz',
    desc: 'Backline mit Stab und Ringen. Flächenvernichtung durch Elementmagie.',
    base: { hp: 36, mp: 28, atk: 5, def: 4, mag: 12, spd: 8 },
    grow: { hp: 5.5, mp: 3.2, atk: 0.6, def: 0.7, mag: 2.1, spd: 0.6 },
    tech: 'manaschub', elements: ['feuer', 'eis'], weapon: 'eichenstab', armor: 'leinenrobe',
  },
};

export const CLASS_ORDER: ClassId[] = ['bollwerk', 'speer', 'kleriker', 'pfadfinder', 'geschuetz'];

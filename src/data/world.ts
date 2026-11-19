import { MEMORY_CODEX } from './memories';
import type { Rank, DungeonState, Appearance, ClassId, El } from './types';

export const MONTHS = ['Frostmond', 'Eismond', 'Tauwind', 'Saatmond', 'Blütenmond', 'Grünmond', 'Glutmond', 'Erntemond', 'Weinmond', 'Nebelmond', 'Aschmond', 'Dunkelmond'];
export const START_YEAR = 136;

export function dateStr(day: number): string {
  const d = Math.floor(day);
  const year = START_YEAR + Math.floor(d / 360);
  const m = Math.floor((d % 360) / 30);
  return `${(d % 30) + 1}. ${MONTHS[m]} ${year} n. S.`;
}
export function queenDaysLeft(day: number): number {
  // Die Frist der Verlorenen Königin läuft bis Frostmond 139 n. S.
  return Math.max(0, 3 * 360 - Math.floor(day));
}

export const RANK_ORDER: Rank[] = ['D', 'C', 'B', 'A', 'S', 'SS'];
export const RANK_META: Record<Rank, { title: string; metal: string; rpNeeded: number }> = {
  D: { title: 'Frischfleisch', metal: 'Eisen', rpNeeded: 0 },
  C: { title: 'Veteran', metal: 'Bronze', rpNeeded: 6 },
  B: { title: 'Klinge der Krone', metal: 'Silber', rpNeeded: 18 },
  A: { title: 'Meister', metal: 'Gold', rpNeeded: 40 },
  S: { title: 'Lebende Katastrophe', metal: 'Mithril', rpNeeded: 999 },
  SS: { title: 'Lebende Katastrophe', metal: 'Orichalcum', rpNeeded: 9999 },
};

export interface QuestDef {
  id: string;
  name: string;
  rank: Rank;
  desc: string;
  reward: number; // Silber vor Blutsteuer
  rp: number;
  goal: number;
  kind: 'kill' | 'collect' | 'dungeon';
  target: string; // Monster-ID, Item-ID oder Dungeon-ID
  needRank?: Rank;
}

export const QUESTS: QuestDef[] = [
  { id: 'q_kraut', name: 'Moorkraut für den Heiler', rank: 'D', kind: 'collect', target: 'moorkraut', goal: 5, reward: 18, rp: 1,
    desc: 'Der Heiler von Krähenfurt braucht fünf Bündel Moorkraut aus den Mooren östlich der Stadt.' },
  { id: 'q_kanal', name: 'Kanalisation säubern', rank: 'D', kind: 'dungeon', target: 'kanal', goal: 1, reward: 45, rp: 2,
    desc: 'Etwas zieht Kanalarbeiter unter Wasser. Der Einstieg liegt am Gitter beim Marktplatz. Ein Physischer Dungeon – wer hineingeht, kommt nur als Sieger heraus.' },
  { id: 'q_aschhunde', name: 'Das Rudel im Moor', rank: 'D', kind: 'kill', target: 'aschhund', goal: 4, reward: 35, rp: 2,
    desc: 'Ein Aschhund-Rudel reißt Vieh östlich der Stadt. Erlegt vier von ihnen.' },
  { id: 'q_kreide', name: 'Der Weiße Hang', rank: 'C', kind: 'dungeon', target: 'kreide', goal: 1, reward: 140, rp: 4,
    desc: 'Im Südosten hat sich ein Kreidedungeon geöffnet. Zwei Trupps sind nicht zurückgekehrt. Löst ihn, bevor die Frist abläuft.' },
  { id: 'q_steg', name: 'Die stille Fischerhütte', rank: 'D', kind: 'dungeon', target: 'steg', goal: 1, reward: 30, rp: 1,
    desc: 'Eine alte Fischerhütte am Steg westlich der Stadt. Seit einem Monat kommt niemand heraus, der hineingeht. Wahrscheinlich nur ein Kanalwürger. Leichter Auftrag für Frischlinge.' },
  { id: 'q_dorn', name: 'Der Dornhag', rank: 'B', kind: 'dungeon', target: 'dornhag', goal: 1, reward: 420, rp: 8, needRank: 'C',
    desc: 'Im Wald nordöstlich der Stadt ist ein Dorn-Dungeon gewachsen. Seit die Verlorene Königin auf dem Aschfeld rüstet, meiden ihn alle. Alle zwanzig Schritte eine Falle – nehmt einen Pfadfinder mit.' },
  { id: 'q_nordtor', name: 'Das Nordtor', rank: 'C', kind: 'dungeon', target: 'nordtor', goal: 1, reward: 260, rp: 6, needRank: 'C',
    desc: 'Hinter dem alten Nordtor steht ein Turm, aus dem nachts eine Glocke läutet. Wer zu lange wartet, dem bleibt das Herz stehen. Nur für Rang C.' },
];

export function baseDungeons(): Record<string, DungeonState> {
  return {
    kanal: { id: 'kanal', name: 'Kanalisation von Krähenfurt', theme: 'sewer', rank: 'D', shownRank: 'D', type: 'Physisch',
      enemies: ['kanalwuerger', 'kanalwuerger', 'hohlmann'], boss: 'kanalwuerger_alt', rooms: 7, frist: 40, solved: false, broken: false, x: 30, y: 33, seed: 11 },
    kreide: { id: 'kreide', name: 'Kreidedungeon am Weißen Hang', theme: 'chalk', rank: 'C', shownRank: 'C', type: 'Physisch',
      enemies: ['kreidekriecher', 'kreidekriecher', 'hohlmann'], boss: 'kreidemutter', rooms: 10, frist: 55, solved: false, broken: false, x: 82, y: 54, seed: 23 },
    steg: { id: 'steg', name: 'Die stille Fischerhütte', theme: 'memory', rank: 'A', shownRank: 'D', type: 'Erinnerung', shownType: 'Physisch', story: 0,
      enemies: ['nachhall', 'erinnerungsschatten'], boss: '', rooms: 8, frist: 70, solved: false, broken: false, x: 11, y: 37, seed: 63 },
    dornhag: { id: 'dornhag', name: 'Der Dornhag', theme: 'thorn', rank: 'B', shownRank: 'B', type: 'Dorn',
      enemies: ['rankenweber', 'rankenweber', 'hohlmann'], boss: 'gaertnerin', rooms: 9, frist: 90, solved: false, broken: false, x: 58, y: 10, seed: 51 },
    nordtor: { id: 'nordtor', name: 'Nordtor-Dungeon', theme: 'stone', rank: 'C', shownRank: 'C', type: 'Physisch',
      enemies: ['sitzer', 'sitzer', 'hohlmann'], boss: 'gloeckner', rooms: 6, frist: 75, solved: false, broken: false, tower: true, x: 30, y: 4, seed: 37 },
  };
}

export interface TechDef { name: string; ap: number; desc: string; }
export const TECHS: Record<string, TechDef> = {
  klingenwirbel: { name: 'Klingenwirbel', ap: 2, desc: 'Trifft alle Feinde mit 80 % Wucht.' },
  runenhieb: { name: 'Runenhieb', ap: 2, desc: 'Ein Hieb mit 180 % Wucht, der die Hälfte der Verteidigung ignoriert.' },
  raubtiersprung: { name: 'Raubtiersprung', ap: 2, desc: 'Zwei schnelle Treffer mit je 90 % Wucht.' },
  naturruf: { name: 'Naturruf', ap: 3, desc: 'Ranken und Sturm treffen alle Feinde (Dendro) und verlangsamen sie.' },
  schattenstich: { name: 'Schattenstich', ap: 2, desc: '160 % Wucht aus dem Schatten, danach Schattenschleier.' },
  doppelwirken: { name: 'Doppelwirken', ap: 3, desc: 'Beide Manaflüsse zugleich: zwei Zauber in einem Zug.' },
  schildwall: { name: 'Schildwall', ap: 2, desc: 'Zieht alle Angriffe auf sich und erhöht die Verteidigung um 50 % für 2 Runden.' },
  durchstoss: { name: 'Durchstoß', ap: 2, desc: '170 % Wucht, ignoriert die Verteidigung vollständig.' },
  segen: { name: 'Segen', ap: 2, desc: 'Heilt den ganzen Trupp und entfernt schädliche Zustände.' },
  gezielter_schuss: { name: 'Gezielter Schuss', ap: 2, desc: '220 % Wucht. Trennt Hohlmännern sicher den Kopf ab.' },
  manaschub: { name: 'Manaschub', ap: 1, desc: 'Stellt 40 % des Manas wieder her.' },
};

export interface Recruit { id: string; name: string; cls: ClassId; level: number; cost: number; where: 'gilde' | 'kirche'; bio: string; app: Appearance; elements: El[]; }
export const RECRUITS: Recruit[] = [
  { id: 'brann', name: 'Brann Kesselfeld', cls: 'bollwerk', level: 2, cost: 60, where: 'gilde',
    bio: 'Mensch, Bronze-Veteran mit verbeultem Turmschild. Schläft vor Türen und schnarcht dabei.',
    app: { gender: 'm', race: 'mensch', beast: 'wolf', skin: '#d29a6e', hair: '#3b2a1c', hairStyle: 'kurz', eyes: '#3b5a3a', beard: 'kurz', build: 'kraeftig', outfit: 'hose', cloth: '#6c6f78', cloth2: '#3a3d44' },
    elements: ['erde'] },
  { id: 'ysra', name: 'Ysra vom Schilf', cls: 'speer', level: 2, cost: 70, where: 'gilde',
    bio: 'Fuchs-Tiermensch und freie Speerkämpferin. Trägt ihre Freikaufurkunde stets bei sich.',
    app: { gender: 'w', race: 'tiermensch', beast: 'fuchs', skin: '#e8bb94', hair: '#c4622d', hairStyle: 'zopf', eyes: '#d8a032', beard: 'keiner', build: 'schmal', outfit: 'hose', cloth: '#3f5a3a', cloth2: '#2a3a26' },
    elements: ['wind'] },
  { id: 'tamin', name: 'Bruder Tamin', cls: 'kleriker', level: 2, cost: 110, where: 'kirche',
    bio: 'Halbelf, von der Kirche „freigekauft“ und nun vermietet. Spricht wenig über die Katakomben.',
    app: { gender: 'm', race: 'halbelf', beast: 'wolf', skin: '#eed0b4', hair: '#e8e0c8', hairStyle: 'lang', eyes: '#6a8fd0', beard: 'keiner', build: 'schmal', outfit: 'robe', cloth: '#d8d0b8', cloth2: '#a08a4a' },
    elements: ['licht', 'wasser'] },
];

export const CODEX: { title: string; text: string[] }[] = [
  { title: 'Ascheron', text: [
    'Der Kontinent ist in fünf Menschenreiche geteilt: Rabenmark im Westen, Kaldrion im Norden, der Kirchenstaat Aurelsfeste in der Mitte, das reiche Veyrath im Süden und Eschenwacht im Osten.',
    'Im Nordosten liegen die Erstarrten Lande, einst das Königreich Valmor, verschlungen vom König der Ewigkeit. Auf dem Aschfeld im Osten wächst seit zwei Jahren das Eiserne Dornenreich der Verlorenen Königin.',
    'Rabenmark ist arm, voller Moore – und hat die meisten Dungeons des Kontinents.'] },
  { title: 'Dungeons', text: [
    'Jeder Dungeon ist eine Einbahnstraße: Wer eintritt, kommt nur durch Sieg wieder heraus.',
    'Ein ungelöster Dungeon bricht nach Ablauf seiner Frist aus oder löst einen Blutmond aus. Solange ein Trupp lebend im Inneren ist, steht die Frist still.',
    'Physische Dungeons zehren an Ausdauer und Vorräten – ohne Proviant hungert der Trupp.'] },
  { title: 'Ränge & Gilde', text: [
    'Die Abenteurergilde stuft Kämpfer von D (Eisen) bis SS (Orichalcum) ein. Auf jede Quest und jedes Beutestück erhebt sie 10 % Blutsteuer.',
    'Dungeon-Ausrüstung fällt schlafend und muss bei der Gilde definiert werden, bevor man sie tragen kann.',
    'Ab Rang A fordert Dungeon-Ausrüstung im Kampf einen Tribut: Blut, Körperwärme, Ausdauer oder Mana.'] },
  { title: 'Magie', text: [
    'Magie wird aus Büchern gelernt. Es gibt neun Elemente: Feuer, Eis, Wasser, Erde, Dendro, Wind, Elektro, Schatten und Licht.',
    'Ein Zauber verbindet höchstens vier Elemente – wie viele, hängt vom Mana-Rang ab (C: 1, B: 2, A: 3, S: 4). Menschen können als einzigen Zweiklang die Heilung wirken.',
    'Zwei Gegensätze in einem Zauber ergeben einen Bruchklang: instabil, oft explosiv, von der Kirche verboten. Wer über sein Mana hinaus zaubert, blutet aus Nase und Augen und verliert das Bewusstsein.',
    'Licht-Bücher verleiht nur die Kirche, Schatten-Bücher gibt es nur bei der Rostigen Münze.'] },
  { title: 'Erinnerungs-Dungeons', text: MEMORY_CODEX },
  { title: 'Die Entitäten', text: [
    'Sieben Entitäten stehen über allen Reichen: der König der Ewigkeit, die Prinzessin der Schmetterlinge, die Verlorene Königin, die Prinzessin der Dornen, der König der Stärke, der Wolf der Sünden und die Fee der zeitlosen Wünsche.',
    'Die Fee erscheint Verzweifelten am Abgrund oder in Dungeons. Sie dreht die Zeit von Zuständen zurück – und fordert dafür Erinnerungen.'] },
  { title: 'Fraktionen', text: [
    'Das Konsortium prägt alle Münzen (100 Silber = 1 Gold, 100 Gold = 1 Platin) und nimmt 2 % beim Wechsel.',
    'Die Kirche (das Sanktuarium) heilt, bannt – und vermietet ihre Kleriker teuer.',
    'Die Rostige Münze handelt im Schatten. 90 % ihrer Ausrüstung tragen Flüche der Vorbesitzer.'] },
];

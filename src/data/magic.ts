import type { El, Rank } from './types';

export const ELEMENTS: El[] = ['feuer', 'eis', 'wasser', 'erde', 'dendro', 'wind', 'elektro', 'schatten', 'licht'];
export const EL_NAME: Record<El, string> = {
  feuer: 'Feuer', eis: 'Eis', wasser: 'Wasser', erde: 'Erde', dendro: 'Dendro',
  wind: 'Wind', elektro: 'Elektro', schatten: 'Schatten', licht: 'Licht',
};
export const EL_COLOR: Record<El, string> = {
  feuer: '#ff7a3a', eis: '#9be3ff', wasser: '#3f8fe8', erde: '#b08a52', dendro: '#62c25a',
  wind: '#c9f0d6', elektro: '#e6dd4a', schatten: '#8c62c8', licht: '#fff2b0',
};
export const OPPOSITE: Partial<Record<El, El>> = {
  feuer: 'eis', eis: 'feuer', licht: 'schatten', schatten: 'licht',
  erde: 'wind', wind: 'erde', wasser: 'elektro', elektro: 'wasser',
};

export type SpellKind = 'dmg' | 'heal' | 'buff' | 'debuff' | 'cleanse';
export type Target = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';

export interface SpellDef {
  key: string;
  name: string;
  els: El[];
  kind: SpellKind;
  target: Target;
  power: number;
  status?: string;
  desc: string;
  bruch?: boolean;
  forbidden?: boolean;
}

const R = (els: El[], name: string, kind: SpellKind, target: Target, power: number, desc: string, status?: string): SpellDef =>
  ({ key: keyOf(els), name, els, kind, target, power, desc, status });

export function keyOf(els: El[]): string {
  return [...els].sort((a, b) => ELEMENTS.indexOf(a) - ELEMENTS.indexOf(b)).join('+');
}

// Benannte Zauber aus der Welt-Bibel (plus wenige ergänzte Grundzauber)
const NAMED: SpellDef[] = [
  R(['feuer'], 'Funke', 'dmg', 'enemy', 1.25, 'Ein Funke, der sich in Fleisch frisst. Kann Brand verursachen.', 'brand'),
  R(['eis'], 'Frosthauch', 'dmg', 'enemy', 1.1, 'Eisiger Atem. Verlangsamt das Ziel.', 'langsam'),
  R(['erde'], 'Steinhaut', 'buff', 'ally', 0, 'Die Haut wird zu Stein: Verteidigung stark erhöht.', 'steinhaut'),
  R(['schatten'], 'Schattenschleier', 'buff', 'ally', 0, 'Ein Schleier aus Dunkelheit. Der nächste Treffer verfehlt oft.', 'schleier'),
  R(['licht'], 'Lichtfunke', 'dmg', 'enemy', 1.15, 'Reines Licht. Besonders wirksam gegen Untote und Hohlmänner.'),
  R(['wasser'], 'Wasserpeitsche', 'dmg', 'enemy', 1.1, 'Ein Strahl aus Wasser. Löscht Glut, weicht Kreide auf.'),
  R(['dendro'], 'Rankengriff', 'debuff', 'enemy', 0.7, 'Ranken fesseln das Ziel: Tempo sinkt.', 'langsam'),
  R(['wind'], 'Windschnitt', 'dmg', 'enemy', 1.15, 'Eine Klinge aus Luft.'),
  R(['elektro'], 'Zucken', 'dmg', 'enemy', 1.1, 'Ein Blitzschlag mit Chance auf Lähmung.', 'betaeubt'),
  R(['licht', 'wasser'], 'Heilung', 'heal', 'ally', 1.6, 'Schließt Fleischwunden. Der einzige Zweiklang, den Menschen mit Mana C wirken können.'),
  R(['feuer', 'wasser'], 'Dampfstoß', 'dmg', 'enemies', 1.05, 'Kochender Dampf trifft alle Feinde.'),
  R(['wind', 'schatten'], 'Stille', 'debuff', 'enemies', 0, 'Löscht jeden Klang. Feinde können keine Sonderangriffe wirken; Wesen aus Klang vergehen.', 'stille'),
  R(['erde', 'dendro'], 'Dornenwall', 'buff', 'allies', 0, 'Ein Wall aus Dornen schützt den Trupp und verletzt Angreifer.', 'dornenwall'),
  R(['wind', 'elektro'], 'Kettenblitz', 'dmg', 'enemies', 1.15, 'Ein Blitz springt von Feind zu Feind.', 'betaeubt'),
  R(['wasser', 'erde', 'dendro'], 'Sumpfgrab', 'dmg', 'enemies', 1.35, 'Der Boden wird zu Morast und zieht alle Feinde hinab.', 'langsam'),
  R(['licht', 'wind', 'feuer'], 'Bannlicht', 'dmg', 'enemies', 1.4, 'Grundlage der Bannmagie. Verheerend gegen Untote, bricht Erinnerungsschleifen.'),
  R(['eis', 'wind', 'elektro'], 'Frostgewitter', 'dmg', 'enemies', 1.5, 'Ein Sturm aus Eis und Blitz.', 'langsam'),
  R(['licht', 'wasser', 'erde', 'dendro'], 'Läuterung', 'heal', 'allies', 1.8, 'Reinigt Krater und Wunden gleichermaßen. Heilt den ganzen Trupp und entfernt Zustände.'),
  R(['feuer', 'wind', 'erde', 'schatten'], 'Aschesturm', 'dmg', 'enemies', 2.0, 'Ein Sturm aus glühender Asche.', 'brand'),
];

const BY_KEY = new Map(NAMED.map((s) => [s.key, s]));

export function hasOpposites(els: El[]): boolean {
  return els.some((e) => els.includes(OPPOSITE[e] as El));
}

export function resolveSpell(els: El[]): SpellDef | null {
  if (els.length === 0 || els.length > 4) return null;
  const key = keyOf(els);
  if (hasOpposites(els)) {
    return {
      key, els, name: 'Bruchklang (' + els.map((e) => EL_NAME[e]).join('·') + ')',
      kind: 'dmg', target: 'enemies', power: 0.9 + els.length * 0.4, bruch: true, forbidden: true,
      desc: 'Zwei Gegensätze in einem Zauber: instabil, oft explosiv, von der Kirche verboten. Kann auf den Wirkenden zurückschlagen.',
    };
  }
  const named = BY_KEY.get(key);
  if (named) return named;
  // Freie Kombination: Schaden nach Elementzahl
  const multi = els.length;
  return {
    key, els, name: (['', 'Grundklang', 'Zweiklang', 'Dreiklang', 'Vierklang'][multi]) + ' (' + els.map((e) => EL_NAME[e]).join('·') + ')',
    kind: 'dmg', target: multi >= 3 ? 'enemies' : 'enemy', power: 0.9 + multi * 0.32,
    desc: 'Eine ungebundene Verbindung der Elemente. Wirkt, aber ohne die Feinheit einer überlieferten Formel.',
  };
}

export function spellCost(els: El[]): number {
  return [0, 4, 9, 16, 26][els.length] ?? 99;
}

export const RANK_ELEMENTS: Record<Rank, number> = { D: 1, C: 1, B: 2, A: 3, S: 4, SS: 4 };
export const STAGE_NAME = ['', 'Grundmagie', 'Zweiklang', 'Dreiklang', 'Vierklang'];

export function levelElementCap(level: number): number {
  return level < 4 ? 2 : level < 8 ? 3 : 4;
}

export const ELEMENT_BOOKS: Record<El, { seller: 'konsortium' | 'kirche' | 'muenze'; price: number; name: string }> = {
  feuer: { seller: 'konsortium', price: 90, name: 'Grimoire der Glut' },
  eis: { seller: 'konsortium', price: 90, name: 'Grimoire des Frostes' },
  wasser: { seller: 'konsortium', price: 80, name: 'Grimoire der Gezeiten' },
  erde: { seller: 'konsortium', price: 80, name: 'Grimoire des Gesteins' },
  dendro: { seller: 'konsortium', price: 100, name: 'Grimoire des Wurzelwerks' },
  wind: { seller: 'konsortium', price: 90, name: 'Grimoire der Böen' },
  elektro: { seller: 'konsortium', price: 110, name: 'Grimoire des Gewitters' },
  licht: { seller: 'kirche', price: 160, name: 'Lichtfibel des Sanktuariums' },
  schatten: { seller: 'muenze', price: 130, name: 'Verbotenes Schattenbuch' },
};

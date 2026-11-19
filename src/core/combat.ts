// Reine Kampfformeln – genutzt von der Kampfszene und von der Balancing-Simulation.

export const variance = (rng: () => number = Math.random) => 0.9 + rng() * 0.2;

/** Schaden eines Waffenangriffs (vor Zufallsstreuung). */
export function physDamage(atk: number, mult: number, def: number, precise: boolean, ignoreDef = 0): number {
  const d = def * (1 - ignoreDef);
  return atk * mult * (precise ? 1.5 : 1) * (22 / (22 + d));
}

export interface DefBuffs { steinhaut?: boolean; schildwall?: boolean; dornenwall?: boolean; defending?: boolean }
/** Schaden eines Gegnertreffers auf ein Truppmitglied. */
export function enemyDamage(atk: number, power: number, def: number, b: DefBuffs = {}): number {
  const d = def * (b.steinhaut ? 1.8 : 1) * (b.schildwall ? 1.5 : 1) * (b.dornenwall ? 1.3 : 1);
  let raw = atk * power * 1.35 * (26 / (26 + d));
  if (b.defending) raw *= 0.5;
  return raw;
}

/** Zauberschaden. */
export function spellDamage(mag: number, power: number, def: number, o: { weak?: boolean; resist?: boolean; undeadLicht?: boolean; bonus?: number } = {}): number {
  let base = mag * power * 0.8 * (o.bonus ?? 1) + 3;
  base *= 26 / (26 + def * 0.6);
  if (o.weak) base *= 1.5;
  if (o.resist) base *= 0.5;
  if (o.undeadLicht) base *= 1.3;
  return base;
}

export function healAmount(mag: number, power: number): number { return Math.round(mag * power * 1.1 + 10); }
export function blessAmount(mag: number): number { return Math.round(mag * 0.9 + 8); }

/** Endgültiger Schaden mit Streuung. */
export function roll(raw: number, rng: () => number = Math.random, wehrlos = false): number {
  let d = Math.max(1, Math.round(raw * variance(rng)));
  if (wehrlos) d = Math.round(d * 1.5);
  return d;
}

/** Tempo-Intervall der Zeitleiste. */
export function turnInterval(spd: number, slowed: boolean): number { return (100 / Math.max(1, spd)) * (slowed ? 1.5 : 1); }

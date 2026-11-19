import { G, stats, money, maxMp2, isHalf } from '../core/state';
import { dateStr } from '../data/world';
import { h, UI, bar, clear } from './dom';
import { ico } from '../gfx/icons';

let root: HTMLElement | null = null;
let loc = '';
let hint = '';

export function showHud(location: string, keyHint = 'E: Interagieren · Esc: Menü'): void {
  loc = location; hint = keyHint;
  if (!root) { root = h('div', { class: 'passthru', style: 'position:absolute;inset:0' }); UI().prepend(root); }
  updateHud();
}
export function hideHud(): void { root?.remove(); root = null; }

export function updateHud(): void {
  if (!root) return;
  clear(root);
  const top = h('div', { class: 'hud-top' },
    h('div', { class: 'row' },
      h('div', { class: 'hud-chip' }, dateStr(G.day)),
      h('div', { class: 'hud-chip' }, loc),
      G.blutmond > 0 ? h('div', { class: 'hud-chip blut' }, `☾ Blutmond (${G.blutmond} Tage)`) : null),
    h('div', { class: 'row' },
      h('div', { class: 'hud-chip' }, ico('plakette'), `Rang ${G.advRank}`),
      h('div', { class: 'hud-chip gold' }, ico('coin'), money(G.silver)),
      h('div', { class: 'hud-chip' }, ico('bread'), `${G.inv.proviant ?? 0}`)));
  const party = h('div', { class: 'hud-party' }, ...G.party.map((m) => {
    const s = stats(m);
    return h('div', { class: 'pcard' },
      h('div', { class: 'row' }, h('span', { class: 'grow' }, m.name), h('span', { class: 'dim' }, `St. ${m.level}`)),
      bar('hp', m.hp, s.hp), bar('mp', m.mp, s.mp), isHalf(m) ? bar('mp2', m.mp2, maxMp2(m)) : null);
  }));
  root.appendChild(top);
  root.appendChild(party);
  root.appendChild(h('div', { class: 'hud-hint' }, hint));
}

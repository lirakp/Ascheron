import { G, fullHeal, log, save, load } from '../core/state';
import { feeCost } from '../core/game';
import { SFX } from '../core/sfx';
import { h, btn, UI, toast } from './dom';
import { updateHud } from './hud';

/** Die Fee der zeitlosen Wünsche erscheint am Abgrund: Wiederbelebung gegen eine Erinnerung. */
export function showFee(onRevive: () => void, onDecline: () => void): void {
  SFX.fee();
  const cost = feeCost();
  const back = h('div', { class: 'modal-back' });
  const panel = h('div', { class: 'panel modal fee', style: 'width:560px' },
    h('h2', {}, 'Die Fee der zeitlosen Wünsche'),
    h('div', { class: 'sub' }, 'Ein Licht, kleiner als ein Glühwürmchen. Eine Stimme wie ein Uhrwerk.'),
    h('p', {}, '„Dein Zustand ist… beendet. Ich kann seine Zeit zurückdrehen. Doch alles hat einen Preis, und ich nehme nur Erinnerungen.“'),
    h('p', { class: 'gold' }, cost.text),
    h('div', { class: 'foot', style: 'justify-content:center' },
      btn('Den Wunsch annehmen', () => {
        back.remove(); cost.apply(); for (const m of G.party) fullHeal(m); log('Die Fee hat eine Erinnerung genommen.');
        onRevive(); save(); updateHud(); toast('Du erwachst. Etwas fehlt – du weißt nur nicht mehr, was.', 'big', 5000);
      }, { cls: 'sel' }),
      btn('Ablehnen (letzter Spielstand)', () => { back.remove(); if (load()) onDecline(); else { for (const m of G.party) fullHeal(m); onRevive(); } }, { cls: 'danger' })));
  back.appendChild(panel);
  UI().appendChild(back);
}

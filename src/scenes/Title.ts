import Phaser from 'phaser';
import { h, btn, UI, dialog } from '../ui/dom';
import { openCreation } from '../ui/create';
import { hasSave, load, newGame, save } from '../core/state';
import { SFX } from '../core/sfx';
import { battleBg } from '../gfx/backgrounds';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create(): void {
    if (!this.textures.exists('bg_moor')) this.textures.addCanvas('bg_moor', battleBg('moor'));
    this.add.image(0, 0, 'bg_moor').setOrigin(0).setScale(3);
    this.add.rectangle(0, 0, 960, 540, 0x070a14, 0.35).setOrigin(0);
    // Nebel
    const fog = this.add.particles(0, 0, 'px', {
      x: { min: -100, max: 960 }, y: { min: 380, max: 540 }, speedX: { min: 4, max: 12 }, speedY: { min: -6, max: -2 }, scale: 0.75,
      alpha: { start: 0.6, end: 0 }, lifespan: 6000, frequency: 160, tint: 0xb0e070,
    });
    fog.setDepth(2);
    // Krähen
    for (let i = 0; i < 5; i++) {
      const c = this.add.text(-40 - i * 70, 120 + i * 22, 'v', { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '16px', color: '#05060b' });
      this.tweens.add({ targets: c, x: 1000, y: c.y - 40, duration: 18000 + i * 2000, repeat: -1, delay: i * 1500 });
    }
    this.showMenu();
  }

  showMenu(): void {
    const root = h('div', { class: 'title title-screen' },
      h('h1', {}, 'ASCHERON'),
      h('div', { class: 'tag2' }, 'Rabenmark, Frostmond 136 n. S. – drei Jahre bis zum Ende der Frist der Verlorenen Königin.'),
      btn('Neues Spiel', () => { SFX.ui(); root.remove(); this.startCreation(); }),
      btn('Fortsetzen', () => { if (load()) { SFX.ui(); root.remove(); this.scene.start('World'); } }, { disabled: !hasSave() }),
      h('div', { class: 'foot2' }, 'Bewegen: WASD/Pfeile · Interagieren: E/Leertaste · Menü: Esc · Im Kampf: Leertaste = Parieren, Umschalt = Ausweichen'));
    UI().appendChild(root);
  }

  startCreation(): void {
    openCreation((m) => {
      newGame(m);
      save();
      dialog([
        { who: 'Erzähler', text: `Krähenfurt, Rabenmark. Frostmond im Jahr 136 nach der Schlacht. Die Moore dampfen, und irgendwo unter der Stadt zieht etwas Kanalarbeiter ins Wasser.` },
        { who: 'Erzähler', text: `${m.name}, du trägst die eiserne Plakette der Gilde – Rang D, „Frischfleisch“. Vierzig von hundert deinesgleichen sterben in den ersten drei Monaten.` },
        { who: 'Erzähler', text: 'Jeder Dungeon ist eine Einbahnstraße: Wer eintritt, kommt nur als Sieger wieder heraus. Kauf Proviant, bevor du hineingehst.' },
        { who: 'Erzähler', text: 'Die Abenteurergilde liegt im Nordwesten der Stadt. Dort warten Aufträge – und Gefährten, wenn du sie bezahlen kannst.' },
      ], () => this.scene.start('World'));
    });
  }
}

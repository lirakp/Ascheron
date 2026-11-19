import Phaser from 'phaser';
import { h, btn, UI, dialog } from '../ui/dom';
import { openCreation } from '../ui/create';
import { hasSave, load, newGame, save } from '../core/state';
import { SFX } from '../core/sfx';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create(): void {
    const g = this.add.graphics();
    // Himmel
    for (let y = 0; y < 540; y += 4) {
      const t = y / 540;
      g.fillStyle(Phaser.Display.Color.GetColor(14 + t * 30, 12 + t * 16, 18 + t * 10), 1);
      g.fillRect(0, y, 960, 4);
    }
    // Mond
    g.fillStyle(0xd8c8a8, 0.12); g.fillCircle(700, 150, 90);
    g.fillStyle(0xe8dcc0, 1); g.fillCircle(700, 150, 58);
    g.fillStyle(0xcfc2a4, 1); g.fillCircle(680, 135, 10); g.fillCircle(720, 170, 7);
    // Silhouette Krähenfurt
    g.fillStyle(0x0a0807, 1);
    const sil = [[0, 420], [80, 410], [120, 380], [140, 380], [140, 350], [160, 330], [180, 350], [180, 390], [260, 395], [300, 360], [330, 360], [330, 300], [345, 270], [360, 300], [360, 380], [420, 390], [470, 370], [520, 375], [560, 340], [600, 340], [600, 380], [700, 400], [780, 385], [860, 405], [960, 395], [960, 540], [0, 540]];
    g.beginPath(); g.moveTo(sil[0][0], sil[0][1]); for (const [x, y] of sil) g.lineTo(x, y); g.closePath(); g.fillPath();
    g.fillStyle(0x2a2016, 1);
    for (const [x, y] of [[150, 360], [345, 300], [345, 320], [580, 355]]) g.fillRect(x, y, 4, 6);
    // Nebel
    const fog = this.add.particles(0, 0, 'glow', {
      x: { min: -100, max: 960 }, y: { min: 380, max: 540 }, speedX: { min: 6, max: 18 }, scale: { min: 3, max: 7 },
      alpha: { start: 0.08, end: 0 }, lifespan: 9000, frequency: 220, tint: 0xbab0a0,
    });
    fog.setDepth(2);
    // Krähen
    for (let i = 0; i < 5; i++) {
      const c = this.add.text(-40 - i * 70, 120 + i * 22, 'ᵛ', { fontSize: '18px', color: '#000' });
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

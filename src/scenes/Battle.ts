import Phaser from 'phaser';
import { G, stats, maxMp2, isHalf, gearOf, maxElements, giveXp, itemName } from '../core/state';
import type { Member, El } from '../data/types';
import { MONSTERS, eliteOf, MonsterDef, AttackDef } from '../data/monsters';
import { RACES, CLASSES } from '../data/races';
import { TECHS } from '../data/world';
import { ITEMS } from '../data/items';
import { resolveSpell, spellCost, EL_NAME, EL_COLOR, SpellDef, keyOf } from '../data/magic';
import { ensureChar } from '../gfx/tex';
import { h, btn, UI, clear, bar, toast } from '../ui/dom';
import { hideHud } from '../ui/hud';
import { setEsc } from '../core/input';
import { SFX } from '../core/sfx';
import { rollDrops, grantLoot, onKill } from '../core/game';

interface Fighter {
  id: number;
  side: 'p' | 'e';
  name: string;
  member?: Member;
  mdef?: MonsterDef;
  hp: number; maxHp: number;
  atk: number; def: number; mag: number; spd: number;
  spr: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  hx: number; hy: number;
  next: number;
  st: Record<string, number>;
  ap: number;
  defending: boolean;
  alive: boolean;
  rose?: boolean;
  parent?: Fighter;
  parts: Fighter[];
  herz: number;
  barG?: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  scale: number;
}

interface BattleData { enemies: string[]; bg: string; caller: string; roamer?: unknown; canFlee?: boolean; ambush?: boolean; }
interface HitInfo { precise?: boolean; licht?: boolean; tech?: string; }

const STATUS_NAME: Record<string, string> = {
  brand: 'Brand', langsam: 'Verlangsamt', betaeubt: 'Betäubt', steinhaut: 'Steinhaut', schleier: 'Schleier', stille: 'Stille',
  dornenwall: 'Dornenwall', kreide: 'Verkreidet', muede: 'Müde', ertrinken: 'Ertrinkt', blutung: 'Blutung', ohnmacht: 'Ohnmacht',
  verkrustet: 'Verkrustet', wehrlos: 'Wehrlos', schildwall: 'Schildwall', taunt: 'Provoziert',
};
const BAD = ['brand', 'langsam', 'betaeubt', 'kreide', 'muede', 'ertrinken', 'blutung', 'ohnmacht'];

export class BattleScene extends Phaser.Scene {
  data_!: BattleData;
  F: Fighter[] = [];
  uid = 0;
  ui!: HTMLElement;
  menuEl!: HTMLElement;
  subEl!: HTMLElement | null;
  partyEl!: HTMLElement;
  tlEl!: HTMLElement;
  banner!: Phaser.GameObjects.Text;
  ringG!: Phaser.GameObjects.Graphics;
  qte: { x: number; y: number; t0: number; t1: number; color: number; r0: number } | null = null;
  pressLog: { key: 'parry' | 'dodge' | 'atk' | 'left' | 'right'; t: number }[] = [];
  keyH!: (e: KeyboardEvent) => void;
  over = false;
  current: Fighter | null = null;
  selecting: ((f: Fighter | null) => void) | null = null;
  selList: Fighter[] = [];
  selIdx = 0;
  selArrow!: Phaser.GameObjects.Text;
  menuKeys: Record<string, () => void> = {};

  constructor() { super('Battle'); }

  init(d: BattleData): void { this.finished = false; this.data_ = d; this.F = []; this.uid = 0; this.over = false; this.qte = null; this.pressLog = []; this.selecting = null; this.subEl = null; }

  create(): void {
    this.drawBackground(this.data_.bg);
    this.ringG = this.add.graphics().setDepth(40);
    this.banner = this.add.text(480, 62, '', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#f0e2c0', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(60);
    this.selArrow = this.add.text(0, 0, '▼', { fontSize: '22px', color: '#e0ad4a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(61).setVisible(false);
    this.tweens.add({ targets: this.selArrow, y: '+=6', yoyo: true, repeat: -1, duration: 300 });

    // Trupp
    const pslots = [[250, 250], [205, 335], [250, 420]];
    G.party.forEach((m, i) => {
      const key = 'b_' + m.id;
      ensureChar(this, key, m.app, true);
      const [x, y] = pslots[i];
      const spr = this.add.sprite(x, y, key, 6).setScale(4).setDepth(20 + i);
      const s = stats(m);
      const f = this.addFighter({ side: 'p', name: m.name, member: m, hp: m.hp, maxHp: s.hp, atk: s.atk, def: s.def, mag: s.mag, spd: s.spd, spr, hx: x, hy: y, scale: 4 });
      if (m.hp <= 0) { f.alive = false; spr.setAngle(-90).setAlpha(0.5); }
    });

    // Gegner
    const blut = G.blutmond > 0 ? 1.2 : 1;
    const eslots = [[700, 290], [810, 220], [820, 380], [610, 410]];
    let slot = 0;
    for (const id of this.data_.enemies) {
      const def = id.endsWith('_elite') ? eliteOf(id.replace('_elite', '')) : MONSTERS[id];
      const isBig = def.boss && (def.id === 'kreidemutter' || def.id === 'gloeckner');
      const [x, y] = isBig ? [720, 300] : eslots[slot++ % eslots.length];
      const sc = (def.scale ?? 1) * (isBig ? 3.2 : def.sprite === 'm_aschhund' || def.sprite === 'm_kanalwuerger' || def.sprite === 'm_kreidekriecher' ? 3.2 : 3.4);
      const spr = this.add.image(x, y, def.sprite).setScale(def.id === 'gloeckner' ? 2.6 : sc).setDepth(15 + slot);
      if (def.id === 'gloeckner') spr.setY(250);
      const f = this.addFighter({ side: 'e', name: def.name, mdef: def, hp: Math.round(def.hp * blut), maxHp: Math.round(def.hp * blut), atk: Math.round(def.atk * blut), def: def.def, mag: def.mag, spd: def.spd, spr, hx: spr.x, hy: spr.y, scale: spr.scaleX });
      this.tweens.add({ targets: spr, y: spr.y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.easeInOut' });
      if (def.id === 'kreidemutter') {
        const fl = MONSTERS.kreidemutter_flanke;
        const fs = this.add.image(x + 70, y + 30, fl.sprite).setScale(2.4).setDepth(30);
        this.tweens.add({ targets: fs, scale: 2.8, yoyo: true, repeat: -1, duration: 420 });
        const p = this.addFighter({ side: 'e', name: fl.name, mdef: fl, hp: fl.hp, maxHp: fl.hp, atk: 0, def: fl.def, mag: 0, spd: 0, spr: fs, hx: fs.x, hy: fs.y, scale: 2.4 });
        p.parent = f; f.parts.push(p);
      }
      if (def.id === 'gloeckner') {
        const kd = MONSTERS.gloeckner_kloeppel;
        const ks = this.add.image(x, 250 + 84 * 1.3 - 10, kd.sprite).setScale(2.6).setDepth(30);
        this.tweens.add({ targets: ks, angle: { from: -12, to: 12 }, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
        const p = this.addFighter({ side: 'e', name: kd.name, mdef: kd, hp: kd.hp, maxHp: kd.hp, atk: 0, def: kd.def, mag: 0, spd: 0, spr: ks, hx: ks.x, hy: ks.y, scale: 2.6 });
        p.parent = f; f.parts.push(p);
      }
    }
    for (const f of this.F) {
      if (f.side === 'e') {
        f.barG = this.add.graphics().setDepth(45);
        f.label = this.add.text(f.hx, 0, f.name, { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f0e2c0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(45);
        f.spr.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickTarget(f));
      } else f.spr.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickTarget(f));
      f.next = (100 / Math.max(1, f.spd)) * (0.5 + Math.random() * 0.6);
      if (f.side === 'p') f.ap = 1;
    }

    // UI
    hideHud();
    this.ui = h('div', { class: 'battle-ui', style: 'position:absolute;inset:0;pointer-events:none' });
    UI().appendChild(this.ui);
    this.tlEl = h('div', { class: 'bt-timeline' }); this.ui.appendChild(this.tlEl);
    this.partyEl = h('div', { class: 'bt-party', style: 'left:12px;top:44px;right:auto;bottom:auto' }); this.ui.appendChild(this.partyEl);
    this.menuEl = h('div', { class: 'panel bt-menu', style: 'pointer-events:auto;display:none' }); this.ui.appendChild(this.menuEl);
    this.ui.appendChild(h('div', { class: 'bt-keys', style: 'pointer-events:auto' },
      h('button', { class: 'b', onpointerdown: (e: Event) => { e.preventDefault(); this.press('parry'); } }, 'Parieren ␣'),
      h('button', { class: 'b', onpointerdown: (e: Event) => { e.preventDefault(); this.press('dodge'); } }, 'Ausweichen ⇧')));
    this.renderParty();

    this.keyH = (e: KeyboardEvent) => this.onKey(e);
    window.addEventListener('keydown', this.keyH);
    setEsc(() => this.cancel());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { window.removeEventListener('keydown', this.keyH); this.ui?.remove(); });

    this.cameras.main.fadeIn(250);
    const ambush = this.data_.ambush || (this.F.some((f) => f.mdef?.id === 'kreidekriecher') && !G.party.some((m) => m.cls === 'pfadfinder'));
    if (ambush) {
      for (const f of this.F) if (f.side === 'e') f.next *= 0.2;
      this.say('Hinterhalt! Sie lassen sich von der Decke fallen!', '#ff9a90');
    } else this.say(this.F.some((f) => f.mdef?.boss) ? `${this.F.find((f) => f.mdef?.boss)!.name}!` : 'Kampf!');
    this.time.delayedCall(900, () => this.loop());
  }

  addFighter(o: Partial<Fighter> & { side: 'p' | 'e'; name: string; spr: Fighter['spr']; hx: number; hy: number; hp: number; maxHp: number; atk: number; def: number; mag: number; spd: number; scale: number }): Fighter {
    const f: Fighter = { id: this.uid++, next: 0, st: {}, ap: 0, defending: false, alive: true, parts: [], herz: 0, ...o } as Fighter;
    this.F.push(f);
    return f;
  }

  drawBackground(bg: string): void {
    const g = this.add.graphics().setDepth(0);
    const pal: Record<string, [number, number, number]> = {
      moor: [0x1a2018, 0x2c3624, 0x3a4630], sewer: [0x0e140e, 0x1c241a, 0x2a3424], chalk: [0x2a2824, 0x8a8478, 0xb8b2a2],
      stone: [0x121012, 0x24201e, 0x3a3430], tower: [0x0a0808, 0x1c1916, 0x2c2824], blut: [0x2a0606, 0x4a1010, 0x3a2020],
    };
    const [top, mid, ground] = pal[bg] ?? pal.moor;
    const c1 = Phaser.Display.Color.IntegerToColor(top), c2 = Phaser.Display.Color.IntegerToColor(mid);
    for (let y = 0; y < 330; y += 6) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 330, y);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1); g.fillRect(0, y, 960, 6);
    }
    g.fillStyle(ground, 1); g.fillRect(0, 330, 960, 210);
    g.fillStyle(0x000000, 0.25); for (let i = 0; i < 18; i++) g.fillEllipse(Math.random() * 960, 340 + Math.random() * 190, 80 + Math.random() * 120, 10);
    if (bg === 'moor' || bg === 'blut') {
      g.fillStyle(bg === 'blut' ? 0xb02020 : 0xd8ccb0, bg === 'blut' ? 0.9 : 0.5); g.fillCircle(820, 90, 34);
      g.fillStyle(0x0c0c0a, 1);
      for (let i = 0; i < 9; i++) { const x = i * 120 + Math.random() * 40; g.fillRect(x, 230 - Math.random() * 40, 6, 110); g.fillTriangle(x - 20, 250, x + 3, 200, x + 26, 250); }
      this.add.particles(0, 0, 'glow', { x: { min: 0, max: 960 }, y: { min: 300, max: 520 }, speedX: { min: -8, max: 8 }, scale: { min: 4, max: 8 }, alpha: { start: 0.07, end: 0 }, lifespan: 7000, frequency: 260, tint: bg === 'blut' ? 0xa02020 : 0xbab0a0 }).setDepth(5);
    }
    if (bg === 'sewer') { g.fillStyle(0x2e3a2a, 1); g.fillRect(0, 300, 960, 40); g.lineStyle(2, 0x0a0e0a, 1); for (let x = 0; x < 960; x += 48) g.strokeRect(x, 0, 48, 24); }
    if (bg === 'chalk') { g.fillStyle(0xd8d2c4, 1); for (let i = 0; i < 6; i++) g.fillTriangle(i * 180, 330, i * 180 + 90, 150 + Math.random() * 60, i * 180 + 180, 330); this.add.particles(0, 0, 'dust', { x: { min: 0, max: 960 }, y: 0, speedY: { min: 10, max: 30 }, lifespan: 12000, frequency: 120, alpha: 0.6 }).setDepth(5); }
    if (bg === 'stone' || bg === 'tower') { g.lineStyle(2, 0x000000, 0.5); for (let y = 0; y < 330; y += 30) for (let x = (y / 30) % 2 ? 0 : 30; x < 960; x += 60) g.strokeRect(x, y, 60, 30); }
    if (bg === 'tower') { g.fillStyle(0xd8d0bc, 1); for (let y = 0; y < 120; y += 8) g.fillRect(718, y, 4, 5); }
  }

  // ------------------------------------------------------------ UI
  renderParty(): void {
    clear(this.partyEl);
    for (const f of this.F.filter((x) => x.side === 'p')) {
      const m = f.member!; const s = stats(m);
      const st = Object.keys(f.st).filter((k) => f.st[k] > 0).map((k) => STATUS_NAME[k] ?? k);
      this.partyEl.appendChild(h('div', { class: 'pcard' + (this.current === f ? ' act' : '') + (f.alive ? '' : ' ko') },
        h('div', { class: 'row' }, h('span', { class: 'grow' }, m.name), h('span', { class: 'ap' }, ...[0, 1, 2, 3, 4].map((i) => h('i', { class: i < f.ap ? 'on' : '' })))),
        h('div', { class: 'row', style: 'font-size:11px' }, h('span', { class: 'grow' }, `LP ${Math.max(0, Math.round(f.hp))}/${f.maxHp}`), h('span', { class: 'manac' }, `MP ${m.mp}${isHalf(m) ? ' / ' + m.mp2 : ''}`)),
        bar('hp', f.hp, f.maxHp), bar('mp', m.mp, s.mp), isHalf(m) ? bar('mp2', m.mp2, maxMp2(m)) : null,
        f.herz ? h('div', { class: 'blood', style: 'font-size:11px' }, `Herz setzte aus: ${f.herz}/3`) : null,
        st.length ? h('div', { class: 'dim', style: 'font-size:11px' }, st.join(', ')) : null));
    }
    // Zeitleiste
    clear(this.tlEl);
    const sim = this.F.filter((f) => f.alive && f.spd > 0).map((f) => ({ f, n: f.next }));
    const order: Fighter[] = [];
    for (let i = 0; i < 8 && sim.length; i++) {
      sim.sort((a, b) => a.n - b.n);
      order.push(sim[0].f);
      sim[0].n += this.interval(sim[0].f);
    }
    order.forEach((f, i) => this.tlEl.appendChild(h('div', { class: 't' + (f.side === 'e' ? ' e' : '') + (i === 0 && this.current === f ? ' now' : '') }, f.side === 'e' ? f.name.split(' ').pop()! : f.name.split(' ')[0])));
    // Gegnerleisten
    for (const f of this.F) {
      if (f.side !== 'e' || !f.barG) continue;
      f.barG.clear();
      if (!f.alive) { f.label?.setVisible(false); continue; }
      const w = 90, x = f.spr.x - w / 2, top = f.spr.y - f.spr.displayHeight / 2 - 16;
      const y = Math.max(96, top);
      f.barG.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, 7);
      f.barG.fillStyle(f.st.verkrustet ? 0xd8d2c4 : 0xc83a30, 1).fillRect(x, y, w * Math.max(0, f.hp / f.maxHp), 5);
      const sts = Object.keys(f.st).filter((k) => f.st[k] > 0).map((k) => STATUS_NAME[k] ?? k);
      f.label?.setPosition(f.spr.x, y - 10).setText(f.name + (sts.length ? ' · ' + sts.join(', ') : ''));
    }
  }

  say(msg: string, color = '#f0e2c0'): void {
    this.banner.setText(msg).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1800, duration: 500 });
  }

  float(f: Fighter, text: string, color: string, big = false): void {
    const t = this.add.text(f.spr.x + (Math.random() * 30 - 15), f.spr.y - f.spr.displayHeight / 3, text, { fontFamily: 'Georgia, serif', fontSize: big ? '30px' : '22px', color, stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  wait(ms: number): Promise<void> { return new Promise((r) => this.time.delayedCall(ms, () => r())); }

  // ------------------------------------------------------------ Eingabe
  onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); this.press(this.selecting ? 'atk' : 'parry'); if (this.selecting) this.confirmSel(); return; }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { this.press('dodge'); return; }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.press('left');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.press('right');
    if (this.selecting) {
      if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) { this.selIdx = (this.selIdx + this.selList.length - 1) % this.selList.length; this.showSel(); }
      if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code)) { this.selIdx = (this.selIdx + 1) % this.selList.length; this.showSel(); }
      if (e.code === 'Enter') this.confirmSel();
      return;
    }
    const fn = this.menuKeys[e.key];
    if (fn) { e.preventDefault(); fn(); }
  }
  press(k: 'parry' | 'dodge' | 'atk' | 'left' | 'right'): void { this.pressLog.push({ key: k, t: this.time.now }); if (this.pressLog.length > 40) this.pressLog.shift(); }

  cancel(): void {
    if (this.selecting) { const s = this.selecting; this.selecting = null; this.selArrow.setVisible(false); s(null); return; }
    if (this.subEl) { this.subEl.remove(); this.subEl = null; }
  }

  selectTarget(list: Fighter[]): Promise<Fighter | null> {
    return new Promise((res) => {
      this.selList = list; this.selIdx = 0;
      this.selecting = (f) => { this.selecting = null; this.selArrow.setVisible(false); res(f); };
      this.showSel();
    });
  }
  showSel(): void {
    const f = this.selList[this.selIdx];
    if (!f) return;
    this.selArrow.setVisible(true).setPosition(f.spr.x, f.spr.y - f.spr.displayHeight / 2 - 30);
  }
  confirmSel(): void { if (this.selecting) this.selecting(this.selList[this.selIdx]); }
  pickTarget(f: Fighter): void { if (this.selecting && this.selList.includes(f)) this.selecting(f); }

  // ------------------------------------------------------------ Ablauf
  interval(f: Fighter): number { return (100 / Math.max(1, f.spd)) * (f.st.langsam || f.st.kreide ? 1.5 : 1); }

  async loop(): Promise<void> {
    while (!this.over) {
      if (this.checkEnd()) return;
      const cands = this.F.filter((f) => f.alive && f.spd > 0);
      cands.sort((a, b) => a.next - b.next);
      const f = cands[0];
      f.next += this.interval(f);
      this.current = f;
      this.renderParty();
      const skip = await this.startOfTurn(f);
      if (this.checkEnd()) return;
      if (!skip && f.alive) {
        if (f.side === 'p') await this.playerTurn(f);
        else await this.enemyTurn(f);
      }
      this.tickStatuses(f);
      this.current = null;
      this.renderParty();
      await this.wait(260);
    }
  }

  async startOfTurn(f: Fighter): Promise<boolean> {
    f.defending = false;
    const dot = (k: string, frac: number, label: string) => {
      if (!f.st[k]) return;
      const d = Math.max(1, Math.round(f.maxHp * frac));
      f.hp -= d; this.float(f, `-${d} ${label}`, '#ff8a5a');
      if (f.hp <= 0) this.kill(f, {});
    };
    dot('brand', 0.06, 'Brand'); dot('blutung', 0.05, 'Blut'); dot('ertrinken', 0.09, 'Wasser');
    if (!f.alive) { await this.wait(500); return true; }
    if (f.st.ohnmacht) { this.say(`${f.name} ist ohnmächtig.`); await this.wait(800); return true; }
    if (f.st.betaeubt) { this.say(`${f.name} ist betäubt!`); f.st.betaeubt = 0; await this.wait(800); return true; }
    if (f.st.muede && Math.random() < 0.35) { this.say(`${f.name} nickt ein…`, '#a8987c'); await this.wait(900); return true; }
    return false;
  }

  tickStatuses(f: Fighter): void {
    for (const k of Object.keys(f.st)) { if (k === 'wehrlos') continue; if (f.st[k] > 0) f.st[k]--; if (f.st[k] <= 0) delete f.st[k]; }
  }

  checkEnd(): boolean {
    if (this.over) return true;
    if (!this.F.some((f) => f.side === 'e' && f.alive && !f.parent)) { this.victory(); return true; }
    if (!this.F.some((f) => f.side === 'p' && f.alive)) { this.defeat(); return true; }
    return false;
  }

  // ------------------------------------------------------------ Spielerzug
  playerTurn(f: Fighter): Promise<void> {
    return new Promise((resolve) => {
      const m = f.member!;
      const done = () => { this.menuEl.style.display = 'none'; this.subEl?.remove(); this.subEl = null; this.menuKeys = {}; resolve(); };
      const show = () => {
        clear(this.menuEl); this.menuEl.style.display = 'block'; this.subEl?.remove(); this.subEl = null;
        this.menuEl.appendChild(h('div', { class: 'who' }, `${m.name} ist am Zug`));
        const acts: [string, () => void][] = [
          ['Angriff', async () => { const t = await this.chooseEnemy(); if (!t) return show(); this.menuEl.style.display = 'none'; await this.doAttack(f, t); done(); }],
          ['Technik', () => this.techMenu(f, show, done)],
          ['Zauber', () => this.spellMenu(f, show, done, false)],
          ['Gegenstand', () => this.itemMenu(f, show, done)],
          ['Verteidigen', () => { f.defending = true; f.ap = Math.min(5, f.ap + 1); this.say(`${m.name} verteidigt sich.`); this.renderParty(); done(); }],
          ['Flucht', async () => { this.menuEl.style.display = 'none'; await this.tryFlee(); done(); }],
        ];
        this.menuKeys = {};
        const grid = h('div', { class: 'grid' }, ...acts.map(([l, fn], i) => { this.menuKeys[String(i + 1)] = fn; return btn(`${i + 1} ${l}`, fn); }));
        this.menuEl.appendChild(grid);
        this.menuEl.appendChild(h('div', { class: 'dim', style: 'font-size:11.5px;margin-top:6px' }, 'Angriff: Leertaste, wenn sich der Ring schließt = Präziser Treffer.'));
      };
      show();
    });
  }

  enemiesAlive(): Fighter[] { return this.F.filter((f) => f.side === 'e' && f.alive); }
  partyAlive(): Fighter[] { return this.F.filter((f) => f.side === 'p' && f.alive); }

  async chooseEnemy(): Promise<Fighter | null> {
    const list = this.enemiesAlive();
    if (!list.length) return null;
    return this.selectTarget(list);
  }

  sub(title: string, back: () => void): HTMLElement {
    this.subEl?.remove();
    const body = h('div', { class: 'body' });
    this.subEl = h('div', { class: 'panel bt-sub', style: 'pointer-events:auto' }, h('div', { class: 'row' }, h('b', { class: 'gold grow', style: 'font-weight:normal' }, title), btn('Zurück [Esc]', back, { cls: 'small' })), body);
    this.ui.appendChild(this.subEl);
    setEsc(() => { if (this.selecting) this.cancel(); else back(); });
    return body;
  }

  techMenu(f: Fighter, back: () => void, done: () => void): void {
    const m = f.member!;
    const body = this.sub('Techniken (kosten Schwung)', () => { setEsc(() => this.cancel()); back(); });
    for (const t of [RACES[m.app.race].tech, CLASSES[m.cls].tech]) {
      const td = TECHS[t];
      body.appendChild(h('div', { class: 'item', style: 'display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line2)' },
        h('div', { class: 'grow' }, h('div', {}, td.name, ' ', h('span', { class: 'gold' }, '●'.repeat(td.ap))), h('div', { class: 'dim', style: 'font-size:12px' }, td.desc)),
        btn('Einsetzen', async () => {
          if (f.ap < td.ap) { toast('Nicht genug Schwung. Parieren, präzise Treffer und Verteidigen füllen ihn.', 'bad'); return; }
          const ok = await this.doTech(f, t);
          if (ok) done(); else back();
        }, { cls: 'small', disabled: f.ap < td.ap })));
    }
  }

  itemMenu(f: Fighter, back: () => void, done: () => void): void {
    const body = this.sub('Gegenstände', () => { setEsc(() => this.cancel()); back(); });
    const ids = Object.keys(G.inv).filter((k) => G.inv[k] > 0 && ITEMS[k]?.kind === 'consumable' && k !== 'proviant');
    if (!ids.length) body.appendChild(h('div', { class: 'dim' }, 'Keine Verbrauchsgüter.'));
    for (const id of ids) {
      const d = ITEMS[id];
      body.appendChild(h('div', { class: 'row', style: 'padding:4px 0;border-bottom:1px solid var(--line2)' }, h('span', { class: 'grow' }, `${d.name} ×${G.inv[id]}`, h('div', { class: 'dim', style: 'font-size:12px' }, d.desc)),
        btn('Benutzen', async () => {
          const list = this.F.filter((x) => x.side === 'p' && (d.revive ? !x.alive : x.alive));
          if (!list.length) { toast('Kein passendes Ziel.', 'bad'); return; }
          this.subEl!.style.display = 'none';
          const t = await this.selectTarget(list);
          if (!t) { this.subEl!.style.display = 'flex'; return; }
          G.inv[id]--; if (G.inv[id] <= 0) delete G.inv[id];
          if (d.revive) { t.alive = true; t.hp = Math.round(t.maxHp * 0.3); t.spr.setAngle(0).setAlpha(1); t.herz = 0; this.float(t, 'Erwacht', '#9fe08a'); }
          if (d.heal) { t.hp = Math.min(t.maxHp, t.hp + d.heal); this.float(t, `+${d.heal}`, '#9fe08a'); }
          if (d.mana) { const mm = t.member!; mm.mp = Math.min(stats(mm).mp, mm.mp + d.mana); mm.mp2 = Math.min(maxMp2(mm), mm.mp2 + d.mana); this.float(t, `+${d.mana} MP`, '#7fb0ff'); }
          if (d.cleanse) for (const k of BAD) delete t.st[k];
          SFX.heal(); setEsc(() => this.cancel()); this.renderParty(); await this.wait(500); done();
        }, { cls: 'small' })));
    }
  }

  // ------------------------------------------------------------ Zauberwerkstatt
  spellMenu(f: Fighter, back: () => void, done: () => void, isDouble: boolean, onCast?: () => void): void {
    const m = f.member!;
    const sel: El[] = [];
    const cap = maxElements(m);
    const body = this.sub(isDouble ? 'Doppelwirken – zweiter Zauber' : 'Zauberwerkstatt', () => { setEsc(() => this.cancel()); back(); });
    const render = () => {
      clear(body);
      body.appendChild(h('div', { class: 'dim', style: 'font-size:12px' }, `Wähle bis zu ${cap} Element(e). Mana: ${m.mp}${isHalf(m) ? ` · menschlicher Fluss: ${m.mp2}` : ''}`));
      body.appendChild(h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px;margin:6px 0' }, ...m.elements.map((e, i) => {
        const b = btn(`${i + 1} ${EL_NAME[e]}`, () => toggle(e), { cls: 'small elbtn ' + (sel.includes(e) ? 'sel' : '') });
        b.style.color = EL_COLOR[e];
        return b;
      })));
      this.menuKeys = {}; m.elements.forEach((e, i) => { this.menuKeys[String(i + 1)] = () => toggle(e); });
      const sp = sel.length ? resolveSpell(sel) : null;
      const allowed = sp && (sel.length <= cap || (sp.name === 'Heilung'));
      if (sp) {
        const cost = spellCost(sel);
        const pool = this.poolFor(m, sel);
        const have = pool === 2 ? m.mp2 : m.mp;
        body.appendChild(h('div', { class: 'panel', style: 'padding:6px 8px;margin-bottom:6px' },
          h('div', { style: `color:${sp.bruch ? '#ff7a6a' : 'var(--gold)'}` }, sp.name, G.formulas.includes(sp.key) ? h('span', { class: 'tag' }, 'bekannt') : null),
          h('div', { class: 'dim', style: 'font-size:12px' }, sp.desc),
          h('div', { style: 'font-size:12px' }, `Kosten: ${cost} Mana${pool === 2 ? ' (menschlicher Fluss)' : ''}`, have < cost ? h('span', { class: 'blood' }, ' – ÜBERLASTUNG! Blutung und Ohnmacht drohen.') : null),
          !allowed ? h('div', { class: 'blood', style: 'font-size:12px' }, `Dein Mana-Rang erlaubt nur ${cap} Element(e).`) : null));
        body.appendChild(btn('Wirken [Enter]', () => cast(), { cls: 'sel', disabled: !allowed }));
        this.menuKeys.Enter = () => { if (allowed) cast(); };
      }
      const known = G.formulas.map((k) => resolveSpell(k.split('+') as El[])).filter((s): s is SpellDef => !!s && s.els.every((e) => m.elements.includes(e)) && (s.els.length <= cap || s.name === 'Heilung'));
      if (known.length) {
        body.appendChild(h('div', { class: 'dim', style: 'font-size:12px;margin-top:8px' }, 'Bekannte Formeln:'));
        body.appendChild(h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' }, ...known.map((s) => btn(s.name, () => { sel.length = 0; sel.push(...s.els); render(); }, { cls: 'small' }))));
      }
    };
    const toggle = (e: El) => { const i = sel.indexOf(e); if (i >= 0) sel.splice(i, 1); else if (sel.length < Math.max(cap, 2)) sel.push(e); render(); };
    const cast = async () => {
      const sp = resolveSpell(sel)!;
      this.subEl!.style.display = 'none';
      const ok = await this.castSpell(f, sp, [...sel]);
      setEsc(() => this.cancel());
      if (!ok) { this.subEl!.style.display = 'flex'; return; }
      if (onCast) onCast(); else done();
    };
    render();
  }

  poolFor(m: Member, els: El[]): 1 | 2 {
    if (isHalf(m) && els.length === 1 && m.mp2 >= spellCost(els)) return 2;
    return 1;
  }

  async castSpell(f: Fighter, sp: SpellDef, els: El[]): Promise<boolean> {
    const m = f.member!;
    // Ziel
    let targets: Fighter[] = [];
    if (sp.target === 'enemy') { const t = await this.chooseEnemy(); if (!t) return false; targets = [t]; }
    else if (sp.target === 'ally') { const t = await this.selectTarget(this.partyAlive()); if (!t) return false; targets = [t]; }
    else if (sp.target === 'enemies') targets = this.enemiesAlive();
    else if (sp.target === 'allies') targets = this.partyAlive();
    else targets = [f];
    // Kosten / Überlastung
    const cost = spellCost(els);
    const pool = this.poolFor(m, els);
    let overload = false;
    if (pool === 2) m.mp2 -= cost;
    else if (m.mp >= cost) m.mp -= cost;
    else { const miss = cost - m.mp; m.mp = 0; overload = true; f.hp -= miss * 2; f.st.blutung = 3; f.st.ohnmacht = 2; }
    if (!G.formulas.includes(sp.key) && !sp.name.startsWith('Grundklang') && !sp.name.startsWith('Zweiklang') && !sp.name.startsWith('Dreiklang') && !sp.name.startsWith('Vierklang') && !sp.bruch) {
      G.formulas.push(sp.key); toast(`Neue Formel entdeckt: ${sp.name}`, 'big', 3500);
    }
    this.say(`${m.name}: ${sp.name}`, sp.bruch ? '#ff7a6a' : '#cfe0ff');
    // Effekt-Animation
    const col = Phaser.Display.Color.HexStringToColor(EL_COLOR[els[0]]).color;
    await this.tweenTo(f.spr, { x: f.hx + 20 }, 150);
    for (const t of targets) {
      const p = this.add.particles(t.spr.x, t.spr.y, 'glow', { speed: { min: 40, max: 160 }, scale: { start: 0.8, end: 0 }, lifespan: 600, quantity: 18, tint: els.map((e) => Phaser.Display.Color.HexStringToColor(EL_COLOR[e]).color), emitting: false }).setDepth(50);
      p.explode(22);
      this.time.delayedCall(800, () => p.destroy());
    }
    sp.kind === 'heal' ? SFX.heal() : sp.bruch ? SFX.bruch() : SFX.magic();
    const rgb = Phaser.Display.Color.IntegerToRGB(col);
    this.cameras.main.flash(120, rgb.r, rgb.g, rgb.b);
    this.tweenTo(f.spr, { x: f.hx }, 200);
    await this.wait(250);
    const darkBonus = els.includes('schatten') && (m.app.race === 'dunkelelf' ? 1.3 : m.app.race === 'halbdunkelelf' ? 1.2 : 1) || 1;
    for (const t of targets) {
      if (sp.kind === 'dmg') {
        let base = f.mag * sp.power * 1.25 * darkBonus + 4;
        base *= 26 / (26 + t.def * 0.6);
        const weak = t.mdef && els.some((e) => t.mdef!.weak.includes(e));
        const res = t.mdef && els.some((e) => t.mdef!.resist.includes(e));
        if (weak) base *= 1.6; if (res) base *= 0.5;
        if (t.mdef?.undead && els.includes('licht')) base *= 1.3;
        this.damage(t, base, { licht: els.includes('licht') }, weak ? 'Schwachstelle!' : res ? 'widersteht' : undefined);
        if (sp.status && t.alive && Math.random() < 0.45) this.applyStatus(t, sp.status, 3);
      } else if (sp.kind === 'heal') {
        const amt = Math.round(f.mag * sp.power * 1.8 + 12);
        t.hp = Math.min(t.maxHp, t.hp + amt); this.float(t, `+${amt}`, '#9fe08a');
        if (sp.name === 'Läuterung') for (const k of BAD) delete t.st[k];
      } else if (sp.kind === 'buff') {
        this.applyStatus(t, sp.status!, sp.status === 'schleier' ? 2 : 3);
      } else if (sp.kind === 'debuff') {
        if (sp.status === 'stille') {
          this.applyStatus(t, 'stille', 3);
        } else { this.damage(t, f.mag * 0.5, {}); if (t.alive) this.applyStatus(t, sp.status!, 3); }
      }
    }
    if (sp.bruch && Math.random() < 0.35) { const d = Math.round(f.maxHp * 0.22); f.hp -= d; this.float(f, `-${d} Rückschlag`, '#ff7a6a'); this.say('Der Bruchklang schlägt zurück!', '#ff7a6a'); G.rep.kirche--; if (f.hp <= 0) this.kill(f, {}); }
    if (overload) { this.float(f, 'Überlastung!', '#ff4a3a', true); this.say(`${m.name} blutet aus Nase und Augen…`, '#ff7a6a'); if (f.hp <= 0) this.kill(f, {}); }
    this.renderParty();
    await this.wait(700);
    return true;
  }

  applyStatus(t: Fighter, s: string, turns: number): void {
    if (s === 'schildwall') { t.st.schildwall = turns; t.st.taunt = turns; }
    t.st[s] = Math.max(t.st[s] ?? 0, turns);
    this.float(t, STATUS_NAME[s] ?? s, BAD.includes(s) ? '#e0a0ff' : '#a0d8ff');
  }

  tweenTo(o: Phaser.GameObjects.GameObject, props: Record<string, number>, ms: number): Promise<void> {
    return new Promise((r) => this.tweens.add({ targets: o, ...props, duration: ms, ease: 'Quad.easeOut', onComplete: () => r() }));
  }

  // ------------------------------------------------------------ Angriff mit Timing
  async attackTiming(t: Fighter): Promise<boolean> {
    const now = this.time.now;
    const dur = 700;
    this.qte = { x: t.spr.x, y: t.spr.y, t0: now, t1: now + dur, color: 0xffffff, r0: 70 };
    const startLen = this.pressLog.length;
    await this.wait(dur + 120);
    this.qte = null;
    const presses = this.pressLog.slice(startLen).filter((p) => p.key === 'atk' || p.key === 'parry');
    const first = presses[0];
    return !!first && Math.abs(first.t - (now + dur)) <= 110;
  }

  payTribut(f: Fighter): void {
    const w = gearOf(f.member?.equip.weapon);
    if (!w?.tribut) return;
    if (w.tribut.kind === 'blut') { f.hp -= w.tribut.amount; this.float(f, `-${w.tribut.amount} Tribut`, '#c83a30'); if (f.hp <= 0) { f.hp = 1; } }
    else { const m = f.member!; m.mp = Math.max(0, m.mp - w.tribut.amount); this.float(f, `-${w.tribut.amount} MP Tribut`, '#7fb0ff'); }
  }

  async doAttack(f: Fighter, t: Fighter, mult = 1, opts: { ignoreDef?: number; tech?: string; noTiming?: boolean } = {}): Promise<void> {
    this.say(`${f.name} greift an`);
    await this.tweenTo(f.spr, { x: t.spr.x - (f.side === 'p' ? 90 : -90), y: t.spr.y }, 260);
    const precise = opts.noTiming ? false : await this.attackTiming(t);
    this.payTribut(f);
    let base = f.atk * mult * (precise ? 1.5 : 1);
    const def = t.def * (1 - (opts.ignoreDef ?? 0));
    base *= 22 / (22 + def);
    if (precise) { this.float(t, 'Präzise!', '#ffe08a'); f.ap = Math.min(5, f.ap + 1); SFX.crit(); this.cameras.main.shake(120, 0.006); } else SFX.hit();
    this.damage(t, base, { precise: precise || opts.tech === 'gezielter_schuss', tech: opts.tech });
    await this.tweenTo(f.spr, { x: f.hx, y: f.hy }, 260);
  }

  damage(t: Fighter, raw: number, info: HitInfo, note?: string): void {
    if (!t.alive) return;
    if (t.st.verkrustet) { this.float(t, 'Verkrustet – kein Schaden', '#d8d2c4'); return; }
    let d = Math.max(1, Math.round(raw * (0.9 + Math.random() * 0.2)));
    if (t.st.wehrlos) d = Math.round(d * 1.5);
    t.hp -= d;
    this.float(t, `${d}`, info.precise ? '#ffe08a' : '#ffffff', info.precise);
    if (note) this.float(t, note, note === 'widersteht' ? '#a8a8a8' : '#ffb04a');
    this.tweens.add({ targets: t.spr, x: t.spr.x + (t.side === 'e' ? 8 : -8), yoyo: true, duration: 60, repeat: 1 });
    t.spr.setTint(0xff6a6a); this.time.delayedCall(140, () => t.spr.clearTint());
    if (t.hp <= 0) this.kill(t, info);
    this.renderParty();
  }

  kill(t: Fighter, info: HitInfo): void {
    if (!t.alive) return;
    // Hohlmann: steht wieder auf, bis der Kopf vom Hals getrennt ist
    if (t.mdef?.id.startsWith('hohlmann') && !t.rose && !info.precise && !info.licht) {
      t.rose = true; t.hp = Math.round(t.maxHp * 0.4);
      this.say('Der Hohlmann steht wieder auf! (Präziser Treffer oder Licht trennt den Kopf ab)', '#ffb04a');
      this.tweens.add({ targets: t.spr, angle: { from: 80, to: 0 }, duration: 600 });
      return;
    }
    if (t.mdef?.id.startsWith('hohlmann')) this.float(t, 'Kopf abgetrennt!', '#ffe08a');
    t.alive = false; t.hp = 0;
    if (t.side === 'p') {
      this.tweens.add({ targets: t.spr, angle: -90, alpha: 0.5, duration: 400 });
      this.float(t, 'Bewusstlos', '#ff7a6a');
      for (const k of Object.keys(t.st)) delete t.st[k];
      return;
    }
    this.tweens.killTweensOf(t.spr);
    this.tweens.add({ targets: t.spr, alpha: 0, scale: t.spr.scale * 0.8, duration: 500 });
    t.barG?.clear(); t.label?.setVisible(false);
    if (t.parent) {
      const p = t.parent;
      if (p.mdef!.id === 'kreidemutter' && p.alive) { this.say('Die Flanke reißt! Die Kreidemutter bricht in sich zusammen!', '#ffe08a'); this.time.delayedCall(400, () => this.kill(p, { precise: true })); }
      if (p.mdef!.id === 'gloeckner' && p.alive) { p.st.wehrlos = 99; p.def = 0; p.atk = Math.round(p.atk * 0.5); this.say('Ohne Klöppel ist der Glöckner wehrlos!', '#ffe08a'); }
    }
    for (const part of t.parts) if (part.alive) { part.alive = false; this.tweens.add({ targets: part.spr, alpha: 0, duration: 400 }); part.barG?.clear(); part.label?.setVisible(false); }
  }

  // ------------------------------------------------------------ Techniken
  async doTech(f: Fighter, t: string): Promise<boolean> {
    const td = TECHS[t];
    const m = f.member!;
    const spend = () => { f.ap -= td.ap; this.renderParty(); };
    switch (t) {
      case 'klingenwirbel': { spend(); this.say('Klingenwirbel!'); for (const e of this.enemiesAlive()) await this.doAttack(f, e, 0.8, { noTiming: false }); return true; }
      case 'runenhieb': { const e = await this.chooseEnemy(); if (!e) return false; spend(); this.say('Runenhieb!'); await this.doAttack(f, e, 1.8, { ignoreDef: 0.5 }); return true; }
      case 'raubtiersprung': { const e = await this.chooseEnemy(); if (!e) return false; spend(); this.say('Raubtiersprung!'); await this.doAttack(f, e, 0.9); if (e.alive) await this.doAttack(f, e, 0.9); return true; }
      case 'durchstoss': { const e = await this.chooseEnemy(); if (!e) return false; spend(); this.say('Durchstoß!'); await this.doAttack(f, e, 1.7, { ignoreDef: 1 }); return true; }
      case 'gezielter_schuss': { const e = await this.chooseEnemy(); if (!e) return false; spend(); this.say('Gezielter Schuss!'); await this.doAttack(f, e, 2.2, { tech: 'gezielter_schuss' }); return true; }
      case 'schattenstich': { const e = await this.chooseEnemy(); if (!e) return false; spend(); this.say('Schattenstich!'); await this.doAttack(f, e, 1.6); this.applyStatus(f, 'schleier', 2); return true; }
      case 'naturruf': { spend(); this.say('Naturruf!'); SFX.magic(); for (const e of this.enemiesAlive()) { const w = e.mdef?.weak.includes('dendro') ? 1.5 : 1; this.damage(e, f.mag * 1.3 * w + 5, {}); if (e.alive) this.applyStatus(e, 'langsam', 3); } await this.wait(700); return true; }
      case 'schildwall': { spend(); this.say(`${m.name}: Schildwall! Alle Angriffe auf mich!`); this.applyStatus(f, 'schildwall', 2); return true; }
      case 'segen': { spend(); this.say('Segen!'); SFX.heal(); for (const a of this.partyAlive()) { const amt = Math.round(f.mag * 1.6 + 10); a.hp = Math.min(a.maxHp, a.hp + amt); this.float(a, `+${amt}`, '#9fe08a'); for (const k of BAD) delete a.st[k]; } this.renderParty(); await this.wait(600); return true; }
      case 'manaschub': { spend(); const s = stats(m); const amt = Math.round(s.mp * 0.4); m.mp = Math.min(s.mp, m.mp + amt); this.float(f, `+${amt} MP`, '#7fb0ff'); SFX.magic(); this.renderParty(); await this.wait(500); return true; }
      case 'doppelwirken': {
        if (!isHalf(m)) return false;
        spend();
        this.say('Doppelwirken: beide Flüsse zugleich!', '#cfe0ff');
        await new Promise<void>((res) => this.spellMenu(f, () => res(), () => res(), false, () => res()));
        if (this.checkEnd()) return true;
        await new Promise<void>((res) => this.spellMenu(f, () => res(), () => res(), true, () => res()));
        return true;
      }
    }
    return false;
  }

  async tryFlee(): Promise<void> {
    if (!this.data_.canFlee || this.F.some((f) => f.mdef?.boss)) { this.say('Keine Flucht möglich!', '#ff9a90'); await this.wait(800); return; }
    if (this.F.some((f) => f.alive && f.mdef?.id === 'aschhund')) { this.say('Aschhunde vergessen nie – sie holen euch ein!', '#ff9a90'); await this.wait(1000); return; }
    if (Math.random() < 0.6) { this.say('Ihr entkommt!'); SFX.dodge(); await this.wait(600); this.finish('flee'); }
    else { this.say('Die Flucht misslingt!', '#ff9a90'); await this.wait(800); }
  }

  // ------------------------------------------------------------ Gegnerzug
  async enemyTurn(f: Fighter): Promise<void> {
    const def = f.mdef!;
    const silenced = !!f.st.stille;
    const kloeppel = f.parts.find((p) => p.mdef?.id === 'gloeckner_kloeppel');
    const flank = f.parts.find((p) => p.mdef?.id === 'kreidemutter_flanke');
    let pool = def.attacks.filter((a) => {
      if (a.special && silenced) return false;
      if (a.special === 'laeuten' && (!kloeppel?.alive || f.st.wehrlos)) return false;
      if (a.special === 'beschwoeren' && this.enemiesAlive().filter((e) => !e.parent).length >= 4) return false;
      if (a.special === 'verhaerten' && (!flank?.alive || flank.st.verkrustet)) return false;
      return true;
    });
    if (!pool.length) pool = def.attacks.filter((a) => !a.special);
    if (f.st.wehrlos) pool = [{ name: 'Kraftloser Hieb', hits: 1, power: 0.6, kind: 'parry', windup: 1200, gap: 0, target: 'one' }];
    const tot = pool.reduce((s, a) => s + (a.weight ?? 1), 0);
    let r = Math.random() * tot;
    let atk = pool[0];
    for (const a of pool) { r -= a.weight ?? 1; if (r <= 0) { atk = a; break; } }
    this.say(`${f.name}: ${atk.name}`, '#ff9a90');
    if (atk.text) this.time.delayedCall(700, () => this.say(atk.text!, '#ffcfa0'));
    await this.wait(500);
    if (atk.special === 'beschwoeren') return this.summon(f);
    if (atk.special === 'verhaerten') { flank!.st.verkrustet = 2; this.float(flank!, 'Verkrustet', '#d8d2c4'); this.renderParty(); await this.wait(700); return; }
    if (atk.special === 'laeuten') return this.bellQte(f);

    const taunt = this.partyAlive().find((p) => p.st.taunt);
    const targets = atk.target === 'all' ? this.partyAlive() : [taunt ?? Phaser.Utils.Array.GetRandom(this.partyAlive())];
    if (!targets.length) return;
    const main = targets[0];
    const fx = atk.target === 'all' ? 230 : main.spr.x, fy = atk.target === 'all' ? 335 : main.spr.y;
    // Anlauf
    await this.tweenTo(f.spr, { x: Math.max(fx + 150, f.spr.x - 140) }, 240);
    let allParried = atk.hits > 0;
    for (let i = 0; i < atk.hits; i++) {
      if (!targets.some((t) => t.alive)) break;
      const lead = i === 0 ? atk.windup : atk.gap;
      const res = await this.defendQte(fx, fy, lead, atk.kind, targets);
      if (res !== 'parry') allParried = false;
      for (const t of targets) {
        if (!t.alive) continue;
        if (res === 'parry') { this.float(t, 'Pariert!', '#ffe08a'); t.ap = Math.min(5, t.ap + 1); SFX.parry(); this.sparks(t, 0xffe08a); continue; }
        if (res === 'dodge') { this.float(t, 'Ausgewichen', '#a0d8ff'); SFX.dodge(); this.tweens.add({ targets: t.spr, y: t.hy - 30, yoyo: true, duration: 140 }); continue; }
        if (t.st.schleier && Math.random() < 0.6) { this.float(t, 'Verfehlt (Schleier)', '#c8a0ff'); delete t.st.schleier; continue; }
        let raw = f.atk * atk.power * 1.15;
        let d = t.def * (t.st.steinhaut ? 1.8 : 1) * (t.st.schildwall ? 2 : 1) * (t.st.dornenwall ? 1.3 : 1);
        raw *= 22 / (22 + d);
        if (t.defending) raw *= 0.5;
        SFX.hurt(); this.cameras.main.shake(140, 0.008);
        this.damage(t, raw, {});
        if (t.st.dornenwall && f.alive) this.damage(f, raw * 0.3, {}, 'Dornen');
        if (atk.status && t.alive && Math.random() < (atk.statusChance ?? 0.3)) this.applyStatus(t, atk.status, atk.status === 'ertrinken' ? 2 : 3);
        d = 0;
      }
      this.renderParty();
    }
    if (allParried && main.alive && f.alive && atk.target !== 'all') {
      await this.wait(150);
      this.say('Gegenangriff!', '#ffe08a');
      await this.tweenTo(main.spr, { x: f.spr.x - 80 }, 160);
      SFX.crit();
      this.damage(f, main.atk * 0.9 * (22 / (22 + f.def)), { precise: true });
      await this.tweenTo(main.spr, { x: main.hx }, 200);
    }
    await this.tweenTo(f.spr, { x: f.hx, y: f.hy }, 300);
  }

  sparks(t: Fighter, tint: number): void {
    const p = this.add.particles(t.spr.x + 30, t.spr.y - 10, 'px', { speed: { min: 80, max: 260 }, lifespan: 300, scale: { start: 1.2, end: 0 }, tint, emitting: false }).setDepth(55);
    p.explode(16); this.time.delayedCall(500, () => p.destroy());
  }

  /** Parier-/Ausweich-Fenster. Ergebnis: 'parry' | 'dodge' | 'hit' */
  async defendQte(x: number, y: number, lead: number, kind: 'parry' | 'dodge', targets: Fighter[]): Promise<'parry' | 'dodge' | 'hit'> {
    const now = this.time.now;
    const impact = now + lead;
    const instinct = targets.some((t) => t.member && (t.member.app.race === 'tiermensch' || t.member.app.race === 'halbtier'));
    const PARRY = 120, DODGE = instinct ? 300 : 210;
    this.qte = { x, y, t0: now, t1: impact, color: kind === 'parry' ? 0xffd060 : 0xff4a3a, r0: 80 };
    const startLen = this.pressLog.length;
    await this.wait(lead + 90);
    this.qte = null;
    const presses = this.pressLog.slice(startLen).filter((p) => p.key === 'parry' || p.key === 'dodge');
    const first = presses[0];
    if (!first) return 'hit';
    const dt = first.t - impact;
    if (first.key === 'parry' && kind === 'parry' && dt >= -PARRY && dt <= 70) return 'parry';
    if (first.key === 'dodge' && dt >= -DODGE && dt <= 80) return 'dodge';
    if (first.key === 'parry' && kind === 'dodge' && dt >= -PARRY && dt <= 70) this.say('Nicht parierbar – ausweichen!', '#ff9a90');
    else if (dt < -DODGE) this.say('Zu früh!', '#a8987c');
    return 'hit';
  }

  async summon(f: Fighter): Promise<void> {
    const n = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const def = MONSTERS.kreidekriecher;
      const x = 560 + Math.random() * 80, y = 380 + i * 60;
      const spr = this.add.image(f.spr.x, f.spr.y + 40, def.sprite).setScale(3).setDepth(25);
      const nf = this.addFighter({ side: 'e', name: def.name, mdef: def, hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def, mag: def.mag, spd: def.spd, spr, hx: x, hy: y, scale: 3 });
      nf.next = f.next + 5;
      nf.barG = this.add.graphics().setDepth(45);
      nf.label = this.add.text(x, 0, def.name, { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f0e2c0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(45);
      spr.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickTarget(nf));
      this.tweens.add({ targets: spr, x, y, duration: 500 });
    }
    await this.wait(700);
    this.renderParty();
  }

  /** Der Glöckner läutet für alle, die stillstehen. */
  async bellQte(f: Fighter): Promise<void> {
    const box = h('div', { class: 'panel', style: 'position:absolute;left:50%;top:120px;transform:translateX(-50%);text-align:center;width:460px;pointer-events:none' },
      h('div', { class: 'gold', style: 'font-size:20px' }, 'BLEIB IN BEWEGUNG!'),
      h('div', {}, 'Drücke abwechselnd ← und → (oder A und D). Wer stillsteht, dem setzt das Herz aus.'));
    const meter = h('div', { class: 'bar', style: 'height:10px;margin-top:8px' }, h('i', { style: 'width:0%;background:var(--gold)' }));
    box.appendChild(meter);
    this.ui.appendChild(box);
    await this.wait(900);
    let lastKey = '', lastMove = this.time.now - 1000;
    let idx = this.pressLog.length;
    const tick = this.time.addEvent({ delay: 30, loop: true, callback: () => {
      for (; idx < this.pressLog.length; idx++) { const p = this.pressLog[idx]; if ((p.key === 'left' || p.key === 'right') && p.key !== lastKey) { lastKey = p.key; lastMove = p.t; } }
      const fresh = Math.max(0, 1 - (this.time.now - lastMove) / 450);
      (meter.firstChild as HTMLElement).style.width = `${fresh * 100}%`;
    } });
    for (let s = 1; s <= 3; s++) {
      await this.wait(1000);
      SFX.bell();
      this.cameras.main.shake(300, 0.01);
      const ring = this.add.circle(f.spr.x, f.spr.y + 90, 20, 0xb8803a, 0).setStrokeStyle(4, 0xe0ad4a).setDepth(50);
      this.tweens.add({ targets: ring, radius: 600, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
      const moving = this.time.now - lastMove < 450;
      if (moving) { this.say(`Glockenschlag ${s}: Ihr bewegt euch – das Läuten geht an euch vorbei.`, '#a0d8ff'); continue; }
      SFX.heart();
      for (const t of this.partyAlive()) {
        t.herz++;
        this.float(t, `Herz setzt aus (${t.herz}/3)`, '#ff4a3a');
        if (t.herz >= 3) { this.say(`${t.name}: Herzstillstand!`, '#ff4a3a'); this.kill(t, {}); }
      }
      this.renderParty();
      if (!this.partyAlive().length) break;
    }
    tick.remove();
    box.remove();
    await this.wait(400);
  }

  update(): void {
    this.ringG.clear();
    if (this.qte) {
      const q = this.qte;
      const p = Phaser.Math.Clamp((this.time.now - q.t0) / (q.t1 - q.t0), 0, 1);
      const r = Phaser.Math.Linear(q.r0, 16, p);
      this.ringG.lineStyle(3, 0xffffff, 0.35).strokeCircle(q.x, q.y, 16);
      this.ringG.lineStyle(4, q.color, 0.5 + p * 0.5).strokeCircle(q.x, q.y, r);
      if (p >= 1) { this.ringG.fillStyle(q.color, 0.5).fillCircle(q.x, q.y, 18); }
    }
  }

  // ------------------------------------------------------------ Ende
  writeBack(): void {
    for (const f of this.F.filter((x) => x.side === 'p')) {
      const m = f.member!;
      m.hp = Math.max(f.alive ? 1 : 0, Math.round(f.hp));
    }
  }

  victory(): void {
    if (this.over) return;
    this.over = true;
    SFX.victory();
    this.menuEl.style.display = 'none';
    const dead = this.F.filter((f) => f.side === 'e' && !f.parent && f.mdef);
    let xp = 0; const items: string[] = []; const gear: ReturnType<typeof rollDrops>['gear'] = [];
    for (const d of dead) { xp += d.mdef!.xp; onKill(d.mdef!.id); const l = rollDrops(d.mdef!.id); items.push(...l.items); gear.push(...l.gear); }
    grantLoot(items, gear);
    this.writeBack();
    const msgs: string[] = [];
    for (const f of this.F.filter((x) => x.side === 'p')) { if (!f.alive) { f.member!.hp = 1; continue; } msgs.push(...giveXp(f.member!, xp)); }
    if (msgs.length) SFX.level();
    const counts: Record<string, number> = {};
    for (const i of items) counts[i] = (counts[i] ?? 0) + 1;
    const panel = h('div', { class: 'panel', style: 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:440px;pointer-events:auto;text-align:center' },
      h('h2', { class: 'gold', style: 'font-weight:normal;margin:0 0 6px' }, 'Sieg'),
      h('div', {}, `+${xp} Erfahrung`),
      ...msgs.map((m) => h('div', { class: 'good' }, m)),
      h('div', { class: 'hr' }),
      ...Object.entries(counts).map(([k, n]) => h('div', {}, `${itemName(k)} ×${n}`)),
      ...gear.map((g) => h('div', { class: 'gold' }, `${g.name} (schlafend – bei der Gilde definieren)`)),
      !items.length && !gear.length ? h('div', { class: 'dim' }, 'Keine Beute.') : null,
      h('div', { style: 'margin-top:10px' }, btn('Weiter [Leertaste]', () => this.finish('win'), { cls: 'sel' })));
    this.ui.appendChild(panel);
    this.menuKeys = {};
    const k = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { window.removeEventListener('keydown', k); this.finish('win'); } };
    this.time.delayedCall(400, () => window.addEventListener('keydown', k));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', k));
  }

  defeat(): void {
    if (this.over) return;
    this.over = true;
    SFX.defeat();
    this.writeBack();
    this.menuEl.style.display = 'none';
    this.say('Der Trupp ist gefallen…', '#ff7a6a');
    this.cameras.main.fadeOut(1800, 20, 0, 0);
    this.time.delayedCall(1900, () => this.finish('lose'));
  }

  finished = false;
  finish(result: 'win' | 'lose' | 'flee'): void {
    if (this.finished) return;
    this.finished = true;
    this.over = true;
    if (result === 'flee') this.writeBack();
    const caller = this.data_.caller;
    const roamer = this.data_.roamer;
    this.ui.remove();
    this.scene.stop();
    this.scene.resume(caller);
    this.scene.get(caller).events.emit('battleEnd', { result, roamer });
  }
}

export function keyFor(els: El[]): string { return keyOf(els); }

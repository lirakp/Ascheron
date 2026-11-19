// Erinnerungsschleifen, Störenfried-Bruch und Endrätsel eines Erinnerungs-Dungeons.
import Phaser from 'phaser';
import { G, giveXp, addItem, stats } from '../core/state';
import { MEMORIES, MemoryStory, LoopDef } from '../data/memories';
import type { Appearance } from '../data/types';
import { ensureChar } from '../gfx/tex';
import { iconCanvas } from '../gfx/icons';
import { h, UI, toast, dialog, isDialogOpen, isModalOpen } from '../ui/dom';
import { updateHud } from '../ui/hud';
import { SFX } from '../core/sfx';
import { rollDungeonGear } from '../data/items';
import { newUid, log } from '../core/state';

export interface MemRoom { x: number; y: number; w: number; h: number; cx: number; cy: number }

/** Schnittstelle zur Dungeon-Szene */
export interface MemHost extends Phaser.Scene {
  player: Phaser.Physics.Arcade.Sprite;
  snared: number;
  inBattle: boolean;
  startRoom: MemRoom;
  battleWith(enemies: string[]): void;
  openExit(): void;
  defeatAt(room: MemRoom): void;
}

type LoopStateName = 'idle' | 'running' | 'solved' | 'leave';
interface LoopState {
  def: LoopDef; room: MemRoom; idx: number; state: LoopStateName;
  t: number; turnShown: number; ghosts: Phaser.GameObjects.Sprite[]; texts: Phaser.GameObjects.Text[];
  anchor?: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Image;
}

const BASE_APP: Appearance = { gender: 'm', race: 'mensch', beast: 'wolf', skin: '#e8bb94', hair: '#3b2a1c', hairStyle: 'kurz', eyes: '#2a2a3a', beard: 'keiner', build: 'normal', outfit: 'hose', cloth: '#5a4a3a', cloth2: '#3a3028' };
const ANCHOR_ICON: Record<string, string> = { Sturmlaterne: 'licht', 'Zerrissenes Banner': 'shield', Brotlaib: 'bread', Brunnenseil: 'wind' };

export class MemoryController {
  host: MemHost;
  story: MemoryStory;
  loops: LoopState[] = [];
  clues: boolean[];
  pressure = 0;
  current: LoopState | null = null;
  bar: HTMLElement | null = null;
  mirror: { x: number; y: number };
  qte: { until: number; ok: boolean } | null = null;
  graceUntil = 0;
  riddleDone = false;
  keyH: (e: KeyboardEvent) => void;
  lastInput = 0;
  breaking = false;

  constructor(host: MemHost, storyIdx: number, loopRooms: MemRoom[], riddleRoom: MemRoom) {
    this.host = host;
    this.story = MEMORIES[storyIdx % MEMORIES.length];
    this.clues = this.story.loops.map(() => false);
    this.story.loops.forEach((def, i) => {
      const room = loopRooms[i];
      if (room) this.loops.push({ def, room, idx: i, state: 'idle', t: 0, turnShown: 0, ghosts: [], texts: [] });
    });
    this.mirror = { x: riddleRoom.cx, y: riddleRoom.cy };
    // Schleifenräume sichtbar machen: kalter Schimmer am Boden
    for (const l of this.loops) {
      const g = host.add.image(l.room.cx * 16 + 8, l.room.cy * 16 + 8, 'glow').setScale(5).setTint(0x8aa0e0).setAlpha(0.18).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      host.tweens.add({ targets: g, alpha: 0.08, yoyo: true, repeat: -1, duration: 1800 });
    }
    // Eingaben während einer Schleife zählen (inaktive Schleifen: nicht eingreifen!)
    this.keyH = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (this.qte && e.code === 'Space') { this.qte.ok = true; e.preventDefault(); return; }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'Space', 'Enter'].includes(e.code)) this.lastInput = host.time.now;
      if (e.code === 'KeyH' && !isDialogOpen() && !isModalOpen()) this.showClues();
    };
    window.addEventListener('keydown', this.keyH);
    host.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { window.removeEventListener('keydown', this.keyH); this.bar?.remove(); });
  }

  inRoom(r: MemRoom): boolean {
    const x = this.host.player.x / 16, y = (this.host.player.y + 8) / 16;
    return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  }

  kleriker(): boolean { return G.party.some((m) => m.cls === 'kleriker' && m.hp > 0); }

  // ------------------------------------------------------------ Ablauf
  update(dt: number): void {
    if (this.host.inBattle) return;
    if (!this.current) {
      for (const l of this.loops) {
        if (l.state === 'leave' && !this.inRoom(l.room)) l.state = 'idle';
        if (l.state === 'idle' && this.inRoom(l.room) && !isDialogOpen()) { this.start(l); break; }
      }
      return;
    }
    const l = this.current;
    if (this.breaking || isDialogOpen() || isModalOpen()) return;
    l.t += dt / 1000;
    const aktiv = l.def.kind === 'aktiv';
    const mental = this.kleriker() ? 0.6 : 1;
    const blut = G.blutmond > 0 ? 1.3 : 1;
    this.pressure += (aktiv ? 8.5 : 2.6) * mental * blut * (dt / 1000);
    // Szene kippt: aktiv langsam, inaktiv schnell
    const tl = aktiv ? [0.35, 0.6, 0.85] : [0.12, 0.3, 0.55];
    const dur = aktiv ? 100 / (8.5 * mental * blut) : 15;
    const prog = aktiv ? this.pressure / 100 : l.t / dur;
    while (l.turnShown < l.def.turn.length && prog >= tl[l.turnShown]) {
      this.host.cameras.main.flash(160, 120, 0, 0);
      this.say(l.def.turn[l.turnShown], '#ff9a90');
      l.turnShown++;
      const red = [0xd8a0a0, 0xd06a6a, 0xc03030][Math.min(2, l.turnShown - 1)];
      for (const g of l.ghosts) g.setTint(red);
    }
    this.renderBar();
    if (!aktiv) {
      // Regungslos zusehen. Jede Bewegung oder Eingabe ist ein Eingreifen.
      const moved = (this.host.player.body as Phaser.Physics.Arcade.Body).velocity.lengthSq() > 4;
      if (this.host.time.now > this.graceUntil && (moved || this.lastInput > this.graceUntil)) { this.breach(l, 'Du hast eingegriffen, wo niemand eingreifen darf.', true); return; }
      if (l.t >= dur) this.solve(l);
    } else if (this.pressure >= 100) {
      this.breach(l, 'Der Druck wird unerträglich. Jemand im Trupp bricht zusammen und schreit.', false);
    }
  }

  start(l: LoopState): void {
    this.current = l; l.state = 'running'; l.t = 0; l.turnShown = 0;
    this.pressure = l.def.kind === 'aktiv' ? 25 : 5;
    this.graceUntil = this.host.time.now + 1600;
    this.lastInput = 0;
    const host = this.host;
    host.cameras.main.flash(400, 160, 180, 220);
    SFX.fee();
    // Geisterszene
    l.def.ghosts.forEach((gd, i) => {
      const key = `ghost_${this.story.id}_${l.idx}_${i}`;
      ensureChar(host, key, { ...BASE_APP, ...gd.app } as Appearance);
      const gx = (l.room.cx + gd.dx) * 16 + 8, gy = (l.room.cy + gd.dy) * 16 + 8;
      const spr = host.add.sprite(gx, gy, key, gd.dx < 0 ? 9 : gd.dx > 0 ? 3 : 0).setTint(0xb0c4f0).setAlpha(0).setDepth(9);
      host.tweens.add({ targets: spr, alpha: 0.78, duration: 900 });
      host.tweens.add({ targets: spr, x: gx + (i % 2 ? 4 : -4), yoyo: true, repeat: -1, duration: 1400 + i * 300, ease: 'Sine.easeInOut' });
      const tx = host.add.text(gx, gy - 18, gd.line, { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '6px', color: '#dfe8ff', stroke: '#0a0b12', strokeThickness: 2, wordWrap: { width: 110 }, align: 'center' }).setOrigin(0.5, 1).setResolution(6).setDepth(44).setAlpha(0);
      host.tweens.add({ targets: tx, alpha: 1, delay: 600 + i * 900, duration: 500 });
      l.ghosts.push(spr); l.texts.push(tx);
    });
    if (l.def.kind === 'aktiv' && l.def.anchor) {
      const a = l.def.anchor;
      const k = 'anchor_' + (ANCHOR_ICON[a.name] ?? 'star');
      if (!host.textures.exists(k)) host.textures.addCanvas(k, iconCanvas(ANCHOR_ICON[a.name] ?? 'star', 1));
      const ax = (l.room.cx + a.dx) * 16 + 8, ay = (l.room.cy + a.dy) * 16 + 8;
      l.glow = host.add.image(ax, ay, 'glow').setScale(1.4).setTint(0xfff0b0).setBlendMode(Phaser.BlendModes.ADD).setDepth(43);
      host.tweens.add({ targets: l.glow, alpha: { from: 0.3, to: 0.9 }, yoyo: true, repeat: -1, duration: 600 });
      l.anchor = host.add.image(ax, ay, k).setDepth(44);
    }
    const lines = [{ who: 'Erinnerungsschleife', text: `${l.def.title}. ${l.def.intro}` }];
    if (this.kleriker()) lines.push({ who: 'Seelenhüter', text: l.def.kind === 'aktiv' ? '„Der Druck kommt sofort und hart – eine aktive Schleife! Wir müssen eingreifen. Such den Anker der Szene!“' : '„Spürt ihr? Der Druck kriecht nur langsam. Eine inaktive Schleife. Rührt euch nicht. Egal, was passiert – nicht eingreifen!“' });
    else lines.push({ who: 'Gefühl', text: l.def.kind === 'aktiv' ? 'Der Druck schlägt dir sofort gegen die Schläfen.' : 'Ein leiser, kalter Druck kriecht dir in den Nacken. Die Szene wirkt friedlich. Noch.' });
    dialog(lines, () => { this.graceUntil = this.host.time.now + 900; this.lastInput = 0; });
    this.showBar(l);
  }

  solve(l: LoopState): void {
    l.state = 'solved';
    this.current = null;
    this.clues[l.idx] = true;
    SFX.heal();
    this.say(l.def.calm, '#cfe0ff');
    this.fadeScene(l, false);
    this.hideBar();
    const xp = 70;
    const msgs = G.party.filter((m) => m.hp > 0).flatMap((m) => giveXp(m, xp));
    addItem('erinnerungssplitter');
    log(`Erinnerungsschleife „${l.def.title}“ gelöst.`);
    dialog([
      { who: 'Die Schleife löst sich', text: l.def.calm },
      { who: `Hinweis (${this.clues.filter(Boolean).length}/${this.clues.length})`, text: l.def.clue },
    ], () => { toast(`+${xp} Erfahrung, Erinnerungssplitter. Hinweise ansehen: H`, 'big', 3500); msgs.forEach((m) => toast(m, 'big')); updateHud(); });
  }

  /** Störenfried-Bruch – außer eine Stilleglocke oder ein Kleriker verhindert ihn. */
  breach(l: LoopState, why: string, leaderCaused: boolean): void {
    if (this.qte || this.breaking) return;
    this.breaking = true;
    this.say(why, '#ff9a90');
    if ((G.inv.stilleglocke ?? 0) > 0) {
      G.inv.stilleglocke--; if (G.inv.stilleglocke <= 0) delete G.inv.stilleglocke;
      SFX.bell();
      this.abort(l, 'Die Stilleglocke schluckt den Schrei, bevor er beginnt. Die Szene zerfällt – versucht es noch einmal.');
      return;
    }
    const cleric = G.party.find((m) => m.cls === 'kleriker' && m.hp > 0 && m.mp >= 9);
    if (cleric) {
      // Kurzes Zeitfenster: Leertaste = Stille wirken
      this.qte = { until: this.host.time.now + 1500, ok: false };
      this.host.snared = 1500;
      const box = h('div', { class: 'panel', style: 'position:absolute;left:50%;top:150px;transform:translateX(-50%);text-align:center;pointer-events:none' },
        h('div', { class: 'gold', style: 'font-size:22px' }, `${cleric.name}: STILLE!`), h('div', {}, 'Leertaste – jetzt!'));
      UI().appendChild(box);
      this.host.time.delayedCall(1500, () => {
        box.remove();
        const ok = this.qte?.ok; this.qte = null;
        if (ok) { cleric.mp -= 9; SFX.magic(); this.abort(l, `${cleric.name} legt Stille über den Raum. Der Schrei erstickt, bevor er beginnt.`); updateHud(); }
        else this.scream(l, leaderCaused);
      });
      return;
    }
    this.scream(l, leaderCaused);
  }

  abort(l: LoopState, text: string): void {
    this.current = null; l.state = 'leave'; this.breaking = false;
    this.fadeScene(l, false); this.hideBar();
    toast(text, 'big', 4000);
    toast('Verlasst den Raum und betretet ihn erneut, um die Schleife neu zu beginnen.', '', 4000);
  }

  scream(l: LoopState, leaderCaused: boolean): void {
    const host = this.host;
    const alive = G.party.filter((m) => m.hp > 0);
    const victim = leaderCaused || alive.length === 1 ? G.party[0] : alive[1 + Math.floor(Math.random() * (alive.length - 1))];
    const dur = G.blutmond > 0 ? 2500 + G.blutmond * 300 : 6000;
    host.snared = dur;
    // Figuren klinken die Kiefer aus, Augen platzen, der Schrei lähmt alle
    for (const g of l.ghosts) { g.setTint(0xff2020); host.tweens.add({ targets: g, scaleY: 1.6, duration: 400, yoyo: true, repeat: Math.floor(dur / 800) }); }
    host.cameras.main.shake(dur, 0.006); host.cameras.main.flash(300, 200, 0, 0);
    SFX.bruch(); host.time.addEvent({ delay: 450, repeat: Math.floor(dur / 450), callback: () => SFX.hurt() });
    toast(`STÖRENFRIED-BRUCH! ${victim.name} schreit. Ein Schrei, der nicht enden will – alle sind gelähmt.`, 'bad', dur);
    host.time.delayedCall(dur, () => {
      this.current = null; l.state = 'leave'; this.breaking = false;
      this.fadeScene(l, true); this.hideBar();
      const becomesScene = Math.random() < 0.1;
      if (victim.isPlayer) {
        for (const m of G.party) m.hp = Math.max(m.hp > 0 ? 1 : 0, Math.round(m.hp * 0.5));
        victim.hp = 0;
        toast(becomesScene ? 'Du wirst Teil der Szene…' : 'Dein Herz hält den Schrei nicht aus.', 'bad', 4000);
        host.time.delayedCall(1200, () => host.defeatAt(host.startRoom));
      } else if (becomesScene) {
        G.party = G.party.filter((m) => m !== victim);
        log(`${victim.name} wurde Teil einer Erinnerungsschleife.`);
        dialog([{ who: l.def.title, text: `Als der Schrei verstummt, steht ${victim.name} zwischen den Figuren der Szene. ${victim.app.gender === 'w' ? 'Sie' : 'Er'} sieht euch nicht mehr. ${victim.name} ist jetzt Teil dieser Erinnerung.` }]);
      } else {
        victim.hp = 0;
        dialog([{ who: l.def.title, text: `${victim.name} bricht zusammen, Blut an Ohren und Augen. Bewusstlos – aber am Leben. (Riechsalz oder eine Rast helfen.)` }]);
      }
      updateHud();
    });
  }

  fadeScene(l: LoopState, violent: boolean): void {
    const host = this.host;
    for (const g of l.ghosts) host.tweens.add({ targets: g, alpha: 0, duration: violent ? 300 : 1500, onComplete: () => g.destroy() });
    for (const t of l.texts) host.tweens.add({ targets: t, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    l.anchor?.destroy(); l.glow?.destroy();
    l.ghosts = []; l.texts = []; l.anchor = undefined; l.glow = undefined;
  }

  // ------------------------------------------------------------ Interaktion
  interact(): boolean {
    const p = this.host.player;
    const l = this.current;
    if (l && l.def.kind === 'aktiv' && l.anchor && Phaser.Math.Distance.Between(l.anchor.x, l.anchor.y, p.x, p.y + 6) < 26) {
      this.say(`${l.def.anchor!.name}: ${l.def.anchor!.hint}`, '#ffe08a');
      this.solve(l);
      return true;
    }
    if (Math.abs(Math.floor(p.x / 16) - this.mirror.x) <= 1 && Math.abs(Math.floor((p.y + 8) / 16) - this.mirror.y) <= 1) { this.riddle(); return true; }
    return false;
  }

  riddle(): void {
    if (this.riddleDone) return;
    const found = this.clues.filter(Boolean).length;
    const lines: { who?: string; text: string; opts?: { label: string; fn: () => void }[] }[] = [];
    if (found < this.clues.length) lines.push({ who: 'Endrätsel', text: `Du hast erst ${found} von ${this.clues.length} Erinnerungen dieses Ortes gesehen. Die übrigen Schleifen liegen in Räumen, die du ausgelassen hast. Du kannst trotzdem raten.` });
    lines.push({ who: 'Endrätsel', text: this.story.question, opts: [
      ...this.story.options.map((o, i) => ({ label: o, fn: () => (i === this.story.answer ? this.riddleSolved() : this.riddleWrong()) })),
      { label: 'Noch nicht', fn: () => { /* */ } },
    ] });
    dialog(lines);
  }

  riddleSolved(): void {
    this.riddleDone = true;
    SFX.victory();
    for (const m of G.party) { const msgs = giveXp(m, 180); msgs.forEach((x) => toast(x, 'big')); }
    G.silver += 250; addItem('erinnerungssplitter', 2);
    const g1 = rollDungeonGear(Math.random, 'A', newUid()); const g2 = rollDungeonGear(Math.random, 'A', newUid());
    G.gear.push(g1, g2);
    log(`Die Erinnerung von ${this.story.owner} gelöst.`);
    dialog([
      ...this.story.ending.map((t) => ({ who: this.story.owner, text: t })),
      { who: 'Eine Stimme wie ein Uhrwerk', text: '„Du hast eine meiner Erinnerungen geschlossen. Wie unhöflich.“ Ein winziges Licht kichert und ist fort.' },
      { who: 'Beute', text: `250 Silber, 2 Erinnerungssplitter, ${g1.name} und ${g2.name} (schlafend). Der Ausgang öffnet sich.` },
    ], () => { this.host.openExit(); updateHud(); });
  }

  riddleWrong(): void {
    SFX.bruch();
    this.host.cameras.main.shake(400, 0.01);
    dialog([{ who: 'Endrätsel', text: 'Falsch. Der Spiegel schreit – und aus dem Schrei werden Hunde aus Klang.' }], () => this.host.battleWith(['nachhall', 'nachhall']));
  }

  showClues(): void {
    const lines = this.story.loops.map((d, i) => ({ who: `${d.title} ${this.clues[i] ? '' : '(noch nicht gesehen)'}`, text: this.clues[i] ? d.clue : '…' }));
    dialog([{ who: 'Erinnerung', text: `Dieser Ort ist die Erinnerung von jemandem. ${this.clues.filter(Boolean).length} von ${this.clues.length} Schleifen gesehen.` }, ...lines]);
  }

  // ------------------------------------------------------------ Anzeige
  say(text: string, color: string): void {
    const host = this.host;
    const t = host.add.text(480, 120, text, { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '18px', color, stroke: '#0a0b12', strokeThickness: 5, wordWrap: { width: 700 }, align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(60).setResolution(1);
    t.setScale(1 / host.cameras.main.zoom);
    t.setPosition(host.cameras.main.width / 2, host.cameras.main.height * 0.3);
    host.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 700, onComplete: () => t.destroy() });
  }

  showBar(l: LoopState): void {
    this.hideBar();
    this.bar = h('div', { class: 'panel passthru', style: 'position:absolute;left:50%;bottom:52px;transform:translateX(-50%);width:380px;padding:6px 10px;pointer-events:none' });
    UI().appendChild(this.bar);
    void l;
    this.renderBar();
  }
  renderBar(): void {
    if (!this.bar || !this.current) return;
    const l = this.current;
    const p = Math.min(100, Math.round(this.pressure));
    this.bar.innerHTML = '';
    this.bar.appendChild(h('div', { class: 'row', style: 'font-size:13px' }, h('span', { class: 'grow gold' }, `Schleife: ${l.def.title}`), h('span', { class: p > 70 ? 'blood' : 'dim' }, `Druck ${p}%`)));
    this.bar.appendChild(h('div', { class: 'bar hp', style: 'height:8px' }, h('i', { style: `width:${p}%;background:${p > 70 ? '#d8483c' : '#8aa0e0'}` })));
  }
  hideBar(): void { this.bar?.remove(); this.bar = null; }

  /** Lebenspunkte prüfen: Kleriker mit Mentalschutz? */
  static hpOk(): boolean { return G.party.some((m) => m.hp > stats(m).hp * 0.1); }
}

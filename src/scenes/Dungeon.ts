import Phaser from 'phaser';
import { G, mulberry32, save, addItem, newUid, stats, fullHeal, itemName, money } from '../core/state';
import type { DungeonState } from '../data/types';
import { T, isSolid, TILE_COUNT } from '../gfx/tiles';
import { ensureChar } from '../gfx/tex';
import { MONSTERS, eliteOf } from '../data/monsters';
import { rollDungeonGear } from '../data/items';
import { showHud, updateHud, hideHud } from '../ui/hud';
import { openMenu } from '../ui/menu';
import { dialog, toast, isModalOpen, isDialogOpen, closeAllModals } from '../ui/dom';
import { showFee } from '../ui/fee';
import { advanceTime, onDungeonSolved, WorldEvent } from '../core/game';
import { setEsc } from '../core/input';
import { SFX } from '../core/sfx';

interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number; }
interface Mob { spr: Phaser.Physics.Arcade.Sprite; kind: string; boss?: boolean; hidden?: boolean; dust?: Phaser.GameObjects.Particles.ParticleEmitter; home: Phaser.Math.Vector2; t: number; dir: Phaser.Math.Vector2; }

const THEME = {
  stone: { floor: T.DFLOOR, wall: T.DWALL, top: T.DTOP, bg: 'stone' },
  chalk: { floor: T.CFLOOR, wall: T.CWALL, top: T.CTOP, bg: 'chalk' },
  sewer: { floor: T.SFLOOR, wall: T.DWALL, top: T.DTOP, bg: 'sewer' },
  moor: { floor: T.DFLOOR, wall: T.DWALL, top: T.DTOP, bg: 'stone' },
};

export class DungeonScene extends Phaser.Scene {
  d!: DungeonState;
  W = 64; H = 48;
  tiles: number[][] = [];
  rooms: Room[] = [];
  layer!: Phaser.Tilemaps.TilemapLayer;
  player!: Phaser.Physics.Arcade.Sprite;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  facing = 'down';
  mobs: Mob[] = [];
  chests: { spr: Phaser.GameObjects.Image; opened: boolean; x: number; y: number }[] = [];
  vision!: Phaser.GameObjects.Image;
  inBattle = false;
  walked = 0;
  daysInside = 0;
  blut = false;
  exitOpen = false;
  blinkT = 0;
  blinking = false;
  stepT = 0;
  bossRoom!: Room;
  decor: [number, number, string][] = [];
  startRoom!: Room;

  constructor() { super('Dungeon'); }

  init(data: { id: string }): void {
    this.d = G.dungeons[data.id];
    this.decor = []; this.mobs = []; this.chests = []; this.inBattle = false; this.walked = 0; this.daysInside = 0; this.exitOpen = false;
    this.blut = G.blutmond > 0;
  }

  create(): void {
    this.generate();
    const map = this.make.tilemap({ data: this.tiles, tileWidth: 16, tileHeight: 16 });
    const ts = map.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!;
    this.layer = map.createLayer(0, ts, 0, 0)!;
    const solid: number[] = []; for (let i = 0; i < TILE_COUNT; i++) if (isSolid(i)) solid.push(i);
    this.layer.setCollision(solid);

    ensureChar(this, 'player', G.party[0].app);
    const sr = this.startRoom;
    this.player = this.physics.add.sprite(sr.cx * 16 + 8, sr.cy * 16 + 8, 'player', 0).setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(10, 7).setOffset(3, 16);
    this.physics.add.collider(this.player, this.layer);
    this.cameras.main.setBounds(0, 0, this.W * 16, this.H * 16).startFollow(this.player, true, 0.2, 0.2).setZoom(3).setRoundPixels(true);
    this.cameras.main.fadeIn(600);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER', false) as Record<string, Phaser.Input.Keyboard.Key>;

    this.populate();
    this.vision = this.add.image(this.player.x, this.player.y, 'vision').setScale(0.55).setDepth(40);
    for (const [x, y, k] of this.decor) if (this.tiles[y][x] === THEME[this.d.theme].floor) this.add.image(x * 16 + 8, y * 16 + 8, k).setDepth(1).setFlipX(((x * 7 + y) % 2) === 0);
    // Fackellicht: leuchtet durch die Dunkelheit und flackert
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (this.tiles[y][x] !== T.TORCH) continue;
      const gl = this.add.image(x * 16 + 8, y * 16 + 6, 'glow').setScale(2.6).setTint(0xff9a3a).setAlpha(0.32).setBlendMode(Phaser.BlendModes.ADD).setDepth(42);
      this.tweens.add({ targets: gl, alpha: { from: 0.22, to: 0.38 }, scale: { from: 2.4, to: 2.8 }, yoyo: true, repeat: -1, duration: 160 + Math.random() * 220 });
      const fl = this.add.image(x * 16 + 8, y * 16 + 3, 'glow').setScale(0.35).setTint(0xffe090).setBlendMode(Phaser.BlendModes.ADD).setDepth(43);
      this.tweens.add({ targets: fl, alpha: { from: 0.6, to: 1 }, yoyo: true, repeat: -1, duration: 90 + Math.random() * 120 });
    }
    // Schwebender Staub im Licht
    this.add.particles(0, 0, 'px', { x: { min: -200, max: 200 }, y: { min: -120, max: 120 }, speedX: { min: -3, max: 3 }, speedY: { min: -4, max: 2 }, scale: 0.25, alpha: { start: 0.5, end: 0 }, lifespan: 4000, frequency: 120, tint: this.d.theme === 'chalk' ? 0xf0ead8 : 0xc8c0a8, follow: this.player }).setDepth(39);
    if (this.blut) this.add.rectangle(0, 0, 960, 540, 0x600808, 0.18).setOrigin(0).setScrollFactor(0).setDepth(41);

    showHud(this.d.name + (this.blut ? ' · Blut-Dungeon' : ''), 'E: Interagieren · Esc: Menü');
    setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(() => { closeAllModals(); hideHud(); this.scene.start('Title'); }); });
    this.events.on('battleEnd', (r: { result: string; roamer?: Mob }) => this.afterBattle(r));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.events.off('battleEnd'); this.events.off(Phaser.Scenes.Events.RESUME); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { showHud(this.d.name + (this.blut ? ' · Blut-Dungeon' : '')); setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(); }); });

    const lines = [
      { who: this.d.name, text: 'Hinter euch schließt sich die Schwelle. Wo eben noch der Ausgang war, ist nur noch Stein.' },
    ];
    if (this.blut) lines.push({ who: this.d.name, text: 'Der Blutmond hat diesen Ort verändert. Es riecht nach Eisen. Hier gibt es keinen sicheren Schlaf.' });
    if (this.d.theme === 'chalk') lines.push({ who: 'Hinweis', text: 'Wo feiner Staub von der Decke rieselt, hängt etwas. Ein Pfadfinder im Trupp verhindert Hinterhalte.' });
    if (this.d.id === 'nordtor') lines.push({ who: 'Hinweis', text: 'Steinbänke. Ein Wartesaal. Die Gestalten darauf bewegen sich nur, wenn niemand hinsieht. Und jeder blinzelt irgendwann.' });
    if (this.d.theme === 'sewer') lines.push({ who: 'Hinweis', text: 'Dunkles Wasser in den Rinnen. Bleib vom Rand weg, wenn es sich bewegt.' });
    dialog(lines);
  }

  // ------------------------------------------------------------ Generierung
  generate(): void {
    const r = mulberry32(this.d.seed + (this.blut ? 7 : 0));
    const th = THEME[this.d.theme];
    this.tiles = [];
    for (let y = 0; y < this.H; y++) { this.tiles.push(new Array(this.W).fill(-1)); }
    const rooms: Room[] = [];
    const want = this.d.rooms;
    let tries = 0;
    while (rooms.length < want && tries++ < 800) {
      const w = 7 + Math.floor(r() * 6), h = 6 + Math.floor(r() * 4);
      const x = 2 + Math.floor(r() * (this.W - w - 4)), y = 2 + Math.floor(r() * (this.H - h - 4));
      if (rooms.some((o) => x < o.x + o.w + 3 && x + w + 3 > o.x && y < o.y + o.h + 3 && y + h + 3 > o.y)) continue;
      rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
    }
    // Kette: jeweils nächster Raum
    const ordered: Room[] = [rooms.shift()!];
    while (rooms.length) {
      const last = ordered[ordered.length - 1];
      rooms.sort((a, b) => Math.hypot(a.cx - last.cx, a.cy - last.cy) - Math.hypot(b.cx - last.cx, b.cy - last.cy));
      ordered.push(rooms.shift()!);
    }
    this.rooms = ordered;
    const carve = (x: number, y: number) => { if (x > 0 && y > 0 && x < this.W - 1 && y < this.H - 1) this.tiles[y][x] = th.floor; };
    for (const rm of ordered) for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) carve(x, y);
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1], b = ordered[i];
      const horizFirst = r() < 0.5;
      const hx = (y: number, x0: number, x1: number) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { carve(x, y); carve(x, y + 1); } };
      const vy = (x: number, y0: number, y1: number) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { carve(x, y); carve(x + 1, y); } };
      if (horizFirst) { hx(a.cy, a.cx, b.cx); vy(b.cx, a.cy, b.cy); } else { vy(a.cx, a.cy, b.cy); hx(b.cy, a.cx, b.cx); }
    }
    // Wände
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (this.tiles[y][x] !== -1) continue;
      const below = y + 1 < this.H ? this.tiles[y + 1][x] : -1;
      this.tiles[y][x] = below === th.floor || below === T.SWATER || below === T.BENCH ? th.wall : th.top;
    }
    this.startRoom = ordered[0];
    this.bossRoom = ordered[ordered.length - 1];
    // Deko
    for (const rm of ordered) {
      if (rm === this.startRoom) continue;
      if (this.d.theme === 'sewer' && rm !== this.bossRoom && rm.h >= 7) for (let x = rm.x + 1; x < rm.x + rm.w - 1; x++) if (x !== rm.cx && x !== rm.cx + 1) this.tiles[rm.y + 1][x] = T.SWATER;
      if (this.d.id === 'nordtor' && rm !== this.bossRoom) for (let y = rm.y + 1; y < rm.y + rm.h - 1; y += 2) for (let x = rm.x + 1; x < rm.x + rm.w - 1; x++) if (Math.abs(x - rm.cx) > 1 && r() < 0.55) this.tiles[y][x] = T.BENCH;
      for (let i = 0; i < 3; i++) { const x = rm.x + 1 + Math.floor(r() * (rm.w - 2)), y = rm.y + 1 + Math.floor(r() * (rm.h - 2)); if (this.tiles[y][x] === th.floor) this.tiles[y][x] = this.blut && r() < 0.6 ? T.BLOOD : T.BONES; }
    }
    // Details: Fackeln, Moos, Risse, Banner, Rohre, Pfützen, Geröll, Spinnweben
    const chalk = this.d.theme === 'chalk', sewer = this.d.theme === 'sewer';
    let lastTorch = -99;
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.tiles[y][x];
      if (t === th.wall) {
        const n = r();
        if (!chalk && x - lastTorch > 4 && n < 0.16) { this.tiles[y][x] = T.TORCH; lastTorch = x; }
        else if (chalk && n < 0.14) this.tiles[y][x] = T.CWALL_FOSSIL;
        else if (!chalk && sewer && n < 0.24) this.tiles[y][x] = T.PIPE;
        else if (!chalk && !sewer && this.d.id === 'nordtor' && n < 0.24) this.tiles[y][x] = T.BANNER;
        else if (!chalk && n < 0.36) this.tiles[y][x] = r() < 0.5 ? T.DWALL_MOSS : T.DWALL_CRACK;
      } else if (t === th.floor) {
        const n = r();
        if (n < 0.07) this.decor.push([x, y, 'deco_crack']);
        else if (!chalk && n < (sewer ? 0.14 : 0.09)) this.decor.push([x, y, 'deco_puddle']);
        else if (n < 0.11) this.decor.push([x, y, 'deco_pebbles']);
      }
    }
    for (const rm of ordered) {
      if (this.tiles[rm.y][rm.x] === th.floor && !chalk) this.decor.push([rm.x, rm.y, 'deco_web']);
      if (rm !== this.startRoom && rm !== this.bossRoom && r() < 0.6) {
        const cx = r() < 0.5 ? rm.x : rm.x + rm.w - 1, cy = r() < 0.5 ? rm.y + rm.h - 1 : rm.y + 1;
        if (this.tiles[cy][cx] === th.floor && !(cx === rm.cx || cx === rm.cx + 1)) this.tiles[cy][cx] = chalk ? T.CHALKROCK : T.RUBBLE;
      }
    }
    // Sicherer Raum (nicht bei Blutmond)
    if (!this.blut && ordered.length > 3) {
      const sr = ordered[Math.floor(ordered.length / 2)];
      this.tiles[sr.cy][sr.cx] = T.SAFE;
      (sr as Room & { safe?: boolean }).safe = true;
    }
    // Ausgang/Treppe im Bossraum
    if (this.d.tower) this.tiles[this.bossRoom.cy][this.bossRoom.cx] = T.STAIRS;
    // Bänke im Bossraum entfernen
    for (let y = this.bossRoom.y; y < this.bossRoom.y + this.bossRoom.h; y++) for (let x = this.bossRoom.x; x < this.bossRoom.x + this.bossRoom.w; x++) if (this.tiles[y][x] === T.BENCH) this.tiles[y][x] = th.floor;
  }

  populate(): void {
    const r = mulberry32(this.d.seed * 3 + 1);
    const th = THEME[this.d.theme];
    const free = (rm: Room): [number, number] => {
      for (let i = 0; i < 40; i++) {
        const x = rm.x + 1 + Math.floor(r() * (rm.w - 2)), y = rm.y + 1 + Math.floor(r() * (rm.h - 2));
        if (this.tiles[y][x] === th.floor || this.tiles[y][x] === T.BONES) return [x, y];
      }
      return [rm.cx, rm.cy];
    };
    this.rooms.forEach((rm, i) => {
      if (rm === this.startRoom || (rm as Room & { safe?: boolean }).safe) return;
      if (rm === this.bossRoom) {
        if (!this.d.tower) this.spawnMob(this.d.boss, rm.cx, rm.cy, true);
        return;
      }
      let n = 1 + (r() < 0.5 ? 1 : 0);
      if (this.blut) n = Math.round(n * 2.5);
      for (let k = 0; k < n; k++) { const [x, y] = free(rm); this.spawnMob(this.d.enemies[Math.floor(r() * this.d.enemies.length)], x, y); }
      if (i % 3 === 1 || r() < 0.25) {
        const [x, y] = free(rm);
        const spr = this.add.image(x * 16 + 8, y * 16 + 8, 'chest').setDepth(6);
        this.chests.push({ spr, opened: false, x, y });
      }
    });
  }

  spawnMob(kind: string, tx: number, ty: number, boss = false): void {
    const def = kind.endsWith('_elite') ? eliteOf(kind.replace('_elite', '')) : MONSTERS[kind];
    const spr = this.physics.add.sprite(tx * 16 + 8, ty * 16 + 8, def.sprite).setDepth(9);
    const scale = boss ? (def.id === 'kreidemutter' ? 0.6 : 1.3) : def.sprite === 'm_hohlmann' || def.sprite === 'm_sitzer' ? 0.75 : 0.8;
    spr.setScale(scale);
    (spr.body as Phaser.Physics.Arcade.Body).setSize(Math.min(def.id === 'kreidemutter' ? 60 : 14, spr.width), Math.min(def.id === 'kreidemutter' ? 40 : 10, spr.height));
    this.physics.add.collider(spr, this.layer);
    const mob: Mob = { spr, kind, boss, home: new Phaser.Math.Vector2(spr.x, spr.y), t: 0, dir: new Phaser.Math.Vector2() };
    if (kind === 'kreidekriecher') {
      mob.hidden = true; spr.setAlpha(0);
      mob.dust = this.add.particles(spr.x, spr.y - 10, 'dust', { x: { min: -5, max: 5 }, speedY: { min: 8, max: 18 }, lifespan: 900, frequency: 160, alpha: { start: 0.9, end: 0 }, scale: 0.6 }).setDepth(8) as unknown as Phaser.GameObjects.Particles.ParticleEmitter;
    }
    if (kind === 'kanalwuerger') spr.setAlpha(0.35);
    if (boss) this.tweens.add({ targets: spr, scaleY: scale * 1.05, yoyo: true, repeat: -1, duration: 800 });
    this.mobs.push(mob);
  }

  // ------------------------------------------------------------ Loop
  update(_t: number, dt: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.vision.setPosition(this.player.x, this.player.y);
    if (this.inBattle) { body.setVelocity(0); return; }
    const blocked = isModalOpen() || isDialogOpen();
    const k = this.keys;
    let vx = 0, vy = 0;
    if (!blocked) {
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
    }
    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(78);
    body.setVelocity(v.x, v.y);
    if (vx || vy) {
      this.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      this.player.anims.play(`player_walk_${this.facing}`, true);
      this.stepT += dt; if (this.stepT > 330) { this.stepT = 0; SFX.step(); }
    } else { this.player.anims.stop(); this.player.setFrame(['down', 'left', 'right', 'up'].indexOf(this.facing) * 3); }
    // Zeit & Proviant
    this.walked += (body.velocity.length() * dt) / 1000;
    if (this.walked > 16 * 32) { this.walked = 0; this.passTime(0.2); }

    if (!blocked && (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER))) this.interact();
    // Blinzeln (Sitzer)
    if (this.d.id === 'nordtor') {
      this.blinkT += dt;
      if (this.blinkT > 5200 + Math.random() * 1500) {
        this.blinkT = 0; this.blinking = true;
        this.cameras.main.fadeOut(90, 0, 0, 0);
        this.time.delayedCall(260, () => { this.cameras.main.fadeIn(90); this.blinking = false; });
      }
    }
    this.updateMobs(dt, blocked);
  }

  passTime(days: number): void {
    const before = Math.floor(this.daysInside);
    this.daysInside += days;
    const ev = advanceTime(days, this.d.id);
    if (Math.floor(this.daysInside) > before) {
      const need = G.party.length;
      const have = G.inv.proviant ?? 0;
      if (have >= need) { G.inv.proviant = have - need; toast(`Ein Tag vergeht im Dungeon. Der Trupp isst ${need} Ration(en).`); }
      else {
        G.inv.proviant = 0;
        for (const m of G.party) { const s = stats(m); m.hp = Math.max(1, m.hp - Math.round(s.hp * 0.15)); }
        toast('Kein Proviant mehr! Der Hunger zehrt am Trupp.', 'bad', 3500);
      }
    }
    if (ev.length) this.stashEvents(ev);
    updateHud();
  }

  stashEvents(ev: WorldEvent[]): void {
    // Ereignisse draußen erfährt man erst nach der Rückkehr – außer dem Blutmond, den spürt man.
    const prev = G.flags.pendingEvents ? (JSON.parse(G.flags.pendingEvents as string) as WorldEvent[]) : [];
    G.flags.pendingEvents = JSON.stringify([...prev, ...ev]);
    if (ev.some((e) => e.text.includes('BLUTMOND'))) toast('Etwas verändert sich. Die Wände schwitzen rot.', 'bad', 4000);
  }

  inView(mx: number, my: number): boolean {
    const dx = mx - this.player.x, dy = my - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 150) return false;
    const f = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.facing as 'down']!;
    const dot = (dx * f[0] + dy * f[1]) / Math.max(1, dist);
    return dot > 0.5 && !this.blinking;
  }

  updateMobs(dt: number, blocked: boolean): void {
    for (const m of this.mobs) {
      if (!m.spr.active) continue;
      const b = m.spr.body as Phaser.Physics.Arcade.Body;
      if (blocked) { b.setVelocity(0); continue; }
      const d = Phaser.Math.Distance.Between(m.spr.x, m.spr.y, this.player.x, this.player.y + 6);
      if (m.hidden) {
        b.setVelocity(0);
        const pf = G.party.some((p) => p.cls === 'pfadfinder');
        if (pf && d < 50 && m.spr.alpha === 0) { m.spr.setAlpha(0.5); toast('Dein Pfadfinder zeigt nach oben: Da hängt etwas!'); }
        if (d < 22) { m.hidden = false; m.spr.setAlpha(1); m.dust?.stop(); this.encounter(m, !pf); }
        continue;
      }
      if (m.boss) { b.setVelocity(0); if (d < 44) { this.encounter(m); break; } continue; }
      let speed = 40;
      if (m.kind === 'hohlmann') speed = 26;
      if (m.kind === 'aschhund') speed = 60;
      if (m.kind === 'kanalwuerger') { speed = 34; m.spr.setAlpha(d < 60 ? 1 : 0.35); }
      if (m.kind === 'sitzer') {
        const seen = this.inView(m.spr.x, m.spr.y);
        if (seen) { b.setVelocity(0); m.spr.setTint(0xb0b0b0); continue; }
        m.spr.clearTint();
        speed = this.blinking ? 220 : 55;
      }
      if (d < 110) {
        const dir = new Phaser.Math.Vector2(this.player.x - m.spr.x, this.player.y - m.spr.y).normalize();
        b.setVelocity(dir.x * speed, dir.y * speed);
      } else {
        m.t -= dt;
        if (m.t <= 0) { m.t = 1200 + Math.random() * 1800; m.dir = Math.random() < 0.4 ? new Phaser.Math.Vector2() : new Phaser.Math.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(); }
        if (Phaser.Math.Distance.Between(m.spr.x, m.spr.y, m.home.x, m.home.y) > 60) m.dir = new Phaser.Math.Vector2(m.home.x - m.spr.x, m.home.y - m.spr.y).normalize();
        b.setVelocity(m.dir.x * speed * 0.4, m.dir.y * speed * 0.4);
      }
      if (b.velocity.x) m.spr.setFlipX(b.velocity.x > 0);
      m.spr.setAngle(b.velocity.lengthSq() > 4 ? Math.sin(this.time.now / 70 + m.home.x) * 7 : 0);
      if (d < 13) { this.encounter(m); break; }
    }
  }

  encounter(m: Mob, ambush = false): void {
    if (this.inBattle) return;
    this.inBattle = true;
    SFX.encounter();
    let enemies = [m.kind];
    if (!m.boss) {
      const extra = this.blut ? 2 : Math.random() < 0.45 ? 1 : 0;
      for (let i = 0; i < extra; i++) enemies.push(this.d.enemies[Math.floor(Math.random() * this.d.enemies.length)]);
      if (m.kind === 'kanalwuerger' && enemies.length > 2) enemies = enemies.slice(0, 2);
    }
    this.cameras.main.flash(200, 255, 255, 255);
    this.time.delayedCall(250, () => {
      this.scene.pause();
      this.scene.launch('Battle', { enemies, bg: this.blut ? 'blut' : THEME[this.d.theme].bg, caller: 'Dungeon', roamer: m, canFlee: !m.boss, ambush });
    });
  }

  afterBattle(res: { result: string; roamer?: Mob }): void {
    this.inBattle = false;
    showHud(this.d.name + (this.blut ? ' · Blut-Dungeon' : ''));
    const m = res.roamer;
    if (res.result === 'win' && m) {
      m.spr.destroy(); m.dust?.destroy();
      this.mobs = this.mobs.filter((x) => x !== m);
      if (m.boss) this.openExit();
      this.passTime(0.1);
    } else if (res.result === 'flee' && m) {
      m.spr.setPosition(m.home.x, m.home.y);
      const b = this.player.body as Phaser.Physics.Arcade.Body; b.reset(this.player.x - 20, this.player.y);
    } else if (res.result === 'lose') {
      showFee(() => {
        const sr = this.startRoom;
        this.player.setPosition(sr.cx * 16 + 8, sr.cy * 16 + 8);
        if (m && !m.boss) { m.spr.setPosition(m.home.x, m.home.y); }
        toast('Die Fee hat die Zeit deines Zustands zurückgedreht. Der Dungeon hält dich weiter fest.', 'big', 4500);
      }, () => { hideHud(); this.scene.start('World'); });
    }
    updateHud();
  }

  openExit(): void {
    this.exitOpen = true;
    const br = this.bossRoom;
    this.layer.putTileAt(T.EXIT, br.cx, br.cy);
    this.tiles[br.cy][br.cx] = T.EXIT;
    SFX.victory();
    toast('Der Dungeon ist besiegt. In der Mitte des Raums öffnet sich der Ausgang.', 'big', 4500);
    const g = this.add.image(br.cx * 16 + 8, br.cy * 16 + 8, 'glow').setScale(2).setDepth(7).setTint(0xfff0c0).setAlpha(0.7);
    this.tweens.add({ targets: g, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
  }

  facingTile(): [number, number] {
    const fx = this.player.x, fy = this.player.y + 8;
    const d = { down: [0, 12], up: [0, -14], left: [-12, 0], right: [12, 0] }[this.facing as 'down']!;
    return [Math.floor((fx + d[0]) / 16), Math.floor((fy + d[1]) / 16)];
  }

  interact(): void {
    for (const c of this.chests) {
      if (c.opened) continue;
      if (Phaser.Math.Distance.Between(c.spr.x, c.spr.y, this.player.x, this.player.y + 6) < 20) { this.openChest(c); return; }
    }
    const [tx, ty] = this.facingTile();
    const near = [[tx, ty], [Math.floor(this.player.x / 16), Math.floor((this.player.y + 8) / 16)]];
    for (const [x, y] of near) {
      const t = this.tiles[y]?.[x];
      if (t === T.SAFE) return this.rest();
      if (t === T.EXIT) return this.leave();
      if (t === T.STAIRS) return this.toTower();
    }
  }

  openChest(c: { spr: Phaser.GameObjects.Image; opened: boolean }): void {
    c.opened = true; c.spr.setTexture('chest_open'); SFX.coin();
    const r = Math.random();
    if (r < 0.22) { const g = rollDungeonGear(Math.random, this.d.rank, newUid()); G.gear.push(g); toast(`Truhe: ${g.name} (schlafend)`, 'big'); }
    else if (r < 0.45) { const s = 15 + Math.floor(Math.random() * (this.d.rank === 'C' ? 50 : 25)); G.silver += s; toast(`Truhe: ${money(s)}`); }
    else { const pool = ['heiltrank', 'heiltrank', 'manatrank', 'proviant', 'proviant', 'kraeuterbund', 'riechsalz', 'plakette']; const it = pool[Math.floor(Math.random() * pool.length)]; const n = it === 'proviant' ? 3 : 1; addItem(it, n); toast(`Truhe: ${itemName(it)} ×${n}`); }
    updateHud();
  }

  rest(): void {
    const need = G.party.length;
    if ((G.inv.proviant ?? 0) < need) { dialog([{ who: 'Rastraum', text: `Ein sicherer Raum – Monster meiden diese Zeichen. Zum Rasten braucht ihr ${need} Ration(en).` }]); return; }
    dialog([{ who: 'Rastraum', text: `Ein sicherer Raum. Rasten (½ Tag, ${need} Ration(en)): Der Trupp erholt sich vollständig.`, opts: [
      { label: 'Rasten', fn: () => { addItem('proviant', -need); for (const m of G.party) fullHeal(m); this.passTime(0.5); SFX.heal(); toast('Der Trupp rastet und erholt sich.', 'big'); updateHud(); } },
      { label: 'Weiter', fn: () => { /* */ } },
    ] }]);
  }

  leave(): void {
    onDungeonSolved(this.d.id);
    G.party.forEach((m) => { if (m.hp <= 0) m.hp = 1; });
    save();
    this.cameras.main.fadeOut(600);
    this.time.delayedCall(650, () => { hideHud(); this.scene.start('World'); toast(`„${this.d.name}“ gelöst! Meldet euch bei der Gilde.`, 'big', 5000); });
  }

  toTower(): void {
    dialog([{ who: 'Wendeltreppe', text: 'Eine Treppe führt hinauf in den Turm. Von oben: ein tiefes, langsames Läuten. „Ich läute für alle, die warten.“', opts: [
      { label: 'Hinaufsteigen', fn: () => { this.cameras.main.fadeOut(500); this.time.delayedCall(520, () => { hideHud(); this.scene.start('Tower', { id: this.d.id, days: this.daysInside }); }); } },
      { label: 'Noch nicht', fn: () => { /* */ } },
    ] }]);
  }
}

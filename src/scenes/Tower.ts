import Phaser from 'phaser';
import { G, stats, addItem, save } from '../core/state';
import { T } from '../gfx/tiles';
import { ensureChar } from '../gfx/tex';
import { showHud, updateHud, hideHud } from '../ui/hud';
import { openMenu } from '../ui/menu';
import { dialog, toast, isModalOpen, isDialogOpen, closeAllModals } from '../ui/dom';
import { showFee } from '../ui/fee';
import { onDungeonSolved } from '../core/game';
import { setEsc } from '../core/input';
import { SFX } from '../core/sfx';

const W = 26, H = 64;

export class TowerScene extends Phaser.Scene {
  id = 'nordtor';
  fg!: Phaser.Tilemaps.TilemapLayer;
  player!: Phaser.Physics.Arcade.Sprite;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  ladders = new Set<string>();
  pendulums: { pivot: Phaser.Math.Vector2; len: number; phase: number; speed: number; amp: number; ball: Phaser.GameObjects.Arc; chain: Phaser.GameObjects.Graphics }[] = [];
  lastMove = 0;
  herz = 0;
  bellT = 0;
  climbing = false;
  facing = 'right';
  inBattle = false;
  hurtCd = 0;
  checkpoint = new Phaser.Math.Vector2();
  plaque!: Phaser.Math.Vector2;
  plaqueRead = false;
  corpse!: Phaser.GameObjects.Image;
  door!: Phaser.GameObjects.Rectangle;

  constructor() { super('Tower'); }

  init(d: { id: string }): void { this.id = d.id; this.pendulums = []; this.ladders = new Set(); this.herz = 0; this.bellT = 0; this.inBattle = false; this.plaqueRead = false; }

  create(): void {
    const bg: number[][] = [], fg: number[][] = [];
    for (let y = 0; y < H; y++) { bg.push(new Array(W).fill(T.TOWERBG)); fg.push(new Array(W).fill(-1)); }
    for (let y = 0; y < H; y++) { fg[y][0] = T.DWALL; fg[y][1] = T.DWALL; fg[y][W - 1] = T.DWALL; fg[y][W - 2] = T.DWALL; }
    for (let x = 0; x < W; x++) { fg[H - 1][x] = T.PLATFORM; fg[H - 2][x] = x < 2 || x > W - 3 ? T.DWALL : -1; }
    // Ebenen alle 6 Reihen, abwechselnd links/rechts mit Lücke
    const levels: number[] = [];
    for (let y = H - 7, i = 0; y > 6; y -= 6, i++) {
      levels.push(y);
      const left = i % 2 === 0;
      for (let x = 2; x < W - 2; x++) {
        const gap = left ? x > W - 9 : x < 8;
        if (!gap) fg[y][x] = T.PLATFORM;
      }
      // kleine Zwischenplattform im Spalt
      const sx = left ? W - 6 : 4;
      fg[y + 3][sx] = T.PLATFORM; fg[y + 3][sx + 1] = T.PLATFORM;
      // Leiter in jeder dritten Ebene
      if (i % 3 === 2) { const lx = left ? 6 : W - 8; for (let ly = y; ly < y + 6; ly++) { fg[ly][lx] = T.LADDER; this.ladders.add(`${lx},${ly}`); } fg[y][lx] = T.LADDER; }
      // Ketten im Hintergrund
      bg[y - 2][12 + (i % 3)] = T.CHAIN; bg[y - 3][12 + (i % 3)] = T.CHAIN;
    }
    // Spitze
    for (let x = 2; x < W - 2; x++) fg[4][x] = T.PLATFORM;
    for (let ly = 4; ly < 7 + 1; ly++) { fg[ly][W - 6] = T.LADDER; this.ladders.add(`${W - 6},${ly}`); }
    for (let y = 0; y < 4; y++) bg[y][13] = T.CHAIN;

    const map = this.make.tilemap({ data: bg, tileWidth: 16, tileHeight: 16 });
    const ts = map.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!;
    map.createLayer(0, ts, 0, 0)!.setDepth(0);
    const map2 = this.make.tilemap({ data: fg, tileWidth: 16, tileHeight: 16 });
    const ts2 = map2.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!;
    this.fg = map2.createLayer(0, ts2, 0, 0)!.setDepth(1);
    this.fg.setCollision([T.DWALL]);
    this.fg.forEachTile((t) => { if (t.index === T.PLATFORM) t.setCollision(false, false, true, false); });

    ensureChar(this, 'player', G.party[0].app);
    this.physics.world.gravity.y = 640;
    this.physics.world.setBounds(0, 0, W * 16, H * 16);
    this.player = this.physics.add.sprite(5 * 16, (H - 3) * 16, 'player', 6).setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(8, 18).setOffset(4, 6).setMaxVelocityY(420);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.fg);
    this.checkpoint.set(this.player.x, this.player.y);
    this.cameras.main.setBounds(0, 0, W * 16, H * 16).startFollow(this.player, true, 0.15, 0.15).setZoom(2.6).setRoundPixels(true);
    this.cameras.main.fadeIn(600);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E', false) as Record<string, Phaser.Input.Keyboard.Key>;

    // Pendel aus Knochenketten
    levels.forEach((y, i) => {
      if (i === 0 || i % 2 === 1) return;
      const px = (i % 4 === 0 ? 10 : 15) * 16;
      const chain = this.add.graphics().setDepth(5);
      const ball = this.add.circle(0, 0, 7, 0xd8d0bc).setStrokeStyle(2, 0x2a2420).setDepth(6);
      this.pendulums.push({ pivot: new Phaser.Math.Vector2(px, (y - 5) * 16), len: 64, phase: i, speed: 1.6 + (i % 3) * 0.3, amp: 1.1, ball, chain });
    });
    // Rätseltafel & toter Abenteurer
    const ply = levels[3] ?? levels[levels.length - 1];
    this.plaque = new Phaser.Math.Vector2(12 * 16, (ply - 1) * 16);
    this.add.rectangle(this.plaque.x, this.plaque.y, 22, 14, 0x5a4a38).setStrokeStyle(1, 0x2a2018).setDepth(3);
    this.add.text(this.plaque.x, this.plaque.y, '✠', { fontSize: '9px', color: '#d8c8a0' }).setOrigin(0.5).setDepth(4).setResolution(3);
    this.corpse = this.add.image(18 * 16, (levels[1] - 1) * 16 + 6, 'm_hohlmann').setAngle(90).setScale(0.7).setTint(0x8a8a8a).setDepth(3);
    // Tür zum Glöckner
    this.door = this.add.rectangle(W / 2 * 16, 3 * 16 + 4, 28, 24, 0x1a1008).setStrokeStyle(2, 0xb8803a).setDepth(3);
    const glow = this.add.image(this.door.x, this.door.y, 'glow').setScale(2.5).setTint(0xe0ad4a).setAlpha(0.4).setDepth(2);
    this.tweens.add({ targets: glow, alpha: 0.15, yoyo: true, repeat: -1, duration: 900 });

    showHud('Nordtor-Turm', 'A/D laufen · Leertaste/W springen · W/S Leiter · Esc Menü');
    setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(() => { closeAllModals(); hideHud(); this.scene.start('Title'); }); });
    this.events.on('battleEnd', (r: { result: string }) => this.afterBattle(r));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.events.off('battleEnd'); this.events.off(Phaser.Scenes.Events.RESUME); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => showHud('Nordtor-Turm', 'A/D laufen · Leertaste/W springen · W/S Leiter · Esc Menü'));
    this.lastMove = this.time.now;
    dialog([
      { who: 'Nordtor-Turm', text: 'Der Turm ist hohl. Ganz oben hängt etwas Großes und schwingt. Alle paar Atemzüge dröhnt eine Glocke durch den Stein.' },
      { who: 'Instinkt', text: 'Beim ersten Schlag stockte dein Herz – weil du stillstandest. Bleib in Bewegung, wenn die Glocke schlägt.' },
    ]);
  }

  update(_t: number, dt: number): void {
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    for (const p of this.pendulums) {
      const a = Math.sin(this.time.now / 1000 * p.speed + p.phase) * p.amp;
      const bx = p.pivot.x + Math.sin(a) * p.len, by = p.pivot.y + Math.cos(a) * p.len;
      p.ball.setPosition(bx, by);
      p.chain.clear().lineStyle(2, 0xb8b0a0, 1).lineBetween(p.pivot.x, p.pivot.y, bx, by);
      if (!this.inBattle && this.hurtCd <= 0 && Phaser.Math.Distance.Between(bx, by, this.player.x, this.player.y) < 13) this.hurt(0.1, bx < this.player.x ? 1 : -1);
    }
    if (this.hurtCd > 0) this.hurtCd -= dt;
    if (this.inBattle) { b.setVelocity(0); b.setAllowGravity(false); return; }
    const blocked = isModalOpen() || isDialogOpen();
    b.setAllowGravity(!this.climbing && !blocked);
    if (blocked) { b.setVelocity(0, 0); this.lastMove = this.time.now; return; }
    const k = this.keys;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.UP.isDown, down = k.S.isDown || k.DOWN.isDown;
    const tx = Math.floor(this.player.x / 16), ty = Math.floor((this.player.y + 4) / 16);
    const onLadder = this.ladders.has(`${tx},${ty}`) || this.ladders.has(`${tx},${ty + 1}`);
    if (onLadder && (up || down)) this.climbing = true;
    if (!onLadder) this.climbing = false;
    let vx = 0;
    if (left) vx -= 95; if (right) vx += 95;
    b.setVelocityX(vx);
    if (this.climbing) {
      b.setVelocityY(up ? -80 : down ? 80 : 0);
      if (vx) this.climbing = false;
    } else if ((Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.W) || Phaser.Input.Keyboard.JustDown(k.UP)) && (b.blocked.down || b.touching.down)) {
      b.setVelocityY(-262); SFX.step();
    }
    if (vx) this.facing = vx < 0 ? 'left' : 'right';
    if (this.climbing) this.player.anims.play('player_walk_up', true);
    else if (vx) this.player.anims.play(`player_walk_${this.facing}`, true);
    else { this.player.anims.stop(); this.player.setFrame(this.facing === 'left' ? 3 : 6); }
    if (Math.abs(b.velocity.x) > 5 || Math.abs(b.velocity.y) > 5) this.lastMove = this.time.now;
    if (b.blocked.down && this.player.y < this.checkpoint.y - 60) this.checkpoint.set(this.player.x, this.player.y);

    // Glocke
    this.bellT += dt;
    if (this.bellT > 3400) { this.bellT = 0; this.ring(); }

    // Interaktionen
    if (Phaser.Input.Keyboard.JustDown(k.E)) {
      if (Phaser.Math.Distance.Between(this.plaque.x, this.plaque.y, this.player.x, this.player.y) < 30) this.readPlaque();
      else if (this.corpse.visible && Phaser.Math.Distance.Between(this.corpse.x, this.corpse.y, this.player.x, this.player.y) < 30) { this.corpse.setVisible(false); addItem('plakette'); addItem('heiltrank'); toast('Ein toter Abenteurer. Kalte Plakette und ein Heiltrank.'); SFX.coin(); }
    }
    if (!this.plaqueRead && Phaser.Math.Distance.Between(this.plaque.x, this.plaque.y, this.player.x, this.player.y) < 26) toast('E: Tafel lesen', '', 1200), this.plaqueRead = true;
    if (Phaser.Math.Distance.Between(this.door.x, this.door.y, this.player.x, this.player.y) < 22) this.bossDoor();
  }

  readPlaque(): void {
    dialog([
      { who: 'Eingeritzte Tafel', text: '„Ich läute für alle, die warten. Wer sich rührt, den höre ich nicht. Nimm mir die Zunge, und ich bin stumm.“' },
      { who: 'Gedanke', text: 'Die Zunge einer Glocke ist ihr Klöppel. Wenn er fällt, kann der Glöckner nicht mehr läuten.' },
    ]);
  }

  ring(): void {
    SFX.bell();
    this.cameras.main.shake(250, 0.006);
    const ring = this.add.circle(this.door.x, this.door.y, 10, 0, 0).setStrokeStyle(3, 0xe0ad4a).setDepth(20);
    this.tweens.add({ targets: ring, radius: 900, alpha: 0, duration: 1200, onComplete: () => ring.destroy() });
    if (isModalOpen() || isDialogOpen()) return;
    if (this.time.now - this.lastMove > 350) {
      this.herz++;
      SFX.heart();
      this.cameras.main.flash(200, 120, 0, 0);
      if (this.herz >= 3) { this.collapse(); return; }
      toast(`Dein Herz setzt aus (${this.herz}/3). Bleib in Bewegung, wenn die Glocke schlägt!`, 'bad', 2500);
    } else if (this.herz > 0 && Math.random() < 0.5) {
      this.herz--; toast(`Dein Herz fängt sich (${this.herz}/3).`);
    }
  }

  hurt(frac: number, dir: number): void {
    this.hurtCd = 900;
    SFX.hurt();
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(dir * 180, -180);
    this.climbing = false;
    for (const m of G.party) { const s = stats(m); m.hp = Math.max(1, m.hp - Math.round(s.hp * frac)); }
    this.player.setTint(0xff6a6a); this.time.delayedCall(200, () => this.player.clearTint());
    updateHud();
    toast('Eine Knochenkette trifft den Trupp!', 'bad', 1500);
  }

  collapse(): void {
    this.inBattle = true;
    toast('Herzstillstand.', 'bad', 3000);
    SFX.defeat();
    this.cameras.main.fadeOut(1200, 30, 0, 0);
    this.time.delayedCall(1300, () => {
      for (const m of G.party) m.hp = 0;
      showFee(() => {
        this.herz = 0; this.inBattle = false;
        this.player.setPosition(5 * 16, (H - 3) * 16);
        this.cameras.main.fadeIn(600);
      }, () => { hideHud(); this.scene.start('World'); });
    });
  }

  entered = false;
  bossDoor(): void {
    if (this.entered || this.inBattle) return;
    this.entered = true;
    dialog([
      { who: 'Glockenstube', text: 'Kopfüber an einer Knochenkette hängt ein dürrer, grauer Riese. Statt eines Kopfes trägt er eine Bronzeglocke – und ihr Klöppel ist ein toter Abenteurer.' },
      { who: 'Glöckner', text: '…ICH… LÄUTE… FÜR ALLE… DIE WARTEN…' },
    ], () => {
      this.inBattle = true;
      SFX.encounter();
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(300, () => {
        this.scene.pause();
        this.scene.launch('Battle', { enemies: ['gloeckner'], bg: 'tower', caller: 'Tower', canFlee: false });
      });
    });
  }

  afterBattle(r: { result: string }): void {
    showHud('Nordtor-Turm');
    if (r.result === 'win') {
      onDungeonSolved(this.id);
      G.party.forEach((m) => { if (m.hp <= 0) m.hp = 1; });
      save();
      dialog([{ who: 'Glockenstube', text: 'Die Glocke schweigt. Zum ersten Mal seit Jahren ist es still im Turm. Durch einen Riss in der Wand fällt Tageslicht – der Ausgang.' }], () => {
        this.cameras.main.fadeOut(700);
        this.time.delayedCall(750, () => { hideHud(); this.scene.start('World'); toast('Der Nordtor-Dungeon ist gelöst! Meldet euch bei der Gilde.', 'big', 5000); });
      });
    } else {
      this.entered = false;
      showFee(() => { this.inBattle = false; this.herz = 0; this.player.setPosition(this.checkpoint.x, this.checkpoint.y); this.cameras.main.fadeIn(400); }, () => { hideHud(); this.scene.start('World'); });
    }
  }
}

import Phaser from 'phaser';
import { G, save, addItem, mulberry32 } from '../core/state';
import { buildWorld, WorldMap, MW, MH } from '../core/worldmap';
import { T, isSolid, TILE_COUNT } from '../gfx/tiles';
import { ensureChar } from '../gfx/tex';
import { showHud, updateHud, hideHud } from '../ui/hud';
import { openMenu } from '../ui/menu';
import { openService } from '../ui/services';
import { dialog, toast, isModalOpen, isDialogOpen, openModal, h, btn, closeAllModals } from '../ui/dom';
import { showFee } from '../ui/fee';
import { advanceTime, setFreeSpots, WorldEvent } from '../core/game';
import { SFX } from '../core/sfx';
import { setEsc } from '../core/input';
import type { Appearance } from '../data/types';
import { RACES } from '../data/races';
import { MONSTERS } from '../data/monsters';

interface Roamer { spr: Phaser.Physics.Arcade.Sprite; kind: string; home: Phaser.Math.Vector2; t: number; dir: Phaser.Math.Vector2; }
interface Npc { spr: Phaser.Physics.Arcade.Sprite; key: string; lines: string[]; who: string; still?: boolean; t: number; dir: Phaser.Math.Vector2; }

const NPC_LINES = [
  ['Fischerin', 'Seit Wochen gluckert es unter dem Marktplatz. Die Kanalarbeiter gehen nicht mehr runter.'],
  ['Alter Söldner', 'Ich war mal Rang B. Silberplakette. Jetzt hab ich nur noch ein Knie. Kauf Proviant, bevor du in ein Loch steigst – drin gibt\'s nichts.'],
  ['Wäscherin', 'Die Gilde nimmt zehn vom Hundert. Die Kirche nimmt, was übrig ist. Und das Konsortium nimmt zwei vom Hundert beim Wechseln. Bleibt dir ein Lied.'],
  ['Junge', 'Mein Bruder ist in den Weißen Hang gegangen. Er hat gesagt, er kommt als Sieger raus. Einbahnstraße, sagt man.'],
  ['Krämerin', 'Ein Aschhund vergisst nie. Wenn sie deine Fährte haben, lauf nicht weg. Kämpf.'],
  ['Bettler', 'Psst. Hinter dem Waisenhaus, die Rostige Münze. Billige Klingen. Verfluchte Klingen. Wer fragt schon.'],
  ['Pilger', 'Aurelion schenkt uns die Magie, sagt die Kirche. Licht ist seine reinste Form, Schatten der Abfall von ihm.'],
  ['Händler aus Veyrath', 'In Goldwacht steht der größte Sklavenmarkt des Kontinents. Ich hasse es, dort Geschäfte zu machen. Aber ich mache sie.'],
];

export class WorldScene extends Phaser.Scene {
  wm!: WorldMap;
  tiles!: number[][];
  layer!: Phaser.Tilemaps.TilemapLayer;
  player!: Phaser.Physics.Arcade.Sprite;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  facing = 'down';
  roamers: Roamer[] = [];
  npcs: Npc[] = [];
  herbs: { id: string; spr: Phaser.GameObjects.Image }[] = [];
  overlay!: Phaser.GameObjects.Rectangle;
  dist = 0;
  inBattle = false;
  locName = '';
  stepT = 0;

  constructor() { super('World'); }

  create(): void {
    this.roamers = []; this.npcs = []; this.herbs = []; this.inBattle = false;
    this.wm = buildWorld();
    setFreeSpots(this.wm.freeSpots);
    this.tiles = this.wm.tiles.map((r) => [...r]);
    for (const d of Object.values(G.dungeons)) if (d.generated) this.tiles[d.y][d.x] = d.solved ? T.GRASS2 : T.ENTRANCE;
    const map = this.make.tilemap({ data: this.tiles, tileWidth: 16, tileHeight: 16 });
    const ts = map.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!;
    this.layer = map.createLayer(0, ts, 0, 0)!;
    const solid: number[] = []; for (let i = 0; i < TILE_COUNT; i++) if (isSolid(i)) solid.push(i);
    this.layer.setCollision(solid);

    for (const l of this.wm.labels) {
      this.add.text(l.x * 16, l.y * 16, l.text, { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '5px', color: '#f0e2c0', stroke: '#000', strokeThickness: 1.5 }).setOrigin(0.5).setResolution(6).setDepth(5).setAlpha(0.9);
    }

    ensureChar(this, 'player', G.party[0].app, true);
    this.player = this.physics.add.sprite(G.pos.x, G.pos.y, 'player', 0).setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(10, 7).setOffset(3, 16);
    this.physics.add.collider(this.player, this.layer);
    this.physics.world.setBounds(0, 0, MW * 16, MH * 16);
    this.player.setCollideWorldBounds(true);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MW * 16, MH * 16).startFollow(this.player, true, 0.15, 0.15).setZoom(3).setRoundPixels(true);
    cam.fadeIn(400);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,SHIFT', false) as Record<string, Phaser.Input.Keyboard.Key>;

    this.spawnHerbs();
    this.spawnNpcs();
    this.spawnRoamers();

    this.overlay = this.add.rectangle(0, 0, 960, 540, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.updateLight();
    showHud(this.locationName());
    setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(() => this.toTitle()); });

    this.events.on('battleEnd', (res: { result: string; roamer?: Roamer }) => this.afterBattle(res));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.events.off('battleEnd'); this.events.off(Phaser.Scenes.Events.RESUME); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { showHud(this.locationName()); setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(() => this.toTitle()); }); });

    // Vergessene Gefährten verlassen den Trupp
    for (const m of [...G.party]) if (G.flags['vergessen_' + m.id] && !m.isPlayer) {
      G.party = G.party.filter((p) => p !== m);
      toast(`${m.name} sieht dich fremd an und geht. Die Fee hat ihren Preis genommen.`, 'bad', 5000);
    }
    if (G.flags.pendingEvents) { this.showEvents(JSON.parse(G.flags.pendingEvents as string) as WorldEvent[]); G.flags.pendingEvents = ''; }
  }

  toTitle(): void {
    closeAllModals(); hideHud();
    this.scene.start('Title');
  }

  locationName(): string {
    const x = this.player ? this.player.x / 16 : G.pos.x / 16, y = this.player ? this.player.y / 16 : G.pos.y / 16;
    const t = this.wm.town;
    if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) return 'Krähenfurt';
    if (y < 10 && x > 22 && x < 38) return 'Nordtor-Ruinen';
    if (Math.hypot(x - 58, y - 10) < 6) return 'Der Dornhag';
    if (Math.hypot(x - 11, y - 37) < 4) return 'Fischerhütte am Steg';
    if (Math.hypot((x - 84) / 15, (y - 57) / 11) < 1) return 'Weißer Hang';
    if (x > 46) return 'Moore von Rabenmark';
    if (x < 12) return 'Küste';
    return 'Rabenmark';
  }

  spawnHerbs(): void {
    if (G.day - ((G.flags.herbReset as number) ?? 0) > 12) { G.herbsTaken = []; G.flags.herbReset = Math.floor(G.day); }
    for (const hb of this.wm.herbs) {
      if (G.herbsTaken.includes(hb.id)) continue;
      const spr = this.add.image(hb.x * 16 + 8, hb.y * 16 + 8, 'herb').setDepth(4);
      this.tweens.add({ targets: spr, scaleY: 0.92, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400 });
      this.herbs.push({ id: hb.id, spr });
    }
  }

  randomApp(r: () => number): Appearance {
    const races = ['mensch', 'mensch', 'mensch', 'mensch', 'zwerg', 'tiermensch'] as const;
    const race = races[Math.floor(r() * races.length)];
    const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
    const gender = r() < 0.5 ? 'm' : 'w';
    return {
      gender, race, beast: pick(['wolf', 'fuchs', 'katze', 'baer', 'hase']), skin: pick(RACES[race].skins),
      hair: pick(['#1e1612', '#3b2a1c', '#6a4426', '#a8522a', '#8a8a8a', '#d8b060']), hairStyle: pick(gender === 'w' ? ['lang', 'zopf', 'dutt', 'kurz'] : ['kurz', 'scheitel', 'wuschel', 'glatze']),
      eyes: '#3b3a2a', beard: gender === 'm' ? pick(['keiner', 'stoppel', 'kurz', 'lang']) : 'keiner', build: pick(['schmal', 'normal', 'kraeftig']),
      outfit: pick(gender === 'w' ? ['rock', 'hose', 'rock'] : ['hose', 'hose', 'robe']), cloth: pick(['#6a5a4a', '#4a5a4a', '#5a4a3a', '#7a6a5a', '#4a4a5a', '#6a3a2a']), cloth2: '#3a3028',
    };
  }

  spawnNpcs(): void {
    const r = mulberry32(99);
    const spots: [number, number][] = [[27, 28], [32, 30], [24, 31], [35, 32], [29, 36], [22, 25], [37, 25], [30, 21]];
    NPC_LINES.forEach(([who, line], i) => {
      const key = 'npc' + i;
      ensureChar(this, key, this.randomApp(r));
      const [x, y] = spots[i % spots.length];
      const spr = this.physics.add.sprite(x * 16 + 8, y * 16 + 8, key, 0).setDepth(9);
      (spr.body as Phaser.Physics.Arcade.Body).setSize(10, 7).setOffset(3, 16);
      this.physics.add.collider(spr, this.layer);
      this.npcs.push({ spr, key, who, lines: [line], t: 0, dir: new Phaser.Math.Vector2() });
    });
    // Torwache am Osttor
    const gk = 'npc_guard';
    ensureChar(this, gk, { gender: 'm', race: 'mensch', beast: 'wolf', skin: '#d29a6e', hair: '#3b2a1c', hairStyle: 'kurz', eyes: '#333', beard: 'kurz', build: 'kraeftig', outfit: 'hose', cloth: '#6c6f78', cloth2: '#3a3d44' });
    const gs = this.physics.add.sprite(43 * 16 + 8, 30 * 16 + 8, gk, 0).setDepth(9).setImmovable(true);
    const race = RACES[G.party[0].app.race];
    const guardLine = race.markup >= 0.3
      ? `Spitze Ohren… Hör zu, ${G.party[0].name}: Hinter dem Moor beginnt Eschenwacht. Dort jagen sie deinesgleichen für Kopfgeld. Ich hab dich nicht gesehen.`
      : race.markup > 0 ? 'Hast du Papiere? Freie Tiermenschen brauchen hier eine Freikaufurkunde. …Na gut, geh schon.'
        : 'Osttor. Dahinter die Moore. Aschhunde jagen dort in Rudeln – und die Gilde zahlt für jeden.';
    this.npcs.push({ spr: gs, key: gk, who: 'Torwache', lines: [guardLine], still: true, t: 0, dir: new Phaser.Math.Vector2() });
  }

  spawnRoamers(): void {
    const broken = Object.values(G.dungeons).filter((d) => d.broken && !d.solved).length;
    const n = 6 + broken * 3;
    for (let i = 0; i < n; i++) this.spawnRoamer('aschhund');
    if (G.blutmond > 0) for (let i = 0; i < 4; i++) this.spawnRoamer('blutgaenger');
    if (broken) for (let i = 0; i < broken * 2; i++) this.spawnRoamer('hohlmann');
    // Inquisitoren jagen Träger des Dornen-Tattoos
    if (G.party[0].tattoo) for (let i = 0; i < 2; i++) this.spawnRoamer('inquisitor');
  }

  spawnRoamer(kind: string): void {
    const spots = this.wm.freeSpots;
    for (let tries = 0; tries < 30; tries++) {
      const [x, y] = spots[Math.floor(Math.random() * spots.length)];
      const px = x * 16 + 8, py = y * 16 + 8;
      if (this.player && Phaser.Math.Distance.Between(px, py, this.player.x, this.player.y) < 220) continue;
      const spr = this.physics.add.sprite(px, py, MONSTERS[kind].sprite).setDepth(8);
      if (kind !== 'aschhund') spr.setScale(0.75);
      (spr.body as Phaser.Physics.Arcade.Body).setSize(12, 8);
      this.physics.add.collider(spr, this.layer);
      this.roamers.push({ spr, kind, home: new Phaser.Math.Vector2(px, py), t: 0, dir: new Phaser.Math.Vector2() });
      return;
    }
  }

  updateLight(): void {
    const f = G.day % 1;
    let a = 0;
    if (f > 0.7) a = Math.min(0.5, (f - 0.7) * 2.5);
    else if (f < 0.2) a = Math.max(0, 0.5 - f * 2.5);
    if (G.blutmond > 0) { this.overlay.setFillStyle(0x5a0808, Math.max(0.18, a)); }
    else this.overlay.setFillStyle(0x0a1030, a);
  }

  showEvents(ev: WorldEvent[]): void {
    ev.forEach((e, i) => this.time.delayedCall(i * 700, () => toast(e.text, e.kind, 5000)));
    if (ev.some((e) => e.text.startsWith('BLUTMOND') || e.text.startsWith('Der Mond') || e.text.startsWith('AUSBRUCH'))) {
      // Monsterlage neu aufbauen
      for (const r of this.roamers) r.spr.destroy();
      this.roamers = []; this.spawnRoamers();
    }
    this.updateLight();
    updateHud();
  }

  update(_t: number, dt: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
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
    const speed = k.SHIFT.isDown ? 120 : 82;
    const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
    body.setVelocity(v.x, v.y);
    if (vx || vy) {
      this.facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      this.player.anims.play(`player_walk_${this.facing}`, true);
      this.stepT += dt;
      if (this.stepT > 330) { this.stepT = 0; SFX.step(); }
    } else {
      this.player.anims.stop();
      this.player.setFrame(['down', 'left', 'right', 'up'].indexOf(this.facing) * 3);
    }
    // Zeit vergeht beim Reisen
    const moved = (body.velocity.length() * dt) / 1000;
    this.dist += moved;
    if (this.dist > 400) {
      this.dist = 0;
      const ev = advanceTime(0.07);
      G.pos = { x: this.player.x, y: this.player.y };
      if (ev.length) this.showEvents(ev);
      this.updateLight(); updateHud();
    }
    const ln = this.locationName();
    if (ln !== this.locName) { this.locName = ln; showHud(ln); }

    if (!blocked && (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER))) this.interact();

    // Kräuter einsammeln
    for (const hb of this.herbs) {
      if (!hb.spr.active) continue;
      if (Phaser.Math.Distance.Between(hb.spr.x, hb.spr.y, this.player.x, this.player.y + 6) < 10) {
        hb.spr.destroy(); G.herbsTaken.push(hb.id); addItem('moorkraut'); SFX.coin(); toast(`Moorkraut gesammelt (${G.inv.moorkraut}).`);
      }
    }
    this.updateNpcs(dt, blocked);
    this.updateRoamers(dt, blocked);
  }

  updateNpcs(dt: number, blocked: boolean): void {
    for (const n of this.npcs) {
      const b = n.spr.body as Phaser.Physics.Arcade.Body;
      if (n.still || blocked) { b.setVelocity(0); n.spr.anims.stop(); continue; }
      n.t -= dt;
      if (n.t <= 0) {
        n.t = 1200 + Math.random() * 2200;
        n.dir = Math.random() < 0.45 ? new Phaser.Math.Vector2() : new Phaser.Math.Vector2(Phaser.Math.Between(-1, 1), Phaser.Math.Between(-1, 1)).normalize();
      }
      const t = this.wm.town;
      if (n.spr.x < (t.x0 + 2) * 16 || n.spr.x > (t.x1 - 2) * 16) n.dir.x = n.spr.x < (t.x0 + 2) * 16 ? 1 : -1;
      if (n.spr.y < (t.y0 + 2) * 16 || n.spr.y > (t.y1 - 2) * 16) n.dir.y = n.spr.y < (t.y0 + 2) * 16 ? 1 : -1;
      b.setVelocity(n.dir.x * 28, n.dir.y * 28);
      if (n.dir.lengthSq() > 0) {
        const f = Math.abs(n.dir.x) > Math.abs(n.dir.y) ? (n.dir.x < 0 ? 'left' : 'right') : n.dir.y < 0 ? 'up' : 'down';
        n.spr.anims.play(`${n.key}_walk_${f}`, true);
      } else n.spr.anims.stop();
    }
  }

  updateRoamers(dt: number, blocked: boolean): void {
    for (const r of this.roamers) {
      const b = r.spr.body as Phaser.Physics.Arcade.Body;
      if (!r.spr.active) continue;
      if (blocked) { b.setVelocity(0); continue; }
      const d = Phaser.Math.Distance.Between(r.spr.x, r.spr.y, this.player.x, this.player.y + 6);
      const fast = r.kind === 'aschhund' ? 64 : r.kind === 'blutgaenger' || r.kind === 'inquisitor' ? 50 : 30;
      if (d < 100) {
        const dir = new Phaser.Math.Vector2(this.player.x - r.spr.x, this.player.y - r.spr.y).normalize();
        b.setVelocity(dir.x * fast, dir.y * fast);
      } else {
        r.t -= dt;
        if (r.t <= 0) { r.t = 1000 + Math.random() * 2000; r.dir = new Phaser.Math.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(); if (Math.random() < 0.3) r.dir.set(0, 0); }
        if (Phaser.Math.Distance.Between(r.spr.x, r.spr.y, r.home.x, r.home.y) > 90) r.dir = new Phaser.Math.Vector2(r.home.x - r.spr.x, r.home.y - r.spr.y).normalize();
        b.setVelocity(r.dir.x * fast * 0.4, r.dir.y * fast * 0.4);
      }
      if (b.velocity.x !== 0) r.spr.setFlipX(b.velocity.x > 0);
      r.spr.setAngle(b.velocity.lengthSq() > 4 ? Math.sin(this.time.now / 70 + r.home.x) * 7 : 0);
      if (d < 13) { this.startEncounter(r); break; }
    }
  }

  startEncounter(r: Roamer): void {
    this.inBattle = true;
    SFX.encounter();
    const enemies: string[] = [];
    if (r.kind === 'aschhund') { const n = G.party.length >= 2 || G.party[0].level >= 3 ? 2 + (Math.random() < 0.4 ? 1 : 0) : 1 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) enemies.push('aschhund'); }
    else if (r.kind === 'blutgaenger') { enemies.push('blutgaenger'); if (Math.random() < 0.5) enemies.push('blutgaenger'); }
    else if (r.kind === 'inquisitor') { enemies.push('inquisitor'); if (Math.random() < 0.4) enemies.push('inquisitor'); }
    else { enemies.push(r.kind); if (Math.random() < 0.4) enemies.push('aschhund'); }
    this.cameras.main.flash(250, 255, 255, 255);
    this.cameras.main.zoomTo(4.2, 350);
    this.time.delayedCall(380, () => {
      G.pos = { x: this.player.x, y: this.player.y };
      this.scene.pause();
      this.scene.launch('Battle', { enemies, bg: G.blutmond > 0 ? 'blut' : 'moor', caller: 'World', roamer: r, canFlee: true });
    });
  }

  afterBattle(res: { result: string; roamer?: Roamer }): void {
    this.cameras.main.setZoom(3);
    this.inBattle = false;
    showHud(this.locationName());
    if (res.result === 'win') {
      if (res.roamer) { res.roamer.spr.destroy(); this.roamers = this.roamers.filter((x) => x !== res.roamer); }
      this.time.delayedCall(30000, () => { if (this.scene.isActive()) this.spawnRoamer(Math.random() < 0.8 ? 'aschhund' : 'hohlmann'); });
    } else if (res.result === 'flee') {
      // kurz unverwundbar: Monster zurückstoßen
      if (res.roamer) { res.roamer.spr.setPosition(res.roamer.home.x, res.roamer.home.y); }
    } else if (res.result === 'lose') {
      this.fee(() => {
        const door = [...this.wm.doors.entries()].find(([, v]) => v.service === 'kirche')!;
        const [dx, dy] = door[0].split(',').map(Number);
        this.player.setPosition(dx * 16 + 8, (dy + 2) * 16 + 8);
        if (res.roamer) { res.roamer.spr.destroy(); this.roamers = this.roamers.filter((x) => x !== res.roamer); }
      });
    }
    updateHud();
  }

  fee(onRevive: () => void): void {
    showFee(onRevive, () => this.scene.start('World'));
  }

  facingTile(): [number, number] {
    const fx = this.player.x, fy = this.player.y + 8;
    const d = { down: [0, 12], up: [0, -14], left: [-12, 0], right: [12, 0] }[this.facing as 'down']!;
    return [Math.floor((fx + d[0]) / 16), Math.floor((fy + d[1]) / 16)];
  }

  interact(): void {
    // NPCs
    for (const n of this.npcs) {
      if (Phaser.Math.Distance.Between(n.spr.x, n.spr.y, this.player.x, this.player.y) < 22) {
        (n.spr.body as Phaser.Physics.Arcade.Body).setVelocity(0);
        dialog(n.lines.map((l) => ({ who: n.who, text: l })));
        return;
      }
    }
    const [tx, ty] = this.facingTile();
    const key = `${tx},${ty}`;
    const tile = this.tiles[ty]?.[tx];
    const door = this.wm.doors.get(key);
    if (door) { G.pos = { x: this.player.x, y: this.player.y }; openService(door.service, { onEvents: (ev) => this.showEvents(ev) }); return; }
    const sign = this.wm.signs.get(key);
    if (sign) { dialog([{ who: 'Schild', text: sign }]); return; }
    if (tile === T.WELL) { dialog([{ who: 'Brunnen', text: 'Das Wasser riecht nach Kanal. Unten glänzt etwas – eine eiserne Plakette? Zu tief.' }]); return; }
    if (tile === T.STALL) { dialog([{ who: 'Marktstand', text: 'Rüben, Moorkraut, geräucherter Aal. Der Händler starrt auf das Gitter vor seinem Stand.' }]); return; }
    if (tile === T.ENTRANCE || tile === T.GRATE || tile === T.THORN_GATE || tile === T.HUT) {
      const d = Object.values(G.dungeons).find((x) => x.x === tx && x.y === ty);
      if (d) this.askDungeon(d.id);
    }
  }

  askDungeon(id: string): void {
    const d = G.dungeons[id];
    if (d.solved) { dialog([{ who: d.name, text: 'Der Dungeon ist gelöst. Nur noch kalter Stein – die Schwelle ist erloschen.' }]); return; }
    const blut = G.blutmond > 0;
    const body = h('div', {},
      h('p', {}, `Typ: ${blut && d.type !== 'Erinnerung' ? 'Blut-Dungeon (Blutmond!)' : d.revealed ? d.type + ' (Rang ' + d.rank + ')' : (d.shownType ?? d.type)} · Rang von außen: ${d.shownRank} · Frist: ${d.broken ? 'abgelaufen – AUSGEBROCHEN' : d.frist + ' Tage'}`),
      h('p', { class: 'blood' }, 'Die Einweg-Schwelle: Sobald ihr eintretet, verschwindet der Ausgang. Ihr kommt nur durch Sieg wieder heraus – oder gar nicht.'),
      h('p', {}, `Proviant: ${G.inv.proviant ?? 0} Tagesrationen · Heiltränke: ${G.inv.heiltrank ?? 0} · Trupp: ${G.party.map((m) => m.name).join(', ')}`),
      (G.inv.proviant ?? 0) < 4 ? h('p', { class: 'blood' }, 'Warnung: Zu wenig Proviant. Ohne Vorräte zehrt der Hunger am Trupp.') : null,
      d.id === 'nordtor' && G.advRank === 'D' ? h('p', { class: 'blood' }, 'Die Gilde rät Frischlingen dringend ab: Dieser Turm ist Rang C.') : null,
      blut ? h('p', { class: 'blood' }, 'Blutmond: dreifache Monsterzahl, kaum sichere Schlafräume.') : null);
    openModal(d.name, 'Vor euch gähnt die Schwelle.', body, (close) => [btn('Eintreten', () => {
      close();
      G.pos = { x: this.player.x, y: this.player.y + 10 };
      save();
      SFX.door();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(520, () => { hideHud(); this.scene.start('Dungeon', { id }); });
    }, { cls: 'sel' })]);
  }
}

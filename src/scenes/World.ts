import Phaser from 'phaser';
import { G, save, addItem, mulberry32, stats, itemName } from '../core/state';
import { buildWorld, WorldMap, MW, MH, Exit } from '../core/worldmap';
import { buildRegionMap } from '../core/regionmaps';
import { REGIONS, RegionId } from '../data/regions';
import { EVENTS, EventDef, ActiveEvent, EventHost, lebensaufgabeCheck, lebensaufgabeProgress } from '../core/events';
import { RANK_ORDER } from '../data/world';
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

interface Roamer { spr: Phaser.Physics.Arcade.Sprite; kind: string; home: Phaser.Math.Vector2; t: number; dir: Phaser.Math.Vector2; human?: string }
interface Npc { spr: Phaser.Physics.Arcade.Sprite; key: string; lines: string[]; who: string; still?: boolean; t: number; dir: Phaser.Math.Vector2; town?: { x0: number; y0: number; x1: number; y1: number } }

const FULL_APP: Appearance = { gender: 'm', race: 'mensch', beast: 'wolf', skin: '#d29a6e', hair: '#3b2a1c', hairStyle: 'kurz', eyes: '#2a2a3a', beard: 'keiner', build: 'normal', outfit: 'hose', cloth: '#5a4a3a', cloth2: '#2a2420' };
const DIRNAMES = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];

const RABENMARK_NPCS: [string, string][] = [
  ['Fischerin', 'Seit Wochen gluckert es unter dem Marktplatz. Die Kanalarbeiter gehen nicht mehr runter.'],
  ['Alter Söldner', 'Ich war mal Rang B. Silberplakette. Jetzt hab ich nur noch ein Knie. Kauf Proviant, bevor du in ein Loch steigst – drin gibt’s nichts.'],
  ['Wäscherin', 'Die Gilde nimmt zehn vom Hundert. Die Kirche nimmt, was übrig ist. Und das Konsortium nimmt zwei vom Hundert beim Wechseln. Bleibt dir ein Lied.'],
  ['Junge', 'Mein Bruder ist in den Weißen Hang gegangen. Er hat gesagt, er kommt als Sieger raus. Einbahnstraße, sagt man.'],
  ['Krämerin', 'Ein Aschhund vergisst nie. Wenn sie deine Fährte haben, lauf nicht weg. Kämpf.'],
  ['Bettler', 'Psst. Hinter dem Waisenhaus, die Rostige Münze. Billige Klingen. Verfluchte Klingen. Wer fragt schon. Die echte Münze sitzt aber in Schlackenhafen – nimm die Fähre am Steg.'],
  ['Pilger', 'Ich bin auf dem Weg nach Lumenhall in Aurelsfeste. Die Oststraße führt durch die Moore dorthin.'],
  ['Händler aus Veyrath', 'In Goldwacht steht der größte Sklavenmarkt des Kontinents. Die Südstraße bringt dich hin. Ich hasse es, dort Geschäfte zu machen. Aber ich mache sie.'],
];

export class WorldScene extends Phaser.Scene implements EventHost {
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
  region: RegionId = 'rabenmark';
  active: ActiveEvent[] = [];
  pendingWin: (() => void) | null = null;
  exitLock: Exit | null = null;
  hintT = 0;
  lastHint = '';
  arrived = false;
  darkness?: Phaser.GameObjects.Image;

  constructor() { super('World'); }

  init(data: { arrived?: boolean }): void { this.arrived = !!data?.arrived; }

  create(): void {
    this.roamers = []; this.npcs = []; this.herbs = []; this.inBattle = false; this.active = []; this.pendingWin = null; this.lastHint = ''; this.darkness = undefined;
    this.region = (G.region ?? 'rabenmark') as RegionId;
    this.wm = this.region === 'rabenmark' ? buildWorld() : buildRegionMap(this.region)!;
    setFreeSpots(this.wm.freeSpots);
    this.tiles = this.wm.tiles.map((r) => [...r]);
    for (const d of Object.values(G.dungeons)) if (d.generated && (d.region ?? 'rabenmark') === this.region && !d.solved) this.tiles[d.y][d.x] = d.theme === 'thorn' ? T.THORN_GATE : T.ENTRANCE;
    const map = this.make.tilemap({ data: this.tiles, tileWidth: 16, tileHeight: 16 });
    const ts = map.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!;
    this.layer = map.createLayer(0, ts, 0, 0)!;
    const solid: number[] = []; for (let i = 0; i < TILE_COUNT; i++) if (isSolid(i)) solid.push(i);
    this.layer.setCollision(solid);

    for (const l of this.wm.labels) {
      this.add.text(l.x * 16, l.y * 16, l.text, { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '5px', color: '#f0e2c0', stroke: '#000', strokeThickness: 1.5 }).setOrigin(0.5).setResolution(6).setDepth(5).setAlpha(0.9);
    }

    // Spieler – falls die gespeicherte Position blockiert ist, an den Ankunftspunkt
    let [px, py] = [G.pos.x, G.pos.y];
    if (isSolid(this.tiles[Math.floor((py + 8) / 16)]?.[Math.floor(px / 16)] ?? 0) || px < 16 || py < 16 || px > (MW - 1) * 16 || py > (MH - 1) * 16) {
      const sp = Object.values(this.wm.spawns)[0] ?? [MW / 2, MH / 2];
      px = sp[0] * 16 + 8; py = sp[1] * 16 + 8;
    }
    ensureChar(this, 'player', G.party[0].app, true);
    this.player = this.physics.add.sprite(px, py, 'player', 0).setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(10, 7).setOffset(3, 16);
    this.physics.add.collider(this.player, this.layer);
    this.physics.world.setBounds(0, 0, MW * 16, MH * 16);
    this.player.setCollideWorldBounds(true);
    const ptx = Math.floor(px / 16), pty = Math.floor((py + 8) / 16);
    this.exitLock = this.wm.exits.find((e) => ptx >= e.x0 - 3 && ptx <= e.x1 + 3 && pty >= e.y0 - 3 && pty <= e.y1 + 3) ?? null;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MW * 16, MH * 16).startFollow(this.player, true, 0.15, 0.15).setZoom(3).setRoundPixels(true);
    cam.fadeIn(400);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,SHIFT', false) as Record<string, Phaser.Input.Keyboard.Key>;

    this.spawnHerbs();
    this.spawnNpcs();
    this.spawnRoamers();

    if (this.region === 'nachtkluefte') this.darkness = this.add.image(px, py, 'vision').setScale(1.0).setDepth(48).setAlpha(0.9);
    this.overlay = this.add.rectangle(0, 0, 960, 540, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.updateLight();
    showHud(this.locationName());
    setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(() => this.toTitle()); });

    this.events.on('battleEnd', (res: { result: string; roamer?: Roamer }) => this.afterBattle(res));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.events.off('battleEnd'); this.events.off(Phaser.Scenes.Events.RESUME); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { showHud(this.locationName()); this.lastHint = ''; setEsc(() => { if (!isDialogOpen() && !this.inBattle) openMenu(() => this.toTitle()); }); });

    // Vergessene Gefährten verlassen den Trupp
    for (const m of [...G.party]) if (G.flags['vergessen_' + m.id] && !m.isPlayer) {
      G.party = G.party.filter((p) => p !== m);
      toast(`${m.name} sieht dich fremd an und geht. Die Fee hat ihren Preis genommen.`, 'bad', 5000);
    }
    if (G.flags.pendingEvents) { this.showEvents(JSON.parse(G.flags.pendingEvents as string) as WorldEvent[]); G.flags.pendingEvents = ''; }
    this.restoreEvents();
    if (this.arrived) this.onArrival();
  }

  toTitle(): void {
    closeAllModals(); hideHud();
    this.scene.start('Title');
  }

  locationName(): string {
    const x = (this.player ? this.player.x : G.pos.x) / 16, y = (this.player ? this.player.y : G.pos.y) / 16;
    for (const t of this.wm.towns) if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) return t.name;
    let best: { name: string; d: number } | null = null;
    for (const a of this.wm.areas) { const d = Math.hypot(x - a.x, y - a.y) / a.r; if (d < 1 && (!best || d < best.d)) best = { name: a.name, d }; }
    return best ? best.name : REGIONS[this.region].name;
  }

  // ------------------------------------------------------------ Bewohner, Kräuter, Monster
  spawnHerbs(): void {
    if (G.day - ((G.flags.herbReset as number) ?? 0) > 12) { G.herbsTaken = []; G.flags.herbReset = Math.floor(G.day); }
    for (const hb of this.wm.herbs) {
      const id = this.region + ':' + hb.id;
      if (G.herbsTaken.includes(id) || G.herbsTaken.includes(hb.id)) continue;
      const spr = this.add.image(hb.x * 16 + 8, hb.y * 16 + 8, 'herb').setDepth(4);
      this.tweens.add({ targets: spr, scaleY: 0.92, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400 });
      this.herbs.push({ id, spr });
    }
  }

  randomApp(r: () => number): Appearance {
    const pools: Record<string, Appearance['race'][]> = {
      kaldrion: ['mensch', 'zwerg', 'zwerg', 'mensch'], veyrath: ['mensch', 'mensch', 'tiermensch', 'elf'], eschenwacht: ['mensch', 'mensch', 'mensch', 'elf'],
      schlackenhafen: ['mensch', 'tiermensch', 'halbtier', 'mensch'], dornenreich: ['mensch', 'dunkelelf', 'tiermensch'],
    };
    const races = pools[this.region] ?? ['mensch', 'mensch', 'mensch', 'mensch', 'zwerg', 'tiermensch'];
    const race = races[Math.floor(r() * races.length)];
    const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
    const gender = r() < 0.5 ? 'm' : 'w';
    const cloth = this.region === 'aurelsfeste' ? pick(['#d8d0b8', '#8a7a5a', '#3a4a6a']) : this.region === 'kaldrion' ? pick(['#6c6f78', '#5a4a3a', '#3a3d44']) : this.region === 'veyrath' ? pick(['#d8a83a', '#a83a2a', '#e8e0c8']) : this.region === 'dornenreich' ? '#5a1a22' : pick(['#6a5a4a', '#4a5a4a', '#5a4a3a', '#7a6a5a', '#4a4a5a', '#6a3a2a']);
    return {
      gender, race, beast: pick(['wolf', 'fuchs', 'katze', 'baer', 'hase']), skin: pick(RACES[race].skins),
      hair: pick(['#1e1612', '#3b2a1c', '#6a4426', '#a8522a', '#8a8a8a', '#d8b060']), hairStyle: pick(gender === 'w' ? ['lang', 'zopf', 'dutt', 'kurz'] : ['kurz', 'scheitel', 'wuschel', 'glatze']),
      eyes: '#3b3a2a', beard: gender === 'm' ? pick(['keiner', 'stoppel', 'kurz', 'lang']) : 'keiner', build: pick(['schmal', 'normal', 'kraeftig']),
      outfit: this.region === 'aurelsfeste' && r() < 0.5 ? 'robe' : pick(gender === 'w' ? ['rock', 'hose', 'rock'] : ['hose', 'hose', 'robe']), cloth, cloth2: '#3a3028',
    };
  }

  spawnNpcs(): void {
    const r = mulberry32(99 + this.region.length * 7);
    const lines = this.region === 'rabenmark' ? RABENMARK_NPCS : REGIONS[this.region].npcs;
    const town = this.wm.towns[0];
    lines.forEach(([who, line], i) => {
      const key = `npc_${this.region}_${i}`;
      ensureChar(this, key, this.randomApp(r));
      const [x, y] = this.wm.npcSpots[i % Math.max(1, this.wm.npcSpots.length)] ?? [MW / 2, MH / 2];
      const spr = this.physics.add.sprite(x * 16 + 8, y * 16 + 8, key, 0).setDepth(9);
      (spr.body as Phaser.Physics.Arcade.Body).setSize(10, 7).setOffset(3, 16);
      this.physics.add.collider(spr, this.layer);
      this.npcs.push({ spr, key, who, lines: [line], t: 0, dir: new Phaser.Math.Vector2(), town });
    });
    if (this.region !== 'rabenmark') return;
    // Torwache am Osttor von Krähenfurt
    const gk = 'npc_guard';
    ensureChar(this, gk, { gender: 'm', race: 'mensch', beast: 'wolf', skin: '#d29a6e', hair: '#3b2a1c', hairStyle: 'kurz', eyes: '#333', beard: 'kurz', build: 'kraeftig', outfit: 'hose', cloth: '#6c6f78', cloth2: '#3a3d44' });
    const gs = this.physics.add.sprite(43 * 16 + 8, 30 * 16 + 8, gk, 0).setDepth(9).setImmovable(true);
    const race = RACES[G.party[0].app.race];
    const guardLine = race.markup >= 0.3
      ? `Spitze Ohren… Hör zu, ${G.party[0].name}: Hinter Aurelsfeste beginnt Eschenwacht. Dort jagen sie deinesgleichen für Kopfgeld. Ich hab dich nicht gesehen.`
      : race.markup > 0 ? 'Hast du Papiere? Freie Tiermenschen brauchen hier eine Freikaufurkunde. …Na gut, geh schon.'
        : 'Osttor. Dahinter die Moore und die Straße nach Aurelsfeste. Aschhunde jagen dort in Rudeln – und die Gilde zahlt für jeden.';
    this.npcs.push({ spr: gs, key: gk, who: 'Torwache', lines: [guardLine], still: true, t: 0, dir: new Phaser.Math.Vector2() });
  }

  spawnRoamers(): void {
    const reg = REGIONS[this.region];
    const regionBroken = Object.values(G.dungeons).filter((d) => d.broken && !d.solved && (d.region ?? 'rabenmark') === this.region).length;
    const tot = reg.roamers.reduce((a, [, w]) => a + w, 0);
    for (let i = 0; i < reg.roamerCount + regionBroken * 3; i++) {
      let r = Math.random() * tot; let kind = reg.roamers[0]?.[0];
      for (const [k, w] of reg.roamers) { r -= w; if (r <= 0) { kind = k; break; } }
      if (kind) this.spawnRoamer(kind);
    }
    if (G.blutmond > 0 && reg.roamerCount) for (let i = 0; i < 4; i++) this.spawnRoamer('blutgaenger');
    if (regionBroken) for (let i = 0; i < regionBroken * 2; i++) this.spawnRoamer('hohlmann');
    // Inquisitoren jagen Träger des Dornen-Tattoos
    if (G.party[0].tattoo && ['rabenmark', 'aurelsfeste', 'kaldrion'].includes(this.region)) for (let i = 0; i < 2; i++) this.spawnRoamer('inquisitor');
  }

  spawnRoamer(kind: string): void {
    const spots = this.wm.freeSpots;
    if (!spots.length) return;
    const def = MONSTERS[kind];
    for (let tries = 0; tries < 30; tries++) {
      const [x, y] = spots[Math.floor(Math.random() * spots.length)];
      const px = x * 16 + 8, py = y * 16 + 8;
      if (this.player && Phaser.Math.Distance.Between(px, py, this.player.x, this.player.y) < 220) continue;
      let spr: Phaser.Physics.Arcade.Sprite;
      let human: string | undefined;
      if (def.human) {
        human = 'mob_' + kind;
        ensureChar(this, human, { ...FULL_APP, ...def.human.app } as Appearance);
        spr = this.physics.add.sprite(px, py, human, 0).setDepth(8);
        (spr.body as Phaser.Physics.Arcade.Body).setSize(10, 7).setOffset(3, 16);
      } else {
        spr = this.physics.add.sprite(px, py, def.sprite).setDepth(8);
        if (!['aschhund', 'frostwolf', 'zeitmotte'].includes(kind)) spr.setScale(0.75);
        (spr.body as Phaser.Physics.Arcade.Body).setSize(12, 8);
      }
      this.physics.add.collider(spr, this.layer);
      this.roamers.push({ spr, kind, home: new Phaser.Math.Vector2(px, py), t: 0, dir: new Phaser.Math.Vector2(), human });
      return;
    }
  }

  updateLight(): void {
    const reg = REGIONS[this.region];
    if (reg.light === 'grau') { this.overlay.setFillStyle(0x8890a0, 0.22); return; } // Zeit steht still: kein Tag, keine Nacht
    const f = G.day % 1;
    let a = 0;
    if (f > 0.7) a = Math.min(0.5, (f - 0.7) * 2.5);
    else if (f < 0.2) a = Math.max(0, 0.5 - f * 2.5);
    if (G.blutmond > 0) this.overlay.setFillStyle(0x5a0808, Math.max(0.18, a));
    else if (reg.light === 'asche') this.overlay.setFillStyle(0x3a1010, Math.max(0.2, a));
    else if (reg.light === 'dunkel') this.overlay.setFillStyle(0x0a0818, Math.max(0.25, a));
    else this.overlay.setFillStyle(0x0a1030, a);
  }

  showEvents(ev: WorldEvent[]): void {
    ev.forEach((e, i) => this.time.delayedCall(i * 700, () => toast(e.text, e.kind, 5000)));
    if (ev.some((e) => e.text.startsWith('BLUTMOND') || e.text.startsWith('Der Mond') || e.text.startsWith('AUSBRUCH'))) {
      for (const r of this.roamers) r.spr.destroy();
      this.roamers = []; this.spawnRoamers();
    }
    this.updateLight();
    updateHud();
  }

  // ------------------------------------------------------------ Hauptschleife
  update(_t: number, dt: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.darkness) this.darkness.setPosition(this.player.x, this.player.y);
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
    // Zeit vergeht beim Reisen – außer in den Erstarrten Landen
    const moved = (body.velocity.length() * dt) / 1000;
    this.dist += moved;
    if (this.dist > 400) {
      this.dist = 0;
      G.pos = { x: this.player.x, y: this.player.y };
      if (!REGIONS[this.region].timeStill) {
        const ev = advanceTime(0.07);
        if (ev.length) this.showEvents(ev);
        lebensaufgabeCheck(() => this.lebensaufgabeFailed());
      }
      this.maybeSpawnEvent();
      this.updateLight(); updateHud();
    }
    const ln = this.locationName();
    if (ln !== this.locName) { this.locName = ln; showHud(ln); this.lastHint = ''; }

    if (!blocked && (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER))) this.interact();

    // Kräuter einsammeln
    for (const hb of this.herbs) {
      if (!hb.spr.active) continue;
      if (Phaser.Math.Distance.Between(hb.spr.x, hb.spr.y, this.player.x, this.player.y + 6) < 10) {
        hb.spr.destroy(); G.herbsTaken.push(hb.id); const it = REGIONS[this.region].herb; addItem(it); SFX.coin(); toast(`${itemName(it)} gesammelt (${G.inv[it]}).`);
      }
    }
    if (!blocked) { this.checkExits(); this.checkAutoEvents(); }
    this.hintT -= dt;
    if (this.hintT <= 0) { this.hintT = 400; this.updateCompass(); }
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
      const t = n.town;
      if (t) {
        if (n.spr.x < (t.x0 + 2) * 16 || n.spr.x > (t.x1 - 2) * 16) n.dir.x = n.spr.x < (t.x0 + 2) * 16 ? 1 : -1;
        if (n.spr.y < (t.y0 + 2) * 16 || n.spr.y > (t.y1 - 2) * 16) n.dir.y = n.spr.y < (t.y0 + 2) * 16 ? 1 : -1;
      }
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
      const fast = ['aschhund', 'frostwolf', 'zeitmotte', 'schattenlauerer'].includes(r.kind) ? 64 : ['blutgaenger', 'inquisitor', 'bandit', 'sklavenjaeger', 'elfenjaeger'].includes(r.kind) ? 50 : 30;
      if (d < 100) {
        const dir = new Phaser.Math.Vector2(this.player.x - r.spr.x, this.player.y - r.spr.y).normalize();
        b.setVelocity(dir.x * fast, dir.y * fast);
      } else {
        r.t -= dt;
        if (r.t <= 0) { r.t = 1000 + Math.random() * 2000; r.dir = new Phaser.Math.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(); if (Math.random() < 0.3) r.dir.set(0, 0); }
        if (Phaser.Math.Distance.Between(r.spr.x, r.spr.y, r.home.x, r.home.y) > 90) r.dir = new Phaser.Math.Vector2(r.home.x - r.spr.x, r.home.y - r.spr.y).normalize();
        b.setVelocity(r.dir.x * fast * 0.4, r.dir.y * fast * 0.4);
      }
      if (r.human) {
        if (b.velocity.lengthSq() > 4) { const f = Math.abs(b.velocity.x) > Math.abs(b.velocity.y) ? (b.velocity.x < 0 ? 'left' : 'right') : b.velocity.y < 0 ? 'up' : 'down'; r.spr.anims.play(`${r.human}_walk_${f}`, true); }
        else r.spr.anims.stop();
      } else {
        if (b.velocity.x !== 0) r.spr.setFlipX(b.velocity.x > 0);
        r.spr.setAngle(b.velocity.lengthSq() > 4 ? Math.sin(this.time.now / 70 + r.home.x) * 7 : 0);
      }
      if (d < 13) { this.startEncounter(r); break; }
    }
  }

  // ------------------------------------------------------------ Kämpfe
  encounterFor(kind: string): string[] {
    const pack = (k: string, min: number, max: number) => { const n = min + Math.floor(Math.random() * (max - min + 1)); return new Array(n).fill(k); };
    const strong = G.party.length >= 2 || G.party[0].level >= 3;
    switch (kind) {
      case 'aschhund': return pack('aschhund', strong ? 2 : 1, strong ? 3 : 2);
      case 'frostwolf': return pack('frostwolf', 2, 3);
      case 'zeitmotte': return pack('zeitmotte', 3, 5);
      case 'blutgaenger': return pack('blutgaenger', 1, 2);
      case 'inquisitor': return pack('inquisitor', 1, 2);
      case 'bandit': return pack('bandit', 2, 3);
      case 'sklavenjaeger': return ['sklavenjaeger', 'bandit'];
      case 'elfenjaeger': return pack('elfenjaeger', 1, 2);
      case 'duenenskorpion': return pack('duenenskorpion', 1, 2);
      case 'schattenlauerer': return pack('schattenlauerer', 1, 2);
      case 'hohlmann': return Math.random() < 0.4 ? ['hohlmann', 'aschhund'] : ['hohlmann'];
      default: return [kind];
    }
  }

  startEncounter(r: Roamer): void {
    this.launchBattle(this.encounterFor(r.kind), r);
  }

  launchBattle(enemies: string[], roamer?: Roamer, bg?: string): void {
    this.inBattle = true;
    SFX.encounter();
    this.cameras.main.flash(250, 255, 255, 255);
    this.cameras.main.zoomTo(4.2, 350);
    this.time.delayedCall(380, () => {
      G.pos = { x: this.player.x, y: this.player.y };
      this.scene.pause();
      this.scene.launch('Battle', { enemies, bg: bg ?? (G.blutmond > 0 ? 'blut' : REGIONS[this.region].bg), caller: 'World', roamer, canFlee: !this.pendingWin });
    });
  }

  /** EventHost: Kampf aus einem Ereignis */
  battle(enemies: string[], onWin?: () => void, bg?: string): void {
    this.pendingWin = onWin ?? (() => { /* */ });
    this.launchBattle(enemies, undefined, bg);
  }

  afterBattle(res: { result: string; roamer?: Roamer }): void {
    this.cameras.main.setZoom(3);
    this.inBattle = false;
    showHud(this.locationName());
    const win = this.pendingWin; this.pendingWin = null;
    if (res.result === 'win') {
      if (res.roamer) {
        res.roamer.spr.destroy(); this.roamers = this.roamers.filter((x) => x !== res.roamer);
        const reg = REGIONS[this.region];
        this.time.delayedCall(30000, () => { if (this.scene.isActive() && reg.roamers.length) this.spawnRoamer(reg.roamers[Math.floor(Math.random() * reg.roamers.length)][0]); });
      }
      if (win) this.time.delayedCall(200, win);
    } else if (res.result === 'flee') {
      if (res.roamer) res.roamer.spr.setPosition(res.roamer.home.x, res.roamer.home.y);
    } else if (res.result === 'lose') {
      this.defeat(res.roamer);
    }
    updateHud();
  }

  defeat(roamer?: Roamer): void {
    this.fee(() => {
      const door = [...this.wm.doors.entries()].find(([, v]) => v.service === 'kirche') ?? [...this.wm.doors.entries()][0];
      if (door) { const [dx, dy] = door[0].split(',').map(Number); this.player.setPosition(dx * 16 + 8, (dy + 2) * 16 + 8); }
      else { const sp = Object.values(this.wm.spawns)[0]; if (sp) this.player.setPosition(sp[0] * 16 + 8, sp[1] * 16 + 8); }
      if (roamer) { roamer.spr.destroy(); this.roamers = this.roamers.filter((x) => x !== roamer); }
    });
  }

  fee(onRevive: () => void): void {
    showFee(onRevive, () => this.scene.start('World'));
  }

  lebensaufgabeFailed(): void {
    G.party[0].hp = 0;
    updateHud();
    this.defeat();
  }

  // ------------------------------------------------------------ Reisen zwischen den Reichen
  checkExits(): void {
    const tx = Math.floor(this.player.x / 16), ty = Math.floor((this.player.y + 8) / 16);
    const inExit = (e: Exit, pad: number) => tx >= e.x0 - pad && tx <= e.x1 + pad && ty >= e.y0 - pad && ty <= e.y1 + pad;
    if (this.exitLock && !inExit(this.exitLock, 3)) this.exitLock = null;
    for (const e of this.wm.exits) {
      const pad = e.x0 === e.x1 && e.y0 === e.y1 ? 1 : 0;
      if (!inExit(e, pad) || this.exitLock === e) continue;
      this.exitLock = e;
      this.askTravel(e);
      return;
    }
  }

  askTravel(e: Exit): void {
    const to = REGIONS[e.to];
    const days = Math.max(REGIONS[this.region].travelDays, to.travelDays);
    const under = RANK_ORDER.indexOf(G.advRank) < RANK_ORDER.indexOf(to.rank === 'S' ? 'B' : to.rank);
    const body = h('div', {},
      h('p', {}, to.desc),
      h('p', { class: 'dim' }, `Reisezeit: ${days === 0.5 ? 'ein halber Tag' : days === 1 ? 'ein Tag' : days + ' Tage'} · Gefahr: Rang ${to.rank}${G.visited?.includes(e.to) ? '' : ' · noch nie besucht'}`),
      under ? h('p', { class: 'blood' }, `Die Gilde empfiehlt für ${to.name} mindestens Rang ${to.rank === 'S' ? 'B' : to.rank}. Dein Rang: ${G.advRank}.`) : null,
      e.to === 'erstarrt' ? h('p', { class: 'blood' }, 'In den Erstarrten Landen steht die Zeit still. Fristen laufen dort nicht weiter – aber was dort lebt, frisst Augenblicke.') : null);
    openModal(`Reise nach ${to.name}`, e.label, body, (close) => [btn('Aufbrechen', () => { close(); this.travel(e.to, days); }, { cls: 'sel' })]);
  }

  travel(to: RegionId, days: number): void {
    const from = this.region;
    SFX.door();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(520, () => {
      const target = to === 'rabenmark' ? buildWorld() : buildRegionMap(to)!;
      const sp = target.spawns[from] ?? Object.values(target.spawns)[0] ?? [MW / 2, MH / 2];
      G.region = to;
      G.pos = { x: sp[0] * 16 + 8, y: sp[1] * 16 + 8 };
      const first = !(G.visited ?? []).includes(to);
      if (first) G.visited = [...(G.visited ?? []), to];
      const ev = from === 'erstarrt' || to === 'erstarrt' ? [] : advanceTime(days);
      if (ev.length) G.flags.pendingEvents = JSON.stringify(ev);
      G.flags.lastTravel = first ? 'first' : 'again';
      lebensaufgabeProgress('region', to);
      save();
      hideHud();
      this.scene.restart({ arrived: true });
    });
  }

  onArrival(): void {
    const reg = REGIONS[this.region];
    const first = G.flags.lastTravel === 'first';
    G.flags.lastTravel = '';
    toast(reg.name, 'big', 3000);
    if (first) dialog([{ who: reg.name, text: reg.desc }, ...(reg.timeStill ? [{ who: 'Stille', text: 'Kein Wind. Kein Geräusch. Kein Verfall. Ein Grashalm, den du knickst, richtet sich nicht wieder auf – er bleibt einfach so. Die Zeit steht still.' }] : [])]);
    if (Math.random() < 0.4) this.time.delayedCall(800, () => this.maybeSpawnEvent(true));
  }

  // ------------------------------------------------------------ Ereignisse
  eligibleEvents(): EventDef[] {
    const night = ((G.day % 1) > 0.72 || (G.day % 1) < 0.18);
    return EVENTS.filter((e) => e.weight > 0
      && (e.regions === 'all' ? REGIONS[this.region].roamerCount > 0 || this.region === 'dornenreich' : e.regions.includes(this.region))
      && (!e.night || night)
      && !(e.once && G.flags['ev_once_' + e.id])
      && !(e.cooldown && G.day - ((G.flags['ev_last_' + e.id] as number) ?? -999) < e.cooldown)
      && !this.active.some((a) => a.def.id === e.id)
      && (!e.cond || e.cond()));
  }

  maybeSpawnEvent(force = false): void {
    if (this.active.length >= 2) return;
    if (!force && Math.random() > 0.11) return;
    const pool = this.eligibleEvents();
    if (!pool.length) return;
    const tot = pool.reduce((a, e) => a + e.weight, 0);
    let r = Math.random() * tot;
    for (const e of pool) { r -= e.weight; if (r <= 0) { this.placeEvent(e); return; } }
  }

  spawnEventById(id: string): void {
    const def = EVENTS.find((e) => e.id === id);
    if (def) this.placeEvent(def);
  }

  placeEvent(def: EventDef, at?: { x: number; y: number }, expires?: number): void {
    let pos = at;
    if (!pos) {
      const px = this.player.x / 16, py = this.player.y / 16;
      const cands = this.wm.freeSpots.filter(([x, y]) => { const d = Math.hypot(x - px, y - py); return d > 7 && d < 18 && !isSolid(this.tiles[y][x + 1] ?? 0); });
      if (!cands.length) return;
      const [x, y] = cands[Math.floor(Math.random() * cands.length)];
      pos = { x: x * 16 + 8, y: y * 16 + 8 };
    }
    const extra: Phaser.GameObjects.GameObject[] = [];
    let spr: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    if (def.look.app) {
      const key = 'ev_' + def.id;
      ensureChar(this, key, { ...FULL_APP, ...def.look.app } as Appearance);
      spr = this.add.sprite(pos.x, pos.y, key, 0).setDepth(9);
      const n = def.look.group ?? 0;
      for (let i = 0; i < n; i++) extra.push(this.add.sprite(pos.x + (i % 2 ? 14 : -14), pos.y + 6 + i * 2, key, i % 2 ? 3 : 6).setDepth(9));
      if (def.look.texture) extra.push(this.add.image(pos.x + 22, pos.y + 2, def.look.texture).setDepth(8));
    } else {
      spr = this.add.image(pos.x, pos.y, def.look.texture ?? 'chest').setDepth(9);
      if (def.look.texture === 'ev_licht') { spr.setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: spr, alpha: { from: 0.4, to: 1 }, y: pos.y - 4, yoyo: true, repeat: -1, duration: 700 }); }
      if (def.look.texture === 'ev_schmetterling') this.tweens.add({ targets: spr, y: pos.y - 5, yoyo: true, repeat: -1, duration: 500 });
    }
    if (def.id === 'feldschmiede') { const g = this.add.image(pos.x, pos.y, 'glow').setScale(2.4).setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setDepth(8); this.tweens.add({ targets: g, alpha: { from: 0.4, to: 0.8 }, yoyo: true, repeat: -1, duration: 200 }); extra.push(g); }
    const bubble = this.add.text(pos.x, pos.y - 18, '!', { fontFamily: '"Pixelify Sans", sans-serif', fontSize: '10px', color: '#f0c35a', stroke: '#0a0b12', strokeThickness: 2 }).setOrigin(0.5).setResolution(6).setDepth(45);
    this.tweens.add({ targets: bubble, y: pos.y - 21, yoyo: true, repeat: -1, duration: 400 });
    const ev: ActiveEvent = { def, x: pos.x, y: pos.y, spr, extra, bubble, expires: expires ?? G.day + 1.5 };
    this.active.push(ev);
    G.flags['ev_last_' + def.id] = Math.floor(G.day);
    this.saveEvents();
    if (!at) toast(`${def.name} – ${this.dirTo(pos.x, pos.y)}.`, '', 3200);
  }

  removeEvent(ev: ActiveEvent): void {
    ev.spr.destroy(); ev.bubble.destroy(); for (const o of ev.extra) o.destroy();
    this.active = this.active.filter((a) => a !== ev);
    if (ev.def.once) G.flags['ev_once_' + ev.def.id] = true;
    this.saveEvents();
    this.lastHint = '';
    updateHud();
  }

  saveEvents(): void {
    G.flags['events_' + this.region] = JSON.stringify(this.active.map((a) => ({ id: a.def.id, x: a.x, y: a.y, expires: a.expires })));
  }
  restoreEvents(): void {
    const raw = G.flags['events_' + this.region];
    if (typeof raw !== 'string' || !raw) return;
    for (const e of JSON.parse(raw) as { id: string; x: number; y: number; expires: number }[]) {
      const def = EVENTS.find((d) => d.id === e.id);
      if (def && e.expires > G.day) this.placeEvent(def, { x: e.x, y: e.y }, e.expires);
    }
  }

  checkAutoEvents(): void {
    for (const ev of [...this.active]) {
      if (ev.expires < G.day) { this.removeEvent(ev); continue; }
      if (ev.def.auto && !ev.triggered && Phaser.Math.Distance.Between(ev.x, ev.y, this.player.x, this.player.y) < 30) {
        ev.triggered = true;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
        ev.def.run(ev, this);
        return;
      }
    }
  }

  dirTo(x: number, y: number): string {
    const dx = x - this.player.x, dy = y - this.player.y;
    if (Math.hypot(dx, dy) < 48) return 'direkt hier';
    const a = Math.atan2(dy, dx);
    const i = (Math.round(a / (Math.PI / 4)) + 8) % 8;
    return `im ${DIRNAMES[i]}`;
  }

  updateCompass(): void {
    let txt = 'E: Interagieren · Esc: Menü';
    if (this.active.length) {
      const ev = [...this.active].sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, this.player.x, this.player.y) - Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y))[0];
      txt = `! ${ev.def.name} – ${this.dirTo(ev.x, ev.y)} · ${txt}`;
    }
    const la = G.flags.lebensaufgabe;
    if (typeof la === 'string' && la) { const l = JSON.parse(la) as { have: number; need: number; deadline: number }; txt = `Lebensaufgabe ${l.have}/${l.need}, noch ${Math.max(0, l.deadline - Math.floor(G.day))} Tage · ` + txt; }
    if (txt !== this.lastHint) { this.lastHint = txt; showHud(this.locationName(), txt); }
  }

  // ------------------------------------------------------------ Interaktion
  facingTile(): [number, number] {
    const fx = this.player.x, fy = this.player.y + 8;
    const d = { down: [0, 12], up: [0, -14], left: [-12, 0], right: [12, 0] }[this.facing as 'down']!;
    return [Math.floor((fx + d[0]) / 16), Math.floor((fy + d[1]) / 16)];
  }

  interact(): void {
    for (const ev of this.active) {
      if (Phaser.Math.Distance.Between(ev.x, ev.y, this.player.x, this.player.y) < 26) { ev.def.run(ev, this); return; }
    }
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
    if (door) { G.pos = { x: this.player.x, y: this.player.y }; openService(door.service, { onEvents: (ev) => this.showEvents(ev), region: this.region }); return; }
    const sign = this.wm.signs.get(key);
    if (sign) { dialog([{ who: 'Schild', text: sign }]); return; }
    const lore = this.wm.lore.get(key);
    if (lore) { dialog([{ who: REGIONS[this.region].name, text: lore }]); return; }
    if (tile === T.WELL) { dialog([{ who: 'Brunnen', text: 'Das Wasser riecht nach Kanal. Unten glänzt etwas – eine eiserne Plakette? Zu tief.' }]); return; }
    if (tile === T.STALL) { dialog([{ who: 'Marktstand', text: 'Rüben, Moorkraut, geräucherter Aal. Der Händler starrt auf das Gitter vor seinem Stand.' }]); return; }
    if (tile === T.STATUE) { dialog([{ who: 'Statue', text: 'Kalter Stein. Oder kalte Haut. Du willst es nicht genauer wissen.' }]); return; }
    if ([T.ENTRANCE, T.GRATE, T.THORN_GATE, T.HUT, T.MINE].includes(tile as never)) {
      const d = Object.values(G.dungeons).find((x) => x.x === tx && x.y === ty && (x.region ?? 'rabenmark') === this.region);
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

export { stats };

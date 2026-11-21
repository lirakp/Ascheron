// Ereignisse in der Oberwelt: Begegnungen am Wegesrand mit Entscheidungen und Folgen.
import Phaser from 'phaser';
import { G, addItem, money, newUid, giveXp, stats, fullHeal, makeMember, addMember, itemName, log, gearOf, rankAtLeast } from './state';
import type { Appearance, ItemInst, Rank } from '../data/types';
import type { RegionId } from '../data/regions';
import { REGIONS } from '../data/regions';
import { ITEMS, GEAR, gearDefToInst, rollDungeonGear, statLine } from '../data/items';
import { RECRUITS } from '../data/world';
import { RACES } from '../data/races';
import { EL_NAME } from '../data/magic';
import { dialog, toast, openModal, h, btn, DialogLine } from '../ui/dom';
import { slot, ITEM_ICON, gearIcon } from '../gfx/icons';
import { updateHud } from '../ui/hud';
import { SFX } from './sfx';

export interface ActiveEvent { def: EventDef; x: number; y: number; spr: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; extra: Phaser.GameObjects.GameObject[]; bubble: Phaser.GameObjects.Text; expires: number; triggered?: boolean }
export interface EventHost {
  battle(enemies: string[], onWin?: () => void, bg?: string): void;
  removeEvent(ev: ActiveEvent): void;
  spawnEventById(id: string): void;
  defeat(): void;
}
export interface EventDef {
  id: string;
  name: string; // Hinweis im HUD/Toast
  regions: RegionId[] | 'all';
  weight: number;
  once?: boolean;
  cooldown?: number; // Tage
  night?: boolean;
  cond?: () => boolean;
  look: { app?: Partial<Appearance>; texture?: string; group?: number; groupApp?: Partial<Appearance>[] };
  auto?: boolean; // löst beim Näherkommen aus
  run: (ev: ActiveEvent, host: EventHost) => void;
}

const player = () => G.party[0];
const isNight = () => { const f = G.day % 1; return f > 0.72 || f < 0.18; };
function pay(n: number): boolean { if (G.silver < n) { toast('Nicht genug Geld.', 'bad'); return false; } G.silver -= n; SFX.coin(); updateHud(); return true; }
function gain(n: number): void { G.silver += n; SFX.coin(); updateHud(); }
function xpAll(n: number): void { for (const m of G.party) if (m.hp > 0) giveXp(m, n).forEach((t) => toast(t, 'big')); }
const L = (who: string, text: string, opts?: { label: string; fn: () => void }[]): DialogLine => ({ who, text, opts });

export function recruitFree(id: string, why: string): void {
  const rc = RECRUITS.find((r) => r.id === id)!;
  if (G.party.some((m) => m.id === id)) return;
  if (G.party.length >= 3) { dialog([L(rc.name, `„Danke. Ich gehe meinen eigenen Weg – aber ich vergesse das nicht.“ ${why}`)]); G.rep.gilde += 1; return; }
  const m = makeMember(rc.id, rc.name, rc.app, rc.cls, Math.max(rc.level, player().level - 1), [...rc.elements, ...RACES[rc.app.race].native]);
  addMember(m);
  G.flags['frei_' + id] = true;
  toast(`${rc.name} schließt sich dir an – als freie Gefährtin, ohne Lohn.`.replace('Gefährtin', rc.app.gender === 'w' ? 'Gefährtin' : 'Gefährte'), 'big', 4500);
  log(`${rc.name} befreit und in den Trupp aufgenommen.`);
  updateHud();
}

function randomStock(): ({ kind: 'item'; id: string; price: number } | { kind: 'gear'; inst: ItemInst; price: number })[] {
  const out: ({ kind: 'item'; id: string; price: number } | { kind: 'gear'; inst: ItemInst; price: number })[] = [];
  const items = ['heiltrank2', 'manatrank', 'riechsalz', 'stilleglocke', 'kraeuterbund', 'heiltrank'];
  for (let i = 0; i < 3; i++) { const id = items[Math.floor(Math.random() * items.length)]; out.push({ kind: 'item', id, price: Math.round(ITEMS[id].price * 0.8) }); }
  const pool = Object.values(GEAR).filter((g) => g.rank === 'C' || (g.rank === 'B' && rankAtLeast(G.advRank, 'C')));
  for (let i = 0; i < 2; i++) { const d = pool[Math.floor(Math.random() * pool.length)]; out.push({ kind: 'gear', inst: gearDefToInst(d.id, newUid()), price: Math.round(d.price * 0.75) }); }
  return out;
}

function lebensaufgabeText(): string {
  const raw = G.flags.lebensaufgabe; if (typeof raw !== 'string' || !raw) return '';
  const la = JSON.parse(raw) as Lebensaufgabe;
  return la.text;
}
export interface Lebensaufgabe { text: string; kind: 'kill' | 'region' | 'dungeon'; target: string; need: number; have: number; deadline: number; uid: string }

// ---------------------------------------------------------------- Ereignisse
export const EVENTS: EventDef[] = [
  {
    id: 'haendlerin', name: 'Eine fahrende Händlerin', regions: ['rabenmark', 'schlackenhafen', 'aurelsfeste', 'kaldrion', 'veyrath', 'eschenwacht'], weight: 3,
    look: { app: { gender: 'w', hair: '#a8522a', hairStyle: 'dutt', outfit: 'rock', cloth: '#7a5a8a', cloth2: '#3a2a3a' }, texture: 'ev_wagen' },
    run: (ev, host) => {
      const stock = randomStock();
      const body = h('div', { class: 'list' });
      const render = () => {
        body.innerHTML = '';
        for (const s of stock) {
          const name = s.kind === 'item' ? ITEMS[s.id].name : s.inst.name;
          const desc = s.kind === 'item' ? ITEMS[s.id].desc : statLine(s.inst.stats);
          const ic = s.kind === 'item' ? ITEM_ICON[s.id] ?? 'bag' : gearIcon(s.inst.def, s.inst.slot, s.inst.name);
          body.appendChild(h('div', { class: 'item' }, slot(ic), h('span', { class: 'name' }, name), h('span', { class: 'dim', style: 'font-size:12px' }, desc), h('span', { class: 'gold' }, money(s.price)),
            btn('Kaufen', () => { if (!pay(s.price)) return; if (s.kind === 'item') addItem(s.id); else G.gear.push(s.inst); stock.splice(stock.indexOf(s), 1); render(); }, { cls: 'small' })));
        }
        if (!stock.length) body.appendChild(h('div', { class: 'dim' }, 'Ausverkauft. „Bis zur nächsten Straße!“'));
      };
      render();
      openModal('Fahrende Händlerin Mira', '„Von allem etwas, von nichts zu viel – und alles billiger als in der Stadt.“', body);
      void ev; void host;
    },
  },
  {
    id: 'ueberfall', name: 'Gestalten am Wegesrand', regions: ['rabenmark', 'schlackenhafen', 'aurelsfeste', 'kaldrion', 'veyrath', 'eschenwacht'], weight: 3, auto: true,
    look: { app: { gender: 'm', hair: '#3b2a1c', beard: 'stoppel', cloth: '#5a4a3a', build: 'kraeftig' }, group: 2 },
    run: (ev, host) => {
      const toll = Math.max(10, Math.round(G.silver * 0.15));
      const bollwerk = G.party.some((m) => m.cls === 'bollwerk');
      dialog([
        L('Wegelagerer', `„Halt! Wegzoll. ${money(toll)}, und ihr dürft weitergehen. Sonst gehen wir an eure Taschen – und an eure Kehlen.“`, [
          { label: `Zahlen (${money(toll)})`, fn: () => { if (pay(toll)) { toast('Die Wegelagerer verschwinden im Gebüsch.'); host.removeEvent(ev); } } },
          { label: 'Kämpfen', fn: () => host.battle(G.party.length >= 2 ? ['bandit', 'bandit', 'bandit'] : ['bandit', 'bandit'], () => { gain(30 + Math.floor(Math.random() * 50)); toast('Die Wegelagerer hatten Beute dabei.'); host.removeEvent(ev); }) },
          ...(bollwerk ? [{ label: 'Einschüchtern (Bollwerk)', fn: () => { dialog([L('Wegelagerer', 'Sie mustern den Turmschild, dann einander. „…War nur ein Scherz.“ Sie rennen.')]); xpAll(15); host.removeEvent(ev); } }] : []),
        ]),
      ]);
    },
  },
  {
    id: 'verletzter', name: 'Ein verletzter Abenteurer', regions: ['rabenmark', 'schlackenhafen', 'aurelsfeste', 'kaldrion', 'veyrath', 'eschenwacht', 'nachtkluefte'], weight: 2,
    look: { app: { gender: 'm', hair: '#6a4426', cloth: '#6c6f78', cloth2: '#3a3d44' } },
    run: (ev, host) => {
      const has = (G.inv.heiltrank ?? 0) + (G.inv.heiltrank2 ?? 0) > 0;
      dialog([
        L('Verletzter Abenteurer', 'Ein Mann mit Bronzeplakette lehnt an einem Stein, die Hand auf einer tiefen Wunde. „Ein Trank… bitte. Ich kann bezahlen – mit etwas Besserem als Geld.“', [
          ...(has ? [{ label: 'Heiltrank geben', fn: () => {
            if (G.inv.heiltrank) addItem('heiltrank', -1); else addItem('heiltrank2', -1);
            G.rep.gilde += 2; xpAll(20);
            dialog([L('Verletzter Abenteurer', '„Danke. Hör zu: Ich habe unser Lager nicht mehr erreicht. Wir haben dort etwas versteckt. Nimm es – mein Trupp braucht es nicht mehr.“ Er beschreibt dir den Ort.')], () => { host.removeEvent(ev); host.spawnEventById('schatz'); toast('Ein Versteck wurde auf der Karte markiert (siehe Kompass).', 'big', 4000); });
          } }] : []),
          { label: has ? 'Weitergehen' : 'Du hast keinen Trank', fn: () => { G.flags.verletzt_tot = ((G.flags.verletzt_tot as number) ?? 0) + 1; addItem('plakette'); toast('Als du dich umdrehst, ist er still. Du nimmst seine Plakette für die Gilde.', 'bad', 4000); host.removeEvent(ev); } },
        ]),
      ]);
    },
  },
  {
    id: 'schatz', name: 'Ein Versteck', regions: 'all', weight: 0,
    look: { texture: 'chest' },
    run: (ev, host) => {
      const r = Math.random();
      const silver = 40 + Math.floor(Math.random() * 120);
      gain(silver);
      let extra = '';
      if (r < 0.5) { const g = rollDungeonGear(Math.random, REGIONS[(G.region ?? 'rabenmark') as RegionId].rank, newUid()); G.gear.push(g); extra = `, ${g.name} (schlafend)`; }
      else { addItem('heiltrank2', 2); extra = ', 2 Heiltränke'; }
      SFX.victory();
      toast(`Versteck: ${money(silver)}${extra}.`, 'big', 4000);
      host.removeEvent(ev);
    },
  },
  {
    id: 'feldschmiede', name: 'Ein weißglühendes Leuchten', regions: ['rabenmark', 'aurelsfeste', 'kaldrion', 'veyrath', 'eschenwacht', 'erstarrt'], weight: 0.6, cooldown: 20,
    cond: () => !G.flags.lebensaufgabe && !!gearOf(player().equip.weapon),
    look: { app: { gender: 'm', race: 'zwerg', skin: '#c88a5a', hair: '#e8e0d8', beard: 'lang', build: 'kraeftig', cloth: '#3a2a20', cloth2: '#1e1612' }, texture: 'ev_schmiede' },
    run: (ev, host) => {
      const w = gearOf(player().equip.weapon)!;
      const target = (() => {
        const opts: Lebensaufgabe[] = [
          { text: 'Töte zehn Frostwölfe in den Pässen von Kaldrion.', kind: 'kill', target: 'frostwolf', need: 10, have: 0, deadline: 0, uid: w.uid },
          { text: 'Betritt die Erstarrten Lande und kehre lebend zurück.', kind: 'region', target: 'erstarrt', need: 1, have: 0, deadline: 0, uid: w.uid },
          { text: 'Töte sechs Elfenjäger in Eschenwacht.', kind: 'kill', target: 'elfenjaeger', need: 6, have: 0, deadline: 0, uid: w.uid },
          { text: 'Löse einen Dungeon – irgendeinen.', kind: 'dungeon', target: '*', need: 1, have: 0, deadline: 0, uid: w.uid },
          { text: 'Töte acht Wegelagerer.', kind: 'kill', target: 'bandit', need: 8, have: 0, deadline: 0, uid: w.uid },
          { text: 'Betritt die Nachtklüfte unter Kaldrion.', kind: 'region', target: 'nachtkluefte', need: 1, have: 0, deadline: 0, uid: w.uid },
        ];
        return opts[Math.floor(Math.random() * opts.length)];
      })();
      const offer = (ranks: 1 | 2) => {
        const mult = ranks === 1 ? 1.5 : 2.1;
        for (const k of Object.keys(w.stats) as (keyof typeof w.stats)[]) w.stats[k] = Math.round((w.stats[k] ?? 0) * mult);
        const order: Rank[] = ['D', 'C', 'B', 'A', 'S', 'SS'];
        w.rank = order[Math.min(5, order.indexOf(w.rank) + ranks)];
        w.name = 'Geschmiedet: ' + w.name.replace(/^Geschmiedet: /, '');
        (w as ItemInst & { schmied?: boolean }).schmied = true;
        target.deadline = Math.floor(G.day) + (ranks === 1 ? 40 : 25);
        G.flags.lebensaufgabe = JSON.stringify(target);
        log(`Der König der Stärke hat ${w.name} aufgewertet.`);
        SFX.bell();
        dialog([
          L('König der Stärke', `Der Hammer fällt einmal. Die Klinge schreit, dann schweigt sie. ${w.name} – Rang ${w.rank}. ${statLine(w.stats)}. Der alte Tribut bleibt, wie er war.`),
          L('König der Stärke', `„Deine Lebensaufgabe: ${target.text} Du hast ${target.deadline - Math.floor(G.day)} Tage. Scheiterst du, tötet dich deine eigene Waffe.“`),
          L('König der Stärke', 'Er lädt die glühende Schmiede auf seinen Rücken, als wäre sie aus Stroh. Dann ist er fort. Irgendwo, weit weg, heult ein Wolf.'),
        ], () => { host.removeEvent(ev); updateHud(); });
      };
      dialog([
        L('???', 'Eine Feldschmiede, weißglühend, mitten auf dem Weg. Ein uralter Zwerg mit Armen wie Eichenstämme hämmert auf nichts. Dann sieht er dich an.'),
        L('König der Stärke', `„${w.name}. Ehrlicher Stahl. Ich mache ihn besser – um einen Rang, um zwei. Ohne Sünde. Der Preis ist eine Aufgabe, die ich dir gebe. Du erfährst sie erst danach.“`, [
          { label: '+1 Rang (40 Tage)', fn: () => offer(1) },
          { label: '+2 Ränge (25 Tage)', fn: () => offer(2) },
          { label: 'Ablehnen', fn: () => { dialog([L('König der Stärke', '„Klug. Oder feige. Das ist oft dasselbe.“ Die Schmiede erlischt.')]); host.removeEvent(ev); } },
        ]),
      ]);
    },
  },
  {
    id: 'sklavenkarawane', name: 'Ein Wagen mit Käfigen', regions: ['rabenmark', 'schlackenhafen', 'veyrath', 'eschenwacht', 'aurelsfeste'], weight: 2, cooldown: 6,
    look: { app: { gender: 'm', hair: '#1e1612', hairStyle: 'glatze', beard: 'kurz', cloth: '#3a2a2a', build: 'kraeftig' }, texture: 'ev_kaefig' },
    run: (ev, host) => {
      const free = RECRUITS.filter((r) => r.where === 'frei' && !G.flags['frei_' + r.id] && !G.party.some((m) => m.id === r.id));
      const captive = free[Math.floor(Math.random() * free.length)];
      const who = captive ? `${captive.name.split(' ')[0]} – ${RACES[captive.app.race].name}` : 'zwei erschöpfte Tiermenschen';
      const ransom = 220;
      dialog([
        L('Sklavenjäger', `Ein Wagen mit Käfigen. Darin ${who}, die Hände an einer Kette. „Ware für Goldwacht. Kaufen oder weitergehen.“`, [
          { label: 'Angreifen und befreien', fn: () => host.battle(['sklavenjaeger', 'sklavenjaeger', 'bandit'], () => {
            G.rep.konsortium -= 3; G.rep.muenze -= 1; xpAll(40); gain(60);
            host.removeEvent(ev);
            if (captive) dialog([L(captive.name, `Du schlägst die Kette auf. ${captive.bio}`)], () => recruitFree(captive.id, ''));
            else toast('Die Befreiten verschwinden in den Wald. Einer dreht sich um und nickt.', 'big');
          }) },
          { label: `Freikaufen (${money(ransom)})`, fn: () => { if (!pay(ransom)) return; host.removeEvent(ev); if (captive) dialog([L(captive.name, `Der Sklavenjäger zählt das Geld zweimal. Dann öffnet er den Käfig. ${captive.bio}`)], () => recruitFree(captive.id, '')); } },
          { label: 'Weitergehen', fn: () => { G.flags.weggesehen = ((G.flags.weggesehen as number) ?? 0) + 1; toast('Du gehst weiter. Die Kette klirrt hinter dir noch lange.', 'bad', 4000); host.removeEvent(ev); } },
        ]),
      ]);
    },
  },
  {
    id: 'moorlichter', name: 'Lichter über dem Moor', regions: ['rabenmark'], weight: 2, night: true,
    look: { texture: 'ev_licht' },
    run: (ev, host) => {
      dialog([L('Moorlichter', 'Blasse Lichter tanzen über dem Wasser, immer ein Stück voraus. Man sagt, sie führen zu Schätzen. Man sagt auch, sie führen ins Moor.', [
        { label: 'Folgen', fn: () => { host.removeEvent(ev); if (Math.random() < 0.55) host.spawnEventById('schatz'); else host.battle(['hohlmann', 'hohlmann'], () => { toast('Die Lichter waren Plaketten. An Toten.'); addItem('plakette', 2); }); } },
        { label: 'Liegen lassen', fn: () => { host.removeEvent(ev); } },
      ])]);
    },
  },
  {
    id: 'bauer', name: 'Hilferufe von einem Hof', regions: ['rabenmark', 'aurelsfeste'], weight: 2, auto: true,
    look: { app: { gender: 'w', hair: '#d8b060', hairStyle: 'dutt', outfit: 'rock', cloth: '#8a7a5a' } },
    run: (ev, host) => {
      dialog([L('Bäuerin', '„Hilfe! Aschhunde – sie reißen unsere Ziegen! Bitte!“', [
        { label: 'Helfen', fn: () => host.battle(['aschhund', 'aschhund', 'aschhund'], () => { addItem('proviant', 6); gain(25); xpAll(20); toast('Die Bäuerin drückt euch Proviant in die Hand: sechs Rationen.', 'big'); host.removeEvent(ev); }) },
        { label: 'Weitergehen', fn: () => host.removeEvent(ev) },
      ])]);
    },
  },
  {
    id: 'pilger', name: 'Ein Pilgerzug', regions: ['aurelsfeste'], weight: 3,
    look: { app: { gender: 'w', hair: '#8a8a8a', hairStyle: 'dutt', outfit: 'robe', cloth: '#d8d0b8', cloth2: '#a08a4a' }, group: 3 },
    run: (ev, host) => {
      dialog([L('Pilgerin', '„Wir sind auf dem Weg nach Lumenhall. Die Straße ist voller Wegelagerer. Begleitet ihr uns ein Stück? Wir haben nicht viel – aber wir beten für euch.“', [
        { label: 'Begleiten', fn: () => host.battle(['bandit', 'bandit'], () => { for (const m of G.party) fullHeal(m); G.rep.kirche += 3; xpAll(30); toast('Die Pilger beten für euch. Der Trupp ist vollständig erholt.', 'big', 4000); host.removeEvent(ev); }) },
        { label: 'Spende geben (20 Silber)', fn: () => { if (pay(20)) { G.rep.kirche += 2; for (const m of G.party) { const s = stats(m); m.hp = Math.min(s.hp, m.hp + Math.round(s.hp * 0.4)); } toast('Segen der Pilger: Der Trupp erholt sich ein wenig.'); host.removeEvent(ev); updateHud(); } } },
        { label: 'Weitergehen', fn: () => host.removeEvent(ev) },
      ])]);
    },
  },
  {
    id: 'inquisition', name: 'Eine Inquisitionsstreife', regions: ['aurelsfeste', 'kaldrion', 'rabenmark'], weight: 2, auto: true,
    cond: () => !!player().tattoo || ['dunkelelf', 'halbdunkelelf'].includes(player().app.race),
    look: { app: { gender: 'm', skin: '#e8bb94', hair: '#e8e0d8', hairStyle: 'kurz', outfit: 'robe', cloth: '#d8d0b8', cloth2: '#d8a83a' }, group: 2 },
    run: (ev, host) => {
      const why = player().tattoo ? 'eine fremde Manasignatur – Dornen' : 'Schatten im Blut. Gottlose.';
      dialog([L('Inquisitor', `„Im Namen Aurelions, steh still. Wir spüren ${why}“`, [
        { label: 'Bestechen (120 Silber)', fn: () => { if (pay(120)) { dialog([L('Inquisitor', '„…Aurelion vergibt. Diesmal.“')]); host.removeEvent(ev); } } },
        { label: 'Kämpfen', fn: () => host.battle(['inquisitor', 'inquisitor'], () => { G.rep.kirche -= 5; xpAll(40); toast('Die Kirche wird davon hören.', 'bad'); host.removeEvent(ev); }) },
      ])]);
    },
  },
  {
    id: 'verschuettet', name: 'Rufe aus einem Stollen', regions: ['kaldrion'], weight: 3,
    look: { app: { gender: 'm', race: 'zwerg', hair: '#a8522a', beard: 'lang', build: 'kraeftig', cloth: '#5a5e6a' } },
    run: (ev, host) => {
      dialog([L('Zwergin', '„Ein Stollen ist eingestürzt! Mein Bruder und zwei Kumpel sind drin. Ich brauche starke Hände – nur einen halben Tag!“', [
        { label: 'Graben helfen (½ Tag)', fn: () => {
          G.day += 0.5; xpAll(35); G.rep.gilde += 2;
          const ring = gearDefToInst('runentalisman', newUid()); G.gear.push(ring);
          dialog([L('Zwergin', `Nach Stunden hört ihr Klopfen. Alle drei leben. Die Zwergin drückt dir etwas in die Hand: „${ring.name}. Von meinem Großvater. Er hätte es so gewollt.“`)]);
          host.removeEvent(ev); updateHud();
        } },
        { label: 'Weitergehen', fn: () => host.removeEvent(ev) },
      ])]);
    },
  },
  {
    id: 'elfengefangene', name: 'Jäger mit einer Gefangenen', regions: ['eschenwacht'], weight: 3, auto: true,
    look: { app: { gender: 'w', hair: '#6a4426', hairStyle: 'zopf', cloth: '#3f5a3a' }, group: 2 },
    run: (ev, host) => {
      const elf = !G.flags.frei_liriel && !G.party.some((m) => m.id === 'liriel');
      dialog([L('Elfenjägerin', `Zwei Jäger, zwischen ihnen ${elf ? 'eine Elfe mit weißem Haar und einem Knebel' : 'ein junger Elf, kaum älter als ein Kind'}. „Fünfzig Gold, lebend. Geh uns aus dem Weg.“`, [
        { label: 'Befreien', fn: () => host.battle(['elfenjaeger', 'elfenjaeger'], () => {
          xpAll(50); host.removeEvent(ev);
          if (elf) dialog([L('Liriel Sternwind', 'Sie reißt sich den Knebel heraus. „Ich war schon einmal verkauft. Nie wieder.“')], () => recruitFree('liriel', ''));
          else { const learner = G.party.find((m) => !m.elements.includes('dendro')); if (learner) { learner.elements.push('dendro'); toast(`Der junge Elf zeigt ${learner.name} zum Dank, wie man Ranken ruft: ${EL_NAME.dendro} gelernt!`, 'big', 4500); } else toast('Der Elf verschwindet zwischen den Bäumen.'); }
        }) },
        { label: 'Weitergehen', fn: () => { G.flags.weggesehen = ((G.flags.weggesehen as number) ?? 0) + 1; host.removeEvent(ev); } },
      ])]);
    },
  },
  {
    id: 'schuldeneintreiber', name: 'Zwei Männer in Konsortiumsfarben', regions: ['veyrath', 'schlackenhafen'], weight: 2, auto: true,
    cond: () => G.silver >= 400,
    look: { app: { gender: 'm', hair: '#1e1612', beard: 'kurz', cloth: '#d8a83a', cloth2: '#6a5a2a', build: 'kraeftig' }, group: 2 },
    run: (ev, host) => {
      const fee = Math.round(G.silver * 0.05);
      dialog([L('Schuldeneintreiber', `„Wechselgebühren. Rückwirkend. Unsere Bücher sagen, du schuldest dem Konsortium ${money(fee)}. Unsere Bücher irren sich nie.“`, [
        { label: `Zahlen (${money(fee)})`, fn: () => { if (pay(fee)) { G.rep.konsortium += 1; host.removeEvent(ev); } } },
        { label: 'Kämpfen', fn: () => host.battle(['bandit', 'bandit', 'bandit'], () => { G.rep.konsortium -= 6; toast('Du stehst jetzt in den Büchern des Konsortiums. Rot.', 'bad', 4000); host.removeEvent(ev); }) },
      ])]);
    },
  },
  {
    id: 'erstarrter', name: 'Ein Mensch, der nicht atmet', regions: ['erstarrt'], weight: 3,
    look: { texture: 'ev_statue' },
    run: (ev, host) => {
      const visions = [
        'Du berührst die Hand. Für einen Atemzug siehst du Valmor lebendig: Markt, Glocken, Kinderlachen. Dann ein Schatten im Norden, größer als der Himmel, und eine Stimme: „Nichts soll je vergehen.“',
        'Unter deinen Fingern wird der Stein warm. Du hörst einen Mann sagen: „Der König hat uns gerettet. Er hat uns für immer gemacht.“ Er weint dabei.',
        'Eine Frau, erstarrt im Gebet. Wenn du genau hinsiehst, bewegen sich ihre Lippen – ein Wort alle hundert Jahre. Du verstehst nur: „…Tochter…“',
      ];
      addItem('erinnerungssplitter'); xpAll(30);
      dialog([L('Erstarrter Mensch', visions[Math.floor(Math.random() * visions.length)])], () => { toast('Erinnerungssplitter erhalten.'); host.removeEvent(ev); });
    },
  },
  {
    id: 'zeitriss', name: 'Ein Flimmern in der Luft', regions: ['erstarrt', 'nachtkluefte'], weight: 2,
    look: { texture: 'ev_licht' },
    run: (ev, host) => {
      if (Math.random() < 0.6) { for (const m of G.party) fullHeal(m); toast('Die Zeit eures Zustands springt zurück. Alle Wunden sind fort – und die letzte Stunde mit ihnen.', 'big', 4500); }
      else { G.day += 1; toast('Ihr tretet hindurch und kommt an derselben Stelle heraus – einen ganzen Tag später.', 'bad', 4500); }
      host.removeEvent(ev); updateHud();
    },
  },
  {
    id: 'schattenpilgerin', name: 'Eine Gestalt in den Ruinen', regions: ['nachtkluefte'], weight: 3, once: true,
    look: { app: { gender: 'w', race: 'dunkelelf', skin: '#5d5274', hair: '#e8e8f0', hairStyle: 'lang', outfit: 'robe', cloth: '#2a2a3a' } },
    run: (ev, host) => {
      const dark = ['dunkelelf', 'halbdunkelelf'].includes(player().app.race);
      dialog([
        L('Alte Dunkelelfe', dark ? '„Du… hast unser Blut. Bist du heimgekommen? Hier ist niemand mehr. Nur ich und die Blumen für die, die sie geholt haben.“' : '„Ein Mensch. Bist du gekommen, um auch mich zu holen? Ich bin zu alt, um eine gute Batterie zu sein.“'),
        L('Alte Dunkelelfe', dark ? 'Sie legt dir die Hand auf die Stirn. Etwas Kaltes, Vertrautes fließt in dich. „Nimm, was sie dir nicht beigebracht haben.“' : 'Sie mustert dich lange. Dann gibt sie dir eine Phiole. „Für den Weg nach oben. Erzähl ihnen, dass hier noch jemand ist.“'),
      ], () => {
        if (dark) { for (const m of G.party) if (!m.elements.includes('schatten')) m.elements.push('schatten'); const p = player(); p.mp = stats(p).mp; toast('Der Trupp beherrscht nun Schatten.', 'big'); }
        else addItem('schattenessenz', 2);
        xpAll(60); host.removeEvent(ev);
      });
    },
  },
  {
    id: 'blutschatten', name: 'Eine maskierte Gestalt', regions: 'all', weight: 0.4, once: true, cond: () => G.day > 8,
    look: { app: { gender: 'w', skin: '#2a2a30', hair: '#141018', hairStyle: 'kurz', cloth: '#5a0e14', cloth2: '#1e0a0c' } },
    run: (ev, host) => {
      dialog([
        L('Maskierte Gestalt', 'Eine Gestalt mit einer Maske aus dunklem Metall steht mitten auf dem Weg. Du hast sie nicht kommen hören.'),
        L('Maskierte Gestalt', '„Du hast den Blick von jemandem, der Dungeons löst, statt an ihnen zu sterben. Gut. Es kommen schlechte Jahre.“'),
        L('Maskierte Gestalt', '„Wenn der Mond rot wird und nicht mehr weiß wird, sind wir zu acht nicht genug. Merk dir das.“ Sie legt etwas auf den Boden. Als du aufsiehst, ist sie fort.'),
      ], () => { addItem('heiltrank2', 3); addItem('riechsalz', 2); xpAll(50); toast('Drei Heiltränke und zwei Riechsalze liegen auf dem Weg. Auf der Phiole ein Siegel: zwei Monde.', 'big', 5000); log('Begegnung mit einem der Blut-Schatten.'); host.removeEvent(ev); });
    },
  },
  {
    id: 'schmetterlinge', name: 'Ein Schwarm Schmetterlinge', regions: 'all', weight: 2, once: true,
    cond: () => Object.values(G.dungeons).filter((d) => d.broken && !d.solved).length >= 2,
    look: { texture: 'ev_schmetterling' },
    run: (ev, host) => {
      const broken = Object.values(G.dungeons).filter((d) => d.broken && !d.solved);
      dialog([
        L('Prinzessin der Schmetterlinge', 'Ein Mädchen aus Flügeln, tausend Schmetterlinge, die zusammen eine Gestalt ergeben. Sie sieht dich nicht an. Sie sieht die Landschaft an, wie man eine Wunde ansieht.'),
        L('Prinzessin der Schmetterlinge', `Die ausgebrochenen Dungeons schließen sich, einer nach dem anderen (${broken.length}). Die Erde dort wird glatt und grün. In der nächsten Stadt, sagt man später, fehlte am Morgen ein ganzes Viertel. Niemand starb. Alle sind ruiniert.`),
      ], () => { for (const d of broken) { d.solved = true; d.broken = false; } log('Die Prinzessin der Schmetterlinge hat die Welt repariert.'); G.silver = Math.round(G.silver * 0.85); toast('Die Preise steigen. Du verlierst 15 % deines Geldes durch die Teuerung.', 'bad', 4500); host.removeEvent(ev); updateHud(); });
    },
  },
  {
    id: 'fee', name: 'Ein winziges Licht', regions: 'all', weight: 3,
    cond: () => G.party.some((m) => m.hp > 0 && m.hp < stats(m).hp * 0.3),
    look: { texture: 'ev_licht' },
    run: (ev, host) => {
      dialog([L('Fee der zeitlosen Wünsche', '„Du siehst müde aus. Ich könnte die Zeit eures Zustands zurückdrehen – für eine Kleinigkeit. Eine Erinnerung an einen Sonnenaufgang, sagen wir. Du hast so viele.“', [
        { label: 'Annehmen', fn: () => { for (const m of G.party) fullHeal(m); G.flags.sonnenaufgaenge = ((G.flags.sonnenaufgaenge as number) ?? 0) + 1; toast('Der Trupp ist geheilt. Du weißt nicht mehr, wie ein Sonnenaufgang aussieht.', 'big', 5000); host.removeEvent(ev); updateHud(); } },
        { label: 'Ablehnen', fn: () => host.removeEvent(ev) },
      ])]);
    },
  },
  {
    id: 'dornpatrouille', name: 'Eine Patrouille des Dornenheers', regions: ['dornenreich', 'eschenwacht'], weight: 2, auto: true,
    look: { app: { gender: 'm', skin: '#c8a8a0', hair: '#141018', cloth: '#5a1a22', cloth2: '#2a0e12', build: 'kraeftig' }, group: 2 },
    run: (ev, host) => {
      const tattoo = !!player().tattoo;
      dialog([L('Dornsoldat', tattoo ? 'Die Soldaten sehen dein Tattoo und treten zur Seite. „Gezeichnete. Die Königin empfängt dich in der Dornfeste.“' : `„Halt. Noch ${Math.max(0, 3 * 360 - Math.floor(G.day))} Tage gilt die Frist. Wer der Königin vorher schadet, den verschlingt die Prinzessin der Dornen. Geh deiner Wege.“`)], () => host.removeEvent(ev));
    },
  },
];

/** Lebensaufgabe des Königs der Stärke: Fortschritt und Frist. */
export function lebensaufgabeProgress(kind: 'kill' | 'region' | 'dungeon', target: string): void {
  const raw = G.flags.lebensaufgabe; if (typeof raw !== 'string' || !raw) return;
  const la = JSON.parse(raw) as Lebensaufgabe;
  if (la.kind !== kind || (la.target !== '*' && la.target !== target)) return;
  la.have++;
  if (la.have >= la.need) {
    G.flags.lebensaufgabe = '';
    toast('Lebensaufgabe erfüllt! Irgendwo nickt ein alter Zwerg. Deine Waffe gehört dir – für immer.', 'big', 5000);
    log('Lebensaufgabe des Königs der Stärke erfüllt.');
    xpAll(150);
  } else { G.flags.lebensaufgabe = JSON.stringify(la); toast(`Lebensaufgabe: ${la.have}/${la.need}`); }
}
export function lebensaufgabeCheck(onFail: () => void): void {
  const raw = G.flags.lebensaufgabe; if (typeof raw !== 'string' || !raw) return;
  const la = JSON.parse(raw) as Lebensaufgabe;
  if (G.day <= la.deadline) return;
  G.flags.lebensaufgabe = '';
  G.gear = G.gear.filter((g) => g.uid !== la.uid);
  for (const m of G.party) if (m.equip.weapon === la.uid) m.equip.weapon = undefined;
  log('Lebensaufgabe gescheitert. Die Waffe hat ihren Träger getötet.');
  dialog([L('Deine Waffe', 'Die Frist ist abgelaufen. Die Klinge in deiner Hand wird heiß, dann weißglühend – und dreht sich in deinem Griff. Der König der Stärke hält, was er verspricht.')], onFail);
}
export function lebensaufgabeInfo(): string { return lebensaufgabeText(); }

export function eventIsNight(): boolean { return isNight(); }
export { itemName };

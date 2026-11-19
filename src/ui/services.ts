import { G, money, priceFor, addItem, makeMember, addMember, save, itemName, rankAtLeast, newUid, fullHeal, log, isHalf } from '../core/state';
import type { El, ItemInst, Rank } from '../data/types';
import { ITEMS, GEAR, gearDefToInst, ACTIVATION_FEE, statLine } from '../data/items';
import { ELEMENT_BOOKS, EL_NAME, EL_COLOR } from '../data/magic';
import { QUESTS, RECRUITS, RANK_META, RANK_ORDER } from '../data/world';
import { RACES, CLASSES } from '../data/races';
import { canRankUp, questCollectReady, advanceTime, healParty, WorldEvent } from '../core/game';
import { h, btn, openModal, clear, toast, dialog } from './dom';
import { gearRow } from './menu';
import { updateHud } from './hud';
import { SFX } from '../core/sfx';
import { charPortrait } from '../gfx/chars';
import { slot, ico, ITEM_ICON, gearIcon } from '../gfx/icons';

export interface ServiceCtx { onEvents: (ev: WorldEvent[]) => void; }

function pay(cost: number): boolean {
  if (G.silver < cost) { toast('Nicht genug Geld.', 'bad'); return false; }
  G.silver -= cost; SFX.coin(); updateHud(); return true;
}

function section(title: string, ...els: (HTMLElement | null)[]): HTMLElement {
  return h('div', {}, h('h3', { class: 'gold', style: 'font-weight:normal;margin:10px 0 4px;font-size:16px' }, title), ...els);
}

function tabbed(title: string, sub: string, tabs: [string, (el: HTMLElement, rr: () => void) => void][]): void {
  let cur = 0;
  const body = h('div', {});
  const render = () => {
    clear(body);
    body.appendChild(h('div', { class: 'tabs' }, ...tabs.map(([l], i) => btn(l, () => { cur = i; render(); }, { cls: 'small ' + (i === cur ? 'sel' : '') }))));
    const c = h('div', {}); body.appendChild(c);
    tabs[cur][1](c, render);
    updateHud();
  };
  render();
  openModal(title, sub, body, undefined, 760);
}

function bookBuy(el: El, rr: () => void, price: number): HTMLElement {
  const b = ELEMENT_BOOKS[el];
  const learners = G.party.filter((m) => !m.elements.includes(el));
  return h('div', { class: 'item' }, slot(el === 'licht' ? 'book_light' : el === 'schatten' ? 'book_dark' : 'book'),
    h('span', { class: 'name' }, b.name, ' ', h('span', { style: `color:${EL_COLOR[el]}` }, ico(el, 16), ` ${EL_NAME[el]}`)),
    h('span', { class: 'gold' }, money(price)),
    ...(learners.length ? learners.map((m) => btn(`${m.name.split(' ')[0]} lernt`, () => { if (pay(price)) { m.elements.push(el); toast(`${m.name} beherrscht nun ${EL_NAME[el]}.`, 'big'); SFX.magic(); rr(); } }, { cls: 'small' })) : [h('span', { class: 'dim' }, 'alle kennen es')]));
}

// ---------------- Abenteurergilde ----------------
function gilde(): void {
  const r = G.advRank;
  tabbed('Abenteurergilde von Krähenfurt', `„10 % Blutsteuer auf jede Quest und jedes Beutestück.“ – Dein Rang: ${r} (${RANK_META[r].title}), ${G.rp} Rangpunkte`, [
    ['Auftragsbrett', (el, rr) => {
      const l = h('div', { class: 'list' });
      for (const q of QUESTS) {
        const st = G.quests[q.id];
        if (st.status === 'abgegeben') continue;
        const locked = q.needRank && !rankAtLeast(G.advRank, q.needRank);
        const ready = st.status === 'erfuellt' || (st.status === 'angenommen' && questCollectReady(q.id));
        const net = Math.round(q.reward * 0.9);
        l.appendChild(h('div', { class: 'item', style: 'align-items:flex-start' },
          h('div', { class: 'name' }, h('div', {}, q.name, h('span', { class: 'tag' }, 'Rang ' + q.rank), h('span', { class: 'tag' }, `${money(net)} netto · ${q.rp} RP`)), h('div', { class: 'dim', style: 'font-size:12.5px' }, q.desc)),
          st.status === 'offen' ? btn(locked ? `Erst ab Rang ${q.needRank}` : 'Annehmen', () => { st.status = 'angenommen'; SFX.ui(); rr(); }, { cls: 'small', disabled: !!locked }) :
            ready ? btn('Abgeben', () => {
              if (q.kind === 'collect') addItem(q.target, -q.goal);
              st.status = 'abgegeben'; G.silver += net; G.rp += q.rp; G.rep.gilde += 2; SFX.coin();
              toast(`Belohnung: ${money(net)} (nach 10 % Blutsteuer), +${q.rp} Rangpunkte`, 'big'); log(`Auftrag „${q.name}“ abgeschlossen.`); rr();
            }, { cls: 'small sel' }) : h('span', { class: 'dim', style: 'font-size:12px;white-space:nowrap' }, 'angenommen')));
      }
      for (const [k, v] of Object.entries(G.flags)) {
        if (!k.startsWith('bounty_') || !v) continue;
        const d = G.dungeons[k.slice(7)];
        const net = Math.round((v as number) * 0.9);
        l.appendChild(h('div', { class: 'item' }, h('span', { class: 'name' }, `Lösungsprämie: ${d?.name ?? 'Dungeon'}`), btn(`${money(net)} abholen`, () => { G.flags[k] = false; G.silver += net; G.rp += 2; SFX.coin(); toast(`+${money(net)}, +2 Rangpunkte`, 'big'); rr(); }, { cls: 'small sel' })));
      }
      el.appendChild(l);
    }],
    ['Beute definieren', (el, rr) => {
      el.appendChild(h('p', { class: 'dim', style: 'margin-top:0;font-size:13px' }, 'Dungeon-Ausrüstung schläft, bis die Gilde sie definiert. Gebühr nach Rang, dazu 10 % Blutsteuer auf den Wert. Ab Rang A fordert sie im Kampf Tribut.'));
      const l = h('div', { class: 'list' });
      const sleeping = G.gear.filter((g) => g.sleeping);
      if (!sleeping.length) l.appendChild(h('div', { class: 'dim' }, 'Keine schlafende Ausrüstung.'));
      for (const g of sleeping) {
        const cost = ACTIVATION_FEE[g.rank] + Math.round(g.value * 0.1);
        l.appendChild(gearRow(g, btn(`Definieren (${money(cost)})`, () => {
          if (!pay(cost)) return;
          g.sleeping = false; SFX.magic();
          toast(`${g.name}: ${statLine(g.stats)}${g.tribut ? ` – Tribut: ${g.tribut.amount} ${g.tribut.kind === 'blut' ? 'Blut (LP)' : 'Mana'} je Angriff!` : ''}`, 'big', 4000);
          rr();
        }, { cls: 'small' })));
      }
      el.appendChild(l);
    }],
    ['Seelenplaketten', (el, rr) => {
      const n = G.inv.plakette ?? 0;
      el.appendChild(h('p', {}, 'Kalte Plaketten von Toten aus den Dungeons. Die Gilde zahlt 12 Silber je Plakette und schreibt die Namen ins Totenbuch.'));
      el.appendChild(btn(n ? `${n} Plakette(n) abgeben (${money(n * 12)})` : 'Keine Plaketten', () => { G.silver += n * 12; G.rep.gilde += n; delete G.inv.plakette; G.rp += Math.floor(n / 3); SFX.coin(); toast('Die Namen werden ins Totenbuch eingetragen.'); rr(); }, { disabled: !n }));
    }],
    ['Gefährten', (el, rr) => recruitList(el, rr, 'gilde')],
    ['Rang', (el, rr) => {
      const i = RANK_ORDER.indexOf(G.advRank);
      const next = RANK_ORDER[i + 1] as Rank;
      el.appendChild(h('p', {}, `Aktuell: Rang ${G.advRank} – ${RANK_META[G.advRank].title}, Plakette aus ${RANK_META[G.advRank].metal}. Rangpunkte: ${G.rp}.`));
      if (next && next !== 'S') el.appendChild(h('p', {}, `Nächster Rang: ${next} (${RANK_META[next].title}) ab ${RANK_META[next].rpNeeded} Rangpunkten.`));
      const up = canRankUp();
      el.appendChild(btn(up ? `Prüfung zu Rang ${up} ablegen` : 'Noch nicht genug Rangpunkte', () => {
        if (!up) return;
        G.advRank = up; SFX.level();
        toast(`Rang ${up}! Deine neue Plakette ist aus ${RANK_META[up].metal}.`, 'big', 4000); log(`Aufstieg zu Rang ${up}.`); rr();
      }, { disabled: !up, cls: up ? 'sel' : '' }));
      el.appendChild(h('p', { class: 'dim', style: 'font-size:13px' }, 'Ränge D–SS: Eisen, Bronze, Silber, Gold, Mithril, Orichalcum. Legenden mit versiegelten Sündenklingen erhalten eine lebenslange Rente.'));
    }],
  ]);
}

function recruitList(el: HTMLElement, rr: () => void, where: 'gilde' | 'kirche'): void {
  const l = h('div', { class: 'list' });
  for (const rc of RECRUITS.filter((x) => x.where === where)) {
    const inParty = G.party.some((m) => m.id === rc.id);
    const forgot = !!G.flags['vergessen_' + rc.id];
    l.appendChild(h('div', { class: 'item' }, charPortrait(rc.app, 2, 0),
      h('div', { class: 'name' }, h('div', {}, rc.name, h('span', { class: 'tag' }, `${RACES[rc.app.race].name} · ${CLASSES[rc.cls].short}`)), h('div', { class: 'dim', style: 'font-size:12.5px' }, forgot ? 'Sieht durch dich hindurch, als hättet ihr euch nie getroffen.' : rc.bio)),
      inParty ? h('span', { class: 'dim' }, 'im Trupp') :
        btn(`Anwerben (${money(rc.cost)})`, () => {
          if (G.party.length >= 3) { toast('Ein Trupp hat hier höchstens drei Mitglieder.', 'bad'); return; }
          if (!pay(rc.cost)) return;
          const lvl = Math.max(rc.level, G.party[0].level);
          const m = makeMember(rc.id, rc.name, rc.app, rc.cls, lvl, [...rc.elements, ...RACES[rc.app.race].native]);
          addMember(m); delete G.flags['vergessen_' + rc.id];
          toast(`${rc.name} schließt sich dem Trupp an.`, 'big'); rr();
        }, { cls: 'small' })));
  }
  el.appendChild(l);
  el.appendChild(h('p', { class: 'dim', style: 'font-size:12.5px' }, `Trupp: ${G.party.length}/3. Entlassen kannst du Gefährten im Menü (Esc).`));
}

// ---------------- Kirche ----------------
function kirche(ctx: ServiceCtx): void {
  const p = G.party[0];
  if (isHalf(p) && !G.flags.kircheHalb) {
    G.flags.kircheHalb = true;
    dialog([
      { who: 'Hochkleriker Aldemar', text: `Bleib stehen, Kind. …Zwei Flüsse. Ich sehe zwei getrennte Manaflüsse in dir. Man hält dich für ${RACES[RACES[p.app.race].half!].name.toLowerCase()}, nicht wahr?` },
      { who: 'Hochkleriker Aldemar', text: 'Die Kirche kauft solche wie dich gern frei – in ihren Dienst. Schild und Heilung zugleich. Überleg es dir. Das Angebot gilt, solange du nützlich bist.' },
    ], () => kirche(ctx));
    return;
  }
  const hasCleric = G.party.some((m) => m.cls === 'kleriker');
  tabbed('Kapelle des Sanktuariums', 'Aurelion, Gott der Magie und des Lichts, wacht über Krähenfurt. Angeblich.', [
    ['Heilung', (el, rr) => {
      el.appendChild(h('p', {}, 'Ein Kleriker legt dem Trupp die Hände auf. Die Kirche nimmt eine „Spende“.'));
      el.appendChild(btn(`Trupp heilen (${money(8)})`, () => { if (pay(8)) { healParty(); SFX.heal(); toast('Der Trupp ist geheilt.'); rr(); } }));
      const cursed = G.gear.filter((g) => g.curse);
      el.appendChild(section('Flüche lösen', h('p', { class: 'dim', style: 'font-size:13px' }, 'Für Ware von der Rostigen Münze. Offiziell verurteilt die Kirche diesen Handel – inoffiziell verdient sie an beiden Enden.')));
      const l = h('div', { class: 'list' });
      for (const g of cursed) l.appendChild(gearRow(g, btn(`Fluch lösen (${money(25)})`, () => {
        if (!pay(25)) return;
        for (const k of Object.keys(g.curseStats ?? {}) as (keyof typeof g.stats)[]) g.stats[k] = (g.stats[k] ?? 0) - (g.curseStats![k] ?? 0);
        g.curse = undefined; g.curseStats = undefined; toast('Der Sekundärfluch ist gebrochen.'); rr();
      }, { cls: 'small' })));
      if (!cursed.length) l.appendChild(h('div', { class: 'dim' }, 'Keine verfluchte Ausrüstung.'));
      el.appendChild(l);
    }],
    ['Licht-Bücher', (el, rr) => {
      el.appendChild(h('p', { style: 'font-size:13px' }, 'Die Kirche hält alle Licht-Bücher unter Verschluss und verleiht sie nur an Kleriker. ' + (hasCleric ? 'Für die Kleriker in deinem Trupp ist die Leihe kostenlos.' : 'Für Laien gibt es eine „Ausnahmegenehmigung“ – gegen Spende.')));
      const l = h('div', { class: 'list' });
      const learners = G.party.filter((m) => !m.elements.includes('licht'));
      for (const m of learners) {
        const free = m.cls === 'kleriker';
        const price = free ? 0 : 160;
        l.appendChild(h('div', { class: 'item' }, slot('book_light'), h('span', { class: 'name' }, `${ELEMENT_BOOKS.licht.name} für ${m.name}`), btn(free ? 'Leihen' : `Spenden (${money(price)})`, () => { if (pay(price)) { m.elements.push('licht'); SFX.magic(); toast(`${m.name} beherrscht nun Licht.`, 'big'); rr(); } }, { cls: 'small' })));
      }
      if (!learners.length) l.appendChild(h('div', { class: 'dim' }, 'Alle im Trupp kennen das Licht.'));
      el.appendChild(l);
    }],
    ['Kleriker mieten', (el, rr) => recruitList(el, rr, 'kirche')],
    ['Sündenklingen', (el) => {
      el.appendChild(h('p', {}, 'Für Träger von Sündenklingen (Rang S/SS) bietet die Kirche ab 500 Gold die „Dämpfung“ an: Der Fluch wird auf andere umgeleitet. Wohin genau, fragt man besser nicht.'));
      el.appendChild(h('p', { class: 'dim' }, 'Du besitzt keine Sündenklinge. Noch nicht.'));
    }],
  ]);
  void ctx;
}

// ---------------- Konsortium ----------------
function konsortium(): void {
  tabbed('Wechselstube des Konsortiums', '100 Silber = 1 Gold · 100 Gold = 1 Platin · 2 % Gebühr bei jedem Wechsel', [
    ['Ankauf', (el, rr) => {
      const l = h('div', { class: 'list' });
      const mats = Object.keys(G.inv).filter((k) => ITEMS[k]?.kind === 'material' && G.inv[k] > 0);
      if (!mats.length) l.appendChild(h('div', { class: 'dim' }, 'Nichts zu verkaufen. Monsterkerne, Häute und Zähne kauft das Konsortium an.'));
      let total = 0;
      for (const id of mats) {
        const unit = Math.max(1, Math.round(ITEMS[id].price * 0.98));
        total += unit * G.inv[id];
        l.appendChild(h('div', { class: 'item' }, slot(ITEM_ICON[id] ?? 'bag'), h('span', { class: 'name' }, `${itemName(id)} ×${G.inv[id]}`), h('span', { class: 'gold' }, `je ${money(unit)}`),
          btn('1 verkaufen', () => { G.silver += unit; addItem(id, -1); SFX.coin(); rr(); }, { cls: 'small' }),
          btn('alle', () => { G.silver += unit * G.inv[id]; delete G.inv[id]; SFX.coin(); rr(); }, { cls: 'small' })));
      }
      el.appendChild(l);
      if (mats.length) el.appendChild(h('div', { style: 'margin-top:8px' }, btn(`Alles verkaufen (${money(total)})`, () => { for (const id of mats) delete G.inv[id]; G.silver += total; G.rep.konsortium++; SFX.coin(); rr(); })));
    }],
    ['Grimoires', (el, rr) => {
      el.appendChild(h('p', { class: 'dim', style: 'margin-top:0;font-size:13px' }, 'Magie wird aus Büchern gelernt. Das Konsortium verkauft alle Grimoires außer Licht und Schatten – teuer.'));
      const l = h('div', { class: 'list' });
      for (const e of Object.keys(ELEMENT_BOOKS) as El[]) if (ELEMENT_BOOKS[e].seller === 'konsortium') l.appendChild(bookBuy(e, rr, priceFor(ELEMENT_BOOKS[e].price)));
      el.appendChild(l);
    }],
    ['Auskunft', (el) => {
      el.appendChild(h('p', {}, 'Das Konsortium prägt alle Münzen, vergibt Kredite und kauft Monsterteile. Wer sich mit ihm anlegt, landet auf der Schwarzen Liste – totaler Boykott.'));
      el.appendChild(h('p', { class: 'dim' }, 'Ein Frischling verdient 10 bis 50 Silber im Monat. Eine kirchliche Dämpfung kostet ab 500 Gold. Rang S und SS leben in einer eigenen Wirtschaft.'));
    }],
  ]);
}

// ---------------- Händler ----------------
function haendler(): void {
  const dwarf = G.party[0].app.race === 'zwerg' || G.party[0].app.race === 'halbzwerg';
  const markup = RACES[G.party[0].app.race].markup;
  tabbed('Schmied & Krämer', markup > 0 ? `Der Krämer mustert dich misstrauisch. „Für deinesgleichen kostet’s mehr.“ (+${Math.round(markup * 100)} %)` : dwarf ? '„Ein Zwerg! Für Runenkundige gibt’s Rabatt auf Ausrüstung.“' : 'Weltliche Ausrüstung von Rang D bis B – sofort nutzbar, ohne Tribut.', [
    ['Vorräte', (el, rr) => {
      const l = h('div', { class: 'list' });
      for (const id of ['proviant', 'heiltrank', 'heiltrank2', 'manatrank', 'kraeuterbund', 'riechsalz']) {
        const d = ITEMS[id]; const pr = priceFor(d.price);
        l.appendChild(h('div', { class: 'item' }, slot(ITEM_ICON[id] ?? 'bag'), h('span', { class: 'name' }, d.name, h('span', { class: 'tag' }, `hast ${G.inv[id] ?? 0}`)), h('span', { class: 'dim', style: 'font-size:12px' }, d.desc), h('span', { class: 'gold' }, money(pr)),
          btn('Kaufen', () => { if (pay(pr)) { addItem(id); rr(); } }, { cls: 'small' }),
          id === 'proviant' ? btn('×10', () => { if (pay(pr * 10)) { addItem(id, 10); rr(); } }, { cls: 'small' }) : null));
      }
      el.appendChild(l);
    }],
    ['Ausrüstung', (el, rr) => {
      const l = h('div', { class: 'list' });
      for (const d of Object.values(GEAR)) {
        if (d.rank === 'B' && !rankAtLeast(G.advRank, 'B')) continue;
        const pr = Math.round(priceFor(d.price) * (dwarf ? 0.9 : 1));
        l.appendChild(h('div', { class: 'item' }, slot(gearIcon(d.id, d.slot!, d.name)), h('span', { class: 'name' }, d.name, h('span', { class: 'tag' }, `${d.slot === 'weapon' ? 'Waffe' : d.slot === 'armor' ? 'Rüstung' : 'Talisman'} · ${d.rank}`)), h('span', { class: 'dim', style: 'font-size:12px' }, statLine(d.stats!)), h('span', { class: 'gold' }, money(pr)),
          btn('Kaufen', () => { if (pay(pr)) { G.gear.push(gearDefToInst(d.id, newUid())); toast(`${d.name} gekauft – im Menü (Esc) anlegen.`); rr(); } }, { cls: 'small' })));
      }
      el.appendChild(l);
      if (!rankAtLeast(G.advRank, 'B')) el.appendChild(h('p', { class: 'dim', style: 'font-size:12.5px' }, 'B-Ausrüstung verkauft der Schmied nur an Klingen der Krone (Rang B).'));
    }],
    ['Verkaufen', (el, rr) => {
      const l = h('div', { class: 'list' });
      const sellable = G.gear.filter((g) => !g.sleeping && !G.party.some((m) => Object.values(m.equip).includes(g.uid)));
      if (!sellable.length) l.appendChild(h('div', { class: 'dim' }, 'Nichts Unbenutztes. (Schlafende Ware kauft hier niemand – frag bei der Rostigen Münze.)'));
      for (const g of sellable) { const v = Math.round(g.value * 0.5); l.appendChild(gearRow(g, btn(`Verkaufen (${money(v)})`, () => { G.gear = G.gear.filter((x) => x !== g); G.silver += v; SFX.coin(); rr(); }, { cls: 'small' }))); }
      el.appendChild(l);
    }],
  ]);
}

// ---------------- Gasthaus ----------------
const RUMORS = [
  'Die Verlorene Königin rüstet seit zwei Jahren auf dem Aschfeld. Noch drei Jahre, dann ist Krieg. Wer sie vorher angreift, den verschlingt die Dornenprinzessin.',
  'Erinnerungs-Dungeons tarnen sich als Rang D. Ein Anfänger-Trupp geht hinein, stirbt – und ein Blutmond kommt. So läuft das.',
  'Mein Vetter hat den König der Stärke gesehen. Eine weißglühende Feldschmiede mitten im Moor. Er hat abgelehnt. Kluger Mann.',
  'Die Blut-Schatten sind zu acht, tragen Masken und altern seit 150 Jahren nicht. Gegen eine Entität haben sie nie gekämpft.',
  'Die Kirche schickt billige Sklaven als „Fristhalter“ in Dungeons, die keiner lösen kann. Solange einer drin lebt, steht die Frist still.',
  'In Eschenwacht ist Elfenjagd ein Gewerbe. Wenn du spitze Ohren hast, nimm den Westweg.',
  'Die Rostige Münze verkauft Leichenbeute. Neun von zehn Stücken tragen den Fluch ihres Vorbesitzers.',
  'Im Nordosten liegen die Erstarrten Lande. Kein Wind, kein Verfall. Nur graue Motten, die Augenblicke fressen.',
  'Wer in einer Erinnerungsschleife schreit, wird Teil der Szene. Kleriker mit Stille-Zauber sind dort Gold wert.',
  'Der Wolf der Sünden weiß, wer welche Sündenklinge trägt. Darum hassen ihn die Kunden des Schmieds so sehr.',
];
function gasthaus(ctx: ServiceCtx): void {
  tabbed('Gasthaus „Zur Krähe“', 'Rauch, nasse Mäntel und Gerüchte.', [
    ['Übernachten', (el) => {
      el.appendChild(h('p', {}, 'Ein Bett, eine Suppe, ein Tag vergeht. Der Trupp ist danach vollständig erholt (und das Spiel gespeichert). Bedenke: Auch die Fristen der Dungeons laufen weiter.'));
      el.appendChild(btn(`Übernachten (${money(10)})`, () => {
        if (!pay(10)) return;
        const ev = advanceTime(1);
        healParty(); save();
        toast('Ihr schlaft bis zum Morgen. (Gespeichert)', 'big');
        ctx.onEvents(ev); updateHud();
      }));
    }],
    ['Gerüchte', (el) => {
      const i = Math.floor(G.day + G.silver) % RUMORS.length;
      el.appendChild(h('p', { style: 'font-style:italic' }, '„' + RUMORS[i] + '“'));
      el.appendChild(h('p', { style: 'font-style:italic' }, '„' + RUMORS[(i + 3) % RUMORS.length] + '“'));
    }],
  ]);
}

// ---------------- Rostige Münze ----------------
function muenzeOffers(): ItemInst[] {
  const key = 'muenze_' + Math.floor(G.day / 3);
  const cached = G.flags[key];
  if (typeof cached === 'string') return JSON.parse(cached) as ItemInst[];
  const names = ['Leichenklinge (A)', 'Rostiger Sündenspieß (A)', 'Kettenhemd eines Gehängten (A)', 'Ring des Ertrunkenen (A)'];
  const out: ItemInst[] = [];
  for (let i = 0; i < 2; i++) {
    const n = names[Math.floor(Math.random() * names.length)];
    const slot = n.includes('Kettenhemd') ? 'armor' : n.includes('Ring') ? 'trinket' : 'weapon';
    const stats = slot === 'weapon' ? { atk: 18 } : slot === 'armor' ? { def: 14 } : { mag: 7, mp: 12 };
    const cursed = Math.random() < 0.9;
    const curseStats = cursed ? (Math.random() < 0.5 ? { spd: -4 } : { hp: -25 }) : undefined;
    const inst: ItemInst = { uid: newUid(), def: 'schwarz', name: n, slot, rank: 'A', stats: { ...stats }, value: 300, origin: 'Rostige Münze',
      tribut: Math.random() < 0.6 ? { kind: 'blut', amount: 5 } : { kind: 'mana', amount: 4 } };
    if (curseStats) { inst.curse = curseStats.spd ? 'Fluch: Pech (−4 Tempo)' : 'Fluch: Wahnsinn (−25 LP)'; inst.curseStats = curseStats; for (const [k, v] of Object.entries(curseStats)) (inst.stats as Record<string, number>)[k] = ((inst.stats as Record<string, number>)[k] ?? 0) + v; }
    out.push(inst);
  }
  G.flags[key] = JSON.stringify(out);
  return out;
}
function muenze(): void {
  tabbed('Die Rostige Münze', 'Ein Hinterzimmer, eine Kerze, ein Mann ohne Namen. „Wir fragen nicht, woher. Du fragst nicht, wohin.“', [
    ['Ungeklärte Ware', (el, rr) => {
      el.appendChild(h('p', { class: 'dim', style: 'margin-top:0;font-size:13px' }, 'Rang-A-Ausrüstung aus Leichenplünderung, illegal geweckt. Fordert Tribut – und trägt oft den Fluch des Vorbesitzers. Die Kirche löst Flüche, gegen Spende.'));
      const l = h('div', { class: 'list' });
      for (const o of muenzeOffers()) {
        const owned = G.gear.some((g) => g.uid === o.uid);
        const price = 220;
        l.appendChild(h('div', { class: 'item' }, slot(gearIcon(o.def, o.slot, o.name)), h('span', { class: 'name' }, o.name, h('span', { class: 'tag blood' }, `Tribut: ${o.tribut!.amount} ${o.tribut!.kind === 'blut' ? 'LP' : 'Mana'}`)), h('span', { class: 'dim', style: 'font-size:12px' }, statLine(o.stats) + (o.curse ? ' · ???' : '')),
          owned ? h('span', { class: 'dim' }, 'gekauft') : btn(money(price), () => { if (pay(price)) { G.gear.push(o); G.rep.muenze++; toast(o.curse ? `${o.name} gekauft. Etwas daran fühlt sich falsch an… (${o.curse})` : `${o.name} gekauft.`, o.curse ? 'bad' : 'big', 4000); rr(); } }, { cls: 'small' })));
      }
      el.appendChild(l);
    }],
    ['Schattenbuch', (el, rr) => {
      el.appendChild(h('p', { style: 'font-size:13px' }, 'Schatten-Bücher gelten der Kirche als ketzerisch. Hier gibt es sie trotzdem.'));
      const l = h('div', { class: 'list' }); l.appendChild(bookBuy('schatten', rr, ELEMENT_BOOKS.schatten.price)); el.appendChild(l);
    }],
    ['Hehlerei', (el, rr) => {
      const l = h('div', { class: 'list' });
      const sl = G.gear.filter((g) => g.sleeping);
      if (!sl.length) l.appendChild(h('div', { class: 'dim' }, 'Schlafende Ware kauft die Münze für 40 % – ohne Gildensteuer, ohne Fragen.'));
      for (const g of sl) { const v = Math.round(g.value * 0.4); l.appendChild(gearRow(g, btn(`Verkaufen (${money(v)})`, () => { G.gear = G.gear.filter((x) => x !== g); G.silver += v; G.rep.muenze++; SFX.coin(); rr(); }, { cls: 'small' }))); }
      el.appendChild(l);
    }],
  ]);
}

export function openService(service: string, ctx: ServiceCtx): void {
  SFX.door();
  switch (service) {
    case 'gilde': return gilde();
    case 'kirche': return kirche(ctx);
    case 'konsortium': return konsortium();
    case 'haendler': return haendler();
    case 'gasthaus': return gasthaus(ctx);
    case 'muenze': return muenze();
    case 'waisenhaus': return dialog([
      { who: 'Mutter Hesse', text: 'Wir sind voll. Jeden Frostmond setzen wir die Ältesten vor die Tür, damit die Kleinen Platz haben. Die meisten landen bei der Gilde. Als Frischfleisch.' },
      { who: 'Mutter Hesse', text: 'Wenn du da drin einen findest, der eine Eisenplakette mit unserem Zeichen trägt… bring sie zurück. Bitte.' },
    ]);
    case 'haus': return dialog([{ who: 'Bewohner', text: 'Geh weiter. Seit der Kanal gluckert, öffnen wir niemandem mehr.' }]);
  }
}

export { fullHeal };

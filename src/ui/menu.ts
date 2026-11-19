import { G, stats, money, gearOf, maxElements, maxMp2, isHalf, xpForLevel, itemName, save, manaRank } from '../core/state';
import type { Member, ItemInst } from '../data/types';
import { RACES, CLASSES } from '../data/races';
import { ITEMS, statLine } from '../data/items';
import { EL_NAME, EL_COLOR, resolveSpell, STAGE_NAME } from '../data/magic';
import { QUESTS, TECHS, CODEX, dateStr, queenDaysLeft, RANK_META } from '../data/world';
import { charPortrait } from '../gfx/chars';
import { h, btn, openModal, clear, bar, toast } from './dom';
import { toggleMute, SFX } from '../core/sfx';
import { updateHud } from './hud';

type Tab = 'trupp' | 'inventar' | 'magie' | 'auftraege' | 'welt' | 'wissen' | 'system';
const TABS: [Tab, string][] = [['trupp', 'Trupp'], ['inventar', 'Inventar'], ['magie', 'Zauberbuch'], ['auftraege', 'Aufträge'], ['welt', 'Weltlage'], ['wissen', 'Wissen'], ['system', 'System']];

export function openMenu(onTitle?: () => void, start: Tab = 'trupp'): void {
  let tab: Tab = start;
  const body = h('div', {});
  const render = () => {
    clear(body);
    body.appendChild(h('div', { class: 'tabs' }, ...TABS.map(([t, l]) => btn(l, () => { tab = t; render(); }, { cls: 'small ' + (t === tab ? 'sel' : '') }))));
    const c = h('div', {});
    body.appendChild(c);
    ({ trupp: renderParty, inventar: renderInv, magie: renderMagic, auftraege: renderQuests, welt: renderWorld, wissen: renderCodex, system: (el: HTMLElement) => renderSystem(el, onTitle) } as Record<Tab, (el: HTMLElement, r: () => void) => void>)[tab](c, render);
    updateHud();
  };
  render();
  openModal('Menü', `${dateStr(G.day)} · ${money(G.silver)} · Abenteurer-Rang ${G.advRank} (${RANK_META[G.advRank].title}, Plakette aus ${RANK_META[G.advRank].metal})`, body, undefined, 780);
}

export function memberCard(m: Member, rerender: () => void, opts: { equip?: boolean } = {}): HTMLElement {
  const s = stats(m);
  const race = RACES[m.app.race];
  const eq = (slot: 'weapon' | 'armor' | 'trinket', label: string) => {
    const cur = gearOf(m.equip[slot]);
    const avail = G.gear.filter((g) => g.slot === slot && !g.sleeping && !G.party.some((p) => p !== m && p.equip[slot] === g.uid));
    const sel = h('select', { style: 'font-family:inherit;background:#0f0c09;color:var(--text);border:1px solid var(--line);border-radius:3px;max-width:240px' }) as HTMLSelectElement;
    sel.appendChild(h('option', { value: '' }, '— nichts —'));
    for (const g of avail) { const o = h('option', { value: g.uid }, `${g.name}${g.tribut ? ' ⚠Tribut' : ''}${g.curse ? ' ☠' : ''}`) as HTMLOptionElement; if (cur?.uid === g.uid) o.selected = true; sel.appendChild(o); }
    sel.addEventListener('change', () => { m.equip[slot] = sel.value || undefined; const s2 = stats(m); m.hp = Math.min(m.hp, s2.hp); m.mp = Math.min(m.mp, s2.mp); rerender(); });
    return h('div', { class: 'row', style: 'font-size:13px' }, h('span', { class: 'dim', style: 'width:70px' }, label), opts.equip === false ? h('span', {}, cur?.name ?? '—') : sel, cur ? h('span', { class: 'dim', style: 'font-size:12px' }, statLine(cur.stats) + (cur.tribut ? ` · Tribut: ${cur.tribut.amount} ${cur.tribut.kind === 'blut' ? 'LP' : 'Mana'} je Angriff` : '') + (cur.curse ? ` · ${cur.curse}` : '')) : null);
  };
  return h('div', { class: 'panel', style: 'padding:8px;margin-bottom:8px;display:flex;gap:10px' },
    charPortrait(m.app, 3, 0),
    h('div', { class: 'col grow', style: 'gap:3px' },
      h('div', { class: 'row' }, h('b', { class: 'gold', style: 'font-weight:normal;font-size:16px' }, m.name), h('span', { class: 'dim' }, `${race.name} · ${CLASSES[m.cls].short} · Stufe ${m.level}`)),
      h('div', { style: 'font-size:12.5px' }, `LP ${m.hp}/${s.hp} · Mana ${m.mp}/${s.mp}${isHalf(m) ? ` · 2. Fluss ${m.mp2}/${maxMp2(m)}` : ''} · Angriff ${s.atk} · Vert. ${s.def} · Magie ${s.mag} · Tempo ${s.spd}`),
      h('div', { style: 'width:200px' }, bar('xp', m.xp, xpForLevel(m.level))),
      h('div', { style: 'font-size:12.5px' }, 'Mana-Rang ', h('b', { class: 'manac', style: 'font-weight:normal' }, race.mana2 ? `${race.mana2}+${race.mana}` : manaRank(m)), ` · verbindet bis zu ${maxElements(m)} Element(e) · Elemente: `,
        ...m.elements.map((e) => h('span', { style: `color:${EL_COLOR[e]};margin-right:6px` }, EL_NAME[e]))),
      h('div', { style: 'font-size:12.5px' }, 'Techniken: ', [race.tech, CLASSES[m.cls].tech].map((t) => `${TECHS[t].name} (${TECHS[t].ap} Schwung)`).join(', ')),
      eq('weapon', 'Waffe'), eq('armor', 'Rüstung'), eq('trinket', 'Talisman'),
      !m.isPlayer && opts.equip !== false ? h('div', {}, btn('Aus dem Trupp entlassen', () => { G.party = G.party.filter((p) => p !== m); for (const k of Object.keys(m.equip) as ('weapon' | 'armor' | 'trinket')[]) m.equip[k] = undefined; rerender(); }, { cls: 'small danger' })) : null));
}

function renderParty(el: HTMLElement, rr: () => void): void {
  for (const m of G.party) el.appendChild(memberCard(m, rr));
  if (G.party.length < 3) el.appendChild(h('div', { class: 'dim' }, 'Gefährten wirbst du in der Abenteurergilde an; Kleriker vermietet die Kirche.'));
}

function useItem(id: string, m: Member): string | null {
  const d = ITEMS[id];
  const s = stats(m);
  if (d.revive) { if (m.hp > 0) return 'Nicht bewusstlos.'; m.hp = Math.round(s.hp * 0.3); }
  else if (m.hp <= 0) return 'Bewusstlos – braucht Riechsalz.';
  if (d.heal) m.hp = Math.min(s.hp, m.hp + d.heal);
  if (d.mana) { m.mp = Math.min(s.mp, m.mp + d.mana); m.mp2 = Math.min(maxMp2(m), m.mp2 + d.mana); }
  G.inv[id]--; if (G.inv[id] <= 0) delete G.inv[id];
  return null;
}

function renderInv(el: HTMLElement, rr: () => void): void {
  const ids = Object.keys(G.inv).filter((k) => G.inv[k] > 0);
  const cons = ids.filter((i) => ITEMS[i]?.kind === 'consumable');
  const mats = ids.filter((i) => ITEMS[i]?.kind !== 'consumable');
  el.appendChild(h('h3', { class: 'gold', style: 'font-weight:normal;margin:4px 0' }, 'Verbrauchsgüter'));
  const l1 = h('div', { class: 'list' });
  for (const id of cons) {
    const d = ITEMS[id];
    const usable = !!(d.heal || d.mana || d.revive);
    l1.appendChild(h('div', { class: 'item' }, h('span', { class: 'name' }, `${d.name} ×${G.inv[id]}`), h('span', { class: 'dim', style: 'font-size:12px' }, d.desc),
      ...(usable ? G.party.map((m) => btn(m.name.split(' ')[0], () => { const err = useItem(id, m); if (err) toast(err, 'bad'); else SFX.heal(); rr(); }, { cls: 'small' })) : [])));
  }
  el.appendChild(l1);
  el.appendChild(h('h3', { class: 'gold', style: 'font-weight:normal;margin:10px 0 4px' }, 'Beute & Materialien'));
  const l2 = h('div', { class: 'list' });
  for (const id of mats) l2.appendChild(h('div', { class: 'item' }, h('span', { class: 'name' }, `${itemName(id)} ×${G.inv[id]}`), h('span', { class: 'dim', style: 'font-size:12px' }, ITEMS[id]?.desc ?? '')));
  if (!mats.length) l2.appendChild(h('div', { class: 'dim' }, 'Nichts.'));
  el.appendChild(l2);
  el.appendChild(h('h3', { class: 'gold', style: 'font-weight:normal;margin:10px 0 4px' }, 'Ausrüstung'));
  const l3 = h('div', { class: 'list' });
  for (const g of G.gear) l3.appendChild(gearRow(g));
  el.appendChild(l3);
}

export function gearRow(g: ItemInst, ...extra: HTMLElement[]): HTMLElement {
  const owner = G.party.find((m) => Object.values(m.equip).includes(g.uid));
  return h('div', { class: 'item' },
    h('span', { class: 'name' }, g.name, g.sleeping ? h('span', { class: 'tag' }, 'schlafend') : null, g.tribut ? h('span', { class: 'tag blood' }, 'Tribut') : null, g.curse ? h('span', { class: 'tag blood' }, 'verflucht') : null, owner ? h('span', { class: 'tag' }, owner.name) : null),
    h('span', { class: 'dim', style: 'font-size:12px' }, g.sleeping ? 'Muss bei der Gilde definiert werden.' : statLine(g.stats) + (g.curse ? ' · ' + g.curse : '')), ...extra);
}

function renderMagic(el: HTMLElement): void {
  el.appendChild(h('p', { class: 'dim', style: 'margin-top:0;font-size:13px' }, 'Zauber entstehen im Kampf in der Zauberwerkstatt: Wähle bis zu so viele Elemente, wie dein Mana-Rang erlaubt. Überlieferte Formeln wirken stärker als freie Verbindungen. Gegensätze (Feuer/Eis, Licht/Schatten, Erde/Wind, Wasser/Elektro) ergeben einen verbotenen Bruchklang.'));
  el.appendChild(h('h3', { class: 'gold', style: 'font-weight:normal;margin:4px 0' }, 'Entdeckte Formeln'));
  const l = h('div', { class: 'list' });
  if (!G.formulas.length) l.appendChild(h('div', { class: 'dim' }, 'Noch keine. Probiere im Kampf Kombinationen aus.'));
  for (const f of G.formulas) {
    const sp = resolveSpell(f.split('+') as never);
    if (!sp) continue;
    l.appendChild(h('div', { class: 'item' }, h('span', { class: 'name' }, sp.name, h('span', { class: 'tag' }, STAGE_NAME[sp.els.length])), h('span', { class: 'dim', style: 'font-size:12px;max-width:420px' }, sp.desc)));
  }
  el.appendChild(l);
  el.appendChild(h('h3', { class: 'gold', style: 'font-weight:normal;margin:10px 0 4px' }, 'Gerüchte über überlieferte Formeln'));
  el.appendChild(h('div', { class: 'dim', style: 'font-size:13px;line-height:1.5' },
    'Heilung (Licht + Wasser) · Dampfstoß (Feuer + Wasser) · Stille (Wind + Schatten) · Dornenwall (Erde + Dendro) · Kettenblitz (Wind + Elektro) · Sumpfgrab (Wasser + Erde + Dendro) · Bannlicht (Licht + Wind + Feuer) · Frostgewitter (Eis + Wind + Elektro) · Läuterung (Licht + Wasser + Erde + Dendro) · Aschesturm (Feuer + Wind + Erde + Schatten)'));
}

function renderQuests(el: HTMLElement): void {
  const l = h('div', { class: 'list' });
  for (const q of QUESTS) {
    const st = G.quests[q.id];
    if (st.status === 'offen') continue;
    const prog = q.kind === 'collect' ? `${Math.min(G.inv[q.target] ?? 0, q.goal)}/${q.goal}` : q.kind === 'kill' ? `${st.progress}/${q.goal}` : st.status === 'erfuellt' || st.status === 'abgegeben' ? 'gelöst' : 'offen';
    l.appendChild(h('div', { class: 'item' }, h('span', { class: 'name' }, q.name, h('span', { class: 'tag' }, 'Rang ' + q.rank)), h('span', { class: st.status === 'erfuellt' ? 'good' : 'dim' }, st.status === 'abgegeben' ? 'abgeschlossen' : st.status === 'erfuellt' ? 'erfüllt – zur Gilde!' : prog)));
  }
  if (!l.childNodes.length) l.appendChild(h('div', { class: 'dim' }, 'Keine angenommenen Aufträge. Das Brett hängt in der Abenteurergilde.'));
  el.appendChild(l);
}

function renderWorld(el: HTMLElement): void {
  el.appendChild(h('p', { style: 'margin-top:0' }, `Frist der Verlorenen Königin: noch ${queenDaysLeft(G.day)} Tage (bis Frostmond 139 n. S.). Wer sie vorher angreift, wird von der Dornenprinzessin verschlungen.`));
  if (G.blutmond > 0) el.appendChild(h('p', { class: 'blood' }, `Blutmond: noch ${G.blutmond} Tage. Physische Dungeons sind zu Blut-Dungeons geworden – dreifache Monster, kaum Rasträume.`));
  const l = h('div', { class: 'list' });
  for (const d of Object.values(G.dungeons)) {
    l.appendChild(h('div', { class: 'item' }, h('span', { class: 'name' }, d.name, h('span', { class: 'tag' }, `${d.type} · Rang ${d.shownRank}`)),
      h('span', { class: d.solved ? 'good' : d.broken ? 'blood' : d.frist <= 7 ? 'blood' : 'dim' }, d.solved ? 'gelöst' : d.broken ? 'AUSGEBROCHEN' : `Frist: ${d.frist} Tage`)));
  }
  el.appendChild(l);
  if (G.log.length) {
    el.appendChild(h('h3', { class: 'gold', style: 'font-weight:normal;margin:10px 0 4px' }, 'Chronik'));
    el.appendChild(h('div', { class: 'dim', style: 'font-size:13px' }, ...G.log.slice(0, 12).map((x) => h('div', {}, '· ' + x))));
  }
}

function renderCodex(el: HTMLElement): void {
  const c = h('div', { class: 'codex' });
  for (const s of CODEX) { c.appendChild(h('h3', {}, s.title)); for (const p of s.text) c.appendChild(h('p', {}, p)); }
  el.appendChild(c);
}

function renderSystem(el: HTMLElement, onTitle?: () => void): void {
  el.appendChild(h('div', { class: 'col', style: 'max-width:300px' },
    btn('Spiel speichern', () => { save(); toast('Gespeichert.'); }),
    btn('Ton an/aus', () => { toast(toggleMute() ? 'Ton aus' : 'Ton an'); }),
    onTitle ? btn('Zum Titelbildschirm', () => { save(); onTitle(); }) : null,
    h('div', { class: 'dim', style: 'font-size:12.5px;margin-top:8px;line-height:1.5' },
      'Steuerung: WASD/Pfeile bewegen · E/Leertaste interagieren · Esc Menü.', h('br', {}),
      'Kampf: Leertaste = Parieren (im Moment des Treffers, sehr knapp) · Umschalt = Ausweichen (etwas großzügiger). Goldene Angriffe kann man parieren, rote nur ausweichen.', h('br', {}),
      'Seitenansicht: Leertaste/W springen, W/S an Leitern klettern.')));
}

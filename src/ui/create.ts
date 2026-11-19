import type { Appearance, ClassId, RaceId, BeastKind, HairStyle, Beard, Build, Outfit, Gender } from '../data/types';
import { RACES, RACE_ORDER, BEASTS, CLASSES, CLASS_ORDER } from '../data/races';
import { EL_NAME } from '../data/magic';
import { TECHS } from '../data/world';
import { charPortrait } from '../gfx/chars';
import { h, btn, clear, UI } from './dom';
import { makeMember, stats } from '../core/state';
import type { Member } from '../data/types';

const HAIR = ['#1e1612', '#3b2a1c', '#6a4426', '#a8522a', '#c4622d', '#d8b060', '#e8d890', '#e8e0d8', '#8a8a8a', '#2a2a40', '#5a2a5a', '#2a4a3a'];
const EYES = ['#3b5a8a', '#3b5a3a', '#6a4426', '#d8a032', '#8a2a2a', '#7a3ab0', '#9ac8d8', '#c8c8c8'];
const CLOTH = ['#6a3a2a', '#3f5a3a', '#3a4a6a', '#4a2a5a', '#6c6f78', '#8a7a5a', '#2a2a2a', '#a83a2a', '#d8d0b8', '#2a5a5a'];
const STYLES: [HairStyle, string][] = [['kurz', 'Kurz'], ['scheitel', 'Scheitel'], ['wuschel', 'Wuschelig'], ['lang', 'Lang'], ['zopf', 'Zopf'], ['dutt', 'Dutt'], ['glatze', 'Glatze']];
const BEARDS: [Beard, string][] = [['keiner', 'Keiner'], ['stoppel', 'Stoppeln'], ['kurz', 'Kurz'], ['lang', 'Lang']];
const BUILDS: [Build, string][] = [['schmal', 'Schmal'], ['normal', 'Normal'], ['kraeftig', 'Kräftig']];
const OUTFITS: [Outfit, string][] = [['hose', 'Hose & Wams'], ['rock', 'Rock & Wams'], ['robe', 'Robe']];

export function openCreation(onDone: (m: Member) => void): void {
  let name = 'Namenlos';
  let cls: ClassId = 'speer';
  const app: Appearance = {
    gender: 'w', race: 'mensch', beast: 'wolf', skin: RACES.mensch.skins[1], hair: HAIR[2], hairStyle: 'zopf', eyes: EYES[1],
    beard: 'keiner', build: 'normal', outfit: 'hose', cloth: CLOTH[1], cloth2: '#2a2a32',
  };
  const root = h('div', { class: 'cc panel' });
  UI().appendChild(root);

  const render = () => {
    clear(root);
    const race = RACES[app.race];
    const prev = h('div', { class: 'preview' });
    const row = h('div', { class: 'row', style: 'gap:2px' });
    for (const d of [0, 1, 3]) row.appendChild(charPortrait(app, 3, d));
    prev.appendChild(h('div', { style: 'font-size:20px;color:var(--gold)' }, 'Erschaffe deine Figur'));
    const big = charPortrait(app, 6, 0);
    prev.appendChild(big);
    prev.appendChild(row);
    const nameIn = h('input', { type: 'text', value: name, maxlength: '18' }) as HTMLInputElement;
    nameIn.addEventListener('input', () => { name = nameIn.value; });
    nameIn.addEventListener('keydown', (e) => e.stopPropagation());
    prev.appendChild(nameIn);
    const tmp = makeMember('p', name, app, cls, 1, [...CLASSES[cls].elements, ...race.native], true);
    const s = stats(tmp);
    prev.appendChild(h('div', { class: 'infobox' },
      h('div', {}, h('b', {}, `${race.name} · ${CLASSES[cls].short}`)),
      h('div', {}, `LP ${s.hp} · Mana ${s.mp} · Angriff ${s.atk} · Vert. ${s.def} · Magie ${s.mag} · Tempo ${s.spd}`),
      h('div', {}, 'Mana-Rang: ', h('b', {}, race.mana2 ? `${race.mana2} + ${race.mana} (zwei Flüsse)` : race.mana)),
      h('div', {}, 'Elemente: ', h('b', {}, [...new Set(tmp.elements)].map((e) => EL_NAME[e]).join(', '))),
      h('div', {}, 'Techniken: ', h('b', {}, `${TECHS[race.tech].name}, ${TECHS[CLASSES[cls].tech].name}`)),
    ));
    prev.appendChild(h('div', { class: 'row', style: 'width:100%' },
      btn('Zufall', () => { randomize(app); cls = CLASS_ORDER[Math.floor(Math.random() * 5)]; render(); }),
      h('div', { class: 'grow' }),
      btn('Beginnen ▶', () => {
        const m = makeMember('p', (name.trim() || 'Namenlos').slice(0, 18), { ...app }, cls, 1, [...CLASSES[cls].elements, ...race.native], true);
        root.remove();
        onDone(m);
      }, { cls: 'sel' })));

    const opts = h('div', { class: 'opts' });
    const grp = (label: string, ...els: (HTMLElement | null)[]) => h('div', { class: 'grp' }, h('label', {}, label), ...els);
    const chips = <T extends string>(list: [T, string][], cur: T, set: (v: T) => void) =>
      h('div', { class: 'chips' }, ...list.map(([v, l]) => btn(l, () => { set(v); render(); }, { cls: 'small ' + (v === cur ? 'sel' : '') })));
    const swatches = (list: string[], cur: string, set: (v: string) => void) =>
      h('div', { class: 'chips' }, ...list.map((c) => { const s2 = h('div', { class: 'swatch' + (c === cur ? ' sel' : ''), style: `background:${c}` }); s2.addEventListener('click', () => { set(c); render(); }); return s2; }));

    opts.appendChild(grp('Geschlecht', chips<Gender>([['w', 'Weiblich'], ['m', 'Männlich']], app.gender, (v) => {
      app.gender = v;
      if (v === 'm' && app.hairStyle === 'zopf') app.hairStyle = 'kurz';
      if (v === 'w') app.beard = 'keiner';
    })));
    opts.appendChild(grp('Volk', chips<RaceId>(RACE_ORDER.map((r) => [r, RACES[r].name]), app.race, (v) => {
      app.race = v;
      if (!RACES[v].skins.includes(app.skin)) app.skin = RACES[v].skins[1];
    })));
    opts.appendChild(h('div', { class: 'infobox', style: 'margin-bottom:8px' },
      h('div', {}, h('b', {}, 'Magie: '), race.magic),
      h('div', {}, h('b', {}, 'Stellung: '), race.status),
      h('div', {}, h('b', {}, 'Gabe: '), race.passive),
      h('div', {}, h('b', {}, 'Dornen-Tattoo: '), race.tattoo)));
    if (race.ears === 'tier') opts.appendChild(grp('Tierart', chips<BeastKind>(Object.entries(BEASTS) as [BeastKind, string][], app.beast, (v) => { app.beast = v; })));
    opts.appendChild(grp('Hautton', swatches(race.skins, app.skin, (v) => { app.skin = v; })));
    opts.appendChild(grp(race.ears === 'tier' ? 'Haar- & Fellfarbe' : 'Haarfarbe', swatches(HAIR, app.hair, (v) => { app.hair = v; })));
    opts.appendChild(grp('Frisur', chips<HairStyle>(STYLES, app.hairStyle, (v) => { app.hairStyle = v; })));
    opts.appendChild(grp('Augenfarbe', swatches(EYES, app.eyes, (v) => { app.eyes = v; })));
    opts.appendChild(grp('Bart', chips<Beard>(BEARDS, app.beard, (v) => { app.beard = v; })));
    opts.appendChild(grp('Statur', chips<Build>(BUILDS, app.build, (v) => { app.build = v; })));
    opts.appendChild(grp('Kleidung', chips<Outfit>(OUTFITS, app.outfit, (v) => { app.outfit = v; })));
    opts.appendChild(grp('Kleiderfarbe', swatches(CLOTH, app.cloth, (v) => { app.cloth = v; })));
    opts.appendChild(grp('Zweitfarbe', swatches(['#2a2a32', '#3a2c1e', '#4a4a4a', '#5a4a3a', '#2a3a2a', '#3a2a3a'], app.cloth2, (v) => { app.cloth2 = v; })));
    opts.appendChild(grp('Rolle im Trupp', chips<ClassId>(CLASS_ORDER.map((c) => [c, CLASSES[c].short]), cls, (v) => { cls = v; })));
    opts.appendChild(h('div', { class: 'infobox' }, h('b', {}, CLASSES[cls].name + ': '), CLASSES[cls].desc));
    root.appendChild(prev);
    root.appendChild(opts);
  };
  render();
}

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function randomize(app: Appearance): void {
  app.gender = pick(['m', 'w'] as Gender[]);
  app.race = pick(RACE_ORDER);
  app.beast = pick(Object.keys(BEASTS) as BeastKind[]);
  app.skin = pick(RACES[app.race].skins);
  app.hair = pick(HAIR); app.eyes = pick(EYES);
  app.hairStyle = pick(STYLES)[0];
  app.beard = app.gender === 'm' ? pick(BEARDS)[0] : 'keiner';
  app.build = pick(BUILDS)[0]; app.outfit = pick(OUTFITS)[0];
  app.cloth = pick(CLOTH);
}

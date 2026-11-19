import { PB, shade, canvas } from './pixel';
import { mulberry32 } from '../core/state';

type Drawer = () => PB;

const aschhund: Drawer = () => {
  const p = new PB(26, 17);
  const r = mulberry32(5);
  const skin = '#6e6660';
  p.ellipse(14, 8, 8, 4, (x, y) => (r() < 0.25 ? '#8f877f' : y > 9 ? shade(skin, -0.2) : skin));
  // Kopf
  p.ellipse(5, 7, 4, 3, skin);
  p.rect(1, 8, 5, 2, '#4a4440');
  // glühendes Maul
  p.rect(1, 9, 5, 1, '#ff8a2a'); p.set(2, 9, '#ffd27a'); p.set(0, 9, '#ff8a2a');
  p.set(1, 8, '#f4f0e0'); p.set(3, 8, '#f4f0e0'); p.set(2, 10, '#f4f0e0'); p.set(4, 10, '#f4f0e0');
  // Ohren ohne Augen
  p.set(6, 3, skin); p.set(7, 3, skin); p.set(7, 4, skin);
  // Beine
  for (const lx of [8, 11, 17, 20]) { p.rect(lx, 11, 2, 4, shade(skin, -0.25)); p.set(lx, 15, '#3a3430'); p.set(lx + 1, 15, '#3a3430'); }
  // Schwanz
  p.line(22, 7, 25, 4, skin);
  // Rauch
  p.set(1, 5, '#9a9a9a'); p.set(0, 3, '#7a7a7a'); p.set(2, 2, '#6a6a6a');
  return p;
};

const kanalwuerger: Drawer = () => {
  const p = new PB(34, 20);
  const body = '#3f5248', belly = '#8a9a7e';
  for (let x = 2; x < 32; x++) {
    const cy = 9 + Math.sin(x / 4) * 3;
    const th = x < 6 ? 3 : x > 27 ? 2 : 4;
    for (let y = -th; y <= th; y++) p.set(x, cy + y, y > th - 2 ? belly : y < -th + 1 ? shade(body, 0.15) : body);
  }
  // Kopf: blind, Maul
  p.ellipse(3, 9, 3, 4, body); p.set(1, 10, '#1a0f0f'); p.set(2, 11, '#1a0f0f'); p.set(1, 11, '#e8e0d0');
  // sechs Hände
  const hand = '#d8c3a8';
  for (const hx of [8, 12, 16, 20, 24, 28]) {
    const cy = 9 + Math.sin(hx / 4) * 3 + 4;
    p.set(hx, cy + 1, hand); p.set(hx, cy + 2, hand); p.set(hx - 1, cy + 3, hand); p.set(hx + 1, cy + 3, hand); p.set(hx, cy + 3, hand);
  }
  return p;
};

const kreidekriecher: Drawer = () => {
  const p = new PB(26, 11);
  for (let i = 0; i < 8; i++) {
    const x = 3 + i * 2.7;
    p.ellipse(x, 5, 2, 2.5, i % 2 ? '#e6e1d6' : '#cfc8ba');
    p.set(x, 8, '#8a8070'); p.set(x - 1, 9, '#8a8070'); p.set(x + 1, 9, '#8a8070');
  }
  p.ellipse(2, 5, 2, 2, '#bdb4a3');
  p.set(0, 3, '#8a8070'); p.set(1, 2, '#8a8070');
  p.set(1, 6, '#3a2020');
  return p;
};

const hohlmann: Drawer = () => {
  const p = new PB(18, 26);
  const flesh = '#7d7266', dark = '#2a2420';
  p.rect(6, 2, 7, 7, flesh); p.set(7, 5, dark); p.set(8, 5, dark); p.set(10, 5, dark); p.set(11, 5, dark); p.rect(8, 7, 3, 1, dark);
  p.rect(5, 9, 9, 8, '#5f5a52'); p.rect(7, 11, 5, 4, dark); // hohl
  p.set(9, 12, '#c8b07a'); // Plakette
  p.rect(3, 10, 2, 8, flesh); p.rect(14, 10, 2, 8, flesh);
  p.rect(6, 17, 3, 7, '#4a443c'); p.rect(10, 17, 3, 7, '#4a443c');
  p.rect(5, 9, 9, 2, '#6a5a44'); // zerrissene Rüstung
  p.set(4, 18, flesh); p.set(15, 18, flesh);
  return p;
};

const kreidemutter: Drawer = () => {
  const p = new PB(72, 58);
  const r = mulberry32(9);
  p.ellipse(36, 34, 33, 22, (x, y) => {
    const n = r();
    if (n < 0.06) return '#c98b86';
    if (y > 46) return '#b8b0a2';
    return n < 0.5 ? '#e8e3d8' : '#dcd5c6';
  });
  // Fleischrisse
  for (let i = 0; i < 9; i++) { const x = 10 + r() * 52, y = 20 + r() * 26; p.line(x, y, x + r() * 6 - 3, y + 4, '#b5655e'); }
  // Halb geborene Hohlmänner auf dem Rücken
  for (const hx of [18, 30, 44, 54]) { p.rect(hx, 9 + (hx % 3), 4, 6, '#7d7266'); p.set(hx + 1, 11 + (hx % 3), '#2a2420'); p.set(hx + 2, 11 + (hx % 3), '#2a2420'); p.rect(hx - 1, 15, 6, 3, '#d8d0c0'); }
  // Maulöffnung
  p.ellipse(14, 40, 6, 4, '#3a2020'); p.ellipse(14, 40, 4, 2, '#5a2a28');
  for (const tx of [10, 13, 16, 19]) p.set(tx, 37, '#f4efe2');
  // Bauch mit Kriechern
  p.ellipse(36, 50, 12, 4, '#a89e8e');
  return p;
};

const flanke: Drawer = () => {
  const p = new PB(16, 16);
  p.ellipse(8, 8, 6, 7, '#c25a58');
  p.ellipse(8, 8, 4, 5, '#e07a72');
  p.ellipse(8, 8, 2, 3, '#ff9e94');
  p.line(3, 4, 13, 12, '#8f3a38');
  return p;
};

const sitzer: Drawer = () => {
  const p = new PB(18, 26);
  const robe = '#3b3530', robeD = '#28231f';
  p.ellipse(9, 7, 6, 6, robe);
  p.rect(3, 9, 12, 14, robe);
  for (let y = 9; y < 23; y++) p.set(14, y, robeD);
  p.rect(2, 22, 14, 2, robeD);
  // Gesichtsloses Loch mit Zahnkreis
  p.ellipse(9, 8, 3.5, 3.5, '#0e0b0a');
  for (let a = 0; a < 10; a++) p.set(9 + Math.cos(a * 0.63) * 3, 8 + Math.sin(a * 0.63) * 3, '#e8e0c8');
  p.ellipse(9, 8, 1, 1, '#4a1a1a');
  // Hände
  p.set(5, 18, '#b8a890'); p.set(13, 18, '#b8a890');
  return p;
};

const gloeckner: Drawer = () => {
  const p = new PB(54, 84);
  const grey = '#8c8a86', greyD = '#62605c', bronze = '#b8803a', bronzeD = '#7a5222';
  // Knochenkette von oben
  for (let y = 0; y < 10; y++) p.set(27, y, y % 3 === 0 ? '#e8e0c8' : '#b8b0a0');
  // Beine nach oben (kopfüber)
  p.rect(22, 10, 3, 18, grey); p.rect(29, 10, 3, 18, grey);
  p.rect(21, 9, 5, 2, greyD); p.rect(28, 9, 5, 2, greyD);
  // dürrer Rumpf
  p.rect(21, 28, 12, 20, grey);
  for (let y = 30; y < 46; y += 3) p.line(22, y, 31, y, greyD); // Rippen
  // Arme hängen herab
  p.rect(17, 30, 3, 26, grey); p.rect(34, 30, 3, 26, grey);
  p.rect(16, 56, 5, 4, greyD); p.rect(33, 56, 5, 4, greyD);
  // Glocke statt Kopf
  for (let y = 48; y < 78; y++) {
    const w = 5 + (y - 48) * 0.55;
    for (let x = 27 - w; x <= 27 + w; x++) p.set(x, y, x > 27 + w - 3 ? bronzeD : y > 74 ? bronzeD : (x + y) % 11 === 0 ? shade(bronze, 0.25) : bronze);
  }
  p.rect(10, 76, 34, 3, bronzeD);
  return p;
};

const kloeppel: Drawer = () => {
  const p = new PB(12, 22);
  const s = '#a8968a';
  p.set(6, 0, '#b8b0a0'); p.set(6, 1, '#b8b0a0');
  p.rect(4, 2, 5, 5, s); p.set(5, 4, '#2a2020'); p.set(7, 4, '#2a2020');
  p.rect(3, 7, 7, 8, '#5a5248');
  p.set(6, 9, '#c8b07a');
  p.rect(1, 8, 2, 7, s); p.rect(10, 8, 2, 7, s);
  p.rect(4, 15, 2, 6, '#4a443c'); p.rect(7, 15, 2, 6, '#4a443c');
  return p;
};

const blutgaenger: Drawer = () => {
  const p = new PB(18, 26);
  const r = mulberry32(3);
  const f = (x: number, y: number) => (r() < 0.3 ? '#d24a40' : y % 3 === 0 ? '#8a1e1a' : '#b02a24');
  p.ellipse(9, 5, 4, 4, f);
  p.set(8, 3, '#2a0808'); p.set(10, 3, '#2a0808'); // Hinterkopf mit Mund -> Kopf nach hinten
  p.rect(5, 9, 8, 9, '#b02a24');
  for (let y = 9; y < 18; y++) p.set(5 + (y % 2), y, '#d24a40');
  p.rect(3, 10, 2, 9, '#9a2420'); p.rect(13, 10, 2, 9, '#9a2420');
  p.rect(6, 18, 2, 7, '#8a1e1a'); p.rect(10, 18, 2, 7, '#8a1e1a');
  return p;
};

export const MONSTER_DRAWERS: Record<string, Drawer> = {
  m_aschhund: aschhund, m_kanalwuerger: kanalwuerger, m_kreidekriecher: kreidekriecher, m_hohlmann: hohlmann,
  m_kreidemutter: kreidemutter, m_flanke: flanke, m_sitzer: sitzer, m_gloeckner: gloeckner, m_kloeppel: kloeppel, m_blutgaenger: blutgaenger,
};

export function monsterCanvas(key: string): HTMLCanvasElement {
  const pb = MONSTER_DRAWERS[key]();
  pb.outline('#0d0907');
  const [c, ctx] = canvas(pb.w, pb.h);
  pb.draw(ctx, 0, 0);
  return c;
}

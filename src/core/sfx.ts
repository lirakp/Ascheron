// Synthetische Soundeffekte über WebAudio – keine Dateien nötig.
let ac: AudioContext | null = null;
let muted = false;
function ctx(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ac) ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch { return null; }
}
export function toggleMute(): boolean { muted = !muted; return muted; }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0, delay = 0): void {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol = 0.12, hp = 800, delay = 0): void {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start(t);
}

export const SFX = {
  hit: () => { noise(0.12, 0.18, 300); tone(140, 0.12, 'square', 0.06, -60); },
  crit: () => { noise(0.15, 0.22, 200); tone(220, 0.18, 'sawtooth', 0.08, -120); },
  parry: () => { tone(1400, 0.25, 'triangle', 0.12); tone(2100, 0.18, 'sine', 0.08); noise(0.05, 0.1, 3000); },
  dodge: () => { noise(0.18, 0.08, 1500); },
  hurt: () => { tone(180, 0.2, 'sawtooth', 0.08, -100); noise(0.1, 0.12, 200); },
  magic: () => { tone(500, 0.35, 'sine', 0.08, 700); tone(750, 0.3, 'triangle', 0.05, 500, 0.05); },
  heal: () => { tone(660, 0.2, 'sine', 0.07); tone(880, 0.25, 'sine', 0.07, 0, 0.1); tone(1100, 0.3, 'sine', 0.06, 0, 0.2); },
  bell: () => { [220, 440, 553, 660, 880].forEach((f, i) => tone(f, 2.2 - i * 0.3, 'sine', 0.09 / (i + 1))); },
  bruch: () => { noise(0.5, 0.25, 100); tone(90, 0.6, 'sawtooth', 0.12, -40); },
  step: () => { noise(0.03, 0.03, 1200); },
  ui: () => { tone(880, 0.06, 'square', 0.03); },
  coin: () => { tone(1320, 0.08, 'square', 0.04); tone(1760, 0.12, 'square', 0.04, 0, 0.07); },
  door: () => { noise(0.25, 0.08, 400); tone(90, 0.3, 'triangle', 0.08); },
  victory: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, 0, i * 0.12)); },
  defeat: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, 'triangle', 0.08, 0, i * 0.2)); },
  encounter: () => { tone(200, 0.15, 'sawtooth', 0.08); tone(300, 0.15, 'sawtooth', 0.08, 0, 0.1); tone(450, 0.25, 'sawtooth', 0.08, 0, 0.2); },
  fee: () => { [880, 1175, 1318, 1760].forEach((f, i) => tone(f, 1.2, 'sine', 0.05, 0, i * 0.18)); },
  heart: () => { tone(60, 0.15, 'sine', 0.3); tone(55, 0.2, 'sine', 0.25, 0, 0.22); },
  level: () => { [523, 784, 1046].forEach((f, i) => tone(f, 0.3, 'sine', 0.07, 0, i * 0.09)); },
};

// Efeitos sonoros simples feitos com WebAudio (sem arquivos de som).

const KEY = 'amda_mudo';
let ctx = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* sem armazenamento */ }

function audio() {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.1, slide = 0 } = {}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

let lastCoin = 0;

export const sfx = {
  buy() { tone(420, 0, 0.09, { type: 'triangle' }); tone(630, 0.06, 0.12, { type: 'triangle' }); },
  merge() { tone(523, 0, 0.1, { type: 'triangle', vol: 0.13 }); tone(659, 0.08, 0.1, { type: 'triangle', vol: 0.13 }); tone(880, 0.16, 0.2, { type: 'triangle', vol: 0.13 }); },
  launch() { tone(260, 0, 0.28, { type: 'sawtooth', vol: 0.05, slide: 720 }); },
  land() { tone(520, 0, 0.2, { type: 'sine', vol: 0.07, slide: 240 }); },
  coin() {
    const now = performance.now();
    if (now - lastCoin < 180) return;
    lastCoin = now;
    tone(1320, 0, 0.07, { type: 'square', vol: 0.025 });
    tone(1760, 0.05, 0.1, { type: 'square', vol: 0.025 });
  },
  crate() { tone(330, 0, 0.08, { type: 'square', vol: 0.05 }); tone(660, 0.07, 0.14, { type: 'square', vol: 0.05 }); },
  sell() { tone(700, 0, 0.1, { type: 'triangle' }); tone(500, 0.08, 0.14, { type: 'triangle' }); },
  boost() { tone(300, 0, 0.5, { type: 'sawtooth', vol: 0.06, slide: 1200 }); },
  error() { tone(160, 0, 0.16, { type: 'square', vol: 0.05 }); },
  fanfare() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.22, { type: 'triangle', vol: 0.13 }));
  },
};

export const isMuted = () => muted;

export function setMuted(value) {
  muted = !!value;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* sem armazenamento */ }
}

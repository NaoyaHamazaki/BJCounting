// Web Audio API で、その場で合成するシンプルな効果音(音声ファイルは使わない)

let ctx: AudioContext | null = null;
let muted = false;

const STORAGE_KEY = 'prob21-muted';
try {
  muted = localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  /* ストレージが使えない環境では、音ありで始める */
}

export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 単音。type の波形で、start 秒後から dur 秒鳴らす */
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** ノイズ(カードがこすれる音) */
function noise(start: number, dur: number, vol = 0.25, freq = 2500) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = a.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t);
}

export const sfx = {
  card: () => noise(0, 0.07, 0.35, 3000),
  chip: () => {
    tone(2400, 0, 0.05, 'triangle', 0.12);
    tone(3100, 0.03, 0.05, 'triangle', 0.08);
  },
  shuffle: () => {
    for (let i = 0; i < 8; i++) noise(i * 0.06, 0.06, 0.25, 2000 + i * 150);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.16)),
  blackjack: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.16));
    tone(1568, 0.45, 0.6, 'sine', 0.12);
  },
  push: () => {
    tone(587, 0, 0.18, 'sine', 0.14);
    tone(587, 0.2, 0.25, 'sine', 0.12);
  },
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.3, 'sawtooth', 0.07)),
  click: () => tone(880, 0, 0.04, 'square', 0.05),
  correct: () => {
    tone(880, 0, 0.12, 'sine', 0.16);
    tone(1319, 0.1, 0.25, 'sine', 0.16);
  },
  wrong: () => {
    tone(220, 0, 0.18, 'square', 0.06);
    tone(185, 0.16, 0.3, 'square', 0.06);
  },
  finish: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.22, 'triangle', 0.14)),
};

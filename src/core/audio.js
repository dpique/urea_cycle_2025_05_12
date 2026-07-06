// src/core/audio.js
// Minimal WebAudio synth for feedback blips. No assets, no dependencies. The context is
// created lazily on the first user gesture so browsers do not block it.

let actx = null;
let master = null;
let muted = false;

function ensure() {
  if (actx) return actx;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = 0.25;
    master.connect(actx.destination);
  } catch {
    actx = null;
  }
  return actx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.25;
  return muted;
}
export function toggleMute() {
  return setMuted(!muted);
}

function tone(freq, dur = 0.12, type = 'sine', when = 0, gain = 0.6) {
  const c = ensure();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + when;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function blip(freq = 520) {
  tone(freq, 0.1, 'triangle', 0, 0.5);
}
export function pickup() {
  tone(660, 0.08, 'square', 0, 0.35);
  tone(880, 0.1, 'square', 0.06, 0.3);
}
export function success() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', i * 0.09, 0.4));
}
export function fail() {
  tone(220, 0.18, 'sawtooth', 0, 0.3);
  tone(180, 0.22, 'sawtooth', 0.08, 0.25);
}
export function portal() {
  tone(330, 0.3, 'sine', 0, 0.3);
  tone(495, 0.35, 'sine', 0.1, 0.25);
}

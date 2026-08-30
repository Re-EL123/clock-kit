import { reducedMotion } from './motion.js';
import { armBusy } from './busy.js';

export const SOUNDS_KEY = 'ck_sounds';
let ctx;

export function soundsPreference(storage) {
  try {
    const store = storage || localStorage;
    return store.getItem(SOUNDS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on, storage) {
  try {
    (storage || localStorage).setItem(SOUNDS_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function soundsEnabled(storage) {
  return soundsPreference(storage) && !reducedMotion();
}

function enabled() {
  return soundsEnabled();
}

function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(context, { freq, duration = 0.12, type = 'sine', gain = 0.07, delay = 0, slide = 0 }) {
  const t0 = context.currentTime + delay;
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.018);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp);
  amp.connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSound(kind = 'tap') {
  if (!enabled()) return;
  const context = audio();
  if (!context) return;
  if (kind === 'tap') {
    tone(context, { freq: 620, duration: 0.07, gain: 0.045, type: 'triangle' });
    return;
  }
  if (kind === 'ok') {
    tone(context, { freq: 523.25, duration: 0.12, gain: 0.06 });
    tone(context, { freq: 659.25, duration: 0.16, gain: 0.05, delay: 0.08 });
    tone(context, { freq: 783.99, duration: 0.22, gain: 0.04, delay: 0.16 });
    return;
  }
  if (kind === 'err') {
    tone(context, { freq: 220, duration: 0.18, gain: 0.07, type: 'square', slide: -80 });
    tone(context, { freq: 164, duration: 0.22, gain: 0.05, delay: 0.1, type: 'square' });
    return;
  }
  if (kind === 'notify' || kind === 'clock') {
    tone(context, { freq: 698.46, duration: 0.14, gain: 0.06 });
    tone(context, { freq: 880, duration: 0.2, gain: 0.05, delay: 0.12 });
  }
}

let armed = false;

export function armSounds() {
  armBusy();
  if (armed) return;
  armed = true;
  const unlock = () => {
    audio();
  };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('pointerdown', (ev) => {
    const pressable = ev.target.closest('.btn, .nav-link, .mobile-nav a, .mobile-nav button, .stat');
    if (!pressable) return;
    pressable.classList.add('is-pressed');
    const clear = () => {
      if (!pressable.classList.contains('is-busy')) pressable.classList.remove('is-pressed');
    };
    pressable.addEventListener('pointerup', clear, { once: true });
    pressable.addEventListener('pointerleave', clear, { once: true });
    pressable.addEventListener('pointercancel', clear, { once: true });
    playSound('tap');
  });
}

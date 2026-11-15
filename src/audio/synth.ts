// Web Audio API procedural synth: mechanical clicks & memory alerts
// Zero external audio files. Early-return when muted.

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
  if (audioCtx) {
    if (muted) audioCtx.suspend();
    else audioCtx.resume();
  }
}

export function isMutedEnabled(): boolean {
  return isMuted;
}

function playTone(opts: {
  type: OscillatorType;
  freq: number;
  duration: number;
  when?: number;
  volume?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
  freqRamp?: { from: number; to: number; duration: number };
}): void {
  if (isMuted || !audioCtx) return;
  const ctx = getCtx();
  const t = opts.when ?? ctx.currentTime;
  const dur = opts.duration;
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freqRamp?.from ?? opts.freq, t);
  if (opts.freqRamp) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqRamp.to, t + opts.freqRamp.duration);
  }
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(opts.volume ?? 0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
  osc.onended = () => {
    try { osc.disconnect(); } catch { /* noop */ }
    try { gain.disconnect(); } catch { /* noop */ }
  };
}

/** Swap / Defrag: tactile keycap click - triangle 18ms, 620Hz -> 180Hz */
export function playSwapClick(): void {
  playTone({
    type: 'triangle',
    freq: 620,
    duration: 0.018,
    volume: 0.15,
    freqRamp: { from: 620, to: 180, duration: 0.018 },
  });
}

/** Compress / Merge: data zip chirp - sine 330Hz -> 880Hz 95ms + D6 1174.66Hz 40ms */
export function playCompressChirp(): void {
  if (isMuted || !audioCtx) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone({ type: 'sine', freq: 330, duration: 0.095, when: t, volume: 0.12, freqRamp: { from: 330, to: 880, duration: 0.095 } });
  playTone({ type: 'sine', freq: 1174.66, duration: 0.04, when: t + 0.095, volume: 0.1 });
}

/** Force Stop: process terminate thud - square lowpass 450Hz, 150Hz -> 55Hz 110ms */
export function playForceStopThud(): void {
  if (isMuted || !audioCtx) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.11);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 450;
  filter.Q.value = 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.11);
  osc.onended = () => {
    try { osc.disconnect(); } catch { /* noop */ }
    try { filter.disconnect(); } catch { /* noop */ }
    try { gain.disconnect(); } catch { /* noop */ }
  };
}

/** Memory Warning: 85%+ RAM alert - 2x sine 784Hz (G5) 35ms with 45ms gap */
export function playMemoryWarning(): void {
  if (isMuted || !audioCtx) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone({ type: 'sine', freq: 784, duration: 0.035, when: t, volume: 0.15 });
  playTone({ type: 'sine', freq: 784, duration: 0.035, when: t + 0.08, volume: 0.15 });
}

export function resumeAudio(): void {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, startOffset: number, duration: number, gainPeak = 0.12): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playGentleChime(enabled: boolean): void {
  if (!enabled) return;
  // Warm C5 -> E5 -> G5 soft bell chord
  playTone(523.25, 0, 0.35, 0.1);
  playTone(659.25, 0.12, 0.4, 0.1);
  playTone(783.99, 0.24, 0.55, 0.09);
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([25, 40, 25]);
  }
}

export function playTapConfirm(enabled: boolean): void {
  if (!enabled) return;
  playTone(587.33, 0, 0.14, 0.07);
  playTone(880, 0.06, 0.18, 0.06);
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(15);
  }
}

export function playRefocusNudge(enabled: boolean): void {
  if (!enabled) return;
  playTone(440, 0, 0.25, 0.08);
  playTone(523.25, 0.14, 0.3, 0.08);
}

/** Tiny, subtle Web Audio feedback. Only plays after a user gesture has unlocked the AudioContext. */
type Kind = "perfect" | "good" | "miss" | "safety" | "done" | "tick" | "finish";

let ctx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio() {
  if (unlocked) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    void ctx.resume();
    unlocked = true;
  } catch {
    /* no audio */
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.06) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function playSound(kind: Kind) {
  if (!unlocked || !ctx) return;
  try {
    switch (kind) {
      case "perfect": tone(784, 0, 0.18); tone(1175, 0.09, 0.25); break;
      case "good": tone(660, 0, 0.2); break;
      case "miss": tone(220, 0, 0.22, "triangle", 0.05); break;
      case "safety": tone(196, 0, 0.3, "square", 0.025); tone(185, 0.18, 0.35, "square", 0.025); break;
      case "done": tone(523, 0, 0.15); tone(659, 0.08, 0.15); tone(784, 0.16, 0.3); break;
      case "tick": tone(1046, 0, 0.06, "sine", 0.025); break;
      case "finish": tone(523, 0, 0.2); tone(659, 0.12, 0.2); tone(784, 0.24, 0.2); tone(1046, 0.36, 0.4); break;
    }
  } catch {
    /* ignore */
  }
}

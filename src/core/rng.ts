/** Deterministic RNG helpers. Every random decision derives a fresh generator from the
 * state seed + day + a salt string, so the core stays pure and replayable. */

export function hashString(str: string): number {
  // cyrb53-ish 32-bit hash
  let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

export interface Rng {
  /** [0,1) */
  next(): number;
  int(min: number, max: number): number; // inclusive
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => (max <= min ? min : min + Math.floor(next() * (max - min + 1))),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
  return rng;
}

/** RNG for a given state context. */
export function rngFor(s: { seed: number; day: number; today?: { servicesCompleted: number } }, salt: string): Rng {
  const sc = s.today?.servicesCompleted ?? 0;
  return makeRng(hashString(`${s.seed}|${s.day}|${sc}|${salt}`));
}

/** RNG that only depends on seed + day + salt (stable across the whole day). */
export function rngDay(s: { seed: number; day: number }, salt: string): Rng {
  return makeRng(hashString(`${s.seed}|${s.day}|${salt}`));
}

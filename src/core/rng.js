/**
 * Deterministic pseudo-random numbers (mulberry32).
 * Every generator owns its own stream, so the tank can be rebuilt identically
 * from its seed no matter what else the page has done.
 */
export function createRng(seed = 1) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max]. */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    /** Roughly normal, mean 0, standard deviation 1. */
    gauss: () => (next() + next() + next() + next() - 2) * 0.8660254,
    /** 0..1 biased towards 1 when `power` < 1, towards 0 when `power` > 1. */
    bias: (power = 1) => Math.pow(next(), power),
  };
}

// A small seeded random generator (mulberry32) so screenshot scenes and
// the city layout are deterministic for a given seed. Revision 3 adds
// jitter: a seeded value around a base, used for per-car pace so traffic
// seeded for a screenshot does not move in lockstep.

export function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keep the starter's name as an alias: older callers used createRandom. */
export function createRandom(seed) {
  return makeRandom(seed);
}

/** Pick one item from `list` with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** A number in [min, max) from the seeded generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** A seeded value around `base`, within ±`amount`. */
export function jitter(random, base, amount) {
  return base + (random() - 0.5) * 2 * amount;
}

/** A shuffled copy of `list`, drawn with the seeded generator. */
export function shuffle(random, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

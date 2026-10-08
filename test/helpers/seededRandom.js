// Runs `fn` with Math.random replaced by a small deterministic generator (mulberry32),
// so tests over crit / hit / block rolls do not flake. Restores Math.random afterwards.
export default function withSeed(seed, fn) {
  const original = Math.random;
  let state = seed | 0;
  Math.random = () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

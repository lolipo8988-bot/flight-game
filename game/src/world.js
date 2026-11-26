// world.js — the Alder Valley: seeded terrain, rings, parcels, balloons
// and the runway. Everything is generated from one seed per sortie, so
// the same sortie always flies the same valley.
import { ALT, SORTIES } from './config.js';

/** Tiny deterministic PRNG (mulberry32) so sorties are reproducible. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build one sortie's valley. distance is the sortie length in feet;
 * rings sit along it in order, parcels between them, balloons as hazards,
 * and the runway waits at the far end on flat ground.
 */
export function buildWorld(sortieIndex) {
  const def = SORTIES[sortieIndex];
  const rng = makeRng(20261126 + sortieIndex * 7919);
  // Rolling ridge profile: a few sine hills whose heights grow per sortie.
  const hills = [];
  const hillCount = 3 + sortieIndex;
  for (let i = 0; i < hillCount; i += 1) {
    hills.push({
      wavelength: 2600 + rng() * 2600,
      amplitude: 120 + rng() * (90 + sortieIndex * 70),
      phase: rng() * Math.PI * 2,
    });
  }
  const base = 60 + sortieIndex * 30;
  /** Terrain height in feet at distance d along the sortie. */
  function terrainAt(d) {
    if (d > def.distance - 700) return base * 0.4; // flat approach to the runway
    let h = base;
    for (const hill of hills) h += hill.amplitude * (0.5 + 0.5 * Math.sin((d / hill.wavelength) * Math.PI * 2 + hill.phase));
    return h;
  }
  /** Highest ground over a stretch of valley: a ring or parcel must clear
   * the hills on its whole approach, not just the ground beneath it. */
  function maxTerrain(d0, d1) {
    let m = 0;
    for (let d = Math.max(0, d0); d <= d1; d += 100) m = Math.max(m, terrainAt(d));
    return m;
  }
  const rings = [];
  for (let i = 0; i < def.rings; i += 1) {
    const d = 1200 + ((def.distance - 2600) * (i + 0.5)) / def.rings;
    const ground = maxTerrain(d - 900, d + 100);
    // Alternate low and high bands so consecutive rings never sit on top
    // of each other: the pilot climbs and dives between rings.
    const band = 300 + (i % 2) * 260 + rng() * 300;
    const alt = Math.min(ALT.max - 60, Math.max(ground + 150, band));
    rings.push({ d, alt, lateral: -260 + rng() * 520, passed: false, perfect: false });
  }
  const parcels = [];
  for (let i = 0; i < def.parcels; i += 1) {
    const d = 900 + ((def.distance - 2400) * (i + 0.7)) / def.parcels;
    const ground = maxTerrain(d - 700, d + 100);
    parcels.push({ d, alt: Math.min(ALT.max - 90, ground + 130 + rng() * 380), lateral: -300 + rng() * 600, taken: false });
  }
  const balloons = [];
  for (let i = 0; i < def.balloons; i += 1) {
    const d = 1600 + ((def.distance - 3000) * (i + 0.5)) / def.balloons;
    const ground = maxTerrain(d - 500, d + 100);
    balloons.push({ d, alt: Math.min(1080, ground + 200 + rng() * 420), lateral: -280 + rng() * 560, bob: rng() * Math.PI * 2, hit: false });
  }
  // A river and a road cross the valley at fixed distances, for landmarks.
  const riverD = def.distance * 0.38;
  const roadD = def.distance * 0.66;
  const townD = def.distance * 0.55;
  return { def, sortieIndex, terrainAt, rings, parcels, balloons, riverD, roadD, townD };
}

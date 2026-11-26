// shots.js — deterministic scenes for the maker's own screenshots. When
// the page is opened with ?shot=<name>, main.js stages one frozen moment
// of real play (real rings, a real runway approach, a real landing) and
// stops the clock, so a headless browser can photograph the game's own
// rendering exactly as a player would see it mid-flight.
import { startSortie, SCREEN_SORTIE_END } from './state.js';

function place(state, { d, alt, lateral, speed, throttle, fuel, hull, score, rings, parcels, combo }) {
  state.plane.d = d;
  state.plane.alt = alt;
  state.plane.lateral = lateral;
  state.plane.speed = speed;
  state.plane.throttle = throttle;
  state.plane.bank = lateral === 0 ? 0 : Math.sign(lateral) * 0.3;
  state.plane.heading = 90 + state.plane.bank * 12;
  state.fuel = fuel;
  state.hull = hull;
  state.score = score;
  state.combo = combo;
  state.bestCombo = combo;
  state.ringsPassed = rings;
  state.parcelsTaken = parcels;
  state.invulnerable = 0;
  state.trail = [{ age: 0.1 }, { age: 0.25 }, { age: 0.4 }];
  for (let i = 0; i < rings; i += 1) state.world.rings[i].passed = true;
  for (let i = 0; i < parcels; i += 1) state.world.parcels[i].taken = true;
}

export function stageShot(state, name) {
  startSortie(state, 0);
  if (name === 'cover') {
    // Mid-sortie: two rings banked, third ring glowing ahead, mail in sight.
    place(state, { d: 3400, alt: 600, lateral: 80, speed: 128, throttle: 0.66, fuel: 82, hull: 100, score: 275, rings: 2, parcels: 1, combo: 2 });
    state.toast = 'Sortie 1 — Meadow Run: fly every ring, then land on the strip.';
    state.toastT = 99;
    return true;
  }
  if (name === 'ring') {
    // Lined up on the next ring, balloon hazard just beyond it.
    const next = state.world.rings[2];
    place(state, { d: next.d - 320, alt: next.alt, lateral: next.lateral * 0.4, speed: 142, throttle: 0.78, fuel: 71, hull: 100, score: 350, rings: 2, parcels: 1, combo: 2 });
    state.message = 'RING 3 — THREAD THE NEEDLE';
    state.messageT = 99;
    state.toastT = 0;
    return true;
  }
  if (name === 'land') {
    // Final approach: all rings done, runway ahead, gear-down slow flight.
    const dist = state.world.def.distance;
    place(state, { d: dist - 1500, alt: 260, lateral: 10, speed: 96, throttle: 0.34, fuel: 38, hull: 92, score: 1180, rings: 5, parcels: 3, combo: 4 });
    state.message = 'ALL RINGS — LAND AT ALDER FIELD';
    state.messageT = 99;
    state.toastT = 0;
    return true;
  }
  if (name === 'end') {
    // Landed: the sortie-end panel over the valley.
    const dist = state.world.def.distance;
    place(state, { d: dist, alt: state.world.terrainAt(dist), lateral: 0, speed: 0, throttle: 0, fuel: 31, hull: 92, score: 1740, rings: 5, parcels: 3, combo: 4 });
    state.screen = SCREEN_SORTIE_END;
    state.toastT = 0;
    return true;
  }
  return false;
}

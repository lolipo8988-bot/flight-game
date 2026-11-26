// state.js — the facts of a flight: the plane, the sortie, the score.
// Pure data plus the small helpers that start a sortie and bank points;
// the frame loop in main.js owns the physics.
import { ALT, FUEL, PLANE, SCORE, SORTIES, SPEED } from './config.js';
import { buildWorld } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_SORTIE_END = 'sortieEnd';
export const SCREEN_GAME_OVER = 'gameOver';
export const SCREEN_VICTORY = 'victory';

export function createState() {
  return {
    screen: SCREEN_TITLE,
    sortie: 0,
    world: null,
    // The plane: distance along the sortie (ft), altitude (ft), lateral
    // offset across the screen (px from centre), speed (kt), throttle 0..1.
    plane: { d: 0, alt: ALT.cruise, lateral: 0, speed: SPEED.cruise, throttle: 0.62, bank: 0, heading: 90 },
    fuel: FUEL.max,
    hull: PLANE.hull,
    score: 0,
    combo: 0,
    bestCombo: 0,
    ringsPassed: 0,
    parcelsTaken: 0,
    landings: 0,
    time: 0,
    wind: 0,
    message: '',
    messageT: 0,
    toast: '',
    toastT: 0,
    shake: 0,
    invulnerable: 0,
    stalled: false,
    landed: false,
    crashed: false,
    cause: '',
    floaters: [],
    trail: [],
    clouds: [],
    best: 0,
    muted: false,
    stats: { rings: 0, parcels: 0, perfect: 0 },
  };
}

/** Start (or restart) a sortie: fresh valley, full tanks per the sortie. */
export function startSortie(state, sortieIndex) {
  const world = buildWorld(sortieIndex);
  state.world = world;
  state.sortie = sortieIndex;
  // Spawn high enough to clear the ridge at the start of the valley.
  const spawnAlt = Math.max(ALT.cruise, world.terrainAt(0) + 280);
  state.plane = { d: 0, alt: spawnAlt, lateral: 0, speed: SPEED.cruise, throttle: 0.62, bank: 0, heading: 90 };
  state.fuel = world.def.fuel;
  state.hull = PLANE.hull;
  state.ringsPassed = 0;
  state.parcelsTaken = 0;
  state.combo = 0;
  state.time = 0;
  state.wind = world.def.wind;
  state.landed = false;
  state.crashed = false;
  state.cause = '';
  state.invulnerable = 1.5;
  state.floaters = [];
  state.trail = [];
  state.clouds = [];
  for (let i = 0; i < 9; i += 1) {
    state.clouds.push({ x: Math.random() * 1280, y: 40 + Math.random() * 220, s: 0.5 + Math.random() * 0.9, v: 6 + Math.random() * 10 });
  }
  state.screen = SCREEN_PLAY;
  setToast(state, `${world.def.name} — fly every ring, then land on the strip.`);
}

export function setToast(state, text) {
  state.toast = text;
  state.toastT = 4;
}

export function setMessage(state, text) {
  state.message = text;
  state.messageT = 2.2;
}

export function floater(state, x, y, text, color = '#ffd873') {
  state.floaters.push({ x, y, text, t: 0, color });
}

/** Bank ring points: combo grows per ring in a row, resets on a miss. */
export function bankRing(state, perfect) {
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const mult = 1 + Math.min(state.combo - 1, 4) * 0.25;
  const pts = Math.round((SCORE.ring + (perfect ? SCORE.perfectRing : 0)) * mult);
  state.score += pts;
  state.ringsPassed += 1;
  state.stats.rings += 1;
  if (perfect) state.stats.perfect += 1;
  state.fuel = Math.min(FUEL.max, state.fuel + FUEL.ringBonus);
  return pts;
}

export function bankParcel(state) {
  state.score += SCORE.parcel;
  state.parcelsTaken += 1;
  state.stats.parcels += 1;
  state.fuel = Math.min(FUEL.max, state.fuel + FUEL.parcelBonus);
}

export function sortieName(state) {
  return state.world ? SORTIES[state.sortie].name : '';
}

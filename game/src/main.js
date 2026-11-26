// main.js — Sky Courier's frame loop: what every key does, the flight
// model (throttle, climb, stall, wind), ring and parcel pickups, balloon
// hits, terrain, fuel, and the landing that ends each sortie.
import { ALT, BEST_KEY, FUEL, FIELD, PLANE, SCORE, SORTIES, SPEED, STEP } from './config.js';
import { SoundSky } from './audio.js';
import { createInput, pitchInput, rollInput, throttleInput } from './input.js';
import { altToY, distToX, drawScene } from './render.js';
import { bankParcel, bankRing, createState, floater, setMessage, setToast, startSortie, SCREEN_GAME_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_SORTIE_END, SCREEN_TITLE, SCREEN_VICTORY } from './state.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const sound = new SoundSky();
const input = createInput(canvas);
const state = createState();
state.best = Number(window.localStorage?.getItem(BEST_KEY) ?? 0) || 0;

function announce(msg) { if (status) status.textContent = msg; }

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    try { window.localStorage?.setItem(BEST_KEY, String(state.best)); } catch { /* private mode */ }
  }
}

function gameOver(cause) {
  state.crashed = true;
  state.cause = cause;
  state.screen = SCREEN_GAME_OVER;
  saveBest();
  sound.thud();
  announce(`Flight over. ${cause}`);
}

function landPlane() {
  const p = state.plane;
  const bonus = SCORE.landing + Math.round(state.fuel) * 2 + Math.round(state.hull);
  state.score += bonus;
  state.landings += 1;
  state.landed = true;
  sound.land();
  floater(state, 470, altToY(p.alt) - 40, `LANDED +${bonus}`, '#7ddb7d');
  saveBest();
  if (state.sortie >= SORTIES.length - 1) {
    state.screen = SCREEN_VICTORY;
    announce('All sorties complete. Courier of the Valley!');
  } else {
    state.screen = SCREEN_SORTIE_END;
    announce(`${SORTIES[state.sortie].name} complete.`);
  }
}

/** One fixed physics step while the plane is in the air. */
function stepFlight(dt) {
  const p = state.plane;
  const world = state.world;
  const def = world.def;
  state.time += dt;
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.shake = Math.max(0, state.shake - dt * 2.4);
  state.toastT = Math.max(0, state.toastT - dt);
  state.messageT = Math.max(0, state.messageT - dt);
  for (const f of state.floaters) f.t += dt;
  state.floaters = state.floaters.filter((f) => f.t < 1.4);

  // Throttle and speed.
  p.throttle = Math.max(0, Math.min(1, p.throttle + throttleInput(input) * dt * 0.45));
  const targetSpeed = SPEED.min + (SPEED.max - SPEED.min) * p.throttle + def.speedBonus;
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.7);
  const flare = input.keys.has('Space');
  if (flare) p.speed = Math.max(SPEED.min, p.speed - 26 * dt);

  // Pitch: climb when fast, sink when slow; a stall drops the nose.
  state.stalled = p.speed < SPEED.stall;
  const pitch = pitchInput(input, altToY(p.alt));
  let climb = pitch * PLANE.climbRate * Math.min(1, p.speed / SPEED.cruise);
  if (state.stalled) {
    climb -= PLANE.sinkRate * 1.6;
    if (Math.random() < dt * 2) sound.stall();
  } else if (p.speed < SPEED.cruise * 0.8) {
    climb -= PLANE.sinkRate * 0.35;
  }
  if (flare) climb *= 0.35;
  p.alt = Math.max(ALT.min, Math.min(ALT.max, p.alt + climb * dt));

  // Roll and heading; wind pushes the plane sideways.
  const roll = rollInput(input, 470 + p.lateral * 0.55);
  p.bank += (roll - p.bank) * Math.min(1, dt * 5);
  p.heading = (p.heading + p.bank * PLANE.turnRate * dt + 360) % 360;
  p.lateral = Math.max(-430, Math.min(430, p.lateral + roll * PLANE.lateralSpeed * dt + state.wind * dt * 2.2));
  if (Math.abs(p.lateral) > 420) p.lateral = Math.sign(p.lateral) * 420;

  // Forward motion: knots to feet per second, eased by bank.
  p.d += p.speed * 1.68781 * dt * (1 - Math.abs(p.bank) * 0.12);

  // Fuel: throttle-hungry, rings and mail pay some back.
  state.fuel -= (FUEL.burnBase + FUEL.burnThrottle * p.throttle) * dt;
  if (state.fuel <= 0) {
    state.fuel = 0;
    if (p.alt <= world.terrainAt(p.d) + 30) gameOver('Out of fuel over the valley — the Kestrel glided down short of the field.');
    else gameOver('Out of fuel. The Kestrel came down in the fields.');
    return;
  }

  // Exhaust trail.
  state.trail.push({ age: 0 });
  for (const t of state.trail) t.age += dt;
  state.trail = state.trail.filter((t) => t.age < 0.5);
  for (const c of state.clouds) {
    c.x -= (c.v + p.speed * 0.12) * dt;
    if (c.x < -120) { c.x = 1360; c.y = 40 + Math.random() * 220; }
  }

  const ground = world.terrainAt(p.d);
  const agl = p.alt - ground;
  const planeX = 470 + p.lateral * 0.55;
  const planeY = altToY(p.alt);

  // Rings: only the next one counts; centre passes are perfect.
  const next = world.rings.find((r) => !r.passed);
  if (next) {
    const rx = distToX(next.d, p.d, next.lateral);
    const ry = altToY(next.alt);
    if (Math.abs(p.d - next.d) < 55 && Math.abs(planeX - rx) < 62 && Math.abs(planeY - ry) < 52) {
      const perfect = Math.abs(planeY - ry) < 22 && Math.abs(planeX - rx) < 30;
      const pts = bankRing(state, perfect);
      next.passed = true;
      sound.ring();
      floater(state, planeX, planeY - 60, perfect ? `PERFECT +${pts}` : `RING +${pts}`);
      setMessage(state, world.rings.every((r) => r.passed) ? 'ALL RINGS — LAND AT ALDER FIELD' : `RING ${state.ringsPassed}/${def.rings}`);
    } else if (p.d > next.d + 60) {
      // Missed it: the combo breaks and the ring stays behind.
      next.passed = true;
      state.combo = 0;
      setMessage(state, 'RING MISSED — combo lost');
      sound.thud();
    }
  }

  // Mail bags.
  for (const parcel of world.parcels) {
    if (parcel.taken) continue;
    if (Math.abs(p.d - parcel.d) < 50 && Math.abs(planeX - distToX(parcel.d, p.d, parcel.lateral)) < 55 && Math.abs(planeY - altToY(parcel.alt)) < 55) {
      parcel.taken = true;
      bankParcel(state);
      sound.parcel();
      floater(state, planeX, planeY - 50, `MAIL +${SCORE.parcel}`, '#ffd873');
    }
  }

  // Balloons: a hit costs hull, with a short grace period after each one.
  for (const b of world.balloons) {
    if (b.hit) continue;
    if (Math.abs(p.d - b.d) < 46 && Math.abs(planeX - distToX(b.d, p.d, b.lateral)) < 52 && Math.abs(planeY - altToY(b.alt)) < 52) {
      b.hit = true;
      if (state.invulnerable <= 0) {
        state.hull -= PLANE.hitDamage;
        state.shake = 1;
        state.combo = 0;
        sound.thud();
        floater(state, planeX, planeY - 60, `BALLOON −${PLANE.hitDamage} HULL`, '#ff6b5e');
        state.invulnerable = 1.2;
        if (state.hull <= 0) { state.hull = 0; gameOver('A balloon took the wing off. The Kestrel is down.'); return; }
      }
    }
  }

  // Terrain: a hard hit ends the flight; a gentle scrape costs hull.
  if (agl <= 0) {
    const runwayNear = Math.abs(p.d - def.distance) < 500;
    const gentle = p.speed <= SPEED.landMax && Math.abs(climb) < 200;
    const ringsDone = world.rings.every((r) => r.passed);
    if (runwayNear && ringsDone) {
      if (gentle) {
        p.alt = ground;
        landPlane();
        return;
      }
      // A hard landing on the strip: it costs hull and bounces the plane
      // back up for another try, instead of ending the sortie outright.
      if (state.invulnerable <= 0) {
        state.hull -= 20;
        state.shake = 1;
        sound.thud();
        floater(state, planeX, planeY - 50, 'HARD LANDING −20 HULL', '#ff6b5e');
        setToast(state, 'Too fast or too steep — flare with Space before the strip.');
        state.invulnerable = 1.5;
        p.alt = ground + 80;
        p.speed = Math.min(p.speed, SPEED.landMax);
        if (state.hull <= 0) { state.hull = 0; gameOver('The landing broke the Kestrel.'); return; }
      } else {
        p.alt = ground + 80;
      }
      return;
    }
    if (p.speed > 150 || agl < -30) {
      gameOver(p.speed > 150 ? 'Into the ridge at full speed. The valley keeps the wreck.' : 'Clipped the ridge — the Kestrel did not pull up in time.');
      return;
    }
    if (state.invulnerable <= 0) {
      state.hull -= PLANE.scrapeDamage;
      state.shake = 0.8;
      sound.thud();
      floater(state, planeX, planeY - 50, `TERRAIN SCRAPE −${PLANE.scrapeDamage}`, '#ff6b5e');
      state.invulnerable = 1.5;
      p.alt = ground + 60;
      if (state.hull <= 0) { state.hull = 0; gameOver('The ridge won — hull gone.'); return; }
    } else {
      p.alt = ground + 60;
    }
  }

  // Past the runway without landing: overshot.
  if (p.d > def.distance + 500) gameOver('Overshot Alder Field — out of valley, out of luck.');
}

function step(dt) {
  if (input.consume('KeyM')) { state.muted = !state.muted; sound.muted = state.muted; setToast(state, state.muted ? 'Sound off' : 'Sound on'); }
  if (state.screen === SCREEN_TITLE) {
    state.time += dt;
    if (input.consume('Enter') || input.consume('Space')) { sound.ensure(); sound.click(); startSortie(state, 0); announce('Sortie 1. Fly the rings, then land.'); }
    return;
  }
  if (state.screen === SCREEN_PAUSE) {
    if (input.consume('KeyP') || input.consume('Enter')) { state.screen = SCREEN_PLAY; }
    if (input.consume('KeyR')) startSortie(state, state.sortie);
    return;
  }
  if (state.screen === SCREEN_SORTIE_END) {
    if (input.consume('Enter') || input.consume('Space')) { sound.click(); startSortie(state, state.sortie + 1); }
    return;
  }
  if (state.screen === SCREEN_VICTORY) {
    if (input.consume('Enter') || input.consume('Space')) { sound.click(); state.score = 0; state.stats = { rings: 0, parcels: 0, perfect: 0 }; state.bestCombo = 0; startSortie(state, 0); }
    return;
  }
  if (state.screen === SCREEN_GAME_OVER) {
    if (input.consume('KeyR')) { sound.click(); startSortie(state, state.sortie); }
    if (input.consume('Enter') || input.consume('Space')) { sound.click(); state.score = 0; state.stats = { rings: 0, parcels: 0, perfect: 0 }; state.bestCombo = 0; startSortie(state, 0); }
    return;
  }
  if (input.consume('KeyP') || input.consume('Escape')) { state.screen = SCREEN_PAUSE; sound.setHum(0, 0, false); return; }
  if (input.consume('KeyR')) { startSortie(state, state.sortie); return; }
  sound.ensure();
  sound.setHum(state.plane.throttle, state.plane.speed, true);
  stepFlight(dt);
}

// Screenshot staging: ?shot=cover|ring|land|end freezes a real moment.
const shotName = new URLSearchParams(window.location.search).get('shot');
let staged = false;
if (shotName) {
  staged = stageShot(state, shotName);
  if (staged) state.time = 12;
}

// Testing hook: the live state, for automated playthroughs.
window.SKY_COURIER = { get state() { return state; } };

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!staged) {
    let acc = dt;
    while (acc > 0) { const s = Math.min(STEP, acc); step(s); acc -= s; }
  }
  drawScene(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
announce('Sky Courier: press Enter to fly.');

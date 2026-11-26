// render.js — everything the pilot sees: sky, ridges, patchwork valley,
// the Kestrel in frame, glowing rings, the runway, and the instruments.
// One canvas, one style: flat colours, soft gradients, no images.
import { ALT, FIELD, PALETTE, SORTIES } from './config.js';
import { SCREEN_GAME_OVER, SCREEN_PAUSE, SCREEN_SORTIE_END, SCREEN_TITLE, SCREEN_VICTORY } from './state.js';

const W = FIELD.width;
const H = FIELD.height;
const FT_PER_PX = 9;          // feet of valley per screen pixel ahead
const HORIZON_Y = 330;        // where the far ridge sits
const PLANE_X = 470;          // the Kestrel's screen position

/** Screen y for an altitude in feet. */
export function altToY(alt) { return 600 - alt * 0.36; }
/** Screen x for a valley distance, relative to the plane; `lateral` is the
 * object's sideways offset across the valley, in the same units as the
 * plane's own lateral (the plane sits at PLANE_X + lateral * 0.55). */
export function distToX(d, planeD, lateral = 0) { return PLANE_X + lateral * 0.55 + (d - planeD) / FT_PER_PX; }

function sky(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Sun with a soft halo.
  const sx = 1050; const sy = 92;
  const halo = ctx.createRadialGradient(sx, sy, 8, sx, sy, 120);
  halo.addColorStop(0, 'rgba(255, 215, 106, 0.9)');
  halo.addColorStop(1, 'rgba(255, 215, 106, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sx - 130, sy - 130, 260, 260);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
  void time;
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 24 * s, y - 8 * s, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 48 * s, y, 20 * s, 0, Math.PI * 2);
  ctx.arc(x + 24 * s, y + 8 * s, 18 * s, 0, Math.PI * 2);
  ctx.fill();
}

function ridge(ctx, planeD, parallax, color, amp, baseY) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) {
    const d = planeD * parallax + x * 14;
    const y = baseY - (Math.sin(d * 0.0011) * 0.5 + Math.sin(d * 0.0027 + 1.7) * 0.3 + Math.sin(d * 0.006 + 4.1) * 0.2) * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

/** The valley floor: patchwork fields, river, road, town and runway. */
function ground(ctx, state) {
  const world = state.world;
  const planeD = state.plane.d;
  // Ground profile path, reused for the fill and as a clip for the patches
  // so no field stripe ever sticks up above the hills.
  function groundPath() {
    const path = new Path2D();
    path.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const d = planeD + (x - PLANE_X) * FT_PER_PX;
      path.lineTo(x, altToY(Math.max(0, world.terrainAt(Math.max(0, d)))));
    }
    path.lineTo(W, H);
    path.closePath();
    return path;
  }
  ctx.fillStyle = PALETTE.fieldA;
  ctx.fill(groundPath());
  // Field patches: stripes of colour along the ground profile, clipped.
  const patchColors = [PALETTE.fieldB, PALETTE.fieldC, PALETTE.fieldD, PALETTE.fieldA];
  ctx.save();
  ctx.clip(groundPath());
  for (let i = 0; i < 26; i += 1) {
    const d0 = Math.floor((planeD / 700) + i) * 700 - planeD;
    const x0 = PLANE_X + d0 / FT_PER_PX;
    if (x0 < -160 || x0 > W + 40) continue;
    const x1 = x0 + 700 / FT_PER_PX;
    const top = altToY(Math.max(0, world.terrainAt(Math.max(0, planeD + d0))));
    ctx.fillStyle = patchColors[((Math.floor((planeD + d0) / 700) % 4) + 4) % 4];
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x0, top, x1 - x0, H - top);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // River: a blue band where it crosses the valley.
  const riverX = distToX(world.riverD, planeD);
  if (riverX > -40 && riverX < W + 40) {
    ctx.strokeStyle = PALETTE.river;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(riverX - 30, altToY(world.terrainAt(world.riverD)) + 8);
    ctx.lineTo(riverX + 40, H);
    ctx.stroke();
  }
  // Road with a dashed centre line.
  const roadX = distToX(world.roadD, planeD);
  if (roadX > -40 && roadX < W + 40) {
    ctx.strokeStyle = PALETTE.road;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(roadX - 16, altToY(world.terrainAt(world.roadD)) + 4);
    ctx.lineTo(roadX + 22, H);
    ctx.stroke();
    ctx.strokeStyle = '#f5f0dc';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(roadX - 16, altToY(world.terrainAt(world.roadD)) + 4);
    ctx.lineTo(roadX + 22, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Town: a cluster of little houses with red roofs.
  const townX = distToX(world.townD, planeD);
  if (townX > -120 && townX < W + 120) {
    const gy = altToY(world.terrainAt(world.townD));
    for (let i = 0; i < 7; i += 1) {
      const hx = townX - 90 + i * 28;
      const hw = 22; const hh = 16 + ((i * 7) % 10);
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(hx, gy - hh, hw, hh);
      ctx.fillStyle = PALETTE.town;
      ctx.beginPath();
      ctx.moveTo(hx - 2, gy - hh);
      ctx.lineTo(hx + hw / 2, gy - hh - 10);
      ctx.lineTo(hx + hw + 2, gy - hh);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Runway at the end of the sortie, with threshold lights.
  const rwX = distToX(world.def.distance, planeD);
  if (rwX > -260 && rwX < W + 260) {
    const gy = altToY(world.terrainAt(world.def.distance));
    ctx.fillStyle = PALETTE.runway;
    ctx.fillRect(rwX - 130, gy - 6, 260, 14);
    ctx.fillStyle = PALETTE.runwayMark;
    for (let i = 0; i < 6; i += 1) ctx.fillRect(rwX - 110 + i * 40, gy - 2, 22, 4);
    ctx.fillStyle = '#7ddb7d';
    ctx.fillRect(rwX - 136, gy - 8, 6, 6);
    ctx.fillRect(rwX + 130, gy - 8, 6, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px ' + 'system-ui, sans-serif';
    ctx.fillText('ALDER FIELD', rwX - 48, gy - 16);
  }
}

function drawRing(ctx, ring, index, next, time) {
  const x = distToX(ring.d, currentPlaneD, ring.lateral);
  const y = altToY(ring.alt);
  if (x < -90 || x > W + 90) return;
  const pulse = next ? 1 + Math.sin(time * 5) * 0.06 : 1;
  const r = 52 * pulse;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.82);
  ctx.lineWidth = next ? 9 : 6;
  ctx.strokeStyle = ring.passed ? PALETTE.ringDone : next ? PALETTE.ringNext : PALETTE.ring;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = next ? 22 : 8;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(0, 0, r - 9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = ring.passed ? '#2c5a2c' : '#5a3d00';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1), x, y + 9);
  ctx.textAlign = 'left';
}

function drawParcel(ctx, p, time) {
  const x = distToX(p.d, currentPlaneD, p.lateral);
  const y = altToY(p.alt + Math.sin(time * 2 + p.d) * 8);
  if (x < -40 || x > W + 40 || p.taken) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 1.5 + p.d) * 0.15);
  ctx.fillStyle = '#c98f3d';
  ctx.fillRect(-13, -11, 26, 22);
  ctx.strokeStyle = '#7a4d16';
  ctx.lineWidth = 2;
  ctx.strokeRect(-13, -11, 26, 22);
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✉', 0, 5);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawBalloon(ctx, b, time) {
  const x = distToX(b.d, currentPlaneD, b.lateral);
  const y = altToY(b.alt + Math.sin(time * 1.2 + b.bob) * 14);
  if (x < -60 || x > W + 60 || b.hit) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e84c3d';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 32, 0, -0.5, 0.5); ctx.fill();
  ctx.strokeStyle = '#5a3d00';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(-4, 48); ctx.moveTo(8, 30); ctx.lineTo(4, 48); ctx.stroke();
  ctx.fillStyle = '#7a4d16';
  ctx.fillRect(-7, 48, 14, 10);
  ctx.restore();
}

/** The Kestrel: a red courier prop plane, drawn in side view, banking. */
function drawPlane(ctx, state, time) {
  const p = state.plane;
  const x = PLANE_X + p.lateral * 0.55;
  const y = altToY(p.alt);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.bank * 0.35 + Math.sin(time * 2.2) * 0.012);
  // Exhaust puffs.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const t of state.trail) {
    ctx.globalAlpha = Math.max(0, 0.5 - t.age);
    ctx.beginPath(); ctx.arc(-52 - t.age * 60, 4 + t.age * 8, 3 + t.age * 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Tail.
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.moveTo(-38, -2); ctx.lineTo(-58, -20); ctx.lineTo(-48, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PALETTE.planeTrim;
  ctx.fillRect(-52, -4, 16, 4);
  // Fuselage.
  ctx.fillStyle = PALETTE.plane;
  ctx.beginPath();
  ctx.moveTo(-52, -6);
  ctx.quadraticCurveTo(-10, -16, 34, -6);
  ctx.quadraticCurveTo(52, -2, 54, 4);
  ctx.quadraticCurveTo(30, 12, -8, 10);
  ctx.quadraticCurveTo(-44, 8, -52, -6);
  ctx.fill();
  // Cabin window + mail stripe.
  ctx.fillStyle = '#bfe3f5';
  ctx.beginPath(); ctx.ellipse(16, -6, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.planeTrim;
  ctx.fillRect(-40, 0, 82, 4);
  // Wing.
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.moveTo(-6, 2); ctx.lineTo(-26, 26); ctx.lineTo(-12, 28); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
  // Spinning prop.
  const a = time * 28;
  ctx.strokeStyle = 'rgba(60,40,30,0.75)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(54 + Math.cos(a) * 20, 2 + Math.sin(a) * 20);
  ctx.lineTo(54 - Math.cos(a) * 20, 2 - Math.sin(a) * 20);
  ctx.stroke();
  ctx.fillStyle = '#3c4148';
  ctx.beginPath(); ctx.arc(54, 2, 5, 0, Math.PI * 2); ctx.fill();
  // Nav lights.
  ctx.fillStyle = state.invulnerable > 0 && Math.floor(time * 6) % 2 === 0 ? '#ff6b5e' : '#7ddb7d';
  ctx.beginPath(); ctx.arc(-50, -8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

let currentPlaneD = 0;

function hudPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.18)') {
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, w * Math.max(0, Math.min(1, frac)), h, 4); ctx.fill();
}

function drawHud(ctx, state) {
  const p = state.plane;
  const world = state.world;
  const def = world.def;
  const agl = Math.max(0, Math.round(p.alt - world.terrainAt(p.d)));
  ctx.textAlign = 'left';
  // Top instrument bar.
  hudPanel(ctx, 16, 12, 1248, 64);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#9fb6cc';
  ctx.fillText('ALTITUDE', 34, 32);
  ctx.fillText('SPEED', 190, 32);
  ctx.fillText('HEADING', 330, 32);
  ctx.fillText('FUEL', 500, 32);
  ctx.fillText('HULL', 680, 32);
  ctx.fillText('THROTTLE', 850, 32);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`${Math.round(p.alt)} ft`, 34, 60);
  ctx.fillText(`${Math.round(p.speed)} kt`, 190, 60);
  ctx.fillText(`${String(Math.round(p.heading)).padStart(3, '0')}°`, 330, 60);
  bar(ctx, 500, 44, 150, 12, state.fuel / 100, state.fuel < 25 ? PALETTE.hudRed : PALETTE.hudGreen);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`${Math.round(state.fuel)}%`, 500, 70);
  bar(ctx, 680, 44, 140, 12, state.hull / 100, state.hull < 35 ? PALETTE.hudRed : PALETTE.hudGreen);
  ctx.fillText(`${Math.round(state.hull)}%`, 680, 70);
  bar(ctx, 850, 44, 150, 12, p.throttle, '#7fb2e0');
  ctx.fillText(`${Math.round(p.throttle * 100)}%`, 850, 70);
  // Score block.
  ctx.fillStyle = '#9fb6cc';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('SCORE', 1040, 32);
  ctx.fillText('RINGS', 1140, 32);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(String(state.score), 1040, 60);
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`${state.ringsPassed}/${def.rings}`, 1140, 60);
  // Compass strip.
  ctx.fillStyle = 'rgba(12,24,40,0.55)';
  ctx.fillRect(440, 84, 400, 26);
  ctx.fillStyle = '#9fb6cc';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let off = -60; off <= 60; off += 15) {
    const hdg = (Math.round(p.heading) + off + 360) % 360;
    const x = 640 + off * 3;
    ctx.fillText(off === 0 ? `▼ ${String(hdg).padStart(3, '0')}°` : String(hdg).padStart(3, '0'), x, 102);
  }
  ctx.textAlign = 'left';
  // Artificial horizon: a small round gauge showing bank and climb.
  ctx.save();
  ctx.translate(90, 150);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.clip();
  ctx.rotate(p.bank * 0.5);
  ctx.fillStyle = '#5fa8d8';
  ctx.fillRect(-42, -42 - p.bank * 8, 84, 42 + p.bank * 8);
  ctx.fillStyle = '#8a6a45';
  ctx.fillRect(-42, 0, 84, 42);
  ctx.restore();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(26, 0); ctx.stroke();
  ctx.fillStyle = '#9fb6cc';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AGL ' + agl + ' ft', 0, 62);
  ctx.textAlign = 'left';
  ctx.restore();
  // Sortie progress: distance to the runway.
  const frac = Math.max(0, Math.min(1, p.d / def.distance));
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath(); ctx.roundRect(1010, 88, 254, 44, 8); ctx.fill();
  ctx.fillStyle = '#9fb6cc';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('TO ALDER FIELD', 1022, 101);
  bar(ctx, 1022, 106, 230, 8, frac, PALETTE.hudAmber);
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`${Math.max(0, Math.round((def.distance - p.d) / 100) / 10)} nm to go`, 1022, 126);
  // Warnings.
  if (state.stalled) {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — THROTTLE UP, NOSE DOWN', 640, 170);
    ctx.textAlign = 'left';
  }
  if (state.fuel < 25 && state.screen === 'play') {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOW FUEL — FLY A RING', 640, 200);
    ctx.textAlign = 'left';
  }
  // Next-ring arrow when the ring is off screen.
  const next = world.rings.find((r) => !r.passed);
  if (next) {
    const x = distToX(next.d, p.d);
    const y = altToY(next.alt);
    if (x > W - 30 || x < 30 || y < 120 || y > H - 60) {
      const ax = Math.max(60, Math.min(W - 60, x));
      const ay = Math.max(130, Math.min(H - 90, y));
      ctx.fillStyle = PALETTE.ringNext;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${world.rings.indexOf(next) + 1} ➤`, ax, ay - 58);
      ctx.beginPath();
      ctx.moveTo(ax, ay - 48); ctx.lineTo(ax - 12, ay - 66); ctx.lineTo(ax + 12, ay - 66);
      ctx.closePath(); ctx.fill();
      ctx.textAlign = 'left';
    }
  }
  // Toast + message.
  if (state.toastT > 0) {
    ctx.fillStyle = 'rgba(12,24,40,0.72)';
    ctx.beginPath(); ctx.roundRect(340, 640, 600, 36, 8); ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, 640, 664);
    ctx.textAlign = 'left';
  }
  if (state.messageT > 0) {
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, 640, 300);
    ctx.textAlign = 'left';
  }
  // Floaters.
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - f.t * 34);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  // Controls hint.
  ctx.fillStyle = 'rgba(238,244,250,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('↑↓/W S climb & descend · ←→/A D steer · Shift/Ctrl throttle · mouse steers too · Space flare · P pause', 16, 706);
}

function overlay(ctx, title, lines, accent) {
  const h = 130 + lines.length * 34 + 30;
  ctx.fillStyle = 'rgba(8, 16, 30, 0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(12, 24, 40, 0.88)';
  ctx.beginPath(); ctx.roundRect(290, 110, 700, h, 16); ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 180);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px system-ui, sans-serif';
  let y = 232;
  for (const line of lines) {
    ctx.fillText(line, 640, y);
    y += 34;
  }
  ctx.textAlign = 'left';
}

export function drawScene(ctx, state) {
  const time = state.time;
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
  sky(ctx, time);
  const world = state.world;
  currentPlaneD = state.plane.d;
  if (world) {
    for (const c of state.clouds) cloud(ctx, c.x, c.y, c.s);
    ridge(ctx, state.plane.d, 0.12, PALETTE.ridgeFar, 90, HORIZON_Y + 40);
    ridge(ctx, state.plane.d, 0.3, PALETTE.ridgeNear, 70, HORIZON_Y + 110);
    ground(ctx, state);
    const nextIndex = world.rings.findIndex((r) => !r.passed);
    world.rings.forEach((ring, i) => drawRing(ctx, ring, i, i === nextIndex, time));
    for (const p of world.parcels) drawParcel(ctx, p, time);
    for (const b of world.balloons) drawBalloon(ctx, b, time);
    drawPlane(ctx, state, time);
  } else {
    for (const c of state.clouds) cloud(ctx, c.x, c.y, c.s);
    ridge(ctx, 0, 0.12, PALETTE.ridgeFar, 90, HORIZON_Y + 40);
    ridge(ctx, 0, 0.3, PALETTE.ridgeNear, 70, HORIZON_Y + 110);
  }
  ctx.restore();

  if (world) drawHud(ctx, state);

  if (state.screen === SCREEN_TITLE) {
    overlay(ctx, 'SKY COURIER', [
      'Ridge Runner — a mail run across the Alder Valley',
      '',
      'Fly every glowing ring in order, grab the mail bags,',
      'dodge the balloons, and land on Alder Field before',
      'the fuel runs out. Three sorties, one valley, rising wind.',
      '',
      '↑ ↓ climb & descend · ← → steer · Shift / Ctrl throttle',
      'Mouse steers too · Space flares for landing · P pauses',
      '',
      state.best > 0 ? `Best score: ${state.best}` : 'Your first flight awaits.',
      '',
      'Press ENTER to fly',
    ], PALETTE.ring);
  } else if (state.screen === SCREEN_PAUSE) {
    overlay(ctx, 'PAUSED', ['The Kestrel holds her breath.', '', 'P or Enter to keep flying', 'R to restart the sortie'], PALETTE.hudAmber);
  } else if (state.screen === SCREEN_SORTIE_END) {
    const last = state.sortie < SORTIES.length - 1;
    overlay(ctx, state.sortie === SORTIES.length - 1 ? 'VALLEY CONQUERED' : 'SORTIE COMPLETE', [
      `${SORTIES[state.sortie].name} — landed safe at Alder Field`,
      '',
      `Score ${state.score} · Rings ${state.ringsPassed} · Mail ${state.parcelsTaken} · Best combo ×${state.bestCombo}`,
      `Hull ${Math.round(state.hull)}% · Fuel ${Math.round(state.fuel)}% left`,
      '',
      last ? 'Press ENTER for the next sortie' : 'Press ENTER to see your total',
    ], PALETTE.hudGreen);
  } else if (state.screen === SCREEN_GAME_OVER) {
    overlay(ctx, 'DOWN IN THE VALLEY', [
      state.cause || 'The flight is over.',
      '',
      `Score ${state.score} · Rings ${state.ringsPassed}/${state.world ? state.world.def.rings : 0} · Sortie ${state.sortie + 1}`,
      '',
      'Press R to fly this sortie again',
      'Press ENTER to start over from Sortie 1',
    ], PALETTE.hudRed);
  } else if (state.screen === SCREEN_VICTORY) {
    overlay(ctx, 'COURIER OF THE VALLEY', [
      'All three sorties flown. The mail got through.',
      '',
      `Final score ${state.score} · Rings ${state.stats.rings} · Mail bags ${state.stats.parcels}`,
      `Perfect rings ${state.stats.perfect} · Best combo ×${state.bestCombo}`,
      state.score >= state.best && state.score > 0 ? 'A new best score!' : `Best score: ${state.best}`,
      '',
      'Press ENTER to fly again',
    ], PALETTE.ring);
  }
}

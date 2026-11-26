// Sky Courier: Ridge Runner — every tuning number in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Altitude band the plane may fly in, in feet. */
export const ALT = { min: 0, max: 1200, cruise: 520 };

/** Speed band in knots; below STALL the wing gives up and the nose drops. */
export const SPEED = { min: 45, max: 185, cruise: 120, stall: 68, landMax: 112 };

/** Throttle 0..1; climb, sink and fuel burn all answer to it. */
export const PLANE = {
  climbRate: 260,      // ft/s at full climb and cruise speed
  sinkRate: 150,       // ft/s sinking when slow or idle
  lateralSpeed: 320,   // px/s across the screen
  turnRate: 26,        // degrees of heading per second at full bank
  accel: 26,           // knots per second of throttle change
  hull: 100,
  hitDamage: 26,
  scrapeDamage: 12,
};

export const FUEL = {
  max: 100,
  burnBase: 0.55,      // % per second at cruise throttle
  burnThrottle: 1.15,  // extra % per second at full throttle
  ringBonus: 9,        // % back for each ring flown
  parcelBonus: 3,
};

export const SCORE = { ring: 100, parcel: 50, landing: 250, perfectRing: 25 };

/** Three sorties across the Alder Valley, each harder than the last. */
export const SORTIES = [
  { name: 'Sortie 1 — Meadow Run', rings: 5, parcels: 4, balloons: 3, distance: 9000, wind: 4,  fuel: 100, speedBonus: 0 },
  { name: 'Sortie 2 — River Bend', rings: 7, parcels: 5, balloons: 5, distance: 12000, wind: 9, fuel: 96,  speedBonus: 8 },
  { name: 'Sortie 3 — Ridge Storm', rings: 9, parcels: 6, balloons: 8, distance: 15000, wind: 14, fuel: 92, speedBonus: 16 },
];

export const PALETTE = {
  skyTop: '#2f6fb8', skyMid: '#7fb2e0', skyLow: '#cfe8f5',
  sun: '#ffd76a', cloud: '#ffffff',
  ridgeFar: '#7d94b8', ridgeNear: '#5d7a52',
  fieldA: '#8fae5a', fieldB: '#b5a254', fieldC: '#6f9e4f', fieldD: '#c2b06a',
  river: '#5fa8d8', road: '#8a7a5c', town: '#c96f4a',
  runway: '#3c4148', runwayMark: '#f5f0dc',
  plane: '#e84c3d', planeTrim: '#f5f0dc', planeDark: '#7a241c',
  ring: '#ffd23e', ringNext: '#ffe98a', ringDone: '#7ddb7d',
  hudPanel: 'rgba(12, 24, 40, 0.72)', hudText: '#eef4fa', hudAmber: '#ffcf4d',
  hudRed: '#ff6b5e', hudGreen: '#7ddb7d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sky-courier.best';

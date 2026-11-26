# Sky Courier: Ridge Runner — a mail-run flight game

[![Competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/lolipo8988-bot/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/lolipo8988-bot/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

An original flight game built for the make.fun "Make the best flight game" bounty. Fly Pip's red courier plane, the Kestrel, across the Alder Valley: thread every glowing ring in order, grab the mail bags, dodge the hot-air balloons, watch the fuel and the hull, and put her down gently on Alder Field before the tanks run dry. Three sorties, rising wind and faster air, with stalls, scrapes and a landing that has to be slow and gentle. Keyboard and mouse, fully offline, no dependencies.

- `game/` — the playable game as static files (`game/index.html` opens in desktop Chrome)
- `screenshots/` — real renders of the game taken in a browser
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` via `vendor/makefun-game.ts`

## How to play

Fly the rings in order (the next one glows and an arrow points at it when it is off screen), collect mail bags for bonus points and fuel, and land on the runway once every ring is flown. A ring flown through the centre is perfect and pays extra; rings in a row build a combo multiplier. A missed ring breaks the combo but the sortie goes on.

- **Climb / descend:** ↑ / W and ↓ / S (or move the mouse above / below the plane)
- **Steer:** ← / → or A / D (or move the mouse left / right of the plane)
- **Throttle:** Shift to speed up, Ctrl to slow down (or + / −)
- **Flare:** hold Space to bleed speed for landing
- **Pause:** P · **Restart sortie:** R · **Mute:** M · **Start:** Enter

Watch the instruments: altitude, speed, heading and the compass strip across the top, fuel and hull bars, the little round artificial horizon, and the distance-to-field bar. Below 68 kt the wing stalls and the nose drops — throttle up and stop climbing. Land slow (under 112 kt) and gentle on the strip after the last ring; come in too fast or too steep and the ridge wins. Run out of fuel or hull and the flight is over.

## Run it

No build step, no network. Serve the `game/` folder with any static server and open it in desktop Chrome:

```sh
node serve.ts            # serves game/ at http://localhost:8090
```

or open `game/index.html` directly. Screenshots are staged with `?shot=cover|ring|land|end` (see `shots.json`).

## File structure

- `game/index.html`, `game/style.css` — page and layout
- `game/src/config.js` — tuning numbers, sorties, palette
- `game/src/world.js` — seeded Alder Valley: terrain, rings, parcels, balloons, runway
- `game/src/state.js` — flight state, sortie setup, scoring
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/render.js` — sky, ridges, valley, plane, rings, HUD and screens
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/main.js` — frame loop, flight model, collisions, landings
- `serve.ts` — pocket static server for local play
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

# Palmera Bay — Open World

[![make.fun](https://img.shields.io/badge/make.fun-gta6--01-ffd23c)](https://make.fun/competitions/gta6-01)

An original open-world game in the browser: a sun-soaked coastal city, cars to steal,
cops to lose, and three jobs to run. Built with three.js, zero network requests —
everything (city, cars, people, sound) is generated in code.

## Play

Open `game/index.html` in a desktop browser, or serve the repo root:

```
node serve.ts        # http://localhost:8080/
```

## Story

Danny Reyes just rolled into **Palmera Bay** with $250, a borrowed jacket and a debt
to Vic Marino. Three jobs stand between him and a clean slate — if the Palmera Bay PD
lets him.

## Missions

1. **The First Job** — deliver a package to the docks, no questions, no cops.
2. **Cab Fare** — pick up a fare on Coral Avenue and drop them at the hotel.
3. **Lose the Heat** — the job went loud. Reach the hideout and vanish.

Finish all three and the city is yours — free roam, keep the cash.

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Move on foot / drive |
| Shift | Run |
| Mouse drag | Orbit camera |
| E | Enter / exit a car (stealing one raises your wanted level) |
| Click | Shoot pistol |
| F | Punch |
| M | Re-read the story |

## Systems

- **City** — procedural 8×8-block grid: towers, parks, parking lots, palms, lamps, beach and sea.
- **Traffic** — cars cruise the streets, pedestrians walk the sidewalks.
- **Wanted** — 0–5 stars. Stealing, hitting pedestrians and shooting draw police cars and foot officers; stay calm and the heat decays.
- **Combat** — pistol with tracers and sparks, plus melee.
- **HUD** — health, cash, wanted stars, mission objective, speed, live minimap.
- **Save** — cash, mission progress, position and health persist in `localStorage`.
- **Sound** — procedural WebAudio: engine hum, two-tone siren, gunshots, mission chime.
- **Fallback** — if WebGL/three.js cannot load, a top-down 2D mode still plays.

## Staged screenshots

The game supports `?shot=start|play|chase|mission|city&seed=1` for deterministic
scenes used to capture the entry screenshots.

## Build

```
node main.ts     # writes out/ (game + screenshots + dossier.json)
```

`main.ts` copies `game/` and `screenshots/` and writes `dossier.json` via
`vendor/makefun-game.ts` (make.fun's own dossier builder).

## License

MIT — see `LICENSE`. Palmera Bay, Danny Reyes and Vic Marino are original
characters and places, not affiliated with any existing game.

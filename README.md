# Solmar Bay — Open World Crime

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/lansionot/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/lansionot/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01) — entirely
original: its own city (Solmar Bay), its own characters, vehicles, names
and story. Nothing from Rockstar Games' Grand Theft Auto series.

You are Rook, a driver fresh out of luck in Solmar Bay. Lena and Marco
pull you into three chained missions — steal a car for the marina, collect
a debt from the Harbor Kings, then a harbor heist with the whole police
force on your tail — and after that the city is yours: free roam, courier
jobs, and as much trouble as you can afford.

## The city

A 3200×2400 top-down city: a road grid with traffic, sidewalks full of
pedestrians, a park, a beach and a harbor. Explore on foot or by car —
steal parked cars and traffic cars, drive with skid and smoke, and watch
the day drift from sun-soaked afternoon toward night.

## Systems

- **Wanted level** — 1 to 5 stars. Stealing a car, punching a pedestrian
  or firing a shot raises it; police cars chase, ram and, on foot, try to
  arrest you. Lay low and the heat fades.
- **Combat** — punch up close, shoot with limited ammo (aim with the
  mouse), thugs who punch back and shoot from range, muzzle flash,
  particles and damage smoke.
- **Missions** — 3 chained story missions with dialogue, objectives and
  cash rewards, then repeatable courier jobs (press J).
- **HUD** — health, money, ammo, wanted stars, speed, mission objective
  and a live minimap; press M for the full city map.
- **Save** — progress saves on mission completion and on pause, and the
  title screen offers Continue when a save exists (localStorage).
- **Sound** — WebAudio oscillators only, no audio files: engine hum,
  police siren, gunshots, punches, pickups and a mission jingle.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot, drive (throttle / steer) |
| Shift | Run |
| E | Enter / exit a car |
| F | Punch |
| Space / mouse click | Shoot (aim with the mouse) |
| T | Talk to a mission giver |
| J | Start a courier job (after the story) |
| M | Full city map |
| P / Esc | Pause |
| N | Mute sound |

Menus use the mouse and the keyboard (Space / Enter to start).

## Missions

1. **First Wheels** — Lena needs wheels. Steal any car and bring it to
   the marina marker. Reward $300.
2. **Debt Collector** — Three Harbor Kings at the docks owe Lena money.
   Deal with them, fists or fire. Reward $500.
3. **Harbor Heist** — Grab the getaway car at the docks, then lose the
   police and reach the hideout. Reward $1,200.

## Run

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

No build step, no network request: `game/` is plain static files.

## Screenshots

`screenshots/` holds real renders of the game taken in a browser:
`1-start.png` (title over the live city), `2-play.png` (driving through
traffic), `3-chase.png` (a 3-star police chase), `4-mission.png`
(mission 2, the Harbor Kings at the docks).

## License

MIT — see `LICENSE`.

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
jobs, a 12-coin hunt, and as much trouble as you can afford.

## The city

A 3200×2400 top-down city: a road grid with traffic, sidewalks full of
pedestrians, a park with a pond, a beach with a pier and moored boats,
dock cranes, street trees, and buildings in three shapes — towers, malls
and houses. Explore on foot or by car — steal parked cars and traffic
cars, drive with skid and smoke, and watch the day drift from sun-soaked
afternoon through golden dusk toward night, when the windows light up.

## Systems

- **Wanted level** — 1 to 5 stars. Stealing a car, punching a pedestrian
  or firing a shot raises it; police cars chase, ram and, on foot, try to
  arrest you. Police are slower than your top speed and steer imperfectly,
  so a sharp turn loses them; lay low and the heat fades, faster at low
  stars.
- **Combat** — punch up close, shoot with limited ammo (aim with the
  mouse), thugs who punch back and shoot from range, muzzle flash,
  recoil, hit flashes, screen shake, particles and damage smoke.
  Hold Space or the mouse button to keep firing — the fire rate paces
  the shots, no key auto-repeat needed.
- **Missions** — 3 chained story missions with dialogue, objectives and
  cash rewards, then repeatable jobs in three kinds (press J): package
  delivery, two-stop taxi fares, and getaway drives that bring heat.
- **Solmar coins** — 12 gold coins hidden on sidewalks, in the park and
  along the beach. Each pays $25; all 12 pay a $500 bonus.
- **HUD** — health, money, ammo, coins found, wanted stars, speed,
  mission objective with a distance readout, and a live minimap; press M
  for the full city map.
- **Save** — progress saves on mission completion and on pause, and the
  title screen offers Continue when a save exists (localStorage).
- **Sound** — WebAudio oscillators only, no audio files: engine hum,
  police siren, gunshots, punches, pickups, coin chimes, a horn (H) and a
  mission jingle. Every sound is logged, so a headless run can prove the
  oscillators fired.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot, drive (throttle / steer) |
| Shift | Run |
| E | Enter / exit a car |
| F | Punch |
| Space / mouse click | Shoot (aim with the mouse) — hold to keep firing |
| H | Horn |
| T | Talk to a mission giver |
| J | Start a job (after the story) |
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
`1-start.jpg` (title over the live city), `2-play.jpg` (driving through
traffic — four traffic cars are seeded on the player's avenue so traffic
is always in frame), `3-chase.jpg` (a 3-star police chase — all four
police cars are clustered behind the player so every car is in frame),
`4-mission.jpg` (mission 2, the Harbor Kings at the docks — staged
non-lethally, so the player stays at full health in the frame). All four
are 1280×720 JPEGs, each under 256 KiB.

## License

MIT — see `LICENSE`.

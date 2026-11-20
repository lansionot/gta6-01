// The city of Solmar Bay and the shared game state. No drawing and no
// browser in here: the grid of roads, the blocks of buildings, parks and
// the beach, plus the pools of cars, pedestrians, police, enemies and
// bullets that the other modules move around. Revision 2 adds building
// variety (towers, malls, houses), street trees, a harbor pier with
// moored boats, and 12 hidden Solmar coins to collect.
import { CAR, COLLECTIBLES, ENEMY, PEDESTRIANS, PLAYER, TRAFFIC, WORLD } from './config.js';
import { pick, range, shuffle } from './random.js';

export const CAR_COLORS = ['#e5534b', '#4fc3f7', '#f2c94c', '#9b59b6', '#e8e8e8', '#58d68d', '#ff8c42', '#5a6b8a'];
export const BUILDING_COLORS = ['#8a5a3b', '#5a6b8a', '#7a4a5a', '#4a7a6b', '#a07a3b', '#6b4a7a'];
/** Roof kinds: a tall tower, a wide mall, or a small house — drawn differently. */
export const BUILDING_KINDS = ['tower', 'mall', 'house'];

/** Road centre lines, every WORLD.block apart, with a margin from the edge. */
export function roadLines() {
  const vertical = [];
  const horizontal = [];
  for (let x = 300; x < WORLD.width; x += WORLD.block) vertical.push(x);
  for (let y = 300; y < WORLD.height; y += WORLD.block) horizontal.push(y);
  return { vertical, horizontal };
}

export function isOnRoad(x, y) {
  const { vertical, horizontal } = roadLines();
  for (const rx of vertical) if (Math.abs(x - rx) < WORLD.roadWidth / 2) return true;
  for (const ry of horizontal) if (Math.abs(y - ry) < WORLD.roadWidth / 2) return true;
  return false;
}

function buildingAt(random, bx, by, bw, bh) {
  // Stay inside the block with a clear margin from the roads around it:
  // a building must never overhang the sidewalk or the road.
  const x = bx + 24 + random() * 40;
  const y = by + 24 + random() * 40;
  const maxWidth = bx + bw - 24 - x;
  const maxHeight = by + bh - 24 - y;
  const kind = pick(random, BUILDING_KINDS);
  return {
    x,
    y,
    width: Math.max(80, Math.min(bw - 48 - random() * 60, maxWidth)),
    height: Math.max(80, Math.min(bh - 48 - random() * 60, maxHeight)),
    color: pick(random, BUILDING_COLORS),
    // Towers are tall, malls are wide and low, houses are small.
    floors: kind === 'tower' ? 8 + Math.floor(random() * 8) : kind === 'mall' ? 2 : 1 + Math.floor(random() * 2),
    kind,
    // A rooftop detail seed: air-con boxes, a helipad on the tallest tower.
    roofSeed: Math.floor(random() * 4),
  };
}

/** Build the city: buildings inside each road block, a park, a beach strip. */
export function buildCity(random) {
  const buildings = [];
  const parks = [];
  const trees = [];
  const { vertical, horizontal } = roadLines();
  // Blocks sit strictly between roads: from one road's far edge to the
  // next road's near edge, so no building ever touches a road.
  const xEdges = [80, ...vertical.flatMap((v) => [v - WORLD.roadWidth / 2, v + WORLD.roadWidth / 2]), WORLD.width - 80];
  const yEdges = [80, ...horizontal.flatMap((h) => [h - WORLD.roadWidth / 2, h + WORLD.roadWidth / 2]), WORLD.height - 80];
  const xBlocks = [];
  for (let i = 0; i < xEdges.length; i += 2) xBlocks.push([xEdges[i], xEdges[i + 1]]);
  const yBlocks = [];
  for (let i = 0; i < yEdges.length; i += 2) yBlocks.push([yEdges[i], yEdges[i + 1]]);
  for (let bi = 0; bi < xBlocks.length; bi += 1) {
    for (let bj = 0; bj < yBlocks.length; bj += 1) {
      const [x0, x1] = xBlocks[bi];
      const [y0, y1] = yBlocks[bj];
      if (x1 <= x0 || y1 <= y0 || y0 >= 2252) continue; // the beach strip stays open
      if (bi === 2 && bj === 2) {
        parks.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
        continue;
      }
      buildings.push(buildingAt(random, x0, y0, x1 - x0, y1 - y0));
      if (random() < 0.5) buildings.push(buildingAt(random, x0 + (x1 - x0) / 2, y0, (x1 - x0) / 2, y1 - y0));
    }
  }
  // Street trees along the sidewalks, kept off the road surface.
  for (const rx of vertical) {
    for (let y = 140; y < WORLD.height - 140; y += 260) {
      trees.push({ x: rx - WORLD.roadWidth / 2 - 14, y: y + range(random, -40, 40), size: 12 + random() * 6 });
      trees.push({ x: rx + WORLD.roadWidth / 2 + 14, y: y + 130 + range(random, -40, 40), size: 12 + random() * 6 });
    }
  }
  for (const ry of horizontal) {
    for (let x = 200; x < WORLD.width - 200; x += 300) {
      trees.push({ x: x + range(random, -40, 40), y: ry - WORLD.roadWidth / 2 - 14, size: 12 + random() * 6 });
    }
  }
  // The park gets a denser grove, and the beach gets palms.
  const park = parks[0];
  if (park) {
    for (let i = 0; i < 14; i += 1) {
      trees.push({ x: park.x + 30 + random() * (park.width - 60), y: park.y + 30 + random() * (park.height - 60), size: 13 + random() * 7 });
    }
  }
  for (let x = 200; x < WORLD.width - 200; x += 240) {
    trees.push({ x: x + range(random, -30, 30), y: 2280 + range(random, -8, 8), size: 11 + random() * 5 });
  }
  // Harbor: a wooden pier reaching into the water at the marina, with
  // moored boats beside it, and two cranes standing over the docks.
  const pier = { x: 2620, y: 2252, width: 36, height: 120 };
  const boats = [
    { x: 2500, y: 2380, angle: 0.15, color: '#e8e8e8' },
    { x: 2700, y: 2390, angle: -0.1, color: '#f2c94c' },
    { x: 2850, y: 2370, angle: 0.05, color: '#4fc3f7' },
  ];
  const cranes = [{ x: 2250, y: 1560 }, { x: 2450, y: 1420 }];
  // 12 Solmar coins, hidden on sidewalks, in the park and along the beach.
  const coinSpots = [];
  for (const rx of vertical) {
    for (let y = 200; y < WORLD.height - 200; y += 400) coinSpots.push({ x: rx + WORLD.roadWidth / 2 + 14, y });
  }
  if (park) coinSpots.push({ x: park.x + park.width / 2, y: park.y + park.height / 2 });
  coinSpots.push({ x: 500, y: 2290 }, { x: 1500, y: 2290 }, { x: 2700, y: 2290 });
  const coins = shuffle(random, coinSpots).slice(0, COLLECTIBLES.count).map((spot) => ({ x: spot.x, y: spot.y, taken: false }));
  return { buildings, parks, trees, beachY: 2252, pier, boats, cranes, coins };
}

export function makeCar(random, x, y, angle, kind) {
  return {
    x, y, angle, speed: 0,
    color: pick(random, CAR_COLORS),
    kind, // 'parked' | 'traffic' | 'police' | 'player'
    driver: kind === 'parked' ? null : 'traffic',
    targetRoad: null,
    direction: random() < 0.5 ? 1 : -1,
    smoke: 0,
    // Each traffic car keeps its own pace, so traffic never moves in lockstep.
    speedFactor: 0.85 + random() * 0.3,
    braking: false,
    id: Math.floor(random() * 1e9),
  };
}

export function makePedestrian(random, x, y) {
  return {
    x, y,
    angle: random() * Math.PI * 2,
    speed: PEDESTRIANS.speed * (0.7 + random() * 0.6),
    color: pick(random, ['#e8e8e8', '#f2c94c', '#4fc3f7', '#ff8c42', '#9b59b6', '#58d68d']),
    fleeing: false,
    walkPhase: random() * Math.PI * 2,
    // A few pedestrians wear a hat or carry a bag: visible variety.
    hat: random() < 0.25,
    bag: random() < 0.3,
  };
}

export function makeEnemy(random, x, y) {
  return {
    x, y, angle: 0, health: ENEMY.health, speed: ENEMY.speed,
    shootTimer: 1 + random(),
    punchTimer: 0,
    alive: true,
    flash: 0,
  };
}

/** A point on a road, for spawning traffic and placing markers. */
export function roadPoint(random) {
  const { vertical, horizontal } = roadLines();
  if (random() < 0.5) {
    return { x: pick(random, vertical) + range(random, -20, 20), y: range(random, 120, WORLD.height - 120) };
  }
  return { x: range(random, 120, WORLD.width - 120), y: pick(random, horizontal) + range(random, -20, 20) };
}

export function clampToWorld(entity, radius) {
  entity.x = Math.max(radius, Math.min(WORLD.width - radius, entity.x));
  entity.y = Math.max(radius, Math.min(WORLD.height - radius, entity.y));
}

/** Circle vs building rectangles: true when the circle touches a building. */
export function hitsBuilding(buildings, x, y, radius) {
  for (const b of buildings) {
    if (x + radius > b.x && x - radius < b.x + b.width && y + radius > b.y && y - radius < b.y + b.height) return b;
  }
  return null;
}

export function createWorld(random) {
  const city = buildCity(random);
  const state = {
    random,
    city,
    time: 0,
    dayTime: 0.32,
    player: {
      x: 700, y: 700, angle: -Math.PI / 2, health: PLAYER.health,
      money: 50, ammo: PLAYER.startAmmo, inCar: null,
      punchCooldown: 0, shootCooldown: 0, invulnerable: 0, speed: 0, moving: false,
      recoilTimer: 0,
    },
    cars: [],
    peds: [],
    police: [],
    enemies: [],
    bullets: [],
    particles: [],
    pickups: [],
    coins: city.coins,
    coinsCollected: 0,
    wanted: 0,
    wantedTimer: 0,
    crimeTimer: 0,
    noticeTimer: 0,
    shake: 0,
    muzzleAngle: 0,
    gunfireTimer: 0,
    arrestTimer: 0,
    escapeTimer: 0,
    pickupEvent: null,
    missionEvent: null,
    saveRequest: false,
    camera: { x: 700, y: 700 },
    mission: { index: 0, stage: 'talk', done: 0, target: null, timer: 0, thugsLeft: 0, jobType: null, jobStage: null },
    dialogue: null,
    notice: null,
    stats: { carsStolen: 0, crimes: 0, missionsDone: 0, shotsFired: 0, jobsDone: 0, coinsFound: 0 },
    over: null, // 'wasted' | 'busted' | null
  };

  function spawnParkedCars() {
    for (let i = 0; i < 10; i += 1) {
      const p = roadPoint(random);
      const car = makeCar(random, p.x, p.y, pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), 'parked');
      state.cars.push(car);
    }
  }

  function spawnTraffic() {
    for (let i = 0; i < TRAFFIC.count; i += 1) {
      const p = roadPoint(random);
      const car = makeCar(random, p.x, p.y, pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), 'traffic');
      car.speed = TRAFFIC.speed * car.speedFactor;
      state.cars.push(car);
    }
  }

  function spawnPeds() {
    for (let i = 0; i < PEDESTRIANS.count; i += 1) {
      const p = roadPoint(random);
      state.peds.push(makePedestrian(random, p.x + range(random, -60, 60), p.y + range(random, -60, 60)));
    }
  }

  function reset() {
    state.time = 0;
    state.dayTime = 0.32;
    state.player.x = 700;
    state.player.y = 700;
    state.player.angle = -Math.PI / 2;
    state.player.health = PLAYER.health;
    state.player.money = 50;
    state.player.ammo = PLAYER.startAmmo;
    state.player.inCar = null;
    state.player.punchCooldown = 0;
    state.player.shootCooldown = 0;
    state.player.invulnerable = 0;
    state.player.recoilTimer = 0;
    state.cars.length = 0;
    state.peds.length = 0;
    state.police.length = 0;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.pickups.length = 0;
    state.coins = city.coins.map((c) => ({ ...c }));
    state.coinsCollected = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.crimeTimer = 0;
    state.noticeTimer = 0;
    state.shake = 0;
    state.gunfireTimer = 0;
    state.arrestTimer = 0;
    state.escapeTimer = 0;
    state.pickupEvent = null;
    state.missionEvent = null;
    state.saveRequest = false;
    state.camera.x = 700;
    state.camera.y = 700;
    state.mission = { index: 0, stage: 'talk', done: 0, target: null, timer: 0, thugsLeft: 0, jobType: null, jobStage: null };
    state.dialogue = null;
    state.notice = null;
    state.stats = { carsStolen: 0, crimes: 0, missionsDone: 0, shotsFired: 0, jobsDone: 0, coinsFound: 0 };
    state.over = null;
    spawnParkedCars();
    spawnTraffic();
    spawnPeds();
  }

  reset();
  return { state, reset, spawnParkedCars, spawnTraffic, spawnPeds };
}

/** Nearest car within `maxDist` of a point, or null. */
export function nearestCar(state, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of state.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

export function addParticles(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = state.random() * Math.PI * 2;
    const s = speed * (0.4 + state.random() * 0.8);
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + state.random() * 0.4, maxLife: 0.8, color, size: 2 + state.random() * 3 });
  }
}

/** A burst that expands as a ring: used for pickups and coin grabs. */
export function addRing(state, x, y, color) {
  state.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color, size: 6, ring: true });
}

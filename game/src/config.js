// Solmar Bay — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical viewport; the renderer scales
// it to the window, and the world itself is a 3200x2400 city the camera
// follows the player through. No rule below depends on the screen size.
// Revision 2: denser traffic, fairer police, gentler thugs, and a
// collectible hunt (12 Solmar coins) as the fourth side activity.

export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const WORLD = { width: 3200, height: 2400, roadWidth: 96, block: 400 };

export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  runSpeed: 300,
  health: 100,
  punchDamage: 25,
  punchRange: 46,
  punchArc: 1.1,
  punchCooldown: 0.35,
  shootCooldown: 0.22,
  bulletSpeed: 900,
  bulletDamage: 40,
  startAmmo: 24,
  maxAmmo: 120,
};

export const CAR = {
  length: 64,
  width: 30,
  accel: 420,
  brake: 700,
  maxSpeed: 520,
  reverseSpeed: 180,
  turnRate: 2.6,
  drag: 0.6,
};

// More cars than before, and each one drives at its own pace, so the
// streets never look empty and no two traffic cars move in lockstep.
export const TRAFFIC = { count: 20, speed: 165, spawnInterval: 1.8 };
export const PEDESTRIANS = { count: 30, speed: 55 };
export const POLICE = {
  maxActive: 6,
  speed: 440, // slower than the player's top speed: escape is always possible
  ramDamage: 6,
  arrestRange: 52,
  arrestTime: 2.8,
  steerRate: 2.6,
};

export const WANTED = {
  max: 5,
  stealCar: 1,
  punchPedestrian: 1,
  shoot: 1,
  killPolice: 1,
  // Heat fades per star: one star cools in 14 s, five stars in 30 s, and
  // only while no police car is close enough to see the player.
  decayBaseSeconds: 10,
  decayPerStarSeconds: 4,
};

/** Thugs hit softer and less often than in revision 1, so mission 2 is a fight, not a mugging. */
export const ENEMY = {
  health: 50,
  speed: 120,
  punchDamage: 7,
  punchCooldown: 1.2,
  shootMinRange: 220,
  shootMaxRange: 480,
  shootInterval: 2.0,
  bulletSpeed: 560,
};

/** 12 gold Solmar coins hidden around the city; all 12 pay a $500 bonus. */
export const COLLECTIBLES = { count: 12, bonus: 500 };

/** Courier job types after the story: delivery, taxi (two stops), getaway (with heat). */
export const JOBS = [
  { type: 'package', label: 'Courier job', reward: 150 },
  { type: 'taxi', label: 'Taxi fare', reward: 120 },
  { type: 'getaway', label: 'Getaway drive', reward: 220 },
];

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    giver: 'Lena',
    briefing: 'Lena needs wheels. Steal any car and bring it to the yellow marker at the marina.',
    objective: 'Steal a car, then drive it to the marina marker.',
    reward: 300,
  },
  {
    id: 'debt-collector',
    title: 'Debt Collector',
    giver: 'Lena',
    briefing: 'Three Harbor Kings owe Lena money and will not pay. Teach them a lesson — fists or fire. Watch their fists: they swing together.',
    objective: 'Deal with the 3 Harbor Kings at the docks.',
    reward: 500,
  },
  {
    id: 'harbor-heist',
    title: 'Harbor Heist',
    giver: 'Marco',
    briefing: 'Marco has a score at the harbor. Grab the getaway car, then lose the heat and reach the hideout. Your car is faster than theirs — use it.',
    objective: 'Take the getaway car to the hideout while the police chase you.',
    reward: 1200,
  },
];

export const PALETTE = {
  grass: '#3f7a44',
  park: '#4c8a4f',
  sand: '#d9c27a',
  water: '#2b6cb0',
  waterDeep: '#1d4e80',
  road: '#33373e',
  roadLine: '#d8c95a',
  sidewalk: '#6b6f78',
  buildingRoof: '#8a5a3b',
  buildingRoof2: '#5a6b8a',
  buildingRoof3: '#7a4a5a',
  buildingRoof4: '#4a7a6b',
  tree: '#2f6b33',
  treeLight: '#4c9a4f',
  trunk: '#6b4a2f',
  pier: '#8a6b45',
  boat: '#e8e8e8',
  coin: '#f2c94c',
  player: '#f2c94c',
  playerCar: '#e5534b',
  trafficCar: '#4fc3f7',
  policeCar: '#2f6fd0',
  ped: '#e8e8e8',
  enemy: '#e5534b',
  hud: '#10131a',
  text: '#eef1f5',
  muted: '#9aa3b2',
  accent: '#f2c94c',
  wanted: '#ff5a4e',
  health: '#58d68d',
  marker: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save is kept between visits (this browser only). */
export const SAVE_KEY = 'solmar-bay.save.v2';
export const BEST_KEY = 'solmar-bay.best';

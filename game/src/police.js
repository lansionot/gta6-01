// The wanted level and the police. Crimes raise stars; stars decide how
// many police cars hunt the player. A police car chases, rams the player's
// car, and on foot it tries to arrest: stand close and slow for long
// enough and the player is busted. Stars fade when no crime happens and
// no police car can see the player. Revision 2: police are slower than
// the player's top speed, steer less perfectly, and the heat fades
// faster at low stars — escape is always a real option.
import { POLICE, WANTED } from './config.js';
import { addParticles, clampToWorld, hitsBuilding, makeCar, roadPoint } from './world.js';
import { damagePlayer } from './player.js';

export function raiseWanted(state, stars, reason) {
  state.wanted = Math.min(WANTED.max, state.wanted + stars);
  state.wantedTimer = 0;
  state.crimeTimer = 0;
  state.stats.crimes += 1;
  state.notice = reason;
}

export function spawnPoliceCar(state) {
  const p = roadPoint(state.random);
  const car = makeCar(state.random, p.x, p.y, 0, 'police');
  car.color = '#2f6fd0';
  car.driver = 'police';
  car.speed = 200;
  state.police.push(car);
  state.cars.push(car);
  return car;
}

/** Keep the number of active police cars matched to the wanted level. */
export function syncPolice(state) {
  // During the harbor-heist escape the whole force is on you, but never
  // more than four cars at once: the chase stays tense, not a wall.
  const escapeCap = state.mission.stage === 'escape' ? 4 : POLICE.maxActive;
  const wantedCount = state.wanted === 0 ? 0 : Math.min(escapeCap, state.wanted + 1);
  while (state.police.length < wantedCount) spawnPoliceCar(state);
  while (state.police.length > wantedCount) {
    const car = state.police.pop();
    const index = state.cars.indexOf(car);
    if (index >= 0) state.cars.splice(index, 1);
  }
}

function steerToward(car, tx, ty, dt, rate) {
  const target = Math.atan2(ty - car.y, tx - car.x);
  let diff = target - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-rate * dt, Math.min(rate * dt, diff));
}

/** One police car for a step: chase the player, ram, and arrest on foot. */
export function updatePoliceCar(state, car, dt) {
  const player = state.player;
  const dist = Math.hypot(player.x - car.x, player.y - car.y);
  // Police steer toward the player but wobble: they overshoot corners and
  // cannot turn on a coin, so a sharp turn loses them.
  const wobble = Math.sin(state.time * 1.7 + car.id % 10) * 0.12;
  steerToward(car, player.x + Math.cos(wobble) * 40, player.y + Math.sin(wobble) * 40, dt, POLICE.steerRate);
  const targetSpeed = dist > 400 ? POLICE.speed : POLICE.speed * 0.85;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
  // Move one axis at a time and slide along buildings instead of driving
  // through them: a police car that cuts a corner hugs the wall.
  const stepX = Math.cos(car.angle) * car.speed * dt;
  const stepY = Math.sin(car.angle) * car.speed * dt;
  if (!hitsBuilding(state.city.buildings, car.x + stepX, car.y, 30)) car.x += stepX;
  else car.angle += Math.PI / 3 * dt * 4;
  if (!hitsBuilding(state.city.buildings, car.x, car.y + stepY, 30)) car.y += stepY;
  else car.angle += Math.PI / 3 * dt * 4;
  clampToWorld(car, 32);
  if (dist < 70) {
    if (player.inCar) {
      // Ram: slow the player's car and shake it, but do not stop it dead.
      player.inCar.speed *= 0.94;
      damagePlayer(state, POLICE.ramDamage * dt * 2);
      addParticles(state, car.x, car.y, '#ffdd55', 2, 120);
    } else if (player.speed < 60) {
      // On foot and cornered: the arrest clock runs. Running breaks it.
      state.arrestTimer = (state.arrestTimer ?? 0) + dt;
      if (state.arrestTimer > POLICE.arrestTime) state.over = 'busted';
    }
  } else {
    state.arrestTimer = 0;
  }
}

export function updatePolice(state, dt) {
  syncPolice(state);
  for (const car of state.police) updatePoliceCar(state, car, dt);
  if (state.wanted > 0) {
    state.wantedTimer += dt;
    const anyNear = state.police.some((car) => Math.hypot(car.x - state.player.x, car.y - state.player.y) < 500);
    // Far from every police car for a while: the trail goes cold.
    const farDist = Math.min(...state.police.map((car) => Math.hypot(car.x - state.player.x, car.y - state.player.y)), 9999);
    if (farDist > 900) {
      state.escapeTimer = (state.escapeTimer ?? 0) + dt;
      if (state.escapeTimer > 5) {
        state.wanted = Math.max(0, state.wanted - 1);
        state.wantedTimer = 0;
        state.escapeTimer = 0;
        state.notice = state.wanted === 0 ? 'You lost the heat.' : 'Wanted level down — you are outrunning them.';
        return;
      }
    } else {
      state.escapeTimer = 0;
    }
    const decayAfter = WANTED.decayBaseSeconds + WANTED.decayPerStarSeconds * state.wanted;
    if (state.wantedTimer > decayAfter && !anyNear) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      state.notice = state.wanted === 0 ? 'You lost the heat.' : 'Wanted level down.';
    }
  }
}

// The wanted level and the police. Crimes raise stars; stars decide how
// many police cars hunt the player. A police car chases, rams the player's
// car, and on foot it tries to arrest: stand close and slow for long
// enough and the player is busted. Stars fade when no crime happens and
// no police car can see the player.
import { POLICE, WANTED } from './config.js';
import { addParticles, clampToWorld, makeCar, roadPoint } from './world.js';
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
  const wantedCount = state.wanted === 0 ? 0 : Math.min(POLICE.maxActive, state.wanted + 1);
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
  steerToward(car, player.x, player.y, dt, 3.2);
  const targetSpeed = dist > 400 ? POLICE.speed : POLICE.speed * 0.85;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  clampToWorld(car, 32);
  if (dist < 70) {
    if (player.inCar) {
      // Ram: slow the player's car and shake it.
      player.inCar.speed *= 0.92;
      damagePlayer(state, POLICE.ramDamage * dt * 2);
      addParticles(state, car.x, car.y, '#ffdd55', 2, 120);
    } else if (player.speed < 60) {
      // On foot and cornered: the arrest clock runs.
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
    if (state.wantedTimer > WANTED.decaySeconds && !anyNear) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      state.notice = state.wanted === 0 ? 'You lost the heat.' : 'Wanted level down.';
    }
  }
}

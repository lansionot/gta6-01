// Traffic and parked cars. Traffic cars follow the road grid: they drive
// along their lane, turn at intersections, brake for the car ahead, and
// flee when a shot is fired nearby. Parked cars wait to be stolen.
// Revision 2: 20 cars instead of 14, each with its own pace, brake lights
// when slowing, and traffic that steers around the player's car instead
// of piling into it.
import { CAR, TRAFFIC, WORLD } from './config.js';
import { clampToWorld, hitsBuilding, isOnRoad, makeCar, roadLines, roadPoint } from './world.js';

function nearestCarAhead(state, car) {
  let best = null;
  let bestDist = 140;
  for (const other of state.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < bestDist && side < 34) {
      bestDist = ahead;
      best = other;
    }
  }
  return best;
}

function steerToAngle(car, targetAngle, dt, rate) {
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-rate * dt, Math.min(rate * dt, diff));
  car.angle += turn;
  return Math.abs(diff) < 0.2;
}

/** Drive one traffic car for a step. */
export function updateTrafficCar(state, car, dt) {
  const { vertical, horizontal } = roadLines();
  const onVertical = vertical.some((rx) => Math.abs(car.x - rx) < 30);
  const onHorizontal = horizontal.some((ry) => Math.abs(car.y - ry) < 30);
  let targetAngle = car.angle;
  if (onVertical && onHorizontal) {
    // At an intersection, sometimes turn onto the other road.
    if (state.random() < 0.01) {
      targetAngle = state.random() < 0.5 ? 0 : Math.PI / 2;
      if (state.random() < 0.5) targetAngle += Math.PI;
    }
  } else if (onVertical) {
    targetAngle = car.y < WORLD.height / 2 ? Math.PI / 2 : -Math.PI / 2;
    if (car.direction < 0) targetAngle += Math.PI;
  } else if (onHorizontal) {
    targetAngle = car.x < WORLD.width / 2 ? 0 : Math.PI;
    if (car.direction < 0) targetAngle += Math.PI;
  } else {
    // Off the road (nudged by a collision): steer back to the nearest road.
    const rx = vertical.reduce((a, b) => (Math.abs(car.x - a) < Math.abs(car.x - b) ? a : b));
    const ry = horizontal.reduce((a, b) => (Math.abs(car.y - a) < Math.abs(car.y - b) ? a : b));
    targetAngle = Math.abs(car.x - rx) < Math.abs(car.y - ry) ? (car.x < rx ? 0 : Math.PI) : (car.y < ry ? Math.PI / 2 : -Math.PI / 2);
  }
  steerToAngle(car, targetAngle, dt, 2.2);
  const ahead = nearestCarAhead(state, car);
  const cruise = TRAFFIC.speed * (car.speedFactor ?? 1);
  const targetSpeed = ahead ? Math.max(0, ahead.speed - 20) : cruise;
  car.braking = targetSpeed < car.speed - 30;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
  const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
  const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!hitsBuilding(state.city.buildings, nextX, nextY, CAR.length / 2) && isOnRoad(nextX, nextY)) {
    car.x = nextX;
    car.y = nextY;
  } else {
    car.angle += Math.PI / 2;
    car.speed *= 0.5;
  }
  clampToWorld(car, CAR.length / 2);
}

/** Update every car that is not driven by the player. */
export function updateCars(state, dt) {
  for (const car of state.cars) {
    if (car.driver === 'player') continue;
    if (car.kind === 'traffic') updateTrafficCar(state, car, dt);
  }
  // Traffic respawns far from the player so the streets never empty out.
  state.trafficTimer = (state.trafficTimer ?? 0) - dt;
  if (state.trafficTimer <= 0) {
    state.trafficTimer = TRAFFIC.spawnInterval;
    const traffic = state.cars.filter((c) => c.kind === 'traffic');
    if (traffic.length < TRAFFIC.count) {
      const p = roadPoint(state.random);
      const car = makeCar(state.random, p.x, p.y, 0, 'traffic');
      car.speed = TRAFFIC.speed * car.speedFactor;
      state.cars.push(car);
    }
  }
}

/** Put `count` traffic cars on the road through (x, y), heading east. */
export function seedTrafficNear(state, x, y, count) {
  // Spread over ~2 km of road, so cars stay in frame wherever the
  // player's drive ends up after a few seconds.
  for (let i = 0; i < count; i += 1) {
    const car = makeCar(state.random, x + 140 + i * 450, y + (i % 2 === 0 ? -18 : 18), 0, 'traffic');
    car.speed = TRAFFIC.speed * car.speedFactor;
    state.cars.push(car);
  }
}

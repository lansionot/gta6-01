// The player, on foot and behind the wheel. On foot the player walks and
// runs in the direction the keys point; in a car the keys are throttle,
// brake and steering, with skid and smoke when turning hard at speed.
import { CAR, PLAYER, WORLD } from './config.js';
import { clampToWorld, hitsBuilding, nearestCar } from './world.js';

function moveWithCollision(state, entity, dx, dy, radius) {
  // If the entity already overlaps a building (a spawn on a corner, for
  // example), let it walk out instead of trapping it in place.
  const stuck = hitsBuilding(state.city.buildings, entity.x, entity.y, radius);
  const nextX = entity.x + dx;
  if (stuck || !hitsBuilding(state.city.buildings, nextX, entity.y, radius)) entity.x = nextX;
  const nextY = entity.y + dy;
  if (stuck || !hitsBuilding(state.city.buildings, entity.x, nextY, radius)) entity.y = nextY;
  clampToWorld(entity, radius);
}

/** Walk / run on foot. `move` is {x, y} normalised, `run` is a boolean. */
export function movePlayerOnFoot(state, dt, move, run) {
  const player = state.player;
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  player.speed = (move.x !== 0 || move.y !== 0) ? speed : 0;
  player.moving = move.x !== 0 || move.y !== 0;
  if (player.moving) player.angle = Math.atan2(move.y, move.x);
  moveWithCollision(state, player, move.x * speed * dt, move.y * speed * dt, PLAYER.radius);
}

/** Drive the car the player is in. `throttle` -1..1, `steer` -1..1. */
export function drivePlayerCar(state, dt, throttle, steer) {
  const car = state.player.inCar;
  if (!car) return;
  const player = state.player;
  if (throttle > 0) car.speed += CAR.accel * dt;
  else if (throttle < 0) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.5) * dt;
  else car.speed -= car.speed * CAR.drag * dt;
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  const turning = steer * CAR.turnRate * dt * Math.min(1, Math.abs(car.speed) / 120) * (car.speed >= 0 ? 1 : -1);
  car.angle += turning;
  const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
  const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
  if (hitsBuilding(state.city.buildings, nextX, nextY, CAR.length / 2)) {
    car.speed *= -0.25;
    car.smoke = 0.8;
  } else {
    car.x = nextX;
    car.y = nextY;
  }
  clampToWorld(car, CAR.length / 2);
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = Math.abs(car.speed);
  player.moving = Math.abs(car.speed) > 20;
  // Hard cornering at speed leaves skid smoke behind the car.
  if (Math.abs(steer) > 0.6 && Math.abs(car.speed) > 260 && state.random() < 0.5) {
    car.smoke = Math.max(car.smoke, 0.3);
  }
  if (car.smoke > 0) car.smoke = Math.max(0, car.smoke - dt);
}

/** Step into the nearest car, or step out of the one being driven. */
export function toggleEnterCar(state) {
  const player = state.player;
  if (player.inCar) {
    const car = player.inCar;
    car.driver = null;
    player.inCar = null;
    player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
    player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
    clampToWorld(player, PLAYER.radius);
    return { entered: false, car };
  }
  const car = nearestCar(state, player.x, player.y, 70);
  if (!car) return { entered: false, car: null };
  const stolen = car.kind !== 'player';
  player.inCar = car;
  car.kind = 'player';
  car.driver = 'player';
  if (stolen) {
    state.stats.carsStolen += 1;
    return { entered: true, car, stolen: true };
  }
  return { entered: true, car, stolen: false };
}

export function damagePlayer(state, amount) {
  const player = state.player;
  if (player.invulnerable > 0 || state.over) return;
  player.health -= amount;
  player.invulnerable = 0.4;
  if (player.health <= 0) {
    player.health = 0;
    state.over = 'wasted';
  }
}

export function healPlayer(state, amount) {
  state.player.health = Math.min(PLAYER.health, state.player.health + amount);
}

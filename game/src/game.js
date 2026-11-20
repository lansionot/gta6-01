// The one step that advances the whole game: the player, traffic,
// pedestrians, police, enemies, bullets, particles, missions and the
// camera. main.js calls it every fixed step with the current controls;
// shots.js calls it with no controls after steering the car itself.
import { STEP, VIEW, WORLD } from './config.js';
import { drivePlayerCar, movePlayerOnFoot } from './player.js';
import { updateCars } from './cars.js';
import { updatePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateBullets, updateEnemies } from './combat.js';
import { updateCourier, updateMissions } from './missions.js';

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updatePickups(state) {
  const player = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < 34) {
      if (pickup.kind === 'ammo') player.ammo = Math.min(120, player.ammo + pickup.amount);
      else player.health = Math.min(100, player.health + 25);
      state.pickups.splice(i, 1);
    }
  }
}

function updateCamera(state) {
  const player = state.player;
  const targetX = player.x - VIEW.width / 2;
  const targetY = player.y - VIEW.height / 2;
  state.camera.x += (targetX - state.camera.x) * 0.12;
  state.camera.y += (targetY - state.camera.y) * 0.12;
  state.camera.x = Math.max(0, Math.min(WORLD.width - VIEW.width, state.camera.x));
  state.camera.y = Math.max(0, Math.min(WORLD.height - VIEW.height, state.camera.y));
}

/** Advance the game one fixed step. `controls` may be empty. */
export function stepGame(state, dt, controls) {
  const c = controls ?? {};
  state.time += dt;
  state.dayTime = (state.dayTime + dt / 240) % 1;
  const player = state.player;
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (state.noticeTimer === undefined) state.noticeTimer = 0;
  if (state.notice) {
    state.noticeTimer += dt;
    if (state.noticeTimer > 4) {
      state.notice = null;
      state.noticeTimer = 0;
    }
  }
  if (player.inCar) {
    if (c.drive) drivePlayerCar(state, dt, c.drive.throttle, c.drive.steer);
  } else if (c.move) {
    movePlayerOnFoot(state, dt, c.move, c.run ?? false);
  }
  if (c.aimAngle !== undefined && !player.inCar) player.angle = c.aimAngle;
  updateCars(state, dt);
  updatePedestrians(state, dt, { x: player.x, y: player.y, active: state.gunfireTimer > 0 });
  if (state.gunfireTimer > 0) state.gunfireTimer -= dt;
  updatePolice(state, dt);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updateParticles(state, dt);
  updatePickups(state);
  updateMissions(state, dt);
  updateCourier(state);
  updateCamera(state);
  void STEP;
}

// The one step that advances the whole game: the player, traffic,
// pedestrians, police, enemies, bullets, particles, missions and the
// camera. main.js calls it every fixed step with the current controls;
// shots.js calls it with no controls after steering the car itself.
// Revision 2: Solmar coins are collected here (all 12 pay a $500 bonus
// and request a save), the camera shake decays, and pickup / mission
// events are flagged for main.js to turn into sounds.
import { COLLECTIBLES, STEP, VIEW, WORLD } from './config.js';
import { drivePlayerCar, movePlayerOnFoot } from './player.js';
import { updateCars } from './cars.js';
import { updatePedestrians } from './pedestrians.js';
import { updatePolice } from './police.js';
import { updateBullets, updateEnemies } from './combat.js';
import { updateCourier, updateMissions } from './missions.js';
import { addRing } from './world.js';
import { saveGame } from './save.js';

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Ring particles expand instead of drifting.
    if (p.ring) p.size += 90 * dt;
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
      addRing(state, pickup.x, pickup.y, '#58d68d');
      state.pickupEvent = pickup.kind;
      state.pickups.splice(i, 1);
    }
  }
}

function updateCoins(state) {
  const player = state.player;
  for (const coin of state.coins) {
    if (coin.taken) continue;
    if (Math.hypot(coin.x - player.x, coin.y - player.y) < 34) {
      coin.taken = true;
      state.coinsCollected += 1;
      state.stats.coinsFound += 1;
      player.money += 25;
      addRing(state, coin.x, coin.y, '#f2c94c');
      state.pickupEvent = 'coin';
      if (state.coinsCollected >= COLLECTIBLES.count) {
        player.money += COLLECTIBLES.bonus;
        state.notice = `All ${COLLECTIBLES.count} Solmar coins found — bonus +$${COLLECTIBLES.bonus}!`;
        state.saveRequest = true;
      } else {
        state.notice = `Solmar coin ${state.coinsCollected}/${COLLECTIBLES.count} — +$25`;
      }
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
  // Camera shake from hits and crashes fades back to still.
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 0.03);
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
  updatePedestrians(state, dt, {
    x: player.x,
    y: player.y,
    active: state.gunfireTimer > 0,
    carSpeed: player.inCar ? Math.abs(player.inCar.speed) : 0,
  });
  if (state.gunfireTimer > 0) state.gunfireTimer -= dt;
  updatePolice(state, dt);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updateParticles(state, dt);
  updatePickups(state);
  updateCoins(state);
  updateMissions(state, dt);
  updateCourier(state);
  updateCamera(state);
  if (state.saveRequest) {
    state.saveRequest = false;
    saveGame(state);
  }
  void STEP;
}

// Combat: fists, guns, bullets and the thugs who fight back. A punch
// hits the nearest enemy or pedestrian in front of the player; a shot
// fires toward the mouse (on foot) with limited ammo, a muzzle flash and
// a wanted star. Enemies chase the player, punch up close and shoot
// from a distance. Revision 2: thugs are fair (less damage, slower
// swings, shorter shooting range), hits flash white, kills can drop
// health, and every shot kicks the player back a little.
import { ENEMY, PLAYER } from './config.js';
import { addParticles, makeEnemy } from './world.js';
import { damagePlayer } from './player.js';
import { raiseWanted } from './police.js';

export function punch(state) {
  const player = state.player;
  if (player.punchCooldown > 0 || player.inCar) return null;
  player.punchCooldown = PLAYER.punchCooldown;
  const reach = PLAYER.punchRange + 14;
  let target = null;
  let bestDist = reach;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const angleDiff = Math.abs(((Math.atan2(enemy.y - player.y, enemy.x - player.x) - player.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d < bestDist && angleDiff < PLAYER.punchArc) {
      bestDist = d;
      target = enemy;
    }
  }
  if (target) {
    target.health -= PLAYER.punchDamage;
    target.flash = 0.15;
    addParticles(state, target.x, target.y, '#ffffff', 6, 160);
    state.shake = Math.max(state.shake, 0.12);
    if (target.health <= 0) killEnemy(state, target);
    return { hit: 'enemy', target };
  }
  for (const ped of state.peds) {
    const d = Math.hypot(ped.x - player.x, ped.y - player.y);
    if (d < reach) {
      state.peds.splice(state.peds.indexOf(ped), 1);
      player.money += 12;
      addParticles(state, ped.x, ped.y, '#ffffff', 6, 160);
      raiseWanted(state, 1, 'Assault — the police are coming.');
      return { hit: 'pedestrian', target: ped };
    }
  }
  return { hit: 'air', target: null };
}

export function shoot(state, angle) {
  const player = state.player;
  if (player.shootCooldown > 0 || player.ammo <= 0) return false;
  player.shootCooldown = PLAYER.shootCooldown;
  player.ammo -= 1;
  state.stats.shotsFired += 1;
  const ox = player.x + Math.cos(angle) * 24;
  const oy = player.y + Math.sin(angle) * 24;
  state.bullets.push({ x: ox, y: oy, vx: Math.cos(angle) * PLAYER.bulletSpeed, vy: Math.sin(angle) * PLAYER.bulletSpeed, life: 0.9, fromPlayer: true });
  addParticles(state, ox, oy, '#ffe08a', 5, 200);
  // Recoil: the shooter is pushed back a little, and the muzzle flashes.
  player.recoilTimer = 0.12;
  state.muzzleAngle = angle;
  state.gunfireTimer = 0.5;
  if (state.wanted === 0) raiseWanted(state, 1, 'Shots fired — the police are coming.');
  return true;
}

export function killEnemy(state, enemy) {
  enemy.alive = false;
  addParticles(state, enemy.x, enemy.y, '#e5534b', 14, 220);
  state.player.money += 40;
  const roll = state.random();
  if (roll < 0.4) state.pickups.push({ x: enemy.x, y: enemy.y, kind: 'ammo', amount: 12 });
  else if (roll < 0.7) state.pickups.push({ x: enemy.x, y: enemy.y, kind: 'health', amount: 25 });
}

/** Move bullets, hit enemies, police cars, traffic and the player. */
export function updateBullets(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    let dead = bullet.life <= 0;
    if (!dead) {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 20) {
          enemy.health -= PLAYER.bulletDamage;
          enemy.flash = 0.15;
          addParticles(state, bullet.x, bullet.y, '#e5534b', 5, 140);
          if (enemy.health <= 0) killEnemy(state, enemy);
          dead = true;
          break;
        }
      }
    }
    if (!dead && !bullet.fromPlayer) {
      if (Math.hypot(state.player.x - bullet.x, state.player.y - bullet.y) < 16) {
        damagePlayer(state, 12);
        dead = true;
      }
    }
    if (!dead && bullet.fromPlayer) {
      for (const car of state.police) {
        if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < 34) {
          raiseWanted(state, 1, 'You shot a police car.');
          dead = true;
          break;
        }
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }
}

/** Spawn `count` thugs around a point for a mission. */
export function spawnThugs(state, x, y, count) {
  state.enemies.length = 0;
  for (let i = 0; i < count; i += 1) {
    state.enemies.push(makeEnemy(state.random, x + (state.random() - 0.5) * 160, y + (state.random() - 0.5) * 160));
  }
  state.mission.thugsLeft = count;
}

/** Enemies chase the player, punch up close, shoot from range. */
export function updateEnemies(state, dt) {
  const player = state.player;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.flash > 0) enemy.flash -= dt;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.angle = Math.atan2(dy, dx);
    if (dist > 46) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
    } else {
      enemy.punchTimer -= dt;
      if (enemy.punchTimer <= 0) {
        enemy.punchTimer = ENEMY.punchCooldown;
        damagePlayer(state, ENEMY.punchDamage);
        addParticles(state, player.x, player.y, '#ffffff', 4, 120);
      }
    }
    if (dist > ENEMY.shootMinRange && dist < ENEMY.shootMaxRange) {
      enemy.shootTimer -= dt;
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = ENEMY.shootInterval + state.random();
        state.bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(enemy.angle) * ENEMY.bulletSpeed, vy: Math.sin(enemy.angle) * ENEMY.bulletSpeed, life: 1.1, fromPlayer: false });
        addParticles(state, enemy.x, enemy.y, '#ffe08a', 3, 140);
      }
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive);
  // Count the dead out of the mission only when they were mission thugs.
  if (state.mission.stage === 'fight') {
    state.mission.thugsLeft = state.enemies.filter((e) => e.alive).length;
  }
}

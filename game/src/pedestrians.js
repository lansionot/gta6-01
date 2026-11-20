// Pedestrians. They stroll along the sidewalks, change direction at
// intersections, and run away from gunfire or a speeding car. A pedestrian
// the player punches falls and drops a little cash. Revision 2: they also
// scatter from police sirens and from the player's car, they cross roads
// at intersections instead of hugging one block, and a fleeing pedestrian
// shows a "!" so the panic reads at a glance.
import { WORLD } from './config.js';
import { clampToWorld, hitsBuilding, isOnRoad } from './world.js';

/** One pedestrian for a step: walk, or flee from `threat` when it is near. */
export function updatePedestrian(state, ped, dt, threat) {
  const dx = ped.x - threat.x;
  const dy = ped.y - threat.y;
  const dist = Math.hypot(dx, dy);
  // Gunfire, a speeding car, or a siren nearby: run.
  const sirenNear = state.wanted > 0 && state.police.some((car) => Math.hypot(car.x - ped.x, car.y - ped.y) < 300);
  const carThreat = threat.carSpeed > 200 && dist < 220;
  if ((threat.active && dist < 320) || carThreat || sirenNear) {
    ped.fleeing = true;
    ped.angle = Math.atan2(dy, dx);
    const speed = ped.speed * 2.8;
    const nextX = ped.x + Math.cos(ped.angle) * speed * dt;
    const nextY = ped.y + Math.sin(ped.angle) * speed * dt;
    if (!hitsBuilding(state.city.buildings, nextX, nextY, 10)) {
      ped.x = nextX;
      ped.y = nextY;
    } else {
      ped.angle += Math.PI / 2;
    }
  } else {
    ped.fleeing = false;
    if (state.random() < 0.005) ped.angle = state.random() * Math.PI * 2;
    const nextX = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const nextY = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    // Cross roads at intersections; elsewhere stay on the sidewalk.
    const crossing = isOnRoad(ped.x, ped.y) && isOnRoad(nextX, nextY);
    if (!hitsBuilding(state.city.buildings, nextX, nextY, 10) && (crossing || !isOnRoad(nextX, nextY))) {
      ped.x = nextX;
      ped.y = nextY;
    } else {
      ped.angle += Math.PI / 2;
    }
  }
  ped.walkPhase += dt * (ped.fleeing ? 16 : 8);
  clampToWorld(ped, 12);
}

/** Update every pedestrian; `threat` is {x, y, active, carSpeed} (gunfire / a crash). */
export function updatePedestrians(state, dt, threat) {
  for (const ped of state.peds) updatePedestrian(state, ped, dt, threat);
}

export function pedNear(state, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const ped of state.peds) {
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = ped;
    }
  }
  return best;
}

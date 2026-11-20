// Drawing only: the city, the entities, the HUD with its minimap, and the
// menus. The camera follows the player across the 3200x2400 city; the
// 1280x720 viewport is scaled to fit the window and centred. Revision 2:
// richer city (trees, pier, boats, cranes, lit windows at night), cars
// with wheels, headlights and flashing police light bars, people who bob
// as they walk and shout "!" when they flee, a pulsing mission marker
// with a distance readout, smooth day-to-night light, and a cleaner HUD.
import { CAR, COLLECTIBLES, FONT, PALETTE, PLAYER, VIEW, WORLD } from './config.js';
import { missionObjective, missionTarget } from './missions.js';
import { roadLines } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function drawCarShape(context, x, y, angle, color, isPolice, braking, time, id) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  // Wheels: four dark stubs at the corners, so the car reads as a car.
  context.fillStyle = '#0a0c10';
  context.fillRect(-CAR.length / 2 + 6, -CAR.width / 2 - 3, 12, 5);
  context.fillRect(-CAR.length / 2 + 6, CAR.width / 2 - 2, 12, 5);
  context.fillRect(CAR.length / 2 - 18, -CAR.width / 2 - 3, 12, 5);
  context.fillRect(CAR.length / 2 - 18, CAR.width / 2 - 2, 12, 5);
  // Body with a darker outline, then the roof and windshield.
  context.fillStyle = '#111318';
  context.fillRect(-CAR.length / 2 - 2, -CAR.width / 2 - 2, CAR.length + 4, CAR.width + 4);
  context.fillStyle = color;
  context.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
  context.fillStyle = 'rgba(0,0,0,0.22)';
  context.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, 5);
  context.fillStyle = '#bfe3ff';
  context.fillRect(-8, -CAR.width / 2 + 4, 20, CAR.width - 8);
  context.fillStyle = '#22252c';
  context.fillRect(CAR.length / 2 - 14, -CAR.width / 2 + 3, 8, 6);
  context.fillRect(CAR.length / 2 - 14, CAR.width / 2 - 9, 8, 6);
  // Headlights forward, taillights aft (bright red while braking).
  context.fillStyle = '#fff6c0';
  context.fillRect(CAR.length / 2 - 2, -CAR.width / 2 + 4, 3, 5);
  context.fillRect(CAR.length / 2 - 2, CAR.width / 2 - 9, 3, 5);
  context.fillStyle = braking ? '#ff2e20' : '#c03028';
  context.fillRect(-CAR.length / 2 - 1, -CAR.width / 2 + 4, 3, 5);
  context.fillRect(-CAR.length / 2 - 1, CAR.width / 2 - 9, 3, 5);
  if (isPolice) {
    // White doors and a light bar that flashes red / blue in turns.
    context.fillStyle = '#ffffff';
    context.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 + 3, 10, CAR.width - 6);
    const phase = Math.floor(time * 4 + (id % 2)) % 2 === 0;
    context.fillStyle = phase ? '#ff3b30' : '#2f6fd0';
    context.fillRect(-4, -CAR.width / 2 - 2, 7, 5);
    context.fillStyle = phase ? '#2f6fd0' : '#ff3b30';
    context.fillRect(-4, CAR.width / 2 - 3, 7, 5);
  }
  context.restore();
}

function drawPerson(context, x, y, angle, color, walkPhase, radius, options) {
  const opts = options ?? {};
  const bob = Math.sin(walkPhase) * 1.5;
  context.save();
  context.translate(x, y + bob * 0.4);
  // Shadow, then body, then a head turned toward the facing angle.
  context.fillStyle = 'rgba(0,0,0,0.3)';
  context.beginPath();
  context.ellipse(0, radius * 0.7, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#111318';
  context.beginPath();
  context.arc(0, 0, radius + 2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = opts.flash > 0 ? '#ffffff' : color;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  // Walking feet: two dots that alternate with the walk phase.
  context.fillStyle = 'rgba(0,0,0,0.45)';
  context.beginPath();
  context.arc(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7 + bob, 3, 0, Math.PI * 2);
  context.arc(-Math.cos(angle) * radius * 0.7, -Math.sin(angle) * radius * 0.7 - bob, 3, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f2c9a0';
  context.beginPath();
  context.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, radius * 0.45, 0, Math.PI * 2);
  context.fill();
  if (opts.hat) {
    context.fillStyle = '#2f3a4a';
    context.beginPath();
    context.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, radius * 0.5, 0, Math.PI * 2);
    context.fill();
  }
  if (opts.bag) {
    context.fillStyle = '#8a5a3b';
    context.fillRect(-radius - 3, -3, 5, 7);
  }
  if (opts.fleeing) {
    context.fillStyle = '#ffffff';
    context.font = `700 16px ${FONT}`;
    context.textAlign = 'center';
    context.fillText('!', 0, -radius - 8);
  }
  context.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function panel(x, y, width, height, alpha) {
    context.fillStyle = `rgba(16,19,26,${alpha ?? 0.82})`;
    context.fillRect(x, y, width, height);
    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  /** How dark the night overlay is, and how bright windows glow, by time of day. */
  function daylight() {
    const t = ((stateRef.dayTime % 1) + 1) % 1;
    // 0.3 = afternoon sun, 0.5 = golden dusk, 0.75+ = night, 0.05 = dawn.
    if (t > 0.72 || t < 0.06) return { night: 0.34, window: 1 };
    if (t > 0.55) return { night: 0.16, window: 0.9 };
    if (t > 0.45) return { night: 0.06, window: 0.7 };
    return { night: 0, window: 0.45 };
  }
  let stateRef = { dayTime: 0.32, time: 0 };

  function drawCity(state, camera) {
    stateRef = state;
    const light = daylight();
    const { vertical, horizontal } = roadLines();
    // Ground, park and beach.
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    for (const park of state.city.parks) {
      context.fillStyle = PALETTE.park;
      context.fillRect(park.x - camera.x, park.y - camera.y, park.width, park.height);
      // A pond in the middle of the park.
      context.fillStyle = PALETTE.water;
      context.beginPath();
      context.ellipse(park.x + park.width / 2 - camera.x, park.y + park.height / 2 - camera.y, 46, 30, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Trees: trunk, then two overlapping canopies.
    for (const tree of state.city.trees) {
      const tx = tree.x - camera.x;
      const ty = tree.y - camera.y;
      if (tx < -30 || tx > VIEW.width + 30 || ty < -30 || ty > VIEW.height + 30) continue;
      context.fillStyle = PALETTE.trunk;
      context.fillRect(tx - 2, ty - 2, 4, 6);
      context.fillStyle = PALETTE.tree;
      context.beginPath();
      context.arc(tx, ty - 4, tree.size, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.treeLight;
      context.beginPath();
      context.arc(tx - tree.size * 0.3, ty - tree.size * 0.5, tree.size * 0.55, 0, Math.PI * 2);
      context.fill();
    }
    // Beach and water along the south edge, with a wooden pier and boats.
    context.fillStyle = PALETTE.sand;
    context.fillRect(0 - camera.x, state.city.beachY - camera.y, WORLD.width, WORLD.height - state.city.beachY);
    context.fillStyle = PALETTE.waterDeep;
    context.fillRect(0 - camera.x, state.city.beachY + 90 - camera.y, WORLD.width, WORLD.height - state.city.beachY - 90);
    context.fillStyle = PALETTE.water;
    context.fillRect(0 - camera.x, state.city.beachY + 90 - camera.y, WORLD.width, 40);
    context.fillStyle = '#7fc4e8';
    for (let x = 0; x < WORLD.width; x += 160) {
      context.fillRect(x + ((state.time * 20) % 160) - camera.x, state.city.beachY + 110 - camera.y, 80, 4);
    }
    const pier = state.city.pier;
    context.fillStyle = PALETTE.pier;
    context.fillRect(pier.x - camera.x, pier.y - camera.y, pier.width, pier.height);
    context.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = pier.y + 10; y < pier.y + pier.height; y += 18) context.fillRect(pier.x - camera.x, y - camera.y, pier.width, 3);
    for (const boat of state.city.boats) {
      context.save();
      context.translate(boat.x - camera.x, boat.y - camera.y);
      context.rotate(boat.angle);
      context.fillStyle = boat.color;
      context.beginPath();
      context.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#33373e';
      context.fillRect(-2, -26, 3, 26);
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.moveTo(1, -26);
      context.lineTo(1, -6);
      context.lineTo(18, -6);
      context.closePath();
      context.fill();
      context.restore();
    }
    // Dock cranes over the harbor.
    for (const crane of state.city.cranes) {
      context.fillStyle = '#d8c95a';
      context.fillRect(crane.x - camera.x - 3, crane.y - camera.y - 70, 6, 70);
      context.fillRect(crane.x - camera.x - 40, crane.y - camera.y - 70, 80, 6);
      context.fillStyle = '#33373e';
      context.fillRect(crane.x - camera.x + 30, crane.y - camera.y - 62, 3, 22);
      context.fillRect(crane.x - camera.x + 28, crane.y - camera.y - 40, 7, 7);
    }
    // Sidewalks, then roads.
    for (const rx of vertical) {
      context.fillStyle = PALETTE.sidewalk;
      context.fillRect(rx - WORLD.roadWidth / 2 - 10 - camera.x, 0 - camera.y, WORLD.roadWidth + 20, WORLD.height);
      context.fillStyle = PALETTE.road;
      context.fillRect(rx - WORLD.roadWidth / 2 - camera.x, 0 - camera.y, WORLD.roadWidth, WORLD.height);
    }
    for (const ry of horizontal) {
      context.fillStyle = PALETTE.sidewalk;
      context.fillRect(0 - camera.x, ry - WORLD.roadWidth / 2 - 10 - camera.y, WORLD.width, WORLD.roadWidth + 20);
      context.fillStyle = PALETTE.road;
      context.fillRect(0 - camera.x, ry - WORLD.roadWidth / 2 - camera.y, WORLD.width, WORLD.roadWidth);
    }
    // Dashed centre lines.
    context.fillStyle = PALETTE.roadLine;
    for (const rx of vertical) {
      for (let y = 0; y < WORLD.height; y += 64) context.fillRect(rx - 2 - camera.x, y - camera.y, 4, 30);
    }
    for (const ry of horizontal) {
      for (let x = 0; x < WORLD.width; x += 64) context.fillRect(x - camera.x, ry - 2 - camera.y, 30, 4);
    }
    // Buildings with windows that glow brighter as night falls.
    for (const b of state.city.buildings) {
      if (b.x + b.width < camera.x || b.x > camera.x + VIEW.width || b.y + b.height < camera.y || b.y > camera.y + VIEW.height) continue;
      context.fillStyle = '#2a2d33';
      context.fillRect(b.x - camera.x + 4, b.y - camera.y + 4, b.width, b.height);
      context.fillStyle = b.color;
      context.fillRect(b.x - camera.x, b.y - camera.y, b.width, b.height);
      if (b.kind === 'tower') {
        context.fillStyle = 'rgba(0,0,0,0.3)';
        context.fillRect(b.x - camera.x, b.y - camera.y, b.width, 8);
      } else if (b.kind === 'mall') {
        context.fillStyle = 'rgba(255,255,255,0.18)';
        context.fillRect(b.x - camera.x, b.y - camera.y + b.height / 2 - 6, b.width, 12);
      }
      context.fillStyle = `rgba(255, 240, 180, ${0.35 + light.window * 0.5})`;
      let wyIndex = 0;
      for (let wy = b.y + 12; wy < b.y + b.height - 12; wy += 26, wyIndex += 1) {
        let wxIndex = 0;
        for (let wx = b.x + 12; wx < b.x + b.width - 12; wx += 26, wxIndex += 1) {
          if ((wxIndex + wyIndex) % 2 === 0) context.fillRect(wx - camera.x, wy - camera.y, 12, 14);
        }
      }
      // Rooftop detail: air-con boxes, and a helipad on the tallest tower.
      context.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < b.roofSeed; i += 1) context.fillRect(b.x - camera.x + 14 + i * 26, b.y - camera.y + 10, 16, 10);
      if (b.kind === 'tower' && b.floors >= 14) {
        context.strokeStyle = '#f2c94c';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(b.x - camera.x + b.width / 2, b.y - camera.y + b.height / 2, 16, 0, Math.PI * 2);
        context.stroke();
        text('H', b.x - camera.x + b.width / 2, b.y - camera.y + b.height / 2 + 6, 16, '#f2c94c', 'center', true);
      }
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(b.x - camera.x, b.y - camera.y + b.height - 10, b.width, 10);
    }
    // City name on the park.
    text('SOLMAR BAY', 700, 900, 44, 'rgba(255,255,255,0.5)', 'center', true);
  }

  function drawMarker(state, camera) {
    const target = missionTarget(state);
    if (!target) return;
    const x = target.x - camera.x;
    const y = target.y - camera.y;
    const bob = Math.sin(state.time * 4) * 6;
    const pulse = 34 + Math.sin(state.time * 3) * 5;
    context.fillStyle = PALETTE.marker;
    context.beginPath();
    context.moveTo(x, y + bob - 26);
    context.lineTo(x - 12, y + bob - 52);
    context.lineTo(x + 12, y + bob - 52);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.marker;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, pulse, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = 'rgba(242,201,76,0.35)';
    context.beginPath();
    context.arc(x, y, pulse + 12, 0, Math.PI * 2);
    context.stroke();
    // Distance to the objective, so the player always knows how far it is.
    const dist = Math.round(Math.hypot(state.player.x - target.x, state.player.y - target.y));
    text(`${dist}m`, x, y + bob - 62, 16, PALETTE.marker, 'center', true);
  }

  function drawEntities(state, camera) {
    // Solmar coins: spinning gold discs with a "$".
    for (const coin of state.coins) {
      if (coin.taken) continue;
      const cx = coin.x - camera.x;
      const cy = coin.y - camera.y;
      const spin = Math.abs(Math.cos(state.time * 3 + coin.x)) * 0.7 + 0.3;
      context.fillStyle = 'rgba(242,201,76,0.35)';
      context.beginPath();
      context.arc(cx, cy, 16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.coin;
      context.beginPath();
      context.ellipse(cx, cy, 10 * spin, 10, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#7a5a00';
      context.font = `700 12px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('$', cx, cy + 4);
    }
    for (const pickup of state.pickups) {
      const bob = Math.sin(state.time * 5 + pickup.x) * 3;
      context.fillStyle = pickup.kind === 'ammo' ? '#ffe08a' : '#58d68d';
      context.beginPath();
      context.arc(pickup.x - camera.x, pickup.y - camera.y + bob, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#111318';
      context.font = `700 14px ${FONT}`;
      context.textAlign = 'center';
      context.fillText(pickup.kind === 'ammo' ? 'A' : '+', pickup.x - camera.x, pickup.y - camera.y + bob + 5);
    }
    for (const ped of state.peds) {
      drawPerson(context, ped.x - camera.x, ped.y - camera.y, ped.angle, ped.color, ped.walkPhase, 9, { hat: ped.hat, bag: ped.bag, fleeing: ped.fleeing });
    }
    for (const car of state.cars) {
      const screenX = car.x - camera.x;
      const screenY = car.y - camera.y;
      if (screenX < -80 || screenX > VIEW.width + 80 || screenY < -80 || screenY > VIEW.height + 80) continue;
      if (car.smoke > 0) {
        context.fillStyle = 'rgba(200,200,200,0.5)';
        context.beginPath();
        context.arc(screenX - Math.cos(car.angle) * 30, screenY - Math.sin(car.angle) * 30, 10 + car.smoke * 10, 0, Math.PI * 2);
        context.fill();
      }
      drawCarShape(context, screenX, screenY, car.angle, car.kind === 'police' ? '#2f6fd0' : car.color, car.kind === 'police', car.braking, state.time, car.id);
    }
    for (const enemy of state.enemies) {
      drawPerson(context, enemy.x - camera.x, enemy.y - camera.y, enemy.angle, '#e5534b', 0, 11, { flash: enemy.flash });
      context.fillStyle = '#111318';
      context.fillRect(enemy.x - 16 - camera.x, enemy.y - 24 - camera.y, 32, 5);
      context.fillStyle = '#e5534b';
      context.fillRect(enemy.x - 16 - camera.x, enemy.y - 24 - camera.y, 32 * (enemy.health / 50), 5);
    }
    const player = state.player;
    if (!player.inCar) {
      const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
      if (!blink) drawPerson(context, player.x - camera.x, player.y - camera.y, player.angle, PALETTE.player, 0, PLAYER.radius, {});
      // Aim direction on foot, with a muzzle flash when firing.
      context.strokeStyle = 'rgba(255,255,255,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(player.x - camera.x, player.y - camera.y);
      context.lineTo(player.x - camera.x + Math.cos(player.angle) * 30, player.y - camera.y + Math.sin(player.angle) * 30);
      context.stroke();
      if (state.gunfireTimer > 0.35) {
        const fx = player.x - camera.x + Math.cos(state.muzzleAngle) * 34;
        const fy = player.y - camera.y + Math.sin(state.muzzleAngle) * 34;
        context.fillStyle = '#ffe08a';
        context.beginPath();
        context.arc(fx, fy, 10, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(fx, fy, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    for (const bullet of state.bullets) {
      context.fillStyle = '#ffe08a';
      context.beginPath();
      context.arc(bullet.x - camera.x, bullet.y - camera.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      if (particle.ring) {
        context.lineWidth = 3;
        context.strokeStyle = particle.color;
        context.arc(particle.x - camera.x, particle.y - camera.y, particle.size, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.arc(particle.x - camera.x, particle.y - camera.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }
  }

  function drawMinimap(state) {
    const size = 190;
    const x0 = VIEW.width - size - 16;
    const y0 = VIEW.height - size - 16;
    const scale = size / WORLD.width;
    panel(x0 - 4, y0 - 4, size + 8, size + 8, 0.85);
    context.fillStyle = '#3f7a44';
    context.fillRect(x0, y0, size, size);
    context.fillStyle = '#33373e';
    const { vertical, horizontal } = roadLines();
    for (const rx of vertical) context.fillRect(x0 + rx * scale - 2, y0, 4, size);
    for (const ry of horizontal) context.fillRect(x0, y0 + ry * scale - 2, size, 4);
    context.fillStyle = '#2b6cb0';
    context.fillRect(x0, y0 + state.city.beachY * scale, size, size - state.city.beachY * scale);
    // Coins left, as gold dots.
    context.fillStyle = PALETTE.coin;
    for (const coin of state.coins) {
      if (!coin.taken) context.fillRect(x0 + coin.x * scale - 1, y0 + coin.y * scale - 1, 3, 3);
    }
    const target = missionTarget(state);
    if (target) {
      context.fillStyle = PALETTE.marker;
      context.beginPath();
      context.arc(x0 + target.x * scale, y0 + target.y * scale, 6, 0, Math.PI * 2);
      context.fill();
    }
    for (const car of state.police) {
      context.fillStyle = '#5a9bff';
      context.fillRect(x0 + car.x * scale - 3, y0 + car.y * scale - 3, 6, 6);
    }
    const player = state.player;
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(x0 + player.x * scale, y0 + player.y * scale, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(x0 + player.x * scale, y0 + player.y * scale, 3.5, 0, Math.PI * 2);
    context.fill();
    // Camera view rectangle and a north arrow.
    context.strokeStyle = 'rgba(255,255,255,0.6)';
    context.lineWidth = 1;
    context.strokeRect(x0 + state.camera.x * scale, y0 + state.camera.y * scale, VIEW.width * scale, VIEW.height * scale);
    text('N', x0 + size - 10, y0 + 14, 12, '#ffffff', 'center', true);
  }

  function drawBigMap(state) {
    context.fillStyle = 'rgba(8,10,14,0.92)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    text('SOLMAR BAY — MAP', VIEW.width / 2, 60, 34, PALETTE.text, 'center', true);
    const size = 560;
    const x0 = (VIEW.width - size) / 2;
    const y0 = 90;
    const scale = size / WORLD.width;
    context.fillStyle = '#3f7a44';
    context.fillRect(x0, y0, size, size * WORLD.height / WORLD.width);
    context.fillStyle = '#33373e';
    const { vertical, horizontal } = roadLines();
    for (const rx of vertical) context.fillRect(x0 + rx * scale - 4, y0, 8, size * WORLD.height / WORLD.width);
    for (const ry of horizontal) context.fillRect(x0, y0 + ry * scale - 4, size, 8);
    context.fillStyle = '#2b6cb0';
    context.fillRect(x0, y0 + state.city.beachY * scale, size, size * WORLD.height / WORLD.width - state.city.beachY * scale);
    context.fillStyle = PALETTE.coin;
    for (const coin of state.coins) {
      if (!coin.taken) context.fillRect(x0 + coin.x * scale - 2, y0 + coin.y * scale - 2, 4, 4);
    }
    const target = missionTarget(state);
    if (target) {
      context.fillStyle = PALETTE.marker;
      context.beginPath();
      context.arc(x0 + target.x * scale, y0 + target.y * scale, 10, 0, Math.PI * 2);
      context.fill();
      text('Objective', x0 + target.x * scale + 16, y0 + target.y * scale + 5, 18, PALETTE.marker, 'left', true);
    }
    text('You', x0 + state.player.x * scale + 14, y0 + state.player.y * scale + 5, 18, PALETTE.text, 'left', true);
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(x0 + state.player.x * scale, y0 + state.player.y * scale, 8, 0, Math.PI * 2);
    context.fill();
    text('Press M to close the map', VIEW.width / 2, VIEW.height - 30, 20, PALETTE.muted, 'center');
  }

  function drawHud(state, showMap, muted) {
    const player = state.player;
    // Top-left panel: money, health bar, ammo and coins.
    panel(12, 12, 262, 96);
    text(`$${player.money}`, 24, 42, 28, PALETTE.text, 'left', true);
    text(`◉ ${state.coinsCollected}/${COLLECTIBLES.count}`, 200, 40, 18, PALETTE.coin, 'left', true);
    context.fillStyle = '#22252c';
    context.fillRect(24, 52, 210, 12);
    context.fillStyle = PALETTE.health;
    context.fillRect(24, 52, 210 * (player.health / 100), 12);
    context.strokeStyle = 'rgba(255,255,255,0.25)';
    context.strokeRect(24.5, 52.5, 210, 12);
    text(`HP ${Math.ceil(player.health)}   Ammo ${player.ammo}`, 24, 88, 16, PALETTE.muted, 'left');
    if (muted) text('Muted (N)', 24, 102, 14, PALETTE.muted, 'left');
    // Wanted stars, top right.
    panel(VIEW.width - 220, 12, 208, 44);
    for (let i = 0; i < 5; i += 1) {
      text('★', VIEW.width - 200 + i * 38, 44, 28, i < state.wanted ? PALETTE.wanted : '#3a3f4a', 'left', true);
    }
    // Mission objective, top centre: mission title over the objective.
    const objective = missionObjective(state);
    panel((VIEW.width - 640) / 2, 12, 640, 56);
    const mission = state.mission.index < 3 ? `Mission ${state.mission.index + 1} of 3` : 'Free roam';
    text(mission, VIEW.width / 2, 34, 13, PALETTE.accent, 'center', true);
    text(objective, VIEW.width / 2, 56, 18, PALETTE.text, 'center');
    // Speed, bottom left when driving.
    if (player.inCar) {
      panel(12, VIEW.height - 64, 190, 52);
      text(`${Math.round(Math.abs(player.inCar.speed) * 0.18)} km/h`, 24, VIEW.height - 28, 28, PALETTE.text, 'left', true);
    } else {
      text('WASD move · E enter car · F punch · Space shoot · H horn · M map · P pause', 16, VIEW.height - 20, 15, 'rgba(238,241,245,0.75)', 'left');
    }
    if (state.notice) text(state.notice, VIEW.width / 2, 88, 18, PALETTE.accent, 'center', true);
    if (state.dialogue) {
      panel(240, VIEW.height - 150, VIEW.width - 480, 64, 0.88);
      text(`${state.dialogue.speaker}:`, 260, VIEW.height - 122, 18, PALETTE.accent, 'left', true);
      text(state.dialogue.text, 260, VIEW.height - 98, 18, PALETTE.text, 'left');
    }
    drawMinimap(state);
    if (showMap) drawBigMap(state);
  }

  function drawPanel(title, lines, prompt) {
    const width = 720;
    const height = 170 + lines.length * 32;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = 'rgba(10,12,18,0.94)';
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    context.fillStyle = PALETTE.accent;
    context.fillRect(x + 60, y + 84, width - 120, 2);
    text(title, VIEW.width / 2, y + 64, 48, PALETTE.text, 'center', true);
    for (let i = 0; i < lines.length; i += 1) text(lines[i], VIEW.width / 2, y + 122 + i * 32, 20, PALETTE.muted, 'center');
    const blink = Math.floor(stateRef.time * 2) % 2 === 0;
    text(prompt, VIEW.width / 2, y + height - 28, 22, blink ? PALETTE.accent : PALETTE.text, 'center', true);
  }

  function drawDaylight(state) {
    // Smooth light: golden at dusk, deep blue at night, clear at noon.
    const light = daylight();
    if (light.night > 0) {
      context.fillStyle = `rgba(8,10,40,${light.night})`;
      context.fillRect(0, 0, VIEW.width, VIEW.height);
    } else if (state.dayTime > 0.45 && state.dayTime < 0.55) {
      context.fillStyle = 'rgba(255,170,80,0.07)';
      context.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  /** Paint one frame for the given screen. */
  function draw(state, screen, options) {
    const opts = options ?? {};
    stateRef = state;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0b0e14';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Camera shake: a small random offset that fades with state.shake.
    const shakeX = state.shake > 0 ? (state.random() - 0.5) * state.shake * 24 : 0;
    const shakeY = state.shake > 0 ? (state.random() - 0.5) * state.shake * 24 : 0;
    const camera = { x: state.camera.x + shakeX, y: state.camera.y + shakeY };
    drawCity(state, camera);
    drawMarker(state, camera);
    drawEntities(state, camera);
    drawDaylight(state);
    if (screen === SCREEN_TITLE) {
      const lines = [
        'Solmar Bay — an open-world crime story, all its own.',
        'Steal cars, lose the heat, run three missions for Lena and Marco.',
        'Hunt 12 gold coins hidden around the city — all 12 pay a $500 bonus.',
        'WASD / arrows move · E enter car · F punch · Space shoot · H horn · M map',
        opts.hasSave ? 'A saved game is waiting — press Enter to continue it.' : 'No save yet — your progress saves when a mission ends.',
      ];
      drawPanel('SOLMAR BAY', lines, 'Press Space or click to start');
      return;
    }
    drawHud(state, opts.showMap, opts.muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', [
        `Money $${state.player.money} · Missions ${state.stats.missionsDone}/3 · Coins ${state.coinsCollected}/${COLLECTIBLES.count}`,
        'The city waits for you. Progress is saved.',
      ], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      const title = state.over === 'busted' ? 'Busted!' : 'Wasted';
      drawPanel(title, [
        `Money $${state.player.money} · Missions ${state.stats.missionsDone}/3 · Cars stolen ${state.stats.carsStolen}`,
        'The streets of Solmar Bay are unforgiving.',
      ], 'Press Space to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    view,
    /** Convert a mouse position in CSS pixels to world coordinates. */
    toWorld(mouseX, mouseY, camera) {
      const ratio = window.devicePixelRatio || 1;
      return {
        x: camera.x + (mouseX * ratio - view.x) / view.scale,
        y: camera.y + (mouseY * ratio - view.y) / view.scale,
      };
    },
  };
}

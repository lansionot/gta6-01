// Drawing only: the city, the entities, the HUD with its minimap, and the
// menus. The camera follows the player across the 3200x2400 city; the
// 1280x720 viewport is scaled to fit the window and centred.
import { CAR, FONT, PALETTE, PLAYER, VIEW, WORLD } from './config.js';
import { missionObjective, missionTarget } from './missions.js';
import { roadLines } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function drawCarShape(context, x, y, angle, color, isPolice) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = '#111318';
  context.fillRect(-CAR.length / 2 - 2, -CAR.width / 2 - 2, CAR.length + 4, CAR.width + 4);
  context.fillStyle = color;
  context.fillRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width);
  context.fillStyle = '#bfe3ff';
  context.fillRect(-6, -CAR.width / 2 + 4, 18, CAR.width - 8);
  context.fillStyle = '#22252c';
  context.fillRect(CAR.length / 2 - 14, -CAR.width / 2 + 3, 8, 6);
  context.fillRect(CAR.length / 2 - 14, CAR.width / 2 - 9, 8, 6);
  if (isPolice) {
    context.fillStyle = '#ffffff';
    context.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 + 3, 10, CAR.width - 6);
    context.fillStyle = '#ff3b30';
    context.fillRect(-2, -CAR.width / 2 - 2, 6, 5);
    context.fillStyle = '#2f6fd0';
    context.fillRect(-2, CAR.width / 2 - 3, 6, 5);
  }
  context.restore();
}

function drawPerson(context, x, y, angle, color, walkPhase, radius) {
  context.save();
  context.translate(x, y);
  context.fillStyle = '#111318';
  context.beginPath();
  context.arc(0, 0, radius + 2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f2c9a0';
  context.beginPath();
  context.arc(Math.cos(angle) * 4, Math.sin(angle) * 4, radius * 0.45, 0, Math.PI * 2);
  context.fill();
  context.restore();
  void walkPhase;
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

  function drawCity(state, camera) {
    const { vertical, horizontal } = roadLines();
    // Ground, park and beach.
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    for (const park of state.city.parks) {
      context.fillStyle = PALETTE.park;
      context.fillRect(park.x - camera.x, park.y - camera.y, park.width, park.height);
      context.fillStyle = '#2f6b33';
      for (let i = 0; i < 8; i += 1) {
        context.beginPath();
        context.arc(park.x + 40 + i * 36 - camera.x, park.y + 50 + (i % 3) * 60 - camera.y, 14, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Beach and water along the south edge.
    context.fillStyle = PALETTE.sand;
    context.fillRect(0 - camera.x, state.city.beachY - camera.y, WORLD.width, WORLD.height - state.city.beachY);
    context.fillStyle = PALETTE.water;
    context.fillRect(0 - camera.x, state.city.beachY + 90 - camera.y, WORLD.width, WORLD.height - state.city.beachY - 90);
    context.fillStyle = '#7fc4e8';
    for (let x = 0; x < WORLD.width; x += 160) {
      context.fillRect(x + ((state.time * 20) % 160) - camera.x, state.city.beachY + 110 - camera.y, 80, 4);
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
    // Buildings with windows.
    for (const b of state.city.buildings) {
      if (b.x + b.width < camera.x || b.x > camera.x + VIEW.width || b.y + b.height < camera.y || b.y > camera.y + VIEW.height) continue;
      context.fillStyle = '#2a2d33';
      context.fillRect(b.x - camera.x + 4, b.y - camera.y + 4, b.width, b.height);
      context.fillStyle = b.color;
      context.fillRect(b.x - camera.x, b.y - camera.y, b.width, b.height);
      context.fillStyle = 'rgba(255, 240, 180, 0.85)';
      let wyIndex = 0;
      for (let wy = b.y + 12; wy < b.y + b.height - 12; wy += 26, wyIndex += 1) {
        let wxIndex = 0;
        for (let wx = b.x + 12; wx < b.x + b.width - 12; wx += 26, wxIndex += 1) {
          if ((wxIndex + wyIndex) % 2 === 0) context.fillRect(wx - camera.x, wy - camera.y, 12, 14);
        }
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
    context.arc(x, y, 34 + Math.sin(state.time * 3) * 5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawEntities(state, camera) {
    for (const pickup of state.pickups) {
      context.fillStyle = pickup.kind === 'ammo' ? '#ffe08a' : '#58d68d';
      context.fillRect(pickup.x - 8 - camera.x, pickup.y - 8 - camera.y, 16, 16);
      text(pickup.kind === 'ammo' ? 'A' : '+', pickup.x - camera.x, pickup.y - camera.y + 5, 14, '#111318', 'center', true);
    }
    for (const ped of state.peds) {
      drawPerson(context, ped.x - camera.x, ped.y - camera.y, ped.angle, ped.color, ped.walkPhase, 9);
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
      drawCarShape(context, screenX, screenY, car.angle, car.kind === 'police' ? '#2f6fd0' : car.color, car.kind === 'police');
    }
    for (const enemy of state.enemies) {
      drawPerson(context, enemy.x - camera.x, enemy.y - camera.y, enemy.angle, '#e5534b', 0, 11);
      context.fillStyle = '#111318';
      context.fillRect(enemy.x - 16 - camera.x, enemy.y - 24 - camera.y, 32, 5);
      context.fillStyle = '#e5534b';
      context.fillRect(enemy.x - 16 - camera.x, enemy.y - 24 - camera.y, 32 * (enemy.health / 60), 5);
    }
    const player = state.player;
    if (!player.inCar) {
      const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
      if (!blink) drawPerson(context, player.x - camera.x, player.y - camera.y, player.angle, PALETTE.player, 0, PLAYER.radius);
      // Aim direction on foot.
      context.strokeStyle = 'rgba(255,255,255,0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(player.x - camera.x, player.y - camera.y);
      context.lineTo(player.x - camera.x + Math.cos(player.angle) * 30, player.y - camera.y + Math.sin(player.angle) * 30);
      context.stroke();
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
      context.arc(particle.x - camera.x, particle.y - camera.y, particle.size, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawMinimap(state) {
    const size = 190;
    const x0 = VIEW.width - size - 16;
    const y0 = VIEW.height - size - 16;
    const scale = size / WORLD.width;
    context.fillStyle = 'rgba(16,19,26,0.85)';
    context.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
    context.fillStyle = '#3f7a44';
    context.fillRect(x0, y0, size, size);
    context.fillStyle = '#33373e';
    const { vertical, horizontal } = roadLines();
    for (const rx of vertical) context.fillRect(x0 + rx * scale - 2, y0, 4, size);
    for (const ry of horizontal) context.fillRect(x0, y0 + ry * scale - 2, size, 4);
    context.fillStyle = '#2b6cb0';
    context.fillRect(x0, y0 + state.city.beachY * scale, size, size - state.city.beachY * scale);
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
    // Camera view rectangle.
    context.strokeStyle = 'rgba(255,255,255,0.6)';
    context.lineWidth = 1;
    context.strokeRect(x0 + state.camera.x * scale, y0 + state.camera.y * scale, VIEW.width * scale, VIEW.height * scale);
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

  function drawHud(state, showMap) {
    const player = state.player;
    // Top-left panel: health, money, ammo.
    context.fillStyle = 'rgba(16,19,26,0.8)';
    context.fillRect(12, 12, 250, 86);
    text(`$${player.money}`, 24, 40, 26, PALETTE.text, 'left', true);
    context.fillStyle = '#22252c';
    context.fillRect(24, 50, 200, 12);
    context.fillStyle = PALETTE.health;
    context.fillRect(24, 50, 200 * (player.health / 100), 12);
    text(`HP ${Math.ceil(player.health)}   Ammo ${player.ammo}`, 24, 84, 16, PALETTE.muted, 'left');
    // Wanted stars, top right.
    context.fillStyle = 'rgba(16,19,26,0.8)';
    context.fillRect(VIEW.width - 220, 12, 208, 44);
    for (let i = 0; i < 5; i += 1) {
      text('★', VIEW.width - 200 + i * 38, 44, 28, i < state.wanted ? PALETTE.wanted : '#3a3f4a', 'left', true);
    }
    // Mission objective, top centre.
    const objective = missionObjective(state);
    context.fillStyle = 'rgba(16,19,26,0.8)';
    const objWidth = Math.min(640, 24 + objective.length * 8.5);
    context.fillRect((VIEW.width - objWidth) / 2, 12, objWidth, 44);
    text(objective, VIEW.width / 2, 42, 18, PALETTE.text, 'center');
    // Speed, bottom left when driving.
    if (player.inCar) {
      context.fillStyle = 'rgba(16,19,26,0.8)';
      context.fillRect(12, VIEW.height - 64, 170, 52);
      text(`${Math.round(Math.abs(player.inCar.speed) * 0.18)} km/h`, 24, VIEW.height - 28, 28, PALETTE.text, 'left', true);
    } else {
      text('WASD move · E enter car · F punch · Space shoot · M map · P pause', 16, VIEW.height - 20, 15, 'rgba(238,241,245,0.75)', 'left');
    }
    if (state.notice) text(state.notice, VIEW.width / 2, 78, 18, PALETTE.accent, 'center', true);
    if (state.dialogue) {
      context.fillStyle = 'rgba(16,19,26,0.88)';
      context.fillRect(240, VIEW.height - 150, VIEW.width - 480, 64);
      text(`${state.dialogue.speaker}:`, 260, VIEW.height - 122, 18, PALETTE.accent, 'left', true);
      text(state.dialogue.text, 260, VIEW.height - 98, 18, PALETTE.text, 'left');
    }
    drawMinimap(state);
    if (showMap) drawBigMap(state);
  }

  function drawPanel(title, lines, prompt) {
    const width = 680;
    const height = 150 + lines.length * 32;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = 'rgba(16,19,26,0.92)';
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    text(title, VIEW.width / 2, y + 64, 46, PALETTE.text, 'center', true);
    for (let i = 0; i < lines.length; i += 1) text(lines[i], VIEW.width / 2, y + 112 + i * 32, 20, PALETTE.muted, 'center');
    text(prompt, VIEW.width / 2, y + height - 28, 22, PALETTE.accent, 'center', true);
  }

  function drawDaylight(state) {
    // Sun-soaked by day, cooler and darker by night; dayTime drifts slowly.
    const night = state.dayTime > 0.75 || state.dayTime < 0.05 ? 0.28 : 0;
    if (night > 0) {
      context.fillStyle = `rgba(8,10,40,${night})`;
      context.fillRect(0, 0, VIEW.width, VIEW.height);
    } else {
      context.fillStyle = 'rgba(255,190,90,0.05)';
      context.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  /** Paint one frame for the given screen. */
  function draw(state, screen, options) {
    const opts = options ?? {};
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0b0e14';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const camera = state.camera;
    drawCity(state, camera);
    drawMarker(state, camera);
    drawEntities(state, camera);
    drawDaylight(state);
    if (screen === SCREEN_TITLE) {
      const lines = [
        'Solmar Bay — an open-world crime story, all its own.',
        'Steal cars, lose the heat, run three missions for Lena and Marco.',
        'WASD / arrows move · E enter car · F punch · Space shoot · M map',
        opts.hasSave ? 'A saved game is waiting — press Enter to continue it.' : 'No save yet — your progress saves when a mission ends.',
      ];
      drawPanel('SOLMAR BAY', lines, 'Press Space or click to start');
      return;
    }
    drawHud(state, opts.showMap);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The city waits for you.', 'Progress is saved.'], 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      const title = state.over === 'busted' ? 'Busted!' : 'Wasted';
      drawPanel(title, [`Money $${state.player.money}`, 'The streets of Solmar Bay are unforgiving.'], 'Press Space to play again');
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

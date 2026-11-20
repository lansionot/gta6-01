// Boot and the one loop: input is read every frame, the game advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens:
// title, play, paused and game over. Revision 2: the horn (H), pickup
// and mission jingles, and window.__solmarAudio so a headless run can
// prove the WebAudio sounds actually fired.
//
// ?seed=N fixes the city layout. ?shot=start|play|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { stepGame } from './game.js';
import { toggleEnterCar } from './player.js';
import { punch, shoot } from './combat.js';
import { raiseWanted } from './police.js';
import { startCourierJob, talkToGiver } from './missions.js';
import { applySave, hasSave, loadSave, saveGame } from './save.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_HONK, ACTION_JOB, ACTION_MAP, ACTION_MUTE,
  ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOOT, ACTION_TALK, createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { hasSave: false, showMap: false });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let showMap = false;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame(continueSave) {
    world.reset();
    if (continueSave) {
      const data = loadSave();
      if (data) {
        applySave(world.state, data);
        announce('Save loaded. Welcome back to Solmar Bay.');
      }
    }
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Find Lena at the blue marker to start the first mission.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    announce(world.state.over === 'busted' ? 'Busted. The police took you in.' : 'Wasted. Solmar Bay got the better of you.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame(hasSave());
      return;
    }
    if (screen !== SCREEN_PLAY) {
      if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      saveGame(world.state);
      announce('Paused. Progress saved.');
      return;
    }
    if (actions & ACTION_MAP) showMap = !showMap;
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_HONK) audio.honk();
    if (actions & ACTION_ENTER_CAR) {
      const result = toggleEnterCar(world.state);
      if (result.entered && result.stolen) {
        raiseWanted(world.state, 1, 'Grand theft auto — the police are coming.');
        audio.crash();
      }
    }
    if (actions & ACTION_PUNCH) {
      const result = punch(world.state);
      if (result) audio.punch();
    }
    if (actions & ACTION_TALK) talkToGiver(world.state);
    if (actions & ACTION_JOB) startCourierJob(world.state);
    if (actions & ACTION_SHOOT || input.mouse().down) {
      const mouse = input.mouse();
      const state = world.state;
      const worldPoint = renderer.toWorld(mouse.x, mouse.y, state.camera);
      const angle = Math.atan2(worldPoint.y - state.player.y, worldPoint.x - state.player.x);
      if (shoot(state, angle)) {
        state.gunfireTimer = 0.5;
        audio.gunshot();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        stepGame(world.state, STEP, {});
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const state = world.state;
        const controls = state.player.inCar
          ? { drive: input.drive() }
          : { move: input.move(), run: input.isRunning() };
        if (!state.player.inCar) {
          const mouse = input.mouse();
          const worldPoint = renderer.toWorld(mouse.x, mouse.y, state.camera);
          controls.aimAngle = Math.atan2(worldPoint.y - state.player.y, worldPoint.x - state.player.x);
        }
        stepGame(state, STEP, controls);
        accumulator -= STEP;
        // The step flags sounds; the loop turns them into audio.
        if (state.pickupEvent) {
          if (state.pickupEvent === 'coin') audio.coin();
          else audio.pickup();
          state.pickupEvent = null;
        }
        if (state.missionEvent) {
          audio.missionDone();
          state.missionEvent = null;
        }
        if (state.over) {
          endGame();
          break;
        }
      }
      const state = world.state;
      audio.setEngine(state.player.inCar ? state.player.inCar.speed : 0, !!state.player.inCar);
      audio.setSiren(state.wanted);
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { hasSave: hasSave(), showMap, muted: audio.isMuted() });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame(world.state);
      announce('Paused.');
    }
  });

  announce('Solmar Bay. Press Space or click to start.');
  window.__solmar = world;
  // The audio log is how a headless play-test proves sounds fired.
  window.__solmarAudio = audio;
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

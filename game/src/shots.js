// The screenshot scenes behind ?shot=start|play|chase|mission. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps with a scripted driver, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stepGame } from './game.js';
import { drivePlayerCar } from './player.js';
import { raiseWanted } from './police.js';
import { talkToGiver } from './missions.js';

/** Drive forward, steering gently back toward the avenue. */
function autopilotDrive(state, dt) {
  const car = state.player.inCar;
  if (!car) return;
  drivePlayerCar(state, dt, 1, 0);
}

function stepWorld(world, dt, drive) {
  const state = world.state;
  if (drive) autopilotDrive(state, dt);
  stepGame(state, dt, {});
}

/** Put the player in a car on the main avenue, ready to drive. */
function putPlayerInCar(state) {
  const car = state.cars.find((c) => c.kind === 'parked') ?? state.cars[0];
  car.kind = 'player';
  car.driver = 'player';
  car.x = 700;
  car.y = 700;
  car.angle = 0;
  car.speed = 0;
  state.player.inCar = car;
  state.player.x = 700;
  state.player.y = 700;
  state.player.angle = 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a live city. play: driving through traffic.
 * chase: wanted 3 stars, police ramming the player's car.
 * mission: mission 2 in progress, thugs at the docks.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'start') {
    for (let i = 0; i < 5 / STEP; i += 1) stepGame(state, STEP, {});
    return { screen: SCREEN_TITLE, best: 0 };
  }
  putPlayerInCar(state);
  if (name === 'chase') {
    talkToGiver(state);
    raiseWanted(state, 3, 'Police chase.');
    for (let i = 0; i < 5 / STEP; i += 1) stepWorld(world, STEP, true);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'mission') {
    state.mission.index = 1;
    state.mission.stage = 'talk';
    talkToGiver(state);
    state.player.inCar = null;
    state.player.x = 2280;
    state.player.y = 1480;
    state.player.angle = -Math.PI / 2;
    for (let i = 0; i < 4 / STEP; i += 1) stepGame(state, STEP, {});
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // play
  for (let i = 0; i < 5 / STEP; i += 1) stepWorld(world, STEP, true);
  return { screen: SCREEN_PLAY, best: 0 };
}

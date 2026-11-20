// Save and load with localStorage: money, health, ammo, wanted level,
// mission progress, coins collected, jobs done, the player's position and
// whether they are in a car. A save is written on mission completion and
// on pause, and offered as Continue on the title screen when one exists.
// Revision 2 (save version 2): coins and jobs are saved too, so the
// collectible hunt and the job count survive a reload.
import { SAVE_KEY } from './config.js';

const SAVE_VERSION = 2;

export function saveGame(state) {
  try {
    const player = state.player;
    const data = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      money: player.money,
      health: player.health,
      ammo: player.ammo,
      wanted: state.wanted,
      x: player.x,
      y: player.y,
      missionIndex: state.mission.index,
      missionsDone: state.stats.missionsDone,
      carsStolen: state.stats.carsStolen,
      coinsCollected: state.coinsCollected,
      jobsDone: state.stats.jobsDone,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function applySave(state, data) {
  state.player.money = data.money;
  state.player.health = data.health;
  state.player.ammo = data.ammo;
  state.wanted = data.wanted;
  state.player.x = data.x;
  state.player.y = data.y;
  state.camera.x = data.x;
  state.camera.y = data.y;
  state.mission.index = data.missionIndex;
  state.mission.stage = 'talk';
  state.stats.missionsDone = data.missionsDone;
  state.stats.carsStolen = data.carsStolen;
  // Coins already picked up before the save stay picked up.
  state.coinsCollected = data.coinsCollected ?? 0;
  state.stats.coinsFound = data.coinsCollected ?? 0;
  state.stats.jobsDone = data.jobsDone ?? 0;
  for (let i = 0; i < state.coinsCollected && i < state.coins.length; i += 1) state.coins[i].taken = true;
}

export function hasSave() {
  return loadSave() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}

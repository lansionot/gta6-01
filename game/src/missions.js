// The story: three chained missions with dialogue, objectives and
// rewards, then free roam with repeatable courier jobs. Each mission is a
// small state machine (talk -> go -> do -> done); the HUD reads the
// current objective from here.
import { MISSIONS } from './config.js';
import { spawnThugs } from './combat.js';
import { raiseWanted } from './police.js';

export const MISSION_SPOTS = {
  lena: { x: 700, y: 700 },
  docks: { x: 2300, y: 1500 },
  marina: { x: 2700, y: 2300 },
  hideout: { x: 300, y: 500 },
};

export function currentMission(state) {
  return MISSIONS[state.mission.index] ?? null;
}

export function missionObjective(state) {
  const mission = currentMission(state);
  if (!mission) return 'Free roam — cause trouble, or take a courier job (press J).';
  if (state.mission.stage === 'talk') return `Talk to ${mission.giver} — go to the blue marker.`;
  if (state.mission.stage === 'go') return mission.objective;
  if (state.mission.stage === 'fight') return `Deal with the Harbor Kings: ${state.mission.thugsLeft} left.`;
  if (state.mission.stage === 'escape') return 'Reach the hideout — lose the heat on the way.';
  return mission.objective;
}

export function missionTarget(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  if (state.mission.stage === 'talk') return MISSION_SPOTS.lena;
  if (mission.id === 'first-wheels') return MISSION_SPOTS.marina;
  if (mission.id === 'debt-collector') return MISSION_SPOTS.docks;
  if (mission.id === 'harbor-heist') return state.mission.stage === 'escape' ? MISSION_SPOTS.hideout : MISSION_SPOTS.docks;
  return null;
}

function say(state, speaker, text, seconds) {
  state.dialogue = { speaker, text, timer: seconds };
}

function startMission(state, mission) {
  if (mission.id === 'first-wheels') {
    state.mission.stage = 'go';
    say(state, 'Lena', 'Steal any car and bring it to the marina. Make it quick, Rook.', 4);
  } else if (mission.id === 'debt-collector') {
    state.mission.stage = 'go';
    say(state, 'Lena', 'The Kings are at the docks. They owe me. Make them pay.', 4);
  } else if (mission.id === 'harbor-heist') {
    state.mission.stage = 'go';
    say(state, 'Marco', 'The getaway car is at the docks. Take it, then get to the hideout.', 4);
  }
}

function completeMission(state) {
  const mission = currentMission(state);
  if (!mission) return;
  state.player.money += mission.reward;
  state.stats.missionsDone += 1;
  state.mission.index += 1;
  state.mission.stage = 'talk';
  state.mission.timer = 0;
  say(state, mission.giver, `Done. $${mission.reward} is yours, Rook.`, 4);
  state.notice = `Mission complete: ${mission.title} — +$${mission.reward}`;
}

export function talkToGiver(state) {
  const mission = currentMission(state);
  if (!mission || state.mission.stage !== 'talk') return false;
  say(state, mission.giver, mission.briefing, 5);
  startMission(state, mission);
  return true;
}

/** Advance the mission state machine for a step. */
export function updateMissions(state, dt) {
  const mission = currentMission(state);
  if (state.dialogue) {
    state.dialogue.timer -= dt;
    if (state.dialogue.timer <= 0) state.dialogue = null;
  }
  if (!mission) return;
  const target = missionTarget(state);
  const player = state.player;
  if (state.mission.stage === 'go' && target) {
    const dist = Math.hypot(player.x - target.x, player.y - target.y);
    if (dist < 90) {
      if (mission.id === 'first-wheels') {
        if (player.inCar) completeMission(state);
        else if (!state.dialogue) say(state, 'Lena', 'Bring a car, Rook — on foot will not do it.', 3);
      } else if (mission.id === 'debt-collector') {
        state.mission.stage = 'fight';
        spawnThugs(state, target.x, target.y, 3);
        say(state, 'Harbor King', 'Lena sent a pup? Get him, boys!', 3);
      } else if (mission.id === 'harbor-heist') {
        state.mission.stage = 'escape';
        raiseWanted(state, 3, 'The harbor alarm is up — the police are coming.');
        say(state, 'Marco', 'Heat is on! Lose them and get to the hideout!', 4);
      }
    }
  } else if (state.mission.stage === 'fight') {
    if (state.mission.thugsLeft <= 0) completeMission(state);
  } else if (state.mission.stage === 'escape' && target) {
    const dist = Math.hypot(player.x - target.x, player.y - target.y);
    if (dist < 90) completeMission(state);
  }
}

/** Start a repeatable courier job after the story is done. */
export function startCourierJob(state) {
  if (currentMission(state)) return false;
  const spots = [MISSION_SPOTS.marina, MISSION_SPOTS.docks, MISSION_SPOTS.hideout, MISSION_SPOTS.lena];
  const target = spots[Math.floor(state.random() * spots.length)];
  state.mission = { index: MISSIONS.length, stage: 'courier', done: state.stats.missionsDone, target, timer: 0, thugsLeft: 0 };
  state.notice = 'Courier job: deliver the package to the yellow marker. +$150';
  return true;
}

export function updateCourier(state) {
  if (state.mission.stage !== 'courier' || !state.mission.target) return;
  const t = state.mission.target;
  if (Math.hypot(state.player.x - t.x, state.player.y - t.y) < 90) {
    state.player.money += 150;
    state.mission.stage = 'talk';
    state.mission.target = null;
    state.notice = 'Courier job done — +$150';
  }
}

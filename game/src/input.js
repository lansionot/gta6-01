// Keyboard and mouse input. Held keys give movement and steering; one-shot
// presses (enter car, punch, shoot, pause, map, courier job) are queued as
// bit flags and taken once by the loop, so a press between frames is never
// lost and never counted twice. The mouse aims on foot; menus use clicks.
// Revision 3: holding Space (or the mouse button) fires repeatedly from
// the game's own held-key state, not from key auto-repeat — headless
// browsers never generate repeat keydowns, so auto-repeat could not be
// verified and the hold never fired there. A press also queues one
// ACTION_SHOOT, so a quick tap can never fall between two frames.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16; // one queued shot per press: a quick tap must never fall between frames
export const ACTION_MAP = 32;
export const ACTION_JOB = 64;
export const ACTION_TALK = 128;
export const ACTION_MUTE = 256;
export const ACTION_HONK = 512;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const MAP = new Set(['KeyM']);
const JOB = new Set(['KeyJ']);
const TALK = new Set(['KeyT']);
const MUTE = new Set(['KeyN']);
const HONK = new Set(['KeyH']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (CONFIRM.has(event.code)) {
      actions |= ACTION_CONFIRM;
      // Queue one shot on the first press; repeats are covered by isShooting().
      if (!event.repeat) actions |= ACTION_SHOOT;
    }
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER_CAR.has(event.code)) actions |= ACTION_ENTER_CAR;
    else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
    else if (MAP.has(event.code)) actions |= ACTION_MAP;
    else if (JOB.has(event.code)) actions |= ACTION_JOB;
    else if (TALK.has(event.code)) actions |= ACTION_TALK;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (HONK.has(event.code)) actions |= ACTION_HONK;
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || CONFIRM.has(event.code) || PAUSE.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    actions |= ACTION_CONFIRM;
    // Queue one shot on the press; a held button keeps firing via isShooting().
    if (event.button === 0) actions |= ACTION_SHOOT;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  function axis(neg, pos) {
    return (pos.some((c) => keys.has(c)) ? 1 : 0) - (neg.some((c) => keys.has(c)) ? 1 : 0);
  }

  return {
    /** Normalised movement vector from WASD / arrows. */
    move() {
      const x = axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      const y = axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len };
    },
    /** Throttle -1..1 and steering -1..1 for driving. */
    drive() {
      const throttle = ((keys.has('KeyW') || keys.has('ArrowUp')) ? 1 : 0) - ((keys.has('KeyS') || keys.has('ArrowDown')) ? 1 : 0);
      const steer = ((keys.has('KeyD') || keys.has('ArrowRight')) ? 1 : 0) - ((keys.has('KeyA') || keys.has('ArrowLeft')) ? 1 : 0);
      return { throttle, steer };
    },
    isRunning() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    /** True while the fire key (Space / Enter) or the mouse button is held:
     * the loop fires on its own cooldown, so a held key keeps shooting. */
    isShooting() { return keys.has('Space') || keys.has('Enter') || mouseDown; },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    axis,
    keys,
  };
}

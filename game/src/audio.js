// Sound with no audio files: every sound is a WebAudio oscillator or a
// short burst of filtered noise, built on the first user gesture (the
// browser requires one before audio may start). Revision 2: every sound
// is logged (name + audio-clock time) so a headless run can prove the
// oscillators actually fired, and there are new sounds for coins, jobs
// and the car horn.
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;
  // Every sound event, in order: the headless play-test reads this log.
  const log = [];
  let eventCount = 0;

  function record(name) {
    eventCount += 1;
    log.push({ name, at: context ? context.currentTime : 0, n: eventCount });
    if (log.length > 200) log.shift();
  }

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      record('context');
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, duration, type, volume, slideTo) {
    if (!ensure() || muted) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, context.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  function noise(duration, volume, frequency) {
    if (!ensure() || muted) return;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    setMuted(value) { muted = value; if (master) master.gain.value = muted ? 0 : 0.35; },
    isMuted() { return muted; },
    /** The sound log, for headless verification that sounds really fired. */
    getLog() { return log.slice(); },
    getEventCount() { return eventCount; },
    isReady() { return context !== null && context.state === 'running'; },
    gunshot() { noise(0.14, 0.5, 1800); record('gunshot'); },
    punch() { noise(0.09, 0.4, 500); tone(90, 0.1, 'sine', 0.3, 50); record('punch'); },
    pickup() { tone(880, 0.12, 'sine', 0.25, 1320); record('pickup'); },
    coin() { tone(1046, 0.1, 'sine', 0.3); setTimeout(() => tone(1568, 0.18, 'sine', 0.3), 90); record('coin'); },
    honk() { tone(370, 0.18, 'square', 0.2); tone(466, 0.18, 'square', 0.15); record('honk'); },
    missionDone() { tone(523, 0.15, 'triangle', 0.3); setTimeout(() => tone(659, 0.15, 'triangle', 0.3), 140); setTimeout(() => tone(784, 0.3, 'triangle', 0.3), 280); record('missionDone'); },
    crash() { noise(0.25, 0.5, 700); record('crash'); },
    setEngine(speed, inCar) {
      if (!ensure() || muted) return;
      const target = inCar ? 0.05 + Math.min(0.12, Math.abs(speed) / 520 * 0.12) : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) / 4, context.currentTime, 0.1);
    },
    setSiren(wanted) {
      if (!ensure()) return;
      sirenOn = wanted > 0;
      if (muted || !sirenOn) {
        sirenGain.gain.setTargetAtTime(0, context.currentTime, 0.2);
        return;
      }
      sirenGain.gain.setTargetAtTime(0.05, context.currentTime, 0.2);
      const now = context.currentTime;
      sirenOsc.frequency.setValueAtTime(700, now);
      sirenOsc.frequency.linearRampToValueAtTime(950, now + 0.4);
      sirenOsc.frequency.linearRampToValueAtTime(700, now + 0.8);
    },
  };
}

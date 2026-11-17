// Procedural WebAudio — engine hum, siren, gunshot, chime. Never throws, never
// needs a file. Silent until the first user gesture (autoplay policy).
export function makeAudio() {
  const a = {
    ctx: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    enabled: false, sirenOn: false,
  };
  return a;
}

export function ensureAudio(a) {
  if (a.ctx || a.enabled === false) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    a.ctx = new AC();
    a.engineOsc = a.ctx.createOscillator();
    a.engineOsc.type = 'sawtooth';
    a.engineOsc.frequency.value = 60;
    a.engineGain = a.ctx.createGain();
    a.engineGain.gain.value = 0;
    const filt = a.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 500;
    a.engineOsc.connect(filt).connect(a.engineGain).connect(a.ctx.destination);
    a.engineOsc.start();
    a.sirenOsc = a.ctx.createOscillator();
    a.sirenOsc.type = 'triangle';
    a.sirenOsc.frequency.value = 750;
    a.sirenGain = a.ctx.createGain();
    a.sirenGain.gain.value = 0;
    a.sirenOsc.connect(a.sirenGain).connect(a.ctx.destination);
    a.sirenOsc.start();
    a.enabled = true;
  } catch (e) {
    a.ctx = null;
  }
}

export function updateAudio(a, speed01, wanted, now) {
  if (!a.ctx || !a.enabled) return;
  try {
    if (a.ctx.state === 'suspended') a.ctx.resume();
    a.engineGain.gain.value = 0.015 + speed01 * 0.05;
    a.engineOsc.frequency.value = 55 + speed01 * 160;
    const siren = wanted > 0;
    a.sirenGain.gain.value = siren ? 0.02 : 0;
    if (siren) a.sirenOsc.frequency.value = (Math.floor(now * 2) % 2 === 0) ? 720 : 980;
  } catch (e) { /* audio is cosmetic */ }
}

export function playShot(a) {
  if (!a.ctx || !a.enabled) return;
  try {
    const dur = 0.12;
    const buf = a.ctx.createBuffer(1, a.ctx.sampleRate * dur, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    const g = a.ctx.createGain();
    g.gain.value = 0.25;
    src.connect(g).connect(a.ctx.destination);
    src.start();
  } catch (e) { /* cosmetic */ }
}

export function playChime(a) {
  if (!a.ctx || !a.enabled) return;
  try {
    const o = a.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, a.ctx.currentTime);
    o.frequency.setValueAtTime(1318, a.ctx.currentTime + 0.09);
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.12, a.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + 0.35);
    o.connect(g).connect(a.ctx.destination);
    o.start();
    o.stop(a.ctx.currentTime + 0.4);
  } catch (e) { /* cosmetic */ }
}

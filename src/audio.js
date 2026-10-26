// Tiny procedural WebAudio: skin slaps, wet sounds, bed creaks. Off by default.
(function (PD) {
  'use strict';
  const A = { ctx: null, on: false, noise: null, master: null };
  A.enable = function (on) {
    A.on = on;
    if (on && !A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { A.on = false; return; }
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.5;
      A.master.connect(A.ctx.destination);
      const n = A.ctx.sampleRate * 0.4;
      A.noise = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
      const d = A.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };
  function burst(freq, q, gain, dur, delay) {
    const t = A.ctx.currentTime + (delay || 0);
    const src = A.ctx.createBufferSource();
    src.buffer = A.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bp = A.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(A.master);
    src.start(t, Math.random() * 0.2, dur + 0.02);
  }
  function thump(freq, gain, dur) {
    const t = A.ctx.currentTime;
    const o = A.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  A.slap = function (strength, wet) {
    if (!A.on || !A.ctx) return;
    const s = Math.min(1.4, strength);
    burst(1300 + Math.random() * 600, 0.9, 0.35 * s, 0.07);
    thump(110, 0.25 * s, 0.08);
    if (wet > 0.4) burst(2600, 2.5, 0.12 * wet * s, 0.12, 0.02);
  };
  A.creak = function () {
    if (!A.on || !A.ctx) return;
    const t = A.ctx.currentTime;
    const o = A.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70 + Math.random() * 20, t);
    o.frequency.linearRampToValueAtTime(48, t + 0.18);
    const lp = A.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(lp); lp.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + 0.22);
  };
  // UI sounds: short square-wave chirps, a slam and a zap for the title.
  A.ui = function (kind) {
    if (!A.on || !A.ctx) return;
    const t = A.ctx.currentTime;
    const tone = (f0, f1, dur, type, vol, delay) => {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f0, t + (delay || 0));
      o.frequency.exponentialRampToValueAtTime(f1, t + (delay || 0) + dur);
      g.gain.setValueAtTime(vol, t + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (delay || 0) + dur);
      o.connect(g); g.connect(A.master); o.start(t + (delay || 0)); o.stop(t + (delay || 0) + dur + 0.02);
    };
    if (kind === 'hover') tone(880, 990, 0.03, 'square', 0.04);
    else if (kind === 'nav') tone(660, 700, 0.04, 'square', 0.05);
    else if (kind === 'click') { tone(520, 1040, 0.06, 'square', 0.08); tone(1040, 1560, 0.06, 'square', 0.05, 0.05); }
    else if (kind === 'slam') { burst(180, 0.7, 0.6, 0.25); thump(70, 0.6, 0.3); }
    else if (kind === 'zap') { tone(200, 2400, 0.35, 'sawtooth', 0.08); }
    else if (kind === 'start') { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.09, 'square', 0.07, i * 0.07)); }
  };
  PD.applyAudio = function () {
    if (A.master && PD.Settings) A.master.gain.value = PD.Settings.master * (0.2 + PD.Settings.sfx * 0.8);
  };
  PD.Audio = A;
})(window.PD);

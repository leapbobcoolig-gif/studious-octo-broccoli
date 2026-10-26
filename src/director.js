// Director: rhythm, arousal, climax, faces, transitions, voices.
(function (PD) {
  'use strict';
  const C = PD.C;

  const W_LINES = [
    ['MMH~', 'AH~', 'HAH..', 'MM♥'],
    ['AHN~', 'OHH~', 'YES~', 'MORE~', 'HNN♥', 'RIGHT THERE'],
    ['AH♥ AH♥', 'FUCK~', 'DEEPER!', 'DONT STOP', 'OH GOD~', 'HNNG♥', 'HARDER♥'],
  ];
  const M_LINES = ['HFF', 'NGH', 'MMH', 'HAH', 'GOOD GIRL', 'FUCK..', 'SO TIGHT'];
  const SLAPS = ['PLAP', 'PLAP', 'PAP', 'SLAP', 'PLAP!'];

  class Director {
    constructor(S) {
      this.S = S;
      this.pos = 'cowgirl';
      this.t = 0;
      this.phase = 0;
      this.speed = 1.1;
      this.userSpeed = 1.1;
      this.stroke = 0.7;
      this.auto = false;
      this.paused = false;
      this.bedOff = 0; this.bedV = 0;
      this.blend = 1; this.prevSkel = null; this.skel = null;
      this.fx = new PD.FX();
      this.climaxW = 0; this.climaxM = 0; this.after = 0;
      this.cream = 0; this.wetness = 0.1;
      this.autoT = 0;
      this.flash = 0; this.shake = 0;
      this.depth = 0.5;
      this.lastImpact = 0;
      this.onImpact = null;
    }

    setPos(key) {
      if (!PD.POSITIONS[key] || key === this.pos) return;
      this.prevSkel = this.skel;
      this.blend = 0;
      this.pos = key;
      const h = this.S.w.headPt;
      if (h) for (let i = 0; i < 4; i++) this.fx.heart(h.x + PD.rnd(-6, 6), h.y - 6, i === 0);
    }

    climaxNow() {
      this.S.w.arousal = Math.max(this.S.w.arousal, 0.999);
      this.S.m.arousal = Math.max(this.S.m.arousal, 0.999);
    }

    strokeAt(ph) {
      const r = PD.POSITIONS[this.pos].impactRatio;
      if (ph < r) { const x = ph / r; return x * x; }
      const x = (ph - r) / (1 - r);
      return 1 - PD.smooth(x);
    }

    poke(x, y) {
      let best = null, bd = 10;
      for (const who of ['w', 'm']) {
        const c = this.S[who];
        if (!c.anchors) continue;
        for (const key in c.anchors) {
          const a = c.anchors[key];
          const d = Math.hypot(a.pt.x - x, a.pt.y - y);
          if (d < bd) { bd = d; best = { who, key, a }; }
        }
      }
      if (!best) return false;
      const k = best.key === 'butt' ? 140 : 90;
      best.a.sp.kick(PD.rnd(-k, k) * 0.4, -k);
      const word = best.key === 'butt' ? 'SMACK!' : best.key === 'breast' ? 'BOING' : 'BOUNCE';
      this.fx.word(x, y - 8, word, C('ui', 4));
      if (best.who === 'w') { this.S.w.arousal = Math.min(0.99, this.S.w.arousal + 0.04); this.S.w.face.mouthT = 0.4; }
      if (this.onImpact) this.onImpact(best.key === 'butt' ? 1.2 : 0.4);
      return true;
    }

    impact(strength) {
      const { m, w } = this.S;
      this.bedV += 22 * strength;
      const sk = this.skel;
      const dir = sk && sk.m.penis ? sk.m.penis.dir : { x: 0, y: 1 };
      const s = 60 * strength;
      w.sp.butt.kick(dir.x * s, dir.y * s);
      w.sp.breast.kick(dir.x * s * 1.2 + PD.rnd(-10, 10), dir.y * s * 1.2 - 30 * strength);
      w.sp.belly.kick(dir.x * s * 0.5, dir.y * s * 0.5);
      w.sp.thighN.kick(dir.x * s * 0.6, dir.y * s * 0.6);
      w.sp.thighF.kick(dir.x * s * 0.6, dir.y * s * 0.6);
      m.sp.balls.kick(dir.x * s * 1.6, dir.y * s * 1.6);
      m.sp.belly.kick(-dir.x * s * 0.4, -dir.y * s * 0.4);
      const E = sk ? sk.entry : null;
      // sound words
      if (E && this.speed > 0.55 && Math.random() < 0.75) {
        const str = this.wetness > 0.6 && Math.random() < 0.3 ? 'SHLK' : PD.pick(SLAPS);
        this.fx.word(E.x + PD.pick([-1, 1]) * PD.rnd(14, 22), E.y - PD.rnd(6, 12), str, C('ui', 4), { vy: -10, life: 0.7 });
      }
      if (this.speed > 2.3 && (this.pos === 'missionary' || this.pos === 'doggy') && Math.random() < 0.4)
        this.fx.word(68, 78, 'THUD', C('wood', 4), { vy: -6, life: 0.6 });
      // voices
      const wh = w.headPt, mh = m.headPt;
      if (wh && Math.random() < 0.18 + w.arousal * 0.45) {
        const tier = w.arousal < 0.35 ? 0 : w.arousal < 0.7 ? 1 : 2;
        this.fx.word(wh.x + PD.rnd(-4, 4), wh.y - 13, PD.pick(W_LINES[tier]), C('heart', 3));
      }
      if (mh && Math.random() < 0.06 + m.arousal * 0.12) this.fx.word(mh.x, mh.y - 13, PD.pick(M_LINES), C('ui', 3));
      if (w.arousal > 0.55 && Math.random() < 0.3 && wh) this.fx.heart(wh.x + PD.rnd(-5, 5), wh.y - 8);
      for (const c of [w, m]) if (c.arousal > 0.3) c.face.mouthT = 0.2 + c.arousal * 0.35;
      this.wetness = Math.min(1, this.wetness + 0.01);
      if (this.onImpact) this.onImpact(strength);
      if (this.onHit) this.onHit(strength);
    }

    update(dt) {
      const S = this.S, { m, w } = S;
      this.t += dt;
      const P = PD.POSITIONS[this.pos];

      // --- speed ---
      let target = this.paused ? 0 : this.userSpeed;
      if (this.auto && !this.paused) {
        const a = Math.max(w.arousal, m.arousal);
        target = 0.7 + a * 2.4;
        this.autoT += dt;
        if (this.autoT > 22 && this.climaxW <= 0 && this.climaxM <= 0) {
          this.autoT = 0;
          const keys = PD.POS_KEYS.filter((k) => k !== this.pos);
          this.setPos(PD.pick(keys));
        }
      }
      if (this.climaxM > 0) target = Math.min(target, 0.35);
      if (this.after > 0) target = Math.min(target, 0.25 + (1 - this.after / 5) * target);
      this.speed += (target - this.speed) * Math.min(1, dt * 2.5);

      // --- phase / depth ---
      const prev = this.phase;
      this.phase = (this.phase + this.speed * dt) % 1;
      const r = P.impactRatio;
      const crossed = this.speed > 0.05 && ((prev < r && this.phase >= r) || (prev > this.phase && (prev < r || this.phase >= r)));
      const len = this.stroke * (1 - 0.35 * PD.clamp((this.speed - 1.5) / 2, 0, 1));
      let depth = 1 - len * (1 - this.strokeAt(this.phase));
      if (this.speed < 0.05) depth = PD.lerp(this.depth, 0.75 + 0.03 * Math.sin(this.t * 1.5), Math.min(1, dt * 2));
      if (this.climaxM > 0) depth = 0.97 + 0.03 * Math.sin(this.t * 14);
      this.depth = depth;
      const amp = PD.clamp(this.speed / 1.5, 0.2, 1.6);
      if (crossed) this.impact(PD.clamp(0.35 + this.speed * 0.35 * len, 0.3, 1.6));

      // --- bed spring ---
      this.bedV += (-260 * this.bedOff - 9 * this.bedV) * dt;
      this.bedOff += this.bedV * dt;
      this.bedOff = PD.clamp(this.bedOff, -2, 3);

      // --- arousal / climax ---
      const rate = 0.004 + 0.012 * Math.pow(this.speed, 1.3) * (0.4 + len);
      if (this.climaxW <= 0) w.arousal += (this.speed > 0.1 ? rate * w.p.sens : -0.01) * dt;
      if (this.climaxM <= 0 && this.after <= 0) m.arousal += (this.speed > 0.1 ? rate * m.p.sens : -0.01) * dt;
      w.arousal = PD.clamp(w.arousal, 0, 1); m.arousal = PD.clamp(m.arousal, 0, 1);
      if (w.arousal >= 1 && this.climaxW <= 0) {
        this.climaxW = 4.2; this.flash = 0.5; this.shake = 0.6;
        const h = w.headPt;
        if (h) { this.fx.word(h.x, h.y - 16, PD.pick(['AHHH♥♥', 'IM CUMMING~', 'HNNNG♥♥']), C('heart', 3), { life: 2 }); for (let i = 0; i < 8; i++) this.fx.heart(h.x + PD.rnd(-8, 8), h.y - 4, i < 3); }
      }
      if (m.arousal >= 1 && this.climaxM <= 0 && this.after <= 0) {
        this.climaxM = 3.6; this.pulseT = 0; this.shake = 0.4;
        const h = m.headPt;
        if (h) this.fx.word(h.x, h.y - 16, PD.pick(['NNGH!', 'CUMMING..', 'FUCK!']), C('ui', 4), { life: 1.6 });
      }
      if (this.climaxW > 0) { this.climaxW -= dt; if (this.climaxW <= 0) w.arousal = 0.35; }
      if (this.climaxM > 0) {
        this.climaxM -= dt;
        this.pulseT = (this.pulseT || 0) - dt;
        if (this.pulseT <= 0 && this.skel) {
          this.pulseT = 0.45;
          this.cream = Math.min(1.5, this.cream + 0.3);
          m.sp.balls.kick(0, -60);
          if (this.onImpact) this.onImpact(0.5);
          const E = this.skel.entry;
          for (let i = 0; i < 3; i++) this.fx.drop(E.x + PD.rnd(-1, 1), E.y + 1, PD.rnd(-6, 6), PD.rnd(-10, 10), 'fluid', PD.rnd(0, 0.4));
        }
        if (this.climaxM <= 0) { m.arousal = 0; this.after = 5; }
      }
      if (this.after > 0) this.after -= dt;
      if (this.cream > 0) {
        this.cream -= dt * 0.06;
        if (this.skel && Math.random() < dt * this.cream * 2.2) {
          const E = this.skel.entry;
          this.fx.drop(E.x + PD.rnd(-1, 1), E.y + 1.5, PD.rnd(-2, 2), 0, 'fluid', PD.rnd(0.2, 0.9));
        }
      }
      this.wetness = Math.max(0.1, this.wetness - dt * 0.004);

      // --- faces ---
      for (const c of [w, m]) {
        const fc = c.face;
        fc.blinkT -= dt;
        if (fc.blinkT <= 0) { fc.blink = 0.12; fc.blinkT = PD.rnd(2, 5.5); }
        fc.blink = Math.max(0, fc.blink - dt);
        fc.mouthT = Math.max(0, fc.mouthT - dt);
        const cl = c === w ? this.climaxW > 0 : this.climaxM > 0;
        if (cl) {
          fc.eyes = c === w ? (Math.sin(this.t * 3) > 0 ? 'heart' : 'rolled') : 'closed';
          fc.mouth = 2; fc.blink = 0;
        } else {
          fc.eyes = c.arousal < 0.35 ? 'open' : c.arousal < 0.72 ? 'half' : (fc.mouthT > 0.15 ? 'rolled' : 'half');
          fc.mouth = fc.mouthT > 0 ? (c.arousal > 0.7 ? 2 : 1) : (c.arousal > 0.6 ? 1 : 0);
        }
        const tb = PD.clamp(0.1 + c.arousal * 1.1 + (cl ? 0.4 : 0), 0, 1);
        fc.blush += (tb - fc.blush) * Math.min(1, dt * 1.5);
      }

      // --- sweat ---
      for (const c of [w, m]) {
        if (c.headPt && Math.random() < dt * c.arousal * this.speed * 0.9)
          this.fx.drop(c.headPt.x + PD.rnd(-5, 5), c.headPt.y + PD.rnd(-2, 4), PD.rnd(-4, 4), PD.rnd(-8, 0), 'sweat');
      }

      // --- solve ---
      const cw = this.climaxW > 0 ? Math.min(1, this.climaxW / 1.2) : 0;
      const cm = this.climaxM > 0 ? Math.min(1, this.climaxM / 1.0) : 0;
      const k = {
        depth, bedOff: this.bedOff, t: this.t, amp,
        intensity: PD.clamp(w.arousal, 0, 1),
        breathW: Math.sin(this.t * (2 + w.arousal * 3)) * (0.8 + w.arousal * 1.5),
        breathM: Math.sin(this.t * (1.7 + m.arousal * 2.5) + 1) * (0.6 + m.arousal),
        archW: cw * 16, headW: cw * 26, shakeW: cw, headM: cm,
        recoil: depth * 1.6 * Math.min(1, amp),
      };
      let sk = P.solve(S, k);
      if (this.blend < 1) {
        this.blend = Math.min(1, this.blend + dt / 0.9);
        sk = PD.blendSkel(this.prevSkel, sk, PD.smooth(this.blend));
      }
      this.skel = sk;
      this.fx.update(dt, this.bedOff);
      this.flash = Math.max(0, this.flash - dt);
      this.shake = Math.max(0, this.shake - dt);
    }
  }
  PD.Director = Director;
})(window.PD);

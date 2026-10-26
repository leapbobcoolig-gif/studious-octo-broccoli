// Chapter 3: the room. Tyler arrives blindfolded -> setup -> REVEAL -> hook -> conversion
// (gay meter, decor flips, condom, squirt) -> he cums in it -> payout (STRAIGHT stamp, 10,000 -> 9,999).
(function (PD) {
  'use strict';
  const C = PD.C, W = PD.W, H = PD.H, UI = PD.UI, SM = PD.SM, clamp = PD.clamp;
  const up = (s) => String(s).toUpperCase();
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const CPS = [24, 48, 110];

  const LINES = {
    setup: ['BRO UR SO SMOOTH', 'WHY IS UR HOLE SO WET', 'SINCE WHEN R U THIS TIGHT', 'DO U SHAVE EVERYTHING??', 'MMMF DADDY', 'THIS FEELS SO... DIFFERENT'],
    reveal: ['WHAT THE FUCK', 'IS THAT A PUSSY?!', 'I WAS CATFISHED', 'THIS IS A HATE CRIME', 'GET IT OFF ME', 'MOMMY??'],
    denial: ["THIS DOESN'T COUNT", "I'M THINKING ABOUT ABS", 'EW IT GRIPS', 'WHERE IS THE DICK', 'NO HOMO. WAIT', 'MY GROUP CHAT CANT KNOW'],
    curious: ['WAIT...', 'WHY IS IT SUCKING ME IN', "IT'S SO WARM", 'OK THAT WAS GOOD. MEANS NOTHING', 'HOW DOES IT DO THAT'],
    hooked: ['FUCK FUCK FUCK', 'PUSSY IS UNREAL', "DON'T TELL MY BOYFRIEND", "I'M DELETING THE APP", 'HARDER. I MEAN. WHATEVER'],
    begging: ['PUSSY... PUSSY...', 'I WASTED 21 YEARS ON ASS', 'I NEED TITS NOW', 'MARRY ME', 'CAN I CUM IN IT'],
    her: ['TOLD YOU', "HOW'S THAT BOTTOM LIFE NOW", 'CUM IN IT, BRO', 'WELCOME TO THE TEAM', 'ONE MORE STRAIGHT'],
  };
  const STAGES = [
    { min: 0.8, key: 'denial', name: 'DENIAL', eyes: 'closed', mouth: 0, op: 'Denial. Cute. He says it does not count while his hips keep moving.' },
    { min: 0.6, key: 'curious', name: 'CURIOUS', eyes: 'open', mouth: 1, op: 'He looked down. They always look down. That is the crack in the dam.' },
    { min: 0.4, key: 'hooked', name: 'HOOKED', eyes: 'half', mouth: 2, op: 'Look at him. Ten years of Kylie Minogue, gone in ninety seconds.' },
    { min: 0.2, key: 'begging', name: 'BEGGING', eyes: 'rolled', mouth: 2, op: 'He is begging for pussy. A self-described "total bottom." Beautiful.' },
    { min: -1, key: 'begging', name: 'BROKEN', eyes: 'rolled', mouth: 2, op: 'Finish him. Make him cum in it.' },
  ];
  const FLIPS = [0.86, 0.72, 0.58, 0.44, 0.28, 0.06];
  const TYLER_P = { skin: 0, hair: 2, hairStyle: 'messy', height: 0.94, muscle: 0.05, belly: 0, beard: false, length: 1.05, girth: 0.95, socks: false };

  const camBuf = new Uint8Array(40 * 40);
  function grabCam(fb, cx, cy, n) {
    const sx = Math.round(cx - n / 2), sy = Math.round(cy - n / 2);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) camBuf[j * n + i] = fb.get(sx + i, sy + j);
  }
  function drawCam(fb, x, y, n, sc, label, t, o) {
    o = o || {};
    const w = n * sc;
    fb.rect(x - 2, y - 2, w + 4, w + 4, C('ink', 0));
    fb.rect(x - 1, y - 1, w + 2, w + 2, o.ramp ? C(o.ramp, 3) : C('frame', 3));
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) fb.rect(x + i * sc, y + j * sc, sc, sc, camBuf[j * n + i]);
    fb.rect(x, y, PD.textWidth(label) + 9, 7, C('ink', 0));
    if (Math.sin(t * 5) > 0) fb.rect(x + 1, y + 2, 3, 3, C('cloth1', 4));
    PD.text(fb, label, x + 6, y + 1, C('ui', 4));
  }
  function bar(fb, x, y, w, v, ramp, label) {
    if (label) PD.text(fb, label, x - PD.textWidth(label) - 3, y, C('ui', 4), C('ink', 0));
    fb.rect(x - 1, y - 1, w + 2, 7, C('ink', 0)); fb.rect(x, y, w, 5, C('ink', 2));
    const f = Math.round(w * clamp(v, 0, 1));
    fb.rect(x, y, f, 5, C(ramp, 2)); fb.rect(x, y, f, 1, C(ramp, 4));
  }

  SM.scenes.room = {
    enter() {
      const { D, S } = PD.STAGE;
      this.D = D; this.S = S;
      this.savedP = Object.assign({}, S.m.p);
      Object.assign(S.m.p, TYLER_P, { sens: 0.0001 });
      PD.refreshDims(S.m); S.m.hair.reset(); for (const k in S.m.sp) S.m.sp[k].reset();
      S.m.blindfold = true; S.m.condom = true; S.m.faceWet = 0; S.m.arousal = 0.2; S.w.arousal = 0.3;
      D.fx.list = []; D.fx.wet = []; D.cream = 0; D.climaxW = 0; D.climaxM = 0; D.after = 0;
      D.setPos('cowgirl'); D.blend = 1; D.auto = false; D.paused = false; D.userSpeed = 0.9; D.speed = 0.9;
      D.onHit = (s) => this.hit(s); D.quiet = true; this.hitT = 0;
      this.phase = 'arrive'; this.t = 0; this.pt = 0;
      this.gay = 1; this.hook = 0; this.escape = 0; this.blind = 1; this.raw = false; this.condomAsked = false;
      this.decor = { flip: [false, false, false, false, false, false], poof: [] };
      this.stage = -1; this.lineT = 1; this.squirt = null; this.squirtDone = false; this.faceShot = false;
      this.mash = 0; this.banner = { text: '', t: 0 };
      this.say('He let himself in. Blindfold on, like a good boy. She is already on the bed.');
      for (let i = 0; i < 60; i++) D.update(1 / 60);
    },
    restore() {
      const S = this.S, D = this.D;
      Object.assign(S.m.p, this.savedP);
      PD.refreshDims(S.m); S.m.hair.reset();
      S.m.blindfold = false; S.m.condom = false; S.m.faceWet = 0;
      D.onHit = null; D.paused = false; D.quiet = false;
    },
    say(q) { this.quip = q; this.qshown = 0; },
    setBanner(text) { this.banner = { text, t: 0 }; },
    line(who, list, col) {
      const c = this.S[who];
      if (!c.headPt) return;
      // don't stack lines on top of each other
      if (this.D.fx.list.some((p) => p.type === 'text' && p.life > p.max * 0.45 && Math.abs(p.y - (c.headPt.y - 15)) < 9 && Math.abs(p.x + PD.textWidth(p.str) / 2 - c.headPt.x) < 40)) return;
      this.D.fx.word(c.headPt.x + PD.rnd(-4, 4), c.headPt.y - 15, PD.pick(LINES[list]), col !== undefined ? col : who === 'm' ? C('ui', 4) : C('heart', 3), { life: 1.7, vy: -8 });
    },
    go(phase) { this.phase = phase; this.pt = 0; },

    // every slap during the conversion drains him
    hit(s) {
      this.hitT = 0.25;
      if (this.phase !== 'convert') return;
      this.gay = Math.max(0, this.gay - 0.017 * s * (this.raw ? 1.5 : 1));
    },
    flip(i) {
      if (this.decor.flip[i]) return;
      this.decor.flip[i] = true; this.decor.poof[i] = 0;
      PD.Audio.ui('pop');
      const spots = [[160, 14], [172, 30], [69, 26], [25, 30], [294, 22], [46, 98]];
      this.D.fx.word(spots[i][0], spots[i][1], PD.pick(['POOF', 'BYE', 'POOF!', 'GONE']), C('gold', 4), { life: 0.9, vy: -10 });
    },

    update(dt) {
      const D = this.D, S = this.S, m = S.m, w = S.w;
      this.t += dt; this.pt += dt; this.banner.t += dt; this.hitT = Math.max(0, (this.hitT || 0) - dt);
      for (let i = 0; i < 6; i++) if (this.decor.poof[i] !== undefined) this.decor.poof[i] += dt;
      if (this.qshown < this.quip.length) {
        const b = Math.floor(this.qshown);
        this.qshown = Math.min(this.quip.length, this.qshown + dt * CPS[PD.Settings.textSpeed | 0] * 1.3);
        if (Math.floor(this.qshown) !== b && b % 3 === 0) PD.Audio.ui('type');
      }
      const mashed = UI.activate || PD.INPUT.pressed;
      if (UI.back) { this.restore(); SM.go('menu'); return; }

      if (this.phase === 'arrive') {
        if ((this.pt > 0.35 && this.pt - dt <= 0.35) || (this.pt > 0.8 && this.pt - dt <= 0.8)) { PD.Audio.ui('thud'); SM.shake = 0.06; }
        if (this.pt > 1.7 && this.pt - dt <= 1.7) PD.Audio.creak();
        if (this.pt > 3.4 || (this.pt > 0.8 && mashed)) { this.go('setup'); this.setBanner('BLINDFOLDED'); this.say('He thinks he is riding a twink. She is riding HIM. Watch his face cam.'); }
        D.update(dt);
        return;
      }
      D.update(dt);
      // his face overrides (after the director sets its own)
      const face = (eyes, mouth) => { m.face.eyes = eyes; m.face.mouth = mouth; m.face.blink = 0; };

      if (this.phase === 'setup') {
        D.userSpeed = 0.95; D.paused = false;
        face('closed', 1);
        this.blind = Math.max(0, 1 - this.pt / 7.5);
        this.lineT -= dt;
        if (this.lineT <= 0) { this.line('m', 'setup'); this.lineT = 1.5; }
        if (this.pt > 3.5 && this.pt - dt <= 3.5) this.say('The blindfold is slipping. He is bouncing too hard. Any second now...');
        if (this.blind <= 0) {
          this.go('reveal'); m.blindfold = false; D.paused = true; D.flash = 0.6; D.shake = 0.7; SM.shake = 0.4 * PD.Settings.shake;
          PD.Audio.ui('scratch'); this.line('m', 'reveal', C('cloth1', 4)); this.setBanner('REVEAL!');
          this.say('Blindfold is OFF. He sees it. HE SEES THE PUSSY.');
        }
        return;
      }
      if (this.phase === 'reveal') {
        face('wide', 2);
        if (this.pt > 0.7 && this.pt - dt <= 0.7) this.line('m', 'reveal', C('cloth1', 4));
        if (this.pt > 1.7) { this.go('hook'); D.paused = false; D.userSpeed = 0.5; this.setBanner('HOOK HIM!'); this.say('He is trying to crawl away. MASH! Space or click. Keep her sitting on it.'); }
        return;
      }
      if (this.phase === 'hook') {
        face('wide', this.pt % 1 < 0.5 ? 2 : 1);
        this.mash = Math.max(0, this.mash - dt * 2.2);
        if (mashed) {
          this.hook += 0.075; this.mash = Math.min(3, this.mash + 0.6);
          D.impact(0.9); SM.shake = Math.max(SM.shake, 0.05 * PD.Settings.shake);
          if (Math.random() < 0.35) D.fx.word(w.headPt.x + PD.rnd(-6, 6), w.headPt.y - 14, PD.pick(['SIT DOWN', 'STAY', 'GRIP!', 'SLAM']), C('heart', 3), { life: 0.8 });
        }
        D.userSpeed = 0.5 + this.mash;
        this.hook = Math.max(0, this.hook - dt * 0.03);
        this.escape += dt * 0.11;
        this.lineT -= dt;
        if (this.lineT <= 0) { this.line('m', 'reveal'); this.lineT = 1.2; }
        if (this.escape >= 1) {
          this.escape = 0.4; this.hook = Math.max(this.hook, 0.2);
          this.say('He almost got off the bed. Tutorial mercy. MASH, you lazy fuck.'); PD.Audio.ui('thud');
        }
        if (this.hook >= 1) {
          this.go('convert'); this.setBanner('CONVERT HIM'); this.line('w', 'her');
          this.say('Hooked. Now ride the gay out of him. Click to go harder.');
          PD.Audio.ui('lock');
        }
        return;
      }
      if (this.phase === 'convert') {
        // stage + face + lines
        const si = STAGES.findIndex((s) => this.gay > s.min);
        const st = STAGES[si];
        if (si !== this.stage) { this.stage = si; this.lineT = 0; this.say(st.op); if (si > 0) { this.setBanner(st.name); PD.Audio.ui('pop'); } }
        face(st.eyes, st.mouth);
        m.arousal = Math.min(0.95, (1 - this.gay) * 0.95);
        this.lineT -= dt;
        if (this.lineT <= 0) { this.line('m', st.key); this.lineT = 2.1 - (1 - this.gay) * 0.8; if (Math.random() < 0.25) this.line('w', 'her'); }
        // speed: he starts fucking back
        D.userSpeed = Math.max(D.userSpeed - dt * 0.4, 0.9 + (1 - this.gay) * 1.5);
        if (PD.INPUT.pressed && !this.prompt) { D.userSpeed = Math.min(3.2, D.userSpeed + 0.25); this.gay = Math.max(0, this.gay - 0.004); }
        // positions: he takes over as he turns
        if (this.gay < 0.5 && D.pos === 'cowgirl') { D.setPos('missionary'); this.say("He rolled her over. He's ON TOP now. Fucking a pussy like he invented it."); }
        if (this.gay < 0.2 && D.pos === 'missionary') { D.setPos('doggy'); this.say('Doggy. He is holding her hips. This man owned a Pride tank top an hour ago.'); }
        // decor
        FLIPS.forEach((f, i) => { if (this.gay < f) this.flip(i); });
        // condom moment
        if (!this.condomAsked && this.gay < 0.66) { this.condomAsked = true; this.prompt = 'condom'; this.say('He is still wearing the condom. Rip it off? Raw drains him 50% faster.'); }
        // squirt
        if (!this.squirtDone && !this.squirt && this.gay < 0.4 && !this.prompt) { this.squirt = { fill: 0, aim: false, x: 0, t: 0 }; this.say('She is close. Fill the squirt meter, then AIM for his face.'); }
        if (this.squirt) this.updateSquirt(dt, mashed);
        if (this.gay <= 0 && !this.prompt && !this.squirt) {
          this.go('finish'); m.p.sens = 1; m.arousal = 0.999; this.setBanner('HE CUMS IN IT');
          this.say('He is cumming. In a pussy. Write down the date.');
          for (let i = 0; i < 6; i++) this.flip(i);
          if (m.headPt) D.fx.word(m.headPt.x, m.headPt.y - 20, PD.pick(['CUMMING IN A PUSSY', 'OH GOD IT TAKES IT ALL', 'IM STRAIGHT IM STRAIGHT']), C('ui', 4), { life: 2.2 });
        }
        return;
      }
      if (this.phase === 'finish') {
        face('rolled', 2);
        if (this.pt > 4.5) {
          this.restore();
          const sv = PD.Save.load() || {};
          this.result = { cash: Math.round(100 * (this.raw ? 1.5 : 1) + (this.faceShot ? 50 : 0)), raw: this.raw, face: this.faceShot };
          sv.converted = (sv.converted || 0) + 1; sv.cash = (sv.cash || 0) + this.result.cash; sv.chapter = 'hub'; sv.dex = Array.from(new Set((sv.dex || []).concat(['twink'])));
          PD.Save.write(sv);
          SM.scenes.payout.result = this.result;
          SM.go('payout');
        }
      }
    },
    updateSquirt(dt, mashed) {
      const q = this.squirt, D = this.D, S = this.S;
      q.t += dt;
      if (!q.aim) {
        q.fill = Math.min(1, q.fill + dt * 0.2 + (mashed ? 0.07 : 0));
        S.w.arousal = Math.max(S.w.arousal, 0.6 + q.fill * 0.35);
        if (q.fill >= 1) { q.aim = true; q.t = 0; this.setBanner('AIM!'); PD.Audio.ui('lock'); this.say('NOW. Hit the FACE zone. Space or click.'); }
        return;
      }
      if (q.fired === undefined) {
        q.x = 0.5 + 0.5 * Math.sin(q.t * 3.4 - Math.PI / 2);
        if (mashed && q.t > 0.25) {
          q.fired = q.x > 0.72 && q.x < 0.9 ? 'face' : q.x > 0.42 ? 'chest' : 'sheets';
          q.ft = 0;
          S.w.arousal = 0.999;
          const m = S.m;
          const drain = { face: 0.3, chest: 0.16, sheets: 0.06 }[q.fired];
          this.gay = Math.max(0, this.gay - drain);
          if (q.fired === 'face') { this.faceShot = true; SM.shake = 0.3 * PD.Settings.shake; if (m.headPt) D.fx.word(m.headPt.x, m.headPt.y - 22, PD.pick(['MY FACE IS WET', 'IS SHE PISSING??', 'IN MY EYE!!']), C('sweat', 3), { life: 2 }); this.say('RIGHT IN THE FACE. He opened his mouth. He is not even mad.'); }
          else if (q.fired === 'chest') this.say('Chest shot. He is rubbing it in. Weird. Good.');
          else this.say('Missed. The sheets got converted instead. Still counts a little.');
          PD.Audio.ui(q.fired === 'face' ? 'scratch' : 'pop');
        }
        return;
      }
      // the stream
      q.ft += dt;
      const sk = D.skel, m = S.m;
      if (sk && q.ft < 1.3) {
        const E = sk.entry;
        const tgt = q.fired === 'face' && m.headPt ? m.headPt : q.fired === 'chest' && m.headPt ? { x: (m.headPt.x + E.x) / 2, y: (m.headPt.y + E.y) / 2 + 4 } : { x: E.x + 30, y: PD.BED_Y + 2 };
        const T = 0.32, pulse = 0.85 + 0.15 * Math.sin(q.ft * 20);
        for (let i = 0; i < 4; i++) {
          const vx = (tgt.x - E.x) / T * pulse + PD.rnd(-12, 12), vy = (tgt.y - E.y) / T - 75 * T + PD.rnd(-12, 12);
          D.fx.drop(E.x, E.y, vx, vy, 'squirt');
        }
        if (Math.random() < dt * 4) D.fx.word(E.x + PD.rnd(-10, 10), E.y - 8, PD.pick(['SQUIRT!', 'SPLSH', 'PSSHH']), C('sweat', 3), { life: 0.8 });
        if (q.fired === 'face') m.faceWet = Math.min(1, m.faceWet + dt * 1.2);
        for (const p of D.fx.list) if (p.kind === 'squirt' && Math.hypot(p.x - tgt.x, p.y - tgt.y) < 6) { p.life = 0; if (Math.random() < 0.3) D.fx.drop(p.x, p.y, PD.rnd(-15, 15), 10, 'sweat'); }
      } else if (q.ft >= 1.3) { this.squirt = null; this.squirtDone = true; this.setBanner(STAGES[Math.max(0, this.stage)].name); }
    },

    // ---------------- drawing ----------------
    draw(fb) {
      const D = this.D, S = this.S, t = this.t;
      if (this.phase === 'arrive') return this.drawArrive(fb);
      PD.STAGE.draw(fb, { decor: this.decor, skipFx: true });
      // grab cams before the HUD goes on
      const hp = S.m.headPt, E = D.skel && D.skel.entry;
      const big = this.phase === 'reveal';
      const fh = D.skel && D.skel.m.T ? D.skel.m.T.fh : { x: 0, y: 0 };
      if (hp) { grabCam(fb, hp.x + fh.x * 3, hp.y + fh.y * 3, 30); this.faceCam = camBuf.slice(0, 900); }
      D.fx.draw(fb);
      if (D.flash > 0) fb.drect(0, 0, W, H, C('ui', 4), D.flash * 0.7);
      if (this.phase === 'reveal') {
        fb.darken(2);
        fb.rect(0, 0, W, 16, C('ink', 0)); fb.rect(0, H - 16, W, 16, C('ink', 0));
        camBuf.set(this.faceCam);
        const k = easeOut(this.pt / 0.25), sc = 3, n = 30;
        PD.popAt(fb, k, W / 2, 80, (f) => drawCam(f, W / 2 - 45, 34, n, sc, 'HIS FACE', t, { ramp: 'cloth1' }));
        PD.popAt(fb, (this.pt - 0.2) / 0.2, W / 2, 140, (f) => PD.textS(f, 'WHAT THE FUCK', W / 2, 132, 2, C('cloth1', 4), { center: true, outline: C('ink', 0), shadow: C('ink', 0) }));
        return;
      }
      // ---- HUD ----
      // gay meter (pride stripes draining)
      fb.rect(2, 2, 116, 17, C('ink', 0)); fb.drect(2, 2, 116, 17, C('night', 2), 0.5);
      PD.text(fb, 'GAY', 5, 5, C('ui', 4));
      const gw = 76, gf = Math.round(gw * this.gay);
      fb.rect(20, 4, gw + 2, 7, C('ink', 3));
      for (let x = 0; x < gf; x++) fb.rect(21 + x, 5, 1, 5, C('pride', Math.floor(x / (gw / 6)) % 6));
      PD.text(fb, Math.ceil(this.gay * 100) + '%', 100, 5, C('ui', 4));
      const stName = this.phase === 'convert' || this.phase === 'finish' ? STAGES[Math.max(0, this.stage)].name : this.phase === 'setup' ? 'CLUELESS' : 'PANIC';
      PD.text(fb, stName, 5, 12, C('gold', 3));
      if (this.raw) PD.text(fb, 'RAW X1.5', 70, 12, C('cloth1', 4));
      // counter + cash
      fb.rect(240, 2, 78, 17, C('ink', 0));
      PD.text(fb, '10,000 ONLINE', 315 - PD.textWidth('10,000 ONLINE'), 5, C('lime', 3));
      PD.text(fb, 'TYLER, 21', 315 - PD.textWidth('TYLER, 21'), 12, C('neon', 3));
      // banner
      if (this.banner.text) {
        const k = this.banner.t / 0.25;
        if (this.banner.t < 2.2 || this.phase === 'hook') PD.popAt(fb, k, W / 2, 30, (f) => PD.textS(f, this.banner.text, W / 2, 25, 2, C('gold', 3), { center: true, outline: C('ink', 0), shadow: C('neon', 1) }));
      }
      // cams
      if (this.faceCam) { camBuf.set(this.faceCam); drawCam(fb, 4, 114, 30, 2, 'HIS FACE', t); }
      this.drawPussyCam(fb, 256, 114, t);
      // phase widgets
      if (this.phase === 'setup') { bar(fb, 140, 44, 60, this.blind, 'cloth3', 'BLINDFOLD'); if (this.blind < 0.35 && Math.sin(t * 12) > 0) PD.textS(fb, 'SLIPPING!', W / 2, 52, 1, C('cloth1', 4), { center: true, outline: C('ink', 0) }); }
      if (this.phase === 'hook') {
        bar(fb, 150, 128, 90, this.hook, 'heart', 'HOOK');
        bar(fb, 150, 137, 90, this.escape, 'cloth1', 'ESCAPE');
        if (Math.sin(t * 14) > -0.2) PD.textS(fb, 'MASH SPACE / CLICK!', W / 2, 146, 1, C('ui', 4), { center: true, outline: C('ink', 0) });
      }
      if (this.squirt) this.drawSquirt(fb);
      // operator caption + prompts
      this.drawCaption(fb);
    },
    // Close-up insert: her pussy taking him, synced to the stroke depth. Drawn at 30x30, shown at 2x.
    drawPussyCam(fb, X, Y, t) {
      const D = this.D, S = this.S, F = this.camFB || (this.camFB = new PD.FB());
      const R = PD.R, cap = (ax, ay, bx, by, ra, rb) => PD.cap({ x: ax, y: ay }, { x: bx, y: by }, ra, rb === undefined ? ra : rb), ell = (x, y, rx, ry, a) => PD.ell({ x, y }, rx, ry, a || 0);
      const skW = 'skin' + (S.w.p.skin | 0), skM = 'skin' + (S.m.p.skin | 0);
      const N = 30, cx = 15, jig = this.hitT > 0 ? Math.round(Math.sin(t * 60) * this.hitT * 3) : 0;
      F.rect(0, 0, N + 2, N + 2, C(skW, 1));
      PD.drawGroup(F, { prims: [ell(-2 - jig, 22, 11, 17, 0.25), ell(32 + jig, 22, 11, 17, -0.25), ell(15, -2, 18, 9)], ramp: R[skW], k: 5 });
      for (let j = 0; j < 5; j++) { F.px(cx, 2 + j, C('hair' + (S.w.p.hair | 0), 1)); if (j % 2) F.px(cx - 1, 2 + j, C('hair' + (S.w.p.hair | 0), 2)); }
      const depth = clamp(D.depth || 0, 0, 1), open = 19;
      const vis = Math.round((1 - depth) * 9) + 1;
      const gape = 2.8;
      // her lips, the pink inside, clit
      PD.drawGroup(F, { prims: [ell(cx - 4.3, 12.5, 4.4, 9.5, -0.12), ell(cx + 4.3, 12.5, 4.4, 9.5, 0.12)], ramp: R[skW], k: 2, lift: 0.12 });
      PD.drawGroup(F, { prims: [ell(cx, 12, 2.5, 8), ell(cx, open, gape + 1.4, 2.8)], ramp: R.heart, k: 2, bias: 0.35, noOutline: true });
      PD.drawGroup(F, { prims: [ell(cx, 4.5, 1.4, 1.6)], ramp: R.heart, lift: 0.35 });
      F.rect(cx, 7, 1, 10, C('heart', 1)); F.px(cx - 1, 9, C('heart', 4)); F.px(cx - 1, 12, C('heart', 4));
      // him, going in from below (condom while it's on)
      const base = open + vis;
      PD.drawGroup(F, { prims: [cap(cx, open - 1, cx, base + 12, gape, gape + 0.4)], ramp: R[skM], k: 1.5, bias: -0.45,
        paints: S.m.condom ? [{ prims: [cap(cx, open - 1, cx, base + 12, gape + 1)], ramp: R.sweat, pat: PD.PAT.lace, map: [0, 1, 2, 3, 3, 3] }] : null });
      if (S.m.condom) F.rect(cx - 3, base + 1, 7, 1, C('sweat', 4));
      else for (let j = open + 2; j < base + 6; j++) F.px(cx + 1 + ((j >> 1) % 2), j, C(skM, 1));
      PD.drawGroup(F, { prims: [ell(cx - 3.4, base + 6, 4.2, 3.8), ell(cx + 3.4, base + 6.5, 4.2, 3.8)], ramp: R[skM], k: 2, bias: -0.15 });
      // stretched lips hugging him
      for (let i = -4; i <= 4; i++) F.px(cx + i, open + 1 - (Math.abs(i) > 3 ? 1 : 0), C('heart', 3));
      // wet: glints sliding down him, drips
      const wet = Math.min(1, D.wetness + (1 - this.gay) * 0.5);
      for (let k = 0; k < 3; k++) { const yy = open + 2 + ((t * 10 + k * 3) % Math.max(2, vis)); if (PD.bayer(cx, Math.round(yy)) < wet) F.px(cx - 1 + k % 2 * 2, yy, C('ui', 4)); }
      if (wet > 0.4) { const p = (t * 0.9) % 1; F.px(cx + 3, open + 1 + p * 7, C('fluid', 4)); }
      // squirt spray
      if (this.squirt && this.squirt.fired && this.squirt.ft < 1.3) for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + PD.rnd(-1, 1), r = PD.rnd(1, 14); F.px(cx + Math.cos(a) * r, open - 3 + Math.sin(a) * r, k % 2 ? C('sweat', 4) : C('sweat', 3)); }
      // frame, 2x blow-up, scanlines, label
      const n = N * 2;
      fb.rect(X - 2, Y - 2, n + 4, n + 4, C('ink', 0)); fb.rect(X - 1, Y - 1, n + 2, n + 2, C('neon', 3));
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) fb.rect(X + i * 2, Y + j * 2, 2, 2, F.buf[j * W + i]);
      fb.rect(X, Y, PD.textWidth('PUSSY CAM') + 9, 7, C('ink', 0));
      if (Math.sin((t + 1) * 5) > 0) fb.rect(X + 1, Y + 2, 3, 3, C('cloth1', 4));
      PD.text(fb, 'PUSSY CAM', X + 6, Y + 1, C('ui', 4));
      const tag = S.m.condom ? ['CONDOM', 'sweat'] : this.raw ? ['RAW', 'cloth1'] : null;
      if (tag) { fb.rect(X, Y + n - 7, PD.textWidth(tag[0]) + 4, 7, C('ink', 0)); PD.text(fb, tag[0], X + 2, Y + n - 6, C(tag[1], 4)); }
    },
    drawSquirt(fb) {
      const q = this.squirt, x0 = 100, y = 132, w = 120;
      if (!q.aim) { bar(fb, x0 + 30, y, 90, q.fill, 'sweat', 'SQUIRT'); if (Math.sin(this.t * 10) > 0) PD.textS(fb, 'MASH TO BUILD IT', W / 2, y + 9, 1, C('sweat', 4), { center: true, outline: C('ink', 0) }); return; }
      fb.rect(x0 - 1, y - 1, w + 2, 9, C('ink', 0));
      const zone = (a, b, ramp, label) => { fb.rect(x0 + a * w, y, (b - a) * w, 7, C(ramp, 2)); PD.text(fb, label, x0 + ((a + b) / 2) * w - PD.textWidth(label) / 2, y + 1, C('ui', 4)); };
      zone(0, 0.42, 'ink', 'SHEETS'); zone(0.42, 0.72, 'gold', 'CHEST'); zone(0.72, 0.9, 'cloth1', 'FACE'); zone(0.9, 1, 'ink', '');
      const mx = Math.round(x0 + (q.fired ? q.x : q.x) * w);
      fb.rect(mx - 1, y - 4, 3, 15, C('ink', 0)); fb.rect(mx, y - 3, 1, 13, C('ui', 4));
      if (q.fired) PD.textS(fb, q.fired === 'face' ? 'FACIAL!!' : q.fired === 'chest' ? 'CHEST!' : 'MISS', W / 2, y + 12, 1, C(q.fired === 'face' ? 'cloth1' : 'gold', 4), { center: true, outline: C('ink', 0) });
    },
    drawCaption(fb) {
      const x = 70, y = 156, w = 180, h = 22;
      fb.rect(x, y, w, h, C('ink', 0)); fb.rect(x + 1, y + 1, w - 2, h - 2, C('night', 1));
      fb.rect(x + 1, y + 1, 3, h - 2, C('gold', 2));
      const lines = PD.wrap(this.quip, 42);
      let left = Math.floor(this.qshown);
      lines.slice(0, 2).forEach((l, i) => { PD.text(fb, l.slice(0, Math.max(0, left)), x + 7, y + 4 + i * 8, C('ui', 4)); left -= l.length + 1; });
      if (this.prompt === 'condom') {
        fb.rect(86, 128, 148, 24, C('ink', 0)); fb.rect(87, 129, 146, 22, C('night', 2));
        PD.text(fb, 'HE IS STILL WEARING A CONDOM', 102, 131, C('gold', 3));
        if (UI.button(fb, 'rip', 92, 138, 70, 11, 'RIP IT OFF', { ramp: 'cloth1' })) {
          this.prompt = null; this.raw = true; this.S.m.condom = false;
          const B = this.D.skel && this.D.skel.m.penis ? this.D.skel.m.penis.B : { x: 160, y: 100 };
          this.D.fx.word(B.x, B.y - 14, 'FUCK THIS RUBBER', C('ui', 4), { life: 1.6 });
          for (let i = 0; i < 6; i++) this.D.fx.drop(B.x, B.y, PD.rnd(-90, 90), -120 + PD.rnd(-20, 20), 'sweat');
          SM.shake = 0.15 * PD.Settings.shake; PD.Audio.ui('scratch');
          this.say('Raw. He did not even argue. "Total bottom" my ass.');
        }
        if (UI.button(fb, 'keep', 168, 138, 60, 11, 'LEAVE IT', { ramp: 'ink' })) { this.prompt = null; this.say('Safe. Boring. He will rip it off himself by round two.'); }
      }
    },
    drawArrive(fb) {
      fb.clear(C('ink', 0));
      const t = this.pt;
      for (let y = 0; y < H; y += 2) fb.rect(0, y, W, 1, C('ink', 1));
      // the door, ajar, light spilling
      fb.rect(130, 40, 60, 110, C('wood', 0)); fb.rect(133, 43, 54, 107, C('wood', 1));
      const open = clamp((t - 1.6) / 1.2, 0, 1);
      fb.rect(133, 43, Math.round(6 + open * 20), 107, C('neon', 3)); fb.drect(100, 140, 120, 30, C('neon', 2), 0.25 + open * 0.3);
      fb.rect(139 + Math.round(open * 20), 43, 48 - Math.round(open * 20), 107, C('wood', 2));
      PD.popAt(fb, (t - 0.35) / 0.15, 92, 60, (f) => PD.textS(f, 'KNOCK', 92, 55, 2, C('ui', 4), { center: true, outline: C('ink', 0) }));
      PD.popAt(fb, (t - 0.8) / 0.15, 232, 76, (f) => PD.textS(f, 'KNOCK', 232, 71, 2, C('ui', 4), { center: true, outline: C('ink', 0) }));
      if (t > 1.7) PD.textS(fb, 'CREEEAK', 230, 120, 1, C('gold', 3), { center: true });
      const cap = up('The door was open. The blindfold was on.');
      if (t > 1.2) { const n = Math.floor((t - 1.2) * 40); PD.textS(fb, cap.slice(0, n), W / 2, 162, 1, C('gold', 3), { center: true }); }
    },
  };

  // ============================================================
  //  PAYOUT
  // ============================================================
  SM.scenes.payout = {
    enter() { this.t = 0; this.stamped = false; this.ticked = 0; UI.focus = 0; this.result = this.result || { cash: 100 }; },
    update(dt) {
      this.t += dt;
      if (!this.stamped && this.t > 1.1) { this.stamped = true; SM.shake = 0.35 * PD.Settings.shake; PD.Audio.ui('slam'); }
      if (this.t > 1.8 && this.t < 2.6 && Math.floor(this.t * 20) !== this.ticked) { this.ticked = Math.floor(this.t * 20); PD.Audio.ui('tick'); }
      if (this.t > 2.6 && this.t - dt <= 2.6) PD.Audio.ui('start');
    },
    draw(fb) {
      const t = this.t, r = this.result;
      PD.drawSkyline(fb, SM.t, 0.5);
      PD.popAt(fb, t / 0.3, W / 2, 80, (f) => {
        PD.panel(f, 40, 10, 240, 132, 'night', { fill: 1 });
        // before / after
        f.rect(52, 22, 70, 84, C('heart', 2)); for (let j = 0; j < 6; j++) f.rect(52, 22 + j * 3, 70, 3, C('pride', j));
        PD.drawDude(f, 87, 104, Object.assign({ s: 2, clip: [52, 22, 70, 84] }, PD.CAST.twinkPride, { face: 'smug' }));
        f.rect(198, 22, 70, 84, C('cyan', 1));
        PD.drawDude(f, 233, 104, Object.assign({ s: 2, clip: [198, 22, 70, 84] }, PD.CAST.twinkStraight));
        PD.text(f, 'BEFORE', 54, 24, C('ui', 4), C('ink', 0)); PD.text(f, 'AFTER', 244, 24, C('ui', 4), C('ink', 0));
        PD.text(f, 'TYLER, 21', 160 - PD.textWidth('TYLER, 21') / 2, 24, C('ui', 4));
        PD.text(f, 'EX-TWINK', 160 - PD.textWidth('EX-TWINK') / 2, 32, C('neon', 3));
        // results
        PD.text(f, 'CASH  +$' + r.cash, 128, 82, C('lime', 3));
        if (r.raw) PD.text(f, 'RAW  X1.5', 128, 90, C('cloth1', 4));
        if (r.face) PD.text(f, 'FACIAL +$50', 128, 98, C('sweat', 4));
        PD.text(f, '"BRO. WHERE\'S THE BEER"', 160 - PD.textWidth('"BRO. WHERE\'S THE BEER"') / 2, 114, C('gold', 3));
      });
      // counter roll
      const k = clamp((t - 1.8) / 0.8, 0, 1);
      const n = 10000 - Math.round(k);
      PD.textS(fb, n.toLocaleString('en-US') + ' ONLINE', W / 2, 128, 1, k >= 1 ? C('lime', 4) : C('ui', 4), { center: true, outline: C('ink', 0) });
      if (k >= 1) PD.textS(fb, '-1', W / 2 + 36, 126 - Math.min(8, (t - 2.6) * 10), 1, C('cloth1', 4), { outline: C('ink', 0) });
      // the stamp
      if (t > 0.9) {
        const s = clamp((t - 0.9) / 0.2, 0, 1), sc = s < 1 ? 3 - s * 2 : 2;
        PD.popAt(fb, s, W / 2, 62, (f) => {
          f.rect(W / 2 - 64, 50, 128, 26, C('cloth1', 4)); f.rect(W / 2 - 61, 53, 122, 20, C('cloth1', 2));
          PD.textS(f, 'STRAIGHT', W / 2, 55, 3, C('ui', 4), { center: true, outline: C('cloth1', 0) });
        });
        void sc;
      }
      if (t > 2.8 && UI.button(fb, 'cont', W / 2 - 50, 150, 100, 16, 'CONTINUE >>', { ramp: 'neon' })) SM.go('chapter');
    },
  };
})(window.PD);

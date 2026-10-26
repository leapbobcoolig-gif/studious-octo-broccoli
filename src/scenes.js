// Screens + scene manager for SWIPE STRAIGHT.
//   boot (18+) -> title -> menu -> settings / new game / continue / sandbox
// Each scene: { enter?(), update(dt), draw(fb) }. Transitions use a pink dither wipe.
(function (PD) {
  'use strict';
  const C = PD.C, W = PD.W, H = PD.H, UI = PD.UI;

  // ---------- settings + save ----------
  const DEF = { master: 0.7, sfx: 0.8, palette: 'color', textSpeed: 1, shake: 1 };
  PD.Settings = Object.assign({}, DEF);
  try { Object.assign(PD.Settings, JSON.parse(localStorage.getItem('ss-settings') || '{}')); } catch (e) { /* storage blocked */ }
  PD.saveSettings = () => { try { localStorage.setItem('ss-settings', JSON.stringify(PD.Settings)); } catch (e) { /* ignore */ } };
  PD.Save = {
    load() { try { return JSON.parse(localStorage.getItem('ss-save') || 'null'); } catch (e) { return null; } },
    write(d) { try { localStorage.setItem('ss-save', JSON.stringify(d)); } catch (e) { /* ignore */ } },
    clear() { try { localStorage.removeItem('ss-save'); } catch (e) { /* ignore */ } },
  };

  // ---------- manager ----------
  const SM = {
    cur: null, next: null, wipe: 0, dir: 0, t: 0, shake: 0, scenes: {},
    go(name, instant) {
      if (instant) { this.cur = name; this.t = 0; const s = this.scenes[name]; if (s.enter) s.enter(); return; }
      if (this.dir) return;
      this.next = name; this.dir = 1;
    },
    update(dt) {
      if (this.dir === 1) { this.wipe += dt * 2.6; if (this.wipe >= 1) { this.wipe = 1; this.dir = -1; this.go(this.next, true); } }
      else if (this.dir === -1) { this.wipe -= dt * 2.6; if (this.wipe <= 0) { this.wipe = 0; this.dir = 0; } }
      this.t += dt;
      this.shake = Math.max(0, this.shake - dt);
      UI.begin(dt);
      const s = this.scenes[this.cur];
      if (s && !this.dir) s.update(dt);
      else if (s && s.idle) s.idle(dt);
    },
    draw(fb) {
      const s = this.scenes[this.cur];
      if (s) s.draw(fb);
      PD.drawWipe(fb, this.wipe);
      if (s && !s.ownCursor) PD.drawCursor(fb);
      UI.end();
    },
  };
  PD.SM = SM;

  // ---------- shared: neon night skyline ----------
  function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function makeLayer(seed, n, minH, maxH, minW, maxW) {
    const r = seeded(seed), out = [];
    let x = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.round(minW + r() * (maxW - minW)), h = Math.round(minH + r() * (maxH - minH));
      const wins = [];
      for (let wy = 4; wy < h - 4; wy += 5) for (let wx = 3; wx < w - 3; wx += 4) {
        const k = r();
        wins.push({ x: wx, y: wy, kind: k < 0.12 ? 'pride' : k < 0.45 ? 'lit' : 'off', c: (r() * 6) | 0, ph: r() * 9, sp: 0.2 + r() * 0.6 });
      }
      out.push({ x, w, h, wins, roof: r() < 0.3 ? 'ant' : r() < 0.5 ? 'step' : '' , sign: r() < 0.18 });
      x += w + Math.round(r() * 3);
    }
    out.span = x;
    return out;
  }
  const FAR = makeLayer(11, 30, 40, 90, 14, 30);
  const NEAR = makeLayer(29, 22, 26, 70, 20, 40);
  const STARS = (() => { const r = seeded(5), a = []; for (let i = 0; i < 60; i++) a.push({ x: (r() * W) | 0, y: (r() * 70) | 0, ph: r() * 6, b: r() < 0.15 }); return a; })();

  function drawLayer(fb, L, scroll, baseY, shade, t, lit) {
    const off = ((scroll % L.span) + L.span) % L.span;
    for (let rep = -1; rep <= 1; rep++) for (const b of L) {
      const bx = Math.round(b.x - off + rep * L.span);
      if (bx > W || bx + b.w < 0) continue;
      const top = baseY - b.h;
      fb.rect(bx, top, b.w, b.h, C('night', shade));
      fb.rect(bx, top, b.w, 1, C('night', shade + 1));
      if (b.roof === 'ant') { fb.rect(bx + (b.w >> 1), top - 8, 1, 8, C('night', shade)); if (Math.sin(t * 3 + b.x) > 0) fb.px(bx + (b.w >> 1), top - 9, C('neon', 3)); }
      if (b.roof === 'step') fb.rect(bx + 3, top - 4, b.w - 6, 4, C('night', shade));
      for (const w of b.wins) {
        const X = bx + w.x, Y = top + w.y;
        if (X < 0 || X >= W) continue;
        const on = Math.sin(t * w.sp + w.ph) > -0.7;
        if (w.kind === 'off' || !on) { fb.rect(X, Y, 2, 2, C('night', Math.max(0, shade - 1))); continue; }
        const col = w.kind === 'pride' ? C('pride', w.c) : C('gold', lit ? 3 : 2);
        fb.rect(X, Y, 2, 2, col);
      }
      if (b.sign && lit) {
        // little neon sign on the near layer
        const sx = bx + 3, sy = top + 6;
        const blink = Math.sin(t * 5 + b.x) > -0.3;
        fb.rect(sx - 1, sy - 1, 13, 7, C('ink', 0));
        PD.text(fb, b.x % 2 ? 'BAR' : 'XXX', sx, sy, blink ? C('neon', 3) : C('neon', 1));
      }
    }
  }

  PD.drawSkyline = function (fb, t, dim) {
    // sky gradient: deep violet -> hot pink horizon glow
    for (let y = 0; y < H; y++) {
      const f = y / H;
      fb.rect(0, y, W, 1, C('night', 0));
      fb.drect(0, y, W, 1, C('night', 1), f * 1.8);
      fb.drect(0, y, W, 1, C('night', 2), Math.max(0, f - 0.35) * 2);
      if (f > 0.55) fb.drect(0, y, W, 1, C('night', 3), (f - 0.55) * 4);
      if (f > 0.7) fb.drect(0, y, W, 1, C('neon', 5), (f - 0.7) * 5);
    }
    for (const s of STARS) {
      const tw = Math.sin(t * 2 + s.ph);
      if (tw > -0.3) fb.px(s.x, s.y, tw > 0.6 ? C('ui', 4) : C('cyan', 3));
      if (s.b && tw > 0.5) { fb.px(s.x - 1, s.y, C('cyan', 3)); fb.px(s.x + 1, s.y, C('cyan', 3)); }
    }
    // moon
    fb.ellipse(262, 30, 12, 12, C('neon', 4), 0.12);
    fb.ellipse(262, 30, 8, 8, C('gold', 4));
    fb.ellipse(259, 28, 7, 7, C('night', 0));
    drawLayer(fb, FAR, t * 4, 150, 2, t, false);
    drawLayer(fb, NEAR, t * 9, 166, 1, t, true);
    // street
    fb.rect(0, 166, W, 14, C('ink', 1));
    fb.rect(0, 166, W, 1, C('neon', 2));
    for (let x = ((-t * 40) % 24 + 24) % 24 - 24; x < W; x += 24) fb.rect(Math.round(x), 177, 10, 1, C('gold', 1));
    if (dim) fb.darken(dim > 0.4 ? 2 : 1);
  };

  // ---------- shared: the phone prop ----------
  function drawPhone(fb, x, y, t, buzz, online) {
    const wob = buzz ? Math.round(Math.sin(t * 60)) : 0;
    x += wob;
    fb.rect(x - 1, y - 1, 52, 92, C('ink', 0));
    fb.rect(x, y, 50, 90, C('ink', 3));
    fb.rect(x + 2, y + 2, 46, 86, C('ink', 0));
    fb.rect(x + 3, y + 6, 44, 78, C('ink', 1));
    // app header
    fb.rect(x + 3, y + 6, 44, 9, C('gold', 2));
    PD.text(fb, 'GRINDR', x + 5, y + 8, C('ink', 0));
    // grid of faceless profile tiles
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
      const tx = x + 4 + i * 14, ty = y + 17 + j * 15;
      fb.rect(tx, ty, 13, 14, C('night', 2 + ((i + j) % 2)));
      fb.ellipse(tx + 6.5, ty + 5, 3, 3, C('night', 4));
      fb.rect(tx + 2, ty + 9, 9, 5, C('night', 4));
      if (Math.sin(t * 2 + i * 3 + j * 5) > 0.3) fb.rect(tx + 10, ty + 1, 2, 2, C('lime', 2));
    }
    fb.rect(x + 3, y + 78, 44, 6, C('ink', 2));
    PD.text(fb, online, x + 5, y + 79, C('gold', 3));
    fb.rect(x + 20, y + 3, 10, 1, C('ink', 3));
  }

  PD.drawPhone = drawPhone;

  // ---------- BOOT (18+) ----------
  SM.scenes.boot = {
    update() {},
    draw(fb) {
      fb.clear(C('ink', 0));
      for (let y = 0; y < H; y += 2) fb.drect(0, y, W, 1, C('night', 1), 0.35);
      PD.textS(fb, '18+', W / 2, 28, 6, C('neon', 2), { center: true, shadow: C('night', 2), outline: C('ink', 0) });
      PD.textS(fb, 'SWIPE STRAIGHT CONTAINS EXPLICIT SEX', W / 2, 74, 1, C('ui', 4), { center: true });
      PD.textS(fb, 'AND DELIBERATELY OFFENSIVE CRUDE HUMOR.', W / 2, 82, 1, C('ui', 4), { center: true });
      PD.textS(fb, 'ALL CHARACTERS ARE FICTIONAL ADULTS.', W / 2, 94, 1, C('cyan', 3), { center: true });
      if (UI.button(fb, 'enter', W / 2 - 50, 112, 100, 16, "I'M 18+  LET ME IN", { ramp: 'neon' })) {
        PD.Audio.enable(true); PD.applyAudio(); SM.go('title');
      }
      if (UI.button(fb, 'leave', W / 2 - 30, 134, 60, 12, 'LEAVE', { ramp: 'ink' })) { SM.go('bye'); }
    },
  };
  SM.scenes.bye = { update() {}, draw(fb) { fb.clear(C('ink', 0)); PD.textS(fb, 'BYE THEN.', W / 2, 84, 2, C('ink', 4), { center: true }); } };

  // ---------- TITLE ----------
  const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function drawLogo(fb, t, cx, y, big) {
    const sc1 = big ? 3 : 2, sc2 = big ? 5 : 3;
    // SWIPE drops in, STRAIGHT slams, then the rainbow gets "straightened" letter by letter
    const k1 = PD.clamp((t - 0.2) / 0.5, 0, 1), k2 = PD.clamp((t - 0.55) / 0.45, 0, 1);
    const y1 = y - (1 - easeOutBack(k1)) * 60, y2 = y + sc1 * 6 + 2 - (1 - easeOutBack(k2)) * 90;
    if (k1 > 0) PD.textS(fb, 'SWIPE', cx, y1, sc1, C('gold', 2), { center: true, outline: C('ink', 0), shadow: C('neon', 1), shadowOff: sc1, shine: C('gold', 4) });
    if (k2 > 0) {
      const zap = t - 1.5; // seconds since straightening began
      PD.textS(fb, 'STRAIGHT', cx, y2, sc2, 0, {
        center: true, outline: C('ink', 0), shadow: C('cyan', 1), shadowOff: sc2 - 1,
        colFn: (i, row) => (zap > i * 0.07 ? (row < 2 ? C('neon', 3) : C('neon', 2)) : C('pride', (row + i) % 6)),
      });
      if (zap > 0 && zap < 0.8) {
        const zx = cx - PD.textWidth('STRAIGHT') * sc2 / 2 + zap / 0.56 * PD.textWidth('STRAIGHT') * sc2;
        fb.rect(Math.round(zx), Math.round(y2) - 3, 2, sc2 * 5 + 6, C('ui', 4));
        fb.rect(Math.round(zx) - 2, Math.round(y2) - 1, 1, sc2 * 5 + 2, C('cyan', 3));
      }
    }
    return y2 + sc2 * 5;
  }
  SM.scenes.title = {
    enter() { this.t = 0; this.slammed = false; this.zapped = false; },
    idle(dt) { this.t += dt; },
    update(dt) {
      this.t += dt;
      if (!this.slammed && this.t > 1.0) { this.slammed = true; SM.shake = 0.35 * PD.Settings.shake; PD.Audio.ui('slam'); }
      if (!this.zapped && this.t > 1.5) { this.zapped = true; PD.Audio.ui('zap'); }
      if (this.t > 1.2 && (UI.activate || PD.INPUT.released || UI.back)) { PD.Audio.ui('start'); SM.go('menu'); }
    },
    draw(fb) {
      const t = this.t || 0;
      PD.drawSkyline(fb, SM.t, 0);
      const bottom = drawLogo(fb, t, W / 2, 26, true);
      if (t > 2.1) {
        PD.textS(fb, 'TURN THE WHOLE TOWN.', W / 2, bottom + 8, 1, C('cyan', 3), { center: true, outline: C('ink', 0) });
        if (Math.sin(t * 5) > -0.2) PD.textS(fb, 'PRESS START', W / 2, 136, 2, C('ui', 4), { center: true, outline: C('ink', 0), shadow: C('neon', 1) });
      }
      // the phone buzzing in the corner
      const pt = PD.clamp((t - 0.9) / 0.6, 0, 1);
      drawPhone(fb, 266, 112 + (1 - easeOutBack(pt)) * 80, SM.t, Math.sin(SM.t * 1.3) > 0.7, '10,000 ONLINE');
      if (Math.sin(SM.t * 1.3) > 0.7) { PD.textS(fb, 'BZZT', 254, 104, 1, C('gold', 3), { outline: C('ink', 0) }); }
      PD.textS(fb, '18+  FICTIONAL ADULTS ONLY', 4, 172, 1, C('cyan', 2));
    },
  };

  // ---------- MAIN MENU ----------
  const confirmBox = (fb, msg, yes, no) => {
    fb.drect(0, 0, W, H, C('ink', 0), 0.6);
    PD.panel(fb, W / 2 - 80, 60, 160, 56, 'night', { fill: 2 });
    PD.textS(fb, msg, W / 2, 72, 1, C('ui', 4), { center: true });
    const y = UI.button(fb, 'cy', W / 2 - 66, 90, 60, 14, yes, { ramp: 'neon' });
    const n = UI.button(fb, 'cn', W / 2 + 6, 90, 60, 14, no, { ramp: 'ink' });
    return y ? 1 : n || UI.back ? -1 : 0;
  };
  SM.scenes.menu = {
    enter() { this.t = 0; this.confirm = null; UI.focus = PD.Save.load() ? 0 : 1; },
    idle(dt) { this.t += dt; },
    update(dt) { this.t += dt; },
    draw(fb) {
      PD.drawSkyline(fb, SM.t, 0.25);
      const save = PD.Save.load();
      PD.textS(fb, 'SWIPE', 34, 14, 2, C('gold', 2), { outline: C('ink', 0), shadow: C('neon', 1), shine: C('gold', 4) });
      PD.textS(fb, 'STRAIGHT', 30, 28, 3, C('neon', 2), { outline: C('ink', 0), shadow: C('cyan', 1), shine: C('neon', 4) });
      const bx = 34, bw = 104;
      let y = 62;
      const items = [
        ['continue', 'CONTINUE', { disabled: !save, ramp: 'neon' }],
        ['new', 'NEW GAME', { ramp: 'neon' }],
        ['settings', 'SETTINGS', { ramp: 'cyan' }],
        ['collection', 'COLLECTION', { ramp: 'gold', lock: true, disabled: true }],
        ['sandbox', 'SANDBOX MODE', { ramp: 'lime' }],
      ];
      let picked = null;
      for (const [id, label, o] of items) {
        if (UI.button(fb, id, bx, y, bw, 15, label, o) && !this.confirm) picked = id;
        y += 19;
      }
      // right side: phone preview with live counter + tip
      drawPhone(fb, 214, 50, SM.t, false, '10,000 ONLINE');
      const tips = [['TWINKS LOVE A', 'BLINDFOLD. DUMMIES.'], ["GYM BROS CAN'T", 'REFUSE A BET'], ['THE COUNTER ONLY', 'GOES ONE WAY'], ['NO FATS NO FEMS', 'NO VAGINAS. YET.'], ['BEARS GET DRUNK', 'FAST. CHEAP DATE.'], ['EVERY FAG IS ONE', 'PUSSY AWAY. MATH.']];
      const tip = tips[Math.floor(SM.t / 4) % tips.length];
      PD.panel(fb, 196, 146, 86, 20, 'ink', { fill: 2 });
      PD.textS(fb, 'TIP', 200, 149, 1, C('gold', 2));
      PD.textS(fb, tip[0], 214, 149, 1, C('ui', 4));
      PD.textS(fb, tip[1], 214, 157, 1, C('cyan', 3));
      if (save) PD.textS(fb, 'SAVE: ' + save.converted + ' CONVERTED', bx, 160, 1, C('gold', 3), { outline: C('ink', 0) });
      PD.textS(fb, 'UP/DOWN + ENTER  OR CLICK', bx, 170, 1, C('cyan', 2));
      if (this.confirm === 'new') {
        const r = confirmBox(fb, 'START OVER? YOUR SAVE IS WIPED.', 'WIPE IT', 'NO');
        if (r === 1) { this.confirm = null; startNew(); } else if (r === -1) this.confirm = null;
        return;
      }
      if (picked === 'continue') SM.go(PD.chapterScene(save));
      if (picked === 'new') { if (save) { this.confirm = 'new'; UI.focus = 99; } else startNew(); }
      if (picked === 'settings') { SM.scenes.settings.from = 'menu'; SM.go('settings'); }
      if (picked === 'sandbox') SM.go('sandbox');
      if (UI.back) SM.go('title');
    },
  };
  function startNew() {
    PD.Save.write({ v: 1, started: Date.now(), chapter: 'intro', converted: 0, cash: 0 });
    SM.go('intro');
  }

  // ---------- SETTINGS ----------
  SM.scenes.settings = {
    enter() { this.confirm = false; UI.focus = 0; },
    update() {},
    draw(fb) {
      const S = PD.Settings;
      PD.drawSkyline(fb, SM.t, 0.45);
      PD.panel(fb, 40, 14, 240, 152, 'night', { fill: 1 });
      PD.textS(fb, 'SETTINGS', W / 2, 22, 2, C('gold', 2), { center: true, outline: C('ink', 0), shadow: C('neon', 1) });
      const lx = 56, cx = 156, cw = 104;
      let y = 46;
      const row = (label) => { PD.textS(fb, label, lx, y, 1, C('ui', 4)); };
      row('MASTER VOLUME'); S.master = UI.slider(fb, 'mv', cx, y + 1, cw, S.master); y += 16;
      row('SOUND EFFECTS'); S.sfx = UI.slider(fb, 'sv', cx, y + 1, cw, S.sfx, { ramp: 'cyan' }); y += 16;
      const pals = ['COLOR', 'MONO'];
      row('PALETTE'); S.palette = ['color', 'mono'][UI.select(fb, 'pal', cx, y, cw, pals, S.palette === 'mono' ? 1 : 0)]; y += 16;
      row('TEXT SPEED'); S.textSpeed = UI.select(fb, 'ts', cx, y, cw, ['SLOW', 'NORMAL', 'FAST'], S.textSpeed); y += 16;
      row('SCREEN SHAKE'); S.shake = UI.select(fb, 'sh', cx, y, cw, ['OFF', 'ON'], S.shake); y += 18;
      // palette preview swatches
      const sw = ['neon', 'gold', 'cyan', 'lime', 'night', 'pride'];
      sw.forEach((r, i) => { fb.rect(lx + i * 10, y, 8, 6, C('ink', 0)); fb.rect(lx + 1 + i * 10, y + 1, 6, 4, C(r, 2)); });
      PD.textS(fb, 'PREVIEW', lx + 64, y + 1, 1, C('ink', 4));
      y += 14;
      PD.applyAudio();
      if (UI.button(fb, 'reset', lx, y, 90, 14, 'DELETE SAVE', { ramp: 'ink', disabled: !PD.Save.load() })) this.confirm = true;
      if (UI.button(fb, 'back', cx + cw - 70, y, 70, 14, 'BACK', { ramp: 'neon' }) || (UI.back && !this.confirm)) {
        PD.saveSettings(); SM.go(this.from || 'menu');
      }
      if (this.confirm) {
        const r = confirmBox(fb, 'DELETE YOUR SAVE FOREVER?', 'DELETE', 'KEEP');
        if (r === 1) { PD.Save.clear(); this.confirm = false; } else if (r === -1) this.confirm = false;
      }
    },
  };

  // ---------- CHAPTER placeholder (M2 lands the cutscene here) ----------
  SM.scenes.chapter = {
    enter() { this.t = 0; UI.focus = 0; },
    update(dt) { this.t += dt; },
    draw(fb) {
      PD.drawSkyline(fb, SM.t, 0.55);
      PD.panel(fb, 50, 30, 220, 110, 'neon', { fill: 0, inner: 'ink', innerShade: 1 });
      PD.textS(fb, 'CHAPTER 2', W / 2, 42, 2, C('gold', 2), { center: true, outline: C('ink', 0) });
      PD.textS(fb, 'TYLER, 21', W / 2, 58, 2, C('neon', 3), { center: true, outline: C('ink', 0), wave: 1, t: this.t });
      PD.textS(fb, 'HE IS STILL TYPING. THE CHAT, THE TRICK', W / 2, 80, 1, C('ui', 4), { center: true });
      PD.textS(fb, 'AND THE ROOM ARRIVE IN MILESTONES 3-5.', W / 2, 88, 1, C('ui', 4), { center: true });
      PD.textS(fb, '(HE IS VERY GAY. NOT FOR LONG.)', W / 2, 98, 1, C('cyan', 3), { center: true });
      if (UI.button(fb, 'sb', 70, 112, 84, 14, 'SANDBOX', { ramp: 'lime' })) SM.go('sandbox');
      if (UI.button(fb, 'bk', 166, 112, 84, 14, 'MAIN MENU', { ramp: 'neon' }) || UI.back) SM.go('menu');
    },
  };
})(window.PD);

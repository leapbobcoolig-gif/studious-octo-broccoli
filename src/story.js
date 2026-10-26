// Chapter 1: the intro comic, the fake-profile creator, and the "posted" payoff.
// Also home of the chibi dude sprite (PD.drawDude) and comic helpers reused later
// by the phone app, the Dex and the payout cards.
(function (PD) {
  'use strict';
  const C = PD.C, W = PD.W, H = PD.H, UI = PD.UI, SM = PD.SM;
  const clamp = PD.clamp;
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const up = (s) => String(s).toUpperCase();

  // ============================================================
  //  CHIBI DUDE
  //  Drawn on a 32x40 unit grid (feet at 16,39), outlined + shaded,
  //  then stamped at any integer scale.
  // ============================================================
  const GW = 32, GH = 40;
  const grid = new Int16Array(GW * GH);
  const EMPTY = -1;
  function gset(x, y, c) { if (x >= 0 && y >= 0 && x < GW && y < GH) grid[y * GW + x] = c; }
  function grect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) gset(i, j, c); }
  function gell(cx, cy, rx, ry, c) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const u = (i + 0.5 - cx) / rx, v = (j + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) gset(i, j, c);
    }
  }
  const get = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? EMPTY : grid[y * GW + x]);

  PD.DUDE_DEFAULT = { skin: 'skin0', hair: 'hair1', hairStyle: 'short', shirt: 'cloth2', shirtStyle: 'tee', pants: 'cyan', face: 'blank' };
  PD.drawDude = function (fb, x, y, opt) {
    const o = Object.assign({}, PD.DUDE_DEFAULT, opt);
    const s = o.s || 1;
    grid.fill(EMPTY);
    const SK = C(o.skin, 3), SKd = C(o.skin, 2), HR = C(o.hair, 2), SH = C(o.shirt, 3), PA = C(o.pants, 1), INK = C('ink', 0);
    // legs + shoes
    grect(12, 28, 3, 10, PA); grect(17, 28, 3, 10, PA); grect(14, 28, 4, 3, PA);
    grect(11, 37, 4, 2, C('ink', 3)); grect(17, 37, 4, 2, C('ink', 3));
    // arms
    const sleeve = o.shirtStyle === 'tee' || o.shirtStyle === 'pride';
    grect(8, 18, 3, 9, SK); grect(21, 18, 3, 9, SK);
    if (sleeve) { grect(8, 18, 3, 3, SH); grect(21, 18, 3, 3, SH); }
    gell(9.5, 27.5, 1.8, 1.6, SK); gell(22.5, 27.5, 1.8, 1.6, SK);
    // torso
    grect(11, 17, 10, 12, SK);
    if (o.shirtStyle === 'tee' || o.shirtStyle === 'tank') grect(11, 17, 10, 12, SH);
    if (o.shirtStyle === 'tank') { grect(11, 17, 2, 2, SK); grect(19, 17, 2, 2, SK); }
    if (o.shirtStyle === 'pride' || o.shirtStyle === 'crop') {
      for (let j = 0; j < 7; j++) grect(11, 17 + j, 10, 1, o.shirtStyle === 'pride' ? C('pride', Math.min(5, j)) : SH);
      gset(16, 26, SKd); // navel
    }
    if (o.shirtStyle === 'none') { gset(13, 20, SKd); gset(18, 20, SKd); grect(15, 23, 2, 1, SKd); grect(15, 25, 2, 1, SKd); }
    // neck + head
    grect(14, 15, 4, 3, SK);
    gell(16, 9, 6.6, 7, SK);
    gell(9.6, 10, 1.3, 1.8, SK); gell(22.4, 10, 1.3, 1.8, SK); // ears
    // hair
    const hs = o.hairStyle;
    if (hs === 'short') { gell(16, 4.6, 6.6, 3.4, HR); grect(10, 4, 2, 4, HR); grect(20, 4, 2, 4, HR); }
    else if (hs === 'swoop') { gell(16, 4.2, 7, 3.6, HR); gell(12.5, 6.2, 4.4, 2.2, HR); grect(9, 4, 2, 5, HR); }
    else if (hs === 'buzz') { gell(16, 4.4, 6.4, 2.8, C(o.hair, 1)); }
    else if (hs === 'curly') { for (let k = 0; k < 7; k++) gell(10 + k * 2, 3.6 + (k % 2), 2.2, 2.2, HR); grect(9, 4, 2, 5, HR); grect(21, 4, 2, 5, HR); }
    if (o.beard) { gell(16, 13.2, 5.6, 3.2, HR); grect(10, 9, 2, 4, HR); grect(20, 9, 2, 4, HR); grect(14, 12, 4, 1, SK); }
    if (o.cap) { gell(16, 3.8, 7.2, 3.6, C(o.cap, 2)); grect(9, 5, 14, 2, C(o.cap, 2)); grect(14, 5, 4, 1, SK); grect(14, 5, 4, 1, HR); gset(16, 1, C(o.cap, 4)); }
    // accessories
    if (o.flag) {
      grect(25, 8, 1, 20, C('wood', 3));
      for (let j = 0; j < 6; j++) grect(26, 8 + j, 6, 1, C('pride', j));
      gell(24, 27.5, 1.8, 1.6, SK);
    }
    if (o.beer) { grect(4, 23, 4, 6, C('cloth1', 2)); grect(4, 23, 4, 1, C('ui', 3)); grect(5, 25, 2, 2, C('gold', 3)); }
    if (o.phoneFace) { grect(11, 4, 9, 12, C('ink', 2)); grect(12, 5, 7, 10, C('ink', 3)); gset(13, 6, C('ui', 4)); }
    if (o.bag) { grect(21, 20, 7, 8, C('neon', 2)); grect(22, 18, 1, 2, C('neon', 1)); grect(26, 18, 1, 2, C('neon', 1)); }

    // ---- outline + shade into a colour map ----
    const out = new Int16Array(GW * GH).fill(EMPTY);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const v = get(i, j);
      if (v === EMPTY) {
        if (get(i - 1, j) !== EMPTY || get(i + 1, j) !== EMPTY || get(i, j - 1) !== EMPTY || get(i, j + 1) !== EMPTY) out[j * GW + i] = INK;
        continue;
      }
      // light from upper-left: darken cells on the right/bottom edge of a region
      const edge = get(i + 1, j) !== v && get(i + 1, j) !== EMPTY ? 0 : get(i + 1, j) === EMPTY || get(i, j + 1) === EMPTY;
      const sh = v % 6;
      out[j * GW + i] = edge && sh > 1 && sh < 5 ? v - 1 : v;
    }
    // ---- face ----
    const F = (i, j, c) => (out[j * GW + i] = c);
    const ex1 = 13, ex2 = 19, ey = 9;
    const face = o.face;
    if (!o.phoneFace) {
      if (o.shades) { for (let i = 11; i <= 21; i++) F(i, ey, INK); F(12, ey + 1, INK); F(13, ey + 1, INK); F(19, ey + 1, INK); F(20, ey + 1, INK); }
      else if (face === 'shock') { [ex1, ex2].forEach((e) => { F(e - 1, ey - 1, C('ui', 4)); F(e, ey - 1, C('ui', 4)); F(e - 1, ey, C('ui', 4)); F(e, ey, INK); }); }
      else if (face === 'happy') { [ex1, ex2].forEach((e) => { F(e - 1, ey, INK); F(e, ey - 1, INK); F(e + 1, ey, INK); }); }
      else if (face === 'smug') { [ex1, ex2].forEach((e) => { F(e - 1, ey, INK); F(e, ey, INK); F(e - 1, ey - 1, SKd); F(e, ey - 1, SKd); }); }
      else if (face === 'dumb') { F(ex1 + 1, ey, INK); F(ex2 - 1, ey, INK); F(ex1, ey - 1, INK); F(ex2, ey - 1, INK); }
      else { F(ex1, ey, INK); F(ex2, ey, INK); }
      // brows
      if (face === 'shock') { F(ex1 - 1, ey - 3, HR); F(ex1, ey - 3, HR); F(ex2 - 1, ey - 3, HR); F(ex2, ey - 3, HR); }
      if (face === 'smug') { F(ex1 - 1, ey - 2, HR); F(ex1, ey - 2, HR); F(ex2, ey - 2, HR); F(ex2 + 1, ey - 3, HR); }
      // mouth
      const my = 13;
      if (face === 'shock') { F(15, my - 1, INK); F(16, my - 1, INK); F(15, my, C('heart', 1)); F(16, my, C('heart', 1)); F(15, my + 1, INK); F(16, my + 1, INK); }
      else if (face === 'happy') { F(14, my - 1, INK); F(15, my, INK); F(16, my, INK); F(17, my, INK); F(18, my - 1, INK); }
      else if (face === 'smug') { F(15, my, INK); F(16, my, INK); F(17, my - 1, INK); }
      else if (face === 'dumb') { F(14, my, INK); F(15, my, INK); F(16, my, INK); F(17, my, INK); F(16, my + 1, C('heart', 3)); F(17, my + 1, C('heart', 3)); F(16, my + 2, C('heart', 2)); }
      else if (face === 'cry') { F(15, my, INK); F(16, my - 1, INK); F(17, my, INK); F(ex1, ey + 1, C('sweat', 3)); F(ex1, ey + 3, C('sweat', 2)); F(ex2, ey + 2, C('sweat', 3)); }
      else { F(15, my, INK); F(16, my, INK); }
      if (o.blush) { F(11, 11, C('heart', 3)); F(12, 11, C('heart', 3)); F(20, 11, C('heart', 3)); F(21, 11, C('heart', 3)); }
    }
    // ---- stamp ----
    const ox = Math.round(x - 16 * s), oy = Math.round(y - 39 * s);
    const r0 = o.rows ? o.rows[0] : 0, r1 = o.rows ? o.rows[1] : GH;
    const cl = o.clip;
    for (let j = r0; j < r1; j++) for (let i = 0; i < GW; i++) {
      const v = out[j * GW + i];
      if (v === EMPTY) continue;
      const fx = o.flip ? ox + (GW - 1 - i) * s : ox + i * s, fy = oy + j * s;
      if (cl && (fx + s <= cl[0] || fy + s <= cl[1] || fx >= cl[0] + cl[2] || fy >= cl[1] + cl[3])) continue;
      if (cl) {
        const ax = Math.max(fx, cl[0]), ay = Math.max(fy, cl[1]);
        fb.rect(ax, ay, Math.min(fx + s, cl[0] + cl[2]) - ax, Math.min(fy + s, cl[1] + cl[3]) - ay, v);
      } else fb.rect(fx, fy, s, s, v);
    }
  };

  // ============================================================
  //  COMIC HELPERS
  // ============================================================
  PD.wrap = function (str, max) {
    const words = up(str).split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
  };
  // speech bubble; (tx,ty) = tail tip
  PD.bubble = function (fb, x, y, text, tx, ty, o) {
    o = o || {};
    const lines = String(text).split('\n').map(up);
    const tw = Math.max(...lines.map((l) => PD.textWidth(l))), w = tw + 8, h = lines.length * 7 + 5;
    x = Math.round(x); y = Math.round(y);
    const fill = o.shout ? C('gold', 4) : C('ui', 4);
    // tail: filled wedge from the bubble edge to (tx,ty), 1px ink outline
    let tri = null;
    if (tx !== undefined) {
      const below = ty > y + h;
      const bx = clamp(tx + (below ? -3 : 3), x + 6, x + w - 7), by = below ? y + h - 1 : y;
      tri = (grow, c) => {
        const n = Math.max(1, Math.abs(ty - by));
        for (let k = 0; k <= n; k++) {
          const f = k / n, cx = bx + (tx - bx) * f, hw = (1 - f) * 3.2 + grow;
          const py = Math.round(by + (ty - by) * f);
          fb.rect(Math.round(cx - hw), py, Math.max(1, Math.round(hw * 2)), 1, c);
        }
        if (grow) fb.rect(Math.round(tx) - 1, Math.round(ty) + (below ? 1 : -1), 2, 1, c);
      };
      tri(1, C('ink', 0));
    }
    fb.rect(x + 1, y - 1, w - 2, h + 2, C('ink', 0));
    fb.rect(x - 1, y + 1, w + 2, h - 2, C('ink', 0));
    fb.rect(x, y, w, h, C('ink', 0));
    fb.rect(x + 1, y, w - 2, h, fill);
    fb.rect(x, y + 1, w, h - 2, fill);
    if (tri) tri(0, fill);
    lines.forEach((l, i) => PD.text(fb, l, x + 4 + (o.center ? (tw - PD.textWidth(l)) / 2 : 0), y + 3 + i * 7, o.shout ? C('cloth1', 1) : C('ink', 0)));
    return { w, h };
  };
  // yellow narration box
  function caption(fb, x, y, text, shown, done, t) {
    const str = up(text), vis = str.slice(0, shown);
    const w = PD.textWidth(str) + 10;
    fb.drect(x + 2, y + 2, w, 11, C('ink', 0), 0.7);
    fb.rect(x, y, w, 11, C('ink', 0));
    fb.rect(x + 1, y + 1, w - 2, 9, C('gold', 3));
    fb.rect(x + 1, y + 9, w - 2, 1, C('gold', 2));
    PD.text(fb, vis, x + 5, y + 3, C('ink', 0));
    if (done && Math.sin(t * 8) > 0) PD.sprite(fb, ['###', '.#.'], x + w - 5, y + 12, C('gold', 3), C('ink', 0));
    return w;
  }
  // halftone page background
  function pageBG(fb, t) {
    fb.clear(C('ink', 1));
    for (let y = 0; y < H; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 4) {
      const d = Math.hypot(x - W / 2, y - 60) / 200;
      if (d > 0.35 + Math.sin(t * 0.7) * 0.05) fb.px(x, y, C('night', 2));
    }
  }
  function panelFrame(fb, r) {
    fb.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, C('ui', 4));
    fb.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, C('ink', 0));
  }
  function radial(fb, r, cx, cy, a, b, t) {
    // comic sunburst
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const ang = Math.atan2(y - cy, x - cx) + t * 0.15;
      fb.px(x, y, Math.sin(ang * 9) > 0 ? a : b);
    }
  }
  function fxWord(fb, word, x, y, sc, ramp, t, seed) {
    const j = Math.round(Math.sin(t * 30 + seed) * 1);
    PD.textS(fb, word, x + j, y, sc, C(ramp, 3), { outline: C('ink', 0), shadow: C(ramp, 1), shadowOff: 1 });
  }

  // a big phone body; returns its screen rect
  function bigPhone(fb, x, y, w, h) {
    fb.drect(x + 3, y + 3, w, h, C('ink', 0), 0.6);
    fb.rect(x, y + 2, w, h - 4, C('ink', 0)); fb.rect(x + 2, y, w - 4, h, C('ink', 0));
    fb.rect(x + 1, y + 2, w - 2, h - 4, C('ink', 3)); fb.rect(x + 2, y + 1, w - 4, h - 2, C('ink', 3));
    fb.rect(x + 3, y + 3, w - 6, h - 6, C('ink', 0));
    fb.rect(x + (w >> 1) - 6, y + 4, 12, 2, C('ink', 2));
    return { x: x + 4, y: y + 8, w: w - 8, h: h - 14 };
  }
  // fake app header (black + yellow, mask logo)
  function appHeader(fb, s, title) {
    fb.rect(s.x, s.y, s.w, 10, C('gold', 2));
    fb.rect(s.x, s.y + 10, s.w, 1, C('gold', 1));
    PD.sprite(fb, ['#####', '#.#.#', '#####', '.###.'], s.x + 3, s.y + 3, C('ink', 0));
    PD.text(fb, title || 'GRINDR', s.x + 11, s.y + 3, C('ink', 0));
  }
  PD.appHeader = appHeader;
  PD.bigPhone = bigPhone;

  // ============================================================
  //  THE GUYS (cast used across chapter 1)
  // ============================================================
  const CAST = {
    twinkPride: { skin: 'skin0', hair: 'hair4', hairStyle: 'swoop', shirtStyle: 'pride', pants: 'cloth3', flag: true, face: 'smug' },
    twinkStraight: { skin: 'skin0', hair: 'hair4', hairStyle: 'swoop', shirt: 'cloth2', shirtStyle: 'tee', pants: 'cyan', cap: 'cloth1', beer: true, face: 'dumb', blush: true },
    masc: { skin: 'skin1', hair: 'hair0', hairStyle: 'buzz', shirt: 'cloth0', shirtStyle: 'tank', face: 'smug' },
    smooth: { skin: 'skin0', hair: 'hair2', hairStyle: 'swoop', shirtStyle: 'crop', shirt: 'heart', face: 'happy', blush: true },
    nofems: { skin: 'skin2', hair: 'hair0', hairStyle: 'short', shirtStyle: 'none', face: 'blank' },
    bear: { skin: 'skin1', hair: 'hair1', hairStyle: 'buzz', beard: true, shirt: 'cloth1', shirtStyle: 'tee', face: 'happy' },
    top: { skin: 'skin3', hair: 'hair0', hairStyle: 'short', shirt: 'cloth3', shirtStyle: 'tee', face: 'smug', shades: true },
    twink: { skin: 'skin0', hair: 'hair2', hairStyle: 'curly', shirt: 'lime', shirtStyle: 'crop', face: 'happy' },
  };
  PD.CAST = CAST;

  function tile(fb, x, y, w, h, dude, name, dist, t, i) {
    fb.rect(x, y, w, h, C('night', 2 + (i % 2)));
    fb.drect(x, y, w, h, C('night', 4), 0.25);
    PD.drawDude(fb, x + w / 2, y + h + 26, Object.assign({ s: 2, clip: [x, y, w, h] }, dude));
    fb.rect(x, y + h - 9, w, 9, C('ink', 0));
    PD.text(fb, name, x + 2, y + h - 7, C('ui', 4));
    if (dist) PD.text(fb, dist, x + w - PD.textWidth(dist) - 2, y + 2, C('gold', 3), C('ink', 0));
    if (Math.sin(t * 2 + i * 2.3) > -0.4) { fb.rect(x + 2, y + 2, 3, 3, C('ink', 0)); fb.px(x + 3, y + 3, C('lime', 3)); }
  }

  // ============================================================
  //  INTRO CUTSCENE
  // ============================================================
  const SHOTS = [
    { // 1. the town
      panels: [{ r: [8, 8, 304, 118], d(fb, t, R) {
        PD.drawSkyline(fb, 4 + t * 0.6, 0);
        // rooftop pride flag
        const fx = R.x + 220, fy = R.y + 38;
        fb.rect(fx, fy, 1, 22, C('ui', 3));
        for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) fb.px(fx + 1 + i, fy + j * 1.5 + Math.sin(t * 4 + i * 0.5) * 1.2, C('pride', j));
      } }],
      caps: ['This town has a problem.', 'Too many rainbows. Not nearly enough pussy.'],
      bubbles: [{ at: 1, x: 40, y: 50, text: 'YAAAS QUEEN', tx: 60, ty: 76 }, { at: 1, x: 150, y: 28, text: 'SLAAAY', tx: 170, ty: 52 }],
    },
    { // 2. the app
      panels: [
        { r: [8, 8, 112, 118], d(fb, t, R) {
          fb.rect(R.x, R.y, R.w, R.h, C('night', 1));
          for (let k = 0; k < 6; k++) fb.ellipse(R.x + R.w / 2, R.y + 60, 50 - k * 7, 50 - k * 7, C('gold', 1), 0.06 * k);
          PD.drawPhone(fb, R.x + 31, R.y + 14, t, Math.sin(t * 3) > 0.6, '10,000 ONLINE');
          fb.ellipse(R.x + 80, R.y + 102, 9, 14, C('skin0', 3));
          fb.ellipse(R.x + 79, R.y + 92, 5, 5, C('skin0', 4));
        } },
        { r: [126, 8, 186, 118], d(fb, t, R) {
          fb.rect(R.x, R.y, R.w, R.h, C('ink', 0));
          const names = [['MASC4MASC', '0.2MI', CAST.masc], ['SMOOTHBTM', '0.4MI', CAST.smooth], ['NO FEMS', '0.1MI', CAST.nofems],
            ['BEAR W/ CAR', '1MI', CAST.bear], ['TOP 4 TOP', '0.3MI', CAST.top], ['TWINK 21', '50FT', CAST.twink]];
          names.forEach(([n, d, dude], i) => tile(fb, R.x + 3 + (i % 3) * 61, R.y + 3 + Math.floor(i / 3) * 57, 59, 55, dude, n, d, t, i));
        } },
      ],
      caps: ['10,000 fags online. Within one mile.', "Not one of them has ever touched a tit. They brag about it."],
      bubbles: [{ at: 0, x: 158, y: 62, text: 'WOOF', tx: 152, ty: 82 }, { at: 1, x: 238, y: 66, text: 'NO FEMS NO FATS\nNO VAGINAS EW', tx: 284, ty: 46 }],
    },
    { // 3. the operator
      panels: [
        { r: [8, 8, 196, 118], d(fb, t, R) {
          const X = R.x, Y = R.y;
          fb.rect(X, Y, R.w, R.h, C('wall', 0));
          fb.drect(X, Y, R.w, R.h, C('wall', 1), 0.5);
          // corkboard + red strings
          fb.rect(X + 8, Y + 10, 58, 44, C('ink', 0)); fb.rect(X + 9, Y + 11, 56, 42, C('wood', 2));
          const pins = [[16, 16], [40, 14], [54, 26], [20, 36], [42, 40]];
          pins.forEach(([px, py], i) => { fb.rect(X + px - 4, Y + py - 3, 10, 9, C('ui', 4)); fb.rect(X + px - 3, Y + py - 2, 8, 6, C('night', 3));
            fb.line(X + px + 1, Y + py + 2, X + px + 3, Y + py, C('cloth1', 3)); fb.line(X + px + 1, Y + py, X + px + 3, Y + py + 2, C('cloth1', 3)); void i; });
          for (let i = 0; i < pins.length - 1; i++) fb.line(X + pins[i][0], Y + pins[i][1] - 3, X + pins[i + 1][0], Y + pins[i + 1][1] - 3, C('cloth1', 3));
          // monitors
          for (let m = 0; m < 3; m++) {
            const mx = X + 82 + m * 36, my = Y + 14 + (m === 1 ? -4 : 0);
            fb.rect(mx, my, 32, 24, C('ink', 0)); fb.rect(mx + 2, my + 2, 28, 20, C('night', 2));
            fb.rect(mx + 2, my + 2, 28, 3, C('gold', 2));
            for (let k = 0; k < 6; k++) fb.rect(mx + 3 + (k % 3) * 9, my + 7 + Math.floor(k / 3) * 7, 8, 6, C('night', 4 - ((k + m + Math.floor(t * 2)) % 2)));
          }
          // desk
          fb.rect(X, Y + 88, R.w, 30, C('wood', 1)); fb.rect(X, Y + 88, R.w, 2, C('wood', 3));
          // glow + operator from behind (hoodie, no face)
          fb.ellipse(X + 100, Y + 66, 46, 30, C('gold', 1), 0.18 + Math.sin(t * 3) * 0.04);
          const ox = X + 100, oy = Y + 70;
          // shoulders + back (a bust, runs off the bottom of the panel)
          fb.ellipse(ox, oy + 24, 37, 14, C('ink', 0));
          fb.rect(ox - 37, oy + 24, 74, 60, C('ink', 0));
          fb.ellipse(ox, oy + 24, 36, 13, C('ink', 2));
          fb.rect(ox - 36, oy + 24, 72, 60, C('ink', 2));
          fb.ellipse(ox - 14, oy + 22, 14, 7, C('ink', 3), 0.45);
          // hood with a soft peak + seam
          fb.ellipse(ox, oy - 1, 16, 19, C('ink', 0));
          fb.ellipse(ox, oy - 1, 15, 18, C('ink', 2));
          fb.ellipse(ox - 4, oy - 6, 8, 10, C('ink', 3), 0.5);
          fb.line(ox, oy - 18, ox, oy + 16, C('ink', 1));
          fb.rect(ox - 22, oy + 30, 1, 30, C('ink', 1)); fb.rect(ox + 22, oy + 30, 1, 30, C('ink', 1));
          // rim light from the screens
          for (let a = -2.6; a < -0.5; a += 0.03) fb.px(ox + Math.cos(a) * 16, oy - 2 + Math.sin(a) * 18, C('cyan', 2));
          // energy drink cans
          [[22, 80], [30, 82], [160, 80]].forEach(([cx, cy]) => { fb.rect(X + cx, Y + cy, 6, 9, C('ink', 0)); fb.rect(X + cx + 1, Y + cy + 1, 4, 7, C('lime', 2)); });
        } },
        { r: [210, 8, 102, 118], d(fb, t, R) {
          const X = R.x, Y = R.y;
          radial(fb, R, X + 50, Y + 60, C('neon', 1), C('neon', 5), t);
          // the toolkit
          const item = (x, y, w, h, ramp, label, lc) => { fb.rect(x - 1, y - 1, w + 2, h + 2, C('ink', 0)); fb.rect(x, y, w, h, C(ramp, 2)); fb.rect(x, y, 2, h, C(ramp, 3)); PD.text(fb, label, x + (w - PD.textWidth(label)) / 2, y + (h >> 1) - 2, lc || C('ink', 0)); };
          item(X + 10, Y + 20, 22, 44, 'cyan', 'LUBE');
          item(X + 38, Y + 30, 26, 34, 'ui', 'VODKA');
          item(X + 68, Y + 46, 26, 18, 'neon', 'XXL');
          fb.rect(X + 12, Y + 74, 78, 8, C('ink', 0)); fb.rect(X + 13, Y + 75, 76, 6, C('ink', 3));
          PD.text(fb, 'BLINDFOLD', X + 34, Y + 76, C('ui', 4));
          PD.textS(fb, 'THE KIT', X + R.w / 2, Y + 94, 2, C('gold', 3), { center: true, outline: C('ink', 0) });
          void t;
        } },
      ],
      caps: ["That's me. No face. No name.", 'Just a phone, a fake profile, a bottle of lube...', 'and a pussy that has never once lost.'],
      bubbles: [],
    },
    { // 4. before / during / after
      panels: [
        { r: [8, 8, 96, 118], d(fb, t, R) {
          radial(fb, R, R.x + 48, R.y + 50, C('heart', 3), C('heart', 2), t);
          PD.drawDude(fb, R.x + 48, R.y + 116, Object.assign({ s: 2 }, CAST.twinkPride));
          PD.textS(fb, 'BEFORE', R.x + 4, R.y + 4, 1, C('ui', 4), { outline: C('ink', 0) });
        } },
        { r: [110, 8, 100, 118], d(fb, t, R) {
          const X = R.x, Y = R.y, sh = Math.round(Math.sin(t * 40));
          fb.rect(X, Y, R.w, R.h, C('wall', 1));
          fb.rect(X + 26 + sh, Y + 18, 48, 100, C('ink', 0)); fb.rect(X + 28 + sh, Y + 20, 44, 98, C('wood', 2));
          fb.rect(X + 32 + sh, Y + 26, 36, 36, C('wood', 3)); fb.rect(X + 32 + sh, Y + 70, 36, 40, C('wood', 3));
          fb.ellipse(X + 64 + sh, Y + 70, 2.5, 2.5, C('gold', 3));
          PD.sprite(fb, PD.HEART, X + 48 + sh, Y + 10, C('heart', 2), C('ink', 0));
          fxWord(fb, 'CREAK', X + 4, Y + 30, 1, 'gold', t, 1);
          fxWord(fb, 'SLAP', X + 72, Y + 54, 1, 'neon', t, 2);
          fxWord(fb, 'PLAP', X + 4, Y + 70, 1, 'neon', t, 3);
          fxWord(fb, 'OH GOD', X + 62, Y + 84, 1, 'cyan', t, 4);
        } },
        { r: [216, 8, 96, 118], d(fb, t, R) {
          radial(fb, R, R.x + 48, R.y + 50, C('cyan', 1), C('cyan', 5), t);
          // pennant
          fb.rect(R.x + 6, R.y + 18, 1, 20, C('ui', 4));
          for (let i = 0; i < 22; i++) { const hh = Math.round(10 * (1 - i / 22)); fb.rect(R.x + 7 + i, R.y + 18 + 10 - hh, 1, hh * 2, i === 0 || hh < 1 ? C('ink', 0) : C('cloth1', 2)); }
          PD.text(fb, 'U', R.x + 10, R.y + 26, C('ui', 4));
          PD.drawDude(fb, R.x + 48, R.y + 116, Object.assign({ s: 2 }, CAST.twinkStraight));
          PD.textS(fb, 'AFTER', R.x + R.w - 24, R.y + 4, 1, C('ui', 4), { outline: C('ink', 0) });
        } },
      ],
      caps: ['One night with it and they walk out straight.', 'Limping, sometimes. But straight.'],
      bubbles: [{ at: 0, x: 12, y: 22, text: 'EW A VAGINA?\nGROSS!', tx: 40, ty: 54 }, { at: 0, x: 134, y: 104, text: "WHY IS IT\nSO WARM", tx: 150, ty: 92 }, { at: 1, x: 252, y: 22, text: 'BRO.\nTITS.', tx: 262, ty: 54, shout: true }],
    },
    { // 5. the goal
      panels: [{ r: [8, 8, 304, 118], d(fb, t, R) {
        const X = R.x, Y = R.y;
        fb.rect(X, Y, R.w, R.h, C('ink', 0));
        for (let y = Y; y < Y + R.h; y += 2) fb.rect(X, y, R.w, 1, C('ink', 1));
        // app icon in the crosshair
        const cx = X + 60, cy = Y + 58;
        fb.rect(cx - 22, cy - 22, 44, 44, C('ink', 0)); fb.rect(cx - 21, cy - 21, 42, 42, C('gold', 2)); fb.rect(cx - 21, cy - 21, 42, 3, C('gold', 3));
        const mask = ['#########', '#########', '##.###.##', '#########', '#########', '.#######.', '..#####..'];
        for (let j = 0; j < mask.length; j++) for (let i = 0; i < 9; i++) if (mask[j][i] === '#') fb.rect(cx - 13 + i * 3, cy - 12 + j * 3, 3, 3, C('ink', 0));
        const k = 30 + Math.sin(t * 2) * 3;
        for (let a = 0; a < Math.PI * 2; a += 0.02) fb.px(cx + Math.cos(a) * k, cy + Math.sin(a) * k, C('cloth1', 3));
        fb.rect(cx - k - 6, cy, k * 2 + 12, 1, C('cloth1', 3)); fb.rect(cx, cy - k - 6, 1, k * 2 + 12, C('cloth1', 3));
        // the number
        PD.textS(fb, 'GUYS ONLINE', X + 200, Y + 26, 1, C('cyan', 3), { center: true });
        PD.textS(fb, '10,000', X + 200, Y + 40, 6, C('neon', 2), { center: true, outline: C('ink', 0), shadow: C('neon', 5), shadowOff: 3, shine: C('neon', 4) });
        PD.textS(fb, 'TARGET: 0', X + 200, Y + 84, 2, C('gold', 3), { center: true, outline: C('ink', 0) });
      } }],
      caps: ['The goal: get that number to zero.', 'Make Grindr go extinct. One twink at a time.'],
      bubbles: [],
    },
    { // 6. create profile
      panels: [{ r: [70, 8, 180, 118], d(fb, t, R, sh) {
        const X = R.x, Y = R.y;
        radial(fb, R, X + 90, Y + 60, C('night', 2), C('night', 1), t);
        const s = bigPhone(fb, X + 50, Y + 6, 80, 128);
        fb.rect(s.x, s.y, s.w, s.h, C('ink', 1));
        appHeader(fb, s);
        PD.drawDude(fb, s.x + s.w / 2, s.y + 60, { s: 1, face: 'blank', skin: 'ink', hair: 'ink', shirt: 'ink', pants: 'ink', hairStyle: 'none', rows: [0, 30] });
        PD.textS(fb, 'NO PROFILE', s.x + s.w / 2, s.y + 64, 1, C('ink', 4), { center: true });
        const press = sh.cap >= 1 && sh.done;
        const bp = press && Math.sin(t * 10) > 0;
        fb.rect(s.x + 5, s.y + 78, s.w - 10, 14, C('ink', 0));
        fb.rect(s.x + 6, s.y + 79 + (bp ? 1 : 0), s.w - 12, 12, C('gold', bp ? 3 : 2));
        PD.text(fb, 'CREATE PROFILE', s.x + s.w / 2 - 27, s.y + 83 + (bp ? 1 : 0), C('ink', 0));
        // thumb sliding in
        const k = easeOut(sh.tc * 0.8);
        const thx = X + 172 - k * 50, thy = Y + 140 - k * 30;
        fb.ellipse(thx, thy, 12, 22, C('ink', 0)); fb.ellipse(thx, thy, 11, 21, C('skin0', 3));
        fb.ellipse(thx - 3, thy - 12, 6, 7, C('skin0', 4)); fb.ellipse(thx - 3, thy - 13, 4, 4.5, C('heart', 4));
      } }],
      caps: ['Step one: become the gayest man on the app.', 'On paper. No homo.'],
      bubbles: [],
    },
  ];

  const CPS = [24, 48, 110];
  SM.scenes.intro = {
    enter() { this.shot = 0; this.cap = 0; this.shown = 0; this.t = 0; this.tc = 0; this.tick = 0; this.art = this.art || new PD.FB(); },
    idle(dt) { this.t += dt; },
    update(dt) {
      this.t += dt; this.tc += dt;
      const S = SHOTS[this.shot], cap = up(S.caps[this.cap]);
      const delay = 0.35 + S.panels.length * 0.2;
      if (this.t > delay && this.shown < cap.length) {
        const before = Math.floor(this.shown);
        this.shown = Math.min(cap.length, this.shown + dt * CPS[PD.Settings.textSpeed | 0]);
        if (Math.floor(this.shown) !== before && (before % 2 === 0) && cap[before] !== ' ') PD.Audio.ui('type');
      }
      if (this.skip) { this.skip = false; return this.finish(); }
      const go = UI.activate || (PD.INPUT.released && !UI.over(W - 52, 160, 48, 14));
      if (!go) return;
      if (this.shown < cap.length) { this.shown = cap.length; return; }
      if (this.cap + 1 < S.caps.length) { this.cap++; this.shown = 0; this.tc = 0; PD.Audio.ui('nav'); return; }
      if (this.shot + 1 < SHOTS.length) { this.shot++; this.cap = 0; this.shown = 0; this.t = 0; this.tc = 0; PD.Audio.ui('click'); return; }
      this.finish();
    },
    finish() {
      const sv = PD.Save.load() || {};
      sv.chapter = 'profile';
      PD.Save.write(sv);
      PD.Audio.ui('start');
      SM.go('profile');
    },
    draw(fb) {
      const S = SHOTS[this.shot], t = this.t || 0;
      pageBG(fb, SM.t);
      const sh = { cap: this.cap, done: this.shown >= up(S.caps[this.cap]).length, tc: this.tc };
      S.panels.forEach((p, i) => {
        const k = easeOut((t - i * 0.2) / 0.35);
        if (k <= 0) return;
        const off = Math.round((1 - k) * 24) * (i % 2 ? -1 : 1);
        const R = { x: p.r[0], y: p.r[1] + off, w: p.r[2], h: p.r[3] };
        panelFrame(fb, R);
        this.art.clear(C('ink', 0));
        p.d(this.art, SM.t, R, sh);
        fb.blit(this.art, R.x, R.y, R.w, R.h);
      });
      if (t > 0.3) for (const b of S.bubbles) if (this.cap > b.at || (this.cap === b.at && this.shown > 2)) PD.bubble(fb, b.x, b.y, b.text, b.tx, b.ty, b);
      // captions stack below the panels
      for (let i = 0; i <= this.cap; i++) {
        const str = up(S.caps[i]);
        const shown = i < this.cap ? str.length : Math.floor(this.shown);
        if (i === this.cap && shown === 0 && t < 0.35 + S.panels.length * 0.2) continue;
        const w = PD.textWidth(str) + 10;
        const x = i % 2 ? W - 8 - w : 8;
        caption(fb, x, 132 + i * 13, str, shown, i === this.cap && shown >= str.length, SM.t);
      }
      // progress dots + skip
      for (let i = 0; i < SHOTS.length; i++) fb.rect(8 + i * 6, 172, 4, 3, i <= this.shot ? C('neon', 2) : C('ink', 3));
      // skip: mouse or Esc only, so Enter never skips by accident
      const hov = UI.over(W - 52, 164, 46, 12);
      if (hov) UI.cursor = 'hand';
      fb.rect(W - 52, 164, 46, 12, C('ink', 0)); fb.rect(W - 51, 165, 44, 10, C('ink', hov ? 3 : 2));
      PD.text(fb, 'SKIP >>', W - 43, 168, hov ? C('ui', 4) : C('ink', 4));
      if ((hov && PD.INPUT.released) || UI.back) this.skip = true;
    },
  };

  // ============================================================
  //  PROFILE CREATOR
  // ============================================================
  // Each option nudges who bites: [twink, closet, gym, bear]
  const TYPES = [['TWINKS', 'neon'], ['CLOSET CASES', 'cyan'], ['GYM BROS', 'gold'], ['BEARS', 'lime']];
  const OPTS = {
    pic: [
      ['GYM TORSO', [1, 0, 3, 1], 'Stolen off a fitness influencer. He has 2M followers. He will never know.'],
      ['MIRROR SELFIE', [0, 3, 1, 0], 'Phone over the face. Closet cases love a man with no face. Like them.'],
      ['BULGE PIC', [3, 0, 0, 1], "It's a rolled up sock. Twinks can't tell. They've never seen a real one up close."],
      ['A SUNSET', [0, 1, 0, 2], 'A sunset. Bold. Only bears and serial killers trust a sunset.'],
    ],
    name: [
      ['JAKE', [1, 1, 1, 1], 'Jake. Every gay on earth has sucked at least one Jake.'],
      ['CHAD', [0, 0, 2, 0], "Chad. Gym bros can't resist a Chad. Neither can their protein shakes."],
      ['DADDYMIKE', [3, 0, 0, 0], 'Daddy Mike. Twinks are already typing. Disgusting. Perfect.'],
      ['TOP4NOW', [1, 1, 0, 2], "Top4Now. 'Now' is doing a lot of work there."],
      ['DISCREETGUY', [0, 3, 0, 0], 'DiscreetGuy. Every closet case reads that as a love letter.'],
    ],
    age: [
      ['19', [0, 0, 1, 3], 'Nineteen. The bears are drooling. Somebody hose them down.'],
      ['24', [1, 1, 1, 1], 'Twenty-four. Fresh but legal. The safe pick.'],
      ['31', [1, 1, 2, 0], 'Thirty-one. Old enough to have a car. Fags love a car.'],
      ['44', [3, 1, 0, 0], 'Forty-four. Daddy energy. The twinks just felt a disturbance.'],
    ],
    pos: [
      ['TOP', [3, 1, 0, 1], 'Top. Half this app is bottoms. They will fight to the death for it.'],
      ['VERS', [1, 1, 1, 1], "Vers. The gay word for 'whatever, just come over.'"],
      ['BOTTOM', [0, 0, 3, 1], "Bottom. Gym bros are all 'tops'. Sure they are, buddy."],
    ],
    bio1: [
      ['MASC', [0, 1, 2, 0], "Masc only. They'll fake a deep voice for you. Adorable."],
      ['ANON', [0, 3, 0, 1], 'Anon only. Lights off, no names. Closet cases love it. So do we.'],
      ['BLINDFOLDED', [3, 1, 0, 0], "Blindfolded only. Twinks think it's kinky. It's a trap."],
      ['HOSTING', [0, 0, 1, 2], 'Hosting. Bears will drive across state lines for a free couch.'],
    ],
    bio2: [
      ['GYM BROS', [0, 0, 3, 0], 'Into gym bros. Leg day is the only day these guys skip pussy. Every day.'],
      ['SHY GUYS', [2, 2, 0, 0], 'Into shy guys. Easy marks. They apologise while they cum.'],
      ['BETS + DARES', [0, 1, 2, 0], "Into dares. Bet a gym bro he can't handle it. He'll handle it."],
      ['BEER', [0, 0, 1, 3], 'Into beer. Three drinks in, a bear will fuck a mailbox.'],
    ],
  };
  const ROWS = [['pic', 'PIC'], ['name', 'NAME'], ['age', 'AGE'], ['pos', 'POSITION'], ['bio1', 'DISCREET.'], ['bio2', 'INTO:']];
  PD.PROFILE_OPTS = OPTS;
  PD.profileBites = function (p) {
    const b = [1, 1, 1, 1];
    for (const [k] of ROWS) OPTS[k][p[k] | 0][1].forEach((v, i) => (b[i] += v));
    return b.map((v) => Math.min(1, v / 12));
  };

  const picFB = new PD.FB();
  function drawPic(dst, x, y, w, h, kind, t) {
    const fb = picFB;
    fb.clear(C('ink', 0));
    drawPicRaw(fb, x, y, w, h, kind, t);
    dst.blit(fb, x, y, w, h);
  }
  function drawPicRaw(fb, x, y, w, h, kind, t) {
    if (kind === 0) { // gym torso, no head: V-taper, pecs, six pack
      fb.rect(x, y, w, h, C('cyan', 1));
      for (let i = 0; i < 4; i++) fb.rect(x + 4 + i * 6, y + 6, 2, h - 12, C('ink', 2));
      fb.rect(x + w - 16, y + 10, 12, 3, C('ink', 2)); fb.rect(x + w - 18, y + 8, 3, 7, C('ink', 3)); fb.rect(x + w - 5, y + 8, 3, 7, C('ink', 3));
      const cx = x + w / 2, top = y + 6;
      const SK = (k) => C('skin1', k);
      // neck + traps
      fb.rect(cx - 6, y - 1, 12, 9, C('ink', 0)); fb.rect(cx - 5, y - 1, 10, 9, SK(2));
      for (let j = 0; j < h - 6; j++) {
        const f = j / (h - 6);
        const sh = f < 0.12 ? 18 + f / 0.12 * 12 : 30 - (f - 0.12) * 16; // half-width: traps -> shoulders -> waist
        const xl = Math.round(cx - sh), xr = Math.round(cx + sh);
        fb.rect(xl - 1, top + j, xr - xl + 2, 1, C('ink', 0));
        fb.rect(xl, top + j, xr - xl, 1, SK(3));
        fb.rect(xr - 4, top + j, 4, 1, SK(2));   // shadow side
        fb.rect(xl, top + j, 2, 1, SK(4));       // rim light
      }
      // pecs
      [-1, 1].forEach((d) => {
        fb.ellipse(cx + d * 9, top + 14, 10, 6, SK(3));
        fb.ellipse(cx + d * 9 - 2, top + 12, 6, 3, SK(4));
        for (let i = -9; i <= 9; i++) fb.px(cx + d * 9 + i, top + 19 + Math.round(Math.abs(i) * -0.25), SK(1));
        fb.px(cx + d * 10, top + 15, C('skin1', 5));
      });
      fb.rect(cx, top + 8, 1, h - 10, SK(1));
      // six pack
      for (let j = 0; j < 3; j++) [-1, 1].forEach((d) => {
        const ax = d < 0 ? cx - 7 : cx + 2, ay = top + 23 + j * 7;
        fb.rect(ax, ay, 5, 5, SK(3)); fb.rect(ax, ay, 5, 1, SK(4)); fb.rect(ax, ay + 5, 5, 1, SK(1));
      });
      // obliques + happy trail
      fb.line(cx - 15, top + 24, cx - 10, top + 46, SK(1)); fb.line(cx + 15, top + 24, cx + 10, top + 46, SK(1));
      fb.rect(cx, top + 44, 1, 6, C('hair1', 2));
      fb.rect(x, y + h - 4, w, 4, C('cloth0', 2)); fb.rect(x, y + h - 4, w, 1, C('cloth0', 4));
    } else if (kind === 1) { // mirror selfie
      fb.rect(x, y, w, h, C('wall', 3));
      fb.rect(x + 4, y + 3, w - 8, h - 3, C('ui', 3)); fb.rect(x + 5, y + 4, w - 10, h - 4, C('sky', 3));
      PD.drawDude(fb, x + w / 2, y + h + 30, { s: 2, skin: 'skin1', hair: 'hair0', shirtStyle: 'tank', shirt: 'cloth0', phoneFace: true, clip: [x + 5, y + 4, w - 10, h - 4] });
      if (Math.sin(t * 6) > 0.6) fb.rect(x + w / 2 - 6, y + 12, 3, 3, C('ui', 4));
    } else if (kind === 2) { // bulge
      fb.rect(x, y, w, h, C('wall', 2));
      fb.rect(x + 6, y, w - 12, h, C('ink', 0)); fb.rect(x + 7, y, w - 14, h, C('cloth2', 1));
      fb.rect(x + 7, y, w - 14, 6, C('cloth0', 2)); PD.text(fb, 'CK', x + w / 2 - 3, y + 1, C('ui', 4));
      fb.ellipse(x + w / 2 + 3, y + h * 0.55, 8, 13, C('cloth2', 2)); fb.ellipse(x + w / 2 + 1, y + h * 0.5, 4, 8, C('cloth2', 3));
      fb.line(x + w / 2 - 8, y + 10, x + w / 2 - 4, y + h - 2, C('cloth2', 0));
      PD.text(fb, '(SOCK)', x + 2, y + h - 7, C('ink', 3));
    } else { // sunset
      for (let j = 0; j < h; j++) fb.rect(x, y + j, w, 1, j < h * 0.25 ? C('neon', 1) : j < h * 0.45 ? C('neon', 2) : j < h * 0.6 ? C('gold', 2) : C('cyan', 1 + (j % 3 === 0 ? 1 : 0)));
      fb.ellipse(x + w / 2, y + h * 0.6, 12, 12, C('gold', 4));
      fb.rect(x, y + h * 0.6, w, h * 0.4, C('cyan', 1));
      for (let j = 0; j < 5; j++) fb.rect(x + w / 2 - 10 + j * 2, y + h * 0.64 + j * 3, 20 - j * 4, 1, C('gold', 3));
    }
  }
  PD.drawProfilePic = drawPic;

  SM.scenes.profile = {
    enter() {
      const sv = PD.Save.load() || {};
      this.p = Object.assign({ pic: 0, name: 0, age: 1, pos: 0, bio1: 2, bio2: 1 }, sv.profile || {});
      this.quip = 'Make him irresistible. To men. Gross, I know.';
      this.qshown = 0; this.t = 0; UI.focus = 0; this.posting = 0;
    },
    update(dt) {
      this.t += dt;
      const q = up(this.quip);
      if (this.qshown < q.length) {
        const b = Math.floor(this.qshown);
        this.qshown = Math.min(q.length, this.qshown + dt * CPS[PD.Settings.textSpeed | 0] * 1.4);
        if (Math.floor(this.qshown) !== b && b % 3 === 0) PD.Audio.ui('type');
      }
      if (this.posting) {
        this.posting += dt;
        if (this.posting > 0.9) { this.posting = 0; SM.go('posted'); }
      }
      if (UI.back && !this.posting) SM.go('menu');
    },
    draw(fb) {
      const p = this.p, t = this.t;
      PD.drawSkyline(fb, SM.t, 0.6);
      // ---- header ----
      PD.textS(fb, 'CREATE YOUR FAKE PROFILE', 120, 6, 1, C('gold', 3), { outline: C('ink', 0) });
      // ---- phone preview (left) ----
      const s = bigPhone(fb, 6, 4, 104, 172);
      fb.rect(s.x, s.y, s.w, s.h, C('ink', 1));
      appHeader(fb, s);
      const px = s.x + 4, py = s.y + 14, pw = s.w - 8, ph = 58;
      drawPic(fb, px, py, pw, ph, p.pic, SM.t);
      fb.rect(px - 1, py - 1, pw + 2, 1, C('ink', 0));
      const name = OPTS.name[p.name][0], age = OPTS.age[p.age][0];
      PD.text(fb, name, px, py + ph + 4, C('ui', 4));
      PD.text(fb, age, px + pw - PD.textWidth(age), py + ph + 4, C('ink', 4));
      fb.rect(px, py + ph + 12, 4, 4, C('ink', 0)); fb.px(px + 1, py + ph + 13, C('lime', 3)); fb.px(px + 2, py + ph + 13, C('lime', 3));
      PD.text(fb, 'ONLINE  50FT', px + 6, py + ph + 12, C('lime', 3));
      fb.rect(px, py + ph + 20, pw, 1, C('ink', 3));
      const tag = (x, y, str, ramp) => { const tw = PD.textWidth(str); fb.rect(x, y, tw + 4, 8, C(ramp, 1)); PD.text(fb, str, x + 2, y + 2, C(ramp, 4)); return tw + 6; };
      let tx = px;
      tx += tag(tx, py + ph + 24, OPTS.pos[p.pos][0], 'neon');
      tag(tx, py + ph + 24, 'NO FEMS', 'ink');
      PD.text(fb, 'DISCREET.', px, py + ph + 36, C('cyan', 3));
      PD.text(fb, OPTS.bio1[p.bio1][0] + ' ONLY.', px, py + ph + 43, C('cyan', 3));
      PD.text(fb, 'INTO: ' + OPTS.bio2[p.bio2][0], px, py + ph + 52, C('cyan', 3));
      PD.text(fb, 'NO DRAMA :)', px, py + ph + 61, C('ink', 4));
      // little hearts when posting
      if (this.posting) for (let i = 0; i < 6; i++) PD.sprite(fb, PD.HEART, px + (i * 17) % pw, py + 50 - this.posting * 80 + i * 9, C('heart', 3), C('ink', 0));

      // ---- form (right) ----
      PD.panel(fb, 116, 15, 200, 89, 'night', { fill: 1 });
      let y = 21;
      const lx = 121, cx = 196, cw = 114;
      for (const [k, label] of ROWS) {
        PD.text(fb, label, lx, y, UI.focus === ROWS.findIndex((r) => r[0] === k) ? C('gold', 3) : C('cyan', 2));
        const opts = OPTS[k].map((o) => o[0]);
        const nv = UI.select(fb, 'p_' + k, cx, y, cw, opts, p[k]);
        if (nv !== p[k]) { p[k] = nv; this.quip = OPTS[k][nv][2]; this.qshown = 0; }
        y += 14;
      }
      // ---- who bites ----
      PD.panel(fb, 116, 107, 200, 34, 'ink', { fill: 1 });
      PD.text(fb, 'WHO BITES', 121, 110, C('gold', 3));
      const bites = PD.profileBites(p);
      TYPES.forEach(([nm, ramp], i) => {
        const bx = 121 + (i % 2) * 97, by = 119 + Math.floor(i / 2) * 10;
        PD.text(fb, nm, bx, by, C(ramp, 3));
        const bw = 36, bx2 = bx + 52;
        fb.rect(bx2 - 1, by - 1, bw + 2, 7, C('ink', 0)); fb.rect(bx2, by, bw, 5, C('ink', 2));
        const fw = Math.round(bw * bites[i]);
        fb.rect(bx2, by, fw, 5, C(ramp, 2)); fb.rect(bx2, by, fw, 1, C(ramp, 4));
      });
      // ---- operator quip ----
      PD.panel(fb, 116, 144, 200, 18, 'gold', { fill: 3 });
      const ql = PD.wrap(this.quip, 47);
      let left = Math.floor(this.qshown);
      ql.slice(0, 2).forEach((l, i) => { PD.text(fb, l.slice(0, Math.max(0, left)), 120, 147 + i * 7, C('ink', 0)); left -= l.length + 1; });
      // ---- buttons ----
      if (UI.button(fb, 'rand', 116, 165, 60, 12, 'RANDOM', { ramp: 'cyan' })) {
        for (const [k] of ROWS) p[k] = Math.floor(Math.random() * OPTS[k].length);
        this.quip = 'Chaos profile. Somehow still hotter than every twink on here.'; this.qshown = 0;
      }
      if (UI.button(fb, 'post', 182, 165, 134, 12, 'POST PROFILE  >>', { ramp: 'neon' }) && !this.posting) {
        const sv = PD.Save.load() || { v: 1, converted: 0, cash: 0 };
        sv.profile = Object.assign({}, p);
        sv.chapter = 'posted';
        PD.Save.write(sv);
        this.posting = 0.001; this.quip = 'Posted. Now we wait. Not for long.'; this.qshown = 0;
        PD.Audio.ui('start');
      }
      void t;
    },
  };

  // ============================================================
  //  POSTED: the notification flood
  // ============================================================
  const PINGS = [
    ['BEARDADDY69', 'WOOF', CAST.bear],
    ['MASC4MASC', 'SUP. PICS?', CAST.masc],
    ['NO FEMS', 'U HOSTING?', CAST.nofems],
    ['TOP 4 TOP', 'STATS?', CAST.top],
    ['SMOOTHBTM', 'HEYYY ;)', CAST.smooth],
    ['TYLER, 21', 'HIIII U UP?? :3', CAST.twink],
  ];
  SM.scenes.posted = {
    enter() { this.t = 0; this.cap = 0; this.shown = 0; UI.focus = 0; this.n = 0; },
    idle(dt) { this.t += dt; },
    update(dt) {
      this.t += dt;
      const n = Math.min(PINGS.length, Math.floor((this.t - 0.4) / 0.45) + 1);
      if (n > this.n && this.t > 0.4) { this.n = n; PD.Audio.ui(n === PINGS.length ? 'zap' : 'hover'); if (n === PINGS.length) SM.shake = 0.15 * PD.Settings.shake; }
      if (this.n < PINGS.length) return;
      const caps = this.caps();
      const c = up(caps[this.cap]);
      if (this.shown < c.length) this.shown = Math.min(c.length, this.shown + dt * CPS[PD.Settings.textSpeed | 0]);
      else if (this.cap + 1 < caps.length && (UI.activate || PD.INPUT.released)) { this.cap++; this.shown = 0; PD.Audio.ui('nav'); }
      if (this.shown < c.length && (UI.activate || PD.INPUT.released)) this.shown = c.length;
    },
    caps() {
      const sv = PD.Save.load() || {};
      const nm = sv.profile ? OPTS.name[sv.profile.name][0] : 'JAKE';
      return ['Ten minutes. 47 taps. 12 dick pics.', 'These fags are STARVING for ' + nm + '.', 'And one little twink is already typing...'];
    },
    draw(fb) {
      PD.drawSkyline(fb, SM.t, 0.6);
      const s = bigPhone(fb, 20, 4, 120, 172);
      fb.rect(s.x, s.y, s.w, s.h, C('ink', 1));
      appHeader(fb, s, 'INBOX');
      PD.text(fb, '47 TAPS', s.x + s.w - 30, s.y + 3, C('ink', 0));
      for (let i = 0; i < this.n; i++) {
        const [who, msg, dude] = PINGS[i];
        const k = easeOut((this.t - 0.4 - i * 0.45) / 0.25);
        const ry = s.y + 14 + i * 24, rx = s.x + 2 + Math.round((1 - k) * 60);
        const last = i === PINGS.length - 1;
        fb.rect(rx, ry, s.w - 4, 22, last ? C('neon', 1) : C('ink', 2));
        if (last && Math.sin(this.t * 6) > 0) fb.rect(rx, ry, s.w - 4, 1, C('neon', 4));
        fb.rect(rx + 2, ry + 2, 18, 18, C('night', 3));
        PD.drawDude(fb, rx + 11, ry + 40, Object.assign({ s: 1, rows: [0, 22], clip: [rx + 2, ry + 2, 18, 18] }, dude));
        PD.text(fb, who, rx + 23, ry + 4, last ? C('ui', 4) : C('gold', 3));
        PD.text(fb, msg, rx + 23, ry + 12, C('ui', 4));
        if (last) { const dots = '.'.repeat(1 + (Math.floor(this.t * 3) % 3)); PD.text(fb, dots, rx + s.w - 16, ry + 12, C('ui', 4)); }
      }
      if (this.n >= PINGS.length) {
        const caps = this.caps();
        for (let i = 0; i <= this.cap; i++) {
          const lines = PD.wrap(caps[i], 40);
          const shownN = i < this.cap ? 999 : Math.floor(this.shown);
          let left = shownN;
          const y0 = 18 + i * 30;
          PD.panel(fb, 150, y0, 164, lines.length * 7 + 8, 'gold', { fill: 3 });
          lines.forEach((l, j) => { PD.text(fb, l.slice(0, Math.max(0, left)), 155, y0 + 5 + j * 7, C('ink', 0)); left -= l.length + 1; });
        }
        const done = this.cap === caps.length - 1 && this.shown >= up(caps[this.cap]).length;
        if (done) {
          PD.drawDude(fb, 288, 184, Object.assign({ s: 2 }, CAST.twink, { face: 'happy', blush: true }));
          PD.bubble(fb, 226, 112, 'U UP?? :3', 264, 128);
          if (UI.button(fb, 'open', 150, 148, 72, 14, 'OPEN CHAT', { ramp: 'neon' })) SM.go('chapter');
        } else if (Math.sin(SM.t * 6) > 0) PD.text(fb, 'CLICK', 290, 172, C('ink', 4));
      }
      if (UI.back) SM.go('menu');
    },
  };

  PD.chapterScene = (sv) => (!sv ? 'menu' : sv.chapter === 'intro' ? 'intro' : sv.chapter === 'profile' ? 'profile' : sv.chapter === 'posted' ? 'posted' : 'chapter');
})(window.PD);

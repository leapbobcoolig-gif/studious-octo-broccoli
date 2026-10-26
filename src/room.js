// The dollhouse bedroom: night windows, lamp glow, oval mirror, side-on bed.
(function (PD) {
  'use strict';
  const C = PD.C;
  const W = PD.W;

  // Deterministic star field per window.
  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function makeStars(n, w, h, seed) {
    const r = seeded(seed);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: (r() * w) | 0, y: (r() * h * 0.7) | 0, ph: r() * 6.28, sp: 0.6 + r() * 2.2, big: r() < 0.18 });
    return out;
  }
  const WINS = [
    { x: 96, y: 16, w: 54, h: 66, stars: makeStars(16, 54, 66, 7), moon: false },
    { x: 192, y: 16, w: 54, h: 66, stars: makeStars(16, 54, 66, 99), moon: true },
  ];

  function windowPane(fb, win, t) {
    const { x, y, w, h } = win;
    // frame
    fb.rect(x - 4, y - 4, w + 8, h + 8, C('frame', 0));
    fb.rect(x - 3, y - 3, w + 6, h + 6, C('frame', 2));
    fb.rect(x - 3, y - 3, w + 6, 1, C('frame', 3));
    fb.rect(x - 1, y - 1, w + 2, h + 2, C('frame', 1));
    // sky gradient
    for (let j = 0; j < h; j++) {
      const f = j / h;
      fb.rect(x, y + j, w, 1, C('sky', 1));
      fb.drect(x, y + j, w, 1, C('sky', 2), f * 1.4);
      fb.drect(x, y + j, w, 1, C('sky', 3), Math.max(0, f - 0.55) * 1.6);
    }
    // stars
    for (const s of win.stars) {
      const tw = Math.sin(t * s.sp + s.ph);
      const sx = x + s.x, sy = y + s.y;
      if (s.big) {
        fb.px(sx, sy, C('sky', 5));
        if (tw > 0.2) { fb.px(sx - 1, sy, C('sky', 4)); fb.px(sx + 1, sy, C('sky', 4)); fb.px(sx, sy - 1, C('sky', 4)); fb.px(sx, sy + 1, C('sky', 4)); }
      } else if (tw > -0.4) fb.px(sx, sy, tw > 0.5 ? C('sky', 5) : C('sky', 4));
    }
    if (win.moon) {
      const mx = x + 38, my = y + 15;
      fb.ellipse(mx, my, 7, 7, C('sky', 4));
      fb.ellipse(mx, my, 6, 6, C('sky', 5));
      fb.ellipse(mx - 3, my - 2, 5.5, 5.5, C('sky', 1));
      fb.ellipse(mx, my, 10, 10, C('sky', 3), 0.12);
    }
    // drifting clouds along the bottom
    const off = t * 1.5;
    for (let i = 0; i < w; i++) {
      const X = x + i;
      const ch = 9 + 4 * Math.sin((i + off + win.x) * 0.13) + 3 * Math.sin((i + off * 0.6 + win.x) * 0.31);
      const top = Math.round(y + h - ch);
      fb.rect(X, top, 1, y + h - top, C('cloud', 2));
      fb.px(X, top, C('cloud', 4));
      fb.px(X, top + 1, C('cloud', 3));
      fb.drect(X, top + 4, 1, y + h - top - 4, C('cloud', 1), 0.5);
    }
    // mullions
    fb.rect(x + (w >> 1) - 1, y, 2, h, C('frame', 2));
    fb.rect(x + (w >> 1) - 1, y, 1, h, C('frame', 3));
    fb.rect(x, y + (h >> 1) - 1, w, 2, C('frame', 2));
    fb.rect(x, y + (h >> 1) - 1, w, 1, C('frame', 3));
    // glass glint
    fb.line(x + 3, y + 10, x + 10, y + 3, C('sky', 3));
    // sill
    fb.rect(x - 7, y + h + 3, w + 14, 4, C('frame', 2));
    fb.rect(x - 7, y + h + 3, w + 14, 1, C('frame', 4));
    fb.rect(x - 7, y + h + 7, w + 14, 1, C('frame', 0));
    fb.drect(x - 5, y + h + 8, w + 10, 3, C('wall', 1), 0.5);
  }

  function nightstand(fb, t, lampOn) {
    // lamp glow on wall
    if (lampOn) {
      const flick = 0.03 * Math.sin(t * 11) + 0.02 * Math.sin(t * 23.7);
      for (let r = 46; r > 6; r -= 6) fb.ellipse(34, 92, r, r * 0.9, C('wall', 3), 0.18 + flick + (46 - r) / 140);
      fb.ellipse(34, 92, 18, 16, C('wall', 4), 0.35 + flick);
    }
    // table
    fb.rect(14, 110, 40, 38, C('wood', 0));
    fb.rect(15, 111, 38, 36, C('wood', 2));
    fb.rect(13, 109, 42, 4, C('wood', 0));
    fb.rect(14, 110, 40, 2, C('wood', 3));
    for (let d = 0; d < 2; d++) {
      const dy = 116 + d * 15;
      fb.rect(17, dy, 34, 12, C('wood', 1));
      fb.rect(18, dy + 1, 32, 10, C('wood', 2));
      fb.rect(18, dy + 1, 32, 1, C('wood', 3));
      fb.rect(32, dy + 5, 4, 2, C('frame', 3));
    }
    // lamp
    fb.rect(29, 104, 10, 5, C('wood', 0));
    fb.rect(30, 105, 8, 3, C('frame', 2));
    fb.rect(33, 96, 2, 9, C('frame', 1));
    // shade (trapezoid)
    for (let j = 0; j < 12; j++) {
      const hw = 6 + j * 0.5;
      fb.rect(34 - hw - 1, 85 + j, hw * 2 + 2, 1, C('lamp', 0));
      fb.rect(34 - hw, 85 + j, hw * 2, 1, lampOn ? C('lamp', j < 3 ? 4 : 3) : C('frame', 1));
      if (lampOn) fb.drect(34 - hw, 85 + j, hw * 0.7, 1, C('lamp', 2), 0.6);
    }
    if (lampOn) fb.rect(30, 97, 8, 1, C('lamp', 4));
  }

  function dresser(fb) {
    // mirror
    fb.ellipse(294, 70, 17, 24, C('wood', 0));
    fb.ellipse(294, 70, 16, 23, C('frame', 2));
    fb.ellipse(294, 70, 13, 20, C('frame', 0));
    fb.ellipse(294, 70, 12, 19, C('sky', 2));
    fb.ellipse(294, 74, 12, 15, C('sky', 3), 0.3);
    fb.line(287, 60, 293, 54, C('sky', 4));
    fb.line(288, 64, 297, 55, C('sky', 3));
    // body
    fb.rect(270, 98, 48, 50, C('wood', 0));
    fb.rect(271, 99, 46, 48, C('wood', 2));
    fb.rect(268, 96, 52, 4, C('wood', 0));
    fb.rect(269, 97, 50, 2, C('wood', 3));
    for (let d = 0; d < 3; d++) {
      const dy = 103 + d * 14;
      fb.rect(273, dy, 42, 12, C('wood', 1));
      fb.rect(274, dy + 1, 40, 10, C('wood', 2));
      fb.rect(274, dy + 1, 40, 1, C('wood', 3));
      fb.rect(292, dy + 5, 4, 2, C('frame', 3));
    }
    // perfume + candle
    fb.rect(276, 90, 4, 6, C('frame', 3));
    fb.rect(277, 88, 2, 2, C('frame', 1));
    fb.rect(306, 89, 5, 7, C('fluid', 2));
    fb.px(308, 87, C('lamp', 4));
    fb.px(308, 88, C('lamp', 3));
  }

  // Static-ish back layer (wall, floor, windows, furniture behind the bed).
  PD.drawRoom = function (fb, t, st) {
    const lampOn = st.lampOn !== false;
    // wall
    fb.rect(0, 0, W, 148, C('wall', 2));
    for (let x = 6; x < W; x += 20) {
      fb.drect(x, 6, 1, 134, C('wall', 3), 0.5);
      fb.drect(x + 10, 6, 1, 134, C('wall', 1), 0.35);
    }
    for (let j = 0; j < 28; j++) fb.drect(0, 4 + j, W, 1, C('wall', 1), 0.6 - j / 46);
    fb.rect(0, 0, W, 5, C('wood', 1));
    fb.rect(0, 4, W, 1, C('wood', 0));
    fb.rect(0, 2, W, 1, C('wood', 2));
    // floor
    fb.rect(0, 148, W, 32, C('floor', 2));
    for (let row = 0; row < 6; row++) {
      const y = 148 + row * 6;
      fb.rect(0, y, W, 1, C('floor', 1));
      fb.rect(0, y + 1, W, 1, C('floor', 3));
      for (let x = (row * 37) % 64; x < W; x += 64) fb.rect(x, y + 1, 1, 5, C('floor', 1));
    }
    for (let j = 0; j < 32; j++) fb.drect(0, 148 + j, W, 1, C('floor', 0), j / 50);
    // baseboard
    fb.rect(0, 140, W, 8, C('wood', 2));
    fb.rect(0, 140, W, 1, C('wood', 4));
    fb.rect(0, 141, W, 1, C('wood', 3));
    fb.rect(0, 147, W, 1, C('wood', 0));

    for (const win of WINS) windowPane(fb, win, t);
    nightstand(fb, t, lampOn);
    dresser(fb);
    // rug
    fb.ellipse(160, 166, 120, 11, C('cloth3', 1));
    fb.ellipse(160, 166, 116, 9, C('cloth3', 2));
    fb.ellipse(160, 166, 110, 7, C('cloth3', 1), 0.5);
  };

  // Bed (drawn before characters). st.bedOff = mattress bounce in px.
  PD.drawBed = function (fb, t, st) {
    const off = Math.round(st.bedOff || 0);
    const by = PD.BED_Y + off;
    // shadow under
    fb.ellipse(160, 147, 108, 5, C('floor', 0), 0.8);
    // legs
    fb.rect(62, 132, 5, 16, C('wood', 0));
    fb.rect(63, 133, 3, 14, C('wood', 2));
    fb.rect(253, 132, 5, 16, C('wood', 0));
    fb.rect(254, 133, 3, 14, C('wood', 2));
    // headboard
    fb.rect(54, 70, 12, 76, C('wood', 0));
    fb.ellipse(60, 72, 7, 6, C('wood', 0));
    fb.rect(55, 71, 10, 74, C('wood', 2));
    fb.ellipse(60, 72, 6, 5, C('wood', 2));
    fb.rect(56, 71, 2, 74, C('wood', 3));
    fb.ellipse(59, 70, 3, 2, C('wood', 4));
    fb.rect(58, 82, 5, 40, C('wood', 1));
    fb.rect(59, 83, 3, 38, C('wood', 2));
    // frame rail
    fb.rect(60, 124, 202, 12, C('wood', 0));
    fb.rect(61, 125, 200, 10, C('wood', 2));
    fb.rect(61, 125, 200, 1, C('wood', 3));
    fb.rect(61, 133, 200, 2, C('wood', 1));
    // mattress
    const mt = by, mb = 126;
    fb.rect(64, mt, 194, mb - mt + 1, C('sheet', 0));
    fb.rect(65, mt + 1, 192, mb - mt - 1, C('sheet', 2));
    fb.rect(65, mt + 1, 192, 2, C('sheet', 4));
    fb.rect(65, mt + 3, 192, 1, C('sheet', 3));
    fb.rect(65, mb - 2, 192, 1, C('sheet', 1));
    fb.drect(65, mt + 4, 192, mb - mt - 6, C('sheet', 1), 0.12);
    // wrinkles near characters
    for (let i = 0; i < 6; i++) {
      const wx = 110 + i * 22 + Math.sin(i * 7.1) * 6;
      fb.line(wx, mt + 4, wx + 5, mb - 3, C('sheet', 1));
    }
    // wet spots
    if (st.wet) for (const w of st.wet) {
      const a = Math.min(1, w.life / 4) * 0.7;
      fb.ellipse(w.x, mt + 2 + (w.y || 0), w.r, 1.3, C('sheet', 1), a);
      fb.ellipse(w.x - 1, mt + 2, w.r * 0.5, 0.7, C('fluid', 3), a * 0.6);
    }
  };

  // Footboard + bunched blanket go in front of the characters.
  PD.drawBedFront = function (fb, t, st) {
    const off = Math.round(st.bedOff || 0);
    const by = PD.BED_Y + off;
    PD.drawGroup(fb, {
      ramp: PD.R.cloth3, k: 3,
      prims: [
        PD.ell({ x: 246, y: by + 1 }, 13, 5, 0.1),
        PD.ell({ x: 236, y: by + 3 }, 9, 4, -0.3),
        PD.ell({ x: 254, y: by + 7 }, 5, 9, 0.2),
        PD.ell({ x: 250, y: by + 12 }, 6, 6, 0),
      ],
      decal: (fb2) => {
        fb2.line(232, by + 2, 242, by + 4, C('cloth3', 1));
        fb2.line(244, by - 1, 252, by + 5, C('cloth3', 1));
      },
    });
    fb.rect(258, 98, 9, 48, C('wood', 0));
    fb.ellipse(262.5, 99, 5, 4, C('wood', 0));
    fb.rect(259, 99, 7, 46, C('wood', 2));
    fb.ellipse(262.5, 99, 4, 3, C('wood', 2));
    fb.rect(260, 99, 1, 46, C('wood', 3));
    fb.ellipse(262, 97.5, 2, 1, C('wood', 4));
  };

  PD.drawPillow = function (fb, st, tilt) {
    const by = PD.BED_Y + Math.round(st.bedOff || 0);
    PD.drawGroup(fb, {
      ramp: PD.R.sheet, k: 2, lift: 0.08,
      prims: [PD.ell({ x: 84, y: by - 3 }, 18, 5.5, tilt || 0), PD.ell({ x: 78, y: by - 4 }, 9, 4.5, 0)],
    });
  };
})(window.PD);

// Lit pixel props built on the SDF body renderer (PD.drawGroup): hands, thumbs,
// the operator's kit, the operator's desk, and the fake profile pictures.
(function (PD) {
  'use strict';
  const C = PD.C, R = PD.R, clamp = PD.clamp;
  const P = (x, y) => ({ x, y });
  const cap = (ax, ay, bx, by, ra, rb) => PD.cap(P(ax, ay), P(bx, by), ra, rb === undefined ? ra : rb);
  const ell = (cx, cy, rx, ry, a) => PD.ell(P(cx, cy), rx, ry, a || 0);
  const G = (fb, ramp, prims, o) => PD.drawGroup(fb, Object.assign({ prims, ramp: R[ramp], k: 2.5 }, o || {}));
  const line = (fb, x0, y0, x1, y1, c) => fb.line(x0, y0, x1, y1, c);

  // ------------------------------------------------------------
  //  NAILS: a rounded half-moon plate at a fingertip.
  //  (tx,ty) = centre of the fingertip's round end, (ux,uy) = unit axis toward the knuckle.
  //  hw = half width, len = how far it runs back toward the cuticle.
  // ------------------------------------------------------------
  function nail(fb, tx, ty, ux, uy, hw, len, skin) {
    const inside = (px, py) => {
      const dx = px + 0.5 - tx, dy = py + 0.5 - ty;
      const d = dx * ux + dy * uy, b = dx * uy - dy * ux;
      if (Math.abs(b) > hw) return 0;
      if (d < 0) return d * d + b * b <= hw * hw ? (d * d + b * b > (hw - 1.4) * (hw - 1.4) ? 2 : 1) : 0;
      return d <= len * Math.sqrt(Math.max(0, 1 - (b / hw) * (b / hw))) ? (b < -hw * 0.25 && b > -hw * 0.6 ? 3 : 1) : 0;
    };
    const r = Math.ceil(hw + len + 2);
    for (let y = Math.floor(ty - r); y <= ty + r; y++) for (let x = Math.floor(tx - r); x <= tx + r; x++) {
      const k = inside(x, y);
      if (!k) continue;
      const edge = !inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1);
      fb.px(x, y, edge && k !== 2 ? C(skin, 2) : k === 2 ? C('ui', 4) : k === 3 ? C('heart', 4) : C(skin, 4));
    }
  }
  PD.nail = nail;

  // ------------------------------------------------------------
  //  HAND HOLDING A PHONE (right hand, like a real grip):
  //  palm behind the phone's lower-right, thumb resting up the right edge,
  //  fingertips curling round the left edge.  drawPhone goes between back/front.
  // ------------------------------------------------------------
  PD.drawPhoneHandBack = function (fb, px, py) {
    G(fb, 'skin0', [ell(px + 46, py + 70, 15, 21, 0.25), cap(px + 54, py + 84, px + 70, py + 130, 12, 13)], { k: 4 });
  };
  PD.drawPhoneHandFront = function (fb, px, py, t) {
    const bob = Math.sin((t || 0) * 3) * 0.6;
    for (let k = 0; k < 4; k++) {
      const y = py + 40 + k * 8.5;
      G(fb, 'skin0', [cap(px - 6, y + 1, px + 3, y, 3.6, 3.3)]);
    }
    // thumb up the right edge, tip leaning onto the screen
    const bx = px + 57, by = py + 70, tx = px + 49, ty = py + 44 + bob;
    G(fb, 'skin0', [cap(bx, by, tx, ty, 5.8, 4.4), ell(px + 56, py + 74, 6, 7)], { k: 3 });
    const L = Math.hypot(bx - tx, by - ty);
    nail(fb, tx, ty, (bx - tx) / L, (by - ty) / L, 3, 3.5, 'skin0');
    fb.px(px + 54, py + 60 + bob, C('skin0', 1)); fb.px(px + 55, py + 61 + bob, C('skin0', 1));
  };

  // ------------------------------------------------------------
  //  BIG THUMB (back of the thumb, nail facing us), tip centre at (tx,ty)
  // ------------------------------------------------------------
  PD.drawBigThumb = function (fb, tx, ty) {
    const ux = 0.42, uy = 0.91; // toward the base: down-right
    G(fb, 'skin0', [
      cap(tx, ty, tx + ux * 90, ty + uy * 90, 11.5, 14),
      ell(tx + ux * 33, ty + uy * 33, 14, 12.5, Math.atan2(uy, ux)),
    ], { k: 5 });
    // knuckle creases
    for (let k = 0; k < 3; k++) for (let b = -7; b <= 7; b++) {
      const d = 30 + k * 3 + b * b * 0.045;
      if (Math.abs(b) > 6 - k * 1.5) continue;
      fb.px(tx + ux * d + uy * b, ty + uy * d - ux * b, C('skin0', k === 1 ? 1 : 2));
    }
    nail(fb, tx + ux * 1.4, ty + uy * 1.4, ux, uy, 9.2, 13, 'skin0');
  };

  // ------------------------------------------------------------
  //  THE KIT
  //  a(k) -> 0..1 landing progress for item k (for the drop-in)
  // ------------------------------------------------------------
  PD.drawKit = function (fb, X, Y, t, a) {
    const drop = (k) => { const v = clamp(a(k), 0, 1); return v <= 0 ? null : Math.round(-(1 - v) * (1 - v) * 80); };
    // shadows on the "table"
    fb.rect(X + 4, Y + 84, 94, 2, C('neon', 5));
    // 0: vodka (tall frosted bottle, red cap + label)
    let o = drop(0);
    if (o !== null) {
      const cx = X + 22, top = Y + 12 + o;
      G(fb, 'ui', [cap(cx, top + 28, cx, top + 66, 10, 10.5), ell(cx, top + 26, 9, 6), cap(cx, top + 6, cx, top + 22, 3.4, 4)], { k: 3, lift: 0.05 });
      G(fb, 'cloth1', [cap(cx, top + 1, cx, top + 6, 3.9, 3.9)]);
      fb.rect(cx - 7, top + 28, 2, 36, C('ui', 4));
      fb.rect(cx - 11, top + 38, 22, 14, C('cloth1', 2)); fb.rect(cx - 11, top + 38, 22, 1, C('cloth1', 4)); fb.rect(cx - 11, top + 51, 22, 1, C('cloth1', 1));
      PD.text(fb, 'VODKA', cx - 9, top + 43, C('ui', 4));
    }
    // 1: lube (pump bottle)
    o = drop(1);
    if (o !== null) {
      const cx = X + 52, top = Y + 26 + o;
      G(fb, 'cyan', [cap(cx, top + 22, cx, top + 52, 11, 11.5), ell(cx, top + 20, 10, 5)], { k: 3 });
      G(fb, 'ui', [cap(cx, top + 9, cx, top + 17, 3.6), cap(cx, top + 8, cx + 8, top + 8, 2), ell(cx, top + 18, 6, 2.5)], { k: 2 });
      fb.rect(cx - 9, top + 28, 18, 16, C('ui', 4)); fb.rect(cx - 9, top + 28, 18, 1, C('ui', 3)); fb.rect(cx - 9, top + 43, 18, 1, C('ui', 2));
      PD.text(fb, 'LUBE', cx - 7, top + 30, C('cyan', 1));
      PD.sprite(fb, ['.#.', '###', '###', '.#.'], cx - 1, top + 37, C('neon', 2));
      // a slow drip off the nozzle
      const dp = (t * 0.7) % 1;
      if (o === 0) { fb.px(cx + 9, top + 9, C('fluid', 4)); fb.rect(cx + 9, top + 10 + dp * 14, 1, 2, C('fluid', 3)); }
    }
    // 2: condom box, XXL, with foils spilling out
    o = drop(2);
    if (o !== null) {
      const bx = X + 66, by = Y + 56 + o;
      fb.rect(bx - 1, by - 7, 33, 36, C('ink', 0));
      for (let i = 0; i < 6; i++) fb.rect(bx + i, by - 6 + (5 - i), 31 - i, 1, C('neon', 3));          // lid (perspective)
      fb.rect(bx, by, 26, 28, C('neon', 2)); fb.rect(bx + 26, by - 1, 5, 29, C('neon', 1));             // front + side
      fb.rect(bx, by, 26, 1, C('neon', 4)); fb.rect(bx, by, 1, 28, C('neon', 3));
      PD.textS(fb, 'XXL', bx + 13, by + 5, 1, C('gold', 4), { center: true, outline: C('neon', 5) });
      PD.text(fb, 'ULTRA', bx + 4, by + 13, C('ui', 4));
      fb.rect(bx + 3, by + 20, 20, 3, C('neon', 1)); PD.sprite(fb, PD.HEART, bx + 10, by + 19, C('ui', 4));
      const foil = (fx, fy) => {
        fb.rect(fx - 1, fy - 1, 12, 12, C('ink', 0));
        fb.rect(fx, fy, 10, 10, C('gold', 2)); fb.rect(fx, fy, 10, 1, C('gold', 4)); fb.rect(fx, fy, 1, 10, C('gold', 3));
        fb.ellipse(fx + 5, fy + 5, 3.4, 3.4, C('gold', 1)); fb.ellipse(fx + 5, fy + 5, 2.3, 2.3, C('gold', 3));
        for (let i = 0; i < 10; i += 2) { fb.px(fx + i, fy - 1, C('gold', 2)); fb.px(fx + 10, fy + i, C('gold', 2)); }
      };
      foil(bx - 14, by + 20); foil(bx - 6, by + 26);
    }
    // 3: blindfold (satin sleep mask with elastic)
    o = drop(3);
    if (o !== null) {
      const cx = X + 30, cy = Y + 80 + o;
      for (let i = -21; i <= 21; i++) { const yy = cy - 1 - Math.sqrt(Math.max(0, 1 - (i / 21) * (i / 21))) * 9; fb.rect(cx + i, yy, 1, 2, C('ink', 0)); fb.px(cx + i, yy, C('cloth3', 1)); }
      G(fb, 'cloth3', [ell(cx - 9, cy, 11, 6.5, 0.12), ell(cx + 9, cy, 11, 6.5, -0.12), cap(cx - 6, cy - 3, cx + 6, cy - 3, 4)], { k: 3 });
      for (let i = -17; i <= 17; i++) fb.px(cx + i, cy + 5 - Math.abs(Math.abs(i) - 9) * 0.15 + (Math.abs(i) < 3 ? -2 : 0), C('heart', 3));
      fb.rect(cx - 1, cy + 2, 3, 3, C('cloth3', 0));
    }
  };

  // ------------------------------------------------------------
  //  THE OPERATOR'S DESK (seen from behind him)
  // ------------------------------------------------------------
  PD.drawOperatorRoom = function (fb, X, Y, w, h, t) {
    fb.rect(X, Y, w, h, C('wall', 0));
    fb.drect(X, Y, w, h, C('wall', 1), 0.45);
    // monitor light washing the wall
    for (let k = 0; k < 6; k++) fb.ellipse(X + 102, Y + 40, 74 - k * 9, 46 - k * 6, C('night', 3), 0.08 + k * 0.03);
    // corkboard: targets, crossed out, red string
    fb.rect(X + 4, Y + 8, 40, 36, C('ink', 0)); fb.rect(X + 5, Y + 9, 38, 34, C('wood', 2)); fb.drect(X + 5, Y + 9, 38, 34, C('wood', 1), 0.25);
    const pins = [[11, 15], [30, 13], [36, 30], [14, 32]], cast = Object.values(PD.CAST || {});
    pins.forEach(([px, py], i) => {
      fb.rect(X + px - 4, Y + py - 3, 10, 10, C('ui', 4));
      fb.rect(X + px - 3, Y + py - 2, 8, 7, C('night', 3));
      if (cast.length) PD.drawDude(fb, X + px + 1, Y + py + 30, Object.assign({ s: 1, clip: [X + px - 3, Y + py - 2, 8, 7] }, cast[(i + 2) % cast.length]));
      if (i !== 2) { line(fb, X + px - 3, Y + py - 2, X + px + 4, Y + py + 4, C('cloth1', 3)); line(fb, X + px - 3, Y + py + 4, X + px + 4, Y + py - 2, C('cloth1', 3)); }
      fb.px(X + px + 1, Y + py - 4, C('cloth1', 4));
    });
    line(fb, X + 12, Y + 11, X + 31, Y + 9, C('cloth1', 2)); line(fb, X + 31, Y + 9, X + 37, Y + 26, C('cloth1', 2)); line(fb, X + 37, Y + 26, X + 15, Y + 28, C('cloth1', 2));
    // shelf + poster on the right
    fb.rect(X + 168, Y + 12, 24, 30, C('ink', 0)); fb.rect(X + 169, Y + 13, 22, 28, C('neon', 1));
    PD.drawMask(fb, X + 180, Y + 17, 14, 13); PD.text(fb, 'WANTED', X + 169, Y + 33, C('ui', 4));
    line(fb, X + 170, Y + 14, X + 190, Y + 30, C('cloth1', 4));
    // desk
    fb.rect(X, Y + 82, w, h - 82, C('wood', 1)); fb.rect(X, Y + 82, w, 2, C('wood', 3)); fb.rect(X, Y + 84, w, 1, C('wood', 0));
    // the monitor, facing him (and us)
    const mx = X + 54, my = Y + 8, mw = 96, mh = 58;
    fb.rect(X + 97, my + mh, 10, 16, C('ink', 2)); fb.rect(X + 88, Y + 78, 28, 5, C('ink', 2)); fb.rect(X + 88, Y + 78, 28, 1, C('ink', 3));
    fb.rect(mx - 1, my - 1, mw + 2, mh + 2, C('ink', 0)); fb.rect(mx, my, mw, mh, C('ink', 3)); fb.rect(mx + 3, my + 3, mw - 6, mh - 7, C('ink', 0));
    const sx = mx + 3, sy = my + 3, sw = mw - 6;
    fb.rect(sx, sy, sw, 9, C('ink', 0)); fb.rect(sx, sy + 9, sw, 1, C('gold', 1));
    PD.drawMask(fb, sx + 6, sy + 1, 9, 8); PD.text(fb, 'GRINDR', sx + 13, sy + 2, C('gold', 2));
    PD.text(fb, '9,999+', sx + sw - 26, sy + 2, C('lime', 3));
    for (let k = 0; k < 10; k++) {
      const tx = sx + 1 + (k % 5) * 18, ty = sy + 11 + Math.floor(k / 5) * 19;
      fb.rect(tx, ty, 17, 18, C('night', 2 + (k % 2)));
      if (cast.length) PD.drawDude(fb, tx + 8.5, ty + 38, Object.assign({ s: 1, clip: [tx, ty, 17, 18] }, cast[(k * 3 + 1) % cast.length], { flag: false, beer: false }));
      if (k === 3) { const on = Math.sin(t * 6) > 0; fb.rect(tx, ty, 17, 1, on ? C('neon', 3) : C('neon', 1)); fb.rect(tx, ty + 17, 17, 1, on ? C('neon', 3) : C('neon', 1)); fb.rect(tx, ty, 1, 18, on ? C('neon', 3) : C('neon', 1)); fb.rect(tx + 16, ty, 1, 18, on ? C('neon', 3) : C('neon', 1)); }
    }
    // mouse cursor drifting toward the highlighted guy
    const cxp = sx + 62 + Math.sin(t * 1.3) * 6, cyp = sy + 24 + Math.cos(t * 1.7) * 3;
    PD.sprite(fb, ['#..', '##.', '###', '#..'], cxp, cyp, C('ui', 4), C('ink', 0));
    // keyboard + mouse + cans
    fb.rect(X + 64, Y + 88, 34, 6, C('ink', 0)); fb.rect(X + 65, Y + 89, 32, 4, C('ink', 3));
    fb.rect(X + 150, Y + 90, 7, 5, C('ink', 0)); fb.rect(X + 151, Y + 91, 5, 3, C('ink', 3)); fb.px(X + 153, Y + 91, C('neon', 3));
    [[18, 74], [26, 76], [172, 74]].forEach(([cx, cy]) => { fb.rect(X + cx, Y + cy, 6, 10, C('ink', 0)); fb.rect(X + cx + 1, Y + cy + 1, 4, 8, C('lime', 2)); fb.rect(X + cx + 1, Y + cy + 1, 1, 8, C('lime', 4)); fb.rect(X + cx + 1, Y + cy + 1, 4, 1, C('ui', 3)); });
    // him: hoodie from behind, lit by the screen
    const ox = X + 102, oy = Y + 72 + Math.round(Math.sin(t * 1.6) * 0.6);
    G(fb, 'night', [ell(ox, oy + 26, 40, 15), cap(ox, oy + 30, ox, oy + 80, 37, 40), ell(ox, oy, 15, 17), ell(ox, oy - 10, 10, 8), cap(ox - 8, oy + 12, ox + 8, oy + 12, 8)], { k: 5, lift: 0.08 });
    for (let a = 0.15; a < Math.PI - 0.15; a += 0.02) { fb.px(ox + Math.cos(a) * 16, oy + 2 + Math.sin(a) * 15, C('night', 0)); fb.px(ox + Math.cos(a) * 16, oy + 3 + Math.sin(a) * 15, C('night', 1)); }
    line(fb, ox, oy - 16, ox, oy + 16, C('night', 1));
    for (let a = -2.7; a < -0.45; a += 0.025) fb.px(ox + Math.cos(a) * 15, oy + Math.sin(a) * 17, C('cyan', 2));
    for (let a = -3.1; a < -2.75; a += 0.02) fb.px(ox + Math.cos(a) * 39, oy + 26 + Math.sin(a) * 14, C('cyan', 1));
    for (let a = -0.4; a < -0.05; a += 0.02) fb.px(ox + Math.cos(a) * 39, oy + 26 + Math.sin(a) * 14, C('cyan', 1));
  };

  // ------------------------------------------------------------
  //  FAKE PROFILE PICTURES  (drawn into a clipped buffer by the caller)
  // ------------------------------------------------------------
  const PICS = [];
  // 0: stolen gym torso, head cropped at the chin
  PICS[0] = function (fb, x, y, w, h, t) {
    fb.rect(x, y, w, h, C('ink', 1));
    for (let i = 0; i < w; i += 11) fb.rect(x + i, y, 1, h, C('ink', 2));
    fb.drect(x, y, w, 10, C('ui', 2), 0.12);
    for (let i = 0; i < 3; i++) fb.ellipse(x + 14 + i * 30, y + 1, 6, 2, C('ui', 4), 0.6);
    // dumbbell racks either side
    for (let k = 0; k < 4; k++) {
      [x + 6, x + w - 6].forEach((dx) => { fb.rect(dx - 5, y + 24 + k * 8, 10, 2, C('ink', 3)); fb.rect(dx - 6, y + 22 + k * 8, 3, 6, C('ink', 0)); fb.rect(dx + 3, y + 22 + k * 8, 3, 6, C('ink', 0)); });
    }
    const cx = x + w / 2;
    G(fb, 'skin1', [
      ell(cx, y + 1, 8, 6), cap(cx, y + 2, cx, y + 12, 6.5, 7),
      cap(cx - 5, y + 11, cx - 17, y + 15, 5, 4), cap(cx + 5, y + 11, cx + 17, y + 15, 5, 4),
      ell(cx - 24, y + 20, 8.5, 8), ell(cx + 24, y + 20, 8.5, 8),
      ell(cx - 10, y + 22, 12, 8.5, -0.12), ell(cx + 10, y + 22, 12, 8.5, 0.12),
      cap(cx, y + 26, cx, y + 64, 19, 15),
      cap(cx - 29, y + 21, cx - 31, y + 52, 7.5, 6), cap(cx + 29, y + 21, cx + 31, y + 52, 7.5, 6),
    ], { k: 3 });
    const D = C('skin1', 1), M2 = C('skin1', 2), L = C('skin1', 4);
    for (let i = -10; i <= 10; i++) { fb.px(cx - 10 + i, y + 30 - Math.abs(i) * 0.15, D); fb.px(cx + 10 + i, y + 30 - Math.abs(i) * 0.15, D); }
    fb.rect(cx - 12, y + 24, 2, 1, C('skin1', 5)); fb.rect(cx + 11, y + 24, 2, 1, C('skin1', 5));
    line(fb, cx, y + 17, cx, y + 54, M2);
    for (let r = 0; r < 3; r++) { const ry = y + 37 + r * 6; fb.rect(cx - 7, ry, 5, 1, D); fb.rect(cx + 2, ry, 5, 1, D); fb.rect(cx - 7, ry - 4, 4, 1, L); fb.rect(cx + 2, ry - 4, 4, 1, L); }
    line(fb, cx - 13, y + 46, cx - 6, y + 57, D); line(fb, cx + 13, y + 46, cx + 6, y + 57, D);
    line(fb, cx - 22, y + 28, cx - 22, y + 38, M2); line(fb, cx + 22, y + 28, cx + 22, y + 38, M2);
    fb.px(cx, y + 53, D); fb.rect(cx, y + 54, 1, 3, C('hair1', 2));
    fb.rect(x, y + h - 3, w, 3, C('cloth0', 2)); fb.rect(x, y + h - 3, w, 1, C('ui', 3));
  };
  // 1: mirror selfie: bathroom mirror w/ vanity bulbs, phone up over the face
  PICS[1] = function (fb, x, y, w, h, t) {
    fb.rect(x, y, w, h, C('ui', 3));
    for (let i = 0; i < w; i += 9) fb.rect(x + i, y, 1, h, C('ui', 2));
    for (let j = 4; j < h; j += 9) fb.rect(x, y + j, w, 1, C('ui', 2));
    const mx = x + 6, my = y + 7, mw = w - 12, mh = h - 13;
    fb.rect(mx - 2, my - 2, mw + 4, mh + 4, C('ink', 0)); fb.rect(mx - 1, my - 1, mw + 2, mh + 2, C('frame', 4));
    // reflected wall behind him: darker tiles, a towel, a door
    fb.rect(mx, my, mw, mh, C('cyan', 3));
    for (let i = 0; i < mw; i += 9) fb.rect(mx + i, my, 1, mh, C('cyan', 2));
    for (let j = 4; j < mh; j += 9) fb.rect(mx, my + j, mw, 1, C('cyan', 2));
    fb.rect(mx + 4, my + 10, 10, 22, C('heart', 3)); fb.rect(mx + 4, my + 10, 10, 2, C('heart', 4)); fb.rect(mx + 4, my + 30, 10, 2, C('heart', 2));
    // vanity bulbs above the mirror
    for (let k = 0; k < 6; k++) { const bx = x + 10 + k * 14; fb.ellipse(bx, y + 3, 4, 4, C('gold', 4), 0.35); fb.ellipse(bx, y + 3, 2.5, 2.5, C('ui', 4)); }
    // him, in the mirror
    const cx = mx + mw / 2 - 4, hy = my + 13;
    fb.blitClip = null;
    G(fb, 'skin1', [ell(cx, hy + 36, 23, 10), cap(cx, hy + 36, cx, hy + 60, 21, 20), cap(cx, hy + 8, cx, hy + 22, 5.5, 6.5)], { k: 4 });
    G(fb, 'skin1', [cap(cx - 21, hy + 36, cx - 25, hy + 64, 7, 6)], { k: 2 });
    // shirtless: pecs + abs
    const D = C('skin1', 1), L2 = C('skin1', 4);
    for (let i = -9; i <= 9; i++) { fb.px(cx - 9 + i, hy + 45 - Math.abs(i) * 0.15, D); fb.px(cx + 9 + i, hy + 45 - Math.abs(i) * 0.15, D); }
    fb.rect(cx - 11, hy + 40, 2, 1, C('skin1', 5)); fb.rect(cx + 9, hy + 40, 2, 1, C('skin1', 5));
    fb.rect(cx, hy + 34, 1, 26, C('skin1', 2));
    for (let r = 0; r < 2; r++) { const ry = hy + 52 + r * 6; fb.rect(cx - 6, ry, 5, 1, D); fb.rect(cx + 2, ry, 5, 1, D); fb.rect(cx - 6, ry - 4, 4, 1, L2); }
    for (let i = -6; i <= 6; i++) fb.px(cx + i, hy + 26 + Math.abs(i) * 0.3, C('skin1', 2));
    G(fb, 'skin1', [ell(cx, hy, 9.5, 11), ell(cx - 9, hy + 1, 2.2, 3.2)], { k: 2 });
    G(fb, 'hair0', [ell(cx + 1, hy - 7, 10.5, 6), ell(cx + 6, hy - 3, 5, 5), ell(cx - 7, hy - 5, 4, 4)], { k: 3, lift: 0.25 });
    // raised arm: shoulder -> elbow out wide -> hand at the phone
    const sx = cx + 20, sy = hy + 32, ex = cx + 31, ey = hy + 14, hx = cx + 11, hyy = hy + 2;
    G(fb, 'skin1', [ell(sx - 2, sy - 1, 8, 7), cap(sx, sy, ex, ey, 6.5, 5), cap(ex, ey, hx + 2, hyy + 2, 4.8, 3.8)], { k: 3 });
    fb.px(ex - 4, ey + 5, C('skin1', 2)); fb.px(ex - 5, ey + 6, C('skin1', 2));
    // the phone (back + camera, pink case) covering his face
    const pX = cx - 9, pY = hy - 10, pW = 17, pH = 27;
    fb.rect(pX - 1, pY, pW + 2, pH, C('ink', 0)); fb.rect(pX, pY - 1, pW, pH + 2, C('ink', 0));
    fb.rect(pX, pY, pW, pH, C('neon', 2)); fb.rect(pX, pY, 2, pH, C('neon', 3)); fb.rect(pX + pW - 2, pY, 2, pH, C('neon', 1));
    fb.rect(pX + 2, pY + 2, 8, 9, C('ink', 0)); fb.rect(pX + 3, pY + 3, 6, 7, C('ink', 2));
    fb.ellipse(pX + 5, pY + 5, 1.6, 1.6, C('ink', 0)); fb.ellipse(pX + 5, pY + 8.5, 1.6, 1.6, C('ink', 0)); fb.px(pX + 8, pY + 5, C('gold', 4));
    fb.px(pX + 4, pY + 4, C('ui', 3)); fb.px(pX + 4, pY + 8, C('ui', 3));
    PD.sprite(fb, PD.HEART, pX + pW / 2 - 2, pY + 17, C('neon', 4));
    // fingers wrapped round the phone's right edge
    for (let k = 0; k < 3; k++) G(fb, 'skin1', [cap(pX + pW + 3, pY + 9 + k * 4.5, pX + pW - 2, pY + 9 + k * 4.5, 2.2)]);
    G(fb, 'skin1', [ell(pX + pW + 5, pY + 14, 5, 7)], { k: 2 });
    // flash
    if (Math.sin(t * 4) > 0.5) {
      const lx = pX + 8, ly = pY + 5;
      fb.ellipse(lx, ly, 6, 6, C('ui', 4), 0.45);
      for (let k = 2; k < 10; k++) { fb.px(lx + k, ly, C('ui', 4)); fb.px(lx - k, ly, C('ui', 4)); fb.px(lx, ly + k * 0.7, C('ui', 4)); fb.px(lx, ly - k * 0.7, C('ui', 4)); }
    }
    fb.drect(mx, my, 12, 10, C('ui', 4), 0.35);
    // counter + soap + cup
    fb.rect(x, y + h - 5, w, 5, C('ui', 4)); fb.rect(x, y + h - 5, w, 1, C('ui', 3));
    fb.rect(x + 6, y + h - 9, 4, 4, C('lime', 2)); fb.rect(x + w - 12, y + h - 10, 5, 5, C('cyan', 1)); fb.rect(x + w - 11, y + h - 13, 1, 3, C('heart', 3));
  };
  // 2: the bulge pic: heather-grey sweatpants, shirt hiked up, the outline of it angled down one leg
  PICS[2] = function (fb, x, y, w, h, t) {
    fb.rect(x, y, w, h, C('wall', 1)); fb.drect(x, y, w, h, C('wall', 2), 0.35);
    fb.rect(x, y + h - 14, w, 14, C('sheet', 1));
    const cx = x + w / 2 + 3;
    // pants body: hips + thighs pressed together
    G(fb, 'ui', [ell(cx, y + 12, 44, 13), cap(cx - 14, y + 14, cx - 16, y + 70, 17, 15), cap(cx + 14, y + 14, cx + 16, y + 70, 17, 15)], { k: 5, bias: 0.15 });
    // cast shadow under the package, then the package itself
    G(fb, 'ui', [cap(cx + 2, y + 27, cx - 9, y + 46, 7.5, 7), ell(cx + 4, y + 33, 9, 7)], { noOutline: true, bias: -0.9 });
    G(fb, 'ui', [cap(cx + 1, y + 21, cx - 8, y + 40, 6.4, 5.4), ell(cx - 9, y + 41, 6.6, 6, 0.6), ell(cx + 3, y + 28, 7.5, 6)], { k: 3, noOutline: true, bias: 0.25 });
    const D = C('ui', 1), M = C('ui', 2);
    line(fb, cx - 15, y + 46, cx - 22, y + 58, M); line(fb, cx - 4, y + 47, cx - 2, y + h, M); line(fb, cx + 11, y + 33, cx + 18, y + 46, M);
    line(fb, cx - 26, y + 26, cx - 17, y + 31, M); line(fb, cx + 22, y + 22, cx + 12, y + 25, M);
    line(fb, cx + 1, y + 36, cx + 2, y + h, D);
    // pre-cum spot. classy.
    fb.ellipse(cx - 11, y + 44, 3, 2.4, C('ui', 1), 0.55);
    // waistbands: sweatpants (with drawstrings), underwear, skin + treasure trail, shirt hem
    fb.rect(x, y + 12, w, 4, C('ui', 3)); fb.rect(x, y + 15, w, 1, C('ui', 1));
    line(fb, cx - 3, y + 16, cx - 5, y + 24, C('ui', 2)); line(fb, cx + 3, y + 16, cx + 4, y + 22, C('ui', 2));
    fb.rect(cx - 6, y + 24, 2, 2, C('ui', 1)); fb.rect(cx + 4, y + 22, 2, 2, C('ui', 1)); fb.rect(cx - 1, y + 14, 3, 3, C('ui', 1));
    fb.rect(x, y + 9, w, 3, C('cloth0', 2)); PD.text(fb, 'XL  XL  XL  XL  XL  XL', x + 1, y + 9, C('ui', 4));
    fb.rect(x, y + 9, w, 1, C('cloth0', 1));
    G(fb, 'skin1', [ell(cx, y + 2, 46, 12)], { clipY: y + 9 });
    for (let j = 1; j < 9; j++) { fb.px(cx + (j % 2), y + j, C('hair1', 1)); if (j > 3) fb.px(cx - 1 - (j % 2), y + j, C('hair1', 2)); }
    fb.rect(x, y, w, 2, C('cloth1', 2)); fb.rect(x, y + 2, w, 1, C('cloth1', 1));
    fb.rect(cx - 3, y + 6, 3, 1, C('skin1', 1));
  };
  // 3: the sunset: clean colour bands, big sun, cloud streaks, glittering sea, palm
  PICS[3] = function (fb, x, y, w, h, t) {
    const hz = y + Math.round(h * 0.62);
    const bands = [['night', 3], ['cloth3', 2], ['neon', 2], ['heart', 3], ['gold', 3], ['gold', 4]];
    const bh = (hz - y) / bands.length;
    for (let j = y; j < hz; j++) {
      const f = (j - y) / bh, i = Math.min(bands.length - 1, Math.floor(f)), fr = f - i;
      fb.rect(x, j, w, 1, C(...bands[i]));
      if (i + 1 < bands.length && fr > 0.7) fb.drect(x, j, w, 1, C(...bands[i + 1]), (fr - 0.7) / 0.3 * 0.6);
    }
    const sx = x + w * 0.4, sy = hz - 4;
    fb.ellipse(sx, sy, 18, 18, C('neon', 3), 0.4);
    fb.ellipse(sx, sy, 12, 12, C('ui', 4));
    fb.ellipse(sx + 2, sy + 3, 10, 9, C('gold', 4), 0.5);
    for (let j = 1; j <= 3; j++) fb.rect(sx - 13, sy + 2 + j * 2, 26, 1, C('neon', 3));
    fb.rect(x, hz - 0, w, 1, C('gold', 4));
    // cloud streaks across the sun
    const streak = (cx, cy, l, c) => { fb.rect(Math.round(cx), cy, l, 2, c); fb.rect(Math.round(cx) + 4, cy - 1, l - 10, 1, c); fb.rect(Math.round(cx) + 2, cy + 2, l - 6, 1, C('neon', 1)); };
    streak(x + 4 + Math.sin(t * 0.3) * 2, y + 8, 30, C('neon', 1));
    streak(x + 40 - Math.sin(t * 0.25) * 2, y + 15, 34, C('heart', 2));
    streak(x + 12 + Math.sin(t * 0.2) * 3, hz - 10, 26, C('neon', 1));
    for (let k = 0; k < 3; k++) { const bx = Math.round(x + 52 + k * 8 + Math.sin(t * 1.2 + k) * 2), by = y + 6 + k * 3 + Math.round(Math.sin(t * 6 + k)); fb.px(bx, by, C('ink', 0)); fb.px(bx - 1, by - 1, C('ink', 0)); fb.px(bx + 1, by - 1, C('ink', 0)); fb.px(bx - 2, by - 1, C('ink', 0)); fb.px(bx + 2, by - 1, C('ink', 0)); }
    // sea
    const sea = [['cyan', 2], ['cyan', 1], ['night', 4], ['night', 3]];
    for (let j = hz; j < y + h; j++) { const i = Math.min(sea.length - 1, Math.floor((j - hz) / 5.5)); fb.rect(x, j, w, 1, C(...sea[i])); }
    fb.rect(x, hz, w, 1, C('gold', 4));
    for (let j = 1; j < y + h - hz; j += 2) {
      const half = 12 - j * 0.42;
      if (half < 1) break;
      for (let s2 = -1; s2 <= 1; s2 += 2) {
        const len = Math.round(half * (0.4 + 0.6 * Math.abs(Math.sin(j * 1.7 + t * 2 + s2))));
        fb.rect(Math.round(sx + s2 * half * 0.4 - len / 2 + Math.sin(t * 3 + j) * 1.5), hz + j, len, 1, C('gold', j < 7 ? 4 : 3));
      }
    }
    for (let k = 0; k < 7; k++) { const gx = x + ((k * 23 + t * 6) % w), gy = hz + 4 + (k * 5) % (y + h - hz - 4); fb.rect(gx, gy, 3, 1, C('cyan', 3)); }
    // palm: segmented trunk + drooping fronds
    const INK = C('ink', 0), px = x + w - 16;
    let tx = px, ty = y + h;
    const tip = [0, 0];
    for (let j = 0; j < 42; j++) {
      tx = px + Math.round(Math.sin(j * 0.055) * 9); ty = y + h - j;
      fb.rect(tx - 2, ty, 4 - (j > 30 ? 1 : 0), 1, INK);
      if (j % 4 === 0) fb.px(tx - 2, ty, C('night', 2));
    }
    tip[0] = tx; tip[1] = ty;
    [[-22, 6], [-17, 13], [-8, 16], [19, 9], [14, 15], [5, 17], [-2, -6], [10, -3]].forEach(([fx, fy], k) => {
      const sway = Math.sin(t * 1.5 + k) * 0.8;
      for (let i = 0; i <= 14; i++) {
        const f = i / 14, X2 = tip[0] + fx * f, Y2 = tip[1] + fy * f * f - (1 - f) * f * 8 + sway * f;
        fb.rect(Math.round(X2), Math.round(Y2), 2, 1, INK);
        if (i > 2 && i % 2 === 0) { const L = Math.round((1 - f) * 3 + 1); fb.rect(Math.round(X2), Math.round(Y2) + 1, 1, L, INK); }
      }
    });
    fb.ellipse(tip[0], tip[1] + 2, 3, 2.5, INK);
  };
  PD.PICS = PICS;
})(window.PD);

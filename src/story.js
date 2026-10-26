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
  //  PIXEL SHAPES: build on a grid, auto-outline + edge shade, stamp
  // ============================================================
  const EMPTY = -1;
  function shadeGrid(g, w, h) {
    const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY : g[y * w + x]);
    const out = new Int16Array(w * h).fill(EMPTY), INK = C('ink', 0);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = get(i, j);
      if (v === EMPTY) {
        if (get(i - 1, j) !== EMPTY || get(i + 1, j) !== EMPTY || get(i, j - 1) !== EMPTY || get(i, j + 1) !== EMPTY) out[j * w + i] = INK;
        continue;
      }
      // light from upper-left: cells on the right/bottom silhouette edge drop one shade
      const edge = get(i + 1, j) === EMPTY || get(i, j + 1) === EMPTY;
      const sh = v % 6;
      out[j * w + i] = edge && sh > 1 && sh < 5 ? v - 1 : v;
    }
    return out;
  }
  function stampGrid(fb, out, w, h, ox, oy, s, o) {
    o = o || {};
    const r0 = o.rows ? o.rows[0] : 0, r1 = o.rows ? o.rows[1] : h, cl = o.clip;
    for (let j = r0; j < r1; j++) for (let i = 0; i < w; i++) {
      const v = out[j * w + i];
      if (v === EMPTY) continue;
      const fx = o.flip ? ox + (w - 1 - i) * s : ox + i * s, fy = oy + j * s;
      if (cl) {
        if (fx + s <= cl[0] || fy + s <= cl[1] || fx >= cl[0] + cl[2] || fy >= cl[1] + cl[3]) continue;
        const ax = Math.max(fx, cl[0]), ay = Math.max(fy, cl[1]);
        fb.rect(ax, ay, Math.min(fx + s, cl[0] + cl[2]) - ax, Math.min(fy + s, cl[1] + cl[3]) - ay, v);
      } else fb.rect(fx, fy, s, s, v);
    }
  }
  // Freeform blob builder (hands, props). Coordinates are grid units.
  class Blob {
    constructor(w, h) { this.w = w; this.h = h; this.g = new Int16Array(w * h).fill(EMPTY); }
    set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y * this.w + x] = c; return this; }
    ell(cx, cy, rx, ry, c, ang) {
      const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0), R = Math.max(rx, ry) + 1;
      for (let j = Math.floor(cy - R); j <= Math.ceil(cy + R); j++) for (let i = Math.floor(cx - R); i <= Math.ceil(cx + R); i++) {
        const dx = i + 0.5 - cx, dy = j + 0.5 - cy, u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry;
        if (u * u + v * v <= 1) this.set(i, j, c);
      }
      return this;
    }
    cap(ax, ay, bx, by, ra, rb, c) {
      const R = Math.max(ra, rb) + 1, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      for (let j = Math.floor(Math.min(ay, by) - R); j <= Math.ceil(Math.max(ay, by) + R); j++)
        for (let i = Math.floor(Math.min(ax, bx) - R); i <= Math.ceil(Math.max(ax, bx) + R); i++) {
          const px = i + 0.5 - ax, py = j + 0.5 - ay, t = clamp((px * dx + py * dy) / L2, 0, 1);
          const qx = px - dx * t, qy = py - dy * t;
          if (qx * qx + qy * qy <= Math.pow(ra + (rb - ra) * t, 2)) this.set(i, j, c);
        }
      return this;
    }
    rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
    // post(F): F(x,y,c) paints detail (creases, nails) after outlining
    draw(fb, ox, oy, s, post, o) {
      const out = shadeGrid(this.g, this.w, this.h);
      if (post) post((x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h && out[y * this.w + x] !== EMPTY) out[y * this.w + x] = c; });
      stampGrid(fb, out, this.w, this.h, Math.round(ox), Math.round(oy), s || 1, o);
    }
  }
  PD.Blob = Blob;

  // ============================================================
  //  THE APP LOGO: the yellow mask
  // ============================================================
  const MASK_SMALL = ['.#######.', '#########', '#########', '#..###..#', '##.###.##', '.#######.', '..#####..', '...###...'];
  PD.drawMask = function (fb, cx, top, w, h, o) {
    o = o || {};
    if (w < 14) { PD.sprite(fb, MASK_SMALL, Math.round(cx - 4.5), top, o.col || C('gold', 2)); return; }
    const hw = w / 2;
    const inside = (px, py) => {
      const u = (px + 0.5 - cx) / hw, v = (py + 0.5 - top) / h, au = Math.abs(u);
      if (v < 0.045 * (1 - u * u) || v > 1) return false;           // slightly scooped top edge
      const half = v < 0.07 ? 0.9 + (v / 0.07) * 0.1 : 1 - 0.27 * Math.pow((v - 0.07) / 0.78, 1.45);
      if (au > half) return false;
      return v <= 1 - 0.17 * Math.pow(au / 0.72, 1.25);               // shallow chin point
    };
    const eye = (px, py) => {
      for (const d of [-1, 1]) {
        const ex = cx + d * 0.43 * hw, ey = top + 0.58 * h, ang = -d * 0.26;
        const dx = px + 0.5 - ex, dy = py + 0.5 - ey;
        // outer end rounder: widen ry on the outer half
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const u = (dx * ca + dy * sa) / (0.31 * hw), v = (-dx * sa + dy * ca) / ((u * d > 0 ? 0.125 : 0.1) * h);
        if (u * u + v * v <= 1) return true;
      }
      return false;
    };
    for (let y = Math.floor(top); y <= Math.ceil(top + h); y++) for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) {
      if (!inside(x, y)) {
        if (o.outline !== undefined && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1))) fb.px(x, y, o.outline);
        continue;
      }
      if (eye(x, y)) { fb.px(x, y, o.eye !== undefined ? o.eye : C('ink', 0)); continue; }
      const v = (y - top) / h;
      let c = v < 0.4 ? C('gold', 3) : C('gold', 2);
      if (v >= 0.35 && v < 0.45 && PD.bayer(x, y) < (v - 0.35) * 10) c = C('gold', 2);
      if (!inside(x - 1, y) || !inside(x, y - 1)) c = C('gold', 4);
      else if (!inside(x + 1, y) || !inside(x, y + 1)) c = C('gold', 1);
      fb.px(x, y, c);
    }
  };

  // ============================================================
  //  CHIBI DUDE
  //  Drawn on a 32x40 unit grid (feet at 16,39) inside a 2-cell margin so
  //  outlines never get clipped; then stamped at any integer scale.
  // ============================================================
  const M = 2, GW = 32 + M * 2, GH = 40 + M * 2;
  const grid = new Int16Array(GW * GH);
  function gset(x, y, c) { x += M; y += M; if (x >= 0 && y >= 0 && x < GW && y < GH) grid[y * GW + x] = c; }
  function grect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) gset(i, j, c); }
  function gell(cx, cy, rx, ry, c) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const u = (i + 0.5 - cx) / rx, v = (j + 0.5 - cy) / ry;
      if (u * u + v * v <= 1) gset(i, j, c);
    }
  }
  function gcap(ax, ay, bx, by, r, c) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    for (let j = Math.floor(Math.min(ay, by) - r); j <= Math.ceil(Math.max(ay, by) + r); j++)
      for (let i = Math.floor(Math.min(ax, bx) - r); i <= Math.ceil(Math.max(ax, bx) + r); i++) {
        const px = i + 0.5 - ax, py = j + 0.5 - ay, t = clamp((px * dx + py * dy) / L2, 0, 1);
        if ((px - dx * t) ** 2 + (py - dy * t) ** 2 <= r * r) gset(i, j, c);
      }
  }

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
    grect(8, 18, 3, 9, SK); if (!o.selfie) grect(21, 18, 3, 9, SK);
    if (sleeve) { grect(8, 18, 3, 3, SH); if (!o.selfie) grect(21, 18, 3, 3, SH); }
    gell(9.5, 27.5, 1.8, 1.6, SK); if (!o.selfie) gell(22.5, 27.5, 1.8, 1.6, SK);
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
    if (o.cap) {
      // backwards cap: dome, band, the strap gap at the forehead, brim poking out the back (top)
      const CP = C(o.cap, 2);
      gell(16, 4.2, 7, 3.6, CP);                       // dome
      grect(9, 5, 15, 2, C(o.cap, 1));                  // band
      grect(15, 4, 3, 3, HR); gset(16, 3, HR);          // snapback opening shows hair
      grect(15, 6, 3, 1, C('ui', 2));                   // strap
      grect(12, -1, 9, 2, C(o.cap, 1));                 // brim sticking up behind
    }
    // accessories
    if (o.flag) {
      grect(25, 8, 1, 20, C('wood', 3));
      for (let j = 0; j < 6; j++) grect(26, 8 + j, 6, 1, C('pride', j));
      gell(24, 27.5, 1.8, 1.6, SK);
    }
    if (o.beer) { grect(4, 23, 4, 6, C('cloth1', 2)); grect(4, 23, 4, 1, C('ui', 3)); grect(5, 25, 2, 2, C('gold', 3)); }
    if (o.selfie) { gcap(22.5, 18.5, 26.5, 14, 1.9, SK); gcap(26.5, 14, 21.5, 9.5, 1.7, SK); }
    if (o.phoneFace) {
      // phone held up over the face: we see its case + camera in the mirror
      grect(11, 2, 10, 14, C('neon', 1)); grect(12, 3, 8, 12, C('neon', 2));
      grect(12, 3, 4, 4, C('ink', 0)); gset(13, 4, C('ui', 3)); gset(14, 5, C('ui', 2));
      if (o.selfie) { gell(21, 9.5, 2.2, 2.8, SK); grect(18, 11, 3, 1, SK); grect(18, 13, 3, 1, SK); }
    }
    if (o.bag) { grect(21, 20, 7, 8, C('neon', 2)); grect(22, 18, 1, 2, C('neon', 1)); grect(26, 18, 1, 2, C('neon', 1)); }

    const out = shadeGrid(grid, GW, GH);
    // cap: highlight on the dome (after shading)
    // ---- face ----
    const F = (i, j, c) => (out[(j + M) * GW + i + M] = c);
    if (o.cap) { F(11, 3, C(o.cap, 3)); F(12, 2, C(o.cap, 3)); F(13, 2, C(o.cap, 4)); F(19, 2, C(o.cap, 3)); F(16, 1, C(o.cap, 3)); }
    const ex1 = 13, ex2 = 19, ey = 9;
    const face = o.face;
    if (!o.phoneFace) {
      if (o.shades) { for (let i = 11; i <= 21; i++) F(i, ey, INK); F(12, ey + 1, INK); F(13, ey + 1, INK); F(19, ey + 1, INK); F(20, ey + 1, INK); }
      else if (face === 'shock') { [ex1, ex2].forEach((e) => { F(e - 1, ey - 1, C('ui', 4)); F(e, ey - 1, C('ui', 4)); F(e - 1, ey, C('ui', 4)); F(e, ey, INK); }); }
      else if (face === 'happy') { [ex1, ex2].forEach((e) => { F(e - 1, ey, INK); F(e, ey - 1, INK); F(e + 1, ey, INK); }); }
      else if (face === 'smug') { [ex1, ex2].forEach((e) => { F(e - 1, ey, INK); F(e, ey, INK); F(e - 1, ey - 1, SKd); F(e, ey - 1, SKd); }); }
      else if (face === 'dumb') { F(ex1 + 1, ey, INK); F(ex2 - 1, ey, INK); F(ex1, ey - 1, INK); F(ex2, ey - 1, INK); }
      else { F(ex1, ey, INK); F(ex2, ey, INK); }
      if (face === 'shock') { F(ex1 - 1, ey - 3, HR); F(ex1, ey - 3, HR); F(ex2 - 1, ey - 3, HR); F(ex2, ey - 3, HR); }
      if (face === 'smug') { F(ex1 - 1, ey - 2, HR); F(ex1, ey - 2, HR); F(ex2, ey - 2, HR); F(ex2 + 1, ey - 3, HR); }
      const my = 13;
      if (face === 'shock') { F(15, my - 1, INK); F(16, my - 1, INK); F(15, my, C('heart', 1)); F(16, my, C('heart', 1)); F(15, my + 1, INK); F(16, my + 1, INK); }
      else if (face === 'happy') { F(14, my - 1, INK); F(15, my, INK); F(16, my, INK); F(17, my, INK); F(18, my - 1, INK); }
      else if (face === 'smug') { F(15, my, INK); F(16, my, INK); F(17, my - 1, INK); }
      else if (face === 'dumb') { F(14, my, INK); F(15, my, INK); F(16, my, INK); F(17, my, INK); F(16, my + 1, C('heart', 3)); F(17, my + 1, C('heart', 3)); F(16, my + 2, C('heart', 2)); }
      else if (face === 'cry') { F(15, my, INK); F(16, my - 1, INK); F(17, my, INK); F(ex1, ey + 1, C('sweat', 3)); F(ex1, ey + 3, C('sweat', 2)); F(ex2, ey + 2, C('sweat', 3)); }
      else { F(15, my, INK); F(16, my, INK); }
      if (o.blush) { F(11, 11, C('heart', 3)); F(12, 11, C('heart', 3)); F(20, 11, C('heart', 3)); F(21, 11, C('heart', 3)); }
    }
    stampGrid(fb, out, GW, GH, Math.round(x - (16 + M) * s), Math.round(y - (39 + M) * s), s,
      { clip: o.clip, flip: o.flip, rows: o.rows ? [o.rows[0] + M, o.rows[1] + M] : null });
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
    fb.rect(s.x, s.y, s.w, 11, C('ink', 0));
    fb.rect(s.x, s.y + 11, s.w, 1, C('gold', 1));
    PD.drawMask(fb, s.x + 7, s.y + 2, 9, 8);
    PD.text(fb, title || 'GRINDR', s.x + 14, s.y + 3, C('gold', 2));
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
  const KEY = 255;
  const popFB = new PD.FB();
  const easeOutBack = (x) => { x = clamp(x, 0, 1); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  // draw something with a scale pop around (cx,cy); k: 0..1 progress
  function popAt(fb, k, cx, cy, draw) {
    if (k >= 1) { draw(fb); return; }
    if (k <= 0) return;
    popFB.clear(KEY);
    draw(popFB);
    fb.blitKey(popFB, cx, cy, 0.25 + 0.75 * easeOutBack(k), KEY);
  }
  const seeded = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const crossed = (t0, t1, at) => t0 < at && t1 >= at;
  const beat = (t0, t1, period, start) => t1 > start && Math.floor((t1 - start) / period) !== Math.floor((t0 - start) / period);
  // in-game style FX word (same look as the sex scene's PLAPs)
  const fxText = (fb, str, x, y, col) => PD.text(fb, str, Math.round(x - PD.textWidth(str) / 2), y, col || C('ui', 4), C('ui', 0), 1, C('heart', 2));

  function sparkle(fb, x, y, r, c) {
    fb.px(x, y, C('ui', 4));
    for (let k = 1; k <= r; k++) { fb.px(x + k, y, c); fb.px(x - k, y, c); fb.px(x, y + k, c); fb.px(x, y - k, c); }
  }

  const SHOTS = [
    { // 1. the town
      panels: [{ r: [8, 8, 304, 118], d(fb, t, R) {
        PD.drawSkyline(fb, 4 + t * 0.6, 0);
        const fx = R.x + 220, fy = R.y + 38;
        fb.rect(fx, fy, 1, 22, C('ui', 3));
        for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) fb.px(fx + 1 + i, fy + j * 1.5 + Math.sin(t * 4 + i * 0.5) * 1.2 * (i / 16), C('pride', j));
        // shooting star
        const p = ((t + 1.2) % 3.4) / 0.55;
        if (p < 1) {
          const hx = R.x + 30 + p * 150, hy = R.y + 6 + p * 34;
          for (let k = 0; k < 12; k++) fb.px(hx - k * 2.2, hy - k * 0.5, k < 2 ? C('ui', 4) : k < 6 ? C('cyan', 3) : C('cyan', 1));
        }
      } }],
      caps: ['This town has a problem.', 'Too many rainbows. Not nearly enough pussy.'],
      bubbles: [{ at: 1, x: 40, y: 50, text: 'YAAAS QUEEN', tx: 60, ty: 76 }, { at: 1, x: 150, y: 28, text: 'SLAAAY', tx: 170, ty: 52, delay: 0.25 }],
    },
    { // 2. the app
      panels: [
        { r: [8, 8, 112, 118], d(fb, t, R) {
          fb.rect(R.x, R.y, R.w, R.h, C('night', 1));
          for (let k = 0; k < 6; k++) fb.ellipse(R.x + R.w / 2, R.y + 56, 50 - k * 7, 50 - k * 7, C('gold', 1), 0.06 * k);
          const buzz = t > 0.6 && ((t - 0.6) % 1.4) < 0.3;
          const px = R.x + 31, py = R.y + 10;
          PD.drawPhoneHandBack(fb, px, py);
          PD.drawPhone(fb, px, py, t, buzz, '10,000 ONLINE');
          PD.drawPhoneHandFront(fb, px, py, t);
          if (buzz) {
            for (let k = 0; k < 3; k++) { fb.px(px - 4 - k, py + 20 + k * 3, C('gold', 3)); fb.px(px + 56 + k, py + 20 + k * 3, C('gold', 3)); }
            popAt(fb, ((t - 0.6) % 1.4) / 0.12, px + 26, py - 3, (f) => fxText(f, 'BZZT', px + 26, py - 5, C('gold', 4)));
          }
        } },
        { r: [126, 8, 186, 118], d(fb, t, R) {
          fb.rect(R.x, R.y, R.w, R.h, C('ink', 0));
          const names = [['MASC4MASC', '0.2MI', CAST.masc], ['SMOOTHBTM', '0.4MI', CAST.smooth], ['NO FEMS', '0.1MI', CAST.nofems],
            ['BEAR W/ CAR', '1MI', CAST.bear], ['TOP 4 TOP', '0.3MI', CAST.top], ['TWINK 21', '50FT', CAST.twink]];
          names.forEach(([n, d, dude], i) => {
            const x = R.x + 3 + (i % 3) * 61, y = R.y + 3 + Math.floor(i / 3) * 57;
            popAt(fb, (t - 0.5 - i * 0.13) / 0.22, x + 29, y + 27, (f) => tile(f, x, y, 59, 55, dude, n, d, t, i));
          });
        } },
      ],
      tick(sc, t0, t1) {
        if (beat(t0, t1, 1.4, 0.6) || crossed(t0, t1, 0.6)) PD.Audio.ui('buzz');
        for (let i = 0; i < 6; i++) if (crossed(t0, t1, 0.5 + i * 0.13)) PD.Audio.ui('ping');
      },
      caps: ['10,000 fags online. Within one mile.', 'Not one of them has ever touched a tit. They brag about it.'],
      bubbles: [{ at: 0, x: 158, y: 62, text: 'WOOF', tx: 152, ty: 82, delay: 0.6 }, { at: 1, x: 238, y: 66, text: 'NO FEMS NO FATS\nNO VAGINAS EW', tx: 284, ty: 46 }],
    },
    { // 3. the operator
      panels: [
        { r: [8, 8, 196, 118], d(fb, t, R) { PD.drawOperatorRoom(fb, R.x, R.y, R.w, R.h, t); } },
        { r: [210, 8, 102, 118], d(fb, t, R) {
          const X = R.x, Y = R.y;
          radial(fb, R, X + 50, Y + 60, C('neon', 1), C('neon', 5), t);
          PD.drawKit(fb, X, Y, t, (k) => (t - 0.7 - k * 0.22) / 0.25);
          popAt(fb, (t - 1.7) / 0.25, X + R.w / 2, Y + 105, (f) => PD.textS(f, 'THE KIT', X + R.w / 2, Y + 100, 2, C('gold', 3), { center: true, outline: C('ink', 0) }));
        } },
      ],
      tick(sc, t0, t1) {
        for (let k = 0; k < 4; k++) if (crossed(t0, t1, 0.95 + k * 0.22 - (k === 3 ? 0.03 : 0))) PD.Audio.ui('thud');
        if (crossed(t0, t1, 1.7)) PD.Audio.ui('pop');
      },
      caps: ["That's me. No face. No name.", 'Just a phone, a fake profile, a bottle of lube...', 'and a pussy that has never once lost.'],
      bubbles: [],
    },
    { // 4. before / during / after
      enter(sc) { sc.doorFX = new PD.FX(); sc.beats = 0; },
      panels: [
        { r: [8, 8, 96, 118], d(fb, t, R) {
          radial(fb, R, R.x + 48, R.y + 50, C('heart', 3), C('heart', 2), t);
          for (let i = 0; i < 9; i++) {
            const tw = Math.sin(t * 4 + i * 1.7);
            if (tw > 0.2) sparkle(fb, R.x + 6 + seeded(i) * 84, R.y + 20 + seeded(i + 9) * 90, tw > 0.75 ? 2 : 1, C(i % 2 ? 'gold' : 'cyan', 3));
          }
          PD.drawDude(fb, R.x + 48, R.y + 116 + Math.round(Math.abs(Math.sin(t * 5)) * -1), Object.assign({ s: 2 }, CAST.twinkPride));
          PD.textS(fb, 'BEFORE', R.x + 4, R.y + 4, 1, C('ui', 4), { outline: C('ink', 0) });
        } },
        { r: [110, 8, 100, 118], d(fb, t, R, sc) {
          const X = R.x, Y = R.y, P = 0.5;
          const n = Math.floor((t - 0.6) / P), ph = t > 0.6 ? ((t - 0.6) % P) / P : 1;
          const jolt = ph < 0.3 ? (1 - ph / 0.3) * 3 : 0;
          const dx = Math.round(jolt * (n % 2 ? 1 : -1)), by = ph < 0.12 ? 1 : 0;
          fb.rect(X, Y, R.w, R.h, C('wall', 1));
          fb.drect(X, Y, R.w, R.h, C('wall', 2), 0.25);
          // frame
          const dX = X + 26, dY = Y + 30 + by;
          fb.rect(dX - 4, dY - 4, 56, 100, C('wood', 1)); fb.rect(dX - 3, dY - 3, 54, 99, C('wood', 3));
          fb.rect(dX - 1, dY - 1, 50, 98, C('ink', 0));
          // pink light leaking around the door, pulsing with each slam
          const glow = 0.35 + (ph < 0.35 ? (1 - ph / 0.35) * 0.65 : 0);
          fb.rect(dX - 1, dY - 1, 50, 98, glow > 0.6 ? C('neon', 4) : C('neon', 3));
          fb.drect(dX - 10, dY - 8, 70, 110, C('neon', 1), (glow - 0.3) * 0.35);
          fb.rect(dX - 4, dY - 4, 56, 3, C('wood', 3)); fb.rect(dX - 4, dY - 4, 3, 100, C('wood', 3)); fb.rect(dX + 49, dY - 4, 3, 100, C('wood', 3));
          // the door itself
          fb.rect(dX + 1 + dx, dY + 1, 46, 96, C('ink', 0)); fb.rect(dX + 2 + dx, dY + 2, 44, 94, C('wood', 2));
          fb.rect(dX + 6 + dx, dY + 7, 36, 32, C('wood', 3)); fb.rect(dX + 6 + dx, dY + 7, 36, 1, C('wood', 4)); fb.rect(dX + 6 + dx, dY + 38, 36, 1, C('wood', 1));
          fb.rect(dX + 6 + dx, dY + 46, 36, 44, C('wood', 3)); fb.rect(dX + 6 + dx, dY + 46, 36, 1, C('wood', 4)); fb.rect(dX + 6 + dx, dY + 89, 36, 1, C('wood', 1));
          fb.ellipse(dX + 38 + dx, dY + 44, 2.5, 2.5, C('gold', 3)); fb.px(dX + 37 + dx, dY + 43, C('gold', 4));
          // DO NOT DISTURB tag swinging on the knob
          const sw = Math.sin(t * 9) * jolt * 0.8;
          fb.line(dX + 38 + dx, dY + 44, dX + 36 + dx + sw, dY + 50, C('ink', 0));
          fb.rect(dX + 31 + dx + Math.round(sw), dY + 50, 12, 14, C('ink', 0)); fb.rect(dX + 32 + dx + Math.round(sw), dY + 51, 10, 12, C('neon', 2));
          PD.sprite(fb, ['#.#', '###', '.#.'], dX + 35 + dx + Math.round(sw), dY + 55, C('ui', 4));
          // dust shaken off the frame
          if (ph < 0.7 && t > 0.6) for (let d = 0; d < 6; d++) fb.px(dX + 2 + seeded(n * 7 + d) * 46, dY - 2 + ph * (14 + d * 4), C('wood', 4));
          sc.doorFX.draw(fb);
        } },
        { r: [216, 8, 96, 118], d(fb, t, R) {
          radial(fb, R, R.x + 48, R.y + 50, C('cyan', 1), C('cyan', 5), t);
          // party bunting strung across the top
          const pts = [];
          for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push([R.x + f * R.w, R.y + 12 + Math.sin(f * Math.PI) * 7 + Math.sin(t * 2 + f * 3) * 0.8]); }
          for (let i = 0; i < 8; i++) fb.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C('ink', 0));
          for (let i = 0; i < 8; i++) {
            const [ax, ay] = pts[i], [bx, by2] = pts[i + 1], col = i % 2 ? C('ui', 4) : C('cloth1', 2), sway = Math.sin(t * 3 + i) * 1.5;
            for (let r = 0; r < 9; r++) {
              const f = r / 9, wv = (1 - f) * (bx - ax - 3) / 2, cx = (ax + bx) / 2 + sway * f, cy = (ay + by2) / 2 + r;
              fb.rect(Math.round(cx - wv) - 1, Math.round(cy), Math.round(wv * 2) + 2, 1, C('ink', 0));
              if (wv > 0.6) fb.rect(Math.round(cx - wv), Math.round(cy), Math.round(wv * 2), 1, col);
            }
          }
          // beer can foam drips
          PD.drawDude(fb, R.x + 48, R.y + 116, Object.assign({ s: 2 }, CAST.twinkStraight));
          for (let k = 0; k < 3; k++) { const p = ((t * 0.9 + k * 0.33) % 1); fb.px(R.x + 33 + k, R.y + 82 + p * 20, C('fluid', 4)); }
          PD.textS(fb, 'AFTER', R.x + R.w - 24, R.y + 28, 1, C('ui', 4), { outline: C('ink', 0) });
        } },
      ],
      tick(sc, t0, t1, dt) {
        const R = { x: 110, y: 8 }, P = 0.5;
        if (t1 > 0.6 && beat(t0, t1, P, 0.6) || crossed(t0, t1, 0.6)) {
          const n = sc.beats++;
          const words = ['SLAP', 'PLAP', 'CREAK', 'PLAP♥', 'SLAP', 'OH GOD', 'PLAP', 'FUCK♥', 'CREAK', 'HNNG♥'];
          const w = words[n % words.length];
          const side = n % 2 ? 1 : -1;
          sc.doorFX.word(clamp(R.x + 50 + side * (14 + seeded(n) * 16), R.x + 18, R.x + 82), R.y + 34 + (n % 3) * 24 + seeded(n + 5) * 6, w, w.includes('♥') || w === 'OH GOD' ? C('heart', 3) : C('ui', 4), { vy: -14, life: 1.1 });
          if (n % 2 === 0) sc.doorFX.heart(R.x + 50 + (seeded(n + 2) - 0.5) * 30, R.y + 34, n % 4 === 0);
          PD.Audio.slap(1 + (n % 3) * 0.15, 0.7);
          if (n % 2) PD.Audio.creak();
          if (n % 4 === 3) SM.shake = 0.05 * PD.Settings.shake;
        }
        sc.doorFX.update(dt, 0);
      },
      caps: ['One night with it and they walk out straight.', 'Limping, sometimes. But straight.'],
      bubbles: [{ at: 0, x: 12, y: 22, text: 'EW A VAGINA?\nGROSS!', tx: 40, ty: 54 }, { at: 0, x: 134, y: 104, text: 'WHY IS IT\nSO WARM', tx: 150, ty: 92, delay: 1.2 },
        { at: 1, x: 220, y: 40, text: 'BRO.\nTITS.', tx: 246, ty: 70, shout: true, sfx: 'scratch', shake: 0.2 }],
    },
    { // 5. the goal
      panels: [{ r: [8, 8, 304, 118], d(fb, t, R) {
        const X = R.x, Y = R.y;
        fb.rect(X, Y, R.w, R.h, C('ink', 0));
        for (let y = Y; y < Y + R.h; y += 2) fb.rect(X, y, R.w, 1, C('ink', 1));
        const cx = X + 62, cy = Y + 58;
        // app icon: black rounded tile, yellow mask
        fb.rect(cx - 25, cy - 23, 50, 46, C('gold', 1)); fb.rect(cx - 23, cy - 25, 46, 50, C('gold', 1));
        fb.rect(cx - 24, cy - 22, 48, 44, C('ink', 0)); fb.rect(cx - 22, cy - 24, 44, 48, C('ink', 0));
        PD.drawMask(fb, cx, cy - 17, 34, 34);
        // crosshair zooms in, then locks
        const lk = clamp((t - 1.9) / 0.35, 0, 1), k = 48 - easeOut(lk) * 18 + (lk >= 1 ? 0 : Math.sin(t * 9) * 2);
        const col = lk >= 1 && Math.sin(t * 14) > -0.2 ? C('cloth1', 4) : C('cloth1', 3);
        for (let a = 0; a < Math.PI * 2; a += 0.015) fb.px(cx + Math.cos(a) * k, cy + Math.sin(a) * k, col);
        fb.rect(cx - k - 8, cy, 14, 1, col); fb.rect(cx + k - 6, cy, 14, 1, col); fb.rect(cx, cy - k - 8, 1, 14, col); fb.rect(cx, cy + k - 6, 1, 14, col);
        if (lk >= 1 && Math.sin(t * 8) > 0) PD.textS(fb, 'LOCKED', cx, cy + 34, 1, C('cloth1', 4), { center: true, outline: C('ink', 0) });
        // the number rolls up
        const v = Math.round(easeOut((t - 0.5) / 1.2) * 10000);
        const str = v.toLocaleString('en-US');
        PD.textS(fb, 'GUYS ONLINE', X + 204, Y + 26, 1, C('cyan', 3), { center: true });
        PD.textS(fb, str, X + 204, Y + 40, 6, C('neon', 2), { center: true, outline: C('ink', 0), shadow: C('neon', 5), shadowOff: 3, shine: C('neon', 4) });
        if (t > 1.8) popAt(fb, (t - 1.8) / 0.25, X + 204, Y + 89, (f) => PD.textS(f, 'TARGET: 0', X + 204, Y + 84, 2, C('gold', 3), { center: true, outline: C('ink', 0) }));
      } }],
      tick(sc, t0, t1) {
        if (t1 > 0.5 && t1 < 1.7 && beat(t0, t1, 0.045, 0.5)) PD.Audio.ui('tick');
        if (crossed(t0, t1, 1.8)) PD.Audio.ui('pop');
        if (crossed(t0, t1, 2.25)) { PD.Audio.ui('lock'); SM.shake = 0.08 * PD.Settings.shake; }
      },
      caps: ['The goal: get that number to zero.', 'Make Grindr go extinct. One twink at a time.'],
      bubbles: [],
    },
    { // 6. create profile
      panels: [{ r: [70, 8, 180, 118], d(fb, t, R, sc) {
        const X = R.x, Y = R.y;
        radial(fb, R, X + 90, Y + 60, C('night', 2), C('night', 1), t);
        const s = bigPhone(fb, X + 50, Y + 6, 80, 128);
        fb.rect(s.x, s.y, s.w, s.h, C('ink', 0));
        appHeader(fb, s);
        fb.rect(s.x + s.w / 2 - 12, s.y + 16, 24, 24, C('ink', 2));
        PD.drawDude(fb, s.x + s.w / 2, s.y + 56, { s: 1, face: 'none', skin: 'ink', hair: 'ink', shirt: 'ink', pants: 'ink', hairStyle: 'none', clip: [s.x + s.w / 2 - 12, s.y + 16, 24, 24] });
        PD.textS(fb, 'NO PROFILE', s.x + s.w / 2, s.y + 44, 1, C('ink', 4), { center: true });
        const tc = sc.cap >= 1 ? sc.tc : -1;
        const pressed = tc > 0.75 && tc < 1.05;
        const bx = s.x + 5, by = s.y + 56 + (pressed ? 1 : 0);
        fb.rect(bx, s.y + 56, s.w - 10, 15, C('ink', 0));
        fb.rect(bx + 1, by + 1, s.w - 12, 12, C('gold', pressed ? 3 : 2)); fb.rect(bx + 1, by + 1, s.w - 12, 1, C('gold', 4));
        PD.text(fb, 'CREATE PROFILE', bx + 5, by + 5, C('ink', 0));
        if (tc > 0.75) for (let r = 0; r < 2; r++) {
          const rr = (tc - 0.75 - r * 0.12) * 70;
          if (rr > 0 && rr < 46) for (let a = 0; a < Math.PI * 2; a += 0.04) {
            const px = bx + 58 + Math.cos(a) * rr, py = by + 7 + Math.sin(a) * rr * 0.6;
            if (PD.bayer(Math.round(px), Math.round(py)) < 1 - rr / 46) fb.px(px, py, C('gold', 4));
          }
        }
        if (tc > 0.75) popAt(fb, (tc - 0.75) / 0.15, bx + 66, by - 8, (f) => fxText(f, 'TAP', bx + 66, by - 10, C('ui', 4)));
        if (tc >= 0) {
          const k = easeOut(tc / 0.7), push = pressed ? 2 : 0;
          PD.drawBigThumb(fb, bx + 58 + (1 - k) * 60, by + 15 + (1 - k) * 80 + push);
        }
      } }],
      tick(sc, t0, t1) { if (sc.cap >= 1 && sc.tc - (t1 - t0) < 0.75 && sc.tc >= 0.75) { PD.Audio.ui('click'); SM.shake = 0.05 * PD.Settings.shake; } },
      caps: ['Step one: become the gayest man on the app.', 'On paper. No homo.'],
      bubbles: [],
    },
  ];

  const CPS = [24, 48, 110];
  SM.scenes.intro = {
    enter() { this.art = this.art || new PD.FB(); this.shot = 0; this.startShot(); },
    startShot() {
      this.cap = 0; this.shown = 0; this.t = 0; this.tc = 0; this.bt = [];
      const S = SHOTS[this.shot];
      if (S.enter) S.enter(this);
    },
    idle(dt) { this.t += dt; },
    update(dt) {
      const t0 = this.t;
      this.t += dt; this.tc += dt;
      const S = SHOTS[this.shot], cap = up(S.caps[this.cap]);
      // panel whoosh + landing thud
      S.panels.forEach((p, i) => { if (crossed(t0, this.t, i * 0.2 + 0.001)) PD.Audio.ui('whoosh'); if (crossed(t0, this.t, i * 0.2 + 0.33)) { PD.Audio.ui('thud'); SM.shake = Math.max(SM.shake, 0.04 * PD.Settings.shake); } });
      if (S.tick) S.tick(this, t0, this.t, dt);
      const delay = 0.35 + S.panels.length * 0.2;
      if (this.t > delay && this.shown < cap.length) {
        const before = Math.floor(this.shown);
        this.shown = Math.min(cap.length, this.shown + dt * CPS[PD.Settings.textSpeed | 0]);
        if (Math.floor(this.shown) !== before && (before % 2 === 0) && cap[before] !== ' ') PD.Audio.ui('type');
      }
      // bubbles pop in
      S.bubbles.forEach((b, i) => {
        if (this.bt[i] !== undefined) return;
        if (this.cap > b.at || (this.cap === b.at && this.shown > 2 && this.tc > (b.delay || 0))) {
          this.bt[i] = this.t;
          PD.Audio.ui(b.sfx || 'pop');
          if (b.shake) SM.shake = b.shake * PD.Settings.shake;
        }
      });
      if (this.skip) { this.skip = false; return this.finish(); }
      const go = UI.activate || (PD.INPUT.released && !UI.over(W - 52, 164, 46, 12));
      if (!go) return;
      if (this.shown < cap.length) { this.shown = cap.length; return; }
      if (this.cap + 1 < S.caps.length) { this.cap++; this.shown = 0; this.tc = 0; PD.Audio.ui('nav'); return; }
      if (this.shot + 1 < SHOTS.length) { this.shot++; this.startShot(); return; }
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
      S.panels.forEach((p, i) => {
        const k = easeOut((t - i * 0.2) / 0.35);
        if (k <= 0) return;
        const off = Math.round((1 - k) * 28) * (i % 2 ? -1 : 1);
        const R = { x: p.r[0], y: p.r[1] + off, w: p.r[2], h: p.r[3] };
        panelFrame(fb, R);
        this.art.clear(C('ink', 0));
        p.d(this.art, t, R, this);
        fb.blit(this.art, R.x, R.y, R.w, R.h);
      });
      S.bubbles.forEach((b, i) => {
        if (this.bt[i] === undefined) return;
        const k = (t - this.bt[i]) / 0.22;
        const lines = String(b.text).split('\n');
        const bw = Math.max(...lines.map((l) => PD.textWidth(up(l)))) + 8, bh = lines.length * 7 + 5;
        popAt(fb, k, b.tx !== undefined ? b.tx : b.x + bw / 2, b.ty !== undefined ? b.ty : b.y + bh, (f) => PD.bubble(f, b.x, b.y, b.text, b.tx, b.ty, b));
      });
      for (let i = 0; i <= this.cap; i++) {
        const str = up(S.caps[i]);
        const shown = i < this.cap ? str.length : Math.floor(this.shown);
        if (i === this.cap && shown === 0) continue;
        const w = PD.textWidth(str) + 10;
        const x = i % 2 ? W - 8 - w : 8, y = 132 + i * 13;
        const k = i < this.cap ? 1 : clamp(this.shown / 5, 0, 1);
        popAt(fb, k, x + (i % 2 ? w : 0), y + 5, (f) => caption(f, x, y, str, shown, i === this.cap && shown >= str.length, SM.t));
      }
      for (let i = 0; i < SHOTS.length; i++) fb.rect(8 + i * 6, 172, 4, 3, i <= this.shot ? C('neon', 2) : C('ink', 3));
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
  function drawPicRaw(fb, x, y, w, h, kind, t) { PD.PICS[kind](fb, x, y, w, h, t); }
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
      PD.text(fb, '47 TAPS', s.x + s.w - 30, s.y + 3, C('ui', 4));
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

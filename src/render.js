// Software pixel renderer.
//  - FB: 320x180 indexed framebuffer (ramp*6+shade per pixel)
//  - drawGroup: rasterizes a smooth-union of SDF primitives (tapered capsules,
//    rotated ellipses) with fake-3D normals -> lit, dithered, 1px outlined.
//    This is how every body part gets its soft, rounded pixel-art look.
//  - bitmap 3x5 font for in-world onomatopoeia + HUD.
(function (PD) {
  'use strict';
  const W = PD.W, H = PD.H;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
  PD.bayer = bayer;

  class FB {
    constructor() { this.buf = new Uint8Array(W * H); }
    clear(c) { this.buf.fill(c); }
    px(x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      this.buf[y * W + x] = c;
    }
    get(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return 0;
      return this.buf[y * W + x];
    }
    rect(x, y, w, h, c) {
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
      for (let j = y0; j < y1; j++) this.buf.fill(c, j * W + x0, j * W + Math.max(x0, x1));
    }
    // Ordered-dither fill: draws c where bayer < level (0..1).
    drect(x, y, w, h, c, level) {
      const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
      for (let j = y0; j < y1; j++)
        for (let i = x0; i < x1; i++) if (bayer(i, j) < level) this.buf[j * W + i] = c;
    }
    // Clean dim: step every pixel down its own ramp (no dither noise).
    darken(steps) {
      const b = this.buf;
      for (let i = 0; i < b.length; i++) {
        const v = b[i], sh = v % 6;
        if (sh === 5 || sh === 0) continue;
        b[i] = v - Math.min(steps, sh - 1 > 0 ? sh - 1 : 0) - (sh - steps < 1 ? 0 : 0);
      }
    }
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let n = 0; n < 400; n++) {
        this.px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    ellipse(cx, cy, rx, ry, c, level) {
      const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1);
      const y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
      for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++)
        for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
          const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
          if (u * u + v * v <= 1 && (level === undefined || bayer(x, y) < level)) this.buf[y * W + x] = c;
        }
    }
  }
  PD.FB = FB;

  // ---------- SDF primitives ----------
  PD.cap = (a, b, ra, rb) => ({ t: 0, ax: a.x, ay: a.y, bx: b.x, by: b.y, ra, rb: rb === undefined ? ra : rb });
  PD.ell = (c, rx, ry, ang) => ({ t: 1, cx: c.x, cy: c.y, rx, ry, c: Math.cos(ang || 0), s: Math.sin(ang || 0) });

  let NX = 0, NY = 0, NZ = 0;
  function evalPrim(p, x, y) {
    if (p.t === 0) {
      const bax = p.bx - p.ax, bay = p.by - p.ay;
      const pax = x - p.ax, pay = y - p.ay;
      const L2 = bax * bax + bay * bay;
      let t = L2 > 1e-6 ? (pax * bax + pay * bay) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = p.ra + (p.rb - p.ra) * t;
      const qx = pax - bax * t, qy = pay - bay * t;
      const dist = Math.sqrt(qx * qx + qy * qy);
      const vx = qx / r, vy = qy / r, v2 = vx * vx + vy * vy;
      if (v2 < 1) { NX = vx; NY = vy; NZ = Math.sqrt(1 - v2); }
      else { const iv = 1 / Math.sqrt(v2); NX = vx * iv; NY = vy * iv; NZ = 0; }
      return dist - r;
    }
    const dx = x - p.cx, dy = y - p.cy;
    const lx = dx * p.c + dy * p.s, ly = -dx * p.s + dy * p.c;
    const ux = lx / p.rx, uy = ly / p.ry;
    const k = Math.sqrt(ux * ux + uy * uy);
    let nx = ux, ny = uy, nz;
    if (k < 1) nz = Math.sqrt(1 - k * k);
    else { nx /= k || 1; ny /= k || 1; nz = 0; }
    NX = nx * p.c - ny * p.s; NY = nx * p.s + ny * p.c; NZ = nz;
    return (k - 1) * Math.min(p.rx, p.ry);
  }
  PD.evalPrim = evalPrim;

  function bounds(p) {
    if (p.t === 0) {
      return [Math.min(p.ax - p.ra, p.bx - p.rb), Math.min(p.ay - p.ra, p.by - p.rb),
        Math.max(p.ax + p.ra, p.bx + p.rb), Math.max(p.ay + p.ra, p.by + p.rb)];
    }
    const r = Math.max(p.rx, p.ry);
    return [p.cx - r, p.cy - r, p.cx + r, p.cy + r];
  }

  // Key light: from the bedside lamp, upper-left, toward the viewer.
  const LL = Math.hypot(-0.48, -0.62, 0.62);
  const LX = -0.48 / LL, LY = -0.62 / LL, LZ = 0.62 / LL;
  const TD = new Float32Array(64), TX = new Float32Array(64), TY = new Float32Array(64), TZ = new Float32Array(64);
  const BX0 = new Float32Array(64), BY0 = new Float32Array(64), BX1 = new Float32Array(64), BY1 = new Float32Array(64);
  const ROW = new Int32Array(64);
  let MASK = new Uint8Array(256 * 256);

  // g: { prims, ramp (id), k (smooth radius), bias, lift, paints, decal, noOutline }
  // paint: { prims, ramp, pat(x,y)->bool, map[shade]->shade, clips:[{pt,n}] }
  PD.drawGroup = function (fb, g) {
    const P = g.prims;
    const n = Math.min(P.length, 64);
    if (!n) return;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    const k = g.k || 1.8;
    for (let q = 0; q < n; q++) {
      const b = bounds(P[q]);
      if (b[0] < bx0) bx0 = b[0]; if (b[1] < by0) by0 = b[1];
      if (b[2] > bx1) bx1 = b[2]; if (b[3] > by1) by1 = b[3];
      // a prim further than k from a pixel can't change the smooth union there
      BX0[q] = b[0] - k - 1; BY0[q] = b[1] - k - 1; BX1[q] = b[2] + k + 1; BY1[q] = b[3] + k + 1;
    }
    const x0 = Math.max(-1, Math.floor(bx0 - k) - 1), y0 = Math.max(-1, Math.floor(by0 - k) - 1);
    const x1 = Math.min(W, Math.ceil(bx1 + k) + 1), y1 = Math.min(H, Math.ceil(by1 + k) + 1);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (bw <= 0 || bh <= 0) return;
    if (MASK.length < bw * bh) MASK = new Uint8Array(bw * bh * 2);
    const M = MASK;
    M.fill(0, 0, bw * bh);
    const rampBase = g.ramp * 6, bias = (g.bias || 0) * 0.16 + (g.lift || 0);
    const clipY = g.clipY === undefined ? 1e9 : g.clipY;
    const paints = g.paints;

    for (let j = 1; j < bh - 1; j++) {
      const y = y0 + j + 0.5;
      if (y > clipY) break;
      let rn = 0;
      for (let q = 0; q < n; q++) if (y >= BY0[q] && y <= BY1[q]) ROW[rn++] = q;
      if (!rn) continue;
      for (let i = 1; i < bw - 1; i++) {
        const x = x0 + i + 0.5;
        let d = 1e9, dmin = 1e9, first = true;
        for (let r = 0; r < rn; r++) {
          const q = ROW[r];
          if (x < BX0[q] || x > BX1[q]) { TD[q] = 1e9; continue; }
          const di = evalPrim(P[q], x, y);
          TD[q] = di; TX[q] = NX; TY[q] = NY; TZ[q] = NZ;
          if (first) { d = di; first = false; }
          else {
            let h = k - Math.abs(d - di);
            h = h > 0 ? h / k : 0;
            d = Math.min(d, di) - h * h * k * 0.25;
          }
          if (di < dmin) dmin = di;
        }
        if (d > 0) continue;
        let nx = 0, ny = 0, nz = 0;
        for (let r = 0; r < rn; r++) {
          const q = ROW[r];
          let w = 1 - (TD[q] - dmin) / k;
          if (w <= 0) continue;
          w *= w;
          nx += TX[q] * w; ny += TY[q] * w; nz += TZ[q] * w;
        }
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const px = x0 + i, py = y0 + j;
        let v = ((nx * LX + ny * LY + nz * LZ) / nl) * 0.5 + 0.5 + bias;
        v += (bayer(px, py) - 0.5) * 0.14;
        let s = v < 0.34 ? 1 : v < 0.62 ? 2 : v < 0.87 ? 3 : 4;
        let ramp = rampBase;
        if (paints) {
          for (let pi = 0; pi < paints.length; pi++) {
            const pt = paints[pi];
            let dp = 1e9;
            for (let r = 0; r < pt.prims.length; r++) {
              const e = evalPrim(pt.prims[r], x, y);
              if (e < dp) dp = e;
            }
            if (dp > 0) continue;
            let ok = true;
            if (pt.clips) for (const c of pt.clips) if ((x - c.pt.x) * c.n.x + (y - c.pt.y) * c.n.y < 0) { ok = false; break; }
            if (!ok) continue;
            if (!pt.pat || pt.pat(px, py)) {
              ramp = pt.ramp * 6;
              if (pt.map) s = pt.map[s];
            }
            break;
          }
        }
        M[j * bw + i] = ramp + s + 1;
      }
    }

    const buf = fb.buf;
    for (let j = 0; j < bh; j++) {
      const Y = y0 + j;
      if (Y < 0 || Y >= H) continue;
      for (let i = 0; i < bw; i++) {
        const X = x0 + i;
        if (X < 0 || X >= W) continue;
        const m = M[j * bw + i];
        if (m) { buf[Y * W + X] = m - 1; continue; }
        if (g.noOutline) continue;
        // soft roots: where a part grows out of the body, no outline -> it reads as attached
        if (g.softRoots) {
          let soft = false;
          for (const sr of g.softRoots) if ((X + 0.5 - sr.pt.x) ** 2 + (Y + 0.5 - sr.pt.y) ** 2 < sr.r * sr.r) { soft = true; break; }
          if (soft) continue;
        }
        let nb = 0;
        if (i > 0 && M[j * bw + i - 1]) nb = M[j * bw + i - 1];
        else if (i < bw - 1 && M[j * bw + i + 1]) nb = M[j * bw + i + 1];
        else if (j > 0 && M[(j - 1) * bw + i]) nb = M[(j - 1) * bw + i];
        else if (j < bh - 1 && M[(j + 1) * bw + i]) nb = M[(j + 1) * bw + i];
        if (nb) buf[Y * W + X] = Math.floor((nb - 1) / 6) * 6;
      }
    }
    if (g.decal) g.decal(fb);
  };

  // Patterns used by clothing paints.
  PD.PAT = {
    fishnet: (x, y) => (x + y) % 3 === 0 || (((x - y) % 3) + 3) % 3 === 0,
    lace: (x, y) => bayer(x, y) < 0.72,
    hair: (x, y) => (x + 2 * y) % 3 !== 0,
    stubble: (x, y) => bayer(x, y) < 0.5,
  };

  // ---------- 3x5 bitmap font ----------
  const G = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
    6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
    '!': ['#', '#', '#', '.', '#'], '.': ['.', '.', '.', '.', '#'], ':': ['.', '#', '.', '#', '.'],
    '~': ['....', '.#.#', '#.#.', '....', '....'], '-': ['...', '...', '###', '...', '...'],
    '+': ['...', '.#.', '###', '.#.', '...'], '?': ['##.', '..#', '.#.', '...', '.#.'],
    ' ': ['..', '..', '..', '..', '..'],
  };
  const HEART = ['.#.#.', '#####', '#####', '.###.', '..#..'];
  G['♥'] = HEART;
  PD.HEART = HEART;
  Object.assign(G, {
    "'": ['#', '#', '.', '.', '.'], ',': ['.', '.', '.', '#', '#'], '%': ['#.#', '..#', '.#.', '#..', '#.#'],
    '/': ['..#', '..#', '.#.', '#..', '#..'], '$': ['.##', '##.', '.#.', '.##', '##.'],
    '(': ['.#', '#.', '#.', '#.', '.#'], ')': ['#.', '.#', '.#', '.#', '#.'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
    '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'], '=': ['...', '###', '...', '###', '...'],
    '"': ['#.#', '#.#', '...', '...', '...'], '#': ['#.#', '###', '#.#', '###', '#.#'], '_': ['...', '...', '...', '...', '###'],
  });
  PD.GLYPHS = G;

  PD.textWidth = (str) => {
    let w = 0;
    for (const ch of str) w += ((G[ch] || G[' '])[0].length) + 1;
    return Math.max(0, w - 1);
  };

  // alpha < 1 dithers the glyphs away (used for fading float text).
  PD.text = function (fb, str, x, y, c, oc, alpha, heartC) {
    x = Math.round(x); y = Math.round(y);
    const a = alpha === undefined ? 1 : alpha;
    const pass = (outline) => {
      let cx = x;
      for (const ch of str) {
        const g = G[ch] || G[' '];
        const col = ch === '♥' && heartC !== undefined ? heartC : c;
        for (let j = 0; j < 5; j++)
          for (let i = 0; i < g[j].length; i++) {
            if (g[j][i] !== '#') continue;
            const px = cx + i, py = y + j;
            if (bayer(px, py) >= a) continue;
            if (outline) {
              fb.px(px - 1, py, oc); fb.px(px + 1, py, oc); fb.px(px, py - 1, oc); fb.px(px, py + 1, oc);
              fb.px(px + 1, py + 1, oc);
            } else fb.px(px, py, col);
          }
        cx += g[0].length + 1;
      }
    };
    if (oc !== undefined && oc !== null) pass(true);
    pass(false);
  };

  PD.sprite = function (fb, rows, x, y, c, oc) {
    x = Math.round(x); y = Math.round(y);
    if (oc !== undefined) for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++)
      if (rows[j][i] === '#') { fb.px(x + i - 1, y + j, oc); fb.px(x + i + 1, y + j, oc); fb.px(x + i, y + j - 1, oc); fb.px(x + i, y + j + 1, oc); }
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++)
      if (rows[j][i] === '#') fb.px(x + i, y + j, c);
  };

  // Indexed buffer -> canvas through the active palette LUT.
  let img = null, img32 = null;
  PD.present = function (ctx, fb, lut) {
    if (!img) { img = ctx.createImageData(W, H); img32 = new Uint32Array(img.data.buffer); }
    const b = fb.buf;
    for (let i = 0; i < W * H; i++) img32[i] = lut[b[i]];
    ctx.putImageData(img, 0, 0);
  };
})(window.PD);

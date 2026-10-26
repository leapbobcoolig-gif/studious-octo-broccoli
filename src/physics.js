// Soft-tissue springs and verlet hair.
(function (PD) {
  'use strict';

  // A damped point mass chasing an anchor, pulled by gravity. The rest offset
  // (g/k) is the natural sag — it follows gravity no matter how the body is
  // oriented, so breasts hang in doggy and settle flatter when lying down.
  class Spring {
    constructor(k, c, g, max) {
      this.k = k; this.c = c; this.g = g; this.max = max;
      this.p = null; this.v = { x: 0, y: 0 }; this.off = { x: 0, y: g / k };
    }
    reset() { this.p = null; this.v = { x: 0, y: 0 }; }
    step(a, dt, scale) {
      const max = this.max * (scale || 1);
      if (!this.p || !isFinite(this.p.x)) this.p = { x: a.x, y: a.y + this.g / this.k };
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const ax = this.k * (a.x - this.p.x) - this.c * this.v.x;
        const ay = this.k * (a.y - this.p.y) - this.c * this.v.y + this.g;
        this.v.x += ax * h; this.v.y += ay * h;
        this.p.x += this.v.x * h; this.p.y += this.v.y * h;
      }
      let ox = this.p.x - a.x, oy = this.p.y - a.y;
      const l = Math.hypot(ox, oy);
      if (l > max) {
        ox *= max / l; oy *= max / l;
        this.p.x = a.x + ox; this.p.y = a.y + oy;
        // drop the outward velocity so it doesn't stick to the wall
        const nx = ox / max, ny = oy / max;
        const vn = this.v.x * nx + this.v.y * ny;
        if (vn > 0) { this.v.x -= vn * nx; this.v.y -= vn * ny; }
      }
      this.off = { x: ox, y: oy };
      return this.off;
    }
    kick(x, y) { this.v.x += x; this.v.y += y; }
  }
  PD.Spring = Spring;

  // Follow-the-leader verlet chain for hair.
  class Hair {
    constructor() { this.pts = null; }
    reset() { this.pts = null; }
    // colliders: [{a, b, r}] capsules the hair drapes over (torso, shoulders)
    step(root, n, seg, dt, head, headR, initDir, colliders) {
      if (!this.pts || this.pts.length !== n + 1) {
        const d = initDir || { x: 0, y: 1 };
        this.pts = [];
        for (let i = 0; i <= n; i++) {
          const x = root.x + d.x * seg * i, y = root.y + d.y * seg * i;
          this.pts.push({ x, y, px: x, py: y });
        }
      }
      const P = this.pts;
      P[0].x = P[0].px = root.x; P[0].y = P[0].py = root.y;
      const g = 420 * dt * dt;
      for (let i = 1; i <= n; i++) {
        const p = P[i];
        const vx = (p.x - p.px) * 0.93, vy = (p.y - p.py) * 0.93;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g;
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i <= n; i++) {
          const a = P[i - 1], b = P[i];
          let dx = b.x - a.x, dy = b.y - a.y;
          const l = Math.hypot(dx, dy) || 1;
          b.x = a.x + dx / l * seg; b.y = a.y + dy / l * seg;
          // bend limit: keep i from folding back onto i-2
          if (i >= 2) {
            const c0 = P[i - 2];
            let ex = b.x - c0.x, ey = b.y - c0.y;
            const el = Math.hypot(ex, ey);
            if (el < seg * 1.75) {
              if (el < 0.01) { ex = a.x - c0.x; ey = a.y - c0.y; }
              const ql = Math.hypot(ex, ey) || 1;
              b.x = c0.x + ex / ql * seg * 1.75; b.y = c0.y + ey / ql * seg * 1.75;
              const fx = b.x - a.x, fy = b.y - a.y, fl = Math.hypot(fx, fy) || 1;
              b.x = a.x + fx / fl * seg; b.y = a.y + fy / fl * seg;
            }
          }
          // keep hair outside the skull
          dx = b.x - head.x; dy = b.y - head.y;
          const hl = Math.hypot(dx, dy) || 1;
          if (hl < headR) { b.x = head.x + dx / hl * headR; b.y = head.y + dy / hl * headR; }
          if (colliders) for (const c of colliders) {
            const ex = c.b.x - c.a.x, ey = c.b.y - c.a.y;
            const L2 = ex * ex + ey * ey || 1;
            let t = ((b.x - c.a.x) * ex + (b.y - c.a.y) * ey) / L2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = b.x - (c.a.x + ex * t), qy = b.y - (c.a.y + ey * t);
            const ql = Math.hypot(qx, qy) || 1;
            if (ql < c.r) { b.x += qx / ql * (c.r - ql); b.y += qy / ql * (c.r - ql); }
          }
          if (b.y > PD.BED_Y + 1) b.y = PD.BED_Y + 1;
        }
      }
      // snap if something teleported
      for (let i = 1; i <= n; i++) {
        const p = P[i];
        if (!isFinite(p.x) || PD.dist(p, root) > seg * n * 1.5) { this.pts = null; return this.step(root, n, seg, dt, head, headR, initDir, colliders); }
      }
      return P;
    }
  }
  PD.Hair = Hair;
})(window.PD);

// Core namespace + tiny 2D vector kit. Everything hangs off window.PD so the
// game runs from a plain file:// double-click (no modules, no build step).
window.PD = {};
(function (PD) {
  'use strict';
  PD.W = 320;
  PD.H = 180;
  PD.BED_Y = 118; // mattress top surface
  PD.SCALE = 1.4; // global character scale (px per rig unit)

  const D2R = Math.PI / 180;
  PD.D2R = D2R;
  PD.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  PD.lerp = (a, b, t) => a + (b - a) * t;
  PD.smooth = (t) => t * t * (3 - 2 * t);
  PD.v = (x, y) => ({ x, y });
  PD.add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  PD.sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  PD.mul = (a, s) => ({ x: a.x * s, y: a.y * s });
  PD.ma = (a, b, s) => ({ x: a.x + b.x * s, y: a.y + b.y * s });
  PD.len = (a) => Math.hypot(a.x, a.y);
  PD.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  PD.norm = (a) => {
    const l = Math.hypot(a.x, a.y) || 1;
    return { x: a.x / l, y: a.y / l };
  };
  PD.dot = (a, b) => a.x * b.x + a.y * b.y;
  PD.vlerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  PD.dir = (deg) => ({ x: Math.cos(deg * D2R), y: Math.sin(deg * D2R) });
  PD.ang = (v) => Math.atan2(v.y, v.x);
  PD.perp = (a) => ({ x: -a.y, y: a.x });
  PD.rnd = (a, b) => a + Math.random() * (b - a);
  PD.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  // Perpendicular of `axis` that points most toward `hint`.
  PD.perpToward = (axis, hint) => {
    const p = { x: -axis.y, y: axis.x };
    return PD.dot(p, hint) >= 0 ? p : { x: -p.x, y: -p.y };
  };
})(window.PD);

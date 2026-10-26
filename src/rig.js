// Character model + skeleton solver (profile view).
//
// A torso is described by: pelvis position, torso angle (pelvis -> chest),
// facing (+1 right / -1 left), and relative bends for chest and head where
// positive always means "curl toward the front". From that we derive three
// frames (pelvis u/f, chest uc/fc, head uh/fh): u = up the spine, f = the way
// the belly/face points. Limbs are solved with 2-bone IK or a kneeling solver.
(function (PD) {
  'use strict';
  const { add, sub, mul, ma, norm, dot, dist, dir, vlerp } = PD;

  PD.DEFAULTS = {
    f: { height: 1, bust: 1.1, butt: 1.15, hips: 1.1, thighs: 1.1, belly: 0.25, skin: 0, hair: 1, hairStyle: 'long',
      legwear: 'fishnet', bra: false, choker: true, sens: 1 },
    m: { height: 1, muscle: 0.6, belly: 0.15, length: 1, girth: 1, skin: 1, hair: 0, hairStyle: 'short', beard: false,
      socks: false, sens: 0.85 },
  };

  PD.makeChar = function (sex, params) {
    const c = { sex, p: Object.assign({}, PD.DEFAULTS[sex], params || {}) };
    c.sp = {
      breast: new PD.Spring(150, 6.5, 300, 5),
      butt: new PD.Spring(230, 8, 70, 3.2),
      belly: new PD.Spring(210, 9, 60, 2.2),
      thighN: new PD.Spring(260, 9, 50, 2),
      thighF: new PD.Spring(260, 9, 50, 2),
      balls: new PD.Spring(85, 4.2, 330, 5),
      shaft: new PD.Spring(320, 9, 30, 2.5),
    };
    c.hair = new PD.Hair();
    c.face = { blinkT: 2 + Math.random() * 3, blink: 0, mouth: 0, mouthT: 0, eyes: 'open', blush: 0 };
    c.arousal = 0.1;
    c.climax = 0;
    PD.refreshDims(c);
    return c;
  };

  PD.refreshDims = function (c) {
    const p = c.p, f = c.sex === 'f';
    const s = (f ? 0.94 : 1.0) * p.height * PD.SCALE;
    c.dims = {
      s,
      spine: (f ? 19.5 : 21) * s,
      chestTop: (f ? 6.4 : 7.2) * s,
      neck: (f ? 3.4 : 3.8) * s,
      headR: (f ? 6.2 : 6.5) * Math.pow(s, 0.82),
      thigh: (f ? 20 : 21.5) * s,
      shin: (f ? 19 : 20.5) * s,
      foot: (f ? 6 : 7) * s,
      uarm: (f ? 12.5 : 14) * s,
      farm: (f ? 11 : 12.5) * s,
      penisL: f ? 0 : 14 * p.length * s,
      girth: f ? 0 : 1.95 * p.girth * Math.pow(s, 0.8),
    };
  };

  function frame(ang, facing) {
    const u = dir(ang);
    const f = { x: -u.y * facing, y: u.x * facing };
    return { u, f };
  }

  // spec: { x, y, ang, bend, head, facing }
  PD.torso = function (c, spec) {
    const D = c.dims;
    const facing = spec.facing;
    const { u, f } = frame(spec.ang, facing);
    const ac = spec.ang + (spec.bend || 0) * facing;
    const { u: uc, f: fc } = frame(ac, facing);
    const ah = ac + (spec.head || 0) * facing;
    const { u: uh, f: fh } = frame(ah, facing);
    const P = { x: spec.x, y: spec.y };
    const Wp = ma(P, u, D.spine * 0.45);
    const C = ma(Wp, uc, D.spine * 0.55);
    const neckBase = ma(C, uc, D.chestTop);
    const Hc = ma(ma(neckBase, uh, D.neck + D.headR * 0.85), fh, 0.6 * D.s);
    const shoulder = ma(ma(C, uc, D.chestTop * 0.62), fc, -0.6 * D.s);
    const hip = ma(ma(P, u, -1.5 * D.s), f, 0.4 * D.s);
    return { P, u, f, Wp, C, uc, fc, neckBase, Hc, uh, fh, shoulder, hip, facing };
  };

  // Build a torso so that the local point (a along u, b along f) lands on `world`.
  PD.torsoAt = function (c, spec, world, local) {
    const { u, f } = frame(spec.ang, spec.facing);
    const P = sub(sub(world, mul(u, local.a)), mul(f, local.b));
    return PD.torso(c, Object.assign({}, spec, { x: P.x, y: P.y }));
  };

  PD.local = (T, a, b) => add(add(T.P, mul(T.u, a)), mul(T.f, b));
  PD.localC = (T, a, b) => add(add(T.C, mul(T.uc, a)), mul(T.fc, b));
  PD.localH = (T, a, b) => add(add(T.Hc, mul(T.uh, a)), mul(T.fh, b));

  // Genital anchors
  PD.baseLocal = (c) => ({ a: -4.6 * c.dims.s, b: 5.0 * c.dims.s });
  PD.entryLocal = (c) => ({ a: -6.4 * c.dims.s, b: 0.6 * c.dims.s });
  PD.penisBase = (c, T) => PD.local(T, PD.baseLocal(c).a, PD.baseLocal(c).b);
  PD.entry = (c, T) => PD.local(T, PD.entryLocal(c).a, PD.entryLocal(c).b);
  PD.inAxis = (T) => norm(add(T.u, mul(T.f, -0.12)));
  PD.erectDir = (T, tilt) => norm(add(T.f, mul(T.u, tilt === undefined ? 0.45 : tilt)));

  // Two-bone IK. Returns {mid, end}; end is clamped to reach.
  PD.ik = function (root, target, l1, l2, hint) {
    let dx = target.x - root.x, dy = target.y - root.y;
    let d = Math.hypot(dx, dy) || 0.001;
    const ux = dx / d, uy = dy / d;
    d = PD.clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
    const a = (l1 * l1 + d * d - l2 * l2) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let px = -uy, py = ux;
    if (px * hint.x + py * hint.y < 0) { px = -px; py = -py; }
    return {
      mid: { x: root.x + ux * a + px * h, y: root.y + uy * a + py * h },
      end: { x: root.x + ux * d, y: root.y + uy * d },
    };
  };

  function footFrom(c, knee, ankle, T, toeDir, point) {
    const shin = norm(sub(ankle, knee));
    let fd;
    if (toeDir) fd = norm(toeDir);
    else {
      fd = PD.perpToward(shin, T.f);
      fd = norm(vlerp(fd, shin, point === undefined ? 0.25 : point));
    }
    return ma(ankle, fd, c.dims.foot);
  }

  // Leg via IK to an ankle target.
  PD.legIK = function (c, T, which, target, hint, toeDir, point) {
    const D = c.dims;
    const hip = which === 'far' ? ma(T.hip, T.u, 0.6) : T.hip;
    const r = PD.ik(hip, target, D.thigh, D.shin, hint || T.f);
    return { hip, knee: r.mid, ankle: r.end, toe: footFrom(c, r.mid, r.end, T, toeDir, point) };
  };

  // Kneeling: knee lands on the bed at kneeY, on side (+1 = right of hip),
  // shin then runs along ankleDir.
  PD.legKneel = function (c, T, which, kneeY, side, ankleDir, toeDir) {
    const D = c.dims;
    const hip = which === 'far' ? ma(T.hip, T.u, 0.6) : T.hip;
    const dy = kneeY - hip.y;
    let knee;
    if (Math.abs(dy) >= D.thigh) knee = { x: hip.x, y: hip.y + Math.sign(dy) * D.thigh };
    else knee = { x: hip.x + side * Math.sqrt(D.thigh * D.thigh - dy * dy), y: kneeY };
    const ankle = ma(knee, norm(ankleDir), D.shin);
    const toe = ma(ankle, norm(toeDir || ankleDir), D.foot * 0.9);
    return { hip, knee, ankle, toe };
  };

  PD.armIK = function (c, T, which, target, hint) {
    const D = c.dims;
    const sh = which === 'far' ? ma(ma(T.shoulder, T.uc, 0.5), T.fc, -0.8) : T.shoulder;
    const h = hint || add(mul(T.fc, -0.8), mul(T.uc, -0.4));
    const r = PD.ik(sh, target, D.uarm, D.farm, h);
    const fa = norm(sub(r.end, r.mid));
    return { sh, el: r.mid, wr: r.end, hand: ma(r.end, fa, 2.3 * D.s) };
  };

  // Deep-ish blend of two skeleton snapshots (used for position transitions).
  PD.blendSkel = function blend(a, b, t) {
    if (a === undefined || a === null) return b;
    if (typeof b === 'number') return typeof a === 'number' ? a + (b - a) * t : b;
    if (typeof b !== 'object' || b === null) return t < 0.5 ? a : b;
    if (typeof b.x === 'number' && typeof b.y === 'number' && Object.keys(b).length === 2)
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const out = Array.isArray(b) ? [] : {};
    for (const key in b) {
      if (key === 'facing') { out[key] = t < 0.5 ? a[key] : b[key]; continue; }
      out[key] = blend(a[key], b[key], t);
    }
    // re-normalise frame vectors
    for (const key of ['u', 'f', 'uc', 'fc', 'uh', 'fh', 'dir'])
      if (out[key] && typeof out[key].x === 'number') {
        const l = Math.hypot(out[key].x, out[key].y);
        out[key] = l > 0.2 ? { x: out[key].x / l, y: out[key].y / l } : b[key];
      }
    return out;
  };

  PD.dist2 = dist;
  PD.dot2 = dot;
})(window.PD);

// Anatomy: turns a solved skeleton into drawable SDF groups.
// Every soft mass (breasts, butt, belly, thighs, balls, shaft, hair) is driven
// by a spring or verlet chain, so motion lags, sags and slaps for free.
(function (PD) {
  'use strict';
  const { add, sub, mul, ma, norm, len, dot, vlerp, ang, perpToward } = PD;
  const cap = PD.cap, ell = PD.ell, C = PD.C;

  const skinRamp = (c) => PD.R[PD.SKIN_RAMPS[c.p.skin] || 'skin0'];
  const hairRamp = (c) => PD.R[PD.HAIR_RAMPS[c.p.hair] || 'hair0'];
  const FLESH = [0, 1, 5, 5, 4, 5];

  // Spring-driven ellipse that stretches along its sag and flattens when it
  // gets pushed into the body (lying on your back).
  function softEll(center, r, off, front, stretch) {
    const ol = len(off);
    if (ol < 0.05) return { c: center, rx: r, ry: r, a: ang(front) };
    const od = mul(off, 1 / ol);
    const into = dot(od, front) < -0.35;
    const k = Math.min(1, ol / r) * (stretch || 0.4);
    const along = r * (into ? 1 - k * 0.6 : 1 + k);
    const across = r * (into ? 1 + k * 0.5 : 1 - k * 0.35);
    return { c: center, rx: along, ry: across, a: ang(od) };
  }

  function legGroup(c, leg, T, far, springs, dt) {
    const D = c.dims, s = D.s, p = c.p, f = c.sex === 'f';
    const { hip, knee, ankle, toe } = leg;
    const thighV = norm(sub(knee, hip)), shinV = norm(sub(ankle, knee));
    const mid = vlerp(hip, ankle, 0.5);
    let out = sub(knee, mid);
    if (len(out) < 0.6) out = T.f;
    const antT = perpToward(thighV, out), postT = mul(antT, -1);
    const postS = perpToward(shinV, mul(out, -1));
    const th = f ? p.thighs : 1 + p.muscle * 0.25;
    const ra = (f ? 6.0 : 6.4) * s * th, rk = (f ? 3.3 : 3.8) * s;
    const sp = far ? springs.thighF : springs.thighN;
    const tAnchor = ma(vlerp(hip, knee, 0.3), postT, 1.5 * th * s);
    const toff = sp.step(tAnchor, dt, th);
    const footV = norm(sub(toe, ankle));
    const prims = [
      cap(hip, vlerp(hip, knee, 0.55), ra, PD.lerp(ra, rk, 0.62)),
      cap(vlerp(hip, knee, 0.55), knee, PD.lerp(ra, rk, 0.62), rk),
      ell(add(tAnchor, toff), D.thigh * 0.3, ra * (f ? 0.74 : 0.6), ang(thighV)),
      cap(knee, ankle, rk, (f ? 1.7 : 2.1) * s),
      ell(ma(vlerp(knee, ankle, 0.3), postS, (f ? 1.3 : 1.7) * s), D.shin * 0.27, (f ? 2.5 : 3.0) * s, ang(shinV)),
      cap(ankle, toe, (f ? 1.8 : 2.1) * s, (f ? 1.15 : 1.5) * s),
      ell(add(ma(ankle, footV, -0.6), mul(postS, 0.4)), 1.8 * s, 1.7 * s, ang(footV)),
    ];
    const paints = [];
    if (f && p.legwear !== 'none') {
      const fat = [cap(hip, knee, 12 * s, 12 * s), cap(knee, ankle, 9 * s, 9 * s), cap(ankle, toe, 6 * s, 6 * s)];
      const bandTop = vlerp(hip, knee, 0.2), bandBot = vlerp(hip, knee, 0.3);
      paints.push({ prims: fat, ramp: PD.R.cloth0, clips: [{ pt: bandTop, n: thighV }, { pt: bandBot, n: mul(thighV, -1) }],
        pat: p.legwear === 'fishnet' ? null : PD.PAT.lace });
      paints.push({ prims: fat, ramp: PD.R.cloth0, clips: [{ pt: bandBot, n: thighV }],
        pat: p.legwear === 'fishnet' ? PD.PAT.fishnet : null });
    }
    if (!f && p.socks) {
      paints.push({ prims: [cap(ma(ankle, shinV, -5 * s), toe, 6 * s, 6 * s)], ramp: PD.R.cloth2,
        clips: [{ pt: ma(ankle, shinV, -5 * s), n: shinV }] });
    }
    return { prims, ramp: skinRamp(c), k: 1.6, bias: far ? -1.2 : 0, paints };
  }

  function armGroup(c, arm, T, far) {
    const D = c.dims, s = D.s, p = c.p, f = c.sex === 'f';
    const mu = f ? 0 : p.muscle;
    const upV = norm(sub(arm.el, arm.sh)), faV = norm(sub(arm.wr, arm.el));
    const prims = [
      cap(arm.sh, arm.el, (f ? 2.5 : 3.0 + mu * 0.7) * s, (f ? 2.0 : 2.4 + mu * 0.3) * s),
      cap(arm.el, arm.wr, (f ? 2.0 : 2.5 + mu * 0.3) * s, (f ? 1.4 : 1.8) * s),
      ell(arm.hand, 2.5 * s, (f ? 1.6 : 1.9) * s, ang(faV)),
    ];
    if (!f && mu > 0.2) prims.push(ell(vlerp(arm.sh, arm.el, 0.45), D.uarm * 0.3, (2.6 + mu * 1.2) * s, ang(upV)));
    return { prims, ramp: skinRamp(c), k: 1.4, bias: far ? -1.2 : 0 };
  }

  // Face stamps in head space: [a (up), b (forward)] integer pixel offsets.
  const EYES_F = {
    open: { d: [[1, -2], [1, -1], [1, 0], [2, -2], [0, -1], [0, 0], [-1, -1]], w: [[-1, 0]] },
    half: { d: [[0, -2], [0, -1], [0, 0], [1, -2], [-1, -1]], w: [[-1, 0]] },
    closed: { d: [[0, -2], [-1, -1], [0, 0], [1, -2]], w: [] },
    rolled: { d: [[1, -2], [1, -1], [1, 0], [2, -2], [0, 0]], w: [[0, -1], [-1, -1], [-1, 0]] },
    heart: { d: [[1, -2], [1, -1], [1, 0]], h: [[0, -1], [0, 0], [-1, -1], [-1, 0], [-2, -1]] },
  };
  const EYES_M = {
    open: { d: [[1, -1], [1, 0], [0, -1], [0, 0]], w: [] },
    half: { d: [[0, -1], [0, 0], [1, -1]], w: [] },
    closed: { d: [[0, -1], [0, 0]], w: [] },
    rolled: { d: [[1, -1], [1, 0], [0, 0]], w: [[0, -1]] },
    heart: { d: [[0, -1], [0, 0]], w: [] },
  };
  const MOUTH = [
    { d: [[0, -1]], l: [[0, 0]] },
    { d: [[0, 0], [-1, 0], [0, -1]], l: [[1, 0], [-2, 0]] },
    { d: [[0, 0], [-1, 0], [-2, 0], [0, -1], [-1, -1]], l: [[1, 0], [-3, 0]], t: [[-2, 0]] },
  ];

  function faceDecal(c, T, hr) {
    const fc = c.face, f = c.sex === 'f';
    const sk = skinRamp(c) * 6, hrm = hairRamp(c) * 6;
    const H = (a, b) => PD.localH(T, a * hr, b * hr);
    return (fb) => {
      const dark = C('ui', 0);
      const up = T.uh, fw = T.fh;
      const at = (pt, a, b, col) => fb.px(pt.x + up.x * a + fw.x * b, pt.y + up.y * a + fw.y * b, col);
      const stamp = (pt, list, col) => { if (list) for (const [a, b] of list) at(pt, a, b, col); };
      // ear
      // brows
      const E = H(0.6, 3.7);
      stamp(E, f ? [[3, -2], [3, -1], [3, 0]] : [[3, -2], [3, -1], [3, 0], [2, 1], [3, 1]], f ? hrm + 1 : hrm);
      // eyes
      const ey = fc.blink > 0 ? 'closed' : fc.eyes;
      const set = (f ? EYES_F : EYES_M)[ey] || EYES_F.open;
      stamp(E, set.w, sk + 4);
      stamp(E, set.d, dark);
      stamp(E, set.h, C('heart', 2));
      // mouth
      const M = H(-3.15, 4.9);
      const mo = MOUTH[Math.max(0, Math.min(2, fc.mouth | 0))];
      stamp(M, mo.d, fc.mouth ? dark : sk + 1);
      if (f) stamp(M, mo.l, sk + 5);
      stamp(M, mo.t, sk + 5);
      // blush
      if (fc.blush > 0.15) {
        const K = H(-1.2, 2.6);
        for (let i = -2; i <= 1; i++) for (let j = -1; j <= 0; j++) {
          const x = Math.round(K.x + fw.x * i + up.x * j), y = Math.round(K.y + fw.y * i + up.y * j);
          if (PD.bayer(x, y) < fc.blush * 0.85) fb.px(x, y, C('heart', 3));
        }
      }
      // sweat bead on the temple
      if (c.arousal > 0.6) { const s2 = H(3.4, 1.0); fb.px(s2.x, s2.y, C('sweat', 2)); fb.px(s2.x, s2.y - 1, C('sweat', 4)); }
    };
  }

  function hairGroups(c, T, hr, dt) {
    const p = c.p, f = c.sex === 'f', D = c.dims;
    const H = (a, b) => PD.localH(T, a * hr, b * hr);
    const aH = ang(T.uh);
    const ramp = hairRamp(c);
    const back = [], front = [];
    if (f) {
      const style = p.hairStyle;
      if (style === 'long' || style === 'pony' || style === 'bob') {
        back.push(ell(H(0.3, -2.3), (style === 'bob' ? 7.2 : 6.4) * hr, (style === 'bob' ? 5.6 : 4.8) * hr, aH));
        const cfg = style === 'long' ? { root: H(0.2, -5.0), n: 6, seg: 5.2 * D.s, r0: 4.2, r1: 1.3 }
          : style === 'pony' ? { root: H(4.0, -5.4), n: 4, seg: 4.4 * D.s, r0: 2.6, r1: 1.0 }
            : { root: H(-1.0, -3.8), n: 2, seg: 3.2 * D.s, r0: 4.2, r1: 3.0 };
        const cols = [
          { a: T.neckBase, b: T.Wp, r: 6.6 * D.s },
          { a: T.shoulder, b: T.C, r: 4.2 * D.s },
          { a: T.Wp, b: T.P, r: 6.2 * D.s * p.hips },
        ];
        const pts = c.hair.step(cfg.root, cfg.n, cfg.seg, dt, T.Hc, D.headR * 1.05, mul(T.uh, -1), cols, { pt: ma(T.Hc, T.fh, -1.5 * hr), n: T.fh });
        for (let i = 0; i < cfg.n; i++) {
          const t0 = i / cfg.n, t1 = (i + 1) / cfg.n;
          back.push(cap(pts[i], pts[i + 1], PD.lerp(cfg.r0, cfg.r1, t0) * hr, PD.lerp(cfg.r0, cfg.r1, t1) * hr));
        }
        if (style === 'pony') front.push(ell(cfg.root, 1.6 * hr, 1.6 * hr, 0));
      }
      front.push(ell(H(4.2, -0.6), 3.7 * hr, 6.7 * hr, aH));
      front.push(ell(H(4.1, 4.0), 1.7 * hr, 1.8 * hr, aH));
    } else {
      const style = p.hairStyle;
      if (style !== 'bald') {
        front.push(ell(H(4.6, -1.2), (style === 'buzz' ? 2.6 : 3.0) * hr, 6.2 * hr, aH));
        front.push(ell(H(1.4, -3.6), 4.4 * hr, 3.0 * hr, aH));
        if (style === 'messy') {
          front.push(ell(H(6.2, -2.4), 1.8 * hr, 1.6 * hr, aH + 0.6));
          front.push(ell(H(6.6, 0.8), 1.6 * hr, 1.4 * hr, aH - 0.4));
          front.push(ell(H(4.6, 4.0), 1.6 * hr, 1.6 * hr, aH));
        }
      }
    }
    return {
      hairBack: { prims: back, ramp, k: 1.6, bias: -0.6 },
      hairFront: { prims: front, ramp, k: 1.6, decal: f && p.hairStyle === 'pony' ? (fb) => {
        const r = PD.localH(T, 4.0 * hr, -5.4 * hr); fb.px(r.x, r.y, C('cloth1', 3));
      } : null },
    };
  }

  // Build every group for one character. sk = { T, legs, arms, penis?, E? }
  PD.buildBody = function (c, sk, dt, st) {
    const T = sk.T, D = c.dims, s = D.s, p = c.p, f = c.sex === 'f';
    const hr = D.headR / 6.2;
    const aU = ang(T.u), aC = ang(T.uc), aH = ang(T.uh);
    const L = (a, b) => PD.local(T, a, b), LC = (a, b) => PD.localC(T, a, b), LH = (a, b) => PD.localH(T, a * hr, b * hr);
    const G = {};
    const sp = c.sp;
    const anchors = {};

    // --- torso ---
    const prims = [];
    const paints = [];
    if (f) {
      const hp = p.hips, bt = p.butt, bl = p.belly;
      const bA = L(-0.5 * s, -4.2 * s * bt);
      const bo = sp.butt.step(bA, dt, bt);
      anchors.butt = { pt: bA, sp: sp.butt };
      const beA = L(6 * s, (2 + bl * 1.5) * s);
      const beo = sp.belly.step(beA, dt, 0.5 + bl);
      prims.push(
        ell(L(0.5 * s, 0), 7.2 * s, 6.4 * s * hp, aU),
        ell(add(bA, bo), 6.4 * s * bt, 6.1 * s * bt, aU),
        cap(L(3 * s, 0.3 * s), LC(-4 * s, 0), 5.0 * s * (0.9 + 0.1 * hp), 5.8 * s),
        ell(add(beA, beo), 5.2 * s, (3.4 + bl * 2.4) * s, aU),
        ell(T.C, 7.4 * s, 6.0 * s, aC),
        ell(T.shoulder, 3.6 * s, 3.4 * s, aC),
        cap(T.neckBase, LH(-3.4, -0.8), 2.4 * s, 2.2 * s),
      );
      if (p.choker) {
        const nk = vlerp(T.neckBase, LH(-3.4, -0.8), 0.45);
        paints.push({ prims: [cap(ma(nk, T.fh, -5), ma(nk, T.fh, 5), 1.0, 1.0)], ramp: PD.R.cloth0 });
      }
    } else {
      const mu = p.muscle, be = p.belly;
      const bA = L(-0.5 * s, -3.8 * s);
      const bo = sp.butt.step(bA, dt, 0.8);
      anchors.butt = { pt: bA, sp: sp.butt };
      const beA = L(6.5 * s, (2.2 + be * 2.5) * s);
      const beo = sp.belly.step(beA, dt, 0.3 + be * 1.4);
      prims.push(
        ell(L(0.5 * s, 0), 7.4 * s, 6.6 * s, aU),
        ell(add(bA, bo), 5.0 * s, 4.6 * s, aU),
        cap(L(3 * s, 0.3 * s), LC(-4 * s, 0), (6.4 + mu * 0.6) * s, (7.2 + mu) * s),
        ell(add(beA, beo), 5.8 * s, (3.6 + be * 3.8) * s, aU),
        ell(T.C, 8.4 * s, (7.0 + mu * 0.8) * s, aC),
        ell(LC(1.6 * s, (4.4 + mu * 0.8) * s), (3.4 + mu * 1.2) * s, (2.6 + mu * 0.9) * s, aC),
        ell(T.shoulder, (4.2 + mu * 1.2) * s, (4.0 + mu) * s, aC),
        cap(T.neckBase, LH(-3.4, -0.6), 3.2 * s, 3.0 * s),
      );
      paints.push({ prims: [ell(L(-4 * s, 4.6 * s), 2.8 * s, 3.2 * s, aU)], ramp: hairRamp(c), pat: PD.PAT.hair });
    }
    // hips blend into thighs
    for (const which of ['near', 'far']) {
      const lg = sk.legs[which];
      prims.push(cap(lg.hip, vlerp(lg.hip, lg.knee, 0.35), (f ? 6.0 * p.thighs : 6.4) * s, (f ? 5.4 * p.thighs : 5.8) * s));
    }
    G.body = { prims, ramp: skinRamp(c), k: 2.2, paints };
    // Head is its own tight group: crisp profile (brow, pointed nose, lips, chin) and a
    // jawline that outlines against the neck.
    const R = D.headR;
    const headPrims = f ? [
      ell(T.Hc, R * 1.02, R * 0.9, aH),
      ell(LH(-1.4, 2.0), 4.4 * hr, 3.7 * hr, aH),
      cap(LH(-4.0, 3.2), LH(-2.0, -1.8), 1.6 * hr, 1.5 * hr),
      ell(LH(-4.5, 3.9), 1.6 * hr, 1.7 * hr, aH),
      cap(LH(0.6, 5.5), LH(-0.9, 6.9), 0.8 * hr, 0.35 * hr),
      ell(LH(-2.7, 5.5), 0.7 * hr, 0.75 * hr, aH),
      ell(LH(-3.6, 5.2), 0.75 * hr, 0.8 * hr, aH),
    ] : [
      ell(T.Hc, R * 1.02, R * 0.92, aH),
      ell(LH(-1.4, 2.2), 4.6 * hr, 3.9 * hr, aH),
      cap(LH(-4.3, 3.0), LH(-2.0, -2.0), 2.1 * hr, 1.9 * hr),
      ell(LH(-4.7, 3.8), 2.1 * hr, 2.0 * hr, aH),
      cap(LH(0.8, 5.7), LH(-1.0, 7.2), 1.0 * hr, 0.55 * hr),
      ell(LH(-3.4, 5.6), 0.7 * hr, 0.7 * hr, aH),
      ell(LH(2.4, 5.0), 1.0 * hr, 1.2 * hr, aH),
    ];
    const facePaints = [];
    if (!f && p.beard) facePaints.push({ prims: [ell(LH(-3.4, 1.6), 3.4 * hr, 4.8 * hr, aH)], ramp: hairRamp(c), pat: PD.PAT.stubble });
    G.face = { prims: headPrims, ramp: skinRamp(c), k: 1.0, paints: facePaints, decal: faceDecal(c, T, hr) };
    G.ear = {
      prims: [ell(LH(-0.4, -0.9), 2.0 * hr, 1.35 * hr, aH)], ramp: skinRamp(c), k: 1,
      decal: (fb) => { const e = LH(-0.4, -0.7); fb.px(e.x, e.y, skinRamp(c) * 6 + 1); const e2 = LH(0.6, -0.7); fb.px(e2.x, e2.y, skinRamp(c) * 6 + 1); },
    };

    // --- breasts ---
    if (f) {
      const bu = p.bust;
      const r = 4.7 * s * Math.pow(bu, 0.85);
      const A = LC(0.9 * s, 3.4 * s * Math.sqrt(bu));
      const off = sp.breast.step(A, dt, bu);
      anchors.breast = { pt: A, sp: sp.breast };
      const center = add(ma(A, T.fc, r * 0.35), off);
      const se = softEll(center, r, off, T.fc, 0.45);
      const bra = p.bra ? [{ prims: [ell(se.c, se.rx * 1.2, se.ry * 1.2, se.a)], ramp: PD.R.cloth0, pat: PD.PAT.lace }] : null;
      G.farBreast = {
        prims: [ell(ma(ma(se.c, T.uc, 1.4 * s), T.fc, -0.6 * s), se.rx * 0.95, se.ry * 0.95, se.a)],
        ramp: skinRamp(c), k: 1.5, bias: -1.2, paints: bra,
      };
      const od = len(off) > 0.05 ? norm(off) : { x: 0, y: 1 };
      const nd = norm(add(T.fc, mul(od, 0.5)));
      const rr = (se.rx + se.ry) * 0.5;
      G.breast = {
        prims: [ell(se.c, se.rx, se.ry, se.a)], ramp: skinRamp(c), k: 1.5, paints: bra,
        decal: p.bra ? (fb) => {
          const top = ma(se.c, T.uc, rr * 0.9);
          fb.line(top.x, top.y, T.shoulder.x, T.shoulder.y, C('cloth0', 2));
        } : (fb) => {
          const sk2 = skinRamp(c) * 6;
          const np = ma(se.c, nd, rr - 1.0);
          const side = PD.perp(nd);
          fb.px(np.x, np.y, sk2 + 5);
          fb.px(np.x - nd.x, np.y - nd.y, sk2 + 5);
          fb.px(np.x + side.x, np.y + side.y, sk2 + 5);
          fb.px(np.x + nd.x * 1.2, np.y + nd.y * 1.2, sk2 + 5);
        },
      };
    }

    // --- genitals ---
    if (!f && sk.penis) {
      const pn = sk.penis;
      const g = D.girth;
      let dirv = pn.dir;
      const free = pn.vis >= pn.L - 0.6;
      if (free) {
        const tip = ma(pn.B, dirv, pn.L);
        const o = sp.shaft.step(tip, dt);
        dirv = norm(sub(add(tip, o), pn.B));
      } else sp.shaft.reset();
      const vis = Math.max(0, Math.min(pn.L, pn.vis));
      const pr = [cap(ma(pn.B, dirv, -1.5), ma(pn.B, dirv, vis), g, g * 0.94)];
      const pp = [];
      if (free) {
        const gc = ma(pn.B, dirv, pn.L - 1.2);
        pr.push(ell(gc, 2.4 * g / 1.95, g * 1.12, ang(dirv)));
        pp.push({ prims: [ell(gc, 2.5 * g / 1.95, g * 1.3, ang(dirv))], ramp: skinRamp(c), map: FLESH,
          clips: [{ pt: ma(pn.B, dirv, pn.L - 2.6), n: dirv }] });
      }
      const sideV = perpToward(dirv, T.u);
      G.penis = {
        prims: pr, ramp: skinRamp(c), k: 1.2, paints: pp,
        decal: (fb) => {
          const sk2 = skinRamp(c) * 6;
          for (let t = 0.25; t < Math.min(vis / pn.L, 0.75); t += 0.18) {
            const q = ma(ma(pn.B, dirv, pn.L * t), sideV, g * 0.35 * Math.sin(t * 17));
            fb.px(q.x, q.y, sk2 + 1);
          }
          if (st && st.wet > 0.2) for (let t = 0.15; t < vis / pn.L; t += 0.22) {
            const q = ma(ma(pn.B, dirv, pn.L * t), sideV, g * 0.6);
            if (PD.bayer(Math.round(q.x), Math.round(q.y)) < st.wet) fb.px(q.x, q.y, sk2 + 4);
          }
        },
      };
      const bA = L(-6.2 * s, 3.4 * s);
      const bo = sp.balls.step(bA, dt, Math.sqrt(p.girth));
      anchors.balls = { pt: bA, sp: sp.balls };
      const rb = 3.2 * s * Math.sqrt(p.girth);
      const se = softEll(add(bA, bo), rb, bo, T.f, 0.35);
      G.balls = {
        prims: [ell(ma(ma(se.c, T.f, 1.2), T.u, 0.4), se.rx * 0.92, se.ry * 0.92, se.a), ell(se.c, se.rx, se.ry, se.a)],
        ramp: skinRamp(c), k: 1.4, bias: -0.4,
        paints: [{ prims: [ell(ma(se.c, T.u, rb * 0.6), rb * 0.9, rb * 0.7, se.a)], ramp: hairRamp(c), pat: (x, y) => PD.bayer(x, y) < 0.18 }],
      };
    }
    if (f && sk.E) {
      const E = sk.E;
      G.face0 = null;
      G.vulva = { prims: [], decal: (fb) => {
        const sk2 = skinRamp(c) * 6;
        const a = PD.inAxis(T);
        fb.px(E.x, E.y, sk2 + 5);
        fb.px(E.x + a.x, E.y + a.y, sk2 + 1);
        if (st && st.creamW > 0) {
          const d = ma(E, { x: 0, y: 1 }, 1);
          fb.px(d.x, d.y, C('fluid', 3));
        }
      } };
    }

    // --- limbs ---
    G.nearLeg = legGroup(c, sk.legs.near, T, false, sp, dt);
    G.farLeg = legGroup(c, sk.legs.far, T, true, sp, dt);
    G.nearArm = armGroup(c, sk.arms.near, T, false);
    G.farArm = armGroup(c, sk.arms.far, T, true);
    Object.assign(G, hairGroups(c, T, hr, dt));

    c.anchors = anchors;
    c.headPt = T.Hc;
    return G;
  };
})(window.PD);

// Positions. Each solve() poses both bodies for the current stroke depth.
// One body is the anchor; the other is placed so the penis base / entry line
// up, which keeps penetration glued together at any speed or body size.
//
// k = { depth 0..1, bedOff, t, intensity, breathW, breathM, archW, headW, headM, shakeW, recoil }
(function (PD) {
  'use strict';
  const { add, sub, mul, ma, norm, vlerp } = PD;

  function penisRig(m, mT, aimTo, natural) {
    const B = PD.penisBase(m, mT);
    const L = m.dims.penisL;
    if (aimTo) {
      const d = sub(aimTo, B);
      const l = Math.hypot(d.x, d.y) || 1;
      return { B, dir: { x: d.x / l, y: d.y / l }, L, vis: Math.min(L, l) };
    }
    return { B, dir: natural, L, vis: L };
  }

  function rideSolve(S, k, reverse) {
    const { m, w } = S;
    const by = PD.BED_Y + k.bedOff;
    const L = m.dims.penisL;
    const mT = PD.torso(m, {
      x: 141, y: by - 4.9 * m.dims.s - k.depth * 1.4 * k.amp, ang: 180, bend: 4 + k.breathM, head: 16 + k.headM * -20, facing: 1,
    });
    const B = PD.penisBase(m, mT);
    const pdir = PD.erectDir(mT, reverse ? -0.12 : 0.32);
    const ins = k.depth * L * 0.88;
    const E = ma(B, pdir, L - ins);
    const facing = reverse ? 1 : -1;
    const lean = 10 + k.intensity * 8 + k.depth * 3;
    const wang = -90 + (reverse ? lean : -lean);
    const wT = PD.torsoAt(w, {
      ang: wang, bend: (reverse ? 4 : 9) + k.breathW - k.archW, head: (reverse ? -6 : 14) - k.headW, facing,
    }, E, PD.entryLocal(w));
    // shake on climax
    if (k.shakeW) { const j = { x: PD.rnd(-0.6, 0.6), y: PD.rnd(-0.4, 0.4) }; for (const key of ['P', 'Wp', 'C', 'neckBase', 'Hc', 'shoulder', 'hip']) wT[key] = add(wT[key], mul(j, k.shakeW)); }

    const mLegs = {
      near: PD.legIK(m, mT, 'near', { x: mT.P.x + 38 * m.dims.s, y: by - 2.6 }, mT.f),
      far: PD.legIK(m, mT, 'far', { x: mT.P.x + 40 * m.dims.s, y: by - 3.3 }, mT.f),
    };
    const wLegs = {
      near: PD.legKneel(w, wT, 'near', by - 3, facing * 0.9, { x: -facing, y: 0.06 }, { x: -facing, y: 0.3 }),
      far: PD.legKneel(w, wT, 'far', by - 4, facing * 0.8, { x: -facing, y: 0.02 }, { x: -facing, y: 0.25 }),
    };
    let wArms;
    if (!reverse) {
      wArms = {
        near: PD.armIK(w, wT, 'near', ma(ma(mT.C, mT.f, 6.5), mT.u, -1), { x: -facing, y: 0.2 }),
        far: PD.armIK(w, wT, 'far', ma(ma(mT.C, mT.f, 6.5), mT.u, 3), { x: -facing, y: 0.2 }),
      };
    } else {
      wArms = {
        near: PD.armIK(w, wT, 'near', add(vlerp(mLegs.near.hip, mLegs.near.knee, 0.75), { x: 0, y: -3.5 * m.dims.s }), { x: -facing, y: 0 }),
        far: PD.armIK(w, wT, 'far', add(vlerp(mLegs.far.hip, mLegs.far.knee, 0.7), { x: 0, y: -3.8 * m.dims.s }), { x: -facing, y: 0 }),
      };
    }
    const mArms = {
      near: PD.armIK(m, mT, 'near', vlerp(wLegs.near.hip, wLegs.near.knee, 0.55), { x: 0.3, y: 1 }),
      far: PD.armIK(m, mT, 'far', vlerp(wLegs.far.hip, wLegs.far.knee, 0.45), { x: 0.3, y: 1 }),
    };
    return {
      m: { T: mT, legs: mLegs, arms: mArms, penis: { B, dir: pdir, L, vis: L - ins } },
      w: { T: wT, legs: wLegs, arms: wArms, E },
      entry: E,
    };
  }

  function missionarySolve(S, k) {
    const { m, w } = S;
    const by = PD.BED_Y + k.bedOff;
    const L = m.dims.penisL;
    const push = k.depth * 1.2 * k.amp;
    const wT = PD.torso(w, {
      x: 137 - push, y: by - 4.8 * w.dims.s, ang: 183, bend: 5 + k.breathW - k.archW, head: 22 - k.headW, facing: 1,
    });
    if (k.shakeW) { const j = { x: PD.rnd(-0.5, 0.5), y: PD.rnd(-0.5, 0.5) }; for (const key of ['Wp', 'C', 'neckBase', 'Hc', 'shoulder']) wT[key] = add(wT[key], mul(j, k.shakeW)); }
    const E = PD.entry(w, wT);
    const ax = PD.inAxis(wT);
    const ins = k.depth * L * 0.88;
    const B = ma(E, ax, -(L - ins));
    const mT = PD.torsoAt(m, {
      ang: -154 + k.depth * 4 * k.amp, bend: 4 + k.breathM, head: 6 + k.headM * -25, facing: -1,
    }, B, PD.baseLocal(m));
    const mLegs = {
      near: PD.legIK(m, mT, 'near', { x: mT.P.x + 30 * m.dims.s, y: by - 2.4 }, { x: 0, y: 1 }, null, 0.6),
      far: PD.legIK(m, mT, 'far', { x: mT.P.x + 32 * m.dims.s, y: by - 3.2 }, { x: 0, y: 1 }, null, 0.6),
    };
    const mArms = {
      near: PD.armIK(m, mT, 'near', { x: wT.C.x - 5 * w.dims.s, y: by - 1.5 }, { x: 1, y: -0.2 }),
      far: PD.armIK(m, mT, 'far', { x: wT.C.x - 2 * w.dims.s, y: by - 2.5 }, { x: 1, y: -0.2 }),
    };
    const wLegs = {
      near: PD.legIK(w, wT, 'near', add(mT.P, { x: 8 * m.dims.s, y: -6 * m.dims.s }), wT.f, null, 0.5),
      far: PD.legIK(w, wT, 'far', add(mT.P, { x: 3 * m.dims.s, y: (-24 - 2 * Math.sin(k.t * 1.3)) * m.dims.s }), wT.f, null, 0.7),
    };
    const wArms = {
      near: PD.armIK(w, wT, 'near', ma(mT.shoulder, mT.uc, 1.5), { x: 0.2, y: 1 }),
      far: PD.armIK(w, wT, 'far', ma(mT.C, mT.fc, -5), { x: 0.2, y: 1 }),
    };
    return {
      m: { T: mT, legs: mLegs, arms: mArms, penis: { B, dir: ax, L, vis: L - ins } },
      w: { T: wT, legs: wLegs, arms: wArms, E },
      entry: E,
    };
  }

  function doggySolve(S, k) {
    const { m, w } = S;
    const by = PD.BED_Y + k.bedOff;
    const L = m.dims.penisL;
    const rock = k.recoil;
    const wT = PD.torso(w, {
      x: 176 - rock, y: by - 22.5 * w.dims.s, ang: 170, bend: 6 + k.breathW + k.archW * 0.5, head: -58 - k.headW * 0.6, facing: -1,
    });
    if (k.shakeW) { const j = { x: PD.rnd(-0.6, 0.6), y: PD.rnd(-0.4, 0.4) }; for (const key of ['C', 'neckBase', 'Hc', 'shoulder']) wT[key] = add(wT[key], mul(j, k.shakeW)); }
    const E = PD.entry(w, wT);
    const ax = PD.inAxis(wT);
    const ins = k.depth * L * 0.88;
    const B = ma(E, ax, -(L - ins));
    const mT = PD.torsoAt(m, {
      ang: -101 - k.depth * 5 * k.amp, bend: 7 + k.breathM, head: 18 + k.headM * -40, facing: -1,
    }, B, PD.baseLocal(m));
    const wLegs = {
      near: PD.legKneel(w, wT, 'near', by - 3, -0.6, { x: 1, y: 0.04 }, { x: 1, y: 0.2 }),
      far: PD.legKneel(w, wT, 'far', by - 3.8, -0.3, { x: 1, y: 0.0 }, { x: 1, y: 0.15 }),
    };
    const wArms = {
      near: PD.armIK(w, wT, 'near', { x: wT.C.x - 4 * w.dims.s, y: by - 1.6 }, { x: 1, y: 0 }),
      far: PD.armIK(w, wT, 'far', { x: wT.C.x - 1.5 * w.dims.s, y: by - 2.4 }, { x: 1, y: 0 }),
    };
    const mLegs = {
      near: PD.legKneel(m, mT, 'near', by - 3, -1, { x: 1, y: 0.05 }, { x: 1, y: 0.2 }),
      far: PD.legKneel(m, mT, 'far', by - 3.8, -1, { x: 1, y: 0.0 }, { x: 1, y: 0.15 }),
    };
    const mArms = {
      near: PD.armIK(m, mT, 'near', ma(ma(wT.Wp, wT.f, -2.5 * w.dims.s), wT.u, -1 * w.dims.s), { x: 0.6, y: 1 }),
      far: PD.armIK(m, mT, 'far', ma(ma(wT.Wp, wT.f, -2.0 * w.dims.s), wT.u, 1.5 * w.dims.s), { x: 0.6, y: 1 }),
    };
    return {
      m: { T: mT, legs: mLegs, arms: mArms, penis: { B, dir: ax, L, vis: L - ins } },
      w: { T: wT, legs: wLegs, arms: wArms, E },
      entry: E,
    };
  }

  // Her near leg goes *behind* the shaft so the shaft stays on show in profile.
  const ORDER_RIDE = ['m.hairBack', 'm.farArm', 'm.farLeg', 'w.farLeg', 'm.body', 'm.face', 'm.hairFront', 'm.nearLeg',
    'w.farArm', 'w.hairBack', 'w.nearLeg', 'm.balls', 'm.penis', 'w.farBreast', 'w.body', 'w.vulva', 'w.face',
    'w.nearArm', 'w.breast', 'w.hairFront', 'm.nearArm'];

  PD.POSITIONS = {
    cowgirl: {
      label: 'COWGIRL', short: 'RIDE', solve: (S, k) => rideSolve(S, k, false), order: ORDER_RIDE,
      speaker: 'w', impactRatio: 0.45, pillowTilt: 0.05,
    },
    reverse: {
      label: 'REVERSE', short: 'REVRS', solve: (S, k) => rideSolve(S, k, true), order: ORDER_RIDE,
      speaker: 'w', impactRatio: 0.45, pillowTilt: 0.05,
    },
    missionary: {
      label: 'MISSIONARY', short: 'MISSN', solve: missionarySolve,
      order: ['w.hairBack', 'w.farArm', 'w.farLeg', 'm.farLeg', 'm.farArm', 'w.farBreast', 'w.body', 'w.vulva', 'w.face',
        'w.breast', 'w.hairFront', 'm.hairBack', 'm.body', 'm.face', 'm.hairFront', 'm.nearLeg', 'w.nearLeg', 'm.balls',
        'm.penis', 'm.nearArm', 'w.nearArm'],
      speaker: 'w', impactRatio: 0.45, pillowTilt: -0.04,
    },
    doggy: {
      label: 'DOGGY', short: 'DOGGY', solve: doggySolve,
      order: ['w.hairBack', 'w.farArm', 'w.farLeg', 'm.farLeg', 'm.farArm', 'm.hairBack', 'm.balls', 'm.penis',
        'm.body', 'm.face', 'm.hairFront', 'w.farBreast', 'w.body', 'w.vulva', 'w.face', 'w.breast', 'w.hairFront',
        'w.nearLeg', 'w.nearArm', 'm.nearLeg', 'm.nearArm'],
      speaker: 'w', impactRatio: 0.45, pillowTilt: 0,
    },
  };
  PD.POS_KEYS = ['cowgirl', 'reverse', 'missionary', 'doggy'];
})(window.PD);

// Boot, loop, scenes, sandbox compositing, input.
(function (PD) {
  'use strict';
  const C = PD.C, W = PD.W, H = PD.H;

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const fb = new PD.FB();
  PD.bindInput(canvas);

  const S = { w: PD.makeChar('f'), m: PD.makeChar('m') };
  const D = new PD.Director(S);
  const app = {
    get palette() { return PD.Settings.palette; },
    set palette(v) { PD.Settings.palette = v; PD.saveSettings(); },
    lampOn: true, uiHidden: false,
    toggleUI() { app.uiHidden = !app.uiHidden; stage.classList.toggle('noui', app.uiHidden); },
    sync() { ui.sync(); },
    toMenu() { PD.SM.go('menu'); },
  };
  const ui = PD.UI_SANDBOX(stage, D, S, app);
  PD.UI.sfx = (k) => PD.Audio.ui(['hover', 'nav', 'click'][k]);
  let creakFlip = false;
  D.onImpact = (s) => {
    PD.Audio.slap(s, D.wetness);
    if (D.speed > 1.6 && (creakFlip = !creakFlip)) PD.Audio.creak();
  };

  // URL params for previews / tests (?pos=doggy&t=3&palette=color&speed=2 opens the sandbox directly)
  const q = new URLSearchParams(location.search);
  if (q.get('palette')) PD.Settings.palette = q.get('palette');
  if (q.get('pos')) { D.pos = q.get('pos'); }
  if (q.get('speed')) D.userSpeed = parseFloat(q.get('speed'));
  if (q.get('stroke')) D.stroke = parseFloat(q.get('stroke'));
  if (q.get('arousal')) S.w.arousal = S.m.arousal = parseFloat(q.get('arousal'));
  if (q.get('seed') === 'rand') PD.randomize(S);

  function resize() {
    const aw = Math.max(100, innerWidth - 16), ah = Math.max(60, innerHeight - 4);
    const sc = Math.min(aw / W, ah / H);
    stage.style.width = W * sc + 'px';
    stage.style.height = H * sc + 'px';
    stage.style.setProperty('--u', sc + 'px');
  }
  addEventListener('resize', resize);
  resize();

  // ---------- sandbox (the dollhouse) ----------
  function hud() {
    const bar = (y, label, v, ramp) => {
      PD.text(fb, label, 4, y, C('ui', 4), C('ui', 0));
      fb.rect(19, y, 46, 5, C('ui', 0));
      fb.rect(20, y + 1, 44, 3, C('ui', 1));
      fb.rect(20, y + 1, Math.round(44 * v), 3, C(ramp, 2));
      fb.rect(20, y + 1, Math.round(44 * v), 1, C(ramp, 4));
      if (v > 0.85 && Math.sin(D.t * 12) > 0) PD.sprite(fb, PD.HEART, 68, y, C('heart', 3), C('ui', 0));
    };
    bar(4, 'HER', S.w.arousal, 'heart');
    bar(12, 'HIM', S.m.arousal, 'sweat');
    const label = PD.POSITIONS[D.pos].label + '  X' + D.speed.toFixed(1) + (D.auto ? '  AUTO' : '') + (D.paused ? '  STOP' : '');
    const tw = PD.textWidth(label);
    const bx = Math.round(W / 2 - tw / 2 - 6);
    fb.rect(bx, 168, tw + 12, 10, C('ui', 0));
    fb.rect(bx + 1, 169, tw + 10, 8, C('ui', 1));
    PD.text(fb, label, bx + 6, 171, C('ui', 4));
  }

  const PORT = new Uint8Array(32 * 32);
  function portrait() {
    const h = S.m.headPt;
    if (!h) return;
    const sx = Math.round(h.x - 12), sy = Math.round(h.y - 11);
    for (let j = 0; j < 24; j++) for (let i = 0; i < 24; i++) PORT[j * 24 + i] = fb.get(sx + i, sy + j);
    const ox = 3, oy = 125;
    fb.rect(ox - 2, oy - 2, 52, 52, C('ui', 0));
    fb.rect(ox - 1, oy - 1, 50, 50, C('frame', 3));
    for (let j = 0; j < 24; j++) for (let i = 0; i < 24; i++) fb.rect(ox + i * 2, oy + j * 2, 2, 2, PORT[j * 24 + i]);
    PD.text(fb, 'HIM', ox + 1, oy + 1, C('ui', 4), C('ui', 0));
  }

  let lastDt = 1 / 60;
  function drawSandbox() {
    const st = { bedOff: D.bedOff, wet: D.fx.wet, lampOn: app.lampOn };
    PD.drawRoom(fb, D.t, st);
    PD.drawBed(fb, D.t, st);
    PD.drawPillow(fb, st, PD.POSITIONS[D.pos].pillowTilt);
    const sk = D.skel;
    if (sk) {
      const dt = Math.min(1 / 30, lastDt);
      const G = {
        w: PD.buildBody(S.w, sk.w, dt, { creamW: D.cream }),
        m: PD.buildBody(S.m, sk.m, dt, { wet: D.wetness }),
      };
      for (const name of PD.POSITIONS[D.pos].order) {
        const [who, part] = name.split('.');
        const g = G[who][part];
        if (!g) continue;
        g.clipY = PD.BED_Y + D.bedOff + 2.5; // flesh sinks into the mattress
        if (!g.prims.length) { if (g.decal) g.decal(fb); } else PD.drawGroup(fb, g);
        if (part === 'hairFront' && G[who].ear) { G[who].ear.clipY = g.clipY; PD.drawGroup(fb, G[who].ear); }
      }
    }
    PD.drawBedFront(fb, D.t, st);
    D.fx.draw(fb);
    if (D.flash > 0) fb.drect(0, 0, W, H, C('ui', 4), D.flash * 0.7);
    if (!app.uiHidden) { hud(); portrait(); }
  }

  PD.SM.scenes.sandbox = {
    ownCursor: true,
    enter() { stage.classList.add('sandbox'); },
    update(dt) {
      if (PD.UI.back) { stage.classList.remove('sandbox'); PD.SM.go('menu'); return; }
      D.update(dt);
      ui.sync();
    },
    idle(dt) { D.update(dt); },
    draw() { drawSandbox(); },
    poke(x, y) { D.poke(x, y); },
  };
  const _go = PD.SM.go.bind(PD.SM);
  PD.SM.go = function (name, instant) {
    if (name !== 'sandbox' && instant) stage.classList.remove('sandbox');
    return _go(name, instant);
  };

  // ---------- loop ----------
  let last = performance.now();
  function render() {
    PD.SM.draw(fb);
    PD.present(ctx, fb, PD.PALETTES[PD.Settings.palette + (app.lampOn ? '' : 'Dark')] || PD.PALETTES.color);
    const shake = Math.max(PD.SM.cur === 'sandbox' ? D.shake : 0, PD.SM.shake) > 0 && PD.Settings.shake;
    canvas.style.transform = shake ? `translate(calc(var(--u) * ${Math.round(PD.rnd(-1, 1))}), calc(var(--u) * ${Math.round(PD.rnd(-1, 1))}))` : '';
    canvas.classList.toggle('nocursor', PD.SM.cur !== 'sandbox');
  }
  function frame(now) {
    const dt = Math.min(1 / 20, (now - last) / 1000);
    last = now; lastDt = dt;
    PD.SM.update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // sandbox mouse + keys (only active in the sandbox scene)
  canvas.addEventListener('click', (e) => {
    if (PD.SM.cur !== 'sandbox') return;
    const r = canvas.getBoundingClientRect();
    D.poke(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  });
  canvas.addEventListener('wheel', (e) => {
    if (PD.SM.cur !== 'sandbox') return;
    e.preventDefault();
    D.userSpeed = PD.clamp(D.userSpeed + (e.deltaY < 0 ? 0.1 : -0.1), 0, 3.6);
    D.auto = false;
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (PD.SM.cur !== 'sandbox') return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '4') D.setPos(PD.POS_KEYS[+k - 1]);
    else if (k === '[' || k === '-') D.userSpeed = Math.max(0, D.userSpeed - 0.2);
    else if (k === ']' || k === '=' || k === '+') D.userSpeed = Math.min(3.6, D.userSpeed + 0.2);
    else if (k === ' ') { D.paused = !D.paused; e.preventDefault(); }
    else if (k === 'a') D.auto = !D.auto;
    else if (k === 'c') D.climaxNow();
    else if (k === 'r') PD.randomize(S);
    else if (k === 'p') app.palette = app.palette === 'mono' ? 'color' : 'mono';
    else if (k === 'l') app.lampOn = !app.lampOn;
    else if (k === 's') PD.Audio.enable(!PD.Audio.on);
    else if (k === 'h') app.toggleUI();
  });

  // headless test hooks
  PD.debug = {
    D, S, app,
    step(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { lastDt = 1 / 60; PD.SM.update(1 / 60); PD.SM.draw(fb); } render(); },
  };

  // start scene: sandbox for preview URLs, otherwise the 18+ boot screen
  const preview = ['pos', 't', 'phase', 'seed', 'to'].some((k) => q.has(k)) || q.get('scene') === 'sandbox';
  const startScene = q.get('scene') && q.get('scene') !== 'sandbox' ? q.get('scene') : preview ? 'sandbox' : q.get('gate') === '0' ? 'title' : 'boot';
  PD.SM.go(startScene, true);
  // warm-up so springs/hair settle before the first visible frame
  for (let i = 0; i < 90; i++) { lastDt = 1 / 60; D.update(1 / 60); }
  if (startScene === 'sandbox') { stage.classList.add('sandbox'); drawSandbox(); }
  if (q.get('t')) PD.debug.step(parseFloat(q.get('t')));
  if (q.get('to')) { D.setPos(q.get('to')); PD.debug.step(parseFloat(q.get('tt') || '0.45')); }
  if (q.get('phase')) { D.phase = parseFloat(q.get('phase')); D.speed = D.userSpeed; D.update(0.001); }
  render();
  if (q.get('static') !== '1') requestAnimationFrame(frame);
})(window.PD);

// In-canvas pixel UI kit (immediate mode).
// Every frame a scene calls UI.begin(), draws widgets (which also handle input),
// then UI.end(). Mouse + keyboard (arrows / WASD + Enter / Space, Esc = back).
(function (PD) {
  'use strict';
  const C = PD.C, W = PD.W, H = PD.H;
  const bayer = PD.bayer;

  // ---------- input ----------
  const IN = { mx: -99, my: -99, down: false, pressed: false, released: false, keys: {}, typed: [], moved: false };
  PD.INPUT = IN;
  PD.bindInput = function (canvas) {
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      IN.mx = ((e.clientX - r.left) / r.width) * W;
      IN.my = ((e.clientY - r.top) / r.height) * H;
    };
    canvas.addEventListener('pointermove', (e) => { pos(e); IN.moved = true; });
    canvas.addEventListener('pointerdown', (e) => { pos(e); IN.down = true; IN.pressed = true; });
    addEventListener('pointerup', () => { if (IN.down) IN.released = true; IN.down = false; });
    canvas.addEventListener('pointerleave', () => { IN.mx = -99; IN.my = -99; });
    addEventListener('keydown', (e) => {
      if (e.repeat && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      IN.typed.push(e.key);
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.target.closest('input')) e.preventDefault();
    });
  };
  const keyHit = (...names) => IN.typed.some((k) => names.includes(k));

  // ---------- big pixel text ----------
  // scale: pixel size per font pixel. colFn(i) lets each letter get its own colour.
  PD.textS = function (fb, str, x, y, scale, col, opt) {
    const o = opt || {};
    const sc = scale | 0 || 1;
    const glyphs = PD.GLYPHS;
    const width = PD.textWidth(str) * sc;
    let cx = Math.round(o.center ? x - width / 2 : x);
    y = Math.round(y);
    const letters = [];
    let i = 0;
    for (const ch of str) {
      const g = glyphs[ch] || glyphs[' '];
      letters.push({ g, x: cx, i: i++ });
      cx += (g[0].length + 1) * sc;
    }
    const plot = (lx, ly, gy, c, dx, dy, grow) => {
      fb.rect(lx + dx - grow, ly + dy - grow, sc + grow * 2, sc + grow * 2, c);
    };
    const pass = (dx, dy, cfn, grow) => {
      for (const L of letters) {
        const bob = o.wave ? Math.round(Math.sin(o.t * 6 + L.i * 0.7) * o.wave) : 0;
        for (let j = 0; j < 5; j++) for (let k = 0; k < L.g[j].length; k++) {
          if (L.g[j][k] !== '#') continue;
          plot(L.x + k * sc, y + j * sc + bob, j, cfn(L.i, j), dx, dy, grow);
        }
      }
    };
    const og = o.outline !== undefined ? Math.max(1, Math.round(sc / 3)) : 0;
    if (o.shadow !== undefined) {
      const so = o.shadowOff || sc;
      if (og) pass(so, so, () => o.outline, og); // shadow gets its own outline, then the shadow body
      pass(so, so, () => o.shadow, 0);
    }
    if (o.outline !== undefined) pass(0, 0, () => o.outline, og);
    pass(0, 0, (li, row) => (o.colFn ? o.colFn(li, row) : col), 0);
    if (o.shine) pass(0, 0, (li, row) => (row === 0 ? o.shine : (o.colFn ? o.colFn(li, row) : col)), 0);
    return width;
  };

  // ---------- panels ----------
  // A chunky framed panel: black outline, bevel, inner fill.
  PD.panel = function (fb, x, y, w, h, ramp, opt) {
    const o = opt || {};
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (o.shadow !== false) fb.drect(x + 2, y + 2, w, h, C('ink', 0), 0.6);
    fb.rect(x, y, w, h, C('ink', 0));
    fb.rect(x + 1, y + 1, w - 2, h - 2, C(ramp, o.fill === undefined ? 1 : o.fill));
    fb.rect(x + 1, y + 1, w - 2, 1, C(ramp, 3));
    fb.rect(x + 1, y + 1, 1, h - 2, C(ramp, 2));
    fb.rect(x + 1, y + h - 2, w - 2, 1, C(ramp, 0));
    if (o.inner) fb.rect(x + 3, y + 3, w - 6, h - 6, C(o.inner, o.innerShade === undefined ? 1 : o.innerShade));
  };

  // ---------- immediate-mode widgets ----------
  const UI = {
    t: 0, focus: 0, list: [], hot: null, prevHot: null, cursor: 'arrow', sfx: null, clicked: false,
    begin(dt) {
      this.t += dt;
      this.count = 0;
      this.hot = null;
      this.cursor = 'arrow';
      this.navUp = keyHit('ArrowUp', 'w', 'W');
      this.navDown = keyHit('ArrowDown', 's', 'S');
      this.navLeft = keyHit('ArrowLeft', 'a', 'A');
      this.navRight = keyHit('ArrowRight', 'd', 'D');
      this.activate = keyHit('Enter', ' ');
      this.back = keyHit('Escape', 'Backspace');
      if (IN.moved) this.mouseMode = true;
      if (this.navUp || this.navDown) this.mouseMode = false;
    },
    end() {
      const n = this.count;
      if (n) {
        if (this.navDown) { this.focus = (this.focus + 1) % n; this.blip(1); }
        if (this.navUp) { this.focus = (this.focus - 1 + n) % n; this.blip(1); }
        this.focus = Math.min(this.focus, n - 1);
      }
      if (this.hot !== this.prevHot && this.hot) this.blip(0);
      this.prevHot = this.hot;
      IN.pressed = false; IN.released = false; IN.typed.length = 0; IN.moved = false;
    },
    blip(kind) { if (this.sfx) this.sfx(kind); },
    over(x, y, w, h) { return IN.mx >= x && IN.my >= y && IN.mx < x + w && IN.my < y + h; },
    // returns true when activated
    button(fb, id, x, y, w, h, label, o) {
      o = o || {};
      const idx = this.count++;
      const disabled = !!o.disabled;
      const hover = this.over(x, y, w, h);
      if (hover && this.mouseMode) this.focus = idx;
      const focused = this.focus === idx && !(this.mouseMode && !hover);
      const pressed = hover && IN.down;
      if (focused && !disabled) { this.hot = id; this.cursor = 'hand'; }
      const ramp = disabled ? 'ink' : (o.ramp || 'neon');
      const lift = pressed ? 1 : 0;
      // body
      fb.drect(x + 2, y + 2, w, h, C('ink', 0), 0.7);
      fb.rect(x, y + lift, w, h, C('ink', 0));
      const base = focused && !disabled ? 2 : 1;
      fb.rect(x + 1, y + 1 + lift, w - 2, h - 2, C(ramp, base));
      fb.rect(x + 1, y + 1 + lift, w - 2, 1, C(ramp, base + 2 > 4 ? 4 : base + 2));
      fb.rect(x + 1, y + h - 2 + lift, w - 2, 1, C(ramp, 0));
      if (focused && !disabled) {
        // animated sheen sweeping across
        const sx = Math.round(((this.t * 90) % (w + 30)) - 15);
        for (let k = 0; k < 4; k++) fb.rect(x + 1 + PD.clamp(sx + k, 0, w - 3), y + 2 + lift, 1, h - 4, C(ramp, 3));
        // pointer arrows
        const ay = y + (h >> 1) - 2 + lift;
        const bob = Math.round(Math.sin(this.t * 10));
        PD.sprite(fb, ['#..', '##.', '###', '##.', '#..'], x - 6 + bob, ay, C('gold', 2), C('ink', 0));
      }
      const tc = disabled ? C('ink', 4) : focused ? C('ink', 0) : C(ramp, 4);
      const lx = o.icon ? x + 12 : x + w / 2;
      PD.textS(fb, label, lx, y + (h >> 1) - (o.scale === 2 ? 5 : 2) + lift, o.scale || 1, tc, { center: !o.icon });
      if (o.icon) PD.sprite(fb, o.icon, x + 4, y + (h >> 1) - 2 + lift, tc);
      if (o.lock) PD.sprite(fb, ['.#.', '#.#', '###', '###'], x + w - 8, y + (h >> 1) - 2 + lift, C('ink', 4));
      const act = !disabled && ((hover && IN.released) || (focused && this.activate));
      if (act) this.blip(2);
      return act;
    },
    // horizontal slider; returns new value
    slider(fb, id, x, y, w, v, o) {
      o = o || {};
      const idx = this.count++;
      const hover = this.over(x - 2, y - 3, w + 4, 9);
      if (hover && this.mouseMode) this.focus = idx;
      const focused = this.focus === idx;
      if (focused) { this.hot = id; this.cursor = 'hand'; }
      if (hover && IN.down) v = PD.clamp((IN.mx - x) / w, 0, 1);
      if (focused && this.navLeft) { v = PD.clamp(v - 0.1, 0, 1); this.blip(1); }
      if (focused && this.navRight) { v = PD.clamp(v + 0.1, 0, 1); this.blip(1); }
      fb.rect(x - 1, y - 1, w + 2, 5, C('ink', 0));
      fb.rect(x, y, w, 3, C('ink', 2));
      const fw = Math.round(w * v);
      for (let i = 0; i < fw; i++) fb.rect(x + i, y, 1, 3, C(o.ramp || 'neon', 2 + (i % 4 === 0 ? 1 : 0)));
      const kx = x + fw - 2;
      fb.rect(kx - 1, y - 3, 6, 9, C('ink', 0));
      fb.rect(kx, y - 2, 4, 7, focused ? C('gold', 3) : C('ink', 4));
      return v;
    },
    // option selector  < VALUE >   returns index
    select(fb, id, x, y, w, opts, idxv, o) {
      o = o || {};
      const idx = this.count++;
      const hover = this.over(x, y - 2, w, 10);
      if (hover && this.mouseMode) this.focus = idx;
      const focused = this.focus === idx;
      if (focused) { this.hot = id; this.cursor = 'hand'; }
      let v = idxv;
      const left = this.over(x, y - 2, 10, 10), right = this.over(x + w - 10, y - 2, 10, 10);
      if ((hover && IN.released && left) || (focused && this.navLeft)) { v = (v - 1 + opts.length) % opts.length; this.blip(1); }
      else if ((hover && IN.released) || (focused && (this.navRight || this.activate))) { v = (v + 1) % opts.length; this.blip(1); }
      const col = focused ? C('gold', 3) : C('ink', 4);
      PD.sprite(fb, ['..#', '.##', '###', '.##', '..#'], x, y, col, C('ink', 0));
      PD.sprite(fb, ['#..', '##.', '###', '##.', '#..'], x + w - 3, y, col, C('ink', 0));
      PD.textS(fb, opts[v], x + w / 2, y, 1, focused ? C('ui', 4) : C('cyan', 3), { center: true });
      return v;
    },
  };
  PD.UI = UI;

  // ---------- cursor ----------
  const ARROW = ['#....', '##...', '#@#..', '#@@#.', '#@@@#', '#@@##', '##.#.', '...#.'];
  const HAND = ['..#....', '.#@#...', '.#@#...', '.#@###.', '##@@@@#', '#@@@@@#', '#@@@@@#', '.#@@@#.', '..###..'];
  PD.drawCursor = function (fb) {
    if (IN.mx < 0) return;
    const spr = UI.cursor === 'hand' ? HAND : ARROW;
    const x = Math.round(IN.mx) - (UI.cursor === 'hand' ? 2 : 0), y = Math.round(IN.my);
    for (let j = 0; j < spr.length; j++) for (let i = 0; i < spr[j].length; i++) {
      const ch = spr[j][i];
      if (ch === '#') fb.px(x + i, y + j, C('ink', 0));
      else if (ch === '@') fb.px(x + i, y + j, IN.down ? C('neon', 3) : C('ui', 4));
    }
  };

  // ---------- transitions ----------
  // A diagonal dither wipe in brand pink, then black, then out.
  PD.drawWipe = function (fb, k) {
    if (k <= 0) return;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x += 1) {
      const d = (x + y * 1.4) / (W + H * 1.4);
      const v = k * 1.6 - d * 0.6;
      if (v <= 0) continue;
      if (v > 0.55 || bayer(x, y) < v / 0.55) fb.buf[y * W + x] = v > 0.75 ? C('ink', 0) : C('neon', 1);
    }
  };
  void bayer;
})(window.PD);

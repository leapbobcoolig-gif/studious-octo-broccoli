// HTML overlay: right-side toolbar + customization panels.
(function (PD) {
  'use strict';

  const HER = [
    { k: 'height', label: 'HEIGHT', min: 0.86, max: 1.12, step: 0.01 },
    { k: 'bust', label: 'BUST', min: 0.5, max: 2.2, step: 0.05 },
    { k: 'butt', label: 'BUTT', min: 0.7, max: 1.8, step: 0.05 },
    { k: 'hips', label: 'HIPS', min: 0.8, max: 1.5, step: 0.05 },
    { k: 'thighs', label: 'THIGHS', min: 0.8, max: 1.6, step: 0.05 },
    { k: 'belly', label: 'BELLY', min: 0, max: 1, step: 0.05 },
    { k: 'sens', label: 'SENSITIVE', min: 0.4, max: 2.2, step: 0.05 },
    { k: 'skin', label: 'SKIN', swatch: 'skin' },
    { k: 'hair', label: 'HAIR', swatch: 'hair' },
    { k: 'hairStyle', label: 'STYLE', opts: ['long', 'pony', 'bob'] },
    { k: 'legwear', label: 'LEGS', opts: ['none', 'fishnet', 'stockings'] },
    { k: 'bra', label: 'BRA', toggle: true },
    { k: 'choker', label: 'CHOKER', toggle: true },
  ];
  const HIM = [
    { k: 'height', label: 'HEIGHT', min: 0.9, max: 1.12, step: 0.01 },
    { k: 'muscle', label: 'MUSCLE', min: 0, max: 1.2, step: 0.05 },
    { k: 'belly', label: 'BELLY', min: 0, max: 1.2, step: 0.05 },
    { k: 'length', label: 'LENGTH', min: 0.7, max: 1.6, step: 0.05 },
    { k: 'girth', label: 'GIRTH', min: 0.7, max: 1.5, step: 0.05 },
    { k: 'sens', label: 'STAMINA-', min: 0.4, max: 2.2, step: 0.05 },
    { k: 'skin', label: 'SKIN', swatch: 'skin' },
    { k: 'hair', label: 'HAIR', swatch: 'hair' },
    { k: 'hairStyle', label: 'STYLE', opts: ['short', 'messy', 'buzz', 'bald'] },
    { k: 'beard', label: 'BEARD', toggle: true },
    { k: 'socks', label: 'SOCKS', toggle: true },
  ];

  PD.randomize = function (S) {
    const r = PD.rnd;
    Object.assign(S.w.p, {
      height: r(0.9, 1.06), bust: r(0.6, 2.0), butt: r(0.85, 1.7), hips: r(0.9, 1.4), thighs: r(0.9, 1.5),
      belly: r(0, 0.6), skin: (Math.random() * 4) | 0, hair: (Math.random() * 6) | 0,
      hairStyle: PD.pick(['long', 'pony', 'bob']), legwear: PD.pick(['none', 'fishnet', 'stockings']),
      bra: Math.random() < 0.25, choker: Math.random() < 0.5,
    });
    Object.assign(S.m.p, {
      height: r(0.95, 1.1), muscle: r(0, 1.1), belly: r(0, 0.9), length: r(0.8, 1.5), girth: r(0.8, 1.4),
      skin: (Math.random() * 4) | 0, hair: (Math.random() * 6) | 0, hairStyle: PD.pick(['short', 'messy', 'buzz', 'bald']),
      beard: Math.random() < 0.4, socks: Math.random() < 0.2,
    });
    for (const c of [S.w, S.m]) { PD.refreshDims(c); c.hair.reset(); for (const k in c.sp) c.sp[k].reset(); }
  };

  PD.UI_SANDBOX = function (root, D, S, app) {
    const bar = root.querySelector('#toolbar');
    const panel = root.querySelector('#panel');
    let open = null;

    const btn = (label, title, fn, cls) => {
      const b = document.createElement('button');
      b.textContent = label; b.title = title; b.className = cls || '';
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); app.sync(); });
      bar.appendChild(b);
      return b;
    };
    const posBtns = {};
    for (const key of PD.POS_KEYS) posBtns[key] = btn(PD.POSITIONS[key].short, PD.POSITIONS[key].label + ' (' + (PD.POS_KEYS.indexOf(key) + 1) + ')', () => D.setPos(key), 'pos');
    bar.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
    const spdRow = document.createElement('div'); spdRow.className = 'row';
    const minus = document.createElement('button'); minus.textContent = '-'; minus.title = 'Slower ( [ )';
    const plus = document.createElement('button'); plus.textContent = '+'; plus.title = 'Faster ( ] )';
    minus.onclick = (e) => { e.stopPropagation(); D.userSpeed = Math.max(0, +(D.userSpeed - 0.2).toFixed(2)); D.auto = false; app.sync(); };
    plus.onclick = (e) => { e.stopPropagation(); D.userSpeed = Math.min(3.6, +(D.userSpeed + 0.2).toFixed(2)); D.auto = false; app.sync(); };
    spdRow.append(minus, plus); bar.appendChild(spdRow);
    const autoB = btn('AUTO', 'Auto pilot (A)', () => { D.auto = !D.auto; });
    const pauseB = btn('STOP', 'Pause motion (space)', () => { D.paused = !D.paused; });
    btn('CUM', 'Make them cum (C)', () => D.climaxNow(), 'hot');
    bar.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
    const herB = btn('HER', 'Customize her', () => toggle('her'));
    const himB = btn('HIM', 'Customize him', () => toggle('him'));
    const moveB = btn('MOVE', 'Speed & stroke', () => toggle('move'));
    btn('NEW', 'New random couple (R)', () => { PD.randomize(S); if (open) render(open); });
    bar.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
    const palB = btn('MONO', 'Palette (P)', () => { app.palette = app.palette === 'mono' ? 'color' : 'mono'; });
    const lampB = btn('LAMP', 'Lamp on/off (L)', () => { app.lampOn = !app.lampOn; });
    const sndB = btn('SND', 'Sound (S)', () => { PD.Audio.enable(!PD.Audio.on); });
    btn('HIDE', 'Hide UI (H)', () => app.toggleUI());
    btn('MENU', 'Back to menu (Esc)', () => { panel.classList.add('hidden'); open = null; app.toMenu(); });

    function toggle(which) {
      open = open === which ? null : which;
      if (open) render(open); else panel.classList.add('hidden');
    }

    function render(which) {
      panel.innerHTML = '';
      panel.classList.remove('hidden');
      const h = document.createElement('div'); h.className = 'ph';
      h.textContent = which === 'her' ? 'HER' : which === 'him' ? 'HIM' : 'MOTION';
      const x = document.createElement('button'); x.textContent = 'X'; x.className = 'x';
      x.onclick = (e) => { e.stopPropagation(); toggle(which); app.sync(); };
      h.appendChild(x); panel.appendChild(h);
      if (which === 'move') {
        slider(panel, 'SPEED', D.userSpeed, 0, 3.6, 0.05, (v) => { D.userSpeed = v; D.auto = false; });
        slider(panel, 'STROKE', D.stroke, 0.15, 1, 0.05, (v) => { D.stroke = v; });
        const keys = document.createElement('div'); keys.className = 'help';
        keys.innerHTML = '1-4 POSITION<br>[ ] SPEED<br>SPACE STOP · A AUTO<br>C CUM · R NEW<br>P PALETTE · H HIDE<br>CLICK BODIES TO POKE';
        panel.appendChild(keys);
        return;
      }
      const c = which === 'her' ? S.w : S.m;
      for (const f of which === 'her' ? HER : HIM) {
        if (f.min !== undefined) slider(panel, f.label, c.p[f.k], f.min, f.max, f.step, (v) => { c.p[f.k] = v; PD.refreshDims(c); });
        else if (f.swatch) {
          const row = rowEl(panel, f.label);
          const ramps = f.swatch === 'skin' ? PD.SKIN_RAMPS : PD.HAIR_RAMPS;
          ramps.forEach((rn, i) => {
            const b = document.createElement('button');
            b.className = 'sw' + (c.p[f.k] === i ? ' on' : '');
            b.style.background = PD.RAMP_HEX(rn, 2);
            b.onclick = (e) => { e.stopPropagation(); c.p[f.k] = i; render(which); };
            row.appendChild(b);
          });
        } else if (f.opts) {
          const row = rowEl(panel, f.label);
          for (const o of f.opts) {
            const b = document.createElement('button');
            b.className = 'chip' + (c.p[f.k] === o ? ' on' : '');
            b.textContent = o.toUpperCase().slice(0, 5);
            b.onclick = (e) => { e.stopPropagation(); c.p[f.k] = o; c.hair.reset(); render(which); };
            row.appendChild(b);
          }
        } else if (f.toggle) {
          const row = rowEl(panel, f.label);
          const b = document.createElement('button');
          b.className = 'chip' + (c.p[f.k] ? ' on' : '');
          b.textContent = c.p[f.k] ? 'ON' : 'OFF';
          b.onclick = (e) => { e.stopPropagation(); c.p[f.k] = !c.p[f.k]; render(which); };
          row.appendChild(b);
        }
      }
    }
    function rowEl(parent, label) {
      const r = document.createElement('div'); r.className = 'prow';
      const l = document.createElement('span'); l.textContent = label;
      r.appendChild(l); parent.appendChild(r);
      const box = document.createElement('div'); box.className = 'pbox'; r.appendChild(box);
      return box;
    }
    function slider(parent, label, val, min, max, step, fn) {
      const box = rowEl(parent, label);
      const s = document.createElement('input');
      s.type = 'range'; s.min = min; s.max = max; s.step = step; s.value = val;
      s.addEventListener('input', () => fn(parseFloat(s.value)));
      s.addEventListener('click', (e) => e.stopPropagation());
      box.appendChild(s);
    }

    return {
      sync() {
        for (const key in posBtns) posBtns[key].classList.toggle('on', D.pos === key);
        autoB.classList.toggle('on', D.auto);
        pauseB.classList.toggle('on', D.paused);
        herB.classList.toggle('on', open === 'her');
        himB.classList.toggle('on', open === 'him');
        moveB.classList.toggle('on', open === 'move');
        palB.textContent = app.palette === 'mono' ? 'MONO' : 'COLOR';
        lampB.classList.toggle('on', app.lampOn);
        sndB.classList.toggle('on', PD.Audio.on);
        if (open === 'move') {
          const s = panel.querySelector('input');
          if (s && document.activeElement !== s) s.value = D.userSpeed;
        }
      },
    };
  };
})(window.PD);

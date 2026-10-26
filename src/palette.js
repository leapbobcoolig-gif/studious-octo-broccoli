// Semantic palette. The framebuffer stores ramp*6+shade indices, so swapping
// palettes (mono <-> color) is just swapping the lookup table at present time.
// Shades: 0 outline, 1 shadow, 2 base, 3 light, 4 highlight, 5 extra/accent.
(function (PD) {
  'use strict';
  const RAMP_DEFS = [
    ['wall', ['#140f1e', '#2e2340', '#3a2d50', '#46375f', '#54436f', '#241b33']],
    ['wood', ['#140b0b', '#3e2420', '#58342a', '#74473a', '#8f5d4a', '#2a1714']],
    ['sheet', ['#1a1526', '#7d7896', '#a7a3bf', '#ccc9de', '#efedf7', '#5e5a78']],
    ['sky', ['#05050f', '#0d0d24', '#141436', '#1c1c48', '#26265c', '#e8e8ff']],
    ['cloud', ['#05050f', '#1d1d40', '#26264f', '#30305e', '#3d3d70', '#15152f']],
    ['floor', ['#0c0808', '#2a1a17', '#382420', '#47302a', '#573c34', '#1d1210']],
    ['lamp', ['#2a1a0a', '#a5743a', '#d9a557', '#f2cd84', '#fff2c4', '#5e3f1c']],
    ['frame', ['#141020', '#6c5f80', '#8f82a3', '#b3a8c4', '#d8d0e4', '#4a4060']],
    ['ui', ['#000000', '#3a3a44', '#77778a', '#b4b4c4', '#ffffff', '#1a1a22']],
    ['skin0', ['#2b1416', '#c48a7c', '#e3b19d', '#f3cdb8', '#fde6d6', '#d8737a']],
    ['skin1', ['#2a1510', '#a5674a', '#c68961', '#dca57b', '#efc29a', '#b8575a']],
    ['skin2', ['#1d0d08', '#6b3d27', '#8b5335', '#a66b45', '#c1885c', '#8a3b3c']],
    ['skin3', ['#100605', '#3b2015', '#552f1f', '#6c412b', '#87573b', '#6a2a2c']],
    ['hair0', ['#06050a', '#16131c', '#241f2c', '#342d3e', '#483f55', '#0e0c12']],
    ['hair1', ['#160b06', '#43251a', '#5f3822', '#7c4e30', '#9a6842', '#2b170e']],
    ['hair2', ['#33240c', '#a8803a', '#cfa95a', '#e8c983', '#f9e8b4', '#6e5220']],
    ['hair3', ['#260807', '#742217', '#a03822', '#c45732', '#e2804e', '#4a120c']],
    ['hair4', ['#280a1a', '#a8457a', '#d06d9e', '#ec95bd', '#ffc2dc', '#6a2048']],
    ['hair5', ['#26262e', '#9696a6', '#bcbccb', '#dadae6', '#f6f6fb', '#5e5e6c']],
    ['cloth0', ['#020204', '#0f0f14', '#1b1b22', '#292932', '#3e3e4a', '#08080c']],
    ['cloth1', ['#1e0408', '#741020', '#a3182f', '#cc2a40', '#ee5363', '#4a0812']],
    ['cloth2', ['#26262e', '#a3a3b1', '#cdcdd8', '#eaeaf1', '#ffffff', '#6e6e7c']],
    ['cloth3', ['#12071e', '#45206a', '#652f92', '#8647b8', '#ac70dc', '#2a1244']],
    ['heart', ['#2a0012', '#bd1e4f', '#ec4676', '#ff7fa6', '#ffc2d6', '#7a0c30']],
    ['fluid', ['#3a3322', '#d6cdb4', '#ece5d2', '#f8f4e8', '#ffffff', '#b8ae92']],
    ['sweat', ['#081624', '#5c93c6', '#8fc0ec', '#c4e2ff', '#ffffff', '#2c5a86']],
  ];

  const MONO_OVERRIDE = {
    skin: ['#141414', '#9c9c9c', '#cfcfcf', '#ebebeb', '#ffffff', '#7c7c7c'],
    fluid: ['#3a3528', '#d9cfae', '#efe6c8', '#f8f2de', '#fffbee', '#bdb28e'],
    heart: ['#141414', '#bdbdbd', '#e0e0e0', '#f2f2f2', '#ffffff', '#8a8a8a'],
    sheet: ['#141414', '#8a8a8a', '#b4b4b4', '#d2d2d2', '#ececec', '#6a6a6a'],
    sky: ['#050505', '#141414', '#1c1c1c', '#262626', '#303030', '#f0f0f0'],
  };

  PD.R = {};
  RAMP_DEFS.forEach(([name], i) => (PD.R[name] = i));
  PD.C = (ramp, shade) => PD.R[ramp] * 6 + shade;
  PD.SKIN_RAMPS = ['skin0', 'skin1', 'skin2', 'skin3'];
  PD.HAIR_RAMPS = ['hair0', 'hair1', 'hair2', 'hair3', 'hair4', 'hair5'];
  PD.CLOTH_RAMPS = ['cloth0', 'cloth1', 'cloth2', 'cloth3'];

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const pack = ([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

  function buildLUT(mono) {
    const lut = new Uint32Array(256);
    RAMP_DEFS.forEach(([name, cols], i) => {
      let src = cols;
      if (mono) {
        const key = name.startsWith('skin') ? 'skin' : name;
        if (MONO_OVERRIDE[key]) src = MONO_OVERRIDE[key];
      }
      src.forEach((h, s) => {
        let rgb = hex(h);
        if (mono && !MONO_OVERRIDE[name.startsWith('skin') ? 'skin' : name]) {
          const l = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
          const g = Math.round(255 * Math.pow(l / 255, 0.85));
          rgb = [g, g, g];
        }
        lut[i * 6 + s] = pack(rgb);
      });
    });
    return lut;
  }

  // Lamp off: moonlight grade — darker, cooler.
  function moonlit(lut, mono) {
    const out = new Uint32Array(lut.length);
    for (let i = 0; i < lut.length; i++) {
      const v = lut[i];
      let r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
      r = r * 0.5; g = g * 0.55; b = mono ? b * 0.55 : Math.min(255, b * 0.7 + 18);
      if (mono) { const l = (r + g + b) / 3; r = g = b = l; }
      out[i] = pack([Math.round(r), Math.round(g), Math.round(b)]);
    }
    return out;
  }
  PD.PALETTES = { mono: buildLUT(true), color: buildLUT(false) };
  PD.PALETTES.monoDark = moonlit(PD.PALETTES.mono, true);
  PD.PALETTES.colorDark = moonlit(PD.PALETTES.color, false);
  PD.hexOf = (lut, idx) => {
    const v = lut[idx];
    return '#' + [v & 255, (v >> 8) & 255, (v >> 16) & 255].map((n) => n.toString(16).padStart(2, '0')).join('');
  };
  PD.RAMP_HEX = (name, shade) => RAMP_DEFS[PD.R[name]][1][shade];
})(window.PD);

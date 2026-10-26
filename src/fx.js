// Particles: floating onomatopoeia, hearts, sweat, fluids, wet spots.
(function (PD) {
  'use strict';
  const C = PD.C;

  class FX {
    constructor() { this.list = []; this.wet = []; }
    word(x, y, str, col, opts) {
      const o = opts || {};
      this.list.push({ type: 'text', x: x - PD.textWidth(str) / 2, y, vx: PD.rnd(-5, 5), vy: o.vy || -16, life: o.life || 1.1, max: o.life || 1.1, str, col });
    }
    heart(x, y, big) {
      this.list.push({ type: 'heart', x, y, vx: PD.rnd(-10, 10), vy: PD.rnd(-26, -14), life: 1.6, max: 1.6, ph: Math.random() * 6, big });
    }
    drop(x, y, vx, vy, kind, stick) {
      this.list.push({ type: 'drop', kind, x, y, vx, vy, life: 4, max: 4, stick: stick || 0 });
    }
    update(dt, bedOff) {
      const by = PD.BED_Y + bedOff;
      for (const p of this.list) {
        p.life -= dt;
        if (p.type === 'text') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.96; }
        else if (p.type === 'heart') { p.x += (p.vx + Math.sin(p.life * 6 + p.ph) * 8) * dt; p.y += p.vy * dt; }
        else if (p.type === 'drop') {
          if (p.stick > 0) { p.stick -= dt; p.y += 2 * dt; continue; }
          p.vy += 150 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y >= by + 1 && p.x > 64 && p.x < 258) {
            p.life = 0;
            if (p.kind === 'fluid' || p.kind === 'squirt') this.addWet(p.x);
          } else if (p.y > 180) p.life = 0;
        }
      }
      this.list = this.list.filter((p) => p.life > 0);
      for (const w of this.wet) w.life -= dt * 0.08;
      this.wet = this.wet.filter((w) => w.life > 0);
    }
    addWet(x) {
      for (const w of this.wet) if (Math.abs(w.x - x) < w.r + 2) { w.r = Math.min(10, w.r + 0.35); w.life = Math.min(6, w.life + 0.6); return; }
      if (this.wet.length < 12) this.wet.push({ x, r: 2, life: 4 });
    }
    draw(fb) {
      for (const p of this.list) {
        const a = Math.min(1, p.life / (p.max * 0.45));
        if (p.type === 'text') PD.text(fb, p.str, p.x, p.y, p.col, C('ui', 0), a, C('heart', 2));
        else if (p.type === 'heart') {
          if (a < 0.3 && PD.bayer(Math.round(p.x), Math.round(p.y)) > a * 3) continue;
          PD.sprite(fb, p.big ? PD.HEART : ['#.#', '###', '.#.'], p.x, p.y, C('heart', 3), C('heart', 0));
        } else if (p.type === 'drop') {
          const col = p.kind === 'fluid' ? C('fluid', 3) : p.kind === 'squirt' ? C('sweat', 3) : C('sweat', 2);
          fb.px(p.x, p.y, col);
          if (p.kind === 'fluid') fb.px(p.x, p.y - 1, C('fluid', 2));
          else if (p.kind === 'squirt') { fb.px(p.x - p.vx * 0.012, p.y - p.vy * 0.012, C('sweat', 4)); fb.px(p.x - p.vx * 0.024, p.y - p.vy * 0.024, C('sweat', 2)); }
          else fb.px(p.x, p.y - 1, C('sweat', 4));
        }
      }
    }
  }
  PD.FX = FX;
})(window.PD);

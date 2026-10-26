// Chapter 2: the phone. Browse the grid, open Tyler, chat him up (Trust vs Sus),
// find his weakness, pick the trick, and get him on his way over.
(function (PD) {
  'use strict';
  const C = PD.C, W = PD.W, H = PD.H, UI = PD.UI, SM = PD.SM, clamp = PD.clamp;
  const up = (s) => String(s).toUpperCase();
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const CPS = [24, 48, 110];
  const rr = (fb, x, y, w, h, c) => { fb.rect(x + 1, y, w - 2, h, c); fb.rect(x, y + 1, w, h - 2, c); };
  const PHONE = { x: 84, y: 2, w: 152, h: 176 };
  const SCR = { x: PHONE.x + 4, y: PHONE.y + 8, w: PHONE.w - 8, h: PHONE.h - 14 }; // 88,10 144x162

  // ---------------------------------------------------------------
  //  The guys on the grid
  // ---------------------------------------------------------------
  const CAST = PD.CAST;
  const TYLER = Object.assign({}, CAST.twink);
  const GRID = [
    { n: 'MASC4MASC', d: '0.2MI', dude: CAST.masc, q: 'Masc4masc. Talks like a gym bro, cries at Mamma Mia. Later.' },
    { n: 'TYLER, 21', d: '50FT', dude: TYLER, tyler: true },
    { n: 'BEARDADDY69', d: '1MI', dude: CAST.bear, q: 'The bear. He needs a whole bottle of vodka. We have one. Later.' },
    { n: 'NO FEMS', d: '0.1MI', dude: CAST.nofems, q: '"No fems." Buddy, you are about to be SO fem-adjacent.' },
    { n: 'SMOOTHBTM', d: '0.4MI', dude: CAST.smooth, q: 'Smooth bottom. Shaves everything. Never touched a tit. Next week.' },
    { n: 'TOP 4 TOP', d: '0.3MI', dude: CAST.top, q: 'Two tops never fuck. Our girl solves that problem. Later.' },
    { n: 'GYMRAT', d: '0.6MI', dude: Object.assign({}, CAST.masc, { skin: 'skin2', hair: 'hair1', hairStyle: 'short', shirtStyle: 'none' }), q: 'Gym rat. Bet him he cannot handle pussy. Needs THE BET. Locked.' },
    { n: 'DL_DAD', d: '2MI', dude: Object.assign({}, CAST.bear, { skin: 'skin0', hair: 'hair5', beard: false, shirt: 'cloth0' }), q: 'Married, "discreet". Half-straight already. Lazy money. Later.' },
    { n: 'TWUNK', d: '0.8MI', dude: Object.assign({}, CAST.twinkPride, { flag: false, skin: 'skin1' }), q: 'Pride crop top in October. Sad. Save him for later.' },
  ];

  // ---------------------------------------------------------------
  //  The chat script
  // ---------------------------------------------------------------
  const PICLINE = ['THOSE ABS OMG. R THEY REAL??', 'CUTE BATHROOM LOL. SHOW FACE NEXT TIME ;)', 'IS THAT... REAL?? >_<', 'A SUNSET LOL. MYSTERIOUS. I LIKE IT'];
  const NODES = {
    start: { him: (sc) => ['HIIII :3', 'OMG UR SO HOT', PICLINE[sc.pic]], opts: [
      { t: 'YEAH THATS ME. U LIKE?', trust: 15, next: 'into', op: 'Lying to a twink. Easiest thing I have done all week.' },
      { t: "WHO'S ASKING, CUTIE?", trust: 20, next: 'into', op: 'Flirty. Look at him melt. Fucking embarrassing.' },
      { t: "I'M ACTUALLY A WOMAN LOL", trust: -10, sus: 40, next: 'oops', op: 'Are you insane? Not YET. He has to be inside it first.' },
    ] },
    oops: { him: ['...LMAOOO', 'WAIT UR JOKING RIGHT??'], opts: [
      { t: 'OBVIOUSLY LOL. IMAGINE', trust: 5, sus: -30, next: 'into', op: 'Saved. He believed you because he WANTS to. Fags are optimists.' },
    ] },
    into: { him: ['SO WHAT R U INTO', 'IM A TOTAL BOTTOM BTW', 'LIKE TOTAL. ZERO TOP ENERGY'], opts: [
      { t: 'GUYS WHO DO WHAT THEYRE TOLD', trust: 20, next: 'pic', op: 'He is already on his knees in his head. Good boy.' },
      { t: 'EVER BEEN BLINDFOLDED? ;)', trust: 15, next: 'blind', op: 'Fishing. Smart. Watch what he says next.' },
      { t: 'PUSSY', sus: 35, next: 'ew', op: "Too early, champ. He'll get plenty of it later. In his face." },
    ] },
    blind: { him: ['OMG NO', 'BUT IVE ALWAYS WANTED TO >_<', 'IS THAT WEIRD'], weak: true, opts: [
      { t: 'NOT WEIRD. HOT.', trust: 15, next: 'pic', op: 'WEAKNESS FOUND: BLINDFOLD. He just handed us the keys.' },
    ] },
    ew: { him: ['EW??', 'IS THIS A TROLL ACCOUNT', 'NO FISH PLS. IM GAY GAY'], opts: [
      { t: 'LOL JK. GAY AS HELL OVER HERE', sus: -20, next: 'pic', op: '"Gay as hell." Keep a straight face. Ha. Straight.' },
    ] },
    pic: { him: ['SEND A PIC? ;)'], opts: [
      { t: '[SEND YOUR PROFILE PIC]', pic: 'mine', trust: 20, next: 'picwow', op: 'Stolen pic, real drool. He is typing with one hand now.' },
      { t: 'U FIRST', trust: 5, next: 'hispic', op: 'Make him work for it. Twinks love homework.' },
      { t: '[SEND A PIC OF A VAGINA]', sus: 100, next: 'blocked', op: 'Oh no. Oh NO.' },
    ] },
    hispic: { him: [{ pic: 'his' }, 'DONT JUDGE MY ROOM LOL'], opts: [
      { t: '[SEND YOUR PROFILE PIC]', pic: 'mine', trust: 20, next: 'picwow', op: 'Pride flag, fairy lights, a stuffed unicorn. That room is getting a makeover.' },
    ] },
    picwow: { him: ['OMG', 'OK IM OBSESSED', 'MY HOLE IS LITERALLY CRYING'], opts: [
      { t: 'GOOD BOY', trust: 15, next: 'host', op: 'He wagged. I heard it from here.' },
    ] },
    blocked: { him: ['???', 'WTF IS THAT', { sys: 'TYLER BLOCKED YOU' }], rewind: 'pic' },
    host: { him: ['SO LIKE...', 'U HOSTING? >_<'], opts: [
      { t: 'YEAH. BUT I HAVE ONE RULE.', next: 'TRICK', op: 'Now. Pick the trick.' },
      { t: 'DEPENDS HOW GOOD U ARE', trust: 10, next: 'host2', op: 'Edging a twink over text. This is art.' },
    ] },
    host2: { him: ['ILL BE SO GOOD', 'PROMISE :3'], opts: [
      { t: 'YEAH. BUT I HAVE ONE RULE.', next: 'TRICK', op: 'Now. Pick the trick.' },
    ] },
    after: { him: ['OMG KINKY', 'YES SIR', 'OMW!!! 4 MIN'], opts: [
      { t: "DOOR'S OPEN. BLINDFOLD ON FIRST.", next: 'END', op: 'Hook. Line. Twink.' },
    ] },
  };

  const TRICKS = [
    { id: 'blind', name: 'BLINDFOLD', lock: null, blurb: 'HE CANT SEE WHO HE IS FUCKING' },
    { id: 'lights', name: 'LIGHTS OFF', lock: '$200', blurb: 'PITCH BLACK. NO PEEKING' },
    { id: 'drunk', name: 'GET HIM\nDRUNK', lock: '$500', blurb: 'BEER GOGGLES. BEAR FAVOURITE' },
    { id: 'bet', name: 'THE BET', lock: '$1,200', blurb: 'BET HIM HE CANT HANDLE IT' },
    { id: 'upfront', name: 'UPFRONT', lock: 'REBIRTH 1', blurb: 'JUST TELL HIM. HE COMES ANYWAY' },
  ];

  // ---------------------------------------------------------------
  //  Little art bits
  // ---------------------------------------------------------------
  function hoodIcon(fb, x, y) {
    fb.rect(x, y, 22, 22, C('ink', 0)); fb.rect(x + 1, y + 1, 20, 20, C('night', 2));
    fb.ellipse(x + 11, y + 21, 9, 4, C('night', 4)); fb.rect(x + 2, y + 18, 18, 3, C('night', 4)); fb.ellipse(x + 11, y + 11, 7, 8, C('night', 4));
    fb.ellipse(x + 11, y + 12, 4.5, 5, C('ink', 0));
    fb.px(x + 9, y + 12, C('cyan', 3)); fb.px(x + 13, y + 12, C('cyan', 3));
  }
  function trickIcon(fb, id, cx, cy, t) {
    if (id === 'blind') {
      fb.ellipse(cx - 7, cy, 8, 5, C('ink', 0)); fb.ellipse(cx + 7, cy, 8, 5, C('ink', 0));
      fb.ellipse(cx - 7, cy, 7, 4, C('cloth3', 2)); fb.ellipse(cx + 7, cy, 7, 4, C('cloth3', 2));
      fb.ellipse(cx - 9, cy - 1, 3, 1.5, C('cloth3', 4)); fb.ellipse(cx + 5, cy - 1, 3, 1.5, C('cloth3', 4));
      for (let i = -12; i <= 12; i++) fb.px(cx + i, cy + 4 - Math.abs(Math.abs(i) - 7) * 0.2, C('heart', 3));
      for (let i = -16; i <= 16; i++) fb.px(cx + i, cy - 6 - Math.sqrt(Math.max(0, 256 - i * i)) * 0.25, C('cloth3', 1));
    } else if (id === 'lights') {
      fb.ellipse(cx, cy - 3, 7, 7, C('ink', 0)); fb.ellipse(cx, cy - 3, 6, 6, C('ink', 3));
      fb.rect(cx - 3, cy + 3, 7, 5, C('ink', 0)); fb.rect(cx - 2, cy + 3, 5, 4, C('ui', 2));
      fb.ellipse(cx - 2, cy - 5, 2, 2, C('ui', 2));
      PD.text(fb, 'ZZZ', cx + 6, cy - 10, C('ink', 4));
    } else if (id === 'drunk') {
      fb.rect(cx - 3, cy - 10, 6, 4, C('ink', 0)); fb.rect(cx - 2, cy - 10, 4, 4, C('wood', 3));
      fb.rect(cx - 5, cy - 6, 10, 15, C('ink', 0)); fb.rect(cx - 4, cy - 6, 8, 14, C('wood', 3));
      fb.rect(cx - 4, cy - 1, 8, 5, C('gold', 3)); fb.rect(cx - 3, cy - 6, 1, 14, C('wood', 4));
    } else if (id === 'bet') {
      fb.ellipse(cx, cy, 9, 9, C('ink', 0)); fb.ellipse(cx, cy, 8, 8, C('gold', 2)); fb.ellipse(cx - 1, cy - 1, 6, 6, C('gold', 3));
      PD.textS(fb, '$', cx, cy - 2, 1, C('gold', 1), { center: true });
    } else {
      PD.bubble(fb, cx - 15, cy - 7, "IT'S A\nGIRL.", cx - 10, cy + 10);
    }
    void t;
  }

  // ---------------------------------------------------------------
  //  Scene
  // ---------------------------------------------------------------
  SM.scenes.phone = {
    enter() {
      const sv = PD.Save.load() || {};
      this.pic = sv.profile ? sv.profile.pic | 0 : 0;
      this.myName = sv.profile ? PD.PROFILE_OPTS.name[sv.profile.name][0] : 'JAKE';
      this.art = this.art || new PD.FB();
      this.t = 0; this.view = 'grid'; this.vt = 0;
      this.msgs = []; this.queue = []; this.opts = null; this.node = null;
      this.trust = 0; this.sus = 0; this.tShow = 0; this.sShow = 0; this.weak = false;
      this.floaters = []; this.toast = null; this.picker = null; this.end = null;
      this.say('Ten minutes and the twink is already wet. Tap him.');
      this.hint = 'TAP TYLER';
      UI.focus = 0;
    },
    say(q) { this.quip = q; this.qshown = 0; },
    go(view) { this.view = view; this.vt = 0; UI.focus = 0; PD.Audio.ui('nav'); },
    float(text, ramp) { this.floaters.push({ text, ramp, t: 0 }); },
    // queue a node: his messages type out one by one, then the options appear
    run(id) {
      if (id === 'TRICK') { this.picker = { t: 0, f: 0, picked: null, shake: 0 }; this.say('There it is. Pick the trick. Blindfold is all you can afford, peasant.'); this.hint = 'PICK THE TRICK'; PD.Audio.ui('zap'); return; }
      if (id === 'END') { this.end = { t: 0 }; this.say('He is coming over to get fucked blind. By a pussy. He has no idea.'); this.hint = 'GET READY'; return; }
      const n = NODES[id];
      this.node = id; this.opts = null;
      const him = typeof n.him === 'function' ? n.him(this) : n.him;
      for (const m of him) this.queue.push(typeof m === 'string' ? { from: 'him', text: m } : Object.assign({ from: 'him' }, m));
      this.queue.wait = 0.7;
      if (n.weak) this.findWeak();
    },
    findWeak() {
      if (this.weak) return;
      this.weak = true; this.weakT = 0;
      PD.Audio.ui('lock'); this.float('WEAKNESS!', 'gold');
    },
    choose(o) {
      this.msgSaveLen = this.msgs.length;
      this.prev = { trust: this.trust, sus: this.sus };
      this.msgs.push(o.pic ? { from: 'me', pic: o.pic, t0: this.t } : { from: 'me', text: o.t, t0: this.t });
      PD.Audio.ui('whoosh');
      if (o.trust) { this.trust = clamp(this.trust + o.trust, 0, 100); this.float((o.trust > 0 ? '+' : '') + o.trust + ' TRUST', o.trust > 0 ? 'heart' : 'ink'); }
      if (o.sus) { this.sus = clamp(this.sus + o.sus, 0, 100); this.float((o.sus > 0 ? '+' : '') + o.sus + ' SUS', o.sus > 0 ? 'cloth1' : 'lime'); }
      if (o.sus > 30) { SM.shake = 0.15 * PD.Settings.shake; PD.Audio.ui('scratch'); }
      if (o.op) this.say(o.op);
      this.opts = null;
      this.hint = o.next === 'TRICK' ? 'PICK THE TRICK' : 'WAIT FOR HIM...';
      const next = o.next;
      this.pending = { next, wait: next === 'TRICK' ? 0.9 : 0.6 };
    },
    update(dt) {
      this.t += dt; this.vt += dt;
      // operator typewriter
      if (this.qshown < this.quip.length) {
        const b = Math.floor(this.qshown);
        this.qshown = Math.min(this.quip.length, this.qshown + dt * CPS[PD.Settings.textSpeed | 0] * 1.3);
        if (Math.floor(this.qshown) !== b && b % 3 === 0) PD.Audio.ui('type');
      }
      this.tShow += (this.trust - this.tShow) * Math.min(1, dt * 5);
      this.sShow += (this.sus - this.sShow) * Math.min(1, dt * 5);
      for (const f of this.floaters) f.t += dt;
      this.floaters = this.floaters.filter((f) => f.t < 1.4);
      if (this.toast) { this.toast.t += dt; if (this.toast.t > 2.2) this.toast = null; }
      if (this.weak) this.weakT += dt;

      if (this.pending) { this.pending.wait -= dt; if (this.pending.wait <= 0) { const n = this.pending.next; this.pending = null; this.run(n); } }
      // incoming messages
      if (this.queue.length) {
        const m = this.queue[0];
        this.typing = !m.sys;
        this.queue.wait -= dt;
        if (this.queue.wait <= 0) {
          this.queue.shift();
          m.t0 = this.t;
          this.msgs.push(m);
          PD.Audio.ui(m.sys ? 'zap' : 'ping');
          if (m.sys) SM.shake = 0.3 * PD.Settings.shake;
          const nx = this.queue[0];
          this.queue.wait = nx ? (nx.sys ? 0.7 : 0.45 + (nx.text ? nx.text.length * 0.025 : 0.8)) : 0;
          if (!this.queue.length) {
            this.typing = false;
            const n = NODES[this.node];
            if (n.rewind) { this.rewindT = 1.6; this.say('He would have blocked you. Forever. Tutorial mercy: try again, genius.'); }
            else { this.opts = n.opts.filter((o) => !(o.next === 'blocked' && this.noVag)); this.hint = 'PICK A REPLY'; UI.focus = 0; }
          }
        }
      } else this.typing = false;
      if (this.rewindT !== undefined) {
        this.rewindT -= dt;
        if (this.rewindT <= 0) {
          this.rewindT = undefined; this.noVag = true;
          this.msgs.length = this.msgSaveLen; this.trust = this.prev.trust; this.sus = this.prev.sus;
          this.node = 'pic'; this.opts = NODES.pic.opts.filter((o) => o.next !== 'blocked'); UI.focus = 0;
          PD.Audio.ui('whoosh'); this.float('REWIND', 'cyan');
        }
      }
      if (this.picker) this.picker.t += dt;
      if (this.end) this.end.t += dt;
      if (UI.back && !this.picker) { SM.go('menu'); }
    },

    // ---------------- drawing ----------------
    draw(fb) {
      PD.drawSkyline(fb, SM.t, 0.7);
      this.drawOperator(fb);
      this.drawTarget(fb);
      const s = PD.bigPhone(fb, PHONE.x, PHONE.y, PHONE.w, PHONE.h);
      void s;
      const A = this.art;
      A.clear(C('ink', 0));
      if (this.view === 'grid') this.drawGrid(A);
      else if (this.view === 'profile') this.drawProfile(A);
      else this.drawChat(A);
      if (this.toast) {
        const k = easeOut(this.toast.t / 0.2) * (this.toast.t > 1.9 ? 1 - (this.toast.t - 1.9) / 0.3 : 1);
        const lines = PD.wrap(this.toast.text, 32), th = lines.length * 7 + 6, ty = SCR.y + SCR.h - 14 - th + Math.round((1 - k) * 20);
        rr(A, SCR.x + 4, ty, SCR.w - 8, th, C('ink', 3));
        lines.forEach((l, i) => PD.text(A, l, SCR.x + 8, ty + 4 + i * 7, C('ui', 4)));
      }
      fb.blit(A, SCR.x, SCR.y, SCR.w, SCR.h);
      if (this.picker) this.drawPicker(fb);
    },

    drawOperator(fb) {
      PD.panel(fb, 2, 4, 78, 118, 'ink', { fill: 1 });
      hoodIcon(fb, 6, 8);
      PD.text(fb, 'OPERATOR', 31, 10, C('gold', 3));
      PD.text(fb, 'YOU. NO FACE.', 31, 18, C('ink', 4));
      const lines = PD.wrap(this.quip, 17);
      let left = Math.floor(this.qshown);
      lines.slice(0, 11).forEach((l, i) => { PD.text(fb, l.slice(0, Math.max(0, left)), 6, 35 + i * 7, C('ui', 4)); left -= l.length + 1; });
      // tutorial hint
      if (this.hint) {
        const on = Math.sin(this.t * 6) > -0.3;
        PD.panel(fb, 2, 126, 78, 16, 'neon', { fill: on ? 2 : 1 });
        PD.text(fb, '> ' + this.hint, 6, 132, C('ui', 4));
      }
      PD.text(fb, 'ESC: MENU', 6, 170, C('ink', 4));
    },

    drawTarget(fb) {
      PD.panel(fb, 240, 4, 78, 138, 'ink', { fill: 1 });
      PD.text(fb, 'TARGET', 245, 9, C('gold', 3));
      fb.rect(245, 17, 30, 30, C('ink', 0)); fb.rect(246, 18, 28, 28, C('heart', 1));
      for (let j = 0; j < 6; j++) fb.rect(246, 18 + j * 2, 28, 1, C('pride', j));
      PD.drawDude(fb, 260, 92, Object.assign({ s: 2, clip: [246, 18, 28, 28] }, TYLER, { face: this.trust > 50 ? 'happy' : 'smug', blush: this.trust > 30 }));
      PD.text(fb, 'TYLER', 278, 19, C('ui', 4));
      PD.text(fb, '21', 278, 26, C('ink', 4));
      PD.text(fb, 'TWINK', 278, 33, C('neon', 3));
      PD.text(fb, 'BTM', 278, 40, C('neon', 3));
      const bar = (y, label, v, ramp) => {
        PD.text(fb, label, 245, y, C(ramp, 3));
        fb.rect(245, y + 7, 68, 6, C('ink', 0)); fb.rect(246, y + 8, 66, 4, C('ink', 2));
        const w = Math.round(66 * v / 100);
        fb.rect(246, y + 8, w, 4, C(ramp, 2)); fb.rect(246, y + 8, w, 1, C(ramp, 4));
        PD.text(fb, Math.round(v) + '%', 313 - PD.textWidth(Math.round(v) + '%'), y, C('ui', 4));
      };
      bar(52, 'TRUST', this.tShow, 'heart');
      bar(70, 'SUS', this.sShow, 'cloth1');
      PD.text(fb, 'WEAKNESS', 245, 90, C('ink', 4));
      if (this.weak) PD.popAt(fb, this.weakT / 0.3, 279, 101, (f) => { f.rect(244, 97, 70, 9, C('gold', 2)); PD.text(f, 'BLINDFOLD', 247, 99, C('ink', 0)); });
      else PD.text(fb, '???', 245, 99, C('ink', 3));
      PD.text(fb, 'GAY LEVEL', 245, 112, C('ink', 4));
      PD.text(fb, '100%', 245, 120, C('pride', Math.floor(this.t * 6) % 6));
      PD.text(fb, '(FOR NOW)', 263, 120, C('ink', 3));
      PD.text(fb, 'CONVERTS: 0', 245, 132, C('ink', 4));
      // floaters
      this.floaters.forEach((f, i) => {
        const k = f.t / 1.4, y = 64 - k * 30 - i * 2;
        if (k < 0.8 || PD.bayer(0, Math.round(f.t * 20)) > (k - 0.8) * 5) PD.textS(fb, f.text, 279, y, 1, C(f.ramp, 3), { center: true, outline: C('ink', 0) });
      });
    },

    // --- grid ---
    drawGrid(A) {
      const S = SCR, t = this.t;
      PD.appHeader(A, S);
      PD.text(A, '9,999+ ONLINE', S.x + S.w - 54, S.y + 3, C('lime', 3));
      const chips = ['ONLINE', 'FRESH', 'TWINKS', 'NO FEMS'];
      let cx = S.x + 3;
      chips.forEach((c, i) => { const w = PD.textWidth(c) + 6; rr(A, cx, S.y + 14, w, 8, i === 0 ? C('gold', 2) : C('ink', 2)); PD.text(A, c, cx + 3, S.y + 16, i === 0 ? C('ink', 0) : C('ink', 4)); cx += w + 3; });
      const tw = 47, th = 41;
      GRID.forEach((g, i) => {
        const x = S.x + 1 + (i % 3) * (tw + 1), y = S.y + 25 + Math.floor(i / 3) * (th + 1);
        const hov = UI.over(x, y, tw, th);
        PD.popAt(A, (this.vt - i * 0.05) / 0.2, x + tw / 2, y + th / 2, (f) => PD.tile(f, x, y, tw, th, g.dude, g.n, g.d, t, i));
        if (g.tyler) {
          const on = Math.sin(t * 5) > 0;
          A.rect(x, y, tw, 1, on ? C('neon', 4) : C('neon', 2)); A.rect(x, y + th - 1, tw, 1, on ? C('neon', 4) : C('neon', 2));
          A.rect(x, y, 1, th, on ? C('neon', 4) : C('neon', 2)); A.rect(x + tw - 1, y, 1, th, on ? C('neon', 4) : C('neon', 2));
          A.ellipse(x + tw - 6, y + 12, 4.5, 4.5, C('ink', 0)); A.ellipse(x + tw - 6, y + 12, 3.6, 3.6, C('neon', 2)); PD.text(A, '1', x + tw - 7, y + 10, C('ui', 4));
        }
        if (hov) { UI.cursor = 'hand'; A.drect(x, y, tw, th, C('ui', 4), 0.12); }
        if (hov && PD.INPUT.released) {
          if (g.tyler) this.go('profile');
          else { this.toast = { text: 'OPERATOR: ' + g.q, t: 0 }; this.say(g.q); PD.Audio.ui('hover'); }
        }
      });
      if (UI.activate) this.go('profile');
      this.navBar(A, 0);
    },
    navBar(A, active) {
      const S = SCR, y = S.y + S.h - 10;
      A.rect(S.x, y, S.w, 10, C('ink', 0)); A.rect(S.x, y, S.w, 1, C('ink', 2));
      const icons = [['###', '###', '###'], ['###', '#.#', '##.'], ['.#.', '###', '.#.'], ['.#.', '###', '#.#']];
      icons.forEach((ic, i) => PD.sprite(A, ic, S.x + 18 + i * 36, y + 4, i === active ? C('gold', 2) : C('ink', 4)));
    },

    // --- Tyler's profile ---
    drawProfile(A) {
      const S = SCR, t = this.t, X = S.x, Y = S.y;
      // big pic: his bedroom
      const ph = 74;
      A.rect(X, Y, S.w, ph, C('cloth3', 1));
      for (let j = 0; j < 6; j++) A.rect(X + 6, Y + 8 + j * 4, 40, 4, C('pride', j));
      A.rect(X + 5, Y + 7, 1, 30, C('wood', 3));
      for (let i = 0; i < 14; i++) { const lx = X + 4 + i * 10, ly = Y + 4 + Math.sin(i * 0.8) * 3; A.px(lx, ly, (i + Math.floor(t * 3)) % 3 ? C('gold', 4) : C('neon', 3)); }
      // stuffed unicorn on the bed
      const ux = X + 120, uy = Y + 52;
      A.ellipse(ux, uy + 8, 10, 8, C('ink', 0)); A.ellipse(ux, uy + 8, 9, 7, C('ui', 4));
      A.ellipse(ux - 4, uy - 2, 7, 6, C('ink', 0)); A.ellipse(ux - 4, uy - 2, 6, 5, C('ui', 4));
      A.ellipse(ux - 9, uy, 3, 2.5, C('ui', 3)); A.px(ux - 5, uy - 3, C('ink', 0));
      for (let k = 0; k < 5; k++) A.px(ux - 7 + k, uy - 9 + k * 0.4, C('gold', 4 - (k % 2)));
      for (let k = 0; k < 4; k++) A.rect(ux - 1 + k, uy - 6 + k * 2, 2, 3, C('pride', k + 1));
      A.rect(ux - 6, uy + 14, 3, 3, C('ui', 3)); A.rect(ux + 4, uy + 14, 3, 3, C('ui', 3));
      PD.drawDude(A, X + S.w / 2, Y + 120 + Math.round(Math.sin(t * 2) * 0.6), Object.assign({ s: 3, clip: [X, Y, S.w, ph] }, TYLER, { face: 'happy', blush: true }));
      A.rect(X, Y + ph - 10, S.w, 10, C('ink', 0)); A.drect(X, Y + ph - 16, S.w, 6, C('ink', 0), 0.5);
      PD.text(A, 'TYLER, 21', X + 4, Y + ph - 8, C('ui', 4));
      A.rect(X + 44, Y + ph - 7, 3, 3, C('lime', 3)); PD.text(A, '50 FT AWAY', X + S.w - 44, Y + ph - 8, C('lime', 3));
      // back arrow
      const bh = UI.over(X + 1, Y + 1, 14, 10);
      A.rect(X + 2, Y + 2, 12, 9, bh ? C('ink', 3) : C('ink', 1)); PD.text(A, '<', X + 6, Y + 4, C('ui', 4));
      if (bh) UI.cursor = 'hand';
      if (bh && PD.INPUT.released) return this.go('grid');
      // stats + tags + bio
      let y = Y + ph + 3;
      PD.text(A, "5'7  130LB  TWINK  BTM", X + 4, y, C('gold', 3)); y += 9;
      const tags = ['#CUDDLES', '#BLINDFOLD?', '#NOFEMS'];
      let tx = X + 4;
      tags.forEach((tg, i) => { const w = PD.textWidth(tg) + 6; rr(A, tx, y, w, 8, i === 1 && this.weak ? C('gold', 2) : C('neon', 1)); PD.text(A, tg, tx + 3, y + 2, i === 1 && this.weak ? C('ink', 0) : C('ui', 4)); tx += w + 3; });
      y += 12;
      const bio = 'JUST A LIL BOTTOM LOOKING FOR A BIG STRONG MAN TO RUIN ME :3 NO FEMS. NO FATS. NO GIRLS EWWW. MASC TOPS ONLY';
      PD.wrap(bio, 34).forEach((l, i) => PD.text(A, l, X + 4, y + i * 7, C('ui', 3)));
      // buttons
      if (UI.button(A, 'chat', X + 6, Y + S.h - 22, 92, 14, 'CHAT', { ramp: 'gold' })) {
        this.go('chat');
        if (!this.started) { this.started = true; this.run('start'); this.say('He opened his legs before he opened the chat. Talk to him.'); this.hint = 'WAIT FOR HIM...'; }
      }
      if (UI.button(A, 'tap', X + 104, Y + S.h - 22, 34, 14, 'TAP', { ramp: 'neon' })) { this.toast = { text: 'YOU TAPPED HIM. HE TAPPED BACK IN 0.3 SECONDS. DESPERATE.', t: 0 }; }
      if (this.vt < 0.1 && !this.saidProfile) { this.saidProfile = true; this.say('"No girls ewww." Mark that one. He is getting the girl. Hint: that hashtag with the question mark.'); this.hint = 'HIT CHAT'; }
    },

    // --- chat ---
    drawChat(A) {
      const S = SCR, t = this.t, X = S.x, Y = S.y;
      A.rect(X, Y, S.w, S.h, C('ink', 0));
      const header = () => {
        A.rect(X, Y, S.w, 16, C('ink', 1)); A.rect(X, Y + 16, S.w, 1, C('ink', 2));
        const bh = UI.over(X + 1, Y + 3, 10, 10);
        PD.text(A, '<', X + 4, Y + 6, bh ? C('gold', 3) : C('ui', 4));
        A.rect(X + 12, Y + 2, 13, 13, C('heart', 1));
        PD.drawDude(A, X + 18.5, Y + 34, Object.assign({ s: 1, clip: [X + 12, Y + 2, 13, 13] }, TYLER));
        PD.text(A, 'TYLER, 21', X + 29, Y + 3, C('ui', 4));
        PD.text(A, this.typing ? 'TYPING...' : 'ONLINE', X + 29, Y + 10, this.typing ? C('gold', 3) : C('lime', 3));
        if (bh) { UI.cursor = 'hand'; if (PD.INPUT.released && !this.end) this.go('profile'); }
      };
      // options area
      const opts = this.opts || [];
      const oh = opts.length ? opts.length * 15 + 6 : 0;
      const bottom = Y + S.h - oh - 3;
      // messages from the bottom up
      let y = bottom;
      const items = [];
      if (this.typing) items.push({ typing: true });
      for (let i = this.msgs.length - 1; i >= 0; i--) items.push(this.msgs[i]);
      const lastMine = (() => { for (let i = this.msgs.length - 1; i >= 0; i--) if (this.msgs[i].from === 'me') return this.msgs[i]; return null; })();
      for (const m of items) {
        let h, w, lines;
        if (m.typing) { w = 22; h = 10; }
        else if (m.sys) { lines = [up(m.sys)]; w = S.w - 8; h = 11; }
        else if (m.pic) { w = 56; h = 42; }
        else { lines = PD.wrap(m.text, 24); w = Math.max(...lines.map((l) => PD.textWidth(l))) + 8; h = lines.length * 7 + 5; }
        const extra = m === lastMine && !this.typing ? 7 : 0;
        y -= h + 3 + extra;
        if (y < Y + 18) break;
        const mine = m.from === 'me';
        const x = m.sys ? X + 4 : mine ? X + S.w - 4 - w : X + 4;
        const k = m.t0 !== undefined ? (t - m.t0) / 0.18 : 1;
        const draw = (f) => {
          if (m.typing) {
            rr(f, x, y, w, h, C('ink', 3));
            for (let d = 0; d < 3; d++) f.rect(x + 5 + d * 5, y + 4 - (Math.sin(t * 9 - d * 0.9) > 0.3 ? 1 : 0), 2, 2, C('ui', 4));
          } else if (m.sys) {
            rr(f, x, y, w, h, C('cloth1', 2)); PD.text(f, lines[0], x + (w - PD.textWidth(lines[0])) / 2, y + 3, C('ui', 4));
          } else if (m.pic) {
            rr(f, x - 1, y - 1, w + 2, h + 2, mine ? C('gold', 2) : C('ink', 3));
            if (m.pic === 'mine') PD.drawProfilePic(f, x, y, w, h, this.pic, t);
            else {
              f.rect(x, y, w, h, C('cloth3', 1));
              for (let j = 0; j < 6; j++) f.rect(x + 2, y + 2 + j * 3, 20, 3, C('pride', j));
              for (let i = 0; i < 8; i++) f.px(x + 3 + i * 7, y + 1 + (i % 2), C('gold', 4));
              PD.drawDude(f, x + w / 2 + 6, y + 80, Object.assign({ s: 2, clip: [x, y, w, h] }, TYLER, { shirtStyle: 'none', face: 'smug', blush: true }));
            }
          } else {
            rr(f, x, y, w, h, mine ? C('gold', 2) : C('ink', 3));
            lines.forEach((l, i) => PD.text(f, l, x + 4, y + 3 + i * 7, mine ? C('ink', 0) : C('ui', 4)));
          }
        };
        PD.popAt(A, k, mine ? x + w : x, y + h, draw);
        if (extra) PD.text(A, 'READ', X + S.w - 4 - 16, y + h + 2, C('ink', 4));
      }
      header();
      // options
      if (opts.length) {
        A.rect(X, bottom + 1, S.w, S.h - (bottom - Y) - 1, C('ink', 1));
        A.rect(X, bottom + 1, S.w, 1, C('ink', 2));
        opts.forEach((o, i) => {
          const bad = (o.sus || 0) >= 30;
          if (UI.button(A, 'o' + i, X + 6, bottom + 5 + i * 15, S.w - 10, 12, o.t, { ramp: bad ? 'cloth1' : i === 0 ? 'gold' : 'cyan' })) this.choose(o);
        });
      }
      // on-the-way card
      if (this.end) {
        const k = easeOut(this.end.t / 0.4);
        const cy = Y + 30 + Math.round((1 - k) * 120);
        rr(A, X + 6, cy, S.w - 12, 92, C('ink', 0)); rr(A, X + 7, cy + 1, S.w - 14, 90, C('night', 2));
        // tiny map: streets + pin moving toward you
        A.rect(X + 10, cy + 4, S.w - 20, 46, C('night', 1));
        for (let i = 0; i < 6; i++) { A.rect(X + 10 + i * 22, cy + 4, 3, 46, C('night', 3)); }
        for (let j = 0; j < 3; j++) A.rect(X + 10, cy + 10 + j * 16, S.w - 20, 3, C('night', 3));
        const p = clamp(this.end.t / 6, 0, 1), px = X + 20 + p * 90, py = cy + 12 + p * 30;
        PD.sprite(A, PD.HEART, X + 116, cy + 40, C('neon', 3), C('ink', 0));
        A.ellipse(px, py, 3.5, 3.5, C('ink', 0)); A.ellipse(px, py, 2.5, 2.5, C('gold', 3));
        PD.text(A, 'TYLER IS ON HIS WAY', X + 12, cy + 54, C('ui', 4));
        PD.text(A, Math.max(1, 4 - Math.floor(this.end.t / 1.5)) + ' MIN. BLINDFOLD: ON', X + 12, cy + 62, C('gold', 3));
        if (this.end.t > 0.6 && UI.button(A, 'ready', X + 12, cy + 72, S.w - 24, 14, 'GET THE ROOM READY >>', { ramp: 'neon' })) {
          const sv = PD.Save.load() || {}; sv.chapter = 'room'; sv.trick = 'blind'; sv.trust = this.trust; PD.Save.write(sv);
          PD.Audio.ui('start'); SM.go('chapter');
        }
      }
    },

    // --- trick picker (full-screen overlay) ---
    drawPicker(fb) {
      const P = this.picker, t = P.t;
      fb.darken(3);
      PD.popAt(fb, t / 0.3, W / 2, 16, (f) => PD.textS(f, 'PICK THE TRICK', W / 2, 8, 2, C('gold', 3), { center: true, outline: C('ink', 0), shadow: C('neon', 1) }));
      PD.textS(fb, 'TARGET: TYLER, 21   WEAKNESS: ' + (this.weak ? 'BLINDFOLD' : '???'), W / 2, 24, 1, C('cyan', 3), { center: true });
      const cw = 56, gap = 6, x0 = Math.round((W - (cw * 5 + gap * 4)) / 2), cy = 36, ch = 104;
      if (!P.picked) {
        if (UI.navLeft) { P.f = (P.f + 4) % 5; PD.Audio.ui('nav'); }
        if (UI.navRight) { P.f = (P.f + 1) % 5; PD.Audio.ui('nav'); }
      }
      TRICKS.forEach((tr, i) => {
        const x = x0 + i * (cw + gap);
        const hov = UI.over(x, cy, cw, ch);
        if (hov && UI.mouseMode && !P.picked) P.f = i;
        const foc = P.f === i, lockd = !!tr.lock;
        const lift = foc && !P.picked ? -3 : 0;
        const shake = P.shake > 0 && P.shakeI === i ? Math.round(Math.sin(t * 60) * 2) : 0;
        const k = easeOut((t - 0.1 - i * 0.07) / 0.25);
        if (k <= 0) return;
        const yy = cy + lift + Math.round((1 - k) * 40);
        const draw = (f) => {
          const X = x + shake;
          f.rect(X - 1, yy - 1, cw + 2, ch + 2, foc ? C('gold', 4) : C('ink', 0));
          f.rect(X, yy, cw, ch, lockd ? C('ink', 2) : C('night', 3));
          f.rect(X, yy, cw, 3, lockd ? C('ink', 3) : C('neon', 2));
          f.rect(X + 4, yy + 8, cw - 8, 34, lockd ? C('ink', 1) : C('night', 1));
          trickIcon(f, tr.id, X + cw / 2, yy + 25, t);
          tr.name.split('\n').forEach((l, j) => PD.text(f, l, X + (cw - PD.textWidth(l)) / 2, yy + 46 + j * 7, lockd ? C('ink', 4) : C('ui', 4)));
          PD.wrap(tr.blurb, 13).forEach((l, j) => PD.text(f, l, X + 3, yy + 62 + j * 7, lockd ? C('ink', 4) : C('cyan', 3)));
          if (lockd) {
            PD.sprite(f, ['.###.', '#...#', '#####', '##.##', '#####'], X + cw / 2 - 2, yy + 84, C('ink', 4), C('ink', 0));
            PD.text(f, tr.lock, X + (cw - PD.textWidth(tr.lock)) / 2, yy + 93, C('gold', 2));
          } else {
            const m = this.weak ? 95 : 70;
            PD.text(f, 'MATCH', X + 4, yy + 86, C('ink', 4));
            PD.text(f, m + '%', X + cw - 4 - PD.textWidth(m + '%'), yy + 86, C('lime', 3));
            f.rect(X + 4, yy + 94, cw - 8, 4, C('ink', 0)); f.rect(X + 4, yy + 94, Math.round((cw - 8) * m / 100), 4, C('lime', 2));
          }
        };
        if (P.picked === tr.id) PD.popAt(fb, 1 + Math.max(0, 0.15 - (t - P.pt)) , x + cw / 2, yy + ch / 2, draw);
        else draw(fb);
        if (hov) UI.cursor = 'hand';
        if (!P.picked && ((hov && PD.INPUT.released) || (foc && UI.activate))) {
          if (lockd) { P.shake = 0.3; P.shakeI = i; PD.Audio.ui('thud'); this.say(tr.lock.startsWith('$') ? 'Locked. ' + tr.lock + '. You are broke. Convert some fags first.' : 'Upfront? Telling a fag it is a girl and he STILL comes? That is endgame shit.'); }
          else { P.picked = tr.id; P.pt = t; PD.Audio.ui('lock'); SM.shake = 0.15 * PD.Settings.shake; this.say('Blindfold. He literally put it in his tags. Twinks are so easy it is almost sad.'); }
        }
      });
      P.shake = Math.max(0, (P.shake || 0) - 1 / 60);
      if (P.picked) {
        const k = (t - P.pt) / 0.25;
        PD.popAt(fb, k, W / 2, 152, (f) => {
          f.rect(W / 2 - 52, 144, 104, 18, C('cloth1', 4)); f.rect(W / 2 - 50, 146, 100, 14, C('cloth1', 2));
          PD.textS(f, 'TRICK LOCKED IN', W / 2, 150, 1, C('ui', 4), { center: true });
        });
        if (t - P.pt > 1.3) {
          this.picker = null;
          this.msgs.push({ from: 'me', text: 'THE BLINDFOLD STAYS ON. WHOLE TIME ;)', t0: this.t });
          PD.Audio.ui('whoosh');
          this.hint = 'WAIT FOR HIM...';
          this.pending = { next: 'after', wait: 0.8 };
        }
      } else PD.textS(fb, '< >  CHOOSE    ENTER  LOCK IN', W / 2, 168, 1, C('ink', 4), { center: true });
    },
  };
})(window.PD);

// =============================================================================
//  G2S: the game. Everything that isn't drawing bodies lives here: the endless
//  line of generated guys, the Kinsey grind, rhythm judging, tools, climax and
//  edging, chaos events, brainrot bubbles, alumni (idle income), the shop,
//  rebirth cities, achievements, stats and saving.
//  The renderer (game.html) asks GAME how fast and hard he moves, tells GAME
//  when he bottoms out, and hands GAME the 320x180 HUD buffer to draw into.
// =============================================================================
'use strict';
const GAME = (() => {
  const W = 320, H = 180
  const P = { ink: [26, 15, 30], paper: [255, 246, 234], uiD: [43, 27, 51], uiM: [91, 68, 112], uiL: [150, 128, 172], heart: [255, 92, 138],
    blush: [255, 125, 154], brow: [58, 39, 33], gold: [255, 206, 92], green: [120, 220, 140], blue: [120, 180, 255], red: [235, 70, 80], white: [255, 255, 255] }
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const fmt = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n))

  // ------------------------------------------------------------ content ----
  const STAGES = ['DENIAL', 'CONFUSED', 'SLIPPING', 'GONE', 'CONVERTED']
  const stageOf = (k) => k >= 5 ? 0 : k === 4 ? 1 : k === 3 ? 2 : k >= 1 ? 3 : 4
  const ARCH = {
    twink:   { name: 'TWINK', res: 0.8, speed: 1.25, rough: 0.85, stam: 0.9, lube: 1, climax: 1.6, hair: 'swoop', hairC: '#f2dc9a', w: 18,
      bio: ['Iced oat latte enjoyer. Will judge your shoes.', 'Has never seen a pussy and intends to keep it that way.', '5 skincare steps. 0 thoughts. Head empty.'] },
    bear:    { name: 'BEAR', res: 1.1, speed: 0.9, rough: 1.15, stam: 2.2, lube: 0.5, climax: 0.9, hair: 'beard', hairC: '#4a2e1e', w: 14, body: 1,
      bio: ['Woof. Owns a cabin. Owns 40 flannels already.', 'Sweats enough to lube a Honda.', 'Big hugs, bigger thighs, zero interest in women.'] },
    theatre: { name: 'THEATRE KID', res: 0.9, speed: 1.05, rough: 0.9, stam: 1, lube: 1, climax: 1.1, hair: 'curls', hairC: '#7a3b22', w: 12,
      bio: ['Was Elphaba in a high school Wicked. Still is.', 'Will sing at you. Unprompted. Forever.', 'Needs applause the way you need air.'] },
    leather: { name: 'LEATHER DADDY', res: 1.2, speed: 1.1, rough: 1.45, stam: 1.4, lube: 1, climax: 0.9, hair: 'cap', hairC: '#2a2420', w: 10, body: 1,
      bio: ['Owns a harness for every day of the week.', 'Calls everyone boy. Calls you ma\'am. Panics.', 'Takes charge. Breaks beds. Pays for them.'] },
    jock:    { name: 'CLOSETED JOCK', res: 1.3, speed: 1.1, rough: 1.2, stam: 1.3, lube: 1, climax: 1, hair: 'backcap', hairC: '#3a2618', w: 12,
      bio: ['Totally straight. Just loves locker rooms.', 'Says no homo after every high five.', 'His bros cannot know about his Grindr.'] },
    pup:     { name: 'PUP', res: 0.9, speed: 1.15, rough: 1, stam: 1.2, lube: 1, climax: 1.2, hair: 'pup', hairC: '#222', w: 8,
      bio: ['Good boy. Wears the hood to brunch.', 'Communicates mostly in barks. Has a law degree.', 'Will fetch. Will not touch a woman. Probably.'] },
    gaymer:  { name: 'GAYMER', res: 1, speed: 0.95, rough: 0.9, stam: 0.8, lube: 1, climax: 1, hair: 'headset', hairC: '#5b3a8e', w: 10,
      bio: ['Diamond in Valorant. Bronze in touching grass.', 'Will pause to check Discord. Mid-stroke.', 'His waifu is a man. Was always a man.'] },
    drag:    { name: 'DRAG QUEEN OFF DUTY', res: 1, speed: 1, rough: 1, stam: 1.1, lube: 1, climax: 1, hair: 'wig', hairC: '#f4d36b', w: 8,
      bio: ['Off duty. Still contoured. Still fabulous.', 'The wig stays on. The wig always stays on.', 'Has read you three times since you met.'] },
    goldstar:{ name: 'GOLD STAR GYM BRO', res: 2.2, speed: 1.05, rough: 1.3, stam: 1.8, lube: 1, climax: 0.8, hair: 'buzz', hairC: '#2b1d14', w: 0, gold: 1,
      bio: ['Kinsey 6.0. Never touched a woman. Never will. Allegedly.', 'Counts reps out loud. Counts everything out loud.', 'Creatine for breakfast. Men for dinner.'] },
  }
  const FIRST = ['Brayden', 'Chad', 'Marcus', 'Tyler', 'Jaxon', 'Dmitri', 'Kai', 'Theo', 'Logan', 'Connor', 'Mateo', 'Darnell', 'Finn', 'Rico', 'Jesse', 'Hunter', 'Ezra', 'Bastian', 'Colt', 'Andre', 'Kyle', 'Trent', 'Javier', 'Noah', 'Dante']
  const NICK = ['Brunch', 'Protein', 'Glitter', 'Twinkletoes', 'Bicep', 'Mimosa', 'Sashay', 'Big Dog', 'Leg Day', 'Pilates', 'Cardio', 'Gains', 'Matcha', 'Serve']
  const LAST = ['Kowalski', 'Glitterman', 'Delgado', 'Vance', 'Moss', 'Rivera', 'Holt', 'Bishop', 'Okafor', 'Lindqvist', 'Sato', 'Delacroix', 'Price', 'Hart', 'Novak', 'Reyes', 'Fabulosa', 'Strutt']
  const JOBS = ['brand ambassador', 'barista (oat only)', 'personal trainer', 'Pilates instructor', 'Equinox front desk', 'influencer (2K)', 'musical theatre swing', 'Sephora team lead', 'crypto', 'twink of all trades', 'DJ (unpaid)', 'nepo baby']
  const NOW_ENJOYS = ['pussy', 'Joe Rogan', 'cargo shorts', 'telling people about creatine', 'fantasy football', 'Monster Energy', '3-in-1 shampoo', 'Nickelback', 'grilling', 'his truck', 'saying "females"', 'one (1) shirt', 'Call of Duty', 'calling his boys "boys"']
  const RARITY = [['COMMON', 60, 1, P.uiL], ['UNCOMMON', 25, 1.6, P.green], ['RARE', 10, 2.6, P.blue], ['EPIC', 4, 4.5, [200, 120, 255]], ['LEGENDARY', 1, 9, P.gold]]
  const TONES = [['#c08050', '#9a5046'], ['#a86a3e', '#844236'], ['#8a542e', '#6c3626'], ['#68391e', '#52281a'], ['#cc966a', '#a65a4e'], ['#b4733f', '#8e4a3c'], ['#e0b08a', '#b4685c']]
  const LINES = {
    0: [['THIS DOES NOTHING', 'FOR ME. AT ALL.'], ['IS SHE DONE YET?', 'I HAVE BRUNCH.'], ['WOW. A VAGINA.', 'SO... WET? EW.'], ['THIS IS JUST A', 'FAVOR. NO HOMO.']],
    1: [['OK IT\'S WARM.', 'STILL GAY THO.'], ['WHY IS IT GRIPPING', 'ME LIKE THAT'], ['WAIT. HOLD ON.', 'DO THAT AGAIN.']],
    2: [['WHY IS IT SO WARM??', 'THIS IS JUST A PHASE'], ['MY BOYFRIEND CAN\'T', 'KNOW ABOUT THIS'], ['IS THIS WHAT', 'STRAIGHT GUYS FEEL?']],
    3: [['OH FUCK. OH FUCK.', 'PUSSY\'S SO GOOD'], ['I\'M NEVER GOING', 'TO BRUNCH AGAIN'], ['DELETE GRINDR.', 'DELETE IT NOW.']],
    4: [['BRO I THINK I\'M', 'STRAIGHT NOW BRO'], ['BRO. PUSSY IS SO', 'MUCH BETTER. LOCK IN'], ['CREATINE. FOOTBALL.', 'PUSSY. THAT\'S IT.']],
  }
  const ARCH_LINES = {
    theatre: [['APPLAUSE! I NEED', 'APPLAUSE!'], ['THIS IS MY', 'ELPHABA MOMENT']], pup: [['ARF ARF', 'ARF!!'], ['WOOF. WAIT.', 'WOOF?']],
    gaymer: [['HOLD ON THE', 'SQUAD IS PINGING'], ['GG. WAIT', 'NOT GG']], jock: [['NO HOMO. NO HOMO.', 'NO HOMO.'], ['MY BROS CAN\'T', 'SEE THIS']],
    leather: [['ON YOUR... OH.', 'NO, I\'M ON YOU.'], ['THE HARNESS', 'IS CHAFING']], drag: [['THE WIG STAYS', 'ON, HONEY'], ['SHE IS SERVING.', 'WAIT. SHE IS.']],
    bear: [['WOOF. I MEAN.', 'NICE.'], ['HOT IN HERE.', 'SWEATING. SORRY.']], twink: [['OMG OMG OMG', 'OMG??'], ['I\'M GONNA', 'I\'M GONNA-']],
    goldstar: [['REP. REP. REP.', 'REP. REP.'], ['NEVER TOUCHED ONE.', 'NEVER WILL. UNTIL-']],
  }
  const MOANS = ['AH~', 'MMF', 'FUCK', 'OH GOD', 'NNGH', 'HAH~', 'YES', 'OHH']
  const BRAINROT = [['ICED OAT LATTE', 'MONSTER ENERGY'], ['BROADWAY', 'FANTASY FOOTBALL'], ['SKINCARE', '3-IN-1 SHAMPOO'], ['CHARLI XCX', 'NICKELBACK'], ['BRUNCH', 'WINGS'], ['PILATES', 'BENCH PRESS'], ['GRINDR', 'TINDER'], ['RUPAUL', 'JOE ROGAN']]
  const CITIES = [
    { name: 'SMALL TOWN, OHIO', boss: 'KYLE', title: 'THE ONLY GAY IN THE VILLAGE', arch: 'theatre', n: 1 },
    { name: 'FIRE ISLAND', boss: 'SPEEDO STEVE', title: 'NEVER WORE PANTS', arch: 'twink', n: 1 },
    { name: 'WEST HOLLYWOOD', boss: 'DADDY GLITTERBEARD', title: 'HE IS SO TALL', arch: 'bear', n: 1 },
    { name: 'THE CASTRO', boss: 'THE LEATHER COUNCIL', title: '3 DADDIES. BACK TO BACK.', arch: 'leather', n: 3 },
    { name: 'MYKONOS', boss: 'ADONIS MYKONOPOULOS', title: 'KINSEY 7', arch: 'goldstar', n: 1, k: 7 },
    { name: 'THE GAY SPACE STATION', boss: 'TWINK ZERO', title: 'BORN IN ZERO GRAVITY', arch: 'twink', n: 1 },
  ]
  const cityOf = (t) => t < CITIES.length ? CITIES[t] : { name: 'PRIDE PARADE ' + (t - CITIES.length + 1), boss: 'THE GRAND MARSHAL', title: 'ENDLESS. FABULOUS.', arch: pick(Object.keys(ARCH)), n: 2 }
  const BOSS_AFTER = 5
  const UPGRADES = {
    bed:    { name: 'BED', tiers: ['IKEA FLATPACK', 'STEEL FRAME', 'INDUSTRIAL HYDRAULIC', 'THE ALTAR'], cost: [0, 400, 2500, 15000], desc: 'Sturdier bed: survives rough guys, +15% points per tier.' },
    lube:   { name: 'BETTER LUBE', max: 3, cost: [150, 900, 5000], desc: 'Lube lasts 30% longer per level.' },
    ring:   { name: 'BIGGER PULSE RING', max: 3, cost: [200, 1200, 6000], desc: 'Timing window 15% wider per level.' },
    drink:  { name: 'ENERGY DRINKS', max: 3, cost: [180, 1000, 5500], desc: 'Stamina drains 20% slower per level.' },
    roomba: { name: 'ROOMBA', max: 1, cost: [1500], desc: 'Sweeps a condom off the floor every 12s.' },
    speaker:{ name: 'BUTT ROCK SPEAKERS', max: 1, cost: [3000], desc: 'Kinsey stops drifting back up while you are idle.' },
  }
  const PERKS = {
    gaydar:  { name: 'GAYDAR', cost: 1, desc: '+20% arousal from every hit.' },
    trust:   { name: 'TRUST FUND', cost: 1, desc: '+30% points forever.' },
    muscle:  { name: 'MUSCLE MEMORY', cost: 2, desc: 'Timing window +20%.' },
    stamina: { name: 'BEAR GENES', cost: 2, desc: 'Every guy has 40% more stamina.' },
    lounge:  { name: 'BRO LOUNGE WIFI', cost: 3, desc: 'Alumni earn double, offline cap 24h.' },
    starter: { name: 'STARTER PACK', cost: 3, desc: 'Start each city with Better Lube 1 and a Steel bed.' },
    mirror:  { name: 'MIRROR MODE', cost: 5, desc: 'Unlocks Mirror Mode (S2G) in settings. Coming soon.' },
  }
  const JOBS_ALUMNI = { wingman: ['WINGMAN', 'Starts every new guy 15 arousal in.'], hype: ['HYPE MAN', '+3% combo points each. LET\'S GOOO.'], roomba: ['ROOMBA GUY', 'Sweeps condoms for you.'], lubeboy: ['LUBE BOY', 'Tops up the lube when it runs low.'] }
  const ACH = {
    first: ['JUST THIS ONCE', 'Convert your first guy.'], bi: ['BI THE WAY', 'Get a guy down to Kinsey 3.'], plumber: ['PLUMBER', '100 creampies.'],
    speed: ['SPEEDRUN HETERO', 'Convert a guy in under 2 minutes.'], gold: ['GOLD STAR BREAKER', 'Convert a Gold Star gym bro.'], combo50: ['LOCKED IN', 'Reach a 50 combo.'],
    bed: ['BED BREAKER', 'Break a bed.'], shiny: ['SHINY HUNTER', 'Meet a shiny guy.'], mega: ['EDGE LORD', 'Land a mega-nut.'], sweep: ['CLEAN FREAK', 'Sweep 50 condoms.'],
    join: ['NO HOMO', 'Let the roommate join.'], lounge10: ['LOUNGE LIZARD', '10 alumni in the Bro Lounge.'], rebirth: ['THE STRAIGHT AGENDA', 'Rebirth for the first time.'],
    konami: ['UP UP DOWN DOWN', 'You know what you did.'],
  }

  // --------------------------------------------------------------- save ----
  const KEY = 'g2s_save_v1'
  const fresh = () => ({ v: 1, pts: 0, flannel: 0, tier: 0, cityConv: 0, runConv: 0, perks: {}, upg: { bed: 0, lube: 0, ring: 0, drink: 0, roomba: 0, speaker: 0 },
    alumni: [], ach: {}, stats: { conv: 0, creampies: 0, condoms: 0, litres: 0, beds: 0, nohomo: 0, perfects: 0, time: 0, megas: 0, swept: 0, bestCombo: 0, events: 0 },
    settings: { climax: 'creampie', pixel: false, gray: false, lamp: true, sound: false }, last: Date.now(), daily: '', bossBeaten: false, guy: null })
  let S
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}) } catch (e) { S = fresh() }
  S.upg = Object.assign(fresh().upg, S.upg); S.stats = Object.assign(fresh().stats, S.stats); S.settings = Object.assign(fresh().settings, S.settings)
  function save() { S.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (e) {} }

  // ------------------------------------------------------------ the guy ----
  function rollRarity() { let r = Math.random() * 100; for (let i = 0; i < RARITY.length; i++) { r -= RARITY[i][1]; if (r <= 0) return i } return 0 }
  function makeGuy(opts = {}) {
    const keys = Object.keys(ARCH).filter((k) => !ARCH[k].gold)
    let rar = opts.rar ?? rollRarity()
    let arch = opts.arch || (rar === 4 && Math.random() < 0.6 ? 'goldstar' : pick(keys))
    if (arch === 'goldstar') rar = 4
    const A = ARCH[arch], city = cityOf(S.tier)
    const tone = opts.tone || pick(TONES)
    const ft = 5 + Math.floor(rnd(7, 12) / 12), inch = Math.floor(rnd(7, 12)) % 12, real = inch - 2
    const g = {
      first: opts.first || pick(FIRST), nick: opts.nick ?? (Math.random() < 0.6 ? pick(NICK) : ''), last: opts.last ?? pick(LAST),
      arch, rar, shiny: opts.shiny ?? Math.random() < 1 / 500, tone, hairC: A.hairC, body: A.body || (Math.random() < 0.3 ? 1 : 0),
      cock: rnd(5.5, 9.5).toFixed(1), height: `${ft}'${inch} (${real < 0 ? ft - 1 : ft}'${(real + 12) % 12})`, job: opts.job || pick(JOBS),
      bio: opts.bio || pick(A.bio), kinsey: opts.k ?? 6, arousal: S.alumni.filter((a) => a.job === 'wingman').length ? 15 : 0,
      res: A.res * Math.pow(1.35, S.tier) * (1 + rar * 0.12) * (opts.resMul || 1), boss: !!opts.boss, daily: !!opts.daily, born: Date.now(), took: 0,
    }
    if (g.shiny) g.res *= 1.3
    g.title = opts.title || ''
    return g
  }
  function reward(g) { return Math.round(120 * RARITY[g.rar][2] * Math.pow(1.6, S.tier) * (g.shiny ? 5 : 1) * (g.boss ? 6 : 1) * (g.daily ? 5 : 1)) }

  // ------------------------------------------------------------ run state ----
  const R = { hearts: 5, combo: 0, lube: 100, stam: 100, climax: 0, pressure: 0, edging: false, clarity: 0, condoms: [], bedHP: 100, paused: 0, pauseWhy: '',
    loopT: 0, frame: 0, lastSlam: -9, clock: 0, sinceHit: 0, power: 1, pops: [], event: null, nextEvent: rnd(35, 60), line: null, lineT: 0, thought: 0,
    card: 5, convertedCard: false, flash: 0, wig: null, toast: [], cream: 0, lastTapAt: -9, gaymerT: rnd(18, 35), lubeCd: 0, roombaT: 12, holdT: 0, bossQueue: [], kon: [] }
  let META = null
  const guy = () => S.guy

  // --------------------------------------------------------- multipliers ----
  const ptsMul = () => (1 + 0.15 * S.upg.bed) * (S.perks.trust ? 1.3 : 1) * (1 + 0.03 * S.alumni.filter((a) => a.job === 'hype').length) * (1 + Math.min(R.combo, 60) * 0.03)
  const windowMul = () => (1 + 0.15 * S.upg.ring) * (S.perks.muscle ? 1.2 : 1)
  const stage = () => stageOf(guy().kinsey)
  function speed() {
    if (R.paused > 0) return 0.12
    const g = guy(), A = ARCH[g.arch]
    let v = [0.75, 0.9, 1.05, 1.25, 1.4][stage()] * A.speed
    if (R.lube < 20) v *= 0.65
    if (R.stam < 25) v *= 0.6
    if (R.clarity > 0) v *= 0.7
    if (R.edging) v *= 0.8
    return v
  }
  function power() { const A = ARCH[guy().arch]; return [0.7, 0.85, 1.0, 1.25, 1.5][stage()] * A.rough * R.power }

  // -------------------------------------------------------------- toasts ----
  function pop(text, x, y, col = P.paper, life = 0.8, big = false) { R.pops.push({ text, x, y, col, life, t: 0, big }) }
  function toast(text, col = P.gold) { R.toast.push({ text, t: 0, col }) }
  function unlock(id) { if (S.ach[id]) return; S.ach[id] = Date.now(); toast('TROPHY: ' + ACH[id][0]); sfx('ding'); save() }
  function say(lines, t = 3.5) { R.line = lines; R.lineT = t }

  // ------------------------------------------------------------- timing -----
  const loopLen = () => META.frames.reduce((a, f) => a + f.ms, 0) / 1000
  const slamAt = () => META.frames.slice(0, 3).reduce((a, f) => a + f.ms, 0) / 1000
  function frameAt(t) { let x = t * 1000, i = 0; const F = META.frames; while (i < F.length - 1 && x >= F[i].ms) { x -= F[i].ms; i++ } return i }
  function toNextSlam() { const L = loopLen(), d = ((slamAt() - R.loopT) % L + L) % L; return d / Math.max(0.05, speed()) }

  // -------------------------------------------------------------- tick ------
  // called by the renderer every frame; returns which sprite frame to show
  function tick(dt) {
    if (!META) return 0
    R.clock += dt; S.stats.time += dt
    const g = guy(), A = ARCH[g.arch], st = stage()
    // loop time runs at his speed
    const L = loopLen(), before = R.loopT
    R.loopT = (R.loopT + dt * speed()) % L
    const sa = slamAt(); let slam = false
    if ((before < sa && R.loopT >= sa) || (R.loopT < before && (sa >= before || sa <= R.loopT))) slam = true
    R.frame = frameAt(R.loopT)
    if (slam) onSlam()
    // resources
    if (R.paused > 0) { R.paused -= dt; if (R.paused <= 0 && R.pauseWhy === 'water') { R.stam = 100; pop('REFRESHED', 160, 40, P.blue) } }
    R.lube = clamp(R.lube - dt * 1.6 * A.lube * Math.pow(0.7, S.upg.lube) * (st >= 3 ? 1.3 : 1), 0, 100)
    R.stam = clamp(R.stam - dt * 0.9 * [0.8, 1, 1.15, 1.35, 1.5][st] / A.stam / (S.perks.stamina ? 1.4 : 1) * Math.pow(0.8, S.upg.drink), 0, 100)
    if (R.lube < 30 && S.alumni.some((a) => a.job === 'lubeboy') && R.lubeCd <= 0) { R.lube = 100; R.lubeCd = 3; pop('LUBE BOY!', 280, 40, P.blue) }
    R.lubeCd = Math.max(0, R.lubeCd - dt)
    // condoms on the floor cost hearts; roomba / roomba guys sweep
    const sweepers = (S.upg.roomba ? 1 : 0) + S.alumni.filter((a) => a.job === 'roomba').length
    if (sweepers && R.condoms.length) { R.roombaT -= dt * sweepers; if (R.roombaT <= 0) { R.condoms.shift(); S.stats.swept++; R.roombaT = 12; pop('*VRRR*', 250, 160, P.uiL) } }
    if (R.condoms.length > 2) { R.condomT = (R.condomT || 0) + dt; if (R.condomT > 15) { R.condomT = 0; loseHeart('THE FLOOR IS GROSS') } }
    // ignoring him: arousal drains, then the Kinsey drifts back up
    R.sinceHit += dt
    if (R.sinceHit > 6 && g.kinsey > 0 && !S.upg.speaker) {
      g.arousal -= dt * 6
      if (g.arousal < 0) { if (g.kinsey < 6) { g.kinsey++; g.arousal = 60; say(['THIS IS JUST', 'A PHASE.']); pop('KINSEY +1', 270, 30, P.red) } else g.arousal = 0 }
    }
    // post-nut clarity
    if (R.clarity > 0) { R.clarity -= dt; if (R.clarity <= 0) say(['OK. OK. I\'M BACK.', 'WHERE WAS I?']) }
    // edging
    if (R.edging) { R.pressure += dt * 34; if (R.pressure >= 100) { R.edging = false; climax(false, true) } }
    else R.pressure = Math.max(0, R.pressure - dt * 25)
    if (R.cream > 0) R.cream = Math.max(0, R.cream - dt * 0.03)
    // archetype quirks
    if (g.arch === 'gaymer' && g.kinsey > 0) { R.gaymerT -= dt; if (R.gaymerT <= 0) { R.gaymerT = rnd(25, 45); R.paused = 2.6; R.pauseWhy = 'discord'; say(['BRB. DISCORD.', 'THE SQUAD NEEDS ME']); sfx('ping') } }
    if (g.arch === 'drag' && st >= 2 && !g.wigGone) { g.wigGone = true; R.wig = { x: 30, y: 120, vx: 140, vy: -170, r: 0 }; say(['MY WIG!!', 'SHE FLEW OFF!']); pop('WIG OFF!', 60, 96, P.gold, 1.4, true) }
    if (R.wig) { R.wig.x += R.wig.vx * dt; R.wig.y += R.wig.vy * dt; R.wig.vy += 260 * dt; R.wig.r += dt * 9; if (R.wig.y > 200) R.wig = null }
    // lines and thoughts
    R.lineT -= dt; if (R.lineT <= 0) { const pool = [...LINES[st], ...((ARCH_LINES[g.arch] && st < 4) ? ARCH_LINES[g.arch] : [])]; const l = pick(pool); say(l, rnd(3.5, 5)); if (l.join(' ').includes('NO HOMO')) S.stats.nohomo++ }
    R.thought += dt
    // chaos
    if (!R.event && g.kinsey > 0 && R.card <= 0) { R.nextEvent -= dt; if (R.nextEvent <= 0) startEvent() }
    if (R.event) { R.event.t -= dt; if (R.event.t <= 0) failEvent() }
    // popups and timers
    R.pops.forEach((p) => p.t += dt); R.pops = R.pops.filter((p) => p.t < p.life)
    R.toast.forEach((p) => p.t += dt); R.toast = R.toast.filter((p) => p.t < 3)
    if (R.card > 0 && !R.convertedCard) R.card -= dt
    R.flash = Math.max(0, R.flash - dt * 2.5)
    R.power = Math.max(0.85, R.power - dt * 0.8)
    // the guy sheds his gay stuff, shinies shimmer
    if (S.stats.time % 30 < dt) save()
    return R.frame
  }

  // ------------------------------------------------------------- the beat ----
  function onSlam() {
    const g = guy()
    if (g.kinsey <= 0) return
    // the bed takes a beating from rough guys
    const rough = ARCH[g.arch].rough * [0.6, 0.8, 1, 1.2, 1.3][stage()]
    R.bedHP -= rough * 0.35 / (1 + S.upg.bed * 0.9)
    if (R.bedHP < 25 && !R.event && Math.random() < 0.02) startEvent('bed')
    if (R.bedHP <= 0) breakBed()
    sfx('plap', power())
  }
  function judgeTap() {
    const g = guy(); if (!META || g.kinsey <= 0 || R.card > 0) return
    R.lastTapAt = R.clock
    if (R.clarity > 0) { R.clarity = Math.max(0, R.clarity - 0.35); pop('MASH!', rnd(140, 180), 70, P.paper, 0.4) }
    const toNext = toNextSlam(), since = R.clock - R.lastSlamClock()
    const off = Math.min(toNext, Math.abs(since)), win = windowMul() * (R.lube < 20 ? 0.75 : 1)
    let j, gain
    if (off < 0.065 * win) { j = 'PERFECT!'; gain = 10; S.stats.perfects++ }
    else if (off < 0.14 * win) { j = 'GOOD'; gain = 6 }
    else { j = 'MISS'; gain = 0 }
    const A = ARCH[g.arch]
    if (gain) {
      R.combo++; R.sinceHit = 0; R.power = gain > 8 ? 1.8 : 1.4
      S.stats.bestCombo = Math.max(S.stats.bestCombo, R.combo); if (R.combo >= 50) unlock('combo50')
      let pts = gain * ptsMul() * (g.arch === 'theatre' ? 2 : 1) * Math.pow(1.6, S.tier)
      S.pts += pts
      const ar = gain / g.res * (S.perks.gaydar ? 1.2 : 1) * (R.clarity > 0 ? 0.5 : 1) * (R.lube < 20 ? 0.6 : 1)
      g.arousal += ar
      R.climax = Math.min(100, R.climax + (gain > 8 ? 4 : 3) * A.climax)
      pop(j, 160, 66, gain > 8 ? P.gold : P.paper, 0.6)
      if (Math.random() < 0.45) pop(g.arch === 'pup' ? pick(['ARF', 'ARF ARF', 'AWOO']) : pick(MOANS), rnd(95, 225), rnd(30, 60), P.blush, 0.8)
      if (g.arch === 'goldstar' || g.arch === 'jock' && Math.random() < 0.3) pop('REP ' + R.combo + '!', 200, 84, P.gold, 0.7)
      if (g.arch === 'theatre' && R.combo % 10 === 0) pop('*APPLAUSE*', 160, 50, P.gold, 1)
      if (S.alumni.some((a) => a.job === 'hype') && R.combo % 25 === 0) pop('LET\'S GOOO!', 160, 40, P.green, 1.2, true)
      while (g.arousal >= 100) { g.arousal -= 100; dropKinsey(1) }
      if (R.climax >= 100 && !R.edging) climax(false, false)
    } else {
      if (g.arch === 'theatre' && R.combo > 3) loseHeart('MY HEART! YOU MISSED!')
      R.combo = 0; pop(j, 160, 66, P.uiL, 0.5)
    }
  }
  function dropKinsey(n) {
    const g = guy(), from = g.kinsey
    g.kinsey = Math.max(0, g.kinsey - n)
    if (g.kinsey <= 3 && from > 3) unlock('bi')
    if (stageOf(g.kinsey) !== stageOf(from)) { pop(STAGES[stageOf(g.kinsey)], 160, 30, P.heart, 1.6, true); sfx('stage'); R.thought = 0 }
    else pop('KINSEY ' + g.kinsey, 270, 30, P.heart, 1.2)
    if (g.kinsey <= 0) convert()
    save()
  }
  function climax(early, overflow) {
    const g = guy(), A = ARCH[g.arch]
    R.flash = 1; R.climax = 0; R.pressure = 0; R.edging = false
    const cm = S.settings.climax
    if (cm === 'condom') { R.condoms.push({ x: rnd(196, 300), y: rnd(150, 172), r: Math.random() < 0.5 }); S.stats.condoms++ }
    else { R.cream = 1; S.stats.creampies++; if (S.stats.creampies >= 100) unlock('plumber') }
    S.stats.litres += rnd(0.004, 0.012) * (A.res > 1 ? 1.5 : 1)
    if (overflow || (g.arch === 'twink' && g.kinsey > 3)) {
      say(['...THAT HAS LITERALLY', 'NEVER HAPPENED BEFORE.'], 4); pop('TOO EARLY!', 160, 50, P.uiL, 1.4, true)
      g.arousal += 20
    } else { pop(cm === 'condom' ? 'FILLED IT!' : 'CREAMPIE!', 160, 50, P.paper, 1.4, true); g.arousal += 60 }
    S.pts += 50 * ptsMul() * Math.pow(1.6, S.tier)
    sfx('nut')
    // post-nut clarity: he wobbles back toward gay unless you mash
    if (g.kinsey > 1) { R.clarity = 6; say(['WAIT. WHAT AM I', 'DOING...'], 4) }
    while (g.arousal >= 100) { g.arousal -= 100; dropKinsey(1) }
  }
  function megaNut() {
    const g = guy(); R.flash = 1.6; R.climax = 0; R.pressure = 0; R.edging = false
    S.stats.megas++; unlock('mega')
    if (S.settings.climax === 'condom') { R.condoms.push({ x: rnd(196, 300), y: rnd(150, 172), r: Math.random() < 0.5 }); S.stats.condoms++ } else { R.cream = 1; S.stats.creampies++ }
    S.stats.litres += 0.02
    pop('MEGA NUT!!', 160, 46, P.gold, 2, true); pop('-2 KINSEY', 160, 58, P.heart, 2)
    say(['OH MY GOD.', 'I SAW GOD. SHE\'S A GIRL.'], 4)
    S.pts += 300 * ptsMul() * Math.pow(1.6, S.tier)
    sfx('nut')
    dropKinsey(2)
  }
  function convert() {
    const g = guy()
    g.took = (Date.now() - g.born) / 1000
    S.stats.conv++; S.cityConv++; S.runConv++
    const pts = reward(g); S.pts += pts * ptsMul() / (1 + Math.min(R.combo, 60) * 0.03)
    unlock('first'); if (g.took < 120) unlock('speed'); if (g.arch === 'goldstar') unlock('gold')
    const jobs = Object.keys(JOBS_ALUMNI)
    S.alumni.push({ name: fullName(g), first: g.first, arch: g.arch, rar: g.rar, shiny: g.shiny, tone: g.tone, hairC: g.hairC, job: pick(jobs), body: g.body, since: Date.now(),
      enjoys: [pick(NOW_ENJOYS), pick(NOW_ENJOYS), pick(NOW_ENJOYS)].filter((v, i, a) => a.indexOf(v) === i) })
    if (S.alumni.length >= 10) unlock('lounge10')
    if (g.boss) { R.bossQueue.shift(); if (!R.bossQueue.length) { S.bossBeaten = true; toast('BOSS DOWN! REBIRTH IS OPEN', P.green) } }
    R.convertedCard = true; R.card = 0; R.flash = 1.2
    sfx('stage')
    save()
  }
  function fullName(g) { return g.first + (g.nick ? ' "' + g.nick + '" ' : ' ') + g.last }
  function nextGuy() {
    const city = cityOf(S.tier)
    if (R.bossQueue.length) { S.guy = R.bossQueue[0] }
    else if (S.cityConv >= BOSS_AFTER && !S.bossBeaten) {
      for (let i = 0; i < city.n; i++) R.bossQueue.push(makeGuy({ arch: city.arch, rar: 4, boss: true, first: city.n > 1 ? 'COUNCILMAN ' + (i + 1) : city.boss, nick: '', last: city.n > 1 ? '' : '', title: city.title, k: city.k ?? 6, resMul: 1.8 }))
      S.guy = R.bossQueue[0]; toast('BOSS: ' + city.boss, P.red)
    } else if (R.pendingRoommate) { R.pendingRoommate = false; S.guy = makeGuy({ first: 'THE ROOMMATE', nick: '', last: '', bio: 'Walked in. Stayed. No homo. (Some homo.)' }) }
    else if (R.pendingDaily) { R.pendingDaily = false; S.guy = makeGuy({ daily: true, resMul: 2, rar: 3, title: 'DAILY STUBBORN GUY', bio: 'Has resisted 400 women. You are number 401.' }) }
    else S.guy = makeGuy()
    if (S.guy.shiny) unlock('shiny')
    Object.assign(R, { hearts: 5, combo: 0, lube: 100, stam: 100, climax: 0, pressure: 0, clarity: 0, card: 6, convertedCard: false, sinceHit: 0, event: null, nextEvent: rnd(30, 55), wig: null })
    R.lineT = 0
    hooks.onGuy && hooks.onGuy(S.guy)
    sfx('ding'); save()
  }
  function loseHeart(why) {
    R.hearts--; pop('-1 HEART', 40, 26, P.red, 1.2); say([why.slice(0, 20), ''], 2.5); sfx('bad')
    if (R.hearts <= 0) { toast(guy().first.toUpperCase() + ' GOT SPOOKED AND LEFT', P.red); nextGuy() }
  }
  function breakBed() {
    R.bedHP = 100; S.stats.beds++; unlock('bed'); R.paused = 2.5; R.pauseWhy = 'bed'; R.combo = 0
    pop('*CRASH*', 160, 120, P.red, 1.6, true); say(['THE BED!', 'WE BROKE THE BED!']); sfx('crash')
  }

  // ------------------------------------------------------------ chaos -------
  const EVENTS = {
    grindr:   { title: 'GRINDR', text: '"HEY :) U UP?" - TOP4TOP', btn: ['SWIPE AWAY'], t: 3.5 },
    ex:       { title: 'NEW MESSAGE', text: 'EX: U UP?', btn: ['BLOCK'], t: 3.5 },
    roommate: { title: 'ROOMMATE WALKS IN', text: 'HE IS STARING.', btn: ['WE\'RE STUDYING', 'FOR SCIENCE', 'JOIN?'], t: 5 },
    mom:      { title: 'MOM CALLING...', text: 'SHE KNOWS. SHE ALWAYS KNOWS.', btn: ['DECLINE'], t: 3.5 },
    neighbor: { title: '*BANG BANG BANG*', text: 'NEIGHBOR: KEEP IT DOWN!', btn: ['SORRY!!'], t: 3.5 },
    bed:      { title: 'THE BED IS CREAKING', text: 'TAP FAST TO HOLD IT TOGETHER', btn: ['HOLD IT'], t: 4, mash: 6 },
    abba:     { title: 'SHUFFLE', text: 'NOW PLAYING: DANCING QUEEN', btn: ['SKIP'], t: 3 },
  }
  function startEvent(id) {
    id = id || pick(Object.keys(EVENTS).filter((k) => k !== 'bed' || R.bedHP < 60))
    const E = EVENTS[id]
    R.event = { id, ...E, t: E.t, max: E.t, n: 0 }
    sfx('ping')
  }
  function failEvent() {
    const e = R.event; R.event = null; R.nextEvent = rnd(35, 70)
    const g = guy()
    if (e.id === 'bed') return breakBed()
    if (e.id === 'roommate') { R.combo = 0; say(['UHH. HI BRAD.', 'THIS ISN\'T WHAT IT LOOKS']); return }
    if (g.kinsey < 6) { g.kinsey++; g.arousal = 50 }
    R.combo = 0
    const lines = { grindr: ['OOH WHO\'S THIS', 'HE\'S CUTE...'], ex: ['OMG HE MISSES ME', 'I KNEW IT'], mom: ['HI MOM! YES! I\'M', 'AT... PILATES'], neighbor: ['SORRY MRS. GARCIA!', ''], abba: ['OMG MY SONG!!', 'YOU CAN DANCE!'] }
    say(lines[e.id] || ['...', ''], 3); pop('KINSEY +1', 270, 30, P.red, 1.2); sfx('bad')
  }
  function answerEvent(i) {
    const e = R.event; if (!e) return
    if (e.mash) { e.n++; pop('!', rnd(130, 190), rnd(60, 80), P.paper, 0.3); if (e.n < e.mash) return; R.bedHP = Math.max(R.bedHP, 60) }
    R.event = null; R.nextEvent = rnd(35, 70); S.stats.events++
    if (e.id === 'roommate') {
      if (i === 2) { R.pendingRoommate = true; unlock('join'); S.stats.nohomo++; say(['...NO HOMO?', 'NO HOMO.']); toast('BONUS GUY: THE ROOMMATE IS NEXT', P.green) }
      else if (i === 1) { guy().arousal += 25; say(['YES. SCIENCE.', 'VERY SCIENTIFIC.']) }
      else say(['YEP. STUDYING.', 'ANATOMY.'])
    } else pop('NICE SAVE', 160, 40, P.green, 0.9)
    sfx('ding')
  }

  // ------------------------------------------------------------ tools -------
  const TOOLS = [
    { id: 'lube', name: 'LUBE', icon: 'lube' }, { id: 'broom', name: 'BROOM', icon: 'broom' }, { id: 'water', name: 'WATER', icon: 'water' },
    { id: 'edge', name: 'EDGE (HOLD)', icon: 'edge' }, { id: 'new', name: 'NEW LOVER', icon: 'pose' },
  ]
  function toolRect(i) { return { x: W - 14, y: 40 + i * 15, w: 12, h: 13 } }
  function useTool(id, down) {
    const g = guy()
    if (id === 'lube') { if (R.lube < 99) { R.lube = 100; pop('SPLRT', 270, 34, P.blue); sfx('squelch') } }
    if (id === 'broom') { if (R.condoms.length) { R.condoms.pop(); S.stats.swept++; if (S.stats.swept >= 50) unlock('sweep'); pop('SWEPT', 250, 150, P.paper); sfx('ding') } else pop('FLOOR IS CLEAN', 250, 150, P.uiL) }
    if (id === 'water') { if (R.paused <= 0) { R.paused = 1.6; R.pauseWhy = 'water'; say(['*GLUG GLUG*', 'OK. AGAIN.']) } }
    if (id === 'edge') {
      if (down) { if (R.climax >= 60) { R.edging = true; R.pressure = Math.max(R.pressure, 10) } else pop('NOT CLOSE YET', 250, 90, P.uiL) }
      else if (R.edging) { R.edging = false; if (R.pressure >= 70 && R.pressure < 92) megaNut(); else if (R.pressure >= 92) climax(false, true); else pop('EASED OFF', 250, 90, P.uiL) }
    }
    if (id === 'new') { if (g.kinsey <= 0) nextGuy(); else pop('CONVERT HIM FIRST', 200, 168, P.uiL) }
  }

  // ------------------------------------------------------------ input -------
  let held = null
  function pointerDown(x, y) {
    unlockAudio()
    // dating card: tap to dismiss
    if (R.convertedCard) { if (hit(btnNext, x, y) || true) { R.convertedCard = false; nextGuy() } return }
    if (R.card > 0) { R.card = 0; return }
    if (R.event) { const bs = eventButtons(); for (let i = 0; i < bs.length; i++) if (hit(bs[i], x, y)) { answerEvent(i); return } }
    for (let i = 0; i < TOOLS.length; i++) if (hit(toolRect(i), x, y)) { held = TOOLS[i].id; useTool(held, true); return }
    if (guy().kinsey <= 0 && hit(btnNext, x, y)) { nextGuy(); return }
    if (hit({ x: 2, y: 2, w: 74, h: 12 }, x, y)) { hooks.openPanel && hooks.openPanel('shop'); return }
    judgeTap()
  }
  function pointerUp() { if (held === 'edge') useTool('edge', false); held = null }
  const KON = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
  function key(e, down) {
    if (down) { R.kon.push(e.code); R.kon = R.kon.slice(-10); if (R.kon.join() === KON.join()) { R.rainbow = !R.rainbow; guy().kinsey = 6; guy().arousal = 0; unlock('konami'); toast('RAINBOW MODE. HE IS A 6 AGAIN.', P.heart) } }
    if (e.code === 'Space') { e.preventDefault(); if (down && !e.repeat) pointerDown(-1, -1) }
    if (e.code === 'KeyE') { if (down && !e.repeat) useTool('edge', true); if (!down) useTool('edge', false) }
    if (down && e.code === 'KeyL') useTool('lube', true)
    if (down && e.code === 'KeyB' && R.kon.slice(-1)[0] !== 'KeyB') useTool('broom', true)
    if (down && e.code === 'KeyW') useTool('water', true)
  }
  const hit = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
  const btnNext = { x: 120, y: 150, w: 80, h: 12 }
  function eventButtons() { const e = R.event, n = e.btn.length, bw = n === 1 ? 70 : 66, tot = n * bw + (n - 1) * 4, x0 = 160 - tot / 2; return e.btn.map((b, i) => ({ x: Math.round(x0 + i * (bw + 4)), y: 52, w: bw, h: 11, label: b })) }

  // ------------------------------------------------------------- audio ------
  let AC = null, music = null
  function unlockAudio() { if (!S.settings.sound || AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); startMusic() } catch (e) {} }
  function noise(len, f, type = 'lowpass', gain = 0.4, fEnd) {
    if (!AC || !S.settings.sound) return; const t = AC.currentTime, n = Math.floor(AC.sampleRate * len), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0)
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 4) }
    const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t + len)
    const g = AC.createGain(); g.gain.value = gain; s.connect(fl).connect(g).connect(AC.destination); s.start(t) }
  function tone(freq, len, type = 'square', gain = 0.08, slide) {
    if (!AC || !S.settings.sound) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len)
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + len) }
  function sfx(n, v = 1) {
    if (n === 'plap') { noise(0.09, 800 + v * 500, 'lowpass', 0.25 + v * 0.15); tone(90, 0.08, 'sine', 0.2) }
    if (n === 'squelch') noise(0.18, 500, 'bandpass', 0.3, 1600)
    if (n === 'ding') { tone(880, 0.12); setTimeout(() => tone(1320, 0.15), 70) }
    if (n === 'ping') { tone(1200, 0.08, 'sine', 0.12); setTimeout(() => tone(1600, 0.1, 'sine', 0.12), 90) }
    if (n === 'bad') tone(220, 0.25, 'sawtooth', 0.07, 110)
    if (n === 'stage') [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14), i * 80))
    if (n === 'nut') { noise(0.5, 300, 'lowpass', 0.3, 2000); [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'square', 0.06), i * 60)) }
    if (n === 'crash') { noise(0.6, 400, 'lowpass', 0.6, 80); tone(80, 0.5, 'sawtooth', 0.15, 40) }
  }
  // disco chiptune while he's gay, 8-bit butt rock once he's gone
  function startMusic() {
    if (music) return
    let step = 0
    music = setInterval(() => {
      if (!AC || !S.settings.sound) return
      const g = guy(), rock = stage() >= 3, bpm = rock ? 140 : 120
      const disco = [0, 12, 7, 12, 3, 15, 7, 15], riff = [0, 0, 12, 0, 10, 0, 7, 5], root = rock ? 82.4 : 110
      const n = (rock ? riff : disco)[step % 8]
      tone(root * Math.pow(2, n / 12), 0.12, rock ? 'sawtooth' : 'square', 0.025)
      if (step % 2 === 0) noise(0.04, rock ? 300 : 6000, rock ? 'lowpass' : 'highpass', rock ? 0.25 : 0.08)
      step++
    }, 60000 / 140 / 2)
  }

  // ------------------------------------------------------------- drawing ----
  const hexc = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const shade = (c, f) => c.map((v) => clamp(Math.round(v * f), 0, 255))
  const rainbow = (t) => { const h = (t * 120) % 360 / 60, x = 1 - Math.abs(h % 2 - 1); const [r, g, b] = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x]; return [r * 255, g * 255, b * 255].map(Math.round) }
  function panel(c, x, y, w, h, fill = P.uiD, border = P.ink) { c.rect(x, y, w, h, border); c.rect(x + 1, y + 1, w - 2, h - 2, fill) }
  function vbar(c, x, y, w, h, v, col) { c.rect(x, y, w, h, P.ink); const f = Math.round((h - 2) * clamp(v, 0, 1)); c.rect(x + 1, y + h - 1 - f, w - 2, f, col) }
  function bar(c, x, y, w, h, v, col, label) { c.rect(x, y, w, h, P.ink); c.rect(x + 1, y + 1, Math.round((w - 2) * clamp(v, 0, 1)), h - 2, col); if (label) c.text(label, x - label.length * 4 - 2, y + Math.round((h - 5) / 2), P.paper) }
  // his face: procedural pixel portrait, 34x40, changes with archetype and stage
  function portrait(c, x0, y0, g, st, t, small) {
    const skin = hexc(g.tone[0]), sk = [shade(skin, 0.72), skin, shade(skin, 1.12)], hair = hexc(g.hairC), hd = shade(hair, 0.7)
    const S2 = small ? 0.5 : 1, px = (x, y, col) => { if (small) { if (x % 2 === 0 && y % 2 === 0) c.px(x0 + x / 2, y0 + y / 2, col) } else c.px(x0 + x, y0 + y, col) }
    const rect = (x, y, w, h, col) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, col) }
    const ell = (cx, cy, rx, ry, col) => { for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1) px(i, j, col) }
    // neck + shoulders, head
    rect(11, 32, 12, 8, sk[0]); ell(17, 41, 16, 6, g.shiny ? rainbow(t) : P.uiM)
    ell(17, 19, 11, 13, sk[1]); ell(15, 16, 8, 9, sk[2]); ell(17, 26, 7, 5, sk[1])
    ell(6, 20, 2, 3, sk[0]); ell(28, 20, 2, 3, sk[0])
    const style = ARCH[g.arch].hair
    if (style === 'swoop') { ell(14, 8, 11, 5, hair); ell(9, 11, 5, 4, hair); rect(18, 5, 9, 4, shade(hair, 1.15)) }
    if (style === 'beard') { ell(17, 7, 10, 4, hair); ell(17, 28, 10, 7, hair); ell(17, 24, 4, 2, sk[1]); rect(9, 18, 2, 8, hair); rect(24, 18, 2, 8, hair) }
    if (style === 'curls') for (let i = 0; i < 9; i++) ell(7 + i * 2.5, 7 + (i % 2) * 2, 3, 3, i % 2 ? hair : hd)
    if (style === 'cap') { ell(17, 8, 12, 5, P.ink); rect(5, 9, 24, 3, [40, 36, 40]); rect(15, 5, 4, 2, P.gold) }
    if (style === 'backcap') { ell(17, 8, 11, 5, [40, 80, 160]); rect(24, 8, 6, 3, [30, 60, 130]) }
    if (style === 'pup') { ell(17, 9, 12, 7, P.ink); rect(6, 1, 4, 6, P.ink); rect(24, 1, 4, 6, P.ink); rect(7, 2, 2, 4, P.red); rect(25, 2, 2, 4, P.red); rect(10, 13, 14, 2, P.red) }
    if (style === 'headset') { ell(17, 8, 10, 4, hair); rect(5, 6, 3, 16, P.ink); rect(27, 6, 3, 16, P.ink); rect(6, 4, 23, 2, P.ink); rect(4, 15, 4, 7, [120, 220, 140]); rect(27, 15, 4, 7, [120, 220, 140]) }
    if (style === 'wig' && !g.wigGone) { ell(17, 9, 14, 8, hair); rect(3, 9, 6, 22, hair); rect(26, 9, 6, 22, hair); ell(12, 6, 5, 3, shade(hair, 1.2)) }
    if (style === 'wig' && g.wigGone) { ell(17, 8, 10, 4, [90, 70, 60]); for (let i = 7; i < 28; i += 3) px(i, 6, [60, 50, 50]) }
    if (style === 'buzz') { ell(17, 8, 10, 4, hd); for (let i = 8; i < 27; i += 2) px(i, 6, hair) }
    // brows, eyes, mouth by stage
    const brow = [shade(hair, 0.8)]
    const ey = 18, lx = 12, rx = 22
    if (st === 0) { rect(lx - 2, ey - 4, 5, 1, brow[0]); rect(rx - 2, ey - 4, 5, 1, brow[0]); rect(lx - 2, ey, 5, 1, P.ink); rect(rx - 2, ey, 5, 1, P.ink); rect(lx, ey + 1, 2, 1, P.white); rect(rx, ey + 1, 2, 1, P.white); px(lx + 1, ey + 1, P.ink); px(rx + 1, ey + 1, P.ink); rect(14, 27, 6, 1, P.ink); px(20, 26, P.ink) }
    if (st === 1) { rect(lx - 2, ey - 5, 4, 1, brow[0]); rect(rx - 1, ey - 4, 4, 1, brow[0]); for (const e of [lx, rx]) { rect(e - 2, ey - 1, 5, 4, P.white); rect(e, ey, 2, 2, P.ink) } rect(15, 27, 4, 2, P.ink) }
    if (st === 2) { rect(lx - 2, ey - 6, 5, 1, brow[0]); rect(rx - 2, ey - 6, 5, 1, brow[0]); for (const e of [lx, rx]) { rect(e - 2, ey - 2, 5, 5, P.white); px(e, ey, P.ink) } ell(17, 28, 3, 2, P.ink); rect(16, 28, 2, 1, P.blush) }
    if (st === 3) { for (const e of [lx, rx]) { rect(e - 2, ey, 5, 1, P.ink); px(e - 2, ey - 1, P.ink); px(e + 2, ey - 1, P.ink) } ell(17, 28, 4, 3, P.ink); rect(15, 29, 5, 2, P.blush); if (t % 1 < 0.5) rect(16, 31, 2, 3, P.blush) }
    if (st === 4) { for (const e of [lx, rx]) { const hc = P.heart; px(e - 1, ey - 1, hc); px(e + 1, ey - 1, hc); rect(e - 2, ey, 5, 1, hc); rect(e - 1, ey + 1, 3, 1, hc); px(e, ey + 2, hc) } rect(13, 27, 9, 1, P.ink); px(12, 26, P.ink); px(22, 26, P.ink); rect(14, 28, 7, 1, P.white) }
    // blush + sweat climb with the stage
    if (st >= 1) for (const e of [lx - 2, rx + 1]) for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0 || st >= 3) px(e + i - 1, ey + 4 + j, P.blush)
    if (st >= 2) { const sy = 8 + Math.floor(t * 4) % 6; px(28, sy, P.blue); px(28, sy + 1, P.white); if (st >= 3) { px(5, sy + 3, P.blue); px(5, sy + 4, P.white) } }
    if (g.shiny) { const rc = rainbow(t); for (let i = 0; i < 34; i += 2) { px(i, 0, rc); px(i, 39, rc) } }
  }
  function card(c, g, converted, t) {
    const x = 70, y = 18, w = 180, h = 130
    panel(c, x, y, w, h, [250, 244, 248], P.ink)
    c.rect(x + 1, y + 1, w - 2, 12, converted ? [70, 110, 190] : P.heart)
    c.text(converted ? 'PROFILE UPDATED' : (g.boss ? 'BOSS FIGHT' : g.daily ? 'DAILY STUBBORN GUY' : 'NEW MATCH!'), x + 5, y + 4, P.paper)
    const rc = RARITY[g.rar][3]; const rn = (g.shiny ? 'SHINY ' : '') + RARITY[g.rar][0]
    c.text(rn, x + w - rn.length * 4 - 5, y + 4, g.shiny ? rainbow(t) : (converted ? P.paper : P.ink))
    panel(c, x + 5, y + 17, 38, 44, [210, 200, 220], rc)
    portrait(c, x + 7, y + 19, g, converted ? 4 : 0, t)
    const tx = x + 48, name = g.first.toUpperCase() + (g.last ? ' ' + g.last.toUpperCase() : '')
    c.text(name, tx, y + 18, P.ink); if (g.nick) c.text('"' + g.nick.toUpperCase() + '"', tx, y + 25, P.uiM)
    c.text(ARCH[g.arch].name, tx, y + 33, rc.map((v) => v * 0.6))
    c.text('HEIGHT: ' + g.height, tx, y + 41, P.ink); c.text('JOB: ' + g.job.toUpperCase().slice(0, 26), tx, y + 48, P.ink)
    c.text('KINSEY: ' + (converted ? '0' : g.kinsey) + '   ' + g.cock + ' IN', tx, y + 55, converted ? [60, 140, 80] : P.heart)
    const text = converted ? 'NOW ENJOYS: ' + S.alumni[S.alumni.length - 1].enjoys.join(', ').toUpperCase() + '.' : (g.title ? g.title + '. ' : '') + g.bio.toUpperCase()
    wrap(text, 42).slice(0, 6).forEach((l, i) => c.text(l, x + 5, y + 66 + i * 7, P.ink))
    if (converted) { c.text('+' + fmt(reward(g)) + ' POINTS. JOINED THE BRO LOUNGE', x + 5, y + 110, [60, 140, 80]); c.text('JOB: ' + JOBS_ALUMNI[S.alumni[S.alumni.length - 1].job][0], x + 5, y + 117, P.uiM) }
    const label = converted ? 'TAP: NEW LOVER' : 'TAP TO START', bw = label.length * 4 + 10
    c.rect(160 - bw / 2, y + h - 12, bw, 9, P.ink); c.text(label, 160 - bw / 2 + 5, y + h - 10, P.paper)
  }
  function wrap(s, n) { const w = s.split(' '), out = []; let l = ''; for (const x of w) { if ((l + ' ' + x).trim().length > n) { out.push(l.trim()); l = x } else l += ' ' + x } if (l.trim()) out.push(l.trim()); return out }
  function icon(c, id, x, y) {
    if (UI.ICONS[id]) return c.sprite(UI.ICONS[id], x, y, { k: P.ink, w: P.paper, p: P.heart, b: [90, 150, 230] })
    if (id === 'edge') c.sprite(['..k..', '.kpk.', 'kpppk', 'kpwpk', 'kpppk', '.kpk.', '..k..'], x + 1, y, { k: P.ink, p: P.heart, w: P.paper })
  }
  function draw(c, ring) {
    const g = guy(), st = stage(), t = R.clock
    // room decor turns straight with him (left wall: flag -> pennant; right wall: Gaga -> Scarface; ring light -> beer sign)
    const dx = 8, dy = 42
    if (st < 3) { const stripes = [[228, 3, 3], [255, 140, 0], [255, 237, 0], [0, 128, 38], [0, 77, 255], [117, 7, 135]]; c.rect(dx - 1, dy - 1, 1, 22, P.ink); stripes.forEach((s, i) => c.rect(dx, dy + i * 2, 18, 2, s)) }
    else { c.rect(dx - 1, dy - 1, 1, 22, P.ink); for (let j = 0; j < 12; j++) c.rect(dx, dy + j, Math.max(1, 20 - j * 1.6), 1, j % 4 === 0 ? P.paper : [180, 30, 40]); c.text('GO', dx + 2, dy + 2, P.paper) }
    panel(c, 272, 120, 30, 26, st < 3 ? [240, 220, 240] : [20, 20, 20], P.ink); c.text(st < 3 ? 'GAGA' : 'SCAR', 279, 126, st < 3 ? P.heart : P.paper); c.text(st < 3 ? '****' : 'FACE', 279, 134, st < 3 ? P.gold : [220, 40, 40])
    if (st < 3) { for (let a = 0; a < 6.28; a += 0.4) c.px(Math.round(30 + Math.cos(a) * 7), Math.round(110 + Math.sin(a) * 7), P.white) } else { c.text('BEER', 18, 108, (t % 1 < 0.8) ? [255, 160, 60] : [120, 70, 30]) }
    // his rainbow socks (on his heels) come off at Slipping
    if (st < 2 && !g.boss) for (const fx of [79, 225]) for (let j = 0; j < 6; j++) c.rect(fx, 160 + j, 14, 1, [[228, 3, 3], [255, 140, 0], [255, 237, 0], [0, 128, 38], [0, 77, 255], [117, 7, 135]][j])
    // leather daddy / pup harness straps across his back until he's gone
    if ((g.arch === 'leather' || g.arch === 'pup') && st < 3) { for (let x = 128; x <= 192; x++) { const y = Math.round(6 + Math.abs(x - 160) * 0.18); c.px(x, y, P.ink); c.px(x, y + 1, [60, 40, 30]) } c.ring(160, 12, 3, [200, 200, 210]) }
    // creampie drip
    if (R.cream > 0) { const n = Math.ceil(R.cream * 9); for (let i = 0; i < n; i++) { const x = 150 + (i * 7) % 20, len = 3 + ((i * 13) % 7) + Math.floor((1 - R.cream) * 12); for (let j = 0; j < len; j++) c.px(x + (j > 4 ? 1 : 0), 99 + j, j === len - 1 ? [230, 230, 236] : P.white) } }
    // condoms on the floor
    R.condoms.forEach((k) => c.sprite(k.r ? ['..kk.', '.kwwk', 'kwwwk', '.kwk.', '..k..'] : ['.kk..', 'kwwk.', 'kwwwk', '.kwwk', '..kk.'], Math.round(k.x), Math.round(k.y), { k: P.ink, w: [236, 226, 210] }))
    // rhythm ring on her hips
    if (g.kinsey > 0 && R.card <= 0 && !R.convertedCard) { const d = toNextSlam(), L = loopLen() / Math.max(0.05, speed()); UI.rhythm(c, 160, 96, d / L < 0.8 ? d / L / 0.8 : 0, P, null) }
    // top left: points, hearts, combo
    panel(c, 1, 1, 76, 12); c.text(fmt(S.pts) + ' PTS', 4, 4, P.gold); c.text('+', 70, 4, P.green)
    for (let i = 0; i < 5; i++) c.sprite(UI.HEART, 3 + i * 9, 15, { k: P.ink, h: i < R.hearts ? P.heart : P.uiD })
    if (R.combo > 1) c.textOutlined('X' + R.combo + ' COMBO', 3, 24, R.combo >= 25 ? P.gold : P.paper, P.ink)
    // top right: kinsey meter, his stage + arousal, the nut meter (and edge pressure while you hold)
    const kx = W - 100, ky = 2
    panel(c, kx - 3, ky - 1, 84, 37)
    c.text('KINSEY', kx, ky + 1, P.paper); c.text(String(g.kinsey), kx + 74, ky + 1, P.heart)
    for (let i = 0; i < 6; i++) { const lit = i < 6 - Math.min(6, g.kinsey); c.rect(kx + i * 13, ky + 8, 11, 4, lit ? (R.rainbow ? rainbow(t + i * 0.3) : P.heart) : P.uiM) }
    c.text(STAGES[st], kx, ky + 15, P.blush); bar(c, kx + 44, ky + 15, 34, 5, g.arousal / 100, [255, 190, 120])
    c.text('NUT', kx, ky + 23, P.paper); bar(c, kx + 14, ky + 23, 64, 5, R.climax / 100, R.climax >= 60 ? P.heart : [200, 120, 160])
    if (R.edging || R.pressure > 0) { c.text('EDGE', kx, ky + 29, P.gold); bar(c, kx + 18, ky + 29, 60, 4, R.pressure / 100, R.pressure >= 70 && R.pressure < 92 ? P.green : R.pressure >= 92 ? P.red : P.uiL); c.rect(kx + 18 + Math.round(60 * 0.7), ky + 29, 1, 4, P.paper); c.rect(kx + 18 + Math.round(60 * 0.92), ky + 29, 1, 4, P.paper) }
    // right column: tools with their meters
    TOOLS.forEach((tl, i) => {
      const r = toolRect(i), hot = held === tl.id
      c.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, P.ink); c.rect(r.x, r.y, r.w, r.h, hot ? P.heart : P.uiM); icon(c, tl.icon, r.x + 2, r.y + 2)
      const warn = (tl.id === 'lube' && R.lube < 25) || (tl.id === 'broom' && R.condoms.length > 2) || (tl.id === 'water' && R.stam < 30) || (tl.id === 'edge' && R.climax >= 60) || (tl.id === 'new' && g.kinsey <= 0)
      if (warn && t % 0.6 < 0.3) c.box(r.x - 2, r.y - 2, r.w + 4, r.h + 4, P.gold)
    })
    vbar(c, W - 19, 40, 4, 13, R.lube / 100, P.blue); vbar(c, W - 19, 70, 4, 13, R.stam / 100, P.green)
    if (R.condoms.length) c.text(String(R.condoms.length), W - 21, 59, R.condoms.length > 2 ? P.red : P.paper)
    // bottom left: his face + what he says
    panel(c, 2, 128, 38, 44, [60, 44, 70], g.shiny ? rainbow(t) : RARITY[g.rar][3])
    portrait(c, 4, 130, g, st, t)
    if (R.line && R.line[0]) UI.speech(c, 43, 150, R.line.filter(Boolean), P)
    // brainrot thought bubble: his thoughts swap to straight ones as he converts
    if (R.card <= 0 && !R.convertedCard) {
      const prog = (6 - Math.min(6, g.kinsey)) / 6, idx = Math.floor(R.thought / 2.4) % BRAINROT.length, pair = BRAINROT[idx]
      const flipped = (idx + 1) / BRAINROT.length <= prog + 0.05, txt = st >= 4 ? (Math.floor(t * 2) % 2 ? 'PUSSY' : 'PUSSY PUSSY') : flipped ? pair[1] : pair[0]
      const bw = txt.length * 4 + 8; panel(c, 44, 104, bw, 11, P.paper, P.ink); c.text(txt, 48, 107, flipped || st >= 4 ? [180, 60, 40] : [150, 60, 170])
      c.px(40, 120, P.paper); c.px(42, 117, P.paper); c.px(41, 117, P.paper)
    }
    // flying wig
    if (R.wig) { const w = R.wig; for (let j = -4; j < 4; j++) for (let i = -6; i < 6; i++) if ((i * i) / 36 + (j * j) / 16 <= 1) c.px(Math.round(w.x + i * Math.cos(w.r) - j * Math.sin(w.r)), Math.round(w.y + i * Math.sin(w.r) + j * Math.cos(w.r)), hexc('#f4d36b')) }
    // floating text
    R.pops.forEach((p) => { const y = Math.round(p.y - p.t * 14), s = p.text; if (p.big) { c.textOutlined(s, Math.round(p.x - s.length * 2), y, p.col, P.ink) } else c.textOutlined(s, Math.round(p.x - s.length * 2), y, p.col, P.ink) })
    // paused for a reason
    if (R.paused > 0) { const m = R.pauseWhy === 'water' ? 'WATER BREAK' : R.pauseWhy === 'discord' ? 'CHECKING DISCORD...' : 'BED DOWN!'; c.textOutlined(m, 160 - m.length * 2, 120, P.paper, P.ink) }
    if (R.clarity > 0) { const m = 'POST-NUT CLARITY! MASH!'; c.textOutlined(m, 160 - m.length * 2, 132, t % 0.4 < 0.2 ? P.gold : P.paper, P.ink) }
    // chaos event popup
    if (R.event) {
      const e = R.event; panel(c, 72, 24, 176, 42, [245, 240, 250], P.ink); c.rect(73, 25, 174, 9, P.red); c.text(e.title, 77, 27, P.paper)
      c.text(e.text.slice(0, 42), 77, 37, P.ink); c.rect(73, 46, Math.round(174 * e.t / e.max), 2, P.red)
      if (e.mash) c.text(e.n + '/' + e.mash, 220, 37, P.red)
      eventButtons().forEach((b) => { c.rect(b.x, b.y, b.w, b.h, P.ink); c.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, P.heart); c.text(b.label, b.x + Math.round((b.w - b.label.length * 4) / 2), b.y + 3, P.paper) })
    }
    // NEW LOVER button once he's converted
    if (g.kinsey <= 0 && !R.convertedCard) { c.rect(btnNext.x, btnNext.y, btnNext.w, btnNext.h, P.ink); c.rect(btnNext.x + 1, btnNext.y + 1, btnNext.w - 2, btnNext.h - 2, P.heart); c.text('NEW LOVER', btnNext.x + 22, btnNext.y + 4, P.paper) }
    // climax flash
    if (R.flash > 0) { const a = Math.min(0.7, R.flash * 0.5); for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) c.px(x, y, P.white, a) }
    // cards
    if (R.card > 0 && !R.convertedCard) card(c, g, false, t)
    if (R.convertedCard) card(c, g, true, t)
    // toasts
    R.toast.forEach((p, i) => { const s = p.text, w = s.length * 4 + 8, x = 160 - w / 2, y = 4 + i * 12 - (p.t > 2.6 ? (p.t - 2.6) * 30 : 0); panel(c, Math.round(x), Math.round(y), w, 10, P.ink, p.col); c.text(s, Math.round(x + 4), Math.round(y + 3), p.col) })
  }

  // ------------------------------------------------------------- panels -----
  // the menus are HTML (they're full of text); the renderer shows them in a modal
  function buy(id) {
    const U = UPGRADES[id], lv = S.upg[id], max = U.tiers ? U.tiers.length - 1 : U.max
    if (lv >= max) return; const cost = U.tiers ? U.cost[lv + 1] : U.cost[lv]
    if (S.pts < cost) return; S.pts -= cost; S.upg[id]++; if (id === 'bed') R.bedHP = 100; sfx('ding'); save()
  }
  function buyPerk(id) { const p = PERKS[id]; if (S.perks[id] || S.flannel < p.cost) return; S.flannel -= p.cost; S.perks[id] = 1; sfx('ding'); save() }
  function flannelNow() { return Math.max(1, Math.floor(Math.sqrt(S.runConv / 10)) * (S.tier + 1)) }
  function rebirth() {
    if (!S.bossBeaten) return
    const f = flannelNow(); S.flannel += f; S.tier++; S.cityConv = 0; S.runConv = 0; S.bossBeaten = false; S.pts = 0
    S.upg = fresh().upg; S.alumni = []
    if (S.perks.starter) { S.upg.lube = 1; S.upg.bed = 1 }
    unlock('rebirth'); R.bossQueue = []; toast('WELCOME TO ' + cityOf(S.tier).name, P.green); nextGuy(); save()
  }
  function daily() { const d = new Date().toDateString(); if (S.daily === d) return false; S.daily = d; R.pendingDaily = true; save(); toast('DAILY STUBBORN GUY IS NEXT', P.gold); return true }
  function passiveRate() { return S.alumni.reduce((a, al) => a + 0.6 * RARITY[al.rar][2] * (al.shiny ? 5 : 1), 0) * (S.perks.lounge ? 2 : 1) * Math.pow(1.6, S.tier) }
  function offline() {
    const away = Math.min((Date.now() - (S.last || Date.now())) / 1000, (S.perks.lounge ? 24 : 8) * 3600)
    if (away > 30 && S.alumni.length) { const earned = passiveRate() * away; S.pts += earned; return { away, earned } }
    return null
  }

  // ---------------------------------------------------------------- boot ----
  const hooks = {}
  function init(meta, h) {
    META = meta; Object.assign(hooks, h || {})
    const off = offline()
    if (!S.guy) nextGuy(); else { hooks.onGuy && hooks.onGuy(S.guy); R.card = S.guy.kinsey > 0 ? 4 : 0; if (S.guy.kinsey <= 0) R.convertedCard = true }
    if (off) toast('WHILE YOU WERE AWAY: +' + fmt(off.earned) + ' PTS', P.green)
    setInterval(() => { S.pts += passiveRate(); }, 1000)
  }
  window.addEventListener('beforeunload', save)
  document.addEventListener('visibilitychange', () => { if (document.hidden) save() })
  R.lastSlamClock = () => R.clock - (((R.loopT - slamAt()) % loopLen() + loopLen()) % loopLen()) / Math.max(0.05, speed())

  return {
    S, R, ARCH, UPGRADES, PERKS, JOBS_ALUMNI, ACH, RARITY, CITIES, STAGES, cityOf, BOSS_AFTER,
    init, tick, draw, speed, power, guy, stage, pointerDown, pointerUp, key, save, buy, buyPerk, rebirth, flannelNow, daily, passiveRate, fmt, portrait, unlockAudio,
    sheen: () => 1 + stage() * 0.35 + (ARCH[guy().arch].lube < 1 ? 0.6 : 0), rainbowOn: () => !!R.rainbow, shinyOn: () => !!guy().shiny,
    reset() { localStorage.removeItem(KEY); location.reload() },
  }
})()

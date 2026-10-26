// Mating press, close camera. Hand-drawn layer over the traced bodies.
// Bodies: traced from the 3D reference (cbase.px.js). Genitals: drawn here by hand,
// placed at the anchor points the reference measured for each keyframe.
include("palette.px.js")
include("cbase.px.js")

// darker step for hand outlines (sel-out by hand: the line follows the colour it borders)
const DARK = { a: "o", b: "a", c: "b", d: "c", e: "c", f: "x", g: "f", h: "f", i: "g", j: "x", k: "j", m: "j", p: "k",
  u: "x", v: "u", F: "V", G: "F", H: "F", I: "G", J: "H", K: "V", A: "O", B: "A", C: "B", D: "C" }
// outline every transparent pixel touching the shape, except rows < skipTop (where it joins a body)
function handOutline(c, skipTop = 0, forceKey) {
  const pts = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.is(x, y, ".") || y < skipTop) continue
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const X = x + dx, Y = y + dy
      if (X < 0 || Y < 0 || X >= c.w || Y >= c.h || c.is(X, Y, ".")) continue
      pts.push([x, y, forceKey || DARK[c.key(X, Y)] || "V"]); break
    }
  }
  for (const [x, y, k] of pts) c.px(x, y, k)
}

// ------------------------------------------------------------------ balls ---
// Two testicles in one sack: left one hangs a touch lower, raphe seam down the middle,
// rugae (wrinkle folds) as short curved strokes, light from the upper left.
// round-form shading: base, then offset nested lit shapes toward the light, dark rim away from it
function orb(c, cx, cy, rx, ry, keys, clipFn) {
  const [rim, base, lit, hi] = keys
  const inE = (x, y, ex, ey, ax, ay) => ((x - ex) / ax) ** 2 + ((y - ey) / ay) ** 2 <= 1
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (!inE(x + 0.5, y + 0.5, cx, cy, rx, ry) || (clipFn && !clipFn(x, y))) continue
    let k = base
    if (!inE(x + 0.5, y + 0.5, cx - 1.2, cy - 1.4, rx - 0.6, ry - 0.6)) k = rim
    if (inE(x + 0.5, y + 0.5, cx - rx * 0.28, cy - ry * 0.30, rx * 0.62, ry * 0.58)) k = lit
    if (hi && inE(x + 0.5, y + 0.5, cx - rx * 0.42, cy - ry * 0.46, Math.max(1, rx * 0.18), Math.max(1, ry * 0.14))) k = hi
    c.px(x, y, k)
  }
}
// Two testicles in one sack: left hangs a touch lower, raphe seam between them, rugae folds,
// the sack narrows into a neck that grows out of his perineum (no outline where it joins him).
function sack(c, o) {
  const { cx, lobeY, lobeRx, lobeRy, neckW, squash } = o
  c.poly([cx - neckW, 0, cx + neckW, 0, cx + neckW + 3, 9, cx - neckW - 3, 9], "G")
  for (let y = 0; y < 9; y++) for (let x = cx - neckW - 3; x < cx; x++) if (!c.is(x, y, ".") && x < cx - neckW + 2 + y * 0.3) c.px(x, y, "H")
  // one loose sack; the two testicles only show as bulges in its lower half
  orb(c, cx, lobeY - 1, lobeRx * 2 - 1, lobeRy + 0.5, ["G", "H", "I", null])
  orb(c, cx - lobeRx + 1, lobeY + 2, lobeRx, lobeRy - 1, ["G", "H", "I", "J"], (x, y) => y > lobeY - 4)
  orb(c, cx + lobeRx - 1, lobeY + 1, lobeRx, lobeRy - 1.5, ["G", "H", "H", null], (x, y) => y > lobeY - 3)
  for (let x = 0; x < c.w; x++) for (let y = 0; y < c.h; y++) if (!c.is(x, y, ".") && (x - cx) * 0.6 + (y - lobeY) > lobeRy * 0.75 && c.is(x, y, "H")) c.px(x, y, "G")
  // raphe: the seam where they meet, a dark groove with a lit lip to its left
  for (let y = 3; y < c.h - 1; y++) {
    const x = cx + Math.round(Math.sin(y * 0.33) * 0.7)
    if (c.is(x, y, ".")) continue
    c.px(x, y, y > lobeY ? "F" : "G")
    if (y > 8 && !c.is(x - 1, y, ".") && y % 4) c.px(x - 1, y, "H")
  }
  // rugae: short curved folds that wrap around each testicle (darker in the mids, lighter in the lit area)
  const folds = [[-12, -3, 3], [-9, 2, 4], [-14, 5, 2], [-6, 7, 3], [-11, 10, 3], [4, -4, 3], [7, 1, 4], [10, 5, 3], [4, 8, 3], [9, 10, 2], [-4, -7, 3], [2, -8, 2]]
  for (const [fx, fy, l] of folds) {
    const x0 = cx + fx, y0 = lobeY + fy
    for (let i = 0; i < l; i++) { const X = x0 + i, Y = y0 + (i === 0 || i === l - 1 ? 1 : 0)
      if (c.is(X, Y, "H")) c.px(X, Y, "G"); else if (c.is(X, Y, "I")) c.px(X, Y, "H"); else if (c.is(X, Y, "G")) c.px(X, Y, "K") }
  }
  if (squash) for (let x = 0; x < c.w; x++) for (let y = c.h - 4; y < c.h; y++) if (c.is(x, y, "GH")) c.px(x, y, "F")   // pressed into her
  handOutline(c, 2)
}
sprite("_balls_hang", { w: 36, h: 31 }, (c) => sack(c, { cx: 18, lobeY: 18, lobeRx: 9, lobeRy: 10.5, neckW: 6, squash: 0 }))
sprite("_balls_mid",  { w: 37, h: 29 }, (c) => sack(c, { cx: 18, lobeY: 16, lobeRx: 10, lobeRy: 10, neckW: 7, squash: 0 }))
// slapped down onto her: flattened, spread, the bottom pressed into her pussy
sprite("_balls_slap", { w: 41, h: 25 }, (c) => sack(c, { cx: 20, lobeY: 13, lobeRx: 12, lobeRy: 9, neckW: 8, squash: 1 }))

// ------------------------------------------------------------------ shaft ---
// Seen from below/behind: the underside. Round, light from the left, the urethral ridge
// down the middle, two veins, wet sheen from her.
function shaft(c, cx, y0, y1, wet = 1) {
  const prof = "VGHHIIIHHHGGFV"          // 14px cylinder, lit from the left
  for (let y = y0; y <= y1; y++) {
    for (let i = 0; i < prof.length; i++) c.px(cx - 7 + i, y, prof[i])
    c.px(cx + 1, y, "G")                                                 // groove beside the underside ridge
    const v = cx - 3 + Math.round(Math.sin(y * 0.5) * 1.4)               // one fat vein snaking down the lit side
    if (y % 6 !== 5) c.px(v, y, "H")
    if (wet && y % 4 === 0) c.px(cx - 4, y, "J")
  }
}
// ----------------------------------------------------------------- pussy ----
// Seen from behind/above, slit running up the screen. Outer lips part around the shaft,
// inner lips stretched into a wet pink rim that grips it, back corner (fourchette) below.
function pussy(c, cx, cy, drag) {
  // outer lips (labia majora): two puffy pads parted around the shaft, lit from the upper left
  // U-shaped vulva: the lips run down both sides of the shaft and join under it
  orb(c, cx, cy + 1, 13, 5, ["f", "g", "h", null], (x, y) => y >= cy)
  orb(c, cx - 11, cy - 4, 5, 10, ["f", "g", "h", null])
  orb(c, cx + 11, cy - 4, 5, 10, ["f", "g", "g", null])
  // their inner faces turn away from us: dark crease against the shaft
  for (let y = cy - 13; y <= cy + 3; y++) for (const s of [-1, 1]) { const x = cx + s * 7; if (!c.is(x + s, y, ".")) c.px(x + s, y, "f") }
  // inner lips (labia minora) stretched thin along the shaft, wet pink
  for (const s of [-1, 1]) for (let y = cy - 11 + drag; y <= cy + 1; y++) {
    c.px(cx + s * 7, y, (y + (s > 0 ? 1 : 0)) % 4 === 0 ? "m" : "k")
    if (drag > 2 && y < cy - 2) c.px(cx + s * 6, y, "j")                  // dragged out with him
  }
  // the grip: the opening stretched round the shaft, front half of the rim in view
  const ry = 2 + Math.round(drag / 2)
  for (let x = -9; x <= 9; x++) {
    const t = 1 - (x / 9.5) ** 2; if (t < 0) continue
    const yb = cy + Math.round(Math.sqrt(t) * ry)
    for (let y = cy - Math.round(drag / 2); y <= yb; y++) c.px(cx + x, y, y === yb ? "x" : (y === yb - 1 ? "j" : (x < 0 ? "m" : "k")))
  }
  // wet: glints on the rim and the lit lip
  c.px(cx - 5, cy - Math.round(drag / 2), "p"); c.px(cx - 4, cy - Math.round(drag / 2), "p"); c.px(cx + 4, cy + 1, "p")
  c.px(cx - 13, cy - 10, "e"); c.px(cx - 13, cy - 9, "i")
  // back corner where the lips meet below the shaft, running into the perineum
  c.px(cx, cy + ry + 1, "x"); c.px(cx - 1, cy + ry + 1, "f"); c.px(cx + 1, cy + ry + 1, "f"); c.px(cx, cy + ry + 2, "f"); c.px(cx, cy + ry + 3, "o")
  handOutline(c, 0)
}
sprite("_anus", `
.xuux.
xuvvux
uvxxvu
xuvvux
.xuux.`)

// draw into a scratch canvas, then copy opaque pixels into c (lets a part get its own outline)
function stampFn(c, w, h, ox, oy, draw) {
  const keys = []; for (let y = 0; y < h; y++) keys.push(new Array(w).fill("."))
  const p = { w, h, is: (x, y, k) => { if (x < 0 || y < 0 || x >= w || y >= h) return k === "."; const v = keys[y][x]; return k === "*" ? v !== "." : k.includes(v) },
    key: (x, y) => keys[y][x], px: (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) keys[y][x] = k },
    poly: (pts, k) => c.poly(pts, k) }
  draw(p)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (keys[y][x] !== ".") c.px(ox + x, oy + y, keys[y][x])
}
// ------------------------------------------------------------------- frames -
// anchors measured on the 3D reference (1x px): pussy centre, asshole, sack centre, out
const R = [
  { by: 68, out: 1.00, balls: "_balls_hang", bw: 36, bh: 31, ms: 120 },
  { by: 75, out: 0.80, balls: "_balls_hang", bw: 36, bh: 31, ms: 50 },
  { by: 86, out: 0.46, balls: "_balls_mid", bw: 37, bh: 29, ms: 40 },
  { by: 101, out: 0.00, balls: "_balls_slap", bw: 41, bh: 25, ms: 70 },
  { by: 98, out: 0.10, balls: "_balls_slap", bw: 41, bh: 25, ms: 60 },
  { by: 95, out: 0.20, balls: "_balls_mid", bw: 37, bh: 29, ms: 60 },
  { by: 87, out: 0.44, balls: "_balls_mid", bw: 37, bh: 29, ms: 70 },
  { by: 77, out: 0.73, balls: "_balls_hang", bw: 36, bh: 31, ms: 80 },
]
const V = [160, 96], ANUS = [160, 124]
anim("press_close", { w: 320, h: 180 }, ...R.map((r, f) => frame({ ms: r.ms },
  stamp(`_cbase${f}`, 0, 0),
  (c) => {
    stampFn(c, 34, 30, V[0] - 17, V[1] - 18, (p) => pussy(p, 17, 18, Math.round(r.out * 6)))
    const top = r.by + Math.round(r.bh / 2) - 4
    if (top < V[1] - 1) shaft(c, V[0], top, V[1] - 1)
    // re-draw the front of the grip over the shaft's lower end
    const ry = 2 + Math.round(r.out * 3)
    for (let x = -8; x <= 8; x++) { const t = 1 - (x / 9) ** 2; if (t < 0) continue
      const yb = V[1] + Math.round(Math.sqrt(t) * ry); c.px(V[0] + x, yb, "j"); c.px(V[0] + x, yb - 1, "k") }
  },
  stamp("_anus", ANUS[0] - 3, ANUS[1] - 2),
  stamp(r.balls, V[0] - Math.floor(r.bw / 2), r.by - Math.floor(r.bh / 2)),
)))

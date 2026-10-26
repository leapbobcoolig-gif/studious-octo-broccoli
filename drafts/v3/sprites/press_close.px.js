// Mating press, close camera. Drawn by hand from shapes: the 3D rig only supplied
// where things sit per frame (anchor table R below). No traced pixels.
include("palette.px.js")
include("cbase.px.js")

// ----------------------------------------------------------- tiny raster ---
// Each body part is drawn on its own layer, outlined there (sel-out style), then
// composited in depth order. Light comes from the upper left everywhere.
class Layer {
  constructor(w = 320, h = 180) { this.w = w; this.h = h; this.k = new Array(w * h).fill("."); this.n = new Float32Array(w * h * 3); this.fl = new Uint8Array(w * h) }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h }
  get(x, y) { return this.in(x, y) ? this.k[y * this.w + x] : "." }
  // n = surface normal [x, y(down), z(toward viewer)] for lit pixels; without one, a pixel that already
  // exists becomes a hand-drawn crease/detail (keeps the surface normal, flag 2); fl 1 = outline
  set(x, y, k, n, flag) { x = Math.round(x); y = Math.round(y); if (!this.in(x, y)) return; const i = y * this.w + x
    if (n) { const l = Math.hypot(n[0], n[1], n[2]) || 1; this.n[i * 3] = n[0] / l; this.n[i * 3 + 1] = n[1] / l; this.n[i * 3 + 2] = n[2] / l; this.fl[i] = flag || 0 }
    else if (flag !== undefined) this.fl[i] = flag
    else if (this.k[i] !== ".") this.fl[i] = this.fl[i] === 1 ? 1 : 2
    else { this.n[i * 3 + 2] = 1; this.fl[i] = 2 }
    this.k[i] = k }
  opaque(x, y) { return this.get(x, y) !== "." }
  each(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.opaque(x, y)) fn(x, y, this.get(x, y)) }
  // outline transparent pixels touching the shape; key picked from what it borders
  outline(dark, skip = () => false) {
    const pts = []
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.opaque(x, y) || skip(x, y)) continue
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const n = this.get(x + dx, y + dy); if (n === ".") continue
        pts.push([x, y, dark[n] || dark._]); break
      }
    }
    for (const [x, y, k] of pts) this.set(x, y, k, [0, 0, 1], 1)
    return this
  }
  // drop 1px L-corners in outlines so curves step cleanly
  clean(lineKeys) {
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) {
      const k = this.get(x, y); if (!lineKeys.includes(k)) continue
      const L = (X, Y) => lineKeys.includes(this.get(X, Y))
      for (const [ax, ay, bx, by] of [[0, -1, -1, 0], [0, -1, 1, 0], [0, 1, -1, 0], [0, 1, 1, 0]])
        if (L(x + ax, y + ay) && L(x + bx, y + by) && !L(x - ax, y - ay) && !L(x - bx, y - by) && !L(x + ax + bx, y + ay + by)) {
          const inner = this.get(x - ax - bx, y - ay - by); if (inner !== "." && !lineKeys.includes(inner)) { this.set(x, y, inner); break }
        }
    }
    return this
  }
  over(dst) { for (let i = 0; i < this.k.length; i++) if (this.k[i] !== ".") { dst.k[i] = this.k[i]; dst.fl[i] = this.fl[i]; dst.n[i * 3] = this.n[i * 3]; dst.n[i * 3 + 1] = this.n[i * 3 + 1]; dst.n[i * 3 + 2] = this.n[i * 3 + 2] } return dst }
}
const inEll = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1

// round form: rim (shadow side), base, lit (offset toward the light), highlight
function orb(L, cx, cy, rx, ry, keys, clip) {
  const [rim, base, lit, hi] = keys
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (!inEll(x, y, cx, cy, rx, ry) || (clip && !clip(x, y))) continue
    let k = base
    if (!inEll(x, y, cx - rx * 0.10, cy - ry * 0.12, rx * 0.93, ry * 0.92)) k = rim
    if (inEll(x, y, cx - rx * 0.24, cy - ry * 0.26, rx * 0.64, ry * 0.62)) k = lit
    if (hi && inEll(x, y, cx - rx * 0.40, cy - ry * 0.44, Math.max(1.2, rx * 0.16), Math.max(1, ry * 0.11))) k = hi
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry
    L.set(x, y, k, [u, v, Math.sqrt(Math.max(0.04, 1 - u * u - v * v))])
  }
}
// tapered limb from (x0,y0,r0) to (x1,y1,r1): lit side faces up-left, shadow side down-right
function limb(L, x0, y0, r0, x1, y1, r1, keys, clip) {
  const [rim, base, lit, hi] = keys
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy
  const nx = -dy / Math.sqrt(l2), ny = dx / Math.sqrt(l2)          // across the limb
  const lightSide = (nx * -0.7 + ny * -0.7) >= 0 ? 1 : -1           // which side of the limb faces the light
  for (let y = Math.floor(Math.min(y0 - r0, y1 - r1)); y <= Math.max(y0 + r0, y1 + r1); y++)
    for (let x = Math.floor(Math.min(x0 - r0, x1 - r1)); x <= Math.max(x0 + r0, x1 + r1); x++) {
      const px = x + 0.5, py = y + 0.5
      let t = ((px - x0) * dx + (py - y0) * dy) / l2; t = Math.max(0, Math.min(1, t))
      const cx = x0 + dx * t, cy = y0 + dy * t, r = r0 + (r1 - r0) * t
      const ox = px - cx, oy = py - cy; if (ox * ox + oy * oy > r * r || (clip && !clip(x, y))) continue
      const u = (ox * nx + oy * ny) / r * lightSide                   // +1 = lit edge, -1 = shadow edge
      let k = base
      if (u > 0.05) k = lit
      if (u < -0.55) k = rim
      if (hi && u > 0.42 && u < 0.62 && ((x * 7 + y * 3) % 11) < 6) k = hi
      const a = (ox * nx + oy * ny) / r
      L.set(x, y, k, [nx * a, ny * a, Math.sqrt(Math.max(0.04, 1 - a * a))])
    }
}
const HER_D = { a: "o", b: "o", c: "a", d: "b", e: "c", n: "o", f: "x", g: "f", h: "f", i: "g", j: "x", k: "x", m: "j", p: "k", u: "x", v: "u", l: "z", L: "l", _: "o" }
const HIM_D = { A: "O", B: "O", C: "A", D: "B", E: "C", W: "O", X: "W", Y: "X", Z: "Y", _: "O" }
const GEN_D = { F: "V", G: "V", H: "F", I: "G", J: "H", K: "V", _: "V" }

// ------------------------------------------------------------------ her ----
const SKIN = ["a", "b", "c", "d"], SKIN_HI = ["b", "c", "d", "e"]
function herLegs(dst) {
  const L = new Layer()
  for (const s of [-1, 1]) {
    // backs of her thighs going up beside him, in thigh-high fishnets
    limb(L, 160 + s * 31, 84, 15, 160 + s * 50, 8, 11, SKIN)
    limb(L, 160 + s * 50, 8, 11, 160 + s * 56, -20, 8, SKIN)
  }
  L.each((x, y, k) => { if (y < 70 && ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0)) L.set(x, y, k === "d" || k === "c" ? "n" : "o") })
  for (const s of [-1, 1]) for (let x = -14; x <= 14; x++) { const X = 160 + s * 33 + x, Y = 70 + Math.round(x * s * 0.35); if (L.opaque(X, Y)) { L.set(X, Y, "l"); L.set(X, Y - 1, "L") } }   // lace tops
  L.outline(HER_D).over(dst)
}
function herAss(dst, jig) {
  const L = new Layer()
  const sq = jig * 2.2   // ripple after the slam: cheeks spread and drop a touch
  for (const s of [-1, 1]) {
    const cx = 160 + s * (24 + sq * 0.4), cy = 111 + sq * 0.5
    // one big full cheek, heavier at the bottom (egg shape: wider below the middle)
    const rx = 28 + sq * 0.6, ry = 31 - sq * 0.5
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      if (s < 0 ? x > 160 : x < 160) continue
      const v = (y + 0.5 - cy) / ry, wid = rx * (1 + 0.10 * v)          // egg: wider low
      if (((x + 0.5 - cx) / wid) ** 2 + v * v > 1) continue
      // light from the upper left: broad lit mass, darker toward the lower right and the crack
      const lx = (x + 0.5 - (cx - rx * 0.30)) / wid, ly = (y + 0.5 - (cy - ry * 0.32)) / ry
      const d = Math.sqrt(lx * lx + ly * ly)
      let k = d < 0.66 ? "d" : d < 1.02 ? "c" : d < 1.30 ? "b" : "a"
      if (Math.abs(x - 160) < 4 && y > cy - ry * 0.4) k = k === "d" ? "c" : "b"         // falls into the crack
      { const a = Math.atan2((y + 0.5 - cy) / ry, (x + 0.5 - cx) / wid), rr = Math.hypot((x + 0.5 - cx) / wid, (y + 0.5 - cy) / ry); if (rr > 0.66 && rr < 0.78 && a > -2.5 + (s > 0 ? 0.3 : 0) && a < -1.75) k = "e" }   // oily sheen arc
      const nu = (x + 0.5 - cx) / wid, nv = v
      L.set(x, y, k, [nu * 1.1, nv * 1.1, Math.sqrt(Math.max(0.05, 1 - nu * nu - nv * nv))])
    }
  }
  for (let y = 102; y <= 142; y++) { if (!L.opaque(159, y + 2) || !L.opaque(161, y + 2)) break; L.set(160, y, "a"); if (y > 108) { L.set(159, y, "b"); L.set(161, y, "b") } }
  L.outline(HER_D, (x, y) => y < 84).clean(["o"]).over(dst)
}
function asshole(dst) {
  const G = [".xvx.", "xuvux", "vuxuv", "xuvux", ".xvx."]
  G.forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") dst.set(158 + i, 122 + j, k) }))
}
// ---------------------------------------------------------------- pussy -----
// Seen from behind/above, the slit runs up the screen. Skin-coloured outer lips form an almond
// around the shaft and melt into her inner cheeks; pink only on the inner surfaces.
// Seen from behind/above, the slit runs up the screen. The original pussy, spread 3px wider
// so it still wraps the thicker shaft (W = how much wider than the original).
function pussy(dst, drag, shaftIn) {
  const L = new Layer(), cx = 160, cy = 96, W = 3
  // the almond: outer lips (labia majora), skin with a flush, parted around the shaft
  for (const s of [-1, 1]) orb(L, cx + s * (9.5 + W), cy - 6, 6.5, 13.5, s < 0 ? ["f", "g", "h", "i"] : ["f", "g", "g", "h"])
  orb(L, cx, cy + 3, 11 + W, 5, ["f", "g", "g", null], (x, y) => y >= cy + 1)             // the back corner where they join
  // inner surfaces: wet pink between the lips and the shaft (labia minora stretched thin)
  for (let y = cy - 17 + drag; y <= cy + 2; y++) for (const s of [-1, 1]) {
    const edge = shaftIn ? 7 + W : 1
    const nn = [-s * 0.6, 0, 0.8]
    L.set(cx + s * edge, y, (y + s) % 3 ? "k" : "m", nn); L.set(cx + s * (edge + 1), y, "k", nn); L.set(cx + s * (edge + 2), y, "j", nn)
    if (drag > 2 && y < cy - 3) L.set(cx + s * (edge - 1), y, "j", nn)
  }
  // hood at the top of the slit, just peeking past the shaft
  orb(L, cx, cy - 18, 4, 2.5, ["g", "h", "i", null])
  // the grip: the opening stretched round him, wet rim in front of the shaft
  const ry = 2 + Math.round(drag / 2), gw = 8 + W
  for (let x = -gw; x <= gw; x++) {
    const t = 1 - (x / (gw + 0.5)) ** 2; if (t < 0) continue
    const yb = cy + Math.round(Math.sqrt(t) * ry)
    for (let y = cy - Math.round(drag / 2); y <= yb; y++) L.set(cx + x, y, y === yb ? "j" : (x < -1 ? "m" : "k"), [x / (gw + 2), 0.5, 0.85])
  }
  L.set(cx - 5 - W, cy - Math.round(drag / 2), "p"); L.set(cx - 4 - W, cy - Math.round(drag / 2), "p"); L.set(cx + 4 + W, cy + 1, "p")
  L.set(cx - 12 - W, cy - 12, "e")
  L.outline({ ...HER_D, f: "o", g: "o" }, (x, y) => y > cy + 8).over(dst)
}
// ------------------------------------------------------------------ him ----
const HIS = ["A", "B", "C", "D"], HIS_HI = ["A", "B", "C", "E"]
function hisLegs(dst, dy) {
  const L = new Layer()
  for (const s of [-1, 1]) {
    const hipX = 160 + s * 24, hipY = 28 + dy, kx = 160 + s * 74, ky = 80 + dy * 0.45
    limb(L, kx, ky, 11, 160 + s * 73, 164, 7, HIS)                              // shin down to the bed
    limb(L, 160 + s * 74, 112, 9.5, 160 + s * 73, 140, 7.5, HIS)                // calf bulge
    orb(L, 160 + s * 73, 168, 8, 6, ["A", "B", "C", null])                      // heel
    limb(L, hipX, hipY, 20, kx, ky, 12, HIS_HI)                                 // thigh driving forward
  }
  L.outline(HIM_D).clean(["O"]).over(dst)
}
function hisAss(dst, dy, clench) {
  const L = new Layer()
  // lower back: tapered mass rising out of frame, spine groove
  limb(L, 160, -30 + dy, 52, 160, 18 + dy, 40, HIS)
  for (let y = -10 + dy; y < 14 + dy; y++) L.set(160, y, "B")
  // two firm round glutes; on the slam they clench: narrower, harder, a dimple on each side
  const gx = 19 - clench * 1.5
  for (const s of [-1, 1]) {
    orb(L, 160 + s * gx, 30 + dy, 21 - clench, 21, ["B", "C", "D", "E"], (x, y) => s < 0 ? x <= 160 : x >= 160)
    if (clench) for (let i = 0; i < 4; i++) L.set(160 + s * (36 - clench), 24 + dy + i, "B")
  }
  for (const s of [-1, 1]) { L.set(160 + s * 9, 10 + dy, "B"); L.set(160 + s * 10, 10 + dy, "B") }   // dimples of Venus
  // crack: clean line down to where it opens into the taint
  for (let y = 12 + dy; y <= 44 + dy; y++) { L.set(160, y, "A"); if (y > 16 + dy) L.set(161, y, "B") }
  // taint: smooth skin bridge from the crack down to the sack, seam running through it
  for (let y = 44 + dy; y <= 52 + dy; y++) for (let x = 160 - 6; x <= 160 + 6; x++) {
    const w = 6 - (y - 44 - dy) * 0.25; if (Math.abs(x - 160) > w) continue
    L.set(x, y, x < 157 ? "C" : x > 162 ? "A" : "B")
  }
  for (let y = 44 + dy; y <= 52 + dy; y++) L.set(160, y, "A")
  L.outline(HIM_D, (x, y) => y < 0).clean(["O"]).over(dst)
}
// --------------------------------------------------------- cock + balls ----
// thick, slightly bowed, flared at the base, a ridge underneath and veins over the top
function shaft(dst, top, bot) {
  if (bot <= top) return
  const L = new Layer(); L.cz = 36; L.cr = 9
  const len = Math.max(1, bot - top)
  const cxAt = (y) => { const t = (y - top) / Math.max(len, 24); return 160 + Math.sin(Math.min(1, t) * Math.PI) * 1.4 - 0.6 }
  const hwAt = (y) => { const t = (y - top) / Math.max(len, 24); return 9.6 - Math.min(1, t) * 0.9 + Math.max(0, 0.16 - t) * 9 + Math.sin(Math.min(1, t) * Math.PI) * 0.5 }
  for (let y = top; y <= bot; y++) {
    const cx = cxAt(y), hw = hwAt(y)
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const u = (x + 0.5 - cx) / hw; if (Math.abs(u) > 1) continue
      let k = u < -0.82 ? "G" : u < -0.5 ? "H" : u < 0.05 ? "I" : u < 0.4 ? "H" : u < 0.74 ? "G" : "F"
      L.set(x, y, k, [u, 0, Math.sqrt(Math.max(0.05, 1 - u * u))])
    }
    // the underside ridge running down the middle-right, lit edge beside it
    const rx = Math.round(cx + hw * 0.22); L.set(rx, y, "G"); L.set(rx - 1, y, "I")
    // a fat vein winding over the lit side, with a branch
    const v = Math.round(cx - hw * 0.45 + Math.sin(y * 0.33) * 1.6)
    if ((y + 2) % 9 !== 0) { L.set(v, y, "H"); L.set(v - 1, y, "G") }
    const b2 = Math.round(cx + hw * 0.5 + Math.sin(y * 0.21 + 1) * 1.2)
    if ((y - top) > 6 && (y - top) % 13 < 7) L.set(b2, y, "G")
    if (y % 4 === 0) L.set(Math.round(cx - hw * 0.2), y, "J")                         // her wetness on him
  }
  L.outline(GEN_D, (x, y) => y < top).over(dst)
}
// one loose sack with two testicle bulges, the left hanging lower; the seam continues
// up out of his taint; folds (rugae) wrap around each testicle
function sack(dst, cx, cy, mode) {
  const L = new Layer()
  const p = mode === "slap" ? { r: 10.5, ry: 8.5, gap: 10, nw: 7, drop: 1 } : mode === "mid" ? { r: 9.5, ry: 10.5, gap: 9, nw: 6, drop: 2 } : { r: 9, ry: 11, gap: 8.5, nw: 5, drop: 3 }
  const top = cy - p.ry - 8
  // neck: loose skin rising into the taint, widening as it fills with the two balls
  for (let y = top; y < cy; y++) { const w = p.nw + (y - top) * 0.55; for (let x = Math.floor(cx - w); x <= cx + w; x++) { const u = (x + 0.5 - cx) / (w + 1); L.set(x, y, x < cx - 2 ? "H" : "G", [u, -0.2, Math.sqrt(Math.max(0.05, 1 - u * u))]) } }
  // two balls side by side (the "3" seen sideways): each its own round form, left one hangs lower
  const balls = [[cx - p.gap, cy + p.drop], [cx + p.gap, cy]]
  for (const [bx, by] of balls) orb(L, bx, by, p.r, p.ry, ["F", "G", "H", "I"])
  // notch between them at the bottom + seam running up into the neck
  for (let y = cy - p.ry; y < cy + p.ry + 4; y++) {
    const x = cx + Math.round(Math.sin(y * 0.3) * 0.6); if (!L.opaque(x, y)) continue
    L.set(x, y, "F"); if (y > cy + 2 && L.opaque(x + 1, y)) L.set(x + 1, y, "G")
  }
  for (let y = cy + 3; y < cy + p.ry + 4; y++) for (let x = cx - 1; x <= cx + 1; x++) {           // carve the notch
    const below = !L.opaque(x, y + 1) || y > cy + p.ry - 2
    if (below && Math.abs(x - cx) <= (y - cy - 3) * 0.35) L.set(x, y, ".")
  }
  // a few folds (rugae) wrapping each ball, glint on the lit one
  for (const [bx, by] of balls) for (const [fx, fy, l] of [[-5, 3, 5], [1, 6, 4], [-7, -1, 2]]) {
    if (mode === "slap" && fy > 3) continue
    for (let i = 0; i < l; i++) { const X = Math.round(bx + fx + i), Y = Math.round(by + fy + (i === 0 || i === l - 1 ? 1 : 0))
      const k = L.get(X, Y); if (k === "H") L.set(X, Y, "G"); else if (k === "I") L.set(X, Y, "H"); else if (k === "G") L.set(X, Y, "K") }
  }
  L.set(balls[0][0] - 4, balls[0][1] - 5, "J"); L.set(balls[0][0] - 3, balls[0][1] - 5, "J")
  if (mode === "slap") L.each((x, y, k) => { if (y > cy + p.ry - 2 && "GH".includes(k)) L.set(x, y, "F") })
  L.outline(GEN_D, (x, y) => y < top + 3).over(dst)
}
// ---------------------------------------------------------- re-shading -----
// Take the reference silhouette (which parts exist where), throw away its interior shading,
// and light every body region from the upper left based on the region's own shape:
// distance to the region edge toward the light vs away from it.
function regions(base, keys) {
  const id = new Int32Array(base.w * base.h).fill(-1); let n = 0
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) {
    if (id[y * base.w + x] >= 0 || !keys.includes(base.get(x, y))) continue
    const st = [[x, y]]; id[y * base.w + x] = n
    while (st.length) { const [px, py] = st.pop()
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = px + dx, Y = py + dy
        if (base.in(X, Y) && id[Y * base.w + X] < 0 && keys.includes(base.get(X, Y))) { id[Y * base.w + X] = n; st.push([X, Y]) } } }
    n++
  }
  return id
}
function reshade(base, out, keys, ramp, hi) {
  const id = regions(base, keys), W = base.w, H = base.h
  const reach = (x, y, dx, dy, r) => { let d = 0; while (d < 70) { x += dx; y += dy; d++; if (!base.in(x, y) || id[y * W + x] !== r) break } return d }
  const T = new Float32Array(W * H).fill(-1), TH = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = id[y * W + x]; if (r < 0) continue
    let dl = 0, dd = 0
    for (const [dx, dy, w] of [[-1, -1, 1.41], [-1, 0, 1], [0, -1, 1], [-2, -1, 2.24], [-1, -2, 2.24]]) { dl += reach(x, y, dx, dy, r) * w; dd += reach(x, y, -dx, -dy, r) * w }
    T[y * W + x] = dl / (dl + dd); TH[y * W + x] = (dl + dd) / 8
  }
  // smooth the field inside each region so bands follow the form, not pixel noise
  for (let pass = 0; pass < 3; pass++) { const T2 = T.slice()
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (T[i] < 0) continue; let s = 0, n = 0
      for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const X = x + xx, Y = y + yy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (id[j] === id[i]) { s += T[j]; n++ } }
      T2[i] = s / n }
    T.set(T2) }
  // inflated surface: height grows with distance from the region edge -> rounded normals
  const D = new Float32Array(W * H).fill(0)
  for (let i = 0; i < W * H; i++) D[i] = id[i] >= 0 ? 1e4 : 0
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (id[i] < 0) continue
      for (const [dx, dy, w] of [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.41], [1, -1, 1.41]]) { const X = x + dx, Y = y + dy; const d = (X < 0 || Y < 0 || X >= W) ? 0 : (id[Y * W + X] === id[i] ? D[Y * W + X] : 0); D[i] = Math.min(D[i], d + w) } }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (id[i] < 0) continue
      for (const [dx, dy, w] of [[1, 0, 1], [0, 1, 1], [1, 1, 1.41], [-1, 1, 1.41]]) { const X = x + dx, Y = y + dy; const d = (X >= W || Y >= H || X < 0) ? 0 : (id[Y * W + X] === id[i] ? D[Y * W + X] : 0); D[i] = Math.min(D[i], d + w) } } }
  const Hh = (x, y, i) => { const j = y * W + x; return (x < 0 || y < 0 || x >= W || y >= H || id[j] !== id[i]) ? 0 : Math.sqrt(Math.min(D[j], 18)) * 2.2 }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (T[i] < 0) continue
    const t = T[i]
    let k = t < 0.22 ? ramp[3] : t < 0.46 ? ramp[2] : t < 0.70 ? ramp[1] : ramp[0]
    if (hi && t < 0.10 && TH[i] > 12) k = hi
    const gx = (Hh(x + 1, y, i) - Hh(x - 1, y, i)) / 2, gy = (Hh(x, y + 1, i) - Hh(x, y - 1, i)) / 2
    out.set(x, y, k, [-gx, -gy, 1.4]) }
  // smooth the normals inside each region (the distance field is faceted)
  for (let pass = 0; pass < 3; pass++) { const n2 = out.n.slice()
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (id[i] < 0) continue; let sx = 0, sy = 0, sz = 0
      for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const X = x + xx, Y = y + yy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (id[j] !== id[i]) continue; sx += out.n[j * 3]; sy += out.n[j * 3 + 1]; sz += out.n[j * 3 + 2] }
      const l = Math.hypot(sx, sy, sz) || 1; n2[i * 3] = sx / l; n2[i * 3 + 1] = sy / l; n2[i * 3 + 2] = sz / l }
    out.n.set(n2) }
}
// ------------------------------------------------------------------ frames -
// per keyframe from the 3D reference: his hip drop (dy), sack centre, out (pull-back), her ripple
const R = [
  { root: 53.7, by: 68, out: 1.00, jig: 0.00, mode: "hang", ms: 120 },
  { root: 61.3, by: 75, out: 0.80, jig: -0.04, mode: "hang", ms: 50 },
  { root: 74.2, by: 86, out: 0.46, jig: -0.04, mode: "mid", ms: 40 },
  { root: 90.7, by: 103, out: 0.00, jig: 0.00, mode: "slap", ms: 70 },
  { root: 87.2, by: 100, out: 0.10, jig: 0.59, mode: "slap", ms: 60 },
  { root: 83.4, by: 95, out: 0.20, jig: 0.80, mode: "mid", ms: 60 },
  { root: 74.7, by: 87, out: 0.44, jig: -0.19, mode: "mid", ms: 70 },
  { root: 64.0, by: 77, out: 0.73, jig: 0.03, mode: "hang", ms: 80 },
]
function drawFrame(r, c, f) {
  const B = new Layer(); for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const k = c.key(x, y); if (k && k !== ".") B.set(x, y, k) }
  const F = new Layer(); B.over(F)
  const dy = Math.round(r.root - 53.7)
  reshade(B, F, "abcdenlL", ["a", "b", "c", "d"], "e")
  reshade(B, F, "ABCDEWXYZ", ["A", "B", "C", "D"], "E")
  // fishnet back on her stocking area
  F.each((x, y, k) => { if (B.get(x, y) === "n" || (y < 72 && "abcd".includes(k) && Math.abs(x - 160) > 22 && ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0))) F.set(x, y, k === "d" || k === "c" ? "n" : "o") })
  // her ass: fuller and rounder than the model, drawn over its own region
  const A = new Layer(); herAss(A, 0)
  A.each((x, y, k) => { if (B.get(x, y) !== "." && "ABCDEOWXYZ".includes(B.get(x, y))) return; const i = y * 320 + x; F.set(x, y, k, [A.n[i * 3], A.n[i * 3 + 1], A.n[i * 3 + 2]], A.fl[i]) })
  asshole(F)
  const drag = Math.round(r.out * 6)
  // her lips sit under him: only where his body isn't
  { const PL = new Layer(); pussy(PL, drag, true)
    PL.each((x, y, k) => { if ("ABCDEOWXYZ".includes(B.get(x, y))) return; const i = y * 320 + x; F.set(x, y, k, [PL.n[i * 3], PL.n[i * 3 + 1], PL.n[i * 3 + 2]], PL.fl[i]) }) }
  const ballTop = r.by - (r.mode === "slap" ? 11 : 15)
  shaft(F, ballTop, 96 + Math.round(drag / 2) - 1)
  const ry = 2 + Math.round(drag / 2)
  for (let x = -11; x <= 11; x++) { const t = 1 - (x / 11.5) ** 2; if (t < 0) continue; const yb = 96 + Math.round(Math.sqrt(t) * ry); F.set(160 + x, yb, "j"); F.set(160 + x, yb - 1, x < -2 ? "m" : "k") }
  // his crack, dimples and taint drawn by hand over the reference body
  hisDetails(F, B, ballTop, r.out < 0.15 ? 1 : 0)
  // the sack is its own layer so the game can swing it over what's underneath
  const base = new Layer(); F.over(base)
  const SK = new Layer(); sack(SK, 160, r.by, r.mode); SK.over(F)
  F.layers = [base, SK]; F.anchor = { by: r.by, sackTop: ballTop, mode: r.mode }
  return F
}
function hisDetails(F, B, sackTop, clench) {
  const isHim = (k) => "ABCDEO".includes(k) && k !== "."
  // drop leftover crease marks from the reference inside his body (keep his silhouette lines)
  for (let y = 1; y < 179; y++) for (let x = 1; x < 319; x++) if (F.get(x, y) === "O") {
    const n = [F.get(x - 1, y), F.get(x + 1, y), F.get(x, y - 1), F.get(x, y + 1)]
    if (n.every((k) => isHim(k))) F.set(x, y, n.filter((k) => k !== "O")[0] || "B")
  }
  // glutes: big, squared-off masses (superellipses), heaviest at the bottom inside corner.
  // Their outer edge hands over to the body's own shading so the hips flow into the legs.
  const gy = sackTop - 19, gx = 19 - clench * 1.5
  const se = (u, v, p) => Math.pow(Math.pow(Math.abs(u), p) + Math.pow(Math.abs(v), p), 1 / p)
  const OV = []
  for (const s of [-1, 1]) {
    const cx = 160 + s * gx, rx = 24 - clench, ry = 22
    for (let y = Math.floor(gy - ry - 2); y <= gy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - gy) / ry
      // he's on top: the bottom of each glute hangs over her ass, not under it
      const overHer = v > 0.2 && "abcdeofghijkmpx".includes(F.get(x, y))
      if ((s < 0 ? x > 160 : x < 160) || !(isHim(B.get(x, y)) || overHer)) continue
      const inner = (u * s) < 0, p = v > 0 && inner ? 3.4 : v > 0 ? 2.9 : 2.4
      const m = se(u, v, p); if (m > 1) continue
      const i = y * 320 + x
      // normal: superellipse gradient, blended into the body's normal at the rim
      let nu = Math.sign(u) * Math.pow(Math.abs(u), p - 1), nv = Math.sign(v) * Math.pow(Math.abs(v), p - 1), nz = Math.sqrt(Math.max(0.06, 1 - Math.pow(m, p)))
      const w = overHer ? 1 : Math.min(1, Math.max(0, (1 - m) / 0.22))
      const bn = [F.n[i * 3], F.n[i * 3 + 1], F.n[i * 3 + 2]]
      const n = [bn[0] + (nu - bn[0]) * w, bn[1] + (nv - bn[1]) * w, bn[2] + (nz - bn[2]) * w]
      let k = F.get(x, y)
      if (m < 0.86) {
        const d = se((x + 0.5 - (cx - rx * 0.3)) / rx, (y + 0.5 - (gy - ry * 0.32)) / ry, p)
        k = d < 0.6 ? "D" : d < 0.96 ? "C" : d < 1.26 ? "B" : "A"
        if (Math.abs(x - 160) < 3) k = k === "D" ? "C" : "B"
        if (!clench && m > 0.66 && m < 0.78 && u * s < 0.1 && v < -0.35 && u < 0.2) k = "E"   // rim sheen, upper left
      }
      if (overHer) { const d = se((x + 0.5 - (cx - rx * 0.3)) / rx, (y + 0.5 - (gy - ry * 0.32)) / ry, p); k = d < 0.96 ? "C" : d < 1.26 ? "B" : "A"; OV.push([x, y]) }
      if (k === "." || k === "O") continue
      F.set(x, y, k, n)
    }
  }
  // outline where his glutes hang over her
  for (const [x, y] of OV) for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0]]) { const k = F.get(x + dx, y + dy); if ("abcdeofghijkmpx".includes(k) && k !== ".") F.set(x + dx, y + dy, "O", [0, 0, 1], 1) }
  // the fold where each glute sits on the back of the thigh: soft shadow, darkest inside
  for (const s of [-1, 1]) for (let x = 2; x <= 21; x++) {
    const u = x / (24 - clench), y = Math.round(gy + 22 * Math.pow(Math.max(0, 1 - Math.pow(u, 3.4)), 1 / 3.4))
    if (!isHim(B.get(160 + s * x, y))) continue
    F.set(160 + s * x, y, x < 15 ? "O" : "A"); if (x < 12 && isHim(B.get(160 + s * x, y + 1))) F.set(160 + s * x, y + 1, "B")
  }
  if (clench) for (const s of [-1, 1]) for (let i = 0; i < 5; i++) F.set(160 + s * (gx + 17), gy - 2 + i, "B")   // hollow on the clench
  // crack, straight down into the taint
  for (let y = gy - 17; y <= sackTop - 3; y++) { F.set(160, y, "A"); if (y > gy - 12) F.set(161, y, "B") }
  // taint: a short smooth bridge of skin between the glutes and the sack, seam running through
  for (let y = sackTop - 5; y <= sackTop + 2; y++) for (let x = 153; x <= 167; x++) { const w = 4 + (y - sackTop + 5) * 0.6; if (Math.abs(x - 160) > w) continue; const u = (x - 160) / (w + 1); F.set(x, y, x < 157 ? "C" : x > 163 ? "A" : "B", [u, 0.2, Math.sqrt(Math.max(0.05, 1 - u * u))]) }
  for (let y = sackTop - 5; y <= sackTop + 2; y++) F.set(160, y, "A")
  for (let x = -5; x <= 5; x++) if (Math.abs(x) > 2) F.set(160 + x, sackTop - 5 + Math.round(Math.abs(x) * 0.3), "O")
}
anim("press_close", { w: 320, h: 180 }, ...R.map((r, f) => frame({ ms: r.ms }, stamp(`_cbase${f}`, 0, 0), (c) => {
  const F = drawFrame(r, c, f)
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const k = F.get(x, y); if (k !== ".") c.px(x, y, k) }
})))

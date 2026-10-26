// Mating press, close camera. Drawn by hand from shapes: the 3D rig only supplied
// where things sit per frame (anchor table R below). No traced pixels.
include("palette.px.js")
include("cbase.px.js")

// ----------------------------------------------------------- tiny raster ---
// Each body part is drawn on its own layer, outlined there (sel-out style), then
// composited in depth order. Light comes from the upper left everywhere.
class Layer {
  // ht = height toward the viewer (px). cz/cr: base height and radius of the shape being drawn,
  // so a lit pixel's height follows its normal (cz + nz * cr)
  constructor(w = 320, h = 180) { this.w = w; this.h = h; this.k = new Array(w * h).fill("."); this.n = new Float32Array(w * h * 3); this.fl = new Uint8Array(w * h); this.ht = new Float32Array(w * h); this.cz = 0; this.cr = 8 }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h }
  get(x, y) { return this.in(x, y) ? this.k[y * this.w + x] : "." }
  // n = surface normal [x, y(down), z(toward viewer)] for lit pixels; without one, a pixel that already
  // exists becomes a hand-drawn crease/detail (keeps the surface normal, flag 2); fl 1 = outline
  set(x, y, k, n, flag) { x = Math.round(x); y = Math.round(y); if (!this.in(x, y)) return; const i = y * this.w + x
    if (n) { const l = Math.hypot(n[0], n[1], n[2]) || 1; this.n[i * 3] = n[0] / l; this.n[i * 3 + 1] = n[1] / l; this.n[i * 3 + 2] = n[2] / l; this.fl[i] = flag || 0; this.ht[i] = this.cz + (n[2] / l) * this.cr }
    else if (flag !== undefined) this.fl[i] = flag
    else if (this.k[i] !== ".") this.fl[i] = this.fl[i] === 1 ? 1 : 2
    else { this.n[i * 3 + 2] = 1; this.fl[i] = 2; this.ht[i] = this.cz }
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
        pts.push([x, y, dark[n] || dark._, this.ht[(y + dy) * this.w + x + dx]]); break
      }
    }
    for (const [x, y, k, h] of pts) { this.set(x, y, k, [0, 0, 1], 1); this.ht[y * this.w + x] = h - 1 }
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
  over(dst) { for (let i = 0; i < this.k.length; i++) if (this.k[i] !== ".") { dst.k[i] = this.k[i]; dst.fl[i] = this.fl[i]; dst.n[i * 3] = this.n[i * 3]; dst.n[i * 3 + 1] = this.n[i * 3 + 1]; dst.n[i * 3 + 2] = this.n[i * 3 + 2]; dst.ht[i] = this.ht[i] } return dst }
}
const inEll = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1

// round form: rim (shadow side), base, lit (offset toward the light), highlight
function orb(L, cx, cy, rx, ry, keys, clip) {
  const [rim, base, lit, hi] = keys, cr0 = L.cr; L.cr = Math.min(rx, ry) * 0.9
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (!inEll(x, y, cx, cy, rx, ry) || (clip && !clip(x, y))) continue
    let k = base
    if (!inEll(x, y, cx - rx * 0.10, cy - ry * 0.12, rx * 0.93, ry * 0.92)) k = rim
    if (inEll(x, y, cx - rx * 0.24, cy - ry * 0.26, rx * 0.64, ry * 0.62)) k = lit
    if (hi && inEll(x, y, cx - rx * 0.40, cy - ry * 0.44, Math.max(1.2, rx * 0.16), Math.max(1, ry * 0.11))) k = hi
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry
    L.set(x, y, k, [u, v, Math.sqrt(Math.max(0.04, 1 - u * u - v * v))])
  }
  L.cr = cr0
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
  const L = new Layer(); L.cz = 22; L.cr = 26
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
function pussy(dst, drag, shaftIn) {
  const L = new Layer(), cx = 160, cy = 96; L.cz = 30; L.cr = 6
  // the almond: outer lips (labia majora), skin with a flush, parted around the shaft
  for (const s of [-1, 1]) orb(L, cx + s * 9.5, cy - 6, 6.5, 13.5, s < 0 ? ["f", "g", "h", "i"] : ["f", "g", "g", "h"])
  orb(L, cx, cy + 3, 11, 5, ["f", "g", "g", null], (x, y) => y >= cy + 1)             // the back corner where they join
  // inner surfaces: wet pink between the lips and the shaft (labia minora stretched thin)
  for (let y = cy - 17 + drag; y <= cy + 2; y++) for (const s of [-1, 1]) {
    const edge = shaftIn ? 7 : 1
    const nn = [-s * 0.6, 0, 0.8]
    L.set(cx + s * edge, y, (y + s) % 3 ? "k" : "m", nn); L.set(cx + s * (edge + 1), y, "k", nn); L.set(cx + s * (edge + 2), y, "j", nn)
    if (drag > 2 && y < cy - 3) L.set(cx + s * (edge - 1), y, "j", nn)
  }
  // hood at the top of the slit, just peeking past the shaft
  orb(L, cx, cy - 18, 4, 2.5, ["g", "h", "i", null])
  // the grip: the opening stretched round him, wet rim in front of the shaft
  const ry = 2 + Math.round(drag / 2)
  for (let x = -8; x <= 8; x++) {
    const t = 1 - (x / 8.5) ** 2; if (t < 0) continue
    const yb = cy + Math.round(Math.sqrt(t) * ry)
    for (let y = cy - Math.round(drag / 2); y <= yb; y++) L.set(cx + x, y, y === yb ? "j" : (x < -1 ? "m" : "k"), [x / 10, 0.5, 0.85])
  }
  L.set(cx - 5, cy - Math.round(drag / 2), "p"); L.set(cx - 4, cy - Math.round(drag / 2), "p"); L.set(cx + 4, cy + 1, "p")
  L.set(cx - 12, cy - 12, "e")
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
function shaft(dst, top, bot) {
  if (bot <= top) return
  const L = new Layer(); L.cz = 36; L.cr = 7
  const prof = "GHHIIIIHHHGGFF"                      // 14px cylinder, lit from the left
  for (let y = top; y <= bot; y++) {
    const flare = y < top + 3 ? 1 : 0                // a slight flare at the base under the sack
    for (let i = -flare; i < prof.length + flare; i++) { const u = (153 + i + 0.5 - 160) / (7 + flare); L.set(153 + i, y, prof[Math.max(0, Math.min(13, i))], [u, 0, Math.sqrt(Math.max(0.05, 1 - u * u))]) }
    L.set(161, y, "G")                               // groove beside the underside ridge
    const v = 157 + Math.round(Math.sin(y * 0.5) * 1.4)
    if (y % 6 !== 5) L.set(v, y, "H")                // a vein on the lit side
    if (y % 4 === 0) L.set(156, y, "J")              // her wetness on him
  }
  L.outline(GEN_D, (x, y) => y < top).over(dst)
}
// one loose sack with two testicle bulges, the left hanging lower; the seam continues
// up out of his taint; folds (rugae) wrap around each testicle
function sack(dst, cx, cy, mode) {
  const L = new Layer(); L.cz = 44; L.cr = 10
  const p = mode === "slap" ? { r: 11.5, ry: 9, gap: 10.5, nw: 7, drop: 1 } : mode === "mid" ? { r: 10.5, ry: 11.5, gap: 9.5, nw: 6, drop: 2 } : { r: 10, ry: 12.5, gap: 9, nw: 5, drop: 3 }
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
    out.set(x, y, k, [-gx, -gy, 1.4]); out.ht[i] = out.cz + Math.sqrt(Math.min(D[i], 18)) * 2.2 }
  // smooth the normals inside each region (the distance field is faceted)
  for (let pass = 0; pass < 3; pass++) { const n2 = out.n.slice()
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (id[i] < 0) continue; let sx = 0, sy = 0, sz = 0
      for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const X = x + xx, Y = y + yy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (id[j] !== id[i]) continue; sx += out.n[j * 3]; sy += out.n[j * 3 + 1]; sz += out.n[j * 3 + 2] }
      const l = Math.hypot(sx, sy, sz) || 1; n2[i * 3] = sx / l; n2[i * 3 + 1] = sy / l; n2[i * 3 + 2] = sz / l }
    out.n.set(n2) }
}
// ------------------------------------------------------------- sculpting ---
// Soft 2D masses that melt into each other. Every part is a shape with a base height (z)
// and a rounding radius (r); the silhouette is their smooth union, the height their
// smooth max, and the normals come from that height. Lets a glute sit ON a thigh
// (a real fold) and a hip flow into a leg without seams.
const sm = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
const sx = (a, b, k) => -sm(-a, -b, k)
const dEll = (cx, cy, rx, ry) => (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry)
const dCap = (x0, y0, r0, x1, y1, r1) => (x, y) => {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2))
  return Math.hypot(x - x0 - dx * t, y - y0 - dy * t) - (r0 + (r1 - r0) * t) }
function sculpt(parts, keys, light = [-0.55, -0.62, 0.58]) {
  const W = 320, H = 180, h = new Float32Array(W * H).fill(-1e9), grp = new Int8Array(W * H).fill(-1)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5
    let D = 1e9, best = -1e9, bg = -1, hh = -1e9
    for (const p of parts) {
      const d = p.d(px, py); D = sm(D, d, p.k ?? 5)
      const s = -d, hi = s > 0 ? p.z + (s >= p.r ? p.r : Math.sqrt(s * (2 * p.r - s))) : p.z + s * 1.4
      hh = hh === -1e9 ? hi : sx(hh, hi, p.blend ?? 3)
      if (hi > best) { best = hi; bg = p.g }
    }
    if (D > 0) continue
    h[y * W + x] = hh; grp[y * W + x] = bg
  }
  const out = [new Layer(), new Layer()]
  const N = new Float32Array(W * H * 3)
  const at = (x, y, i) => { const j = y * W + x; return x < 0 || y < 0 || x >= W || y >= H || grp[j] < 0 ? h[i] - 3 : h[j] }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (grp[i] < 0) continue
    const gx = (at(x + 1, y, i) - at(x - 1, y, i)) / 2, gy = (at(x, y + 1, i) - at(x, y - 1, i)) / 2
    const l = Math.hypot(gx, gy, 1); N[i * 3] = -gx / l; N[i * 3 + 1] = -gy / l; N[i * 3 + 2] = 1 / l }
  for (let pass = 0; pass < 2; pass++) { const N2 = N.slice()
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (grp[i] < 0) continue; let a = 0, b = 0, c = 0
      for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) { const X = x + xx, Y = y + yy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (grp[j] < 0 || Math.abs(h[j] - h[i]) > 4) continue; a += N[j * 3]; b += N[j * 3 + 1]; c += N[j * 3 + 2] }
      const l = Math.hypot(a, b, c) || 1; N2[i * 3] = a / l; N2[i * 3 + 1] = b / l; N2[i * 3 + 2] = c / l }
    N.set(N2) }
  // no slivers: a pixel whose group is a thin fringe joins the group around it
  for (let pass = 0; pass < 3; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (grp[i] < 0) continue
    let same = 0, other = -1; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) { if (!xx && !yy) continue; const g = grp[(y + yy) * W + x + xx]; if (g === grp[i]) same++; else if (g >= 0) other = g }
    if (same < 4 && other >= 0) grp[i] = other }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (grp[i] < 0) continue
    const n = [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], dl = n[0] * light[0] + n[1] * light[1] + n[2] * light[2]
    const k = dl > 0.78 ? keys[3] : dl > 0.55 ? keys[2] : dl > 0.25 ? keys[1] : keys[0]
    const L = out[grp[i]]; L.set(x, y, k, n); L.ht[i] = h[i] }
  return out
}
// his lower body, drawn as masses: back, flanks, glutes (heavy, squared off low and
// inside, flatter at the outer hip), the taint, thighs, calves, heels.
// returns [legs, torso] so her ass can sit between them in depth
function hisBody(dy, sackTop, clench) {
  const P = []
  const g0 = 0, g1 = 1                                   // 0 legs, 1 torso
  P.push({ d: dCap(160, -50 + dy, 46, 160, 22 + dy, 38), z: 16, r: 32, g: g1, k: 8 })                       // lower back
  for (const s of [-1, 1]) {
    const a = s > 0 ? 0.8 : 0                                                                               // a touch of asymmetry
    P.push({ d: dEll(160 + s * 31, 18 + dy, 10, 18), z: 24, r: 12, g: g1, k: 9 })                           // flank into the hip
    P.push({ d: dEll(160 + s * 18.5, 32 + dy + a, 20.5 - clench, 19.5), z: 30, r: 26, g: g1, k: 6, blend: 9 })  // glute, upper mass (melts up into the back)
    P.push({ d: dEll(160 + s * 12.5, 44 + dy + a, 13.5 - clench * 0.5, 8.5), z: 38, r: 15, g: g1, k: 7, blend: 5 }) // heavy low inner corner
    P.push({ d: dEll(160 + s * 29, 32 + dy, 8, 13), z: 30, r: 10, g: g1, k: 8 })                            // outer side, flatter
    const hx = 160 + s * 27, hy = 42 + dy, kx = 160 + s * 72, ky = 84 + dy * 0.4
    P.push({ d: dCap(hx, hy, 17, kx, ky, 12.5), z: 12, r: 17, g: g0, k: 7 })                                 // thigh
    P.push({ d: dEll(hx + (kx - hx) * 0.45, hy + (ky - hy) * 0.45 + 2, 15, 13), z: 14, r: 14, g: g0, k: 8 }) // hamstring mass
    P.push({ d: dCap(kx, ky, 11.5, 160 + s * 73, 158, 6.5), z: 6, r: 12, g: g0, k: 5 })                      // shin
    P.push({ d: dEll(160 + s * 74.5, 110, 11.5, 18), z: 9, r: 12, g: g0, k: 6 })                             // calf
    P.push({ d: dEll(160 + s * 73, 166, 8, 7), z: 12, r: 8, g: g0, k: 4 })                                   // heel / sole
  }
  P.push({ d: dCap(160, 40 + dy, 4.5, 160, sackTop + 3, 6), z: 33, r: 6, g: g1, k: 5, blend: 4 })            // taint
  const [legs, torso] = sculpt(P, HIS)
  legs.outline(HIM_D).clean(["O"]); torso.outline(HIM_D, (x, y) => y > sackTop - 4 && Math.abs(x - 160) < 9).clean(["O"])
  return [legs, torso]
}
// ------------------------------------------------------------------ frames -
// per keyframe from the 3D reference: his hip drop (root), sack centre (by), out (pull-back)
const R = [
  { root: 53.7, by: 68, out: 1.00, mode: "hang", ms: 120 },
  { root: 61.3, by: 75, out: 0.80, mode: "hang", ms: 50 },
  { root: 74.2, by: 86, out: 0.46, mode: "mid", ms: 40 },
  { root: 90.7, by: 103, out: 0.00, mode: "slap", ms: 70 },
  { root: 87.2, by: 100, out: 0.10, mode: "slap", ms: 60 },
  { root: 83.4, by: 95, out: 0.20, mode: "mid", ms: 60 },
  { root: 74.7, by: 87, out: 0.44, mode: "mid", ms: 70 },
  { root: 64.0, by: 77, out: 0.73, mode: "hang", ms: 80 },
]
// Each frame is five depth layers so the game can move parts on their own (physics):
// 0 her legs, 1 his legs, 2 her ass + pussy + shaft, 3 his back/glutes/taint, 4 his sack
function drawFrame(r, c, f) {
  const B = new Layer(); for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const k = c.key(x, y); if (k && "abcdenlL".includes(k)) B.set(x, y, k) }
  const L0 = new Layer(); L0.cz = 2
  reshade(B, L0, "abcdenlL", ["a", "b", "c", "d"], "e")
  L0.each((x, y, k) => { if (B.get(x, y) === "n" || (y < 72 && "abcd".includes(k) && Math.abs(x - 160) > 22 && ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0))) L0.set(x, y, k === "d" || k === "c" ? "n" : "o") })
  L0.outline(HER_D).clean(["o"])
  const sackTop = r.by - (r.mode === "slap" ? 11 : 15), dy = sackTop - 53, clench = r.out < 0.15 ? 1 : 0
  const [L1, L3] = hisBody(dy, sackTop, clench)
  const L2 = new Layer()
  herAss(L2, 0)
  asshole(L2)
  const drag = Math.round(r.out * 6)
  pussy(L2, drag, true)
  shaft(L2, sackTop - 2, 96 + Math.round(drag / 2) - 1)
  { const ry = 2 + Math.round(drag / 2); L2.cz = 40; L2.cr = 2
    for (let x = -8; x <= 8; x++) { const t = 1 - (x / 8.5) ** 2; if (t < 0) continue; const yb = 96 + Math.round(Math.sqrt(t) * ry); L2.set(160 + x, yb, "j", [x / 10, 0.6, 0.8]); L2.set(160 + x, yb - 1, x < -1 ? "m" : "k", [x / 10, 0.5, 0.85]) } }
  const L4 = new Layer()
  sack(L4, 160, r.by, r.mode)
  const layers = [L0, L1, L2, L3, L4]
  const F = new Layer(); layers.forEach((L) => L.over(F))
  F.layers = layers; F.anchor = { sackTop, by: r.by, dy }
  return F
}
// pxl preview only (the game reads the layers through tools/build_lit.js)
anim("press_close", { w: 320, h: 180 }, ...R.map((r, f) => frame({ ms: r.ms }, stamp(`_cbase${f}`, 0, 0), (c) => {
  const F = drawFrame(r, c, f)
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const k = F.get(x, y); if (k !== ".") c.px(x, y, k) }
})))

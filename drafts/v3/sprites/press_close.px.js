// Mating press, close camera. Drawn by hand from shapes: the 3D rig only supplied
// where things sit per frame (anchor table R below). No traced pixels.
include("palette.px.js")
include("cbase.px.js")

// ----------------------------------------------------------- tiny raster ---
// Each body part is drawn on its own layer, outlined there (sel-out style), then
// composited in depth order. Light comes from the upper left everywhere.
class Layer {
  constructor(w = 320, h = 180) { this.w = w; this.h = h; this.k = new Array(w * h).fill(".") }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h }
  get(x, y) { return this.in(x, y) ? this.k[y * this.w + x] : "." }
  set(x, y, k) { x = Math.round(x); y = Math.round(y); if (this.in(x, y)) this.k[y * this.w + x] = k }
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
    for (const [x, y, k] of pts) this.set(x, y, k)
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
  over(dst) { dst.each === undefined; for (let i = 0; i < this.k.length; i++) if (this.k[i] !== ".") dst.k[i] = this.k[i]; return dst }
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
    L.set(x, y, k)
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
      L.set(x, y, k)
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
      L.set(x, y, k)
    }
  }
  for (let y = 102; y <= 142; y++) { L.set(160, y, "a"); if (y > 108) { L.set(159, y, "b"); L.set(161, y, "b") } }
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) L.set(160 + s * (44 + i), 130 + Math.round(i * 0.8), "a")
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
  const L = new Layer(), cx = 160, cy = 96
  // the almond: outer lips (labia majora), skin with a flush, parted around the shaft
  for (const s of [-1, 1]) orb(L, cx + s * 9.5, cy - 6, 6.5, 13.5, s < 0 ? ["f", "g", "h", "i"] : ["f", "g", "g", "h"])
  orb(L, cx, cy + 3, 11, 5, ["f", "g", "g", null], (x, y) => y >= cy + 1)             // the back corner where they join
  // inner surfaces: wet pink between the lips and the shaft (labia minora stretched thin)
  for (let y = cy - 17 + drag; y <= cy + 2; y++) for (const s of [-1, 1]) {
    const edge = shaftIn ? 7 : 1
    L.set(cx + s * edge, y, (y + s) % 3 ? "k" : "m"); L.set(cx + s * (edge + 1), y, "k"); L.set(cx + s * (edge + 2), y, "j")
    if (drag > 2 && y < cy - 3) L.set(cx + s * (edge - 1), y, "j")
  }
  // hood at the top of the slit, just peeking past the shaft
  orb(L, cx, cy - 18, 4, 2.5, ["g", "h", "i", null])
  // the grip: the opening stretched round him, wet rim in front of the shaft
  const ry = 2 + Math.round(drag / 2)
  for (let x = -8; x <= 8; x++) {
    const t = 1 - (x / 8.5) ** 2; if (t < 0) continue
    const yb = cy + Math.round(Math.sqrt(t) * ry)
    for (let y = cy - Math.round(drag / 2); y <= yb; y++) L.set(cx + x, y, y === yb ? "j" : (x < -1 ? "m" : "k"))
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
  const L = new Layer()
  const prof = "GHHIIIIHHHGGFF"                      // 14px cylinder, lit from the left
  for (let y = top; y <= bot; y++) {
    const flare = y < top + 3 ? 1 : 0                // a slight flare at the base under the sack
    for (let i = -flare; i < prof.length + flare; i++) L.set(153 + i, y, prof[Math.max(0, Math.min(13, i))])
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
  const L = new Layer()
  const p = mode === "slap" ? { rx: 21, ry: 11, nw: 7, lob: 9 } : mode === "mid" ? { rx: 18, ry: 14, nw: 6, lob: 10 } : { rx: 17, ry: 15, nw: 5, lob: 10 }
  const top = cy - p.ry - 6
  // neck rising into the taint (no outline at the top: it is the same skin)
  for (let y = top; y < cy - p.ry + 4; y++) { const w = p.nw + (y - top) * 0.7; for (let x = Math.floor(cx - w); x <= cx + w; x++) L.set(x, y, x < cx - 2 ? "H" : "G") }
  orb(L, cx, cy - 1, p.rx, p.ry, ["F", "G", "H", "I"])
  // the two testicles show only as soft lower bulges either side of the seam
  for (const s of [-1, 1]) for (let y = cy; y < cy + p.ry; y++) for (let x = cx + s * 2; Math.abs(x - cx) < p.rx; x += s) {
    if (!L.opaque(x, y)) continue; const d = Math.hypot((x - (cx + s * p.lob * 0.9)) / p.lob, (y - (cy + 3)) / (p.ry - 3))
    if (d > 0.9 && d < 1.15 && y > cy + 2) L.set(x, y, "F") }
  L.each((x, y, k) => { if ((x - cx) * 0.55 + (y - cy) > p.ry * 0.7 && k === "H") L.set(x, y, "G") })
  for (let y = top; y < cy + p.ry + 2; y++) { const x = cx + Math.round(Math.sin(y * 0.33) * 0.7); if (L.opaque(x, y)) L.set(x, y, y > cy ? "F" : "G") }
  for (const [fx, fy, l] of [[-12, -3, 3], [-9, 2, 4], [-14, 5, 2], [-6, 7, 3], [-11, 9, 3], [4, -4, 3], [7, 1, 4], [10, 5, 3], [4, 8, 3], [-4, -7, 3], [2, -8, 2]]) {
    if (mode === "slap" && fy > 6) continue
    for (let i = 0; i < l; i++) { const X = cx + fx + i, Y = cy + fy + (i === 0 || i === l - 1 ? 1 : 0)
      const k = L.get(X, Y); if (k === "H") L.set(X, Y, "G"); else if (k === "I") L.set(X, Y, "H"); else if (k === "G") L.set(X, Y, "K") }
  }
  if (mode === "slap") L.each((x, y, k) => { if (y > cy + p.ry - 3 && "GH".includes(k)) L.set(x, y, "F") })   // pressed onto her
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
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (T[i] < 0) continue
    const t = T[i]
    let k = t < 0.22 ? ramp[3] : t < 0.46 ? ramp[2] : t < 0.70 ? ramp[1] : ramp[0]
    if (hi && t < 0.10 && TH[i] > 12) k = hi
    out.set(x, y, k) }
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
  const A = new Layer(); herAss(A, r.jig)
  A.each((x, y, k) => { if (B.get(x, y) !== "." && "ABCDEOWXYZ".includes(B.get(x, y))) return; F.set(x, y, k) })
  asshole(F)
  const drag = Math.round(r.out * 6)
  pussy(F, drag, true)
  const ballTop = r.by - (r.mode === "slap" ? 11 : 15)
  shaft(F, ballTop, 96 + Math.round(drag / 2) - 1)
  const ry = 2 + Math.round(drag / 2)
  for (let x = -8; x <= 8; x++) { const t = 1 - (x / 8.5) ** 2; if (t < 0) continue; const yb = 96 + Math.round(Math.sqrt(t) * ry); F.set(160 + x, yb, "j"); F.set(160 + x, yb - 1, x < -1 ? "m" : "k") }
  // his crack, dimples and taint drawn by hand over the reference body
  hisDetails(F, B, ballTop, r.out < 0.15 ? 1 : 0)
  sack(F, 160, r.by, r.mode)
  return F
}
function hisDetails(F, B, sackTop, clench) {
  const isHim = (k) => "ABCDEO".includes(k) && k !== "."
  // drop leftover crease marks from the reference inside his body (keep his silhouette lines)
  for (let y = 1; y < 179; y++) for (let x = 1; x < 319; x++) if (F.get(x, y) === "O") {
    const n = [F.get(x - 1, y), F.get(x + 1, y), F.get(x, y - 1), F.get(x, y + 1)]
    if (n.every((k) => isHim(k))) F.set(x, y, n.filter((k) => k !== "O")[0] || "B")
  }
  // glutes: two firm round masses ending right where the taint starts
  const G = new Layer(), gy = sackTop - 19, gx = 18 - clench * 1.5
  for (const s of [-1, 1]) {
    const cx = 160 + s * gx, rx = 20 - clench, ry = 20
    for (let y = Math.floor(gy - ry); y <= gy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if ((s < 0 ? x > 160 : x < 160) || !isHim(B.get(x, y))) continue
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - gy) / ry) ** 2 > 1) continue
      const d = Math.hypot((x + 0.5 - (cx - rx * 0.32)) / rx, (y + 0.5 - (gy - ry * 0.34)) / ry)
      let k = d < 0.62 ? "D" : d < 0.98 ? "C" : d < 1.28 ? "B" : "A"
      if (Math.abs(x - 160) < 3) k = k === "D" ? "C" : "B"
      { const a = Math.atan2(y + 0.5 - gy, x + 0.5 - cx), rr = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - gy) / ry); if (!clench && rr > 0.70 && rr < 0.84 && a > -2.6 && a < -1.9) k = "E" }   // thin rim sheen, upper left
      G.set(x, y, k)
    }
  }
  // lower edge of each glute: a fold line where it meets the back of the thigh
  for (const s of [-1, 1]) for (let x = 3; x <= 19; x++) { const t = x / 19, y = Math.round(gy + 19 - 3 * t * t + (t < 0.2 ? (0.2 - t) * 10 : 0)); if (isHim(B.get(160 + s * x, y))) G.set(160 + s * x, y, "O") }
  G.over(F)
  if (clench) for (const s of [-1, 1]) for (let i = 0; i < 5; i++) F.set(160 + s * (gx + 17), gy - 2 + i, "B")   // hollow on the clench
  // crack, straight down into the taint
  for (let y = gy - 17; y <= sackTop - 3; y++) { F.set(160, y, "A"); if (y > gy - 12) F.set(161, y, "B") }
  // taint: a short smooth bridge of skin between the glutes and the sack, seam running through
  for (let y = sackTop - 5; y <= sackTop + 2; y++) for (let x = 153; x <= 167; x++) { const w = 4 + (y - sackTop + 5) * 0.6; if (Math.abs(x - 160) > w) continue; F.set(x, y, x < 157 ? "C" : x > 163 ? "A" : "B") }
  for (let y = sackTop - 5; y <= sackTop + 2; y++) F.set(160, y, "A")
  for (let x = -5; x <= 5; x++) if (Math.abs(x) > 2) F.set(160 + x, sackTop - 5 + Math.round(Math.abs(x) * 0.3), "O")
}
anim("press_close", { w: 320, h: 180 }, ...R.map((r, f) => frame({ ms: r.ms }, stamp(`_cbase${f}`, 0, 0), (c) => {
  const F = drawFrame(r, c, f)
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const k = F.get(x, y); if (k !== ".") c.px(x, y, k) }
})))

// node tools/build_lit.js <art.px.js> <outdir> <name>
// Runs a pxl art file's drawing code outside pxl and writes, as horizontal frame strips:
//   <name>.mat.png  R = palette key (char code), G = flags (1 outline, 2 hand-drawn crease), A = coverage
//   <name>.nrm.png  surface normal, x/y/z mapped 0..255 (y points down the screen, z at the viewer)
//   <name>.json     frame size, timings, anchor points
// The game lights these per pixel at runtime.
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib')
const [art, outdir, name] = process.argv.slice(2)
const dir = path.dirname(path.resolve(art))
const grids = {}
const ctx = {
  Math, console, Float32Array, Uint8Array, Int32Array, Array,
  pal() {}, shades() {}, ramps() {},
  include(f) { const src = fs.readFileSync(path.join(dir, f), 'utf8'); if (/cbase|base/.test(f)) vm.runInContext(src, ctx) },
  sprite(n, a, b) { const g = typeof a === 'string' ? a : b; if (typeof g === 'string') grids[n] = g.replace(/^\n/, '').split('\n') },
  anim() {}, frame() {}, stamp(n, x, y) { return { stamp: n, x, y } },
}
vm.createContext(ctx)
vm.runInContext(fs.readFileSync(path.resolve(art), 'utf8') + '\n;this.__R = R; this.__draw = drawFrame;', ctx)
const R = ctx.__R, W = 320, H = 180, N = R.length, NL = 2          // layer 0: everything but the sack, 1: the sack
const SW = W * N, SH = H * NL
const mat = Buffer.alloc(SW * SH * 4), nrm = Buffer.alloc(SW * SH * 4)
// which part a pixel belongs to, for the physics: 1/2 her legs L/R, 3/4 her cheeks L/R, 5 him, 6/7 balls L/R
function part(li, k, x, y) {
  if (li === 1) return x < 160 ? 6 : 7
  if ('ABCDEOWXYZ'.includes(k)) return 5
  const her = 'abcdenoleL'.includes(k)
  if (!her) return 0
  const inAss = ((x - 136) / 32) ** 2 + ((y - 112) / 36) ** 2 <= 1.05 || ((x - 184) / 32) ** 2 + ((y - 112) / 36) ** 2 <= 1.05
  if (inAss && y >= 78) return x < 160 ? 3 : 4
  if (y < 92) return x < 160 ? 1 : 2
  return 0
}
const anchors = []
R.forEach((r, f) => {
  const g = grids[`_cbase${f}`] || []
  const c = { key: (x, y) => (g[y] && g[y][x]) || '.', px() {} }
  const F = ctx.__draw(r, c, f)
  anchors.push(F.anchor)
  F.layers.forEach((L, li) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, k = L.k[i], o = ((li * H + y) * SW + f * W + x) * 4
      if (k === '.') continue
      mat[o] = k.charCodeAt(0); mat[o + 1] = L.fl[i]; mat[o + 2] = part(li, k, x, y); mat[o + 3] = 255
      let nx = L.n[i * 3], ny = L.n[i * 3 + 1], nz = L.n[i * 3 + 2]; if (!nx && !ny && !nz) nz = 1
      nrm[o] = Math.round((nx * 0.5 + 0.5) * 255); nrm[o + 1] = Math.round((ny * 0.5 + 0.5) * 255); nrm[o + 2] = Math.round((nz * 0.5 + 0.5) * 255); nrm[o + 3] = 255
    }
  })
})
function png(file, w, h, buf) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; buf.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4) }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0 }
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]))
}
fs.mkdirSync(outdir, { recursive: true })
png(path.join(outdir, name + '.mat.png'), SW, SH, mat)
png(path.join(outdir, name + '.nrm.png'), SW, SH, nrm)
fs.writeFileSync(path.join(outdir, name + '.json'), JSON.stringify({ w: W, h: H, layers: NL, frames: R.map((r, f) => ({ ms: r.ms, out: r.out, ...anchors[f] })) }))
console.log('built', name, N, 'frames x', NL, 'layers')

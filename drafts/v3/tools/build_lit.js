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
const R = ctx.__R, W = 320, H = 180, N = R.length
const mat = Buffer.alloc(W * N * H * 4), nrm = Buffer.alloc(W * N * H * 4)
R.forEach((r, f) => {
  const g = grids[`_cbase${f}`] || []
  const c = { key: (x, y) => (g[y] && g[y][x]) || '.', px() {} }
  const F = ctx.__draw(r, c, f)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = F.k[i], o = (y * W * N + f * W + x) * 4
    if (k === '.') continue
    mat[o] = k.charCodeAt(0); mat[o + 1] = F.fl[i]; mat[o + 2] = 0; mat[o + 3] = 255
    let nx = F.n[i * 3], ny = F.n[i * 3 + 1], nz = F.n[i * 3 + 2]; if (!nx && !ny && !nz) nz = 1
    nrm[o] = Math.round((nx * 0.5 + 0.5) * 255); nrm[o + 1] = Math.round((ny * 0.5 + 0.5) * 255); nrm[o + 2] = Math.round((nz * 0.5 + 0.5) * 255); nrm[o + 3] = 255
  }
})
function png(file, w, h, buf) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; buf.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4) }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0 }
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]))
}
fs.mkdirSync(outdir, { recursive: true })
png(path.join(outdir, name + '.mat.png'), W * N, H, mat)
png(path.join(outdir, name + '.nrm.png'), W * N, H, nrm)
fs.writeFileSync(path.join(outdir, name + '.json'), JSON.stringify({ w: W, h: H, frames: R.map((r) => ({ ms: r.ms, out: r.out, pussy: [160, 96] })) }))
console.log('built', name, N, 'frames')

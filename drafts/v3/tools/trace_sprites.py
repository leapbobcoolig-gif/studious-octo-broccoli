#!/usr/bin/env python3
"""Trace 3D reference passes into clean pixel-art sprite bases.

    trace_sprites.py <refdir> <outdir> <nframes> [scale=4]

The 3D render is only a tracing guide: every output pixel is a palette key chosen by
rules a pixel artist would follow, then cleaned:
  - silhouettes by block majority (no AA mush), tiny parts (labia, anus, glans) weighted up
  - 4 flat tone bands per material + small highlight clusters, light from one side
  - band cleanup: no 1px islands, no single-pixel jaggies, no specks smaller than 3px
  - outlines: ink on the outer silhouette, darkest-ramp sel-out on contacts and folds,
    then a pixel-perfect pass that removes L-corners so lines stay 1px clean
Writes per frame: <outdir>/f<i>.keys.txt (one char per pixel, '.' = transparent),
<outdir>/f<i>.shadow.txt (couple's cast shadow on the bed) and a preview PNG.
"""
import json, os, sys, zlib, struct
import numpy as np

REF, OUT, NF = sys.argv[1], sys.argv[2], int(sys.argv[3])
SC = int(sys.argv[4]) if len(sys.argv) > 4 else 4
os.makedirs(OUT, exist_ok=True)

# material id -> (key ramp dark..light, highlight key, inner-outline key, group)
MAT = {
    5:  ('abcd', 'e', 'o', 'her'),     # her skin
    6:  ('abcd', 'e', 'o', 'her'),     # her skin under fishnet (net drawn on top)
    16: ('llLL', 'L', 'o', 'her'),     # lace band / stocking top
    7:  ('fghi', 'i', 'x', 'puss'),    # outer lips
    8:  ('jkmp', 'p', 'x', 'puss'),    # inner pink / grip ring
    9:  ('uvvv', 'v', 'x', 'puss'),    # anus
    10: ('ABCD', 'E', 'O', 'him'),     # his skin
    12: ('WXYZ', 'Z', 'O', 'him'),     # hair
    11: ('FGHI', 'J', 'V', 'gen'),     # shaft / sack skin
    18: ('KKFG', 'H', 'V', 'gen'),     # sack wrinkle lines
    14: ('PQRS', 'S', 'V', 'gen'),     # glans
}
TINY = {7: 3.0, 8: 3.0, 9: 4.0, 11: 1.6, 18: 1.0, 14: 2.0}
INK = 'z'

def load(f, key, dtype, ch=1):
    a = np.fromfile(os.path.join(REF, f'f{f}_{key}.bin'), dtype=dtype)
    return a

def trace(f):
    meta = json.load(open(os.path.join(REF, f'f{f}.json')))
    W, H = meta['w'], meta['h']; w, h = W // SC, H // SC
    mat = load(f, 'mat', np.uint8).reshape(H, W)
    shade = load(f, 'shade', np.uint8).reshape(H, W).astype(np.float32) / 200.0
    spec = load(f, 'spec', np.uint8).reshape(H, W).astype(np.float32) / 255.0
    nrm = load(f, 'nrm', np.int8).reshape(H, W, 3).astype(np.float32) / 127.0
    dist = load(f, 'dist', np.float32).reshape(H, W)
    cs = load(f, 'cs', np.uint8).reshape(H, W)

    body = np.isin(mat, list(MAT.keys()))
    # blocks
    bm = mat.reshape(h, SC, w, SC).transpose(0, 2, 1, 3).reshape(h, w, SC * SC)
    bbody = body.reshape(h, SC, w, SC).transpose(0, 2, 1, 3).reshape(h, w, SC * SC)
    bsh = shade.reshape(h, SC, w, SC).transpose(0, 2, 1, 3).reshape(h, w, SC * SC)
    bsp = spec.reshape(h, SC, w, SC).transpose(0, 2, 1, 3).reshape(h, w, SC * SC)
    bd = dist.reshape(h, SC, w, SC).transpose(0, 2, 1, 3).reshape(h, w, SC * SC)
    bn = nrm.reshape(h, SC, w, SC, 3).transpose(0, 2, 1, 3, 4).reshape(h, w, SC * SC, 3)
    bcs = cs.reshape(h, SC, w, SC).transpose(0, 2, 1, 3).reshape(h, w, SC * SC)

    # 1) material per pixel: weighted majority, body needs >=45% coverage (clean silhouettes)
    M = np.zeros((h, w), np.uint8)
    cov = bbody.mean(axis=2)
    for y in range(h):
        for x in range(w):
            if cov[y, x] < 0.45:
                continue
            vals, cnt = np.unique(bm[y, x][bbody[y, x]], return_counts=True)
            wts = np.array([c * TINY.get(int(v), 1.0) for v, c in zip(vals, cnt)])
            M[y, x] = vals[np.argmax(wts)]
    # island removal on the material map (keep tiny anatomical parts)
    for _ in range(2):
        M2 = M.copy()
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                m = M[y, x]
                nb = [M[y - 1, x], M[y + 1, x], M[y, x - 1], M[y, x + 1]]
                if m and m not in (9,) and all(n != m for n in nb):
                    vals, cnt = np.unique(nb, return_counts=True); M2[y, x] = vals[np.argmax(cnt)]
                if m == 0 and sum(1 for n in nb if n) >= 3:
                    vals, cnt = np.unique([n for n in nb if n], return_counts=True); M2[y, x] = vals[np.argmax(cnt)]
        M = M2

    # 2) per-pixel guides from the chosen material's samples
    D = np.full((h, w), 99.0, np.float32); S = np.zeros((h, w), np.float32)
    SP = np.zeros((h, w), np.float32); N = np.zeros((h, w, 3), np.float32)
    for y in range(h):
        for x in range(w):
            m = M[y, x]
            if not m:
                continue
            sel = bm[y, x] == m
            if not sel.any():
                sel = bbody[y, x]
            if not sel.any():
                sel = np.ones(SC * SC, bool)
            D[y, x] = bd[y, x][sel].min(); S[y, x] = bsh[y, x][sel].mean()
            SP[y, x] = (bsp[y, x][sel] > 0.55).mean()
            n = bn[y, x][sel].mean(axis=0); N[y, x] = n / (np.linalg.norm(n) + 1e-6)

    # 3) tone bands + cleanup
    L = np.full((h, w), -1, np.int8)
    thr = [0.34, 0.58, 0.84]
    L[M > 0] = np.digitize(S[M > 0], thr)
    def band_clean(L, passes=3):
        for _ in range(passes):
            L2 = L.copy()
            for y in range(1, h - 1):
                for x in range(1, w - 1):
                    if L[y, x] < 0: continue
                    m = M[y, x]
                    nb = [(yy, xx) for yy, xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1),(y-1,x-1),(y-1,x+1),(y+1,x-1),(y+1,x+1)) if M[yy, xx] == m]
                    if len(nb) < 4: continue
                    same = sum(1 for yy, xx in nb if L[yy, xx] == L[y, x])
                    if same <= 2:
                        vals, cnt = np.unique([L[yy, xx] for yy, xx in nb], return_counts=True); L2[y, x] = vals[np.argmax(cnt)]
            L = L2
        return L
    L = band_clean(L)
    # remove tone specks smaller than 3px (flood fill per material+level)
    seen = np.zeros((h, w), bool)
    for y in range(h):
        for x in range(w):
            if seen[y, x] or L[y, x] < 0: continue
            m, l = M[y, x], L[y, x]; stack = [(y, x)]; comp = []; seen[y, x] = True; border = []
            while stack:
                cy, cx = stack.pop(); comp.append((cy, cx))
                for yy, xx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                    if 0 <= yy < h and 0 <= xx < w:
                        if M[yy, xx] == m and L[yy, xx] == l and not seen[yy, xx]:
                            seen[yy, xx] = True; stack.append((yy, xx))
                        elif M[yy, xx] == m and L[yy, xx] != l:
                            border.append(L[yy, xx])
            if len(comp) < 3 and border and m not in (9,):
                vals, cnt = np.unique(border, return_counts=True)
                for cy, cx in comp: L[cy, cx] = vals[np.argmax(cnt)]

    # 4) highlights: compact clusters on skin / pink / glans only
    HL = (SP > 0.34) & np.isin(M, [5, 10, 8, 14, 11]) & (L >= 2)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if HL[y, x] and not (HL[y-1, x] or HL[y+1, x] or HL[y, x-1] or HL[y, x+1]) and M[y, x] not in (8, 14):
                HL[y, x] = False

    # 5) outlines
    def grp(m): return MAT[m][3] if m in MAT else None
    E = np.zeros((h, w), np.uint8)   # 1 = inner sel-out, 2 = outer ink
    for y in range(h):
        for x in range(w):
            m = M[y, x]
            if not m: continue
            for yy, xx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if not (0 <= yy < h and 0 <= xx < w): continue
                mm = M[yy, xx]
                if not mm: E[y, x] = 2; break
                dz = D[yy, xx] - D[y, x]
                if dz > 0.03 * D[y, x] + 0.012: E[y, x] = max(E[y, x], 1); continue
                if grp(mm) != grp(m) and dz > 0: E[y, x] = max(E[y, x], 1); continue
                if float(N[y, x] @ N[yy, xx]) < 0.45 and dz > 0: E[y, x] = max(E[y, x], 1)
    # pixel-perfect: drop L-corner pixels (outline with outline neighbours on two orthogonal sides
    # whose shared diagonal is also outline) so curves read as single clean steps
    for _ in range(2):
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if not E[y, x]: continue
                for (ay, ax), (by, bx) in (((-1,0),(0,-1)),((-1,0),(0,1)),((1,0),(0,-1)),((1,0),(0,1))):
                    if E[y+ay, x+ax] and E[y+by, x+bx] and not E[y-ay, x-ax] and not E[y-by, x-bx] and E[y+ay+by, x+ax+bx] == 0:
                        if E[y, x] == 2 and (M[y-ay, x-ax] == 0 or M[y-by, x-bx] == 0): break
                        E[y, x] = 0; break

    # 6) keys
    K = np.full((h, w), '.', dtype='<U1')
    for y in range(h):
        for x in range(w):
            m = M[y, x]
            if not m: continue
            ramp, hl, inner, g = MAT[m]
            if E[y, x] == 2: K[y, x] = INK
            elif E[y, x] == 1: K[y, x] = inner
            elif HL[y, x]: K[y, x] = hl
            else: K[y, x] = ramp[max(0, min(3, int(L[y, x])))]
            if m == 6 and K[y, x] in 'abcde' and ((x + y) % 4 == 0 or (x - y) % 4 == 0):
                K[y, x] = 'n'
    # couple's cast shadow on the bed (1x, majority)
    SH = (bcs.mean(axis=2) > 0.4) & (M == 0)
    return K, SH, meta

PREVIEW = {  # preview colours only; the real palette lives in the pxl art file
    'a': '#c9876f', 'b': '#e2a98a', 'c': '#f2c6a8', 'd': '#fbe1c9', 'e': '#fff6ec', 'n': '#2a1820', 'l': '#2b1b2b', 'L': '#4a3047', 'o': '#8e4f45',
    'f': '#c4687a', 'g': '#e48f9a', 'h': '#f2aeb2', 'i': '#fbd0cc', 'j': '#8c2443', 'k': '#c23b62', 'm': '#e06a86', 'p': '#ffb3c1', 'u': '#7a2c45', 'v': '#a8476a', 'x': '#6b1f38',
    'A': '#6f4a3c', 'B': '#9c6c52', 'C': '#c99470', 'D': '#e6bb95', 'E': '#fbe6cf', 'O': '#4a2e28', 'W': '#2a1b18', 'X': '#3a2721', 'Y': '#5a3d31', 'Z': '#7a5644',
    'F': '#7c4440', 'G': '#a1605a', 'H': '#bf7a6c', 'I': '#dba08e', 'J': '#f4cdbd', 'K': '#6a3634', 'V': '#4a2424', 'P': '#9b3550', 'Q': '#c95170', 'R': '#e8798e', 'S': '#ffb3c1',
    'z': '#1a0f1e',
}
def png(path, rgba):
    h, w, _ = rgba.shape
    raw = b''.join(b'\x00' + rgba[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

PX = ['// GENERATED by tools/trace_sprites.py from the 3D reference rig. Do not hand-edit:\n// hand work goes in the art file that includes this one.\ninclude("palette.px.js")\n']
BASE = sys.argv[5] if len(sys.argv) > 5 else None
for f in range(NF):
    K, SH, meta = trace(f)
    h, w = K.shape
    open(os.path.join(OUT, f'f{f}.keys.txt'), 'w').write('\n'.join(''.join(r) for r in K))
    open(os.path.join(OUT, f'f{f}.shadow.txt'), 'w').write('\n'.join(''.join('s' if v else '.' for v in r) for r in SH))
    rgba = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            k = K[y, x]
            if k == '.':
                rgba[y, x] = (60, 50, 80, 255) if SH[y, x] else (110, 100, 140, 255)
            else:
                c = PREVIEW.get(k, '#ff00ff'); rgba[y, x] = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
    png(os.path.join(OUT, f'f{f}.preview.png'), rgba)
    json.dump(meta, open(os.path.join(OUT, f'f{f}.meta.json'), 'w'))
    print('traced frame', f, 'keys', len(set(K.flatten())))
    if BASE:
        PX.append('sprite("_%s%d", { w: %d, h: %d }, `\n%s`)\n' % (os.path.basename(BASE).split('.')[0], f, w, h, '\n'.join(''.join(r) for r in K)))
        PX.append('sprite("_%s_sh%d", { w: %d, h: %d }, `\n%s`)\n' % (os.path.basename(BASE).split('.')[0], f, w, h, '\n'.join(''.join('s' if v else '.' for v in r) for r in SH)))
if BASE:
    open(BASE, 'w').write('\n'.join(PX))

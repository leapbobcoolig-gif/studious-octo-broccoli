#!/usr/bin/env python3
"""Bake MakeHuman (CC0) base mesh + default skeleton + weights into a compact JSON asset.

Usage: prep_humans.py <makehuman/data dir> <out.js|out.json>

Produces two body shapes from the same topology (so every guy can be re-shaped
procedurally at runtime from the delta targets we also export):
  - "female": young, thick hips, big ass
  - "male":   young, athletic
plus per-shape skeleton joint positions, triangle indices for the body group,
4-bone skin weights, and a few delta targets (muscle / weight / butt) so the game
can roll new guys without re-running this script.
"""
import base64, json, sys, os
import numpy as np

DATA, OUT = sys.argv[1], sys.argv[2]

def load_obj(path):
    vs, faces, g = [], [], None
    for line in open(path):
        if line.startswith('v '):
            vs.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('g '):
            g = line.split()[1]
        elif line.startswith('f ') and g == 'body':
            faces.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
    return np.array(vs, np.float64), faces

def load_target(name):
    d = {}
    for line in open(os.path.join(DATA, 'targets', name)):
        if line[0] == '#' or not line.strip():
            continue
        i, x, y, z = line.split()
        d[int(i)] = (float(x), float(y), float(z))
    return d

def apply(base, parts):
    v = base.copy()
    for name, w in parts:
        if w == 0:
            continue
        for i, dv in load_target(name).items():
            v[i] += w * np.array(dv)
    return v

def delta(base_len, name):
    out = np.zeros((base_len, 3))
    for i, dv in load_target(name).items():
        out[i] = dv
    return out

verts, quads = load_obj(os.path.join(DATA, '3dobjs', 'base.obj'))
n_all = len(verts)

U = 'macrodetails/universal-%s-young-%s-%s.target'
female = apply(verts, [
    ('macrodetails/caucasian-female-young.target', 1.0),
    (U % ('female', 'averagemuscle', 'averageweight'), 0.45),
    (U % ('female', 'averagemuscle', 'maxweight'), 0.40),
    (U % ('female', 'maxmuscle', 'averageweight'), 0.15),
    ('buttocks/buttocks-volume-incr.target', 1.0),
    ('hip/hip-scale-horiz-incr.target', 0.55),
    ('hip/hip-scale-depth-incr.target', 0.35),
])
male = apply(verts, [
    ('macrodetails/caucasian-male-young.target', 1.0),
    (U % ('male', 'averagemuscle', 'averageweight'), 0.35),
    (U % ('male', 'maxmuscle', 'averageweight'), 0.65),
    ('torso/torso-muscle-dorsi-incr.target', 0.6),
    ('buttocks/buttocks-volume-incr.target', 0.35),
    ('pelvis/bulge-decr.target', 1.0),            # flat crotch: genitals are drawn separately
])

# delta targets the runtime can blend per generated guy
male_deltas = {
    'muscle': delta(n_all, U % ('male', 'maxmuscle', 'averageweight')) - delta(n_all, U % ('male', 'averagemuscle', 'averageweight')),
    'weight': delta(n_all, U % ('male', 'averagemuscle', 'maxweight')) - delta(n_all, U % ('male', 'averagemuscle', 'averageweight')),
    'skinny': delta(n_all, U % ('male', 'minmuscle', 'minweight')) - delta(n_all, U % ('male', 'averagemuscle', 'averageweight')),
    'butt': delta(n_all, 'buttocks/buttocks-volume-incr.target'),
}

# --- compact to body-group vertices
used = sorted({i for f in quads for i in f})
remap = {o: n for n, o in enumerate(used)}
tris = []
for f in quads:
    f = [remap[i] for i in f]
    tris.append([f[0], f[1], f[2]])
    if len(f) == 4:
        tris.append([f[0], f[2], f[3]])

# --- skeleton
sk = json.load(open(os.path.join(DATA, 'rigs', 'default.mhskel')))
bones = list(sk['bones'].keys())
bidx = {b: i for i, b in enumerate(bones)}

def joints_for(v):
    return {j: v[idx].mean(axis=0) for j, idx in sk['joints'].items()}

def skeleton(v):
    J = joints_for(v)
    out = []
    for b in bones:
        bb = sk['bones'][b]
        out.append({'h': J[bb['head']], 't': J[bb['tail']]})
    return out

# --- weights: top 4 per vertex
W = json.load(open(os.path.join(DATA, 'rigs', 'default_weights.mhw')))['weights']
per = [[] for _ in range(n_all)]
for b, lst in W.items():
    for vi, w in lst:
        per[vi].append((w, bidx[b]))
widx = np.zeros((len(used), 4), np.uint8)
wval = np.zeros((len(used), 4), np.float32)
for n, o in enumerate(used):
    lst = sorted(per[o], reverse=True)[:4]
    s = sum(w for w, _ in lst) or 1.0
    for k, (w, b) in enumerate(lst):
        widx[n, k] = b
        wval[n, k] = w / s

# --- convert decimetres -> metres, put feet on y=0
SCALE = 0.1
def to_m(v):
    return v * SCALE

def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()

def shape_block(v):
    vm = to_m(v)
    floor = vm[used][:, 1].min()
    vm[:, 1] -= floor
    sk_ = skeleton(vm)
    return {
        'pos': b64(vm[used].astype(np.float32)),
        'bones': [{'h': list(map(float, s['h'])), 't': list(map(float, s['t']))} for s in sk_],
    }


asset = {
    'license': 'MakeHuman base mesh, skeleton, weights and targets: CC0 (makehumancommunity/makehuman)',
    'nverts': len(used),
    'ntris': len(tris),
    'tris': b64(np.array(tris, np.uint32)),
    'widx': b64(widx),
    'wval': b64(wval),
    'boneNames': bones,
    'parents': [bidx[sk['bones'][b]['parent']] if sk['bones'][b]['parent'] else -1 for b in bones],
    'female': shape_block(female),
    'male': shape_block(male),
    'maleDeltas': {k: b64((d[used] * SCALE).astype(np.float32)) for k, d in male_deltas.items()},
}
with open(OUT, 'w') as fh:
    fh.write('window.HUMANS=' + json.dumps(asset) + ';') if OUT.endswith('.js') else json.dump(asset, fh)
print('verts', len(used), 'tris', len(tris), 'bones', len(bones), 'bytes', os.path.getsize(OUT))

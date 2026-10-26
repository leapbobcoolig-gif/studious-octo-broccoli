# Pixel Dollhouse

**18+ only.** A sandbox pixel-art dollhouse with explicit sexual content between fictional adults. You direct a
procedurally animated couple in a side-view bedroom.

Nothing in it is a hand-drawn sprite. Every body is a skeleton solved with IK each frame. The bodies are rasterized
from smooth signed-distance shapes, with lighting, dithering and outlines. Breasts, butt, belly, thighs, balls and
shaft are physics springs, and the hair is a verlet chain.

## Run

Open `index.html` in a browser. There's no build step and no server needed.

## Controls

| Key / mouse | Action |
| --- | --- |
| `1`–`4` | Cowgirl, reverse cowgirl, missionary, doggy |
| `[` `]` or mouse wheel | Slower / faster |
| `Space` | Stop / resume motion |
| `A` | Auto mode: speeds up with arousal and switches positions |
| `C` | Make them cum |
| `R` | New random couple |
| `P` | Mono / color palette |
| `L` | Lamp on / off (moonlit grade) |
| `S` | Sound (procedural slaps and creaks) |
| `H` | Hide UI |
| Click a body | Poke the breasts, butt or balls |

The toolbar opens three panels:
- **HER**: height, bust, butt, hips, thighs, belly, sensitivity, skin, hair color and style, fishnets / stockings, bra, choker.
- **HIM**: height, muscle, belly, length, girth, stamina, skin, hair, beard, socks.
- **MOVE**: speed and stroke length.

## How it works

```
src/core.js       vector helpers, constants (BED_Y, SCALE)
src/palette.js    indexed ramps -> mono / color / moonlit lookup tables
src/render.js     320x180 indexed framebuffer, SDF group rasterizer (smooth union, fake-3D normals,
                  Bayer dither, 1px outline), clothing paints, 3x5 bitmap font
src/room.js       bedroom: windows, stars, clouds, lamp glow, mirror, bouncing bed
src/physics.js    Spring (gravity sag + jiggle), Hair (verlet + collisions + bend limit)
src/rig.js        character params, torso frames, 2-bone IK, kneeling solver, skeleton blending
src/body.js       skeleton -> body / breasts / genitals / limbs / hair / face groups
src/positions.js  the 4 positions; each one couples the two bodies at penis base <-> entry
src/director.js   stroke curve, impacts, arousal, climax, faces, voices, transitions
src/fx.js         floating words, hearts, sweat, fluid drips, wet spots on the sheets
src/audio.js      WebAudio slaps, creaks
src/ui.js, main.js  toolbar, panels, loop, HUD, face-cam portrait, input
```

To add a position, write a `solve(S, k)` in `positions.js` that returns skeletons for `m` and `w`, plus a draw `order`.

## Previews / tests

```
NODE_PATH=$(npm root -g) node tools/shot.js out/                          # all positions
NODE_PATH=$(npm root -g) node tools/shot.js out/ 'pos=doggy&phase=0.1&palette=color#100,30,140,90'
```

URL params: `pos`, `t` (seconds to simulate), `phase`, `speed`, `arousal`, `palette`, `seed=rand`,
`to`/`tt` (transition preview), `click=<button>`, `#x,y,w,h` (6x crop). The tool exits non-zero on console errors.

## Single-file build

`node tools/bundle.js` inlines everything into `dist/pixel-dollhouse.html` (git-ignored). That one file is the
version published as a private claude.ai artifact.

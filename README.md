# SWIPE STRAIGHT

**18+ only.** This is a crude, explicit pixel-art adult idle/sim game, and its humor is deliberately offensive. All
characters are fictional adults.

You are a faceless operator running a fake profile on a Grindr parody. You trick gay guys into hookups, and the girl
waiting in the room "converts" them straight. The goal is to make Grindr go extinct, city by city. The game is not
meant to be taken seriously: it's edgy, crude, horny and stupid on purpose.

> **Full game design, roadmap, status and handoff notes: [`DESIGN.md`](DESIGN.md).** Read it first if you are
> picking this project up.

---

## Run it

Open `index.html` in a browser. There's no build step and no server: the scripts are plain `<script>` files that share
one global namespace, `window.PD`, and it works over `file://`.

To make the single-file version:

```
node tools/bundle.js          # -> dist/pixel-dollhouse.html (git-ignored)
```

That one file inlines all the CSS and JS. It's what gets published as the playable claude.ai artifact.

## What's playable right now (Phase 1, milestones 1–3 of 5)

```
18+ gate -> title -> main menu -> NEW GAME
  -> intro comic (6 animated shots)
  -> fake-profile creator (pic / name / age / position / bio -> "who bites")
  -> inbox flood (47 taps, Tyler, 21: "hiii u up?? :3")
  -> the phone: grid -> Tyler's profile -> branching chat (Trust vs Sus, find his weakness)
  -> trick picker (Blindfold unlocked; others locked)
  -> "Tyler is on his way" -> Chapter 3 teaser card       <- M4 starts here
Main menu also has: CONTINUE (resumes by chapter), SETTINGS, COLLECTION (locked), SANDBOX MODE
```

**Sandbox mode** is the original procedural sex engine with a toolbar:
- four positions
- speed and stroke controls
- climax, palette and lamp
- character customisation

## Controls

Everything works with the mouse, or with arrows / WASD plus Enter / Space. Esc / Backspace goes back. There's a custom
pixel cursor.

**Sandbox keys:**

| Key | Action |
| --- | --- |
| `1`–`4` | Positions |
| `[` `]` or the wheel | Speed |
| `Space` | Pause |
| `A` | Auto mode |
| `C` | Cum |
| `R` | Random couple |
| `P` | Palette |
| `L` | Lamp |
| `S` | Sound |
| `H` | Hide UI |
| Click a body | Poke |

## File map

Load order is in `index.html`, and it matters:

```
src/core.js       PD namespace, vec helpers, W=320 H=180, BED_Y, SCALE=1.4
src/palette.js    indexed colour ramps (ramp*6+shade); LUTs: color, mono, colorDark, monoDark
src/render.js     FB (indexed framebuffer: rect/drect/darken/ellipse/line/blit/blitKey),
                  SDF group rasterizer PD.drawGroup (smooth union, fake-3D lit normals, Bayer dither,
                  1px outline, paints/clips/clipY/softRoots), 3x5 font PD.GLYPHS / PD.text / PD.sprite
src/uikit.js      input, PD.textS (scaled/outlined/shadowed/wavy text), PD.panel, immediate-mode PD.UI
                  (button/slider/select, keyboard focus, sfx hook), cursor, pink dither wipe
src/room.js       sandbox bedroom (windows, lamp, bed, mirror)
src/physics.js    Spring (jiggle/sag), Hair (verlet chain with colliders + bend limit)
src/rig.js        character params, torso frames, 2-bone IK, kneel solver
src/body.js       skeleton -> lit SDF groups (body, breasts, genitals, limbs, hair, face, ears)
src/positions.js  cowgirl / reverse / missionary / doggy solvers + per-position draw orders
src/fx.js         floating FX words (the "PLAP" style), hearts, drips, wet spots
src/director.js   stroke curve, impacts, arousal, climax, faces, voice lines
src/audio.js      procedural WebAudio: slaps, creaks, UI blips, pop/thud/whoosh/buzz/ping/tick/lock/scratch
src/ui.js         sandbox HTML toolbar (PD.UI_SANDBOX)
src/scenes.js     settings + save (localStorage), scene manager PD.SM, neon skyline, menu phone prop,
                  scenes: boot, bye, title, menu, settings, chapter (teaser card)
src/story.js      chibi sprite system PD.drawDude + PD.CAST, comic helpers (bubble, caption, popAt),
                  PD.drawMask (Grindr mask logo), scenes: intro (comic), profile (creator), posted (inbox)
src/props.js      lit props on drawGroup: phone grip, big thumb + PD.nail, the kit, operator desk,
                  the 4 fake profile pics (PD.PICS)
src/phone.js      scene: phone (grid, Tyler's profile, chat script NODES, trick picker TRICKS)
src/main.js       boot, loop, sandbox scene + HUD + face cam, URL params, PD.debug hooks
tools/shot.js     headless screenshots (Playwright)
tools/bundle.js   single-file inliner
```

## How the art works (important for anyone adding art)

- **Indexed framebuffer.** Every pixel stores `ramp*6 + shade`. Shades: 0 outline, 1 shadow, 2 base, 3 light,
  4 highlight, 5 accent. Palettes are just lookup tables, so mono/colour/moonlit swaps cost nothing.
  `PD.C('neon', 2)` gives the colour index.
- **`PD.drawGroup(fb, {prims, ramp, k, ...})`** is the workhorse for anything round or organic: bodies, hands,
  bottles, fabric. Primitives are `PD.cap(a, b, ra, rb)` (tapered capsules) and `PD.ell(c, rx, ry, angle)`. They're
  smooth-unioned, lit from the upper left, dithered and outlined. **Use this for any new art.** Flat rects and circles
  look cheap, and LO will call it out.
- **`PD.drawDude(fb, x, y, {s, skin, hair, hairStyle, shirt, shirtStyle, pants, face, cap, beard, flag, beer, shades,
  blush, phoneFace, selfie, clip, rows})`** is the chibi guy sprite. It's built on a grid with auto outline and shading,
  then stamped at integer scale. Faces: `blank`, `smug`, `happy`, `shock`, `dumb`, `cry`. `PD.CAST` holds the preset
  guys.
- **`PD.popAt(fb, k, cx, cy, drawFn)`** gives the scale-pop entrance (k: 0 to 1) used for bubbles, captions and
  tiles.
- **FX words** should look like the sex scene's: white `PD.text` with a black outline, drifting up and dither-fading.
  Use `new PD.FX()` with `.word()` / `.heart()` / `.update()` / `.draw()`.

## Testing / previews

```
NODE_PATH=$(npm root -g) node tools/shot.js out/                                  # sandbox positions
NODE_PATH=$(npm root -g) node tools/shot.js out/ 'scene=title&t=3' 'scene=menu'   # any scene
```

- **URL params:**
  - `scene=<name>`: boot, title, menu, settings, intro, profile, posted, phone, chapter or sandbox.
  - `gate=0` skips the 18+ screen.
  - `static=1` stops the render loop, so tests step the game manually.
  - Sandbox params: `pos`, `t`, `phase`, `speed`, `arousal`, `palette`, `seed=rand`, `to`/`tt`.
  - A trailing `#x,y,w,h` makes `shot.js` save a 6× crop of that area.
- **`PD.debug.step(seconds)`** advances the game deterministically. Drive scenes from Playwright by setting fields
  on `PD.SM.scenes.<name>`, then step and screenshot.
- `shot.js` exits non-zero on console errors.

## Saves

All saves live in `localStorage`:
- **`ss-settings`:** master, sfx, palette, textSpeed, shake.
- **`ss-save`:**
  - `chapter`: intro → profile → posted → chat → room
  - `profile`: `{pic, name, age, pos, bio1, bio2}`
  - also `trick`, `trust`, `converted`, `cash`

`PD.chapterScene(save)` maps the chapter to the scene that CONTINUE opens.

# SWIPE STRAIGHT: design doc, roadmap and handoff

This is the single source of truth for what the game is, what's built, what's next, and how to keep working on it.
Anyone (or any Claude session) continuing the project should read all of it.

---

## 1. The pitch

You're a **faceless operator** with a fake profile on a Grindr parody. You lure gay guys into a hookup; behind the
door is a **girl** (him not knowing is the whole point), and the sex "converts" him straight. Every convert drops the
city's **GUYS ONLINE** counter by one. Push it to **0**, the app goes "SERVICE UNAVAILABLE IN THIS AREA", and you
**rebirth into the next city**. Endgame: make Grindr extinct everywhere.

**Genre:** an idle/sim with a hands-on loop (chat → trick → room → convert), growing into a building full of rooms
that run on their own, recruiters, prestige, and new cities.

**Title:** SWIPE STRAIGHT. Tagline on the title screen: "TURN THE WHOLE TOWN."

## 2. Tone and content rules (from the creator, LO)

- **Crude, edgy, humiliating, degrading, "homophobic" as part of the kink, but never serious.** Lots of casual
  homophobic jokes and slurs in narration, quips and UI. The creator is a gay man; this is his fetish (orientation
  play, gay-to-straight). Funny first, hot second, and never preachy.
- **The guys must NOT come willingly to be converted.** There's **no conversion-therapy premise**. They get *tricked*
  (blindfold, lights off, drunk, a bet...). Later upgrades get you all the way to the **Upfront** trick: you tell him
  it's a girl and he comes anyway.
- **The woman is NOT the focus.** The focus is **the guys, their reactions, the conversion, and the pussy**. The
  corner square cam shows **HIS face**. There's a **pussy cam**. Her squirting, his condom coming off, and his gay
  meter draining are the payoffs.
- **No drag queens.**
- The operator never shows a face: a hoodie from behind, a hooded icon.
- All characters are fictional adults (18+). There's an 18+ gate at boot.
- Visual style: vibrant but **not eye-bleeding**. The palette was toned down once already. There's no strict palette
  rule, so pick what looks good per screen. Mono stays available as an option in settings.

## 3. Collaboration rules (how LO likes to work)

- **Milestones.** Build in chunks, publish each one, and check in before stacking more.
- **The rating cycle.** After each pass, rate the work 1–10 honestly against screenshots; **if it's under 7 (LO now
  pushes for 8 on first impressions), do another pass.** Report the scores.
- **Look at your own screenshots at high zoom.** LO zooms in and catches everything:
  - sprites clipped by the grid edge, or missing outlines
  - text running off panels or phones
  - layering mistakes (limbs over or under the wrong thing)
  - "random" props with no context
  - static FX that just jitter
- **No lazy art.** LO hates flat rects and circles standing in for objects ("lazy to just put text on a box"). Use
  `PD.drawGroup` lit forms, real silhouettes, real details: thumbnails are half-moons with a free edge, a phone grip
  looks like a real grip, props are recognisable objects, and every scene must make sense (light sources need a
  source).
- **Effects and sound matter for first impressions.** Pops, whooshes, beat-synced shakes, FX words in the in-game
  PLAP style.
- The real Grindr look is a **black UI with a yellow mask logo** (a mask with two slanted eye holes), not a yellow
  header bar.
- LO decides the big calls. Pitch options, but keep momentum; don't re-ask settled things.

---

## 4. The core loop (one guy)

1. **Browse** the app grid. Guys show distance, online status, and tags.
2. **Profile.** Read his stats, tags and bio. Tags hint at his **weakness**.
3. **Chat.**
   - **Reply choices:** each choice moves **Trust** (up good) and **Sus** (up bad).
   - **Reveals:** some replies reveal his **weakness**.
   - **Mistakes:** pushy or too-honest replies spike Sus. If Sus hits 100 he blocks you (the tutorial rewinds).
   - **Payoff:** enough Trust gets you "u hosting?"
4. **Trick picker.** Choose a trick. Match % = how well it fits his weakness, plus Trust. Locked tricks cost $ or need
   rebirths.
5. **The room** (M4). He arrives under the trick. Scene beats:
   - **Setup:** he's going at it unaware ("bro you're so smooth"). His **face cam** shows him clueless, and the
     **pussy cam** shows the action.
   - **The reveal:** the trick fails (the blindfold slips). Screen shake, freeze-frame, his face cam on "WHAT THE
     FUCK".
   - **The hook minigame:** a rhythm/mash bar against his **Escape** bar. Win and he stays.
   - **The conversion:** his **Gay meter** drains through 5 stages, each with new faces, crude lines and body
     language ("this doesn't count" → "why is it so warm" → begging).
   - **Live room transformation:** his pride decor flips to frat decor as the meter drains.
   - **The condom moment:** a mid-scene decision. Going raw is a big multiplier, but too early and he walks.
   - **The squirt meter:** she builds it and you aim it. In the face is a huge conversion chunk.
6. **Payout.** A **STRAIGHT** stamp, a before/after card, the counter going down by one, cash, and he leaves in a
   backwards cap. He might become a **Recruiter**.

## 5. Guy tiers (planned roster)

| Tier | Guy | Gay HP | Weakness | Quirk |
| --- | --- | --- | --- | --- |
| 1 | Twink (Tyler = tutorial) | Low | Blindfold | Panics loud, converts fast, cries a little |
| 1 | Bi-curious bro | Very low | Anything | "I mean, I've thought about it..." Free money |
| 1 | Closet case | Low | Lights off | Already has a girlfriend; guilty face |
| 2 | Gym bro | Medium | The Bet | Ego. Refuses until you question his manliness |
| 2 | Bear | High | Drunk | Slow to convert, drops big money |
| 2 | Theater kid | Medium | Drunk / Bet | Monologues during the reveal and wastes his escape time |
| 2 | Jock | Medium | Bet | Sometimes brings a teammate (2-for-1 room) |
| 3 | Gold star gay | Huge | Combos only | Never touched a woman; immune to single tricks |
| 3 | Kyle the ex | High | Jealousy | Relapses; comes back after converting |
| 3 | The couple | 2× | Split them | Two linked rooms; convert one and the other gets jealous |
| 3 | App moderator | High | Upfront | Converting him bans 500 accounts |
| Boss | Mayor of the Gayborhood | Multi-phase | Everything | Bodyguard twink, fake girlfriend, a speech |
| Final | Grindr CEO | — | — | Endgame |

**Tricks:**
- **Blindfold** (start)
- **Lights Off** ($200)
- **Get Him Drunk** ($500)
- **The Bet** ($1,200)
- **Upfront** (unlocked after rebirth 1)
- More later, and combos for tier 3.

## 6. Progression by hour (the target feel)

- **Hour 0: the first 10 minutes.** This is Phase 1, the current build. Intro comic, profile creator, Tyler tutorial
  (chat → trick → room → convert → payout), then a teaser of the hub.
- **Hour 1: learning to hunt.**
  - One room, one girl, all manual.
  - About half of attempts fail: guys spot the trick and leave 1-star reviews that lower your **Profile Rating**,
    which means worse matches.
  - Cash buys tricks, profile upgrades (better fake pics → better guys) and **room 2** (juggle two guys).
- **Hours 2–4: the building.**
  - Buy the apartment building. The **hub** is a side-view dollhouse cross-section you scroll, with each room playing
    live.
  - Hire **girls** who run rooms automatically and auto-pick tricks.
  - Rooms flip from pride to frat decor live when guys convert.
  - Idle income, with a "While you were gone: 312 converted. 4 cried. 1 proposed." report.
- **Hours 4–8: recruiters and chains.**
  - Converts become **Recruiters** who lure their friends ("trust me bro, blindfold hookup, it's insane").
  - Group-chat chains convert in bulk.
  - The **Collection Dex** fills with a before/after card per guy type.
  - Events: **Pride Month** (2× HP, 3× pay), **Super Bowl Sunday** (gym bros give themselves up).
- **Hours 8–12: boss and rebirth.**
  - The counter nears 0 and the city boss appears.
  - Win: the app crashes on screen, a frat-party montage plays, and every room flips at once.
  - **Rebirth / Move City:**
    - You lose cash, rooms and staff.
    - You keep **Notoriety** (permanent multipliers) and the Dex.
    - New tricks unlock, including **UPFRONT**.
- **Later cities** get bigger counters, nastier guys and new events. The **final city** has the Grindr CEO.
- **Endless mode / NG+** for idle players.

## 7. Screen map

```
BOOT (18+) -> TITLE -> MAIN MENU -> (new game) INTRO COMIC -> PROFILE CREATOR -> INBOX -> PHONE -> ROOM -> PAYOUT
                         |                                                                              |
                         +-- CONTINUE (by chapter)                                         HUB: THE BUILDING (Phase 2)
                         +-- SETTINGS                                                       |-- PHONE (browse/chat)
                         +-- COLLECTION / DEX (locked)                                      |-- ROOM VIEW
                         +-- SANDBOX MODE                                                   |-- SHOP (tricks, pics, decor)
                                                                                            |-- STAFF (girls, recruiters)
                                                                                            '-- CITY MAP (rebirth)
```

---

## 8. Status: what's built

### Engine (done, from the original "Pixel Dollhouse" prototype)
- **Renderer:** a 320×180 indexed framebuffer, the SDF body rasterizer with lighting, dither and outlines, and the
  palette LUTs (color, mono, moonlit).
- **Bodies:** procedural female and male bodies with IK, spring jiggle and verlet hair.
- **Positions:** cowgirl, reverse cowgirl, missionary and doggy, with correct draw orders (his shaft is drawn just
  before her body; his near leg after his genitals).
- **Director:** stroke curve, impacts, arousal, climax and faces, plus FX words and procedural audio.
- **Sandbox mode** exposes all of this.

### Phase 1: "the first 10 minutes"
| Milestone | Status | Contents |
| --- | --- | --- |
| **M1** front end | ✅ | Scene manager + wipe, pixel UI kit, 18+ gate, title (SWIPE drop, STRAIGHT slam, rainbow→pink zap), menu, settings, saves |
| **M2** intro + profile | ✅ | 6-shot animated comic; fake-profile creator with lit pics and "who bites"; inbox flood |
| **M3** the phone | ✅ | App grid, Tyler's profile, branching chat (Trust/Sus, weakness, fumbles + tutorial rewind), trick picker, "on his way" |
| **M4** the room | ⏳ next | See section 9 |
| **M5** tutorial glue + polish | ⏳ | Tutorial prompts through the room, payout, "to be continued" hub teaser, rating loop over the whole flow |

**M2 details:**
- **Intro shots:**
  1. A city full of rainbows.
  2. The app grid: 10,000 online, held in a real phone grip.
  3. The operator at his desk, plus the kit (vodka, lube, XXL condoms, blindfold).
  4. Before / door / after, with beat-synced FX words and hearts.
  5. The 10,000 counter rolling up, with a crosshair locking onto the mask logo.
  6. A thumb pressing CREATE PROFILE.
- **Profile options:**
  - **Pics:** gym torso, mirror selfie, bulge pic, sunset.
  - **Names:** JAKE, CHAD, DADDYMIKE, TOP4NOW, DISCREETGUY.
  - **Ages:** 19, 24, 31, 44.
  - **Position:** top, vers or bottom.
  - **Bios:** "Discreet. ___ only." and "Into: ___".
- **How the options work:** each option adds weights to `[twink, closet, gym, bear]` (`PD.profileBites`) and has a
  snarky operator quip. These weights should drive which guys appear later.

**M3 chat script** (in `src/phone.js`, `NODES`):

```
start -> (oops) -> into -> blind (weakness found) / ew -> pic -> hispic / picwow / blocked (rewind) -> host -> (host2) -> TRICK -> after -> END
```

### Known nits LO flagged but deferred ("I have issues but it's fine")
- The profile pics went through a rating cycle (~7 each), but LO still isn't fully happy. Revisit them in polish.
- The chibi `drawDude` busts are fine at small sizes; larger close-ups should move to drawGroup-lit heads.
- The operator's hood silhouette is a big rounded mound; it could use a clearer hood/shoulder read.

---

## 9. Next up: M4 "the room" (detailed plan)

Build it as a new scene (e.g. `src/roomscene.js`) on top of the sandbox engine (`D` Director, `S` chars, `drawSandbox`
in `main.js`). Factor the sandbox draw into a reusable function first.

1. **Arrival:** the door opens, Tyler comes in blindfolded (a blindfold decal on his head group), and the room is his
   pride-decorated bedroom: pride flag, fairy lights, the unicorn, an Ariana poster.
2. **The scene:** the existing positions engine, with HUD reworked for the game:
   - **His face cam** in the corner (already exists as `portrait()`: blindfold on, clueless face).
   - A **pussy cam** inset: a zoomed crop of the entry point.
   - The **Gay meter** (5 stages, with faces and lines per stage) and a "conversion %" bar.
3. **Blindfold play:** he's into it ("bro you're so smooth", "since when are you this tight?"). The operator comments.
4. **The reveal:** the blindfold slips. Freeze-frame, screen shake, a zoom on his face cam, "WHAT THE FUCK", and a
   record scratch.
5. **The hook minigame:** mash or rhythm to fill **Hook** before his **Escape** bar fills. Tyler is easy.
6. **The conversion:**
   - **Meter:** drains in stages, with escalating lines, from "this doesn't count" to "why is it so warm" to "don't stop".
   - **Decor:** pride decor flips to frat decor live, item by item (flag → sports pennant, poster → car poster,
     glitter → beer cans).
7. **The condom moment:** a prompt to take it off. A multiplier, with risk.
8. **The squirt meter:** build it, aim it, and land the payoff on his face for a huge chunk.
9. **Payout screen:**
   - a **STRAIGHT** stamp slam
   - a before/after card (chibi pride twink → backwards-cap bro)
   - the counter going from 10,000 to **9,999**
   - cash earned
   - his exit line

Save: `converted: 1`, cash, Dex entry.

Reuse pieces from the git stash **`g2s-prototype-attempt`**: `git stash list`, then `git stash show -p stash@{0}`.
It has an older prototype with:
- the phone overlay, guy types and tricks
- the gay meter, condom and squirt logic in the director
- pride decor in `room.js`
- wide eyes, and blindfold/shades decals
- extra glyphs

Mine it for parts; don't apply it wholesale (LO rejected that one-screen version).

**M5:**
- tutorial prompts across the room scene
- after the payout, a "TO BE CONTINUED" hub teaser: the building cross-section with room 2 locked, the counter, and
  "Phase 2"
- a rating loop over the entire first 10 minutes, aiming for 8+

## 10. Phase 2+ (after Phase 1)

- **Phase 2, the hub:**
  - the building cross-section with multiple rooms, girls running rooms
  - idle income, the shop and the "while you were gone" report
  - tier 1–2 guys, with profile Bites weights steering spawns
- **Phase 3, the engine:** recruiters and chains, the Collection Dex, events, tier 3 guys.
- **Phase 4, rebirth:** the city boss, the app-crash cinematic, the city map, Notoriety, Upfront, new cities.
- **Phase 5, endgame:** final cities, the Grindr CEO, the ending, NG+.

---

## 11. Tech conventions / gotchas

- **Plain classic scripts, global `PD`.** No modules or bundler at dev time. `index.html` order matters: `props.js`
  and `phone.js` load after `story.js`.
- **Scenes** live on `PD.SM.scenes.<name>` as `{enter, update(dt), draw(fb), idle?, ownCursor?}`.
  `SM.go(name)` does the wipe; `SM.shake = seconds` shakes (respect `PD.Settings.shake`).
- **Immediate-mode UI:** call `UI.button(...)` every frame inside `draw`; it returns true on activation.
  `UI.activate`, `UI.back` and `UI.navLeft/Right` are this frame's keys.
- **Don't let Enter hit stray buttons.** The intro's SKIP is mouse/Esc only for this reason.
- **Clip art to panels** by drawing into an offscreen `PD.FB` and calling `fb.blit(src, x, y, w, h)` (same
  coordinates). Pop effects use `blitKey` with key 255.
- **Text:** the 3×5 font is uppercase only (`up()` everything). Width is 4px per char. A missing glyph renders as a
  space, so add new ones to `PD.GLYPHS` in `render.js` (`[ ] ; * @` were added).
- **Sound:** WebAudio is enabled on the 18+ click. Add new UI sounds in `A.ui(kind)` in `audio.js`.
- **Test it like LO will:** step scenes via `PD.debug.step`, screenshot, then crop and upscale problem areas (see the
  README) and actually look at them.
- **Publishing:** `node tools/bundle.js`, then publish `dist/pixel-dollhouse.html` as the private artifact.
- Work branch so far: `claude/nice-franklin-ms7vi7`.

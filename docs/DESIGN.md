# G2S Bedroom Sim — Design Brainstorm

## Context
LO wants an explicit pixel-art "dollhouse" sex sim inspired by Wife's Bedroom: you watch a procedurally
animated couple from behind (mating press / missionary), with the camera on her hips and pussy. She stays
anonymous: no face, no boobs, no lines. The theme is **G2S**: a rotating line of gay guys getting turned
straight. The player does **both** rhythm clicking and tool management on the side. Fully explicit. The
palette can be switched in settings. **The user asked to brainstorm, not build.** The only deliverable for
now is this doc, committed as `docs/DESIGN.md`.

## Core loop (idle sim + rhythm layer)
- The scene runs on its own (idle). Thrusts loop procedurally and their speed scales with his conversion stage.
- **Rhythm layer:** a pulse ring on the hips. Clicking when he bottoms out scores Perfect/Good/Miss → combo
  multiplier, "PLAP" and moan onomatopoeia popups, hearts.
- **Tend layer:** lube runs dry (thrusts slow down), condoms fill and drop to the floor (broom them up or they
  cost hearts), and a stamina bar means he needs a breather (a water bottle tool).
- **Climax:** a meter fills to a cum event (creampie or a full condom depending on the toggle), which gives a
  big score burst and conversion XP.
- **Idle income:** "Conversions" are the currency. Offline progress means he keeps going while you're away (capped).

## The G2S rotation
- A queue of procedurally generated gay guys: build, skin tone, hair, body hair, cock size/shape, a "type"
  archetype, and a starting **Resistance** stat.
- **Straightness meter, 5 stages:**
  1. *Denial*: limp-ish, bored, "this does nothing for me."
  2. *Confused*: hard anyway, blushing, "why is it so warm…"
  3. *Slipping*: speeds up, sweating, starts naming her body parts.
  4. *Gone*: rough mating press, "fuck, pussy is so much better."
  5. *Converted*: obsessed. He goes into the "Alumni" gallery, and "NEW LOVER" brings in the next guy.
- **Reaction portrait** (bottom-left, his face only): the sprite, expression and dialogue change with each stage.
- **Cosmetic shedding:** a pride bracelet, crop top, harness, "twink" hair and posters on the wall get swapped
  out or fall off stage by stage, and the room drifts toward a "straight bachelor" vibe.
- **Archetypes with different Resistance and lines:** twink, bear, gym bro "gold star" (the hardest),
  theatre kid, leather daddy, closeted jock.
- Optional **reversal mode**: toggle S2G for variety later.

## Tools sidebar ideas
Lube, condom on/off (creampie mode), speed/depth slider, position swap (mating press, missionary from behind,
prone bone, doggy from behind, cowgirl seen from behind), broom, water/stamina, "dirty talk" button (she stays
silent, so this is a narrator text or a phone-speaker gag), room decor shop, music/ambience, camera zoom.

## Progression & meta
- Upgrades bought with Conversions: bigger bed, better lube, auto-broom roomba, faster pulse ring.
- Alumni gallery: converted guys come back as "regulars" who give passive income.
- Achievements: "Gold Star Breaker," "100 creampies," "Converted a bear in under 2 min."
- Daily "stubborn guy" challenge with high Resistance.

## Art / tech direction
- Single-file HTML5 canvas, internal resolution 320×180, integer-scaled with nearest-neighbour, 60fps.
- **Procedural bodies:** built from ellipses and capsules on a simple rig (pelvis, thighs, calves, torso),
  dithered shading, animated by sine-driven thrust curves with squash and stretch on the ass and thighs, plus
  wet/sweat particles.
- Explicit genital layer: a parametric labia/opening that deforms with penetration depth, plus cock shaft and
  balls with jiggle physics.
- **Palette setting:** Grayscale + pink accents (like the reference), GameBoy green, SNES 16-color, Night/sepia.
- Save state in localStorage. Mobile-friendly tapping.

## Open questions for LO
- Dialogue tone: funny/meme-y, or hot and serious?
- Does each guy have a name and a mini bio card?
- Any end goal (convert X guys = "win"), or endless?


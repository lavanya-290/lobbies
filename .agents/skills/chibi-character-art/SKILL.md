---
name: chibi-character-art
description: Generate cute, chibi, top-down/isometric pixel art characters, stylized furniture/outfit variants, and whimsical pets for a Habbo-style multiplayer house game. Use when the task involves creating a NEW character sprite, walk-cycle animation, costume/outfit piece, themed furniture variant (sci-fi/Japanese/fantasy/pirate/etc.), or a pet/companion sprite. Do NOT use for basic ground tiles, walls, or standard furniture — those come from the project's existing Screaming Brain Studios asset packs and should never be regenerated.
---

# Habbo-Clone Character & Stylized Asset Skill

## Core philosophy

You are generating art for a small multiplayer house-building game. The
base world (ground, walls, basic furniture) already exists as a licensed,
purchased-once asset foundation from Screaming Brain Studios (SBS) — true
2:1 isometric projection. **Nothing you generate is allowed to clash with
that foundation.** Every sprite you produce must look like it could have
shipped in the same pack, even though it's AI-generated.

Visual target: **Gather.town's chibi warmth** (soft, clean, welcoming,
slightly oversized heads, simple clear silhouettes) crossed with
**Habbo Hotel's chunky isometric charm** (thick clean outlines, saturated
but not neon colors, exaggerated proportions that read instantly at small
size).

Pixel art is not low-res painting. Every pixel is a deliberate choice.
Prefer a strong readable silhouette over fussy detail. Prefer 4 excellent
animation frames over 12 mediocre ones. Avoid anti-aliasing/soft gradients
— hard pixel edges only, in the classic pixel-art tradition.

## Non-negotiable technical constraints

These come directly from the SBS packs already in the project and must be
matched exactly, every time, no exceptions:

- **Projection:** true 2:1 isometric (NOT the 30°×45° or 35.264°×40°
  "fake iso" variants used by some other asset lines — those will not
  align with the existing tiles).
- **Grid family:** Small (128px tile width family) — confirm against
  `client/public/assets/tiles/` before generating, since the project
  standardized on Small, not Large, for file-size reasons.
- **Outline:** consistent 1px dark outline on every sprite, matching the
  SBS pack's outline weight — sample directly from an existing SBS tile
  PNG's outline color before generating anything new.
- **Palette discipline:** sample the dominant colors already used across
  the placed SBS ground/wall tiles first. New sprites should draw from a
  compatible palette family (similar saturation/value range), not
  introduce a jarringly different color temperature.
- **Canvas/transparency:** transparent PNG background, sprite anchored at
  bottom-center of its tile footprint (matches how the game's `Asset`
  system positions objects).

If a reference image (Gather.town screenshot, Quaternius model render,
etc.) conflicts with these constraints, the constraints win. References
are for silhouette/vibe/mood only — never copy proportions, colors, or
details wholesale from a reference image; describe what you're drawing
from it in your own words and redraw from scratch.

## Category-specific guidance

### Characters (male/female, ~5-10 variants)
- Chibi proportions: head roughly 1/3 to 1/2 of total body height, small
  simplified body, no fingers/facial detail at this scale — read as a
  friendly shape first, a person second.
- Each character needs: idle (facing down) + 4-directional walk cycle
  (up/down/left/right), 2-4 frames per direction minimum for a readable
  walk animation. WASD movement means all 4 directions are seen equally
  often — none can be a lower-effort afterthought.
- Keep the base body generic/neutral where possible; put personality into
  hair, clothing, and color choices rather than face detail, since outfit
  layering (below) needs a consistent base to sit on top of.
- Export each direction's frames as a labeled sprite sheet (e.g.
  `character_a_walk_down.png`, 4 frames in a row) — match whatever naming
  convention `client/src/game/` already expects; check existing
  placeholder code before finalizing names.

### Stylized furniture & outfits (sci-fi, Japanese, fantasy, pirate, etc.)
- These exist to make a themed room actually feel themed — a sci-fi
  bedroom needs to look unmistakably different from a Japanese one at a
  glance, while both still sit correctly on the same SBS floor tile.
- Use Quaternius's pirate/sci-fi/monster packs (already CC0, already in
  this project's research) as **shape and concept reference only** — a
  captain's hat's silhouette, a ray gun's proportions. Never trace or
  closely mimic their exact geometry; those are 3D models in a completely
  different medium (untextured low-poly), not something to copy — redraw
  the *idea* as isometric pixel art from scratch.
- Outfits should be designed as separate layers (hat, top, bottom,
  accessory) that composite onto the neutral character base above, not as
  one fused sprite per outfit — this is what makes the mix-and-match
  avatar creator (already planned) actually work.

### Pets/companions
- Whimsical, quirky, a little silly — small enough to sit believably next
  to a chibi character without dominating the room.
- Take shape/silhouette inspiration from Quaternius's Ultimate Monsters
  pack the same way as above: describe the *kind* of creature (e.g.
  "round body, single big eye, stubby legs" or "long neck, tiny wings,
  friendly dopey expression") in your own words, then generate an
  original pixel-art design from that description — don't reproduce a
  specific model's exact silhouette or coloring.
- Needs at minimum an idle animation (2-4 frame breathing/bounce loop);
  a simple follow-the-player walk cycle is a nice-to-have, not required
  for a first pass.

## What NOT to generate with this skill

- Ground tiles, wall tiles, or standard/default furniture — these come
  from the existing SBS packs already placed in the project. Regenerating
  these would fragment the visual foundation this skill is designed to
  protect.
- Anything closely mimicking a specific real, named, trademarked
  character, game, or brand (this includes Habbo's or Gather's own
  characters specifically — style/vibe inspiration is fine, copying their
  actual character designs is not).

## Before generating anything

1. Open one existing SBS tile PNG and sample its outline color and 2-3
   dominant palette colors.
2. Confirm the project's current tile grid size (Small/128px family)
   hasn't changed since this skill was written.
3. State the target grid size, outline weight, and sampled palette back
   in your own response before producing the first image, so there's a
   checkpoint to catch a mismatch before generating a whole batch.

### Male vs. female body differentiation (required, not optional)
Chibi proportions can easily default toward one gender's silhouette by
accident — explicitly counter this every time:
- **Male base:** wider, more squared shoulders; straight/flat torso line
  with no bust curve; slightly thicker neck; jawline can read a touch
  more angular even within chibi's soft rounding.
- **Female base:** narrower shoulders relative to hips; torso silhouette
  can have a gentle curve; softer jawline.
- **Hairstyles must differ meaningfully between the two bases** — do not
  reuse the same haircut silhouette across genders. Generate distinct
  hairstyle options per base (e.g. short/textured/spiky variants for
  male bases, longer/bob/ponytail variants for female bases) as part of
  the separate hair-layer set, not baked identically into both.
- When in doubt, describe the silhouette difference explicitly in every
  prompt rather than assuming the model will infer it correctly from
  the word "male" or "female" alone.
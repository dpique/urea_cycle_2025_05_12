# CLAUDE.md

## Project Overview

**Metabolon** is a 3D browser game (Three.js) that teaches the fundamentals of metabolic
genetics by letting the player run the machinery of a living cell by hand. Built by
StudyRare for ABMGG and ABGC board prep.

**Setting:** the inside of one living liver cell. Each metabolic pathway is a district of
that cell. The player is an operator who keeps the cell alive by running its pathways.

**Core philosophy:** show, do not tell. The player carries molecules, operates enzyme
machines, and does construction work (strap on phosphates, squeeze rings, split molecules,
capture ammonia). Dialogue is 1 to 2 lines per screen. The full vision lives in
`docs/game-design-document.md` (v2) — that file is the canonical design document.

This codebase is a **from-scratch rebuild (v2)**. The pre-rebuild version is preserved on
the git tag `pre-rebuild-v1` and the branch `archive/pre-rebuild-v1`.

## Development Setup

```bash
npm run dev     # Vite dev server at localhost:5173 (hot reload)
npm run build   # Production build to dist/ (base path /urea_cycle_2025_05_12/)
npm run preview # Preview the production build
npm run test    # Vitest data-integrity + art-builder tests
npm run lint    # ESLint
```

Controls: WASD/arrows move, click-drag look, scroll zoom, E interact, Space jump,
T cycles districts, M mute, F5 save, H help. Deep-link a district with `?world=<id>`
(`hub`, `glycolysis`, `urea-cycle`).

## Architecture

The game is data-driven. A pathway is a declarative definition plus a set of placements;
a single runner turns that into the playable core loop. Adding a world is content, not
engine work.

```
src/
  main.js                 boot: init systems, register worlds, load hub
  core/
    engine.js             game loop, freeze-while-blocking, companion, global keys
    renderer.js           scene, camera, warm light rig, gradient sky, fog, resize
    input.js              keyboard + camera-relative move, drag orbit, wheel zoom
    player.js             third-person hero, terrain follow, jump, carried-molecule slot
    router.js             world registry, cleanup-safe world roots, portal-as-lesson transitions
    interaction.js        proximity, floating indicator, E-to-interact (no shared-material mutation)
    economy.js            shared currency + item inventory (the cohesion layer) + events
    pathway.js            declarative pathway runner (the reuse win)
    hud.js                purpose gauge, currency chips, pathway diagram, objective, toasts
    dialogue.js           1-2 line dialogue + end-of-world Reality Check quiz
    minigame.js           timing + hold skill games (blocking overlays)
    audio.js              WebAudio synth blips
    save.js               localStorage persistence
  art/
    palette.js            single source of truth for color (districts, currencies, elements)
    materials.js          shared cached material factory (flat / toon / glow / glass)
    props.js              reusable prop kit (ground, heightField, sign, tree, lantern, textSprite…)
    stations.js           machine builders (workbench, splitter, extractor, cannon, kettle, gate…)
    character.js          low-poly enzyme character presets (each encodes its mnemonic) + Coa
    molecule.js           ball-and-stick molecule models carried and transformed by the player
  data/pathways/          declarative pathway definitions (biochemistry a biochemist can audit)
  worlds/                 hub, glycolysis, ureaCycle — thin: terrain + placements + startPathway
docs/                     game-design-document.md (canonical v2); world/character bibles (reference)
tests/                    data-integrity and art-builder execution tests
```

### World module interface

Each world exports `config`, `init(ctx)`, optional `update(dt, t)`, and `cleanup()`.
`init` receives a rich `ctx`: `{ scene, worldRoot, player, economy, hud, dialogue,
minigame, interaction, audio, art, startPathway, addInteractable, onUpdate, goToWorld,
setTerrain, setCollider, setAtmosphere }`. Worlds build terrain, set a layout, and hand a
pathway definition to `ctx.startPathway({ def, placements, onProgress, onComplete })`. The
router owns cleanup: each world builds into a fresh `worldRoot` group, so teardown is one
remove plus clearing interactables and per-frame callbacks.

### Adding a new world (the cheap path)

1. Write `src/data/pathways/<name>.js` — steps with `requires`, `gives`, `itemGives`,
   `product` (a molecule the builder can render), optional `minigame`, `dialogue lines`,
   `teach`, plus a `quiz` and a `reward`. `npm run test` validates every reference.
2. Add characters/machines: a new enzyme is a preset in `art/character.js` (encode the
   mnemonic in its look) or a machine in `art/stations.js`.
3. Write `src/worlds/<name>.world.js` — build terrain, place stations, call
   `ctx.startPathway`, add portals with `worlds/shared.js`.
4. Register it in `src/main.js` and add a portal to it from the hub.

### The three cohesion mechanisms

1. **Shared economy** (`economy.js`) — one currency/item inventory persists across all
   worlds. Glycolysis makes the ATP the urea cycle spends. This is a real mechanic.
2. **Coa** — the recurring companion (Coenzyme A), attached globally, hovers by the player
   in every world.
3. **Portal-as-lesson** — inter-world transits animate the connecting reaction and name the
   enzyme (`router.transitionTo` transit card).

Each pathway also has a **purpose gauge** that is its reason to exist (energy for
glycolysis; ammonia toxicity for the urea cycle).

## Current World Status

### The Atrium (hub) — DONE
Circular cytosol plaza. Professor Hepaticus greets and explains; introduces Coa. Portals
to Furnace Row (glycolysis), The Nitrogen Works (urea cycle), and a coming-soon
Mitochondrion (TCA) descent.

### Furnace Row — Glycolysis — DONE
Hill terrain: climb during the 2-ATP investment phase, peak at the aldolase split, descend
during the 4-ATP payoff. 10 stations (Hexy/HK, Izzy/PGI, Phil/PFK-1, Al/aldolase, Tim/TPI,
Gary/GAPDH, Peggy/PGK, Mutty/PGM, Eno/enolase, Pike/PK). Molecule companion morphs each
step. Mini-games for phosphorylation and the split. Boss (paid): pyruvate kinase deficiency.

### The Nitrogen Works — Urea Cycle — DONE
Two compartments split by the mitochondrial-membrane river with the ORNT1 bridge. Ammonia
starts as a carried toxin (toxicity gauge high, green vignette); packaging it into urea is
the point. Nagesh brews NAG; ATP crystals and an aspartate shuttle are ingredient sources.
Steps: CPS1/Casper, OTC/Otis, ASS/Donkey, ASL/Aslan, ARG1/Argus, then the waste chute.
Boss (paid): OTC deficiency (X-linked, elevated orotic acid).

### Coming soon
TCA cycle, ETC, fatty-acid oxidation, and all paid disease modules. The pathway runner is
built to accept them as data.

## Design Principles

1. **Show, do not tell** — carry and transform molecules; terrain and gauges encode meaning.
2. **Player as agent** — enzymes are workstations the player operates, not lecturers.
3. **Space is biology** — adjacency and portals reflect real metabolic connections.
4. **Character is mnemonic** — every enzyme's name, look, and behavior encodes a board fact
   (Percy's missing ring finger is the teaching point that vitamin B4 does not exist).
5. **Board-relevant** — every world teaches high-yield ABMGG/ABGC content; every quiz item
   is board caliber.

## Business Context

- **StudyRare** (studyrare.com) — genetics board prep. Audience: ABMGG/ABGC candidates.
- **Revenue split:** normal pathways are free (the funnel); disease states (inborn errors of
  metabolism) are the paid tier. Each world boss is a real IEM — the high-yield board content.
- Other streams: institutional licensing, conference demos (ACMG/NSGC), qbank.studyrare.com
  integration.

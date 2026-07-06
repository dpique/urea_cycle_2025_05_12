# Metabolon — Game Design Document (v2)

A 3D browser game that teaches the fundamentals of metabolic genetics by letting you
run the machinery of a living cell with your own hands. Built by StudyRare for ABMGG
and ABGC board preparation.

This is the canonical design document. Where earlier docs (`world-bible.md`,
`character-bible.md`) disagree with this file, this file wins. Those files are retained
only as a biochemistry and mnemonic reference.

---

## 1. The one-sentence pitch

You are the newest operator inside a single living liver cell, and your job is to keep
it alive by running the pathways that make its energy and clear its poisons. Every
pathway you learn is one more part of the cell you can keep running.

## 2. What was wrong with v1, and what changes

v1 was three disconnected worlds (urea cycle, TCA, glycolysis) with three clashing
themes (a graveyard, a pirate ship, a demolition yard), a 32-step urea quest hard-coded
as a giant switch statement, and no shared story or shared stakes. It taught the steps
of each pathway but not the *purpose*, and nothing tied the worlds together.

v2 fixes the four things that were broken:

1. **One cohesive world, one story.** The whole game is the inside of one cell. Every
   pathway is a district of that cell with a shared visual language. One recurring
   guide travels with you across all districts.
2. **Purpose is the point.** Each pathway has a live gauge that *is* its reason to
   exist. Glycolysis feeds an energy gauge. The urea cycle holds down a toxicity gauge.
   You learn why a pathway matters by feeling what happens when it stalls.
3. **A shared metabolic economy is the connective tissue.** There is one inventory of
   currencies (ATP, NADH, NADPH, FADH2, GTP, carbon, nitrogen) carried across every
   world. Glycolysis *makes* the ATP that the urea cycle *spends*. The player physically
   moves currency between districts, so the interconnection of metabolism is felt, not
   described.
4. **Pathways are data, not bespoke code.** A declarative pathway runner turns a pathway
   into a data file plus a layout. Adding the next of 25 worlds is content work, not an
   engineering project.

## 3. Design pillars (from v1, sharpened)

1. **Show, do not tell.** The player carries molecules, operates machines, and does
   construction work. Terrain and gauges encode meaning. Dialogue is 1 to 2 lines per
   screen, never a wall.
2. **Player as agent.** Enzymes are workstations you operate, not lecturers. You strap
   phosphates on, squeeze rings, pull molecules apart, capture ammonia.
3. **Space is biology.** Adjacency and portal placement reflect real metabolic
   connections. Students learn pathway links through geography.
4. **Character is mnemonic.** Every enzyme character's name, look, and behavior encodes
   a board fact. Percy's missing ring finger *is* the teaching point that vitamin B4
   does not exist.
5. **Board-relevant.** Every world teaches high-yield ABMGG and ABGC content. Every
   quiz item is board caliber.

## 4. The setting: one cell

The game takes place inside one hepatocyte. The liver is chosen deliberately: it is the
one cell where the most board-relevant pathways physically converge (urea cycle,
glycolysis and gluconeogenesis, ketogenesis, and more). This makes "one cell, many
districts" biologically honest rather than a convenient fiction.

- **Macro space is horizontal.** You walk a third-person character through connected
  districts at street level (the cytosol).
- **Compartment boundaries are vertical.** You descend into the mitochondrion. Passive
  transport is a staircase (free). Active transport is an elevator that charges ATP at
  the turnstile. Membrane-transport disorders become "the elevator is broken" puzzles.
  This teaches compartmentalization without a single line of exposition.

### Districts (only the first three are built in this slice)

| District | Pathways | Purpose gauge | Status |
|---|---|---|---|
| **The Atrium** (hub, central cytosol) | none — the crossroads | shows all gauges | built |
| **Furnace Row** | Glycolysis (then TCA, ETC) | Energy (ATP) | glycolysis built |
| **The Nitrogen Works** | Urea cycle (then amino-acid catabolism) | Toxicity (ammonia) | built |
| Warehouse Row (lipids), Archive (nucleotides), Ironworks (heme) | future | — | planned |

## 5. The recurring guide: Coa

One character travels with you into every district: **Coa**, the cell's courier, who is
Coenzyme A. This is not decoration. Coenzyme A is the real universal acyl carrier that
appears in glycolysis (into PDH), the TCA cycle (as succinyl-CoA), fatty-acid oxidation,
ketone bodies, and the urea cycle (acetyl-CoA is the substrate for NAG). Coa is a small
floating character with a reactive thiol "hand" that molecules clip onto. Because Coa is
a companion rather than a placed NPC, one character carries story continuity across all
25 planned worlds at zero per-world cost. Coa delivers the 1-to-2-line guidance, names
each new district's purpose, and reacts when a gauge goes wrong.

## 6. The core loop

Inside any pathway world, the loop is identical, which is why the engine can drive it
from data:

1. **Approach a station.** Stations are a mix of humanoid enzyme NPCs (for regulatory and
   gatekeeper steps) and machines (for mechanical reactions). A station shows what it
   needs and what it makes.
2. **Have the inputs.** You carry the substrate and any required cofactor or currency
   (ATP, NAD+). If you are missing something, the station tells you where to get it.
3. **Operate it.** Press E. Simple reactions resolve instantly with a transform
   animation. Key reactions run a short skill mini-game (time a phosphate onto the right
   carbon; hold and release a pull in the green zone to cleave a bond).
4. **Receive the product.** The molecule you carry visibly transforms. Currencies update
   in the shared economy. The pathway diagram HUD advances.
5. **The gauge responds.** Producing ATP raises the energy gauge. Capturing ammonia
   lowers the toxicity gauge. The purpose is legible in real time.

## 7. Cohesion mechanisms

1. **Shared economy.** One currency inventory across all worlds (see section 2, item 3).
2. **Coa, the recurring guide** (section 5).
3. **Portal as lesson.** Every world-to-world transit is a 1-to-2-second animated
   reaction with a one-line caption naming the enzyme, not a loading screen. Crossing
   from glycolysis into the mitochondrion runs pyruvate to acetyl-CoA and names PDH.
   Over 25 worlds the player learns the entire connection table by feel.
4. **Shared theme sets.** Every district inherits a base visual language (palette,
   materials, floor, props) and varies one accent, so the game reads as one place.

## 8. Art direction

Stylized low-poly 3D in the spirit of *A Short Hike* and *Animal Crossing*: a few
primitive shapes per object, flat or lightly toon-shaded materials, and color doing the
heavy lifting. The craft bar is met not by polygon count but by cohesion and light:

- **One palette, one material factory.** Every object in the game pulls from a shared
  palette and a shared set of material presets. This single decision is what separates
  "crafted" from "random primitives."
- **Warm, soft light.** A key directional light with soft shadows, a warm ambient fill, a
  hemispheric bounce, and gentle distance fog under a vertical gradient sky.
- **Rounded, friendly forms.** Characters are geometric humanoids with rounded limbs and
  expressive faces built from simple shapes. Molecules are legible models built from
  spheres and sticks, color-coded by element, carried visibly by the player.
- **Readability first.** A learner must be able to tell an enzyme, a molecule, and a
  currency apart at a glance. Silhouette and color carry meaning.

## 9. Teaching model

The player understands a pathway when they can answer three questions without being told:
what goes in, what comes out, and why the cell bothers. The game is built to make all
three answerable by experience.

- **What goes in / what comes out** is taught by carrying and transforming the actual
  molecule, step by step, and by the shared economy updating as currencies are spent and
  made.
- **Why the cell bothers** is taught by the purpose gauge. In the urea cycle, ammonia is
  a hazard that damages you while you carry it and poisons the district if it builds up;
  packaging it into harmless urea is visibly the point. In glycolysis, the energy gauge
  and the physical uphill-then-downhill terrain make the invest-then-earn logic of ATP
  bookkeeping something you feel in your legs.

Each world ends with a short board-caliber check (the "Reality Check") of 4 to 6 items,
each independently high-yield, delivered one question per screen.

## 10. Business model (unchanged)

- **Free tier: normal pathways.** Glycolysis, the urea cycle, TCA, and the rest work
  correctly. This is the marketing funnel and the hook.
- **Paid tier: disease states.** Each world's boss is a real inborn error of metabolism.
  A worker goes missing (the enzyme is deficient) and the player experiences the exact
  pathology. This is the high-yield board content genetics candidates need.

Boss table for the built worlds:

| World | Boss (IEM) | Board hook |
|---|---|---|
| Glycolysis | Pyruvate kinase deficiency | hemolytic anemia; RBCs depend on glycolytic ATP |
| Urea cycle | OTC deficiency | most common urea cycle disorder; only X-linked one; elevated orotic acid |

## 11. Scope of this build (the vertical slice)

This build delivers a cohesive, playable slice that proves the whole vision:

- The rebuilt engine and art kit.
- This design document.
- Three worlds: **The Atrium** (hub), **Glycolysis**, and **The Urea Cycle**, all sharing
  one economy, one guide, one art language, and portal-as-lesson transitions.
- The architecture is data-driven so the remaining worlds are content, not engineering.

Not in this build: TCA, ETC, fatty-acid oxidation, and the paid disease modules are
stubbed as "coming soon" portals. The pathway runner is designed to accept them as data.

## 12. Architecture summary

```
src/
  main.js                 boot: init systems, register worlds, load hub
  core/
    engine.js             game loop, system orchestration, collision
    renderer.js           three.js scene, camera, lights, sky, fog, resize
    input.js              keyboard, mouse, touch
    player.js             third-person character + camera follow + terrain follow
    router.js             world registry + portal-as-lesson transitions
    interaction.js        proximity, highlight, E-to-interact, station callbacks
    economy.js            shared currency + molecule inventory (the cohesion layer)
    pathway.js            declarative pathway runner (the reuse win)
    hud.js                HUD: gauges, objective, pathway diagram, carried molecule
    dialogue.js           1-to-2-line dialogue + Reality Check quizzes
    save.js               localStorage persistence
    audio.js              lightweight WebAudio synth
  art/
    palette.js            shared palette + design tokens
    materials.js          shared material presets (flat / toon)
    props.js              reusable prop factory (floor, crystals, pipes, foliage, signs)
    character.js          low-poly enzyme character builder (encodes mnemonics)
    molecule.js           molecule model builder (spheres + sticks, element colors)
  worlds/
    hub.world.js          The Atrium
    glycolysis.world.js   Furnace Row entry
    ureaCycle.world.js    The Nitrogen Works
  data/
    pathways/             declarative pathway definitions (steps, enzymes, disease)
```

The world modules are thin: they build terrain and set a layout, then hand a pathway
definition to the runner. The biochemistry lives in `data/pathways/*.js`, so a
biochemist can audit a pathway without reading engine code.

## 13. Biochemistry the built worlds must teach

Faithful to board content. Full detail (cofactors, diseases, discriminators) lives in
`data/pathways/*.js` and `world-bible.md`. Summary:

**Glycolysis** (cytosol). Net per glucose: 2 ATP, 2 NADH, 2 pyruvate. Invest 2 ATP
(hexokinase at carbon 6; PFK-1 at carbon 1 — the rate-limiting, committed step), split
at aldolase, then earn 4 ATP and 2 NADH on the payoff half. Boss: pyruvate kinase
deficiency (hemolytic anemia).

**Urea cycle** (liver; first two steps mitochondrial, rest cytosolic). Disposes of
neurotoxic ammonia as urea. NAGS makes NAG, the obligate activator of CPS1 (rate-limiting,
2 ATP, first nitrogen from free ammonia); OTC makes citrulline; citrulline crosses to the
cytosol via ORNT1; ASS adds the second nitrogen from aspartate (1 ATP to AMP);
ASL splits off arginine and fumarate (the link to the TCA cycle); arginase 1 releases urea
and regenerates ornithine. Boss: OTC deficiency (X-linked, most common, elevated orotic
acid — the discriminator from CPS1 deficiency).

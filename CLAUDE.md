# CLAUDE.md

## Project Overview

**Metabolon** is a 3D browser game (Three.js) that teaches metabolic biochemistry through interactive, Zelda-like gameplay. Each metabolic pathway is a game world. The TCA Cycle is the central hub connecting all worlds. Built by StudyRare for genetics board prep (ABMGG/ABGC).

**Core philosophy:** Show, don't tell. The player physically carries molecules, uses machines, and does construction work (attaching phosphates, squeezing rings, pulling molecules apart). Minimize dialogue walls. Visuals and mechanics teach the biochemistry.

## Development Setup

```bash
npm run dev     # Vite dev server at localhost:5173 (hot reload)
npm run build   # Production build to dist/
npm run preview # Preview production build
```

**Quick-travel:** Press `T` in-game to cycle between worlds (TCA → Urea Cycle → Glycolysis).

## Architecture

### Multi-World System

The game uses a **module-per-world** architecture. Each world is a JS module exporting `{ config, init, update, cleanup }`.

```
main.js                    # World-agnostic game loop, input, rendering
js/sceneManager.js         # World registration, transitions (fade effect), current world tracking
js/worlds/
  ureaCycleWorld.js        # DONE - Wraps the original urea cycle game
  tcaCycleWorld.js         # DONE - Central hub with 9 enzyme NPCs in circular plaza
  glycolysisWorld.js       # DONE - Linear gauntlet with hill terrain, machines, mini-games
```

### World Module Interface

Every world module must export:
- `config` -- `{ id, name, skyColor, fogColor, bounds, spawnPoint, ... }`
- `init(scene)` -- Build all 3D objects, NPCs, register interactiveObjects
- `update(delta, elapsedTime)` -- Per-frame logic (terrain following, animations, quest UI)
- `cleanup(scene)` -- Remove all objects, clear from interactiveObjects array

### Key Shared Systems

| File | Purpose |
|------|---------|
| `js/gameState.js` | Global state: inventory, health, abilities, unlockedWorlds, worldProgress, per-world quest state |
| `js/interactionManager.js` | Proximity detection, highlighting, E-key interaction. **New worlds use `userData.onInteract` callbacks** -- no need to modify this file |
| `js/worldManager.js` | Shared utilities: `createResource()`, `createWall()`, `interactiveObjects[]`, `originalMaterials` map, `cleanupWorld()` |
| `js/playerManager.js` | Player mesh (tagged `userData.isPlayer`), movement, camera modes |
| `js/sceneSetup.js` | Scene, camera, lights, clouds (tagged `userData.persistent` to survive world transitions) |
| `js/persistenceManager.js` | Save/load to localStorage, includes multi-world state |
| `js/uiManager.js` | Dialogue boxes, feedback messages, health bar, inventory display |

### Adding a New World

1. Create `js/worlds/myWorld.js` exporting `config`, `init`, `update`, `cleanup`
2. In `init`: build terrain, create stations/NPCs, push to `interactiveObjects`, set `originalMaterials`
3. Each interactive object needs `userData: { name, type, isInteractable: true, onInteract: (obj, scene, tools) => {...} }`
4. The `tools` parameter provides: `{ showDialogue, showFeedback, setGameInteracting, addToInventory, createResource, playMoleculeGenerationSound, createGameBoySound, ... }`
5. Register in `main.js`: `import * as myWorld from './js/worlds/myWorld.js'; registerWorld('my-world', myWorld);`
6. Add portal from TCA hub (or another world) to your new world

### Portal Placement Convention

Portals between worlds should be placed at **biologically accurate connection points**:
- Urea Cycle portal is near **Alpha (alpha-KG DH)** in TCA because alpha-KG connects to glutamate → ammonium → urea cycle
- Glycolysis portal is **north** in TCA because pyruvate flows into TCA via Percy (PDH)
- Future: FA oxidation portal should be near **Sid (citrate synthase)** since FA oxidation produces acetyl-CoA

### Cleanup Rules

- Objects tagged `userData.persistent` survive world transitions (sceneSetup objects)
- Objects tagged `userData.isPlayer` survive transitions (the player)
- Scene-level lights without `userData.worldSpecific` survive transitions
- Everything else gets removed by `cleanupWorld()`
- Each world's `cleanup()` should also remove its objects from `interactiveObjects[]`

## Current World Status

### TCA Central Crossroads (HUB) -- DONE
- Circular plaza with 8 TCA enzyme NPCs + Percy (PDH) as gatekeeper
- Full quest: collect Acetyl-CoA → visit each enzyme → produce 3 NADH + 1 FADH2 + 1 GTP
- Compass markers (N/S/E/W) on ground for orientation
- Portals: N → Glycolysis, S → Urea Cycle (via alpha-KG/glutamate)
- Unlocks: "Energy Mastery" ability

### Glycolysis Gauntlet -- DONE
- Linear pathway with **hill terrain**: uphill during investment phase, peak at the split, downhill during payoff
- Investment phase (machines): Hexy's Workbench, Izzy's Vise, Phil (NPC gatekeeper), Al's Splitting Rack
- Payoff phase (machines): Electron Extractor, Phosphate Popper, The Shifter, The Wringer, Pike's Launcher
- **Glucose molecule follows the player** as a companion, physically transforms at each step
- **Mini-games**: Phosphate timing (press E when target carbon faces you), precision pull (hold E, release in green zone)
- PPP side path (locked portal between Hexy and Izzy)
- C1/C6 carbon labels on the molecule
- Unlocks: "Glucose Handling" ability

### Urea Cycle -- DONE (original game)
- 32-step quest across Mitochondria + Cytosol zones
- 10 enzyme NPCs, river/bridge mechanics, ammonia toxicity
- Portal to TCA in eastern cytosol

## Design Principles

### Narrative First
Each world tells a **story**, not a textbook. Example: Glycolysis is "break open a stubborn glucose ring using sticks of dynamite (phosphates)." The enzymes are characters in that story or machines you operate.

### Show, Don't Tell
- Player carries molecules (glucose ring floats beside you)
- Molecules physically transform (hexagon → pentagon → split into triangles)
- Terrain reflects energy: uphill = spending energy, downhill = earning energy
- Mini-games for key reactions (timing, precision)
- Short feedback messages (1-2 sentences), not dialogue walls

### Player as Agent
The player DOES things. They're not reading about reactions -- they're strapping dynamite, squeezing rings, pulling molecules apart, extracting electrons. Enzymes are workstations the player operates, not lecturers.

### Station Types
Not everything is a humanoid NPC. Use a mix:
- **Machines/workbenches** for mechanical reactions (phosphorylation, splitting, extraction)
- **NPCs** for regulatory/gatekeeper enzymes (PFK-1, Pyruvate Kinase) and educational context
- **Environmental features** for passive reactions

### Biologically Accurate Connections
Portal placement and world adjacency should reflect real metabolic connections, not arbitrary game design. Students learn pathway connections through physical geography.

### RSC-Style Dialogue
Keep NPC dialogue to 1-2 lines per screen. Use `greetingChain` arrays in JSON for multi-line conversations -- player clicks "..." to advance, one short line at a time. No walls of text.

### Character Mnemonics
NPCs should be visual mnemonics, not just named characters. Example: Percy the Dehydrated Pirate has 4 fingers (B1, B2, B3, B5) + L-shaped prosthetic (Lipoic acid) where the ring finger (B4) was. The missing finger IS the teaching point. Design characters so their appearance encodes the biochemistry.

## Overarching Spatial Metaphor: The Living Metropolis

**The entire game is a single cell rendered as a horizontal city.** Each pathway is a district with its own aesthetic. Cell-as-city is the metaphor every cell biology textbook already uses ("the cell is a factory") taken literally and walkable.

**Macro is horizontal** (walkable city, third-person camera, matches the existing engine and the Stanford subway-map orientation).

**Micro is vertical at compartment boundaries**: descend into mitochondria, ascend into ER, nucleus is sealed off at street level. Membrane transport teaches itself — passive transport = stairs (free), active transport = elevators (cost ATP at the turnstile). Membrane disorders become "the elevator's broken" puzzles.

### Districts (one per subway-map region)

| Region | District | Theme | Worlds |
|---|---|---|---|
| Carbohydrates | **Demolition Yard** | Wrecking-crew streets, dockside | Glycolysis, Glycogen, PPP |
| Oxidative metabolism | **Mitochondrial Waterfront** | Harbor with Percy's freighter docked | TCA (ship's deck), ETC (engine room below deck), FA-ox (cargo hold) |
| Lipids | **Warehouse Row** | Cargo holds and rendering vats | FA synthesis, ketone bodies, cholesterol, steroids |
| Amino acids | **Tenement Quarter** | Crowded quarter, sea-chest shops | BCAA, aromatic AA, urea cycle, single-carbon |
| Nucleotides | **Archive District** | Library + copy shops | Purine/pyrimidine synthesis, salvage, breakdown |
| Heme | **Ironworks** | Forge district | Heme synthesis + degradation |

### What survives from the pirate-ship era

The pirate ship is not abandoned — it becomes the **Mitochondrial Waterfront** district, with Percy's freighter physically docked at the harbor. Percy is still captain, still has the four-fingers-plus-L-prosthetic mnemonic, still guards the gangplank as the irreversible PDH entry point. The TCA hub is still the ship's main deck. The "ship = mitochondrion" metaphor still holds *for that district*. It just isn't the global metaphor for the game anymore — other districts can have radically different aesthetics (ironworks, archive, tenement) without breaking cohesion.

### Cohesion mechanisms

1. **Regional theme sets** — every world inherits its district's floor, palette, props.
2. **One recurring NPC** — the Ship's Navigator (lives on the TCA waterfront, appears as a holographic parrot in every other world) carries continuity across 25 worlds.
3. **Mutagen as the through-line** — corruption spreading district by district. Free-tier worlds = pathway works. Paid-tier disease modules = "this district has gone dark."
4. **One running joke per region** — carbohydrate worlds bicker like a construction crew, lipid worlds gossip like a ship crew, amino-acid worlds have tenement drama. The gag IS the mnemonic.

### Portal-as-lesson

Every inter-world transit is a 1-2s animated reaction, not a loading screen. The substrate visibly transforms into the product with a one-line caption naming the enzyme. See `data/dsl/atlas.yaml` `adjacencies[].transit` for the data; `js/portalTransit.js` for the runtime. Cumulatively over 25 worlds, the player learns the entire connection table by feel.

### Visual fidelity bar

**Low-poly stylized 3D** (think *A Short Hike*, *Animal Crossing*, *Crossy Road*). A few primitive shapes per object, color does the heavy lifting, geometric humanoids. Lets one author ship a new district per week instead of per month. Keeps the spatial-immersion advantage of 3D without the AAA art budget.

## Roadmap: Worlds to Build

### Priority 1 (Next -- nautical retheme + new worlds)
| World | Key Concept | Connection | Mechanic Ideas |
|-------|-------------|------------|----------------|
| **TCA Nautical Retheme** | Pirate ship deck | Already built, needs visual overhaul | Wooden deck floor, ship railings, rope, lanterns, gangplank from glycolysis |
| **ETC / Oxidative Phosphorylation** | Electron transport, ATP synthase | TCA produces NADH/FADH2 that feed ETC | The engine room below deck. Assembly line. Electrons flow through Complexes I-IV. ATP Synthase as a turbine. |
| **Fatty Acid Oxidation** | Beta-oxidation spiral | Produces acetyl-CoA for TCA | Cargo hold of the ship. Repeating spiral mechanic -- chop 2 carbons off each cycle. Carnitine shuttle gate. MCAD Deficiency boss. |

### Priority 2
| World | Key Concept | Connection |
|-------|-------------|------------|
| **Pentose Phosphate Pathway** | NADPH + ribose-5-P | Branches from glucose-6-P (after Hexy in glycolysis) |
| **Glycogen Metabolism** | Storage/release | Connects to glucose in glycolysis |
| **Amino Acid Catabolism (BCAA)** | Maple Syrup Urine Disease | Feeds into TCA via succinyl-CoA |
| **Aromatic AA Metabolism** | PKU, tyrosinemia | Connects via fumarate/acetoacetate |

### Priority 3 (Organelle Dungeons)
| World | Key Concept | Mechanic |
|-------|-------------|----------|
| **Lysosome Vaults** | Storage disorders (Gaucher, Fabry, Pompe) | Waste accumulation puzzle |
| **Peroxisome Workshop** | Zellweger, X-ALD | VLCFA processing |
| **ER/Golgi Factory** | CDG, protein folding | Assembly line / glycosylation |

### Story Arc: "The Dysregulation"
- Villain: **Mutagen** -- spreading enzyme dysfunction across the Metabolic Kingdom
- Each world boss = a real **Inborn Error of Metabolism** (IEM)
- Defeating a boss = understanding the broken pathway well enough to answer board-level questions
- Abilities unlock access to subsequent worlds (Zelda-like gating)

## Business Context

- **StudyRare** (studyrare.com) -- genetics board prep platform
- **Target audience**: ABMGG/ABGC board exam candidates
- **Value prop**: "Here's the flat PDF metabolic map. Now walk through it in 3D."

### Revenue Model: Normal Pathways Free, Disease States Behind Paywall

**Free tier** -- Normal metabolic pathways (glycolysis, TCA, urea cycle, FA oxidation, etc.). Anyone can learn how metabolism works. This is the marketing funnel and the hook.

**Paid tier** -- Disease states / Inborn Errors of Metabolism (IEMs). Each world boss is a real genetic disease (OTC deficiency, MCAD deficiency, PKU, MSUD, etc.). Understanding what goes wrong when an enzyme is broken is the high-yield board prep content. This is what genetics board candidates specifically need.

This split is natural because:
1. Normal pathways are general biochemistry (broad audience, good for marketing)
2. Disease states are specialized genetics knowledge (narrow audience willing to pay)
3. Students get hooked on the free gameplay, then need the disease content for board prep
4. Institutional buyers (medical schools, GC programs) want the disease modules specifically

**Other revenue streams:**
- Institutional licensing (professor dashboards, cohort progress tracking)
- Conference demos at ACMG/NSGC
- Integration with qbank.studyrare.com (after completing a world, practice board-style questions)

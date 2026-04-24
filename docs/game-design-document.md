# Metabolon: Game Design Document

**Version:** 1.0
**Date:** April 4, 2026
**Studio:** StudyRare
**Platform:** Web browser (Three.js)
**Genre:** 3D educational adventure (Zelda-like)

---

## 1. Elevator Pitch

> "Here's the flat PDF metabolic map. Now walk through it in 3D."

Metabolon is a 3D browser game where every metabolic pathway from the Stanford "Pathways of Human Metabolism" map becomes a walkable game world. Players physically carry molecules, operate enzyme machines, and navigate biologically accurate geography to learn biochemistry. Target audience: genetics board candidates (ABMGG/ABGC). No competitor has anything like it.

---

## 2. Vision & Core Pillars

### 2.1 The Vision

A Zelda-like metabolic adventure where the cell is a living kingdom. Each metabolic pathway is a world. Each enzyme is a character or machine. Each reaction is something the player *does*, not reads about. Completing a world means you understand that pathway well enough to answer board-level questions.

### 2.2 Design Pillars

| Pillar | What It Means | What It Rejects |
|--------|--------------|-----------------|
| **Show, Don't Tell** | Player carries molecules, physically transforms them, operates machines. Terrain encodes energy (uphill = costs ATP, downhill = earns ATP). | Dialogue walls. Lectures. Text-heavy explanations. |
| **Player as Agent** | The player straps dynamite (phosphates), squeezes rings, pulls molecules apart, extracts electrons. Enzymes are workstations, not lecturers. | Passive observation. Cutscenes. "Watch the animation." |
| **Spatial = Biological** | Portal placement and world adjacency reflect real metabolic connections. Students learn pathway connections through physical geography. | Arbitrary level design. Teleporters with no biological basis. |
| **Character = Mnemonic** | Every NPC's name, appearance, and personality is a memory aid. Percy's missing ring finger *is* the teaching point about B4. | Generic NPCs. Characters whose design is decorative, not educational. |
| **Board-Relevant** | Every world teaches high-yield content for ABMGG/ABGC exams. Every quiz question is board-caliber. | Trivia. Deep enzymology that isn't tested. |

---

## 3. The Pirate Ship Metaphor

The entire game maps to a single continuous spatial metaphor:

```
                    THE SHORE (Cytosol)
                    ==================
    Glycolysis demolition yard -- glucose broken down here
    Amino acid docks -- protein catabolism
    Cytosolic portion of urea cycle
                         |
                    THE GANGPLANK
                   (Mitochondrial membrane transport)
                   Percy guards it. Irreversible entry.
                   "I only sail in one direction."
                         |
              PERCY'S SHIP (Mitochondria)
              ============================
    MAIN DECK = TCA Cycle (the central hub)
        Circular plaza, 9 enzyme crew members
        All pathways converge here

    BELOW DECK = Electron Transport Chain
        The engine room. Complexes I-IV.
        ATP Synthase turbine.

    CARGO HOLD = Fatty Acid Oxidation
        Beta-oxidation spiral. Chop 2 carbons per cycle.
        Carnitine shuttle gate.
```

**Why this works:** Students build one continuous mental map instead of disconnected "rooms." Shore --> dock --> deck --> below deck --> engine room. Every location has meaning tied to cell biology. The metaphor makes compartmentalization intuitive.

**The Urea Cycle** straddles ship and shore (mitochondrial + cytosolic steps), which is already modeled by the existing river/bridge mechanic.

---

## 4. Target Audience

| Segment | Who | What They Need |
|---------|-----|----------------|
| **Primary** | ABMGG board candidates (clinical molecular geneticists, lab geneticists) | High-yield biochemistry for board prep. IEM disease recognition. Pathway connections. |
| **Secondary** | ABGC board candidates (genetic counselors) | Metabolic pathway fundamentals. Disease mechanism understanding. |
| **Tertiary** | Medical students, biochemistry students | Engaging way to learn metabolism beyond flashcards. |
| **Institutional** | Genetics training programs, medical schools | Cohort tracking. Supplemental curriculum tool. |

---

## 5. World Map & Progression

### 5.1 Geography

The TCA Cycle is the central hub (Hyrule Castle Town). All other worlds connect to it through biologically accurate portals.

```
                         NORTH (Shore)
    [Cholesterol    [Glycogen     [Pentose PPP   [Aromatic AA    [Purine
     Citadel]        Village]      Hub]            Forest]         Peaks]

    [Steroid        [Glycolysis   [FA Synthesis   [Sulfur AA      [Pyrimidine
     Sanctum]        Gauntlet]     Foundry]        Caverns]        Plains]

    [Organic Acid =[===== TCA CYCLE: PERCY'S SHIP =====]= [UREA CYCLE
     Pass]          [        (the central hub)          ]   WORLD]

    [Ketone        [FA Oxidation  [ETC Engine     [BCAA           [Nucleotide
     Caverns]       Tunnels]       Room]           Mines]          Catacombs]

    [Heme          [Heme Degrad.  [Ammonia        [Lysosome       [Salvage
     Forge]         Ruins]         Swamp]          Vaults]         Shores]
                         SOUTH

    DUNGEONS (accessible from multiple worlds):
    [Lysosome Vaults]  [Peroxisome Workshop]  [ER/Golgi Factory]  [Mito Sanctum]
```

### 5.2 Portal Connections (Biologically Accurate)

| From | Portal Location | To | Biological Basis |
|------|----------------|-----|------------------|
| TCA (deck) | North -- gangplank | Glycolysis (shore) | Pyruvate enters mitochondria via PDH |
| TCA (deck) | South -- near Alpha | Urea Cycle | Alpha-KG --> glutamate --> ammonium --> urea cycle |
| TCA (deck) | East -- near Sid | FA Oxidation (planned) | FA oxidation produces acetyl-CoA for Sid |
| TCA (deck) | Below deck hatch | ETC Engine Room (planned) | NADH/FADH2 from TCA feed ETC |
| Glycolysis | Side path (after Hexy) | Pentose Phosphate (planned) | G6P branches to PPP |
| Glycolysis | End (after Pike) | TCA (via PDH/gangplank) | Pyruvate --> acetyl-CoA |
| Urea Cycle | Fuma's station | TCA (via fumarate) | ASL produces fumarate --> enters TCA |

### 5.3 Progression (Zelda-like Gating)

Each completed world grants an **ability** that unlocks access to subsequent worlds:

| Order | World | Ability Unlocked | Gates |
|-------|-------|-----------------|-------|
| 1 | **Urea Cycle** | Nitrogen Mastery | Survive toxic nitrogen in amino acid worlds |
| 2 | **TCA Cycle** | Energy Mastery | Power energy-requiring reactions, unlock glycolysis |
| 3 | **Glycolysis** | Glucose Handling | Process carbohydrates in glycogen/galactose worlds |
| 4 | **FA Oxidation** | Lipid Processing | Cross lipid membrane barriers |
| 5 | **Amino Acid worlds** | AA Mastery | Build proteins for nucleotide enzymes |
| 6 | **ETC** | Electron Flow | Power complex machinery in advanced worlds |

**Cross-pathway items** serve as biological keys: Acetyl-CoA from FA oxidation enters TCA. Fumarate from Urea Cycle enters TCA. Glutamine from AA world enters purine synthesis.

---

## 6. Core Mechanics

### 6.1 Movement & Camera

- **WASD** movement, mouse look (pointer lock)
- **Space** to jump (45 units/s^2 gravity, used for terrain traversal)
- **Per-world terrain functions** -- each world registers a height function; player snaps to terrain when grounded
- **Third-person camera** follows the player character
- **World bounds** prevent falling off edges

### 6.2 Interaction System

- **Proximity detection** -- interactive objects highlight when player is within range (distance^2 < 16)
- **E key** to interact
- **Object types:**
  - **NPCs** -- trigger dialogue (RSC-style: 1-2 lines per screen, "..." to advance)
  - **Machines/Workstations** -- trigger mini-games or crafting
  - **Resources** -- auto-collected on proximity (distance < 2)
  - **Portals** -- dialogue confirmation then world transition
- **`userData.onInteract` callback pattern** -- each world defines its own interaction logic without modifying shared code

### 6.3 Inventory & Resources

- **Inventory** is a simple `{ itemName: quantity }` map
- **Resources** are 3D objects in the world (colored spheres/shapes that hover and rotate)
- **Molecule companion** (glycolysis) -- glucose ring follows the player, physically transforms at each enzyme step
- **Cross-world items** -- items persist across world transitions via gameState

### 6.4 Quest System

Each world has its own quest state machine:

```
NOT_STARTED --> STEP_1 --> STEP_2 --> ... --> CYCLE_COMPLETE --> COMPLETED
```

- **Quest UI panel** shows current objective and progress bar
- **Quest advances** by: talking to the right NPC with the right items, collecting resources, completing mini-games
- **Final quiz** at world end -- board-caliber multiple choice questions
- **Reward** -- ability unlock + world progress saved

### 6.5 Mini-Games

Two mini-game types currently implemented (extensible via `MiniGame` base class):

| Mini-Game | Mechanic | Used For | Key Parameters |
|-----------|----------|----------|----------------|
| **Phosphate Timing** | Molecule spins; press E when target carbon faces you | Phosphorylation reactions (Hexy, Phil) | Tolerance: ~32 degrees |
| **Precision Pull** | Hold E to build tension bar; release in green zone (60-80%) | Bond breaking (Aldolase splitting) | Overshoot = snap back, under = not enough force |

**Planned mini-games:**
- **Electron Relay** (ETC) -- pass electrons through a chain, timing-based
- **Spiral Chopper** (FA Oxidation) -- repeating 4-step spiral, each round chops 2 carbons
- **Accumulation Puzzle** (Lysosome) -- clear waste before it overflows

### 6.6 Health & Hazards

- **Health:** 0-100, displayed as colored bar (green > 60, orange 30-60, red < 30)
- **Ammonia toxicity** (Urea Cycle) -- collecting ammonia damages health; teaches why ammonia disposal matters
- **Health regen** -- slow passive healing in safe zones (2 HP/sec in TCA)
- **Death** -- triggers respawn with a teaching moment ("Your cells couldn't handle the toxicity...")

### 6.7 Station Types

Not everything is a humanoid NPC. The mix keeps worlds visually varied and mechanically interesting:

| Type | When to Use | Examples |
|------|-------------|---------|
| **Humanoid NPC** | Regulatory/gatekeeper enzymes, educational context, personality-driven interactions | Percy (PDH), Phil (PFK-1), Pike (PK) |
| **Machine/Workbench** | Mechanical reactions (phosphorylation, splitting, extraction) | Hexy's Workbench, Al's Splitting Rack, Electron Extractor |
| **Environmental Feature** | Passive reactions, transport, environmental storytelling | CO2 vents, ORNT1 portal, river (malate-aspartate shuttle) |

---

## 7. Story Arc: "The Dysregulation"

### 7.1 Premise

The Metabolic Kingdom is a living cell. **Mutagen** -- a mysterious force -- is spreading "The Dysregulation," disabling enzymes, blocking pathways, and causing toxic metabolite accumulation. You are a **Metabolic Ranger** trained by **Professor Hepaticus** to restore order.

### 7.2 Structure

Each world has a **boss** that is a real Inborn Error of Metabolism (IEM). Defeating a boss means understanding the broken pathway well enough to answer board-level questions about it.

| World | Boss (IEM) | What Goes Wrong | Board-Relevant Facts |
|-------|-----------|-----------------|---------------------|
| Urea Cycle | OTC Deficiency | Can't make citrulline; ammonia accumulates | X-linked, orotic acid elevated, hyperammonemia |
| TCA Cycle | PDH Deficiency | Can't convert pyruvate to acetyl-CoA; lactic acidosis | Thiamine-responsive subset, ketogenic diet |
| Glycolysis | PK Deficiency | Can't make pyruvate efficiently; hemolytic anemia | Autosomal recessive, RBC-specific consequences |
| FA Oxidation | MCAD Deficiency | Can't oxidize medium-chain FAs; hypoketotic hypoglycemia | Most common FAO disorder, newborn screening |
| Amino Acid | PKU | Can't convert Phe to Tyr; intellectual disability | Newborn screening, dietary Phe restriction |
| Amino Acid | MSUD | Can't degrade BCAAs; encephalopathy | Sweet-smelling urine, leucine most toxic |
| Organic Acid | Propionic Acidemia | Can't convert propionyl-CoA; organic acid accumulation | Avoid isoleucine, valine, methionine, threonine |
| Lysosome | Gaucher Disease | Can't degrade glucocerebroside; storage | Most common LSD, ERT available |

### 7.3 Narrative Progression

1. **Act I -- Awakening:** Player learns basic metabolism (Urea Cycle, TCA, Glycolysis). Professor Hepaticus provides training. The Dysregulation is hinted at through NPC dialogue.
2. **Act II -- Investigation:** Player explores deeper pathways (FA Oxidation, Amino Acids). Each world reveals more about Mutagen's plan. Enzyme NPCs report dysfunction.
3. **Act III -- Confrontation:** Player enters organelle dungeons (Lysosome, Peroxisome). Faces the consequences of accumulated damage. Must use cross-pathway knowledge.
4. **Endgame:** Player confronts Mutagen (final exam -- comprehensive board-style quiz across all pathways).

---

## 8. Art Direction

### 8.1 Visual Style

**RuneScape Classic (RSC) aesthetic:**
- Blocky, low-poly characters with box geometry bodies
- Canvas-painted faces (6 expressions: stern, friendly, intense, wise, surprised, smug)
- Two-tone clothing (shirt color + auto-darkened pants)
- Hats and accessories for visual distinction
- No imported textures -- everything is procedurally built from Three.js primitives

**Why RSC:** Charming, distinctive, fast to build, performs well in browser, instantly recognizable aesthetic that signals "game" not "simulation."

### 8.2 World Palettes

Each world has a distinct color mood (like Zelda dungeons):

| World | Palette Mood | Key Colors | Lighting |
|-------|-------------|------------|----------|
| **TCA (Ship)** | Warm nautical night | Wood browns, brass gold, ocean blue-green | Lantern glow + moonlight |
| **Glycolysis (Shore)** | Daytime energy gradient | Green hills, warm sunset, machine metals | Bright sun, uphill/downhill shadow |
| **Urea Cycle** | Split zones | Red/warm (mitochondria), green/cool (cytosol) | Zone-based ambient |
| **ETC (Engine Room)** | Industrial glow | Dark steel, electron blue, chain lightning | Pulsing machine light |
| **FA Oxidation (Cargo Hold)** | Dark, cramped | Ship interior, crate wood, oil lamp amber | Low ceiling, close walls |
| **Lysosome (Vaults)** | Underground decay | Stone gray, toxic green accumulation | Dim, progressively brighter as waste accumulates |

### 8.3 Enzyme Visual Language

Enzyme classification maps to visual treatment:

| Enzyme Class | Visual | Personality |
|-------------|--------|-------------|
| **Kinases** | Yellow glow (ATP energy) | Energetic, bouncy |
| **Lyases** | Jagged silhouette | Dramatic ("I CLEAVE things!") |
| **Dehydrogenases** | Parched/cracked aesthetic | Thirsty, dry humor |
| **Synthases** | Rounded, careful hands | Patient craftsman |
| **Transferases** | Blue-tinted, arms extended | Always passing things around |
| **Isomerases** | Flexible, acrobatic pose | "Just rearranging things!" |

### 8.4 Character Builder System

All NPCs are procedurally generated via `characterBuilder.js`:

**Body types:** stocky, average, tall, large, small, wide
**Head shapes:** round, boxy, tall, flat, pointy
**Hats:** cone, tophat, fedora, helmet, crown, beret, hardhat, pirate (tricorn)
**Accessories:** shield, apron, glasses, cape, belt, medal, eyepatch, wrench
**Presets:** gatekeeper, craftsman, detective, powerhouse, showman, scientist, proud, worker, acrobat, pirate

---

## 9. Audio Design

### 9.1 Current System

All audio is procedurally generated (no audio files):

| Sound | Implementation | When |
|-------|---------------|------|
| **Background music** | 3-oscillator procedural composition (bass, lead, pad) | Always playing, pattern changes per world |
| **GameBoy sounds** | Single oscillator tones at specified frequency | NPC interaction, UI feedback |
| **Molecule generation** | 4-note ascending sequence | Resource created by enzyme |
| **Portal celebration** | 6-note triumphant fanfare | World transition |
| **Error tone** | Low-frequency buzz | Failed mini-game, wrong action |

### 9.2 Planned

- **Per-world music themes** (nautical shanty for TCA, industrial rhythm for ETC)
- **Ocean ambient** for TCA deck (waves, creaking wood)
- **Tension sounds** during mini-games (creaking at thresholds)
- **Boss encounter music** (darker, higher tempo)

---

## 10. UI / HUD

### 10.1 Layout

```
+--[Health Bar]----[Quest Log]---------+------[Minimap]--+
|                                      |                  |
|                                      |                  |
|              3D GAME VIEW            |                  |
|                                      |                  |
|  [Inventory]                         |                  |
|                                      +------------------+
|                                                         |
|            [Interaction Prompt: "E to talk"]             |
|                                                         |
|         [Dialogue Box / Mini-Game Overlay]               |
+---------------------------------------------------------+
                              [Mute] [Help] [Glossary]
```

### 10.2 Panels

| Panel | Location | Content |
|-------|----------|---------|
| **Health Bar** | Top-left | 0-100%, color-coded (green/orange/red) |
| **Quest Log** | Top-left (below health) | Quest name, current objective, progress % |
| **Inventory** | Left side | Item names + quantities |
| **Minimap** | Top-right (toggle: M) | Overhead view of current world |
| **Interaction Prompt** | Bottom-center | "[E] Talk to Percy" / "[E] Collect NADH" |
| **Dialogue Box** | Center | NPC text + response buttons (RSC-style) |
| **Urea Cycle Diagram** | Right side (collapsible) | SVG progress visualization |
| **Help Menu** | Overlay (H key) | Controls reference |
| **Glossary** | Overlay (G key) | Enzyme/molecule definitions |
| **Reality River Quiz** | Full overlay | Question + 4 choices + feedback |

### 10.3 Dialogue Style (RSC Rules)

- **Max 1-2 lines per dialogue screen**
- **`greetingChain` arrays** for multi-line conversations -- player clicks "..." to advance
- **No text walls.** If you need 6 lines, that's 3-6 dialogue screens.
- **Response buttons** are short actions ("Tell me more", "I'm ready!", "Just passing through")
- **Feedback messages** (non-blocking) for quick confirmations ("Collected NADH!", "Visit Sid next.")

---

## 11. Save / Load

### 11.1 Storage

- **localStorage** with key `metabolonSaveGame`
- **Auto-save** on quest state changes
- **Manual save/load** via F5/F9 keys

### 11.2 Data Schema

```json
{
    "version": 1,
    "inventory": { "NADH": 2, "GTP": 1 },
    "currentQuest": { "id": "ureaCycle", "state": "STEP_9_TALK_TO_DONKEY" },
    "playerLocation": "cytosol",
    "hasPortalPermission": true,
    "playerPosition": { "x": 15.2, "y": 0.5, "z": -8.7 },
    "currentWorldId": "urea-cycle",
    "abilities": ["nitrogen-mastery"],
    "unlockedWorlds": ["tca-cycle", "urea-cycle"],
    "worldProgress": { "urea-cycle": { "completed": true } },
    "timestamp": 1712188800000
}
```

### 11.3 Migration

Version field allows schema upgrades. Unknown fields are preserved. Missing fields get defaults.

---

## 12. Business Model

### 12.1 Free vs. Paid

| Tier | Content | Why |
|------|---------|-----|
| **Free** | Normal metabolic pathways (glycolysis, TCA, urea cycle, FA oxidation, etc.) | Marketing funnel. Broad audience. Hook. |
| **Paid** | Disease states / IEM bosses (OTC Def, MCAD Def, PKU, MSUD, etc.) | High-yield board prep. Narrow audience willing to pay. |

**Why this split works:**
1. Normal pathways = general biochemistry (broad audience, good marketing)
2. Disease states = specialized genetics knowledge (board candidates *need* this)
3. Students get hooked on free gameplay, then pay for disease content
4. Institutional buyers (med schools, GC programs) specifically want the disease modules

### 12.2 Revenue Streams

| Stream | Model | Status |
|--------|-------|--------|
| **Individual subscriptions** | Monthly/annual access to disease modules | Planned |
| **Institutional licensing** | Professor dashboards, cohort progress, bulk pricing | Planned |
| **Qbank integration** | "Continue learning at qbank.studyrare.com" post-world | Planned |
| **Conference demos** | ACMG/NSGC booth demos, free marketing | Planned |

### 12.3 Launch Strategy

1. **play.studyrare.com** -- free landing page with the first 3 worlds
2. Social sharing ("I just walked through glycolysis in 3D!")
3. Conference demo at ACMG/NSGC
4. Integration with existing StudyRare qbank for cross-sell

---

## 13. Technical Architecture

### 13.1 Stack

| Layer | Technology |
|-------|-----------|
| **Rendering** | Three.js v0.160.0 |
| **Build** | Vite |
| **Language** | Vanilla JavaScript (ES modules) |
| **Testing** | Vitest (99 tests) |
| **Hosting** | Static (Vercel/Netlify compatible) |
| **State** | Module-scoped state + localStorage persistence |
| **Audio** | Web Audio API (procedural, no audio files) |

### 13.2 Module Architecture

```
main.js                     # World-agnostic game loop, input, rendering
js/sceneManager.js          # World registration, transitions (fade effect)
js/sceneSetup.js            # Scene, camera, lights, clouds (persistent)
js/playerManager.js         # Player mesh, movement, camera
js/gameState.js             # Global state (inventory, abilities, world progress)
js/interactionManager.js    # Proximity detection, E-key, highlighting
js/worldManager.js          # Shared: createResource(), createWall(), terrainFn
js/characterBuilder.js      # Procedural RSC-style character generation
js/uiManager.js             # Dialogue, feedback, HUD panels
js/persistenceManager.js    # Save/load
js/audioManager.js          # Procedural sound effects + music
js/eventBus.js              # Pub/sub (health:change, item:pickup, quest:advance, world:transition)
js/miniGame.js              # Base class for mini-games
js/minigames/*.js           # Specific mini-game implementations
js/worlds/*.js              # One module per world
data/*.json                 # NPC/enzyme data per world
```

### 13.3 World Module Interface

Every world must export:
```js
export const config = { id, name, skyColor, fogColor, bounds, spawnPoint, portals };
export function init(scene) { /* build 3D objects, NPCs, register interactiveObjects */ }
export function update(delta, elapsedTime) { /* per-frame logic */ }
export function cleanup(scene) { /* remove all objects, clear from interactiveObjects */ }
```

### 13.4 Adding a New World

1. Create `js/worlds/myWorld.js` exporting `config`, `init`, `update`, `cleanup`
2. Create `data/my-world.json` with NPC definitions
3. In `init`: build terrain, create stations/NPCs, push to `interactiveObjects`
4. Each interactive object needs `userData: { name, type, isInteractable: true, onInteract: (obj, scene, tools) => {...} }`
5. Register in `main.js`: `import * as myWorld from './js/worlds/myWorld.js'; registerWorld('my-world', myWorld);`
6. Add portal from TCA hub (or adjacent world)

---

## 14. Roadmap

### Phase 1: Foundation (DONE)

- [x] Vite build system
- [x] Multi-world architecture (SceneManager, world module interface)
- [x] Character builder (RSC-style procedural characters)
- [x] Event bus, mini-game framework
- [x] Save/load with multi-world support
- [x] 3 playable worlds (Urea Cycle, TCA Hub, Glycolysis)

### Phase 2: Nautical Retheme + New Worlds (IN PROGRESS)

- [x] TCA nautical retheme (pirate ship deck)
- [ ] ETC / Oxidative Phosphorylation -- the engine room below deck
- [ ] Fatty Acid Oxidation -- the cargo hold
- [ ] Glycolysis-to-TCA transition redesign (walking from shore onto the ship)
- [ ] greetingChain dialogue for all TCA NPCs (currently only Percy has one)
- [ ] World select screen

### Phase 3: Pathway Expansion

- [ ] Pentose Phosphate Pathway (branches from glycolysis)
- [ ] Glycogen Metabolism
- [ ] Amino Acid Catabolism (BCAA -- MSUD)
- [ ] Aromatic AA Metabolism (PKU, Tyrosinemia)
- [ ] Organic Acid Disorders (PA, MMA)

### Phase 4: Organelle Dungeons

- [ ] Lysosome Vaults (storage disorder accumulation puzzle)
- [ ] Peroxisome Workshop (VLCFA processing)
- [ ] ER/Golgi Factory (CDG, glycosylation assembly line)

### Phase 5: Polish & Launch

- [ ] Story framing (The Dysregulation narrative)
- [ ] IEM boss encounters (disease state paywall)
- [ ] Landing page (play.studyrare.com)
- [ ] Qbank integration
- [ ] Share/social features

### Phase 6: Multiplayer (Post-Launch)

- [ ] Async leaderboard (cohort progress)
- [ ] "Metabolic Relay" (one player does glycolysis, passes pyruvate to a friend doing TCA)
- [ ] Institutional dashboards

---

## Appendices

- **[World Design Bible](world-bible.md)** -- Detailed specs for every world (built + planned)
- **[Character Bible](character-bible.md)** -- Every NPC, their mnemonic, visual design, dialogue

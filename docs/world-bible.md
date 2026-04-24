# Metabolon: World Design Bible

Every world in Metabolon follows the same structural template, then adds unique mechanics, terrain, and NPCs. This document specifies each world in detail.

---

## World Template

Every world must define:

| Element | Description |
|---------|------------|
| **ID** | Unique string (e.g., `tca-cycle`, `glycolysis`) |
| **Name** | Display name shown in UI |
| **Spatial Metaphor** | Where is this in the pirate ship metaphor? |
| **Terrain** | Ground type, elevation profile, visual style |
| **NPCs / Stations** | Enzyme characters and/or machines (with positions, dialogue, quest roles) |
| **Quest Flow** | State machine: ordered steps from NOT_STARTED to COMPLETED |
| **Molecules** | What items the player carries, collects, transforms |
| **Mini-Games** | Interactive mechanics for key reactions (if any) |
| **Connections** | Portals to adjacent worlds (with biological basis) |
| **Quiz** | End-of-world board-caliber questions |
| **Reward** | Ability unlocked on completion |
| **Color Palette** | Distinct mood (sky, fog, terrain, lighting) |

---

## BUILT WORLDS

---

### 1. Percy's Ship -- TCA Cycle (Hub World)

**Status:** DONE (nautical retheme complete)
**ID:** `tca-cycle`
**Spatial Metaphor:** The main deck of the pirate ship (mitochondrial matrix)

#### Layout

Circular ship deck (radius ~50 units) surrounded by ocean. Central mast with crow's nest. 9 enzyme NPCs arranged in a ring (radius 28) around the mast. Ship railing around perimeter. Wooden plank floor with per-plank color variation.

```
                     N (Gangplank to Shore)
                         |
                    [Percy - PDH]
                   /              \
          [Sid - CS]              [Mal - MDH]
         /                              \
    [Aco - ACO]      MAST        [Fuma - FUM]
         \          (center)          /
          [Ike - IDH]            [Sadie - SDH]
                   \              /
                    [Alpha - aKGDH]
                         |
                    [Suki - SCS]
                         |
                     S (Urea Cycle Portal)
```

#### NPCs (9 Enzyme Crew Members)

| Name | Enzyme | Angle | Preset | Role in Quest |
|------|--------|-------|--------|---------------|
| Percy | Pyruvate Dehydrogenase | 90deg (N) | pirate | Captain. Quest giver. Rewards at end. |
| Sid | Citrate Synthase | 45deg | craftsman | Combines Acetyl-CoA + OAA --> Citrate |
| Aco | Aconitase | 0deg | acrobat | Isomerizes Citrate --> Isocitrate |
| Ike | Isocitrate DH | -45deg | detective | Oxidative decarb: 1st NADH + CO2 |
| Alpha | Alpha-KG DH | -90deg | powerhouse | Oxidative decarb: 2nd NADH + CO2 |
| Suki | Succinyl-CoA Synthetase | -135deg | proud | Substrate-level phosphorylation: GTP |
| Sadie | Succinate DH | 180deg | worker | Produces FADH2. She IS Complex II. |
| Fuma | Fumarase | 135deg | scientist | Hydrates fumarate --> malate. Bridge to urea cycle. |
| Mal | Malate DH | ~112deg | showman | Last step: 3rd NADH + regenerates OAA |

#### Quest Flow (18 states)

```
NOT_STARTED
  --> MEET_PERCY (talk to Percy, learn about TCA)
  --> COLLECT_ACETYL_COA (pick up Acetyl-CoA + OAA near entrance)
  --> VISIT_SID (combine: Acetyl-CoA + OAA --> Citrate)
  --> COLLECT_CITRATE
  --> VISIT_ACO (isomerize: Citrate --> Isocitrate)
  --> VISIT_IKE (oxidative decarb: Isocitrate --> Alpha-KG + NADH + CO2)
  --> COLLECT_FIRST_NADH
  --> VISIT_ALPHA (oxidative decarb: Alpha-KG --> Succinyl-CoA + NADH + CO2)
  --> COLLECT_SECOND_NADH
  --> VISIT_SUKI (substrate-level phosph: Succinyl-CoA --> Succinate + GTP)
  --> COLLECT_GTP
  --> VISIT_SADIE (FAD reduction: Succinate --> Fumarate + FADH2)
  --> COLLECT_FADH2
  --> VISIT_FUMA (hydration: Fumarate --> Malate)
  --> VISIT_MAL (oxidation: Malate --> OAA + NADH)
  --> COLLECT_THIRD_NADH (+ OAA regenerated)
  --> CYCLE_COMPLETE (return to Percy)
  --> COMPLETED (Energy Mastery unlocked)
```

**Products per turn:** 3 NADH (~7.5 ATP), 1 FADH2 (~1.5 ATP), 1 GTP (~1 ATP) = ~10 ATP equivalent

#### Portals

| Direction | Destination | Visual | Biological Basis |
|-----------|------------|--------|-----------------|
| North | Glycolysis (shore) | Gangplank with rope railings | Pyruvate enters mito via PDH |
| South | Urea Cycle | Green portal ring + wooden walkway | Alpha-KG --> glutamate --> urea cycle |
| East (planned) | FA Oxidation (cargo hold) | Hatch in deck | FA oxidation produces acetyl-CoA |
| Below (planned) | ETC (engine room) | Stairway down through deck | NADH/FADH2 feed the ETC |

#### Visual Details

- **Floor:** Individual wooden planks (3 wood tones, per-plank variation)
- **Ship hull:** Ring of dark brown hull planks around deck edge
- **Ocean:** Animated wave mesh, deep layer beneath
- **Mast:** Tall wooden pole with crow's nest, yard arm, hanging lantern
- **Compass rose:** Brass-inlaid deck marking at center
- **Railings:** 32 posts with brass caps, two horizontal rails
- **Decorations:** Rope coils (4), barrels with brass hoops (5), lantern posts at cardinal points
- **Particles:** Warm gold sparks (lantern embers)
- **Sky:** Dark ocean night (0x0a1628)
- **Lighting:** Warm lantern glow + cool moonlight

#### Reward

**Energy Mastery** -- unlocks Glycolysis world

---

### 2. Glycolysis Gauntlet

**Status:** DONE
**ID:** `glycolysis`
**Spatial Metaphor:** The shore / cytosol demolition yard. Glucose cargo gets broken down on land before loading onto the ship.

#### Layout

Linear pathway running north (z=55) to south (z=-170). Terrain forms a hill:
- **Uphill** (investment phase, z=55 to z=-20): costs 2 ATP = spending energy to climb
- **Peak** (the split, z=-20): glucose breaks in half at the summit
- **Downhill** (payoff phase, z=-20 to z=-170): earns 4 ATP = energy release going downhill

```
START (z=55) -- portal from TCA
  |
  v  UPHILL (Investment Phase -- costs 2 ATP)
  [Hexy's Workbench -- Hexokinase]        z=40
  |  PPP side path branches off here
  [Izzy's Vise -- PGI]                    z=20
  |
  [Phil the Gatekeeper -- PFK-1]           z=0   (rate-limiting NPC)
  |
  v  PEAK (The Split)
  [Al's Splitting Rack -- Aldolase]        z=-20
  |
  [Tim's Mirror -- TPI]                   z=-42
  |
  v  DOWNHILL (Payoff Phase -- earns 4 ATP)
  [Electron Extractor -- GAPDH]            z=-64
  |
  [Phosphate Popper -- PGK]                z=-86
  |
  [The Shifter -- PGM]                    z=-108
  |
  [The Wringer -- Enolase]                z=-130
  |
  [Pike's Launcher -- Pyruvate Kinase]    z=-152  (cannon NPC)
  |
END (z=-170) -- pyruvate exits to TCA
```

#### Stations (10 Enzymes)

| # | Name | Enzyme | Type | Mechanic |
|---|------|--------|------|----------|
| 1 | Hexy's Workbench | Hexokinase | Machine | Phosphate Timing mini-game (attach ATP to C6) |
| 2 | Izzy's Vise | PGI | Machine | Squeeze hexagon ring into pentagon (G6P --> F6P) |
| 3 | Phil the Gatekeeper | PFK-1 | NPC | Phosphate Timing mini-game (2nd ATP to C1). Rate-limiting step. |
| 4 | Al's Splitting Rack | Aldolase | Machine | Precision Pull mini-game (split 6C into two 3C fragments) |
| 5 | Tim's Mirror | TPI | Machine | Mirror device converts DHAP <-> G3P |
| 6 | Electron Extractor | GAPDH | Machine | Extract electrons (produce NADH + add Pi) |
| 7 | Phosphate Popper | PGK | Machine | Pop off phosphate to make ATP (1st ATP payback) |
| 8 | The Shifter | PGM | Machine | Move phosphate from C3 to C2 |
| 9 | The Wringer | Enolase | Machine | Dehydrate to make PEP (high-energy bond) |
| 10 | Pike's Launcher | Pyruvate Kinase | NPC + Cannon | Final phosphate transfer --> pyruvate! 2nd ATP payback. |

#### Molecule Companion System

The glucose molecule follows the player as a floating companion:

| Stage | Visual | Transformation |
|-------|--------|---------------|
| Glucose | Yellow hexagonal ring (6 vertices) with C1/C6 labels | Starting form |
| G6P | Hexagon + red sphere on C6 | Phosphate attached |
| F6P | Pentagonal ring (5 vertices) | Ring squeezed |
| F1,6BP | Pentagon + red spheres on C1 and C6 | Two phosphates |
| Split | Two triangular fragments | Breaks in half at Aldolase |
| G3P x2 | Fragment follows player | Both halves enter payoff |
| Pyruvate | Final 3C molecule | Launched from Pike's cannon |

#### Mini-Games Used

1. **Phosphate Timing** at Hexy (C6 target) and Phil (C1 target)
2. **Precision Pull** at Al's Splitting Rack

#### Portals

| Direction | Destination | Biological Basis |
|-----------|------------|-----------------|
| Start (z=55) | TCA Cycle | Pyruvate flows into TCA |
| Side path (after Hexy) | PPP (locked, planned) | G6P branches to pentose phosphate pathway |
| End (z=-170) | Back to TCA (planned) | Pyruvate --> PDH |

#### Narrative

"The cell is dying. ATP reserves critical. We need to break open this stubborn glucose molecule and extract its energy. Each enzyme station is a tool -- attach dynamite (phosphates), squeeze rings, split molecules, extract electrons. By the end, you'll have turned one glucose into two pyruvates, 2 net ATP, and 2 NADH."

#### Visual Details

- **Terrain:** Hill with PlaneGeometry mesh, gradual slope up then down
- **Machines:** Colored workbench props with labels and glowing accents
- **Side paths:** PPP branch with locked gate (purple glow)
- **Sky:** Open air, daytime feel
- **Lighting:** Bright, directional sun

#### Reward

**Glucose Handling** -- unlocks glycogen/galactose worlds

---

### 3. Urea Cycle World

**Status:** DONE (original game, first world built)
**ID:** `urea-cycle`
**Spatial Metaphor:** Straddles ship and shore. Mitochondrial steps happen on the ship/dock; cytosolic steps happen on the shore. The river between them represents the mitochondrial membrane.

#### Layout

Split into two zones divided by a river:
- **Mitochondria zone** (X < -8): Where CPS1 and OTC work
- **Cytosol zone** (X > 8): Where ASS, ASL, and Arginase work
- **River** (X = -8 to 8): Membrane transport (ORNT1 bridge)

```
MITOCHONDRIA (west)              RIVER              CYTOSOL (east)
                                  |
[Professor Hepaticus]             |        [Donkey - ASS]
[Casper - CPS1]                   |        [Aslan - ASL]
[Nagesh - NAGS]            [ORNT1 Bridge]  [Argus - ARG1]
[Otis - OTC]               [Usher patrol]  [Fumarate Hydratase]
[CO2 vents]                       |        [Malcolm - Shuttle]
[Graveyard]                       |        [River Guardian]
                                  |        [Waste Receptacle]
```

#### NPCs (10 Enzyme Characters)

| Name | Enzyme | Zone | Personality | Key Teaching Point |
|------|--------|------|------------|-------------------|
| Professor Hepaticus | (quest giver) | Mito | Wise mentor, tall, blue robe | Overview + final quiz |
| Casper the Ghost | CPS1 | Mito | Ghost pirate, needs NAG activator | Rate-limiting step, requires NAG (allosteric activator) |
| Nagesh | NAGS | Mito | Coffee brewer (NAG = "Nagesh's Coffee") | Makes NAG from glutamate + acetyl-CoA |
| Otis | OTC | Mito | Sturdy, reliable | Makes citrulline. OTC deficiency = most common UCD. |
| Ornithine Usher | ORNT1 transporter | Bridge | Patrols bridge, grants passage | Mitochondrial membrane transport |
| Donkey | ASS | Cyto | Stubborn donkey pun (ASS = argininosuccinate synthetase) | Combines citrulline + aspartate (2nd nitrogen entry) |
| Aslan | ASL | Cyto | Lion-like, noble (splits things) | Lyase: splits argininosuccinate --> arginine + fumarate |
| Argus | ARG1 | Cyto | Many-eyed guardian (arginase) | Final step: arginine --> ornithine + urea |
| Fumarate Hydratase | Fumarase | Cyto | Fire-hydrant themed | Links to TCA via fumarate --> malate |
| Malcolm | Malate-Aspartate Shuttle | Cyto | Shuttle driver | Transports malate to mito, returns aspartate |

#### Quest Flow (34 states)

Highly detailed 34-step quest covering:
1. Meet Hepaticus, learn premise
2. Collect raw materials (NH3, HCO3-, ATP, water, CO2)
3. Nagesh brews NAG (allosteric activator for CPS1)
4. Casper (CPS1) makes carbamoyl phosphate
5. Otis (OTC) makes citrulline
6. Cross the bridge (ORNT1 transport)
7. Donkey (ASS) makes argininosuccinate
8. Aslan (ASL) splits --> arginine + fumarate
9. Handle fumarate (shuttle to TCA)
10. Argus (ARG1) --> urea + ornithine (cycle complete)
11. Dispose urea in waste receptacle
12. Reality River Quiz (6 board questions)
13. Professor Hepaticus congratulates

#### Final Quiz (Reality River)

6 multiple-choice questions:
1. Where does the urea cycle begin? (Mitochondria)
2. Which enzyme combines NH3 + HCO3- + ATP? (CPS1)
3. Which molecule carries nitrogen across to cytosol? (Citrulline... trick: aspartate carries the 2nd nitrogen)
4. What transports out of mitochondria? (Citrulline)
5. Primary nitrogen input? (Ammonia)
6. Regenerated molecule? (Ornithine)

#### Portals

| Direction | Destination | Biological Basis |
|-----------|------------|-----------------|
| East (cytosol) | TCA Cycle | Alpha-KG / glutamate connection |

#### Visual Details

- **Two distinct zones** with different coloring (warm mito, cool cyto)
- **River** with flowing particles
- **Bridge** with patrolling Usher NPC
- **Graveyard** (where Casper hangs out -- CPS1 is the "ghost" enzyme)
- **Trees, walls, terrain features** per zone

#### Reward

**Nitrogen Mastery** -- survive toxic nitrogen in amino acid worlds

---

## PLANNED WORLDS

---

### 4. ETC / Oxidative Phosphorylation -- The Engine Room

**Status:** PLANNED (Priority 1)
**ID:** `etc-engine-room`
**Spatial Metaphor:** Below deck on Percy's ship. The engine room. Dark, industrial, pulsing with energy.

#### Concept

The player descends a stairway from the TCA deck into the engine room. Four massive machine complexes line the walls (Complexes I-IV), with an electron "conveyor" running between them. At the far end, a massive turbine: ATP Synthase.

#### Layout Sketch

```
ENTRANCE (stairs down from TCA deck)
  |
  v
[Complex I -- NADH Dehydrogenase]
  |  (electron conveyor)
  |  [Ubiquinone shuttle]
  v
[Complex II -- Succinate DH / Sadie's station]
  |  (she works both here and on deck!)
  |  [Ubiquinone shuttle]
  v
[Complex III -- Cytochrome bc1]
  |  [Cytochrome c shuttle]
  v
[Complex IV -- Cytochrome c Oxidase]
  |  (final electron acceptor: O2 --> H2O)
  |
  v
========== PROTON GRADIENT WALL ==========
  |
  v
[ATP SYNTHASE TURBINE]
  (protons flow through, turbine spins, ATP produced)
```

#### Key Mechanics

| Mechanic | Description | Teaching Point |
|----------|-------------|---------------|
| **Electron Relay** | Player carries electrons from NADH/FADH2 along the conveyor. Timing-based: must hand off electrons at each complex. | Electron transport is sequential; energy released at each step. |
| **Proton Pumping** | Each complex pumps protons across the membrane (visible wall). Player sees proton count rise on one side. | Chemiosmotic gradient = stored energy. |
| **ATP Synthase Turbine** | Player operates a turbine mini-game. Protons flow through, turning the rotor. Each rotation = 1 ATP. | Oxidative phosphorylation: ~30-32 ATP per glucose via ETC. |
| **NADH vs FADH2** | NADH enters at Complex I (3 proton pumps). FADH2 enters at Complex II (2 proton pumps). Player experiences the difference. | NADH = ~2.5 ATP, FADH2 = ~1.5 ATP (fewer protons pumped). |
| **Oxygen as final acceptor** | At Complex IV, electrons must be delivered to O2. If no O2, everything stops. | Cyanide poisoning = blocking Complex IV. |

#### NPCs (Planned)

| Name | Enzyme/Complex | Personality | Teaching Point |
|------|---------------|-------------|---------------|
| **Uno** | Complex I (NADH DH) | Massive, industrial foreman | Largest complex, pumps 4 H+, NADH entry |
| **Sadie** (returns) | Complex II (SDH) | "I told you I moonlight here!" | Same enzyme as in TCA, embedded in membrane |
| **Bea** | Complex III (bc1) | Efficient middle manager | Q cycle, pumps 4 H+ |
| **Cy** | Complex IV (Cyt c oxidase) | Final boss energy, dramatic | Reduces O2 to H2O, pumps 2 H+ |
| **Turbo** | ATP Synthase | Spinning, energetic, proud | Rotary motor, 3 ATP per rotation |

#### Boss: Complex I Deficiency

- Most common respiratory chain disorder
- Lactic acidosis, poor growth, neurodegeneration
- Board questions: inheritance (usually mtDNA or nuclear), Leigh syndrome association

#### Visual Details

- **Dark industrial interior** -- metal grating floor, pipes, glowing blue-purple electron streams
- **Low ceiling** -- claustrophobic engine room feel
- **Pulsing lights** at each complex when active
- **Proton gradient** visible as accumulating bright particles on one side of a membrane wall
- **ATP Synthase** as a massive mechanical turbine with spinning F1 head

#### Reward

**Electron Flow** -- powers complex machinery in advanced worlds

---

### 5. Fatty Acid Oxidation -- The Cargo Hold

**Status:** PLANNED (Priority 1)
**ID:** `fa-oxidation`
**Spatial Metaphor:** The cargo hold of Percy's ship. Dark, cramped, filled with crates of fatty acid cargo.

#### Concept

Fatty acids are stored as "cargo" in the hold. The player must process them through beta-oxidation: a repeating 4-step spiral that chops off 2 carbons (as acetyl-CoA) each cycle. The Carnitine Shuttle is the entry gate -- fatty acids can't enter the hold without it.

#### Layout Sketch

```
ENTRANCE (hatch from TCA deck, near Sid)
  |
  v
[CARNITINE SHUTTLE GATE]
  CPT-I on outside, CPT-II on inside
  Player must have carnitine to enter
  |
  v
  +--> BETA-OXIDATION SPIRAL <--+
  |                               |
  [Step 1: FAD-dependent DH]     |
  [Step 2: Hydration]            |
  [Step 3: NAD-dependent DH]     |
  [Step 4: Thiolase -- chop 2C]--+
  |
  Acetyl-CoA exits up to TCA deck
  Shortened FA re-enters spiral
  |
  Repeat until FA is fully consumed
```

#### Key Mechanics

| Mechanic | Description | Teaching Point |
|----------|-------------|---------------|
| **Carnitine Shuttle** | Must acquire carnitine to pass through CPT-I gate. Malonyl-CoA blocks entry (fed state). | CPT-I is the rate-limiting step; inhibited by malonyl-CoA (fed state signal) |
| **Spiral Chopper** | Repeating 4-step mini-game. Each round: oxidize, hydrate, oxidize, cleave. Gets faster each round. | Beta-oxidation is repetitive. Each round produces 1 FADH2 + 1 NADH + 1 acetyl-CoA. |
| **Chain Length** | Player starts with a 16C palmitate. Must complete 7 rounds. Visual: fatty acid chain shortens each time. | Palmitate (C16) = 7 rounds, 8 acetyl-CoA, 106 net ATP |
| **Odd-Chain Twist** | Special puzzle for odd-chain FAs: last 3C = propionyl-CoA. Must be handled differently. | Propionyl-CoA --> methylmalonyl-CoA --> succinyl-CoA (requires B12!) |

#### NPCs (Planned)

| Name | Enzyme | Personality | Teaching Point |
|------|--------|-------------|---------------|
| **Carmen** | CPT-I | Strict bouncer at the gate | Rate-limiting, inhibited by malonyl-CoA |
| **The Spiral Crew** (4) | FAD-DH, Enoyl Hydratase, NAD-DH, Thiolase | Assembly line workers | Each step of beta-oxidation |
| **Prop** | Propionyl-CoA Carboxylase | Odd-chain specialist | Requires biotin + B12 pathway |

#### Boss: MCAD Deficiency

- Most common fatty acid oxidation disorder
- Hypoketotic hypoglycemia, Reye-like episodes
- Newborn screening: elevated C8-acylcarnitine
- Board questions: fasting intolerance, avoid fasting > 10-12 hours

#### Visual Details

- **Dark ship interior** -- crate textures, oil lanterns, cargo nets
- **Spiral ramp** going deeper into the hold
- **Fatty acid chain** as a visual rope/chain that shortens each round
- **Acetyl-CoA crates** stack up as you produce them (carried up to deck)

#### Reward

**Lipid Processing** -- cross lipid membrane barriers in other worlds

---

### 6. Pentose Phosphate Pathway

**Status:** PLANNED (Priority 2)
**ID:** `pentose-phosphate`
**Spatial Metaphor:** A side alley / workshop off the main shore road. Branching from glycolysis after Hexy.

#### Concept

Two phases:
1. **Oxidative phase** (irreversible): G6P --> 2 NADPH + ribose-5-phosphate + CO2
2. **Non-oxidative phase** (reversible): Sugar shuffling (transketolase, transaldolase)

#### Key Mechanics

- **NADPH production** -- player learns why NADPH matters (glutathione recycling, FA synthesis, drug detox)
- **Ribose-5-P** -- the nucleotide building block. Player collects it as a cross-pathway item for purine/pyrimidine worlds.
- **Sugar shuffling puzzle** -- rearrange carbon skeletons (3C, 4C, 5C, 6C, 7C) to produce what the cell needs.

#### Boss: G6PD Deficiency

- Most common enzyme deficiency worldwide
- Hemolytic anemia triggered by oxidant stress (fava beans, drugs)
- X-linked
- Board questions: Heinz bodies, bite cells, drug triggers

#### Reward

**Redox Balance** -- survive oxidant stress zones

---

### 7. Glycogen Metabolism -- Glycogen Village

**Status:** PLANNED (Priority 2)
**ID:** `glycogen-village`
**Spatial Metaphor:** A storage village/warehouse on the shore near the glycolysis demolition yard.

#### Concept

Two modes:
1. **Storage mode** (glycogenesis): Build glycogen tree by attaching glucose units. Glycogen synthase NPC.
2. **Release mode** (glycogenolysis): Break down glycogen tree. Glycogen phosphorylase NPC.

The glycogen "tree" is a literal branching 3D structure the player builds/breaks.

#### Key Mechanics

- **Building the tree** -- player attaches glucose units via alpha-1,4 linkages. Branching enzyme creates alpha-1,6 branches.
- **Breaking the tree** -- phosphorylase clips linear chains. Debranching enzyme handles branch points (requires 2 activities: transferase + glucosidase).
- **Hormonal signals** -- glucagon/epinephrine activate breakdown (stress mechanic); insulin activates storage.

#### Bosses: Glycogen Storage Diseases

| GSD Type | Enzyme | Key Feature |
|----------|--------|-------------|
| Type I (Von Gierke) | G6Pase | Hepatomegaly, fasting hypoglycemia, lactic acidosis |
| Type II (Pompe) | Acid maltase | Lysosomal, cardiomegaly, ERT available |
| Type III (Cori) | Debranching enzyme | Limit dextrin accumulation |
| Type V (McArdle) | Muscle phosphorylase | Exercise intolerance, second wind phenomenon |

#### Reward

**Glucose Storage** -- manage energy reserves across worlds

---

### 8. Amino Acid Catabolism Worlds

Multiple sub-worlds, each focused on a group of amino acids:

#### 8a. Aromatic AA Forest (PKU, Tyrosinemia)

**ID:** `aromatic-aa`

- **Phenylalanine hydroxylase** path: Phe --> Tyr (requires BH4 cofactor)
- **Tyrosine catabolism**: Tyr --> homogentisate --> fumarate + acetoacetate
- **Boss: PKU** -- Phe hydroxylase deficiency, dietary restriction, musty odor, fair hair

#### 8b. BCAA Mines (MSUD)

**ID:** `bcaa-mines`

- **Branched-chain amino acids**: leucine, isoleucine, valine
- **BCKDH complex** (similar to PDH and alpha-KGDH -- the "same enzyme in different clothes")
- **Boss: MSUD** -- BCKDH deficiency, sweet-smelling urine, leucine most toxic, encephalopathy

#### 8c. Sulfur AA Caverns (Homocystinuria)

**ID:** `sulfur-aa`

- **Methionine cycle**: methionine --> SAM --> SAH --> homocysteine
- **Two paths from homocysteine**: remethylation (B12 + folate) vs transsulfuration (CBS, requires B6)
- **Boss: CBS Deficiency** -- tall/thin (Marfanoid), lens subluxation (downward), thrombosis, ID

---

### 9. Organic Acid Pass

**Status:** PLANNED (Priority 2)
**ID:** `organic-acid-pass`
**Spatial Metaphor:** A mountain pass connecting BCAA mines to the TCA cycle. Toxic terrain.

#### Concept

Organic acids (propionate, methylmalonate) accumulate when pathways are blocked. Player must navigate through increasingly toxic terrain.

- **Propionate path**: Propionyl-CoA --> D-methylmalonyl-CoA --> L-methylmalonyl-CoA --> succinyl-CoA (enters TCA)
- Requires: biotin (PCC), B12 (MUT)

#### Bosses

| Disease | Enzyme | Key Features |
|---------|--------|-------------|
| Propionic Acidemia | Propionyl-CoA Carboxylase | Ketoacidosis, hyperammonemia, avoid VOMIT amino acids |
| Methylmalonic Acidemia | Methylmalonyl-CoA Mutase | B12-responsive subset, renal disease |
| Glutaric Aciduria Type I | Glutaryl-CoA DH | Macrocephaly, encephalopathic crises, striatal necrosis |

---

### 10. Heme Worlds

#### 10a. Heme Forge

**ID:** `heme-forge`

- **Heme synthesis**: ALA synthase (rate-limiting, requires B6) --> porphobilinogen --> ... --> protoporphyrin IX + Fe --> heme
- Lead poisoning blocks multiple steps
- **Bosses: Porphyrias** (AIP = acute intermittent, PCT = porphyria cutanea tarda, EPP)

#### 10b. Heme Degradation Ruins

**ID:** `heme-degradation`

- **Heme --> biliverdin --> bilirubin --> conjugated bilirubin (liver) --> urobilinogen (gut)**
- **Bosses**: Gilbert syndrome (benign), Crigler-Najjar, neonatal jaundice

---

### 11. Nucleotide Worlds

#### 11a. Purine Peaks

**ID:** `purine-peaks`

- De novo synthesis: ribose-5-P --> PRPP --> IMP --> AMP or GMP
- Salvage pathway: HGPRT recycles hypoxanthine/guanine
- Degradation: --> xanthine --> uric acid
- **Boss: Lesch-Nyhan** (HGPRT deficiency) -- hyperuricemia, self-injurious behavior, dystonia
- **Boss: ADA-SCID** -- adenosine deaminase deficiency, severe combined immunodeficiency

#### 11b. Pyrimidine Plains

**ID:** `pyrimidine-plains`

- De novo: CAD complex (CPS-II, not CPS-I!) --> orotate --> UMP --> CTP
- Salvage and degradation
- **Boss: Orotic Aciduria** -- UMP synthase deficiency, megaloblastic anemia not responsive to B12/folate

---

## ORGANELLE DUNGEONS

These are special zones accessible from multiple worlds, representing subcellular compartments.

---

### D1. Lysosome Vaults

**ID:** `lysosome-vaults`
**Mechanic:** Waste accumulation puzzle. The vault fills with undigested substrate. Player must activate the right enzyme to clear it before it overflows. Each LSD = a different substrate + missing enzyme.

| Disease | Missing Enzyme | Accumulated Substrate | Key Feature |
|---------|---------------|----------------------|-------------|
| Gaucher | Glucocerebrosidase | Glucocerebroside | Most common LSD, ERT, Gaucher cells |
| Fabry | Alpha-galactosidase A | Globotriaosylceramide | X-linked, acroparesthesias, renal failure |
| Pompe | Acid alpha-glucosidase | Glycogen | Cardiomegaly, ERT available |
| Tay-Sachs | Hexosaminidase A | GM2 ganglioside | Cherry red spot, Ashkenazi Jewish |
| NPC (Niemann-Pick C) | NPC1/NPC2 | Cholesterol | Vertical supranuclear gaze palsy |
| MPS types | Various | GAGs | Coarse facies, dysostosis multiplex |

---

### D2. Peroxisome Workshop

**ID:** `peroxisome-workshop`
**Mechanic:** VLCFA processing workshop. Player shortens very long chain fatty acids (>22C) that are too big for mitochondrial beta-oxidation.

| Disease | Defect | Key Feature |
|---------|--------|-------------|
| Zellweger Spectrum | PEX gene (biogenesis) | No functional peroxisomes, neonatal lethal |
| X-ALD | ABCD1 transporter | VLCFA accumulation, adrenal insufficiency, Lorenzo's Oil |
| Refsum | Phytanoyl-CoA hydroxylase | Phytanic acid accumulation, peripheral neuropathy |

---

### D3. ER/Golgi Factory

**ID:** `er-golgi-factory`
**Mechanic:** Assembly line / glycosylation puzzle. Player must attach sugar residues in the correct order to build glycoproteins. Errors = Congenital Disorders of Glycosylation (CDG).

- **ER phase**: N-linked glycosylation begins (dolichol pathway)
- **Golgi phase**: Processing and trimming, O-linked glycosylation
- **Boss: CDG Types** -- multi-system involvement, inverted nipples, cerebellar hypoplasia (PMM2-CDG)

---

### D4. Mitochondrial Sanctum

**ID:** `mito-sanctum`
**Mechanic:** Energy generation challenges with heteroplasmy mechanic. Not all mitochondria are affected equally -- player must manage a mix of normal and mutant mitochondria.

| Disease | Mutation | Key Feature |
|---------|---------|-------------|
| MELAS | m.3243A>G (tRNA-Leu) | Stroke-like episodes, lactic acidosis |
| MERRF | m.8344A>G (tRNA-Lys) | Myoclonic epilepsy, ragged red fibers |
| Leigh Syndrome | Various (Complex I, IV, PDH) | Bilateral basal ganglia lesions |
| LHON | ND1/ND4/ND6 | Acute bilateral vision loss, young males |

**Heteroplasmy mechanic:** Threshold effect. 60-80% mutant = symptoms appear. Visual: some engine components glow red (mutant), some green (normal). Player must reach a threshold of working components.

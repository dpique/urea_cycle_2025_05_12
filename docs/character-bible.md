# Metabolon: Character Bible

Every NPC in Metabolon is a **visual mnemonic**. Their name, appearance, personality, and dialogue encode the biochemistry they represent. This document catalogs every character: built and planned.

---

## Character Design Philosophy

### The Formula

```
Name = pun / mnemonic on the enzyme name
Personality = the enzyme's function expressed as human behavior
Appearance = encodes a board-relevant fact about the enzyme
Dialogue = 1-2 lines per screen (RSC style), teaches one fact per interaction
```

### Name Rules

- **Short** (1-2 syllables preferred) -- players will reference these in study groups
- **Phonetically linked** to the enzyme: Percy (Pyruvate DH), Sid (Citrate Synthase), Ike (Isocitrate DH)
- **Personality puns** welcome: Donkey for ASS (argininosuccinate synthetase), Aslan for ASL (lyase = lion splits things)
- **Avoid** names that are too cute or obscure the connection. The name should trigger recall.

### Visual Mnemonic Rules

- The character's **appearance** must encode at least one board-relevant fact
- This is not decorative. Percy's missing ring finger IS the teaching point about B4.
- Examples of what to encode: cofactors, regulatory properties, subcellular location, unique features

### Dialogue Rules (RSC Style)

- **Max 1-2 lines per dialogue screen**
- Player clicks "..." to advance through `greetingChain`
- First line = personality + who they are
- Subsequent lines = one teaching point each
- Last line = summary or memorable phrase
- **No text walls.** Ever.

---

## Enzyme Class Visual Language

| Enzyme Class | Visual Cues | Personality Archetype |
|-------------|------------|----------------------|
| **Kinases** | Yellow glow, ATP sparkles | Energetic, always moving |
| **Lyases** | Jagged edges, sharp tools | Dramatic, "I CLEAVE things!" |
| **Dehydrogenases** | Parched/cracked texture, dry lips | Thirsty, dry humor |
| **Synthases/Synthetases** | Rounded body, careful hands, apron | Patient craftsman |
| **Transferases** | Blue-tinted, arms extended | "Here, take this." Always passing things. |
| **Isomerases** | Flexible pose, acrobat build | "Same atoms, different arrangement!" |
| **Oxidoreductases** | Electron sparkle effects | Obsessed with electron flow |

---

## Character Builder Presets

The `characterBuilder.js` system generates RSC-style blocky characters from presets:

| Preset | Body | Head | Hat | Expression | Accessories | Arm Pose |
|--------|------|------|-----|------------|-------------|----------|
| `gatekeeper` | stocky | boxy | helmet | stern | shield | raised (45deg) |
| `craftsman` | average | round | beret | wise | apron | low (22deg) |
| `detective` | tall | tall | fedora | intense | glasses | slight (18deg) |
| `powerhouse` | large | boxy | none | stern | belt | wide (60deg) |
| `showman` | tall | round | tophat | smug | cape | mid (45deg) |
| `scientist` | average | tall | none | friendly | glasses, apron | low (22deg) |
| `proud` | average | round | crown | smug | medal | mid (36deg) |
| `worker` | wide | flat | hardhat | friendly | belt, wrench | low (30deg) |
| `acrobat` | small | round | none | surprised | none | high (90deg) |
| `pirate` | stocky | boxy | tricorn | intense | eyepatch, belt | mid (36deg) |

---

## BUILT CHARACTERS

---

### Percy the Dehydrated Pirate (PDH Complex)

**Enzyme:** Pyruvate Dehydrogenase Complex
**World:** TCA Cycle (main deck)
**Preset:** `pirate`
**Position:** North side of the cycle ring (angle: 90deg, at the gangplank)

#### Visual Mnemonic: The Hand

Percy has **4 fingers + an L-shaped prosthetic** on his right hand:

```
Finger 1: B1 (Thiamine)     -- red
Finger 2: B2 (FAD)          -- green
Finger 3: B3 (NAD+)         -- blue
[GAP -- ring finger missing]
Prosthetic: L (Lipoic acid) -- metal/gray, L-shaped
Finger 4: B5 (CoA)          -- yellow
```

**The missing ring finger IS the teaching point:** B4 doesn't exist as a cofactor. "My ex-wife took it. But honestly? Never needed it." The gap between B3 and B5, with an L-shaped prosthetic where B4 would be, makes the cofactor list unforgettable.

**Label above hand:** "B1 B2 B3 [no B4!] B5" with "^ Lipoic acid" below the L.

#### Personality

- **Captain of the ship.** Commands respect. Dramatic but competent.
- **"I only sail in one direction."** = irreversible reaction
- **Dehydrated** = dehydrogenase (removes hydrogens)
- Self-aware about being a "complex" -- "I am... substantial."

#### Greeting Chain (7 lines)

```
1. "HALT! Name's Percy. The Dehydrated Pirate. I only sail in ONE direction."
2. "Captain of the Pyruvate Dehydrogenase Complex. Irreversible. No going back."
3. "See this hand? Count the fingers. B1... B2... B3..."
4. "Then SKIP to B5. Notice the gap? The RING finger. There IS no B4."
5. "My ex-wife took it. But honestly? Never needed it. B4 doesn't exist."
6. "And in its place -- this L-shaped prosthetic. Lipoic acid. The one cofactor that isn't a B vitamin."
7. "Percy's Five: B1 Thiamine, B2 FAD, B3 NAD+, L for Lipoic, B5 CoA. Five tools. One direction."
```

#### Board-Relevant Facts Encoded

- PDH is irreversible ("one direction")
- PDH requires 5 cofactors: B1, B2, B3, lipoic acid, B5 (the "tender loving care" mnemonic: **T**PP, **L**ipoic, **C**oA, **F**AD, **N**AD+)
- B4 is not a real vitamin (common board trap)
- PDH complex is structurally similar to alpha-KGDH and BCKDH

---

### Sid (Citrate Synthase)

**Enzyme:** Citrate Synthase
**World:** TCA Cycle
**Preset:** `craftsman`
**Colors:** Body 0x2a9d8f, Hat 0x4ecdc4

#### Personality

Meticulous craftsman. Careful, precise, proud of being "first."

> "Welcome! I'm Sid, the Citrate Synthase. I'm the FIRST enzyme of the TCA cycle. I carefully combine Acetyl-CoA with Oxaloacetate to make Citrate. It's delicate work, but someone's got to start the cycle!"

#### Board-Relevant Facts

- First committed step of TCA
- Condensation reaction (2C + 4C --> 6C)
- No cofactors required (just water released)
- Inhibited by ATP, NADH, succinyl-CoA, citrate (product inhibition)

#### Planned greetingChain

```
1. "Sid here. Citrate Synthase. The first step. The ONLY first step."
2. "Give me Acetyl-CoA and Oxaloacetate. I'll fuse them into Citrate."
3. "Two carbons plus four carbons. Six-carbon product. Simple math, delicate chemistry."
4. "I don't need cofactors. No B vitamins, no metals. Just skill."
5. "But I do listen to the cell. Too much ATP? I slow down. Too much NADH? I ease off."
```

---

### Aco (Aconitase)

**Enzyme:** Aconitase
**World:** TCA Cycle
**Preset:** `acrobat`
**Colors:** Body 0x6bbf8a, Hat (none) 0xa8e6cf

#### Personality

Molecular acrobat. Quick, flexible, minimizes what he does but it's essential.

> "I'm Aco, the Aconitase! I do a little rearranging act -- I flip Citrate into Isocitrate. Some people say I'm just an isomerase, but I prefer 'molecular acrobat.'"

#### Visual Mnemonic (Planned)

- **Iron-sulfur cluster** as a glowing accessory (Fe-S = functional group)
- Fluoroacetate/fluorocitrate could be a "poison" plot point (irreversible inhibitor)

#### Board-Relevant Facts

- Contains iron-sulfur cluster (Fe-S)
- Citrate --> cis-aconitate --> isocitrate (two-step with intermediate)
- Inhibited by fluorocitrate (from fluoroacetate -- rat poison!)
- Also acts as an iron sensor in cytoplasm (IRP1)

---

### Ike (Isocitrate Dehydrogenase)

**Enzyme:** Isocitrate Dehydrogenase
**World:** TCA Cycle
**Preset:** `detective`
**Colors:** Body 0xccaa00, Hat 0xffd93d

#### Personality

Detective. Investigates every molecule. Thorough. Likes to explain what he finds.

> "Detective Ike here, Isocitrate Dehydrogenase. I investigate every molecule that comes my way. When I oxidize Isocitrate, I pull off a CO2 and produce the first NADH of the cycle. That's called oxidative decarboxylation -- say it three times fast!"

#### Board-Relevant Facts

- First oxidative decarboxylation in TCA (6C --> 5C)
- Produces first NADH + first CO2
- Rate-limiting step of TCA cycle (key regulatory point)
- Activated by ADP, inhibited by ATP and NADH

#### Planned greetingChain

```
1. "Detective Ike. Isocitrate Dehydrogenase. I investigate molecules."
2. "Hand me Isocitrate and I'll show you oxidative decarboxylation."
3. "First, I rip off a CO2. Six carbons down to five. Alpha-ketoglutarate."
4. "Then I hand the electrons to NAD+. First NADH of the cycle. You're welcome."
5. "I'm the rate-limiting step. The cell controls the whole cycle through ME."
```

---

### Alpha (Alpha-Ketoglutarate Dehydrogenase)

**Enzyme:** Alpha-Ketoglutarate Dehydrogenase Complex
**World:** TCA Cycle
**Preset:** `powerhouse`
**Colors:** Body 0xb02a35, Hat (none) 0xe63946

#### Personality

Powerful, mysterious, imposing. Speaks in short, heavy sentences. Structurally identical to Percy (both are multi-enzyme complexes).

> "I am Alpha, the Alpha-Ketoglutarate Dehydrogenase Complex. I am... substantial. A multi-enzyme complex, just like Percy up there. I produce the SECOND NADH and release another CO2. Together with Ike, we've now released BOTH carbons from the original Acetyl-CoA as CO2."

#### Visual Mnemonic (Planned)

- Same 5 cofactors as Percy (B1, B2, B3, lipoic, B5) -- could share the hand design
- Visually similar to Percy but different color scheme (showing structural homology)

#### Board-Relevant Facts

- Same structure as PDH complex (and BCKDH) -- all three use the same 5 cofactors
- Produces 2nd NADH + 2nd CO2
- After Alpha, both carbons from acetyl-CoA have been fully oxidized
- Not technically reversible (commits carbon to complete oxidation)

---

### Suki (Succinyl-CoA Synthetase)

**Enzyme:** Succinyl-CoA Synthetase
**World:** TCA Cycle
**Preset:** `proud`
**Colors:** Body 0x7b3dc5, Hat 0x9b5de5

#### Personality

Proud. Boastful. The ONLY enzyme in TCA that makes a high-energy phosphate directly. Won't let you forget it.

> "I'm Suki! Succinyl-CoA Synthetase. You know what makes me special? I'm the ONLY enzyme in the TCA cycle that produces a high-energy phosphate directly -- GTP! Everyone talks about oxidative phosphorylation, but I do it the old-fashioned way: substrate-level phosphorylation, baby!"

#### Board-Relevant Facts

- Substrate-level phosphorylation (not oxidative phosphorylation)
- Produces GTP (equivalent to ATP via nucleoside diphosphate kinase)
- Only direct energy-currency step in TCA
- GDP --> GTP (in some tissues ATP directly)

---

### Sadie (Succinate Dehydrogenase / Complex II)

**Enzyme:** Succinate Dehydrogenase
**World:** TCA Cycle + ETC Engine Room (dual role!)
**Preset:** `worker`
**Colors:** Body 0xd06040, Hat 0xf4845f

#### Personality

Hard worker. Unique. Proud of her dual role. A bit exhausted from working two jobs.

> "Hey there! I'm Sadie, Succinate Dehydrogenase. Fun fact about me: I'm the ONLY TCA cycle enzyme that's actually embedded in the inner mitochondrial membrane. That's because I moonlight as Complex II of the Electron Transport Chain! I produce FADH2 instead of NADH -- it feeds electrons directly into the ETC through me."

#### Visual Mnemonic (Planned)

- **Hardhat** (worker preset) but also wearing something that shows her membrane-embedded nature
- Could have one foot "through the floor" of the ship deck (embedded in membrane)
- FAD cofactor visible (orange glow instead of green NADH glow)

#### Board-Relevant Facts

- Only TCA enzyme in the inner mitochondrial membrane
- IS Complex II of the ETC (dual function)
- Uses FAD, not NAD+ (produces FADH2, not NADH)
- FADH2 enters ETC at Complex II (fewer protons pumped = ~1.5 ATP vs ~2.5 ATP for NADH)
- SDH mutations associated with paraganglioma/pheochromocytoma

---

### Fuma (Fumarase)

**Enzyme:** Fumarase
**World:** TCA Cycle
**Preset:** `scientist`
**Colors:** Body 0x60bb60, Hat (none) 0x90ee90

#### Personality

Bridge-builder. Sees connections between worlds. Intellectual, understated.

> "I'm Fuma, Fumarase! I hydrate Fumarate into Malate -- simple but essential. And here's the cool part: Fumarate also comes from the Urea Cycle! So I'm literally the BRIDGE between the Urea Cycle and the TCA Cycle. Two worlds, connected through me."

#### Board-Relevant Facts

- Simple hydration reaction (fumarate + H2O --> malate)
- Fumarate is also produced by ASL in the urea cycle (the aspartate-argininosuccinate shunt)
- Links TCA cycle to urea cycle, purine synthesis, and amino acid catabolism
- Fumarase deficiency: extremely rare, fumaric aciduria, severe neurological disease
- Fumarase mutations associated with hereditary leiomyomatosis and renal cell carcinoma (HLRCC)

---

### Mal (Malate Dehydrogenase)

**Enzyme:** Malate Dehydrogenase
**World:** TCA Cycle
**Preset:** `showman`
**Colors:** Body 0x0090aa, Hat 0x00b4d8

#### Personality

The closer. Showman. Dramatic flair for the final step. Proud of regenerating OAA.

> "I'm Mal, Malate Dehydrogenase. I'm the last enzyme of the cycle. I oxidize Malate to regenerate Oxaloacetate -- which goes right back to Sid to start the cycle again! I also produce the THIRD and final NADH. The cycle is complete!"

#### Board-Relevant Facts

- Produces 3rd NADH
- Regenerates oxaloacetate (cycle completion)
- Thermodynamically unfavorable (ΔG positive) -- driven forward by removal of OAA by citrate synthase
- Malate dehydrogenase also exists in cytoplasm (malate-aspartate shuttle component)

---

### Professor Hepaticus (Quest Giver / Mentor)

**Enzyme:** None (narrative character)
**World:** Urea Cycle
**Preset:** Custom (tall, blue robe, white beard, cape)

#### Personality

Wise mentor. Provides context and administers quizzes. Named for the liver (hepato-) where the urea cycle primarily occurs.

> "Welcome, young Metabolic Ranger. The urea cycle is the body's nitrogen disposal system. Without it, ammonia accumulates and the brain suffers. Your mission: follow the cycle, learn each enzyme, and prove your mastery."

#### Visual Design

- 1.5x scale (towers over other NPCs)
- Blue robe with white trim
- White beard
- Cape accessory
- Wise expression
- Positioned near the starting alcove in mitochondria zone

---

### Casper the Ghost (CPS1)

**Enzyme:** Carbamoyl Phosphate Synthetase I
**World:** Urea Cycle (mitochondria)

#### Personality

Ghostly, haunts the graveyard. Needs to be "activated" with NAG (N-acetylglutamate) before he can work. Without NAG, he's sluggish and useless.

#### Visual Mnemonic

- **Ghost in a graveyard** -- CPS1 is the first step, "buried" deep in mitochondria
- Requires **NAG activation** -- Casper needs his "coffee" (NAG = Nagesh's Coffee) to function

#### Board-Relevant Facts

- Rate-limiting step of the urea cycle
- Requires N-acetylglutamate (NAG) as allosteric activator
- CPS1 is mitochondrial (vs CPS2 which is cytosolic and used for pyrimidine synthesis)
- Combines: NH3 + HCO3- + 2 ATP --> carbamoyl phosphate

---

### Nagesh (NAGS)

**Enzyme:** N-Acetylglutamate Synthase
**World:** Urea Cycle (mitochondria)

#### Personality

Coffee brewer. Makes "Nagesh's Coffee" (NAG) from "Acidic Coffin Grounds" (acetyl-CoA) and "Ghoul Milk" (glutamate). The mnemonic: NAG = N-Acetyl-Glutamate, and Nagesh "nags" Casper to wake up and work.

#### Board-Relevant Facts

- Makes NAG, the essential activator of CPS1
- Without NAGS, CPS1 can't function --> hyperammonemia
- Substrate: acetyl-CoA + glutamate --> NAG
- NAGS deficiency treatable with carglumic acid (NAG analog)

---

### Otis (OTC)

**Enzyme:** Ornithine Transcarbamylase
**World:** Urea Cycle (mitochondria)

#### Personality

Reliable, sturdy. Does his job without fuss. But when he's broken (OTC deficiency), everything falls apart.

#### Board-Relevant Facts

- Makes citrulline from ornithine + carbamoyl phosphate
- **X-LINKED** (only X-linked urea cycle defect!)
- OTC deficiency = most common urea cycle disorder
- Elevated orotic acid (carbamoyl phosphate overflows into pyrimidine synthesis)
- Distinguished from CPS1 deficiency by orotic acid levels

---

### Donkey (ASS)

**Enzyme:** Argininosuccinate Synthetase
**World:** Urea Cycle (cytosol)

#### Personality

Stubborn (he's a donkey). Name is a pun on ASS (the enzyme abbreviation). Hard worker when he gets going. Combines citrulline + aspartate.

#### Board-Relevant Facts

- Combines citrulline + aspartate + ATP --> argininosuccinate
- This is where the SECOND nitrogen enters the cycle (aspartate donates it)
- ASS deficiency = citrullinemia type I (elevated citrulline)
- Requires ATP (one of two ATP-consuming steps)

---

### Aslan (ASL)

**Enzyme:** Argininosuccinate Lyase
**World:** Urea Cycle (cytosol)

#### Personality

Noble, lion-like. Named "Aslan" (lion in Turkish) because ASL is a Lyase (L = Lion). He splits things apart with power and precision.

#### Board-Relevant Facts

- Splits argininosuccinate --> arginine + fumarate
- Fumarate enters TCA cycle (the link between urea and TCA)
- ASL deficiency = argininosuccinic aciduria (trichorrhexis nodosa is a unique clinical clue)

---

### Argus (ARG1)

**Enzyme:** Arginase
**World:** Urea Cycle (cytosol)

#### Personality

Many-eyed guardian (Argus Panoptes from mythology). Watches over the final step. Produces urea and regenerates ornithine to restart the cycle.

#### Board-Relevant Facts

- Final step: arginine --> ornithine + urea
- Regenerates ornithine (the cycle is complete)
- Arginase deficiency = hyperargininemia (elevated arginine, spastic diplegia)

---

## PLANNED CHARACTERS

---

### Glycolysis World

| # | Name | Enzyme | Type | Personality | Key Teaching Point |
|---|------|--------|------|------------|-------------------|
| 1 | Hexy | Hexokinase | Machine | Eager, first-in-line | Traps glucose in cell (adds phosphate = can't leave). Uses 1st ATP. |
| 2 | Izzy | PGI | Machine | Precise, squeezing | Isomerization: 6-ring --> 5-ring (G6P --> F6P) |
| 3 | Phil | PFK-1 | NPC (gatekeeper) | Demanding, rate-limiting | THE rate-limiting step. Commits glucose to glycolysis. Uses 2nd ATP. Allosteric regulation (ATP inhibits, AMP/citrate activate). |
| 4 | Al | Aldolase | Machine | Splitting personality | Splits F1,6-BP into two 3C pieces (DHAP + G3P) |
| 5 | Tim | TPI | Machine | Mirror/twin | Interconverts DHAP <-> G3P. All carbons must go through G3P. |
| 6 | Gary | GAPDH | Machine | Electron-obsessed | First energy harvest: oxidation + phosphorylation. Produces NADH. Uses inorganic Pi (not ATP). |
| 7 | Peggy | PGK | Machine | Generous, gives back | First ATP payback! Substrate-level phosphorylation. |
| 8 | Mutty | PGM | Machine | Shifty, moves things | Shifts phosphate from C3 to C2. Mutase = moves within same molecule. |
| 9 | Eno | Enolase | Machine | Wringing, dehydrating | Removes water to create PEP (high-energy bond). Inhibited by fluoride. |
| 10 | Pike | Pyruvate Kinase | NPC + Cannon | Explosive, triumphant | Final ATP! Substrate-level phosphorylation. PEP --> pyruvate. Irreversible. |

**Note on Phil (PFK-1):** Phil should be the most memorable glycolysis character. He's the gatekeeper. He decides whether glucose is committed to glycolysis. His appearance should encode his regulatory nature: different-colored "buttons" for his activators (AMP, fructose-2,6-bisphosphate) and inhibitors (ATP, citrate). When you "push the right buttons," he lets you through.

**Note on Pike:** Pike has a cannon that "launches" pyruvate toward the ship. This visually encodes that pyruvate kinase is the final irreversible step, and pyruvate's next destination is PDH/TCA.

---

### ETC Engine Room (Planned)

| Name | Complex | Personality | Visual Mnemonic |
|------|---------|------------|----------------|
| **Uno** | Complex I (NADH DH) | Industrial foreman, massive | Largest complex. Pumps 4 H+. Entry for NADH. |
| **Sadie** (returns) | Complex II (SDH) | "Working my second shift" | Same character from TCA. Shows she works both locations. |
| **Bea** | Complex III (Cyt bc1) | Efficient middle manager | Q cycle mechanism. Pumps 4 H+. |
| **Cy** | Complex IV (Cyt c oxidase) | Dramatic, oxygen-obsessed | Final electron acceptor. O2 --> H2O. Cyanide target. |
| **Turbo** | ATP Synthase (F1F0) | Spinning, perpetual motion | Rotary motor. Protons flow through F0, F1 head makes ATP. |
| **CoQ** | Ubiquinone | Messenger/runner | Shuttles electrons between I/II and III. Mobile. |
| **CytoC** | Cytochrome c | Small, fast courier | Shuttles electrons between III and IV. Also apoptosis trigger. |

---

### FA Oxidation (Planned)

| Name | Enzyme/Role | Personality | Visual Mnemonic |
|------|------------|------------|----------------|
| **Carmen** | CPT-I | Strict bouncer | Blocks entry when malonyl-CoA present (fed state). Carnitine required. |
| **The Spiral Crew** | Beta-oxidation enzymes (4) | Assembly line workers | Repeating 4-step process. Each round = 1 FADH2 + 1 NADH + 1 acetyl-CoA. |
| **Prop** | Propionyl-CoA Carboxylase | Odd-chain specialist | Handles the final 3C piece from odd-chain FAs. Needs biotin. |

---

### Lysosomal Storage Disease Characters (Planned)

Each lysosomal enzyme could be a **vault guardian** -- when they're missing, their vault overflows:

| Name (TBD) | Enzyme | Disease When Missing | Vault Contents |
|-------------|--------|---------------------|---------------|
| ? | Glucocerebrosidase | Gaucher | Glucocerebroside (crumpled paper macrophages) |
| ? | Hex A | Tay-Sachs | GM2 ganglioside (cherry red macular spot) |
| ? | Alpha-gal A | Fabry | Gb3 (angiokeratomas, acroparesthesias) |
| ? | Acid maltase | Pompe | Glycogen (cardiomegaly) |
| ? | Iduronate sulfatase | Hunter (MPS II) | Dermatan/heparan sulfate (X-linked!) |
| ? | Alpha-L-iduronidase | Hurler (MPS I) | Dermatan/heparan sulfate (corneal clouding) |

---

## Character Naming Conventions Summary

| Pattern | Examples | When to Use |
|---------|---------|------------|
| **Phonetic abbreviation** | Percy (PDH), Sid (CS), Iko (IDH) | Most common. Quick recall. |
| **Personality pun** | Donkey (ASS), Aslan (ASL/Lyase) | When the abbreviation suggests a character |
| **Function name** | Phil the Gatekeeper (PFK-1), Pike the Launcher (PK) | When the enzyme's role is the memorable part |
| **Alliterative** | Casper (CPS1), Carmen (CPT-I) | When the enzyme starts with a strong consonant |
| **Mythological** | Argus (ARG1), Professor Hepaticus | For mentor/narrative characters |

---

## Dialogue Writing Guide

### Do

```
"Name's Percy. The Dehydrated Pirate."          -- 1 line. Identity + mnemonic.
"See this hand? Count the fingers. B1... B2..."  -- 1 line. Visual reference.
"Then SKIP to B5. Notice the gap?"               -- 1 line. The teaching point.
```

### Don't

```
"Hello! Welcome to the TCA cycle. I am the Pyruvate Dehydrogenase Complex,
also known as PDH. I catalyze the irreversible oxidative decarboxylation of
pyruvate to acetyl-CoA, releasing CO2 and producing NADH. This reaction
requires five cofactors: thiamine pyrophosphate (B1), FAD (B2), NAD+ (B3),
lipoic acid, and Coenzyme A (B5). Note that B4 does not exist as a
recognized vitamin cofactor..."
```

**The first version teaches through character. The second is a textbook paragraph with quotation marks around it.**

### greetingChain Template

```json
{
    "greeting": "First line. Identity. Hook.",
    "greetingChain": [
        "Second line. What I do. One sentence.",
        "Third line. The key fact. Make it visual or physical.",
        "Fourth line. Why it matters. Connect to the bigger picture.",
        "Fifth line. Summary mnemonic or catchphrase."
    ]
}
```

Aim for 4-7 lines total (including the initial greeting). Each line should be independently valuable -- if a player only reads 2 lines, they still learned something.

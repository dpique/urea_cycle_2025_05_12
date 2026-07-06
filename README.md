# Metabolon

A 3D browser game that teaches the fundamentals of metabolic genetics by letting you run
the machinery of a living cell by hand. You play an operator inside one living liver cell;
each metabolic pathway is a district you keep running. Built by
[StudyRare](https://studyrare.com) for ABMGG and ABGC board preparation.

Show, do not tell: you carry molecules, operate enzyme machines, and watch substrates
transform step by step. The purpose of each pathway is a live gauge — glycolysis feeds an
energy meter, the urea cycle holds down an ammonia-toxicity meter.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run test`, `npm run lint`.

## Controls

| Action | Key |
|---|---|
| Move | W A S D or arrows |
| Look / zoom | click-drag / scroll |
| Interact (operate, talk, take) | E |
| Jump | Space |
| Travel between districts | T |
| Sound / Save / Help | M / F5 / H |

Deep-link a district for testing: `?world=hub`, `?world=glycolysis`, `?world=urea-cycle`.

## What is built

- **The Atrium** — the hub (cytosol crossroads), your guide Coa (Coenzyme A), the shared
  economy, and portals to each district.
- **Furnace Row — Glycolysis** — a hill you climb during the ATP investment phase and
  descend during payoff; 10 enzyme stations; net 2 ATP and 2 NADH.
- **The Nitrogen Works — Urea Cycle** — start carrying toxic ammonia and package it as urea
  across the mitochondrial membrane; CPS1, OTC, ASS, ASL, arginase.

The full vision and architecture are in [`docs/game-design-document.md`](docs/game-design-document.md)
and [`CLAUDE.md`](CLAUDE.md). Design, engine, and content are structured so the remaining
pathways are added as data, not new engine code.

## Tech

Vanilla JavaScript, [Three.js](https://threejs.org), and [Vite](https://vitejs.dev). No
framework, no build-time art pipeline — a shared palette, material factory, and low-poly
builder kit do the visual work.

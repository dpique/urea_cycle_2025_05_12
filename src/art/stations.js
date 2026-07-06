// src/art/stations.js
// Machine and workstation builders. Enzymes that catalyze mechanical reactions are
// machines the player operates, not humanoids. Each returns a THREE.Group; some expose
// userData.animate(t) for idle motion and userData.react() for a one-shot reaction pulse.

import * as THREE from 'three';
import * as mat from './materials.js';
import { NEUTRAL, CURRENCY } from './palette.js';

// A raised platform every station sits on, so stations read as "operable" and share a
// footprint. Accent ring matches the district.
export function pad(accent = 0x6cc0c0, radius = 1.9) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.05, 0.28, 24),
    mat.solid(NEUTRAL.stone, { rough: 0.95 })
  );
  base.position.y = 0.14;
  base.receiveShadow = true;
  base.castShadow = true;
  g.add(base);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.9, 0.05, 8, 28),
    mat.glow(accent, 0.5)
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  g.add(ring);
  return g;
}

// Hexy's Workbench — a table with a vise; a phosphate "dynamite stick" waits on top.
export function workbench(color = NEUTRAL.wood) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.0), mat.solid(color, { rough: 0.9 }));
  top.position.y = 0.95;
  top.castShadow = true;
  g.add(top);
  for (const [x, z] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat.solid(NEUTRAL.woodDark));
    leg.position.set(x, 0.45, z);
    leg.castShadow = true;
    g.add(leg);
  }
  const vise = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.4), mat.solid(NEUTRAL.charcoal, { metal: 0.5 }));
  vise.position.set(0, 1.15, 0);
  g.add(vise);
  const dynamite = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), mat.glow(CURRENCY.Pi, 0.4));
  dynamite.position.set(0.5, 1.2, 0.2);
  dynamite.rotation.z = 0.5;
  g.add(dynamite);
  return g;
}

// A vise/press that squeezes a ring (PGI, and reusable for compression steps).
export function press(color = 0x6cc0c0) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 8, 6, Math.PI), mat.solid(color, { metal: 0.4 }));
  frame.position.y = 1.0;
  frame.castShadow = true;
  g.add(frame);
  const jawTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.5), mat.solid(NEUTRAL.charcoal, { metal: 0.5 }));
  const jawBot = jawTop.clone();
  jawTop.position.set(0, 1.35, 0);
  jawBot.position.set(0, 0.75, 0);
  g.add(jawTop, jawBot);
  g.userData.jawTop = jawTop;
  g.userData.animate = (t) => {
    jawTop.position.y = 1.28 + Math.sin(t * 2) * 0.05;
  };
  return g;
}

// Al's Splitting Rack — two posts that pull a molecule apart (aldolase, precision-pull).
export function splitter(color = 0x9b5de5) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 8), mat.solid(color, { metal: 0.3 }));
    post.position.set(side * 0.8, 0.8, 0);
    post.castShadow = true;
    g.add(post);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat.solid(NEUTRAL.charcoal, { metal: 0.5 }));
    clamp.position.set(side * 0.55, 1.2, 0);
    g.add(clamp);
  }
  const chain = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), mat.solid(NEUTRAL.stoneDark, { metal: 0.6 }));
  chain.position.y = 1.2;
  g.add(chain);
  return g;
}

// Electron Extractor (GAPDH) — a coil that pulls electrons out as NADH; sparks.
export function extractor(color = 0x4f9dde) {
  const g = new THREE.Group();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.7, 12), mat.solid(NEUTRAL.stoneDark, { metal: 0.4 }));
  column.position.y = 0.85;
  column.castShadow = true;
  g.add(column);
  const coils = [];
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.42 + i * 0.02, 0.04, 6, 18), mat.glow(color, 0.7));
    coil.rotation.x = Math.PI / 2;
    coil.position.y = 0.5 + i * 0.35;
    g.add(coil);
    coils.push(coil);
  }
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mat.glow(color, 1.2));
  orb.position.y = 1.85;
  g.add(orb);
  g.userData.animate = (t) => {
    orb.material.emissiveIntensity = 1 + Math.sin(t * 5) * 0.4;
    coils.forEach((c, i) => (c.position.y = 0.5 + i * 0.35 + Math.sin(t * 3 + i) * 0.02));
  };
  return g;
}

// A capstan/spring device (PGM shift, enolase wring) — reusable lever machine.
export function lever(color = 0x2a9d8f) {
  const g = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16), mat.solid(color, { metal: 0.3 }));
  drum.rotation.x = Math.PI / 2;
  drum.position.y = 1.0;
  drum.castShadow = true;
  g.add(drum);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat.solid(NEUTRAL.charcoal, { metal: 0.5 }));
  handle.position.set(0.35, 1.2, 0);
  g.add(handle);
  g.userData.handle = handle;
  g.userData.animate = (t) => {
    g.userData.handle.rotation.z = Math.sin(t * 1.5) * 0.2;
  };
  return g;
}

// Pike's Launcher — a cannon that fires pyruvate toward the mitochondrion.
export function cannon(color = 0xe0503a) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), mat.solid(NEUTRAL.woodDark));
  base.position.y = 0.2;
  base.castShadow = true;
  g.add(base);
  const wheelL = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 16), mat.solid(NEUTRAL.charcoal));
  wheelL.position.set(-0.5, 0.35, 0);
  const wheelR = wheelL.clone();
  wheelR.position.x = 0.5;
  g.add(wheelL, wheelR);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.3, 14), mat.solid(color, { metal: 0.4 }));
  barrel.position.set(0, 0.7, 0);
  barrel.rotation.z = -Math.PI / 4; // angled up
  barrel.castShadow = true;
  g.add(barrel);
  g.userData.barrel = barrel;
  return g;
}

// Nagesh's Kettle — a coffee/brew stand that makes NAG.
export function kettle(color = 0x8a5a3b) {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 12), mat.solid(color, { rough: 0.9 }));
  stand.position.y = 0.45;
  stand.castShadow = true;
  g.add(stand);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.7), mat.solid(0x3a3530, { metal: 0.5 }));
  pot.position.y = 1.05;
  g.add(pot);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.4, 8), mat.solid(0x3a3530, { metal: 0.5 }));
  spout.position.set(0.4, 1.1, 0);
  spout.rotation.z = -0.9;
  g.add(spout);
  // steam
  const steams = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat.glass(0xffffff, 0.35));
    s.position.set(0, 1.4 + i * 0.2, 0);
    g.add(s);
    steams.push(s);
  }
  g.userData.animate = (t) => {
    steams.forEach((s, i) => {
      s.position.y = 1.4 + ((t * 0.5 + i * 0.33) % 1) * 0.8;
      s.material.opacity = 0.35 * (1 - ((t * 0.5 + i * 0.33) % 1));
    });
  };
  return g;
}

// The membrane bridge gate (ORNT1) — a formal doorway spanning the mitochondrial river.
export function membraneGate(accent = 0x9b6bd6) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), mat.solid(NEUTRAL.stone, { rough: 0.9 }));
    post.position.set(side * 1.6, 1.6, 0);
    post.castShadow = true;
    g.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 0.5), mat.solid(NEUTRAL.stone, { rough: 0.9 }));
  lintel.position.y = 3.35;
  g.add(lintel);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), mat.glass(accent, 0.28));
  field.position.set(0, 1.7, 0);
  g.add(field);
  g.userData.field = field;
  return g;
}

// Waste chute — where urea is safely disposed. A satisfying end-of-cycle target.
export function wasteChute(accent = 0x8ed64a) {
  const g = new THREE.Group();
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.4, 1.0, 16, 1, true), mat.solid(NEUTRAL.stoneDark, { metal: 0.4, side: THREE.DoubleSide }));
  funnel.position.y = 1.2;
  g.add(funnel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 20), mat.glow(accent, 0.5));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.7;
  g.add(rim);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), mat.solid(NEUTRAL.stoneDark, { metal: 0.4 }));
  pipe.position.y = 0.6;
  g.add(pipe);
  return g;
}

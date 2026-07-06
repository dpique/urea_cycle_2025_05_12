// src/art/molecule.js
// Legible, stylized molecule models built from spheres (atoms) and sticks (bonds),
// colored by element. These are the objects the player carries and watches transform
// step by step. Accuracy is at the "board diagram" level: recognizable shape and the
// right element colors, not exact bond angles.

import * as THREE from 'three';
import * as mat from './materials.js';
import { ELEMENT } from './palette.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function atom(element, pos, r = 0.24) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    mat.solid(ELEMENT[element] ?? ELEMENT.C, { rough: 0.55, smooth: true })
  );
  m.position.copy(pos);
  m.castShadow = true;
  return m;
}

function bond(a, b, radius = 0.07) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 6);
  const m = new THREE.Mesh(geo, mat.solid(ELEMENT.bond, { rough: 0.7 }));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return m;
}

// A phosphate group: orange P with red oxygens. Used as the "dynamite" the player
// straps onto sugars in glycolysis, and appears in ATP, carbamoyl phosphate, etc.
function phosphate(pos, scale = 1) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const p = atom('P', V(0, 0, 0), 0.2 * scale);
  g.add(p);
  const os = [V(0.28, 0.16, 0), V(-0.28, 0.16, 0), V(0, -0.1, 0.28)].map((o) =>
    o.multiplyScalar(scale)
  );
  for (const o of os) {
    g.add(atom('O', o, 0.13 * scale));
    g.add(bond(V(0, 0, 0), o, 0.05 * scale));
  }
  return g;
}

// Ring of `n` carbons in the XZ plane, radius r. Returns { group, nodes } so callers
// can attach substituents to specific carbons (e.g. phosphate on C1/C6).
function carbonRing(n, r = 0.72) {
  const g = new THREE.Group();
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    nodes.push(V(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  for (let i = 0; i < n; i++) {
    g.add(atom('C', nodes[i], 0.22));
    g.add(bond(nodes[i], nodes[(i + 1) % n]));
  }
  return { group: g, nodes };
}

// Straight carbon chain along X, returns nodes.
function carbonChain(n, spacing = 0.5) {
  const g = new THREE.Group();
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const p = V((i - (n - 1) / 2) * spacing, 0, 0);
    nodes.push(p);
    g.add(atom('C', p, 0.2));
    if (i > 0) g.add(bond(nodes[i - 1], p));
  }
  return { group: g, nodes };
}

// --- Named forms. Each returns a Group centered near the origin, ~1.2 units wide. ---
const builders = {
  // Glycolysis line
  glucose() {
    const { group, nodes } = carbonRing(6, 0.72);
    // ring oxygen hint + a couple hydroxyls in red to read as a sugar
    group.add(atom('O', nodes[0].clone().add(V(0, 0.35, 0)), 0.14));
    group.add(atom('O', nodes[3].clone().add(V(0, -0.32, 0.1)), 0.12));
    return group;
  },
  g6p() {
    const g = builders.glucose();
    // phosphate on carbon 6 (top of ring)
    g.add(phosphate(V(0.0, 0.55, -0.72), 0.9));
    return g;
  },
  f6p() {
    const { group } = carbonRing(5, 0.66); // furanose — one carbon "popped out"
    group.add(atom('O', V(0, 0.42, 0), 0.14));
    group.add(phosphate(V(0.0, 0.5, -0.66), 0.9));
    return group;
  },
  f16bp() {
    const g = builders.f6p();
    g.add(phosphate(V(0.0, -0.5, 0.66), 0.9)); // second phosphate on C1
    return g;
  },
  dhap() {
    const { group } = carbonChain(3, 0.5);
    group.add(atom('O', V(0, 0.36, 0), 0.13));
    group.add(phosphate(V(0.5, 0.35, 0), 0.8));
    return group;
  },
  g3p() {
    const { group, nodes } = carbonChain(3, 0.5);
    group.add(atom('O', nodes[0].clone().add(V(0, 0.32, 0)), 0.12)); // aldehyde
    group.add(phosphate(nodes[2].clone().add(V(0, 0.35, 0)), 0.8));
    return group;
  },
  bpg13() {
    const g = builders.g3p();
    g.add(phosphate(V(-0.5, 0.35, 0), 0.75)); // high-energy acyl phosphate
    return g;
  },
  pg3() {
    const { group, nodes } = carbonChain(3, 0.5);
    group.add(atom('O', nodes[0].clone().add(V(0, 0.3, 0)), 0.12));
    group.add(atom('O', nodes[0].clone().add(V(-0.2, -0.2, 0)), 0.12));
    group.add(phosphate(nodes[2].clone().add(V(0, 0.34, 0)), 0.78));
    return group;
  },
  pg2() {
    const { group, nodes } = carbonChain(3, 0.5);
    group.add(atom('O', nodes[0].clone().add(V(0, 0.3, 0)), 0.12));
    group.add(atom('O', nodes[0].clone().add(V(-0.2, -0.2, 0)), 0.12));
    group.add(phosphate(nodes[1].clone().add(V(0, 0.36, 0)), 0.78)); // phosphate on C2
    return group;
  },
  pep() {
    const { group, nodes } = carbonChain(3, 0.5);
    group.add(atom('O', nodes[0].clone().add(V(0, 0.3, 0)), 0.12));
    group.add(atom('O', nodes[0].clone().add(V(-0.2, -0.2, 0)), 0.12));
    group.add(phosphate(nodes[1].clone().add(V(0, 0.4, 0)), 0.82)); // enol phosphate
    return group;
  },
  pyruvate() {
    const { group, nodes } = carbonChain(3, 0.5);
    group.add(atom('O', nodes[0].clone().add(V(0, 0.3, 0)), 0.13)); // carboxyl
    group.add(atom('O', nodes[0].clone().add(V(-0.22, -0.18, 0)), 0.13));
    group.add(atom('O', nodes[1].clone().add(V(0, 0.34, 0)), 0.13)); // ketone
    return group;
  },

  // Urea cycle line
  ammonia() {
    const g = new THREE.Group();
    const n = atom('N', V(0, 0, 0), 0.28);
    g.add(n);
    for (const h of [V(0.3, 0.28, 0), V(-0.3, 0.28, 0), V(0, 0.28, 0.32)]) {
      g.add(atom('H', h, 0.14));
      g.add(bond(V(0, 0, 0), h, 0.05));
    }
    return g;
  },
  bicarbonate() {
    const g = new THREE.Group();
    g.add(atom('C', V(0, 0, 0), 0.2));
    for (const o of [V(0.3, 0.2, 0), V(-0.3, 0.2, 0), V(0, -0.3, 0)]) {
      g.add(atom('O', o, 0.15));
      g.add(bond(V(0, 0, 0), o));
    }
    g.add(atom('H', V(0.5, 0.35, 0), 0.1));
    return g;
  },
  carbamoylPhosphate() {
    const g = new THREE.Group();
    g.add(atom('N', V(-0.5, 0.1, 0), 0.24));
    g.add(atom('C', V(0, 0, 0), 0.2));
    g.add(atom('O', V(0, 0.4, 0), 0.15));
    g.add(bond(V(-0.5, 0.1, 0), V(0, 0, 0)));
    g.add(bond(V(0, 0, 0), V(0, 0.4, 0)));
    g.add(phosphate(V(0.55, 0.05, 0), 0.9));
    g.add(bond(V(0, 0, 0), V(0.55, 0.05, 0)));
    return g;
  },
  ornithine() {
    const { group, nodes } = carbonChain(5, 0.42);
    group.add(atom('N', nodes[0].clone().add(V(-0.28, 0.1, 0)), 0.2)); // alpha amino
    group.add(atom('O', nodes[0].clone().add(V(-0.1, 0.34, 0)), 0.12));
    group.add(atom('N', nodes[4].clone().add(V(0.28, 0.1, 0)), 0.2)); // side chain amino
    return group;
  },
  citrulline() {
    const g = builders.ornithine();
    // ureido group added onto the side-chain nitrogen
    g.add(atom('C', V(1.25, 0.1, 0), 0.18));
    g.add(atom('O', V(1.25, 0.5, 0), 0.13));
    g.add(atom('N', V(1.6, -0.1, 0), 0.18));
    return g;
  },
  argininosuccinate() {
    const g = builders.citrulline();
    // fused aspartate arm — a stub chain hanging off
    for (let i = 0; i < 3; i++) g.add(atom('C', V(1.9 + i * 0.35, -0.3 - i * 0.1, 0.2), 0.16));
    g.add(atom('N', V(1.75, 0.1, 0.3), 0.14));
    return g;
  },
  arginine() {
    const g = builders.ornithine();
    g.add(atom('C', V(1.3, 0.1, 0), 0.18)); // guanidinium
    g.add(atom('N', V(1.6, 0.35, 0), 0.16));
    g.add(atom('N', V(1.6, -0.2, 0), 0.16));
    return g;
  },
  urea() {
    const g = new THREE.Group();
    g.add(atom('C', V(0, 0, 0), 0.2));
    g.add(atom('O', V(0, 0.42, 0), 0.16)); // carbonyl up
    g.add(bond(V(0, 0, 0), V(0, 0.42, 0)));
    for (const n of [V(-0.42, -0.22, 0), V(0.42, -0.22, 0)]) {
      g.add(atom('N', n, 0.2));
      g.add(bond(V(0, 0, 0), n));
      g.add(atom('H', n.clone().add(V(n.x > 0 ? 0.26 : -0.26, -0.12, 0)), 0.1));
    }
    return g;
  },
  fumarate() {
    const { group, nodes } = carbonChain(4, 0.46);
    group.add(atom('O', nodes[0].clone().add(V(-0.1, 0.32, 0)), 0.13));
    group.add(atom('O', nodes[0].clone().add(V(-0.24, -0.16, 0)), 0.13));
    group.add(atom('O', nodes[3].clone().add(V(0.1, 0.32, 0)), 0.13));
    group.add(atom('O', nodes[3].clone().add(V(0.24, -0.16, 0)), 0.13));
    return group;
  },
  aspartate() {
    const { group, nodes } = carbonChain(4, 0.44);
    group.add(atom('N', nodes[1].clone().add(V(0, 0.34, 0)), 0.2));
    group.add(atom('O', nodes[0].clone().add(V(-0.2, 0.2, 0)), 0.12));
    group.add(atom('O', nodes[3].clone().add(V(0.2, 0.2, 0)), 0.12));
    return group;
  },
  nag() {
    // N-acetylglutamate: a glutamate chain with an acetyl cap — the CPS1 activator.
    const { group, nodes } = carbonChain(5, 0.42);
    group.add(atom('N', nodes[1].clone().add(V(0, 0.34, 0)), 0.19));
    group.add(atom('C', nodes[1].clone().add(V(0, 0.72, 0)), 0.16)); // acetyl
    group.add(atom('O', nodes[1].clone().add(V(0.28, 0.9, 0)), 0.12));
    group.add(atom('O', nodes[0].clone().add(V(-0.2, 0.2, 0)), 0.12));
    group.add(atom('O', nodes[4].clone().add(V(0.2, 0.2, 0)), 0.12));
    return group;
  },
  glutamate() {
    const { group, nodes } = carbonChain(5, 0.42);
    group.add(atom('N', nodes[1].clone().add(V(0, 0.34, 0)), 0.2));
    group.add(atom('O', nodes[0].clone().add(V(-0.2, 0.2, 0)), 0.12));
    group.add(atom('O', nodes[4].clone().add(V(0.2, 0.2, 0)), 0.12));
    return group;
  },
  acetylCoA() {
    // stylized: a 2-carbon acetyl on a big yellow "CoA" carrier bead (sulfur link)
    const g = new THREE.Group();
    g.add(atom('C', V(-0.5, 0, 0), 0.18));
    g.add(atom('O', V(-0.5, 0.36, 0), 0.12));
    g.add(atom('C', V(-0.9, -0.1, 0), 0.16));
    g.add(atom('S', V(-0.1, -0.1, 0), 0.18));
    g.add(bond(V(-0.5, 0, 0), V(-0.1, -0.1, 0)));
    const coa = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), mat.toon(0xe8c84a));
    coa.position.set(0.4, -0.1, 0);
    g.add(coa);
    return g;
  },

  // Currency tokens — carried representation of the shared economy.
  atpToken() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat.toon(0xf2d06b));
    g.add(base);
    for (let i = 0; i < 3; i++) g.add(atom('P', V(0.32 + i * 0.26, 0.02, 0), 0.14));
    return g;
  },
  nadhToken() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat.toon(0x4f9dde));
    g.add(base);
    g.add(atom('N', V(0.28, 0.12, 0), 0.13));
    return g;
  },
};

// Build a named molecule model, scaled and lifted to float nicely.
export function make(name, opts = {}) {
  const fn = builders[name];
  const g = fn ? fn() : builders.glucose();
  g.userData.moleculeName = name;
  const s = opts.scale ?? 1;
  g.scale.setScalar(s);
  return g;
}

export const KNOWN = Object.keys(builders);

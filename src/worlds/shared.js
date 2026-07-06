// src/worlds/shared.js
// Helpers shared by world modules: portals (with the portal-as-lesson card) and simple
// scatter decoration.

import * as THREE from 'three';
import * as mat from '../art/materials.js';
import { textSprite } from '../art/props.js';

// Build a portal ring at pos. onEnter(ctx) fires when the player interacts.
// opts: { pos, label, color, prompt, onEnter, radius }
export function portal(ctx, opts) {
  const { pos, label = 'Portal', color = 0x6644ff, prompt, radius = 2 } = opts;
  const g = new THREE.Group();
  g.position.copy(pos);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22, 10, 28), mat.glow(color, 0.9));
  ring.position.y = radius + 0.3;
  g.add(ring);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.9, 24), mat.glass(color, 0.35));
  inner.position.y = radius + 0.3;
  g.add(inner);
  const light = new THREE.PointLight(color, 8, 14, 2);
  light.position.y = radius + 0.3;
  g.add(light);
  const lbl = textSprite(label, { scale: 0.7, color: '#2a2420', bg: 'rgba(255,255,255,0.85)' });
  lbl.position.y = radius * 2 + 1;
  g.add(lbl);

  g.userData.name = label;
  g.userData.prompt = prompt || `Press E — ${label}`;
  g.userData.interactRadius = 3.6;
  g.userData.indicatorHeight = radius * 2 + 0.6;
  g.userData.anchor = pos.clone();
  g.userData.onInteract = () => opts.onEnter?.(ctx, g);

  ctx.worldRoot.add(g);
  ctx.addInteractable(g);

  // gentle spin
  ctx.onUpdate((dt, t) => {
    ring.rotation.z = t * 0.6;
    inner.material.opacity = 0.3 + Math.sin(t * 2) * 0.08;
  });
  return g;
}

// Scatter deterministic decoration props around, avoiding a central clear radius.
export function scatter(ctx, builder, count, { area = 40, clear = 8, y = 0, seed = 1 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = frac(seed * 12.9898 + i * 78.233) * Math.PI * 2;
    const r = clear + frac(seed * 3.14 + i * 1.618) * (area - clear);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const p = builder(i);
    p.position.set(x, y, z);
    p.rotation.y = frac(i * 7.7) * Math.PI * 2;
    ctx.worldRoot.add(p);
  }
}

function frac(n) {
  return n - Math.floor(n);
}

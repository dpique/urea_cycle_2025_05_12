// src/art/props.js
// Reusable low-poly prop builders. World modules compose these instead of hand-rolling
// geometry, which keeps silhouettes and proportions consistent across districts.

import * as THREE from 'three';
import * as mat from './materials.js';
import { NEUTRAL } from './palette.js';

export function enableShadows(obj, cast = true, receive = false) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

// --- Text as a camera-facing sprite. Cached canvases are cheap; text is drawn crisp. ---
export function textSprite(text, opts = {}) {
  const {
    color = '#2a2420',
    bg = null,
    scale = 1,
    font = 'bold 64px "Trebuchet MS", system-ui, sans-serif',
    pad = 24,
  } = opts;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = 96;
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (bg) {
    ctx.fillStyle = bg;
    roundRect(ctx, 4, 4, w - 8, h - 8, 20);
    ctx.fill();
  }
  // soft outline for legibility over any background
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeText(text, w / 2, h / 2 + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true })
  );
  const aspect = w / h;
  sprite.scale.set(aspect * scale, scale, 1);
  sprite.userData.isLabel = true;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --- Ground ---
export function groundDisc(radius, color, opts = {}) {
  const geo = new THREE.CircleGeometry(radius, opts.segments ?? 48);
  const m = new THREE.Mesh(geo, mat.solid(color, { rough: 0.98, smooth: true }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export function groundPlane(w, d, color, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, d, opts.seg ?? 1, opts.seg ?? 1);
  const m = new THREE.Mesh(geo, mat.solid(color, { rough: 0.98, smooth: true }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

// A flat decal ring drawn on the floor (compass rings, station pads).
export function padRing(inner, outer, color) {
  const geo = new THREE.RingGeometry(inner, outer, 40);
  const m = new THREE.Mesh(geo, mat.unlit(color, { opacity: 0.5, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  m.renderOrder = 1;
  return m;
}

// --- Vegetation and rocks: soften plazas, mark boundaries ---
export function crystal(height, color, opts = {}) {
  const geo = new THREE.ConeGeometry(height * 0.28, height, opts.sides ?? 5);
  const m = new THREE.Mesh(geo, mat.toon(color, { emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0 }));
  m.position.y = height / 2;
  m.castShadow = true;
  return m;
}

export function rock(size, color = NEUTRAL.stone) {
  const geo = new THREE.IcosahedronGeometry(size, 0);
  const m = new THREE.Mesh(geo, mat.solid(color, { rough: 1 }));
  m.scale.set(1, 0.7 + Math.abs(hash(size) % 0.4), 1);
  m.rotation.y = hash(size * 3);
  m.position.y = size * 0.35;
  m.castShadow = true;
  return m;
}

export function tree(height = 4, trunkColor = NEUTRAL.wood, leafColor = 0x6fae5a) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(height * 0.08, height * 0.12, height * 0.5, 6),
    mat.solid(trunkColor, { rough: 1 })
  );
  trunk.position.y = height * 0.25;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const r = height * (0.34 - i * 0.07);
    const foliage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      mat.toon(leafColor)
    );
    foliage.position.y = height * (0.5 + i * 0.18);
    foliage.rotation.y = i;
    foliage.castShadow = true;
    g.add(foliage);
  }
  return g;
}

// --- Industrial props for pathway worlds ---
export function pipe(length, radius = 0.25, color = NEUTRAL.stoneDark) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 10),
    mat.solid(color, { metal: 0.3, rough: 0.6 })
  );
  m.castShadow = true;
  return m;
}

export function tank(radius = 1.4, height = 3, color = NEUTRAL.stone, liquid = null) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    mat.solid(color, { metal: 0.2, rough: 0.5 })
  );
  shell.position.y = height / 2;
  shell.castShadow = true;
  g.add(shell);
  if (liquid != null) {
    const glassShell = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, height * 0.8, 16),
      mat.glass(liquid, 0.55)
    );
    glassShell.position.y = height / 2;
    g.add(glassShell);
  }
  const rimTop = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.08, 8, 20),
    mat.solid(NEUTRAL.charcoal, { metal: 0.5, rough: 0.4 })
  );
  rimTop.rotation.x = Math.PI / 2;
  rimTop.position.y = height;
  g.add(rimTop);
  return g;
}

export function barrel(color = NEUTRAL.wood) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12),
    mat.solid(color, { rough: 0.8 })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  for (const y of [0.2, 0.55, 0.9]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.51, 0.04, 6, 14),
      mat.solid(NEUTRAL.charcoal, { metal: 0.4 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  return g;
}

export function lantern(color = 0xffcf3f) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3, 6),
    mat.solid(NEUTRAL.charcoal, { metal: 0.4 })
  );
  post.position.y = 1.5;
  post.castShadow = true;
  g.add(post);
  const glassBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.5),
    mat.glow(color, 0.9, { opacity: 0.85 })
  );
  glassBox.position.y = 3.1;
  g.add(glassBox);
  const light = new THREE.PointLight(color, 6, 9, 2);
  light.position.y = 3.1;
  g.add(light);
  g.userData.light = light;
  return g;
}

// A signpost with a readable board.
export function sign(text, opts = {}) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 2.2, 6),
    mat.solid(NEUTRAL.wood, { rough: 1 })
  );
  post.position.y = 1.1;
  post.castShadow = true;
  g.add(post);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.9, 0.12),
    mat.solid(opts.boardColor ?? NEUTRAL.sand, { rough: 0.9 })
  );
  board.position.y = 2.0;
  board.castShadow = true;
  g.add(board);
  const label = textSprite(text, { scale: 0.55, color: '#2a2420' });
  label.position.set(0, 2.0, 0.12);
  g.add(label);
  return g;
}

// Low railing to bound plazas without walls that block the camera.
export function railing(length, color = NEUTRAL.wood) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.12, 0.12),
    mat.solid(color, { rough: 0.9 })
  );
  top.position.y = 1;
  top.castShadow = true;
  g.add(top);
  const posts = Math.max(2, Math.round(length / 2));
  for (let i = 0; i <= posts; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1, 0.14),
      mat.solid(color, { rough: 0.9 })
    );
    p.position.set(-length / 2 + (i * length) / posts, 0.5, 0);
    p.castShadow = true;
    g.add(p);
  }
  return g;
}

// A short flight of stairs (passive transport metaphor).
export function stairs(steps = 5, width = 3, rise = 0.35, color = NEUTRAL.stone) {
  const g = new THREE.Group();
  for (let i = 0; i < steps; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(width, rise, 0.7),
      mat.solid(color, { rough: 0.95 })
    );
    step.position.set(0, rise / 2 + i * rise, -i * 0.7);
    step.castShadow = true;
    step.receiveShadow = true;
    g.add(step);
  }
  return g;
}

// Ground arrow pointing a direction, used for wayfinding.
export function groundArrow(color, opts = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1);
  shape.lineTo(0.7, 0);
  shape.lineTo(0.28, 0);
  shape.lineTo(0.28, -1);
  shape.lineTo(-0.28, -1);
  shape.lineTo(-0.28, 0);
  shape.lineTo(-0.7, 0);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const m = new THREE.Mesh(geo, mat.unlit(color, { opacity: 0.55, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.scale.setScalar(opts.scale ?? 1);
  m.renderOrder = 1;
  return m;
}

// A displaced ground mesh from a height function fn(x, z) -> y. Used for the glycolysis
// hill (invest uphill, split at the peak, payoff downhill). Player terrain-follows the
// same fn, so the visible ground and the physics agree exactly.
export function heightField(width, depth, segW, segD, fn, color, opts = {}) {
  const geo = new THREE.PlaneGeometry(width, depth, segW, segD);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    // after rotating -90deg about X: worldX = lx, worldZ = -ly, worldY = local z
    pos.setZ(i, fn(lx, -ly));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat.solid(color, { rough: 0.98, smooth: !opts.flat }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

// A soft cloud puff for the sky (persistent decoration).
export function cloud() {
  const g = new THREE.Group();
  const m = mat.solid(0xffffff, { rough: 1, smooth: true });
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + (i % 2) * 0.5, 0), m);
    puff.position.set(i * 1.4 - 2, (i % 2) * 0.4, (i % 3) * 0.5);
    g.add(puff);
  }
  g.scale.setScalar(2.2);
  return g;
}

// Deterministic pseudo-random so decoration is stable across reloads.
function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

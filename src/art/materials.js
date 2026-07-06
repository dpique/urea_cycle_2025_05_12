// src/art/materials.js
// Shared material factory. Every mesh in the game gets its material from here so the
// lighting response is uniform. Materials are cached and shared by default, so nothing
// should mutate a returned material in place — highlighting is done with separate
// indicator meshes (see interaction.js), never by tinting shared materials.

import * as THREE from 'three';

const cache = new Map();

// A small stepped gradient gives the flat-shaded meshes a gentle toon banding under
// the warm key light. Built once, reused by every toon material.
let toonGradient = null;
function getToonGradient() {
  if (toonGradient) return toonGradient;
  const steps = new Uint8Array([90, 90, 90, 160, 160, 160, 255, 255, 255]);
  const tex = new THREE.DataTexture(steps, 3, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  toonGradient = tex;
  return tex;
}

function key(kind, color, opts) {
  return kind + ':' + color + ':' + JSON.stringify(opts || {});
}

// Flat-shaded standard material — the workhorse crafted low-poly look.
export function solid(color, opts = {}) {
  const k = key('solid', color, opts);
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.85,
    metalness: opts.metal ?? 0.0,
    flatShading: opts.smooth ? false : true,
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  cache.set(k, m);
  return m;
}

// Toon-banded variant for characters and hero props.
export function toon(color, opts = {}) {
  const k = key('toon', color, opts);
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  cache.set(k, m);
  return m;
}

// Emissive glow — currencies, portals, hazards. Reads under fog and at distance.
export function glow(color, intensity = 0.8, opts = {}) {
  const k = key('glow', color, { intensity, ...opts });
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.0,
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  cache.set(k, m);
  return m;
}

// Translucent — water, membranes, force fields, glass tanks.
export function glass(color, opacity = 0.4, opts = {}) {
  const k = key('glass', color, { opacity, ...opts });
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.15,
    metalness: 0.0,
    transparent: true,
    opacity,
    side: opts.side ?? THREE.DoubleSide,
    depthWrite: false,
  });
  cache.set(k, m);
  return m;
}

// Unlit — markers, ground decals, things that must not be shaded.
export function unlit(color, opts = {}) {
  const k = key('unlit', color, opts);
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  });
  cache.set(k, m);
  return m;
}

// A fresh, non-cached clone for the rare case something must animate its own material
// (pulsing portals, a hazard that brightens). Caller owns disposal.
export function unique(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.7,
    metalness: opts.metal ?? 0.0,
    flatShading: opts.smooth ? false : true,
    emissive: opts.emissive ?? color,
    emissiveIntensity: opts.emissiveIntensity ?? 0.0,
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

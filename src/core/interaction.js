// src/core/interaction.js
// Proximity-based interaction. The nearest interactable within range gets a bobbing
// indicator floating above it and a HUD prompt; pressing E fires its onInteract. This
// avoids mutating shared materials (highlighting is a separate indicator mesh), which is
// what lets materials.js safely cache and share materials.

import * as THREE from 'three';
import * as mat from '../art/materials.js';
import * as hud from './hud.js';

let interactables = [];
let indicator = null;
let closest = null;
const DEFAULT_RADIUS = 3.4;

export function initInteraction(scene) {
  indicator = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 24), mat.glow(0xffcf3f, 1.1));
  ring.rotation.x = Math.PI / 2;
  indicator.add(ring);
  const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 4), mat.glow(0xffcf3f, 1.1));
  chevron.rotation.x = Math.PI;
  chevron.position.y = 0.7;
  indicator.add(chevron);
  indicator.visible = false;
  indicator.userData.persistent = true;
  indicator.renderOrder = 2;
  scene.add(indicator);
}

export function addInteractable(obj) {
  if (!interactables.includes(obj)) interactables.push(obj);
  return obj;
}
export function removeInteractable(obj) {
  interactables = interactables.filter((o) => o !== obj);
}
export function clearInteractables() {
  interactables = [];
  closest = null;
  if (indicator) indicator.visible = false;
  hud.setInteractPrompt(null);
}

// Anchor point an interactable's indicator hovers over.
function anchorOf(obj) {
  if (obj.userData.anchor) return obj.userData.anchor;
  return obj.getWorldPosition(new THREE.Vector3());
}

export function updateInteraction(playerPos, elapsed) {
  closest = null;
  let bestDist = Infinity;
  for (const obj of interactables) {
    if (obj.userData.disabled) continue;
    const a = anchorOf(obj);
    const r = obj.userData.interactRadius ?? DEFAULT_RADIUS;
    const dx = a.x - playerPos.x;
    const dz = a.z - playerPos.z;
    const d = Math.hypot(dx, dz);
    if (d < r && d < bestDist) {
      bestDist = d;
      closest = obj;
    }
  }

  if (closest) {
    const a = anchorOf(closest);
    const top = (closest.userData.indicatorHeight ?? 2.6);
    indicator.position.set(a.x, a.y + top + Math.sin(elapsed * 3) * 0.12, a.z);
    indicator.rotation.y = elapsed * 1.5;
    indicator.visible = true;
    // the nearby enzyme turns its head toward the player
    const look = closest.userData.body?.userData?.faceHead;
    if (look) look(new THREE.Vector3(playerPos.x, a.y, playerPos.z));
    hud.setInteractPrompt(closest.userData.prompt || `Press E — ${closest.userData.name || 'interact'}`);
  } else {
    indicator.visible = false;
    hud.setInteractPrompt(null);
  }
}

export function getClosest() {
  return closest;
}

export function interactWithClosest(ctx) {
  if (closest && typeof closest.userData.onInteract === 'function') {
    closest.userData.onInteract(closest, ctx);
    return true;
  }
  return false;
}

// Tint the indicator to a district accent so it belongs to each world.
export function setIndicatorColor(hex) {
  indicator?.traverse((o) => {
    if (o.isMesh) o.material = mat.glow(hex, 1.1);
  });
}

// src/core/engine.js
// The game loop. Ties input, player, interaction, the current world, the companion, and
// rendering together. Gameplay freezes (player + interaction) while a dialogue, quiz, or
// mini-game is open, but the world keeps animating and rendering underneath.

import * as THREE from 'three';
import { scene, render } from './renderer.js';
import { player, updatePlayer } from './player.js';
import { wasPressed } from './input.js';
import * as interaction from './interaction.js';
import * as dialogue from './dialogue.js';
import * as minigame from './minigame.js';
import * as audio from './audio.js';
import * as save from './save.js';
import * as hud from './hud.js';
import {
  updateCurrentWorld,
  isTransitioning,
  getTerrainFn,
  getColliderFn,
  currentWorldId,
  transitionTo,
} from './router.js';

let clock;
let companion = null;
const companionTarget = new THREE.Vector3();
const travelOrder = ['hub', 'glycolysis', 'urea-cycle'];

export function attachCompanion(mesh) {
  companion = mesh;
  companion.userData.persistent = true;
  scene.add(companion);
}

export function startEngine() {
  clock = new THREE.Clock();
  bindKeys();
  animate();
}

function bindKeys() {
  // Only global, always-safe toggles here; interaction/jump are polled in the loop.
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'h') toggleHelp();
    if (k === 'm') {
      const muted = audio.toggleMute();
      hud.toast(muted ? 'Sound off' : 'Sound on', 1400);
    }
    if (k === 't' && !blocking()) {
      const idx = travelOrder.indexOf(currentWorldId());
      const next = travelOrder[(idx + 1) % travelOrder.length];
      transitionTo(next);
    }
    if (e.key === 'F5') {
      e.preventDefault();
      hud.toast(save.save() ? 'Progress saved' : 'Save failed', 1600);
    }
  });
  // first gesture unlocks audio
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });
}

function blocking() {
  return dialogue.isBlocking() || minigame.isActive();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // consume edge presses every frame so none go stale through a freeze
  const interactPressed = wasPressed('e');
  const jumpPressed = wasPressed(' ');

  const frozen = blocking() || isTransitioning();

  if (interactPressed && !frozen) {
    if (interaction.interactWithClosest({})) audio.blip(600);
  }

  updatePlayer(dt, t, {
    frozen,
    jump: jumpPressed && !frozen,
    terrainAt: getTerrainFn(),
    collides: getColliderFn(),
  });

  if (!isTransitioning()) {
    if (!frozen) interaction.updateInteraction(player.position, t);
    updateCurrentWorld(dt, t);
  }

  // companion hovers just behind-right of the player, always visible
  if (companion) {
    companionTarget.copy(player.position).add(new THREE.Vector3(1.4, 1.7, 0.6));
    companion.position.lerp(companionTarget, Math.min(1, 5 * dt));
    companion.userData.hoverBase = companion.position.y;
    companion.userData.animate?.(t);
  }

  render();
}

function toggleHelp() {
  const el = document.getElementById('help');
  if (el) el.hidden = !el.hidden;
}

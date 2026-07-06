// src/core/router.js
// World registry and transitions. Each world builds into a fresh worldRoot group, so
// cleanup is one removeFromScene plus clearing interactables and per-frame callbacks —
// no per-object bookkeeping. Transitions play the portal-as-lesson card: a 1.5s animated
// reaction naming the connecting enzyme instead of a blank loading screen.

import * as THREE from 'three';
import { scene, setAtmosphere } from './renderer.js';
import { player, placePlayer } from './player.js';
import { clearHeld } from './input.js';
import * as economy from './economy.js';
import * as hud from './hud.js';
import * as dialogue from './dialogue.js';
import * as minigame from './minigame.js';
import * as interaction from './interaction.js';
import * as audio from './audio.js';
import { startPathway } from './pathway.js';
import * as palette from '../art/palette.js';
import * as materials from '../art/materials.js';
import * as props from '../art/props.js';
import * as molecule from '../art/molecule.js';
import * as character from '../art/character.js';
import * as stations from '../art/stations.js';

const worlds = new Map();
let currentId = null;
let currentModule = null;
let worldRoot = null;
let frameCallbacks = [];
let terrainFn = () => 0;
let colliderFn = () => false;
let transitioning = false;

export function registerWorld(id, mod) {
  worlds.set(id, mod);
}
export function getWorld(id) {
  return worlds.get(id);
}
export function currentWorldId() {
  return currentId;
}
export function isTransitioning() {
  return transitioning;
}
export function getTerrainFn() {
  return terrainFn;
}
export function getColliderFn() {
  return colliderFn;
}

function buildContext() {
  worldRoot = new THREE.Group();
  worldRoot.userData.worldRoot = true;
  scene.add(worldRoot);
  frameCallbacks = [];
  terrainFn = () => 0;
  colliderFn = () => false;

  const ctx = {
    THREE,
    scene,
    worldRoot,
    player,
    economy,
    hud,
    dialogue,
    minigame,
    interaction,
    audio,
    art: { palette, materials, props, molecule, character, stations },
    startPathway: (cfg) => startPathway(ctx, cfg),
    addInteractable: (o) => interaction.addInteractable(o),
    removeInteractable: (o) => interaction.removeInteractable(o),
    onUpdate: (fn) => frameCallbacks.push(fn),
    goToWorld: (id, opts) => transitionTo(id, opts),
    setTerrain: (fn) => (terrainFn = fn),
    setCollider: (fn) => (colliderFn = fn),
    setAtmosphere,
  };
  return ctx;
}

function teardownCurrent() {
  if (currentModule?.cleanup) {
    try {
      currentModule.cleanup();
    } catch (e) {
      console.warn('world cleanup error', e);
    }
  }
  interaction.clearInteractables();
  hud.resetWorldHud();
  frameCallbacks = [];
  if (worldRoot) {
    scene.remove(worldRoot);
    worldRoot.traverse((o) => {
      if (o.isMesh) o.geometry?.dispose?.();
    });
    worldRoot = null;
  }
}

// Initial, immediate load (no fade), used at boot.
export function loadWorld(id, spawnPoint) {
  const mod = worlds.get(id);
  if (!mod) throw new Error(`world not registered: ${id}`);
  teardownCurrent();
  const ctx = buildContext();
  currentId = id;
  currentModule = mod;
  mod.init(ctx);
  if (spawnPoint) placePlayer(spawnPoint);
  else if (mod.config?.spawnPoint) placePlayer(mod.config.spawnPoint);
  hud.banner(mod.config?.name || id, mod.config?.tagline || '');
}

export function updateCurrentWorld(dt, t) {
  if (transitioning) return;
  for (const fn of frameCallbacks) fn(dt, t);
  if (currentModule?.update) currentModule.update(dt, t);
}

// Transition with the portal-as-lesson card.
export async function transitionTo(id, opts = {}) {
  if (transitioning || id === currentId) {
    if (id === currentId && opts.spawn) placePlayer(opts.spawn);
    return;
  }
  const mod = worlds.get(id);
  if (!mod) {
    hud.toast('That district is not open yet.', 2600, 'warn');
    return;
  }
  transitioning = true;
  clearHeld();

  await fade(1, 260);
  if (opts.transit) await showTransitCard(opts.transit);

  teardownCurrent();
  const ctx = buildContext();
  currentId = id;
  currentModule = mod;
  mod.init(ctx);
  const spawn = opts.spawn || mod.config?.spawnPoint || { x: 0, y: 0.5, z: 0 };
  placePlayer(spawn);

  await fade(0, 300);
  transitioning = false;
  hud.banner(mod.config?.name || id, mod.config?.tagline || '');
}

// --- overlays ---
function fade(to, ms) {
  const el = document.getElementById('fade');
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = String(to);
  return new Promise((r) => setTimeout(r, ms));
}

function showTransitCard(t) {
  const el = document.getElementById('transit');
  el.innerHTML = `
    <div class="transit-card">
      <div class="transit-reaction">
        <span class="tr-mol from">${t.from}</span>
        <span class="tr-arrow">${t.irreversible ? '⇒' : '→'}</span>
        <span class="tr-mol to">${t.to}</span>
      </div>
      <div class="transit-enzyme">${t.enzyme}</div>
      <div class="transit-caption">${t.caption || ''}</div>
    </div>`;
  el.hidden = false;
  el.classList.add('show');
  return new Promise((r) =>
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => {
        el.hidden = true;
        r();
      }, 300);
    }, 1500)
  );
}

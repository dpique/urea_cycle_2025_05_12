// js/sceneManager.js
// Manages world transitions, loading/unloading worlds, and portal effects

import * as THREE from 'three';
import { scene, camera, renderer, ambientLight, directionalLight } from './sceneSetup.js';
import { player } from './playerManager.js';
import { showFeedback } from './uiManager.js';
import { getGameState, setGameState } from './gameState.js';
import { emit } from './eventBus.js';
import { playTransit, hasTransit } from './portalTransit.js';

let currentWorld = null;
let currentWorldId = null;
let registeredWorlds = {};
let isTransitioning = false;

// Transition overlay element
let transitionOverlay = null;

function createTransitionOverlay() {
    transitionOverlay = document.getElementById('worldTransitionOverlay');
    if (!transitionOverlay) {
        transitionOverlay = document.createElement('div');
        transitionOverlay.id = 'worldTransitionOverlay';
        transitionOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #000; opacity: 0; pointer-events: none;
            transition: opacity 0.5s ease; z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', sans-serif; color: #fff; font-size: 2rem;
        `;
        document.body.appendChild(transitionOverlay);
    }
    return transitionOverlay;
}

export function registerWorld(worldId, worldModule) {
    registeredWorlds[worldId] = worldModule;
}

export function getCurrentWorldId() {
    return currentWorldId;
}

export function getCurrentWorld() {
    return currentWorld;
}

export function getRegisteredWorlds() {
    return registeredWorlds;
}

export async function loadWorld(worldId, spawnPoint) {
    const worldModule = registeredWorlds[worldId];
    if (!worldModule) {
        console.error(`World not found: ${worldId}`);
        return false;
    }

    // Cleanup current world if any
    if (currentWorld) {
        currentWorld.cleanup(scene);
    }

    currentWorld = worldModule;
    currentWorldId = worldId;

    // Apply world config (sky, fog, lighting)
    const config = worldModule.config;
    if (config) {
        if (config.skyColor !== undefined) {
            scene.background = new THREE.Color(config.skyColor);
        }
        if (config.fogColor !== undefined && config.fogNear !== undefined) {
            scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar || 400);
        }
        if (config.ambientLightIntensity !== undefined && ambientLight) {
            ambientLight.intensity = config.ambientLightIntensity;
        }
        if (config.ambientLightColor !== undefined && ambientLight) {
            ambientLight.color.set(config.ambientLightColor);
        }
    }

    // Initialize the world
    worldModule.init(scene);

    // Position player at spawn point
    if (spawnPoint) {
        player.position.set(spawnPoint.x, spawnPoint.y || 0.5, spawnPoint.z);
    }

    // Update game state
    setGameState({ currentWorldId: worldId });
    emit('world:transition', { worldId });

    return true;
}

export async function transitionTo(worldId, spawnPoint) {
    if (isTransitioning) return;
    isTransitioning = true;

    const overlay = createTransitionOverlay();
    const worldModule = registeredWorlds[worldId];
    const worldName = worldModule?.config?.name || worldId;
    const fromWorldId = currentWorldId;

    // Fade to black. If a transit lesson exists, the lesson overlay
    // takes over below — keep this overlay text empty so the two don't
    // visually compete.
    const showsTransit = hasTransit(fromWorldId, worldId);
    overlay.textContent = showsTransit ? '' : worldName;
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';

    await new Promise(resolve => setTimeout(resolve, 600));

    // Portal-as-lesson: if we have transit data for this edge, show the
    // molecule transformation animation BEFORE the world swap. Player
    // sees the reaction; then materializes in the new world.
    if (showsTransit) {
        await playTransit(fromWorldId, worldId);
    }

    // Load the new world
    await loadWorld(worldId, spawnPoint);

    // Brief pause showing world name (skipped when transit already taught it)
    if (!showsTransit) {
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Fade in
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';

    await new Promise(resolve => setTimeout(resolve, 500));

    isTransitioning = false;
    showFeedback(`Entering ${worldName}`, 3000);
}

export function updateCurrentWorld(delta, elapsedTime) {
    if (currentWorld && currentWorld.update && !isTransitioning) {
        currentWorld.update(delta, elapsedTime);
    }
}

export function getIsTransitioning() {
    return isTransitioning;
}

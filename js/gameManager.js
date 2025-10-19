// js/gameManager.js
import * as THREE from 'three';
import { player } from './playerManager.js';
import { showFeedback } from './uiManager.js';
import { getGameState, setGameState, setHealth, removeFromInventory, getInventory } from './gameState.js';

let isRespawning = false;
const respawnPosition = new THREE.Vector3(-10, 0, -5); // Default spawn position away from bridge

function showDeathScreen(deathReason = "fell") {
    let deathScreen = document.getElementById('deathScreen');
    if (!deathScreen) {
        deathScreen = document.createElement('div');
        deathScreen.id = 'deathScreen';
        document.body.appendChild(deathScreen);
    }

    let message = "You fell off the edge!";
    if (deathReason === "river") {
        message = "You fell into the river!";
    } else if (deathReason === "ammonia") {
        message = "You died from ammonia poisoning!";
    }

    deathScreen.innerHTML = `
        <h1>${message}</h1>
        <p>Respawning...</p>
    `;

    deathScreen.style.display = 'flex';
}

function hideDeathScreen() {
    const deathScreen = document.getElementById('deathScreen');
    if (deathScreen) {
        deathScreen.style.display = 'none';
    }
}

export function handlePlayerDeath(deathReason = "fell") {
    if (isRespawning) return;

    isRespawning = true;
    setGameState({ isUserInteracting: true }); // Freeze player controls

    showDeathScreen(deathReason);

    setTimeout(() => {
        // Reset player position and state
        player.position.copy(respawnPosition);
        player.userData.verticalVelocity = 0;

        // If died from ammonia, remove it from inventory and reset health
        if (deathReason === "ammonia") {
            const inventory = getInventory();
            if (inventory['NH3'] && inventory['NH3'] > 0) {
                removeFromInventory('NH3', inventory['NH3']);
            }
            setHealth(100); // Reset health to full
        }

        hideDeathScreen();
        setGameState({ isUserInteracting: false });
        isRespawning = false;

        if (deathReason === "river") {
            showFeedback("The river is too dangerous! Use the bridge to cross.", 3000);
        } else if (deathReason === "ammonia") {
            showFeedback("Ammonia is extremely toxic! Take it to Casper's cauldron immediately!", 4000);
        } else {
            showFeedback("Be careful not to fall off the edge!", 3000);
        }
    }, 2000);
}

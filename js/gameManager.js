// js/gameManager.js
import * as THREE from 'three';
import { player } from './playerManager.js';
import { showFeedback } from './uiManager.js';
import { getGameState, setGameState } from './gameState.js';

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
        player.position.copy(respawnPosition);
        player.userData.verticalVelocity = 0;
        hideDeathScreen();
        setGameState({ isUserInteracting: false });
        isRespawning = false;
        
        if (deathReason === "river") {
            showFeedback("The river is too dangerous! Use the bridge to cross.", 3000);
        } else {
            showFeedback("Be careful not to fall off the edge!", 3000);
        }
    }, 2000);
}

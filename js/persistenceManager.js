// js/persistenceManager.js
import { getGameState, setGameState } from './gameState.js';
import { player } from './playerManager.js';
import { updateInventoryUI, updateQuestUI, showFeedback } from './uiManager.js';

// Save game functionality
export function saveGame() {
    const gameState = getGameState();
    const saveData = {
        inventory: gameState.inventory,
        currentQuest: gameState.currentQuest,
        playerLocation: gameState.playerLocation,
        hasPortalPermission: gameState.hasPortalPermission,
        playerPosition: {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z
        },
        timestamp: Date.now()
    };
    localStorage.setItem('metabolonSaveGame', JSON.stringify(saveData));
    // Show a subtle save indicator in the corner
    let saveIndicator = document.getElementById('saveIndicator');
    if (!saveIndicator) {
        saveIndicator = document.createElement('div');
        saveIndicator.id = 'saveIndicator';
        document.body.appendChild(saveIndicator);
    }
    saveIndicator.textContent = '✓ Saved';
    saveIndicator.style.opacity = '1';
    setTimeout(() => {
        saveIndicator.style.opacity = '0';
    }, 1000);
}

// Load game functionality
export function loadGame() {
    const savedDataStr = localStorage.getItem('metabolonSaveGame');
    if (!savedDataStr) {
        showFeedback('No save game found', 2000);
        return false;
    }
    
    try {
        const saveData = JSON.parse(savedDataStr);
        const newGameState = {
            inventory: saveData.inventory || {},
            currentQuest: saveData.currentQuest || null,
            playerLocation: saveData.playerLocation || 'mitochondria',
            hasPortalPermission: saveData.hasPortalPermission || false,
        };
        setGameState(newGameState);
        
        // Update UI
        updateInventoryUI(newGameState.inventory);
        updateQuestUI(newGameState.currentQuest);
        
        // Restore player position
        if (saveData.playerPosition) {
            player.position.set(
                saveData.playerPosition.x,
                saveData.playerPosition.y,
                saveData.playerPosition.z
            );
        }
        
        showFeedback('Game loaded!', 2000);
        return true;
    } catch (error) {
        console.error('Error loading save game:', error);
        showFeedback('Failed to load save game', 2000);
        return false;
    }
}

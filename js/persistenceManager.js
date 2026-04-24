// js/persistenceManager.js
import { getGameState, setGameState, setHealth } from './gameState.js';
import { player } from './playerManager.js';
import { updateInventoryUI, updateQuestUI, showFeedback } from './uiManager.js';
import { transitionTo } from './sceneManager.js';

const SAVE_VERSION = 1;

// Migrate save data from older schema versions to the current one.
// Add new migration blocks here as the schema evolves.
function migrateData(data) {
    const version = data.version || 0;
    // Example future migration: if (version < 2) { data.newField = defaultValue; }
    if (version < SAVE_VERSION) {
        data.version = SAVE_VERSION;
    }
    return data;
}

// Save game functionality
export function saveGame() {
    const gameState = getGameState();
    const saveData = {
        version: SAVE_VERSION,
        inventory: gameState.inventory,
        currentQuest: gameState.currentQuest,
        playerLocation: gameState.playerLocation,
        hasPortalPermission: gameState.hasPortalPermission,
        health: gameState.health,
        ammoniaCollectedCount: gameState.ammoniaCollectedCount,
        hasVisitedGraveyard: gameState.hasVisitedGraveyard,
        playerPosition: {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z
        },
        // Multi-world state
        currentWorldId: gameState.currentWorldId || 'urea-cycle',
        abilities: gameState.abilities || [],
        unlockedWorlds: gameState.unlockedWorlds || ['urea-cycle'],
        worldProgress: gameState.worldProgress || {},
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
        const saveData = migrateData(JSON.parse(savedDataStr));
        const newGameState = {
            inventory: saveData.inventory || {},
            currentQuest: saveData.currentQuest || null,
            playerLocation: saveData.playerLocation || 'mitochondria',
            hasPortalPermission: saveData.hasPortalPermission || false,
            ammoniaCollectedCount: saveData.ammoniaCollectedCount || 0,
            hasVisitedGraveyard: saveData.hasVisitedGraveyard || false,
            // Multi-world state
            currentWorldId: saveData.currentWorldId || 'urea-cycle',
            abilities: saveData.abilities || [],
            unlockedWorlds: saveData.unlockedWorlds || ['urea-cycle'],
            worldProgress: saveData.worldProgress || {},
        };
        setGameState(newGameState);

        // Restore health (default to 100 for older saves)
        setHealth(saveData.health != null ? saveData.health : 100);


        // Update UI
        updateInventoryUI(newGameState.inventory);
        updateQuestUI(newGameState.currentQuest);

        // Transition to the saved world (loadWorld inside sets the player position)
        const targetWorldId = saveData.currentWorldId || 'urea-cycle';
        const spawnPoint = saveData.playerPosition || undefined;
        transitionTo(targetWorldId, spawnPoint);

        showFeedback('Game loaded!', 2000);
        return true;
    } catch (error) {
        console.error('Error loading save game:', error);
        showFeedback('Failed to load save game', 2000);
        return false;
    }
}

// js/gameState.js
import { updateInventoryUI, updateQuestUI } from './uiManager.js';

let gameState = {
    isUserInteracting: false,
    inventory: {},
    currentQuest: null,
    playerLocation: 'mitochondria',
    hasPortalPermission: false,
};

export function getGameState() { 
    return gameState; 
}

export function setGameState(newState) { 
    gameState = { ...gameState, ...newState }; 
}

export function getInventory() { 
    return gameState.inventory; 
}

export function addToInventory(itemName, quantity = 1) {
    gameState.inventory[itemName] = (gameState.inventory[itemName] || 0) + quantity;
    updateInventoryUI(gameState.inventory);
}

export function removeFromInventory(itemName, quantity = 1) {
    if (gameState.inventory[itemName] && gameState.inventory[itemName] >= quantity) {
        gameState.inventory[itemName] -= quantity;
        if (gameState.inventory[itemName] === 0) {
            delete gameState.inventory[itemName];
        }
        updateInventoryUI(gameState.inventory);
        return true;
    }
    return false;
}

export function getCurrentQuest() { 
    return gameState.currentQuest; 
}

export function setCurrentQuest(quest) {
    gameState.currentQuest = quest;
    updateQuestUI(gameState.currentQuest);
}

export function advanceCurrentQuestState(newState) {
    if (gameState.currentQuest) {
        gameState.currentQuest.state = newState;
        updateQuestUI(gameState.currentQuest);
    }
}

export function getPlayerLocation() { 
    return gameState.playerLocation; 
}

export function setPlayerLocation(location) { 
    gameState.playerLocation = location; 
}

export function setPortalPermission(hasPermission) {
    gameState.hasPortalPermission = hasPermission;
}

export function hasPortalPermission() {
    return gameState.hasPortalPermission;
}

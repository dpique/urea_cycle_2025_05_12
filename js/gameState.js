// js/gameState.js
import { updateInventoryUI, updateQuestUI } from './uiManager.js';

let gameState = {
    isUserInteracting: false,
    inventory: {},
    currentQuest: null,
    playerLocation: 'mitochondria',
    hasPortalPermission: false,
    health: 100, // Player health (0-100)
    maxHealth: 100,
    ammoniaCollectedCount: 0, // Track how many NH3 deposited in cauldron
    hasVisitedGraveyard: false, // Track first-time graveyard visit
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

export function getHealth() {
    return gameState.health;
}

export function setHealth(health) {
    gameState.health = Math.max(0, Math.min(gameState.maxHealth, health));
    updateHealthUI();
}

export function damageHealth(amount) {
    setHealth(gameState.health - amount);
}

export function healHealth(amount) {
    setHealth(gameState.health + amount);
}

export function getAmmoniaCollectedCount() {
    return gameState.ammoniaCollectedCount;
}

export function incrementAmmoniaCollectedCount() {
    gameState.ammoniaCollectedCount++;
}

// Update health UI
function updateHealthUI() {
    const healthBar = document.getElementById('healthBar');
    const healthText = document.getElementById('healthText');
    if (healthBar && healthText) {
        healthBar.style.width = `${gameState.health}%`;
        healthText.textContent = `${Math.floor(gameState.health)}`;

        // Change color based on health
        if (gameState.health > 60) {
            healthBar.style.backgroundColor = '#4CAF50'; // Green
        } else if (gameState.health > 30) {
            healthBar.style.backgroundColor = '#FFA500'; // Orange
        } else {
            healthBar.style.backgroundColor = '#F44336'; // Red
        }
    }
}

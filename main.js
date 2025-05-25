// main.js
import * as THREE from 'three';
import * as CONSTANTS from './js/constants.js';
import { initScene, scene, camera, renderer, controls } from './js/sceneSetup.js';
import { initWorld, collidableWalls, wallBoundingBoxes, updateResourceHover, getPortalBarrier } from './js/worldManager.js';
import { initPlayer, player, keysPressed as playerKeysPressed, updatePlayer } from './js/playerManager.js';
import { initNPCs, updateNPCs } from './js/npcManager.js';
import { initUIManager, updateInventoryUI, updateQuestUI, showFeedback } from './js/uiManager.js';
import { initQuests, ureaCycleQuestData, startUreaCycleQuest as startUreaQuestInManager, advanceUreaCycleQuest as advanceUreaQuestInManager } from './js/questManager.js'; // Aliased imports
import { getAudioContext } from './js/audioManager.js';
import { updateInteraction, interactWithObject, getClosestInteractiveObject } from './js/interactionManager.js';
import { updateSimpleParticleSystems } from './js/utils.js';

export const dialogueBox = document.getElementById('dialogueBox');
export const realityRiverUI = document.getElementById('realityRiver');

let gameState = {
    isUserInteracting: false,
    inventory: {},
    currentQuest: null,
    playerLocation: 'mitochondria',
    hasPortalPermission: false,
    startUreaCycleQuest: () => startUreaQuestInManager(), // Use the imported and aliased function
    advanceUreaCycleQuest: (newState) => advanceUreaQuestInManager(newState) // Use the imported and aliased function
};

export function getGameState() { return gameState; }
export function setGameState(newState) { gameState = { ...gameState, ...newState }; }
export function getInventory() { return gameState.inventory; }
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
export function getCurrentQuest() { return gameState.currentQuest; }

// Modified setCurrentQuestInMain to ensure UI update
export function setCurrentQuestInMain(quest) {
    gameState.currentQuest = quest;
    updateQuestUI(gameState.currentQuest); // Ensure UI updates when quest is set/cleared
}
// Modified advanceCurrentQuestStateInMain to ensure UI update
export function advanceCurrentQuestStateInMain(newState) {
    if (gameState.currentQuest) {
        gameState.currentQuest.state = newState;
        updateQuestUI(gameState.currentQuest); // Crucial: Update UI after state change
    }
}
export function getPlayerLocation() { return gameState.playerLocation; }
export function setPlayerLocation(location) { gameState.playerLocation = location; }


const canvasElement = document.getElementById('gameCanvas');
initScene(canvasElement);
initUIManager(); // Initializes UI element references
initPlayer(scene);
initWorld(scene);
initNPCs(scene);
initQuests();

updateInventoryUI(gameState.inventory);
updateQuestUI(gameState.currentQuest);

// Initial instructions
setTimeout(() => {
    showFeedback("Welcome to Metabolon! Use W/A/S/D or Arrow Keys to move. Press E to interact.", 6000);
}, 1000);


const playerBoundingBox = new THREE.Box3();
function checkPlayerCollision(nextPlayerPos) {
    const playerHeightOffset = new THREE.Vector3(0, CONSTANTS.PLAYER_TOTAL_HEIGHT / 2, 0);
    const playerSize = new THREE.Vector3(CONSTANTS.PLAYER_RADIUS * 2, CONSTANTS.PLAYER_TOTAL_HEIGHT, CONSTANTS.PLAYER_RADIUS * 2);
    playerBoundingBox.setFromCenterAndSize(nextPlayerPos.clone().add(playerHeightOffset), playerSize);

    for (const wallBox of wallBoundingBoxes) {
        if (playerBoundingBox.intersectsBox(wallBox)) {
            return true;
        }
    }
    return false;
}

document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'e' && getClosestInteractiveObject() && !gameState.isUserInteracting) {
        // Check if major UI elements are hidden before allowing interaction
        if (dialogueBox.classList.contains('hidden') && realityRiverUI.classList.contains('hidden')) {
            interactWithObject(getClosestInteractiveObject(), scene);
        }
    }
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to prevent large jumps
    const elapsedTime = clock.getElapsedTime();

    updatePlayer(delta, gameState.isUserInteracting, checkPlayerCollision);
    updateNPCs(delta, elapsedTime);
    updateSimpleParticleSystems(delta);
    updateResourceHover(elapsedTime);
    updateInteraction(scene); // This will handle highlighting

    // Player location update based on portal passage (if barrier is down)
    if (!getPortalBarrier()) { // Check if portal barrier is removed
        const currentX = player.position.x;
        const prevLocation = getPlayerLocation();
        if (currentX > CONSTANTS.DIVIDING_WALL_X + CONSTANTS.PLAYER_RADIUS && prevLocation === 'mitochondria') {
            setPlayerLocation('cytosol');
            showFeedback("You are entering the Cytosol", 3000);
        } else if (currentX < CONSTANTS.DIVIDING_WALL_X - CONSTANTS.PLAYER_RADIUS && prevLocation === 'cytosol') {
            setPlayerLocation('mitochondria');
            showFeedback("You are entering the Mitochondria", 3000);
        }
    }
    
    renderer.render(scene, camera);
}

// Initialize audio context on first user gesture (implicitly handled by interaction sounds)
getAudioContext(); 
animate();
console.log("Metabolon RPG Initialized (v33 - Highlighting, NPC Pace, Alcove, Text, Instructions, Feedback Polish).");
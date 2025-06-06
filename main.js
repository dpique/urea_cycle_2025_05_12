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

// Placeholder survey links - replace with actual links
const PRE_SURVEY_LINK = "https://forms.gle/yourpretestsurvey";
const POST_SURVEY_LINK = "https://forms.gle/yourposttestsurvey";
const FEEDBACK_SURVEY_LINK = "https://forms.gle/yourfeedbacksurvey";


let gameState = {
    isUserInteracting: false,
    inventory: {},
    currentQuest: null,
    playerLocation: 'mitochondria',
    hasPortalPermission: false,
    startUreaCycleQuest: () => startUreaQuestInManager(), 
    advanceUreaCycleQuest: (newState) => advanceUreaQuestInManager(newState) 
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

export function setCurrentQuestInMain(quest) {
    gameState.currentQuest = quest;
    updateQuestUI(gameState.currentQuest); 
}
export function advanceCurrentQuestStateInMain(newState) {
    if (gameState.currentQuest) {
        gameState.currentQuest.state = newState;
        updateQuestUI(gameState.currentQuest); 
    }
}
export function getPlayerLocation() { return gameState.playerLocation; }
export function setPlayerLocation(location) { gameState.playerLocation = location; }


const canvasElement = document.getElementById('gameCanvas');
initScene(canvasElement);
initUIManager(); 
initPlayer(scene);
initWorld(scene);
initNPCs(scene);
initQuests();

updateInventoryUI(gameState.inventory);
updateQuestUI(gameState.currentQuest);


function setupExternalLinks() {
    const feedbackButton = document.getElementById('feedbackButton');
    const preTestSurveyButton = document.getElementById('preTestSurveyButton');
    const postTestSurveyButton = document.getElementById('postTestSurveyButton');

    if (feedbackButton) {
        feedbackButton.addEventListener('click', () => {
            window.open(FEEDBACK_SURVEY_LINK, '_blank');
        });
    }
    if (preTestSurveyButton) {
        preTestSurveyButton.addEventListener('click', () => {
            window.open(PRE_SURVEY_LINK, '_blank');
        });
    }
    if (postTestSurveyButton) {
        postTestSurveyButton.addEventListener('click', () => {
            window.open(POST_SURVEY_LINK, '_blank');
        });
    }
}
setupExternalLinks();


// Initial instructions
setTimeout(() => {
    showFeedback("Welcome to Metabolon! Use W/A/S/D or Arrow Keys to move. Press E to interact, and Spacebar to jump.", 6000);
}, 1000);


const playerBoundingBox = new THREE.Box3();
function checkPlayerCollision(nextPlayerPos) {
    const playerHeightOffset = new THREE.Vector3(0, CONSTANTS.PLAYER_TOTAL_HEIGHT / 2, 0);
    // Adjust bounding box slightly for bridge - make it a bit taller to avoid clipping through low bridge edges if any
    const playerSize = new THREE.Vector3(CONSTANTS.PLAYER_RADIUS * 2, CONSTANTS.PLAYER_TOTAL_HEIGHT, CONSTANTS.PLAYER_RADIUS * 2);
    
    const tempPlayerPos = nextPlayerPos.clone();
    // If player is near bridge height, ensure collision checks are done at that height.
    if (Math.abs(tempPlayerPos.y - CONSTANTS.BRIDGE_HEIGHT) < 0.1) {
        tempPlayerPos.y = CONSTANTS.BRIDGE_HEIGHT;
    }
    
    playerBoundingBox.setFromCenterAndSize(tempPlayerPos.clone().add(playerHeightOffset), playerSize);


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
        if (dialogueBox.classList.contains('hidden') && realityRiverUI.classList.contains('hidden')) {
            interactWithObject(getClosestInteractiveObject(), scene);
        }
    }
    // Space is only for hopping/jumping, not interaction
    if (key === ' ' && !gameState.isUserInteracting) {
        // Hop/jump mechanic
        if (player.position.y <= 0.05) { // On ground
            player.userData.verticalVelocity = 0.32; // Higher hop strength
        }
    }
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1); 
    const elapsedTime = clock.getElapsedTime();

    // Player Y position adjustment for bridge
    const playerX = player.position.x;
    const playerZ = player.position.z;
    if (playerX > CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_WIDTH / 2 &&
        playerX < CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_WIDTH / 2 &&
        playerZ > CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_LENGTH / 2 &&
        playerZ < CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_LENGTH / 2) {
        player.position.y = CONSTANTS.BRIDGE_HEIGHT; // Snap to bridge height
    } else if (player.position.y > 0.05) { // Simple gravity if not on bridge and above ground
        player.position.y = Math.max(0, player.position.y - 0.1); // Fall back to ground slowly
    }

    // Gravity and hop
    if (!player.userData.verticalVelocity) player.userData.verticalVelocity = 0;
    if (player.position.y > 0.01 || player.userData.verticalVelocity > 0) {
        player.position.y += player.userData.verticalVelocity;
        player.userData.verticalVelocity -= 0.012; // Gravity
        if (player.position.y <= 0.01) {
            player.position.y = 0.01;
            player.userData.verticalVelocity = 0;
        }
    }

    updatePlayer(delta, gameState.isUserInteracting, checkPlayerCollision);
    updateNPCs(delta, elapsedTime);
    updateSimpleParticleSystems(delta);
    updateResourceHover(elapsedTime);
    updateInteraction(scene); 

    // Player location update based on X position relative to river/bridge center
    if (!getPortalBarrier()) { 
        const currentX = player.position.x;
        const prevLocation = getPlayerLocation();
        if (currentX > CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH / 2 && prevLocation === 'mitochondria') {
            setPlayerLocation('cytosol');
            showFeedback("You are entering the Cytosol", 3000);
        } else if (currentX < CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH / 2 && prevLocation === 'cytosol') {
            setPlayerLocation('mitochondria');
            showFeedback("You are entering the Mitochondria", 3000);
        }
    }
    
    renderer.render(scene, camera);
}

getAudioContext(); 
animate();
console.log("Metabolon RPG Initialized (v34 - Spacebar, Art Style, Surveys, Bridge, Outdoor, Fixed Rocks, Pizzazz).");
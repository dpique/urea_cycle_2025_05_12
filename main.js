// main.js
import * as THREE from 'three';
import * as CONSTANTS from './js/constants.js';
import { initScene, scene, camera, renderer, controls } from './js/sceneSetup.js';
import { initWorld, collidableWalls, wallBoundingBoxes, updateResourceHover, getPortalBarrier, interactiveObjects, getTerrainHeightAt } from './js/worldManager.js';
import { initPlayer, player, keysPressed as playerKeysPressed, updatePlayer } from './js/playerManager.js';
import { initNPCs, updateNPCs, getNPCs } from './js/npcManager.js';
import { initUIManager, updateInventoryUI, updateQuestUI, showFeedback, createQuestMarker, updateQuestMarker, hideQuestMarker } from './js/uiManager.js';
import { initQuests, ureaCycleQuestData, startUreaCycleQuest as startUreaQuestInManager, advanceUreaCycleQuest as advanceUreaQuestInManager } from './js/questManager.js'; // Aliased imports
import { getAudioContext } from './js/audioManager.js';
import { updateInteraction, interactWithObject, getClosestInteractiveObject } from './js/interactionManager.js';
import { updateSimpleParticleSystems } from './js/utils.js';
import { initMinimap, updateMinimap, toggleMinimap, addToPathHistory } from './js/minimap.js';

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

// Save game functionality
export function saveGame() {
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
        saveIndicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.5);
            color: #88ff88;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 0.8em;
            z-index: 100;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;
        document.body.appendChild(saveIndicator);
    }
    saveIndicator.textContent = '✓ Saved';
    saveIndicator.style.opacity = '1';
    setTimeout(() => {
        saveIndicator.style.opacity = '0';
    }, 1000);
}

export function loadGame() {
    const savedDataStr = localStorage.getItem('metabolonSaveGame');
    if (!savedDataStr) {
        showFeedback('No save game found', 2000);
        return false;
    }
    
    try {
        const saveData = JSON.parse(savedDataStr);
        gameState.inventory = saveData.inventory || {};
        gameState.currentQuest = saveData.currentQuest || null;
        gameState.playerLocation = saveData.playerLocation || 'mitochondria';
        gameState.hasPortalPermission = saveData.hasPortalPermission || false;
        
        // Update UI
        updateInventoryUI(gameState.inventory);
        updateQuestUI(gameState.currentQuest);
        
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
export function advanceCurrentQuestStateInMain(newState) {
    if (gameState.currentQuest) {
        gameState.currentQuest.state = newState;
        updateQuestUI(gameState.currentQuest); 
    }
}
export function getPlayerLocation() { return gameState.playerLocation; }
export function setPlayerLocation(location) { gameState.playerLocation = location; }

// Death and respawn mechanics
let isRespawning = false;
const respawnPosition = new THREE.Vector3(-10, 0, -5); // Default spawn position away from bridge

function handlePlayerDeath(deathReason = "fell") {
    if (isRespawning) return;
    
    isRespawning = true;
    gameState.isUserInteracting = true; // Freeze player controls
    
    // Show death message
    showDeathScreen(deathReason);
    
    // Respawn after 2 seconds
    setTimeout(() => {
        player.position.copy(respawnPosition);
        player.userData.verticalVelocity = 0;
        hideDeathScreen();
        gameState.isUserInteracting = false;
        isRespawning = false;
        
        // Context-specific feedback
        if (deathReason === "river") {
            showFeedback("The river is too dangerous! Use the bridge to cross.", 3000);
        } else {
            showFeedback("Be careful not to fall off the edge!", 3000);
        }
    }, 2000);
}

function showDeathScreen(deathReason = "fell") {
    let deathScreen = document.getElementById('deathScreen');
    if (!deathScreen) {
        deathScreen = document.createElement('div');
        deathScreen.id = 'deathScreen';
        deathScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: sans-serif;
        `;
        document.body.appendChild(deathScreen);
    }
    
    // Update message based on death reason
    let message = "You fell off the edge!";
    if (deathReason === "river") {
        message = "You fell into the river!";
    }
    
    deathScreen.innerHTML = `
        <h1 style="font-size: 3em; margin-bottom: 20px;">${message}</h1>
        <p style="font-size: 1.5em;">Respawning...</p>
    `;
    
    deathScreen.style.display = 'flex';
}

function hideDeathScreen() {
    const deathScreen = document.getElementById('deathScreen');
    if (deathScreen) {
        deathScreen.style.display = 'none';
    }
}


const canvasElement = document.getElementById('gameCanvas');
initScene(canvasElement);
initUIManager(); 
initPlayer(scene);
initWorld(scene);
initNPCs(scene);
initQuests();
initMinimap();

updateInventoryUI(gameState.inventory);
updateQuestUI(gameState.currentQuest);

// Initialize quest marker system
createQuestMarker();


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
    showFeedback("Welcome to Metabolon! Use W/A/S/D or Arrow Keys to move. Press E to interact with objects and NPCs. Press Spacebar to jump. Press H for help.", 6000);
}, 1000);

// Auto-save every 30 seconds
setInterval(() => {
    if (gameState.currentQuest) {
        saveGame();
    }
}, 30000);

// Check for existing save on startup
setTimeout(() => {
    const savedDataStr = localStorage.getItem('metabolonSaveGame');
    if (savedDataStr) {
        showFeedback("Save game found. Press F9 to load your previous game.", 4000);
    }
}, 2000);


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
        const terrainHeight = getTerrainHeightAt(player.position.x, player.position.z);
        const currentHeight = player.position.y;
        const playerZ = player.position.z;
        const bridgeMinZ = CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH / 2;
        const bridgeMaxZ = CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH / 2;
        const nearBridge = playerZ > bridgeMinZ && playerZ < bridgeMaxZ;
        
        const onGround = Math.abs(currentHeight - terrainHeight) < 0.1 || 
                        (nearBridge && currentHeight < CONSTANTS.BRIDGE_HEIGHT + 0.1 && currentHeight > CONSTANTS.BRIDGE_HEIGHT - 0.1);
        
        if (onGround && (!player.userData.verticalVelocity || player.userData.verticalVelocity <= 0)) { // On ground or bridge
            player.userData.verticalVelocity = 0.32; // Higher hop strength
        }
    }
    // H key for help menu
    if (key === 'h' && !gameState.isUserInteracting) {
        window.toggleHelpMenu();
    }
    // G key for glossary
    if (key === 'g' && !gameState.isUserInteracting) {
        window.toggleGlossary();
    }
    // M key for minimap
    if (key === 'm' && !gameState.isUserInteracting) {
        toggleMinimap();
    }
    // F5 key for manual save
    if (event.key === 'F5' && !gameState.isUserInteracting) {
        event.preventDefault();
        if (gameState.currentQuest) {
            saveGame();
        } else {
            showFeedback("Start the quest before saving", 2000);
        }
    }
    // F9 key for load
    if (event.key === 'F9' && !gameState.isUserInteracting) {
        event.preventDefault();
        loadGame();
    }
});

const clock = new THREE.Clock();

// Get quest target position based on current quest state
function getQuestTargetPosition() {
    const quest = getCurrentQuest();
    if (!quest) {
        // No quest - point to Professor Hepaticus
        const npcs = getNPCs();
        const prof = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS);
        return prof ? prof.position : null;
    }
    
    // Get target based on quest state
    const npcs = getNPCs();
    let targetNPC = null;
    
    switch(quest.state) {
        case CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2:
        case CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2:
        case CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE:
        case CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE:
            // Point to the alcove area where resources are
            return new THREE.Vector3(CONSTANTS.ALCOVE_OPENING_X_PLANE - 2, 0, CONSTANTS.ALCOVE_Z_CENTER);
            
        case CONSTANTS.QUEST_STATE.STEP_1_GATHER_MITO_REMAINING:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.CASPER_CPS1);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.CASPER_CPS1);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.OTIS_OTC);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER:
        case CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.ORNITHINE_USHER);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.OTIS_OTC);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL:
            // Point to portal location on bridge
            return new THREE.Vector3(CONSTANTS.BRIDGE_CENTER_X, CONSTANTS.BRIDGE_HEIGHT + 1, CONSTANTS.BRIDGE_CENTER_Z);
            
        case CONSTANTS.QUEST_STATE.STEP_8_GATHER_CYTO:
        case CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.DONKEY);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.ASLAN);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS:
            // Point to where Aslan is (products will be near him)
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.ASLAN);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.FUMARASE_ENZYME);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE:
            // Point to where Fumarase is (Malate will be near)
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.FUMARASE_ENZYME);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.ARGUS);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA:
            // Point to waste bucket
            return new THREE.Vector3(CONSTANTS.MAX_X - 5, 0, CONSTANTS.MAX_Z - 5);
            
        case CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE:
            // Point to bridge for river challenge
            return new THREE.Vector3(CONSTANTS.BRIDGE_CENTER_X, CONSTANTS.BRIDGE_HEIGHT, CONSTANTS.BRIDGE_CENTER_Z);
            
        default:
            return null;
    }
    
    return targetNPC ? targetNPC.position : null;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1); 
    const elapsedTime = clock.getElapsedTime();
    
    // Check if player fell off the edge
    if (player.position.y < -2) {
        handlePlayerDeath();
    }
    
    // Also check if player walked outside world bounds
    if (player.position.x < CONSTANTS.MIN_X - 2 || 
        player.position.x > CONSTANTS.MAX_X + 2 ||
        player.position.z < CONSTANTS.MIN_Z - 2 || 
        player.position.z > CONSTANTS.MAX_Z + 2) {
        handlePlayerDeath();
    }

    // Player Y position adjustment for bridge with smooth transitions
    const playerX = player.position.x;
    const playerZ = player.position.z;
    const rampLength = 4.0;
    const bridgeMinX = CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH / 2 - rampLength;
    const bridgeMaxX = CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2 + rampLength;
    const bridgeMinZ = CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH / 2;
    const bridgeMaxZ = CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH / 2;
    
    // Check if player is on bridge or ramps
    const onBridgeArea = playerX > bridgeMinX && playerX < bridgeMaxX &&
                         playerZ > bridgeMinZ && playerZ < bridgeMaxZ;
    
    // Check if player is in river (and not on bridge)
    const inRiver = playerX > CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH / 2 &&
                    playerX < CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH / 2 &&
                    !onBridgeArea &&
                    player.position.y < 0.5; // Give some leeway for jumping
    
    if (inRiver) {
        handlePlayerDeath("river");
    }
    
    // Check if player should be on ramp (separate from bridge platform)
    const nearBridge = playerZ > bridgeMinZ && playerZ < bridgeMaxZ;
    
    if (nearBridge) {
        let targetY = 0;
        const platformMinX = CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH / 2;
        const platformMaxX = CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2;
        
        // Check for ramps
        if (playerX > bridgeMinX && playerX < platformMinX) {
            // On west ramp - calculate height based on position
            const rampProgress = (playerX - bridgeMinX) / rampLength;
            targetY = CONSTANTS.BRIDGE_HEIGHT * Math.max(0, Math.min(1, rampProgress));
            
            // Smooth transition to ramp height
            const transitionSpeed = 0.15;
            player.position.y = player.position.y + (targetY - player.position.y) * transitionSpeed;
        } else if (playerX > platformMaxX && playerX < bridgeMaxX) {
            // On east ramp
            const rampProgress = (bridgeMaxX - playerX) / rampLength;
            targetY = CONSTANTS.BRIDGE_HEIGHT * Math.max(0, Math.min(1, rampProgress));
            
            // Smooth transition to ramp height
            const transitionSpeed = 0.15;
            player.position.y = player.position.y + (targetY - player.position.y) * transitionSpeed;
        } else if (playerX >= platformMinX && playerX <= platformMaxX) {
            // On main platform - automatically elevate when in bridge area (unless jumping)
            targetY = CONSTANTS.BRIDGE_HEIGHT;
            if (!player.userData.verticalVelocity || player.userData.verticalVelocity <= 0) {
                const transitionSpeed = 0.15;
                player.position.y = player.position.y + (targetY - player.position.y) * transitionSpeed;
            }
        }
    } else {
        // Not on bridge - adjust to terrain height
        const terrainHeight = getTerrainHeightAt(player.position.x, player.position.z);
        const targetY = Math.max(0.01, terrainHeight + 0.01); // Slight offset to prevent sinking
        
        if (player.position.y > targetY + 0.1) {
            // Apply gravity when above terrain
            if (!player.userData.verticalVelocity) player.userData.verticalVelocity = 0;
            player.userData.verticalVelocity -= 0.02; // Gravity
            player.position.y += player.userData.verticalVelocity;
            
            // Ground collision with terrain
            if (player.position.y <= targetY) {
                player.position.y = targetY;
                player.userData.verticalVelocity = 0;
            }
        } else {
            // Smooth terrain following (only if not jumping)
            if (!player.userData.verticalVelocity || player.userData.verticalVelocity <= 0) {
                const terrainSpeed = 0.2;
                player.position.y = player.position.y + (targetY - player.position.y) * terrainSpeed;
            }
        }
    }

    // Apply jump velocity (for both bridge and non-bridge areas)
    if (player.userData.verticalVelocity && player.userData.verticalVelocity > 0) {
        player.position.y += player.userData.verticalVelocity;
        player.userData.verticalVelocity -= 0.02; // Gravity for jumps
        
        // Check for landing
        const currentTerrainHeight = getTerrainHeightAt(player.position.x, player.position.z);
        const landingHeight = onBridgeArea ? CONSTANTS.BRIDGE_HEIGHT : currentTerrainHeight;
        
        if (player.position.y <= landingHeight + 0.01 && player.userData.verticalVelocity < 0) {
            player.position.y = landingHeight + 0.01;
            player.userData.verticalVelocity = 0;
        }
    }

    updatePlayer(delta, gameState.isUserInteracting, checkPlayerCollision);
    updateNPCs(delta, elapsedTime);
    updateSimpleParticleSystems(delta);
    updateResourceHover(elapsedTime);
    updateInteraction(scene);
    
    // Update minimap
    const resources = interactiveObjects.filter(obj => obj.userData.type === 'resource');
    updateMinimap(player, getNPCs(), resources);
    
    // Track player path every few frames
    if (Math.floor(elapsedTime * 10) % 5 === 0) {
        addToPathHistory(player.position);
    }
    
    // Update quest marker
    const questTarget = getQuestTargetPosition();
    if (questTarget) {
        updateQuestMarker(questTarget, camera, renderer);
    } else {
        hideQuestMarker();
    }

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
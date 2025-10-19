// main.js
import * as THREE from 'three';
import * as CONSTANTS from './js/constants.js';
import { initScene, scene, camera, renderer } from './js/sceneSetup.js';
import { initWorld, wallBoundingBoxes, updateResourceHover, getPortalBarrier, interactiveObjects, getTerrainHeightAt } from './js/worldManager.js';
import { initPlayer, player, updatePlayer, toggleCameraMode } from './js/playerManager.js';
import { initNPCs, updateNPCs, getNPCs } from './js/npcManager.js';
import { initUIManager, showFeedback, createQuestMarker, updateQuestMarker, hideQuestMarker } from './js/uiManager.js';
import { initQuests, startUreaCycleQuest, advanceUreaCycleQuest } from './js/questManager.js';
import { getAudioContext, toggleMuteMusic } from './js/audioManager.js';
import { updateInteraction, interactWithObject, getClosestInteractiveObject } from './js/interactionManager.js';
import { updateSimpleParticleSystems } from './js/utils.js';
import { initMinimap, updateMinimap, toggleMinimap, addToPathHistory } from './js/minimap.js';
import { getGameState, getCurrentQuest, getPlayerLocation, setPlayerLocation, getInventory, getHealth, damageHealth, healHealth } from './js/gameState.js';
import { saveGame, loadGame } from './js/persistenceManager.js';
import { handlePlayerDeath } from './js/gameManager.js';
import { initCycleDisplay, updateCycleDisplay } from './js/cycleDisplay.js';
import { NPC_LAYOUT, STATIC_OBJECTS, RESOURCE_SPAWNS, getWorldPosition } from './js/worldLayout.js';

export const dialogueBox = document.getElementById('dialogueBox');
export const realityRiverUI = document.getElementById('realityRiver');

// Placeholder survey links - replace with actual links
const PRE_SURVEY_LINK = "https://forms.gle/yourpretestsurvey";
const POST_SURVEY_LINK = "https://forms.gle/yourposttestsurvey";
const FEEDBACK_SURVEY_LINK = "https://forms.gle/yourfeedbacksurvey";

const canvasElement = document.getElementById('gameCanvas');
initScene(canvasElement);
initUIManager(); 
initPlayer(scene);
initWorld(scene);
initNPCs(scene);
initQuests();
initMinimap();
initCycleDisplay();

// Initialize quest marker system
createQuestMarker();


function setupExternalLinks() {
    const feedbackButton = document.getElementById('feedbackButton');
    const preTestSurveyButton = document.getElementById('preTestSurveyButton');
    const postTestSurveyButton = document.getElementById('postTestSurveyButton');
    const muteButton = document.getElementById('muteButton');

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
    if (muteButton) {
        muteButton.addEventListener('click', () => {
            const isMuted = toggleMuteMusic();
            if (isMuted) {
                muteButton.textContent = '🔇 Unmute Music';
            } else {
                muteButton.textContent = '🔊 Mute Music';
            }
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
    if (getCurrentQuest()) {
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
    const gameState = getGameState();
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
    // C key for camera toggle
    if (key === 'c' && !gameState.isUserInteracting) {
        const modeName = toggleCameraMode();
        showFeedback(`Camera: ${modeName}`, 2000);
    }
    // F5 key for manual save
    if (event.key === 'F5' && !gameState.isUserInteracting) {
        event.preventDefault();
        if (getCurrentQuest()) {
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
        case CONSTANTS.QUEST_STATE.NOT_STARTED:
            // Point to Professor Hepaticus when quest hasn't started yet
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS);
            break;
            
        case CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2:
            // Point to Calvin (he will tell you about Water)
            const calvin = interactiveObjects.find(obj => obj.userData.name === 'Calvin');
            if (calvin) return calvin.position;
            // Fallback using worldLayout
            const calvinPos = getWorldPosition(STATIC_OBJECTS.CALVIN);
            return new THREE.Vector3(calvinPos.x, 0, calvinPos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER:
            // Check if player has Water - if so, point back to Calvin; otherwise point to Water
            const inventory = getInventory();
            if (inventory['Water']) {
                // Player has Water - return to Calvin
                const calvin2 = interactiveObjects.find(obj => obj.userData.name === 'Calvin');
                if (calvin2) return calvin2.position;
                // Fallback using worldLayout
                const calvinPos2 = getWorldPosition(STATIC_OBJECTS.CALVIN);
                return new THREE.Vector3(calvinPos2.x, 0, calvinPos2.z);
            } else {
                // Player needs to get Water from River Guardian
                const water = interactiveObjects.find(obj => obj.userData.name === 'Water');
                if (water) return water.position;
                // Fallback using worldLayout
                const waterPos = getWorldPosition(RESOURCE_SPAWNS.WATER);
                return new THREE.Vector3(waterPos.x, 0, waterPos.z);
            }
            
        case CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2:
            // Point to CO2 Vents
            const co2Vents = interactiveObjects.find(obj => obj.userData.name === 'CO₂ Vents');
            if (co2Vents) return co2Vents.position;
            // Fallback using worldLayout
            const co2VentsPos = getWorldPosition(STATIC_OBJECTS.CO2_VENTS);
            return new THREE.Vector3(co2VentsPos.x, 0, co2VentsPos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE: {
            // Point to Calvin
            const calvin3 = interactiveObjects.find(obj => obj.userData.name === 'Calvin');
            if (calvin3) return calvin3.position;
            // Fallback using worldLayout
            const calvinPos3 = getWorldPosition(STATIC_OBJECTS.CALVIN);
            return new THREE.Vector3(calvinPos3.x, 0, calvinPos3.z);
        }
            
        case CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE:
            // Point to Bicarbonate resource (should be near CAVA Shrine / Calvin)
            const bicarbonate = interactiveObjects.find(obj => obj.userData.name === 'Bicarbonate');
            if (bicarbonate) return bicarbonate.position;
            // Fallback near Calvin
            const calvinPos4 = getWorldPosition(STATIC_OBJECTS.CALVIN);
            return new THREE.Vector3(calvinPos4.x, 0, calvinPos4.z - 1.5);
            
        case CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3:
            // Point to NH3 resource
            const nh3 = interactiveObjects.find(obj => obj.userData.name === 'NH3');
            if (nh3) return nh3.position;
            // Fallback to graveyard area where NH3 spawns
            const graveyardPos = getWorldPosition({ zone: 'GRAVEYARD', offset: { x: 0, z: 0 } });
            return new THREE.Vector3(graveyardPos.x, 0, graveyardPos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP:
            // Point to first ATP in mitochondria
            const firstATP = interactiveObjects.find(obj => obj.userData.name === 'ATP' && obj.position.x < CONSTANTS.RIVER_CENTER_X);
            if (firstATP) return firstATP.position;
            // Fallback to ATP_MITO spawn location
            const atpMitoPos = getWorldPosition(RESOURCE_SPAWNS.ATP_MITO);
            return new THREE.Vector3(atpMitoPos.x, 0, atpMitoPos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP:
            // Point to another ATP in mitochondria (try to find one player hasn't collected)
            const atpArray = interactiveObjects.filter(obj => obj.userData.name === 'ATP' && obj.position.x < CONSTANTS.RIVER_CENTER_X);
            const secondATP = atpArray.find(atp => atp.visible) || atpArray[0];
            if (secondATP) return secondATP.position;
            // Fallback to ATP_ALCOVE spawn location
            const atpAlcovePos = getWorldPosition(RESOURCE_SPAWNS.ATP_ALCOVE);
            return new THREE.Vector3(atpAlcovePos.x, 0, atpAlcovePos.z);
            
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
            // Point to portal location on bridge (center of bridge)
            const bridgePos = getWorldPosition({ zone: 'BRIDGE', offset: { x: 0, z: 0 } });
            return new THREE.Vector3(bridgePos.x, CONSTANTS.BRIDGE_HEIGHT + 1, bridgePos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE:
            // Point to Citrulline on cytosol side of bridge
            const citrulline = interactiveObjects.find(obj => obj.userData.name === 'Citrulline');
            if (citrulline) return citrulline.position;
            // Fallback to east side of bridge
            const bridgePos2 = getWorldPosition({ zone: 'BRIDGE', offset: { x: CONSTANTS.BRIDGE_LENGTH/2 + 0.5, z: 1 } });
            return new THREE.Vector3(bridgePos2.x, CONSTANTS.BRIDGE_HEIGHT, bridgePos2.z);
            
        case CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP:
            // Point to ATP in cytosol
            const atp = interactiveObjects.find(obj => obj.userData.name === 'ATP' && obj.position.x > CONSTANTS.RIVER_CENTER_X);
            if (atp) return atp.position;
            // Fallback to ATP_CYTO spawn location
            const atpCytoPos = getWorldPosition(RESOURCE_SPAWNS.ATP_CYTO);
            return new THREE.Vector3(atpCytoPos.x, 0, atpCytoPos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE:
            // Point to Shuttle Driver
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER);
            break;
            
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
            const wasteBucket = interactiveObjects.find(obj => obj.userData.name === 'Waste Receptacle');
            if (wasteBucket) return wasteBucket.position;
            // Fallback using worldLayout
            const wasteBucketPos = getWorldPosition(STATIC_OBJECTS.WASTE_BUCKET);
            return new THREE.Vector3(wasteBucketPos.x, 0, wasteBucketPos.z);
            
        case CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE:
            // Point to bridge for river challenge
            const bridgePos3 = getWorldPosition({ zone: 'BRIDGE', offset: { x: 0, z: 0 } });
            return new THREE.Vector3(bridgePos3.x, CONSTANTS.BRIDGE_HEIGHT, bridgePos3.z);
            
        default:
            return null;
    }
    
    return targetNPC ? targetNPC.position : null;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1); 
    const elapsedTime = clock.getElapsedTime();
    const gameState = getGameState();
    
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

    // Ammonia toxicity and graveyard area system
    const inventory = getInventory();
    const hasAmmonia = inventory['NH3'] && inventory['NH3'] > 0;
    const healthWarning = document.getElementById('healthWarning');

    // Check if player is in graveyard area
    const graveyardMinX = CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH / 2;
    const graveyardMaxX = CONSTANTS.GRAVEYARD_CENTER_X + CONSTANTS.GRAVEYARD_WIDTH / 2;
    const graveyardMinZ = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2;
    const graveyardMaxZ = CONSTANTS.GRAVEYARD_CENTER_Z + CONSTANTS.GRAVEYARD_DEPTH / 2;
    const inGraveyard = player.position.x > graveyardMinX && player.position.x < graveyardMaxX &&
                        player.position.z > graveyardMinZ && player.position.z < graveyardMaxZ;

    // Track time for graveyard health drain (once every 10 seconds)
    if (!gameState.lastGraveyardDamageTime) {
        gameState.lastGraveyardDamageTime = 0;
    }

    if (hasAmmonia) {
        // Damage health while holding ammonia - scales with amount
        const nh3Count = inventory['NH3'];
        let damageRate;
        if (nh3Count >= 2) {
            damageRate = 3; // 3 health per second for 2+ NH3
        } else {
            damageRate = 1; // 1 health per second for 1 NH3
        }
        damageHealth(damageRate * delta);

        // Show health warning
        if (healthWarning && healthWarning.classList.contains('hidden')) {
            healthWarning.classList.remove('hidden');
        }

        // Check for death from ammonia poisoning
        if (getHealth() <= 0) {
            handlePlayerDeath("ammonia");
        }
    } else if (inGraveyard) {
        // In graveyard but not holding ammonia - slower health drain
        const currentTime = Date.now();
        if (currentTime - gameState.lastGraveyardDamageTime >= 10000) {
            damageHealth(1); // 1 health every 10 seconds
            gameState.lastGraveyardDamageTime = currentTime;
            if (Math.random() < 0.5) {
                showFeedback("*cough* The toxic fumes are affecting you...", 2000);
            }
        }

        // Don't show ammonia warning - only show when actually holding NH3
        // Hide health warning if it's showing
        if (healthWarning && !healthWarning.classList.contains('hidden')) {
            healthWarning.classList.add('hidden');
        }

        // Check for death from graveyard fumes
        if (getHealth() <= 0) {
            handlePlayerDeath("ammonia");
        }
    } else {
        // Not in graveyard and not holding ammonia - slowly recover health
        const currentHealth = getHealth();
        if (currentHealth < 100) {
            healHealth(1 * delta);
        }

        // Hide health warning
        if (healthWarning && !healthWarning.classList.contains('hidden')) {
            healthWarning.classList.add('hidden');
        }
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
            // On main platform - automatically elevate when in bridge area
            targetY = CONSTANTS.BRIDGE_HEIGHT;
            const transitionSpeed = 0.15;
            player.position.y = player.position.y + (targetY - player.position.y) * transitionSpeed;
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
            // Smooth terrain following
            const terrainSpeed = 0.2;
            player.position.y = player.position.y + (targetY - player.position.y) * terrainSpeed;
            player.userData.verticalVelocity = 0;
        }
    }

    // Apply jump velocity
    if (player.userData.verticalVelocity && player.userData.verticalVelocity > 0) {
        player.position.y += player.userData.verticalVelocity;
        player.userData.verticalVelocity -= 0.02; // Gravity for jumps
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
        // Add vertical offset so arrow hovers above the target
        const offsetTarget = questTarget.clone();
        offsetTarget.y += 2.5; // Hover 2.5 units above the actual object
        updateQuestMarker(offsetTarget, camera, renderer);
    } else {
        hideQuestMarker();
    }
    
    // Update cycle display
    updateCycleDisplay();

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

    // Check for first-time graveyard entry
    if (!gameState.hasVisitedGraveyard) {
        const playerX = player.position.x;
        const playerZ = player.position.z;
        const graveyardMinX = CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH / 2;
        const graveyardMaxX = CONSTANTS.GRAVEYARD_CENTER_X + CONSTANTS.GRAVEYARD_WIDTH / 2;
        const graveyardMinZ = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2;
        const graveyardMaxZ = CONSTANTS.GRAVEYARD_CENTER_Z + CONSTANTS.GRAVEYARD_DEPTH / 2;

        // Check if player is inside graveyard bounds
        if (playerX > graveyardMinX && playerX < graveyardMaxX &&
            playerZ > graveyardMinZ && playerZ < graveyardMaxZ) {
            // Mark graveyard as visited
            gameState.hasVisitedGraveyard = true;
            // Show atmospheric dialogue
            setTimeout(() => {
                showFeedback("*cough cough* ...you notice a pungent smell in the air", 4000);
            }, 500);
        }
    }
    
    renderer.render(scene, camera);
}

getAudioContext(); 
animate();
console.log("Metabolon RPG Initialized (v35 - Refactored).");
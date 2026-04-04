// main.js - World-agnostic game loop with SceneManager
import * as THREE from 'three';
import * as CONSTANTS from './js/constants.js';
import { initScene, scene, camera, renderer } from './js/sceneSetup.js';
import { wallBoundingBoxes } from './js/worldManager.js';
import { initPlayer, player, updatePlayer, toggleCameraMode } from './js/playerManager.js';
import { initUIManager, showFeedback, updateHealthUI } from './js/uiManager.js';
import { getAudioContext, toggleMuteMusic } from './js/audioManager.js';
import { getClosestInteractiveObject, interactWithObject } from './js/interactionManager.js';
import { getGameState, getCurrentQuest } from './js/gameState.js';
import { on as onEvent } from './js/eventBus.js';
import { saveGame, loadGame } from './js/persistenceManager.js';
import { handlePlayerDeath } from './js/gameManager.js';
import { registerWorld, loadWorld, updateCurrentWorld, getCurrentWorld, getCurrentWorldId, getIsTransitioning, transitionTo } from './js/sceneManager.js';
import { toggleMinimap } from './js/minimap.js';
import { getWorldTerrainHeight } from './js/worldManager.js';

// Import world modules
import * as ureaCycleWorld from './js/worlds/ureaCycleWorld.js';
import * as tcaCycleWorld from './js/worlds/tcaCycleWorld.js';
import * as glycolysisWorld from './js/worlds/glycolysisWorld.js';

export const dialogueBox = document.getElementById('dialogueBox');
export const realityRiverUI = document.getElementById('realityRiver');


// --- Initialize core systems (world-agnostic) ---
const canvasElement = document.getElementById('gameCanvas');
initScene(canvasElement);
initUIManager();
onEvent('health:change', updateHealthUI);
initPlayer(scene);

// --- Register worlds ---
registerWorld('urea-cycle', ureaCycleWorld);
registerWorld('tca-cycle', tcaCycleWorld);
registerWorld('glycolysis', glycolysisWorld);

// --- Load initial world (TCA is the central hub) ---
loadWorld('tca-cycle', tcaCycleWorld.config.spawnPoint);

// --- Setup UI ---
function setupExternalLinks() {
    const feedbackButton = document.getElementById('feedbackButton');
    const preTestSurveyButton = document.getElementById('preTestSurveyButton');
    const postTestSurveyButton = document.getElementById('postTestSurveyButton');
    const muteButton = document.getElementById('muteButton');

    if (feedbackButton) {
        feedbackButton.addEventListener('click', () => {
            window.open(CONSTANTS.FEEDBACK_SURVEY_LINK, '_blank');
        });
    }
    if (preTestSurveyButton) {
        preTestSurveyButton.addEventListener('click', () => {
            window.open(CONSTANTS.PRE_SURVEY_LINK, '_blank');
        });
    }
    if (postTestSurveyButton) {
        postTestSurveyButton.addEventListener('click', () => {
            window.open(CONSTANTS.POST_SURVEY_LINK, '_blank');
        });
    }
    if (muteButton) {
        muteButton.addEventListener('click', () => {
            const isMuted = toggleMuteMusic();
            muteButton.textContent = isMuted ? '🔇 Unmute Music' : '🔊 Mute Music';
        });
    }
}
setupExternalLinks();

// Welcome message
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

// --- Collision detection (uses current world's walls) ---
const playerBoundingBox = new THREE.Box3();
function checkPlayerCollision(nextPlayerPos) {
    const playerHeightOffset = new THREE.Vector3(0, CONSTANTS.PLAYER_TOTAL_HEIGHT / 2, 0);
    const playerSize = new THREE.Vector3(CONSTANTS.PLAYER_RADIUS * 2, CONSTANTS.PLAYER_TOTAL_HEIGHT, CONSTANTS.PLAYER_RADIUS * 2);

    const tempPlayerPos = nextPlayerPos.clone();
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

// --- Input handling ---
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const gameState = getGameState();

    if (getIsTransitioning()) return;

    if (key === 'e' && getClosestInteractiveObject() && !gameState.isUserInteracting) {
        if (dialogueBox.classList.contains('hidden') && realityRiverUI.classList.contains('hidden')) {
            interactWithObject(getClosestInteractiveObject(), scene);
        }
    }

    if (key === ' ' && !gameState.isUserInteracting) {
        const terrainHeight = getWorldTerrainHeight(player.position.x, player.position.z);
        const currentHeight = player.position.y;
        const bridgeMinZ = CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH / 2;
        const bridgeMaxZ = CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH / 2;
        const nearBridge = player.position.z > bridgeMinZ && player.position.z < bridgeMaxZ;

        const onGround = Math.abs(currentHeight - terrainHeight) < 0.1 ||
                        (nearBridge && currentHeight < CONSTANTS.BRIDGE_HEIGHT + 0.1 && currentHeight > CONSTANTS.BRIDGE_HEIGHT - 0.1);

        if (onGround && (!player.userData.verticalVelocity || player.userData.verticalVelocity <= 0)) {
            player.userData.verticalVelocity = 19.2; // units/s (was 0.32 units/frame @ 60fps)
        }
    }

    if (key === 'h' && !gameState.isUserInteracting) window.toggleHelpMenu();
    if (key === 'g' && !gameState.isUserInteracting) window.toggleGlossary();
    if (key === 'm' && !gameState.isUserInteracting) toggleMinimap();
    if (key === 'c' && !gameState.isUserInteracting) {
        const modeName = toggleCameraMode();
        showFeedback(`Camera: ${modeName}`, 2000);
    }
    if (event.key === 'F5' && !gameState.isUserInteracting) {
        event.preventDefault();
        if (getCurrentQuest()) {
            saveGame();
        } else {
            showFeedback("Start the quest before saving", 2000);
        }
    }
    if (event.key === 'F9' && !gameState.isUserInteracting) {
        event.preventDefault();
        loadGame();
    }
    // T key: cycle through worlds (DEV-only teleport)
    if (import.meta.env.DEV && key === 't' && !gameState.isUserInteracting) {
        const currentId = getCurrentWorldId();
        const cycle = ['tca-cycle', 'urea-cycle', 'glycolysis'];
        const nextIdx = (cycle.indexOf(currentId) + 1) % cycle.length;
        const nextId = cycle[nextIdx];
        const worldMods = { 'tca-cycle': tcaCycleWorld, 'urea-cycle': ureaCycleWorld, 'glycolysis': glycolysisWorld };
        const spawnPoint = worldMods[nextId]?.config?.spawnPoint || { x: 0, y: 0.5, z: 0 };
        transitionTo(nextId, spawnPoint);
    }
});

// --- Main game loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsedTime = clock.getElapsedTime();
    const gameState = getGameState();

    if (getIsTransitioning()) {
        renderer.render(scene, camera);
        return;
    }

    // Generic death checks
    if (player.position.y < -2) {
        handlePlayerDeath();
    }

    // World bounds check (uses current world config if available)
    const world = getCurrentWorld();
    if (world && world.config && world.config.bounds) {
        const b = world.config.bounds;
        if (player.position.x < b.minX - 2 || player.position.x > b.maxX + 2 ||
            player.position.z < b.minZ - 2 || player.position.z > b.maxZ + 2) {
            handlePlayerDeath();
        }
    }

    // Delegate to current world's update (handles all world-specific logic)
    updateCurrentWorld(delta, elapsedTime);

    // Generic player update (movement, animation)
    updatePlayer(delta, gameState.isUserInteracting, checkPlayerCollision);

    renderer.render(scene, camera);
}

getAudioContext();
animate();
console.log("Metabolon RPG Initialized (Multi-World Architecture).");

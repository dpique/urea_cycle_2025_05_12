// js/worlds/ureaCycleWorld.js
// Wraps the existing Urea Cycle game as a world module

import * as THREE from 'three';
import * as CONSTANTS from '../constants.js';
import { initWorld, cleanupWorld, wallBoundingBoxes, updateResourceHover, getPortalBarrier, interactiveObjects, originalMaterials, getTerrainHeightAt, setWorldTerrainFn, addInteractiveObject, setOriginalMaterial } from '../worldManager.js';
import { initNPCs, updateNPCs, getNPCs, cleanupNPCs } from '../npcManager.js';
import { initQuests, startUreaCycleQuest, advanceUreaCycleQuest } from '../questManager.js';
import { initMinimap, updateMinimap, toggleMinimap, addToPathHistory } from '../minimap.js';
import { initCycleDisplay, updateCycleDisplay } from '../cycleDisplay.js';
import { updateInteraction, interactWithObject, getClosestInteractiveObject } from '../interactionManager.js';
import { updateSimpleParticleSystems } from '../utils.js';
import { player } from '../playerManager.js';
import { showFeedback, createQuestMarker, updateQuestMarker, hideQuestMarker } from '../uiManager.js';
import { getGameState, getCurrentQuest, getPlayerLocation, setPlayerLocation, getInventory, getHealth, damageHealth, healHealth } from '../gameState.js';
import { handlePlayerDeath } from '../gameManager.js';
import { NPC_LAYOUT, STATIC_OBJECTS, RESOURCE_SPAWNS, getWorldPosition } from '../worldLayout.js';
import { camera, renderer } from '../sceneSetup.js';
import { transitionTo } from '../sceneManager.js';
import { createTextSprite } from '../utils.js';

export const config = {
    id: 'urea-cycle',
    name: 'The Urea Cycle',
    description: 'Mitochondria & Cytosol - Where ammonia meets its match',
    skyColor: 0x87CEEB,
    fogColor: 0x87CEEB,
    fogNear: 50,
    fogFar: 320,
    ambientLightIntensity: 0.7,
    bounds: {
        minX: CONSTANTS.MIN_X,
        maxX: CONSTANTS.MAX_X,
        minZ: CONSTANTS.MIN_Z,
        maxZ: CONSTANTS.MAX_Z,
    },
    spawnPoint: { x: CONSTANTS.MIN_X + 20, y: 0.5, z: -16 },
    // Portal definitions: where portals lead to other worlds
    portals: [
        {
            targetWorld: 'tca-cycle',
            position: { x: CONSTANTS.MAX_X - 5, y: 0, z: -30 },
            spawnPoint: { x: 0, y: 0.5, z: 45 },
            label: 'TCA Central Crossroads',
            unlockCondition: 'urea-cycle-complete',
        }
    ]
};

let worldScene = null;

export function init(scene) {
    worldScene = scene;
    setWorldTerrainFn(getTerrainHeightAt);
    initWorld(scene);
    initNPCs(scene);
    initQuests();
    initMinimap();
    initCycleDisplay();
    createQuestMarker();
    createTCAPortal(scene);
}

function createTCAPortal(scene) {
    // Portal to TCA Cycle -- placed in the eastern cytosol area
    const portalX = CONSTANTS.MAX_X - 8;
    const portalZ = -30;

    const portalGroup = new THREE.Group();
    portalGroup.position.set(portalX, 0, portalZ);

    // Portal ring
    const portalGeo = new THREE.TorusGeometry(2, 0.25, 8, 20);
    const portalMat = new THREE.MeshStandardMaterial({
        color: 0x6644ff,
        emissive: 0x4422cc,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
    });
    const portalRing = new THREE.Mesh(portalGeo, portalMat);
    portalRing.position.y = 2;
    portalGroup.add(portalRing);

    // Inner glow
    const innerGeo = new THREE.CircleGeometry(1.8, 16);
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x6644ff,
        emissive: 0x4422cc,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 2;
    portalGroup.add(inner);

    // Label
    const label = createTextSprite('TCA Crossroads', { x: 0, y: 4.5, z: 0 }, { scale: 1.3 });
    portalGroup.add(label);

    // Light
    const portalLight = new THREE.PointLight(0x6644ff, 0.8, 10);
    portalLight.position.set(0, 2, 0);
    portalGroup.add(portalLight);

    scene.add(portalGroup);

    // Register as interactive
    portalGroup.userData = {
        name: 'Portal to TCA Crossroads',
        type: 'portal',
        isInteractable: true,
        onInteract: (obj, scn, tools) => {
            const { showDialogue, setGameInteracting } = tools;
            showDialogue("This portal leads to the TCA Central Crossroads -- the metabolic hub of the cell. Travel there?", [
                { text: "Enter the TCA Cycle", action: () => {
                    transitionTo('tca-cycle', { x: 0, y: 0.5, z: 45 });
                }},
                { text: "Not yet" }
            ], setGameInteracting);
        }
    };
    addInteractiveObject(portalGroup);

    const mainMesh = portalRing;
    setOriginalMaterial(mainMesh, mainMesh.material);
    portalGroup.userData.mainMesh = mainMesh;
}

export function update(delta, elapsedTime) {
    if (!worldScene) return;

    const gameState = getGameState();
    const inventory = getInventory();

    // --- Ammonia toxicity ---
    const hasAmmonia = inventory['NH3'] && inventory['NH3'] > 0;
    const healthWarning = document.getElementById('healthWarning');

    const graveyardMinX = CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH / 2;
    const graveyardMaxX = CONSTANTS.GRAVEYARD_CENTER_X + CONSTANTS.GRAVEYARD_WIDTH / 2;
    const graveyardMinZ = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2;
    const graveyardMaxZ = CONSTANTS.GRAVEYARD_CENTER_Z + CONSTANTS.GRAVEYARD_DEPTH / 2;
    const inGraveyard = player.position.x > graveyardMinX && player.position.x < graveyardMaxX &&
                        player.position.z > graveyardMinZ && player.position.z < graveyardMaxZ;

    if (!gameState.lastGraveyardDamageTime) {
        gameState.lastGraveyardDamageTime = 0;
    }

    if (hasAmmonia) {
        const nh3Count = inventory['NH3'];
        const damageRate = nh3Count >= 2 ? 3 : 1;
        damageHealth(damageRate * delta);
        if (healthWarning && healthWarning.classList.contains('hidden')) {
            healthWarning.classList.remove('hidden');
        }
        if (getHealth() <= 0) {
            handlePlayerDeath("ammonia");
        }
    } else if (inGraveyard) {
        const currentTime = Date.now();
        if (currentTime - gameState.lastGraveyardDamageTime >= 10000) {
            damageHealth(1);
            gameState.lastGraveyardDamageTime = currentTime;
            if (Math.random() < 0.5) {
                showFeedback("*cough* The toxic fumes are affecting you...", 2000);
            }
        }
        if (healthWarning && !healthWarning.classList.contains('hidden')) {
            healthWarning.classList.add('hidden');
        }
        if (getHealth() <= 0) {
            handlePlayerDeath("ammonia");
        }
    } else {
        const currentHealth = getHealth();
        if (currentHealth < 100) {
            healHealth(1 * delta);
        }
        if (healthWarning && !healthWarning.classList.contains('hidden')) {
            healthWarning.classList.add('hidden');
        }
    }

    // --- Bridge / ramp physics ---
    const playerX = player.position.x;
    const playerZ = player.position.z;
    const rampLength = 4.0;
    const bridgeMinX = CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH / 2 - rampLength;
    const bridgeMaxX = CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2 + rampLength;
    const bridgeMinZ = CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH / 2;
    const bridgeMaxZ = CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH / 2;
    const onBridgeArea = playerX > bridgeMinX && playerX < bridgeMaxX &&
                         playerZ > bridgeMinZ && playerZ < bridgeMaxZ;

    // River death
    const inRiver = playerX > CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH / 2 &&
                    playerX < CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH / 2 &&
                    !onBridgeArea && player.position.y < 0.5;
    if (inRiver) {
        handlePlayerDeath("river");
    }

    const nearBridge = playerZ > bridgeMinZ && playerZ < bridgeMaxZ;
    if (nearBridge) {
        let targetY = 0;
        const platformMinX = CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH / 2;
        const platformMaxX = CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2;

        if (playerX > bridgeMinX && playerX < platformMinX) {
            const rampProgress = (playerX - bridgeMinX) / rampLength;
            targetY = CONSTANTS.BRIDGE_HEIGHT * Math.max(0, Math.min(1, rampProgress));
            player.position.y += (targetY - player.position.y) * Math.min(1, 9.0 * delta);
        } else if (playerX > platformMaxX && playerX < bridgeMaxX) {
            const rampProgress = (bridgeMaxX - playerX) / rampLength;
            targetY = CONSTANTS.BRIDGE_HEIGHT * Math.max(0, Math.min(1, rampProgress));
            player.position.y += (targetY - player.position.y) * Math.min(1, 9.0 * delta);
        } else if (playerX >= platformMinX && playerX <= platformMaxX) {
            targetY = CONSTANTS.BRIDGE_HEIGHT;
            player.position.y += (targetY - player.position.y) * Math.min(1, 9.0 * delta);
        }
    } else {
        // Terrain following
        const terrainHeight = getTerrainHeightAt(player.position.x, player.position.z);
        const targetY = Math.max(0.01, terrainHeight + 0.01);

        if (player.position.y > targetY + 0.1) {
            if (!player.userData.verticalVelocity) player.userData.verticalVelocity = 0;
            player.userData.verticalVelocity -= 1.2 * delta; // gravity: 0.02/frame → 1.2/s
            player.position.y += player.userData.verticalVelocity * delta;
            if (player.position.y <= targetY) {
                player.position.y = targetY;
                player.userData.verticalVelocity = 0;
            }
        } else {
            player.position.y += (targetY - player.position.y) * Math.min(1, 12.0 * delta);
            player.userData.verticalVelocity = 0;
        }
    }

    // Jump velocity
    if (player.userData.verticalVelocity && player.userData.verticalVelocity > 0) {
        player.position.y += player.userData.verticalVelocity * delta;
        player.userData.verticalVelocity -= 1.2 * delta;
    }

    // --- Update subsystems ---
    updateNPCs(delta, elapsedTime);
    updateSimpleParticleSystems(delta);
    updateResourceHover(elapsedTime);
    updateInteraction(worldScene);

    // Minimap
    const resources = interactiveObjects.filter(obj => obj.userData.type === 'resource');
    updateMinimap(player, getNPCs(), resources);
    if (Math.floor(elapsedTime * 10) % 5 === 0) {
        addToPathHistory(player.position);
    }

    // Quest marker
    const questTarget = getQuestTargetPosition();
    if (questTarget) {
        const offsetTarget = questTarget.clone();
        offsetTarget.y += 2.5;
        updateQuestMarker(offsetTarget, camera, renderer);
    } else {
        hideQuestMarker();
    }

    // Cycle display
    updateCycleDisplay();

    // Player location tracking
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

    // First graveyard visit
    if (!gameState.hasVisitedGraveyard) {
        if (player.position.x > graveyardMinX && player.position.x < graveyardMaxX &&
            player.position.z > graveyardMinZ && player.position.z < graveyardMaxZ) {
            gameState.hasVisitedGraveyard = true;
            setTimeout(() => {
                showFeedback("*cough cough* ...you notice a pungent smell in the air", 4000);
            }, 500);
        }
    }
}

export function cleanup(scene) {
    cleanupNPCs(scene);
    cleanupWorld(scene);
    setWorldTerrainFn(null);
    worldScene = null;
}

export function getSnapshot() {
    // TODO: capture per-world quest state from questManager when needed
    return {};
}

export function restoreSnapshot(_data) {
    // TODO: restore per-world quest state to questManager when needed
}

// Quest target position logic (moved from main.js)
function getQuestTargetPosition() {
    const quest = getCurrentQuest();
    if (!quest) {
        const npcs = getNPCs();
        const prof = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS);
        return prof ? prof.position : null;
    }

    const npcs = getNPCs();
    let targetNPC = null;

    switch(quest.state) {
        case CONSTANTS.QUEST_STATE.NOT_STARTED:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS);
            break;
        case CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2: {
            const calvin = interactiveObjects.find(obj => obj.userData.name === 'Calvin');
            if (calvin) return calvin.position;
            const pos = getWorldPosition(STATIC_OBJECTS.CALVIN);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER: {
            const inv = getInventory();
            if (inv['Water']) {
                const calvin = interactiveObjects.find(obj => obj.userData.name === 'Calvin');
                if (calvin) return calvin.position;
                const pos = getWorldPosition(STATIC_OBJECTS.CALVIN);
                return new THREE.Vector3(pos.x, 0, pos.z);
            } else {
                const water = interactiveObjects.find(obj => obj.userData.name === 'Water');
                if (water) return water.position;
                const pos = getWorldPosition(RESOURCE_SPAWNS.WATER);
                return new THREE.Vector3(pos.x, 0, pos.z);
            }
        }
        case CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2: {
            const co2 = interactiveObjects.find(obj => obj.userData.name === 'CO₂ Vents');
            if (co2) return co2.position;
            const pos = getWorldPosition(STATIC_OBJECTS.CO2_VENTS);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE: {
            const calvin = interactiveObjects.find(obj => obj.userData.name === 'Calvin');
            if (calvin) return calvin.position;
            const pos = getWorldPosition(STATIC_OBJECTS.CALVIN);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE: {
            const bicarb = interactiveObjects.find(obj => obj.userData.name === 'Bicarbonate');
            if (bicarb) return bicarb.position;
            const pos = getWorldPosition(STATIC_OBJECTS.CALVIN);
            return new THREE.Vector3(pos.x, 0, pos.z - 1.5);
        }
        case CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3: {
            const nh3 = interactiveObjects.find(obj => obj.userData.name === 'NH3');
            if (nh3) return nh3.position;
            const pos = getWorldPosition({ zone: 'GRAVEYARD', offset: { x: 0, z: 0 } });
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP: {
            const atp = interactiveObjects.find(obj => obj.userData.name === 'ATP' && obj.position.x < CONSTANTS.RIVER_CENTER_X);
            if (atp) return atp.position;
            const pos = getWorldPosition(RESOURCE_SPAWNS.ATP_MITO);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP: {
            const atpArr = interactiveObjects.filter(obj => obj.userData.name === 'ATP' && obj.position.x < CONSTANTS.RIVER_CENTER_X);
            const atp = atpArr.find(a => a.visible) || atpArr[0];
            if (atp) return atp.position;
            const pos = getWorldPosition(RESOURCE_SPAWNS.ATP_ALCOVE);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_1C_CASPER_NEEDS_COFFEE:
        case CONSTANTS.QUEST_STATE.STEP_1D_TALK_TO_NAGESH:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.NAGESH_NAGS);
            break;
        case CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS: {
            const coffin = interactiveObjects.find(obj => obj.userData.name === 'Coffin Grounds');
            if (coffin) return coffin.position;
            return null;
        }
        case CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE: {
            const ghoul = interactiveObjects.find(obj => obj.userData.name === 'Ghoul Milk');
            if (ghoul) return ghoul.position;
            return null;
        }
        case CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.NAGESH_NAGS);
            break;
        case CONSTANTS.QUEST_STATE.STEP_1H_COLLECT_NAG: {
            const nag = interactiveObjects.find(obj => obj.userData.name === "Ghoul's Coffee");
            if (nag) return nag.position;
            return null;
        }
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
        case CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL: {
            const pos = getWorldPosition({ zone: 'BRIDGE', offset: { x: 0, z: 0 } });
            return new THREE.Vector3(pos.x, CONSTANTS.BRIDGE_HEIGHT + 1, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE: {
            const cit = interactiveObjects.find(obj => obj.userData.name === 'Citrulline');
            if (cit) return cit.position;
            const pos = getWorldPosition({ zone: 'BRIDGE', offset: { x: CONSTANTS.BRIDGE_LENGTH/2 + 0.5, z: 1 } });
            return new THREE.Vector3(pos.x, CONSTANTS.BRIDGE_HEIGHT, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP: {
            const atp = interactiveObjects.find(obj => obj.userData.name === 'ATP' && obj.position.x > CONSTANTS.RIVER_CENTER_X);
            if (atp) return atp.position;
            const pos = getWorldPosition(RESOURCE_SPAWNS.ATP_CYTO);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER);
            break;
        case CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.DONKEY);
            break;
        case CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN:
        case CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.ASLAN);
            break;
        case CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE:
        case CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.FUMARASE_ENZYME);
            break;
        case CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER);
            break;
        case CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS:
            targetNPC = npcs.find(npc => npc.userData.name === CONSTANTS.NPC_NAMES.ARGUS);
            break;
        case CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA: {
            const waste = interactiveObjects.find(obj => obj.userData.name === 'Waste Receptacle');
            if (waste) return waste.position;
            const pos = getWorldPosition(STATIC_OBJECTS.WASTE_BUCKET);
            return new THREE.Vector3(pos.x, 0, pos.z);
        }
        case CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE: {
            const pos = getWorldPosition({ zone: 'BRIDGE', offset: { x: 0, z: 0 } });
            return new THREE.Vector3(pos.x, CONSTANTS.BRIDGE_HEIGHT, pos.z);
        }
        default:
            return null;
    }

    return targetNPC ? targetNPC.position : null;
}

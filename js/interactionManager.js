// js/interactionManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { showDialogue, showFeedback, showInteractionPrompt, hideInteractionPrompt } from './uiManager.js';
import { createGameBoySound, playMoleculeGenerationSound, playPortalCelebration, stopBackgroundMusic, startBackgroundMusic } from './audioManager.js';
import { advanceUreaCycleQuest, startRealityRiverChallenge, hasRequiredItems, consumeItems, ureaCycleQuestData } from './questManager.js';
import { removePortalBarrierFromWorld, createResource, interactiveObjects, originalMaterials, removeResourceFromWorld } from './worldManager.js';
import { player } from './playerManager.js';
import { getGameState, setGameState, getCurrentQuest, getInventory, addToInventory, getPlayerLocation, setPlayerLocation } from '../main.js';
import { createSimpleParticleSystem } from './utils.js';

let closestInteractiveObject = null;
let lastClosestObject = null;
const highlightMaterial = new THREE.MeshStandardMaterial({ emissive: 0xffff00, emissiveIntensity: 0.6 });

export function updateInteraction(scene) {
    const gameState = getGameState();
    if (gameState.isUserInteracting) {
        if (closestInteractiveObject) {
            unhighlightObject(closestInteractiveObject);
            closestInteractiveObject = null;
        }
        if (lastClosestObject) {
            unhighlightObject(lastClosestObject);
            lastClosestObject = null;
        }
        hideInteractionPrompt();
        return;
    }

    let minDistSq = CONSTANTS.INTERACTION_RADIUS_SQ;
    let foundClosest = null;
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);

    interactiveObjects.forEach(obj => {
        if (obj?.parent === scene && obj.visible) {
            const objPos = new THREE.Vector3();
            obj.getWorldPosition(objPos);
            const distSq = playerWorldPos.distanceToSquared(objPos);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                foundClosest = obj;
            }
        }
    });

    if (foundClosest !== closestInteractiveObject) {
        if (closestInteractiveObject) {
            unhighlightObject(closestInteractiveObject);
        }
        if (foundClosest) {
            highlightObject(foundClosest);
            showInteractionPrompt(foundClosest.userData.name || 'Object', foundClosest.userData.type);
        } else {
            hideInteractionPrompt();
        }
        lastClosestObject = closestInteractiveObject;
        closestInteractiveObject = foundClosest;
    }
}

export function getClosestInteractiveObject() {
    return closestInteractiveObject;
}

function highlightObject(object) { /* ... (no changes) ... */ }
function unhighlightObject(object) { /* ... (no changes) ... */ }


export function interactWithObject(object, scene) {
    const gameState = getGameState();
    if (!object || gameState.isUserInteracting) return;

    const userData = object.userData;
    let interactionProcessedThisFrame = false;
    const currentQuest = getCurrentQuest();
    const inventory = getInventory();

    const setGameInteracting = (state) => setGameState({ isUserInteracting: state });

    if (userData.type === 'npc' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        
        if (userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS) {
            // ... (Professor logic - no changes to feedback here as dialogue handles it)
            if (currentQuest && currentQuest.id === 'ureaCycle') {
                if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE) {
                     showDialogue("Ready to test your knowledge on the Urea Cycle?", [
                         { text: "Yes, start the challenge!", action: startRealityRiverChallenge },
                         { text: "Give me a moment." }
                     ], setGameInteracting);
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.COMPLETED) {
                     showDialogue("Thanks again for helping clear the ammonia!", [ { text: "You're welcome."} ], setGameInteracting);
                } else {
                     showDialogue(`Current Objective: ${ureaCycleQuestData.objectives[currentQuest.state]}`, [ { text: "Okay"} ], setGameInteracting);
                }
            } else if (!currentQuest) {
                 showDialogue("The cell is overwhelmed with ammonia! We need to convert it to Urea. Can you help?", [
                     { text: "Accept Quest", action: () => {
                         if(getGameState().startUreaCycleQuest()) {
                            startBackgroundMusic();
                         }
                     }},
                     { text: "Decline" }
                 ], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ORNITHINE_USHER) {
            // ... (Usher logic - NPC dialogue will be the primary feedback)
             if (currentQuest && currentQuest.id === 'ureaCycle') {
                if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER) {
                    showDialogue("Ah, you must be the one Professor Hepaticus sent. Need some Ornithine for your journey?", [
                        { text: "Yes, please!", action: () => {
                            addToInventory('Ornithine', 1);
                            // showFeedback("Ornithine received!"); // advanceUreaCycleQuest handles this
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE);
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE) {
                    if (hasRequiredItems({ 'Citrulline': 1 })) {
                        showDialogue("Excellent, you've made Citrulline! You may pass through the ORNT1 portal.", [
                            { text: "Thank you!", action: () => {
                                setGameState({hasPortalPermission: true});
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL);
                            }}
                        ], setGameInteracting);
                    } else {
                        showDialogue("You need Citrulline to pass. Come back when you have it.", [{ text: "Okay" }], setGameInteracting);
                    }
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({'Ornithine': 1})) { 
                     showDialogue("Welcome back, traveler! You've returned with Ornithine. The cycle is complete within you.", [
                        { text: "Indeed!", action: () => {
                            consumeItems({'Ornithine': 1});
                            // showFeedback("Ornithine returned to the cycle's start."); // advance... handles
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE);
                        }}
                    ], setGameInteracting);
                } else if (currentQuest.state < CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER) {
                    showDialogue("Greetings! I am the Ornithine Usher. I guard this passage and assist with... transport.", [{ text: "Interesting." }], setGameInteracting);
                } else if (currentQuest.state > CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL && currentQuest.state < CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA) {
                     showDialogue("Keep up the good work in the Cytosol!", [{ text: "Will do." }], setGameInteracting);
                } else {
                    showDialogue("The cycle continues...", [{ text: "Indeed." }], setGameInteracting);
                }
            } else {
                 showDialogue("I am the Ornithine Usher. Speak to Professor Hepaticus to learn about the Urea Cycle.", [{ text: "Okay" }], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.DONKEY) {
            if (currentQuest && currentQuest.state === userData.requiredQuestState) {
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("Hee-haw! Well now, a talking human! Fancy that. Got Citrulline, Aspartate, and some ATP, eh? I can whip those into Argininosuccinate for ya, sure can!", [
                        { text: "Uh... yes, please!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 2 }, userData.productColors[userData.produces]);
                            // showFeedback(`${userData.produces} synthesized by the... Donkey!`); // advance... handles
                            advanceUreaCycleQuest(userData.advancesQuestTo);
                        }},
                        { text: "Just admiring the... talking donkey."}
                    ], setGameInteracting);
                } else {
                    let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]);
                    showDialogue(`Hee-haw! Need ${missing.join(' and ')} to make Argininosuccinate. Come back when you got the goods!`, [{text: "Right-o."}], setGameInteracting);
                }
            } else {
                showDialogue("Hee-haw! Mighty strange seeing folks wanderin' 'round here. I'm just a simple donkey, really.", [{text: "Okay then..."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ASLAN) {
            if (currentQuest && currentQuest.state === userData.requiredQuestState) { // STEP_10_TALK_TO_ASLAN
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("You bring Argininosuccinate. With a swift cleave, it shall become Arginine and Fumarate. Shall I proceed?", [
                        { text: "Yes, mighty Aslan!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createGameBoySound('success');
                            let offset = 0;
                            userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset - 0.5, z: object.position.z - 1.5 }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            // showFeedback(`Aslan cleaves Argininosuccinate!`); // advance... handles
                            advanceUreaCycleQuest(userData.advancesQuestTo); // Advances to STEP_11_FURNACE_FUMARATE
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else {
                    showDialogue("You require Argininosuccinate for my work.", [{text: "I understand."}], setGameInteracting);
                }
            } else if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && !(hasRequiredItems({Arginine: 1, Fumarate: 1}))) {
                showDialogue("You must gather the Arginine and Fumarate I have created.", [{text: "I will."}], setGameInteracting);
            }
            else {
                showDialogue("The balance of this realm is delicate. Tread carefully.", [{text: "I will."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ARGUS) {
            if (currentQuest && currentQuest.state === userData.requiredQuestState) { // STEP_12_TALK_TO_ARGUS
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("Ah, Arginine. My many eyes see its potential. I shall finalize its fate into Urea and Ornithine. Ready?", [
                        { text: "Proceed, Argus.", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            let offset = 0;
                             userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset -0.5 , z: object.position.z - 1.5 }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            // showFeedback(`Argus finalizes the reaction!`); // advance... handles
                            advanceUreaCycleQuest(userData.advancesQuestTo); // Advances to STEP_13_DISPOSE_UREA
                        }},
                        { text: "One moment."}
                    ], setGameInteracting);
                } else {
                    showDialogue("Bring me Arginine, and I shall do what must be done.", [{text: "I shall."}], setGameInteracting);
                }
            } else if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && !(hasRequiredItems({Urea: 1, Ornithine: 1}))){
                 showDialogue("Gather the Urea and Ornithine, then fulfill your destiny.", [{text: "Understood."}], setGameInteracting);
            }
            else {
                showDialogue("I see all... but I await the right moment for action.", [{text: "Very well."}], setGameInteracting);
            }
        }
        else {
             setGameInteracting(false);
        }
    }
    else if (userData.type === 'source' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (!currentQuest || currentQuest.id !== 'ureaCycle' || currentQuest.state !== userData.requiredQuestState) {
            showFeedback(`Not the right time to use the ${userData.name}. Objective: ${currentQuest?.objectives[currentQuest.state] || "Start quest first."}`);
            return;
        }
        if (inventory[userData.provides] >=1) {
            showFeedback(`You already have ${userData.provides}.`);
            return;
        }
        
        addToInventory(userData.provides, 1);
        createGameBoySound('collect');

        if (!(currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 && hasRequiredItems({ 'Water': 1, 'CO2': 1 }))) {
            showFeedback(`Collected ${userData.provides} from the ${userData.name}.`);
        } else {
            // If collecting this source completes the pair, advanceQuest will show the next objective.
            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE);
        }
    }
    else if (userData.type === 'resource' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        // ... (previous logic for initialQuestDependentResources check) ...
        const initialQuestDependentResources = ['NH3', 'ATP', 'Water', 'CO2', 'Bicarbonate'];
        if (initialQuestDependentResources.includes(userData.name) && (!currentQuest || currentQuest.state === CONSTANTS.QUEST_STATE.NOT_STARTED)) {
            showFeedback("You should talk to Professor Hepaticus first.");
            return;
        }

        addToInventory(userData.name, 1);
        createGameBoySound('collect');
        removeResourceFromWorld(object);

        let questAdvancedByThisCollection = false;
        let specificFeedbackGivenForThisResource = false;

        if (currentQuest?.id === 'ureaCycle') {
            if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE && userData.name === 'Bicarbonate') {
                questAdvancedByThisCollection = advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_GATHER_MITO_REMAINING);
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1_GATHER_MITO_REMAINING && hasRequiredItems({ 'Bicarbonate': 1, 'NH3': 1, 'ATP': 2 })) {
                questAdvancedByThisCollection = advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS);
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS && userData.name === 'Carbamoyl Phosphate') {
                questAdvancedByThisCollection = advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER);
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_8_GATHER_CYTO) {
                const itemsNeeded = { 'Citrulline': 1, 'Aspartate': 1, 'ATP': 1 };
                if (hasRequiredItems(itemsNeeded)) {
                    questAdvancedByThisCollection = advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY);
                }
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && (userData.name === 'Arginine' || userData.name === 'Fumarate')) {
                specificFeedbackGivenForThisResource = true;
                if (hasRequiredItems({'Arginine': 1}) && hasRequiredItems({'Fumarate': 1})) {
                    showFeedback(`Both Arginine and Fumarate collected! Take Fumarate to the Krebs Cycle Furnace.`);
                } else if (userData.name === 'Arginine' && inventory['Arginine'] >= 1 && !inventory['Fumarate']) {
                    showFeedback("Arginine collected. Still need Fumarate.");
                } else if (userData.name === 'Fumarate' && inventory['Fumarate'] >= 1 && !inventory['Arginine']) {
                    showFeedback("Fumarate collected. Still need Arginine.");
                } else if (userData.name === 'Arginine' && inventory['Arginine'] > 1 && inventory['Fumarate']){
                     showFeedback(`Collected more Arginine. You have all items for this step.`);
                } else if (userData.name === 'Fumarate' && inventory['Fumarate'] > 1 && inventory['Arginine']){
                     showFeedback(`Collected more Fumarate. You have all items for this step.`);
                }
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && (userData.name === 'Urea' || userData.name === 'Ornithine')) {
                specificFeedbackGivenForThisResource = true;
                 if (hasRequiredItems({'Urea': 1}) && hasRequiredItems({'Ornithine': 1})) {
                    showFeedback(`Both Urea and Ornithine collected! Dispose of Urea and return Ornithine to the Usher.`);
                } else if (userData.name === 'Urea') { showFeedback("Urea collected.");
                } else if (userData.name === 'Ornithine') { showFeedback("Ornithine collected."); }
            }
        }

        if (!questAdvancedByThisCollection && !specificFeedbackGivenForThisResource) {
            showFeedback(`Collected ${userData.name}`);
        }
        if (getClosestInteractiveObject() === object) {
            closestInteractiveObject = null;
            hideInteractionPrompt();
        }
    }
    else if (userData.type === 'station' && !interactionProcessedThisFrame) { // CAVA, CPS1, OTC
        interactionProcessedThisFrame = true;
        // ... (previous station logic, checking if a generic "product created" message is needed) ...
        if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
            showFeedback(`Not the right time for ${userData.name}. Objective: ${currentQuest?.objectives[currentQuest.state] || "Start quest first."}`);
            return;
        }
        if (!hasRequiredItems(userData.requires)) {
            let missing = [];
            for (const item in userData.requires) {
                if (!inventory[item] || inventory[item] < userData.requires[item]) {
                    missing.push(`${item} (need ${userData.requires[item]}${inventory[item] ? `, have ${inventory[item]}` : ''})`);
                }
            }
            showFeedback(`Missing: ${missing.join(', ')} for ${userData.name}.`);
            return;
        }

        createGameBoySound('success');
        playMoleculeGenerationSound();
        consumeItems(userData.requires);
        createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 2 }, userData.productColors[userData.produces]);
        
        let questAdvancedByThisStation = false;
        if (userData.advancesQuestTo) {
            questAdvancedByThisStation = advanceUreaCycleQuest(userData.advancesQuestTo);
        }
        // Only show generic "created" if quest didn't advance with its own specific feedback
        if (!questAdvancedByThisStation) {
             showFeedback(`${userData.produces} created at ${userData.name}!`);
        }
    }
    else if (userData.type === 'portal' && userData.name === 'ORNT1 Portal' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        // ... (portal logic) ...
        if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
            showFeedback("The portal is not active or you don't have permission. Check your objective.");
            return;
        }
        if (!hasRequiredItems(userData.requires)) {
            showFeedback(`The portal requires ${Object.keys(userData.requires).join(', ')}.`);
            return;
        }

        consumeItems(userData.requires);
        if (removePortalBarrierFromWorld(scene)) {
            console.log("Portal barrier removed by interaction.");
        }
        stopBackgroundMusic();
        playPortalCelebration();
        
        player.position.set(CONSTANTS.DIVIDING_WALL_X + 2, player.position.y, 0);
        setPlayerLocation('cytosol');
        createResource(scene, 'Citrulline', { x: CONSTANTS.DIVIDING_WALL_X + 1, z: 1 }, userData.productColor || CONSTANTS.CITRULLINE_COLOR);
        advanceUreaCycleQuest(userData.advancesQuestTo); // This provides "Portal to Cytosol open! Now: ..."
    }
    else if (userData.type === 'wasteBucket' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (currentQuest?.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({ 'Urea': 1 })) {
            consumeItems({ 'Urea': 1 });
            createGameBoySound('success');
            if (hasRequiredItems({'Ornithine': 1})) {
                 showFeedback("Urea disposed! With Ornithine also in hand, see the Usher to complete the cycle.");
            } else {
                 showFeedback("Urea disposed! Now, ensure you have Ornithine.");
            }
        } else if (inventory['Urea']) {
            showFeedback("You have Urea, but it's not time to dispose of it yet. Check your objective.");
        } else {
            showFeedback("This is a waste receptacle for Urea. You don't have any to dispose of or it's not the right time.");
        }
    }
    else if (userData.type === 'krebsFurnace' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (currentQuest?.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && hasRequiredItems({ 'Fumarate': 1 })) {
            if (!hasRequiredItems({ 'Arginine': 1 })) {
                showFeedback("You need to collect the Arginine produced by Aslan first!");
                return;
            }
            consumeItems({ 'Fumarate': 1 });
            createGameBoySound('interact');
            createSimpleParticleSystem(scene, 50, CONSTANTS.EMBER_COLOR, 0.08, 0.5, 1.5, object.position.clone().add(new THREE.Vector3(0,0.7,0.4)), new THREE.Vector3(0.4, 0.1, 0.1));
            // showFeedback("Fumarate fed to the Krebs Cycle! It will be converted to Malate."); // advance... handles
            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS);
        } else if (inventory['Fumarate']) {
            showFeedback("You have Fumarate, but it's not time to use the furnace. Check your objective.");
        } else {
            showFeedback("This furnace processes Fumarate for the Krebs Cycle. You don't have any Fumarate or it's not the right time.");
        }
    }
    
    const gameStateAfterInteraction = getGameState();
    if (!document.getElementById('dialogueBox').classList.contains('hidden') ||
        !document.getElementById('realityRiver').classList.contains('hidden')) {
    } else if (interactionProcessedThisFrame && gameStateAfterInteraction.isUserInteracting) {
        setGameState({ isUserInteracting: false });
    }
}
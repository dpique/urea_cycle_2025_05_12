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
let lastClosestObject = null; // To manage unhighlighting when moving away from one object directly to another
const highlightMaterial = new THREE.MeshStandardMaterial({ emissive: 0xffff00, emissiveIntensity: 0.7, roughness: 0.3 });

function getMeshToHighlight(interactiveObj) {
    if (!interactiveObj) return null;
    // If userData.mainMesh is defined, use that (for Groups where a specific child is the visual target)
    if (interactiveObj.userData && interactiveObj.userData.mainMesh) {
        return interactiveObj.userData.mainMesh;
    }
    // If the interactiveObject itself is a Mesh, use it
    if (interactiveObj.isMesh) {
        return interactiveObj;
    }
    // Fallback for groups: try to find the first mesh child that is registered in originalMaterials
    if (interactiveObj.isGroup) {
        for (const child of interactiveObj.children) {
            if (child.isMesh && originalMaterials.has(child)) {
                return child;
            }
        }
        // If no registered child, try to find any mesh (less ideal)
        return interactiveObj.children.find(child => child.isMesh);
    }
    return null;
}


function highlightObject(object) {
    const meshToHighlight = getMeshToHighlight(object);
    if (meshToHighlight && meshToHighlight.isMesh) {
        if (!originalMaterials.has(meshToHighlight) && meshToHighlight.material !== highlightMaterial) {
            // This case should ideally not happen if objects are registered correctly upon creation
            originalMaterials.set(meshToHighlight, meshToHighlight.material);
            console.warn("Highlight: Original material not found for", meshToHighlight.name, " Storing current.");
        }
        if (meshToHighlight.material !== highlightMaterial) {
             meshToHighlight.material = highlightMaterial;
        }
    }
}

function unhighlightObject(object) {
    const meshToHighlight = getMeshToHighlight(object);
     if (meshToHighlight && meshToHighlight.isMesh && originalMaterials.has(meshToHighlight)) {
         if (meshToHighlight.material === highlightMaterial) { // Only restore if currently highlighted
            meshToHighlight.material = originalMaterials.get(meshToHighlight);
        }
    }
}


export function updateInteraction(scene) {
    const gameState = getGameState();
    if (gameState.isUserInteracting) { // If dialogue or other UI is active, don't change highlights
        if (closestInteractiveObject) {
            // We might still want to unhighlight if the UI interaction started *while* an object was highlighted
            // but for now, let's keep it simple: UI active = no highlight changes.
            // unhighlightObject(closestInteractiveObject); // Optional: clear highlight when UI opens
            // closestInteractiveObject = null;
        }
        // if (lastClosestObject) { // Also clear last if needed
        //     unhighlightObject(lastClosestObject);
        //     lastClosestObject = null;
        // }
        // hideInteractionPrompt(); // Prompt might still be relevant if dialogue is about the object
        return;
    }

    let minDistSq = CONSTANTS.INTERACTION_RADIUS_SQ;
    let foundClosest = null;
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);

    interactiveObjects.forEach(obj => {
        if (obj?.parent === scene && obj.visible) { // Check if object is in the current scene and visible
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
        // lastClosestObject = closestInteractiveObject; // Not strictly needed with current logic
        closestInteractiveObject = foundClosest;
    }
}

export function getClosestInteractiveObject() {
    return closestInteractiveObject;
}


export function interactWithObject(object, scene) {
    const gameState = getGameState();
    if (!object || gameState.isUserInteracting) return;

    const userData = object.userData;
    let interactionProcessedThisFrame = false; // To prevent multiple interactions from one key press
    const currentQuest = getCurrentQuest();
    const inventory = getInventory();

    const setGameInteracting = (state) => setGameState({ isUserInteracting: state });
    let questAdvancedGenericFeedbackSuppressed = false;


    if (userData.type === 'npc' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        
        if (userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS) {
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
                         if(getGameState().startUreaCycleQuest()) { // startUreaCycleQuest returns true if successful
                            startBackgroundMusic();
                         } // Feedback is handled by startUreaCycleQuest
                     }},
                     { text: "Decline" }
                 ], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ORNITHINE_USHER) {
             if (currentQuest && currentQuest.id === 'ureaCycle') {
                if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER) {
                    showDialogue("Ah, you must be the one Professor Hepaticus sent. Need some Ornithine for your journey?", [
                        { text: "Yes, please!", action: () => {
                            addToInventory('Ornithine', 1);
                            if (advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE)) {
                                // Quest advance message is sufficient
                            } else {
                                showFeedback("Ornithine received!");
                            }
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE) {
                    if (hasRequiredItems({ 'Citrulline': 1 })) {
                        showDialogue("Excellent, you've made Citrulline! You may pass through the ORNT1 portal.", [
                            { text: "Thank you!", action: () => {
                                setGameState({hasPortalPermission: true});
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL); // Handles feedback
                            }}
                        ], setGameInteracting);
                    } else {
                        showDialogue("You need Citrulline to pass. Come back when you have it.", [{ text: "Okay" }], setGameInteracting);
                    }
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({'Ornithine': 1})) { 
                     showDialogue("Welcome back, traveler! You've returned with Ornithine. The cycle is complete within you.", [
                        { text: "Indeed!", action: () => {
                            consumeItems({'Ornithine': 1});
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE); // Handles feedback
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
                            if (advanceUreaCycleQuest(userData.advancesQuestTo)){
                                // Quest feedback is primary
                            } else {
                                showFeedback(`${userData.produces} synthesized by the... Donkey!`);
                            }
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
                    showDialogue("You bring Argininosuccinate. With one big bite, I can help you break it into 2 pieces: Arginine and Fumarate. Shall I proceed?", [
                        { text: "Yes, mighty Aslan!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createGameBoySound('success');
                            let offset = 0;
                            userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset - 0.5, z: object.position.z - 1.5 }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            if(advanceUreaCycleQuest(userData.advancesQuestTo)) { // Advances to STEP_11_FURNACE_FUMARATE
                                // Quest feedback is primary
                            } else {
                                showFeedback(`Aslan cleaves Argininosuccinate!`);
                            }
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else {
                    showDialogue("You require Argininosuccinate for my work.", [{text: "I understand."}], setGameInteracting);
                }
            } else if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && !(hasRequiredItems({Arginine: 1}) && hasRequiredItems({Fumarate: 1}))) {
                 // Check if both are not collected yet. If one is, dialogue in interactionManager will prompt for the other.
                 // If player talks to Aslan *after* collecting one but not both.
                if (!hasRequiredItems({Arginine: 1})) {
                    showDialogue("You must gather the Arginine I have created.", [{text: "I will."}], setGameInteracting);
                } else if (!hasRequiredItems({Fumarate: 1})) {
                     showDialogue("You must gather the Fumarate I have created.", [{text: "I will."}], setGameInteracting);
                } else {
                    showDialogue("You have collected both. Proceed with your task.", [{text: "I will."}], setGameInteracting);
                }
            }
            else {
                showDialogue("The balance of this realm is delicate. Tread carefully.", [{text: "I will."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ARGUS) {
            if (currentQuest && currentQuest.state === userData.requiredQuestState) { // STEP_12_TALK_TO_ARGUS
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("Ah, Arginine. My many eyes see its potential. I shall finalize its fate into Urea and Ornithine with a single chop. Ready?", [
                        { text: "Proceed, Argus.", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            let offset = 0;
                             userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset -0.5 , z: object.position.z - 1.5 }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            if(advanceUreaCycleQuest(userData.advancesQuestTo)) { // Advances to STEP_13_DISPOSE_UREA
                               // Quest feedback is primary
                            } else {
                               showFeedback(`Argus finalizes the reaction!`);
                            }
                        }},
                        { text: "One moment."}
                    ], setGameInteracting);
                } else {
                    showDialogue("Bring me Arginine, and I shall do what must be done.", [{text: "I shall."}], setGameInteracting);
                }
            } else if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && !(hasRequiredItems({Urea: 1}) && hasRequiredItems({Ornithine: 1}))){
                if (!hasRequiredItems({Urea: 1})) {
                    showDialogue("Gather the Urea I have created.", [{text: "Understood."}], setGameInteracting);
                } else if (!hasRequiredItems({Ornithine: 1})) {
                    showDialogue("Gather the Ornithine I have created.", [{text: "Understood."}], setGameInteracting);
                } else {
                     showDialogue("You have collected both. Fulfill your destiny.", [{text: "Understood."}], setGameInteracting);
                }
            }
            else {
                showDialogue("I see all... but I await the right moment for action.", [{text: "Very well."}], setGameInteracting);
            }
        }
        else {
             // If no specific NPC logic, ensure interaction state is reset if it was set by mistake
             // This path should ideally not be taken for defined NPCs.
             setGameInteracting(false);
        }
    }
    else if (userData.type === 'source' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (!currentQuest || currentQuest.id !== 'ureaCycle' || currentQuest.state !== userData.requiredQuestState) {
            showFeedback(`Not the right time to use the ${userData.name}. Objective: ${currentQuest?.objectives[currentQuest.state] || "Start quest first."}`);
            return;
        }
        if (inventory[userData.provides] >=1) { // Assuming sources provide 1 at a time and are not stackable beyond quest needs
            showFeedback(`You already have ${userData.provides}.`);
            return;
        }
        
        addToInventory(userData.provides, 1);
        createGameBoySound('collect');

        // Check if collecting this source completes the pair for STEP_0
        if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 && hasRequiredItems({ 'Water': 1, 'CO2': 1 })) {
            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE); // This will show next objective
            questAdvancedGenericFeedbackSuppressed = true;
        }

        if (!questAdvancedGenericFeedbackSuppressed) {
            showFeedback(`Collected ${userData.provides} from the ${userData.name}.`);
        }
    }
    else if (userData.type === 'resource' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        const initialQuestDependentResources = ['NH3', 'ATP', 'Water', 'CO2', 'Bicarbonate']; // Added Bicarbonate too
        if (initialQuestDependentResources.includes(userData.name) && (!currentQuest || currentQuest.state === CONSTANTS.QUEST_STATE.NOT_STARTED)) {
            showFeedback("You should talk to Professor Hepaticus first.");
            return;
        }

        addToInventory(userData.name, 1);
        createGameBoySound('collect');
        removeResourceFromWorld(object); // object is the resource mesh
        hideInteractionPrompt(); // Hide prompt as object is gone

        let specificFeedbackGivenForThisResource = false;
        questAdvancedGenericFeedbackSuppressed = false;


        if (currentQuest?.id === 'ureaCycle') {
            if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE && userData.name === 'Bicarbonate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_GATHER_MITO_REMAINING)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1_GATHER_MITO_REMAINING && hasRequiredItems({ 'Bicarbonate': 1, 'NH3': 1, 'ATP': 2 })) {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS && userData.name === 'Carbamoyl Phosphate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_8_GATHER_CYTO) {
                const itemsNeeded = { 'Citrulline': 1, 'Aspartate': 1, 'ATP': 1 }; // Assuming player collects Citrulline first as per portal logic
                if (hasRequiredItems(itemsNeeded)) {
                    if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY)) questAdvancedGenericFeedbackSuppressed = true;
                }
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && (userData.name === 'Arginine' || userData.name === 'Fumarate')) {
                specificFeedbackGivenForThisResource = true; // This step has specific feedback needs
                if (hasRequiredItems({'Arginine': 1}) && hasRequiredItems({'Fumarate': 1})) {
                    showFeedback(`Both Arginine and Fumarate collected! Take Fumarate to the Krebs Cycle Furnace.`);
                } else if (userData.name === 'Arginine' && inventory['Arginine'] >= 1 && !(inventory['Fumarate'] >=1) ) {
                    showFeedback("Arginine collected. Still need Fumarate.");
                } else if (userData.name === 'Fumarate' && inventory['Fumarate'] >= 1 && !(inventory['Arginine'] >=1) ) {
                    showFeedback("Fumarate collected. Still need Arginine.");
                } // No "else" needed, the above covers specific cases for this step.
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && (userData.name === 'Urea' || userData.name === 'Ornithine')) {
                specificFeedbackGivenForThisResource = true; // Specific feedback for this step
                 if (hasRequiredItems({'Urea': 1}) && hasRequiredItems({'Ornithine': 1})) {
                    showFeedback(`Both Urea and Ornithine collected! Dispose of Urea and return Ornithine to the Usher.`);
                } else if (userData.name === 'Urea' && inventory['Urea'] >= 1 && !(inventory['Ornithine'] >= 1)) { 
                    showFeedback("Urea collected. Still need Ornithine.");
                } else if (userData.name === 'Ornithine' && inventory['Ornithine'] >= 1 && !(inventory['Urea'] >= 1)) { 
                    showFeedback("Ornithine collected. Still need Urea.");
                }
            }
        }

        if (!questAdvancedGenericFeedbackSuppressed && !specificFeedbackGivenForThisResource) {
            showFeedback(`Collected ${userData.name}`);
        }
    }
    else if (userData.type === 'station' && !interactionProcessedThisFrame) { // CAVA, CPS1, OTC
        interactionProcessedThisFrame = true;
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
        
        questAdvancedGenericFeedbackSuppressed = false;
        if (userData.advancesQuestTo) {
            if(advanceUreaCycleQuest(userData.advancesQuestTo)) questAdvancedGenericFeedbackSuppressed = true;
        }
        
        if (!questAdvancedGenericFeedbackSuppressed) {
             showFeedback(`${userData.produces} created at ${userData.name}!`);
        }
    }
    else if (userData.type === 'portal' && userData.name === 'ORNT1 Portal' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
            showFeedback("The portal is not active or you don't have permission. Check your objective.");
            return;
        }
        if (!hasRequiredItems(userData.requires)) {
            showFeedback(`The portal requires ${Object.keys(userData.requires).join(', ')}.`);
            return;
        }

        consumeItems(userData.requires); // Consume Citrulline
        if (removePortalBarrierFromWorld(scene)) {
            console.log("Portal barrier removed by interaction.");
        }
        stopBackgroundMusic();
        playPortalCelebration(); // This will restart music with 'postPortal' theme
        
        // Position player just past the portal line and create the transported Citrulline there
        player.position.set(CONSTANTS.DIVIDING_WALL_X + 1.5, player.position.y, CONSTANTS.PORTAL_WALL_CENTER_Z);
        setPlayerLocation('cytosol');
        // Re-create Citrulline in cytosol for collection
        createResource(scene, 'Citrulline', { x: CONSTANTS.DIVIDING_WALL_X + 1, z: CONSTANTS.PORTAL_WALL_CENTER_Z + 1 }, userData.productColor || CONSTANTS.CITRULLINE_COLOR);
        
        advanceUreaCycleQuest(userData.advancesQuestTo); // This provides "Portal to Cytosol open! Now: ..."
    }
    else if (userData.type === 'wasteBucket' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (currentQuest?.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({ 'Urea': 1 })) {
            consumeItems({ 'Urea': 1 });
            createGameBoySound('success');
            if (hasRequiredItems({'Ornithine': 1})) { // Check if Ornithine is ALSO collected
                 showFeedback("Urea disposed! With Ornithine also in hand, see the Usher to complete the cycle's return trip.");
            } else {
                 showFeedback("Urea disposed! Now, ensure you have Ornithine to return to the Usher.");
            }
            // This interaction does not directly advance the quest state.
            // The quest advances when Ornithine is returned to the Usher.
        } else if (inventory['Urea']) {
            showFeedback("You have Urea, but it's not time to dispose of it yet. Check your objective.");
        } else {
            showFeedback("This is a waste receptacle for Urea. You don't have any to dispose of or it's not the right time.");
        }
    }
    else if (userData.type === 'krebsFurnace' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (currentQuest?.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && hasRequiredItems({ 'Fumarate': 1 })) {
            if (!hasRequiredItems({ 'Arginine': 1 })) { // Ensure Arginine was collected from Aslan's output
                showFeedback("You need to collect the Arginine produced by Aslan first!");
                return;
            }
            consumeItems({ 'Fumarate': 1 });
            createGameBoySound('interact');
            createSimpleParticleSystem(scene, 50, CONSTANTS.EMBER_COLOR, 0.08, 0.5, 1.5, object.userData.mainMesh.position.clone().add(new THREE.Vector3(0,0.7,0.4)), new THREE.Vector3(0.4, 0.1, 0.1));
            
            if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS)) {
                // Quest feedback is primary
            } else {
                showFeedback("Fumarate fed to the Krebs Cycle! It will be converted to Malate.");
            }
        } else if (inventory['Fumarate']) {
            showFeedback("You have Fumarate, but it's not time to use the furnace. Check your objective.");
        } else {
            showFeedback("This furnace processes Fumarate for the Krebs Cycle. You don't have any Fumarate or it's not the right time.");
        }
    }
    
    // If a dialogue or quiz was NOT opened, reset interaction state.
    // This is important because showDialogue sets isUserInteracting to true, and hideDialogue resets it.
    // For non-dialogue interactions, we need to ensure it's reset if not handled by a modal UI.
    const gameStateAfterInteraction = getGameState();
    if (interactionProcessedThisFrame &&
        document.getElementById('dialogueBox').classList.contains('hidden') &&
        document.getElementById('realityRiver').classList.contains('hidden')) {
        if (gameStateAfterInteraction.isUserInteracting) { // Check if it was set true by a non-dialogue path
            setGameState({ isUserInteracting: false });
        }
    }
}
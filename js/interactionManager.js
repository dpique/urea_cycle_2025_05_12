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
const highlightMaterial = new THREE.MeshStandardMaterial({ emissive: 0xffff00, emissiveIntensity: 0.7, roughness: 0.3 });

function getMeshToHighlight(interactiveObj) {
    if (!interactiveObj) return null;
    if (interactiveObj.userData && interactiveObj.userData.mainMesh) {
        return interactiveObj.userData.mainMesh;
    }
    if (interactiveObj.isMesh) {
        return interactiveObj;
    }
    if (interactiveObj.isGroup) {
        for (const child of interactiveObj.children) {
            if (child.isMesh && originalMaterials.has(child)) {
                return child;
            }
        }
        return interactiveObj.children.find(child => child.isMesh);
    }
    return null;
}


function highlightObject(object) {
    const meshToHighlight = getMeshToHighlight(object);
    if (meshToHighlight && meshToHighlight.isMesh) {
        if (!originalMaterials.has(meshToHighlight) && meshToHighlight.material !== highlightMaterial) {
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
         if (meshToHighlight.material === highlightMaterial) { 
            meshToHighlight.material = originalMaterials.get(meshToHighlight);
        }
    }
}


export function updateInteraction(scene) {
    const gameState = getGameState();
    if (gameState.isUserInteracting) { 
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
    let interactionProcessedThisFrame = false; 
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
                     showDialogue("Thanks again for helping clear the ammonia! You've shown a great understanding of this vital process.", [ { text: "You're welcome."} ], setGameInteracting);
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
             if (currentQuest && currentQuest.id === 'ureaCycle') {
                if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER) {
                    showDialogue("Ah, you must be the one Professor Hepaticus sent. I'm the Ornithine Usher. I help Ornithine move back into the mitochondria, and Citrulline out. For you to make Citrulline, you'll need some Ornithine. Take this.", [
                        { text: "Yes, please!", action: () => {
                            addToInventory('Ornithine', 1);
                            if (advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE)) {
                            } else {
                                showFeedback("Ornithine received!");
                            }
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE) {
                    if (hasRequiredItems({ 'Citrulline': 1 })) {
                        showDialogue("Excellent, you've made Citrulline! It's ready for its journey to the cytosol. You may pass through the ORNT1 portal.", [
                            { text: "Thank you!", action: () => {
                                setGameState({hasPortalPermission: true});
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL); 
                            }}
                        ], setGameInteracting);
                    } else {
                        showDialogue("You need Citrulline to pass. Remember, I help transport it. Come back when you have it.", [{ text: "Okay" }], setGameInteracting);
                    }
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({'Ornithine': 1})) { 
                     showDialogue("Welcome back, traveler! You've returned with Ornithine. I'll ensure it gets back into the mitochondria, ready to start the cycle anew. Well done!", [
                        { text: "Indeed!", action: () => {
                            consumeItems({'Ornithine': 1});
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE); 
                        }}
                    ], setGameInteracting);
                } else if (currentQuest.state < CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER) {
                    showDialogue("Greetings! I am the Ornithine Usher. I guard this passage and facilitate the transport of Ornithine and Citrulline across the mitochondrial membrane.", [{ text: "Interesting." }], setGameInteracting);
                } else if (currentQuest.state > CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL && currentQuest.state < CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA) {
                     showDialogue("Keep up the good work in the Cytosol! Remember, the cycle links two cellular compartments.", [{ text: "Will do." }], setGameInteracting);
                } else {
                    showDialogue("The cycle continues, a testament to efficient biochemical pathways...", [{ text: "Indeed." }], setGameInteracting);
                }
            } else {
                 showDialogue("I am the Ornithine Usher. Speak to Professor Hepaticus to learn about the Urea Cycle.", [{ text: "Okay" }], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.DONKEY) { 
            if (currentQuest && currentQuest.state === userData.requiredQuestState) {
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("Hee-haw! Got Citrulline, Aspartate, and ATP? I'm Argininosuccinate Synthetase - call me Donkey! I take that Citrulline from the mitochondria, and with Aspartate providing the second nitrogen and ATP for energy, I stitch 'em together to make Argininosuccinate. It's a vital link! Ready to synthesize?", [
                        { text: "Yes, let's do it!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 2, yBase: object.position.y }, userData.productColors[userData.produces]);
                            if (advanceUreaCycleQuest(userData.advancesQuestTo)){
                            } else {
                                showFeedback(`${userData.produces} synthesized by the Donkey!`);
                            }
                        }},
                        { text: "Just admiring the... talking donkey."}
                    ], setGameInteracting);
                } else {
                    let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]);
                    showDialogue(`Hee-haw! To make Argininosuccinate, I need ${missing.join(' and ')}. Aspartate is key for that second nitrogen atom, you know!`, [{text: "Right-o."}], setGameInteracting);
                }
            } else {
                showDialogue("Hee-haw! Mighty strange seeing folks wanderin' 'round here. I'm just a simple donkey, really, who happens to be an expert in amino acid ligation.", [{text: "Okay then..."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ASLAN) { 
            if (currentQuest && currentQuest.state === userData.requiredQuestState) { 
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("You bring Argininosuccinate. I am Argininosuccinate Lyase, Aslan to my friends. With one decisive action, I cleave Argininosuccinate. This releases Fumarate, which can rejoin the Krebs cycle, and forms Arginine, which carries on in the Urea Cycle. A critical branch point! Shall I proceed?", [
                        { text: "Yes, mighty Aslan!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createGameBoySound('success');
                            let offset = 0;
                            userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset - 0.5, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            if(advanceUreaCycleQuest(userData.advancesQuestTo)) { 
                            } else {
                                showFeedback(`Aslan cleaves Argininosuccinate!`);
                            }
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else {
                    showDialogue("You require Argininosuccinate for my work. It is the substrate upon which I act.", [{text: "I understand."}], setGameInteracting);
                }
            } else if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && !(hasRequiredItems({Arginine: 1}) && hasRequiredItems({Fumarate: 1}))) {
                if (!hasRequiredItems({Arginine: 1})) {
                    showDialogue("Gather the Arginine I have created. It continues the Urea Cycle.", [{text: "I will."}], setGameInteracting);
                } else if (!hasRequiredItems({Fumarate: 1})) {
                     showDialogue("Gather the Fumarate I have created. It can return to the Krebs cycle as Malate.", [{text: "I will."}], setGameInteracting);
                } else {
                    showDialogue("You have collected both. Proceed with your task.", [{text: "I will."}], setGameInteracting);
                }
            }
            else {
                showDialogue("The balance of metabolic pathways is delicate. Tread carefully.", [{text: "I will."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ARGUS) { 
            if (currentQuest && currentQuest.state === userData.requiredQuestState) { 
                if (hasRequiredItems(userData.requires)) {
                    showDialogue("Ah, Arginine. My many eyes see its potential. I am Arginase-1, Argus to you. I perform the final hydrolysis: splitting Arginine into Urea – the waste product destined for excretion – and Ornithine. This Ornithine is then recycled back to the mitochondria to begin the cycle anew. Ready for the grand finale?", [
                        { text: "Proceed, Argus.", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            let offset = 0;
                             userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset -0.5 , z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            if(advanceUreaCycleQuest(userData.advancesQuestTo)) { 
                            } else {
                               showFeedback(`Argus finalizes the reaction!`);
                            }
                        }},
                        { text: "One moment."}
                    ], setGameInteracting);
                } else {
                    showDialogue("Bring me Arginine. It is the substrate I require to liberate Urea and regenerate Ornithine.", [{text: "I shall."}], setGameInteracting);
                }
            } else if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && !(hasRequiredItems({Urea: 1}) && hasRequiredItems({Ornithine: 1}))){
                if (!hasRequiredItems({Urea: 1})) {
                    showDialogue("Gather the Urea I have created. It must be disposed of.", [{text: "Understood."}], setGameInteracting);
                } else if (!hasRequiredItems({Ornithine: 1})) {
                    showDialogue("Gather the Ornithine I have created. It is key to continue the cycle.", [{text: "Understood."}], setGameInteracting);
                } else {
                     showDialogue("You have collected both. Fulfill your destiny.", [{text: "Understood."}], setGameInteracting);
                }
            }
            else {
                showDialogue("I see all... but I await the right moment for action. The precise orchestration of these reactions is paramount.", [{text: "Very well."}], setGameInteracting);
            }
        }
        // --- OTIS (OTC) Interaction ---
        else if (userData.name === CONSTANTS.NPC_NAMES.OTIS_OTC) {
            const dialogueTitle = "Otis (Ornithine Transcarbamoylase)";
            const educationalBlurb = "Well hello there! I'm Otis, representing Ornithine Transcarbamoylase. My job here in the mitochondria is a crucial one: I take Carbamoyl Phosphate and combine it with Ornithine. Poof! We get Citrulline, which is then ready to be shipped out to the cytosol. It's all about connecting the dots... or molecules, in this case!";
            const actionButtonText = `Let's make Citrulline!`;

            if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nBut it seems it's not the right time for my talents. Your current objective: ${currentQuest?.objectives[currentQuest.state] || "Start the quest with Professor Hepaticus."}`, [{ text: "Got it." }], setGameInteracting);
                return;
            }
            if (!hasRequiredItems(userData.requires)) {
                let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]).join(' and ');
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nLooks like you're missing ${missing}. Find those, and we can get to work!`, [{ text: "I'll find them." }], setGameInteracting);
                return;
            }
            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nYou've got everything! Ready to combine Carbamoyl Phosphate and Ornithine?`, [
                { text: actionButtonText, action: () => {
                    consumeItems(userData.requires);
                    playMoleculeGenerationSound();
                    createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[userData.produces]);
                    if (!advanceUreaCycleQuest(userData.advancesQuestTo)) {
                        showFeedback(`${userData.produces} created by Otis!`);
                    }
                }},
                { text: "Not right now." }
            ], setGameInteracting);
        }
        // --- CASPER (CPS1) Interaction ---
        else if (userData.name === CONSTANTS.NPC_NAMES.CASPER_CPS1) {
            const dialogueTitle = "Casper (Carbamoyl Phosphate Synthetase I)";
            const educationalBlurb = "Booo! Oh, don't be scared, I'm Casper, representing Carbamoyl Phosphate Synthetase I. I might be a bit... ethereal, but my job is solid! Here in the mitochondria, I kickstart the Urea Cycle by taking Bicarbonate, one Ammonia molecule, and TWO precious ATPs to create Carbamoyl Phosphate. It's the first big step to trap that pesky ammonia!";
            const actionButtonText = `Create Carbamoyl Phosphate!`;

            if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nBut oooh, the time isn't quite right. Your objective now is: ${currentQuest?.objectives[currentQuest.state] || "Begin your quest with Professor Hepaticus."}`, [{ text: "Okay, Casper." }], setGameInteracting);
                return;
            }
            if (!hasRequiredItems(userData.requires)) {
                let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]).join(' and ');
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nWhoops! You're missing ${missing}. You'll need all those to get this reaction going!`, [{ text: "I'll get them." }], setGameInteracting);
                return;
            }
            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nYou have all the ingredients! Shall we make some Carbamoyl Phosphate? It takes a bit of energy (ATP, that is!).`, [
                { text: actionButtonText, action: () => {
                    consumeItems(userData.requires);
                    playMoleculeGenerationSound();
                    createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[userData.produces]);
                    if (!advanceUreaCycleQuest(userData.advancesQuestTo)) {
                        showFeedback(`${userData.produces} created by Casper!`);
                    }
                }},
                { text: "Maybe later, ghost-friend." }
            ], setGameInteracting);
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
        showFeedback(`Collected ${userData.provides} from the ${userData.name}.`); // Simplified feedback

        // Quest advancement to STEP_0B_MAKE_BICARBONATE is now handled by checking inventory 
        // AFTER this interaction. The quest log UI will update automatically if state changes.
        if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 && hasRequiredItems({ 'Water': 1, 'CO2': 1 })) {
            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE); 
            // The feedback for the new objective will be handled by advanceUreaCycleQuest
        }
    }
    else if (userData.type === 'resource' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        const initialQuestDependentResources = ['NH3', 'ATP', 'Water', 'CO2', 'Bicarbonate']; 
        if (initialQuestDependentResources.includes(userData.name) && (!currentQuest || currentQuest.state === CONSTANTS.QUEST_STATE.NOT_STARTED)) {
            showFeedback("You should talk to Professor Hepaticus first.");
            return;
        }

        addToInventory(userData.name, 1);
        createGameBoySound('collect');
        removeResourceFromWorld(object); 
        hideInteractionPrompt(); 

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
                const itemsNeeded = { 'Citrulline': 1, 'Aspartate': 1, 'ATP': 1 }; 
                if (hasRequiredItems(itemsNeeded)) {
                    if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY)) questAdvancedGenericFeedbackSuppressed = true;
                }
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE && (userData.name === 'Arginine' || userData.name === 'Fumarate')) {
                specificFeedbackGivenForThisResource = true; 
                if (hasRequiredItems({'Arginine': 1}) && hasRequiredItems({'Fumarate': 1})) {
                    showFeedback(`Both Arginine and Fumarate collected! Take Fumarate to the Krebs Cycle Furnace.`);
                } else if (userData.name === 'Arginine' && inventory['Arginine'] >= 1 && !(inventory['Fumarate'] >=1) ) {
                    showFeedback("Arginine collected. Still need Fumarate.");
                } else if (userData.name === 'Fumarate' && inventory['Fumarate'] >= 1 && !(inventory['Arginine'] >=1) ) {
                    showFeedback("Fumarate collected. Still need Arginine.");
                } 
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && (userData.name === 'Urea' || userData.name === 'Ornithine')) {
                specificFeedbackGivenForThisResource = true; 
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
    else if (userData.type === 'station' && !interactionProcessedThisFrame) { 
        // This now primarily handles the CAVA Shrine, as OTC/CPS1 are NPCs
        interactionProcessedThisFrame = true;
        let dialogueTitle = userData.name;
        let educationalBlurb = "";
        let actionButtonText = `Activate ${userData.name}!`;

        if (userData.name === "CAVA Shrine") {
            dialogueTitle = "CAVA Shrine (Carbonic Anhydrase VA)";
            educationalBlurb = "Welcome, seeker, to the CAVA Shrine. Within my crystalline heart, the essence of Carbonic Anhydrase VA resides. Here in the mitochondrial cave, I blend Water and CO2, transforming them into Bicarbonate (HCO3-). This is the first substrate for the Urea Cycle.";
            actionButtonText = `Create Bicarbonate!`;
        }
        
        if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nBut the shrine slumbers. Your current objective: ${currentQuest?.objectives[currentQuest.state] || "Start quest first."}`, [{ text: "Understood" }], setGameInteracting);
            return;
        }
        if (!hasRequiredItems(userData.requires)) {
            let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]).join(' and ');
            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nYou seem to be missing: ${missing}. Gather them and return to awaken the shrine's power.`, [{ text: "I'll be back" }], setGameInteracting);
            return;
        }

        showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nYou have all the required components. Shall the transformation begin?`, [
            { text: actionButtonText, action: () => {
                createGameBoySound('success');
                playMoleculeGenerationSound();
                consumeItems(userData.requires);
                
                const stationObject = interactiveObjects.find(io => io.userData.name === userData.name && io.userData.type === 'station');
                let productYBase = 0.01; 
                if (stationObject) {
                    const stationGroup = stationObject; // CAVA Shrine is a group
                    productYBase = stationGroup.position.y; // Product should be relative to shrine's base
                }
                // Place product slightly in front of the shrine
                createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 1.5, yBase: productYBase }, userData.productColors[userData.produces]);
                
                questAdvancedGenericFeedbackSuppressed = false;
                if (userData.advancesQuestTo) {
                    if(advanceUreaCycleQuest(userData.advancesQuestTo)) questAdvancedGenericFeedbackSuppressed = true;
                }
                
                if (!questAdvancedGenericFeedbackSuppressed) {
                     showFeedback(`${userData.produces} created at ${userData.name}!`);
                }
            }},
            { text: "Not just yet." }
        ], setGameInteracting);
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

        consumeItems(userData.requires); 
        if (removePortalBarrierFromWorld(scene)) {
            console.log("Portal barrier removed by interaction.");
        }
        stopBackgroundMusic();
        playPortalCelebration(); 
        
        player.position.set(CONSTANTS.DIVIDING_WALL_X + 1.5, player.position.y, CONSTANTS.PORTAL_WALL_CENTER_Z);
        setPlayerLocation('cytosol');
        createResource(scene, 'Citrulline', { x: CONSTANTS.DIVIDING_WALL_X + 1, z: CONSTANTS.PORTAL_WALL_CENTER_Z + 1, yBase: 0.01 }, userData.productColor || CONSTANTS.CITRULLINE_COLOR);
        
        advanceUreaCycleQuest(userData.advancesQuestTo); 
    }
    else if (userData.type === 'wasteBucket' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (currentQuest?.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({ 'Urea': 1 })) {
            consumeItems({ 'Urea': 1 });
            createGameBoySound('success');
            if (hasRequiredItems({'Ornithine': 1})) { 
                 showFeedback("Urea disposed! With Ornithine in hand, see the Usher to complete the cycle's return trip.");
            } else {
                 showFeedback("Urea disposed! Now, ensure you have Ornithine to return to the Usher.");
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
            const furnaceMainMesh = getMeshToHighlight(object); // object is the furnace group
            if (furnaceMainMesh) {
                 createSimpleParticleSystem(scene, 50, CONSTANTS.EMBER_COLOR, 0.08, 0.5, 1.5, furnaceMainMesh.position.clone().add(new THREE.Vector3(0,0.7,0.4)), new THREE.Vector3(0.4, 0.1, 0.1));
            }

            if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS)) {
            } else {
                showFeedback("Fumarate fed to the Krebs Cycle! It will be converted to Malate, linking the Urea Cycle to the Krebs Cycle.");
            }
        } else if (inventory['Fumarate']) {
            showFeedback("You have Fumarate, but it's not time to use the furnace. Check your objective.");
        } else {
            showFeedback("This furnace processes Fumarate for the Krebs Cycle. You don't have any Fumarate or it's not the right time.");
        }
    }
    
    const gameStateAfterInteraction = getGameState();
    if (interactionProcessedThisFrame && !gameStateAfterInteraction.isUserInteracting) {
    }
}
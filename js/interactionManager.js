// js/interactionManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { showDialogue, showFeedback, showInteractionPrompt, hideInteractionPrompt } from './uiManager.js';
import { createGameBoySound, playMoleculeGenerationSound, playPortalCelebration, stopBackgroundMusic, startBackgroundMusic } from './audioManager.js';
import { advanceUreaCycleQuest, startUreaCycleQuest, startRealityRiverChallenge, hasRequiredItems, consumeItems, ureaCycleQuestData } from './questManager.js';
import { removePortalBarrierFromWorld, createResource, interactiveObjects, originalMaterials, removeResourceFromWorld } from './worldManager.js';
import { player } from './playerManager.js';
import { getGameState, setGameState, getCurrentQuest, getInventory, addToInventory, getPlayerLocation, setPlayerLocation } from './gameState.js';
import { createSimpleParticleSystem, createCollectionEffect } from './utils.js';
import { setNPCInteracting } from './npcManager.js';

const PRE_SURVEY_LINK = "https://forms.gle/yourpretestsurvey";
const POST_SURVEY_LINK = "https://forms.gle/yourposttestsurvey";


let closestInteractiveObject = null;
const highlightMaterial = new THREE.MeshStandardMaterial({ emissive: 0xffff00, emissiveIntensity: 0.7, roughness: 0.3 });

function getMeshToHighlight(interactiveObj) {
    if (!interactiveObj) return null;
    
    // Check for resourceMesh first (for new resource groups)
    if (interactiveObj.userData && interactiveObj.userData.resourceMesh) {
        return interactiveObj.userData.resourceMesh;
    }
    
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
            
            // Add quest indicator glow to relevant objects
            updateQuestIndicator(obj);
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

// Visual quest indicators
const questGlowMaterial = new THREE.MeshStandardMaterial({ 
    emissive: 0x00ff00, 
    emissiveIntensity: 0.3, 
    transparent: true,
    opacity: 0.8
});

function updateQuestIndicator(obj) {
    const currentQuest = getCurrentQuest();
    if (!currentQuest) return;
    
    const meshToGlow = getMeshToHighlight(obj);
    if (!meshToGlow || !meshToGlow.isMesh) return;
    
    // Check if this object is relevant to current quest
    let isQuestRelevant = false;
    
    // Check NPCs
    if (obj.userData.type === 'npc') {
        switch (currentQuest.state) {
            case CONSTANTS.QUEST_STATE.NOT_STARTED:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS;
                break;
            case CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.CASPER_CPS1;
                break;
            case CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER:
            case CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.ORNITHINE_USHER;
                break;
            case CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.OTIS_OTC;
                break;
            case CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.DONKEY;
                break;
            case CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.ASLAN;
                break;
            case CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS:
                isQuestRelevant = obj.userData.name === 'Arginine' || obj.userData.name === 'Fumarate';
                break;
            case CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.FUMARASE_ENZYME;
                break;
            case CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE:
                isQuestRelevant = obj.userData.name === 'Malate';
                break;
            case CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE:
            case CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER;
                break;
            case CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.ARGUS;
                break;
            case CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS;
                break;
        }
    }
    
    // Check resources
    if (obj.userData.type === 'resource') {
        switch (currentQuest.state) {
            case CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2:
                isQuestRelevant = obj.userData.name === 'Water';
                break;
            case CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2:
                isQuestRelevant = obj.userData.name === 'CO2';
                break;
            case CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE:
                isQuestRelevant = obj.userData.name === 'Bicarbonate';
                break;
            case CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3:
                isQuestRelevant = obj.userData.name === 'NH3';
                break;
            case CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP:
            case CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP:
                isQuestRelevant = obj.userData.name === 'ATP' && obj.position.x < CONSTANTS.RIVER_CENTER_X;
                break;
            case CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS:
                isQuestRelevant = obj.userData.name === 'Carbamoyl Phosphate';
                break;
            case CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE:
                isQuestRelevant = obj.userData.name === 'Citrulline';
                break;
            case CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP:
                isQuestRelevant = obj.userData.name === 'ATP';
                break;
        }
    }
    
    // Check special objects
    if (obj.userData.name === 'CAVA Shrine' && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE) {
        isQuestRelevant = true;
    }
    if (obj.userData.name === 'ORNT1 Portal' && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL) {
        isQuestRelevant = true;
    }
    if (obj.userData.name === 'Waste Receptacle' && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA) {
        isQuestRelevant = true;
    }
    
    // Apply or remove quest glow
    if (isQuestRelevant && !meshToGlow.userData.hasQuestGlow) {
        meshToGlow.userData.originalEmissive = meshToGlow.material.emissive ? meshToGlow.material.emissive.clone() : new THREE.Color(0x000000);
        meshToGlow.userData.originalEmissiveIntensity = meshToGlow.material.emissiveIntensity || 0;
        meshToGlow.material.emissive = new THREE.Color(0x00ff00);
        meshToGlow.material.emissiveIntensity = 0.3 * Math.sin(Date.now() * 0.002) + 0.3; // Pulsing effect
        meshToGlow.userData.hasQuestGlow = true;
    } else if (!isQuestRelevant && meshToGlow.userData.hasQuestGlow) {
        meshToGlow.material.emissive = meshToGlow.userData.originalEmissive;
        meshToGlow.material.emissiveIntensity = meshToGlow.userData.originalEmissiveIntensity;
        meshToGlow.userData.hasQuestGlow = false;
    }
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
            if (!currentQuest || (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.NOT_STARTED)) {
                 showDialogue("Welcome! The cell is overwhelmed with ammonia! We need to convert it to Urea. Before we begin, would you like to take a brief pre-quest survey? Your feedback is valuable!", [
                     { text: "Take Pre-Quest Survey", action: () => { window.open(PRE_SURVEY_LINK, '_blank'); }},
                     { text: "Accept Quest", action: () => {
                         if(startUreaCycleQuest()) {
                            startBackgroundMusic();
                         }
                     }},
                     { text: "Decline Quest" }
                 ], setGameInteracting);
            } else if (currentQuest && currentQuest.id === 'ureaCycle') {
                if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE) {
                     showDialogue("Ready to test your knowledge on the Urea Cycle?", [
                         { text: "Yes, start the challenge!", action: startRealityRiverChallenge },
                         { text: "Give me a moment." }
                     ], setGameInteracting);
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.COMPLETED) {
                     showDialogue("Congratulations on completing the Urea Cycle quest! Your understanding is superb. Would you like to take a short post-quest survey to help us improve?", [
                         { text: "Take Post-Quest Survey", action: () => { window.open(POST_SURVEY_LINK, '_blank'); }},
                         { text: "You're welcome."}
                     ], setGameInteracting);
                } else {
                     showDialogue(`Current Objective: ${ureaCycleQuestData.objectives[currentQuest.state]}`, [ { text: "Okay"} ], setGameInteracting);
                }
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ORNITHINE_USHER) {
             // Set NPC as interacting when dialogue starts
             setNPCInteracting(CONSTANTS.NPC_NAMES.ORNITHINE_USHER, true);
             const usherInteractionCallback = (isInteracting) => {
                 setGameInteracting(isInteracting);
                 if (!isInteracting) {
                     // Set NPC as not interacting when dialogue ends
                     setNPCInteracting(CONSTANTS.NPC_NAMES.ORNITHINE_USHER, false);
                 }
             };
             
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
                    ], usherInteractionCallback);
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE) {
                    if (hasRequiredItems({ 'Citrulline': 1 })) {
                        showDialogue("Excellent, you've made Citrulline! It's ready for its journey to the cytosol. You may pass through the ORNT1 portal bridge.", [
                            { text: "Thank you!", action: () => {
                                setGameState({hasPortalPermission: true});
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL);
                            }}
                        ], usherInteractionCallback);
                    } else {
                        showDialogue("You need Citrulline to pass. Remember, I help transport it. Come back when you have it.", [{ text: "Okay" }], usherInteractionCallback);
                    }
                } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({'Ornithine': 1})) {
                     showDialogue("Welcome back, traveler! You've returned with Ornithine. I'll ensure it gets back into the mitochondria, ready to start the cycle anew. Well done!", [
                        { text: "Indeed!", action: () => {
                            consumeItems({'Ornithine': 1});
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE);
                        }}
                    ], usherInteractionCallback);
                } else if (currentQuest.state < CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER) {
                    showDialogue("Greetings! I am the Ornithine Usher. I guard this passage and facilitate the transport of Ornithine and Citrulline across the mitochondrial membrane.", [{ text: "Interesting." }], usherInteractionCallback);
                } else if (currentQuest.state > CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL && currentQuest.state < CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA) {
                     showDialogue("Keep up the good work in the Cytosol! Remember, the cycle links two cellular compartments.", [{ text: "Will do." }], usherInteractionCallback);
                } else {
                    showDialogue("The cycle continues, a testament to efficient biochemical pathways...", [{ text: "Indeed." }], usherInteractionCallback);
                }
            } else {
                 showDialogue("I am the Ornithine Usher. Speak to Professor Hepaticus to learn about the Urea Cycle.", [{ text: "Okay" }], usherInteractionCallback);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.DONKEY) {
            // Flexible quest state check for Donkey
            const donkeyStates = [
                CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY,
                CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN
            ];
            if (currentQuest && donkeyStates.includes(currentQuest.state)) {
                if (inventory['Argininosuccinate']) {
                    showDialogue("You already have Argininosuccinate! Take it to Aslan, the Chomper (ASL) for the next step.", [{ text: "On it!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("Hee-haw! Got Citrulline, Aspartate, and ATP? I'm Argininosuccinate Synthetase (ASS) - call me Donkey! I take that Citrulline from the mitochondria, and with Aspartate providing the second nitrogen and ATP for energy, I stitch 'em together to make Argininosuccinate. It's a vital link! Ready to synthesize?", [
                        { text: "Yes, let's do it!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 2, yBase: object.position.y }, userData.productColors[userData.produces]);
                            // Always advance to STEP_10_TALK_TO_ASLAN if not already there
                            if (currentQuest.state !== CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN) {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN);
                            }
                        }},
                        { text: "Just admiring the... talking donkey."}
                    ], setGameInteracting);
                } else {
                    let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]);
                    showDialogue(`Hee-haw! To make Argininosuccinate, I need ${missing.join(' and ')}. Aspartate is key for that second nitrogen atom, you know! Get it from the Shuttle Driver.`, [{text: "Right-o."}], setGameInteracting);
                }
            } else {
                showDialogue("Hee-haw! Mighty strange seeing folks wanderin' 'round here. I'm just a simple donkey, really, who happens to be an expert in amino acid ligation.", [{text: "Okay then..."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ASLAN) {
            // Flexible quest state check for Aslan
            const aslanStates = [
                CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY,
                CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN,
                CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE
            ];
            if (currentQuest && aslanStates.includes(currentQuest.state)) {
                if (inventory['Arginine'] && inventory['Fumarate']) {
                    showDialogue("You already have Arginine and Fumarate! Take Fumarate to the Fumarase Enzyme for the next step.", [{ text: "On it!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("You bring Argininosuccinate. I am Argininosuccinate Lyase, Aslan to my friends. With one decisive action, I cleave Argininosuccinate. This releases Fumarate, and forms Arginine, which carries on in the Urea Cycle. A critical branch point! Shall I proceed?", [
                        { text: "Yes, mighty Aslan!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createGameBoySound('success');
                            let offset = 0;
                            userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset - 0.5, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            // Advance to collection step
                            if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN) {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS);
                            }
                        }},
                        { text: "Not yet."}
                    ], setGameInteracting);
                } else {
                    showDialogue("You require Argininosuccinate for my work. It is the substrate upon which I act.", [{text: "I understand."}], setGameInteracting);
                }
            } else if (currentQuest && (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS || currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE) && !(hasRequiredItems({Arginine: 1}) && hasRequiredItems({Fumarate: 1}))) {
                if (!hasRequiredItems({Arginine: 1})) {
                    showDialogue("Gather the Arginine I have created. It continues the Urea Cycle.", [{text: "I will."}], setGameInteracting);
                } else if (!hasRequiredItems({Fumarate: 1})) {
                     showDialogue("Gather the Fumarate I have created. You'll need to take it to the Fumarase Enzyme.", [{text: "I will."}], setGameInteracting);
                } else {
                    showDialogue("You have collected both. Proceed with your task.", [{text: "I will."}], setGameInteracting);
                }
            }
            else {
                showDialogue("The balance of metabolic pathways is delicate. Tread carefully.", [{text: "I will."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.ARGUS) {
            // Flexible quest state check for Argus
            const argusStates = [
                CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE,
                CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS,
                CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA
            ];
            if (currentQuest && argusStates.includes(currentQuest.state)) {
                if (inventory['Urea'] && inventory['Ornithine']) {
                    showDialogue("You already have Urea and Ornithine! Dispose of Urea and return Ornithine to the Usher.", [{ text: "On it!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("Ah, Arginine. My many eyes see its potential. I am Arginase-1, Argus to you. I perform the final hydrolysis: splitting Arginine into Urea – the waste product destined for excretion – and Ornithine. This Ornithine is then recycled back to the mitochondria to begin the cycle anew. Ready for the grand finale?", [
                        { text: "Proceed, Argus.", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            let offset = 0;
                            userData.produces.forEach(prod => {
                                createResource(scene, prod, { x: object.position.x + offset -0.5 , z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[prod]);
                                offset += 1.0;
                            });
                            // Always advance to STEP_13_DISPOSE_UREA if not already there
                            if (currentQuest.state !== CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA) {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA);
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
        else if (userData.name === CONSTANTS.NPC_NAMES.FUMARASE_ENZYME) {
            // Flexible quest state check for Fumarase
            const fumaraseStates = [
                CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN,
                CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE,
                CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE
            ];
            if (currentQuest && fumaraseStates.includes(currentQuest.state)) {
                if (inventory['Malate']) {
                    showDialogue("You already have Malate! Take it to Malcolm the Shuttle Driver for the next step.", [{ text: "On it!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("Ah, Fumarate! I am the Fumarase Enzyme. I can hydrate this Fumarate to produce Malate. Ready for the transformation?", [
                        { text: "Yes, convert it!", action: () => {
                            consumeItems(userData.requires);
                            playMoleculeGenerationSound();
                            createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[userData.produces]);
                            // Always advance to STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE if not already there
                            if (currentQuest.state !== CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE) {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE);
                            }
                        }},
                        { text: "Not just yet."}
                    ], setGameInteracting);
                } else {
                    showDialogue("You need Fumarate for me to work my magic. Bring it to me!", [{text: "I will."}], setGameInteracting);
                }
            } else {
                showDialogue("I am the Fumarase Enzyme. I convert Fumarate to Malate. Check your objectives to see if you need my services.", [{text: "Okay."}], setGameInteracting);
            }
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER) {
            // Flexible quest state check for Malcolm the Shuttle Driver
            const malcolmStates = [
                CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE,
                CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE,
                CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY
            ];
            // Helper: quest state order for comparison
            const questStateOrder = [
                CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE,
                CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP,
                CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE,
                CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY,
                CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN,
                CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE,
                CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE,
                CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS,
                CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA,
                CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE,
                CONSTANTS.QUEST_STATE.COMPLETED
            ];
            function isEarlierThan(stateA, stateB) {
                return questStateOrder.indexOf(stateA) < questStateOrder.indexOf(stateB);
            }
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE) {
                if (!inventory['Aspartate']) {
                    showDialogue("Welcome! I'm Malcolm, the Malate-Aspartate Shuttle Driver. The shuttle I manage is crucial for the Urea Cycle. I exchange Malate and Aspartate between the mitochondria and cytosol. Aspartate is essential for Argininosuccinate synthesis because it provides the second nitrogen atom. Would you like some Aspartate to continue your quest?", [
                        { text: "Yes, please!", action: () => {
                            addToInventory('Aspartate', 1);
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY);
                        }},
                        { text: "Not right now." }
                    ], setGameInteracting);
                } else {
                    showDialogue("You already have Aspartate. Remember, it's key for the second nitrogen in Argininosuccinate synthesis.", [{ text: "Got it." }], setGameInteracting);
                }
                return;
            }
            if (currentQuest && malcolmStates.includes(currentQuest.state)) {
                if (inventory['Aspartate'] && !inventory['Malate']) {
                    showDialogue("You already have Aspartate! Take it to Donkey, the Synthesizer (ASS) for the next step.", [{ text: "On it!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("Welcome to the Malate-Aspartate Shuttle! Got Malate there? I'll take that into the Mitochondria for you. In exchange, Aspartate gets shuttled out here to the Cytosol. It's a crucial exchange for many pathways!", [
                        { text: "Let's do the exchange!", action: () => {
                            consumeItems(userData.requires);
                            addToInventory('Aspartate', 1);
                            playMoleculeGenerationSound();
                            showFeedback("Malate transported in, Aspartate received in Cytosol!");
                            setTimeout(() => {
                                // Robust guidance: if player has Arginine, guide to Argus
                                if (inventory['Arginine']) {
                                    // Helper: quest state order for comparison
                                    if (isEarlierThan(currentQuest.state, CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS)) {
                                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS);
                                    }
                                    showDialogue("You now have Arginine and Aspartate! Go speak with Argus, the Finalizer (ARG1), to complete the Urea Cycle.", [{text:"On it!"}], setGameInteracting);
                                } else {
                                    showDialogue("Player: (Aha! So *that's* where the Aspartate for Argininosuccinate synthesis comes from! I was wondering about that.)", [{text:"Got it!"}], setGameInteracting);
                                }
                            }, 1500);
                            // Only advance to STEP_9_TALK_TO_DONKEY if current state is earlier
                            if (isEarlierThan(currentQuest.state, CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY)) {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY);
                            }
                        }},
                        { text: "Hold on a moment."}
                    ], setGameInteracting);
                } else {
                    showDialogue("The Malate-Aspartate Shuttle needs Malate from the Cytosol to operate. Come back when you have some!", [{text: "Understood."}], setGameInteracting);
                }
            } else {
                 showDialogue("This is the Malate-Aspartate Shuttle stop. I help exchange Malate and Aspartate between compartments. What can I do for you?", [{text: "Just looking."}], setGameInteracting);
            }
        }

        else {
             setGameInteracting(false);
        }
    }
    else if (userData.type === 'source' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (!currentQuest || currentQuest.id !== 'ureaCycle' || currentQuest.state !== userData.requiredQuestState) {
            showFeedback(`Not the right time to use the ${userData.name}.`, 3000);
            return;
        }
        if (inventory[userData.provides] >=1) {
            showFeedback(`You already have ${userData.provides}.`);
            return;
        }

        addToInventory(userData.provides, 1);
        createGameBoySound('collect');
        showFeedback(`Collected ${userData.provides} from the ${userData.name}.`);

        // Advance quest based on what was collected
        if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 && userData.provides === 'Water') {
            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2);
        } else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2 && userData.provides === 'CO2') {
            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE);
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
        
        // Add collection effect
        const resourceColor = userData.color || 0xffffff;
        createCollectionEffect(scene, object.position, resourceColor, userData.name);
        
        removeResourceFromWorld(object);
        hideInteractionPrompt();

        let specificFeedbackGivenForThisResource = false;
        questAdvancedGenericFeedbackSuppressed = false;

        if (currentQuest?.id === 'ureaCycle') {
            if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE && userData.name === 'Bicarbonate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3 && userData.name === 'NH3') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP && userData.name === 'ATP') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("First ATP collected! You need one more.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP && userData.name === 'ATP' && hasRequiredItems({ 'ATP': 2 })) {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("Both ATPs collected! Now go to Casper.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS && userData.name === 'Carbamoyl Phosphate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE && userData.name === 'Citrulline') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP && userData.name === 'ATP') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS) {
                if (userData.name === 'Arginine' || userData.name === 'Fumarate') {
                    specificFeedbackGivenForThisResource = true;
                    if (hasRequiredItems({'Arginine': 1}) && hasRequiredItems({'Fumarate': 1})) {
                        showFeedback(`Both Arginine and Fumarate collected!`);
                        if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE)) questAdvancedGenericFeedbackSuppressed = true;
                    } else if (userData.name === 'Arginine' && inventory['Arginine'] >= 1 && !(inventory['Fumarate'] >=1) ) {
                        showFeedback("Arginine collected. Still need Fumarate.");
                    } else if (userData.name === 'Fumarate' && inventory['Fumarate'] >= 1 && !(inventory['Arginine'] >=1) ) {
                        showFeedback("Fumarate collected. Still need Arginine.");
                    }
                }
            }
             else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE) {
                specificFeedbackGivenForThisResource = true;
                if (userData.name === 'Arginine' || userData.name === 'Fumarate') {
                    if (hasRequiredItems({'Arginine': 1}) && hasRequiredItems({'Fumarate': 1})) {
                        showFeedback(`Both Arginine and Fumarate collected! Take Fumarate to the Fumarase Enzyme.`);
                    } else if (userData.name === 'Arginine' && inventory['Arginine'] >= 1 && !(inventory['Fumarate'] >=1) ) {
                        showFeedback("Arginine collected. Still need Fumarate.");
                    } else if (userData.name === 'Fumarate' && inventory['Fumarate'] >= 1 && !(inventory['Arginine'] >=1) ) {
                        showFeedback("Fumarate collected. Still need Arginine.");
                    }
                }
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE && userData.name === 'Malate') {
                specificFeedbackGivenForThisResource = true;
                showFeedback("Malate collected!");
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE)) questAdvancedGenericFeedbackSuppressed = true;
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
                    const stationGroup = stationObject;
                    productYBase = stationGroup.position.y;
                }
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

        // Player lands on the Cytosol side of the bridge
        player.position.set(CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2 + 1.0, CONSTANTS.BRIDGE_HEIGHT, CONSTANTS.BRIDGE_CENTER_Z);
        setPlayerLocation('cytosol');
        // Place Citrulline resource on the Cytosol side of the bridge
        createResource(scene, 'Citrulline', { x: CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2 + 0.5, z: CONSTANTS.BRIDGE_CENTER_Z + 1, yBase: CONSTANTS.BRIDGE_HEIGHT + 0.01, name: "Citrulline_bridge" }, userData.productColor || CONSTANTS.CITRULLINE_COLOR);

        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE);
    }
    else if (userData.type === 'wasteBucket' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;
        if (currentQuest?.state === CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA && hasRequiredItems({ 'Urea': 1 })) {
            consumeItems({ 'Urea': 1 });
            createGameBoySound('success');

            const bucketPos = object.getWorldPosition(new THREE.Vector3()); // Get world position of the bucket group
            createSimpleParticleSystem(scene, 100, 0xFFA500, 0.12, 0.9, 2.5, bucketPos.add(new THREE.Vector3(0, 0.5, 0)), new THREE.Vector3(0.6, 0.6, 0.6));
            playMoleculeGenerationSound();

            if (hasRequiredItems({'Ornithine': 1})) {
                 showFeedback("Urea disposed! Fantastic! With Ornithine in hand, see the Usher to complete the cycle's return.", 4000);
            } else {
                 showFeedback("Urea disposed! Excellent work! Now, ensure you have Ornithine to return to the Usher.", 4000);
            }
        } else if (inventory['Urea']) {
            showFeedback("You have Urea, but it's not time to dispose of it yet. Check your objective.");
        } else {
            showFeedback("This is a waste receptacle for Urea. You don't have any to dispose of or it's not the right time.");
        }
    }
    // Krebs Furnace interaction is removed as it's replaced by Fumarase NPC

    const gameStateAfterInteraction = getGameState();
    if (interactionProcessedThisFrame && !gameStateAfterInteraction.isUserInteracting) {
        // This space can be used for any cleanup or state setting after an interaction completes
        // and if the game is not immediately going into another interaction.
    }
}
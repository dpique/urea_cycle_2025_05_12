// js/interactionManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { showDialogue, showFeedback, showInteractionPrompt, hideInteractionPrompt, updateDialogueContent } from './uiManager.js';
import { createGameBoySound, playMoleculeGenerationSound, playPortalCelebration, stopBackgroundMusic, startBackgroundMusic } from './audioManager.js';
import { advanceUreaCycleQuest, startUreaCycleQuest, startRealityRiverChallenge, hasRequiredItems, consumeItems, ureaCycleQuestData } from './questManager.js';
import { removePortalBarrierFromWorld, removeGateBarrierFromWorld, createResource, interactiveObjects, originalMaterials, removeResourceFromWorld } from './worldManager.js';
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
            case CONSTANTS.QUEST_STATE.STEP_0_MEET_CASPER:
            case CONSTANTS.QUEST_STATE.STEP_1C_CASPER_NEEDS_COFFEE:
            case CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.CASPER_CPS1;
                break;
            case CONSTANTS.QUEST_STATE.STEP_1D_TALK_TO_NAGESH:
            case CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG:
                isQuestRelevant = obj.userData.name === CONSTANTS.NPC_NAMES.NAGESH_NAGS;
                break;
            case CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER:
                isQuestRelevant = obj.userData.name === 'River Guardian';
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
            case CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3:
                isQuestRelevant = obj.userData.name === 'NH3';
                break;
            case CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER:
                isQuestRelevant = obj.userData.name === 'Water';
                break;
            case CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2:
                isQuestRelevant = obj.userData.name === 'CO2';
                break;
            case CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE:
                isQuestRelevant = obj.userData.name === 'Bicarbonate';
                break;
            case CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP:
            case CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP:
                isQuestRelevant = obj.userData.name === 'ATP' && obj.position.x < CONSTANTS.RIVER_CENTER_X;
                break;
            case CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS:
                isQuestRelevant = obj.userData.name === 'Acidic Coffin Grounds';
                break;
            case CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE:
                isQuestRelevant = obj.userData.name === 'Glutamate';
                break;
            case CONSTANTS.QUEST_STATE.STEP_1H_COLLECT_NAG:
                isQuestRelevant = obj.userData.name === "Nagesh's Coffee";
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
    if (obj.userData.name === 'Calvin' && (
        currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 ||
        currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER || // Player returning with Water
        currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2 ||
        currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE
    )) {
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
    console.log('[InteractWithObject] Called with:', object?.userData?.name, 'isUserInteracting:', gameState.isUserInteracting);
    
    // Special case: Allow River Guardian to continue dialogue even when already interacting
    const isRiverGuardianContinuation = object?.userData?.name === 'River Guardian' && 
                                       object?.userData?.dialogueState && 
                                       object?.userData?.dialogueState !== 'initial';
    
    if (!object || (gameState.isUserInteracting && !isRiverGuardianContinuation)) {
        console.log('[InteractWithObject] Early return - object:', !!object, 'isInteracting:', gameState.isUserInteracting);
        return;
    }

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
                 showDialogue("Hello, I am Professor Hepaticus. I am an expert in the liver, the main metabolic organ in the body.", [
                     { text: "Nice to meet you!", hideOnClick: false, action: () => {
                         showDialogue("I am also the mayor of Liverland, a vital region responsible for processing nutrients and detoxifying harmful substances.", [
                             { text: "What's happening in Liverland?", hideOnClick: false, action: () => {
                                 showDialogue("We have a serious problem! The amino acid dump has been releasing toxic ammonia into our cellular environment.", [
                                     { text: "That sounds dangerous!", hideOnClick: false, action: () => {
                                         showDialogue("Indeed! Ammonia is extremely toxic to cells. Liverland needs your help to convert this dangerous ammonia into urea, a much safer molecule that can be safely disposed of.", [
                                             { text: "How can I help?", hideOnClick: false, action: () => {
                                                 showDialogue("Before we begin this important quest, would you like to take a brief pre-quest survey? Your feedback is valuable!", [
                                                     { text: "Take Pre-Quest Survey", action: () => { window.open(PRE_SURVEY_LINK, '_blank'); }},
                                                     { text: "Accept Quest", action: () => {
                                                         if(startUreaCycleQuest()) {
                                                            startBackgroundMusic();
                                                         }
                                                     }},
                                                     { text: "Decline Quest" }
                                                 ], setGameInteracting);
                                             }}
                                         ], setGameInteracting);
                                     }}
                                 ], setGameInteracting);
                             }}
                         ], setGameInteracting);
                     }}
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
                    showDialogue("Ah, you're here for Otis! I'm the Ornithine Usher. I help Ornithine move back into the mitochondria, and Citrulline out.", [
                        { text: "Can I get some Ornithine?", hideOnClick: false, action: () => {
                            showDialogue("You know, I spend ALL DAY shuttling Ornithine from the Cytosol back into the Mitochondria... it's exhausting work, and now you want some for FREE?", [
                                { text: "Maybe I could offer you some Nagesh's Coffee?", hideOnClick: false, action: () => {
                                    showDialogue("*The Usher's eyes widen*\n\nNagesh's Coffee?! That vile, bitter brew? The one that smells like burnt amino acids and regret? Only Casper drinks that stuff!", [
                                        { text: "Uh... yes?", hideOnClick: false, action: () => {
                                            showDialogue("No thank you! *pauses* ...Actually, you know what? Never mind. Just take the Ornithine. I wouldn't wish that coffee on anyone. Consider it a professional courtesy - Otis is a good colleague, and he needs this for his work.", [
                                                { text: "Thank you so much!", action: () => {
                                                    addToInventory('Ornithine', 1);
                                                    if (advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE)) {
                                                    } else {
                                                        showFeedback("Ornithine received!");
                                                    }
                                                }}
                                            ], usherInteractionCallback);
                                        }}
                                    ], usherInteractionCallback);
                                }},
                                { text: "I really need it for the Urea Cycle!", hideOnClick: false, action: () => {
                                    showDialogue("*sighs* The Urea Cycle... yes, of course. Fine, fine. I suppose that IS important work.", [
                                        { text: "It really is!", hideOnClick: false, action: () => {
                                            showDialogue("Ammonia detoxification keeps the whole cell alive, after all. Here, take this Ornithine. But remember - without transporters like me, none of this would work! The cycle depends on shuttling molecules between compartments!", [
                                                { text: "I appreciate your hard work!", action: () => {
                                                    addToInventory('Ornithine', 1);
                                                    if (advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE)) {
                                                    } else {
                                                        showFeedback("Ornithine received!");
                                                    }
                                                }}
                                            ], usherInteractionCallback);
                                        }}
                                    ], usherInteractionCallback);
                                }}
                            ], usherInteractionCallback);
                        }}
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
                    showDialogue("HEE-HAW! You already have Argininosuccinate! Take it to Aslan, the Chomper (ASL) for the next step. This stubborn donkey's work is done!", [{ text: "Thanks, Donkey!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("HEE-HAW! Perfect! I'm Donkey, the Synthesizer - representing Argininosuccinate Synthetase (ASS).", [
                        { text: "Tell me about your work.", hideOnClick: false, action: () => {
                            showDialogue("Now listen up: I'm as stubborn as they come, and when I set my mind to joining two things together, NOTHING stops me!", [
                                { text: "How do you do it?", hideOnClick: false, action: () => {
                                    showDialogue("I'll take your Citrulline and Aspartate, and with some good ol' ATP energy, I'll KICK them together - literally!", [
                                        { text: "That sounds intense!", hideOnClick: false, action: () => {
                                            showDialogue("Us donkeys are patient workers - this synthesis takes time and effort, but I REFUSE to give up until these molecules are properly joined! Ready to see some stubborn donkey determination?", [
                                                { text: "KICK them together!", hideOnClick: false, action: () => {
                                                    showDialogue("*Donkey positions the molecules carefully*\n\nHEE-HAW! Watch this! *KICK* *KICK*", [
                                                        { text: "Wow!", hideOnClick: false, action: () => {
                                                            showDialogue("There we go! With my powerful hind legs and stubborn persistence, I've joined Citrulline and Aspartate into Argininosuccinate!", [
                                                                { text: "Impressive!", hideOnClick: false, action: () => {
                                                                    showDialogue("See? When a donkey sets their mind to something, it gets DONE! That's the secret to good synthesis - never give up, keep kicking until the bonds form!", [
                                                                        { text: "Amazing work, Donkey!", action: () => {
                                                                            consumeItems(userData.requires);
                                                                            playMoleculeGenerationSound();
                                                                            createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 2, yBase: object.position.y }, userData.productColors[userData.produces]);
                                                                            // Always advance to STEP_10_TALK_TO_ASLAN if not already there
                                                                            if (currentQuest.state !== CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN) {
                                                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN);
                                                                            }
                                                                        }}
                                                                    ], setGameInteracting);
                                                                }}
                                                            ], setGameInteracting);
                                                        }}
                                                    ], setGameInteracting);
                                                }}
                                            ], setGameInteracting);
                                        }}
                                    ], setGameInteracting);
                                }}
                            ], setGameInteracting);
                        }}
                    ], setGameInteracting);
                } else {
                    let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]);
                    showDialogue(`HEE-HAW! Hold your horses... er, donkeys! To do my synthesis work, I need ${missing.join(' and ')}. I'm stubborn, but I can't kick together molecules that aren't here! That Aspartate is especially important - provides the second nitrogen atom, you know. Get what I need and I'll show you some REAL donkey determination!`, [{text: "I'll get them!"}], setGameInteracting);
                }
            } else {
                showDialogue("HEE-HAW! Name's Donkey, the Synthesizer! I'm a stubborn worker who specializes in KICKING molecules together with precision and patience. When you need Argininosuccinate synthesized, I'm your donkey!", [{text: "Good to know!"}], setGameInteracting);
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
                                createResource(scene, prod, { x: object.position.x + offset - 1.0, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[prod]);
                                offset += 2.0; // Spread them out more
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
            const dialogueTitle = "Otis the Ogre (OTC)";
            const educationalBlurb = "ROAR! Er, I mean... hello there! I'm Otis the Ogre, and I represent Ornithine Transcarbamoylase. Don't let my green complexion scare ya! My job here in the mitochondria is SMASHING molecules together - with my POWERFUL HANDS, I take Carbamoyl Phosphate and Ornithine and SMUSH them into Citrulline! It's ogre-ly satisfying work!";
            const actionButtonText = `SMASH them together!`;

            if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nBut hold on there, buddy! It's not the right time for my ogre strength. Your quest says: ${currentQuest?.objectives[currentQuest.state] || "Start with Professor Hepaticus."}`, [{ text: "Got it, Otis!" }], setGameInteracting);
                return;
            }
            if (!hasRequiredItems(userData.requires)) {
                let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]).join(' and ');

                // Special guidance for Ornithine
                if (!inventory['Ornithine'] && inventory['Carbamoyl Phosphate']) {
                    showDialogue(`${dialogueTitle}:\n${educationalBlurb}`, [
                        { text: "I have Carbamoyl Phosphate!", hideOnClick: false, action: () => {
                            showDialogue("You've got Carbamoyl Phosphate - excellent! But ogres need BOTH ingredients to smush 'em together.", [
                                { text: "What am I missing?", hideOnClick: false, action: () => {
                                    showDialogue("You're missing Ornithine! Head over to my friend, the Ornithine Usher, near the bridge. He'll hook you up with some Ornithine, then come back and we'll make some magic happen!", [
                                        { text: "I'll go find the Usher!" }
                                    ], setGameInteracting);
                                }}
                            ], setGameInteracting);
                        }}
                    ], setGameInteracting);
                    return;
                }

                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nOgres need their ingredients! You're missing ${missing}. Can't smush what ya don't have!`, [{ text: "I'll find them!" }], setGameInteracting);
                return;
            }
            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nPerfect! You've got both molecules! Ready to watch some ogre magic? I'll SMASH Carbamoyl Phosphate and Ornithine together to make something... citrusy! Well, Citrulline, actually. Same diff!`, [
                { text: actionButtonText, action: () => {
                    consumeItems(userData.requires);
                    playMoleculeGenerationSound();
                    createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[userData.produces]);
                    if (!advanceUreaCycleQuest(userData.advancesQuestTo)) {
                        showFeedback(`Citrulline created! Smells citrusy... kinda.`);
                    }
                }},
                { text: "Not right now, big guy." }
            ], setGameInteracting);
        }
        else if (userData.name === CONSTANTS.NPC_NAMES.CASPER_CPS1) {
            const dialogueTitle = "Casper (Carbamoyl Phosphate Synthetase I)";

            // STEP_0_MEET_CASPER: First encounter at graveyard
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_MEET_CASPER) {
                const casperObj = object;

                // Initialize dialogue state if needed
                if (!casperObj.userData.dialogueState) {
                    casperObj.userData.dialogueState = 'initial';
                }

                switch(casperObj.userData.dialogueState) {
                    case 'initial':
                        showDialogue("*cough cough* Booo... oh, excuse me. I'm Casper the Ghost, and I represent Carbamoyl Phosphate Synthetase I.", [
                            { text: "A talking ghost?!", hideOnClick: false, action: () => {
                                casperObj.userData.dialogueState = 'graveyard';
                                showDialogue("Welcome to the Animal Graveyard! *sniff* Do you smell that? It's AMMONIA - NH3 - from all these decomposing amino acids!", [
                                    { text: "It does smell terrible!", hideOnClick: false, action: () => {
                                        casperObj.userData.dialogueState = 'problem';
                                        showDialogue("As a ghost, I don't have a physical nose, but even I can sense this overwhelming stench! The ammonia problem here is getting out of hand.", [
                                            { text: "What can I do?", hideOnClick: false, action: () => {
                                                casperObj.userData.dialogueState = 'request';
                                                showDialogue("Can you help collect some of this ammonia? But BE CAREFUL - ammonia is EXTREMELY TOXIC! Even carrying it will damage your health!", [
                                                    { text: "Wait, it will hurt me?", hideOnClick: false, action: () => {
                                                        showDialogue("Yes! That's why we need to be smart about this. I have a cauldron here where I store the ammonia safely. You'll need to collect the NH3 molecules ONE AT A TIME and bring each one to my cauldron immediately.", [
                                                            { text: "One at a time?", hideOnClick: false, action: () => {
                                                                showDialogue("Exactly! Your health will decrease while you're holding ammonia. If you hold onto it too long or collect too many at once, you could die from ammonia poisoning! Bring each NH3 to my cauldron, then go get the next one. There are 5 NH3 molecules scattered around the graveyard.", [
                                                                    { text: "I'll be careful! Let's do this.", action: () => {
                                                                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3);
                                                                        casperObj.userData.dialogueState = 'accepted';
                                                                    }},
                                                                    { text: "Why is ammonia so dangerous?", hideOnClick: false, action: () => {
                                                                        casperObj.userData.dialogueState = 'education';
                                                                        showDialogue("Ammonia (NH3 or NH4+) is highly toxic! When amino acids break down - like all these poor animals here - they release nitrogen as ammonia. In living organisms, ammonia damages cells, disrupts pH balance, and causes severe neurological problems. That's why we have the Urea Cycle: to convert ammonia into urea, which is much safer to transport and excrete. Now you understand why you need to handle it carefully!", [
                                                                            { text: "I understand! I'll collect it carefully.", action: () => {
                                                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3);
                                                                                casperObj.userData.dialogueState = 'accepted';
                                                                            }}
                                                                        ], setGameInteracting);
                                                                    }}
                                                                ], setGameInteracting);
                                                            }}
                                                        ], setGameInteracting);
                                                    }}
                                                ], setGameInteracting);
                                            }}
                                        ], setGameInteracting);
                                    }}
                                ], setGameInteracting);
                            }},
                            { text: "Maybe later." }
                        ], setGameInteracting);
                        break;

                    case 'graveyard':
                    case 'problem':
                    case 'education':
                    case 'request':
                        // If they return mid-conversation, resume from request
                        showDialogue("Can you help collect some of this ammonia? We need to get rid of this toxic substance!", [
                            { text: "I'll collect the ammonia!", action: () => {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3);
                                casperObj.userData.dialogueState = 'accepted';
                            }},
                            { text: "Tell me about ammonia.", hideOnClick: false, action: () => {
                                casperObj.userData.dialogueState = 'education';
                                showDialogue("Ammonia (NH3 or NH4+) is highly toxic! When amino acids break down - like all these poor animals here - they release nitrogen as ammonia. In living organisms, this would damage cells and disrupt pH balance. That's why we have the Urea Cycle: to convert ammonia into urea, which is much safer to transport and excrete.", [
                                    { text: "I understand! I'll collect it.", action: () => {
                                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3);
                                        casperObj.userData.dialogueState = 'accepted';
                                    }}
                                ], setGameInteracting);
                            }}
                        ], setGameInteracting);
                        break;
                }
                return;
            }

            // STEP_1_COLLECT_NH3: Ammonia collection with cauldron deposit
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3) {
                const ammoniaCount = getGameState().ammoniaCollectedCount;
                const TOTAL_NH3_REQUIRED = 5;

                // Player has NH3 in inventory - they need to deposit it!
                if (hasRequiredItems({ 'NH3': 1 })) {
                    showDialogue(`Quick! Drop that ammonia in my cauldron before it poisons you! You've deposited ${ammoniaCount} out of ${TOTAL_NH3_REQUIRED} total.`, [
                        { text: "Deposit NH3 in cauldron!", action: () => {
                            consumeItems({'NH3': 1});
                            import('./gameState.js').then(({ incrementAmmoniaCollectedCount, getAmmoniaCollectedCount }) => {
                                incrementAmmoniaCollectedCount();
                                const newCount = getAmmoniaCollectedCount();
                                playMoleculeGenerationSound();
                                createGameBoySound('success');

                                if (newCount >= TOTAL_NH3_REQUIRED) {
                                    showFeedback(`All ${TOTAL_NH3_REQUIRED} NH3 deposited! The cauldron is full!`, 3000);
                                    setTimeout(() => {
                                        showDialogue("*sniff* Excellent work! You've collected all the ammonia safely! Now, to start the Urea Cycle, I'll need Bicarbonate (HCO3-) along with this ammonia. Calvin the chemist in the alcove can make Bicarbonate for you! He's deep in the cave to the west. Go talk to him and see what he needs!", [
                                            { text: "I'll go talk to Calvin!", action: () => {
                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2);
                                            }}
                                        ], setGameInteracting);
                                    }, 500);
                                } else {
                                    showFeedback(`NH3 deposited safely! ${newCount}/${TOTAL_NH3_REQUIRED} collected. Your health is recovering!`, 3000);
                                }
                            });
                        }}
                    ], setGameInteracting);
                } else {
                    // No NH3 in inventory
                    if (ammoniaCount >= TOTAL_NH3_REQUIRED) {
                        showDialogue("*sniff* Excellent work! You've collected all the ammonia safely! Now, to start the Urea Cycle, I'll need Bicarbonate (HCO3-). Calvin the chemist in the alcove can make it!", [
                            { text: "I'll go talk to Calvin!", action: () => {
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2);
                            }}
                        ], setGameInteracting);
                    } else {
                        showDialogue(`*waves ghostly hands* Collect those ammonia molecules floating around the graveyard! Remember: ONE AT A TIME! Bring each one back to my cauldron immediately. You've deposited ${ammoniaCount}/${TOTAL_NH3_REQUIRED} so far.`, [{ text: "On it!" }], setGameInteracting);
                    }
                }
                return;
            }

            // STEP_0_GATHER_WATER_CO2 through STEP_1B_COLLECT_SECOND_ATP: Waiting for materials
            if (currentQuest && (
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 ||
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER ||
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2 ||
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE ||
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE ||
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP ||
                currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP
            )) {
                showDialogue("Good progress! I'm waiting here at the graveyard. Once you have Bicarbonate, Ammonia (NH3), and 2 ATP, come back and I'll make Carbamoyl Phosphate. But between you and me... *whispers* ...I'm having trouble focusing with all this graveyard gloom. I might need a little pick-me-up to do my best work...", [{ text: "I'll gather the materials!" }], setGameInteracting);
                return;
            }

            // STEP_1C_CASPER_NEEDS_COFFEE: Has materials but needs coffee
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1C_CASPER_NEEDS_COFFEE) {
                showDialogue("*Yawns ghostly* Booo... I mean, wow. You've collected everything: Bicarbonate, Ammonia, and 2 ATP!", [
                    { text: "Can we make Carbamoyl Phosphate now?", hideOnClick: false, action: () => {
                        showDialogue("But I'll be honest with you - I'm feeling rather lethargic from haunting this graveyard all day and night. I need a special boost to catalyze this reaction properly.", [
                            { text: "What kind of boost?", hideOnClick: false, action: () => {
                                showDialogue("Have you heard of Nagesh? He runs a coffee brewing station not far from here. I need his special Nagesh's Coffee - it's made with NAG (N-acetylglutamate), my allosteric activator! *sighs dramatically* I know, I know... CPS1 is high maintenance, but what can I say? Quality enzyme work requires quality cofactors!", [
                                    { text: "Why do you need it?", hideOnClick: false, action: () => {
                                        showDialogue("Without it, I simply can't work at full efficiency. Could you visit Nagesh and get me some?", [
                                            { text: "I'll get you that coffee!", action: () => {
                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1D_TALK_TO_NAGESH);
                                            }}
                                        ], setGameInteracting);
                                    }},
                                    { text: "What's so special about this coffee?", hideOnClick: false, action: () => {
                                        showDialogue("NAG - N-acetylglutamate - is my essential cofactor! It's like rocket fuel for CPS1 (that's me!).", [
                                            { text: "How does it help?", hideOnClick: false, action: () => {
                                                showDialogue("Without NAG, I'm sluggish and inefficient. With it, I can catalyze the reaction at full speed!", [
                                                    { text: "Where does Nagesh get it?", hideOnClick: false, action: () => {
                                                        showDialogue("Nagesh makes it by combining acetyl-CoA (Acidic Coffin Grounds from the graveyard) with Glutamate (Ghoul Milk from those spectral ghouls). The result is Nagesh's Coffee - pure NAG! It's the only thing that gets me motivated to work in this spooky place.", [
                                                            { text: "Fascinating! I'll get it for you.", action: () => {
                                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1D_TALK_TO_NAGESH);
                                                            }}
                                                        ], setGameInteracting);
                                                    }}
                                                ], setGameInteracting);
                                            }}
                                        ], setGameInteracting);
                                    }}
                                ], setGameInteracting);
                            }}
                        ], setGameInteracting);
                    }}
                ], setGameInteracting);
                return;
            }

            // STEP_2_MAKE_CARB_PHOS: Ready to make Carbamoyl Phosphate with NAG
            const educationalBlurb = "Booo! Oh, don't be scared, I'm Casper, representing Carbamoyl Phosphate Synthetase I. I might be a bit... ethereal, but my job is solid! Here in the mitochondria, I kickstart the Urea Cycle by taking Bicarbonate, one Ammonia molecule, and TWO precious ATPs to create Carbamoyl Phosphate. It's the first big step to trap that pesky ammonia!";
            const actionButtonText = `Create Carbamoyl Phosphate!`;

            if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nBut oooh, the time isn't quite right. Your objective now is: ${currentQuest?.objectives[currentQuest.state] || "Begin your quest with Professor Hepaticus."}`, [{ text: "Okay, Casper." }], setGameInteracting);
                return;
            }

            // Special check: NH3 is in the cauldron, not inventory! Check other items only
            const requirementsWithoutNH3 = { 'Bicarbonate': 1, 'ATP': 2 };
            if (!hasRequiredItems(requirementsWithoutNH3)) {
                let missing = Object.keys(requirementsWithoutNH3).filter(item => !inventory[item] || inventory[item] < requirementsWithoutNH3[item]).join(' and ');
                showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nWhoops! You're missing ${missing}. You'll need all those to get this reaction going! Don't worry about the ammonia - I have plenty in my cauldron from earlier!`, [{ text: "I'll get them." }], setGameInteracting);
                return;
            }

            // Check if player has NAG (Nagesh's Coffee)
            if (!hasRequiredItems({'Nagesh\'s Coffee': 1})) {
                showDialogue(`${dialogueTitle}:\n*looks around eagerly* Oh! You're back! Do you have the Nagesh's Coffee? I can't start the reaction without my NAG (N-acetylglutamate) activator! I see you have all the substrates ready (Bicarbonate and 2 ATP), and I have ammonia in my cauldron, but I need that coffee to work at full efficiency!`, [{ text: "I'll bring it right away!" }], setGameInteracting);
                return;
            }

            showDialogue(`${dialogueTitle}:\n*Sips Nagesh's Coffee* Ahhhh! Now THAT'S what I needed! I can feel the NAG activating my catalytic sites! *energized ghostly movements* With this allosteric activation, I'm ready to work at MAXIMUM EFFICIENCY! Let's convert that toxic ammonia into Carbamoyl Phosphate! You have all the ingredients!\n\n${educationalBlurb}`, [
                { text: actionButtonText, action: () => {
                    // Consume only items from inventory (not NH3 which is in cauldron)
                    consumeItems(requirementsWithoutNH3);
                    consumeItems({'Nagesh\'s Coffee': 1}); // Consume NAG
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
                    showDialogue("You already have Malate! Take it to Malcolm the Shuttle Driver for the next step. That Malate is ready for its journey back into the mitochondria!", [{ text: "On it!" }], setGameInteracting);
                } else if (hasRequiredItems(userData.requires)) {
                    showDialogue("*The fire hydrant gleams in the light*\n\nAh, Fumarate! I'm the Fumarase Enzyme - or as some call me, the Fire Hydrant!", [
                        { text: "Why are you a fire hydrant?", hideOnClick: false, action: () => {
                            showDialogue("Because I'm Fumarate HYDRATase, and I literally SPRAY water onto Fumarate to hydrate it!", [
                                { text: "That's clever!", hideOnClick: false, action: () => {
                                    showDialogue("I'm positioned here close to the river for good reason - I need H₂O to do my job. Let me splash a little water on that Fumarate to convert it to Malate, getting it ready for its journey back into the mitochondria. Ready to see the hydration in action?", [
                                        { text: "Spray the water!", hideOnClick: false, action: () => {
                                            showDialogue("*WHOOOOSH! Water sprays from the hydrant nozzles*\n\n💦 SPLASH! There we go!", [
                                                { text: "Amazing!", hideOnClick: false, action: () => {
                                                    showDialogue("I've added water (H₂O) to your Fumarate, hydrating it into Malate! See how the molecule absorbed that water? That's enzyme catalysis at work!", [
                                                        { text: "What's next?", hideOnClick: false, action: () => {
                                                            showDialogue("Now this Malate is ready for Malcolm the Shuttle Driver to transport it back across the membrane into the mitochondria. The cycle continues!", [
                                                                { text: "Amazing! Thanks, Fire Hydrant!", action: () => {
                                                                    consumeItems(userData.requires);
                                                                    playMoleculeGenerationSound();
                                                                    createResource(scene, userData.produces, { x: object.position.x, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[userData.produces]);
                                                                    // Always advance to STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE if not already there
                                                                    if (currentQuest.state !== CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE) {
                                                                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE);
                                                                    }
                                                                }}
                                                            ], setGameInteracting);
                                                        }}
                                                    ], setGameInteracting);
                                                }}
                                            ], setGameInteracting);
                                        }}
                                    ], setGameInteracting);
                                }}
                            ], setGameInteracting);
                        }}
                    ], setGameInteracting);
                } else {
                    showDialogue("I'm the Fire Hydrant - Fumarase Enzyme! Bring me Fumarate and I'll spray some water on it to hydrate it into Malate. It's what I do!", [{text: "I'll bring it!"}], setGameInteracting);
                }
            } else {
                showDialogue("I'm the Fumarase Enzyme - the Fire Hydrant! I spray water (H₂O) onto Fumarate to hydrate it into Malate. That's why I'm called Fumarate HYDRATase - I literally add water! When you need hydration services, come find me by the river!", [{text: "Got it!"}], setGameInteracting);
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

        else if (userData.name === CONSTANTS.NPC_NAMES.NAGESH_NAGS) {
            const dialogueTitle = "Nagesh (NAGS - N-acetylglutamate Synthase)";

            // STEP_1D_TALK_TO_NAGESH: First visit
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1D_TALK_TO_NAGESH) {
                // Check if player already has both items
                if (inventory['Acidic Coffin Grounds'] && inventory['Glutamate']) {
                    showDialogue("Namaste, friend! Welcome to my coffee brewing station! I am Nagesh, representing NAGS - N-acetylglutamate Synthase. I see you're a resourceful one - you've already collected Acidic Coffin Grounds and Ghoul Milk! Perfect! These are exactly what I need to brew Nagesh's Coffee (NAG), which Casper needs to activate his enzyme. Shall we begin brewing?", [
                        { text: "Yes, let's brew it!", action: () => {
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG);
                        }}
                    ], setGameInteracting);
                    return;
                }

                showDialogue("Namaste, friend! Welcome to my coffee brewing station! I am Nagesh, representing NAGS - N-acetylglutamate Synthase.", [
                    { text: "Tell me about your coffee.", hideOnClick: false, action: () => {
                        showDialogue("You see, I am a master coffee brewer, but not just any coffee... I make Nagesh's Coffee, the most potent brew in all the mitochondria!", [
                            { text: "What makes it special?", hideOnClick: false, action: () => {
                                showDialogue("This special coffee contains NAG (N-acetylglutamate), which is essential for activating Casper (CPS1). Without my brew, Casper cannot efficiently start the Urea Cycle!", [
                                    { text: "What do you need to make it?", hideOnClick: false, action: () => {
                                        showDialogue("Ah, excellent question! To brew Nagesh's Coffee, I need two special ingredients:", [
                                            { text: "What are the ingredients?", hideOnClick: false, action: () => {
                                                showDialogue("First, **Acidic Coffin Grounds** (acetyl-CoA) - You can find these near the graves of ketogenic amino acids in the graveyard. Look for Leucine the Lion, Lysine the Lynx, Isoleucine the Iguana, Phenylalanine the Pheasant, Threonine the Toucan, and Tryptophan the Triceratops!", [
                                                    { text: "And the second ingredient?", hideOnClick: false, action: () => {
                                                        showDialogue("Second, **Ghoul Milk** (Glutamate) - The spectral ghouls at the edges of the graveyard carry this. They're translucent, glowing spirits! Bring me both and I'll brew you the finest NAG coffee Casper has ever tasted!", [
                                                            { text: "I'll find those ingredients!", action: () => {
                                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS);
                                                            }}
                                                        ], setGameInteracting);
                                                    }}
                                                ], setGameInteracting);
                                            }}
                                        ], setGameInteracting);
                                    }}
                                ], setGameInteracting);
                            }}
                        ], setGameInteracting);
                    }},
                    { text: "What exactly is NAG?", hideOnClick: false, action: () => {
                        showDialogue("NAG - N-acetylglutamate - is the MASTER REGULATOR of the Urea Cycle! It's an allosteric activator of CPS1 (Casper).", [
                            { text: "How does it work?", hideOnClick: false, action: () => {
                                showDialogue("Think of it like this: Casper is a powerful enzyme, but without NAG, he's sluggish and slow. When NAG binds to him, it changes his shape, making him super-efficient!", [
                                    { text: "How do you make it?", hideOnClick: false, action: () => {
                                        showDialogue("I synthesize NAG by combining acetyl-CoA with Glutamate. The result? The perfect fuel to kickstart ammonia detoxification!", [
                                            { text: "What do you need from me?", hideOnClick: false, action: () => {
                                                showDialogue("To brew Nagesh's Coffee, I need:\n\n1. **Acidic Coffin Grounds** (acetyl-CoA) - from ketogenic amino acids\n2. **Ghoul Milk** (Glutamate) - from the spectral ghouls at the edges\n\nFind these in the graveyard and return to me!", [
                                                    { text: "I'll get them!", action: () => {
                                                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS);
                                                    }}
                                                ], setGameInteracting);
                                            }}
                                        ], setGameInteracting);
                                    }}
                                ], setGameInteracting);
                            }}
                        ], setGameInteracting);
                    }}
                ], setGameInteracting);
                return;
            }

            // STEP_1E_COLLECT_COFFIN_GROUNDS and STEP_1F_COLLECT_GLUTAMINE: Still collecting
            if (currentQuest && (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS || currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE)) {
                if (inventory['Acidic Coffin Grounds'] && inventory['Glutamate']) {
                    showDialogue("Wonderful! You have both Acidic Coffin Grounds and Ghoul Milk! Let me brew that Nagesh's Coffee for you right away!", [
                        { text: "Perfect! Let's brew it!", action: () => {
                            // Just advance the quest - don't recursively call interactWithObject
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG);
                        }}
                    ], setGameInteracting);
                } else if (inventory['Acidic Coffin Grounds'] && !inventory['Glutamate']) {
                    showDialogue("Good! You found the Acidic Coffin Grounds! Now you just need Ghoul Milk from the spectral ghouls. They're the translucent, glowing spirits at the edges of the graveyard!", [{ text: "I'll find them!" }], setGameInteracting);
                } else if (!inventory['Acidic Coffin Grounds'] && inventory['Glutamate']) {
                    showDialogue("Excellent! You have the Ghoul Milk! Now find Acidic Coffin Grounds near the graves of ketogenic amino acids: Leucine the Lion, Lysine the Lynx, Isoleucine the Iguana, Phenylalanine the Pheasant, Threonine the Toucan, and Tryptophan the Triceratops!", [{ text: "I'll find them!" }], setGameInteracting);
                } else {
                    showDialogue("I'm waiting for you to bring me Acidic Coffin Grounds (acetyl-CoA) and Ghoul Milk (Glutamate) from the graveyard. Check near the ketogenic amino acid graves and look for spectral ghouls at the edges!", [{ text: "I'll find them!" }], setGameInteracting);
                }
                return;
            }

            // STEP_1G_NAGESH_MAKES_NAG: Ready to brew
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG) {
                if (!hasRequiredItems(userData.requires)) {
                    let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]).join(' and ');
                    showDialogue(`${dialogueTitle}:\n\nYou're missing ${missing}. I need both Acidic Coffin Grounds and Ghoul Milk to brew Nagesh's Coffee!`, [{ text: "I'll get them!" }], setGameInteracting);
                    return;
                }

                showDialogue("*Nagesh takes the Acidic Coffin Grounds and Ghoul Milk*\n\nAh yes, perfect ingredients! Now watch carefully as I demonstrate the ancient art of NAG synthesis!\n\n*Pours Acidic Coffin Grounds into the coffee machine*\n*Adds Ghoul Milk while chanting*\n\n\"From acetyl-CoA and Glutamate divine,\nThrough my catalytic power, they combine!\nN-acetylglutamate shall arise,\nTo activate CPS1 before your eyes!\"\n\n*The coffee machine hisses and steams*\n*A dark, aromatic brew emerges*\n\nBehold! Nagesh's Coffee! Pure NAG, ready to energize Casper!", [
                    { text: "That smells... surprisingly good!", action: () => {
                        consumeItems(userData.requires);
                        playMoleculeGenerationSound();
                        createGameBoySound('success');
                        createResource(scene, userData.produces, { x: object.position.x + 1, z: object.position.z - 1.5, yBase: object.position.y }, userData.productColors[userData.produces]);
                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1H_COLLECT_NAG);
                    }}
                ], setGameInteracting);
                return;
            }

            // STEP_1H_COLLECT_NAG: Waiting to collect the coffee
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1H_COLLECT_NAG) {
                showDialogue("Your Nagesh's Coffee is ready! Collect it and take it to Casper. He'll be thrilled! Remember, NAG is what allows CPS1 to work at peak efficiency!", [{ text: "I'll take it to him!" }], setGameInteracting);
                return;
            }

            // Default dialogue
            showDialogue("Welcome to my coffee brewing station! I am Nagesh, master of NAG synthesis. When you need Nagesh's Coffee to activate Casper, you know where to find me!", [{ text: "Thanks, Nagesh!" }], setGameInteracting);
        }

        else if (userData.name === 'River Guardian') {
            console.log('[RiverGuardian] Interaction started');
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER) {
                const guardianObj = object;
                
                // Initialize dialogue state if needed
                if (!guardianObj.userData.dialogueState) {
                    guardianObj.userData.dialogueState = 'initial';
                    console.log('[RiverGuardian] Initialized dialogue state to: initial');
                }
                
                console.log('[RiverGuardian] Current dialogue state:', guardianObj.userData.dialogueState);
                
                switch(guardianObj.userData.dialogueState) {
                    case 'initial':
                        console.log('[RiverGuardian] Showing initial dialogue');
                        showDialogue("Greetings, seeker. I am the River Guardian, keeper of life-giving water.", [
                            { text: "Calvin sent me for Water.", hideOnClick: false, action: () => {
                                console.log('[RiverGuardian] Calvin sent me clicked');
                                guardianObj.userData.dialogueState = 'explain';
                                // Directly show next dialogue without closing first
                                showDialogue("Water (H₂O) kick-starts the urea cycle by helping to form bicarbonate (HCO₃⁻). Without it, the cycle cannot begin. Will you accept this gift of water?", [
                                    { text: "Yes, I accept.", hideOnClick: false, action: () => {
                                        guardianObj.userData.dialogueState = 'warning';
                                        showDialogue("The water is yours, young alchemist. But heed my warning: Do not wade too deep into these sacred waters. The river's current is stronger than it appears, and those who venture too far... never return to tell their tale.", [
                                            { text: "I understand the danger.", action: () => {
                                                // Create water droplet near the guardian
                                                const waterPos = {
                                                    x: guardianObj.position.x + 1.5,
                                                    z: guardianObj.position.z,
                                                    yBase: guardianObj.position.y
                                                };
                                                createResource(scene, 'Water', waterPos, CONSTANTS.WATER_COLOR);
                                                showFeedback("The River Guardian manifests a water droplet for you.");
                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER);
                                                guardianObj.userData.dialogueState = 'complete';
                                            }}
                                        ], setGameInteracting);
                                    }},
                                    { text: "Not yet.", action: () => { guardianObj.userData.dialogueState = 'initial'; }}
                                ], setGameInteracting);
                            }},
                            { text: "I must go." }
                        ], setGameInteracting);
                        break;
                        
                    case 'explain':
                        showDialogue("Water (H₂O) kick-starts the urea cycle by helping to form bicarbonate (HCO₃⁻). Without it, the cycle cannot begin. Will you accept this gift of water?", [
                            { text: "Yes, I accept.", action: () => {
                                guardianObj.userData.dialogueState = 'warning';
                                showDialogue("The water is yours, young alchemist. But heed my warning: Do not wade too deep into these sacred waters. The river's current is stronger than it appears, and those who venture too far... never return to tell their tale.", [
                                    { text: "I understand the danger.", action: () => {
                                        // Create water droplet near the guardian
                                        const waterPos = {
                                            x: guardianObj.position.x + 1.5,
                                            z: guardianObj.position.z,
                                            yBase: guardianObj.position.y
                                        };
                                        createResource(scene, 'Water', waterPos, CONSTANTS.WATER_COLOR);
                                        showFeedback("The River Guardian manifests a water droplet for you.");
                                        advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER);
                                        guardianObj.userData.dialogueState = 'complete';
                                    }}
                                ], setGameInteracting);
                            }},
                            { text: "Not yet.", action: () => { guardianObj.userData.dialogueState = 'initial'; }}
                        ], setGameInteracting);
                        break;
                        
                    case 'warning':
                        showDialogue("The water is yours, young alchemist. But heed my warning: Do not wade too deep into these sacred waters. The river's current is stronger than it appears, and those who venture too far... never return to tell their tale.", [
                            { text: "I understand the danger.", action: () => {
                                // Create water droplet near the guardian
                                const waterPos = {
                                    x: guardianObj.position.x + 1.5,
                                    z: guardianObj.position.z,
                                    yBase: guardianObj.position.y
                                };
                                createResource(scene, 'Water', waterPos, CONSTANTS.WATER_COLOR);
                                showFeedback("The River Guardian manifests a water droplet for you.");
                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER);
                                guardianObj.userData.dialogueState = 'complete';
                            }}
                        ], setGameInteracting);
                        break;
                        
                    case 'complete':
                        showDialogue("The water awaits you. Remember my warning about the river's depths.", 
                            [{ text: "Thank you." }], setGameInteracting);
                        break;
                }
            } else {
                showDialogue("The waters cleansing properties flow eternally. Return when you seek the essence of H₂O.", 
                    [{ text: "I understand." }], setGameInteracting);
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

        // Prevent collecting multiple NH3 at once
        if (userData.name === 'NH3' && getInventory()['NH3'] && getInventory()['NH3'] > 0) {
            showFeedback("You're already carrying ammonia! Deposit it at Casper's cauldron first!", 3000);
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
            if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER && userData.name === 'Water') {
                // Don't advance quest yet - player needs to return to Calvin first
                // Quest will advance when talking to Calvin with Water in inventory
                showFeedback("Water collected! Return to Calvin with it.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE && userData.name === 'Bicarbonate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP)) questAdvancedGenericFeedbackSuppressed = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3 && userData.name === 'NH3') {
                // Don't auto-advance - player needs to return to Casper
                showFeedback("NH3 collected! Return to Casper at the graveyard.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP && userData.name === 'ATP') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("First ATP collected! You need one more.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP && userData.name === 'ATP' && hasRequiredItems({ 'ATP': 2 })) {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1C_CASPER_NEEDS_COFFEE)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("Both ATPs collected! Now return to Casper.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS && userData.name === 'Acidic Coffin Grounds') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("I never thought I would be stealing from a graveyard...", 3000);
                setTimeout(() => {
                    showFeedback("Acidic Coffin Grounds collected! Now find Ghoul Milk (Glutamate).", 3000);
                }, 3200);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1E_COLLECT_COFFIN_GROUNDS && userData.name === 'Glutamate') {
                // Player collected Glutamate first - advance to next step
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("Ghoul Milk collected! Now find Acidic Coffin Grounds near the ketogenic amino acids.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE && userData.name === 'Acidic Coffin Grounds') {
                // Player has Glutamate and now collected Coffin Grounds - advance to brewing step
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("I never thought I would be stealing from a graveyard...", 3000);
                setTimeout(() => {
                    showFeedback("Acidic Coffin Grounds collected! You have both ingredients! Return to Nagesh to brew the coffee.", 3000);
                }, 3200);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1F_COLLECT_GLUTAMINE && userData.name === 'Glutamate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_1G_NAGESH_MAKES_NAG)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("Ghoul Milk collected! Return to Nagesh to brew the coffee.", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_1H_COLLECT_NAG && userData.name === "Nagesh's Coffee") {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("Nagesh's Coffee collected! Take it to Casper to energize him!", 3000);
                specificFeedbackGivenForThisResource = true;
            }
            else if (currentQuest.state === CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS && userData.name === 'Carbamoyl Phosphate') {
                if(advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER)) questAdvancedGenericFeedbackSuppressed = true;
                showFeedback("Carbamoyl Phosphate collected! Next, visit Otis (OTC) to make Citrulline. But first, you'll need Ornithine from the Ornithine Usher near the bridge.", 5000);
                specificFeedbackGivenForThisResource = true;
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

        if (userData.name === "Calvin") {
            dialogueTitle = "Calvin (Carbonic Anhydrase VA)";

            // STEP_0_GATHER_WATER_CO2: First visit - Calvin asks for Water only
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2) {
                showDialogue("Ah, hello there! I'm Calvin, the chemist. I specialize in mixing Water and gas to create a neutralizing paste - Bicarbonate!", [
                    { text: "Bicarbonate?", hideOnClick: false, action: () => {
                        showDialogue("Yes! Bicarbonate (HCO3-) is the first substrate for the Urea Cycle. It's what makes Casper's ammonia conversion possible!", [
                            { text: "Can you make some for me?", hideOnClick: false, action: () => {
                                showDialogue("Absolutely! But first, I'll need **Water (H2O)**. Can you find some for me?", [
                                    { text: "Where can I find Water?", hideOnClick: false, action: () => {
                                        showDialogue("Seek the River Guardian near the river's edge, south of the bridge. He is the keeper of life-giving water. Bring it back to me!", [
                                            { text: "I'll get the Water!", action: () => {
                                                advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER);
                                            }}
                                        ], setGameInteracting);
                                    }}
                                ], setGameInteracting);
                            }}
                        ], setGameInteracting);
                    }}
                ], setGameInteracting);
                return;
            }

            // STEP_0_COLLECT_WATER: Player collected Water and returned to Calvin
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0_COLLECT_WATER) {
                // Check if player has Water
                if (inventory['Water']) {
                    showDialogue("Perfect! You brought the Water! Now I need the gas component - **CO2 (Carbon Dioxide)**.", [
                        { text: "Where can I find CO2?", hideOnClick: false, action: () => {
                            showDialogue("Find the Respiratory Vents deeper within this alcove. They release CO2 from cellular respiration. Once you bring it, I can mix everything together!", [
                                { text: "I'll get the CO2!", action: () => {
                                    advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2);
                                }}
                            ], setGameInteracting);
                        }},
                        { text: "I'll get it!" , action: () => {
                            advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2);
                        }}
                    ], setGameInteracting);
                } else {
                    showDialogue("Welcome back! Did you get the Water from the River Guardian? Bring it to me when you have it!", [{ text: "I'll get it!" }], setGameInteracting);
                }
                return;
            }

            // STEP_0A_GATHER_CO2: Player is now looking for CO2
            if (currentQuest && currentQuest.state === CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2) {
                showDialogue("Go find the **CO2** from the Respiratory Vents deeper within this alcove. Once you bring it, I can mix everything together!", [
                    { text: "I'll get the CO2!" }
                ], setGameInteracting);
                return;
            }

            educationalBlurb = "Perfect! I'll take the Water and CO2 and mix them together to create Bicarbonate (HCO3-) - the first substrate for the Urea Cycle!";
            actionButtonText = `Create Bicarbonate!`;
        }

        if (!currentQuest || currentQuest.state !== userData.requiredQuestState) {
            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nBut the shrine slumbers. Your current objective: ${currentQuest?.objectives[currentQuest.state] || "Start quest first."}`, [{ text: "Understood" }], setGameInteracting);
            return;
        }
        if (!hasRequiredItems(userData.requires)) {
            let missing = Object.keys(userData.requires).filter(item => !inventory[item] || inventory[item] < userData.requires[item]).join(' and ');

            // Provide specific guidance for Calvin
            if (userData.name === "Calvin") {
                let guidanceText = `${dialogueTitle}:\n${educationalBlurb}\n\nYou seem to be missing: ${missing}.\n\n`;

                if (!inventory['Water']) {
                    guidanceText += "**Water**: Seek the River Guardian near the river's edge, south of the bridge. He is the keeper of life-giving water.\n\n";
                }
                if (!inventory['CO2']) {
                    guidanceText += "**CO2**: Find the Respiratory Vents deeper within this alcove. They release carbon dioxide from cellular respiration.\n\n";
                }

                guidanceText += "Bring me these ingredients and I'll whip up that neutralizing paste for you!";

                showDialogue(guidanceText, [{ text: "I'll find them!" }], setGameInteracting);
                return;
            }

            showDialogue(`${dialogueTitle}:\n${educationalBlurb}\n\nYou seem to be missing: ${missing}. Bring me what I need and we can get started!`, [{ text: "I'll be back" }], setGameInteracting);
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
    else if (userData.type === 'gate' && !interactionProcessedThisFrame) {
        interactionProcessedThisFrame = true;

        if (!userData.isOpen) {
            // First time opening the gate - show warning dialogue about dangers
            showDialogue("Welcome to the Amino Acid Animal Graveyard. Here lie the remains of amino acids that have been broken down through deamination, releasing ammonia (NH₃) into the mitochondria.\n\n⚠️ WARNING: The toxic ammonia fumes in this area will slowly drain your health. Collect what you need and leave quickly! Holding ammonia will cause even more damage.", [
                { text: "Open the gate", action: () => {
                    // Open the gate by rotating it
                    const gateDoor = object.getObjectByName('gate_door');
                    if (gateDoor) {
                        // Swing the gate open (rotate 90 degrees around Y axis)
                        gateDoor.rotation.y = Math.PI / 2;
                        userData.isOpen = true;
                        // Remove collision barrier
                        removeGateBarrierFromWorld(scene);
                        createGameBoySound('success');
                        showFeedback("The graveyard gate swings open with a creak...");
                    }
                }}
            ], setGameInteracting);
        } else {
            // Gate is already open - just give brief feedback
            showFeedback("The gate to the Amino Acid Animal Graveyard stands open.");
        }
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
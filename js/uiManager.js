// js/uiManager.js
import { controls } from './sceneSetup.js';
import * as CONSTANTS from './constants.js';

// --- DOM Element References ---
let dialogueBoxEl, dialogueTextEl, dialogueOptionsEl, inventoryListEl, questNameUIEl, questObjectiveUIEl;
let realityRiverUIEl, riverQuestionUIEl, riverAnswersUIEl, riverFeedbackUIEl, riverProgressUIEl;
let interactionPromptEl, interactionTextEl;
let helpMenuEl, glossaryEl;

export function initUIManager() {
    dialogueBoxEl = document.getElementById('dialogueBox');
    dialogueTextEl = document.getElementById('dialogueText');
    dialogueOptionsEl = document.getElementById('dialogueOptions');
    inventoryListEl = document.getElementById('inventoryList');
    questNameUIEl = document.getElementById('questName');
    questObjectiveUIEl = document.getElementById('questObjective');

    realityRiverUIEl = document.getElementById('realityRiver');
    riverQuestionUIEl = document.getElementById('riverQuestion');
    riverAnswersUIEl = document.getElementById('riverAnswers');
    riverFeedbackUIEl = document.getElementById('riverFeedback');
    riverProgressUIEl = document.getElementById('riverProgress');

    interactionPromptEl = document.getElementById('interactionPrompt');
    interactionTextEl = document.getElementById('interactionText');
    
    helpMenuEl = document.getElementById('helpMenu');
    glossaryEl = document.getElementById('glossary');

    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
    
    // Make toggleHelpMenu and toggleGlossary globally available
    window.toggleHelpMenu = toggleHelpMenu;
    window.toggleGlossary = toggleGlossary;
}

function hideAllModals(except = null) {
    if (dialogueBoxEl && except !== dialogueBoxEl) dialogueBoxEl.classList.add('hidden');
    if (realityRiverUIEl && except !== realityRiverUIEl) realityRiverUIEl.classList.add('hidden');
    // Add any other modal UI elements here in the future, checking against `except`
}

export function updateInventoryUI(inventory) {
    if (!inventoryListEl) return;
    inventoryListEl.innerHTML = '';
    let hasItems = false;
    for (const itemName in inventory) {
        if (inventory[itemName] > 0) {
            const li = document.createElement('li');
            li.textContent = `${itemName}: ${inventory[itemName]}`;
            inventoryListEl.appendChild(li);
            hasItems = true;
        }
    }
    if (!hasItems) {
        inventoryListEl.innerHTML = '<li>Empty</li>';
    }
}

export function showDialogue(text, options = [], setGameInteractingState) {
    if (!dialogueBoxEl || !dialogueTextEl || !dialogueOptionsEl) return;
    
    hideAllModals(dialogueBoxEl); // Hide other modals first

    dialogueTextEl.textContent = text;
    dialogueOptionsEl.innerHTML = '';
    options.forEach(opt => {
        const button = document.createElement('button');
        button.textContent = opt.text;
        button.onclick = () => {
            // Check if this button continues the dialogue (has an action that shows more dialogue)
            // If so, DON'T hide first - let the action handle it
            if (opt.action) {
                // Only hide if the option explicitly says to (for exit buttons)
                if (opt.hideOnClick !== false) {
                    hideDialogue(setGameInteractingState);
                }
                opt.action();
            } else {
                // No action means this is an exit button - always hide
                hideDialogue(setGameInteractingState);
            }
        };
        dialogueOptionsEl.appendChild(button);
    });
    
    // Smooth fade in
    dialogueBoxEl.classList.add('fade-in');
    dialogueBoxEl.classList.remove('hidden');
    setTimeout(() => {
        dialogueBoxEl.classList.remove('fade-in');
    }, 50);
    
    if (controls) controls.enabled = false;
    setGameInteractingState(true);
}

export function hideDialogue(setGameInteractingState) {
    if (!dialogueBoxEl) return;
    
    // Smooth fade out
    dialogueBoxEl.classList.add('fade-out');
    setTimeout(() => {
        dialogueBoxEl.classList.add('hidden');
        dialogueBoxEl.classList.remove('fade-out');
    }, 300);
    
    // Only re-enable controls if no other modal is active (e.g., reality river)
    if (realityRiverUIEl && realityRiverUIEl.classList.contains('hidden')) {
        if (controls) controls.enabled = true;
    }
    // It's crucial that setGameInteractingState(false) is only called if no other modal is active.
    // The caller (interactionManager or questManager) should manage the overall interacting state.
    // For simple dialogues, this is okay. For complex flows, manage state more globally.
    if (setGameInteractingState) { // Check if function is provided
       setGameInteractingState(false);
    }
}

export function updateDialogueContent(text, options = []) {
    if (!dialogueBoxEl || !dialogueTextEl || !dialogueOptionsEl) return;
    
    // Fade out just the content
    dialogueTextEl.style.opacity = '0';
    dialogueOptionsEl.style.opacity = '0';
    
    setTimeout(() => {
        // Update content
        dialogueTextEl.textContent = text;
        dialogueOptionsEl.innerHTML = '';
        
        options.forEach(opt => {
            const button = document.createElement('button');
            button.textContent = opt.text;
            button.onclick = () => {
                if (opt.action) opt.action();
            };
            dialogueOptionsEl.appendChild(button);
        });
        
        // Fade back in
        dialogueTextEl.style.opacity = '1';
        dialogueOptionsEl.style.opacity = '1';
    }, 150);
}

export function updateQuestUI(currentQuest) {
    if (!questNameUIEl || !questObjectiveUIEl) return;
    if (currentQuest) {
        questNameUIEl.textContent = currentQuest.name;
        questObjectiveUIEl.textContent = currentQuest.objectives[currentQuest.state] || 'Completed!';
        updateQuestProgress(currentQuest);
    } else {
        questNameUIEl.textContent = 'None';
        questObjectiveUIEl.textContent = 'Find and speak with Professor Hepaticus.';
        updateQuestProgress(null);
    }
}

function updateQuestProgress(quest) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (!progressFill || !progressText) return;
    
    if (!quest) {
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        return;
    }
    
    // Calculate progress based on quest state
    const totalSteps = Object.keys(CONSTANTS.QUEST_STATE).length - 2; // Exclude NOT_STARTED and COMPLETED
    let currentStep = 0;
    
    const stateOrder = [
        CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2,
        CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2,
        CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE,
        CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE,
        CONSTANTS.QUEST_STATE.STEP_1_GATHER_MITO_REMAINING,
        CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS,
        CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS,
        CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER,
        CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE,
        CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE,
        CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL,
        CONSTANTS.QUEST_STATE.STEP_8_GATHER_CYTO,
        CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY,
        CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN,
        CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS,
        CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE,
        CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE,
        CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE,
        CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS,
        CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA,
        CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE
    ];
    
    const currentIndex = stateOrder.indexOf(quest.state);
    if (currentIndex >= 0) {
        currentStep = currentIndex + 1;
    } else if (quest.state === CONSTANTS.QUEST_STATE.COMPLETED) {
        currentStep = totalSteps;
    }
    
    const progress = Math.floor((currentStep / totalSteps) * 100);
    progressFill.style.width = progress + '%';
    progressText.textContent = progress + '%';
}

export function showFeedback(message, duration = 3500) {
    let feedbackContainer = document.getElementById('feedbackContainer');
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.id = 'feedbackContainer';
        feedbackContainer.style.position = 'fixed';
        feedbackContainer.style.left = '50%';
        feedbackContainer.style.bottom = '150px';
        feedbackContainer.style.transform = 'translateX(-50%)';
        feedbackContainer.style.display = 'flex';
        feedbackContainer.style.flexDirection = 'column-reverse';
        feedbackContainer.style.alignItems = 'center';
        feedbackContainer.style.zIndex = '1000';
        feedbackContainer.style.pointerEvents = 'none';
        document.body.appendChild(feedbackContainer);
    }

    const feedback = document.createElement('div');
    feedback.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    feedback.style.color = 'white';
    feedback.style.padding = '10px 20px';
    feedback.style.borderRadius = '5px';
    feedback.style.marginTop = '8px';
    feedback.textContent = message;
    feedbackContainer.appendChild(feedback);

    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, duration);
}

export function showInteractionPrompt(objectName, objectType) {
    if (!interactionPromptEl || !interactionTextEl) return;
    let actionText = "[E] Interact with";
    if (objectType === 'resource') {
        actionText = "[E] Collect";
    } else if (objectType === 'npc') {
        actionText = "[E] Talk to";
    }
    interactionTextEl.textContent = `${actionText} ${objectName}`;
    interactionPromptEl.classList.remove('hidden');
}

export function hideInteractionPrompt() {
    if (interactionPromptEl) {
        interactionPromptEl.classList.add('hidden');
    }
}

export function showRealityRiverUI() {
    hideAllModals(realityRiverUIEl); // Hide other modals first
    if(realityRiverUIEl) realityRiverUIEl.classList.remove('hidden');
    // Caller (questManager) should handle controls.enabled and isUserInteracting state
}
export function hideRealityRiverUI() {
    if(realityRiverUIEl) realityRiverUIEl.classList.add('hidden');
    // Caller (questManager) should handle controls.enabled and isUserInteracting state
}
export function updateRiverQuestion(questionText) {
    if(riverQuestionUIEl) riverQuestionUIEl.textContent = questionText;
}
export function updateRiverAnswers(answers, answerCallback) {
    if(!riverAnswersUIEl) return;
    riverAnswersUIEl.innerHTML = '';
    answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.textContent = answer;
        button.onclick = () => answerCallback(index);
        riverAnswersUIEl.appendChild(button);
    });
}
export function updateRiverFeedback(feedbackText, color = 'lightcoral') {
    if(!riverFeedbackUIEl) return;
    riverFeedbackUIEl.textContent = feedbackText;
    riverFeedbackUIEl.style.color = color;
}
export function clearRiverFeedback() {
    if(riverFeedbackUIEl) riverFeedbackUIEl.textContent = '';
}
export function updateRiverProgressUI(progressText) {
    if(riverProgressUIEl) riverProgressUIEl.textContent = progressText;
}
export function disableRiverAnswerButtons() {
    if(!riverAnswersUIEl) return;
    const buttons = riverAnswersUIEl.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
}

export function toggleHelpMenu() {
    if (!helpMenuEl) return;
    
    if (helpMenuEl.classList.contains('hidden')) {
        // Show help menu with fade in
        helpMenuEl.classList.add('fade-in');
        helpMenuEl.classList.remove('hidden');
        setTimeout(() => {
            helpMenuEl.classList.remove('fade-in');
        }, 50);
    } else {
        // Hide help menu with fade out
        helpMenuEl.classList.add('fade-out');
        setTimeout(() => {
            helpMenuEl.classList.add('hidden');
            helpMenuEl.classList.remove('fade-out');
        }, 300);
    }
}

// Quest marker system
let questMarker = null;
let questArrowEl = null;

export function createQuestMarker() {
    if (!questMarker) {
        questMarker = document.createElement('div');
        questMarker.id = 'questMarker';
        questMarker.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            pointer-events: none;
            z-index: 100;
            display: none;
        `;
        
        // Create arrow image
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(255,215,0,0.3) 100%);
            border-radius: 50%;
            animation: pulse 2s infinite;
        `;
        arrow.innerHTML = '↓';
        arrow.style.fontSize = '24px';
        arrow.style.textAlign = 'center';
        arrow.style.lineHeight = '40px';
        arrow.style.fontWeight = 'bold';
        arrow.style.color = '#333';
        
        questMarker.appendChild(arrow);
        document.body.appendChild(questMarker);
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create edge arrow indicator
    if (!questArrowEl) {
        questArrowEl = document.createElement('div');
        questArrowEl.id = 'questArrow';
        questArrowEl.style.cssText = `
            position: fixed;
            width: 60px;
            height: 60px;
            pointer-events: none;
            z-index: 101;
            display: none;
            font-size: 40px;
            color: #FFD700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            transform-origin: center;
        `;
        questArrowEl.innerHTML = '→';
        document.body.appendChild(questArrowEl);
    }
    
    return questMarker;
}

export function updateQuestMarker(targetPosition, camera, renderer) {
    if (!questMarker || !targetPosition) {
        if (questMarker) questMarker.style.display = 'none';
        if (questArrowEl) questArrowEl.style.display = 'none';
        return;
    }
    
    // Convert 3D position to screen coordinates
    const vector = targetPosition.clone();
    vector.project(camera);
    
    // When object is behind camera (z > 1), coordinates are inverted
    const isBehindCamera = vector.z > 1;
    
    let x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    let y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
    
    // Invert coordinates if behind camera
    if (isBehindCamera) {
        x = renderer.domElement.clientWidth - x;
        y = renderer.domElement.clientHeight - y;
    }
    
    // Check if target is on screen
    const onScreen = !isBehindCamera && 
                     x > 0 && x < renderer.domElement.clientWidth &&
                     y > 0 && y < renderer.domElement.clientHeight;
    
    if (onScreen) {
        // Show marker on target
        questMarker.style.display = 'block';
        questMarker.style.left = (x - 20) + 'px';
        questMarker.style.top = (y - 40) + 'px';
        questArrowEl.style.display = 'none';
    } else {
        // Show arrow at edge of screen pointing to target
        questMarker.style.display = 'none';
        questArrowEl.style.display = 'block';
        
        // Calculate angle to target (negate dy because CSS Y-axis goes down)
        const dx = x - renderer.domElement.clientWidth / 2;
        const dy = y - renderer.domElement.clientHeight / 2;
        const angle = Math.atan2(dy, dx); // Keep original for now, fix arrow positioning instead
        
        // Position arrow at edge
        const margin = 60;
        let arrowX = renderer.domElement.clientWidth / 2;
        let arrowY = renderer.domElement.clientHeight / 2;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // Left or right edge
            arrowX = dx > 0 ? renderer.domElement.clientWidth - margin : margin;
            arrowY = renderer.domElement.clientHeight / 2 + (dy / Math.abs(dx)) * (renderer.domElement.clientWidth / 2 - margin);
        } else {
            // Top or bottom edge
            arrowY = dy > 0 ? renderer.domElement.clientHeight - margin : margin;
            arrowX = renderer.domElement.clientWidth / 2 + (dx / Math.abs(dy)) * (renderer.domElement.clientHeight / 2 - margin);
        }
        
        questArrowEl.style.left = (arrowX - 30) + 'px';
        questArrowEl.style.top = (arrowY - 30) + 'px';
        questArrowEl.style.transform = `rotate(${angle}rad)`;
    }
}

export function hideQuestMarker() {
    if (questMarker) {
        questMarker.style.display = 'none';
    }
    if (questArrowEl) {
        questArrowEl.style.display = 'none';
    }
}

export function toggleGlossary() {
    if (!glossaryEl) return;
    
    if (glossaryEl.classList.contains('hidden')) {
        // Show glossary with fade in
        glossaryEl.classList.add('fade-in');
        glossaryEl.classList.remove('hidden');
        setTimeout(() => {
            glossaryEl.classList.remove('fade-in');
        }, 50);
    } else {
        // Hide glossary with fade out
        glossaryEl.classList.add('fade-out');
        setTimeout(() => {
            glossaryEl.classList.add('hidden');
            glossaryEl.classList.remove('fade-out');
        }, 300);
    }
}
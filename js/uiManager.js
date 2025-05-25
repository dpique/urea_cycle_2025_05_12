// js/uiManager.js
import { controls } from './sceneSetup.js';

// --- DOM Element References ---
let dialogueBoxEl, dialogueTextEl, dialogueOptionsEl, inventoryListEl, questNameUIEl, questObjectiveUIEl;
let realityRiverUIEl, riverQuestionUIEl, riverAnswersUIEl, riverFeedbackUIEl, riverProgressUIEl;
let interactionPromptEl, interactionTextEl;

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

    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
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
            hideDialogue(setGameInteractingState); // This will hide the current dialogue box
            if (opt.action) opt.action();
        };
        dialogueOptionsEl.appendChild(button);
    });
    dialogueBoxEl.classList.remove('hidden');
    if (controls) controls.enabled = false;
    setGameInteractingState(true);
}

export function hideDialogue(setGameInteractingState) {
    if (!dialogueBoxEl) return;
    dialogueBoxEl.classList.add('hidden');
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

export function updateQuestUI(currentQuest) {
    if (!questNameUIEl || !questObjectiveUIEl) return;
    if (currentQuest) {
        questNameUIEl.textContent = currentQuest.name;
        questObjectiveUIEl.textContent = currentQuest.objectives[currentQuest.state] || 'Completed!';
    } else {
        questNameUIEl.textContent = 'None';
        questObjectiveUIEl.textContent = 'Find and speak with Professor Hepaticus.';
    }
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
    let actionText = "Interact with";
    if (objectType === 'resource') {
        actionText = "Collect";
    } else if (objectType === 'npc') {
        actionText = "Talk to";
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
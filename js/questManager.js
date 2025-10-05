// js/questManager.js
import * as CONSTANTS from './constants.js';
import {
    showDialogue, showFeedback, updateQuestUI,
    showRealityRiverUI, hideRealityRiverUI,
    updateRiverQuestion, updateRiverAnswers,
    updateRiverFeedback, clearRiverFeedback,
    updateRiverProgressUI, disableRiverAnswerButtons
} from './uiManager.js';
import { controls } from './sceneSetup.js';
import { getGameState, setGameState, getCurrentQuest, setCurrentQuest, advanceCurrentQuestState, getInventory, removeFromInventory } from './gameState.js';
import { updateCycleDisplay } from './cycleDisplay.js';

export const ureaCycleQuestData = {
    id: 'ureaCycle',
    name: "Ammonia Annihilation",
    state: CONSTANTS.QUEST_STATE.NOT_STARTED,
    objectives: {
        [CONSTANTS.QUEST_STATE.NOT_STARTED]: "Talk to Professor Hepaticus.",
        [CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2]: "Go to the alcove (West Mitochondria). Collect Water from the Well.",
        [CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2]: "Now collect CO2 from the Fire Pit in the alcove.",
        [CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE]: "Use the CAVA Shrine in the alcove with Water and CO2 to create Bicarbonate.",
        [CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE]: "Collect the Bicarbonate crystal that formed at the CAVA Shrine.",
        [CONSTANTS.QUEST_STATE.STEP_1_COLLECT_NH3]: "Now collect NH3 (Ammonia) in the Mitochondria.",
        [CONSTANTS.QUEST_STATE.STEP_1A_COLLECT_FIRST_ATP]: "Collect your first ATP molecule in the Mitochondria.",
        [CONSTANTS.QUEST_STATE.STEP_1B_COLLECT_SECOND_ATP]: "Collect one more ATP molecule (you need 2 total for Casper).",
        [CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS]: "Great! Now speak with Casper (CPS1) to make Carbamoyl Phosphate.",
        [CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS]: "Collect the Carbamoyl Phosphate.",
        [CONSTANTS.QUEST_STATE.STEP_4_MEET_USHER]: "Speak with the Ornithine Usher to get some Ornithine.",
        [CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE]: "Speak with Otis (OTC) to make Citrulline.",
        [CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE]: "Talk to the Ornithine Usher to gain passage across the river bridge.",
        [CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL]: "Permission granted! Use the ORNT1 Portal on the bridge with Citrulline to activate it and transport to the Cytosol.",
        [CONSTANTS.QUEST_STATE.STEP_8_COLLECT_CITRULLINE]: "Collect the transported Citrulline that appeared on the Cytosol side.",
        [CONSTANTS.QUEST_STATE.STEP_8A_COLLECT_ATP]: "Now collect ATP (1) in the Cytosol.",
        [CONSTANTS.QUEST_STATE.STEP_8B_GET_ASPARTATE]: "Talk to Malcolm the Shuttle Driver to get Aspartate for the next reaction.",
        [CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY]: `Find ${CONSTANTS.NPC_NAMES.DONKEY} in the Cytosol to make Argininosuccinate (Needs Citrulline, Aspartate, ATP).`,
        [CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN]: `Take Argininosuccinate to ${CONSTANTS.NPC_NAMES.ASLAN}, and ask him to break it in 2 pieces.`,
        [CONSTANTS.QUEST_STATE.STEP_10B_COLLECT_PRODUCTS]: `Collect the Arginine and Fumarate that Aslan produced.`,
        [CONSTANTS.QUEST_STATE.STEP_11_CONVERT_FUMARATE_TO_MALATE]: `Take Fumarate to the ${CONSTANTS.NPC_NAMES.FUMARASE_ENZYME} to convert it to Malate.`,
        [CONSTANTS.QUEST_STATE.STEP_11A_COLLECT_MALATE]: `Collect the Malate that was created.`,
        [CONSTANTS.QUEST_STATE.STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE]: `Take Malate to the ${CONSTANTS.NPC_NAMES.SHUTTLE_DRIVER} to transport it into the Mitochondria and receive Aspartate in the Cytosol.`,
        [CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS]: `Bring Arginine to ${CONSTANTS.NPC_NAMES.ARGUS} to produce Urea and Ornithine.`,
        [CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA]: "Dispose of the toxic Urea in the Waste Receptacle. Return Ornithine to the Usher.",
        [CONSTANTS.QUEST_STATE.STEP_14_RIVER_CHALLENGE]: `Return to ${CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS}... they have a few questions for you.`,
        [CONSTANTS.QUEST_STATE.COMPLETED]: "Quest complete! You've mastered the Urea Cycle!"
    },
    rewards: { knowledgePoints: 100 }
};

const ureaRiverQuestions = [
    { q: "Where does the Urea Cycle BEGIN?", a: ["Cytosol", "Mitochondria", "Nucleus", "ER"], correct: 1 },
    { q: "Which enzyme combines NH3, HCO3, and ATP in mitochondria?", a: ["OTC", "CPS1", "CAVA", "Arginase"], correct: 1 },
    { q: "Which molecule carries Nitrogen into the cycle in the cytosol?", a: ["Glutamate", "Ornithine", "Aspartate", "Citrulline"], correct: 2 },
    { q: "Which molecule is transported OUT of mitochondria to continue the cycle in cytosol?", a: ["Ornithine", "Carbamoyl Phosphate", "Citrulline", "Urea"], correct: 2 },
    { q: "What toxic molecule is the primary nitrogen input for the Urea Cycle?", a: ["Urea", "Ammonia (NH3/NH4+)", "Fumarate", "ATP"], correct: 1 },
    { q: "What molecule is REGENERATED in cytosol and transported back to mitochondria?", a: ["Arginine", "Ornithine", "Aspartate", "Urea"], correct: 1 }
];
let currentRiverQuestionIndex = 0;
let riverCorrectAnswers = 0;

export function initQuests() {
    // Set the initial quest state to show "Talk to Professor Hepaticus"
    const initialQuest = { ...ureaCycleQuestData, state: CONSTANTS.QUEST_STATE.NOT_STARTED };
    setCurrentQuest(initialQuest);
}

export function startUreaCycleQuest() {
    const currentQuest = getCurrentQuest();
    if (!currentQuest || currentQuest.state === CONSTANTS.QUEST_STATE.NOT_STARTED) {
        const newQuest = { ...ureaCycleQuestData, state: CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2 };
        setCurrentQuest(newQuest);
        showFeedback(`Quest Started: ${newQuest.name}`, 3500);
        updateCycleDisplay();
        return true;
    }
    return false;
}

export function advanceUreaCycleQuest(newState) {
    const currentQuest = getCurrentQuest();
    if (currentQuest && currentQuest.id === ureaCycleQuestData.id && currentQuest.state !== newState) {
        advanceCurrentQuestState(newState);
        console.log(`Advancing quest ${ureaCycleQuestData.id} from ${currentQuest.state} to ${newState}`);

        const objectiveText = ureaCycleQuestData.objectives[newState];
        if (newState === CONSTANTS.QUEST_STATE.COMPLETED) {
            const rewardPoints = ureaCycleQuestData.rewards?.knowledgePoints || 0;
            showFeedback(`Quest Complete: ${ureaCycleQuestData.name}! +${rewardPoints} KP. Don't forget to speak to Professor Hepaticus for a final word (and a survey option!).`, 6000);
        }
        return true;
    }
    return false;
}


export function startRealityRiverChallenge() {
    currentRiverQuestionIndex = 0;
    riverCorrectAnswers = 0;
    showRealityRiverUI();
    displayNextRiverQuestion();
    updateRiverProgress();
    if(controls) controls.enabled = false;
    setGameState({ isUserInteracting: true });
}

function displayNextRiverQuestion() {
    if (currentRiverQuestionIndex >= ureaRiverQuestions.length) {
        endRealityRiver(true);
        return;
    }
    const qData = ureaRiverQuestions[currentRiverQuestionIndex];
    updateRiverQuestion(qData.q);
    updateRiverAnswers(qData.a, checkRiverAnswer);
    clearRiverFeedback();
}

function checkRiverAnswer(selectedIndex) {
    const qData = ureaRiverQuestions[currentRiverQuestionIndex];
    if (selectedIndex === qData.correct) {
        updateRiverFeedback("Correct! Moving forward...", 'lightgreen');
        riverCorrectAnswers++;
        currentRiverQuestionIndex++;
        updateRiverProgress();
        disableRiverAnswerButtons();
        setTimeout(() => {
            if (currentRiverQuestionIndex >= ureaRiverQuestions.length) {
                endRealityRiver(true);
            } else {
                displayNextRiverQuestion();
            }
        }, 1000);
    } else {
        updateRiverFeedback("Not quite. Think about the process...", 'lightcoral');
    }
}

function updateRiverProgress() {
    let progress = "[";
    const totalSteps = ureaRiverQuestions.length;
    for(let i = 0; i < totalSteps; i++) {
        progress += (i < riverCorrectAnswers) ? "■" : "□";
    }
    progress += "]";
    updateRiverProgressUI(progress);
}

function endRealityRiver(success) {
    hideRealityRiverUI();
    if(controls) controls.enabled = true;
    setGameState({ isUserInteracting: false });

    if (success) {
        showDialogue("Impressive! You've navigated the Urea Cycle...", [
            { text: "Great!", action: () => advanceUreaCycleQuest(CONSTANTS.QUEST_STATE.COMPLETED) }
        ]);
    } else {
        showDialogue("Hmm, seems you need to review the Urea Cycle more closely...", [
            { text: "Okay" }
        ]);
    }
}

export function hasRequiredItems(requiredItems) {
    const inventory = getInventory();
    for (const itemName in requiredItems) {
        if (!inventory[itemName] || inventory[itemName] < requiredItems[itemName]) {
            return false;
        }
    }
    return true;
}

export function consumeItems(itemsToConsume) {
    for (const itemName in itemsToConsume) {
        removeFromInventory(itemName, itemsToConsume[itemName]);
    }
}
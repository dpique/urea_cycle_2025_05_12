import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks for everything questManager transitively needs
vi.mock('../js/uiManager.js', () => ({
    showDialogue: vi.fn(),
    showFeedback: vi.fn(),
    updateQuestUI: vi.fn(),
    showRealityRiverUI: vi.fn(),
    hideRealityRiverUI: vi.fn(),
    updateRiverQuestion: vi.fn(),
    updateRiverAnswers: vi.fn(),
    updateRiverFeedback: vi.fn(),
    clearRiverFeedback: vi.fn(),
    updateRiverProgressUI: vi.fn(),
    disableRiverAnswerButtons: vi.fn(),
}));
vi.mock('../js/eventBus.js', () => ({ emit: vi.fn() }));
vi.mock('../js/sceneSetup.js', () => ({ controls: null }));
vi.mock('../js/cycleDisplay.js', () => ({ updateCycleDisplay: vi.fn() }));
vi.mock('../js/gameState.js', () => {
    let _quest = null;
    return {
        getGameState: vi.fn(() => ({})),
        setGameState: vi.fn(),
        getCurrentQuest: vi.fn(() => _quest),
        setCurrentQuest: vi.fn((q) => { _quest = q; }),
        advanceCurrentQuestState: vi.fn((state) => { if (_quest) _quest.state = state; }),
        getInventory: vi.fn(() => ({})),
        removeFromInventory: vi.fn(() => true),
        __setQuest: (q) => { _quest = q; },
    };
});

const { emit } = await import('../js/eventBus.js');
const { advanceUreaCycleQuest, startUreaCycleQuest, ureaCycleQuestData } = await import('../js/questManager.js');
const gs = await import('../js/gameState.js');

beforeEach(() => {
    vi.clearAllMocks();
});

describe('questManager — advanceUreaCycleQuest', () => {
    it('returns false when no quest is active', () => {
        gs.getCurrentQuest.mockReturnValue(null);
        const result = advanceUreaCycleQuest('STEP_1_COLLECT_NH3');
        expect(result).toBe(false);
    });

    it('returns false when quest id does not match', () => {
        gs.getCurrentQuest.mockReturnValue({ id: 'wrong-quest', state: 'NOT_STARTED' });
        const result = advanceUreaCycleQuest('STEP_1_COLLECT_NH3');
        expect(result).toBe(false);
    });

    it('returns true and advances state when quest matches', () => {
        gs.getCurrentQuest.mockReturnValue({ id: 'ureaCycle', state: 'NOT_STARTED' });
        const result = advanceUreaCycleQuest('STEP_1_COLLECT_NH3');
        expect(result).toBe(true);
    });

    it('does not advance if already at the target state', () => {
        gs.getCurrentQuest.mockReturnValue({ id: 'ureaCycle', state: 'STEP_1_COLLECT_NH3' });
        const result = advanceUreaCycleQuest('STEP_1_COLLECT_NH3');
        expect(result).toBe(false);
    });

    it('emits quest:advance event when state changes', () => {
        gs.getCurrentQuest.mockReturnValue({ id: 'ureaCycle', state: 'NOT_STARTED' });
        advanceUreaCycleQuest('STEP_1_COLLECT_NH3');
        expect(emit).toHaveBeenCalledWith('quest:advance', {
            questId: 'ureaCycle',
            state: 'STEP_1_COLLECT_NH3',
        });
    });
});

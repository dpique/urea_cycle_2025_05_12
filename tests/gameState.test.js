import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock UI and event bus before importing gameState
vi.mock('../js/uiManager.js', () => ({
    updateInventoryUI: vi.fn(),
    updateQuestUI: vi.fn(),
    updateHealthUI: vi.fn(),
}));
vi.mock('../js/eventBus.js', () => ({
    emit: vi.fn(),
}));

// Import AFTER mocks are set up
const { emit } = await import('../js/eventBus.js');
const {
    getGameState,
    setGameState,
    getHealth,
    setHealth,
    damageHealth,
    healHealth,
    addToInventory,
    removeFromInventory,
    getInventory,
} = await import('../js/gameState.js');

describe('gameState — health', () => {
    it('getHealth returns initial health of 100', () => {
        expect(getHealth()).toBe(100);
    });

    it('setHealth updates health', () => {
        setHealth(75);
        expect(getHealth()).toBe(75);
        setHealth(100); // reset
    });

    it('setHealth clamps to maxHealth (100)', () => {
        setHealth(200);
        expect(getHealth()).toBe(100);
    });

    it('setHealth clamps to 0', () => {
        setHealth(-10);
        expect(getHealth()).toBe(0);
        setHealth(100); // reset
    });

    it('setHealth emits health:change event', () => {
        emit.mockClear();
        setHealth(50);
        expect(emit).toHaveBeenCalledWith('health:change', 50);
        setHealth(100); // reset
    });

    it('damageHealth reduces health by given amount', () => {
        setHealth(80);
        damageHealth(30);
        expect(getHealth()).toBe(50);
        setHealth(100); // reset
    });

    it('healHealth increases health', () => {
        setHealth(40);
        healHealth(20);
        expect(getHealth()).toBe(60);
        setHealth(100); // reset
    });
});

describe('gameState — inventory', () => {
    beforeEach(() => {
        // Reset inventory between tests
        setGameState({ inventory: {} });
    });

    it('addToInventory adds item with default quantity 1', () => {
        addToInventory('ATP');
        expect(getInventory()['ATP']).toBe(1);
    });

    it('addToInventory adds item with specified quantity', () => {
        addToInventory('NADH', 3);
        expect(getInventory()['NADH']).toBe(3);
    });

    it('addToInventory accumulates on repeated calls', () => {
        addToInventory('ATP');
        addToInventory('ATP');
        expect(getInventory()['ATP']).toBe(2);
    });

    it('addToInventory emits item:pickup event', () => {
        emit.mockClear();
        addToInventory('GTP', 2);
        expect(emit).toHaveBeenCalledWith('item:pickup', { name: 'GTP', quantity: 2 });
    });

    it('removeFromInventory decrements item count', () => {
        addToInventory('ATP', 5);
        const removed = removeFromInventory('ATP', 2);
        expect(removed).toBe(true);
        expect(getInventory()['ATP']).toBe(3);
    });

    it('removeFromInventory deletes item when count reaches 0', () => {
        addToInventory('FADH2', 1);
        removeFromInventory('FADH2', 1);
        expect(getInventory()['FADH2']).toBeUndefined();
    });

    it('removeFromInventory returns false when item not present', () => {
        const removed = removeFromInventory('nonexistent', 1);
        expect(removed).toBe(false);
    });
});

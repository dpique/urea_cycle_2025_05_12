import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks must be declared before any imports that transitively use them
vi.mock('../js/uiManager.js', () => ({
    updateInventoryUI: vi.fn(),
    updateQuestUI: vi.fn(),
    showFeedback: vi.fn(),
}));
vi.mock('../js/eventBus.js', () => ({
    emit: vi.fn(),
}));
vi.mock('../js/playerManager.js', () => ({
    player: { position: { x: 1, y: 0.5, z: 2, set: vi.fn() } },
}));
vi.mock('../js/sceneManager.js', () => ({
    transitionTo: vi.fn(),
}));
vi.mock('../js/gameState.js', () => ({
    getGameState: vi.fn(() => ({
        inventory: { ATP: 2 },
        currentQuest: null,
        playerLocation: 'mitochondria',
        hasPortalPermission: false,
        currentWorldId: 'tca-cycle',
        abilities: [],
        unlockedWorlds: ['tca-cycle'],
        worldProgress: {},
    })),
    setGameState: vi.fn(),
}));

const { saveGame, loadGame } = await import('../js/persistenceManager.js');
const { transitionTo } = await import('../js/sceneManager.js');
const { setGameState } = await import('../js/gameState.js');
const { showFeedback } = await import('../js/uiManager.js');

// Provide a reliable localStorage stub across environments
let _store = {};
const localStorageMock = {
    getItem: (k) => _store[k] ?? null,
    setItem: (k, v) => { _store[k] = String(v); },
    removeItem: (k) => { delete _store[k]; },
    clear: () => { _store = {}; },
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
});

describe('persistenceManager — saveGame', () => {
    it('writes a JSON blob to localStorage', () => {
        saveGame();
        const raw = localStorage.getItem('metabolonSaveGame');
        expect(raw).not.toBeNull();
        const data = JSON.parse(raw);
        expect(data).toBeDefined();
    });

    it('save data includes version field', () => {
        saveGame();
        const data = JSON.parse(localStorage.getItem('metabolonSaveGame'));
        expect(data.version).toBe(1);
    });

    it('save data includes inventory from gameState', () => {
        saveGame();
        const data = JSON.parse(localStorage.getItem('metabolonSaveGame'));
        expect(data.inventory).toEqual({ ATP: 2 });
    });

    it('save data includes currentWorldId', () => {
        saveGame();
        const data = JSON.parse(localStorage.getItem('metabolonSaveGame'));
        expect(data.currentWorldId).toBe('tca-cycle');
    });
});

describe('persistenceManager — loadGame', () => {
    it('returns false and shows feedback when no save exists', () => {
        const result = loadGame();
        expect(result).toBe(false);
        expect(showFeedback).toHaveBeenCalledWith('No save game found', 2000);
    });

    it('returns true when valid save data is present', () => {
        const saveData = {
            version: 1,
            inventory: { NADH: 3 },
            currentQuest: null,
            playerLocation: 'mitochondria',
            hasPortalPermission: false,
            currentWorldId: 'urea-cycle',
            abilities: [],
            unlockedWorlds: ['urea-cycle'],
            worldProgress: {},
            playerPosition: { x: 5, y: 0.5, z: -10 },
        };
        localStorage.setItem('metabolonSaveGame', JSON.stringify(saveData));
        const result = loadGame();
        expect(result).toBe(true);
    });

    it('calls transitionTo with the saved worldId', () => {
        const saveData = {
            version: 1,
            inventory: {},
            currentWorldId: 'glycolysis',
            playerPosition: { x: 0, y: 0.5, z: 55 },
        };
        localStorage.setItem('metabolonSaveGame', JSON.stringify(saveData));
        loadGame();
        expect(transitionTo).toHaveBeenCalledWith('glycolysis', { x: 0, y: 0.5, z: 55 });
    });

    it('calls setGameState with restored inventory', () => {
        const saveData = {
            version: 1,
            inventory: { ATP: 5 },
            currentWorldId: 'tca-cycle',
            playerPosition: { x: 0, y: 0.5, z: 0 },
        };
        localStorage.setItem('metabolonSaveGame', JSON.stringify(saveData));
        loadGame();
        expect(setGameState).toHaveBeenCalledWith(expect.objectContaining({ inventory: { ATP: 5 } }));
    });

    it('migrates legacy save data that has no version field', () => {
        const legacyData = {
            // no version field
            inventory: { GTP: 1 },
            currentWorldId: 'urea-cycle',
            playerPosition: { x: 0, y: 0.5, z: 0 },
        };
        localStorage.setItem('metabolonSaveGame', JSON.stringify(legacyData));
        // Should not throw and should return true
        expect(() => loadGame()).not.toThrow();
    });
});

// js/eventBus.js
// Simple pub/sub event bus for decoupled communication between game systems.
//
// Events emitted by the game:
//   'health:change'     — data: number (current health 0-100)
//   'item:pickup'       — data: { name: string, quantity: number }
//   'quest:advance'     — data: { questId: string, state: string }
//   'world:transition'  — data: { worldId: string }

const listeners = {};

export function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
}

export function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
}

export function emit(event, data) {
    if (!listeners[event]) return;
    for (const cb of listeners[event]) {
        cb(data);
    }
}

export function once(event, callback) {
    const wrapper = (data) => {
        callback(data);
        off(event, wrapper);
    };
    on(event, wrapper);
}

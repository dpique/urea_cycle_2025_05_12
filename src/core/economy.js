// src/core/economy.js
// The shared metabolic economy — the deep cohesion layer. One inventory of currencies
// and cross-world items persists across every district. Glycolysis makes the ATP and
// NADH the urea cycle spends, so the interconnection of metabolism is a real mechanic,
// not a caption. Everything that changes here emits 'change' so the HUD stays in sync.

const listeners = new Map();

// Currencies shown as persistent chips in the HUD, in a fixed order.
export const CURRENCY_ORDER = ['ATP', 'NADH', 'NADPH', 'FADH2', 'GTP'];

const state = {
  currencies: { ATP: 0, NADH: 0, NADPH: 0, FADH2: 0, GTP: 0 },
  items: {}, // pathway products / keys, e.g. { urea: 3, ornithine: 1 }
  abilities: {}, // { 'glucose-handling': true }
  worldsComplete: {}, // { glycolysis: true }
};

// A small starting energy stake so any world is playable first; glycolysis refills it.
export function seed() {
  state.currencies.ATP = 6;
  state.currencies.NADH = 0;
  emit('change', snapshot());
}

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt)?.delete(fn);
}
export function emit(evt, payload) {
  listeners.get(evt)?.forEach((fn) => fn(payload));
}

// --- currencies ---
export function addCurrency(name, n = 1) {
  state.currencies[name] = (state.currencies[name] || 0) + n;
  emit('change', snapshot());
  emit('gain', { name, n, kind: 'currency' });
}
export function spendCurrency(name, n = 1) {
  if ((state.currencies[name] || 0) < n) return false;
  state.currencies[name] -= n;
  emit('change', snapshot());
  emit('spend', { name, n, kind: 'currency' });
  return true;
}
export function currency(name) {
  return state.currencies[name] || 0;
}
export function hasCurrency(name, n = 1) {
  return (state.currencies[name] || 0) >= n;
}

// --- items (pathway products, cross-world keys) ---
export function addItem(name, n = 1) {
  state.items[name] = (state.items[name] || 0) + n;
  emit('change', snapshot());
  emit('gain', { name, n, kind: 'item' });
}
export function takeItem(name, n = 1) {
  if ((state.items[name] || 0) < n) return false;
  state.items[name] -= n;
  emit('change', snapshot());
  return true;
}
export function itemCount(name) {
  return state.items[name] || 0;
}

// --- abilities & world completion (Zelda-style gating) ---
export function grantAbility(id) {
  state.abilities[id] = true;
  emit('ability', id);
  emit('change', snapshot());
}
export function hasAbility(id) {
  return !!state.abilities[id];
}
export function markWorldComplete(id) {
  state.worldsComplete[id] = true;
  emit('change', snapshot());
}
export function isWorldComplete(id) {
  return !!state.worldsComplete[id];
}

export function snapshot() {
  return {
    currencies: { ...state.currencies },
    items: { ...state.items },
    abilities: { ...state.abilities },
    worldsComplete: { ...state.worldsComplete },
  };
}
export function restore(data) {
  if (!data) return;
  Object.assign(state.currencies, data.currencies || {});
  state.items = { ...(data.items || {}) };
  state.abilities = { ...(data.abilities || {}) };
  state.worldsComplete = { ...(data.worldsComplete || {}) };
  emit('change', snapshot());
}

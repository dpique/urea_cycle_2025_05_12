// src/core/save.js
// localStorage persistence for the shared economy and current location. Kept small: the
// pathway runner rebuilds world state from economy flags (abilities, worldsComplete), so
// we do not need to serialize per-station progress for the slice.

import * as economy from './economy.js';

const KEY = 'metabolon.save.v2';

export function save(extra = {}) {
  try {
    const data = { economy: economy.snapshot(), ...extra, ts: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    economy.restore(data.economy);
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return !!localStorage.getItem(KEY);
}
export function clear() {
  localStorage.removeItem(KEY);
}

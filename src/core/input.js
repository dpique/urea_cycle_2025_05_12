// src/core/input.js
// Keyboard, mouse-drag camera orbit, and wheel zoom. Movement is camera-relative: the
// player walks where the camera is looking. Edge-triggered presses (interact, jump) are
// polled once via wasPressed so the game loop owns the timing.

const down = new Set();
const pressedQueue = new Set();
let dragging = false;
let lastX = 0;
let lastY = 0;

export const camState = {
  yaw: 0, // radians, orbit around player
  pitch: 0.5, // radians above horizon
  distance: 13,
};

export function initInput(dom) {
  window.addEventListener('keydown', (e) => {
    const code = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!down.has(code)) pressedQueue.add(code);
    down.add(code);
    // stop the page from scrolling on space / arrows during play
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const code = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    down.delete(code);
  });

  const el = dom || window;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('pointerup', () => (dragging = false));
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camState.yaw -= dx * 0.006;
    camState.pitch = clamp(camState.pitch - dy * 0.005, 0.12, 1.15);
  });
  window.addEventListener(
    'wheel',
    (e) => {
      camState.distance = clamp(camState.distance + Math.sign(e.deltaY) * 1.1, 6, 26);
    },
    { passive: true }
  );

  // basic touch orbit
  let touchId = null;
  el.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchId = t.identifier;
    lastX = t.clientX;
    lastY = t.clientY;
  });
  el.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      camState.yaw -= (t.clientX - lastX) * 0.006;
      camState.pitch = clamp(camState.pitch - (t.clientY - lastY) * 0.005, 0.12, 1.15);
      lastX = t.clientX;
      lastY = t.clientY;
    }
  });
}

export function isDown(code) {
  return down.has(code);
}

// Returns true once per physical key press.
export function wasPressed(code) {
  if (pressedQueue.has(code)) {
    pressedQueue.delete(code);
    return true;
  }
  return false;
}

// Camera-relative movement axis from WASD / arrows, normalized.
export function getMoveAxis() {
  let x = 0;
  let z = 0;
  if (down.has('w') || down.has('ArrowUp')) z -= 1;
  if (down.has('s') || down.has('ArrowDown')) z += 1;
  if (down.has('a') || down.has('ArrowLeft')) x -= 1;
  if (down.has('d') || down.has('ArrowRight')) x += 1;
  const len = Math.hypot(x, z);
  if (len > 0) {
    x /= len;
    z /= len;
  }
  return { x, z, moving: len > 0 };
}

// Let the HUD/touch buttons drive movement too.
export function setVirtualKey(code, isDownNow) {
  if (isDownNow) {
    if (!down.has(code)) pressedQueue.add(code);
    down.add(code);
  } else {
    down.delete(code);
  }
}

// Clear held keys (used on world transitions so the player does not keep walking).
export function clearHeld() {
  down.clear();
  pressedQueue.clear();
  dragging = false;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

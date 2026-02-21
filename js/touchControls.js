// js/touchControls.js
// Virtual joystick and interact button for mobile/touch devices

import { keysPressed } from './playerManager.js';

let joystickContainer, joystickThumb, interactButton;
let joystickActive = false;
let joystickOrigin = { x: 0, y: 0 };
let joystickTouchId = null;
const JOYSTICK_RADIUS = 50;

// Detect touch device
export function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

export function initTouchControls() {
    if (!isTouchDevice()) return;

    // --- Virtual Joystick (left side) ---
    joystickContainer = document.createElement('div');
    joystickContainer.id = 'touchJoystick';
    joystickContainer.style.cssText = `
        position: fixed; bottom: 30px; left: 30px; width: 120px; height: 120px;
        border-radius: 50%; background: rgba(255,255,255,0.15);
        border: 2px solid rgba(255,255,255,0.3); touch-action: none;
        z-index: 200; display: flex; align-items: center; justify-content: center;
    `;

    joystickThumb = document.createElement('div');
    joystickThumb.style.cssText = `
        width: 50px; height: 50px; border-radius: 50%;
        background: rgba(255,255,255,0.5); pointer-events: none;
        transition: transform 0.05s;
    `;
    joystickContainer.appendChild(joystickThumb);
    document.body.appendChild(joystickContainer);

    // --- Interact Button (right side) ---
    interactButton = document.createElement('button');
    interactButton.id = 'touchInteractBtn';
    interactButton.textContent = 'E';
    interactButton.style.cssText = `
        position: fixed; bottom: 40px; right: 40px; width: 70px; height: 70px;
        border-radius: 50%; background: rgba(0,150,255,0.5);
        border: 2px solid rgba(0,150,255,0.8); color: white; font-size: 28px;
        font-weight: bold; touch-action: none; z-index: 200;
        display: flex; align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent;
    `;
    document.body.appendChild(interactButton);

    // --- Jump Button ---
    const jumpButton = document.createElement('button');
    jumpButton.id = 'touchJumpBtn';
    jumpButton.textContent = 'Jump';
    jumpButton.style.cssText = `
        position: fixed; bottom: 120px; right: 40px; width: 60px; height: 60px;
        border-radius: 50%; background: rgba(0,200,100,0.4);
        border: 2px solid rgba(0,200,100,0.7); color: white; font-size: 14px;
        font-weight: bold; touch-action: none; z-index: 200;
        display: flex; align-items: center; justify-content: center;
        -webkit-tap-highlight-color: transparent;
    `;
    document.body.appendChild(jumpButton);

    // --- Joystick touch handling ---
    joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        joystickActive = true;
        const rect = joystickContainer.getBoundingClientRect();
        joystickOrigin.x = rect.left + rect.width / 2;
        joystickOrigin.y = rect.top + rect.height / 2;
        updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                e.preventDefault();
                updateJoystick(touch.clientX, touch.clientY);
                break;
            }
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                resetJoystick();
                break;
            }
        }
    });

    document.addEventListener('touchcancel', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                resetJoystick();
                break;
            }
        }
    });

    // --- Interact button ---
    interactButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed['e'] = true;
        interactButton.style.background = 'rgba(0,150,255,0.8)';
    }, { passive: false });

    interactButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed['e'] = false;
        interactButton.style.background = 'rgba(0,150,255,0.5)';
    }, { passive: false });

    // --- Jump button ---
    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keysPressed[' '] = true;
        jumpButton.style.background = 'rgba(0,200,100,0.7)';
    }, { passive: false });

    jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keysPressed[' '] = false;
        jumpButton.style.background = 'rgba(0,200,100,0.4)';
    }, { passive: false });
}

function updateJoystick(touchX, touchY) {
    let dx = touchX - joystickOrigin.x;
    let dy = touchY - joystickOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > JOYSTICK_RADIUS) {
        dx = (dx / dist) * JOYSTICK_RADIUS;
        dy = (dy / dist) * JOYSTICK_RADIUS;
    }

    joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;

    // Map to WASD keys — threshold of 30% of radius for dead zone
    const threshold = JOYSTICK_RADIUS * 0.3;
    keysPressed['w'] = dy < -threshold;
    keysPressed['s'] = dy > threshold;
    keysPressed['a'] = dx < -threshold;
    keysPressed['d'] = dx > threshold;
}

function resetJoystick() {
    joystickActive = false;
    joystickTouchId = null;
    joystickThumb.style.transform = 'translate(0, 0)';
    keysPressed['w'] = false;
    keysPressed['s'] = false;
    keysPressed['a'] = false;
    keysPressed['d'] = false;
}

// js/playerManager.js -- First-person (Minecraft-style) player
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { camera, controls, isControlsLocked } from './sceneSetup.js';

export let player;
export const keysPressed = {};
let walkCycleTime = 0;
const playerVelocity = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);

// First-person eye height (head center)
const EYE_HEIGHT = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT + CONSTANTS.PLAYER_HEAD_HEIGHT * 0.5;

// First-person arms (attached to camera)
let fpLeftArm, fpRightArm, fpLeftHand, fpRightHand;
let dustParticles = [];
let lastFootstepTime = 0;

export function initPlayer(scene) {
    // Player group is an invisible anchor for position, collision, and gameplay systems
    player = new THREE.Group();
    player.userData.isPlayer = true;
    player.position.set(-10, 0, -5);
    scene.add(player);

    // Initial camera position at eye height
    camera.position.copy(player.position);
    camera.position.y += EYE_HEIGHT;

    // --- First-person arms (children of camera, always visible) ---
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2288dd, roughness: 0.75, metalness: 0.05 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 });

    // Right arm (lower-right of view)
    fpRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), shirtMat);
    fpRightArm.position.set(0.28, -0.28, -0.4);
    fpRightArm.rotation.x = -0.4; // Angled forward slightly
    camera.add(fpRightArm);

    fpRightHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), skinMat);
    fpRightHand.position.set(0.28, -0.42, -0.45);
    camera.add(fpRightHand);

    // Left arm (lower-left of view)
    fpLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), shirtMat);
    fpLeftArm.position.set(-0.28, -0.28, -0.4);
    fpLeftArm.rotation.x = -0.4;
    camera.add(fpLeftArm);

    fpLeftHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), skinMat);
    fpLeftHand.position.set(-0.28, -0.42, -0.45);
    camera.add(fpLeftHand);

    // Input listeners
    document.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
    });

    return player;
}

function createDustParticle(position) {
    const geometry = new THREE.SphereGeometry(0.05, 4, 4);
    const material = new THREE.MeshBasicMaterial({
        color: 0x8b7355,
        transparent: true,
        opacity: 0.6
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.position.y = 0.1;
    particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.03,
        (Math.random() - 0.5) * 0.02
    );
    particle.userData.life = 1.0;
    return particle;
}

export function updatePlayer(delta, isUserInteracting, checkCollisionCallback) {
    if (!player) return;

    // --- Movement (WASD relative to camera look direction) ---
    let moveZ = 0;
    let moveX = 0;
    if (!isUserInteracting && isControlsLocked()) {
        if (keysPressed['w'] || keysPressed['arrowup']) moveZ = 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) moveZ = -1;
        if (keysPressed['a'] || keysPressed['arrowleft']) moveX = 1;
        if (keysPressed['d'] || keysPressed['arrowright']) moveX = -1;
    }

    playerVelocity.set(0, 0, 0);
    const moveDirection = new THREE.Vector3(0, 0, 0);
    const playerIsMoving = moveX !== 0 || moveZ !== 0;

    const isRunning = keysPressed['shift'];
    const currentSpeed = isRunning ? CONSTANTS.PLAYER_SPEED * 1.5 : CONSTANTS.PLAYER_SPEED;

    if (playerIsMoving) {
        // Get forward/right from camera direction (horizontal only)
        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(upVector, cameraForward).normalize();

        moveDirection.addScaledVector(cameraForward, moveZ).addScaledVector(cameraRight, moveX).normalize();
        playerVelocity.copy(moveDirection).multiplyScalar(currentSpeed * delta);

        // Collision check (X then Z separately)
        const currentPos = player.position.clone();
        const nextPosX = currentPos.clone().add(new THREE.Vector3(playerVelocity.x, 0, 0));
        if (!checkCollisionCallback(nextPosX)) {
            player.position.x = nextPosX.x;
        }

        const nextPosZ = player.position.clone().add(new THREE.Vector3(0, 0, playerVelocity.z));
        if (!checkCollisionCallback(new THREE.Vector3(player.position.x, player.position.y, nextPosZ.z))) {
            player.position.z = nextPosZ.z;
        }

        // Walk animation -- bob the arms
        const animationSpeed = isRunning ? 1.5 : 1.0;
        walkCycleTime += delta * animationSpeed;
        if (walkCycleTime > CONSTANTS.PLAYER_WALK_CYCLE_DURATION) {
            walkCycleTime -= CONSTANTS.PLAYER_WALK_CYCLE_DURATION;
        }
        const swingPhase = (walkCycleTime / CONSTANTS.PLAYER_WALK_CYCLE_DURATION) * Math.PI * 2;
        const armBob = Math.sin(swingPhase) * 0.03;
        const armSwing = Math.sin(swingPhase) * 0.1;

        if (fpRightArm) {
            fpRightArm.position.y = -0.28 + armBob;
            fpRightArm.rotation.x = -0.4 + armSwing;
        }
        if (fpLeftArm) {
            fpLeftArm.position.y = -0.28 - armBob;
            fpLeftArm.rotation.x = -0.4 - armSwing;
        }
        if (fpRightHand) fpRightHand.position.y = -0.42 + armBob;
        if (fpLeftHand) fpLeftHand.position.y = -0.42 - armBob;

        // Dust particles
        const currentTime = Date.now();
        if (currentTime - lastFootstepTime > 200) {
            const dustParticle = createDustParticle(player.position);
            player.parent.add(dustParticle);
            dustParticles.push(dustParticle);
            lastFootstepTime = currentTime;
        }
    } else {
        walkCycleTime = 0;
        // Reset arms to resting position
        if (fpRightArm) { fpRightArm.position.y = -0.28; fpRightArm.rotation.x = -0.4; }
        if (fpLeftArm) { fpLeftArm.position.y = -0.28; fpLeftArm.rotation.x = -0.4; }
        if (fpRightHand) fpRightHand.position.y = -0.42;
        if (fpLeftHand) fpLeftHand.position.y = -0.42;
    }

    // --- Camera follows player position (first-person: camera IS the player's eyes) ---
    camera.position.x = player.position.x;
    camera.position.z = player.position.z;
    camera.position.y = player.position.y + EYE_HEIGHT;

    // --- Dust particle update ---
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        const particle = dustParticles[i];
        particle.userData.life -= delta * 2;

        if (particle.userData.life <= 0) {
            if (particle.parent) particle.parent.remove(particle);
            if (particle.geometry) particle.geometry.dispose();
            if (particle.material) particle.material.dispose();
            dustParticles.splice(i, 1);
        } else {
            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.y -= delta * 0.05;
            particle.material.opacity = particle.userData.life * 0.6;
            const scale = particle.userData.life;
            particle.scale.set(scale, scale, scale);
        }
    }
}

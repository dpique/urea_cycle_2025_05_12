// js/playerManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { camera, controls } from './sceneSetup.js'; // Assuming camera/controls are exported from sceneSetup

export let player;
export const keysPressed = {};
let walkCycleTime = 0;
const playerVelocity = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const upVector = new THREE.Vector3(0, 1, 0);

// Camera perspectives
let cameraMode = 'overhead'; // 'overhead' or 'behind'
const cameraOverheadOffset = new THREE.Vector3(0, 10, -12);
const cameraBehindOffset = new THREE.Vector3(0, 3, -6);
const cameraIdealLookAt = new THREE.Vector3(0, 1.5, 0);
const cameraPositionSmoothFactor = 0.08;
const cameraTargetSmoothFactor = 0.1;

let playerLeftArm, playerRightArm, playerLeftLeg, playerRightLeg;
let dustParticles = [];
let lastFootstepTime = 0;

export function toggleCameraMode() {
    cameraMode = cameraMode === 'overhead' ? 'behind' : 'overhead';
    const modeName = cameraMode === 'overhead' ? 'Overhead View' : 'Third Person View';
    return modeName;
}

export function initPlayer(scene) {
    player = new THREE.Group();
    player.userData.isPlayer = true;
    player.position.set(-10, 0, -5); // Initial position away from bridge
    scene.add(player);

    // RSC-style blocky player character
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2288dd, roughness: 0.75, metalness: 0.05 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x335577, roughness: 0.8, metalness: 0.05 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 });

    // Head (blocky, slightly oversized)
    const headSize = CONSTANTS.PLAYER_HEAD_HEIGHT * 1.1;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize * 1.05, headSize * 0.9), skinMat);
    head.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT + headSize / 2;
    head.castShadow = true;
    player.add(head);

    // Face texture (painted on the front)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128; faceCanvas.height = 128;
    const fCtx = faceCanvas.getContext('2d');
    fCtx.clearRect(0, 0, 128, 128);
    fCtx.fillStyle = '#222';
    // Determined eyes
    fCtx.beginPath();
    fCtx.arc(46, 48, 7, 0, Math.PI * 2);
    fCtx.arc(82, 48, 7, 0, Math.PI * 2);
    fCtx.fill();
    // Eye highlights
    fCtx.fillStyle = '#fff';
    fCtx.beginPath();
    fCtx.arc(49, 45, 3, 0, Math.PI * 2);
    fCtx.arc(85, 45, 3, 0, Math.PI * 2);
    fCtx.fill();
    // Confident smile
    fCtx.strokeStyle = '#222';
    fCtx.lineWidth = 2.5;
    fCtx.beginPath();
    fCtx.arc(64, 82, 12, 0.1, Math.PI - 0.1);
    fCtx.stroke();
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    const facePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(headSize * 0.8, headSize * 0.8),
        new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true })
    );
    facePlane.position.set(0, head.position.y, headSize * 0.45 + 0.001);
    player.add(facePlane);

    // Body (box torso)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, CONSTANTS.PLAYER_BODY_HEIGHT, 0.3), shirtMat);
    body.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT / 2;
    body.castShadow = true;
    player.add(body);

    // Shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.34), shirtMat);
    shoulders.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT - 0.04;
    player.add(shoulders);

    // Arms (box)
    const armW = 0.11;
    playerLeftArm = new THREE.Mesh(new THREE.BoxGeometry(armW, CONSTANTS.PLAYER_ARM_LENGTH * 0.55, armW), shirtMat);
    playerLeftArm.position.set(-0.35, CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT * 0.75, 0);
    playerLeftArm.castShadow = true;
    player.add(playerLeftArm);

    playerRightArm = new THREE.Mesh(new THREE.BoxGeometry(armW, CONSTANTS.PLAYER_ARM_LENGTH * 0.55, armW), shirtMat);
    playerRightArm.position.set(0.35, CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT * 0.75, 0);
    playerRightArm.castShadow = true;
    player.add(playerRightArm);

    // Hands (skin)
    [-0.35, 0.35].forEach(x => {
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skinMat);
        hand.position.set(x, CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT * 0.45, 0);
        player.add(hand);
    });

    // Legs (box, pants color)
    const legW = 0.14;
    playerLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(legW, CONSTANTS.PLAYER_LEG_HEIGHT, legW * 1.1), pantsMat);
    playerLeftLeg.position.set(-0.1, CONSTANTS.PLAYER_LEG_HEIGHT / 2, 0);
    playerLeftLeg.castShadow = true;
    player.add(playerLeftLeg);

    playerRightLeg = new THREE.Mesh(new THREE.BoxGeometry(legW, CONSTANTS.PLAYER_LEG_HEIGHT, legW * 1.1), pantsMat);
    playerRightLeg.position.set(0.1, CONSTANTS.PLAYER_LEG_HEIGHT / 2, 0);
    playerRightLeg.castShadow = true;
    player.add(playerRightLeg);

    // Boots
    [-0.1, 0.1].forEach(x => {
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.2), bootMat);
        boot.position.set(x, 0.03, 0.03);
        player.add(boot);
    });

    // Remove the custom shadow plane - relying on actual shadows instead
    // The square shadow was creating visual artifacts

    // Initial camera position
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);
    const initialCamPos = cameraOverheadOffset.clone().applyQuaternion(player.quaternion).add(playerWorldPos);
    const initialLookAt = playerWorldPos.clone().add(cameraIdealLookAt);
    camera.position.copy(initialCamPos);
    controls.target.copy(initialLookAt);
    camera.lookAt(controls.target);
    controls.update();

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

    let moveZ = 0;
    let moveX = 0;
    if (!isUserInteracting) {
        if (keysPressed['w'] || keysPressed['arrowup']) moveZ = 1;
        if (keysPressed['s'] || keysPressed['arrowdown']) moveZ = -1;
        if (keysPressed['a'] || keysPressed['arrowleft']) moveX = 1;
        if (keysPressed['d'] || keysPressed['arrowright']) moveX = -1;
    }

    playerVelocity.set(0, 0, 0);
    const moveDirection = new THREE.Vector3(0,0,0);
    const playerIsMoving = moveX !== 0 || moveZ !== 0;
    
    // Check if running (Shift key)
    const isRunning = keysPressed['shift'];
    const currentSpeed = isRunning ? CONSTANTS.PLAYER_SPEED * 1.5 : CONSTANTS.PLAYER_SPEED;

    if (playerIsMoving) {
        // Speed up walk cycle when running
        const animationSpeed = isRunning ? 1.5 : 1.0;
        walkCycleTime += delta * animationSpeed;
        if (walkCycleTime > CONSTANTS.PLAYER_WALK_CYCLE_DURATION) {
            walkCycleTime -= CONSTANTS.PLAYER_WALK_CYCLE_DURATION;
        }
        const swingPhase = (walkCycleTime / CONSTANTS.PLAYER_WALK_CYCLE_DURATION) * Math.PI * 2;
        const armSwing = Math.sin(swingPhase) * CONSTANTS.PLAYER_MAX_ARM_SWING;
        const legSwing = Math.sin(swingPhase) * CONSTANTS.PLAYER_MAX_LIMB_SWING;
        playerLeftArm.rotation.x = Math.PI + armSwing;
        playerRightArm.rotation.x = Math.PI - armSwing;
        playerLeftLeg.rotation.x = legSwing;
        playerRightLeg.rotation.x = -legSwing;

        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(upVector, cameraForward).normalize();

        moveDirection.addScaledVector(cameraForward, moveZ).addScaledVector(cameraRight, moveX).normalize();
        playerVelocity.copy(moveDirection).multiplyScalar(currentSpeed * delta);

        const currentPos = player.position.clone();
        const nextPosX = currentPos.clone().add(new THREE.Vector3(playerVelocity.x, 0, 0));
        if (!checkCollisionCallback(nextPosX)) {
            player.position.x = nextPosX.x;
        } else {
            playerVelocity.x = 0;
        }

        const nextPosZ = player.position.clone().add(new THREE.Vector3(0, 0, playerVelocity.z)); // Use current player.position for Z check
         if (!checkCollisionCallback(new THREE.Vector3(player.position.x, player.position.y, nextPosZ.z))) { // Check with current X
            player.position.z = nextPosZ.z;
        } else {
            playerVelocity.z = 0;
        }


        if (moveDirection.lengthSq() > 0.001) {
            // Calculate target rotation using atan2 for full 360 degree rotation
            const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
            targetQuaternion.setFromAxisAngle(upVector, targetAngle);
            player.quaternion.slerp(targetQuaternion, 0.2);
        }
        
        // Create dust particles when walking
        const currentTime = Date.now();
        if (currentTime - lastFootstepTime > 200) { // Every 200ms
            const dustParticle = createDustParticle(player.position);
            player.parent.add(dustParticle); // Add to scene
            dustParticles.push(dustParticle);
            lastFootstepTime = currentTime;
        }
    } else {
        walkCycleTime = 0;
        playerLeftArm.rotation.x = Math.PI;
        playerRightArm.rotation.x = Math.PI;
        playerLeftLeg.rotation.x = 0;
        playerRightLeg.rotation.x = 0;
    }

    // Camera update
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);
    const cameraTargetPos = new THREE.Vector3();
    const currentCameraOffset = cameraMode === 'overhead' ? cameraOverheadOffset : cameraBehindOffset;
    cameraTargetPos.copy(currentCameraOffset).applyQuaternion(player.quaternion).add(playerWorldPos);
    const cameraTargetLookAt = new THREE.Vector3();
    cameraTargetLookAt.copy(playerWorldPos).add(cameraIdealLookAt);

    // Only lerp if not interacting with a UI that disables controls (dialogue, quiz)
    if (!isUserInteracting || (document.getElementById('dialogueBox').classList.contains('hidden') && document.getElementById('realityRiver').classList.contains('hidden')) ) {
        camera.position.lerp(cameraTargetPos, cameraPositionSmoothFactor);
        controls.target.lerp(cameraTargetLookAt, cameraTargetSmoothFactor);
    } else {
        controls.target.copy(cameraTargetLookAt); // Snap if major UI is open
    }
    controls.update(delta);
    
    // Update dust particles
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
            particle.userData.velocity.y -= delta * 0.05; // gravity
            particle.material.opacity = particle.userData.life * 0.6;
            const scale = particle.userData.life;
            particle.scale.set(scale, scale, scale);
        }
    }
    
    // Shadow handling removed - using actual shadows from lighting
}
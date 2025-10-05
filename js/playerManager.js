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
const cameraIdealOffset = new THREE.Vector3(0, 10, -12);
const cameraIdealLookAt = new THREE.Vector3(0, 1.5, 0);
const cameraPositionSmoothFactor = 0.08;
const cameraTargetSmoothFactor = 0.1;

let playerLeftArm, playerRightArm, playerLeftLeg, playerRightLeg;
let dustParticles = [];
let lastFootstepTime = 0;

export function initPlayer(scene) {
    player = new THREE.Group();
    player.position.set(-10, 0, -5); // Initial position away from bridge
    scene.add(player);

    const playerBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0099ff, roughness: 0.6, metalness: 0.2 });
    // RSC-like: fewer segments for head
    const head = new THREE.Mesh(new THREE.SphereGeometry(CONSTANTS.PLAYER_HEAD_HEIGHT / 2, 8, 6), playerBodyMaterial);
    head.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT + CONSTANTS.PLAYER_HEAD_HEIGHT / 2;
    head.castShadow = true;
    player.add(head);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, CONSTANTS.PLAYER_BODY_HEIGHT, 0.3), playerBodyMaterial); // Box is already low-poly
    body.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT / 2;
    body.castShadow = true;
    player.add(body);

    const playerLimbMaterial = new THREE.MeshStandardMaterial({ color: 0x0077cc, roughness: 0.7 });
    // RSC-like: fewer segments for limbs (e.g., 6 for hexagonal prism)
    playerLeftArm = new THREE.Mesh(new THREE.CylinderGeometry(CONSTANTS.PLAYER_LIMB_RADIUS, CONSTANTS.PLAYER_LIMB_RADIUS, CONSTANTS.PLAYER_ARM_LENGTH, 6), playerLimbMaterial);
    playerLeftArm.position.set(-0.35, CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT * 0.95, 0);
    playerLeftArm.geometry.translate(0, CONSTANTS.PLAYER_ARM_LENGTH / 2, 0);
    playerLeftArm.rotation.x = Math.PI;
    playerLeftArm.castShadow = true;
    player.add(playerLeftArm);

    playerRightArm = playerLeftArm.clone();
    playerRightArm.position.x = 0.35;
    player.add(playerRightArm);

    // RSC-like: fewer segments for legs
    playerLeftLeg = new THREE.Mesh(new THREE.CylinderGeometry(CONSTANTS.PLAYER_LIMB_RADIUS * 1.2, CONSTANTS.PLAYER_LIMB_RADIUS * 1.1, CONSTANTS.PLAYER_LEG_HEIGHT, 6), playerLimbMaterial);
    playerLeftLeg.position.set(-0.15, CONSTANTS.PLAYER_LEG_HEIGHT / 2, 0);
    playerLeftLeg.castShadow = true;
    player.add(playerLeftLeg);

    playerRightLeg = playerLeftLeg.clone();
    playerRightLeg.position.x = 0.15;
    player.add(playerRightLeg);

    // Remove the custom shadow plane - relying on actual shadows instead
    // The square shadow was creating visual artifacts

    // Initial camera position
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);
    const initialCamPos = cameraIdealOffset.clone().applyQuaternion(player.quaternion).add(playerWorldPos);
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
    cameraTargetPos.copy(cameraIdealOffset).applyQuaternion(player.quaternion).add(playerWorldPos);
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
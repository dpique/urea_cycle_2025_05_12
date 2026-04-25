// js/playerManager.js -- Third-person (Zelda-rounded)
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { camera, controls } from './sceneSetup.js';

export let player;
export const keysPressed = {};
let walkCycleTime = 0;
const playerVelocity = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const upVector = new THREE.Vector3(0, 1, 0);

// Camera perspectives
let cameraMode = 'behind';
const cameraOverheadOffset = new THREE.Vector3(0, 10, -12);
const cameraBehindOffset = new THREE.Vector3(0, 3, -6);
const cameraIdealLookAt = new THREE.Vector3(0, 1.5, 0);
const cameraPositionSmoothFactor = 0.08;
const cameraTargetSmoothFactor = 0.1;

// Limb pivot groups (rotate at shoulder/hip, not center)
let leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot;
let dustParticles = [];
let lastFootstepTime = 0;

export function toggleCameraMode() {
    cameraMode = cameraMode === 'behind' ? 'overhead' : 'behind';
    return cameraMode === 'overhead' ? 'Overhead View' : 'Behind View';
}

// Build an arm: a pivot group at the shoulder, with a cylindrical arm hanging
// below it and a spherical hand at the end. Rotating the pivot rotates the
// whole arm + hand around the shoulder joint.
function buildLimb(shoulderPos, length, limbRadius, handRadius, limbMat, handMat) {
    const pivot = new THREE.Group();
    pivot.position.copy(shoulderPos);

    const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(limbRadius * 0.85, limbRadius, length, 10),
        limbMat
    );
    limb.position.y = -length / 2;
    limb.castShadow = true;
    pivot.add(limb);

    const hand = new THREE.Mesh(
        new THREE.SphereGeometry(handRadius, 10, 8),
        handMat
    );
    hand.position.y = -length;
    hand.castShadow = true;
    pivot.add(hand);

    return pivot;
}

export function initPlayer(scene) {
    player = new THREE.Group();
    player.userData.isPlayer = true;
    player.position.set(-10, 0, -5);
    scene.add(player);

    // Materials
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x2c8c4d, roughness: 0.7 }); // Link green
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0xd9b870, roughness: 0.75 }); // tan
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd5a8, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xc88a2c, roughness: 0.7 }); // dirty blond

    const legY = CONSTANTS.PLAYER_LEG_HEIGHT;
    const bodyY = legY + CONSTANTS.PLAYER_BODY_HEIGHT;
    const headRadius = CONSTANTS.PLAYER_HEAD_HEIGHT * 0.65;

    // --- Head: sphere ---
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius, 16, 14),
        skinMat
    );
    head.position.y = bodyY + headRadius * 0.95;
    head.castShadow = true;
    player.add(head);

    // Hair cap (top of head)
    const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius * 1.02, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
        hairMat
    );
    hairCap.position.copy(head.position);
    hairCap.position.y += 0.01;
    player.add(hairCap);

    // Face (painted plane stuck to the front of the sphere)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128; faceCanvas.height = 128;
    const fCtx = faceCanvas.getContext('2d');
    fCtx.clearRect(0, 0, 128, 128);
    fCtx.fillStyle = '#222';
    fCtx.beginPath();
    fCtx.arc(48, 60, 6, 0, Math.PI * 2);
    fCtx.arc(80, 60, 6, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#fff';
    fCtx.beginPath();
    fCtx.arc(50, 57, 2.5, 0, Math.PI * 2);
    fCtx.arc(82, 57, 2.5, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.strokeStyle = '#222';
    fCtx.lineWidth = 2;
    fCtx.beginPath();
    fCtx.arc(64, 88, 9, 0.15, Math.PI - 0.15);
    fCtx.stroke();
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    const facePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(headRadius * 1.4, headRadius * 1.4),
        new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true })
    );
    facePlane.position.set(0, head.position.y, headRadius * 0.92);
    player.add(facePlane);

    // --- Body: rounded cylinder torso ---
    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, CONSTANTS.PLAYER_BODY_HEIGHT, 12),
        tunicMat
    );
    torso.position.y = legY + CONSTANTS.PLAYER_BODY_HEIGHT / 2;
    torso.castShadow = true;
    player.add(torso);

    // Belt
    const belt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.33, 0.33, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.8 })
    );
    belt.position.y = legY + 0.04;
    player.add(belt);

    // --- Arms: pivot at shoulder, hand at end ---
    const armLen = CONSTANTS.PLAYER_ARM_LENGTH * 0.85;
    const shoulderY = legY + CONSTANTS.PLAYER_BODY_HEIGHT * 0.92;
    leftArmPivot = buildLimb(
        new THREE.Vector3(-0.32, shoulderY, 0),
        armLen, 0.07, 0.085, tunicMat, skinMat
    );
    player.add(leftArmPivot);
    rightArmPivot = buildLimb(
        new THREE.Vector3(0.32, shoulderY, 0),
        armLen, 0.07, 0.085, tunicMat, skinMat
    );
    player.add(rightArmPivot);

    // --- Legs: pivot at hip, boot at end ---
    const legLen = CONSTANTS.PLAYER_LEG_HEIGHT;
    const hipY = legY;
    leftLegPivot = buildLimb(
        new THREE.Vector3(-0.13, hipY, 0),
        legLen, 0.085, 0.11, pantsMat, bootMat
    );
    player.add(leftLegPivot);
    rightLegPivot = buildLimb(
        new THREE.Vector3(0.13, hipY, 0),
        legLen, 0.085, 0.11, pantsMat, bootMat
    );
    player.add(rightLegPivot);

    // Initial camera position
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);
    const initialCamPos = cameraBehindOffset.clone().applyQuaternion(player.quaternion).add(playerWorldPos);
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
    const moveDirection = new THREE.Vector3(0, 0, 0);
    const playerIsMoving = moveX !== 0 || moveZ !== 0;

    const isRunning = keysPressed['shift'];
    const currentSpeed = isRunning ? CONSTANTS.PLAYER_SPEED * 1.5 : CONSTANTS.PLAYER_SPEED;

    if (playerIsMoving) {
        const animationSpeed = isRunning ? 1.5 : 1.0;
        walkCycleTime += delta * animationSpeed;
        if (walkCycleTime > CONSTANTS.PLAYER_WALK_CYCLE_DURATION) {
            walkCycleTime -= CONSTANTS.PLAYER_WALK_CYCLE_DURATION;
        }
        const swingPhase = (walkCycleTime / CONSTANTS.PLAYER_WALK_CYCLE_DURATION) * Math.PI * 2;
        const armSwing = Math.sin(swingPhase) * CONSTANTS.PLAYER_MAX_ARM_SWING;
        const legSwing = Math.sin(swingPhase) * CONSTANTS.PLAYER_MAX_LIMB_SWING;
        // With pivots at the shoulder/hip, default rotation 0 = limb hanging
        // straight down. Positive rotation.x swings the limb forward.
        leftArmPivot.rotation.x = -armSwing;
        rightArmPivot.rotation.x = armSwing;
        leftLegPivot.rotation.x = legSwing;
        rightLegPivot.rotation.x = -legSwing;

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

        const nextPosZ = player.position.clone().add(new THREE.Vector3(0, 0, playerVelocity.z));
        if (!checkCollisionCallback(new THREE.Vector3(player.position.x, player.position.y, nextPosZ.z))) {
            player.position.z = nextPosZ.z;
        } else {
            playerVelocity.z = 0;
        }

        if (moveDirection.lengthSq() > 0.001) {
            const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
            targetQuaternion.setFromAxisAngle(upVector, targetAngle);
            player.quaternion.slerp(targetQuaternion, 0.2);
        }

        const currentTime = Date.now();
        if (currentTime - lastFootstepTime > 200) {
            const dustParticle = createDustParticle(player.position);
            player.parent.add(dustParticle);
            dustParticles.push(dustParticle);
            lastFootstepTime = currentTime;
        }
    } else {
        walkCycleTime = 0;
        leftArmPivot.rotation.x = 0;
        rightArmPivot.rotation.x = 0;
        leftLegPivot.rotation.x = 0;
        rightLegPivot.rotation.x = 0;
    }

    // Camera follow
    const playerWorldPos = new THREE.Vector3();
    player.getWorldPosition(playerWorldPos);
    const currentCameraOffset = cameraMode === 'overhead' ? cameraOverheadOffset : cameraBehindOffset;
    const cameraTargetPos = currentCameraOffset.clone().applyQuaternion(player.quaternion).add(playerWorldPos);
    const cameraTargetLookAt = playerWorldPos.clone().add(cameraIdealLookAt);

    const dialogueOpen = document.getElementById('dialogueBox')?.classList.contains('hidden') === false;
    const riverOpen = document.getElementById('realityRiver')?.classList.contains('hidden') === false;
    if (!isUserInteracting || (!dialogueOpen && !riverOpen)) {
        camera.position.lerp(cameraTargetPos, cameraPositionSmoothFactor);
        controls.target.lerp(cameraTargetLookAt, cameraTargetSmoothFactor);
    } else {
        controls.target.copy(cameraTargetLookAt);
    }
    controls.update(delta);

    // Dust particles
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

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

export function initPlayer(scene) {
    player = new THREE.Group();
    player.position.set(-5, 0, 0); // Initial position
    scene.add(player);

    const playerBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0099ff, roughness: 0.6, metalness: 0.2 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(CONSTANTS.PLAYER_HEAD_HEIGHT / 2, 16, 12), playerBodyMaterial);
    head.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT + CONSTANTS.PLAYER_HEAD_HEIGHT / 2;
    head.castShadow = true;
    player.add(head);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, CONSTANTS.PLAYER_BODY_HEIGHT, 0.3), playerBodyMaterial);
    body.position.y = CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT / 2;
    body.castShadow = true;
    player.add(body);

    const playerLimbMaterial = new THREE.MeshStandardMaterial({ color: 0x0077cc, roughness: 0.7 });
    playerLeftArm = new THREE.Mesh(new THREE.CylinderGeometry(CONSTANTS.PLAYER_LIMB_RADIUS, CONSTANTS.PLAYER_LIMB_RADIUS, CONSTANTS.PLAYER_ARM_LENGTH), playerLimbMaterial);
    playerLeftArm.position.set(-0.35, CONSTANTS.PLAYER_LEG_HEIGHT + CONSTANTS.PLAYER_BODY_HEIGHT * 0.95, 0);
    playerLeftArm.geometry.translate(0, CONSTANTS.PLAYER_ARM_LENGTH / 2, 0);
    playerLeftArm.rotation.x = Math.PI;
    playerLeftArm.castShadow = true;
    player.add(playerLeftArm);

    playerRightArm = playerLeftArm.clone();
    playerRightArm.position.x = 0.35;
    player.add(playerRightArm);

    playerLeftLeg = new THREE.Mesh(new THREE.CylinderGeometry(CONSTANTS.PLAYER_LIMB_RADIUS * 1.2, CONSTANTS.PLAYER_LIMB_RADIUS * 1.1, CONSTANTS.PLAYER_LEG_HEIGHT), playerLimbMaterial);
    playerLeftLeg.position.set(-0.15, CONSTANTS.PLAYER_LEG_HEIGHT / 2, 0);
    playerLeftLeg.castShadow = true;
    player.add(playerLeftLeg);

    playerRightLeg = playerLeftLeg.clone();
    playerRightLeg.position.x = 0.15;
    player.add(playerRightLeg);

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

    if (playerIsMoving) {
        walkCycleTime += delta;
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
        playerVelocity.copy(moveDirection).multiplyScalar(CONSTANTS.PLAYER_SPEED * delta);

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
            targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), moveDirection);
            player.quaternion.slerp(targetQuaternion, 0.2);
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
}
// js/npcManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { createTextSprite } from './utils.js';
import { interactiveObjects, originalMaterials } from './worldManager.js';

let professorHepaticusNPC, ornithineUsherNPC, aslanNPC, donkeyNPC, argusNPC;
let otisOTC_NPC, casperCPS1_NPC; // New enzyme characters

// Structure to hold NPC state for animation
const npcAnims = {};

const professorSwaySpeed = 0.5;
const professorArmSwingSpeed = 1.2;
const generalNpcPaceLerpFactor = 0.015;

export function initNPCs(scene) {
    professorHepaticusNPC = createProfessorHepaticus(scene, new THREE.Vector3(-3, 0, -8));
    ornithineUsherNPC = createOrnithineUsher(scene, new THREE.Vector3(-2, 0, -2));
    aslanNPC = createAslan(scene, new THREE.Vector3(10, 0, 0));
    donkeyNPC = createDonkey(scene, new THREE.Vector3(5, 0, 5));
    argusNPC = createArgus(scene, new THREE.Vector3(5, 0, -5));

    // Create new enzyme characters (they will be placed by worldManager, but initialized here)
    // Positions are placeholders, actual placement in worldManager using their original station spots.
    const mitoStationXOffset = CONSTANTS.ALCOVE_OPENING_X_PLANE + 2.5;
    otisOTC_NPC = createOtisOTC(scene, new THREE.Vector3(Math.max(mitoStationXOffset, -10), 0, -5));
    casperCPS1_NPC = createCasperCPS1(scene, new THREE.Vector3(Math.max(mitoStationXOffset - 1, -7), 0, 7));


    npcAnims.professor = {
        group: professorHepaticusNPC,
        basePos: professorHepaticusNPC.position.clone(),
        targetPos: professorHepaticusNPC.position.clone(),
        paceTimer: 0,
        paceInterval: 2 + Math.random() * 2,
        paceRange: 2.5, 
        bounds: { minX: -6, maxX: -1, minZ: -9, maxZ: -6 } 
    };
    npcAnims.usher = {
        group: ornithineUsherNPC,
        basePos: ornithineUsherNPC.position.clone(),
        targetPos: ornithineUsherNPC.position.clone(),
        paceTimer: Math.random() * 4, 
        paceInterval: 4 + Math.random() * 3,
        paceRange: 1.5, 
        bounds: { minX: -3, maxX: -1, minZ: -3, maxZ: -1 } 
    };
     npcAnims.aslan = {
        group: aslanNPC,
        basePos: aslanNPC.position.clone(),
        targetPos: aslanNPC.position.clone(),
        paceTimer: Math.random() * 4,
        paceInterval: 5 + Math.random() * 3, 
        paceRange: 2.0,
        bounds: { minX: 9, maxX: 11, minZ: -1.5, maxZ: 1.5 }
    };
    npcAnims.donkey = {
        group: donkeyNPC,
        basePos: donkeyNPC.position.clone(),
        targetPos: donkeyNPC.position.clone(),
        paceTimer: Math.random() * 4,
        paceInterval: 3.5 + Math.random() * 3,
        paceRange: 2.0,
        bounds: { minX: 3.5, maxX: 6.5, minZ: 3.5, maxZ: 6.5 }
    };
    npcAnims.argus = {
        group: argusNPC,
        basePos: argusNPC.position.clone(),
        targetPos: argusNPC.position.clone(),
        paceTimer: Math.random() * 4,
        paceInterval: 4.5 + Math.random() * 3,
        paceRange: 1.8,
        bounds: { minX: 3.5, maxX: 6.5, minZ: -6.5, maxZ: -3.5 }
    };
    npcAnims.otis = { // Otis is stationary for now, simple animation
        group: otisOTC_NPC,
        basePos: otisOTC_NPC.position.clone(),
        targetPos: otisOTC_NPC.position.clone(), // Stays in place
        paceTimer: 0, paceInterval: 1000, paceRange: 0 // No pacing
    };
    npcAnims.casper = { // Casper can have a slight bob
        group: casperCPS1_NPC,
        basePos: casperCPS1_NPC.position.clone(),
        targetPos: casperCPS1_NPC.position.clone(), // Stays in place
        paceTimer: 0, paceInterval: 1000, paceRange: 0 // No pacing
    };
}

function createProfessorHepaticus(scene, position) {
    const professorGroup = new THREE.Group();
    professorGroup.position.copy(position);
    const robeMaterial = new THREE.MeshStandardMaterial({ color: 0x8888cc, roughness: 0.7 });
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.5, 24), robeMaterial);
    robe.position.y = 0.75; robe.name = "robe"; professorGroup.add(robe);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffe0b3, roughness: 0.4 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 18), headMaterial);
    head.position.y = 1.55; professorGroup.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 12), headMaterial);
    nose.position.set(0, 1.57, 0.18); nose.rotation.x = Math.PI / 2.2; professorGroup.add(nose);
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), eyeWhiteMaterial);
    leftEyeWhite.position.set(-0.055, 1.62, 0.13); professorGroup.add(leftEyeWhite);
    const rightEyeWhite = leftEyeWhite.clone(); rightEyeWhite.position.x = 0.055; professorGroup.add(rightEyeWhite);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x3366cc });
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), pupilMaterial);
    leftPupil.position.set(-0.055, 1.62, 0.16); professorGroup.add(leftPupil);
    const rightPupil = leftPupil.clone(); rightPupil.position.x = 0.055; professorGroup.add(rightPupil);
    const browMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), browMaterial);
    leftBrow.position.set(-0.055, 1.66, 0.13); leftBrow.rotation.z = Math.PI / 10; professorGroup.add(leftBrow);
    const rightBrow = leftBrow.clone(); rightBrow.position.x = 0.055; rightBrow.rotation.z = -Math.PI / 10; professorGroup.add(rightBrow);
    const beardMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 18), beardMaterial);
    beard.position.set(0, 1.36, 0.09); beard.rotation.x = Math.PI / 16; professorGroup.add(beard);
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, wireframe: true });
    const leftGlass = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 24), glassMaterial);
    leftGlass.position.set(-0.055, 1.62, 0.13); leftGlass.rotation.x = Math.PI / 2; professorGroup.add(leftGlass);
    const rightGlass = leftGlass.clone(); rightGlass.position.x = 0.055; professorGroup.add(rightGlass);
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x223366, roughness: 0.5 });
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 18), hatMaterial);
    hatBrim.position.set(0, 1.73, 0); professorGroup.add(hatBrim);
    const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 18), hatMaterial);
    hatTop.position.set(0, 1.73 + 0.015 + 0.32/2, 0); professorGroup.add(hatTop);
    const sleeveMaterial = robeMaterial.clone();
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 14), sleeveMaterial);
    leftSleeve.position.set(-0.23, 1.18, 0); leftSleeve.geometry.translate(0, -0.55/2, 0); leftSleeve.rotation.z = Math.PI / 4; professorGroup.add(leftSleeve);
    const rightSleeve = leftSleeve.clone(); rightSleeve.position.x = 0.23; rightSleeve.rotation.z = -Math.PI / 4; professorGroup.add(rightSleeve);
    const handMaterial = headMaterial.clone();
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), handMaterial);
    leftHand.position.set(-0.23 - Math.sin(Math.PI/4)*0.55, 1.18 - Math.cos(Math.PI/4)*0.55, 0); professorGroup.add(leftHand);
    const rightHand = leftHand.clone(); rightHand.position.x = 0.23 + Math.sin(Math.PI/4)*0.55; professorGroup.add(rightHand);

    const label = createTextSprite(CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS, { x: 0, y: 2.1, z: 0 }, { fontSize: 36, scale: 0.75 });
    professorGroup.add(label);
    professorGroup.userData = { type: 'npc', name: CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS, questId: 'ureaCycle', mainMesh: robe };
    professorGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(professorGroup);
    interactiveObjects.push(professorGroup);
    originalMaterials.set(robe, robe.material.clone());
    return professorGroup;
}

function createOrnithineUsher(scene, position) {
    const usherGroup = new THREE.Group();
    usherGroup.position.copy(position);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x3366cc, roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.18), torsoMaterial);
    torso.position.y = 1.0; torso.name = "body"; usherGroup.add(torso);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffe0b3, roughness: 0.4 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), headMaterial);
    head.position.y = 1.38; usherGroup.add(head);
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), eyeWhiteMaterial);
    leftEyeWhite.position.set(-0.06, 1.43, 0.13); usherGroup.add(leftEyeWhite);
    const rightEyeWhite = leftEyeWhite.clone(); rightEyeWhite.position.x = 0.06; usherGroup.add(rightEyeWhite);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), pupilMaterial);
    leftPupil.position.set(-0.06, 1.43, 0.17); usherGroup.add(leftPupil);
    const rightPupil = leftPupil.clone(); rightPupil.position.x = 0.06; usherGroup.add(rightPupil);
    const smileCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(-0.045, 1.37, 0.16), new THREE.Vector3(0, 1.35, 0.18), new THREE.Vector3(0.045, 1.37, 0.16) ]);
    const smileGeometry = new THREE.TubeGeometry(smileCurve, 20, 0.008, 8, false);
    const smileMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const smile = new THREE.Mesh(smileGeometry, smileMaterial); usherGroup.add(smile);
    const armMaterial = torsoMaterial.clone();
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 10), armMaterial);
    leftArm.position.set(-0.21, 1.22, 0); leftArm.geometry.translate(0, -0.38/2, 0); leftArm.rotation.z = Math.PI / 5; usherGroup.add(leftArm);
    const rightArm = leftArm.clone(); rightArm.position.x = 0.21; rightArm.rotation.z = -Math.PI / 5; usherGroup.add(rightArm);
    const handMaterial = headMaterial.clone();
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), handMaterial);
    leftHand.position.set(-0.21 - Math.sin(Math.PI/5)*0.38, 1.22 - Math.cos(Math.PI/5)*0.38, 0); usherGroup.add(leftHand);
    const rightHand = leftHand.clone(); rightHand.position.x = 0.21 + Math.sin(Math.PI/5)*0.38; usherGroup.add(rightHand);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x223366, roughness: 0.6 });
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 10), legMaterial);
    leftLeg.position.set(-0.09, 0.75/2, 0); usherGroup.add(leftLeg);
    const rightLeg = leftLeg.clone(); rightLeg.position.x = 0.09; usherGroup.add(rightLeg);
    const bowtieMaterial = new THREE.MeshStandardMaterial({ color: 0xff3366 });
    const leftBow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.01), bowtieMaterial);
    leftBow.position.set(-0.025, 1.27, 0.11); usherGroup.add(leftBow);
    const rightBow = leftBow.clone(); rightBow.position.x = 0.025; usherGroup.add(rightBow);
    const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), bowtieMaterial);
    bowKnot.position.set(0, 1.27, 0.11); usherGroup.add(bowKnot);

    const label = createTextSprite(CONSTANTS.NPC_NAMES.ORNITHINE_USHER, { x: 0, y: 1.7, z: 0 }, { fontSize: 36, scale: 0.75 });
    usherGroup.add(label);
    usherGroup.userData = { type: 'npc', name: CONSTANTS.NPC_NAMES.ORNITHINE_USHER, mainMesh: torso };
    usherGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(usherGroup);
    interactiveObjects.push(usherGroup);
    originalMaterials.set(torso, torso.material.clone());
    return usherGroup;
}

function createAslan(scene, position) {
    const aslanGroup = new THREE.Group();
    aslanGroup.position.copy(position);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.6 }); 
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 1.2), bodyMat);
    body.position.y = 0.6; body.name = "body"; aslanGroup.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bodyMat);
    head.position.set(0, 1.25, 0.4); aslanGroup.add(head);
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }); 
    const manePart1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), maneMat);
    manePart1.position.set(0, 1.25, 0.3); manePart1.scale.set(1, 1.2, 0.8); aslanGroup.add(manePart1);
    const manePart2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.6, 8), maneMat);
    manePart2.position.set(0, 1.2, 0.2); aslanGroup.add(manePart2);
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const legPositions = [ {x: 0.25, z: 0.4}, {x: -0.25, z: 0.4}, {x: 0.25, z: -0.4}, {x: -0.25, z: -0.4} ];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(pos.x, 0.3, pos.z); aslanGroup.add(leg);
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    leftEye.position.set(-0.15, 1.35, 0.68); aslanGroup.add(leftEye);
    const rightEye = leftEye.clone(); rightEye.position.x = 0.15; aslanGroup.add(rightEye);
    const knifeMat = new THREE.MeshStandardMaterial({ color: 0xB0E0E6, emissive: 0x87CEEB, metalness: 0.5, roughness: 0.2 });
    const knifeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 4), knifeMat); 
    knifeBlade.rotation.x = Math.PI / 2; knifeBlade.position.set(0.4, 0.8, 0);
    const knifeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), new THREE.MeshStandardMaterial({color: 0x505050}));
    knifeHandle.position.set(0.4, 0.8, -0.35); aslanGroup.add(knifeBlade); aslanGroup.add(knifeHandle);

    aslanGroup.userData = {
        type: 'npc', name: CONSTANTS.NPC_NAMES.ASLAN,
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN,
        requires: { 'Argininosuccinate': 1 }, produces: ['Arginine', 'Fumarate'],
        productColors: { 'Arginine': CONSTANTS.ARGININE_COLOR, 'Fumarate': CONSTANTS.FUMARATE_COLOR },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE, mainMesh: body
    };
    const label = createTextSprite(CONSTANTS.NPC_NAMES.ASLAN, { x: 0, y: 1.9, z: 0 }, { fontSize: 36, scale: 0.75 });
    aslanGroup.add(label);
    aslanGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(aslanGroup);
    interactiveObjects.push(aslanGroup);
    originalMaterials.set(body, bodyMat.clone());
    return aslanGroup;
}

function createDonkey(scene, position) {
    const donkeyGroup = new THREE.Group();
    donkeyGroup.position.copy(position);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.0), bodyMat);
    body.position.y = 0.5; body.name = "body"; donkeyGroup.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5), bodyMat);
    head.position.set(0, 0.9, 0.35); donkeyGroup.add(head);
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6);
    const legPositions = [ {x: 0.2, z: 0.35}, {x: -0.2, z: 0.35}, {x: 0.2, z: -0.35}, {x: -0.2, z: -0.35} ];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(pos.x, 0.25, pos.z); donkeyGroup.add(leg);
    });
    const earMat = new THREE.MeshStandardMaterial({ color: 0x606060 });
    const earGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.15, 1.3, 0.3); leftEar.rotation.z = -Math.PI / 6; donkeyGroup.add(leftEar);
    const rightEar = leftEar.clone(); rightEar.position.x = 0.15; rightEar.rotation.z = Math.PI / 6; donkeyGroup.add(rightEar);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    leftEye.position.set(-0.1, 0.95, 0.63); donkeyGroup.add(leftEye);
    const rightEye = leftEye.clone(); rightEye.position.x = 0.1; donkeyGroup.add(rightEye);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.2), bodyMat);
    snout.position.set(0, 0.8, 0.65); donkeyGroup.add(snout);

    donkeyGroup.userData = {
        type: 'npc', name: CONSTANTS.NPC_NAMES.DONKEY,
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY,
        requires: { 'Citrulline': 1, 'Aspartate': 1, 'ATP': 1 }, produces: 'Argininosuccinate',
        productColors: { 'Argininosuccinate': CONSTANTS.ARG_SUCC_COLOR },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN, mainMesh: body
    };
    const label = createTextSprite(CONSTANTS.NPC_NAMES.DONKEY, { x: 0, y: 1.6, z: 0 }, { fontSize: 36, scale: 0.75 });
    donkeyGroup.add(label);
    donkeyGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(donkeyGroup);
    interactiveObjects.push(donkeyGroup);
    originalMaterials.set(body, bodyMat.clone());
    return donkeyGroup;
}

function createArgus(scene, position) {
    const argusGroup = new THREE.Group();
    argusGroup.position.copy(position);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x4A3B31, roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), torsoMat);
    torso.position.y = 0.7 + 0.4; torso.name = "body"; argusGroup.add(torso);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.4 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), headMat);
    head.position.y = torso.position.y + 0.4 + 0.125; argusGroup.add(head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const mainEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    mainEye.position.set(0, head.position.y + 0.05, 0.22); argusGroup.add(mainEye);
    const leftSideEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    leftSideEye.position.set(-0.15, head.position.y, 0.18); argusGroup.add(leftSideEye);
    const rightSideEye = leftSideEye.clone(); rightSideEye.position.x = 0.15; argusGroup.add(rightSideEye);
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const leftLeg = new THREE.Mesh(legGeo, torsoMat);
    leftLeg.position.set(-0.15, 0.35, 0); argusGroup.add(leftLeg);
    const rightLeg = leftLeg.clone(); rightLeg.position.x = 0.15; argusGroup.add(rightLeg);
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8);
    const leftArm = new THREE.Mesh(armGeo, headMat); 
    leftArm.position.set(-0.3, torso.position.y + 0.2, 0); leftArm.rotation.z = Math.PI / 5; argusGroup.add(leftArm);
    const rightArm = leftArm.clone(); rightArm.position.x = 0.3; rightArm.rotation.z = -Math.PI / 5; argusGroup.add(rightArm);
    const cleaverBladeMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, metalness: 0.8, roughness: 0.3 });
    const cleaverBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), cleaverBladeMat);
    cleaverBlade.position.set(0, torso.position.y - 0.1, 0.3); cleaverBlade.rotation.y = Math.PI / 4; argusGroup.add(cleaverBlade);
    const cleaverHandleMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 });
    const cleaverHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6), cleaverHandleMat);
    cleaverHandle.position.set(0, torso.position.y - 0.3, 0.2); argusGroup.add(cleaverHandle);

    argusGroup.userData = {
        type: 'npc', name: CONSTANTS.NPC_NAMES.ARGUS,
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS,
        requires: { 'Arginine': 1 }, produces: ['Urea', 'Ornithine'],
        productColors: { 'Urea': CONSTANTS.UREA_COLOR, 'Ornithine': CONSTANTS.ORNITHINE_COLOR },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA, mainMesh: torso
    };
    const label = createTextSprite(CONSTANTS.NPC_NAMES.ARGUS, { x: 0, y: head.position.y + 0.5, z: 0 }, { fontSize: 36, scale: 0.75 });
    argusGroup.add(label);
    argusGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(argusGroup);
    interactiveObjects.push(argusGroup);
    originalMaterials.set(torso, torsoMat.clone());
    return argusGroup;
}

function createOtisOTC(scene, position) {
    const otisGroup = new THREE.Group();
    otisGroup.position.copy(position); // Set by worldManager

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.6 }); // OTC color
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.6, 4, 12), bodyMat);
    body.position.y = 0.4 + 0.6/2; // Capsule height is radius + length
    body.name = "otis_body";
    otisGroup.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffaa55, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), headMat);
    head.position.y = body.position.y + 0.6/2 + 0.3; // Top of capsule + head radius
    otisGroup.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    leftEye.position.set(-0.1, head.position.y + 0.05, 0.28);
    otisGroup.add(leftEye);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.1;
    otisGroup.add(rightEye);
    
    // Simple cylindrical arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.4, body.position.y + 0.1, 0);
    leftArm.rotation.z = Math.PI / 3;
    otisGroup.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.4;
    rightArm.rotation.z = -Math.PI / 3;
    otisGroup.add(rightArm);

    const label = createTextSprite(CONSTANTS.NPC_NAMES.OTIS_OTC, { x: 0, y: head.position.y + 0.4, z: 0 }, { fontSize: 36, scale: 0.6 });
    otisGroup.add(label);
    otisGroup.userData = {
        type: 'npc', // Treat as NPC for interaction logic
        name: CONSTANTS.NPC_NAMES.OTIS_OTC,
        mainMesh: body,
        requires: { 'Carbamoyl Phosphate': 1, 'Ornithine': 1 },
        produces: 'Citrulline',
        productColors: { 'Citrulline': CONSTANTS.CITRULLINE_COLOR },
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE,
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE
    };
    otisGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(otisGroup);
    interactiveObjects.push(otisGroup);
    originalMaterials.set(body, bodyMat.clone());
    return otisGroup;
}

function createCasperCPS1(scene, position) {
    const casperGroup = new THREE.Group();
    casperGroup.position.copy(position); // Set by worldManager

    const ghostMat = new THREE.MeshStandardMaterial({
        color: 0xe0ffff, // Light cyan/white
        transparent: true,
        opacity: 0.75,
        roughness: 0.3
    });

    // Ghostly body shape
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, -0.6); // Bottom center
    bodyShape.bezierCurveTo(0.5, -0.5, 0.4, 0, 0.4, 0.2); // Right lower curve
    bodyShape.bezierCurveTo(0.4, 0.6, 0.2, 0.8, 0, 0.9);   // Right upper curve to top
    bodyShape.bezierCurveTo(-0.2, 0.8, -0.4, 0.6, -0.4, 0.2); // Left upper curve
    bodyShape.bezierCurveTo(-0.4, 0, -0.5, -0.5, 0, -0.6); // Left lower curve to bottom
    const extrudeSettings = { depth: 0.3, bevelEnabled: false };
    let bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    bodyGeo.center(); // Center it for easier positioning
    // To make it more 3D and rounded, we could use a LatheGeometry or combine spheres/cylinders.
    // For simplicity with ExtrudeGeometry, we can rotate it.
    bodyGeo.rotateX(Math.PI /2); // Make it stand up if extruded along Z
    bodyGeo.scale(1, 1.3, 1); // Make it taller
    
    const body = new THREE.Mesh(bodyGeo, ghostMat);
    body.position.y = 0.65; // Adjust so bottom is near y=0
    body.name = "casper_body";
    casperGroup.add(body);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111122 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    leftEye.position.set(-0.15, body.position.y + 0.3, 0.15); // Relative to body front
    casperGroup.add(leftEye);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.15;
    casperGroup.add(rightEye);
    
    // Small "wisp" arms
    const armGeo = new THREE.ConeGeometry(0.05, 0.3, 6);
    const leftArm = new THREE.Mesh(armGeo, ghostMat);
    leftArm.position.set(-0.3, body.position.y -0.1, 0.1);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.rotation.x = -Math.PI / 6;
    casperGroup.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.3;
    rightArm.rotation.z = -Math.PI / 4;
    casperGroup.add(rightArm);


    const label = createTextSprite(CONSTANTS.NPC_NAMES.CASPER_CPS1, { x: 0, y: body.position.y + 0.8, z: 0 }, { fontSize: 36, scale: 0.6 });
    casperGroup.add(label);
    casperGroup.userData = {
        type: 'npc', // Treat as NPC for interaction logic
        name: CONSTANTS.NPC_NAMES.CASPER_CPS1,
        mainMesh: body,
        requires: { 'Bicarbonate': 1, 'NH3': 1, 'ATP': 2 },
        produces: 'Carbamoyl Phosphate',
        productColors: { 'Carbamoyl Phosphate': CONSTANTS.CARB_PHOS_COLOR },
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS,
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS
    };
    casperGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(casperGroup);
    interactiveObjects.push(casperGroup);
    originalMaterials.set(body, ghostMat.clone());
    return casperGroup;
}


export function updateNPCs(delta, elapsedTime) {
    for (const npcKey in npcAnims) {
        const npc = npcAnims[npcKey];
        if (!npc.group) continue;

        // Pacing for NPCs that have it enabled (paceRange > 0)
        if (npc.paceRange > 0) {
            npc.paceTimer += delta;
            if (npc.paceTimer > npc.paceInterval) {
                let newTargetX = npc.basePos.x + (Math.random() - 0.5) * npc.paceRange;
                let newTargetZ = npc.basePos.z + (Math.random() - 0.5) * npc.paceRange;

                newTargetX = Math.max(npc.bounds.minX, Math.min(npc.bounds.maxX, newTargetX));
                newTargetZ = Math.max(npc.bounds.minZ, Math.min(npc.bounds.maxZ, newTargetZ));
                
                if (npcKey === 'professor') {
                     if (newTargetX < CONSTANTS.ALCOVE_OPENING_X_PLANE + 1 && newTargetZ > CONSTANTS.ALCOVE_Z_START -1 && newTargetZ < CONSTANTS.ALCOVE_Z_END + 1) {
                        newTargetX = Math.max(newTargetX, CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5); 
                    }
                }
                npc.targetPos.set(newTargetX, npc.basePos.y, newTargetZ);
                npc.paceTimer = 0;
                npc.paceInterval = (3 + Math.random() * 3) * (npcKey === 'professor' ? 0.7 : 1); 
            }
            npc.group.position.lerp(npc.targetPos, generalNpcPaceLerpFactor * (npcKey === 'professor' ? 1.5 : 1));
        }

        // Character-specific idle animations
        if (npcKey === 'professor') {
            npc.group.rotation.y = Math.sin(elapsedTime * professorSwaySpeed * 0.5) * 0.1;
            const profRobe = npc.group.children.find(c => c.name === "robe");
            if (profRobe) profRobe.rotation.y = Math.sin(elapsedTime * professorSwaySpeed) * 0.05;
            const leftSleeve = npc.group.children.find(c => c.geometry && c.position.x < -0.1 && c.geometry instanceof THREE.CylinderGeometry);
            const rightSleeve = npc.group.children.find(c => c.geometry && c.position.x > 0.1 && c.geometry instanceof THREE.CylinderGeometry);
            if(leftSleeve) leftSleeve.rotation.z = Math.PI / 4 + Math.sin(elapsedTime * professorArmSwingSpeed) * 0.2;
            if(rightSleeve) rightSleeve.rotation.z = -Math.PI / 4 - Math.sin(elapsedTime * professorArmSwingSpeed) * 0.2;
        } else if (npcKey === 'usher') {
            npc.group.position.y = npc.basePos.y + Math.sin(elapsedTime * 1.0) * 0.1; 
            npc.group.rotation.y = Math.sin(elapsedTime * 0.7) * 0.15;
        } else if (npcKey === 'donkey') {
            npc.group.rotation.y = npc.basePos.y + Math.sin(elapsedTime * 0.3) * 0.1; // Slight sway, not position.y
            const leftEar = npc.group.children.find(c => c.geometry instanceof THREE.ConeGeometry && c.position.x < 0);
            if (leftEar) leftEar.rotation.x = Math.sin(elapsedTime * 2.0 + 1) * 0.2; 
        } else if (npcKey === 'aslan') {
            const bodyMesh = npc.group.userData.mainMesh; 
            if (bodyMesh) bodyMesh.scale.y = 1 + Math.sin(elapsedTime * 0.8) * 0.015;
             npc.group.rotation.y = Math.sin(elapsedTime * 0.1) * 0.03; 
        } else if (npcKey === 'argus') {
            const torsoMesh = npc.group.userData.mainMesh;
            if (torsoMesh) torsoMesh.scale.y = 1 + Math.sin(elapsedTime * 1.2) * 0.02; 
        } else if (npcKey === 'otis') {
            // Otis simple animation: slight arm wave or head nod
            const head = npc.group.children.find(c => c.geometry instanceof THREE.SphereGeometry && c.material.color.getHexString() === 'ffaa55'); // Simple check
            if(head) head.rotation.z = Math.sin(elapsedTime * 0.8) * 0.05;
        } else if (npcKey === 'casper') {
            // Casper bobbing animation
            npc.group.position.y = npc.basePos.y + Math.sin(elapsedTime * 1.1) * 0.08;
            npc.group.rotation.y = Math.sin(elapsedTime * 0.4) * 0.05; // Slow spin
        }
    }
}
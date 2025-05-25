// js/npcManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { createTextSprite } from './utils.js';
import { interactiveObjects, originalMaterials } from './worldManager.js'; // For adding NPCs

let professorHepaticusNPC, ornithineUsherNPC, aslanNPC, donkeyNPC, argusNPC;
let professorBasePos, professorTargetPos, professorPaceTimer = 0, professorPaceInterval = 0;
const professorSwaySpeed = 0.5;
const professorArmSwingSpeed = 1.2;
const usherFloatSpeed = 1.0;
const usherFloatAmount = 0.1;


export function initNPCs(scene) {
    professorHepaticusNPC = createProfessorHepaticus(scene, new THREE.Vector3(-3, 0, -8));
    ornithineUsherNPC = createOrnithineUsher(scene, new THREE.Vector3(-2, 0, -2));
    
    // New NPCs replacing stations
    aslanNPC = createAslan(scene, new THREE.Vector3(10, 0, 0)); // Former ASL station position
    donkeyNPC = createDonkey(scene, new THREE.Vector3(5, 0, 5)); // Former ASS station position
    argusNPC = createArgus(scene, new THREE.Vector3(5, 0, -5));   // Former ARG1 station position

    if (professorHepaticusNPC) {
        professorBasePos = professorHepaticusNPC.position.clone();
        professorTargetPos = professorBasePos.clone();
        professorPaceInterval = 2 + Math.random() * 2;
    }
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
    professorGroup.userData = { type: 'npc', name: CONSTANTS.NPC_NAMES.PROFESSOR_HEPATICUS, questId: 'ureaCycle' };
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
    usherGroup.userData = { type: 'npc', name: CONSTANTS.NPC_NAMES.ORNITHINE_USHER };
    usherGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(usherGroup);
    interactiveObjects.push(usherGroup);
    originalMaterials.set(torso, torso.material.clone());
    return usherGroup;
}

function createAslan(scene, position) {
    const aslanGroup = new THREE.Group();
    aslanGroup.position.copy(position);
    aslanGroup.userData = {
        type: 'npc',
        name: CONSTANTS.NPC_NAMES.ASLAN,
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN,
        requires: { 'Argininosuccinate': 1 },
        produces: ['Arginine', 'Fumarate'],
        productColors: { 'Arginine': CONSTANTS.ARGININE_COLOR, 'Fumarate': CONSTANTS.FUMARATE_COLOR },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_11_FURNACE_FUMARATE
    };

    // Body (Lion-like color, more blocky/stylized)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.6 }); // Tan
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 1.2), bodyMat);
    body.position.y = 0.6; // Lifted by leg height
    aslanGroup.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bodyMat);
    head.position.set(0, 1.25, 0.4); // On front of body
    aslanGroup.add(head);

    // Mane (darker brown, several overlapping parts)
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }); // Dark brown
    const manePart1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), maneMat);
    manePart1.position.set(0, 1.25, 0.3);
    manePart1.scale.set(1, 1.2, 0.8);
    aslanGroup.add(manePart1);
    const manePart2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.6, 8), maneMat);
    manePart2.position.set(0, 1.2, 0.2);
    aslanGroup.add(manePart2);


    // Legs (4)
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const legPositions = [ {x: 0.25, z: 0.4}, {x: -0.25, z: 0.4}, {x: 0.25, z: -0.4}, {x: -0.25, z: -0.4} ];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(pos.x, 0.3, pos.z);
        aslanGroup.add(leg);
    });

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    leftEye.position.set(-0.15, 1.35, 0.68); aslanGroup.add(leftEye);
    const rightEye = leftEye.clone(); rightEye.position.x = 0.15; aslanGroup.add(rightEye);

    // "Crystal" Knife (a simple elongated, shiny pyramid)
    const knifeMat = new THREE.MeshStandardMaterial({ color: 0xB0E0E6, emissive: 0x87CEEB, metalness: 0.5, roughness: 0.2 }); // Powdery blue, shiny
    const knifeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.6, 4), knifeMat); // Pyramid shape
    knifeBlade.rotation.x = Math.PI / 2;
    knifeBlade.position.set(0.4, 0.8, 0); // Held in a conceptual "paw"
    const knifeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), new THREE.MeshStandardMaterial({color: 0x505050}));
    knifeHandle.position.set(0.4, 0.8, -0.35); // Behind the blade
    aslanGroup.add(knifeBlade);
    aslanGroup.add(knifeHandle);


    const label = createTextSprite(CONSTANTS.NPC_NAMES.ASLAN, { x: 0, y: 1.9, z: 0 }, { fontSize: 36, scale: 0.75 });
    aslanGroup.add(label);
    aslanGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(aslanGroup);
    interactiveObjects.push(aslanGroup);
    originalMaterials.set(body, bodyMat.clone()); // For highlighting
    return aslanGroup;
}

function createDonkey(scene, position) {
    const donkeyGroup = new THREE.Group();
    donkeyGroup.position.copy(position);
    donkeyGroup.userData = {
        type: 'npc',
        name: CONSTANTS.NPC_NAMES.DONKEY,
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_9_TALK_TO_DONKEY,
        requires: { 'Citrulline': 1, 'Aspartate': 1, 'ATP': 1 },
        produces: 'Argininosuccinate',
        productColors: { 'Argininosuccinate': CONSTANTS.ARG_SUCC_COLOR },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_10_TALK_TO_ASLAN
    };

    // Body (grey)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.0), bodyMat);
    body.position.y = 0.5; // Lifted by leg height
    donkeyGroup.add(body);

    // Head (slightly smaller box)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5), bodyMat);
    head.position.set(0, 0.9, 0.35); // On front/top of body
    donkeyGroup.add(head);

    // Legs (4, thinner)
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6);
    const legPositions = [ {x: 0.2, z: 0.35}, {x: -0.2, z: 0.35}, {x: 0.2, z: -0.35}, {x: -0.2, z: -0.35} ];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(pos.x, 0.25, pos.z);
        donkeyGroup.add(leg);
    });

    // Ears (long, pointy)
    const earMat = new THREE.MeshStandardMaterial({ color: 0x606060 });
    const earGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.15, 1.3, 0.3);
    leftEar.rotation.z = -Math.PI / 6;
    donkeyGroup.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.15;
    rightEar.rotation.z = Math.PI / 6;
    donkeyGroup.add(rightEar);
    
    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    leftEye.position.set(-0.1, 0.95, 0.63); donkeyGroup.add(leftEye);
    const rightEye = leftEye.clone(); rightEye.position.x = 0.1; donkeyGroup.add(rightEye);

    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.2), bodyMat);
    snout.position.set(0, 0.8, 0.65);
    donkeyGroup.add(snout);

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
    argusGroup.userData = {
        type: 'npc',
        name: CONSTANTS.NPC_NAMES.ARGUS,
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_12_TALK_TO_ARGUS,
        requires: { 'Arginine': 1 },
        produces: ['Urea', 'Ornithine'],
        productColors: { 'Urea': CONSTANTS.UREA_COLOR, 'Ornithine': CONSTANTS.ORNITHINE_COLOR },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_13_DISPOSE_UREA
    };

    // Torso (humanoid but sturdy)
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x4A3B31, roughness: 0.5 }); // Dark leather brown
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), torsoMat);
    torso.position.y = 0.7 + 0.4; // Leg height + half torso height
    argusGroup.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.4 }); // Tan skin
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), headMat);
    head.position.y = torso.position.y + 0.4 + 0.125; // Top of torso + half head height
    argusGroup.add(head);

    // Multiple Eyes (stylized) - one main, two smaller on sides
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const mainEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    mainEye.position.set(0, head.position.y + 0.05, 0.22); argusGroup.add(mainEye);
    const leftSideEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    leftSideEye.position.set(-0.15, head.position.y, 0.18); argusGroup.add(leftSideEye);
    const rightSideEye = leftSideEye.clone();
    rightSideEye.position.x = 0.15; argusGroup.add(rightSideEye);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const leftLeg = new THREE.Mesh(legGeo, torsoMat);
    leftLeg.position.set(-0.15, 0.35, 0); argusGroup.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.15; argusGroup.add(rightLeg);

    // Arms (two main, holding cleaver)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8);
    const leftArm = new THREE.Mesh(armGeo, headMat); // Skin color for arms
    leftArm.position.set(-0.3, torso.position.y + 0.2, 0);
    leftArm.rotation.z = Math.PI / 5; argusGroup.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.3; rightArm.rotation.z = -Math.PI / 5; argusGroup.add(rightArm);

    // Cleaver (Simple: box for blade, cylinder for handle)
    const cleaverBladeMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, metalness: 0.8, roughness: 0.3 });
    const cleaverBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), cleaverBladeMat);
    cleaverBlade.position.set(0, torso.position.y - 0.1, 0.3); // Held in front
    cleaverBlade.rotation.y = Math.PI / 4;
    argusGroup.add(cleaverBlade);
    const cleaverHandleMat = new THREE.MeshStandardMaterial({ color: 0x5D4037 }); // Wood color
    const cleaverHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6), cleaverHandleMat);
    cleaverHandle.position.set(0, torso.position.y - 0.3, 0.2); // Below blade center
    argusGroup.add(cleaverHandle);


    const label = createTextSprite(CONSTANTS.NPC_NAMES.ARGUS, { x: 0, y: head.position.y + 0.5, z: 0 }, { fontSize: 36, scale: 0.75 });
    argusGroup.add(label);
    argusGroup.traverse(child => { if (child.isMesh) child.castShadow = true; });
    scene.add(argusGroup);
    interactiveObjects.push(argusGroup);
    originalMaterials.set(torso, torsoMat.clone());
    return argusGroup;
}


export function updateNPCs(delta, elapsedTime) {
    if (professorHepaticusNPC && professorBasePos) {
        professorPaceTimer += delta;
        if (professorPaceTimer > professorPaceInterval) {
            let newTargetX = professorBasePos.x + (Math.random()-0.5)*1.5;
            let newTargetZ = professorBasePos.z + (Math.random()-0.5)*1.5;
            if (newTargetX < CONSTANTS.ALCOVE_OPENING_X_PLANE + 1 && newTargetZ > CONSTANTS.ALCOVE_Z_START -1 && newTargetZ < CONSTANTS.ALCOVE_Z_END + 1) {
                newTargetX = Math.max(newTargetX, CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5);
            }
            professorTargetPos.set(newTargetX, professorBasePos.y, newTargetZ);
            professorPaceTimer = 0;
            professorPaceInterval = 2 + Math.random() * 2;
        }
        professorHepaticusNPC.position.lerp(professorTargetPos, 0.02);
        professorHepaticusNPC.rotation.y = Math.sin(elapsedTime * professorSwaySpeed * 0.5) * 0.1;
        const profRobe = professorHepaticusNPC.children.find(c => c.name === "robe");
        if (profRobe) profRobe.rotation.y = Math.sin(elapsedTime * professorSwaySpeed) * 0.05;

        const leftSleeve = professorHepaticusNPC.children.find(c => c.geometry && c.position.x < -0.1 && c.geometry instanceof THREE.CylinderGeometry);
        const rightSleeve = professorHepaticusNPC.children.find(c => c.geometry && c.position.x > 0.1 && c.geometry instanceof THREE.CylinderGeometry);
        if(leftSleeve) leftSleeve.rotation.z = Math.PI / 4 + Math.sin(elapsedTime * professorArmSwingSpeed) * 0.2;
        if(rightSleeve) rightSleeve.rotation.z = -Math.PI / 4 - Math.sin(elapsedTime * professorArmSwingSpeed) * 0.2;
    }
    if (ornithineUsherNPC) {
        ornithineUsherNPC.position.y = 0 + Math.sin(elapsedTime * usherFloatSpeed) * usherFloatAmount;
        ornithineUsherNPC.rotation.y = Math.sin(elapsedTime * usherFloatSpeed * 0.7) * 0.15;
    }
    // Add simple animations for new NPCs if desired
    if (donkeyNPC) {
        donkeyNPC.rotation.y = Math.sin(elapsedTime * 0.3) * 0.1; // Gentle sway
        // Ear twitch
        const leftEar = donkeyNPC.children.find(c => c.geometry instanceof THREE.ConeGeometry && c.position.x < 0);
        if (leftEar) leftEar.rotation.x = Math.sin(elapsedTime * 2.0 + 1) * 0.2;
    }
    if (aslanNPC) {
        aslanNPC.rotation.y = Math.sin(elapsedTime * 0.2) * 0.05; // Slow, regal turn
    }
    if (argusNPC) {
        // Slight breathing-like movement for torso
        const torso = argusNPC.children.find(c => c.geometry instanceof THREE.BoxGeometry && c.position.y > 0.5);
        if (torso) torso.scale.y = 1 + Math.sin(elapsedTime * 1.5) * 0.02;
    }
}


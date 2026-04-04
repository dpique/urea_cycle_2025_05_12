// js/worlds/tcaCycleWorld.js
// The Central Crossroads -- TCA Cycle (Krebs Cycle) hub world

import * as THREE from 'three';
import { createTextSprite, createSimpleParticleSystem } from '../utils.js';
import { createWall, createResource, interactiveObjects, originalMaterials, setWorldTerrainFn, addInteractiveObject, removeInteractiveObjectAt, setOriginalMaterial } from '../worldManager.js';
import { player } from '../playerManager.js';
import { showFeedback } from '../uiManager.js';
import { getGameState, setGameState, getCurrentQuest, setCurrentQuest, advanceCurrentQuestState, getInventory, addToInventory, removeFromInventory, getHealth, damageHealth, healHealth, setWorldProgress, addAbility, unlockWorld } from '../gameState.js';
import { handlePlayerDeath } from '../gameManager.js';
import { buildCharacter, PRESETS, updateCharacterIdle } from '../characterBuilder.js';
import { camera, renderer } from '../sceneSetup.js';
import { transitionTo } from '../sceneManager.js';
import { updateInteraction } from '../interactionManager.js';
import tcaData from '../../data/tca.json';

// --- World Config ---
export const config = {
    id: 'tca-cycle',
    name: 'TCA Central Crossroads',
    description: 'The Citric Acid Cycle -- the metabolic hub of the cell',
    skyColor: 0x1a0a2e,      // Deep twilight purple
    fogColor: 0x1a0a2e,
    fogNear: 60,
    fogFar: 250,
    ambientLightIntensity: 0.5,
    ambientLightColor: 0x8888cc,
    bounds: {
        minX: -60,
        maxX: 60,
        minZ: -60,
        maxZ: 60,
    },
    spawnPoint: { x: 0, y: 0.5, z: 0 },
    portals: [
        {
            targetWorld: 'urea-cycle',
            position: { x: 45, y: 0, z: 0 },
            spawnPoint: { x: -60, y: 0.5, z: -30 },
            label: 'Urea Cycle World',
        },
        {
            targetWorld: 'glycolysis',
            position: { x: 0, y: 0, z: -50 },
            spawnPoint: { x: 0, y: 0.5, z: 45 },
            label: 'Glycolysis Gauntlet',
            locked: true,
        }
    ]
};

// --- TCA Quest States ---
const TCA_QUEST = Object.freeze({
    NOT_STARTED: 'TCA_NOT_STARTED',
    MEET_PERCY: 'TCA_MEET_PERCY',
    COLLECT_ACETYL_COA: 'TCA_COLLECT_ACETYL_COA',
    VISIT_SID: 'TCA_VISIT_SID',
    COLLECT_CITRATE: 'TCA_COLLECT_CITRATE',
    VISIT_ACO: 'TCA_VISIT_ACO',
    VISIT_IKE: 'TCA_VISIT_IKE',
    COLLECT_FIRST_NADH: 'TCA_COLLECT_FIRST_NADH',
    VISIT_ALPHA: 'TCA_VISIT_ALPHA',
    COLLECT_SECOND_NADH: 'TCA_COLLECT_SECOND_NADH',
    VISIT_SUKI: 'TCA_VISIT_SUKI',
    COLLECT_GTP: 'TCA_COLLECT_GTP',
    VISIT_SADIE: 'TCA_VISIT_SADIE',
    COLLECT_FADH2: 'TCA_COLLECT_FADH2',
    VISIT_FUMA: 'TCA_VISIT_FUMA',
    VISIT_MAL: 'TCA_VISIT_MAL',
    COLLECT_THIRD_NADH: 'TCA_COLLECT_THIRD_NADH',
    CYCLE_COMPLETE: 'TCA_CYCLE_COMPLETE',
    COMPLETED: 'TCA_COMPLETED',
});

// --- NPC Data (loaded from data/tca.json) ---
const ENZYME_STATIONS = tcaData.enzymeStations;
const MALATE_DH = tcaData.malateDH;

// --- Module State ---
let worldScene = null;
let tcaNPCs = [];
let tcaWalls = [];
let tcaObjects = [];   // All Three.js objects we create (for cleanup)
let terrainMeshes = [];
let tcaQuestState = TCA_QUEST.NOT_STARTED;
let portalToUrea = null;
let centralFountain = null;

// --- World Colors ---
const COLORS = {
    ground: 0x1e1e3a,        // Dark indigo ground
    groundAccent: 0x2a2a4a,  // Slightly lighter
    path: 0x3d3066,          // Purple-tinted stone paths
    centralPool: 0x00aaff,   // Glowing blue energy pool
    ambientGlow: 0x6644aa,   // Ambient purple glow
    nadh: 0x00ff88,          // Bright green for NADH
    fadh2: 0xff8800,         // Orange for FADH2
    gtp: 0xffdd00,           // Gold for GTP
    acetylCoA: 0xff6b35,     // Orange for Acetyl-CoA
    co2: 0x888888,           // Grey for CO2
    oxaloacetate: 0x66ccff,  // Light blue for OAA
};

const PLAZA_RADIUS = 35;
const STATION_RADIUS = 28;

// --- Init ---
export function init(scene) {
    worldScene = scene;
    tcaNPCs = [];
    tcaWalls = [];
    tcaObjects = [];
    terrainMeshes = [];
    tcaQuestState = TCA_QUEST.NOT_STARTED;

    setWorldTerrainFn((_x, _z) => 0.01);

    createTerrain(scene);
    createCentralFountain(scene);
    createEnzymeStations(scene);
    createPortals(scene);
    createGlycolysisPortal(scene);
    createCompassMarkers(scene);
    createDecorativeElements(scene);
    createWorldLighting(scene);

    // Opening intro
    setTimeout(() => {
        const setInteracting = (state) => setGameState({ isUserInteracting: state });
        import('../uiManager.js').then(({ showDialogue }) => {
            showDialogue("Welcome to the TCA CENTRAL CROSSROADS -- the metabolic hub of the cell.\n\nEvery major pathway converges here. Glucose, fatty acids, amino acids -- they all feed into this cycle, and energy flows out.\n\nPortals around the plaza lead to different metabolic worlds. The cycle itself awaits your exploration.", [
                { text: "Explore the TCA Cycle", action: () => {
                    tcaQuestState = TCA_QUEST.MEET_PERCY;
                    showFeedback("Find Percy (PDH Complex) at the north side of the plaza to begin.", 5000);
                    updateTCAQuestUI();
                }},
                { text: "Visit another world first", action: () => {
                    showFeedback("Use the portals around the plaza to visit other metabolic worlds. Press T to quick-travel.", 5000);
                }}
            ], setInteracting);
        });
    }, 1500);
}

// Update quest UI panel to show TCA quest state
function updateTCAQuestUI() {
    const questName = document.getElementById('questName');
    const questObjective = document.getElementById('questObjective');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (questName) questName.textContent = 'TCA Cycle';

    const stateKeys = Object.keys(TCA_QUEST);
    const currentIdx = stateKeys.indexOf(
        Object.keys(TCA_QUEST).find(k => TCA_QUEST[k] === tcaQuestState)
    );
    const progress = Math.round((currentIdx / (stateKeys.length - 1)) * 100);

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;

    const objectives = {
        [TCA_QUEST.NOT_STARTED]: 'Enter the TCA Central Crossroads',
        [TCA_QUEST.MEET_PERCY]: 'Find Percy (PDH Complex) at the north side',
        [TCA_QUEST.COLLECT_ACETYL_COA]: 'Collect Acetyl-CoA and Oxaloacetate near the entrance',
        [TCA_QUEST.VISIT_SID]: 'Bring Acetyl-CoA + Oxaloacetate to Sid (Citrate Synthase)',
        [TCA_QUEST.COLLECT_CITRATE]: 'Collect the Citrate',
        [TCA_QUEST.VISIT_ACO]: 'Bring Citrate to Aco (Aconitase)',
        [TCA_QUEST.VISIT_IKE]: 'Bring Isocitrate to Ike (Isocitrate DH)',
        [TCA_QUEST.COLLECT_FIRST_NADH]: 'Collect the first NADH, then visit Alpha',
        [TCA_QUEST.VISIT_ALPHA]: 'Bring Alpha-KG to Alpha (Alpha-KG DH)',
        [TCA_QUEST.COLLECT_SECOND_NADH]: 'Collect the second NADH, then visit Suki',
        [TCA_QUEST.VISIT_SUKI]: 'Bring Succinyl-CoA to Suki (Succinyl-CoA Synthetase)',
        [TCA_QUEST.COLLECT_GTP]: 'Collect the GTP, then visit Sadie',
        [TCA_QUEST.VISIT_SADIE]: 'Bring Succinate to Sadie (Succinate DH / Complex II)',
        [TCA_QUEST.COLLECT_FADH2]: 'Collect FADH2, then visit Fuma',
        [TCA_QUEST.VISIT_FUMA]: 'Bring Fumarate to Fuma (Fumarase)',
        [TCA_QUEST.VISIT_MAL]: 'Bring Malate to Mal (Malate DH)',
        [TCA_QUEST.COLLECT_THIRD_NADH]: 'Collect the third NADH and Oxaloacetate',
        [TCA_QUEST.CYCLE_COMPLETE]: 'Return to Percy for your reward!',
        [TCA_QUEST.COMPLETED]: 'TCA Cycle mastered! Energy Mastery unlocked!',
    };

    if (questObjective) {
        questObjective.textContent = objectives[tcaQuestState] || 'Explore the TCA Cycle';
    }
}

// --- Terrain ---
function createTerrain(scene) {
    // Main ground - circular plaza
    const groundGeometry = new THREE.CircleGeometry(PLAZA_RADIUS + 20, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.ground,
        roughness: 0.9,
        metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    tcaObjects.push(ground);

    // Circular path ring where enzymes sit
    const pathRingOuter = new THREE.RingGeometry(STATION_RADIUS - 3, STATION_RADIUS + 3, 64);
    const pathMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.path,
        roughness: 0.7,
        metalness: 0.2,
    });
    const pathRing = new THREE.Mesh(pathRingOuter, pathMaterial);
    pathRing.rotation.x = -Math.PI / 2;
    pathRing.position.y = 0.02;
    pathRing.receiveShadow = true;
    scene.add(pathRing);
    tcaObjects.push(pathRing);

    // Radial spokes connecting center to stations
    const allEnzymes = [...ENZYME_STATIONS, MALATE_DH];
    for (const enzyme of allEnzymes) {
        const spokeGeo = new THREE.PlaneGeometry(1.5, STATION_RADIUS - 6);
        const spoke = new THREE.Mesh(spokeGeo, pathMaterial.clone());
        spoke.rotation.x = -Math.PI / 2;
        spoke.rotation.z = -enzyme.angle + Math.PI / 2;
        spoke.position.set(
            Math.cos(enzyme.angle) * (STATION_RADIUS / 2),
            0.015,
            -Math.sin(enzyme.angle) * (STATION_RADIUS / 2)
        );
        scene.add(spoke);
        tcaObjects.push(spoke);
    }

    // Background terrain
    const bgGeo = new THREE.PlaneGeometry(500, 500, 20, 20);
    const bgVerts = bgGeo.attributes.position.array;
    for (let i = 0; i < bgVerts.length; i += 3) {
        bgVerts[i + 2] = (Math.sin(bgVerts[i] * 0.02) * Math.cos(bgVerts[i + 1] * 0.02)) * 2;
    }
    bgGeo.computeVertexNormals();
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x0d0d20, roughness: 1.0, fog: true });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = -1;
    bg.receiveShadow = true;
    scene.add(bg);
    tcaObjects.push(bg);
}

// --- Central Energy Fountain ---
function createCentralFountain(scene) {
    // Glowing energy pool at the center
    const poolGeo = new THREE.CircleGeometry(5, 32);
    const poolMat = new THREE.MeshStandardMaterial({
        color: COLORS.centralPool,
        emissive: COLORS.centralPool,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.05;
    scene.add(pool);
    tcaObjects.push(pool);
    centralFountain = pool;

    // Ring around the pool
    const ringGeo = new THREE.TorusGeometry(5.5, 0.3, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x444488,
        metalness: 0.6,
        roughness: 0.3,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    scene.add(ring);
    tcaObjects.push(ring);

    // Pillar in the center with text
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x555577, metalness: 0.4, roughness: 0.5 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 1.5;
    pillar.castShadow = true;
    scene.add(pillar);
    tcaObjects.push(pillar);

    // Floating crystal on top
    const crystalGeo = new THREE.OctahedronGeometry(0.6, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x00ddff,
        emissive: 0x0088aa,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8,
        metalness: 0.8,
        roughness: 0.1,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 3.5;
    crystal.userData.isCrystal = true;
    scene.add(crystal);
    tcaObjects.push(crystal);

    // Label
    const label = createTextSprite('TCA Cycle', { x: 0, y: 5, z: 0 }, { scale: 2.5, textColor: 'rgba(100, 200, 255, 0.9)' });
    scene.add(label);
    tcaObjects.push(label);

    // Point light from the pool
    const poolLight = new THREE.PointLight(COLORS.centralPool, 1.5, 20);
    poolLight.position.set(0, 2, 0);
    scene.add(poolLight);
    tcaObjects.push(poolLight);
}

// --- Enzyme Station NPCs ---
function createEnzymeStations(scene) {
    const allEnzymes = [...ENZYME_STATIONS, MALATE_DH];

    for (const enzymeData of allEnzymes) {
        const x = Math.cos(enzymeData.angle) * STATION_RADIUS;
        const z = -Math.sin(enzymeData.angle) * STATION_RADIUS;

        // Platform for each station
        const platformGeo = new THREE.CylinderGeometry(3, 3.5, 0.4, 8);
        const platformMat = new THREE.MeshStandardMaterial({
            color: enzymeData.color,
            metalness: 0.3,
            roughness: 0.6,
            emissive: enzymeData.color,
            emissiveIntensity: 0.1,
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(x, 0.2, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        tcaObjects.push(platform);

        // Create NPC character
        const npcGroup = createEnzymeNPC(enzymeData, x, z);
        scene.add(npcGroup);
        tcaObjects.push(npcGroup);
        tcaNPCs.push(npcGroup);

        // Register as interactive -- use bodyMesh from characterBuilder for proper highlight
        addInteractiveObject(npcGroup);
        const mainMesh = npcGroup.userData.bodyMesh || npcGroup.userData.mainMesh || npcGroup.children.find(c => c.isMesh);
        if (mainMesh) {
            setOriginalMaterial(mainMesh, mainMesh.material);
            npcGroup.userData.mainMesh = mainMesh;
        }

        // Station light
        const stationLight = new THREE.PointLight(enzymeData.color, 0.5, 10);
        stationLight.position.set(x, 3, z);
        scene.add(stationLight);
        tcaObjects.push(stationLight);

        // Arrow path indicators between stations (small glowing dots along the cycle)
        const nextIdx = allEnzymes.indexOf(enzymeData);
        if (nextIdx < allEnzymes.length - 1) {
            const nextEnzyme = allEnzymes[(nextIdx + 1) % allEnzymes.length];
            createPathIndicators(scene, enzymeData.angle, nextEnzyme.angle, enzymeData.color);
        }
    }
    // Close the loop: last -> first
    const lastEnzyme = allEnzymes[allEnzymes.length - 1];
    const firstEnzyme = allEnzymes[0];
    createPathIndicators(scene, lastEnzyme.angle, firstEnzyme.angle, lastEnzyme.color);
}

function createPathIndicators(scene, fromAngle, toAngle, color) {
    const steps = 5;
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        // Interpolate angle (handle wrapping)
        let angleDiff = toAngle - fromAngle;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        const angle = fromAngle + angleDiff * t;

        const x = Math.cos(angle) * STATION_RADIUS;
        const z = -Math.sin(angle) * STATION_RADIUS;

        const dotGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const dotMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(x, 0.5, z);
        scene.add(dot);
        tcaObjects.push(dot);
    }
}

function createEnzymeNPC(data, x, z) {
    // Use characterBuilder for distinct silhouettes per enzyme
    const presetName = data.character || 'average';
    const preset = PRESETS[presetName] || {};
    const bodyColor = typeof data.bodyColor === 'string' ? parseInt(data.bodyColor.replace('#', ''), 16) : data.bodyColor;
    const hatColor = typeof data.color === 'string' ? parseInt(data.color.replace('#', ''), 16) : data.color;

    const group = buildCharacter({
        ...preset,
        bodyColor: bodyColor,
        hatColor: hatColor,
        accessoryColor: hatColor,
        label: data.shortName,
        sublabel: data.enzyme,
        sublabelColor: `rgba(200, 200, 200, 0.6)`,
    });

    group.position.set(x, 0.4, z);

    // Percy gets special hand details -- 4 fingers + L prosthetic for his 5 cofactors
    if (data.character === 'pirate') {
        addPercyHands(group);
    }

    // Face center toward the plaza center
    group.lookAt(0, group.position.y, 0);

    // Set userData for interaction
    group.userData = {
        name: data.name,
        type: 'npc',
        enzyme: data.enzyme,
        isInteractable: true,
        onInteract: (obj, scene, tools) => handleEnzymeInteraction(data, obj, scene, tools),
    };

    return group;
}

function addPercyHands(group) {
    // Percy's right hand: 4 real fingers (B1, B2, B3, B5) + L-shaped prosthetic (Lipoic acid)
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 });
    const prostheticMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.6, roughness: 0.3 });

    // Position near the right hand area
    const handX = 0.45;
    const handY = 0.85;

    // 4 real fingers (tiny cylinders) -- B1, B2, B3, B5
    const fingerLabels = ['B1', 'B2', 'B3', 'B5'];
    const fingerColors = [0xff6666, 0x66ff66, 0x6666ff, 0xffff66];
    for (let i = 0; i < 4; i++) {
        const fingerIdx = i < 3 ? i : i; // Skip ring finger position (index 3)
        const offset = (i - 1.5) * 0.06;
        const adjustedOffset = i >= 3 ? offset + 0.06 : offset; // Gap where ring finger was

        const finger = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.12, 0.025),
            new THREE.MeshStandardMaterial({ color: fingerColors[i], roughness: 0.7 })
        );
        finger.position.set(handX + adjustedOffset, handY + 0.08, 0.1);
        group.add(finger);
    }

    // L-shaped prosthetic where the ring finger (4th) was -- for Lipoic acid
    const lVertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.1, 0.03),
        prostheticMat
    );
    lVertical.position.set(handX + 0.03, handY + 0.07, 0.1);
    group.add(lVertical);

    const lHorizontal = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.03, 0.03),
        prostheticMat
    );
    lHorizontal.position.set(handX + 0.045, handY + 0.02, 0.1);
    group.add(lHorizontal);

    // Small "L" label
    const lLabel = createTextSprite('L', { x: handX + 0.03, y: handY + 0.2, z: 0.15 }, {
        scale: 0.2, textColor: 'rgba(200,200,220,0.9)',
    });
    group.add(lLabel);

    // Cofactor labels -- emphasize the B4 gap
    const cofactorLabel = createTextSprite('B1 B2 B3 [no B4!] B5', { x: handX, y: handY + 0.35, z: 0.15 }, {
        scale: 0.22, textColor: 'rgba(255,200,100,0.8)',
    });
    group.add(cofactorLabel);
    const lipoicLabel = createTextSprite('^ Lipoic acid', { x: handX + 0.02, y: handY + 0.25, z: 0.15 }, {
        scale: 0.18, textColor: 'rgba(180,180,200,0.7)',
    });
    group.add(lipoicLabel);
}

// --- Interaction Handler ---
function handleEnzymeInteraction(enzymeData, object, scene, tools) {
    const { showDialogue, showFeedback: feedback, setGameInteracting, addToInventory: addItem, createResource: makeResource, playMoleculeGenerationSound, createGameBoySound } = tools;

    createGameBoySound(440, 0.1, 'sine');

    // Default greeting interaction
    const advanceQuest = () => {
        switch (tcaQuestState) {
            case TCA_QUEST.MEET_PERCY:
                if (enzymeData.shortName === 'Percy') {
                    showDialogue(enzymeData.greeting, [
                        { text: "Tell me about the TCA Cycle", hideOnClick: false, action: () => {
                            showDialogue("The TCA Cycle, also called the Krebs Cycle or Citric Acid Cycle, is the central metabolic hub. It takes Acetyl-CoA and oxidizes it completely, producing NADH, FADH2, and GTP -- the energy currency that feeds the Electron Transport Chain!", [
                                { text: "What do I need to do?", hideOnClick: false, action: () => {
                                    showDialogue("First, collect some Acetyl-CoA. I've left some near the entrance. Then visit each enzyme station around the cycle, starting with Sid the Citrate Synthase. Each enzyme will teach you their reaction and give you the product to carry to the next one.", [
                                        { text: "I'm ready!", action: () => {
                                            tcaQuestState = TCA_QUEST.COLLECT_ACETYL_COA;
                                            feedback("Collect Acetyl-CoA near the entrance!", 4000);
                                            // Spawn Acetyl-CoA resource
                                            spawnResource(scene, 'Acetyl-CoA', { x: 3, y: 0.5, z: 40 }, COLORS.acetylCoA);
                                            spawnResource(scene, 'Oxaloacetate', { x: -3, y: 0.5, z: 40 }, COLORS.oxaloacetate);
                                        }}
                                    ], setGameInteracting);
                                }}
                            ], setGameInteracting);
                        }},
                        { text: "Just passing through" }
                    ], setGameInteracting);
                    return;
                }
                break;

            case TCA_QUEST.VISIT_SID:
                if (enzymeData.shortName === 'Sid') {
                    const inv = getInventory();
                    if (inv['Acetyl-CoA'] && inv['Oxaloacetate']) {
                        showDialogue("Excellent! You have Acetyl-CoA AND Oxaloacetate! Let me combine them...\n\nAcetyl-CoA + Oxaloacetate -> CITRATE + CoA\n\nThis is a condensation reaction -- I'm joining a 2-carbon unit to a 4-carbon unit to make a 6-carbon Citrate!", [
                            { text: "Amazing!", action: () => {
                                removeFromInventory('Acetyl-CoA');
                                removeFromInventory('Oxaloacetate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.COLLECT_CITRATE;
                                const pos = enzymeStationPosition(enzymeData);
                                spawnResource(scene, 'Citrate', { x: pos.x + 2, y: 0.5, z: pos.z }, 0x4ecdc4);
                                feedback("Citrate produced! Collect it and bring it to Aco.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    } else {
                        showDialogue("I need both Acetyl-CoA and Oxaloacetate to make Citrate. Go collect them first!", [], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_ACO:
                if (enzymeData.shortName === 'Aco') {
                    const inv = getInventory();
                    if (inv['Citrate']) {
                        showDialogue("Citrate! Let me do my rearranging trick...\n\nCitrate -> ISOCITRATE\n\nI just flipped a hydroxyl group from one carbon to another. Subtle, but it makes the next step possible!", [
                            { text: "On to Ike!", action: () => {
                                removeFromInventory('Citrate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.VISIT_IKE;
                                addItem('Isocitrate');
                                feedback("Isocitrate in your inventory! Visit Ike next.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_IKE:
                if (enzymeData.shortName === 'Ike') {
                    const inv = getInventory();
                    if (inv['Isocitrate']) {
                        showDialogue("Ah, Isocitrate! Time for my investigation...\n\nIsocitrate -> ALPHA-KETOGLUTARATE + CO2 + NADH\n\nThis is oxidative decarboxylation! I removed a carbon as CO2 (going from 6C to 5C) AND produced the FIRST NADH of the cycle. That's two important things at once!", [
                            { text: "First NADH!", action: () => {
                                removeFromInventory('Isocitrate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.COLLECT_FIRST_NADH;
                                addItem('Alpha-Ketoglutarate');
                                const pos = enzymeStationPosition(enzymeData);
                                spawnResource(scene, 'NADH', { x: pos.x - 2, y: 0.5, z: pos.z + 2 }, COLORS.nadh);
                                feedback("NADH produced! Collect it, then visit Alpha.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_ALPHA:
                if (enzymeData.shortName === 'Alpha') {
                    const inv = getInventory();
                    if (inv['Alpha-Ketoglutarate']) {
                        showDialogue("Alpha-Ketoglutarate. My substrate.\n\nAlpha-KG -> SUCCINYL-CoA + CO2 + NADH\n\nI am a multi-enzyme complex, similar to Percy. I produce the SECOND NADH and release the SECOND CO2. After me, both carbons from the original Acetyl-CoA have been completely oxidized to CO2.", [
                            { text: "Both carbons gone as CO2!", action: () => {
                                removeFromInventory('Alpha-Ketoglutarate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.COLLECT_SECOND_NADH;
                                addItem('Succinyl-CoA');
                                const pos = enzymeStationPosition(enzymeData);
                                spawnResource(scene, 'NADH', { x: pos.x + 2, y: 0.5, z: pos.z - 2 }, COLORS.nadh);
                                feedback("Second NADH! Collect it, then visit Suki.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_SUKI:
                if (enzymeData.shortName === 'Suki') {
                    const inv = getInventory();
                    if (inv['Succinyl-CoA']) {
                        showDialogue("Succinyl-CoA! My time to shine!\n\nSuccinyl-CoA -> SUCCINATE + GTP + CoA\n\nSubstrate-level phosphorylation! I make GTP directly, no electron transport chain needed. This GTP is equivalent to one ATP. Not bad for a single step, right?", [
                            { text: "GTP! Direct energy!", action: () => {
                                removeFromInventory('Succinyl-CoA');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.COLLECT_GTP;
                                addItem('Succinate');
                                const pos = enzymeStationPosition(enzymeData);
                                spawnResource(scene, 'GTP', { x: pos.x - 1, y: 0.5, z: pos.z + 2 }, COLORS.gtp);
                                feedback("GTP produced! Collect it, then visit Sadie.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_SADIE:
                if (enzymeData.shortName === 'Sadie') {
                    const inv = getInventory();
                    if (inv['Succinate']) {
                        showDialogue("Succinate for me!\n\nSuccinate -> FUMARATE + FADH2\n\nI use FAD instead of NAD+ as my electron acceptor. Why? Because I'm embedded in the inner mitochondrial membrane as Complex II! My FADH2 feeds electrons directly into the ETC at a lower energy level than NADH -- that's why FADH2 produces fewer ATP than NADH (1.5 vs 2.5).", [
                            { text: "Complex II! FADH2!", action: () => {
                                removeFromInventory('Succinate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.COLLECT_FADH2;
                                addItem('Fumarate');
                                const pos = enzymeStationPosition(enzymeData);
                                spawnResource(scene, 'FADH2', { x: pos.x + 2, y: 0.5, z: pos.z }, COLORS.fadh2);
                                feedback("FADH2 produced! Collect it, then visit Fuma.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_FUMA:
                if (enzymeData.shortName === 'Fuma') {
                    const inv = getInventory();
                    if (inv['Fumarate']) {
                        showDialogue("Fumarate! My specialty.\n\nFumarate + H2O -> MALATE\n\nSimple hydration -- I just add water across the double bond. But remember: Fumarate also comes from the Urea Cycle! The Argininosuccinate Lyase (ASL) in the Urea Cycle produces Fumarate, which enters the TCA cycle right here through me.", [
                            { text: "The bridge between cycles!", action: () => {
                                removeFromInventory('Fumarate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.VISIT_MAL;
                                addItem('Malate');
                                feedback("Malate produced! Visit Mal, the last enzyme.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.VISIT_MAL:
                if (enzymeData.shortName === 'Mal') {
                    const inv = getInventory();
                    if (inv['Malate']) {
                        showDialogue("Malate! The final step.\n\nMalate -> OXALOACETATE + NADH\n\nI produce the THIRD and final NADH of the cycle, and I regenerate Oxaloacetate -- which goes right back to Sid to accept another Acetyl-CoA and start the cycle again! Go collect your products, then report back to Percy.", [
                            { text: "The cycle is complete!", action: () => {
                                removeFromInventory('Malate');
                                playMoleculeGenerationSound();
                                tcaQuestState = TCA_QUEST.COLLECT_THIRD_NADH;
                                const pos = enzymeStationPosition(enzymeData);
                                spawnResource(scene, 'NADH', { x: pos.x, y: 0.5, z: pos.z + 3 }, COLORS.nadh);
                                spawnResource(scene, 'Oxaloacetate', { x: pos.x + 3, y: 0.5, z: pos.z }, COLORS.oxaloacetate);
                                feedback("Third NADH + Oxaloacetate regenerated! Collect them.", 4000);
                            }}
                        ], setGameInteracting);
                        return;
                    }
                }
                break;

            case TCA_QUEST.CYCLE_COMPLETE:
                if (enzymeData.shortName === 'Percy') {
                    showDialogue("Outstanding! You've completed one full turn of the TCA Cycle!\n\nYou produced:\n- 3 NADH (-> ~7.5 ATP via ETC)\n- 1 FADH2 (-> ~1.5 ATP via ETC)\n- 1 GTP (~1 ATP)\n\nThat's about 10 ATP equivalent per Acetyl-CoA!\n\nYou've earned ENERGY MASTERY -- the ability to power energy-dependent reactions in other pathways.", [
                        { text: "Energy Mastery unlocked!", action: () => {
                            tcaQuestState = TCA_QUEST.COMPLETED;
                            addAbility('energy-mastery');
                            unlockWorld('glycolysis');
                            setWorldProgress('tca-cycle', { completed: true });
                            feedback("ENERGY MASTERY UNLOCKED! The Glycolysis Gauntlet is now accessible!", 6000);
                        }}
                    ], setGameInteracting);
                    return;
                }
                break;
        }

        // Default: show greeting, chained one line at a time (RSC style)
        if (enzymeData.greetingChain && enzymeData.greetingChain.length > 0) {
            showChainedDialogue(enzymeData.greeting, enzymeData.greetingChain, -1, showDialogue, setGameInteracting);
        } else {
            showDialogue(enzymeData.greeting, [{ text: "..." }], setGameInteracting);
        }
    };

    advanceQuest();
}

// Show dialogue one short line at a time, RSC style
function showChainedDialogue(firstLine, chain, index, showDialogue, setGameInteracting) {
    if (index >= chain.length) {
        // Last line
        showDialogue(chain[chain.length - 1], [{ text: "..." }], setGameInteracting);
        return;
    }
    const text = index === -1 ? firstLine : chain[index];
    const nextIndex = index + 1;
    const isLast = nextIndex >= chain.length;
    showDialogue(text, [{ text: isLast ? "Got it." : "...", hideOnClick: !isLast, action: isLast ? undefined : () => {
        showChainedDialogue(firstLine, chain, nextIndex, showDialogue, setGameInteracting);
    }}], setGameInteracting);
}

function enzymeStationPosition(enzymeData) {
    return {
        x: Math.cos(enzymeData.angle) * STATION_RADIUS,
        z: -Math.sin(enzymeData.angle) * STATION_RADIUS,
    };
}

function spawnResource(scene, name, position, color) {
    const resource = createResource(scene, name, { x: position.x, y: position.y || 0.5, z: position.z }, color, { worldId: 'tca-cycle' });
}

// --- Portals ---
function createPortals(scene) {
    // Portal to Urea Cycle -- positioned near Alpha (alpha-ketoglutarate dehydrogenase)
    // because alpha-KG connects to glutamate → ammonium capture → urea cycle
    // Alpha is at angle -PI/2, position (0, 0, 28). Portal goes directly south, aligned with S marker.
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, PLAZA_RADIUS + 10);

    const portalGeo = new THREE.TorusGeometry(2, 0.3, 8, 20);
    const portalMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
    });
    const portalRing = new THREE.Mesh(portalGeo, portalMat);
    portalRing.position.y = 2;
    portalGroup.add(portalRing);

    // Portal inner glow
    const innerGeo = new THREE.CircleGeometry(1.8, 16);
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 2;
    portalGroup.add(inner);

    const portalLabel = createTextSprite('Urea Cycle', { x: 0, y: 4.5, z: 0 }, { scale: 1.5 });
    portalGroup.add(portalLabel);

    // Connecting label explaining WHY it's here
    const connectionLabel = createTextSprite('via alpha-KG / glutamate', { x: 0, y: 0.5, z: 1.5 }, {
        scale: 0.6, textColor: 'rgba(100, 255, 150, 0.6)',
    });
    portalGroup.add(connectionLabel);

    // Connecting path from Alpha's station (z=28) to the portal (z=45)
    const pathGeo = new THREE.PlaneGeometry(3, 18);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x1a3a2a, roughness: 0.8 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.015, 36);
    scene.add(path);
    tcaObjects.push(path);

    // Portal light
    const portalLight = new THREE.PointLight(0x00ff88, 1, 10);
    portalLight.position.set(0, 2, 0);
    portalGroup.add(portalLight);

    scene.add(portalGroup);
    tcaObjects.push(portalGroup);
    portalToUrea = portalGroup;

    // Register portal as interactive
    portalGroup.userData = {
        name: 'Portal to Urea Cycle',
        type: 'portal',
        isInteractable: true,
        targetWorld: 'urea-cycle',
        onInteract: (obj, scene, tools) => {
            const { showDialogue, setGameInteracting } = tools;
            showDialogue("The Urea Cycle connects here through alpha-ketoglutarate and glutamate -- the ammonium capture pathway.\n\nAlpha-KG from the TCA cycle gets converted to glutamate, which feeds into ammonia disposal via the urea cycle. Travel there?", [
                { text: "Enter the Urea Cycle", action: () => {
                    transitionTo('urea-cycle', { x: CONSTANTS_UC.MAX_X - 10, y: 0.5, z: -30 });
                }},
                { text: "Stay here" }
            ], setGameInteracting);
        }
    };
    addInteractiveObject(portalGroup);
}

// Urea cycle constants (needed for portal spawn point)
const CONSTANTS_UC = { MAX_X: 80 };

function createGlycolysisPortal(scene) {
    // Portal to Glycolysis -- north side (glycolysis feeds pyruvate into TCA)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, -50);

    const ringGeo = new THREE.TorusGeometry(2, 0.25, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff6b6b, emissive: 0xff4444, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 2;
    portalGroup.add(ring);

    const innerGeo = new THREE.CircleGeometry(1.8, 16);
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0xff6b6b, emissive: 0xff4444, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 2;
    portalGroup.add(inner);

    const label = createTextSprite('Glycolysis Gauntlet', { x: 0, y: 4.5, z: 0 }, { scale: 1.3 });
    portalGroup.add(label);

    const light = new THREE.PointLight(0xff6b6b, 0.8, 10);
    light.position.set(0, 2, 0);
    portalGroup.add(light);

    scene.add(portalGroup);
    tcaObjects.push(portalGroup);

    portalGroup.userData = {
        name: 'Portal to Glycolysis Gauntlet',
        type: 'portal',
        isInteractable: true,
        onInteract: (obj, scene, tools) => {
            const { showDialogue, setGameInteracting } = tools;
            showDialogue("This portal leads to the Glycolysis Gauntlet -- where glucose is broken down into pyruvate. Ready to go?", [
                { text: "Enter Glycolysis", action: () => {
                    transitionTo('glycolysis', { x: 0, y: 0.5, z: 50 });
                }},
                { text: "Not yet" }
            ], setGameInteracting);
        }
    };
    addInteractiveObject(portalGroup);
    setOriginalMaterial(ring, ring.material);
    portalGroup.userData.mainMesh = ring;
}

// --- Decorative Elements ---
function createCompassMarkers(scene) {
    const compassDist = PLAZA_RADIUS + 10;
    const markers = [
        { label: 'N', x: 0, z: -compassDist, desc: 'Glycolysis' },
        { label: 'S', x: 0, z: compassDist, desc: 'Urea Cycle' },
        { label: 'E', x: compassDist, z: 0, desc: '' },
        { label: 'W', x: -compassDist, z: 0, desc: '' },
    ];

    for (const m of markers) {
        // Large compass letter on the ground
        const letterLabel = createTextSprite(m.label, { x: m.x, y: 0.3, z: m.z }, {
            scale: 2.5, textColor: 'rgba(200, 200, 255, 0.35)',
        });
        scene.add(letterLabel);
        tcaObjects.push(letterLabel);

        // Small pathway name below the letter
        if (m.desc) {
            const descLabel = createTextSprite(m.desc, { x: m.x, y: 0.15, z: m.z + (m.z < 0 ? 2.5 : -2.5) }, {
                scale: 0.8, textColor: 'rgba(200, 200, 255, 0.25)',
            });
            scene.add(descLabel);
            tcaObjects.push(descLabel);
        }

        // Ground marker disc
        const discGeo = new THREE.CircleGeometry(1.5, 16);
        const discMat = new THREE.MeshStandardMaterial({
            color: 0x333355, roughness: 0.8, metalness: 0.2,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(m.x, 0.03, m.z);
        scene.add(disc);
        tcaObjects.push(disc);
    }

    // Central compass rose (small cross on the ground at spawn point)
    const crossMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.6 });
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.3), crossMat);
    hBar.position.set(0, 0.04, 0);
    scene.add(hBar);
    tcaObjects.push(hBar);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 4), crossMat);
    vBar.position.set(0, 0.04, 0);
    scene.add(vBar);
    tcaObjects.push(vBar);
}

function createDecorativeElements(scene) {
    // Floating energy particles around the cycle ring
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = STATION_RADIUS + (Math.random() - 0.5) * 6;
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = 0.5 + Math.random() * 3;
        positions[i * 3 + 2] = -Math.sin(angle) * r;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
        color: 0x8866ff,
        size: 0.15,
        transparent: true,
        opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.userData.isParticles = true;
    scene.add(particles);
    tcaObjects.push(particles);

    // Decorative columns at cardinal directions
    const columnPositions = [
        { x: 0, z: PLAZA_RADIUS + 5 },    // North
        { x: 0, z: -(PLAZA_RADIUS + 5) }, // South
        { x: PLAZA_RADIUS + 5, z: 0 },    // East (near urea portal)
        { x: -(PLAZA_RADIUS + 5), z: 0 }, // West
    ];

    for (const pos of columnPositions) {
        const colGeo = new THREE.CylinderGeometry(0.5, 0.6, 4, 6);
        const colMat = new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.5, roughness: 0.4 });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(pos.x, 2, pos.z);
        col.castShadow = true;
        scene.add(col);
        tcaObjects.push(col);

        // Flame on top
        const flameGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
        const flameMat = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff4400,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(pos.x, 4.5, pos.z);
        flame.userData.isFlame = true;
        scene.add(flame);
        tcaObjects.push(flame);

        const flameLight = new THREE.PointLight(0xff6600, 0.4, 8);
        flameLight.position.set(pos.x, 4.5, pos.z);
        scene.add(flameLight);
        tcaObjects.push(flameLight);
    }
}

// --- World Lighting ---
function createWorldLighting(scene) {
    // Moonlight-like directional light
    const moonLight = new THREE.DirectionalLight(0x8888cc, 0.4);
    moonLight.position.set(20, 30, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    scene.add(moonLight);
    tcaObjects.push(moonLight);

    // Ambient glow from below (simulating the energy of the cycle)
    const underGlow = new THREE.HemisphereLight(0x4422aa, 0x111122, 0.3);
    scene.add(underGlow);
    tcaObjects.push(underGlow);
}

// --- Update ---
export function update(delta, elapsedTime) {
    if (!worldScene) return;

    // Animate central crystal rotation
    for (const obj of tcaObjects) {
        if (obj.userData && obj.userData.isCrystal) {
            obj.rotation.y = elapsedTime * 0.5;
            obj.position.y = 3.5 + Math.sin(elapsedTime * 1.5) * 0.2;
        }
        if (obj.userData && obj.userData.isFlame) {
            obj.scale.y = 1 + Math.sin(elapsedTime * 5 + obj.position.x) * 0.2;
            obj.scale.x = 1 + Math.sin(elapsedTime * 3 + obj.position.z) * 0.1;
        }
        if (obj.userData && obj.userData.isParticles) {
            obj.rotation.y = -elapsedTime * 0.1;
        }
    }

    // Animate central pool
    if (centralFountain) {
        centralFountain.material.emissiveIntensity = 0.3 + Math.sin(elapsedTime * 2) * 0.15;
    }

    // NPC idle animations (breathing, head turn, arm sway, weight shift)
    for (let i = 0; i < tcaNPCs.length; i++) {
        const npc = tcaNPCs[i];
        // Store rest position on first frame
        if (npc.userData.restPosY === undefined) {
            npc.userData.restPosY = npc.position.y;
        }
        updateCharacterIdle(npc, elapsedTime, i * 7.3 + npc.position.x);
    }

    // Resource hover (reuse from worldManager)
    for (const obj of interactiveObjects) {
        if (obj.userData && obj.userData.type === 'resource' && obj.userData.worldId === 'tca-cycle') {
            obj.position.y = 0.5 + Math.sin(elapsedTime * 2 + obj.position.x) * 0.15;
            obj.rotation.y = elapsedTime * 1.5;
        }
    }

    // Terrain following for player (TCA is flat at y=0.01)
    const tcaGroundY = 0.01;
    if (player.userData.verticalVelocity && player.userData.verticalVelocity > 0) {
        // Jumping
        player.position.y += player.userData.verticalVelocity * delta;
        player.userData.verticalVelocity -= 1.2 * delta; // gravity: 0.02/frame → 1.2/s
    } else if (player.position.y > tcaGroundY + 0.1) {
        // Falling
        if (!player.userData.verticalVelocity) player.userData.verticalVelocity = 0;
        player.userData.verticalVelocity -= 1.2 * delta;
        player.position.y += player.userData.verticalVelocity * delta;
        if (player.position.y <= tcaGroundY) {
            player.position.y = tcaGroundY;
            player.userData.verticalVelocity = 0;
        }
    } else {
        // Smooth ground snap
        player.position.y += (tcaGroundY - player.position.y) * Math.min(1, 6.0 * delta);
        player.userData.verticalVelocity = 0;
    }

    // Health regen when not in danger
    const currentHealth = getHealth();
    if (currentHealth < 100) {
        healHealth(2 * delta);
    }

    // Resource collection proximity check (auto-collect when close)
    const playerPos = player.position;
    for (let i = interactiveObjects.length - 1; i >= 0; i--) {
        const obj = interactiveObjects[i];
        if (obj.userData && obj.userData.type === 'resource' && obj.userData.worldId === 'tca-cycle') {
            const dist = playerPos.distanceTo(obj.position);
            if (dist < 2) {
                const name = obj.userData.name;
                addToInventory(name);

                // Remove from scene
                if (obj.parent) obj.parent.remove(obj);
                removeInteractiveObjectAt(i);

                // Advance quest -- this shows the appropriate feedback message
                const questAdvanced = handleResourceCollected(name, worldScene);
                if (!questAdvanced) {
                    showFeedback(`Collected ${name}!`, 2000);
                }
            }
        }
    }

    // Update interaction highlights
    updateInteraction(worldScene);

    // Update quest UI
    updateTCAQuestUI();
}

function handleResourceCollected(resourceName, scene) {
    switch (tcaQuestState) {
        case TCA_QUEST.COLLECT_ACETYL_COA:
            if (resourceName === 'Acetyl-CoA' || resourceName === 'Oxaloacetate') {
                const inv = getInventory();
                if (inv['Acetyl-CoA'] && inv['Oxaloacetate']) {
                    tcaQuestState = TCA_QUEST.VISIT_SID;
                    showFeedback("You have Acetyl-CoA and Oxaloacetate! Visit Sid, the Citrate Synthase.", 4000);
                    return true;
                }
            }
            return false;
        case TCA_QUEST.COLLECT_CITRATE:
            if (resourceName === 'Citrate') {
                tcaQuestState = TCA_QUEST.VISIT_ACO;
                showFeedback("Bring the Citrate to Aco, the Aconitase.", 4000);
                return true;
            }
            return false;
        case TCA_QUEST.COLLECT_FIRST_NADH:
            if (resourceName === 'NADH') {
                tcaQuestState = TCA_QUEST.VISIT_ALPHA;
                showFeedback("First NADH collected! Visit Alpha, the Alpha-KG Dehydrogenase.", 4000);
                return true;
            }
            return false;
        case TCA_QUEST.COLLECT_SECOND_NADH:
            if (resourceName === 'NADH') {
                tcaQuestState = TCA_QUEST.VISIT_SUKI;
                showFeedback("Second NADH! Visit Suki, the Succinyl-CoA Synthetase.", 4000);
                return true;
            }
            return false;
        case TCA_QUEST.COLLECT_GTP:
            if (resourceName === 'GTP') {
                tcaQuestState = TCA_QUEST.VISIT_SADIE;
                showFeedback("GTP collected! Visit Sadie, the Succinate Dehydrogenase.", 4000);
                return true;
            }
            return false;
        case TCA_QUEST.COLLECT_FADH2:
            if (resourceName === 'FADH2') {
                tcaQuestState = TCA_QUEST.VISIT_FUMA;
                showFeedback("FADH2 collected! Visit Fuma, the Fumarase.", 4000);
                return true;
            }
            return false;
        case TCA_QUEST.COLLECT_THIRD_NADH:
            if (resourceName === 'NADH' || resourceName === 'Oxaloacetate') {
                const inv = getInventory();
                if (inv['NADH'] && inv['Oxaloacetate']) {
                    tcaQuestState = TCA_QUEST.CYCLE_COMPLETE;
                    showFeedback("THE CYCLE IS COMPLETE! Return to Percy for your reward!", 6000);
                    return true;
                }
            }
            return false;
        default:
            return false;
    }
}

// --- Cleanup ---
export function cleanup(scene) {
    // Remove all objects created by this world
    for (const obj of tcaObjects) {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
        if (obj.traverse) {
            obj.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    // Remove TCA interactive objects from the shared array
    for (let i = interactiveObjects.length - 1; i >= 0; i--) {
        const obj = interactiveObjects[i];
        if (obj.userData && (obj.userData.worldId === 'tca-cycle' || tcaNPCs.includes(obj) || tcaObjects.includes(obj))) {
            removeInteractiveObjectAt(i);
        }
    }

    tcaObjects = [];
    tcaNPCs = [];
    tcaWalls = [];
    terrainMeshes = [];
    worldScene = null;
    centralFountain = null;
    portalToUrea = null;
    setWorldTerrainFn(null);
}

export function getSnapshot() {
    return { questState: tcaQuestState };
}

export function restoreSnapshot(data) {
    if (data && data.questState !== undefined) tcaQuestState = data.questState;
}

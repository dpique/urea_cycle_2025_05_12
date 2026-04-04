// js/worlds/glycolysisWorld.js
// The Glycolysis Gauntlet -- a visual, player-centered pathway from Glucose to Pyruvate
// The glucose ring physically transforms at each station

import * as THREE from 'three';
import { createTextSprite, createSimpleParticleSystem } from '../utils.js';
import { createResource, interactiveObjects, originalMaterials } from '../worldManager.js';
import { player } from '../playerManager.js';
import { showFeedback } from '../uiManager.js';
import { getGameState, setGameState, getInventory, addToInventory, removeFromInventory, getHealth, healHealth, setWorldProgress, addAbility, unlockWorld } from '../gameState.js';
import { handlePlayerDeath } from '../gameManager.js';
import { transitionTo } from '../sceneManager.js';
import { updateInteraction } from '../interactionManager.js';

// --- World Config ---
export const config = {
    id: 'glycolysis',
    name: 'Glycolysis Gauntlet',
    description: 'Break down glucose into pyruvate -- the universal energy harvest',
    skyColor: 0x2d1b00,
    fogColor: 0x2d1b00,
    fogNear: 50,
    fogFar: 200,
    ambientLightIntensity: 0.5,
    ambientLightColor: 0xffcc88,
    bounds: { minX: -20, maxX: 20, minZ: -120, maxZ: 60 },
    spawnPoint: { x: 0, y: 0.5, z: 50 },
};

// --- Quest States ---
const GLY_QUEST = Object.freeze({
    NOT_STARTED: 'GLY_NOT_STARTED',
    COLLECT_GLUCOSE: 'GLY_COLLECT_GLUCOSE',
    VISIT_HEXY: 'GLY_VISIT_HEXY',
    VISIT_IZZY: 'GLY_VISIT_IZZY',
    VISIT_PHIL: 'GLY_VISIT_PHIL',
    VISIT_AL: 'GLY_VISIT_AL',
    VISIT_TIM: 'GLY_VISIT_TIM',
    VISIT_GARY: 'GLY_VISIT_GARY',
    VISIT_PEGGY: 'GLY_VISIT_PEGGY',
    VISIT_MUTTY: 'GLY_VISIT_MUTTY',
    VISIT_ENO: 'GLY_VISIT_ENO',
    VISIT_PIKE: 'GLY_VISIT_PIKE',
    COMPLETED: 'GLY_COMPLETED',
});

const QUEST_FOR_ENZYME = [
    GLY_QUEST.VISIT_HEXY, GLY_QUEST.VISIT_IZZY, GLY_QUEST.VISIT_PHIL,
    GLY_QUEST.VISIT_AL, GLY_QUEST.VISIT_TIM, GLY_QUEST.VISIT_GARY,
    GLY_QUEST.VISIT_PEGGY, GLY_QUEST.VISIT_MUTTY, GLY_QUEST.VISIT_ENO,
    GLY_QUEST.VISIT_PIKE,
];

// --- Enzyme Data ---
const ENZYMES = [
    {
        name: 'Hexy\'s Workbench (Hexokinase)', shortName: 'Hexy\'s Bench',
        enzyme: 'Hexokinase', z: 30, color: 0xff6b6b, bodyColor: 0xcc4444,
        phase: 'investment', stationType: 'workbench',
        input: ['Glucose', 'ATP'], output: ['Glucose-6-P'],
        feedback: 'First stick of dynamite strapped onto CARBON 6 -- the last carbon of the chain! Glucose-6-Phosphate. The ring holds firm... one wasn\'t enough.',
    },
    {
        name: 'Izzy\'s Vise (PGI)', shortName: 'Izzy\'s Vise',
        enzyme: 'Phosphoglucose Isomerase', z: 16, color: 0xffa07a, bodyColor: 0xcc7755,
        phase: 'investment', stationType: 'vise',
        input: ['Glucose-6-P'], output: ['Fructose-6-P'],
        feedback: 'SQUEEZED so hard a carbon POPPED OUT of the ring! Six-sided glucose becomes five-sided fructose. Still holding together... but now we can reach both ends.',
    },
    {
        name: 'Phil the Gatekeeper (PFK-1)', shortName: 'Phil',
        enzyme: 'Phosphofructokinase-1', z: 2, color: 0xff4444, bodyColor: 0xaa2222,
        phase: 'investment', stationType: 'npc',
        input: ['Fructose-6-P', 'ATP'], output: ['Fructose-1,6-BP'],
        greeting: "I'm Phil, PFK-1. The RATE-LIMITING gatekeeper. Nothing passes without my say-so. We need dynamite on BOTH ends -- carbon 1 AND carbon 6. That's what the '1,6' means in fructose-1,6-bisphosphate!",
        feedback: 'SECOND stick of dynamite on CARBON 1! Fructose-1,6-bisphosphate -- the 1 and the 6 tell you exactly where the phosphates sit. Both ends loaded. NOW we pull.',
    },
    {
        name: 'Al\'s Splitting Rack (Aldolase)', shortName: 'Al\'s Rack',
        enzyme: 'Aldolase', z: -12, color: 0xff8c00, bodyColor: 0xcc6600,
        phase: 'split', stationType: 'rack',
        input: ['Fructose-1,6-BP'], output: ['DHAP', 'G3P'],
        feedback: 'THE GLUCOSE BREAKS IN HALF! Two 3-carbon fragments fly apart! The investment phase is OVER.',
    },
    {
        name: 'Tim\'s Mirror (TPI)', shortName: 'Tim\'s Mirror',
        enzyme: 'Triose Phosphate Isomerase', z: -24, color: 0xffb347, bodyColor: 0xcc8833,
        phase: 'split', stationType: 'mirror',
        input: ['DHAP'], output: ['G3P'],
        feedback: 'The DHAP twin converts to match its sibling. Two identical G3P fragments, ready for harvest.',
    },
    {
        name: 'Electron Extractor (GAPDH)', shortName: 'Extractor',
        enzyme: 'G3P Dehydrogenase', z: -38, color: 0x00cc66, bodyColor: 0x009944,
        phase: 'payoff', stationType: 'extractor',
        input: ['G3P'], output: ['1,3-BPG', 'NADH'],
        feedback: 'Electrons ripped out and stored as NADH! A free phosphate from the rubble bolts on -- each fragment now carries TWO phosphates.',
    },
    {
        name: 'Phosphate Popper (PGK)', shortName: 'Popper',
        enzyme: 'Phosphoglycerate Kinase', z: -52, color: 0x00ff88, bodyColor: 0x00cc66,
        phase: 'payoff', stationType: 'popper',
        input: ['1,3-BPG'], output: ['3-PG', 'ATP'],
        feedback: 'PHOSPHATE POPPED! Slammed onto ADP to recharge ATP. 2 ATP earned = 2 ATP spent. You\'re BREAK EVEN. Everything from here is profit.',
    },
    {
        name: 'The Shifter (PGM)', shortName: 'Shifter',
        enzyme: 'Phosphoglycerate Mutase', z: -64, color: 0x66ccff, bodyColor: 0x4499cc,
        phase: 'payoff', stationType: 'shifter',
        input: ['3-PG'], output: ['2-PG'],
        feedback: 'Phosphate shifted from carbon 3 to carbon 2. Like cocking a gun -- the spring is almost set.',
    },
    {
        name: 'The Wringer (Enolase)', shortName: 'Wringer',
        enzyme: 'Enolase', z: -78, color: 0x9999ff, bodyColor: 0x6666cc,
        phase: 'payoff', stationType: 'wringer',
        input: ['2-PG'], output: ['PEP'],
        feedback: 'WRUNG DRY! Water squeezed out. The phosphate bond is now a LOADED SPRING -- PEP, the highest-energy phosphate in common metabolism. One step left.',
    },
    {
        name: 'Pike the Launcher (Pyruvate Kinase)', shortName: 'Pike',
        enzyme: 'Pyruvate Kinase', z: -92, color: 0xff44ff, bodyColor: 0xcc22cc,
        phase: 'payoff', stationType: 'launcher',
        input: ['PEP'], output: ['Pyruvate', 'ATP'],
        greeting: "Stand back. That loaded spring? I pull the trigger. The phosphate LAUNCHES off, slams into ADP, and you get your PROFIT -- 2 more ATP. Net gain from one glucose: 2 ATP + 2 NADH + 2 Pyruvate. The pyruvate rolls on to the TCA Cycle.",
        feedback: 'GLYCOLYSIS COMPLETE! Net: 2 ATP + 2 NADH + 2 Pyruvate. The pyruvate heads to the TCA Cycle!',
    },
];

// --- Colors ---
const COLORS = {
    investmentGround: 0x3d1a1a,
    payoffGround: 0x1a3d1a,
    splitGround: 0x3d3d1a,
    path: 0x554433,
    atp: 0xffdd00,
    nadh: 0x00ff88,
    glucose: 0xffffff,
    phosphate: 0xff4400,
    phosphateGlow: 0xff6622,
    energy: 0x00ff66,
};

// --- State ---
let worldScene = null;
let glyObjects = [];
let glyNPCs = [];
let questState = GLY_QUEST.NOT_STARTED;

// The central glucose model that transforms at each station
let glucoseModel = null;
// The two fragment models after the split
let fragmentA = null;
let fragmentB = null;
// Phosphate spheres attached to the model
let phosphateA = null;
let phosphateB = null;
// Particle systems for active effects
let activeParticles = [];
// Animations queue
let activeAnimations = [];
// Track the current molecule state for visuals
let moleculeStage = 'none'; // none, hexagon, hexagon-1p, pentagon, pentagon-2p, split, fragment

// Terrain height function -- hill goes UP during investment, DOWN during payoff
const SPLIT_Z = -12;  // Al's station -- the peak
const START_Z = 50;   // entrance
const END_Z = -100;   // end of pathway
const PEAK_HEIGHT = 5; // meters high at the split point

function getGlyTerrainHeight(x, z) {
    // Only apply height within the pathway corridor
    const distFromCenter = Math.abs(x);
    if (distFromCenter > PATHWAY_WIDTH * 2) return 0;

    if (z > SPLIT_Z) {
        // Investment phase: climb uphill from 0 to PEAK_HEIGHT
        const t = Math.max(0, Math.min(1, (START_Z - z) / (START_Z - SPLIT_Z)));
        // Smooth ease-in curve
        const height = PEAK_HEIGHT * (t * t * (3 - 2 * t));
        return height;
    } else {
        // Payoff phase: descend from PEAK_HEIGHT down past 0
        const t = Math.max(0, Math.min(1, (SPLIT_Z - z) / (SPLIT_Z - END_Z)));
        const height = PEAK_HEIGHT * (1 - t * t * (3 - 2 * t)) * 1.0;
        return Math.max(-1, height); // don't go too far below ground
    }
}

// Pull mini-game state
let pullActive = false;
let pullProgress = 0; // 0 to 1
let pullOverlay = null;
let pullBar = null;
let pullLabel = null;

// Phosphate timing mini-game state
let phosphateTimingActive = false;
let phosphateTimingOverlay = null;
let phosphateTimingCallback = null; // called on success
let phosphateTargetVertex = 0;      // which vertex to hit
let phosphateTargetLabel = 'C6';
let phosphateSpinSpeed = 0;         // rad/s

const PATHWAY_X = 0;
const PATHWAY_WIDTH = 12;

// ========================
// GLUCOSE 3D MODEL BUILDER
// ========================

function createHexagonalRing(radius, tubeRadius, color) {
    // A hexagonal ring made of 6 cylinder segments with vertex spheres
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.05,
    });
    const vertexMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.4,
        metalness: 0.3,
    });

    const vertices = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        vertices.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        ));
    }

    // Edges (cylinders between vertices)
    for (let i = 0; i < 6; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % 6];
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(end, start);
        const length = dir.length();

        const edgeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, length, 8);
        const edge = new THREE.Mesh(edgeGeo, mat);
        edge.position.copy(mid);
        // Orient cylinder along the edge direction
        edge.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
        );
        edge.castShadow = true;
        group.add(edge);
    }

    // Vertex spheres (carbon atoms)
    for (let i = 0; i < 6; i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(tubeRadius * 1.6, 10, 8),
            vertexMat
        );
        sphere.position.copy(vertices[i]);
        sphere.castShadow = true;
        sphere.userData.vertexIndex = i;
        group.add(sphere);
    }

    group.userData.vertices = vertices;
    group.userData.tubeRadius = tubeRadius;
    return group;
}

function createPentagonalRing(radius, tubeRadius, color) {
    // A pentagonal (5-sided) ring
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.05,
    });
    const vertexMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.4,
        metalness: 0.3,
    });

    const vertices = [];
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        vertices.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        ));
    }

    for (let i = 0; i < 5; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % 5];
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(end, start);
        const length = dir.length();

        const edgeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, length, 8);
        const edge = new THREE.Mesh(edgeGeo, mat);
        edge.position.copy(mid);
        edge.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
        );
        edge.castShadow = true;
        group.add(edge);
    }

    for (let i = 0; i < 5; i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(tubeRadius * 1.6, 10, 8),
            vertexMat
        );
        sphere.position.copy(vertices[i]);
        sphere.castShadow = true;
        sphere.userData.vertexIndex = i;
        group.add(sphere);
    }

    // The carbon that "popped out" of the ring -- sticks out from vertex 0 (top)
    const popVertex = vertices[0];
    const popDir = popVertex.clone().normalize();
    const popEnd = popVertex.clone().add(popDir.clone().multiplyScalar(radius * 0.7));

    // Arm connecting ring to popped-out carbon
    const armMid = new THREE.Vector3().addVectors(popVertex, popEnd).multiplyScalar(0.5);
    const armDir = new THREE.Vector3().subVectors(popEnd, popVertex);
    const armGeo = new THREE.CylinderGeometry(tubeRadius * 0.8, tubeRadius * 0.8, armDir.length(), 6);
    const armMesh = new THREE.Mesh(armGeo, mat);
    armMesh.position.copy(armMid);
    armMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armDir.clone().normalize());
    group.add(armMesh);

    // The popped-out carbon atom (slightly larger, highlighted)
    const popMat = new THREE.MeshStandardMaterial({
        color: 0xffcc44,
        roughness: 0.3,
        metalness: 0.3,
        emissive: 0xffcc44,
        emissiveIntensity: 0.2,
    });
    const popSphere = new THREE.Mesh(new THREE.SphereGeometry(tubeRadius * 2.2, 10, 8), popMat);
    popSphere.position.copy(popEnd);
    popSphere.castShadow = true;
    group.add(popSphere);

    // Small "C" label on the popped carbon
    const cLabel = createTextSprite('C1', { x: popEnd.x, y: popEnd.y + 0.25, z: popEnd.z }, { scale: 0.4, textColor: 'rgba(255,220,100,0.9)' });
    group.add(cLabel);

    // Store popped carbon position for phosphate attachment reference
    group.userData.poppedCarbon = popEnd;
    group.userData.vertices = vertices;
    group.userData.tubeRadius = tubeRadius;
    return group;
}

function createPhosphateSphere(position) {
    const group = new THREE.Group();
    // Main phosphate sphere (the "dynamite")
    const sphereMat = new THREE.MeshStandardMaterial({
        color: COLORS.phosphate,
        roughness: 0.2,
        metalness: 0.5,
        emissive: COLORS.phosphateGlow,
        emissiveIntensity: 0.4,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), sphereMat);
    group.add(sphere);

    // Glow ring around phosphate
    const glowMat = new THREE.MeshStandardMaterial({
        color: COLORS.phosphateGlow,
        emissive: COLORS.phosphateGlow,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.3,
    });
    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 16), glowMat);
    glow.rotation.x = Math.PI / 2;
    group.add(glow);

    // Small "P" label
    const label = createTextSprite('P', { x: 0, y: 0.4, z: 0 }, {
        scale: 0.5, textColor: 'rgba(255, 200, 100, 1.0)',
    });
    group.add(label);

    group.position.copy(position);
    group.userData.isPhosphate = true;
    return group;
}

function createTriangleFragment(radius, tubeRadius, color, label) {
    // A 3-carbon triangular fragment with one phosphate
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.1,
    });
    const vertexMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.4,
        metalness: 0.3,
    });

    const vertices = [];
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
        vertices.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        ));
    }

    for (let i = 0; i < 3; i++) {
        const start = vertices[i];
        const end = vertices[(i + 1) % 3];
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(end, start);
        const length = dir.length();

        const edgeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, length, 8);
        const edge = new THREE.Mesh(edgeGeo, mat);
        edge.position.copy(mid);
        edge.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
        );
        edge.castShadow = true;
        group.add(edge);
    }

    for (let i = 0; i < 3; i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(tubeRadius * 1.6, 10, 8),
            vertexMat
        );
        sphere.position.copy(vertices[i]);
        sphere.castShadow = true;
        group.add(sphere);
    }

    // Phosphate on top vertex
    const phos = createPhosphateSphere(new THREE.Vector3(vertices[0].x, 0.4, vertices[0].z));
    group.add(phos);

    // Name label
    const nameSprite = createTextSprite(label, { x: 0, y: 1.0, z: 0 }, { scale: 0.7 });
    group.add(nameSprite);

    group.userData.vertices = vertices;
    return group;
}

// ========================
// STATION BUILDERS
// ========================

function createWorkbench(scene, data, x, z) {
    // Hexy's station: a workbench with clamps where you attach the phosphate
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);

    const benchMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.8, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });

    // Table top
    const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2), benchMat);
    top.position.y = 1.0;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Four legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
    [[-1.3, -0.8], [-1.3, 0.8], [1.3, -0.8], [1.3, 0.8]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, benchMat);
        leg.position.set(lx, 0.5, lz);
        leg.castShadow = true;
        group.add(leg);
    });

    // Two clamps (upright metal arms)
    const clampGeo = new THREE.BoxGeometry(0.1, 0.7, 0.1);
    [-0.8, 0.8].forEach(cx => {
        const clamp = new THREE.Mesh(clampGeo, metalMat);
        clamp.position.set(cx, 1.45, 0);
        clamp.castShadow = true;
        group.add(clamp);

        // Clamp top (horizontal bar)
        const clampTop = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.3), metalMat);
        clampTop.position.set(cx, 1.8, 0);
        group.add(clampTop);
    });

    // Floating phosphate/dynamite indicator on the bench
    const dynamiteMat = new THREE.MeshStandardMaterial({
        color: COLORS.phosphate, emissive: COLORS.phosphate, emissiveIntensity: 0.3,
        roughness: 0.4,
    });
    const dynamite = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), dynamiteMat);
    dynamite.position.set(0.5, 1.3, 0.5);
    dynamite.rotation.z = Math.PI / 6;
    dynamite.userData.isDynamite = true;
    group.add(dynamite);

    // Label
    const label = createTextSprite("Hexy's Workbench", { x: 0, y: 2.6, z: 0 }, { scale: 0.9 });
    group.add(label);

    // Subtitle
    const sub = createTextSprite('Hexokinase', { x: 0, y: 2.2, z: 0 }, {
        scale: 0.6, textColor: 'rgba(255,150,150,0.8)',
    });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);

    // Make interactive
    interactiveObjects.push(group);
    originalMaterials.set(top, top.material);
    group.userData = {
        name: data.name, type: 'station', enzyme: data.enzyme,
        isInteractable: true, mainMesh: top,
        onInteract: (obj, scn, tools) => handleStationInteract(0, data, obj, scn, tools),
    };

    return group;
}

function createVise(scene, data, x, z) {
    // Izzy's station: a press/vise machine that squeezes the ring
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.3, metalness: 0.7 });
    const pressMat = new THREE.MeshStandardMaterial({
        color: data.color, roughness: 0.4, metalness: 0.5,
        emissive: data.color, emissiveIntensity: 0.1,
    });

    // Base plate
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 2), metalMat);
    base.position.y = 0.1;
    base.castShadow = true;
    group.add(base);

    // Two vertical uprights
    const upGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    [-1.0, 1.0].forEach(ux => {
        const upright = new THREE.Mesh(upGeo, metalMat);
        upright.position.set(ux, 1.35, 0);
        upright.castShadow = true;
        group.add(upright);
    });

    // Top crossbar
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.3), metalMat);
    crossbar.position.y = 2.6;
    crossbar.castShadow = true;
    group.add(crossbar);

    // Press plate (the squeezing plate, hangs from top)
    const press = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), pressMat);
    press.position.y = 1.8;
    press.userData.isPress = true;
    press.castShadow = true;
    group.add(press);

    // Screw/handle on top
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), metalMat);
    handle.position.set(0, 2.7, 0);
    handle.rotation.z = Math.PI / 2;
    group.add(handle);

    // Label
    const label = createTextSprite("Izzy's Vise", { x: 0, y: 3.4, z: 0 }, { scale: 0.9 });
    group.add(label);
    const sub = createTextSprite('Phosphoglucose Isomerase', { x: 0, y: 3.0, z: 0 }, {
        scale: 0.5, textColor: 'rgba(255,180,150,0.8)',
    });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);

    interactiveObjects.push(group);
    originalMaterials.set(base, base.material);
    group.userData = {
        name: data.name, type: 'station', enzyme: data.enzyme,
        isInteractable: true, mainMesh: base,
        onInteract: (obj, scn, tools) => handleStationInteract(1, data, obj, scn, tools),
    };

    return group;
}

function createNPCStation(scene, data, x, z, idx) {
    // Phil and payoff phase enzymes: humanoid NPC
    const group = new THREE.Group();
    group.position.set(x + 3, getGlyTerrainHeight(x, z) + 0.3, z);

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: data.bodyColor, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-0.1, 0.1].forEach(xOff => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(xOff, 1.65, 0.25);
        group.add(eye);
    });

    // Hat with enzyme color
    const hatGeo = new THREE.CylinderGeometry(0.15, 0.35, 0.3, 6);
    const hatMat = new THREE.MeshStandardMaterial({
        color: data.color, emissive: data.color, emissiveIntensity: 0.15,
    });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.95;
    group.add(hat);

    // Name label
    const label = createTextSprite(data.shortName, { x: 0, y: 2.5, z: 0 }, { scale: 1.0 });
    group.add(label);
    const sub = createTextSprite(data.enzyme, { x: 0, y: 2.2, z: 0 }, {
        scale: 0.5, textColor: 'rgba(200,200,255,0.7)',
    });
    group.add(sub);

    // Face toward pathway center
    group.lookAt(x, group.position.y, z);

    scene.add(group);
    glyObjects.push(group);
    glyNPCs.push(group);

    interactiveObjects.push(group);
    const mainMesh = body;
    originalMaterials.set(mainMesh, mainMesh.material);
    group.userData = {
        name: data.name, type: 'npc', enzyme: data.enzyme,
        isInteractable: true, mainMesh: mainMesh,
        onInteract: (obj, scn, tools) => handleStationInteract(idx, data, obj, scn, tools),
    };

    return group;
}

function createSplittingRack(scene, data, x, z) {
    // Al's station: a pulling machine/rack that rips the molecule apart
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x996633, roughness: 0.4, metalness: 0.6 });
    const chainMat = new THREE.MeshStandardMaterial({
        color: 0x888888, roughness: 0.3, metalness: 0.8,
    });
    const dangerMat = new THREE.MeshStandardMaterial({
        color: data.color, emissive: data.color, emissiveIntensity: 0.2,
        roughness: 0.4,
    });

    // Frame base
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2.5), metalMat);
    base.position.y = 0.1;
    base.castShadow = true;
    group.add(base);

    // Two pulling arms (left and right)
    const armGeo = new THREE.BoxGeometry(0.3, 0.3, 2.5);
    [-1.5, 1.5].forEach(ax => {
        const arm = new THREE.Mesh(armGeo, dangerMat);
        arm.position.set(ax, 0.8, 0);
        arm.castShadow = true;
        group.add(arm);

        // Hook/claw at the inner end
        const hookGeo = new THREE.TorusGeometry(0.15, 0.04, 6, 8, Math.PI);
        const hook = new THREE.Mesh(hookGeo, chainMat);
        hook.position.set(ax > 0 ? ax - 0.3 : ax + 0.3, 0.8, 0);
        hook.rotation.z = ax > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(hook);
    });

    // Central danger marking (chevron stripes)
    const warnGeo = new THREE.PlaneGeometry(1.5, 0.3);
    const warnMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
    });
    const warn = new THREE.Mesh(warnGeo, warnMat);
    warn.position.set(0, 1.2, 1.3);
    group.add(warn);

    // "PULL" label in danger orange
    const pullLabel = createTextSprite('PULL!', { x: 0, y: 1.5, z: 1.3 }, {
        scale: 0.6, textColor: 'rgba(255, 170, 0, 1)',
    });
    group.add(pullLabel);

    // Label
    const label = createTextSprite("Al's Splitting Rack", { x: 0, y: 2.4, z: 0 }, { scale: 0.9 });
    group.add(label);
    const sub = createTextSprite('Aldolase', { x: 0, y: 2.0, z: 0 }, {
        scale: 0.6, textColor: 'rgba(255,200,100,0.8)',
    });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);

    interactiveObjects.push(group);
    originalMaterials.set(base, base.material);
    group.userData = {
        name: data.name, type: 'station', enzyme: data.enzyme,
        isInteractable: true, mainMesh: base,
        onInteract: (obj, scn, tools) => handleStationInteract(3, data, obj, scn, tools),
    };

    return group;
}

function createMirrorDevice(scene, data, x, z) {
    // Tim's station: a mirror/converter that flips DHAP into G3P
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8866aa, roughness: 0.5, metalness: 0.4 });
    const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0xccddff, roughness: 0.05, metalness: 0.9,
        emissive: 0x4466aa, emissiveIntensity: 0.15,
        transparent: true, opacity: 0.7,
    });

    // Frame (arch shape)
    const frameGeo = new THREE.TorusGeometry(1.2, 0.12, 8, 16, Math.PI);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 1.5;
    frame.rotation.z = 0;
    frame.castShadow = true;
    group.add(frame);

    // Two pillars
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8);
    [-1.2, 1.2].forEach(px => {
        const pillar = new THREE.Mesh(pillarGeo, frameMat);
        pillar.position.set(px, 0.75, 0);
        pillar.castShadow = true;
        group.add(pillar);
    });

    // Mirror surface (reflective disc)
    const mirror = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16), mirrorMat);
    mirror.position.y = 1.5;
    mirror.userData.isMirror = true;
    group.add(mirror);

    // "= / =" symmetry symbols
    const symLabel = createTextSprite('DHAP <=> G3P', { x: 0, y: 0.3, z: 0.5 }, {
        scale: 0.5, textColor: 'rgba(200,180,255,0.9)',
    });
    group.add(symLabel);

    // Label
    const label = createTextSprite("Tim's Mirror", { x: 0, y: 3.0, z: 0 }, { scale: 0.9 });
    group.add(label);
    const sub = createTextSprite('Triose Phosphate Isomerase', { x: 0, y: 2.6, z: 0 }, {
        scale: 0.45, textColor: 'rgba(255,200,100,0.7)',
    });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);

    interactiveObjects.push(group);
    originalMaterials.set(frame, frame.material);
    group.userData = {
        name: data.name, type: 'station', enzyme: data.enzyme,
        isInteractable: true, mainMesh: frame,
        onInteract: (obj, scn, tools) => handleStationInteract(4, data, obj, scn, tools),
    };

    return group;
}

// ========================
// PAYOFF PHASE STATIONS
// ========================

function createExtractor(scene, data, x, z) {
    // Gary's Electron Extractor -- a generator that pulls electrons off fragments
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.4, metalness: 0.6 });

    // Generator body (cylinder)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.4, 8), metalMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Coils around the generator
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00cc44, emissiveIntensity: 0.3 });
    for (let i = 0; i < 3; i++) {
        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 6, 16), coilMat);
        coil.position.y = 0.5 + i * 0.4;
        coil.rotation.x = Math.PI / 2;
        group.add(coil);
    }

    // Output port (where NADH comes out)
    const port = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.6), new THREE.MeshStandardMaterial({
        color: COLORS.nadh, emissive: COLORS.nadh, emissiveIntensity: 0.4,
    }));
    port.position.set(0, 1.2, 1);
    group.add(port);

    // Label
    const label = createTextSprite('Electron Extractor', { x: 0, y: 2.8, z: 0 }, { scale: 0.8 });
    group.add(label);
    const sub = createTextSprite('GAPDH', { x: 0, y: 2.4, z: 0 }, { scale: 0.5, textColor: 'rgba(100,255,150,0.7)' });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);
    interactiveObjects.push(group);
    originalMaterials.set(body, body.material);
    group.userData = { name: data.name, type: 'station', enzyme: data.enzyme, isInteractable: true, mainMesh: body,
        onInteract: (obj, scn, tools) => handleStationInteract(5, data, obj, scn, tools) };
}

function createPopper(scene, data, x, z) {
    // Peggy's Phosphate Popper -- pops a phosphate off and recharges ATP
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x227744, roughness: 0.3, metalness: 0.6 });

    // Chamber body
    const chamber = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.2), metalMat);
    chamber.position.y = 0.8;
    chamber.castShadow = true;
    group.add(chamber);

    // Spring mechanism on top
    const springMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.2 });
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 12), springMat);
    spring.position.y = 1.6;
    spring.rotation.x = Math.PI / 2;
    group.add(spring);

    // Plunger
    const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 6), springMat);
    plunger.position.y = 2.0;
    group.add(plunger);

    // ATP output slot (glowing)
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.2), new THREE.MeshStandardMaterial({
        color: COLORS.atp, emissive: COLORS.atp, emissiveIntensity: 0.4,
    }));
    slot.position.set(0, 0.5, 0.7);
    group.add(slot);

    const label = createTextSprite('Phosphate Popper', { x: 0, y: 2.8, z: 0 }, { scale: 0.8 });
    group.add(label);
    const sub = createTextSprite('PGK', { x: 0, y: 2.4, z: 0 }, { scale: 0.5, textColor: 'rgba(100,255,150,0.7)' });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);
    interactiveObjects.push(group);
    originalMaterials.set(chamber, chamber.material);
    group.userData = { name: data.name, type: 'station', enzyme: data.enzyme, isInteractable: true, mainMesh: chamber,
        onInteract: (obj, scn, tools) => handleStationInteract(6, data, obj, scn, tools) };
}

function createShifter(scene, data, x, z) {
    // Mutty's Shifter -- a rotating turntable that repositions the phosphate
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.3, metalness: 0.5 });

    // Turntable disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.15, 16), metalMat);
    disc.position.y = 0.3;
    disc.castShadow = true;
    disc.userData.isTurntable = true;
    group.add(disc);

    // Center spindle
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), metalMat);
    spindle.position.y = 0.9;
    group.add(spindle);

    // Arrow on turntable showing rotation
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x4499cc, emissiveIntensity: 0.3 });
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 4), arrowMat);
    arrowHead.position.set(0.7, 0.45, 0);
    arrowHead.rotation.z = -Math.PI / 2;
    group.add(arrowHead);

    // "3 → 2" label on the turntable
    const posLabel = createTextSprite('C3 → C2', { x: 0, y: 0.7, z: 0 }, { scale: 0.5, textColor: 'rgba(150,220,255,0.9)' });
    group.add(posLabel);

    const label = createTextSprite('The Shifter', { x: 0, y: 2.2, z: 0 }, { scale: 0.8 });
    group.add(label);
    const sub = createTextSprite('Phosphoglycerate Mutase', { x: 0, y: 1.8, z: 0 }, { scale: 0.45, textColor: 'rgba(150,220,255,0.7)' });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);
    interactiveObjects.push(group);
    originalMaterials.set(disc, disc.material);
    group.userData = { name: data.name, type: 'station', enzyme: data.enzyme, isInteractable: true, mainMesh: disc,
        onInteract: (obj, scn, tools) => handleStationInteract(7, data, obj, scn, tools) };
}

function createWringer(scene, data, x, z) {
    // Eno's Wringer -- squeezes water out, compresses the phosphate bond into a loaded spring
    const group = new THREE.Group();
    group.position.set(x - 2, getGlyTerrainHeight(x, z), z);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x5555aa, roughness: 0.3, metalness: 0.6 });

    // Two rollers
    const rollerGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 12);
    [-0.35, 0.35].forEach(ry => {
        const roller = new THREE.Mesh(rollerGeo, metalMat);
        roller.position.set(0, 0.8, ry);
        roller.rotation.z = Math.PI / 2;
        roller.castShadow = true;
        group.add(roller);
    });

    // Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.5, metalness: 0.4 });
    [-1.0, 1.0].forEach(fx => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 0.15), frameMat);
        post.position.set(fx, 1, 0);
        post.castShadow = true;
        group.add(post);
    });

    // Water droplets falling out the bottom
    const dropMat = new THREE.MeshStandardMaterial({ color: 0x3399ff, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 3; i++) {
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), dropMat);
        drop.position.set((Math.random() - 0.5) * 0.5, -0.1 - i * 0.15, 0);
        drop.userData.isWaterDrop = true;
        group.add(drop);
    }

    // "H₂O" label below
    const waterLabel = createTextSprite('H2O squeezed out', { x: 0, y: -0.5, z: 0.5 }, { scale: 0.4, textColor: 'rgba(100,180,255,0.7)' });
    group.add(waterLabel);

    const label = createTextSprite('The Wringer', { x: 0, y: 2.6, z: 0 }, { scale: 0.8 });
    group.add(label);
    const sub = createTextSprite('Enolase', { x: 0, y: 2.2, z: 0 }, { scale: 0.5, textColor: 'rgba(180,180,255,0.7)' });
    group.add(sub);

    scene.add(group);
    glyObjects.push(group);
    interactiveObjects.push(group);
    originalMaterials.set(group.children[0], group.children[0].material);
    group.userData = { name: data.name, type: 'station', enzyme: data.enzyme, isInteractable: true, mainMesh: group.children[0],
        onInteract: (obj, scn, tools) => handleStationInteract(8, data, obj, scn, tools) };
}

function createLauncher(scene, data, x, z) {
    // Pike's Launcher -- the grand finale. NPC with a cannon/catapult that fires the last phosphate
    const group = new THREE.Group();
    group.position.set(x + 3, getGlyTerrainHeight(x, z) + 0.3, z);

    // Pike NPC body
    const bodyMat = new THREE.MeshStandardMaterial({ color: data.bodyColor, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8), bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 }));
    head.position.y = 1.6;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-0.1, 0.1].forEach(ex => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 1.65, 0.25);
        group.add(eye);
    });

    // Dramatic hat
    const hatMat = new THREE.MeshStandardMaterial({ color: data.color, emissive: data.color, emissiveIntensity: 0.2 });
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 0.3, 6), hatMat);
    hat.position.y = 1.95;
    group.add(hat);

    // Cannon next to Pike
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.7 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8), cannonMat);
    barrel.position.set(-1.5, 0.8, 0);
    barrel.rotation.z = Math.PI / 6; // Angled upward
    barrel.castShadow = true;
    group.add(barrel);

    // Cannon base
    const cannonBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), cannonMat);
    cannonBase.position.set(-1.5, 0.2, 0);
    group.add(cannonBase);

    // "FIRE!" label
    const fireLabel = createTextSprite('FIRE!', { x: -1.5, y: 2, z: 0 }, { scale: 0.6, textColor: 'rgba(255,100,255,0.8)' });
    group.add(fireLabel);

    const label = createTextSprite('Pike', { x: 0, y: 2.5, z: 0 }, { scale: 1.0 });
    group.add(label);
    const sub = createTextSprite('Pyruvate Kinase', { x: 0, y: 2.1, z: 0 }, { scale: 0.5, textColor: 'rgba(255,150,255,0.7)' });
    group.add(sub);

    group.lookAt(x, group.position.y, z);

    scene.add(group);
    glyObjects.push(group);
    glyNPCs.push(group);
    interactiveObjects.push(group);
    originalMaterials.set(body, body.material);
    group.userData = { name: data.name, type: 'npc', enzyme: data.enzyme, isInteractable: true, mainMesh: body,
        onInteract: (obj, scn, tools) => handleStationInteract(9, data, obj, scn, tools) };
}

// ========================
// PHOSPHATE TIMING MINI-GAME
// ========================

function startPhosphateTiming(scene, targetVertex, carbonLabel, spinSpeed, onSuccess) {
    if (phosphateTimingActive || !glucoseModel) return;
    phosphateTimingActive = true;
    phosphateTargetVertex = targetVertex;
    phosphateTargetLabel = carbonLabel;
    phosphateSpinSpeed = spinSpeed;
    phosphateTimingCallback = onSuccess;

    // Highlight the target carbon on the molecule
    const verts = glucoseModel.userData.vertices;
    if (verts && verts[targetVertex]) {
        const highlight = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 })
        );
        highlight.position.copy(verts[targetVertex]);
        highlight.userData.isTargetHighlight = true;
        glucoseModel.add(highlight);
    }

    // Speed up the molecule's spin
    glucoseModel.userData.timingSpinSpeed = spinSpeed;

    // Create UI overlay
    phosphateTimingOverlay = document.createElement('div');
    phosphateTimingOverlay.style.cssText = `
        position: fixed; bottom: 30%; left: 50%; transform: translateX(-50%);
        width: 380px; padding: 16px; text-align: center; z-index: 1000;
        background: rgba(0,0,0,0.85); border: 2px solid #ffaa00; border-radius: 12px;
        font-family: 'Segoe UI', sans-serif; color: white;
    `;
    phosphateTimingOverlay.innerHTML = `
        <div style="font-size: 22px; font-weight: bold; color: #ffaa00; margin-bottom: 8px;">
            Place the phosphate on ${carbonLabel}!
        </div>
        <div style="font-size: 14px; color: #ccc; margin-bottom: 10px;">
            Watch the spinning molecule. Press <span style="color:#ffcc00;font-weight:bold;">E</span> when the
            <span style="color:#ff4444;font-weight:bold;">red target</span> faces you!
        </div>
        <div id="phosphateTimingFeedback" style="font-size: 16px; min-height: 24px;"></div>
    `;
    document.body.appendChild(phosphateTimingOverlay);

    // Listen for E key press (single tap, not hold)
    phosphateTimingKeyHandler = (e) => {
        if (e.key.toLowerCase() === 'e' && phosphateTimingActive && !e.repeat) {
            e.preventDefault();
            e.stopPropagation();
            checkPhosphateTiming();
        }
    };
    document.addEventListener('keydown', phosphateTimingKeyHandler, true); // capture phase
}

let phosphateTimingKeyHandler = null;

function checkPhosphateTiming() {
    if (!glucoseModel || !phosphateTimingActive) return;

    // Determine where the target vertex is relative to the camera
    // The "facing you" position is when the vertex is at the front (positive Z in local space after rotation)
    const verts = glucoseModel.userData.vertices;
    if (!verts || !verts[phosphateTargetVertex]) return;

    const targetLocal = verts[phosphateTargetVertex].clone();
    // Apply the molecule's current Y rotation to get world-relative position
    targetLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), glucoseModel.rotation.y);

    // "Facing you" = the target vertex has the most positive Z (toward camera in default view)
    // We check if the target is in the front-facing arc
    const angle = Math.atan2(targetLocal.x, targetLocal.z);
    const tolerance = 0.55; // ~32 degrees either side = generous but not free

    const feedbackEl = document.getElementById('phosphateTimingFeedback');

    if (Math.abs(angle) < tolerance) {
        // HIT! Target is facing the player
        phosphateTimingActive = false;

        // Remove highlight
        if (glucoseModel) {
            const highlights = [];
            glucoseModel.traverse(c => { if (c.userData && c.userData.isTargetHighlight) highlights.push(c); });
            highlights.forEach(h => glucoseModel.remove(h));
            glucoseModel.userData.timingSpinSpeed = null;
        }

        // Remove UI
        if (phosphateTimingOverlay && phosphateTimingOverlay.parentNode) {
            phosphateTimingOverlay.parentNode.removeChild(phosphateTimingOverlay);
        }
        phosphateTimingOverlay = null;

        // Remove listener
        if (phosphateTimingKeyHandler) {
            document.removeEventListener('keydown', phosphateTimingKeyHandler, true);
        }
        phosphateTimingKeyHandler = null;

        // Fire callback
        if (phosphateTimingCallback) phosphateTimingCallback();
    } else {
        // MISS!
        if (feedbackEl) {
            feedbackEl.textContent = 'Missed! Wait for the red target to face you...';
            feedbackEl.style.color = '#ff6666';
            setTimeout(() => {
                if (feedbackEl) {
                    feedbackEl.textContent = '';
                }
            }, 1200);
        }
        import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(100, 0.1, 'square'));
    }
}

function updatePhosphateTiming(delta, elapsedTime) {
    // Override the molecule's normal rotation with the faster timing spin
    if (phosphateTimingActive && glucoseModel && glucoseModel.userData.timingSpinSpeed) {
        glucoseModel.rotation.y += glucoseModel.userData.timingSpinSpeed * delta;
    }
}

// ========================
// PULL MINI-GAME
// ========================

// Sweet spot range (60%-80% of bar)
const PULL_SWEET_MIN = 0.60;
const PULL_SWEET_MAX = 0.80;

function startPullMiniGame(scene, stationZ) {
    if (pullActive) return;
    pullActive = true;
    pullProgress = 0;
    pullFailed = false;

    // Create pull UI overlay
    pullOverlay = document.createElement('div');
    pullOverlay.id = 'pullOverlay';
    pullOverlay.style.cssText = `
        position: fixed; bottom: 30%; left: 50%; transform: translateX(-50%);
        width: 400px; padding: 20px; text-align: center; z-index: 1000;
        background: rgba(0,0,0,0.85); border: 2px solid #ff6600; border-radius: 12px;
        font-family: 'Segoe UI', sans-serif; color: white;
    `;

    pullLabel = document.createElement('div');
    pullLabel.style.cssText = 'font-size: 22px; font-weight: bold; margin-bottom: 12px; color: #ff8800;';
    pullLabel.textContent = 'HOLD E TO PULL -- release in the green zone!';
    pullOverlay.appendChild(pullLabel);

    // Bar with sweet spot zone
    const barContainer = document.createElement('div');
    barContainer.style.cssText = 'width: 100%; height: 34px; background: #333; border-radius: 6px; overflow: hidden; border: 1px solid #666; position: relative;';

    // Sweet spot zone indicator (green zone on the bar)
    const sweetZone = document.createElement('div');
    sweetZone.style.cssText = `
        position: absolute; left: ${PULL_SWEET_MIN * 100}%; width: ${(PULL_SWEET_MAX - PULL_SWEET_MIN) * 100}%;
        height: 100%; background: rgba(0,255,80,0.25); border-left: 2px solid #00ff44; border-right: 2px solid #00ff44;
        pointer-events: none; z-index: 1;
    `;
    barContainer.appendChild(sweetZone);

    // "SNAP!" label in the danger zone (past sweet spot)
    const dangerLabel = document.createElement('div');
    dangerLabel.style.cssText = `
        position: absolute; left: ${PULL_SWEET_MAX * 100 + 2}%; top: 50%; transform: translateY(-50%);
        font-size: 11px; color: #ff4444; pointer-events: none; z-index: 1; font-weight: bold;
    `;
    dangerLabel.textContent = 'TOO HARD!';
    barContainer.appendChild(dangerLabel);

    pullBar = document.createElement('div');
    pullBar.style.cssText = 'width: 0%; height: 100%; background: linear-gradient(90deg, #ff4400, #ff8800, #ffcc00); border-radius: 4px; position: relative; z-index: 2;';
    barContainer.appendChild(pullBar);
    pullOverlay.appendChild(barContainer);

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size: 13px; color: #aaa; margin-top: 8px;';
    hint.textContent = 'Pull with just the right force -- release E in the green zone!';
    pullOverlay.appendChild(hint);

    document.body.appendChild(pullOverlay);

    // Listen for E key
    pullKeyHandler = (e) => {
        if (e.key.toLowerCase() === 'e') {
            e.preventDefault();
            pullKeyHeld = true;
        }
    };
    pullKeyUpHandler = (e) => {
        if (e.key.toLowerCase() === 'e') {
            pullKeyHeld = false;
            // Check if released in the sweet spot
            if (pullActive && !pullFailed) {
                if (pullProgress >= PULL_SWEET_MIN && pullProgress <= PULL_SWEET_MAX) {
                    // SUCCESS!
                    completePull();
                } else if (pullProgress > 0.05) {
                    // Missed the zone
                    pullFailed = true;
                    if (pullProgress < PULL_SWEET_MIN) {
                        showFeedback("Not enough force! Hold E longer -- aim for the green zone.", 2000);
                    }
                    // If overshot, the update loop handles the snap-back message
                }
            }
        }
    };
    document.addEventListener('keydown', pullKeyHandler);
    document.addEventListener('keyup', pullKeyUpHandler);

    pullSceneRef = scene;
    pullStationZ = stationZ;
}

let pullKeyHandler = null;
let pullKeyUpHandler = null;
let pullKeyHeld = false;
let pullFailed = false;
let pullSceneRef = null;
let pullStationZ = 0;

function updatePullMiniGame(delta) {
    if (!pullActive) return;

    // Handle failed state -- snap back then reset
    if (pullFailed) {
        pullProgress = Math.max(pullProgress - delta * 2.0, 0);
        if (glucoseModel) {
            const stretch = 1 + pullProgress * 1.2;
            const squish = 1 - pullProgress * 0.3;
            glucoseModel.scale.set(stretch, squish, squish);
        }
        if (pullBar) pullBar.style.width = `${pullProgress * 100}%`;
        if (pullProgress <= 0) {
            pullFailed = false; // Ready to try again
            if (pullLabel) {
                pullLabel.textContent = 'Try again -- HOLD E, release in the green zone!';
                pullLabel.style.color = '#ff8800';
            }
        }
        return;
    }

    if (pullKeyHeld) {
        pullProgress = Math.min(pullProgress + delta * 0.55, 1); // ~1.8 seconds to fill

        // Stretch the glucose model
        if (glucoseModel) {
            const stretch = 1 + pullProgress * 1.2;
            const squish = 1 - pullProgress * 0.3;
            glucoseModel.scale.set(stretch, squish, squish);

            glucoseModel.traverse(child => {
                if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = 0.05 + pullProgress * 0.5;
                }
            });
        }

        // Creaking sounds
        if (pullProgress > 0.3 && pullProgress < 0.32) {
            import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(150, 0.1, 'sawtooth'));
        }
        if (pullProgress > 0.6 && pullProgress < 0.62) {
            import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(120, 0.15, 'sawtooth'));
        }

        // Overshot past the sweet spot!
        if (pullProgress > PULL_SWEET_MAX) {
            pullFailed = true;
            pullKeyHeld = false;
            showFeedback("Too hard! The molecule snapped back. Try again with less force.", 2000);
            import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(80, 0.2, 'square'));
            if (pullLabel) {
                pullLabel.textContent = 'SNAPPED BACK! Too much force!';
                pullLabel.style.color = '#ff4444';
            }
            return;
        }
    } else if (pullProgress > 0 && !pullFailed) {
        // Slowly relax if not holding (and not failed)
        pullProgress = Math.max(pullProgress - delta * 0.3, 0);
        if (glucoseModel) {
            const stretch = 1 + pullProgress * 1.2;
            const squish = 1 - pullProgress * 0.3;
            glucoseModel.scale.set(stretch, squish, squish);
        }
    }

    // Update UI bar
    if (pullBar) {
        pullBar.style.width = `${pullProgress * 100}%`;
        // Color the bar based on zone
        if (pullProgress >= PULL_SWEET_MIN && pullProgress <= PULL_SWEET_MAX) {
            pullBar.style.background = 'linear-gradient(90deg, #ff4400, #ff8800, #00ff44)';
        } else {
            pullBar.style.background = 'linear-gradient(90deg, #ff4400, #ff8800, #ffcc00)';
        }
    }
    if (pullLabel && !pullFailed) {
        if (pullProgress >= PULL_SWEET_MIN && pullProgress <= PULL_SWEET_MAX) {
            pullLabel.textContent = 'IN THE ZONE -- RELEASE E NOW!';
            pullLabel.style.color = '#00ff44';
        } else if (pullProgress > 0.4) {
            pullLabel.textContent = 'Almost to the green zone...';
            pullLabel.style.color = '#ffcc00';
        } else if (pullProgress > 0.1) {
            pullLabel.textContent = 'Keep pulling...';
            pullLabel.style.color = '#ff8800';
        } else {
            pullLabel.textContent = 'HOLD E TO PULL -- release in the green zone!';
            pullLabel.style.color = '#ff8800';
        }
    }
}

function completePull() {
    // Clean up UI
    if (pullOverlay && pullOverlay.parentNode) {
        pullOverlay.parentNode.removeChild(pullOverlay);
    }
    pullOverlay = null;
    pullBar = null;
    pullLabel = null;

    // Remove key listeners
    if (pullKeyHandler) document.removeEventListener('keydown', pullKeyHandler);
    if (pullKeyUpHandler) document.removeEventListener('keyup', pullKeyUpHandler);
    pullKeyHandler = null;
    pullKeyUpHandler = null;
    pullKeyHeld = false;
    pullActive = false;

    // Reset glucose scale before split
    if (glucoseModel) {
        glucoseModel.scale.set(1, 1, 1);
    }

    // NOW do the actual split
    splitMolecule(pullSceneRef, pullStationZ);
    import('../audioManager.js').then(({ createGameBoySound }) => {
        createGameBoySound(220, 0.4, 'sawtooth');
        setTimeout(() => createGameBoySound(110, 0.3, 'square'), 200);
    });
}

// ========================
// GLUCOSE MODEL MANAGEMENT
// ========================

function spawnGlucoseModel(scene, position) {
    if (glucoseModel) {
        scene.remove(glucoseModel);
    }
    glucoseModel = createHexagonalRing(1.2, 0.08, 0xffffff);
    // Start at player position -- it will follow the player in the update loop
    glucoseModel.position.set(player.position.x + 1.2, 2.2, player.position.z);
    glucoseModel.userData.baseY = 2.2;
    glucoseModel.userData.followPlayer = true;
    glucoseModel.userData.offsetX = 1.2; // Float to the right of the player
    glucoseModel.userData.offsetZ = 0;

    // "Glucose" label above the ring
    const label = createTextSprite('Glucose', { x: 0, y: 1.2, z: 0 }, { scale: 0.8 });
    glucoseModel.add(label);
    glucoseModel.userData.label = label;

    scene.add(glucoseModel);
    glyObjects.push(glucoseModel);
    moleculeStage = 'hexagon';
}

// No-op stub -- molecule follows the player now, no need to animate to stations
function moveGlucoseToStation(targetZ, duration) {
    // Intentionally empty
}

function attachPhosphateA(scene) {
    // Attach first phosphate to vertex 0 of the hexagonal ring (representing C6)
    if (!glucoseModel || phosphateA) return;
    const verts = glucoseModel.userData.vertices;
    if (!verts || verts.length === 0) return;
    const pos = verts[0].clone();
    pos.y += 0.1;
    phosphateA = createPhosphateSphere(pos);
    glucoseModel.add(phosphateA);

    // Add "C6" label near the phosphate
    const c6Label = createTextSprite('C6', { x: pos.x * 1.4, y: pos.y + 0.4, z: pos.z * 1.4 }, {
        scale: 0.35, textColor: 'rgba(255,180,80,0.9)',
    });
    glucoseModel.add(c6Label);

    // Update molecule label
    if (glucoseModel.userData.label) {
        glucoseModel.remove(glucoseModel.userData.label);
    }
    const label = createTextSprite('Glucose-6-P', { x: 0, y: 1.2, z: 0 }, { scale: 0.8 });
    glucoseModel.add(label);
    glucoseModel.userData.label = label;
    moleculeStage = 'hexagon-1p';
}

function morphToPentagon(scene) {
    // Replace the hexagonal ring with a pentagonal one, preserving phosphate
    if (!glucoseModel) return;
    const pos = glucoseModel.position.clone();
    const baseY = glucoseModel.userData.baseY;
    scene.remove(glucoseModel);

    glucoseModel = createPentagonalRing(1.1, 0.08, 0xffa07a);
    glucoseModel.position.copy(pos);
    glucoseModel.userData.baseY = baseY;
    glucoseModel.userData.followPlayer = true;
    glucoseModel.userData.offsetX = 1.2;
    glucoseModel.userData.offsetZ = 0;

    // Re-attach phosphateA (carbon 6) -- on the opposite side from the popped-out carbon
    const verts = glucoseModel.userData.vertices;
    const c6Pos = verts[3] || verts[Math.floor(verts.length / 2)]; // bottom of pentagon
    phosphateA = createPhosphateSphere(new THREE.Vector3(c6Pos.x * 1.5, 0.1, c6Pos.z * 1.5));
    glucoseModel.add(phosphateA);

    // Update label
    const label = createTextSprite('Fructose-6-P', { x: 0, y: 1.2, z: 0 }, { scale: 0.8 });
    glucoseModel.add(label);
    glucoseModel.userData.label = label;

    scene.add(glucoseModel);
    glyObjects.push(glucoseModel);
    moleculeStage = 'pentagon';
}

function attachPhosphateB(scene) {
    if (!glucoseModel || phosphateB) return;
    // Carbon 1 phosphate goes on the POPPED-OUT carbon (the one sticking out of the ring)
    const poppedCarbon = glucoseModel.userData.poppedCarbon;
    if (!poppedCarbon) return;
    const pos = poppedCarbon.clone();
    pos.y += 0.1;
    // Extend slightly beyond the popped carbon
    const dir = pos.clone().normalize();
    pos.add(dir.multiplyScalar(0.4));
    phosphateB = createPhosphateSphere(pos);
    glucoseModel.add(phosphateB);

    // Update label
    if (glucoseModel.userData.label) {
        glucoseModel.remove(glucoseModel.userData.label);
    }
    const label = createTextSprite('Fructose-1,6-BP', { x: 0, y: 1.2, z: 0 }, { scale: 0.75 });
    glucoseModel.add(label);
    glucoseModel.userData.label = label;
    moleculeStage = 'pentagon-2p';
}

function splitMolecule(scene, stationZ) {
    // THE BIG SPLIT: destroy the pentagon, create two triangle fragments
    if (!glucoseModel) return;
    const pos = glucoseModel.position.clone();

    // Remove the old model
    scene.remove(glucoseModel);
    phosphateA = null;
    phosphateB = null;

    // Create two triangle fragments -- start at split point, will follow player after fly-apart
    fragmentA = createTriangleFragment(0.6, 0.06, 0xff8c00, 'G3P');
    fragmentA.position.set(pos.x, pos.y, pos.z);
    scene.add(fragmentA);
    glyObjects.push(fragmentA);

    fragmentB = createTriangleFragment(0.6, 0.06, 0xffb347, 'DHAP');
    fragmentB.position.set(pos.x, pos.y, pos.z);
    scene.add(fragmentB);
    glyObjects.push(fragmentB);

    // Explosion particles at the split point
    const explosion = createSimpleParticleSystem(
        scene, 60, 0xff6600, 0.2, 5.0, 1.5,
        pos,
        new THREE.Vector3(1.5, 1.5, 1.5)
    );
    glyObjects.push(explosion);
    activeParticles.push(explosion);

    // Secondary flash particles (white)
    const flash = createSimpleParticleSystem(
        scene, 30, 0xffffff, 0.15, 4.0, 1.0,
        pos,
        new THREE.Vector3(0.5, 0.5, 0.5)
    );
    glyObjects.push(flash);
    activeParticles.push(flash);

    // Screen shake effect
    triggerScreenShake(0.5, 0.15);

    // Animate fragments bursting apart, then they'll follow the player via the update loop
    const startTime = performance.now();
    const aStart = pos.clone();
    const bStart = pos.clone();
    const aEnd = new THREE.Vector3(pos.x + 3, pos.y + 1, pos.z + 2);
    const bEnd = new THREE.Vector3(pos.x - 3, pos.y + 1, pos.z - 2);

    activeAnimations.push({
        id: 'splitApart',
        update: () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / 0.6, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            // Only control position during the burst -- after that the update loop takes over
            if (t < 1) {
                if (fragmentA) fragmentA.position.lerpVectors(aStart, aEnd, eased);
                if (fragmentB) fragmentB.position.lerpVectors(bStart, bEnd, eased);
            }
            return t >= 1;
        },
    });

    // Remove explosion particles after a bit
    setTimeout(() => {
        if (explosion.parent) scene.remove(explosion);
        if (flash.parent) scene.remove(flash);
        const idxE = activeParticles.indexOf(explosion);
        if (idxE > -1) activeParticles.splice(idxE, 1);
        const idxF = activeParticles.indexOf(flash);
        if (idxF > -1) activeParticles.splice(idxF, 1);
    }, 2000);

    glucoseModel = null;
    moleculeStage = 'split';
}

function convertDHAPToG3P(scene) {
    // Mirror effect: DHAP fragment becomes second G3P
    if (!fragmentB) return;
    const pos = fragmentB.position.clone();
    scene.remove(fragmentB);

    fragmentB = createTriangleFragment(0.6, 0.06, 0xff8c00, 'G3P');
    fragmentB.position.copy(pos);
    scene.add(fragmentB);
    glyObjects.push(fragmentB);
    moleculeStage = 'fragment';
}

function fadeOutFragments(scene) {
    // Remove fragment models during payoff (energy extracted)
    [fragmentA, fragmentB].forEach(frag => {
        if (frag && frag.parent) {
            scene.remove(frag);
        }
    });
    fragmentA = null;
    fragmentB = null;
}

function emitPayoffParticles(scene, position) {
    const particles = createSimpleParticleSystem(
        scene, 25, COLORS.energy, 0.12, 2.0, 2.0,
        position,
        new THREE.Vector3(1, 1, 1)
    );
    glyObjects.push(particles);
    activeParticles.push(particles);
    setTimeout(() => {
        if (particles.parent) scene.remove(particles);
        const idx = activeParticles.indexOf(particles);
        if (idx > -1) activeParticles.splice(idx, 1);
    }, 3000);
}

function emitSparkParticles(scene, position, color) {
    const sparks = createSimpleParticleSystem(
        scene, 20, color || 0xffaa00, 0.1, 3.0, 1.0,
        position,
        new THREE.Vector3(0.3, 0.3, 0.3)
    );
    glyObjects.push(sparks);
    activeParticles.push(sparks);
    setTimeout(() => {
        if (sparks.parent) scene.remove(sparks);
        const idx = activeParticles.indexOf(sparks);
        if (idx > -1) activeParticles.splice(idx, 1);
    }, 1500);
}

// Screen shake
let shakeRemaining = 0;
let shakeIntensity = 0;
function triggerScreenShake(duration, intensity) {
    shakeRemaining = duration;
    shakeIntensity = intensity;
}

// ========================
// INTERACTION HANDLER
// ========================

function handleStationInteract(idx, enzymeData, object, scene, tools) {
    const { showDialogue, showFeedback: feedback, setGameInteracting, playMoleculeGenerationSound, createGameBoySound } = tools;
    createGameBoySound(440, 0.1, 'sine');

    if (questState !== QUEST_FOR_ENZYME[idx]) {
        // Not the right time -- show contextual hint or greeting
        if (enzymeData.greeting) {
            showDialogue(enzymeData.greeting, [{ text: "Got it" }], setGameInteracting);
        } else {
            const stationTypeMsg = {
                workbench: "The workbench clamps are ready. Bring the right molecules.",
                vise: "The vise press looms overhead. Bring the molecule to squeeze it.",
                rack: "The splitting rack's hooks gleam. Not time yet.",
                mirror: "The mirror shimmers, waiting to convert twin molecules.",
                extractor: "The electron extractor hums quietly. Bring the fragments here when it's time to harvest.",
                popper: "The phosphate popper's chamber is empty. Not yet.",
                shifter: "The turntable waits, ready to reposition.",
                wringer: "The wringer's rollers are still. Bring the molecule when it's ready to compress.",
                launcher: "The launcher is primed. Bring PEP when you're ready for the grand finale.",
            };
            showDialogue(stationTypeMsg[enzymeData.stationType] || "Not time for this station yet.", [{ text: "OK" }], setGameInteracting);
        }
        return;
    }

    // Check inventory
    const inv = getInventory();
    const hasAll = enzymeData.input.every(item => inv[item] && inv[item] > 0);
    if (!hasAll) {
        const missing = enzymeData.input.filter(item => !inv[item] || inv[item] <= 0);
        showDialogue(`Need: ${missing.join(' + ')}`, [{ text: "OK" }], setGameInteracting);
        return;
    }

    // --- PERFORM THE TRANSFORMATION ---
    // Consume inputs
    for (const item of enzymeData.input) {
        removeFromInventory(item);
    }
    playMoleculeGenerationSound();

    // Grant outputs
    for (const item of enzymeData.output) {
        addToInventory(item);
    }

    // Visual transformation based on station index
    const stationPos = object.position.clone();
    stationPos.y = 1.4;

    switch (idx) {
        case 0: // Hexy -- attach first phosphate (timing mini-game)
            startPhosphateTiming(scene, 0, 'C6', 2.0, () => {
                attachPhosphateA(scene);
                emitSparkParticles(scene, glucoseModel ? glucoseModel.position.clone() : stationPos, COLORS.phosphate);
                createGameBoySound(550, 0.2, 'square');
            });
            break;

        case 1: // Izzy -- squeeze to pentagon
            if (glucoseModel) {
                // Quick squeeze animation then morph
                const squeezeStart = performance.now();
                const origScale = glucoseModel.scale.clone();
                let morphed = false;
                activeAnimations.push({
                    id: 'squeeze',
                    update: () => {
                        const elapsed = (performance.now() - squeezeStart) / 1000;
                        const t = Math.min(elapsed / 0.6, 1);
                        if (t < 0.4 && glucoseModel) {
                            // Squeeze: compress horizontally, expand depth
                            const s = 1 - t * 1.2;
                            glucoseModel.scale.set(Math.max(0.5, s), origScale.y, 1 + t * 0.5);
                        } else if (!morphed) {
                            // Pop! Morph to pentagon
                            morphed = true;
                            morphToPentagon(scene);
                            if (glucoseModel) {
                                emitSparkParticles(scene, glucoseModel.position.clone(), 0xffa07a);
                            }
                            createGameBoySound(330, 0.15, 'sawtooth');
                        }
                        return t >= 1;
                    },
                });
            } else {
                morphToPentagon(scene);
            }
            break;

        case 2: // Phil -- attach second phosphate (timing mini-game, faster spin)
            startPhosphateTiming(scene, 0, 'C1', 2.8, () => {
                attachPhosphateB(scene);
                emitSparkParticles(scene, glucoseModel ? glucoseModel.position.clone() : stationPos, COLORS.phosphate);
                createGameBoySound(660, 0.25, 'square');
                if (glucoseModel) {
                    glucoseModel.traverse(child => {
                        if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
                            const origIntensity = child.material.emissiveIntensity;
                            child.material.emissiveIntensity = 0.8;
                            setTimeout(() => { child.material.emissiveIntensity = origIntensity; }, 400);
                        }
                    });
                }
            });
            break;

        case 3: // Al -- THE SPLIT (enter pull mini-game)
            startPullMiniGame(scene, enzymeData.z);
            break;

        case 4: // Tim -- mirror convert DHAP to G3P
            convertDHAPToG3P(scene);
            if (fragmentB) {
                emitSparkParticles(scene, fragmentB.position.clone(), 0xffb347);
            }
            createGameBoySound(880, 0.1, 'sine');
            break;

        case 5: // Gary -- payoff starts, emit energy
            emitPayoffParticles(scene, stationPos);
            createGameBoySound(523, 0.15, 'sine');
            setTimeout(() => createGameBoySound(659, 0.15, 'sine'), 100);
            // Fade out fragments -- energy is being extracted
            fadeOutFragments(scene);
            break;

        case 6: // Peggy -- ATP produced
            emitPayoffParticles(scene, stationPos);
            emitSparkParticles(scene, stationPos, COLORS.atp);
            createGameBoySound(523, 0.15, 'sine');
            setTimeout(() => createGameBoySound(784, 0.15, 'sine'), 100);
            break;

        case 7: // Mutty -- phosphate shift
            emitSparkParticles(scene, stationPos, 0x66ccff);
            createGameBoySound(440, 0.1, 'sine');
            break;

        case 8: // Eno -- create PEP
            emitPayoffParticles(scene, stationPos);
            emitSparkParticles(scene, stationPos, 0x9999ff);
            createGameBoySound(660, 0.2, 'sine');
            break;

        case 9: // Pike -- grand finale
            emitPayoffParticles(scene, stationPos);
            emitSparkParticles(scene, stationPos, COLORS.atp);
            emitSparkParticles(scene, new THREE.Vector3(stationPos.x, stationPos.y + 1, stationPos.z), 0xff44ff);
            triggerScreenShake(0.3, 0.08);
            createGameBoySound(523, 0.1, 'sine');
            setTimeout(() => createGameBoySound(659, 0.1, 'sine'), 100);
            setTimeout(() => createGameBoySound(784, 0.1, 'sine'), 200);
            setTimeout(() => createGameBoySound(1047, 0.2, 'sine'), 300);
            break;
    }

    // Show feedback text
    feedback(enzymeData.feedback, 4000);

    // Advance quest
    if (idx === 9) {
        // Pike -- completion
        setTimeout(() => {
            questState = GLY_QUEST.COMPLETED;
            addAbility('glucose-handling');
            setWorldProgress('glycolysis', { completed: true });
            feedback("GLUCOSE HANDLING unlocked! You can now process carbohydrates in other pathways.", 6000);
        }, 500);
    } else {
        // Move to next enzyme, move glucose model if it exists
        questState = QUEST_FOR_ENZYME[idx + 1];
        const nextZ = ENZYMES[idx + 1].z;

        // Move the glucose model to the next station
        if (glucoseModel && idx < 3) {
            moveGlucoseToStation(nextZ, 1.2);
        }

        // Spawn any resources needed for next step
        spawnNextResources(idx + 1, scene);
    }
}

function spawnNextResources(nextIdx, scene) {
    const nextEnzyme = ENZYMES[nextIdx];
    const spawnZ = nextEnzyme.z + 4;

    // Spawn ATP if needed for Phil (index 2)
    if (nextIdx === 2) {
        spawnResource(scene, 'ATP', { x: -3, y: 0.5, z: spawnZ }, COLORS.atp);
    }
}

// ========================
// STATION CREATION
// ========================

function createEnzymeStations(scene) {
    for (let i = 0; i < ENZYMES.length; i++) {
        const data = ENZYMES[i];
        const x = PATHWAY_X;
        const z = data.z;

        // Get terrain height at this station
        const stationHeight = getGlyTerrainHeight(x, z);

        // Platform under each station (sits on the terrain)
        const platGeo = new THREE.BoxGeometry(PATHWAY_WIDTH - 2, 0.3, 4);
        const platMat = new THREE.MeshStandardMaterial({
            color: data.color, metalness: 0.2, roughness: 0.6,
            emissive: data.color, emissiveIntensity: 0.08,
        });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(x, stationHeight + 0.15, z);
        platform.receiveShadow = true;
        platform.castShadow = true;
        scene.add(platform);
        glyObjects.push(platform);

        // Station light
        const light = new THREE.PointLight(data.color, 0.4, 8);
        light.position.set(x, stationHeight + 3, z);
        scene.add(light);
        glyObjects.push(light);

        // Create the appropriate station type (pass terrain height)
        const sh = stationHeight;
        switch (data.stationType) {
            case 'workbench':
                createWorkbench(scene, data, x, z, sh);
                break;
            case 'vise':
                createVise(scene, data, x, z);
                break;
            case 'rack':
                createSplittingRack(scene, data, x, z);
                break;
            case 'mirror':
                createMirrorDevice(scene, data, x, z);
                break;
            case 'extractor':
                createExtractor(scene, data, x, z);
                break;
            case 'popper':
                createPopper(scene, data, x, z);
                break;
            case 'shifter':
                createShifter(scene, data, x, z);
                break;
            case 'wringer':
                createWringer(scene, data, x, z);
                break;
            case 'launcher':
                createLauncher(scene, data, x, z);
                break;
            case 'npc':
                createNPCStation(scene, data, x, z, i);
                break;
        }

        // Arrow to next station
        if (i < ENZYMES.length - 1) {
            const nextZ = ENZYMES[i + 1].z;
            const midZ = (z + nextZ) / 2;
            const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
            const arrowMat = new THREE.MeshStandardMaterial({
                color: data.color, emissive: data.color, emissiveIntensity: 0.3,
                transparent: true, opacity: 0.6,
            });
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            arrow.position.set(x, 0.5, midZ);
            arrow.rotation.x = Math.PI; // Point south
            scene.add(arrow);
            glyObjects.push(arrow);
        }
    }
}

// ========================
// TERRAIN, PORTAL, DECOR, LIGHTING (preserved from original)
// ========================

function createTerrain(scene) {
    // Height-mapped terrain: uphill during investment, peak at the split, downhill during payoff
    const terrainWidth = PATHWAY_WIDTH * 4;
    const terrainDepth = 170;
    const segsX = 40;
    const segsZ = 80;

    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segsX, segsZ);
    const verts = terrainGeo.attributes.position.array;

    // Apply height map and color per vertex
    const colors = new Float32Array(verts.length); // rgb per vertex
    for (let i = 0; i < verts.length; i += 3) {
        const localX = verts[i];
        const localZ = verts[i + 1]; // PlaneGeometry: x,y before rotation; y becomes z after rotation
        const worldZ = -25 + localZ; // center of the plane is at z=-25
        const worldX = localX;

        const h = getGlyTerrainHeight(worldX, worldZ);
        verts[i + 2] = h; // Set height (will become Y after rotation)

        // Color based on phase
        let r, g, b;
        if (worldZ > SPLIT_Z) {
            // Investment: reddish-brown, darker higher up
            const t = Math.max(0, (START_Z - worldZ) / (START_Z - SPLIT_Z));
            r = 0.24 - t * 0.08; g = 0.10 - t * 0.04; b = 0.10 - t * 0.04;
        } else if (worldZ > SPLIT_Z - 10) {
            // Split zone: amber
            r = 0.24; g = 0.18; b = 0.10;
        } else {
            // Payoff: greenish, brighter lower down
            const t = Math.max(0, (SPLIT_Z - worldZ) / (SPLIT_Z - END_Z));
            r = 0.10 + t * 0.02; g = 0.18 + t * 0.08; b = 0.10 + t * 0.02;
        }
        colors[i] = r;
        colors[i + 1] = g;
        colors[i + 2] = b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(PATHWAY_X, 0, -25);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    scene.add(terrain);
    glyObjects.push(terrain);

    // Path strip on top of the terrain (slightly raised)
    const pathGeo = new THREE.PlaneGeometry(PATHWAY_WIDTH * 0.8, terrainDepth, 4, segsZ);
    const pathVerts = pathGeo.attributes.position.array;
    for (let i = 0; i < pathVerts.length; i += 3) {
        const worldZ = -25 + pathVerts[i + 1];
        pathVerts[i + 2] = getGlyTerrainHeight(0, worldZ) + 0.05;
    }
    pathGeo.computeVertexNormals();
    const pathMat = new THREE.MeshStandardMaterial({ color: COLORS.path, roughness: 0.7, metalness: 0.1 });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(PATHWAY_X, 0, -25);
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);
    glyObjects.push(pathMesh);

    // Phase labels (positioned at terrain height)
    const labels = [
        { text: 'INVESTMENT PHASE', z: 42, color: 'rgba(255,150,150,0.5)' },
        { text: 'THE SPLIT', z: -5, color: 'rgba(255,220,150,0.5)' },
        { text: 'PAYOFF PHASE', z: -50, color: 'rgba(150,255,150,0.5)' },
    ];
    for (const l of labels) {
        const h = getGlyTerrainHeight(0, l.z);
        const label = createTextSprite(l.text, { x: PATHWAY_X - PATHWAY_WIDTH, y: h + 3, z: l.z }, {
            scale: 1.8, textColor: l.color,
        });
        scene.add(label);
        glyObjects.push(label);
    }

    // Background terrain (flat, far below)
    const bgGeo = new THREE.PlaneGeometry(400, 400);
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x1a0f00, roughness: 1, fog: true });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = -2;
    bg.receiveShadow = true;
    scene.add(bg);
    glyObjects.push(bg);
}

function createPortalToTCA(scene) {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 55);

    const ringGeo = new THREE.TorusGeometry(2, 0.25, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff, emissive: 0x0066cc, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 2;
    portalGroup.add(ring);

    const innerGeo = new THREE.CircleGeometry(1.8, 16);
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff, emissive: 0x0066cc, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 2;
    portalGroup.add(inner);

    const label = createTextSprite('TCA Crossroads', { x: 0, y: 4.5, z: 0 }, { scale: 1.3 });
    portalGroup.add(label);

    const light = new THREE.PointLight(0x00aaff, 0.8, 10);
    light.position.set(0, 2, 0);
    portalGroup.add(light);

    scene.add(portalGroup);
    glyObjects.push(portalGroup);

    portalGroup.userData = {
        name: 'Portal to TCA Crossroads', type: 'portal', isInteractable: true,
        onInteract: (obj, scn, tools) => {
            const { showDialogue, setGameInteracting } = tools;
            showDialogue("Return to the TCA Central Crossroads?", [
                { text: "Travel back", action: () => transitionTo('tca-cycle', { x: 0, y: 0.5, z: -45 }) },
                { text: "Stay here" },
            ], setGameInteracting);
        },
    };
    interactiveObjects.push(portalGroup);
    originalMaterials.set(ring, ring.material);
    portalGroup.userData.mainMesh = ring;
}

function createDecorations(scene) {
    for (let z = 45; z >= -100; z -= 15) {
        for (const side of [-1, 1]) {
            const x = side * (PATHWAY_WIDTH / 2 + 2);
            const th = getGlyTerrainHeight(x, z);
            const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 6);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(x, th + 1.25, z);
            pillar.castShadow = true;
            scene.add(pillar);
            glyObjects.push(pillar);

            const flameGeo = new THREE.ConeGeometry(0.2, 0.5, 5);
            const isPayoff = z < -30;
            const flameColor = isPayoff ? 0x00ff66 : 0xff6600;
            const flameMat = new THREE.MeshStandardMaterial({
                color: flameColor, emissive: flameColor, emissiveIntensity: 0.7,
                transparent: true, opacity: 0.85,
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(x, th + 2.8, z);
            flame.userData.isFlame = true;
            scene.add(flame);
            glyObjects.push(flame);

            const torchLight = new THREE.PointLight(flameColor, 0.3, 8);
            torchLight.position.set(x, 2.8, z);
            scene.add(torchLight);
            glyObjects.push(torchLight);
        }
    }

    const investSign = createTextSprite('Cost: 2 ATP', { x: -PATHWAY_WIDTH, y: 2, z: 20 }, {
        scale: 1.5, textColor: 'rgba(255, 100, 100, 0.8)',
    });
    scene.add(investSign);
    glyObjects.push(investSign);

    const payoffSign = createTextSprite('Earn: 4 ATP + 2 NADH', { x: -PATHWAY_WIDTH, y: 2, z: -60 }, {
        scale: 1.5, textColor: 'rgba(100, 255, 100, 0.8)',
    });
    scene.add(payoffSign);
    glyObjects.push(payoffSign);
}

function createPPPBranchPath(scene) {
    // The Pentose Phosphate Pathway branches off at Glucose-6-Phosphate (after Hexy)
    // and reconnects at Fructose-6-P (Izzy) and G3P (after the split)
    // Show this as a visible side path with a "coming soon" portal

    const branchZ = (ENZYMES[0].z + ENZYMES[1].z) / 2; // Between Hexy and Izzy
    const branchX = -PATHWAY_WIDTH / 2 - 4;

    // Side path ground
    const sidePathGeo = new THREE.PlaneGeometry(6, 4);
    const sidePathMat = new THREE.MeshStandardMaterial({ color: 0x2a1a3d, roughness: 0.8 });
    const sidePath = new THREE.Mesh(sidePathGeo, sidePathMat);
    sidePath.rotation.x = -Math.PI / 2;
    sidePath.position.set(branchX, 0.02, branchZ);
    scene.add(sidePath);
    glyObjects.push(sidePath);

    // Connecting path strip from main pathway to side path
    const connGeo = new THREE.PlaneGeometry(4, 1.5);
    const conn = new THREE.Mesh(connGeo, sidePathMat);
    conn.rotation.x = -Math.PI / 2;
    conn.position.set(-PATHWAY_WIDTH / 2 - 1, 0.015, branchZ);
    scene.add(conn);
    glyObjects.push(conn);

    // Portal ring (locked/coming soon)
    const portalGeo = new THREE.TorusGeometry(1.2, 0.15, 8, 16);
    const portalMat = new THREE.MeshStandardMaterial({
        color: 0x9966cc,
        emissive: 0x6633aa,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.6,
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(branchX, 1.5, branchZ);
    portal.rotation.y = Math.PI / 2;
    scene.add(portal);
    glyObjects.push(portal);

    // Label
    const label = createTextSprite('Pentose Phosphate\nPathway', { x: branchX, y: 3.2, z: branchZ }, {
        scale: 1.0, textColor: 'rgba(180, 140, 255, 0.8)',
    });
    scene.add(label);
    glyObjects.push(label);

    // "Branches from G6P" sublabel
    const subLabel = createTextSprite('branches from G6P', { x: branchX, y: 0.5, z: branchZ + 2.5 }, {
        scale: 0.6, textColor: 'rgba(180, 140, 255, 0.5)',
    });
    scene.add(subLabel);
    glyObjects.push(subLabel);

    // Arrow from main path to side path
    const arrowGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
    const arrowMat = new THREE.MeshStandardMaterial({
        color: 0x9966cc, emissive: 0x6633aa, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.6,
    });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(-PATHWAY_WIDTH / 2 - 0.5, 0.4, branchZ);
    arrow.rotation.z = Math.PI / 2; // Point left
    scene.add(arrow);
    glyObjects.push(arrow);

    // Light
    const light = new THREE.PointLight(0x9966cc, 0.4, 6);
    light.position.set(branchX, 2, branchZ);
    scene.add(light);
    glyObjects.push(light);

    // Make it interactive with a "coming soon" message
    portal.userData = {
        name: 'Pentose Phosphate Pathway',
        type: 'portal',
        isInteractable: true,
        onInteract: (obj, scn, tools) => {
            const { showDialogue, setGameInteracting } = tools;
            showDialogue("The Pentose Phosphate Pathway branches off right here -- from Glucose-6-Phosphate.\n\nIt produces NADPH (for biosynthesis) and Ribose-5-Phosphate (for nucleotides). Its intermediates feed back into glycolysis at Fructose-6-P and G3P.\n\nThis world is under construction!", [
                { text: "Can't wait to explore it!" }
            ], setGameInteracting);
        },
    };
    interactiveObjects.push(portal);
    originalMaterials.set(portal, portal.material);
    portal.userData.mainMesh = portal;
}

function createLighting(scene) {
    const warmLight = new THREE.DirectionalLight(0xffcc88, 0.5);
    warmLight.position.set(10, 20, 10);
    warmLight.castShadow = true;
    warmLight.shadow.mapSize.width = 1024;
    warmLight.shadow.mapSize.height = 1024;
    warmLight.userData.worldSpecific = true;
    scene.add(warmLight);
    glyObjects.push(warmLight);

    const hemi = new THREE.HemisphereLight(0xffaa66, 0x221100, 0.3);
    hemi.userData.worldSpecific = true;
    scene.add(hemi);
    glyObjects.push(hemi);
}

function spawnResource(scene, name, position, color) {
    createResource(scene, name, position, color, { worldId: 'glycolysis' });
}

// ========================
// INIT
// ========================

export function init(scene) {
    worldScene = scene;
    glyObjects = [];
    glyNPCs = [];
    activeAnimations = [];
    activeParticles = [];
    glucoseModel = null;
    fragmentA = null;
    fragmentB = null;
    phosphateA = null;
    phosphateB = null;
    moleculeStage = 'none';
    shakeRemaining = 0;
    questState = GLY_QUEST.NOT_STARTED;

    createTerrain(scene);
    createEnzymeStations(scene);
    createPortalToTCA(scene);
    createDecorations(scene);
    createPPPBranchPath(scene);
    createLighting(scene);

    // Opening narrative
    setTimeout(() => {
        const setInteracting = (state) => setGameState({ isUserInteracting: state });
        const showDialogue = (text, options, cb) => {
            import('../uiManager.js').then(({ showDialogue: sd }) => sd(text, options, cb));
        };

        showDialogue("Before you sits a molecule of GLUCOSE -- a six-sided sugar ring, six carbons in a loop. Stable. Stubborn. The energy locked inside could power thousands of reactions.\n\nBut that ring does NOT want to break.", [
            { text: "How do we break it?", hideOnClick: false, action: () => {
                showDialogue("The plan: strap sticks of dynamite -- high-energy phosphates from ATP -- onto carbon 6 and then carbon 1. Both ends of the chain. Then squeeze it, reshape it, and RIP IT APART between the phosphates.\n\nCollect the Glucose and 2 ATP ahead. Then bring them to Hexy's Workbench.", [
                    { text: "Let's do this.", action: () => {
                        questState = GLY_QUEST.COLLECT_GLUCOSE;
                        spawnResource(worldScene, 'Glucose', { x: -3, y: 0.5, z: 45 }, COLORS.glucose);
                        spawnResource(worldScene, 'ATP', { x: 3, y: 0.5, z: 45 }, COLORS.atp);
                        spawnResource(worldScene, 'ATP', { x: 5, y: 0.5, z: 43 }, COLORS.atp);
                    }}
                ], setInteracting);
            }}
        ], setInteracting);
    }, 1500);
}

// ========================
// UPDATE
// ========================

export function update(delta, elapsedTime) {
    if (!worldScene) return;

    // Animate flames
    for (const obj of glyObjects) {
        if (obj.userData && obj.userData.isFlame) {
            obj.scale.y = 1 + Math.sin(elapsedTime * 5 + obj.position.x + obj.position.z) * 0.2;
        }
    }

    // NPC idle sway
    for (const npc of glyNPCs) {
        if (npc.children[0]) {
            npc.children[0].position.y = 0.8 + Math.sin(elapsedTime * 1.5 + npc.position.z) * 0.02;
        }
    }

    // Glucose model follows the player (floats beside/above them)
    if (glucoseModel) {
        const targetX = player.position.x + (glucoseModel.userData.offsetX || 1.2);
        const targetZ = player.position.z + (glucoseModel.userData.offsetZ || 0);
        const baseY = glucoseModel.userData.baseY || 2.2;
        // Smooth follow with a slight lag for a bouncy/comedic feel
        glucoseModel.position.x += (targetX - glucoseModel.position.x) * 0.08;
        glucoseModel.position.z += (targetZ - glucoseModel.position.z) * 0.08;
        glucoseModel.position.y = baseY + Math.sin(elapsedTime * 1.2) * 0.15;
        // Don't override rotation during timing mini-game (it has its own spin)
        if (!phosphateTimingActive) {
            glucoseModel.rotation.y = elapsedTime * 0.3;
        }
    }

    // Fragments follow the player (one on each side, like tiny companions)
    if (fragmentA) {
        const targetX = player.position.x + 1.0;
        const targetZ = player.position.z + 0.5;
        fragmentA.position.x += (targetX - fragmentA.position.x) * 0.07;
        fragmentA.position.z += (targetZ - fragmentA.position.z) * 0.07;
        fragmentA.position.y = 2.0 + Math.sin(elapsedTime * 1.5) * 0.1;
        fragmentA.rotation.y = elapsedTime * 0.4;
    }
    if (fragmentB) {
        const targetX = player.position.x - 1.0;
        const targetZ = player.position.z - 0.5;
        fragmentB.position.x += (targetX - fragmentB.position.x) * 0.06;
        fragmentB.position.z += (targetZ - fragmentB.position.z) * 0.06;
        fragmentB.position.y = 2.0 + Math.sin(elapsedTime * 1.5 + 1) * 0.1;
        fragmentB.rotation.y = -elapsedTime * 0.4;
    }

    // Phosphate glow pulse
    if (phosphateA) {
        phosphateA.traverse(child => {
            if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined && child.userData.isPhosphate === undefined) {
                child.material.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 3) * 0.2;
            }
        });
    }
    if (phosphateB) {
        phosphateB.traverse(child => {
            if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined && child.userData.isPhosphate === undefined) {
                child.material.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 3 + Math.PI) * 0.2;
            }
        });
    }

    // Animate dynamite on workbench
    for (const obj of glyObjects) {
        if (obj.traverse) {
            obj.traverse(child => {
                if (child.userData && child.userData.isDynamite) {
                    child.material.emissiveIntensity = 0.3 + Math.sin(elapsedTime * 4) * 0.2;
                }
                if (child.userData && child.userData.isMirror) {
                    child.material.opacity = 0.5 + Math.sin(elapsedTime * 2) * 0.2;
                }
                if (child.userData && child.userData.isTurntable) {
                    child.rotation.y = elapsedTime * 0.5;
                }
                if (child.userData && child.userData.isWaterDrop) {
                    child.position.y = -0.1 - ((elapsedTime * 0.5 + child.position.x * 10) % 0.5);
                    child.material.opacity = 0.6 - child.position.y * -0.5;
                }
            });
        }
    }

    // Mini-games
    updatePhosphateTiming(delta, elapsedTime);
    updatePullMiniGame(delta);

    // Process animations
    for (let i = activeAnimations.length - 1; i >= 0; i--) {
        const done = activeAnimations[i].update();
        if (done) activeAnimations.splice(i, 1);
    }

    // Screen shake
    if (shakeRemaining > 0) {
        shakeRemaining -= delta;
        const cam = worldScene.getObjectByProperty('isCamera', true);
        if (cam) {
            cam.position.x += (Math.random() - 0.5) * shakeIntensity;
            cam.position.y += (Math.random() - 0.5) * shakeIntensity * 0.5;
        }
    }

    // Terrain following -- player follows the hill terrain
    const terrainY = getGlyTerrainHeight(player.position.x, player.position.z) + 0.01;
    if (player.userData.verticalVelocity && player.userData.verticalVelocity > 0) {
        // Jumping
        player.position.y += player.userData.verticalVelocity;
        player.userData.verticalVelocity -= 0.02;
        if (player.position.y <= terrainY) {
            player.position.y = terrainY;
            player.userData.verticalVelocity = 0;
        }
    } else if (player.position.y > terrainY + 0.1) {
        // Falling
        if (!player.userData.verticalVelocity) player.userData.verticalVelocity = 0;
        player.userData.verticalVelocity -= 0.02;
        player.position.y += player.userData.verticalVelocity;
        if (player.position.y <= terrainY) {
            player.position.y = terrainY;
            player.userData.verticalVelocity = 0;
        }
    } else {
        // Smooth terrain following
        player.position.y += (terrainY - player.position.y) * 0.15;
        player.userData.verticalVelocity = 0;
    }

    // Health regen
    if (getHealth() < 100) healHealth(2 * delta);

    // Auto-collect resources
    for (let i = interactiveObjects.length - 1; i >= 0; i--) {
        const obj = interactiveObjects[i];
        if (obj.userData && obj.userData.type === 'resource' && obj.userData.worldId === 'glycolysis') {
            if (player.position.distanceTo(obj.position) < 2) {
                const name = obj.userData.name;
                addToInventory(name);
                if (obj.parent) obj.parent.remove(obj);
                interactiveObjects.splice(i, 1);

                const advanced = handleGlyResourceCollected(name);
                if (!advanced) {
                    showFeedback(`Collected ${name}!`, 2000);
                }
            }
        }
    }

    updateInteraction(worldScene);
    updateGlyQuestUI();
}

function handleGlyResourceCollected(name) {
    if (questState === GLY_QUEST.COLLECT_GLUCOSE) {
        const inv = getInventory();
        // Spawn the hexagonal ring as soon as glucose is picked up
        if (name === 'Glucose' && !glucoseModel) {
            spawnGlucoseModel(worldScene, { x: player.position.x, y: 0, z: player.position.z });
        }
        // Check if we have everything to advance
        if (inv['Glucose'] && inv['ATP'] >= 2) {
            questState = GLY_QUEST.VISIT_HEXY;
            showFeedback("Glucose + 2 ATP ready! Bring them to Hexy's Workbench to strap the first phosphate onto carbon 6.", 4000);
            return true;
        } else if (inv['Glucose'] && (!inv['ATP'] || inv['ATP'] < 2)) {
            showFeedback("You're carrying glucose -- collect 2 ATP to begin.", 2000);
            return true;
        } else if (inv['ATP'] && !inv['Glucose']) {
            showFeedback(`${inv['ATP']} ATP collected -- now find the Glucose!`, 2000);
            return true;
        }
    }
    return false;
}

function updateGlyQuestUI() {
    const questName = document.getElementById('questName');
    const questObjective = document.getElementById('questObjective');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (questName) questName.textContent = 'Glycolysis';

    const states = Object.keys(GLY_QUEST);
    const currentKey = Object.keys(GLY_QUEST).find(k => GLY_QUEST[k] === questState);
    const progress = Math.round((states.indexOf(currentKey) / (states.length - 1)) * 100);
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;

    const objectives = {
        [GLY_QUEST.NOT_STARTED]: 'Explore the Glycolysis Gauntlet',
        [GLY_QUEST.COLLECT_GLUCOSE]: 'Collect Glucose and 2 ATP near the entrance',
        [GLY_QUEST.VISIT_HEXY]: 'Bring Glucose + ATP to the Workbench -- strap on the first phosphate',
        [GLY_QUEST.VISIT_IZZY]: 'Bring Glucose-6-P to the Vise -- squeeze the ring!',
        [GLY_QUEST.VISIT_PHIL]: 'Bring Fructose-6-P + ATP to Phil -- the committed step!',
        [GLY_QUEST.VISIT_AL]: 'Bring Fructose-1,6-BP to the Splitting Rack -- rip it apart!',
        [GLY_QUEST.VISIT_TIM]: 'Bring DHAP to the Mirror -- convert the twin',
        [GLY_QUEST.VISIT_GARY]: 'Bring G3P to Gary -- payoff begins!',
        [GLY_QUEST.VISIT_PEGGY]: 'Bring 1,3-BPG to Peggy -- first ATP earned!',
        [GLY_QUEST.VISIT_MUTTY]: 'Bring 3-PG to Mutty -- reposition the phosphate',
        [GLY_QUEST.VISIT_ENO]: 'Bring 2-PG to Eno -- load the energy cannon',
        [GLY_QUEST.VISIT_PIKE]: 'Bring PEP to Pike -- the grand finale!',
        [GLY_QUEST.COMPLETED]: 'Glycolysis mastered! Glucose Handling unlocked!',
    };
    if (questObjective) questObjective.textContent = objectives[questState] || '';
}

// ========================
// CLEANUP
// ========================

export function cleanup(scene) {
    for (const obj of glyObjects) {
        if (obj.parent) obj.parent.remove(obj);
        if (obj.traverse) {
            obj.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }
    for (let i = interactiveObjects.length - 1; i >= 0; i--) {
        if (glyNPCs.includes(interactiveObjects[i]) || glyObjects.includes(interactiveObjects[i])) {
            interactiveObjects.splice(i, 1);
        }
    }
    glyObjects = [];
    glyNPCs = [];
    activeAnimations = [];
    activeParticles = [];
    glucoseModel = null;
    fragmentA = null;
    fragmentB = null;
    phosphateA = null;
    phosphateB = null;
    moleculeStage = 'none';
    shakeRemaining = 0;
    // Clean up phosphate timing mini-game
    if (phosphateTimingOverlay && phosphateTimingOverlay.parentNode) phosphateTimingOverlay.parentNode.removeChild(phosphateTimingOverlay);
    phosphateTimingOverlay = null; phosphateTimingActive = false;
    if (phosphateTimingKeyHandler) document.removeEventListener('keydown', phosphateTimingKeyHandler, true);
    phosphateTimingKeyHandler = null;
    // Clean up pull mini-game
    if (pullOverlay && pullOverlay.parentNode) pullOverlay.parentNode.removeChild(pullOverlay);
    pullOverlay = null; pullBar = null; pullLabel = null;
    if (pullKeyHandler) document.removeEventListener('keydown', pullKeyHandler);
    if (pullKeyUpHandler) document.removeEventListener('keyup', pullKeyUpHandler);
    pullActive = false; pullProgress = 0; pullKeyHeld = false;
    worldScene = null;
}

// js/worlds/glycolysisWorld.js
// The Glycolysis Gauntlet -- a linear pathway from Glucose to Pyruvate

import * as THREE from 'three';
import { createTextSprite } from '../utils.js';
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
    skyColor: 0x2d1b00,       // Warm dark brown sky
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

// --- Enzyme Data ---
// Stations are placed linearly from north (z=40) to south (z=-100)
const ENZYMES = [
    {
        name: 'Hexy (Hexokinase)', shortName: 'Hexy',
        enzyme: 'Hexokinase', z: 30, color: 0xff6b6b, bodyColor: 0xcc4444,
        phase: 'investment',
        reaction: 'Glucose + ATP -> Glucose-6-Phosphate + ADP',
        greeting: "See that glucose? Beautiful six-sided ring. Incredibly stable. The energy locked inside it could power the whole cell -- but good luck getting it out. That ring does NOT want to break.",
        questDialogue: "Here's what we do. We take a stick of dynamite -- a high-energy phosphate from ATP -- and we strap it onto one end of the glucose. *CLICK*\n\nThere. Glucose-6-Phosphate. Now that glucose can't escape the cell, and we've started destabilizing it. One stick of dynamite attached... let's see if it's enough.",
        questResult: "...nothing. The glucose just sits there with its stick of dynamite, still in its stubborn six-sided ring. One phosphate wasn't enough. We need a new approach.",
        input: ['Glucose', 'ATP'], output: ['Glucose-6-P'],
    },
    {
        name: 'Izzy (PGI)', shortName: 'Izzy',
        enzyme: 'Phosphoglucose Isomerase', z: 16, color: 0xffa07a, bodyColor: 0xcc7755,
        phase: 'investment',
        reaction: 'Glucose-6-P -> Fructose-6-P',
        greeting: "That dynamite didn't crack it? Not surprising. That six-sided ring is tough. But watch this -- I have strong hands.",
        questDialogue: "Give me that glucose-6-phosphate. I'm going to SQUEEZE it. Really hard.\n\n*SQUEEZE*\n\nSee that? One of the carbons just popped out of the ring! We went from a six-sided ring to a five-sided ring. It's now Fructose-6-Phosphate.\n\n...but it's STILL a ring. Still holding together. We need more firepower.",
        questResult: "A five-sided ring now, but still intact. Frustrating. We need to try something bigger.",
        input: ['Glucose-6-P'], output: ['Fructose-6-P'],
    },
    {
        name: 'Phil the Frustrator (PFK-1)', shortName: 'Phil',
        enzyme: 'Phosphofructokinase-1', z: 2, color: 0xff4444, bodyColor: 0xaa2222,
        phase: 'investment',
        reaction: 'Fructose-6-P + ATP -> Fructose-1,6-BP + ADP',
        greeting: "I'm Phil. PFK-1. I'm the gatekeeper -- the RATE-LIMITING STEP. Nothing happens without my say-so. I'm regulated by everything: ATP, AMP, citrate... I decide whether we commit to breaking this sugar or not.",
        questDialogue: "One stick of dynamite didn't work? Fine. Let's double up.\n\nI'm going to strap a SECOND stick of dynamite onto the OTHER end of the molecule. Carbon 1 has a phosphate, carbon 6 has a phosphate. That's Fructose-1,6-bisphosphate.\n\nThis is the POINT OF NO RETURN. After me, there's no going back. We're committed to breaking this sugar open. Hand me that last ATP.",
        questResult: "Two sticks of dynamite. One on each end. The molecule is primed... but it's STILL holding together. Time for brute force.",
        input: ['Fructose-6-P', 'ATP'], output: ['Fructose-1,6-BP'],
    },
    {
        name: 'Al (Aldolase)', shortName: 'Al',
        enzyme: 'Aldolase', z: -12, color: 0xff8c00, bodyColor: 0xcc6600,
        phase: 'split',
        reaction: 'Fructose-1,6-BP -> DHAP + G3P',
        greeting: "Two sticks of dynamite and the sugar's STILL in one piece? Hand it here. I don't do subtle.",
        questDialogue: "Squeezing didn't work. Dynamite didn't work. So this time, we PULL.\n\nI grab one phosphate with my left hand, the other phosphate with my right hand, and I PULL with everything I've got --\n\n*CRACK!*\n\nTHE GLUCOSE BREAKS IN HALF! Two 3-carbon pieces! G3P and DHAP -- each one still carrying a stick of dynamite.\n\nFrom here on, everything happens TWICE. You broke one 6-carbon sugar into two 3-carbon fragments. The investment phase is OVER.",
        questResult: "FINALLY! The glucose is in pieces! Two 3-carbon fragments, each with one phosphate. Now we can start extracting the energy.",
        input: ['Fructose-1,6-BP'], output: ['DHAP', 'G3P'],
    },
    {
        name: 'Tim (TPI)', shortName: 'Tim',
        enzyme: 'Triose Phosphate Isomerase', z: -24, color: 0xffb347, bodyColor: 0xcc8833,
        phase: 'split',
        reaction: 'DHAP -> G3P',
        greeting: "Those two fragments -- G3P and DHAP -- they're almost identical. Three carbons, one phosphate each. So similar they can become each other.",
        questDialogue: "DHAP and G3P are like fraternal twins -- almost the same molecule. I can convert one into the other instantly.\n\nI'm called 'catalytically perfect' because I work as fast as molecules can physically bump into me. No enzyme in glycolysis is faster.\n\nThe name 'triose phosphate' means 3-carbon ('tri-ose') molecule with a phosphate. That's what both G3P and DHAP are.",
        questResult: "Now you have two G3P molecules. Two identical fragments, ready for the payoff phase. This is where you start earning energy BACK.",
        input: ['DHAP'], output: ['G3P'],
    },
    {
        name: 'Gary (GAPDH)', shortName: 'Gary',
        enzyme: 'G3P Dehydrogenase', z: -38, color: 0x00cc66, bodyColor: 0x009944,
        phase: 'payoff',
        reaction: 'G3P + NAD+ + Pi -> 1,3-BPG + NADH (x2)',
        greeting: "Welcome to the PAYOFF PHASE. You spent 2 ATP breaking glucose apart. Now it's time to earn it back -- and then some.",
        questDialogue: "Here's where we start harvesting energy from the wreckage.\n\nI pull electrons off the G3P fragments and hand them to NAD+, making NADH -- that's stored energy that'll be worth ATP later in the electron transport chain.\n\nI also attach ANOTHER phosphate, giving you 1,3-BPG -- a molecule with TWO high-energy phosphates. Remember, this happens TWICE because you have two fragments.",
        questResult: "First energy harvest! 2 NADH produced (one per fragment). And each fragment now carries two phosphates -- loaded with transferable energy.",
        input: ['G3P'], output: ['1,3-BPG', 'NADH'],
    },
    {
        name: 'Peggy (PGK)', shortName: 'Peggy',
        enzyme: 'Phosphoglycerate Kinase', z: -52, color: 0x00ff88, bodyColor: 0x00cc66,
        phase: 'payoff',
        reaction: '1,3-BPG + ADP -> 3-PG + ATP (x2)',
        greeting: "1,3-BPG has TWO phosphates. One of them is incredibly high-energy. I'm going to rip it off and use it to make ATP.",
        questDialogue: "This is SUBSTRATE-LEVEL PHOSPHORYLATION -- I transfer a phosphate directly from the substrate to ADP, making ATP. No mitochondria needed, no electron transport chain. Just raw, direct energy transfer.\n\nThis happens twice (one per fragment), so you get 2 ATP here. That's your investment PAID BACK -- you spent 2 ATP earlier, and now you've earned 2 ATP. We're break-even. Everything from here is PROFIT.",
        questResult: "Break even! 2 ATP earned, 2 ATP spent. But we're not done -- there's more energy to extract.",
        input: ['1,3-BPG'], output: ['3-PG', 'ATP'],
    },
    {
        name: 'Mutty (PGM)', shortName: 'Mutty',
        enzyme: 'Phosphoglycerate Mutase', z: -64, color: 0x66ccff, bodyColor: 0x4499cc,
        phase: 'payoff',
        reaction: '3-PG -> 2-PG (x2)',
        greeting: "Still one phosphate left on each fragment. But it's in the wrong position to release its energy. I need to move it.",
        questDialogue: "I shift the phosphate from carbon 3 to carbon 2. Doesn't sound like much, but it's essential -- it sets up the next reaction where Eno will create a HIGH-ENERGY bond.\n\nThink of it like repositioning a lever before you pull it.",
        questResult: "Phosphate repositioned. The stage is set for Eno to create something special.",
        input: ['3-PG'], output: ['2-PG'],
    },
    {
        name: 'Eno (Enolase)', shortName: 'Eno',
        enzyme: 'Enolase', z: -78, color: 0x9999ff, bodyColor: 0x6666cc,
        phase: 'payoff',
        reaction: '2-PG -> PEP + H2O (x2)',
        greeting: "Watch carefully. I'm about to create the most energetically loaded molecule in all of common metabolism.",
        questDialogue: "I remove a water molecule from 2-PG and create PEP -- Phosphoenolpyruvate.\n\nPEP has the HIGHEST phosphoryl transfer potential of any common metabolite. That phosphate bond is like a compressed spring -- absolutely BURSTING with energy, just waiting to be released.\n\nI'm loading the cannon. Pike gets to fire it.",
        questResult: "The spring is loaded. PEP is primed to release a massive amount of energy. One more step to go!",
        input: ['2-PG'], output: ['PEP'],
    },
    {
        name: 'Pike (Pyruvate Kinase)', shortName: 'Pike',
        enzyme: 'Pyruvate Kinase', z: -92, color: 0xff44ff, bodyColor: 0xcc22cc,
        phase: 'payoff',
        reaction: 'PEP + ADP -> Pyruvate + ATP (x2)',
        greeting: "This is it. The GRAND FINALE. That loaded spring Eno created? I'm about to release it.",
        questDialogue: "I rip the phosphate off PEP and slam it onto ADP -- making ATP!\n\nThis happens twice (one per fragment), giving you 2 MORE ATP. That's 4 ATP total earned, minus 2 ATP invested = NET GAIN of 2 ATP.\n\nPlus you've got 2 NADH and 2 Pyruvate. The pyruvate heads to Percy in the TCA Cycle to become Acetyl-CoA and keep the energy flowing.\n\nYou just broke glucose in half and extracted its energy. THAT is glycolysis.",
        questResult: "GLYCOLYSIS COMPLETE! From one glucose: 2 ATP (net) + 2 NADH + 2 Pyruvate. The pyruvate continues to the TCA Cycle!",
        input: ['PEP'], output: ['Pyruvate', 'ATP'],
    },
];

// --- Colors ---
const COLORS = {
    investmentGround: 0x3d1a1a,    // Dark red-brown (spending ATP)
    payoffGround: 0x1a3d1a,        // Dark green (earning ATP)
    splitGround: 0x3d3d1a,         // Dark amber (the split point)
    path: 0x554433,                // Brown stone
    atp: 0xffdd00,
    nadh: 0x00ff88,
    glucose: 0xffffff,
};

// --- State ---
let worldScene = null;
let glyObjects = [];
let glyNPCs = [];
let questState = GLY_QUEST.NOT_STARTED;

const PATHWAY_X = 0;
const PATHWAY_WIDTH = 12;

// --- Init ---
export function init(scene) {
    worldScene = scene;
    glyObjects = [];
    glyNPCs = [];
    questState = GLY_QUEST.NOT_STARTED;

    createTerrain(scene);
    createEnzymeStations(scene);
    createPortalToTCA(scene);
    createDecorations(scene);
    createLighting(scene);

    // Opening narrative
    setTimeout(() => {
        const setInteracting = (state) => setGameState({ isUserInteracting: state });
        const showDialogue = (text, options, cb) => {
            import('../uiManager.js').then(({ showDialogue: sd }) => sd(text, options, cb));
        };

        showDialogue("You stand before a single molecule of GLUCOSE -- a six-sided sugar ring, deceptively simple, incredibly stable.\n\nLocked inside it is enough energy to power thousands of cellular reactions. But that ring does NOT want to break.", [
            { text: "How do we break it?", hideOnClick: false, action: () => {
                showDialogue("That's the challenge. You'll need to invest energy FIRST -- spend 2 ATP as 'sticks of dynamite' to destabilize the ring. Strap one phosphate on each end, then rip it apart.\n\nOnly THEN can you harvest the energy inside.\n\nCollect the Glucose and 2 ATP ahead to begin.", [
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

// --- Terrain ---
function createTerrain(scene) {
    // Long rectangular pathway from north to south
    // Investment phase (north) is red-tinted, payoff phase (south) is green-tinted
    const sections = [
        { z: 30, depth: 40, color: COLORS.investmentGround, label: 'INVESTMENT PHASE', labelZ: 42 },
        { z: -10, depth: 30, color: COLORS.splitGround, label: 'THE SPLIT', labelZ: -5 },
        { z: -55, depth: 70, color: COLORS.payoffGround, label: 'PAYOFF PHASE', labelZ: -40 },
    ];

    for (const sec of sections) {
        const geo = new THREE.PlaneGeometry(PATHWAY_WIDTH * 3, sec.depth);
        const mat = new THREE.MeshStandardMaterial({ color: sec.color, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(PATHWAY_X, -0.01, sec.z);
        mesh.receiveShadow = true;
        scene.add(mesh);
        glyObjects.push(mesh);

        // Phase label
        const label = createTextSprite(sec.label, { x: PATHWAY_X, y: 4, z: sec.labelZ }, {
            scale: 2, textColor: 'rgba(255,255,255,0.5)',
        });
        scene.add(label);
        glyObjects.push(label);
    }

    // Central pathway strip
    const pathGeo = new THREE.PlaneGeometry(PATHWAY_WIDTH, 170);
    const pathMat = new THREE.MeshStandardMaterial({ color: COLORS.path, roughness: 0.7, metalness: 0.1 });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(PATHWAY_X, 0.01, -25);
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);
    glyObjects.push(pathMesh);

    // Background
    const bgGeo = new THREE.PlaneGeometry(400, 400);
    const bgMat = new THREE.MeshStandardMaterial({ color: 0x1a0f00, roughness: 1, fog: true });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = -0.5;
    bg.receiveShadow = true;
    scene.add(bg);
    glyObjects.push(bg);
}

// --- Enzyme Stations ---
function createEnzymeStations(scene) {
    for (const data of ENZYMES) {
        const x = PATHWAY_X;
        const z = data.z;

        // Platform
        const platGeo = new THREE.BoxGeometry(PATHWAY_WIDTH - 2, 0.3, 4);
        const platMat = new THREE.MeshStandardMaterial({
            color: data.color, metalness: 0.2, roughness: 0.6,
            emissive: data.color, emissiveIntensity: 0.08,
        });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(x, 0.15, z);
        platform.receiveShadow = true;
        platform.castShadow = true;
        scene.add(platform);
        glyObjects.push(platform);

        // NPC
        const npc = createGlycolysisNPC(data, x, z);
        scene.add(npc);
        glyObjects.push(npc);
        glyNPCs.push(npc);
        interactiveObjects.push(npc);
        const mainMesh = npc.children.find(c => c.isMesh);
        if (mainMesh) {
            originalMaterials.set(mainMesh, mainMesh.material);
            npc.userData.mainMesh = mainMesh;
        }

        // Station light
        const light = new THREE.PointLight(data.color, 0.4, 8);
        light.position.set(x, 3, z);
        scene.add(light);
        glyObjects.push(light);

        // Arrow pointing to next station
        if (data !== ENZYMES[ENZYMES.length - 1]) {
            const nextZ = ENZYMES[ENZYMES.indexOf(data) + 1].z;
            const midZ = (z + nextZ) / 2;
            const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
            const arrowMat = new THREE.MeshStandardMaterial({
                color: data.color, emissive: data.color, emissiveIntensity: 0.3,
                transparent: true, opacity: 0.6,
            });
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            arrow.position.set(x, 0.5, midZ);
            arrow.rotation.x = Math.PI; // Point south (downward along -z)
            scene.add(arrow);
            glyObjects.push(arrow);
        }
    }
}

function createGlycolysisNPC(data, x, z) {
    const group = new THREE.Group();
    group.position.set(x + 3, 0.3, z);

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

    // Hat
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

    // Face toward pathway center
    group.lookAt(x, group.position.y, z);

    group.userData = {
        name: data.name, type: 'npc', enzyme: data.enzyme,
        isInteractable: true,
        onInteract: (obj, scene, tools) => handleGlyInteraction(data, obj, scene, tools),
    };

    return group;
}

// --- Interaction ---
function handleGlyInteraction(enzymeData, object, scene, tools) {
    const { showDialogue, showFeedback: feedback, setGameInteracting, playMoleculeGenerationSound, createGameBoySound } = tools;
    createGameBoySound(440, 0.1, 'sine');

    const idx = ENZYMES.indexOf(enzymeData);
    // Map quest states to enzyme indices
    const questForEnzyme = [
        GLY_QUEST.VISIT_HEXY, GLY_QUEST.VISIT_IZZY, GLY_QUEST.VISIT_PHIL,
        GLY_QUEST.VISIT_AL, GLY_QUEST.VISIT_TIM, GLY_QUEST.VISIT_GARY,
        GLY_QUEST.VISIT_PEGGY, GLY_QUEST.VISIT_MUTTY, GLY_QUEST.VISIT_ENO,
        GLY_QUEST.VISIT_PIKE,
    ];

    if (questState === questForEnzyme[idx]) {
        const inv = getInventory();
        const hasAll = enzymeData.input.every(item => inv[item] && inv[item] > 0);

        if (hasAll) {
            showDialogue(enzymeData.questDialogue, [
                { text: "Let's go!", hideOnClick: false, action: () => {
                    // Consume inputs
                    for (const item of enzymeData.input) {
                        removeFromInventory(item);
                    }
                    playMoleculeGenerationSound();

                    // Grant outputs
                    for (const item of enzymeData.output) {
                        addToInventory(item);
                    }

                    // Show the result as a follow-up dialogue
                    if (enzymeData.shortName === 'Pike') {
                        // Final enzyme -- show completion
                        showDialogue(enzymeData.questResult, [
                            { text: "Glycolysis mastered!", action: () => {
                                questState = GLY_QUEST.COMPLETED;
                                addAbility('glucose-handling');
                                setWorldProgress('glycolysis', { completed: true });
                                feedback("GLUCOSE HANDLING unlocked! You can now process carbohydrates in other pathways.", 6000);
                            }}
                        ], setGameInteracting);
                    } else {
                        const nextIdx = idx + 1;
                        const nextEnzyme = ENZYMES[nextIdx];
                        showDialogue(enzymeData.questResult, [
                            { text: `On to ${nextEnzyme.shortName}!`, action: () => {
                                questState = questForEnzyme[nextIdx];
                            }}
                        ], setGameInteracting);
                    }
                }}
            ], setGameInteracting);
        } else {
            const missing = enzymeData.input.filter(item => !inv[item] || inv[item] <= 0);
            showDialogue(`I need ${missing.join(' and ')} to proceed. Go collect ${missing.length > 1 ? 'them' : 'it'} first!`, [{ text: "OK" }], setGameInteracting);
        }
    } else {
        // Not the right time -- show the narrative greeting (context about this enzyme's role in the story)
        showDialogue(enzymeData.greeting, [{ text: "Got it!" }], setGameInteracting);
    }
}

// --- Portal ---
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

// --- Decorations ---
function createDecorations(scene) {
    // Torch-like pillars along the pathway edges
    for (let z = 45; z >= -100; z -= 15) {
        for (const side of [-1, 1]) {
            const x = side * (PATHWAY_WIDTH / 2 + 2);
            const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 6);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.7 });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(x, 1.25, z);
            pillar.castShadow = true;
            scene.add(pillar);
            glyObjects.push(pillar);

            // Flame
            const flameGeo = new THREE.ConeGeometry(0.2, 0.5, 5);
            const isPayoff = z < -30;
            const flameColor = isPayoff ? 0x00ff66 : 0xff6600;
            const flameMat = new THREE.MeshStandardMaterial({
                color: flameColor, emissive: flameColor, emissiveIntensity: 0.7,
                transparent: true, opacity: 0.85,
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(x, 2.8, z);
            flame.userData.isFlame = true;
            scene.add(flame);
            glyObjects.push(flame);

            const torchLight = new THREE.PointLight(flameColor, 0.3, 8);
            torchLight.position.set(x, 2.8, z);
            scene.add(torchLight);
            glyObjects.push(torchLight);
        }
    }

    // "NET: -2 ATP" sign in investment phase, "NET: +4 ATP, +2 NADH" in payoff
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

// --- Lighting ---
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

// --- Update ---
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
        npc.children[0].position.y = 0.8 + Math.sin(elapsedTime * 1.5 + npc.position.z) * 0.02;
    }

    // Terrain following
    player.position.y = Math.max(0.01, player.position.y);
    if (player.userData.verticalVelocity && player.userData.verticalVelocity > 0) {
        player.position.y += player.userData.verticalVelocity;
        player.userData.verticalVelocity -= 0.02;
    } else if (player.position.y > 0.1) {
        if (!player.userData.verticalVelocity) player.userData.verticalVelocity = 0;
        player.userData.verticalVelocity -= 0.02;
        player.position.y += player.userData.verticalVelocity;
        if (player.position.y <= 0.01) {
            player.position.y = 0.01;
            player.userData.verticalVelocity = 0;
        }
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
        if (inv['Glucose'] && inv['ATP'] >= 2) {
            questState = GLY_QUEST.VISIT_HEXY;
            showFeedback("You have Glucose + 2 ATP! Visit Hexy the Hexokinase to begin glycolysis.", 4000);
            return true;
        } else if (inv['Glucose'] && inv['ATP'] === 1) {
            showFeedback("Glucose collected! You need one more ATP.", 2000);
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
        [GLY_QUEST.VISIT_HEXY]: 'Bring Glucose + ATP to Hexy (Hexokinase)',
        [GLY_QUEST.VISIT_IZZY]: 'Bring Glucose-6-P to Izzy (PGI)',
        [GLY_QUEST.VISIT_PHIL]: 'Bring Fructose-6-P + ATP to Phil (PFK-1) -- the committed step!',
        [GLY_QUEST.VISIT_AL]: 'Bring Fructose-1,6-BP to Al (Aldolase) -- the big split!',
        [GLY_QUEST.VISIT_TIM]: 'Bring DHAP to Tim (TPI)',
        [GLY_QUEST.VISIT_GARY]: 'Bring G3P to Gary (GAPDH) -- payoff begins!',
        [GLY_QUEST.VISIT_PEGGY]: 'Bring 1,3-BPG to Peggy (PGK) -- first ATP!',
        [GLY_QUEST.VISIT_MUTTY]: 'Bring 3-PG to Mutty (PGM)',
        [GLY_QUEST.VISIT_ENO]: 'Bring 2-PG to Eno (Enolase)',
        [GLY_QUEST.VISIT_PIKE]: 'Bring PEP to Pike (Pyruvate Kinase) -- the grand finale!',
        [GLY_QUEST.COMPLETED]: 'Glycolysis mastered! Glucose Handling unlocked!',
    };
    if (questObjective) questObjective.textContent = objectives[questState] || '';
}

// --- Cleanup ---
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
    worldScene = null;
}

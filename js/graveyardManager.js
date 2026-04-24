// js/graveyardManager.js
// Graveyard-related world creation: gate, tombstones, spectral ghouls, fence
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { createTextSprite, createSimpleParticleSystem } from './utils.js';
import {
    getTerrainHeightAt, createResource, createWall,
    interactiveObjects, originalMaterials, addCollidableWall,
    removeGateBarrierFromWorld, setGateBarrier
} from './worldManager.js';

// Create graveyard gate at south entrance
export function createGraveyardGate(scene) {
    const gateX = CONSTANTS.GRAVEYARD_CENTER_X;
    const minZ = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2 - 1;
    const gateZ = minZ;
    const terrainHeight = getTerrainHeightAt(gateX, gateZ);

    const gateGroup = new THREE.Group();
    gateGroup.position.set(gateX, terrainHeight, gateZ);

    // Gate posts
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
    const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8);

    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
    leftPost.position.set(-2, 1.25, 0);
    leftPost.castShadow = true;
    gateGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
    rightPost.position.set(2, 1.25, 0);
    rightPost.castShadow = true;
    gateGroup.add(rightPost);

    // Gate door (initially closed)
    const gateMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
    const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2, 0.1), gateMaterial);
    gateDoor.position.set(0, 1, 0);
    gateDoor.castShadow = true;
    gateDoor.name = "gate_door";
    gateGroup.add(gateDoor);

    // Arch above gate
    const archMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
    const archGeometry = new THREE.TorusGeometry(2.2, 0.15, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeometry, archMaterial);
    arch.position.set(0, 2.5, 0);
    arch.rotation.x = Math.PI / 2;
    arch.castShadow = true;
    gateGroup.add(arch);

    // Sign on gate
    const signGeometry = new THREE.BoxGeometry(3, 0.6, 0.05);
    const signMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 3, 0);
    sign.castShadow = true;
    gateGroup.add(sign);

    const label = createTextSprite("Amino Acid Animal Graveyard",
        { x: gateX, y: terrainHeight + 3.2, z: gateZ },
        { fontSize: 28, scale: 0.5 }
    );
    scene.add(label);

    scene.add(gateGroup);

    // Add collision barrier for closed gate
    const gateBarrierGeometry = new THREE.BoxGeometry(4, 2.5, 0.5);
    const gateBarrierMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        transparent: true,
        opacity: 0
    });
    const gateBarrier = new THREE.Mesh(gateBarrierGeometry, gateBarrierMaterial);
    gateBarrier.position.set(gateX, terrainHeight + 1.25, gateZ);
    gateBarrier.name = "GateBarrier";
    scene.add(gateBarrier);
    addCollidableWall(gateBarrier);
    setGateBarrier(gateBarrier);

    // Add gate to interactive objects
    gateGroup.userData = {
        type: 'gate',
        name: 'Graveyard Gate',
        mainMesh: gateDoor,
        isOpen: false
    };
    interactiveObjects.push(gateGroup);
    originalMaterials.set(gateDoor, gateMaterial.clone());
}

// Create Animal Graveyard with tombstones and ammonia
export function createAnimalGraveyard(scene) {
    const rows = 5;
    const cols = 4;
    const spacing = CONSTANTS.GRAVEYARD_WIDTH / (cols + 1);
    const depthSpacing = CONSTANTS.GRAVEYARD_DEPTH / (rows + 1);

    let aaIndex = 0;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (aaIndex >= CONSTANTS.AMINO_ACIDS.length) break;

            const aa = CONSTANTS.AMINO_ACIDS[aaIndex];
            const x = CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH / 2 + (col + 1) * spacing;
            const z = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2 + (row + 1) * depthSpacing;

            const offsetX = (Math.random() - 0.5) * spacing * 0.3;
            const offsetZ = (Math.random() - 0.5) * depthSpacing * 0.3;

            createTombstone(scene, aa, new THREE.Vector3(x + offsetX, 0, z + offsetZ));

            aaIndex++;
        }
    }

    // Ammonia particles
    const numAmmoniaParticles = 5;
    for (let i = 0; i < numAmmoniaParticles; i++) {
        const x = CONSTANTS.GRAVEYARD_CENTER_X + (Math.random() - 0.5) * CONSTANTS.GRAVEYARD_WIDTH * 0.8;
        const z = CONSTANTS.GRAVEYARD_CENTER_Z + (Math.random() - 0.5) * CONSTANTS.GRAVEYARD_DEPTH * 0.8;

        createResource(scene, 'NH3', { x, z }, CONSTANTS.NH3_COLOR);

        const terrainHeight = getTerrainHeightAt(x, z);
        const particlePos = new THREE.Vector3(x, terrainHeight + 0.3, z);
        createSimpleParticleSystem(scene, 10, 0xaaff88, 0.04, 0.15, 2.0, particlePos, new THREE.Vector3(0.15, 0.1, 0.15));
    }

    // Acidic Coffin Grounds (acetyl-CoA) near ketogenic tombstones
    const acetylCoATombstones = CONSTANTS.AMINO_ACIDS.filter(aa => aa.producesAcetylCoA);
    acetylCoATombstones.forEach((aa) => {
        const baseX = CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH / 2;
        const baseZ = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2;
        const aaFullIndex = CONSTANTS.AMINO_ACIDS.indexOf(aa);
        const row = Math.floor(aaFullIndex / 4);
        const col = aaFullIndex % 4;
        const x = baseX + (col + 1) * spacing + 0.8;
        const z = baseZ + (row + 1) * depthSpacing;

        createResource(scene, 'Acidic Coffin Grounds', { x, z }, CONSTANTS.ACETYL_COA_COLOR);
    });

    createGraveyardGate(scene);

    // Spectral ghouls
    const ghoulPositions = [
        { x: CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH * 0.35, z: CONSTANTS.GRAVEYARD_CENTER_Z + CONSTANTS.GRAVEYARD_DEPTH * 0.4 },
        { x: CONSTANTS.GRAVEYARD_CENTER_X + CONSTANTS.GRAVEYARD_WIDTH * 0.35, z: CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH * 0.4 },
        { x: CONSTANTS.GRAVEYARD_CENTER_X + CONSTANTS.GRAVEYARD_WIDTH * 0.4, z: CONSTANTS.GRAVEYARD_CENTER_Z + CONSTANTS.GRAVEYARD_DEPTH * 0.2 }
    ];

    ghoulPositions.forEach(pos => {
        createSpectralGhoul(scene, new THREE.Vector3(pos.x, 0, pos.z));
    });

    createGraveyardFence(scene);

    // Spooky lighting
    const graveyardLight = new THREE.PointLight(0x88ff88, 0.4, 15);
    const terrainHeight = getTerrainHeightAt(CONSTANTS.GRAVEYARD_CENTER_X, CONSTANTS.GRAVEYARD_CENTER_Z);
    graveyardLight.position.set(CONSTANTS.GRAVEYARD_CENTER_X, terrainHeight + 3, CONSTANTS.GRAVEYARD_CENTER_Z);
    scene.add(graveyardLight);
}

// Create individual tombstone with style based on amino acid type
function createTombstone(scene, aminoAcid, position) {
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    const group = new THREE.Group();
    group.position.set(position.x, terrainHeight, position.z);

    let stoneMaterial, tombstoneGeo, tombstoneHeight;

    if (aminoAcid.type === 'glucogenic') {
        stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0.1 });
        tombstoneHeight = 1.2;
        const stoneWidth = 0.8;
        const stoneDepth = 0.15;
        const shape = new THREE.Shape();
        const width = stoneWidth / 2;
        const height = tombstoneHeight;
        shape.moveTo(-width, 0);
        shape.lineTo(-width, height * 0.7);
        shape.quadraticCurveTo(-width, height, 0, height);
        shape.quadraticCurveTo(width, height, width, height * 0.7);
        shape.lineTo(width, 0);
        shape.lineTo(-width, 0);
        tombstoneGeo = new THREE.ExtrudeGeometry(shape, { depth: stoneDepth, bevelEnabled: false });
    } else if (aminoAcid.type === 'ketogenic') {
        stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.85, metalness: 0.2 });
        tombstoneHeight = 1.5;
        tombstoneGeo = new THREE.ConeGeometry(0.3, tombstoneHeight, 4);
    } else {
        // Cross shape for both glucogenic and ketogenic
        stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.87, metalness: 0.15 });
        tombstoneHeight = 1.3;
        const crossGroup = new THREE.Group();
        const verticalBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, tombstoneHeight, 0.15), stoneMaterial);
        verticalBar.position.y = tombstoneHeight / 2;
        crossGroup.add(verticalBar);
        const horizontalBar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.15), stoneMaterial);
        horizontalBar.position.y = tombstoneHeight * 0.7;
        crossGroup.add(horizontalBar);
        crossGroup.position.y = 0;
        group.add(crossGroup);
        const label = createTextSprite(aminoAcid.animalName,
            { x: position.x, y: terrainHeight + 0.3, z: position.z + 0.3 },
            { fontSize: 24, scale: 0.35, textColor: 'rgba(200, 200, 200, 0.9)' }
        );
        scene.add(label);
        scene.add(group);
        return;
    }

    const tombstone = new THREE.Mesh(tombstoneGeo, stoneMaterial);
    if (aminoAcid.type === 'glucogenic') {
        tombstone.rotation.y = Math.PI / 2;
        tombstone.position.y = 0.01;
    } else if (aminoAcid.type === 'ketogenic') {
        tombstone.position.y = tombstoneHeight / 2;
    }
    tombstone.castShadow = true;
    tombstone.receiveShadow = true;
    group.add(tombstone);

    const label = createTextSprite(aminoAcid.animalName,
        { x: position.x, y: terrainHeight + 0.3, z: position.z + 0.3 },
        { fontSize: 24, scale: 0.35, textColor: 'rgba(200, 200, 200, 0.9)' }
    );
    scene.add(label);
    scene.add(group);
}

// Create spectral ghoul for Ghoul Milk
function createSpectralGhoul(scene, position) {
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    const group = new THREE.Group();
    group.position.set(position.x, terrainHeight, position.z);

    const ghoulMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8e8e8, transparent: true, opacity: 0.6,
        emissive: 0xe8e8e8, emissiveIntensity: 0.3, roughness: 0.3
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), ghoulMaterial);
    body.position.y = 0.8;
    body.scale.set(1, 1.3, 1);
    group.add(body);

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), eyeMaterial);
    leftEye.position.set(-0.15, 0.9, 0.35);
    group.add(leftEye);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.15;
    group.add(rightEye);

    createResource(scene, 'Glutamate', { x: position.x + 0.5, z: position.z }, CONSTANTS.GLUTAMATE_COLOR);
    scene.add(group);
    group.userData.floatPhase = Math.random() * Math.PI * 2;
}

// Create fence around graveyard
function createGraveyardFence(scene) {
    const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
    const fenceHeight = 1.0;
    const postRadius = 0.08;
    const spacing = 2.5;

    const minX = CONSTANTS.GRAVEYARD_CENTER_X - CONSTANTS.GRAVEYARD_WIDTH / 2 - 1;
    const maxX = CONSTANTS.GRAVEYARD_CENTER_X + CONSTANTS.GRAVEYARD_WIDTH / 2 + 1;
    const minZ = CONSTANTS.GRAVEYARD_CENTER_Z - CONSTANTS.GRAVEYARD_DEPTH / 2 - 1;
    const maxZ = CONSTANTS.GRAVEYARD_CENTER_Z + CONSTANTS.GRAVEYARD_DEPTH / 2 + 1;

    // North and South fences
    for (let x = minX; x <= maxX; x += spacing) {
        [minZ, maxZ].forEach(z => {
            const terrainHeight = getTerrainHeightAt(x, z);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, fenceHeight, 6), fenceMaterial);
            post.position.set(x, terrainHeight + fenceHeight / 2, z);
            post.castShadow = true;
            scene.add(post);
        });
    }

    // East and West fences
    for (let z = minZ; z <= maxZ; z += spacing) {
        [minX, maxX].forEach(x => {
            const terrainHeight = getTerrainHeightAt(x, z);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, fenceHeight, 6), fenceMaterial);
            post.position.set(x, terrainHeight + fenceHeight / 2, z);
            post.castShadow = true;
            scene.add(post);
        });
    }

    // Collision barriers
    const barrierHeight = 2.5;
    const barrierThickness = 0.5;
    const gateWidth = 4.1;
    const darkFenceMat = () => new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.1 });

    // North barrier
    createWall(scene,
        { x: CONSTANTS.GRAVEYARD_CENTER_X, y: barrierHeight / 2, z: maxZ },
        { x: CONSTANTS.GRAVEYARD_WIDTH + 2, y: barrierHeight, z: barrierThickness },
        0, "GraveyardFenceNorth", darkFenceMat(), true
    );

    // East barrier
    createWall(scene,
        { x: maxX, y: barrierHeight / 2, z: CONSTANTS.GRAVEYARD_CENTER_Z },
        { x: barrierThickness, y: barrierHeight, z: CONSTANTS.GRAVEYARD_DEPTH + 2 },
        0, "GraveyardFenceEast", darkFenceMat(), true
    );

    // West barrier
    createWall(scene,
        { x: minX, y: barrierHeight / 2, z: CONSTANTS.GRAVEYARD_CENTER_Z },
        { x: barrierThickness, y: barrierHeight, z: CONSTANTS.GRAVEYARD_DEPTH + 2 },
        0, "GraveyardFenceWest", darkFenceMat(), true
    );

    // South barrier — split around gate
    const southZ = minZ;
    const totalFenceWidth = CONSTANTS.GRAVEYARD_WIDTH + 2;
    const leftSectionWidth = (totalFenceWidth / 2) - (gateWidth / 2);
    const rightSectionWidth = leftSectionWidth;

    createWall(scene,
        { x: minX + leftSectionWidth / 2, y: barrierHeight / 2, z: southZ },
        { x: leftSectionWidth, y: barrierHeight, z: barrierThickness },
        0, "GraveyardFenceSouthLeft", darkFenceMat(), true
    );

    createWall(scene,
        { x: maxX - rightSectionWidth / 2, y: barrierHeight / 2, z: southZ },
        { x: rightSectionWidth, y: barrierHeight, z: barrierThickness },
        0, "GraveyardFenceSouthRight", darkFenceMat(), true
    );
}

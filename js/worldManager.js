// js/worldManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { createTextSprite, createSimpleParticleSystem, createLightningBoltGeometry } from './utils.js';
import { createRiverWithFlow } from './riverHelper.js';
// Removed initNPCs import from here, NPCs are created in npcManager.js

export let collidableWalls = [];
export let wallBoundingBoxes = [];
export let resourceMeshes = [];
export let interactiveObjects = [];
export let originalMaterials = new Map();
export let portalBarrier = null;
let caveSlopePlane = null;
let fixedAlcoveItemPositions = [];
let bridgeMesh = null;


function addCollidableWall(wall) {
    collidableWalls.push(wall);
    wall.updateMatrixWorld();
    const wallBox = new THREE.Box3().setFromObject(wall);
    wallBoundingBoxes.push(wallBox);
}

export function createWall(scene, position, size, rotationY = 0, name = "Wall", material = new THREE.MeshStandardMaterial({ color: CONSTANTS.WALL_GENERAL_COLOR, metalness: 0.2, roughness: 0.9 }), addToCollidables = true) {
    const wallGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const wall = new THREE.Mesh(wallGeometry, material);
    wall.position.set(position.x, position.y !== undefined ? position.y : CONSTANTS.WALL_HEIGHT / 2, position.z);
    wall.rotation.y = rotationY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.name = name;
    scene.add(wall);
    if (addToCollidables) {
        addCollidableWall(wall);
    }
    return wall;
}

function getCaveFloorY(xPos) {
    if (!caveSlopePlane) return 0.01;

    const xStartSlope = CONSTANTS.ALCOVE_OPENING_X_PLANE;
    const xEndSlope = CONSTANTS.ALCOVE_INTERIOR_BACK_X;
    const yStart = 0.01;

    const clampedX = Math.max(xEndSlope, Math.min(xStartSlope, xPos));
    const ratio = (xEndSlope - xStartSlope === 0) ? 0 : (clampedX - xStartSlope) / (xEndSlope - xStartSlope);
    return yStart + ratio * (-CONSTANTS.CAVE_SLOPE_DROP);
}


export function initWorld(scene) {
    fixedAlcoveItemPositions = [];

    // Create terrain with height variations instead of flat ground
    createTerrain(scene);

    // Remove old mitochondria path since terrain now handles this

    // Create bridge with smooth ramps
    const bridgeMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.BRIDGE_COLOR, roughness: 0.8 });
    
    // Main bridge platform
    bridgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(CONSTANTS.BRIDGE_LENGTH, CONSTANTS.BRIDGE_HEIGHT * 0.3, CONSTANTS.BRIDGE_WIDTH),
        bridgeMaterial
    );
    bridgeMesh.position.set(CONSTANTS.BRIDGE_CENTER_X, CONSTANTS.BRIDGE_HEIGHT - CONSTANTS.BRIDGE_HEIGHT * 0.15, CONSTANTS.BRIDGE_CENTER_Z);
    bridgeMesh.castShadow = true;
    bridgeMesh.receiveShadow = true;
    scene.add(bridgeMesh);
    
    // Ramp parameters
    const rampLength = 4.0;
    const rampHeight = CONSTANTS.BRIDGE_HEIGHT;
    
    // West ramp (mitochondria side)
    const westRampGeometry = new THREE.BoxGeometry(rampLength, CONSTANTS.BRIDGE_HEIGHT * 0.3, CONSTANTS.BRIDGE_WIDTH);
    const westRamp = new THREE.Mesh(westRampGeometry, bridgeMaterial);
    westRamp.position.set(
        CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2 - rampLength/2, 
        rampHeight/2, 
        CONSTANTS.BRIDGE_CENTER_Z
    );
    westRamp.rotation.z = Math.atan(rampHeight / rampLength);
    westRamp.castShadow = true;
    westRamp.receiveShadow = true;
    scene.add(westRamp);
    
    // East ramp (cytosol side)
    const eastRampGeometry = new THREE.BoxGeometry(rampLength, CONSTANTS.BRIDGE_HEIGHT * 0.3, CONSTANTS.BRIDGE_WIDTH);
    const eastRamp = new THREE.Mesh(eastRampGeometry, bridgeMaterial);
    eastRamp.position.set(
        CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2 + rampLength/2, 
        rampHeight/2, 
        CONSTANTS.BRIDGE_CENTER_Z
    );
    eastRamp.rotation.z = -Math.atan(rampHeight / rampLength);
    eastRamp.castShadow = true;
    eastRamp.receiveShadow = true;
    scene.add(eastRamp);
    
    // Create separate collision boxes for ramps to make them walkable
    // West ramp collision
    const westRampCollider = new THREE.Mesh(
        new THREE.BoxGeometry(rampLength, rampHeight * 2, CONSTANTS.BRIDGE_WIDTH),
        new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
    );
    westRampCollider.position.set(
        CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2 - rampLength/2,
        0,
        CONSTANTS.BRIDGE_CENTER_Z
    );
    westRampCollider.rotation.z = Math.atan(rampHeight / rampLength);
    scene.add(westRampCollider);
    
    // East ramp collision
    const eastRampCollider = new THREE.Mesh(
        new THREE.BoxGeometry(rampLength, rampHeight * 2, CONSTANTS.BRIDGE_WIDTH),
        new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
    );
    eastRampCollider.position.set(
        CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2 + rampLength/2,
        0,
        CONSTANTS.BRIDGE_CENTER_Z
    );
    eastRampCollider.rotation.z = -Math.atan(rampHeight / rampLength);
    scene.add(eastRampCollider);
    
    // Note: Bridge platform doesn't need collision - player walks on it naturally


    // --- Create ALCOVE ITEMS FIRST to get their positions for rock avoidance ---
    const cavaShrineX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + 1.2;
    const cavaShrineY = getCaveFloorY(cavaShrineX);
    createCavaShrine(scene, { x: cavaShrineX, yBase: cavaShrineY, z: CONSTANTS.ALCOVE_Z_CENTER });
    fixedAlcoveItemPositions.push({ x: cavaShrineX, z: CONSTANTS.ALCOVE_Z_CENTER, radius: 1.8 });


    // River Guardian is created in initNPCs at the river edge
    // No longer need to track alcove position for water well


    // CO2 Vents replace fire pit - mitochondrial respiratory byproduct
    const ventY = getCaveFloorY(CONSTANTS.CO2_VENTS_X);
    createCO2Vents(scene, new THREE.Vector3(CONSTANTS.CO2_VENTS_X, ventY, CONSTANTS.CO2_VENTS_Z));
    fixedAlcoveItemPositions.push({ x: CONSTANTS.CO2_VENTS_X, z: CONSTANTS.CO2_VENTS_Z, radius: 1.5 });

    createCaveArea(scene);


    const alcoveWallMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, metalness: 0.1, roughness: 0.8 });
    const alcoveWallHeight = CONSTANTS.WALL_HEIGHT + CONSTANTS.CAVE_SLOPE_DROP;
    const alcoveWallBaseY = (CONSTANTS.WALL_HEIGHT / 2) - (CONSTANTS.CAVE_SLOPE_DROP / 2);

    // Create alcove walls with an entrance
    createWall(scene, { x: CONSTANTS.MIN_X, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_CENTER }, { x: CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.ALCOVE_WIDTH }, 0, "Alcove_Back", alcoveWallMaterial);
    createWall(scene, { x: CONSTANTS.MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_DEPTH / 2, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_START - CONSTANTS.WALL_THICKNESS/2 }, { x: CONSTANTS.ALCOVE_DEPTH + CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.WALL_THICKNESS }, 0, "Alcove_Side_South", alcoveWallMaterial);
    createWall(scene, { x: CONSTANTS.MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_DEPTH / 2, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_END + CONSTANTS.WALL_THICKNESS/2 }, { x: CONSTANTS.ALCOVE_DEPTH + CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.WALL_THICKNESS }, 0, "Alcove_Side_North", alcoveWallMaterial);

    // Alcove is open for easy access - no front wall needed

    // Create walls with gap for Professor's Study entrance at z=-8
    const professorStudyZ = -8;
    const studyEntranceWidth = 3; // Width of gap for professor's area
    
    // Wall segment 1: From MIN_Z to just before Professor's study
    const seg1EndZ = professorStudyZ - studyEntranceWidth/2;
    const leftWallSeg1Len = seg1EndZ - CONSTANTS.MIN_Z;
    if (leftWallSeg1Len > 0.1) {
        createWall(scene, 
            { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z + leftWallSeg1Len / 2 }, 
            { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg1Len }
        );
    }
    
    // Wall segment 2: From after Professor's study to alcove start
    const seg2StartZ = professorStudyZ + studyEntranceWidth/2;
    const seg2EndZ = CONSTANTS.ALCOVE_Z_START - CONSTANTS.WALL_THICKNESS/2;
    const leftWallSeg2Len = seg2EndZ - seg2StartZ;
    if (leftWallSeg2Len > 0.1) {
        createWall(scene, 
            { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: seg2StartZ + leftWallSeg2Len / 2 }, 
            { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg2Len }
        );
    }
    
    // Wall segment 3: From alcove end to MAX_Z
    const leftWallSeg3Len = CONSTANTS.MAX_Z - CONSTANTS.ALCOVE_Z_END - CONSTANTS.WALL_THICKNESS/2;
    if (leftWallSeg3Len > 0.1) {
        createWall(scene, 
            { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.ALCOVE_Z_END + CONSTANTS.WALL_THICKNESS/2 + leftWallSeg3Len / 2 }, 
            { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg3Len }
        );
    }

    // Create natural terrain barriers instead of walls
    createNaturalBarriers(scene);
    
    // Add environmental details
    addEnvironmentalDetails(scene);
    
    // Add physical trails
    addPhysicalTrails(scene);


    // Removed river walls - no longer needed with wider river


    const internalWallLength = CONSTANTS.MITO_WIDTH * 0.3;
    const internalWallCenterX = CONSTANTS.MIN_X + CONSTANTS.MITO_WIDTH * 0.7;
    if (internalWallCenterX - internalWallLength/2 > CONSTANTS.ALCOVE_OPENING_X_PLANE + 1) {
        createWall(scene, { x: internalWallCenterX, y: CONSTANTS.WALL_HEIGHT/2, z: -4 }, { x: internalWallLength, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "H_Mito_Internal_1", alcoveWallMaterial);
        createWall(scene, { x: internalWallCenterX, y: CONSTANTS.WALL_HEIGHT/2, z: 4 }, { x: internalWallLength, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "H_Mito_Internal_2", alcoveWallMaterial);
    }
    // Create Professor Hepaticus's Study area
    createProfessorStudyArea(scene);
    
    addMitoCristae(scene);
    addCytoVesicles(scene);

    // Resources now automatically use terrain height
    createResource(scene, 'NH3', { x: CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5, z: CONSTANTS.ALCOVE_Z_END - 0.5 }, CONSTANTS.NH3_COLOR);
    createResource(scene, 'ATP', { x: CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5, z: CONSTANTS.ALCOVE_Z_START + 0.5 }, CONSTANTS.ATP_COLOR);
    createResource(scene, 'ATP', { x: CONSTANTS.MIN_X + 25, z: 12 }, CONSTANTS.ATP_COLOR); // Mito ATP

    // ATP in Cytosol - spread out more
    createResource(scene, 'ATP', { x: CONSTANTS.CYTO_ZONE_MIN_X + 10, z: -8 }, CONSTANTS.ATP_COLOR);
    // Aspartate is no longer a free pickup, it comes from the shuttle

    // Waste Receptacle - near Argus (Arginase) for Urea disposal
    createWasteBucket(scene, new THREE.Vector3(CONSTANTS.MAX_X - 5, 0.01, -10));

    // NPC placement for Fumarase and Shuttle Driver will be handled by npcManager using constants
    // Example: Fumarase in Cytosol near Aslan, Shuttle near bridge Cytosol side.

    createORNT1Portal(scene);
}

// Fixed rock data for the alcove
const fixedCaveRockData = [
    { pos: new THREE.Vector3(CONSTANTS.ALCOVE_INTERIOR_BACK_X + 0.5, 0, CONSTANTS.ALCOVE_Z_CENTER - 1.5), rot: new THREE.Euler(0.5,1,0.2), size: 0.5 },
    { pos: new THREE.Vector3(CONSTANTS.ALCOVE_INTERIOR_BACK_X + 1.8, 0, CONSTANTS.ALCOVE_Z_CENTER + 2.0), rot: new THREE.Euler(1.2,0.2,0.8), size: 0.7 },
    { pos: new THREE.Vector3(CONSTANTS.ALCOVE_OPENING_X_PLANE - 0.8, 0, CONSTANTS.ALCOVE_Z_CENTER + 0.5), rot: new THREE.Euler(0.1,1.5,0.6), size: 0.4 },
    { pos: new THREE.Vector3(CONSTANTS.ALCOVE_INTERIOR_BACK_X + 3.0, 0, CONSTANTS.ALCOVE_Z_START + 0.8), rot: new THREE.Euler(0.8,0.1,1.9), size: 0.6 },
    { pos: new THREE.Vector3(CONSTANTS.ALCOVE_OPENING_X_PLANE - 1.5, 0, CONSTANTS.ALCOVE_Z_END - 1.0), rot: new THREE.Euler(0.3,0.7,1.1), size: 0.55 },
];


function createCaveArea(scene) {
    const caveFloorMat = new THREE.MeshStandardMaterial({
        color: CONSTANTS.CAVE_FLOOR_COLOR,
        roughness: 0.9,
        metalness: 0.1,
    });
    const slopeLength = CONSTANTS.ALCOVE_DEPTH;
    const slopeWidth = CONSTANTS.ALCOVE_WIDTH;

    caveSlopePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(slopeLength, slopeWidth),
        caveFloorMat
    );
    const centerX = (CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_OPENING_X_PLANE) / 2;
    const centerY = 0.01 - (CONSTANTS.CAVE_SLOPE_DROP / 2);
    caveSlopePlane.position.set(centerX, centerY, CONSTANTS.ALCOVE_Z_CENTER);
    caveSlopePlane.rotation.x = -Math.PI / 2;
    const slopeAngle = Math.atan(CONSTANTS.CAVE_SLOPE_DROP / slopeLength);
    caveSlopePlane.rotation.y = slopeAngle;
    caveSlopePlane.receiveShadow = true;
    scene.add(caveSlopePlane);

    const rockMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.9 });

    fixedCaveRockData.forEach(data => {
        const rockGeo = new THREE.DodecahedronGeometry(data.size, 0);
        const rock = new THREE.Mesh(rockGeo, rockMat);

        const rockBaseY = getCaveFloorY(data.pos.x);
        rock.position.set(data.pos.x, rockBaseY + data.size * 0.3, data.pos.z);
        rock.rotation.copy(data.rot);
        rock.castShadow = true;
        rock.receiveShadow = true;

        let tooCloseToFixedItem = false;
        for (const itemPos of fixedAlcoveItemPositions) {
            const distSq = (rock.position.x - itemPos.x)**2 + (rock.position.z - itemPos.z)**2;
            if (distSq < (itemPos.radius + data.size)**2) {
                tooCloseToFixedItem = true;
                break;
            }
        }
        if (!tooCloseToFixedItem) {
            scene.add(rock);
        } else {
            console.warn("Skipped placing a fixed rock due to proximity to essential alcove item:", data);
        }
    });
}

// Create natural barriers using terrain elevation
function createNaturalBarriers(scene) {
    // Natural barriers are now handled by terrain elevation at edges
    // No additional objects needed as the terrain itself forms barriers
}

// Create trees for environmental detail
function createTrees(scene) {
    // Tree trunk material
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3c28,
        roughness: 0.8 
    });
    
    // Green leaf material for cytosol trees
    const cytoLeafMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d5016, // Dark forest green
        roughness: 0.6 
    });
    
    // Brownish leaf material for mitochondria trees
    const mitoLeafMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Brownish for mitochondria
        roughness: 0.6 
    });
    
    // Add MANY trees in cytosol area (like the original)
    for (let i = 0; i < 15; i++) {
        const x = CONSTANTS.CYTO_ZONE_MIN_X + 5 + Math.random() * (CONSTANTS.MAX_X - CONSTANTS.CYTO_ZONE_MIN_X - 10);
        const z = CONSTANTS.MIN_Z + 5 + Math.random() * (CONSTANTS.TOTAL_DEPTH - 10);
        createTree(scene, x, z, trunkMaterial, cytoLeafMaterial);
    }
    
    // Add some trees in mitochondria area too
    const mitoTreePositions = [
        { x: CONSTANTS.MIN_X + 5, z: 10 },
        { x: CONSTANTS.MIN_X + 25, z: -20 },
        { x: CONSTANTS.MIN_X + 18, z: 5 },
        { x: CONSTANTS.MIN_X + 30, z: -5 },
    ];
    
    mitoTreePositions.forEach(pos => {
        createTree(scene, pos.x, pos.z, trunkMaterial, mitoLeafMaterial);
    });
    
    // Also add crystals in mitochondria area
    createCrystals(scene);
}

function createTree(scene, x, z, trunkMaterial, leafMaterial) {
    const treeGroup = new THREE.Group();
    
    // Random height variation (50% to 100% of base size)
    const heightScale = 0.5 + Math.random() * 0.5;
    
    // Trunk
    const trunkHeight = 3 * heightScale;
    const trunkGeometry = new THREE.CylinderGeometry(0.3 * heightScale, 0.5 * heightScale, trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Foliage
    const foliageHeight = 4 * heightScale;
    const foliageRadius = 2 * heightScale;
    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
    const foliage = new THREE.Mesh(foliageGeometry, leafMaterial);
    foliage.position.y = trunkHeight + foliageHeight / 2;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    treeGroup.add(foliage);
    
    const terrainHeight = getTerrainHeightAt(x, z);
    treeGroup.position.set(x, terrainHeight, z);
    scene.add(treeGroup);
}

function createCrystals(scene) {
    // Add glowing crystals in mitochondria area
    const crystalMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7fffd4,
        emissive: 0x7fffd4,
        emissiveIntensity: 0.2,
        roughness: 0.2,
        metalness: 0.8
    });
    
    for (let i = 0; i < 10; i++) {
        const x = CONSTANTS.MIN_X + 5 + Math.random() * (CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.MIN_X - 10);
        const z = CONSTANTS.MIN_Z + 5 + Math.random() * (CONSTANTS.TOTAL_DEPTH - 10);
        
        const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.3, 0),
            crystalMaterial
        );
        
        const terrainHeight = getTerrainHeightAt(x, z);
        crystal.position.set(x, terrainHeight + 0.3, z);
        crystal.rotation.y = Math.random() * Math.PI;
        crystal.castShadow = true;
        
        scene.add(crystal);
    }
}

// Add environmental details like grass, rocks, etc.
function addEnvironmentalDetails(scene) {
    // Add some scattered rocks
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666, 
        roughness: 0.9 
    });
    
    // Add rocks in various locations
    for (let i = 0; i < 15; i++) {
        const rockScale = 0.3 + Math.random() * 0.7;
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rockScale),
            rockMaterial
        );
        
        // Random positions avoiding key areas
        let x = CONSTANTS.MIN_X + Math.random() * (CONSTANTS.MAX_X - CONSTANTS.MIN_X);
        let z = -25 + Math.random() * 50;
        
        // Avoid river area
        if (Math.abs(x - CONSTANTS.RIVER_CENTER_X) < CONSTANTS.RIVER_WIDTH * 1.5) continue;
        
        rock.position.set(x, getTerrainHeightAt(x, z) + rockScale/2, z);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        scene.add(rock);
    }
    
    // Add trees to both biomes
    createTrees(scene);
    
    // Add some grass tufts
    const grassMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d4a1f,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 30; i++) {
        const grassGroup = new THREE.Group();
        const bladeCount = 3 + Math.floor(Math.random() * 4);
        
        for (let j = 0; j < bladeCount; j++) {
            const blade = new THREE.Mesh(
                new THREE.PlaneGeometry(0.1, 0.3 + Math.random() * 0.3),
                grassMaterial
            );
            blade.position.set(
                (Math.random() - 0.5) * 0.3,
                0.15,
                (Math.random() - 0.5) * 0.3
            );
            blade.rotation.y = Math.random() * Math.PI;
            grassGroup.add(blade);
        }
        
        let x = CONSTANTS.MIN_X + Math.random() * (CONSTANTS.MAX_X - CONSTANTS.MIN_X);
        let z = -25 + Math.random() * 50;
        
        // Avoid river area
        if (Math.abs(x - CONSTANTS.RIVER_CENTER_X) < CONSTANTS.RIVER_WIDTH * 1.5) continue;
        
        grassGroup.position.set(x, getTerrainHeightAt(x, z), z);
        scene.add(grassGroup);
    }
}

// Add visible trails between important locations
function addPhysicalTrails(scene) {
    const trailMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b7355,
        roughness: 1.0
    });
    
    // Create a trail from spawn to Professor Hepaticus
    const trailWidth = 0.8;
    
    // Trail 1: From spawn area to Professor
    const trail1Start = new THREE.Vector3(-10, 0, -5);
    const trail1End = new THREE.Vector3(CONSTANTS.MIN_X + 10, 0, -8);
    
    const trail1Length = trail1Start.distanceTo(trail1End);
    const trail1 = new THREE.Mesh(
        new THREE.PlaneGeometry(trail1Length, trailWidth, 20, 1),
        trailMaterial
    );
    
    // Position and rotate trail
    trail1.position.copy(trail1Start.clone().add(trail1End).multiplyScalar(0.5));
    trail1.position.y = 0.01; // Slightly above terrain
    trail1.rotation.x = -Math.PI / 2;
    trail1.lookAt(trail1End.x, trail1.position.y, trail1End.z);
    
    scene.add(trail1);
    
    // Trail 2: From Professor area to bridge
    const trail2Start = trail1End.clone();
    const trail2End = new THREE.Vector3(CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2, 0, CONSTANTS.BRIDGE_CENTER_Z);
    
    const trail2Length = trail2Start.distanceTo(trail2End);
    const trail2 = new THREE.Mesh(
        new THREE.PlaneGeometry(trail2Length, trailWidth, 20, 1),
        trailMaterial
    );
    
    trail2.position.copy(trail2Start.clone().add(trail2End).multiplyScalar(0.5));
    trail2.position.y = 0.01;
    trail2.rotation.x = -Math.PI / 2;
    trail2.lookAt(trail2End.x, trail2.position.y, trail2End.z);
    
    scene.add(trail2);
}

function createProfessorStudyArea(scene) {
    // Professor Hepaticus is at (CONSTANTS.MIN_X + 10, 0, -8), which is (-30, 0, -8)
    // We've created a gap in the wall for access, so just add some study decorations
    const professorX = CONSTANTS.MIN_X + 10;
    const professorZ = -8;
    
    // Add some study decorations in the area
    const bookshelfMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3829,
        roughness: 0.9
    });
    
    // Bookshelf against the back wall
    const bookshelf = new THREE.Mesh(
        new THREE.BoxGeometry(3, 2, 0.3),
        bookshelfMaterial
    );
    bookshelf.position.set(CONSTANTS.MIN_X + 0.2, 1, professorZ);
    scene.add(bookshelf);
    
    // Small desk
    const deskMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x5c4033,
        roughness: 0.8
    });
    const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 1),
        deskMaterial
    );
    desk.position.set(professorX - 1, 0.4, professorZ);
    scene.add(desk);
    
    // Add a warm light in the study area
    const studyLight = new THREE.PointLight(0xffcc88, 0.5, 8);
    studyLight.position.set(professorX, 2.5, professorZ);
    scene.add(studyLight);
}

export function createResource(scene, name, position, color, userData = {}) {
    try {
        let geometry;
        let material;
        let scale = 1.0;
        if (name === 'ATP') {
            geometry = createLightningBoltGeometry();
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.7, emissive: color, emissiveIntensity: 0.3 });
        } else if (name === 'Water') {
            // 3D water droplet using merged spheres
            const dropGroup = new THREE.Group();
            
            // Main body sphere
            const mainSphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.25, 16, 12),
                new THREE.MeshStandardMaterial({ 
                    color: CONSTANTS.WATER_COLOR, 
                    transparent: true, 
                    opacity: 0.85, 
                    roughness: 0.05, 
                    metalness: 0.0
                })
            );
            dropGroup.add(mainSphere);
            
            // Top pointed part
            const topCone = new THREE.Mesh(
                new THREE.ConeGeometry(0.15, 0.3, 8),
                mainSphere.material
            );
            topCone.position.y = 0.3;
            dropGroup.add(topCone);
            
            // Bottom sphere for teardrop shape
            const bottomSphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 12, 8),
                mainSphere.material
            );
            bottomSphere.position.y = -0.1;
            bottomSphere.scale.y = 0.7;
            dropGroup.add(bottomSphere);
            
            // Merge geometries
            const mergedGeo = new THREE.BufferGeometry();
            dropGroup.updateMatrixWorld();
            dropGroup.traverse(child => {
                if (child.isMesh) {
                    child.updateMatrixWorld();
                    const geo = child.geometry.clone();
                    geo.applyMatrix4(child.matrixWorld);
                    if (mergedGeo.attributes.position) {
                        // THREE.js BufferGeometry doesn't have merge method
                        // We'll just use the main sphere for now
                    } else {
                        mergedGeo.copy(geo);
                    }
                }
            });
            
            // For simplicity, use a sphere geometry that looks like a droplet
            geometry = new THREE.SphereGeometry(0.25, 16, 12);
            geometry.scale(1, 1.3, 1); // Stretch vertically for droplet shape
            
            material = new THREE.MeshStandardMaterial({ 
                color: CONSTANTS.WATER_COLOR, 
                transparent: true, 
                opacity: 0.85, 
                roughness: 0.05, 
                metalness: 0.0,
                emissive: CONSTANTS.WATER_COLOR,
                emissiveIntensity: 0.1
            });
            scale = 0.8;
        } else if (name === 'CO2') {
            geometry = new THREE.SphereGeometry(0.28, 6, 4);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.SMOKE_COLOR, transparent: true, opacity: 0.6, roughness: 0.8, metalness: 0.0 });
        } else if (name === 'Bicarbonate') {
            // White powder pile
            const pileGroup = new THREE.Group();
            
            // Create multiple small spheres to form a powder pile
            const powderMat = new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                roughness: 0.9, 
                metalness: 0.0
            });
            
            // Base mound
            const baseMound = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 8, 6),
                powderMat
            );
            baseMound.scale.set(1, 0.4, 1);
            pileGroup.add(baseMound);
            
            // Add smaller mounds for texture
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = 0.2 + Math.random() * 0.1;
                const smallMound = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 4),
                    powderMat
                );
                smallMound.position.set(
                    Math.cos(angle) * radius,
                    Math.random() * 0.1,
                    Math.sin(angle) * radius
                );
                smallMound.scale.y = 0.5;
                pileGroup.add(smallMound);
            }
            
            // For now, use a simple flattened sphere for the powder pile
            geometry = new THREE.SphereGeometry(0.4, 12, 8);
            geometry.scale(1.2, 0.4, 1.2); // Flatten to look like a pile
            
            material = new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                roughness: 0.85, 
                metalness: 0.1,
                emissive: 0xffffff,
                emissiveIntensity: 0.05
            });
            scale = 1.0;
        } else if (name === 'Malate') {
            geometry = new THREE.TetrahedronGeometry(0.35, 0); // Simple shape for Malate
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.MALATE_COLOR, roughness: 0.5, metalness: 0.1 });
        }
         else {
            geometry = new THREE.SphereGeometry(0.3, 8, 6);
            if (name === 'Carbamoyl Phosphate') color = CONSTANTS.CARB_PHOS_COLOR;
            else if (name === 'Citrulline') color = CONSTANTS.CITRULLINE_COLOR;
            else if (name === 'Argininosuccinate') { color = CONSTANTS.ARG_SUCC_COLOR; geometry = new THREE.IcosahedronGeometry(0.35, 0); scale = 1.1; }
            else if (name === 'Arginine') { color = CONSTANTS.ARGININE_COLOR; geometry = new THREE.CapsuleGeometry(0.2, 0.3, 4, 6); }
            else if (name === 'Urea') { color = CONSTANTS.UREA_COLOR; geometry = new THREE.TorusKnotGeometry(0.2, 0.08, 32, 6); scale = 1.2; }
            else if (name === 'Ornithine') color = CONSTANTS.ORNITHINE_COLOR;
            else if (name === 'Fumarate') { color = CONSTANTS.FUMARATE_COLOR; geometry = new THREE.DodecahedronGeometry(0.3, 0); }
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.1 });
        }


        const resource = new THREE.Mesh(geometry, material);
        if (isNaN(position.x) || isNaN(position.z)) {
            console.error(`Invalid position for resource ${name}:`, position);
            position = { x: 0, z: 0 };
        }
        // Calculate terrain height at this position
        const terrainHeight = getTerrainHeightAt(position.x, position.z);
        const baseResourceY = position.yBase !== undefined ? position.yBase : 
                             (name.toLowerCase().includes("bridge") ? CONSTANTS.BRIDGE_HEIGHT + 0.01 : terrainHeight + 0.01);
        // Bicarbonate sits on ground, others hover
        const hoverOffset = name === 'Bicarbonate' ? 0 : 0.6;
        const initialY = userData.initialY !== undefined ? userData.initialY : (baseResourceY + hoverOffset);

        resource.userData = { ...userData, type: 'resource', name: name, object3D: resource, initialY: initialY, baseLevelY: baseResourceY, mainMesh: resource };
        resource.position.set(position.x, initialY, position.z);
        resource.scale.set(scale, scale, scale);
        resource.castShadow = true;

        if (name !== 'ATP' && !(geometry instanceof THREE.SphereGeometry)) {
            resource.rotation.x = Math.random() * Math.PI;
            resource.rotation.y = Math.random() * Math.PI * 2;
        } else if (name === 'ATP') {
            resource.rotation.y = Math.random() * Math.PI * 2;
        }

        // Create a group to hold both resource and label
        const resourceGroup = new THREE.Group();
        resourceGroup.position.set(resource.position.x, resource.position.y, resource.position.z);
        resource.position.set(0, 0, 0);
        resourceGroup.add(resource);
        
        // Add label above the resource
        const label = createTextSprite(name, { x: 0, y: 0.8, z: 0 }, { 
            fontSize: 32, 
            scale: 0.5, 
            textColor: 'rgba(255, 255, 255, 0.9)' 
        });
        resourceGroup.add(label);
        
        // Update userData to point to the group
        resourceGroup.userData = resource.userData;
        resourceGroup.userData.object3D = resourceGroup;
        resourceGroup.userData.resourceMesh = resource;
        resourceGroup.userData.label = label;
        
        scene.add(resourceGroup);
        interactiveObjects.push(resourceGroup);
        resourceMeshes.push(resourceGroup);
        originalMaterials.set(resource, material.clone());
        return resourceGroup;
    } catch (error) {
        console.error(`Error creating resource ${name}:`, error);
        return null;
    }
}

function createCavaShrine(scene, position) {
    const group = new THREE.Group();
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    const stationBaseY = position.yBase !== undefined ? position.yBase : terrainHeight;
    group.position.set(position.x, stationBaseY, position.z);

    const pedestalMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.8 });
    const pedestalHeight = 0.8;
    const pedestalGeo = new THREE.CylinderGeometry(0.6, 0.8, pedestalHeight, 8);
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = pedestalHeight / 2;
    pedestal.castShadow = true; pedestal.receiveShadow = true;
    group.add(pedestal);

    const crystalMat = new THREE.MeshStandardMaterial({
        color: CONSTANTS.CAVA_SHRINE_CRYSTAL_COLOR,
        emissive: CONSTANTS.CAVA_SHRINE_CRYSTAL_COLOR,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2
    });
    const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = pedestalHeight + 0.35;
    crystal.castShadow = true;
    crystal.name = "cava_crystal_highlight";
    group.add(crystal);

    const light = new THREE.PointLight(CONSTANTS.CAVA_SHRINE_CRYSTAL_COLOR, 0.7, 3);
    light.position.y = crystal.position.y;
    group.add(light);

    group.userData = {
        type: 'station',
        name: "CAVA Shrine",
        mainMesh: crystal,
        requires: { 'Water': 1, 'CO2': 1 },
        produces: 'Bicarbonate',
        productColors: { 'Bicarbonate': CONSTANTS.BICARBONATE_COLOR },
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE,
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE
    };
    scene.add(group);
    interactiveObjects.push(group);
    originalMaterials.set(crystal, crystal.material.clone());
    const label = createTextSprite("CAVA Shrine", { x: position.x, y: stationBaseY + pedestalHeight + 0.9, z: position.z }, { fontSize: 36, scale: 0.65 });
    scene.add(label);
    return group;
}


function createCO2Vents(scene, position) {
    const group = new THREE.Group();
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    group.position.set(position.x, terrainHeight, position.z);
    
    // Create multiple vent pipes
    const ventMat = new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        metalness: 0.8, 
        roughness: 0.2 
    });
    
    // Main vent
    const mainVentGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8);
    const mainVent = new THREE.Mesh(mainVentGeo, ventMat);
    mainVent.position.y = 0.4;
    mainVent.castShadow = true;
    group.add(mainVent);
    
    // Side vents
    const sideVentGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
    const positions = [
        { x: -0.3, z: 0.2 },
        { x: 0.2, z: -0.15 }
    ];
    
    positions.forEach(pos => {
        const vent = new THREE.Mesh(sideVentGeo, ventMat);
        vent.position.set(pos.x, 0.25, pos.z);
        vent.rotation.z = (Math.random() - 0.5) * 0.2;
        vent.castShadow = true;
        group.add(vent);
    });
    
    // Base plate
    const basePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
    );
    basePlate.position.y = 0.025;
    basePlate.castShadow = true;
    group.add(basePlate);
    
    // Add glow effect to main vent
    const glowLight = new THREE.PointLight(0xcccccc, 0.3, 2);
    glowLight.position.y = 0.8;
    group.add(glowLight);
    
    group.userData = { 
        type: 'source', 
        name: 'CO₂ Vents', 
        provides: 'CO2', 
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2, 
        mainMesh: mainVent 
    };
    
    interactiveObjects.push(group);
    originalMaterials.set(mainVent, ventMat.clone());
    scene.add(group);
    
    const label = createTextSprite("CO₂ Vents (Respiratory Byproduct)", 
        { x: position.x, y: position.y + 1.2, z: position.z }, 
        { scale: 0.5 }
    );
    scene.add(label);
    
    // White/gray CO2 particle clouds
    const particleEmitterPos = position.clone().add(new THREE.Vector3(0, 0.8, 0));
    createSimpleParticleSystem(scene, 40, 0xdddddd, 0.08, 0.4, 3.5, particleEmitterPos, new THREE.Vector3(0.3, 0.1, 0.3));
    
    // Side vent particles
    positions.forEach(pos => {
        const sideEmitter = position.clone().add(new THREE.Vector3(pos.x, 0.5, pos.z));
        createSimpleParticleSystem(scene, 15, 0xcccccc, 0.05, 0.3, 2.5, sideEmitter, new THREE.Vector3(0.15, 0.05, 0.15));
    });
    
    return group;
}

function createWaterWell_DEPRECATED(scene, position) {
    const group = new THREE.Group();
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    group.position.set(position.x, terrainHeight, position.z);
    const stoneMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });

    const baseRadius = 0.5;
    const baseHeight = 0.7;
    const wellBaseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 8);
    const wellBase = new THREE.Mesh(wellBaseGeo, stoneMat);
    wellBase.position.y = baseHeight / 2;
    wellBase.castShadow = true; wellBase.receiveShadow = true;
    group.add(wellBase);

    const waterGeo = new THREE.CylinderGeometry(baseRadius * 0.85, baseRadius * 0.85, 0.1, 8);
    const waterMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.WATER_COLOR, transparent: true, opacity: 0.8, emissive: CONSTANTS.WATER_COLOR, emissiveIntensity: 0.2, roughness: 0.1 });
    const waterSurface = new THREE.Mesh(waterGeo, waterMat);
    waterSurface.position.y = baseHeight * 0.7;
    waterSurface.name = "waterSurface_highlight";
    group.add(waterSurface);

    const postHeight = 1.2;
    const postRadius = 0.08;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 6);
    const post1 = new THREE.Mesh(postGeo, woodMat);
    post1.position.set(baseRadius * 0.8, baseHeight + postHeight / 2 - 0.1, 0);
    post1.castShadow = true;
    group.add(post1);
    const post2 = post1.clone();
    post2.position.x = -baseRadius * 0.8;
    group.add(post2);

    const roofSize = baseRadius * 2.5;
    const roofGeo = new THREE.ConeGeometry(roofSize / 2, 0.5, 4, 1);
    const roof = new THREE.Mesh(roofGeo, woodMat);
    roof.position.y = baseHeight + postHeight - 0.1 + 0.25;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    group.userData = { type: 'source', name: 'Water Well', provides: 'Water', requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2, mainMesh: waterSurface };
    interactiveObjects.push(group);
    originalMaterials.set(waterSurface, waterSurface.material.clone());
    scene.add(group);
    const label = createTextSprite("Water Well", { x: position.x, y: position.y + baseHeight + postHeight + 0.4, z: position.z }, { scale: 0.5 });
    scene.add(label);
    const particleEmitterPos = position.clone().add(new THREE.Vector3(0, baseHeight * 0.7 + 0.1, 0));
    createSimpleParticleSystem(scene, 20, 0xeeeeff, 0.02, 0.15, 2.5, particleEmitterPos, new THREE.Vector3(baseRadius*0.7, 0.05, baseRadius*0.7));
    return group;
}

function createAlchemistsBrazier_DEPRECATED(scene, position) {
    const group = new THREE.Group();
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    group.position.set(position.x, terrainHeight, position.z);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.8 });
    const pedestalGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.25;
    pedestal.castShadow = true; pedestal.receiveShadow = true;
    group.add(pedestal);

    const brazierMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.BRAZIER_COLOR, metalness: 0.8, roughness: 0.4 });
    const brazierGeo = new THREE.TorusKnotGeometry(0.25, 0.08, 32, 6, 2, 3);
    brazierGeo.scale(1, 0.7, 1);
    const brazierMesh = new THREE.Mesh(brazierGeo, brazierMat);
    brazierMesh.position.y = 0.5 + 0.15;
    brazierMesh.castShadow = true;
    brazierMesh.name = "brazier_highlight";
    group.add(brazierMesh);

    const emberLight = new THREE.PointLight(CONSTANTS.EMBER_COLOR, 0.5, 1);
    emberLight.position.y = 0.7;
    group.add(emberLight);

    group.userData = { type: 'source', name: 'Fire Pit', provides: 'CO2', requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0A_GATHER_CO2, mainMesh: brazierMesh };
    interactiveObjects.push(group);
    originalMaterials.set(brazierMesh, brazierMesh.material.clone());
    scene.add(group);
    const label = createTextSprite("Fire Pit", { x: position.x, y: position.y + 1.2, z: position.z }, { scale: 0.5 });
    scene.add(label);
    const particleEmitterPos = position.clone().add(new THREE.Vector3(0, 0.8, 0));
    createSimpleParticleSystem(scene, 30, CONSTANTS.SMOKE_COLOR, 0.05, 0.3, 3, particleEmitterPos, new THREE.Vector3(0.2, 0.2, 0.2));
    return group;
}

function createWasteBucket(scene, position) {
    const bucketGroup = new THREE.Group();
    const terrainHeight = getTerrainHeightAt(position.x, position.z);
    bucketGroup.position.set(position.x, terrainHeight, position.z);
    const kidneyShape = new THREE.Shape();
    kidneyShape.moveTo(0, 0.6);
    kidneyShape.bezierCurveTo(0.5, 0.7, 0.7, 0.4, 0.6, 0);
    kidneyShape.bezierCurveTo(0.65, -0.5, 0.3, -0.7, 0, -0.6);
    kidneyShape.bezierCurveTo(-0.3, -0.7, -0.65, -0.5, -0.6, 0);
    kidneyShape.bezierCurveTo(-0.7, 0.4, -0.5, 0.7, 0, 0.6);
    const extrudeSettings = { steps: 1, depth: 1.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelOffset: 0, bevelSegments: 1 };
    const geometry = new THREE.ExtrudeGeometry(kidneyShape, extrudeSettings);
    geometry.center();
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7, roughness: 0.4 });
    const bucketMesh = new THREE.Mesh(geometry, material);
    bucketMesh.scale.set(0.8, 0.8, 0.8);
    bucketMesh.position.y = 0.5;
    bucketMesh.castShadow = true; bucketMesh.receiveShadow = true;
    bucketMesh.name = "bucket_highlight";
    bucketGroup.add(bucketMesh);
    scene.add(bucketGroup);
    bucketGroup.userData = { type: 'wasteBucket', name: 'Waste Receptacle', mainMesh: bucketMesh };
    interactiveObjects.push(bucketGroup);
    originalMaterials.set(bucketMesh, bucketMesh.material.clone());
    const label = createTextSprite("Waste Receptacle", { x: position.x, y: position.y + 1.2, z: position.z }, { fontSize: 30, scale: 0.6 });
    scene.add(label);
    return bucketGroup;
}


function createORNT1Portal(scene) {
    const portalGeometry = new THREE.TorusGeometry(1.8, 0.35, 8, 24); // Ring shape
    const portalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
    const ornT1Portal = new THREE.Mesh(portalGeometry, portalMaterial);
    // Position on the bridge, standing upright and rotated to block the bridge (perpendicular)
    ornT1Portal.position.set(
        CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.PORTAL_ON_BRIDGE_OFFSET_X,
        CONSTANTS.BRIDGE_HEIGHT + 1.8 / 2 + 0.1, // Center Y based on radius
        CONSTANTS.BRIDGE_CENTER_Z
    );
    ornT1Portal.rotation.x = 0; // Stand upright
    ornT1Portal.rotation.y = Math.PI / 2; // Rotate 90 degrees to block bridge along Z

    ornT1Portal.userData = {
        type: 'portal',
        name: 'ORNT1 Portal',
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_7_OPEN_PORTAL,
        requires: { 'Citrulline': 1 },
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_8_GATHER_CYTO,
        action: 'transportCitrulline',
        productColor: CONSTANTS.CITRULLINE_COLOR,
        mainMesh: ornT1Portal
    };
    scene.add(ornT1Portal);
    interactiveObjects.push(ornT1Portal);
    originalMaterials.set(ornT1Portal, portalMaterial.clone());

    const portalLabel = createTextSprite("ORNT1 Portal", { x: ornT1Portal.position.x, y: ornT1Portal.position.y + 2.2, z: ornT1Portal.position.z }, { fontSize: 36, scale: 0.75 });
    scene.add(portalLabel);

    // Barrier for the portal on the bridge
    // Barrier should be perpendicular to the bridge's length. Bridge length is along X. Barrier blocks Z passage.
    const barrierHeight = CONSTANTS.WALL_HEIGHT * 1.2; // Taller barrier
    const barrierWidth = CONSTANTS.BRIDGE_WIDTH - 0.2; // Span the bridge path width
    const barrierGeometry = new THREE.PlaneGeometry(barrierWidth, barrierHeight);
    const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    portalBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    portalBarrier.position.set(
        CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.PORTAL_ON_BRIDGE_OFFSET_X, // At the portal's X
        CONSTANTS.BRIDGE_HEIGHT + 0.9, // Centered vertically
        CONSTANTS.BRIDGE_CENTER_Z
    );
    portalBarrier.rotation.x = 0;
    portalBarrier.rotation.y = Math.PI / 2; // Rotate 90 degrees to block bridge along Z

    portalBarrier.name = "PortalBarrier";
    scene.add(portalBarrier);
    addCollidableWall(portalBarrier);
}


export function removePortalBarrierFromWorld(scene) {
    if (portalBarrier && portalBarrier.parent === scene) {
        const barrierIndex = collidableWalls.indexOf(portalBarrier);
        if (barrierIndex > -1) collidableWalls.splice(barrierIndex, 1);

        const boxIndexToRemove = wallBoundingBoxes.findIndex(box => {
            const center = new THREE.Vector3();
            box.getCenter(center);
            return center.distanceToSquared(portalBarrier.position) < 0.1;
        });
        if (boxIndexToRemove > -1) wallBoundingBoxes.splice(boxIndexToRemove, 1);

        scene.remove(portalBarrier);
        portalBarrier.geometry.dispose();
        portalBarrier.material.dispose();
        portalBarrier = null;
        return true;
    }
    return false;
}

export function getPortalBarrier() { return portalBarrier; }

// Get terrain height at a specific position
export function getTerrainHeightAt(x, z) {
    // Check if in cave/alcove area first
    if (x >= CONSTANTS.MIN_X && x <= CONSTANTS.ALCOVE_OPENING_X_PLANE &&
        z >= CONSTANTS.ALCOVE_Z_START && z <= CONSTANTS.ALCOVE_Z_END) {
        return getCaveFloorY(x);
    }
    
    // Match the terrain generation in createTerrainSection
    const worldX = x;
    const worldZ = z;
    
    // Multiple octaves of noise for more realistic terrain (matching createTerrainSection)
    const noise1 = Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05) * 0.8;
    const noise2 = Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1) * 0.4;
    const noise3 = Math.sin(worldX * 0.2) * Math.cos(worldZ * 0.2) * 0.2;
    let height = noise1 + noise2 + noise3;
    
    // Add biome-specific height offsets
    if (x < CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH/2) {
        height += 0.3; // Mitochondria slightly elevated
    } else if (x > CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH/2) {
        height += 0.1; // Cytosol lower
    }
    
    // Scale down for world scale (matching createTerrainSection)
    return height * 0.1;
}

function addMitoCristae(scene) {
    const cristaeMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.MITO_PATH_COLOR, roughness: 0.9, side:THREE.DoubleSide });
    const cristaeHeight = CONSTANTS.WALL_HEIGHT * 0.6;
    const cristaeDepth = 0.2;
    const numCristaeSets = 5; // More cristae in larger mito area

    for (let i = 0; i < numCristaeSets; i++) {
        const cristaeLength = (CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.MIN_X) * (0.1 + Math.random() * 0.20);
        let xPos = CONSTANTS.MIN_X + (CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.MIN_X) * (0.2 + i * 0.15) + (Math.random()-0.5) * 2.0;
        let zPos = (Math.random() - 0.5) * (CONSTANTS.MAX_Z - CONSTANTS.MIN_Z) * 0.8;

        // Ensure cristae are within the mitochondria zone and avoid alcove
        if (xPos > CONSTANTS.MITO_ZONE_MAX_X - cristaeDepth/2 || xPos < CONSTANTS.MIN_X + cristaeDepth/2) continue;

        const alcoveXMin = CONSTANTS.MIN_X - 1;
        const alcoveXMax = CONSTANTS.ALCOVE_OPENING_X_PLANE + 1;
        const alcoveZMin = CONSTANTS.ALCOVE_Z_START - 1;
        const alcoveZMax = CONSTANTS.ALCOVE_Z_END + 1;

        if (xPos > alcoveXMin && xPos < alcoveXMax && zPos > alcoveZMin && zPos < alcoveZMax) {
            continue; // Skip if inside alcove bounds
        }

        // Avoid placing cristae on the bridge path approach
        if (xPos > CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH / 2 - cristaeDepth &&
            xPos < CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH / 2 + cristaeDepth &&
            zPos > CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH / 2 - cristaeLength / 2 &&
            zPos < CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH / 2 + cristaeLength / 2) {
            continue;
        }


        const cristaeGeo = new THREE.BoxGeometry(cristaeDepth, cristaeHeight, cristaeLength);
        const crista = new THREE.Mesh(cristaeGeo, cristaeMat);
        crista.position.set(xPos, cristaeHeight / 2 + 0.02, zPos); // Slightly above path
        crista.receiveShadow = true;
        scene.add(crista);
    }
}

function addCytoVesicles(scene) {
    const vesicleMat = new THREE.MeshStandardMaterial({ color: 0xAACCFF, transparent: true, opacity: 0.5, roughness: 0.3 });
    for (let i = 0; i < 20; i++) { // More vesicles in larger cyto area
        const radius = Math.random() * 0.3 + 0.2;
        const vesicleGeo = new THREE.SphereGeometry(radius, 6, 4);
        const vesicle = new THREE.Mesh(vesicleGeo, vesicleMat);
        vesicle.position.set(
            CONSTANTS.CYTO_ZONE_MIN_X + Math.random() * (CONSTANTS.MAX_X - CONSTANTS.CYTO_ZONE_MIN_X -1) + 0.5,
            Math.random() * 1.5 + 0.5, // Y position
            (Math.random() - 0.5) * (CONSTANTS.MAX_Z - CONSTANTS.MIN_Z) * 0.9
        );
        scene.add(vesicle);
    }
}

export function updateResourceHover(elapsedTime) {
    const hoverSpeed = 2;
    const hoverAmount = 0.2;
    resourceMeshes.forEach((resource, index) => {
        if (resource?.parent && resource.userData?.initialY !== undefined) {
            // Bicarbonate doesn't hover but sparkles
            if (resource.userData.name === 'Bicarbonate') {
                // Keep it on ground
                resource.position.y = resource.userData.initialY;
                
                // Sparkle effect through emissive intensity
                if (resource.material && resource.material.emissive) {
                    const sparkle = Math.sin(elapsedTime * 4 + index) * 0.5 + 0.5;
                    resource.material.emissiveIntensity = 0.05 + sparkle * 0.1;
                }
            } else {
                // Normal hover for other resources
                const yPos = resource.userData.initialY + Math.sin(elapsedTime * hoverSpeed + index * 0.5) * hoverAmount;
                if (!isNaN(yPos)) {
                    resource.position.y = yPos;
                }
            }
        }
    });
}

export function removeResourceFromWorld(resourceObject) {
    if (!resourceObject || !resourceObject.parent) return;

    const scene = resourceObject.parent;
    scene.remove(resourceObject);

    let index = interactiveObjects.indexOf(resourceObject);
    if (index > -1) interactiveObjects.splice(index, 1);

    index = resourceMeshes.indexOf(resourceObject);
    if (index > -1) resourceMeshes.splice(index, 1);

    originalMaterials.delete(resourceObject.userData.mainMesh || resourceObject);

    if (resourceObject.geometry) resourceObject.geometry.dispose();
    if (resourceObject.material) {
        if (Array.isArray(resourceObject.material)) {
            resourceObject.material.forEach(mat => mat.dispose());
        } else {
            resourceObject.material.dispose();
        }
    }
}

// Create a terrain section with RuneScape-style tiles
function createTerrainSection(scene, startX, width, tilesX, tilesZ, material, zone) {
    const depth = 60; // Z depth of terrain
    const geometry = new THREE.PlaneGeometry(width, depth, tilesX - 1, tilesZ - 1);
    
    // Apply height variation and vertex colors
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1];
        
        // Create height variation
        const worldX = x + startX + width/2;
        const worldZ = z;
        
        // Multiple octaves of noise for more realistic terrain
        const noise1 = Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05) * 0.8;
        const noise2 = Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1) * 0.4;
        const noise3 = Math.sin(worldX * 0.2) * Math.cos(worldZ * 0.2) * 0.2;
        let height = noise1 + noise2 + noise3;
        
        // Add biome-specific height offsets
        if (zone === 'mito') {
            height += 0.3; // Mitochondria slightly elevated
        } else {
            height += 0.1; // Cytosol lower
        }
        
        // Scale down for world scale
        vertices[i + 2] = height * 0.1; // Set Y (height)
        
        // Vertex coloring for RuneScape style variation - different colors per biome
        if (zone === 'mito') {
            // Mitochondria - brownish/reddish terrain
            const brownVariation = 0.1 + Math.random() * 0.1;
            colors[i] = 0.4 + brownVariation;     // R
            colors[i + 1] = 0.25 + brownVariation * 0.7; // G
            colors[i + 2] = 0.15 + brownVariation * 0.5; // B
        } else {
            // Cytosol - greenish terrain
            const greenVariation = 0.1 + Math.random() * 0.15;
            colors[i] = 0.2 + Math.random() * 0.1;     // R
            colors[i + 1] = 0.4 + greenVariation; // G
            colors[i + 2] = 0.1 + Math.random() * 0.05; // B
        }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.set(startX + width/2, 0, 0);
    terrainMesh.receiveShadow = true;
    terrainMesh.userData.terrainType = zone;
    
    scene.add(terrainMesh);
    
    // Store terrain meshes for height queries
    if (!window.terrainMeshes) window.terrainMeshes = [];
    window.terrainMeshes.push(terrainMesh);
}

// RuneScape-style tiled terrain with visible triangulated faces
function createTerrain(scene) {
    // Create two separate terrain meshes - one for each side of the river
    const tilesX = 20; // Tiles along X axis for each side
    const tilesZ = 30; // Tiles along Z axis
    
    // Calculate widths for each terrain section
    const mitoWidth = CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.MIN_X;
    const cytoWidth = CONSTANTS.MAX_X - CONSTANTS.CYTO_ZONE_MIN_X;
    
    // Create terrain material with flat shading for RuneScape style
    const terrainMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.9,
        metalness: 0.0,
        vertexColors: true,
        flatShading: true, // Flat shading to show triangulated faces
        side: THREE.DoubleSide
    });
    
    // Create mitochondria terrain (west of river)
    createTerrainSection(scene, CONSTANTS.MIN_X, mitoWidth, tilesX, tilesZ, terrainMaterial, 'mito');
    
    // Create cytosol terrain (east of river)
    createTerrainSection(scene, CONSTANTS.CYTO_ZONE_MIN_X, cytoWidth, tilesX, tilesZ, terrainMaterial, 'cyto');
    
    // Keep the improved river with north-south flow
    createRiverWithFlow(scene, CONSTANTS);
    
    // Create background terrain
    createBackgroundTerrain(scene);
}

// Create extended terrain that meets the horizon
function createBackgroundTerrain(scene) {
    // Create a massive terrain plane that extends to the horizon
    const horizonDistance = 500; // Extend far into the distance
    const backgroundGeometry = new THREE.PlaneGeometry(horizonDistance * 2, horizonDistance * 2, 50, 50);
    
    // Apply height variation for more realistic distant terrain
    const vertices = backgroundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 1];
        
        // Distance from center
        const distance = Math.sqrt(x * x + z * z);
        
        // Less height variation for distant terrain, more variation closer to play area
        const heightScale = Math.max(0.1, 1 - distance / horizonDistance);
        const noise1 = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 3 * heightScale;
        const noise2 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.5 * heightScale;
        const noise3 = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5 * heightScale;
        
        // Gradually lower terrain as it approaches horizon
        const horizonDip = -distance * 0.02;
        
        vertices[i + 2] = noise1 + noise2 + noise3 + horizonDip;
    }
    
    backgroundGeometry.computeVertexNormals();
    
    // Create gradient material that fades to horizon
    const backgroundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a4d2e, // Slightly darker green for distance
        roughness: 1.0,
        metalness: 0,
        fog: true // Enable fog for this mesh
    });
    
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.rotation.x = -Math.PI / 2;
    backgroundMesh.position.y = -2; // Slightly below main terrain
    backgroundMesh.receiveShadow = true;
    
    scene.add(backgroundMesh);
    
    // Add fog to create atmospheric perspective
    scene.fog = new THREE.Fog(0x87CEEB, 50, horizonDistance * 0.8);
}

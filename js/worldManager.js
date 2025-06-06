// js/worldManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { createTextSprite, createSimpleParticleSystem, createLightningBoltGeometry } from './utils.js';
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

    // Main Ground (Grass)
    const groundMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.GRASS_COLOR, metalness: 0.1, roughness: 0.9 });
    const groundGeometry = new THREE.PlaneGeometry(CONSTANTS.TOTAL_WIDTH, CONSTANTS.TOTAL_DEPTH);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // Mitochondria "Path" Area (West of River)
    const mitoPathMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.MITO_PATH_COLOR, metalness: 0.2, roughness: 0.7 });
    const mitoPathWidth = CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.MIN_X;
    const mitoPathMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(mitoPathWidth, CONSTANTS.TOTAL_DEPTH),
        mitoPathMaterial
    );
    mitoPathMesh.rotation.x = -Math.PI / 2;
    mitoPathMesh.position.set(CONSTANTS.MIN_X + mitoPathWidth / 2, 0.01, 0);
    mitoPathMesh.receiveShadow = true;
    scene.add(mitoPathMesh);

    // River Visual
    const riverMaterial = new THREE.MeshStandardMaterial({
        color: CONSTANTS.RIVER_COLOR,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    // riverMaterial.normalMap = new THREE.TextureLoader().load('path/to/your/water_normal.jpg'); // Optional: for wave effect
    // riverMaterial.normalScale = new THREE.Vector2(0.3, 0.3);
    const riverMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CONSTANTS.RIVER_WIDTH, CONSTANTS.TOTAL_DEPTH * 1.2), // Slightly longer than world
        riverMaterial
    );
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(CONSTANTS.RIVER_CENTER_X, -0.1, 0); // Slightly below ground for depth
    scene.add(riverMesh);

    // Bridge
    const bridgeMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.BRIDGE_COLOR, roughness: 0.8 });
    bridgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(CONSTANTS.BRIDGE_LENGTH, CONSTANTS.BRIDGE_HEIGHT, CONSTANTS.BRIDGE_WIDTH), // Length along X, Width along Z
        bridgeMaterial
    );
    bridgeMesh.position.set(CONSTANTS.BRIDGE_CENTER_X, CONSTANTS.BRIDGE_HEIGHT / 2 - 0.05, CONSTANTS.BRIDGE_CENTER_Z); // Center of river, path width
    bridgeMesh.castShadow = true;
    bridgeMesh.receiveShadow = true;
    scene.add(bridgeMesh);
    // Make bridge surface collidable (as a flat box slightly elevated)
    const bridgeCollider = new THREE.Mesh(
        new THREE.BoxGeometry(CONSTANTS.BRIDGE_LENGTH, 0.1, CONSTANTS.BRIDGE_WIDTH),
        new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}) // Invisible
    );
    bridgeCollider.position.set(CONSTANTS.BRIDGE_CENTER_X, CONSTANTS.BRIDGE_HEIGHT - 0.05, CONSTANTS.BRIDGE_CENTER_Z);
    addCollidableWall(bridgeCollider);


    // --- Create ALCOVE ITEMS FIRST to get their positions for rock avoidance ---
    const cavaShrineX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + 1.2;
    const cavaShrineY = getCaveFloorY(cavaShrineX);
    createCavaShrine(scene, { x: cavaShrineX, yBase: cavaShrineY, z: CONSTANTS.ALCOVE_Z_CENTER });
    fixedAlcoveItemPositions.push({ x: cavaShrineX, z: CONSTANTS.ALCOVE_Z_CENTER, radius: 1.8 });


    const wellX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_DEPTH / 2;
    const wellZ = CONSTANTS.ALCOVE_Z_START + 1.2;
    const wellY = getCaveFloorY(wellX);
    createWaterWell(scene, new THREE.Vector3(wellX, wellY, wellZ));
    fixedAlcoveItemPositions.push({ x: wellX, z: wellZ, radius: 1.5 });


    const brazierX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_DEPTH / 2 + 0.5;
    const brazierZ = CONSTANTS.ALCOVE_Z_END - 1.2;
    const brazierY = getCaveFloorY(brazierX);
    createAlchemistsBrazier(scene, new THREE.Vector3(brazierX, brazierY, brazierZ));
    fixedAlcoveItemPositions.push({ x: brazierX, z: brazierZ, radius: 1.5 });

    createCaveArea(scene);


    const alcoveWallMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, metalness: 0.1, roughness: 0.8 });
    const alcoveWallHeight = CONSTANTS.WALL_HEIGHT + CONSTANTS.CAVE_SLOPE_DROP;
    const alcoveWallBaseY = (CONSTANTS.WALL_HEIGHT / 2) - (CONSTANTS.CAVE_SLOPE_DROP / 2);

    createWall(scene, { x: CONSTANTS.MIN_X, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_CENTER }, { x: CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.ALCOVE_WIDTH }, 0, "Alcove_Back", alcoveWallMaterial);
    createWall(scene, { x: CONSTANTS.MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_DEPTH / 2, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_START - CONSTANTS.WALL_THICKNESS/2 }, { x: CONSTANTS.ALCOVE_DEPTH + CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.WALL_THICKNESS }, 0, "Alcove_Side_South", alcoveWallMaterial);
    createWall(scene, { x: CONSTANTS.MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_DEPTH / 2, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_END + CONSTANTS.WALL_THICKNESS/2 }, { x: CONSTANTS.ALCOVE_DEPTH + CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.WALL_THICKNESS }, 0, "Alcove_Side_North", alcoveWallMaterial);

    const leftWallSeg1Len = CONSTANTS.ALCOVE_Z_START - CONSTANTS.MIN_Z - CONSTANTS.WALL_THICKNESS/2;
    if (leftWallSeg1Len > 0.1) createWall(scene, { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z + leftWallSeg1Len / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg1Len });
    const leftWallSeg2Len = CONSTANTS.MAX_Z - CONSTANTS.ALCOVE_Z_END - CONSTANTS.WALL_THICKNESS/2;
    if (leftWallSeg2Len > 0.1) createWall(scene, { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.ALCOVE_Z_END + CONSTANTS.WALL_THICKNESS/2 + leftWallSeg2Len / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg2Len });

    // Outer Walls
    createWall(scene, { x: CONSTANTS.MAX_X + CONSTANTS.WALL_THICKNESS/2, y: CONSTANTS.WALL_HEIGHT/2, z: 0 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.TOTAL_DEPTH + 2*CONSTANTS.WALL_THICKNESS }, 0, "Outer_East");
    createWall(scene, { x: (CONSTANTS.MIN_X - CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_OPENING_X_PLANE)/2 , y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z - CONSTANTS.WALL_THICKNESS/2 }, { x: (CONSTANTS.ALCOVE_OPENING_X_PLANE - (CONSTANTS.MIN_X-CONSTANTS.WALL_THICKNESS)), y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "Outer_South_WestPart");
    createWall(scene, { x: (CONSTANTS.MIN_X - CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_OPENING_X_PLANE)/2 , y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MAX_Z + CONSTANTS.WALL_THICKNESS/2 }, { x: (CONSTANTS.ALCOVE_OPENING_X_PLANE - (CONSTANTS.MIN_X-CONSTANTS.WALL_THICKNESS)), y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "Outer_North_WestPart");
    
    createWall(scene, { x: (CONSTANTS.CYTO_ZONE_MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.MAX_X)/2 , y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z - CONSTANTS.WALL_THICKNESS/2 }, { x: (CONSTANTS.MAX_X - (CONSTANTS.CYTO_ZONE_MIN_X+CONSTANTS.WALL_THICKNESS/2)), y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "Outer_South_EastPart");
    createWall(scene, { x: (CONSTANTS.CYTO_ZONE_MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.MAX_X)/2 , y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MAX_Z + CONSTANTS.WALL_THICKNESS/2 }, { x: (CONSTANTS.MAX_X - (CONSTANTS.CYTO_ZONE_MIN_X+CONSTANTS.WALL_THICKNESS/2)), y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "Outer_North_EastPart");


    // Walls guiding to the bridge on Mitochondria side (West of River)
    const mitoBridgeApproachWallX = CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.WALL_THICKNESS / 2;
    const bridgeApproachWallLengthMito = (CONSTANTS.TOTAL_DEPTH - CONSTANTS.BRIDGE_WIDTH) / 2 - CONSTANTS.WALL_THICKNESS / 2;
    if (bridgeApproachWallLengthMito > 0.1) {
        createWall(scene, { x: mitoBridgeApproachWallX, y: CONSTANTS.WALL_HEIGHT / 2, z: CONSTANTS.MIN_Z + bridgeApproachWallLengthMito / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: bridgeApproachWallLengthMito });
        createWall(scene, { x: mitoBridgeApproachWallX, y: CONSTANTS.WALL_HEIGHT / 2, z: CONSTANTS.MAX_Z - bridgeApproachWallLengthMito / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: bridgeApproachWallLengthMito });
    }
    // Walls guiding to the bridge on Cytosol side (East of River)
    const cytoBridgeApproachWallX = CONSTANTS.CYTO_ZONE_MIN_X + CONSTANTS.WALL_THICKNESS / 2;
    const bridgeApproachWallLengthCyto = (CONSTANTS.TOTAL_DEPTH - CONSTANTS.BRIDGE_WIDTH) / 2 - CONSTANTS.WALL_THICKNESS / 2;
    if (bridgeApproachWallLengthCyto > 0.1) {
        createWall(scene, { x: cytoBridgeApproachWallX, y: CONSTANTS.WALL_HEIGHT / 2, z: CONSTANTS.MIN_Z + bridgeApproachWallLengthCyto / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: bridgeApproachWallLengthCyto });
        createWall(scene, { x: cytoBridgeApproachWallX, y: CONSTANTS.WALL_HEIGHT / 2, z: CONSTANTS.MAX_Z - bridgeApproachWallLengthCyto / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: bridgeApproachWallLengthCyto });
    }


    const internalWallLength = CONSTANTS.MITO_WIDTH * 0.3;
    const internalWallCenterX = CONSTANTS.MIN_X + CONSTANTS.MITO_WIDTH * 0.7;
    if (internalWallCenterX - internalWallLength/2 > CONSTANTS.ALCOVE_OPENING_X_PLANE + 1) {
        createWall(scene, { x: internalWallCenterX, y: CONSTANTS.WALL_HEIGHT/2, z: -4 }, { x: internalWallLength, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "H_Mito_Internal_1", alcoveWallMaterial);
        createWall(scene, { x: internalWallCenterX, y: CONSTANTS.WALL_HEIGHT/2, z: 4 }, { x: internalWallLength, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "H_Mito_Internal_2", alcoveWallMaterial);
    }
    addMitoCristae(scene);
    addCytoVesicles(scene);

    createResource(scene, 'NH3', { x: CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5, z: CONSTANTS.ALCOVE_Z_END - 0.5 }, CONSTANTS.NH3_COLOR, {initialY: getCaveFloorY(CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5) + 0.6});
    createResource(scene, 'ATP', { x: CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5, z: CONSTANTS.ALCOVE_Z_START + 0.5 }, CONSTANTS.ATP_COLOR, {initialY: getCaveFloorY(CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5) + 0.6});
    createResource(scene, 'ATP', { x: -10, z: 8 }, CONSTANTS.ATP_COLOR, {initialY: 0.6}); // Mito ATP

    // ATP in Cytosol
    createResource(scene, 'ATP', { x: CONSTANTS.CYTO_ZONE_MIN_X + 3, z: 0 }, CONSTANTS.ATP_COLOR, {initialY: 0.6});
    // Aspartate is no longer a free pickup, it comes from the shuttle

    createWasteBucket(scene, new THREE.Vector3(CONSTANTS.MAX_X - 2, 0.01, - (CONSTANTS.MAX_Z - 2) )); // Cytosol, far corner

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


export function createResource(scene, name, position, color, userData = {}) {
    try {
        let geometry;
        let material;
        let scale = 1.0;
        if (name === 'ATP') {
            geometry = createLightningBoltGeometry();
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.7, emissive: color, emissiveIntensity: 0.3 });
        } else if (name === 'Water') {
            geometry = new THREE.SphereGeometry(0.25, 6, 4);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.WATER_COLOR, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1 });
            scale = 0.9;
        } else if (name === 'CO2') {
            geometry = new THREE.SphereGeometry(0.28, 6, 4);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.SMOKE_COLOR, transparent: true, opacity: 0.6, roughness: 0.8, metalness: 0.0 });
        } else if (name === 'Bicarbonate') {
            geometry = new THREE.OctahedronGeometry(0.3, 0);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.BICARBONATE_COLOR, roughness: 0.4, metalness: 0.2, emissive: CONSTANTS.BICARBONATE_COLOR, emissiveIntensity: 0.2 });
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
        const baseResourceY = position.yBase !== undefined ? position.yBase : (name.toLowerCase().includes("bridge") ? CONSTANTS.BRIDGE_HEIGHT + 0.01 : 0.01);
        const hoverOffset = 0.6;
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

        scene.add(resource);
        interactiveObjects.push(resource);
        resourceMeshes.push(resource);
        originalMaterials.set(resource, material.clone());
        return resource;
    } catch (error) {
        console.error(`Error creating resource ${name}:`, error);
        return null;
    }
}

function createCavaShrine(scene, position) {
    const group = new THREE.Group();
    const stationBaseY = position.yBase !== undefined ? position.yBase : 0.01;
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


function createWaterWell(scene, position) {
    const group = new THREE.Group();
    group.position.copy(position);
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

function createAlchemistsBrazier(scene, position) {
    const group = new THREE.Group();
    group.position.copy(position);
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

    group.userData = { type: 'source', name: 'Fire Pit', provides: 'CO2', requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2, mainMesh: brazierMesh };
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
    bucketGroup.position.copy(position);
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

    // --- Add blue river strip between cytosol and mitochondria ---
    const riverGeometry = new THREE.BoxGeometry(CONSTANTS.RIVER_WIDTH, 0.2, CONSTANTS.TOTAL_DEPTH + 2);
    const riverMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.RIVER_COLOR, transparent: true, opacity: 0.85 });
    const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
    riverMesh.position.set(CONSTANTS.RIVER_CENTER_X, 0.1, 0);
    riverMesh.name = "River";
    scene.add(riverMesh);
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
            const yPos = resource.userData.initialY + Math.sin(elapsedTime * hoverSpeed + index * 0.5) * hoverAmount;
            if (!isNaN(yPos)) {
                resource.position.y = yPos;
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
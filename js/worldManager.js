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

    createWasteBucket(scene, new THREE.Vector3(CONSTANTS.MAX_X - 5, 0.01, CONSTANTS.MAX_Z - 5)); // Cytosol, far corner

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
        // Calculate terrain height at this position
        const terrainHeight = getTerrainHeightAt(position.x, position.z);
        const baseResourceY = position.yBase !== undefined ? position.yBase : 
                             (name.toLowerCase().includes("bridge") ? CONSTANTS.BRIDGE_HEIGHT + 0.01 : terrainHeight + 0.01);
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


function createWaterWell(scene, position) {
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

function createAlchemistsBrazier(scene, position) {
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
    
    // Base terrain height calculation (matching the terrain generation)
    const worldX = x;
    const worldZ = z;
    
    // Distance from center calculations
    const distFromCenterX = Math.abs(worldX) / (CONSTANTS.TOTAL_WIDTH / 2);
    const distFromCenterZ = Math.abs(worldZ) / (CONSTANTS.TOTAL_DEPTH / 2);
    const distFromEdge = Math.max(distFromCenterX, distFromCenterZ);
    
    // Match the RuneScape-style terrain generation
    let height = 0;
    
    // Large-scale hills
    height += Math.sin(worldX * 0.02 + 1.3) * Math.cos(worldZ * 0.025) * 1.2;
    height += Math.sin(worldX * 0.035 + 2.7) * Math.cos(worldZ * 0.03 + 0.8) * 0.8;
    
    // Medium-scale variation
    height += Math.sin(worldX * 0.08 + 0.5) * Math.cos(worldZ * 0.06 + 1.2) * 0.4;
    height += Math.cos(worldX * 0.12) * Math.sin(worldZ * 0.1 + 2.1) * 0.3;
    
    // Small-scale variation
    const tileNoise = (Math.sin(worldX * 0.5) * Math.cos(worldZ * 0.5) + Math.sin(worldX * 0.7 + worldZ * 0.7)) * 0.15;
    height += tileNoise;
    
    // Biome heights
    if (worldX < CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH) {
        height += 0.3 + Math.sin(worldX * 0.1 + worldZ * 0.15) * 0.2;
    } else if (worldX > CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH) {
        height += 0.1 + Math.cos(worldX * 0.09) * Math.sin(worldZ * 0.11) * 0.25;
    } else {
        const riverDist = Math.abs(worldX - CONSTANTS.RIVER_CENTER_X) / (CONSTANTS.RIVER_WIDTH * 0.5);
        height -= 0.8 * (1 - riverDist * riverDist);
    }
    
    // Edge barriers
    if (distFromEdge > 0.8) {
        const edgeStrength = (distFromEdge - 0.8) / 0.2;
        height += edgeStrength * edgeStrength * 2.5;
        height += edgeStrength * Math.sin(worldX * 0.15 + worldZ * 0.2) * 0.5;
    }
    
    return height * 0.1; // Scale down to match world scale
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
    createTerrainSection(scene, CONSTANTS.MIN_X, CONSTANTS.MITO_ZONE_MAX_X, mitoWidth, tilesX, tilesZ, terrainMaterial, 'mito');
    
    // Create cytosol terrain (east of river)
    createTerrainSection(scene, CONSTANTS.CYTO_ZONE_MIN_X, CONSTANTS.MAX_X, cytoWidth, tilesX, tilesZ, terrainMaterial, 'cyto');
    
    // Keep the improved river
    createImprovedRiver(scene);
    
    // Create background terrain
    createBackgroundTerrain(scene);
}

// Helper function to create a terrain section
function createTerrainSection(scene, minX, maxX, width, tilesX, tilesZ, material, biome) {
    const geometry = new THREE.PlaneGeometry(width, CONSTANTS.TOTAL_DEPTH, tilesX, tilesZ);
    const vertices = geometry.attributes.position.array;
    
    // Process vertices
    for (let i = 0; i < vertices.length; i += 3) {
        const localX = vertices[i];
        const z = vertices[i + 1];
        // Convert local x to world x
        const worldX = localX + (minX + maxX) / 2;
        
        // RuneScape-style terrain with more random variation
        let height = 0;
        
        // Create irregular terrain using multiple noise patterns
        // Large-scale hills
        height += Math.sin(worldX * 0.02 + 1.3) * Math.cos(z * 0.025) * 1.2;
        height += Math.sin(worldX * 0.035 + 2.7) * Math.cos(z * 0.03 + 0.8) * 0.8;
        
        // Medium-scale variation
        height += Math.sin(worldX * 0.08 + 0.5) * Math.cos(z * 0.06 + 1.2) * 0.4;
        height += Math.cos(worldX * 0.12) * Math.sin(z * 0.1 + 2.1) * 0.3;
        
        // Small-scale tile-to-tile variation for RuneScape feel
        const tileNoise = (Math.sin(worldX * 0.5) * Math.cos(z * 0.5) + Math.sin(worldX * 0.7 + z * 0.7)) * 0.15;
        height += tileNoise;
        
        // Biome-based height
        if (biome === 'mito') {
            // Mitochondria - slightly raised with variation
            height += 0.3 + Math.sin(worldX * 0.1 + z * 0.15) * 0.2;
        } else {
            // Cytosol - rolling plains
            height += 0.1 + Math.cos(worldX * 0.09) * Math.sin(z * 0.11) * 0.25;
        }
        
        // Edge barriers - check distance from actual world edges
        const distFromEdgeX = Math.min(Math.abs(worldX - CONSTANTS.MIN_X), Math.abs(worldX - CONSTANTS.MAX_X)) / (CONSTANTS.TOTAL_WIDTH * 0.5);
        const distFromEdgeZ = Math.min(Math.abs(z - CONSTANTS.MIN_Z), Math.abs(z - CONSTANTS.MAX_Z)) / (CONSTANTS.TOTAL_DEPTH * 0.5);
        const distFromEdge = Math.min(distFromEdgeX, distFromEdgeZ);
        
        if (distFromEdge < 0.2) {
            const edgeStrength = (0.2 - distFromEdge) / 0.2;
            height += edgeStrength * edgeStrength * 2.5;
            height += edgeStrength * Math.sin(worldX * 0.15 + z * 0.2) * 0.5;
        }
        
        height = Math.max(height, 0);
        vertices[i + 2] = height * 0.1; // Scale down to match world scale
    }
    
    geometry.computeVertexNormals();
    
    // Add vertex colors
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
        const height = vertices[i + 2];
        
        // RuneScape-style tile coloring
        let r, g, b;
        
        // Base biome colors
        if (biome === 'mito') {
            // Mitochondria - earthy browns and tans
            const brownVar = Math.random() * 0.15;
            r = 0.65 + brownVar; 
            g = 0.52 + brownVar * 0.8; 
            b = 0.35 + brownVar * 0.5;
        } else {
            // Cytosol - varied greens  
            const greenVar = Math.random() * 0.2;
            r = 0.25 + greenVar * 0.5; 
            g = 0.55 + greenVar; 
            b = 0.25 + greenVar * 0.3;
        }
        
        // Tile-by-tile color variation for RuneScape aesthetic
        const tileVariation = (Math.random() - 0.5) * 0.1;
        r += tileVariation;
        g += tileVariation;
        b += tileVariation;
        
        // Height-based shading - brighter on hills, darker in valleys
        const heightShade = 0.8 + (height * 0.15);
        
        // Random darker tiles for visual interest
        if (Math.random() < 0.1) {
            const darkness = 0.7 + Math.random() * 0.2;
            r *= darkness;
            g *= darkness;
            b *= darkness;
        }
        
        colors[i] = Math.min(1, Math.max(0, r * heightShade));
        colors[i + 1] = Math.min(1, Math.max(0, g * heightShade));
        colors[i + 2] = Math.min(1, Math.max(0, b * heightShade));
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    // Position the terrain section correctly
    terrain.position.set((minX + maxX) / 2, 0, 0);
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Add grid lines for RuneScape tile effect
    const gridMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000, 
        opacity: 0.1, 
        transparent: true 
    });
    
    // Create a subtle grid overlay
    const gridGeometry = new THREE.EdgesGeometry(geometry);
    const gridLines = new THREE.LineSegments(gridGeometry, gridMaterial);
    gridLines.rotation.x = -Math.PI / 2;
    gridLines.position.set((minX + maxX) / 2, 0.01, 0); // Slightly above terrain
    scene.add(gridLines);
}

function createBackgroundTerrain(scene) {
    // Create extended terrain that goes beyond the playable area
    const extendedWidth = CONSTANTS.TOTAL_WIDTH * 3; // 3x wider than playable area
    const extendedDepth = CONSTANTS.TOTAL_DEPTH * 3; // 3x deeper than playable area
    const segments = 120;
    
    const backgroundGeometry = new THREE.PlaneGeometry(extendedWidth, extendedDepth, segments, segments);
    const positions = backgroundGeometry.attributes.position;
    
    // Generate background terrain with larger features
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        
        // Distance from center of world
        const distFromCenter = Math.sqrt(x * x + z * z);
        const maxDist = Math.sqrt((extendedWidth/2) * (extendedWidth/2) + (extendedDepth/2) * (extendedDepth/2));
        const normalizedDist = distFromCenter / maxDist;
        
        // Create gentle rolling hills for background
        let height = 0;
        
        // Gentle hills in the distance
        height += Math.sin(x * 0.015) * Math.cos(z * 0.015) * 2;
        height += Math.sin(x * 0.025 + 2.5) * Math.cos(z * 0.02) * 1.5;
        height += Math.sin(x * 0.01) * Math.cos(z * 0.012 + 1.2) * 2.5;
        
        // Slightly more variation as we get further from center
        if (normalizedDist > 0.4) {
            const distanceBoost = (normalizedDist - 0.4) / 0.6;
            height += distanceBoost * 3 * (Math.sin(x * 0.008) + Math.cos(z * 0.008));
            
            // Small hills at the edges
            if (normalizedDist > 0.8) {
                const hillStrength = (normalizedDist - 0.8) / 0.2;
                height += hillStrength * 4 * Math.pow(Math.sin(x * 0.005) * Math.cos(z * 0.005), 2);
            }
        }
        
        // Make sure background terrain is lower than playable area boundaries
        const playableX = Math.abs(x) <= CONSTANTS.MAX_X;
        const playableZ = Math.abs(z) <= CONSTANTS.MAX_Z;
        if (playableX && playableZ) {
            // Inside playable area - keep it low
            height *= 0.3;
        }
        
        positions.setY(i, height);
    }
    
    backgroundGeometry.computeVertexNormals();
    
    // Create gradient material for background terrain
    const backgroundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a5f3a,
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide,
        fog: true // Ensure fog affects background terrain
    });
    
    const backgroundTerrain = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundTerrain.rotation.x = -Math.PI / 2;
    backgroundTerrain.position.set(0, -0.5, 0); // Better alignment with main terrain
    backgroundTerrain.receiveShadow = true;
    scene.add(backgroundTerrain);
    
    // Add distant features like larger mountains
    addDistantMountains(scene);
}

function addDistantMountains(scene) {
    // Create large mountain peaks in the distance
    const mountainMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.95,
        metalness: 0.05
    });
    
    // Place mountains around the perimeter
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 100 + Math.random() * 50;
        
        const mountainGroup = new THREE.Group();
        
        // Smaller, gentler hills in the distance
        const hillGeometry = new THREE.ConeGeometry(15 + Math.random() * 5, 10 + Math.random() * 5, 6);
        const hill = new THREE.Mesh(hillGeometry, mountainMaterial);
        hill.position.y = 0;
        mountainGroup.add(hill);
        
        // Small mounds around it
        for (let j = 0; j < 2; j++) {
            const moundGeometry = new THREE.SphereGeometry(5 + Math.random() * 3, 6, 4);
            const mound = new THREE.Mesh(moundGeometry, mountainMaterial);
            mound.position.set(
                (Math.random() - 0.5) * 15,
                -2,
                (Math.random() - 0.5) * 15
            );
            mound.scale.y = 0.4; // Flatten to make it more mound-like
            mountainGroup.add(mound);
        }
        
        mountainGroup.position.set(
            Math.cos(angle) * distance,
            -2,
            Math.sin(angle) * distance
        );
        scene.add(mountainGroup);
    }
}

function createNaturalBarriers(scene) {
    // Create invisible collision barriers at the edges
    // Players will be stopped by the steep terrain elevation, not visible walls
    
    // Create invisible barriers for collision detection only
    const barrierMaterial = new THREE.MeshBasicMaterial({ 
        visible: false // Invisible barriers
    });
    
    // West barrier
    const westBarrier = new THREE.Mesh(
        new THREE.BoxGeometry(1, 20, CONSTANTS.TOTAL_DEPTH),
        barrierMaterial
    );
    westBarrier.position.set(CONSTANTS.MIN_X - 0.5, 10, 0);
    scene.add(westBarrier);
    wallBoundingBoxes.push(new THREE.Box3().setFromObject(westBarrier));
    
    // East barrier
    const eastBarrier = new THREE.Mesh(
        new THREE.BoxGeometry(1, 20, CONSTANTS.TOTAL_DEPTH),
        barrierMaterial
    );
    eastBarrier.position.set(CONSTANTS.MAX_X + 0.5, 10, 0);
    scene.add(eastBarrier);
    wallBoundingBoxes.push(new THREE.Box3().setFromObject(eastBarrier));
    
    // North barrier
    const northBarrier = new THREE.Mesh(
        new THREE.BoxGeometry(CONSTANTS.TOTAL_WIDTH, 20, 1),
        barrierMaterial
    );
    northBarrier.position.set(0, 10, CONSTANTS.MAX_Z + 0.5);
    scene.add(northBarrier);
    wallBoundingBoxes.push(new THREE.Box3().setFromObject(northBarrier));
    
    // South barrier
    const southBarrier = new THREE.Mesh(
        new THREE.BoxGeometry(CONSTANTS.TOTAL_WIDTH, 20, 1),
        barrierMaterial
    );
    southBarrier.position.set(0, 10, CONSTANTS.MIN_Z - 0.5);
    scene.add(southBarrier);
    wallBoundingBoxes.push(new THREE.Box3().setFromObject(southBarrier));
}

function addEnvironmentalDetails(scene) {
    // Add trees in cytosol area
    for (let i = 0; i < 15; i++) {
        const x = CONSTANTS.CYTO_ZONE_MIN_X + 5 + Math.random() * (CONSTANTS.MAX_X - CONSTANTS.CYTO_ZONE_MIN_X - 10);
        const z = CONSTANTS.MIN_Z + 5 + Math.random() * (CONSTANTS.TOTAL_DEPTH - 10);
        createTree(scene, x, z);
    }
    
    // Add rocks and boulders
    for (let i = 0; i < 20; i++) {
        const x = CONSTANTS.MIN_X + Math.random() * CONSTANTS.TOTAL_WIDTH;
        const z = CONSTANTS.MIN_Z + Math.random() * CONSTANTS.TOTAL_DEPTH;
        // Avoid placing in river
        if (Math.abs(x - CONSTANTS.RIVER_CENTER_X) > CONSTANTS.RIVER_WIDTH) {
            createRock(scene, x, z);
        }
    }
    
    // Add crystals in mitochondria area
    for (let i = 0; i < 10; i++) {
        const x = CONSTANTS.MIN_X + 5 + Math.random() * (CONSTANTS.MITO_ZONE_MAX_X - CONSTANTS.MIN_X - 10);
        const z = CONSTANTS.MIN_Z + 5 + Math.random() * (CONSTANTS.TOTAL_DEPTH - 10);
        createCrystal(scene, x, z);
    }
}

function createTree(scene, x, z) {
    const treeGroup = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3c28 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Foliage
    const foliageGeometry = new THREE.ConeGeometry(2, 4, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 4.5;
    foliage.castShadow = true;
    treeGroup.add(foliage);
    
    const terrainHeight = getTerrainHeightAt(x, z);
    treeGroup.position.set(x, terrainHeight, z);
    scene.add(treeGroup);
}

function createRock(scene, x, z) {
    const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.5, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x5a5a5a,
        roughness: 0.9 
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    const terrainHeight = getTerrainHeightAt(x, z);
    rock.position.set(x, terrainHeight + Math.random() * 0.3, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    scene.add(rock);
}

function createCrystal(scene, x, z) {
    const crystalGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const crystalMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7fffd4,
        emissive: 0x7fffd4,
        emissiveIntensity: 0.2,
        roughness: 0.2,
        metalness: 0.8
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    const terrainHeight = getTerrainHeightAt(x, z);
    crystal.position.set(x, terrainHeight + 0.3, z);
    crystal.rotation.y = Math.random() * Math.PI;
    scene.add(crystal);
}

function addPhysicalTrails(scene) {
    // Create trail material
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xc4a57b, // Sandy brown color
        transparent: true,
        opacity: 0.6
    });
    
    // Define trail segments matching minimap trails
    const trailSegments = [
        // Mitochondria trails
        { from: { x: CONSTANTS.MIN_X + 10, z: -8 }, to: { x: CONSTANTS.MIN_X + 15, z: 15 } }, // Prof to Casper
        { from: { x: CONSTANTS.MIN_X + 15, z: 15 }, to: { x: CONSTANTS.MIN_X + 20, z: -10 } }, // Casper to Otis
        { from: { x: CONSTANTS.MIN_X + 20, z: -10 }, to: { x: CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2 - 2, z: 0 } }, // Otis to Usher
        
        // Bridge approach trails
        { from: { x: CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2 - 6, z: 0 }, to: { x: CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2, z: 0 } }, // To bridge west
        { from: { x: CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2, z: 0 }, to: { x: CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2 + 6, z: 0 } }, // From bridge east
        
        // Cytosol trails
        { from: { x: CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2 + 6, z: 0 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 10, z: -15 } }, // Bridge to Donkey
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 10, z: -15 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 25, z: 15 } }, // Donkey to Aslan
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 25, z: 15 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 20, z: 0 } }, // Aslan to Fumarase
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 20, z: 0 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 5, z: CONSTANTS.BRIDGE_CENTER_Z + 2 } }, // Fumarase to Shuttle
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 5, z: CONSTANTS.BRIDGE_CENTER_Z + 2 }, to: { x: CONSTANTS.MAX_X - 15, z: -10 } }, // Shuttle to Argus
        { from: { x: CONSTANTS.MAX_X - 15, z: -10 }, to: { x: CONSTANTS.MAX_X - 5, z: CONSTANTS.MAX_Z - 5 } } // Argus to Waste
    ];
    
    const trailWidth = 1.5;
    
    trailSegments.forEach(segment => {
        const dx = segment.to.x - segment.from.x;
        const dz = segment.to.z - segment.from.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        
        // Create trail plane
        const trailGeometry = new THREE.PlaneGeometry(distance, trailWidth);
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        
        // Position and rotate trail
        trail.position.set(
            (segment.from.x + segment.to.x) / 2,
            0.02, // Slightly above ground
            (segment.from.z + segment.to.z) / 2
        );
        trail.rotation.x = -Math.PI / 2; // Lay flat
        trail.rotation.z = -angle; // Orient along path
        trail.receiveShadow = true;
        
        scene.add(trail);
        
        // Add some stones along the trail for visual interest
        const numStones = Math.floor(distance / 3);
        for (let i = 0; i < numStones; i++) {
            const t = (i + 0.5) / numStones;
            const stoneX = segment.from.x + dx * t + (Math.random() - 0.5) * trailWidth;
            const stoneZ = segment.from.z + dz * t + (Math.random() - 0.5) * trailWidth;
            
            const stoneGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 4, 3);
            const stoneMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                roughness: 0.9
            });
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
            stone.position.set(stoneX, 0.05, stoneZ);
            stone.castShadow = true;
            scene.add(stone);
        }
    });
}

// Create a more natural-looking river with depth - RuneScape style
function createImprovedRiver(scene) {
    // River bed (darker, lower) with RuneScape-style tiling
    const riverBedGeometry = new THREE.PlaneGeometry(CONSTANTS.RIVER_WIDTH * 1.5, CONSTANTS.TOTAL_DEPTH * 1.2, 12, 40);
    riverBedGeometry.computeVertexNormals();
    
    const riverBedPositions = riverBedGeometry.attributes.position.array;
    
    // Add depth variation to river bed
    for (let i = 0; i < riverBedPositions.length; i += 3) {
        const x = riverBedPositions[i];
        const z = riverBedPositions[i + 1];
        
        // Create river bed depth with center being deeper
        const distFromCenter = Math.abs(x) / (CONSTANTS.RIVER_WIDTH * 0.75);
        const depthFactor = 1 - Math.pow(Math.min(distFromCenter, 1), 2);
        
        // Add tile-based variation for RuneScape look
        const tileX = Math.floor(x * 2) / 2;
        const tileZ = Math.floor(z * 0.5) / 0.5;
        const tileNoise = Math.sin(tileX * 2) * Math.cos(tileZ) * 0.1;
        
        riverBedPositions[i + 2] = -1.8 * depthFactor + tileNoise - 0.3;
    }
    
    // Add vertex colors for river bed
    const riverColors = new Float32Array(riverBedPositions.length);
    for (let i = 0; i < riverBedPositions.length; i += 3) {
        const depth = -riverBedPositions[i + 2];
        const variation = Math.random() * 0.1;
        
        // Darker blue-green for deeper parts
        riverColors[i] = 0.1 + variation;
        riverColors[i + 1] = 0.2 + depth * 0.1 + variation;
        riverColors[i + 2] = 0.3 + depth * 0.15 + variation;
    }
    riverBedGeometry.setAttribute('color', new THREE.BufferAttribute(riverColors, 3));
    riverBedGeometry.computeVertexNormals();
    
    const riverBedMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true // Flat shading for RuneScape look
    });
    
    const riverBed = new THREE.Mesh(riverBedGeometry, riverBedMaterial);
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(CONSTANTS.RIVER_CENTER_X, -0.8, 0);
    riverBed.receiveShadow = true;
    scene.add(riverBed);
    
    // River water surface (semi-transparent) with RuneScape-style tiling
    const waterSegmentsX = 10;
    const waterSegmentsZ = 30;
    const waterGeometry = new THREE.PlaneGeometry(CONSTANTS.RIVER_WIDTH * 0.9, CONSTANTS.TOTAL_DEPTH * 1.2, waterSegmentsX, waterSegmentsZ);
    const waterPositions = waterGeometry.attributes.position.array;
    
    // Add gentle waves to water surface
    for (let i = 0; i < waterPositions.length; i += 3) {
        const x = waterPositions[i];
        const z = waterPositions[i + 1];
        
        // Tile-based wave pattern for RuneScape aesthetic
        const tileWave = Math.sin(Math.floor(x * 4) + z * 0.2) * 0.03;
        waterPositions[i + 2] = tileWave;
    }
    waterGeometry.computeVertexNormals();
    
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x2E7FB5,
        transparent: true,
        opacity: 0.75,
        roughness: 0.2,
        metalness: 0.1,
        flatShading: true, // Flat shading
        side: THREE.DoubleSide
    });
    
    const waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.set(CONSTANTS.RIVER_CENTER_X, -0.4, 0);
    scene.add(waterSurface);
    
    // River banks with RuneScape-style rocky edges
    const bankMaterial = new THREE.MeshStandardMaterial({
        color: 0x5A4A3A,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true
    });
    
    // Create tiered banks for RuneScape look
    const bankTiers = 3;
    const tierHeight = 0.3;
    const tierWidth = 0.6;
    
    // West bank tiers
    for (let tier = 0; tier < bankTiers; tier++) {
        const bankGeometry = new THREE.BoxGeometry(
            tierWidth, 
            tierHeight, 
            CONSTANTS.TOTAL_DEPTH * 1.2
        );
        
        // Add vertex variation
        const positions = bankGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += (Math.random() - 0.5) * 0.05; // Small Y variation
        }
        bankGeometry.computeVertexNormals();
        
        const westBankTier = new THREE.Mesh(bankGeometry, bankMaterial);
        westBankTier.position.set(
            CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH/2 - tierWidth/2 - tier * tierWidth * 0.8, 
            tierHeight/2 + tier * tierHeight * 0.7, 
            0
        );
        westBankTier.receiveShadow = true;
        westBankTier.castShadow = true;
        scene.add(westBankTier);
    }
    
    // East bank tiers
    for (let tier = 0; tier < bankTiers; tier++) {
        const bankGeometry = new THREE.BoxGeometry(
            tierWidth, 
            tierHeight, 
            CONSTANTS.TOTAL_DEPTH * 1.2
        );
        
        // Add vertex variation
        const positions = bankGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += (Math.random() - 0.5) * 0.05; // Small Y variation
        }
        bankGeometry.computeVertexNormals();
        
        const eastBankTier = new THREE.Mesh(bankGeometry, bankMaterial);
        eastBankTier.position.set(
            CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH/2 + tierWidth/2 + tier * tierWidth * 0.8, 
            tierHeight/2 + tier * tierHeight * 0.7, 
            0
        );
        eastBankTier.receiveShadow = true;
        eastBankTier.castShadow = true;
        scene.add(eastBankTier);
    }
    
    // Add rocks along the river
    const rockGeometry = new THREE.DodecahedronGeometry(0.4, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4A4A4A, 
        roughness: 0.9,
        flatShading: true 
    });
    
    // Place rocks along the banks
    for (let i = 0; i < 30; i++) {
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        const side = Math.random() > 0.5 ? 1 : -1;
        const alongRiver = (Math.random() - 0.5) * CONSTANTS.TOTAL_DEPTH;
        const offset = Math.random() * 2 + CONSTANTS.RIVER_WIDTH/2;
        
        rock.position.set(
            CONSTANTS.RIVER_CENTER_X + side * offset,
            Math.random() * 0.3,
            alongRiver
        );
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.scale.setScalar(0.5 + Math.random() * 0.8);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
    
    // Add some reeds/grass near the water
    const reedMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3A5F3A,
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 20; i++) {
        const reedGroup = new THREE.Group();
        const side = Math.random() > 0.5 ? 1 : -1;
        const alongRiver = (Math.random() - 0.5) * CONSTANTS.TOTAL_DEPTH * 0.8;
        const offset = CONSTANTS.RIVER_WIDTH/2 + Math.random() * 1.5;
        
        // Create 3-5 reeds in a cluster
        const numReeds = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numReeds; j++) {
            const reedHeight = 0.8 + Math.random() * 0.4;
            const reedGeometry = new THREE.ConeGeometry(0.05, reedHeight, 3);
            const reed = new THREE.Mesh(reedGeometry, reedMaterial);
            reed.position.set(
                (Math.random() - 0.5) * 0.3,
                reedHeight/2,
                (Math.random() - 0.5) * 0.3
            );
            reed.rotation.z = (Math.random() - 0.5) * 0.2;
            reedGroup.add(reed);
        }
        
        reedGroup.position.set(
            CONSTANTS.RIVER_CENTER_X + side * offset,
            -0.1,
            alongRiver
        );
        scene.add(reedGroup);
    }
}
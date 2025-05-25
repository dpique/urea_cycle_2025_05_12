// js/worldManager.js
import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import { createTextSprite, createSimpleParticleSystem, createLightningBoltGeometry } from './utils.js';

export let collidableWalls = [];
export let wallBoundingBoxes = [];
export let resourceMeshes = []; // Meshes of resources currently in the world
export let interactiveObjects = []; // All objects player can interact with
export let originalMaterials = new Map(); // To store original materials for highlighting
export let portalBarrier = null;
let caveSlopePlane = null;


function addCollidableWall(wall) {
    collidableWalls.push(wall);
    wall.updateMatrixWorld(); // Ensure matrix is up to date
    const wallBox = new THREE.Box3().setFromObject(wall);
    wallBoundingBoxes.push(wallBox);
}

export function createWall(scene, position, size, rotationY = 0, name = "Wall", material = new THREE.MeshStandardMaterial({ color: CONSTANTS.WALL_GENERAL_COLOR, metalness: 0.2, roughness: 0.9 }), addToCollidables = true) {
    const wallGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const wall = new THREE.Mesh(wallGeometry, material);
    wall.position.set(position.x, position.y !== undefined ? position.y : CONSTANTS.WALL_HEIGHT / 2, position.z); // Allow custom Y
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

// Helper to get Y position on the cave slope
function getCaveFloorY(xPos) {
    if (!caveSlopePlane) return 0.01; // Default if plane not ready

    const xStartSlope = CONSTANTS.ALCOVE_OPENING_X_PLANE; // Higher X, entrance
    const xEndSlope = CONSTANTS.ALCOVE_INTERIOR_BACK_X;   // Lower X, deeper
    const yStart = 0.01; // Ground level at entrance
    
    // Ensure xPos is within the slope's X range
    const clampedX = Math.max(xEndSlope, Math.min(xStartSlope, xPos));

    const ratio = (clampedX - xStartSlope) / (xEndSlope - xStartSlope);
    return yStart + ratio * (-CONSTANTS.CAVE_SLOPE_DROP);
}


export function initWorld(scene) {
    // Ground & Zones
    const groundMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.CYTO_PRIMARY_COLOR, metalness: 0.1, roughness: 0.9 });
    const groundGeometry = new THREE.PlaneGeometry(CONSTANTS.TOTAL_WIDTH, CONSTANTS.TOTAL_DEPTH);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    const mitoMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.MITO_PRIMARY_COLOR, metalness: 0.2, roughness: 0.7 });
    const mitochondriaZoneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CONSTANTS.MITO_WIDTH, CONSTANTS.TOTAL_DEPTH),
        mitoMaterial
    );
    mitochondriaZoneMesh.rotation.x = -Math.PI / 2;
    mitochondriaZoneMesh.position.set(CONSTANTS.MIN_X + CONSTANTS.MITO_WIDTH / 2, 0.01, 0);
    mitochondriaZoneMesh.receiveShadow = true;
    scene.add(mitochondriaZoneMesh);

    // Create Cave Area First
    createCaveArea(scene);


    // Alcove Walls - adjusted to be taller and potentially sit lower to intersect slope
    const alcoveWallMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, metalness: 0.1, roughness: 0.8 });
    const alcoveWallHeight = CONSTANTS.WALL_HEIGHT + CONSTANTS.CAVE_SLOPE_DROP;
    const alcoveWallBaseY = (CONSTANTS.WALL_HEIGHT / 2) - (CONSTANTS.CAVE_SLOPE_DROP / 2);

    createWall(scene, { x: CONSTANTS.MIN_X, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_CENTER }, { x: CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.ALCOVE_WIDTH }, 0, "Alcove_Back", alcoveWallMaterial);
    createWall(scene, { x: CONSTANTS.MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_DEPTH / 2, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_START - CONSTANTS.WALL_THICKNESS/2 }, { x: CONSTANTS.ALCOVE_DEPTH + CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.WALL_THICKNESS }, 0, "Alcove_Side_South", alcoveWallMaterial); // Extended length to cover edge
    createWall(scene, { x: CONSTANTS.MIN_X + CONSTANTS.WALL_THICKNESS/2 + CONSTANTS.ALCOVE_DEPTH / 2, y: alcoveWallBaseY, z: CONSTANTS.ALCOVE_Z_END + CONSTANTS.WALL_THICKNESS/2 }, { x: CONSTANTS.ALCOVE_DEPTH + CONSTANTS.WALL_THICKNESS, y: alcoveWallHeight, z: CONSTANTS.WALL_THICKNESS }, 0, "Alcove_Side_North", alcoveWallMaterial); // Extended length

    // Outer Walls adjusted for Alcove (these are standard height)
    const leftWallSeg1Len = CONSTANTS.ALCOVE_Z_START - CONSTANTS.MIN_Z - CONSTANTS.WALL_THICKNESS/2;
    if (leftWallSeg1Len > 0.1) createWall(scene, { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z + leftWallSeg1Len / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg1Len });
    const leftWallSeg2Len = CONSTANTS.MAX_Z - CONSTANTS.ALCOVE_Z_END - CONSTANTS.WALL_THICKNESS/2;
    if (leftWallSeg2Len > 0.1) createWall(scene, { x: CONSTANTS.ALCOVE_OPENING_X_PLANE, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.ALCOVE_Z_END + CONSTANTS.WALL_THICKNESS/2 + leftWallSeg2Len / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: leftWallSeg2Len });

    createWall(scene, { x: CONSTANTS.MAX_X, y: CONSTANTS.WALL_HEIGHT/2, z: 0 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.TOTAL_DEPTH }, 0, "Outer_Right");
    createWall(scene, { x: (CONSTANTS.MIN_X + CONSTANTS.MAX_X)/2, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z }, { x: CONSTANTS.TOTAL_WIDTH - CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "Outer_Bottom");
    createWall(scene, { x: (CONSTANTS.MIN_X + CONSTANTS.MAX_X)/2, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MAX_Z }, { x: CONSTANTS.TOTAL_WIDTH - CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "Outer_Top");

    // Dividing Wall
    const gapStartZ = CONSTANTS.PORTAL_WALL_CENTER_Z - CONSTANTS.PORTAL_GAP_WIDTH / 2;
    const gapEndZ = CONSTANTS.PORTAL_WALL_CENTER_Z + CONSTANTS.PORTAL_GAP_WIDTH / 2;
    const divWall1Len = gapStartZ - CONSTANTS.MIN_Z;
    if (divWall1Len > 0.1) createWall(scene, { x: CONSTANTS.DIVIDING_WALL_X, y: CONSTANTS.WALL_HEIGHT/2, z: CONSTANTS.MIN_Z + divWall1Len / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: divWall1Len }, 0, "Dividing_Wall_Bottom");
    const divWall2Len = CONSTANTS.MAX_Z - gapEndZ;
    if (divWall2Len > 0.1) createWall(scene, { x: CONSTANTS.DIVIDING_WALL_X, y: CONSTANTS.WALL_HEIGHT/2, z: gapEndZ + divWall2Len / 2 }, { x: CONSTANTS.WALL_THICKNESS, y: CONSTANTS.WALL_HEIGHT, z: divWall2Len }, 0, "Dividing_Wall_Top");

    // Internal Mito Walls
    const internalWallLength = CONSTANTS.MITO_WIDTH * 0.3;
    const internalWallCenterX = CONSTANTS.MIN_X + CONSTANTS.MITO_WIDTH * 0.7;
    if (internalWallCenterX - internalWallLength/2 > CONSTANTS.ALCOVE_OPENING_X_PLANE + 1) {
        createWall(scene, { x: internalWallCenterX, y: CONSTANTS.WALL_HEIGHT/2, z: -4 }, { x: internalWallLength, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "H_Mito_Internal_1", alcoveWallMaterial);
        createWall(scene, { x: internalWallCenterX, y: CONSTANTS.WALL_HEIGHT/2, z: 4 }, { x: internalWallLength, y: CONSTANTS.WALL_HEIGHT, z: CONSTANTS.WALL_THICKNESS }, 0, "H_Mito_Internal_2", alcoveWallMaterial);
    }
    addMitoCristae(scene); 
    addCytoVesicles(scene); 

    // --- Create ALCOVE ITEMS (Sources & CAVA Shrine station) ---
    // Positions need to be on the sloped floor
    const cavaShrineX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + 1.2;
    const cavaShrineY = getCaveFloorY(cavaShrineX);
    createStation(scene, "CAVA Shrine", { x: cavaShrineX, yBase: cavaShrineY, z: CONSTANTS.ALCOVE_Z_CENTER }, CONSTANTS.MITO_SECONDARY_COLOR, {
        requires: { 'Water': 1, 'CO2': 1 },
        produces: 'Bicarbonate',
        productColors: { 'Bicarbonate': CONSTANTS.BICARBONATE_COLOR },
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0B_MAKE_BICARBONATE,
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_0C_COLLECT_BICARBONATE
    });

    const wellX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_DEPTH / 2;
    const wellZ = CONSTANTS.ALCOVE_Z_START + 1.2;
    const wellY = getCaveFloorY(wellX);
    createWaterWell(scene, new THREE.Vector3(wellX, wellY, wellZ));

    const brazierX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_DEPTH / 2 + 0.5;
    const brazierZ = CONSTANTS.ALCOVE_Z_END - 1.2;
    const brazierY = getCaveFloorY(brazierX);
    createAlchemistsBrazier(scene, new THREE.Vector3(brazierX, brazierY, brazierZ));


    // --- Create MITO STATIONS (non-NPC) & Resources ---
    const mitoStationXOffset = CONSTANTS.ALCOVE_OPENING_X_PLANE + 2.5; // These are on flat ground
    createStation(scene, "OTC", { x: Math.max(mitoStationXOffset, -10), z: -5 }, 0xff4500, {
        requires: { 'Carbamoyl Phosphate': 1, 'Ornithine': 1 },
        produces: 'Citrulline', productColors: { 'Citrulline': CONSTANTS.CITRULLINE_COLOR },
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_5_MAKE_CITRULLINE,
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_6_TALK_TO_USHER_PASSAGE
    });
    createStation(scene, "CPS1", { x: Math.max(mitoStationXOffset - 1, -7), z: 7 }, 0xff0000, {
        requires: { 'Bicarbonate': 1, 'NH3': 1, 'ATP': 2 },
        produces: 'Carbamoyl Phosphate', productColors: { 'Carbamoyl Phosphate': CONSTANTS.CARB_PHOS_COLOR },
        requiredQuestState: CONSTANTS.QUEST_STATE.STEP_2_MAKE_CARB_PHOS,
        advancesQuestTo: CONSTANTS.QUEST_STATE.STEP_3_COLLECT_CARB_PHOS
    });
    
    createResource(scene, 'NH3', { x: CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5, z: CONSTANTS.ALCOVE_Z_END - 0.5 }, CONSTANTS.NH3_COLOR, {initialY: 0.6});
    createResource(scene, 'ATP', { x: CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5, z: CONSTANTS.ALCOVE_Z_START + 0.5 }, CONSTANTS.ATP_COLOR, {initialY: 0.6});
    createResource(scene, 'ATP', { x: -4, z: 8 }, CONSTANTS.ATP_COLOR, {initialY: 0.6});


    // --- Create CYTOSOL Resources & Static Objects ---
    createResource(scene, 'Aspartate', { x: 8, z: 8 }, CONSTANTS.ASPARTATE_COLOR, {initialY: 0.6});
    createResource(scene, 'ATP', { x: 3, z: 0 }, CONSTANTS.ATP_COLOR, {initialY: 0.6});
    createWasteBucket(scene, new THREE.Vector3(13, 0.01, -8)); // yBase becomes base level for bucket
    
    createKrebsFurnace(scene, new THREE.Vector3(CONSTANTS.DIVIDING_WALL_X, 0.01, 7)); 

    createORNT1Portal(scene);
}

function createCaveArea(scene) {
    const caveFloorMat = new THREE.MeshStandardMaterial({
        color: CONSTANTS.CAVE_FLOOR_COLOR,
        roughness: 0.9,
        metalness: 0.1,
    });
    // Plane extends from ALCOVE_INTERIOR_BACK_X to ALCOVE_OPENING_X_PLANE
    const slopeLength = CONSTANTS.ALCOVE_DEPTH;
    const slopeWidth = CONSTANTS.ALCOVE_WIDTH;

    caveSlopePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(slopeLength, slopeWidth),
        caveFloorMat
    );

    // Position the center of the plane
    // Center X is midpoint between ALCOVE_INTERIOR_BACK_X and ALCOVE_OPENING_X_PLANE
    const centerX = (CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_OPENING_X_PLANE) / 2;
    // Center Y is midpoint of the slope drop, relative to ground
    const centerY = 0.01 - (CONSTANTS.CAVE_SLOPE_DROP / 2);
    caveSlopePlane.position.set(centerX, centerY, CONSTANTS.ALCOVE_Z_CENTER);

    // Rotate plane:
    // Angle of rotation around Z axis (local X of plane becomes world Z)
    // Then rotate around local Y of plane (now world X-axis) to create the slope
    caveSlopePlane.rotation.x = -Math.PI / 2; // Lay it flat first (plane's normal points up)

    // Calculate angle for slope
    // Rise is CAVE_SLOPE_DROP, Run is slopeLength (ALCOVE_DEPTH)
    const slopeAngle = Math.atan(CONSTANTS.CAVE_SLOPE_DROP / slopeLength);
    caveSlopePlane.rotation.y = slopeAngle; // Rotate around its local Y (which is world X)

    caveSlopePlane.receiveShadow = true;
    scene.add(caveSlopePlane);

    // Add some rock decorations
    const rockMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
        const size = Math.random() * 0.5 + 0.4;
        const rockGeo = new THREE.DodecahedronGeometry(size, 0); // More jagged
        const rock = new THREE.Mesh(rockGeo, rockMat);
        
        let rockX, rockY, rockZ;
        if (i < 5) { // Around entrance
            rockX = CONSTANTS.ALCOVE_OPENING_X_PLANE + (Math.random() - 0.7) * 2;
            rockZ = CONSTANTS.ALCOVE_Z_CENTER + (Math.random() - 0.5) * (CONSTANTS.ALCOVE_WIDTH + 1);
        } else { // Deeper in cave
            rockX = CONSTANTS.ALCOVE_INTERIOR_BACK_X + Math.random() * (CONSTANTS.ALCOVE_DEPTH * 0.7);
            rockZ = CONSTANTS.ALCOVE_Z_CENTER + (Math.random() - 0.5) * CONSTANTS.ALCOVE_WIDTH * 0.8;
        }
        rockY = getCaveFloorY(rockX) + size * 0.3; // Place on slope, slightly embedded

        rock.position.set(rockX, rockY, rockZ);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }
}


// Specific creation functions for world objects
export function createResource(scene, name, position, color, userData = {}) {
    try {
        let geometry;
        let material;
        let scale = 1.0;
        if (name === 'ATP') {
            geometry = createLightningBoltGeometry();
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.7, emissive: color, emissiveIntensity: 0.3 });
        } else if (name === 'Water') {
            geometry = new THREE.SphereGeometry(0.25, 10, 8);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.WATER_COLOR, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1 });
            scale = 0.9;
        } else if (name === 'CO2') {
            geometry = new THREE.SphereGeometry(0.28, 10, 8);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.SMOKE_COLOR, transparent: true, opacity: 0.6, roughness: 0.8, metalness: 0.0 });
        } else if (name === 'Bicarbonate') {
            geometry = new THREE.OctahedronGeometry(0.3, 0);
            material = new THREE.MeshStandardMaterial({ color: CONSTANTS.BICARBONATE_COLOR, roughness: 0.4, metalness: 0.2, emissive: CONSTANTS.BICARBONATE_COLOR, emissiveIntensity: 0.2 });
        } else { 
            geometry = new THREE.SphereGeometry(0.3, 12, 10);
            if (name === 'Carbamoyl Phosphate') color = CONSTANTS.CARB_PHOS_COLOR;
            else if (name === 'Citrulline') color = CONSTANTS.CITRULLINE_COLOR;
            else if (name === 'Argininosuccinate') { color = CONSTANTS.ARG_SUCC_COLOR; geometry = new THREE.IcosahedronGeometry(0.35, 0); scale = 1.1; }
            else if (name === 'Arginine') { color = CONSTANTS.ARGININE_COLOR; geometry = new THREE.CapsuleGeometry(0.2, 0.3, 4, 8); }
            else if (name === 'Urea') { color = CONSTANTS.UREA_COLOR; geometry = new THREE.TorusKnotGeometry(0.2, 0.08, 50, 8); scale = 1.2; }
            else if (name === 'Ornithine') color = CONSTANTS.ORNITHINE_COLOR;
            else if (name === 'Fumarate') { color = CONSTANTS.FUMARATE_COLOR; geometry = new THREE.DodecahedronGeometry(0.3, 0); }
            material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.1 });
        }

        const resource = new THREE.Mesh(geometry, material);
        if (isNaN(position.x) || isNaN(position.z)) {
            console.error(`Invalid position for resource ${name}:`, position);
            position = { x: 0, z: 0 }; 
        }
        // Use yBase if provided (for sloped surfaces), otherwise use fixed hover height.
        const baseResourceY = position.yBase !== undefined ? position.yBase : 0.01; // yBase is ground level
        const hoverOffset = 0.6; // How much it hovers above its base Y
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


export function createStation(scene, name, position, color, userData) {
    const geometry = new THREE.BoxGeometry(1, 1.2, 1); // Slightly shorter station
    const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7, metalness: 0.3 });
    const station = new THREE.Mesh(geometry, material);
    
    // Use yBase for ground level if provided (sloped cave), else use flat ground 0.01
    const stationBaseY = position.yBase !== undefined ? position.yBase : 0.01;
    const stationHeight = 1.2; // Matches geometry
    station.position.set(position.x, stationBaseY + stationHeight / 2, position.z);
    
    station.castShadow = true;
    station.receiveShadow = true;
    station.userData = { type: 'station', name: name, ...userData, mainMesh: station };
    scene.add(station);
    interactiveObjects.push(station);
    originalMaterials.set(station, material.clone()); 
    const label = createTextSprite(name, { x: position.x, y: stationBaseY + stationHeight + 0.5, z: position.z }, { fontSize: 36, scale: 0.75 });
    scene.add(label);
    return station;
}

function createWaterWell(scene, position) { // position is base (ground) of well
    const group = new THREE.Group();
    group.position.copy(position); // This position is now the ground level from getCaveFloorY
    const rockMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
        const size = Math.random() * 0.4 + 0.3;
        const rockGeo = new THREE.SphereGeometry(size, 5, 4);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set((Math.random() - 0.5) * 0.6, size * 0.3 - 0.1, (Math.random() - 0.5) * 0.6);
        rock.castShadow = true; rock.receiveShadow = true;
        group.add(rock);
    }
    const waterGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const waterMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.WATER_COLOR, transparent: true, opacity: 0.8, emissive: CONSTANTS.WATER_COLOR, emissiveIntensity: 0.3, roughness: 0.1 });
    const waterSurface = new THREE.Mesh(waterGeo, waterMat);
    waterSurface.position.y = 0.1; // Relative to group's Y (which is ground level)
    waterSurface.name = "waterSurface_highlight";
    group.add(waterSurface);

    group.userData = { type: 'source', name: 'Water Well', provides: 'Water', requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2, mainMesh: waterSurface };
    interactiveObjects.push(group);
    originalMaterials.set(waterSurface, waterSurface.material.clone());
    scene.add(group);
    const label = createTextSprite("Water Well", { x: position.x, y: position.y + 0.8, z: position.z }, { scale: 0.5 });
    scene.add(label);
    // Particle system emitter needs to be relative to the group's world position
    const particleEmitterPos = position.clone().add(new THREE.Vector3(0, 0.2, 0));
    createSimpleParticleSystem(scene, 20, 0xffffff, 0.03, 0.2, 2, particleEmitterPos, new THREE.Vector3(0.3, 0.1, 0.3));
    return group;
}

function createAlchemistsBrazier(scene, position) { // position is base of brazier
    const group = new THREE.Group();
    group.position.copy(position); // This is ground level from getCaveFloorY
    const pedestalMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.ROCK_COLOR, roughness: 0.8 });
    const pedestalGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 12);
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.25; // Relative to group's Y
    pedestal.castShadow = true; pedestal.receiveShadow = true;
    group.add(pedestal);

    const brazierMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.BRAZIER_COLOR, metalness: 0.8, roughness: 0.4 });
    const brazierGeo = new THREE.TorusKnotGeometry(0.25, 0.08, 50, 8, 2, 3);
    brazierGeo.scale(1, 0.7, 1);
    const brazierMesh = new THREE.Mesh(brazierGeo, brazierMat);
    brazierMesh.position.y = 0.5 + 0.15; // Relative to group's Y
    brazierMesh.castShadow = true;
    brazierMesh.name = "brazier_highlight";
    group.add(brazierMesh);

    const emberLight = new THREE.PointLight(CONSTANTS.EMBER_COLOR, 0.5, 1);
    emberLight.position.y = 0.7; // Relative
    group.add(emberLight);

    group.userData = { type: 'source', name: 'Alchemist\'s Brazier', provides: 'CO2', requiredQuestState: CONSTANTS.QUEST_STATE.STEP_0_GATHER_WATER_CO2, mainMesh: brazierMesh };
    interactiveObjects.push(group);
    originalMaterials.set(brazierMesh, brazierMesh.material.clone());
    scene.add(group);
    const label = createTextSprite("Alchemist's Brazier", { x: position.x, y: position.y + 1.2, z: position.z }, { scale: 0.5 });
    scene.add(label);
    const particleEmitterPos = position.clone().add(new THREE.Vector3(0, 0.8, 0));
    createSimpleParticleSystem(scene, 30, CONSTANTS.SMOKE_COLOR, 0.05, 0.3, 3, particleEmitterPos, new THREE.Vector3(0.2, 0.2, 0.2));
    return group;
}

function createWasteBucket(scene, position) { // position.y is the ground level
    const bucketGroup = new THREE.Group();
    bucketGroup.position.copy(position); // position.y is now the base level for the bucket
    const kidneyShape = new THREE.Shape();
    kidneyShape.moveTo(0, 0.6);
    kidneyShape.bezierCurveTo(0.5, 0.7, 0.7, 0.4, 0.6, 0);
    kidneyShape.bezierCurveTo(0.65, -0.5, 0.3, -0.7, 0, -0.6);
    kidneyShape.bezierCurveTo(-0.3, -0.7, -0.65, -0.5, -0.6, 0);
    kidneyShape.bezierCurveTo(-0.7, 0.4, -0.5, 0.7, 0, 0.6);
    const extrudeSettings = { steps: 1, depth: 1.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelOffset: 0, bevelSegments: 3 };
    const geometry = new THREE.ExtrudeGeometry(kidneyShape, extrudeSettings);
    geometry.center();
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7, roughness: 0.4 });
    const bucketMesh = new THREE.Mesh(geometry, material);
    bucketMesh.scale.set(0.8, 0.8, 0.8);
    bucketMesh.position.y = 0.5; // Bucket height / 2, relative to group position
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

function createKrebsFurnace(scene, position) { // position.y is the ground level
    const furnaceGroup = new THREE.Group();
    furnaceGroup.position.copy(position); // position.y is ground level
    furnaceGroup.rotation.y = -Math.PI / 2;

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    const baseGeometry = new THREE.BoxGeometry(1.2, 1.5, 1.2); 
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = 1.5/2; // Relative to group position
    baseMesh.castShadow = true; baseMesh.receiveShadow = true;
    baseMesh.name = "furnaceBase_highlight";
    furnaceGroup.add(baseMesh);

    const fireMaterial = new THREE.MeshStandardMaterial({ color: CONSTANTS.EMBER_COLOR, emissive: CONSTANTS.EMBER_COLOR, emissiveIntensity: 0.8, roughness: 0.6 });
    const fireGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.2); 
    const firebox = new THREE.Mesh(fireGeometry, fireMaterial);
    firebox.position.set(0, 0.5, -0.5); // Relative to group
    furnaceGroup.add(firebox);

    const chimneyGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.8);
    const chimney = new THREE.Mesh(chimneyGeometry, baseMaterial);
    const chimneyHeight = 0.8;
    const baseTopY = 1.5; // Base height, since base is centered at baseHeight/2 relative to group Y.
    chimney.position.y = baseTopY + chimneyHeight / 2; // Relative to group
    furnaceGroup.add(chimney);

    furnaceGroup.userData = { type: 'krebsFurnace', name: 'Krebs Cycle Furnace', mainMesh: baseMesh };
    scene.add(furnaceGroup);
    interactiveObjects.push(furnaceGroup);
    originalMaterials.set(baseMesh, baseMesh.material.clone());
    
    const label = createTextSprite("Krebs Cycle Furnace", { x: position.x, y: position.y + 2.4, z: position.z }, { fontSize: 30, scale: 0.6 });
    scene.add(label); 

    const smokeEmitterLocalPos = new THREE.Vector3(0, chimney.position.y + chimneyHeight / 2 + 0.1, 0);
    const smokeEmitterWorldPos = smokeEmitterLocalPos.clone().applyQuaternion(furnaceGroup.quaternion).add(furnaceGroup.position);

    createSimpleParticleSystem( scene, 40, CONSTANTS.SMOKE_COLOR, 0.08, 0.4, 3.5, smokeEmitterWorldPos, new THREE.Vector3(0.1, 0.3, 0.1));
    return furnaceGroup;
}

function createORNT1Portal(scene) {
    const portalGeometry = new THREE.TorusGeometry(1.5, 0.3, 16, 50);
    const portalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide });
    const ornT1Portal = new THREE.Mesh(portalGeometry, portalMaterial);
    ornT1Portal.position.set(CONSTANTS.PORTAL_WALL_X + 0.05, CONSTANTS.WALL_HEIGHT / 2 + 0.1, CONSTANTS.PORTAL_WALL_CENTER_Z);
    ornT1Portal.rotation.y = Math.PI / 2;
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

    const portalLabel = createTextSprite("ORNT1 Portal", { x: ornT1Portal.position.x, y: ornT1Portal.position.y + 2.0, z: ornT1Portal.position.z }, { fontSize: 36, scale: 0.75 });
    scene.add(portalLabel);

    const barrierGeometry = new THREE.PlaneGeometry(CONSTANTS.PORTAL_GAP_WIDTH - 0.1, CONSTANTS.WALL_HEIGHT - 0.1);
    const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    portalBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    portalBarrier.position.set(CONSTANTS.PORTAL_WALL_X, CONSTANTS.WALL_HEIGHT / 2, CONSTANTS.PORTAL_WALL_CENTER_Z);
    portalBarrier.rotation.y = Math.PI / 2;
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


// Decorative elements
function addMitoCristae(scene) {
    const cristaeMat = new THREE.MeshStandardMaterial({ color: CONSTANTS.MITO_SECONDARY_COLOR, roughness: 0.9, side:THREE.DoubleSide });
    const cristaeHeight = CONSTANTS.WALL_HEIGHT * 0.6;
    const cristaeDepth = 0.2;
    const numCristaeSets = 4;

    for (let i = 0; i < numCristaeSets; i++) {
        const cristaeLength = CONSTANTS.MITO_WIDTH * (0.15 + Math.random() * 0.25);
        let xPos = CONSTANTS.MIN_X + CONSTANTS.MITO_WIDTH * (0.3 + i * 0.18) + (Math.random()-0.5) * 1.5;
        let zPos = (Math.random() - 0.5) * (CONSTANTS.MAX_Z - CONSTANTS.MIN_Z) * 0.7;

        const alcoveXMin = CONSTANTS.MIN_X - 1; 
        const alcoveXMax = CONSTANTS.ALCOVE_OPENING_X_PLANE + 1; 
        const alcoveZMin = CONSTANTS.ALCOVE_Z_START - 1; 
        const alcoveZMax = CONSTANTS.ALCOVE_Z_END + 1; 

        if (xPos > alcoveXMin && xPos < alcoveXMax && zPos > alcoveZMin && zPos < alcoveZMax) {
            if (Math.random() < 0.5) { 
                 xPos = CONSTANTS.ALCOVE_OPENING_X_PLANE + 1.5 + Math.random() * 2;
            } else { 
                zPos = (Math.random() < 0.5) ? (CONSTANTS.MIN_Z + cristaeLength/2 + 1) : (CONSTANTS.MAX_Z - cristaeLength/2 - 1);
            }
        }
        if (xPos > CONSTANTS.DIVIDING_WALL_X - (cristaeDepth/2 + 1) && xPos < CONSTANTS.DIVIDING_WALL_X + (cristaeDepth/2 + 1) &&
            zPos > CONSTANTS.PORTAL_WALL_CENTER_Z - (CONSTANTS.PORTAL_GAP_WIDTH/2 + cristaeLength/2) &&
            zPos < CONSTANTS.PORTAL_WALL_CENTER_Z + (CONSTANTS.PORTAL_GAP_WIDTH/2 + cristaeLength/2)) {
            continue; 
        }


        const cristaeGeo = new THREE.BoxGeometry(cristaeDepth, cristaeHeight, cristaeLength);
        const crista = new THREE.Mesh(cristaeGeo, cristaeMat);
        crista.position.set(xPos, cristaeHeight / 2, zPos); // Positioned on flat ground
        crista.receiveShadow = true;
        scene.add(crista);
    }
}

function addCytoVesicles(scene) {
    const vesicleMat = new THREE.MeshStandardMaterial({ color: 0xAACCFF, transparent: true, opacity: 0.5, roughness: 0.3 });
    for (let i = 0; i < 15; i++) {
        const radius = Math.random() * 0.3 + 0.2;
        const vesicleGeo = new THREE.SphereGeometry(radius, 8, 6);
        const vesicle = new THREE.Mesh(vesicleGeo, vesicleMat);
        vesicle.position.set(
            CONSTANTS.DIVIDING_WALL_X + Math.random() * CONSTANTS.CYTO_WIDTH * 0.8 + 1,
            Math.random() * 1.5 + 0.5,
            (Math.random() - 0.5) * (CONSTANTS.MAX_Z - CONSTANTS.MIN_Z) * 0.8
        );
        scene.add(vesicle);
    }
}

export function updateResourceHover(elapsedTime) {
    const hoverSpeed = 2;
    const hoverAmount = 0.2;
    resourceMeshes.forEach((resource, index) => {
        if (resource?.parent && resource.userData?.initialY !== undefined) {
            // Hover relative to its initial Y, which is already calculated based on baseLevelY + offset
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
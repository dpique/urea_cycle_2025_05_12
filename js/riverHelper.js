// River creation helper with corrected north-south flow
import * as THREE from 'three';
import { riverVertexShader, riverFragmentShader } from './riverShaders.js';

export function createRiverWithFlow(scene, CONSTANTS) {
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
    
    // Create animated water with shader material
    const waterShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            flowSpeed: { value: 0.3 },
            waveHeight: { value: 0.03 },
            color: { value: new THREE.Color(0x2E7FB5) },
            opacity: { value: 0.75 }
        },
        vertexShader: riverVertexShader,
        fragmentShader: riverFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const waterSegmentsX = 10;
    const waterSegmentsZ = 40;
    const waterGeometry = new THREE.PlaneGeometry(CONSTANTS.RIVER_WIDTH * 0.9, CONSTANTS.TOTAL_DEPTH * 1.2, waterSegmentsX, waterSegmentsZ);
    
    const waterSurface = new THREE.Mesh(waterGeometry, waterShaderMaterial);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.set(CONSTANTS.RIVER_CENTER_X, -0.4, 0);
    waterSurface.userData.isWater = true;
    scene.add(waterSurface);
    
    // Add second water layer for depth
    const underWaterMaterial = waterShaderMaterial.clone();
    underWaterMaterial.uniforms.opacity.value = 0.5;
    underWaterMaterial.uniforms.flowSpeed.value = 0.2;
    
    const underWaterSurface = new THREE.Mesh(waterGeometry.clone(), underWaterMaterial);
    underWaterSurface.rotation.x = -Math.PI / 2;
    underWaterSurface.position.set(CONSTANTS.RIVER_CENTER_X, -0.6, 0);
    underWaterSurface.userData.isWater = true;
    scene.add(underWaterSurface);
    
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
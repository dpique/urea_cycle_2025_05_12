// js/riverHelper.js
import * as THREE from 'three';

const riverVertexShader = `
    uniform float time;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;

    void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Create gentle flowing waves (north-south direction)
        float wave1 = sin(position.x * 1.0 + time * 0.5) * 0.05;
        float wave2 = sin(position.x * 2.0 - time * 0.7) * 0.03;
        float wave3 = sin(position.x * 3.0 + time * 0.3) * 0.02;
        
        // Flow direction (north-south)
        float flow = sin(position.y * 0.5 - time * 0.8) * 0.02;
        
        pos.z += wave1 + wave2 + wave3 + flow;
        
        vElevation = pos.z;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const riverFragmentShader = `
    uniform float time;
    uniform vec3 waterColor;
    uniform vec3 sunColor;
    uniform vec3 sunDirection;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;

    void main() {
        // Base water color with depth variation
        vec3 deepWater = waterColor * 0.5;
        vec3 shallowWater = waterColor * 1.2;
        
        // Create animated caustics pattern
        float caustics1 = sin(vUv.x * 20.0 + time * 0.5) * sin(vUv.y * 20.0 - time * 0.3);
        float caustics2 = sin(vUv.x * 30.0 - time * 0.7) * sin(vUv.y * 30.0 + time * 0.4);
        float causticsPattern = (caustics1 + caustics2) * 0.1 + 0.5;
        
        // Mix water color based on depth
        vec3 waterCol = mix(deepWater, shallowWater, causticsPattern);
        
        // Add subtle foam at edges
        float edgeFoam = smoothstep(0.9, 0.95, abs(vUv.x - 0.5) * 2.0);
        vec3 foamColor = vec3(0.9, 0.95, 1.0) * edgeFoam * 0.5;
        
        // Simple fresnel effect for reflectivity
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        vec3 reflectionColor = sunColor * fresnel * 0.3;
        
        // Combine all effects
        vec3 finalColor = waterCol + foamColor + reflectionColor;
        
        gl_FragColor = vec4(finalColor, 0.85);
    }
`;

export function createRiverWithFlow(scene, constants) {
    // Create river bed (darker area beneath water)
    const riverBedGeometry = new THREE.PlaneGeometry(constants.RIVER_WIDTH * 0.8, constants.TOTAL_DEPTH, 1, 1);
    const riverBedMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e,
        roughness: 1.0 
    });
    const riverBed = new THREE.Mesh(riverBedGeometry, riverBedMaterial);
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(constants.RIVER_CENTER_X, -1.2, 0);
    scene.add(riverBed);
    
    // Create river banks
    createRiverBanks(scene, constants);
    
    // Create water surface
    const waterGeometry = new THREE.PlaneGeometry(constants.RIVER_WIDTH * 0.9, constants.TOTAL_DEPTH, 30, 50);

    const waterMaterial = new THREE.ShaderMaterial({
        vertexShader: riverVertexShader,
        fragmentShader: riverFragmentShader,
        uniforms: {
            time: { value: 0.0 },
            waterColor: { value: new THREE.Color(0x2980b9) },
            sunColor: { value: new THREE.Color(0xFFFFFF) },
            sunDirection: { value: new THREE.Vector3(0.7, 0.7, 0.7) },
        },
        transparent: true,
        side: THREE.DoubleSide,
    });

    const riverMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(constants.RIVER_CENTER_X, -0.5, 0);
    scene.add(riverMesh);

    // Animate the river
    function animateRiver() {
        waterMaterial.uniforms.time.value += 0.01;
        requestAnimationFrame(animateRiver);
    }
    animateRiver();
}

function createRiverBanks(scene, constants) {
    const bankMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b7355,
        roughness: 0.9 
    });
    
    // Create sloped banks on both sides
    const bankWidth = 2;
    const bankHeight = 1.5;
    
    // Left bank
    const leftBankGeometry = new THREE.BoxGeometry(bankWidth, bankHeight, constants.TOTAL_DEPTH);
    const leftBank = new THREE.Mesh(leftBankGeometry, bankMaterial);
    leftBank.position.set(constants.RIVER_CENTER_X - constants.RIVER_WIDTH/2 - bankWidth/2, -bankHeight/2 + 0.2, 0);
    leftBank.rotation.z = Math.PI / 8; // Slope towards river
    scene.add(leftBank);
    
    // Right bank
    const rightBankGeometry = new THREE.BoxGeometry(bankWidth, bankHeight, constants.TOTAL_DEPTH);
    const rightBank = new THREE.Mesh(rightBankGeometry, bankMaterial);
    rightBank.position.set(constants.RIVER_CENTER_X + constants.RIVER_WIDTH/2 + bankWidth/2, -bankHeight/2 + 0.2, 0);
    rightBank.rotation.z = -Math.PI / 8; // Slope towards river
    scene.add(rightBank);
    
    // Add some rocks along the banks
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.9 
    });
    
    for (let i = 0; i < 20; i++) {
        const rockScale = 0.2 + Math.random() * 0.4;
        const rock = new THREE.Mesh(
            new THREE.SphereGeometry(rockScale, 6, 6),
            rockMaterial
        );
        
        const side = Math.random() > 0.5 ? 1 : -1;
        const xPos = constants.RIVER_CENTER_X + side * (constants.RIVER_WIDTH/2 + 0.5 + Math.random());
        const zPos = -constants.TOTAL_DEPTH/2 + Math.random() * constants.TOTAL_DEPTH;
        
        rock.position.set(xPos, -0.3 + rockScale/2, zPos);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        
        scene.add(rock);
    }
}

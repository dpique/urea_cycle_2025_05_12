// js/sceneSetup.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let scene, camera, renderer, controls, ambientLight, directionalLight; // Export lights

export function initScene(canvasElement) {
    scene = new THREE.Scene();
    
    // Create RuneScape-style skybox with proper environment
    const loader = new THREE.CubeTextureLoader();
    
    // Create procedural sky gradient as fallback
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d');
    
    // Create sky gradient texture
    const gradient = ctx.createLinearGradient(0, 0, 0, skyCanvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(0.4, '#98D8E8');
    gradient.addColorStop(0.7, '#B0E0E6'); // Powder blue
    gradient.addColorStop(1, '#F0E68C'); // Khaki horizon
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
    
    // Add some cloud patterns
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * skyCanvas.width;
        const y = Math.random() * skyCanvas.height * 0.6;
        const w = 50 + Math.random() * 100;
        const h = 20 + Math.random() * 30;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    scene.background = skyTexture;
    
    // Create sun
    const sunGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFAA,
        emissive: 0xFFFFAA,
        emissiveIntensity: 1
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(50, 80, -100);
    scene.add(sun);
    
    // Sun glow
    const glowGeometry = new THREE.SphereGeometry(8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFAA,
        transparent: true,
        opacity: 0.3
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    sunGlow.position.copy(sun.position);
    scene.add(sunGlow);
    
    // Add volumetric clouds at different heights
    const cloudGroups = new THREE.Group();
    for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 15; i++) {
            const cloudGroup = new THREE.Group();
            
            // Create cloud from multiple spheres for volumetric look
            const numSpheres = 5 + Math.floor(Math.random() * 5);
            for (let j = 0; j < numSpheres; j++) {
                const radius = 8 + Math.random() * 12;
                const cloudPart = new THREE.Mesh(
                    new THREE.SphereGeometry(radius, 8, 6),
                    new THREE.MeshBasicMaterial({ 
                        color: 0xFFFFFF,
                        transparent: true,
                        opacity: 0.4 - layer * 0.1
                    })
                );
                cloudPart.position.set(
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 20
                );
                cloudGroup.add(cloudPart);
            }
            
            cloudGroup.position.set(
                (Math.random() - 0.5) * 400,
                60 + layer * 30 + Math.random() * 20,
                (Math.random() - 0.5) * 400
            );
            cloudGroup.userData.driftSpeed = 0.05 + Math.random() * 0.1;
            cloudGroup.userData.initialX = cloudGroup.position.x;
            cloudGroups.add(cloudGroup);
        }
    }
    scene.add(cloudGroups);
    scene.userData.cloudGroups = cloudGroups;

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); 
    directionalLight.position.set(15, 20, 10); 
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -30; 
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.camera.far = 100;


    scene.add(directionalLight);

    // Fog - adjusted for infinite terrain horizon
    scene.fog = new THREE.Fog(0x87CEEB, 50, 400);


    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.enableRotate = true;  // Enable mouse rotation
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.ROTATE
    };
    // Limit vertical rotation
    controls.minPolarAngle = Math.PI / 4; // 45 degrees
    controls.maxPolarAngle = Math.PI * 0.75; // 135 degrees

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls, ambientLight, directionalLight };
}
// js/sceneSetup.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let scene, camera, renderer, controls, ambientLight, directionalLight; // Export lights

export function initScene(canvasElement) {
    scene = new THREE.Scene();
    
    // Create gradient sky
    const skyGeometry = new THREE.SphereGeometry(500, 32, 15);
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
    
    // Add simple clouds
    const cloudGeometry = new THREE.SphereGeometry(15, 8, 6);
    const cloudMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.6 
    });
    
    for (let i = 0; i < 8; i++) {
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloud.position.set(
            (Math.random() - 0.5) * 200,
            30 + Math.random() * 20,
            (Math.random() - 0.5) * 200
        );
        cloud.scale.set(
            1 + Math.random() * 2,
            0.5 + Math.random() * 0.5,
            1 + Math.random() * 2
        );
        scene.add(cloud);
    }
    
    // Add distant mountains
    const mountainGeometry = new THREE.ConeGeometry(20, 40, 4);
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    
    for (let i = 0; i < 5; i++) {
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        const angle = (i / 5) * Math.PI * 2;
        mountain.position.set(
            Math.cos(angle) * 150,
            0,
            Math.sin(angle) * 150
        );
        mountain.scale.set(
            1 + Math.random() * 0.5,
            0.8 + Math.random() * 0.4,
            1 + Math.random() * 0.5
        );
        scene.add(mountain);
    }

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

    // Fog - adjusted for seamless landscape with distant mountains
    scene.fog = new THREE.Fog(0x87CEEB, 30, 200);


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
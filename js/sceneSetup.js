// js/sceneSetup.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let scene, camera, renderer, controls, ambientLight, directionalLight; // Export lights

export function initScene(canvasElement) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue for outdoor feel

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

    // Fog - adjusted for outdoor sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 30, 80);


    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls, ambientLight, directionalLight };
}
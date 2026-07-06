// src/core/renderer.js
// Scene, camera, renderer, the warm lighting rig, gradient sky dome, and fog. The look
// of the game lives here: soft key light with shadows, a hemispheric bounce, warm fill,
// and a vertical-gradient sky that the district palette drives.

import * as THREE from 'three';

export let scene = null;
export let camera = null;
export let renderer = null;

let skyMat = null;
let keyLight = null;
let hemi = null;

const SKY_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const SKY_FRAG = `
  varying vec3 vWorldPos;
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  void main() {
    float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
    float t = max(pow(max(h, 0.0), exponent), 0.0);
    gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
  }
`;

export function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe9dcbf, 40, 260);

  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 14);

  // Sky dome — a big back-side sphere with a gradient shader.
  const skyGeo = new THREE.SphereGeometry(500, 24, 16);
  skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x7ec8e3) },
      bottomColor: { value: new THREE.Color(0xf6e7c8) },
      offset: { value: 60 },
      exponent: { value: 0.7 },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.userData.persistent = true;
  scene.add(sky);

  // Warm hemispheric bounce (sky above, ground below).
  hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a55, 0.85);
  hemi.userData.persistent = true;
  scene.add(hemi);

  // Warm ambient fill so shadows never go black.
  const ambient = new THREE.AmbientLight(0xfff0d8, 0.35);
  ambient.userData.persistent = true;
  scene.add(ambient);

  // Key light with soft shadows.
  keyLight = new THREE.DirectionalLight(0xfff2df, 1.35);
  keyLight.position.set(38, 60, 28);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 220;
  const d = 90;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  keyLight.userData.persistent = true;
  scene.add(keyLight);
  scene.add(keyLight.target);

  window.addEventListener('resize', onResize);
  return { scene, camera, renderer };
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// District theming: set sky gradient + fog together so the world reads as one place.
export function setAtmosphere({ skyTop, skyBottom, fog, fogNear = 45, fogFar = 260 }) {
  if (skyMat) {
    if (skyTop != null) skyMat.uniforms.topColor.value.setHex(skyTop);
    if (skyBottom != null) skyMat.uniforms.bottomColor.value.setHex(skyBottom);
  }
  if (fog != null && scene.fog) {
    scene.fog.color.setHex(fog);
    scene.fog.near = fogNear;
    scene.fog.far = fogFar;
  }
}

// Keep the shadow frustum centered on the player so shadows stay crisp everywhere.
export function followShadow(targetPos) {
  if (!keyLight) return;
  keyLight.position.set(targetPos.x + 38, targetPos.y + 60, targetPos.z + 28);
  keyLight.target.position.copy(targetPos);
  keyLight.target.updateMatrixWorld();
}

export function render() {
  renderer.render(scene, camera);
}

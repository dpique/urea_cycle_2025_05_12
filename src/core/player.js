// src/core/player.js
// The player: a distinct low-poly hero, a third-person camera-relative controller with
// terrain following, jump, and axis-separated collision. Carries the current molecule in
// a slot beside the body so the "show, do not tell" transformation is always visible.

import * as THREE from 'three';
import * as mat from '../art/materials.js';
import { camState, getMoveAxis } from './input.js';
import { camera, followShadow } from './renderer.js';

export let player = null;
let carriedSlot = null;
let carried = null;
let legL, legR, armL, armR;
let vVel = 0;
let grounded = true;
const SPEED = 8.5;
const GRAVITY = 26;
const JUMP_V = 10.5;
const tmp = new THREE.Vector3();

export function initPlayer(scene) {
  player = new THREE.Group();
  player.userData.isPlayer = true;
  player.userData.persistent = true;

  const skin = 0xf0c088;
  const tunic = 0x3f9a5a; // green hero tunic
  const tunicDark = 0x2f7444;

  // legs
  const legGeo = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
  legL = new THREE.Mesh(legGeo, mat.toon(0x3a3530));
  legR = new THREE.Mesh(legGeo, mat.toon(0x3a3530));
  legL.position.set(-0.17, 0.4, 0);
  legR.position.set(0.17, 0.4, 0);
  legL.castShadow = legR.castShadow = true;
  player.add(legL, legR);

  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.5, 6, 12), mat.toon(tunic));
  torso.position.y = 1.0;
  torso.castShadow = true;
  player.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 12), mat.toon(tunicDark));
  belt.position.y = 0.8;
  player.add(belt);

  // arms
  const armGeo = new THREE.CapsuleGeometry(0.11, 0.42, 4, 8);
  armL = new THREE.Mesh(armGeo, mat.toon(tunic));
  armR = new THREE.Mesh(armGeo, mat.toon(tunic));
  armL.position.set(-0.47, 1.0, 0);
  armR.position.set(0.47, 1.0, 0);
  armL.castShadow = armR.castShadow = true;
  player.add(armL, armR);
  for (const side of [-1, 1]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat.toon(skin));
    hand.position.set(side * 0.47, 0.72, 0.02);
    player.add(hand);
  }

  // head + simple face + hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), mat.toon(skin));
  head.position.y = 1.6;
  head.castShadow = true;
  player.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat.toon(0x6b4a2f));
  hair.position.y = 1.66;
  player.add(hair);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat.unlit(0x241f1b));
    eye.position.set(side * 0.1, 1.62, 0.29);
    player.add(eye);
  }

  // carried molecule slot — floats at the left hand, always in view
  carriedSlot = new THREE.Group();
  carriedSlot.position.set(-0.75, 1.15, 0.3);
  player.add(carriedSlot);

  player.position.set(0, 0.5, 0);
  scene.add(player);
  return player;
}

export function setCarriedMolecule(mesh) {
  clearCarried();
  if (mesh) {
    mesh.scale.multiplyScalar(0.7);
    carriedSlot.add(mesh);
    carried = mesh;
  }
}
export function clearCarried() {
  if (carried) {
    carriedSlot.remove(carried);
    disposeTree(carried);
    carried = null;
  }
}
export function getCarried() {
  return carried;
}
export function getCarriedWorldPos(out = new THREE.Vector3()) {
  return carriedSlot.getWorldPosition(out);
}

export function placePlayer(pos) {
  player.position.set(pos.x, pos.y ?? 0.5, pos.z);
  vVel = 0;
}

// opts: { frozen, terrainAt(x,z)->y, collides(vec3)->bool }
export function updatePlayer(dt, elapsed, opts = {}) {
  const { frozen = false, terrainAt = () => 0, collides = () => false } = opts;

  // --- horizontal movement (camera relative) ---
  const axis = frozen ? { x: 0, z: 0, moving: false } : getMoveAxis();
  const ca = camState.yaw;
  const forward = tmp.set(Math.sin(ca), 0, Math.cos(ca));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3()
    .addScaledVector(forward, -axis.z)
    .addScaledVector(right, axis.x);
  if (move.lengthSq() > 0) move.normalize();

  const step = SPEED * dt;
  if (axis.moving) {
    // axis-separated so you slide along walls instead of sticking
    const nx = player.position.clone();
    nx.x += move.x * step;
    if (!collides(nx)) player.position.x = nx.x;
    const nz = player.position.clone();
    nz.z += move.z * step;
    if (!collides(nz)) player.position.z = nz.z;
    // face travel direction
    const targetYaw = Math.atan2(move.x, move.z);
    player.rotation.y = lerpAngle(player.rotation.y, targetYaw, 0.25);
  }

  // --- vertical: terrain follow + jump/gravity ---
  const groundY = Math.max(0, terrainAt(player.position.x, player.position.z));
  if (grounded && !frozen && opts.jump) vVel = JUMP_V;
  vVel -= GRAVITY * dt;
  player.position.y += vVel * dt;
  if (player.position.y <= groundY + 0.5) {
    player.position.y = groundY + 0.5;
    vVel = 0;
    grounded = true;
  } else {
    grounded = false;
  }

  // --- animation ---
  if (axis.moving) {
    const s = Math.sin(elapsed * 12) * 0.5;
    legL.rotation.x = s;
    legR.rotation.x = -s;
    armL.rotation.x = -s * 0.6;
    armR.rotation.x = s * 0.6;
  } else {
    legL.rotation.x *= 0.8;
    legR.rotation.x *= 0.8;
    armL.rotation.x *= 0.8;
    armR.rotation.x *= 0.8;
  }
  if (carried) {
    carried.rotation.y += dt * 1.2;
    carried.position.y = Math.sin(elapsed * 2.5) * 0.05;
  }

  updateCamera(dt);
  followShadow(player.position);
}

function updateCamera(dt) {
  const ca = camState.yaw;
  const horiz = camState.distance * Math.cos(camState.pitch);
  const vert = camState.distance * Math.sin(camState.pitch);
  const forward = new THREE.Vector3(Math.sin(ca), 0, Math.cos(ca));
  const head = player.position.clone().add(new THREE.Vector3(0, 1.3, 0));
  const desired = head.clone().addScaledVector(forward, -horiz).add(new THREE.Vector3(0, vert, 0));
  camera.position.lerp(desired, Math.min(1, 8 * dt));
  camera.lookAt(head);
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isMesh) o.geometry?.dispose?.();
  });
}

// src/worlds/ureaCycle.world.js
// The Nitrogen Works. Purpose made visceral: you start carrying neurotoxic ammonia (the
// toxicity gauge sits high, the screen edges tint green) and the whole point is to run
// the cycle and package it as harmless urea. The mitochondrial membrane is a river; the
// first two enzymes are on the mito bank, the rest across the ORNT1 bridge in the cytosol.

import * as THREE from 'three';
import * as props from '../art/props.js';
import * as stations from '../art/stations.js';
import * as mat from '../art/materials.js';
import { makeCharacter } from '../art/character.js';
import { DISTRICT, GAUGE, CURRENCY } from '../art/palette.js';
import { ureaCycle } from '../data/pathways/ureaCycle.js';
import { portal } from './shared.js';

const D = DISTRICT.nitrogen;

export const config = {
  id: 'urea-cycle',
  name: 'The Nitrogen Works',
  tagline: 'Urea Cycle — turn toxic ammonia into safe urea',
  spawnPoint: { x: -26, y: 0.6, z: -2 },
};

let controller = null;
let toxByIndex = [0.9, 0.62, 0.5, 0.4, 0.28, 0.15, 0.0];

export function init(ctx) {
  ctx.setAtmosphere({ skyTop: D.sky.top, skyBottom: D.sky.bottom, fog: D.fog, fogNear: 45, fogFar: 230 });
  ctx.interaction.setIndicatorColor(D.accent);
  ctx.setTerrain(() => 0);
  ctx.setCollider((p) => {
    const inRiver = Math.abs(p.x) < 1.9;
    const onBridge = p.z > -3 && p.z < 3;
    if (inRiver && !onBridge) return true;
    return Math.abs(p.x) > 34 || Math.abs(p.z) > 26;
  });

  // ground: mitochondrion (west) and cytosol (east), split by the membrane river
  const mito = props.groundPlane(36, 52, 0x9c8f6f);
  mito.position.set(-18, 0, 0);
  ctx.worldRoot.add(mito);
  const cyto = props.groundPlane(36, 52, D.ground);
  cyto.position.set(18, 0, 0);
  ctx.worldRoot.add(cyto);

  // the membrane river
  const river = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 52), mat.glass(0x4f7ad0, 0.5));
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.05, 0);
  ctx.worldRoot.add(river);

  // the ORNT1 bridge across the river
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 4.5), mat.solid(0x8a5a3b, { rough: 0.9 }));
  bridge.position.set(0, 0.12, 0);
  bridge.receiveShadow = true;
  ctx.worldRoot.add(bridge);
  const gate = stations.membraneGate(0x9b6bd6);
  gate.position.set(0, 0, 0);
  ctx.worldRoot.add(gate);
  // the Ornithine Usher stands on the bridge and teaches transport (not a reaction step)
  const usher = makeCharacter('ornt1');
  usher.position.set(0, 0.2, 3.4);
  usher.rotation.y = Math.PI;
  ctx.worldRoot.add(usher);
  usher.userData.name = 'The Ornithine Usher (ORNT1)';
  usher.userData.prompt = 'Press E — The Ornithine Usher';
  usher.userData.interactRadius = 3.2;
  usher.userData.anchor = usher.position.clone();
  usher.userData.onInteract = () =>
    ctx.dialogue.show({
      speaker: 'The Ornithine Usher',
      color: 0x9b6bd6,
      lines: [
        'This bridge is the ORNT1 transporter on the mitochondrial membrane.',
        'Citrulline crosses out to the cytosol; ornithine comes back in. One in, one out.',
      ],
    });
  ctx.addInteractable(usher);

  // zone labels
  const mitoSign = props.sign('Mitochondrion', { boardColor: 0xb0a17e });
  mitoSign.position.set(-30, 0, -18);
  ctx.worldRoot.add(mitoSign);
  const cytoSign = props.sign('Cytosol', { boardColor: 0xc9d0bd });
  cytoSign.position.set(30, 0, -18);
  ctx.worldRoot.add(cytoSign);

  // --- source stations (placed by the world, not the pathway runner) ---
  makeNagesh(ctx, new THREE.Vector3(-22, 0, 9));
  makeAtpCrystal(ctx, new THREE.Vector3(-18, 0, -12), 2);
  makeAtpCrystal(ctx, new THREE.Vector3(-9, 0, 12), 2);
  makeAspartate(ctx, new THREE.Vector3(4, 0, 10));

  // an ammonia cloud at the spawn, to sell where the poison comes from
  const cloud = props.cloud();
  cloud.scale.setScalar(0.9);
  cloud.position.set(-26, 3.2, -4);
  cloud.traverse((o) => { if (o.isMesh) o.material = mat.glass(0x8ed64a, 0.4); });
  ctx.worldRoot.add(cloud);

  // --- the 6 reaction steps ---
  const placements = [
    { pos: new THREE.Vector3(-14, 0, -5), facing: -Math.PI / 2 }, // CPS1 (mito)
    { pos: new THREE.Vector3(-8, 0, 5), facing: -Math.PI / 2 }, // OTC (mito)
    { pos: new THREE.Vector3(10, 0, 7), facing: Math.PI / 2 }, // ASS (cytosol)
    { pos: new THREE.Vector3(17, 0, -2), facing: Math.PI / 2 }, // ASL
    { pos: new THREE.Vector3(23, 0, 6), facing: Math.PI / 2 }, // ARG1
    { pos: new THREE.Vector3(29, 0, -3), facing: Math.PI }, // waste chute
  ];

  controller = ctx.startPathway({
    def: ureaCycle,
    placements,
    onProgress: (idx) => {
      ctx.hud.setGauge({ name: GAUGE.toxicity.label, value: toxByIndex[idx] ?? 0, color: GAUGE.toxicity.fill, danger: 'high', text: idx === 0 ? 'toxic!' : idx >= 6 ? 'safe' : 'clearing' });
    },
    onComplete: (res) => {
      if (res.passed) ctx.audio.success();
    },
  });

  // portals
  portal(ctx, {
    pos: new THREE.Vector3(-30, 0, 12),
    label: 'Back to The Atrium',
    color: 0x6cc0c0,
    onEnter: (c) => c.goToWorld('hub', { spawn: { x: 0, y: 0.6, z: -10 } }),
  });
  portal(ctx, {
    pos: new THREE.Vector3(31, 0, 12),
    label: 'To the Mitochondrion (TCA)',
    color: 0xf4a259,
    prompt: 'Press E — follow the fumarate',
    onEnter: (c) => {
      c.dialogue.show({
        speaker: 'The Fumarate Path',
        color: 0xf4a259,
        lines: [
          'Aslan (ASL) split off fumarate here. Fumarate feeds straight into the TCA cycle.',
          'That is the aspartate-argininosuccinate shunt linking nitrogen disposal to energy metabolism.',
          'The TCA district is not open in this build. Soon.',
        ],
      });
    },
  });

  // toxicity vignette while still carrying ammonia
  ctx.onUpdate((dt, t) => {
    controller?.update(dt, t);
    usher.userData.animate?.(t);
    const toxic = controller && controller.current === 0;
    document.body.classList.toggle('toxic', !!toxic);
    river.material.opacity = 0.45 + Math.sin(t * 2) * 0.06;
  });

  ctx.hud.toast('Ammonia is neurotoxic. Brew NAG at Nagesh, grab ATP, then wake Casper (CPS1) fast.', 5600, 'warn');
}

export function cleanup() {
  controller = null;
  document.body.classList.remove('toxic');
}

// --- source station builders ---
function makeNagesh(ctx, pos) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.add(stations.pad(0x8a5a3b, 2.0));
  const kettle = stations.kettle(0x8a5a3b);
  kettle.position.set(0.7, 0.28, 0);
  g.add(kettle);
  const nagesh = makeCharacter('nags');
  nagesh.position.set(-0.7, 0.28, 0.2);
  nagesh.rotation.y = 0.4;
  g.add(nagesh);
  const label = props.textSprite("Nagesh's Kettle (NAGS)", { scale: 0.6, color: '#2a2420', bg: 'rgba(255,255,255,0.82)' });
  label.position.y = 2.6;
  g.add(label);
  ctx.worldRoot.add(g);

  g.userData.name = 'Nagesh';
  g.userData.prompt = 'Press E — brew NAG';
  g.userData.interactRadius = 3.4;
  g.userData.anchor = pos.clone();
  g.userData.body = nagesh;
  g.userData.onInteract = () =>
    ctx.dialogue.show({
      speaker: 'Nagesh',
      color: 0x8a5a3b,
      lines: [
        'Fresh pot of NAG — N-acetylglutamate — from acetyl-CoA and glutamate.',
        'Casper (CPS1) will not wake without it. NAG is his coffee.',
      ],
      choices: [
        {
          text: 'Take NAG',
          action: () => {
            ctx.economy.addItem('NAG', 1);
            ctx.audio.pickup();
            ctx.hud.toast('Got NAG — the activator for CPS1.', 3200, 'teach');
          },
        },
        { text: 'Later', action: null },
      ],
    });
  ctx.onUpdate((dt, t) => kettle.userData.animate?.(t));
  ctx.addInteractable(g);
}

function makeAtpCrystal(ctx, pos, amount) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const cluster = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9 + i * 0.2, 5), mat.glow(CURRENCY.ATP, 1));
    c.position.set((i - 1) * 0.3, 0.5, 0);
    c.rotation.z = (i - 1) * 0.2;
    cluster.add(c);
  }
  g.add(cluster);
  const light = new THREE.PointLight(CURRENCY.ATP, 5, 8, 2);
  light.position.y = 1;
  g.add(light);
  ctx.worldRoot.add(g);

  g.userData.name = 'ATP crystals';
  g.userData.prompt = `Press E — gather ${amount} ATP`;
  g.userData.interactRadius = 3;
  g.userData.anchor = pos.clone();
  g.userData.onInteract = () => {
    if (g.userData.disabled) return;
    ctx.economy.addCurrency('ATP', amount);
    ctx.audio.pickup();
    ctx.hud.toast(`+${amount} ATP. This is the same ATP glycolysis makes.`, 3200, 'teach');
    g.userData.disabled = true;
    cluster.visible = false;
    light.intensity = 0;
  };
  ctx.onUpdate((dt, t) => (cluster.rotation.y = t));
  ctx.addInteractable(g);
}

function makeAspartate(ctx, pos) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), mat.solid(0x6a5a8a, { rough: 0.7 }));
  cart.position.y = 0.6;
  g.add(cart);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), mat.glow(0x9b6bd6, 0.6));
  tank.position.y = 1.1;
  g.add(tank);
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 14), mat.solid(0x3a3530));
    w.position.set(side * 0.5, 0.3, 0.42);
    g.add(w);
  }
  const label = props.textSprite('Aspartate Shuttle', { scale: 0.55, color: '#2a2420', bg: 'rgba(255,255,255,0.82)' });
  label.position.y = 2;
  g.add(label);
  ctx.worldRoot.add(g);

  g.userData.name = 'Aspartate shuttle';
  g.userData.prompt = 'Press E — collect aspartate';
  g.userData.interactRadius = 3;
  g.userData.anchor = pos.clone();
  g.userData.onInteract = () =>
    ctx.dialogue.show({
      speaker: 'Aspartate Shuttle',
      color: 0x9b6bd6,
      lines: ['Aspartate carries the SECOND nitrogen into the cycle, at Donkey (ASS).'],
      choices: [
        {
          text: 'Take aspartate',
          action: () => {
            ctx.economy.addItem('aspartate', 1);
            ctx.audio.pickup();
            ctx.hud.toast('Got aspartate — the second nitrogen donor.', 3200, 'teach');
          },
        },
        { text: 'Later', action: null },
      ],
    });
  ctx.onUpdate((dt, t) => (tank.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.2));
  ctx.addInteractable(g);
}

// src/worlds/glycolysis.world.js
// Furnace Row. A hill you climb during the ATP investment phase, peaking at the aldolase
// split, then descend during the payoff phase — the terrain is the energy accounting.

import * as THREE from 'three';
import * as props from '../art/props.js';
import * as stations from '../art/stations.js';
import * as mat from '../art/materials.js';
import { DISTRICT, CURRENCY } from '../art/palette.js';
import { glycolysis } from '../data/pathways/glycolysis.js';
import { portal, scatter } from './shared.js';

const D = DISTRICT.furnace;
const START_Z = 38;
const PEAK_Z = -8;
const END_Z = -88;
const TOP = 7;

function smooth(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}
export function hillHeight(x, z) {
  if (z >= START_Z || z <= END_Z) return 0;
  if (z > PEAK_Z) return TOP * smooth((START_Z - z) / (START_Z - PEAK_Z));
  return TOP * smooth((z - END_Z) / (PEAK_Z - END_Z));
}

export const config = {
  id: 'glycolysis',
  name: 'Furnace Row',
  tagline: 'Glycolysis — break the sugar down for energy',
  spawnPoint: { x: 0, y: 1.2, z: 34 },
};

let controller = null;

export function init(ctx) {
  ctx.setAtmosphere({ skyTop: D.sky.top, skyBottom: D.sky.bottom, fog: D.fog, fogNear: 40, fogFar: 220 });
  ctx.interaction.setIndicatorColor(D.accent);
  ctx.setTerrain(hillHeight);
  ctx.setCollider((p) => Math.abs(p.x) > 26 || p.z > 46 || p.z < -100);

  // hill ground
  const ground = props.heightField(80, 150, 2, 90, hillHeight, D.ground);
  ctx.worldRoot.add(ground);

  // a path stripe up the middle so the route reads clearly
  for (let z = START_Z - 2; z > END_Z + 2; z -= 3) {
    const tile = props.padRing(0, 3.2, D.groundAccent);
    tile.position.set(0, hillHeight(0, z) + 0.03, z);
    ctx.worldRoot.add(tile);
  }

  // decorations: lava vents, rocks, lanterns
  const vents = [];
  scatter(ctx, () => {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 6), mat.glow(0xe0503a, 0.7));
    cone.position.y = 0.8;
    g.add(cone);
    const glowTop = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), mat.glow(0xffcf3f, 1.2));
    glowTop.position.y = 1.7;
    g.add(glowTop);
    g.userData.glow = glowTop;
    vents.push(g);
    return g;
  }, 10, { area: 24, clear: 9, seed: 3 });
  // keep vents on the terrain surface
  for (const v of vents) v.position.y = hillHeight(v.position.x, v.position.z);

  scatter(ctx, () => props.rock(0.8 + 0.4, 0x8a5a3b), 14, { area: 24, clear: 7, seed: 7 });

  // stations along the hill
  const placements = glycolysis.steps.map((_, i) => {
    const z = 28 - i * 12;
    return { pos: new THREE.Vector3(0, hillHeight(0, z), z), facing: 0 };
  });

  const energyByIndex = [0.5, 0.34, 0.34, 0.18, 0.18, 0.18, 0.46, 0.62, 0.62, 0.62, 0.88];
  controller = ctx.startPathway({
    def: glycolysis,
    placements,
    onProgress: (idx) => {
      ctx.hud.setGauge({ name: 'ENERGY (this trace)', value: energyByIndex[idx] ?? 0.5, color: CURRENCY.ATP, text: idx < 3 ? 'investing' : idx >= 6 ? 'earning' : 'break-even' });
    },
    onComplete: (res) => {
      if (res.passed) ctx.audio.success();
    },
  });

  // Pike's cannon beside the last station, aimed toward the mitochondrion (north/-Z)
  const cannon = stations.cannon(0xb02a35);
  const lastZ = 28 - 9 * 12;
  cannon.position.set(2.6, hillHeight(2.6, lastZ), lastZ + 1);
  cannon.rotation.y = Math.PI; // face -Z
  ctx.worldRoot.add(cannon);

  // portals
  portal(ctx, {
    pos: new THREE.Vector3(0, 0, 43),
    label: 'Back to The Atrium',
    color: 0x6cc0c0,
    onEnter: (c) => c.goToWorld('hub', { spawn: { x: 0, y: 0.6, z: 10 } }),
  });

  portal(ctx, {
    pos: new THREE.Vector3(0, 0, -94),
    label: 'To the Mitochondrion (TCA)',
    color: 0xf4a259,
    prompt: 'Press E — follow the pyruvate',
    onEnter: (c) => {
      c.dialogue.show({
        speaker: 'The Gangplank',
        color: 0xf4a259,
        lines: [
          'Pike launches pyruvate here. Next it meets Percy — pyruvate dehydrogenase (PDH).',
          'PDH turns pyruvate into acetyl-CoA (irreversible) to enter the TCA cycle.',
          'The mitochondrion district is not open in this build. Soon.',
        ],
      });
    },
  });

  // ambient flicker
  ctx.onUpdate((dt, t) => {
    controller?.update(dt, t);
    for (const v of vents) {
      const g = v.userData.glow;
      if (g) g.material.emissiveIntensity = 1 + Math.sin(t * 6 + v.position.x) * 0.5;
    }
  });

  ctx.hud.toast('Furnace Row: carry glucose downhill through glycolysis. Uphill spends ATP, downhill earns it.', 5200, 'teach');
}

export function cleanup() {
  controller = null;
}

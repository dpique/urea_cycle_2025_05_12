// src/worlds/hub.world.js
// The Atrium — the cell's central crossroads (cytosol). No pathway here; it establishes
// the world, the guide, the shared-economy readout, and the portals to each district.

import * as THREE from 'three';
import * as props from '../art/props.js';
import { makeCharacter } from '../art/character.js';
import { DISTRICT } from '../art/palette.js';
import * as economy from '../core/economy.js';
import { portal } from './shared.js';

const D = DISTRICT.atrium;

export const config = {
  id: 'hub',
  name: 'The Atrium',
  tagline: 'The living cell — choose a district',
  spawnPoint: { x: 0, y: 0.6, z: 6 },
};

let greeted = false;

export function init(ctx) {
  ctx.setAtmosphere({ skyTop: D.sky.top, skyBottom: D.sky.bottom, fog: D.fog, fogNear: 55, fogFar: 260 });
  ctx.interaction.setIndicatorColor(D.accent);
  ctx.setTerrain(() => 0);
  ctx.setCollider((p) => Math.hypot(p.x, p.z) > 27);

  // circular plaza
  const plaza = props.groundDisc(26, D.ground);
  ctx.worldRoot.add(plaza);
  const inlay = props.padRing(9, 9.6, D.accent);
  ctx.worldRoot.add(inlay);
  const core = props.padRing(0, 3.2, D.groundAccent);
  ctx.worldRoot.add(core);

  // a low railing ring and lanterns for warmth
  const ringCount = 12;
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    const lantern = props.lantern(0xffcf3f);
    lantern.position.set(Math.cos(a) * 24, 0, Math.sin(a) * 24);
    ctx.worldRoot.add(lantern);
  }
  for (const [x, z] of [[-18, 14], [18, 14], [-20, -4], [20, -4]]) {
    const t = props.tree(4.5);
    t.position.set(x, 0, z);
    ctx.worldRoot.add(t);
  }

  // the mentor: Professor Hepaticus
  const mentor = makeCharacter('mentor');
  mentor.position.set(0, 0, -7);
  ctx.worldRoot.add(mentor);
  mentor.userData.name = 'Professor Hepaticus';
  mentor.userData.prompt = 'Press E — Professor Hepaticus';
  mentor.userData.interactRadius = 3.6;
  mentor.userData.anchor = mentor.position.clone();
  mentor.userData.body = mentor;
  mentor.userData.onInteract = () => intro(ctx);
  ctx.addInteractable(mentor);

  // a board naming the cell
  const board = props.sign('METABOLON — a living liver cell', { boardColor: D.groundAccent });
  board.position.set(0, 0, 8);
  ctx.worldRoot.add(board);

  // portals to the districts
  const glyDone = economy.isWorldComplete('glycolysis');
  const ureaDone = economy.isWorldComplete('urea-cycle');
  portal(ctx, {
    pos: new THREE.Vector3(14, 0, -12),
    label: `Furnace Row — Glycolysis${glyDone ? ' ✓' : ''}`,
    color: 0xe0503a,
    prompt: 'Press E — enter Glycolysis',
    onEnter: (c) => c.goToWorld('glycolysis', { spawn: { x: 0, y: 1.2, z: 34 } }),
  });
  portal(ctx, {
    pos: new THREE.Vector3(-14, 0, -12),
    label: `The Nitrogen Works — Urea Cycle${ureaDone ? ' ✓' : ''}`,
    color: 0x8ed64a,
    prompt: 'Press E — enter the Urea Cycle',
    onEnter: (c) => c.goToWorld('urea-cycle', { spawn: { x: -26, y: 0.6, z: -2 } }),
  });
  portal(ctx, {
    pos: new THREE.Vector3(0, 0, -20),
    label: 'The Mitochondrion — TCA (coming soon)',
    color: 0xf4a259,
    prompt: 'Press E — descend to the mitochondrion',
    onEnter: (c) =>
      c.dialogue.show({
        speaker: 'Descent to the Mitochondrion',
        color: 0xf4a259,
        lines: [
          'Below the cytosol lies the mitochondrion: TCA cycle, the electron transport chain, fatty-acid oxidation.',
          'Active transport in costs ATP — the elevator charges at the turnstile.',
          'This district is not open in this build. It is next.',
        ],
      }),
  });

  ctx.onUpdate((dt, t) => mentor.userData.animate?.(t));

  if (!greeted) {
    greeted = true;
    setTimeout(() => intro(ctx), 900);
  } else {
    ctx.hud.toast('Back in The Atrium. Choose a district.', 2600);
  }
}

function intro(ctx) {
  ctx.dialogue.show({
    speaker: 'Professor Hepaticus',
    color: 0x3f6fb0,
    lines: [
      'Welcome. You are standing inside one living liver cell, and your job is to keep it running.',
      'That floating spark beside you is Coa — Coenzyme A, the cell\'s courier. Coa turns up in every district.',
      'A cell must do two things above all: make energy, and clear its poisons.',
      'Furnace Row (glycolysis) makes ATP. The Nitrogen Works (urea cycle) clears toxic ammonia.',
      'The ATP you earn in one district is spent in another. Start with Furnace Row if you like.',
    ],
    choices: [
      { text: 'To Furnace Row (Glycolysis)', action: () => ctx.goToWorld('glycolysis', { spawn: { x: 0, y: 1.2, z: 34 } }) },
      { text: 'To The Nitrogen Works (Urea)', action: () => ctx.goToWorld('urea-cycle', { spawn: { x: -26, y: 0.6, z: -2 } }) },
      { text: 'Look around first', action: null },
    ],
  });
}

export function cleanup() {}

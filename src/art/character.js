// src/art/character.js
// Low-poly character builder. Every enzyme character's look encodes a board fact, so
// the appearance is the mnemonic. A generic rounded humanoid is the base; presets add
// the signature feature (Percy's four fingers plus L prosthetic, Casper the ghost's
// need for coffee, Donkey's ears, Aslan's mane, Argus's many eyes).
//
// Each character returns a THREE.Group with:
//   userData.animate(t)      idle motion, called every frame
//   userData.faceHead(dir)   turn the head toward a world direction (interaction uses it)

import * as THREE from 'three';
import * as mat from './materials.js';
import { NEUTRAL, CURRENCY } from './palette.js';

// --- Generic humanoid -------------------------------------------------------------
function humanoid(cfg = {}) {
  const {
    body = 0x4f9dde,
    head = 0xf0d9b5,
    height = 1.8,
    girth = 1,
    expression = 'neutral',
  } = cfg;
  const g = new THREE.Group();

  // Legs
  const legMat = mat.toon(cfg.legColor ?? NEUTRAL.charcoal);
  const legGeo = new THREE.CapsuleGeometry(0.16 * girth, 0.42, 4, 8);
  const legL = new THREE.Mesh(legGeo, legMat);
  const legR = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.2 * girth, 0.42, 0);
  legR.position.set(0.2 * girth, 0.42, 0);
  legL.castShadow = legR.castShadow = true;
  g.add(legL, legR);

  // Torso — a rounded capsule
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.36 * girth, 0.5, 6, 12),
    mat.toon(body)
  );
  torso.position.y = 1.02;
  torso.castShadow = true;
  g.add(torso);

  // Arms
  const armMat = mat.toon(body);
  const armGeo = new THREE.CapsuleGeometry(0.12 * girth, 0.44, 4, 8);
  const armL = new THREE.Mesh(armGeo, armMat);
  const armR = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.5 * girth, 1.02, 0);
  armR.position.set(0.5 * girth, 1.02, 0);
  armL.castShadow = armR.castShadow = true;
  g.add(armL, armR);

  // Hands
  const handMat = mat.toon(head);
  const handGeo = new THREE.SphereGeometry(0.13 * girth, 10, 8);
  const handL = new THREE.Mesh(handGeo, handMat);
  const handR = new THREE.Mesh(handGeo, handMat);
  handL.position.set(-0.5 * girth, 0.74, 0.02);
  handR.position.set(0.5 * girth, 0.74, 0.02);
  g.add(handL, handR);

  // Head group (so it can turn independently)
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.62;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), mat.toon(head));
  skull.scale.set(1, 1.02, 0.96);
  skull.castShadow = true;
  headGroup.add(skull);
  headGroup.add(buildFace(expression));
  g.add(headGroup);

  // scale to requested height (base build is ~1.96 tall)
  const s = height / 1.96;
  g.scale.setScalar(s);

  g.userData.parts = { torso, headGroup, armL, armR, legL, legR, skull };
  const phase = Math.random() * Math.PI * 2;
  g.userData.baseY = g.position.y;
  g.userData.animate = (t) => {
    const b = Math.sin(t * 2 + phase);
    torso.position.y = 1.02 + b * 0.02;
    headGroup.position.y = 1.62 + b * 0.02;
    armL.rotation.x = b * 0.12;
    armR.rotation.x = -b * 0.12;
  };
  g.userData.faceHead = (worldDir) => {
    const local = g.worldToLocal(worldDir.clone());
    headGroup.rotation.y = Math.atan2(local.x, local.z);
  };
  return g;
}

function buildFace(expression = 'neutral') {
  const f = new THREE.Group();
  const eyeMat = mat.unlit(0x241f1b);
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeY = expression === 'sleepy' ? 0.06 : 0.08;
  eyeL.position.set(-0.12, eyeY, 0.3);
  eyeR.position.set(0.12, eyeY, 0.3);
  f.add(eyeL, eyeR);

  if (expression === 'stern') {
    const browGeo = new THREE.BoxGeometry(0.12, 0.03, 0.02);
    const bL = new THREE.Mesh(browGeo, eyeMat);
    const bR = new THREE.Mesh(browGeo, eyeMat);
    bL.position.set(-0.12, 0.16, 0.31);
    bR.position.set(0.12, 0.16, 0.31);
    bL.rotation.z = -0.3;
    bR.rotation.z = 0.3;
    f.add(bL, bR);
  }
  if (expression === 'wide' || expression === 'happy') {
    eyeL.scale.setScalar(1.3);
    eyeR.scale.setScalar(1.3);
  }

  // mouth
  const mouthMat = mat.unlit(0x7a3b34);
  let mouth;
  if (expression === 'happy') {
    mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), mouthMat);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.06, 0.31);
  } else if (expression === 'sleepy') {
    mouth = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), mouthMat);
    mouth.position.set(0, -0.08, 0.32);
  } else {
    mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), mouthMat);
    mouth.position.set(0, -0.08, 0.31);
  }
  f.add(mouth);
  return f;
}

// --- Hats / headwear --------------------------------------------------------------
function hardhat(color = 0xffcf3f) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.toon(color));
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 16), mat.toon(color));
  brim.position.y = 0.02;
  g.add(dome, brim);
  g.position.y = 0.24;
  return g;
}
function cap(color) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.toon(color));
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.3), mat.toon(color));
  brim.position.set(0, 0.02, 0.28);
  g.add(dome, brim);
  g.position.y = 0.22;
  return g;
}
function wizardHat(color) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 8), mat.toon(color));
  cone.position.y = 0.55;
  return cone;
}
function apron(color) {
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.12), mat.toon(color));
  a.position.set(0, 0.9, 0.3);
  return a;
}

// Give a character a glowing cofactor bead in-hand (kinases spark, dehydrogenases glow).
function handBead(character, color, side = 1) {
  const bead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mat.glow(color, 1.1));
  bead.position.set(0.5 * side, 0.74, 0.12);
  character.add(bead);
  return bead;
}

// --- Coa: the recurring companion (Coenzyme A, the universal acyl carrier) ---------
export function makeCompanion() {
  const g = new THREE.Group();
  // a floating rounded body with a reactive thiol "hand"
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 16), mat.toon(0xe8c84a));
  body.scale.set(1, 0.92, 1);
  g.add(body);
  g.add(buildFace('happy'));
  // sulfur thiol hand — the reactive -SH that molecules clip onto
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.24, 4, 6), mat.toon(0xe8c84a));
  arm.position.set(0.34, -0.1, 0.1);
  arm.rotation.z = -0.7;
  g.add(arm);
  const thiol = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat.glow(0xe8c84a, 0.7));
  thiol.position.set(0.52, -0.22, 0.15);
  g.add(thiol);
  g.userData.thiol = thiol;
  // little antenna so it reads as alive, not an egg
  const ant = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat.glow(CURRENCY.ATP, 1));
  ant.position.set(0, 0.5, 0);
  g.add(ant);
  g.userData.animate = (t) => {
    g.position.y = (g.userData.hoverBase ?? 0) + Math.sin(t * 2.2) * 0.12;
    g.rotation.y = Math.sin(t * 0.6) * 0.25;
    thiol.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.3;
  };
  g.scale.setScalar(0.9);
  return g;
}

// --- Enzyme presets ---------------------------------------------------------------
// Each returns a fully-built character. Signature features are commented with the fact.
const presets = {
  // Glycolysis
  hexokinase() {
    // kinase: yellow ATP spark in hand; eager, first in line
    const c = humanoid({ body: 0xf2b134, head: 0xf0d9b5, expression: 'happy' });
    c.userData.parts.headGroup.add(cap(0xd98324));
    handBead(c, CURRENCY.ATP, 1);
    return c;
  },
  pgi() {
    // isomerase: acrobat, slim; hands out to "rearrange"
    const c = humanoid({ body: 0x6cc0c0, head: 0xf0d9b5, expression: 'wide', girth: 0.85 });
    c.userData.parts.armL.rotation.z = 0.6;
    c.userData.parts.armR.rotation.z = -0.6;
    return c;
  },
  pfk1() {
    // THE gatekeeper, rate-limiting. Board fact: activated by AMP and fructose-2,6-BP,
    // inhibited by ATP and citrate. Encoded as green (go) and red (stop) buttons on a vest.
    const c = humanoid({ body: 0x3a4a5a, head: 0xf0d9b5, expression: 'stern', height: 1.95, girth: 1.1 });
    c.userData.parts.headGroup.add(hardhat(0xe0503a));
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.16), mat.toon(0x2a3542));
    vest.position.set(0, 0.95, 0.32);
    c.add(vest);
    const greens = [[-0.2, 1.05], [-0.05, 1.05]]; // AMP, F-2,6-BP (activators)
    const reds = [[0.05, 1.05], [0.2, 1.05]]; // ATP, citrate (inhibitors)
    for (const [x, y] of greens) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), mat.glow(0x63c76a, 0.9));
      b.rotation.x = Math.PI / 2;
      b.position.set(x, y, 0.42);
      c.add(b);
    }
    for (const [x, y] of reds) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), mat.glow(0xe0503a, 0.9));
      b.rotation.x = Math.PI / 2;
      b.position.set(x, y, 0.42);
      c.add(b);
    }
    return c;
  },
  aldolase() {
    // lyase: the splitter. Holds a cleaver; split silhouette hinted with two-tone body.
    const c = humanoid({ body: 0x9b5de5, head: 0xf0d9b5, expression: 'stern' });
    const cleaver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.24), mat.solid(0xcfc7b6, { metal: 0.6 }));
    cleaver.position.set(0.55, 0.9, 0.15);
    c.add(cleaver);
    return c;
  },
  tpi() {
    // isomerase mirror twin: two-faced hint via a mirror prop
    const c = humanoid({ body: 0x00b4d8, head: 0xf0d9b5, expression: 'wide', girth: 0.9 });
    const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.24, 5), mat.glass(0xbfe9f5, 0.7));
    mirror.position.set(0.55, 1.0, 0.2);
    c.add(mirror);
    return c;
  },
  gapdh() {
    // oxidoreductase: electron-obsessed; NADH blue glow in hand; parched dehydrogenase look
    const c = humanoid({ body: 0x4f9dde, head: 0xe8d5b5, expression: 'wide' });
    handBead(c, CURRENCY.NADH, -1);
    return c;
  },
  pgk() {
    // kinase, generous: gives ATP back
    const c = humanoid({ body: 0xf2c94c, head: 0xf0d9b5, expression: 'happy' });
    handBead(c, CURRENCY.ATP, 1);
    return c;
  },
  pgm() {
    // mutase: shifty; moves phosphate within the molecule
    const c = humanoid({ body: 0x7b8a99, head: 0xf0d9b5, expression: 'neutral', girth: 0.95 });
    c.userData.parts.headGroup.add(cap(0x55606b));
    return c;
  },
  enolase() {
    // lyase (dehydratase): wrings water out
    const c = humanoid({ body: 0x2a9d8f, head: 0xe8d5b5, expression: 'stern' });
    return c;
  },
  pk() {
    // kinase, explosive, triumphant; launches pyruvate. Cannon lives in the station.
    const c = humanoid({ body: 0xe0503a, head: 0xf0d9b5, expression: 'happy', height: 1.9 });
    c.userData.parts.headGroup.add(cap(0xb02a35));
    handBead(c, CURRENCY.ATP, 1);
    return c;
  },

  // Urea cycle
  nags() {
    // the coffee brewer. Makes NAG ("Nagesh's Coffee") that wakes CPS1. Apron + mug.
    const c = humanoid({ body: 0x8a5a3b, head: 0xf0d9b5, expression: 'happy' });
    c.add(apron(0xd9b382));
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.16, 10), mat.toon(0x3a3530));
    mug.position.set(0.5, 0.78, 0.15);
    c.add(mug);
    const steam = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat.glow(0xffffff, 0.4, { opacity: 0.5 }));
    steam.position.set(0.5, 0.95, 0.15);
    c.add(steam);
    return c;
  },
  cps1() {
    // Casper the ghost — rate-limiting, "buried deep" in mitochondria, needs NAG to wake.
    // Ghost form encodes: sluggish until activated. Translucent, floaty, sleepy face.
    const g = new THREE.Group();
    const bodyMat = mat.glass(0xdfe7ee, 0.72);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), bodyMat);
    body.scale.set(1, 1.5, 1);
    body.position.y = 1.1;
    g.add(body);
    // wavy hem
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bodyMat);
      lobe.position.set(Math.cos(a) * 0.42, 0.62, Math.sin(a) * 0.42);
      g.add(lobe);
    }
    const face = buildFace('sleepy');
    face.position.y = 1.35;
    face.scale.setScalar(1.2);
    g.add(face);
    g.userData.animate = (t) => {
      g.position.y = (g.userData.hoverBase ?? 0) + Math.sin(t * 1.5) * 0.08;
    };
    g.userData.faceHead = () => {};
    g.userData.awaken = () => {
      face.clear();
      const awake = buildFace('wide');
      awake.position.set(0, 0, 0);
      awake.scale.setScalar(1.2);
      face.add(awake);
    };
    return g;
  },
  otc() {
    // sturdy, reliable, unfussy. Board: X-linked (the one), most common, orotic acid up.
    // Encode X-linked with a subtle "X" emblem on the chest.
    const c = humanoid({ body: 0x5a7d5a, head: 0xf0d9b5, expression: 'neutral', height: 1.85, girth: 1.05 });
    const emblem = textSpriteMini('X');
    emblem.position.set(0, 1.0, 0.4);
    c.add(emblem);
    return c;
  },
  ornt1() {
    // The Ornithine Usher — a doorman on the membrane bridge. Tall, formal, lantern.
    const c = humanoid({ body: 0x4a3b6a, head: 0xf0d9b5, expression: 'neutral', height: 2.0, girth: 0.95 });
    c.userData.parts.headGroup.add(wizardHat(0x2f2547));
    return c;
  },
  ass() {
    // Donkey — pun on ASS. Stubborn. Ears + muzzle. Board: 2nd nitrogen via aspartate; ATP.
    const c = humanoid({ body: 0xa8a0a0, head: 0xcfc9c4, expression: 'stern', height: 1.7 });
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 6), mat.toon(0xcfc9c4));
      ear.position.set(side * 0.14, 2.0, -0.02);
      ear.rotation.z = side * 0.25;
      c.add(ear);
    }
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat.toon(0xe8e2dc));
    muzzle.position.set(0, 1.55, 0.3);
    muzzle.scale.set(1, 0.7, 0.8);
    c.add(muzzle);
    return c;
  },
  asl() {
    // Aslan — ASL is a Lyase, L = Lion. Noble mane. Board: makes fumarate (TCA link);
    // deficiency = trichorrhexis nodosa (brittle hair) — the mane is the hook.
    const c = humanoid({ body: 0xd98324, head: 0xf0c98a, expression: 'wide', height: 1.95, girth: 1.1 });
    const maneMat = mat.toon(0xb5651d);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 4), maneMat);
      tuft.position.set(Math.cos(a) * 0.4, 1.62 + Math.sin(a) * 0.1, Math.sin(a) * 0.4 * 0.4);
      tuft.lookAt(tuft.position.clone().multiplyScalar(2).setY(tuft.position.y));
      c.add(tuft);
    }
    return c;
  },
  arg1() {
    // Argus — many-eyed guardian (Argus Panoptes). Board: arginine -> ornithine + urea;
    // regenerates ornithine (closes the cycle). Eyes all over the body.
    const c = humanoid({ body: 0x3a6a5a, head: 0xd8e0d8, expression: 'wide', height: 1.9, girth: 1.1 });
    const eyeMat = mat.unlit(0xf7f3ea);
    const pupilMat = mat.unlit(0x241f1b);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const yy = 0.85 + (i % 3) * 0.14;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeMat);
      eye.position.set(Math.cos(a) * 0.37, yy, Math.sin(a) * 0.37);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), pupilMat);
      pupil.position.copy(eye.position).add(new THREE.Vector3(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05));
      c.add(eye, pupil);
    }
    return c;
  },

  // Mentor
  mentor() {
    // Professor Hepaticus — the liver. Wise, tall, robe, staff. Not an enzyme.
    const c = humanoid({ body: 0x3f6fb0, head: 0xf0d9b5, expression: 'happy', height: 2.15, girth: 1.15 });
    c.userData.parts.headGroup.add(wizardHat(0x2a4d80));
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 8), mat.toon(0xf7f3ea));
    beard.position.set(0, 1.4, 0.22);
    beard.rotation.x = Math.PI;
    c.add(beard);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6), mat.solid(NEUTRAL.wood));
    staff.position.set(0.6, 1.0, 0);
    c.add(staff);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), mat.glow(0x6cc0c0, 1));
    orb.position.set(0.6, 2.0, 0);
    c.add(orb);
    return c;
  },
};

// tiny white-on-transparent glyph for chest emblems
function textSpriteMini(ch) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(240,240,240,0.9)';
  ctx.fillText(ch, 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.scale.setScalar(0.35);
  return s;
}

export function makeCharacter(presetId, opts = {}) {
  const fn = presets[presetId] || presets.mentor;
  const c = fn();
  c.userData.presetId = presetId;
  if (opts.scale) c.scale.multiplyScalar(opts.scale);
  return c;
}

export const CHARACTER_PRESETS = Object.keys(presets);

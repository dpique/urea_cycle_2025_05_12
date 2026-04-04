// js/characterBuilder.js
// Procedural character generator for visually distinct NPCs.
// Each character gets unique body proportions, head shape, accessories, and pose.

import * as THREE from 'three';
import { createTextSprite } from './utils.js';

// Body type presets
const BODY_TYPES = {
    stocky:    { bodyW: 0.55, bodyH: 0.7, bodyD: 0.4, legH: 0.4, armLen: 0.5, headR: 0.32, scale: 1.0 },
    average:   { bodyW: 0.4,  bodyH: 0.9, bodyD: 0.3, legH: 0.6, armLen: 0.55, headR: 0.3,  scale: 1.0 },
    tall:      { bodyW: 0.35, bodyH: 1.1, bodyD: 0.25, legH: 0.8, armLen: 0.6, headR: 0.28, scale: 1.1 },
    large:     { bodyW: 0.6,  bodyH: 1.0, bodyD: 0.5, legH: 0.5, armLen: 0.55, headR: 0.38, scale: 1.2 },
    small:     { bodyW: 0.3,  bodyH: 0.6, bodyD: 0.25, legH: 0.35, armLen: 0.4, headR: 0.25, scale: 0.85 },
    wide:      { bodyW: 0.65, bodyH: 0.75, bodyD: 0.45, legH: 0.45, armLen: 0.5, headR: 0.33, scale: 1.0 },
};

// Head shape options
const HEAD_SHAPES = {
    round:     (r) => new THREE.SphereGeometry(r, 12, 10),
    boxy:      (r) => new THREE.BoxGeometry(r * 1.6, r * 1.6, r * 1.5),
    tall:      (r) => { const g = new THREE.SphereGeometry(r, 12, 10); g.scale(0.85, 1.3, 0.9); return g; },
    flat:      (r) => { const g = new THREE.SphereGeometry(r, 12, 10); g.scale(1.2, 0.7, 1.0); return g; },
    pointy:    (r) => new THREE.ConeGeometry(r * 0.9, r * 2.2, 8),
};

// Hat styles
function createHat(type, color, headR) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5, emissive: color, emissiveIntensity: 0.1 });

    switch (type) {
        case 'cone': {
            const hat = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.8, headR * 1.5, 6), mat);
            hat.position.y = headR * 0.6;
            group.add(hat);
            break;
        }
        case 'tophat': {
            // Brim
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.1, headR * 1.1, 0.06, 12), mat);
            group.add(brim);
            // Crown
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.6, headR * 0.65, headR * 1.2, 10), mat);
            crown.position.y = headR * 0.6;
            group.add(crown);
            break;
        }
        case 'fedora': {
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.2, headR * 1.1, 0.05, 12), mat);
            group.add(brim);
            const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.7, 8, 6), mat);
            crown.scale.y = 0.6;
            crown.position.y = headR * 0.25;
            group.add(crown);
            break;
        }
        case 'helmet': {
            const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
            group.add(dome);
            // Visor
            const visorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
            const visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.5, headR * 0.15, headR * 0.4), visorMat);
            visor.position.set(0, -headR * 0.1, headR * 0.6);
            group.add(visor);
            break;
        }
        case 'crown': {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.75, headR * 0.8, headR * 0.4, 6), mat);
            group.add(band);
            // Crown points
            const pointMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.3 });
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i;
                const point = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), pointMat);
                point.position.set(Math.cos(angle) * headR * 0.7, headR * 0.3, Math.sin(angle) * headR * 0.7);
                group.add(point);
            }
            break;
        }
        case 'beret': {
            const beret = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.85, 8, 6), mat);
            beret.scale.set(1.3, 0.4, 1.3);
            beret.position.y = headR * 0.15;
            group.add(beret);
            break;
        }
        case 'hardhat': {
            const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
            group.add(dome);
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.15, headR * 1.2, 0.06, 12), mat);
            rim.position.y = -headR * 0.05;
            group.add(rim);
            break;
        }
        case 'none':
        default:
            break;
    }
    return group;
}

// Accessory creation
function createAccessory(type, color, bodyType) {
    const group = new THREE.Group();

    switch (type) {
        case 'shield': {
            const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 });
            const shield = new THREE.Mesh(new THREE.CircleGeometry(0.3, 6), mat);
            shield.position.set(-bodyType.bodyW / 2 - 0.25, bodyType.legH + bodyType.bodyH * 0.5, 0.1);
            group.add(shield);
            // Shield boss
            const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
            boss.position.copy(shield.position);
            boss.position.z += 0.05;
            group.add(boss);
            break;
        }
        case 'apron': {
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
            const apron = new THREE.Mesh(new THREE.BoxGeometry(bodyType.bodyW * 0.8, bodyType.bodyH * 0.6, 0.05), mat);
            apron.position.set(0, bodyType.legH + bodyType.bodyH * 0.3, bodyType.bodyD / 2 + 0.03);
            group.add(apron);
            break;
        }
        case 'glasses': {
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
            const lensGeo = new THREE.TorusGeometry(0.07, 0.015, 6, 8);
            [-0.1, 0.1].forEach(x => {
                const lens = new THREE.Mesh(lensGeo, frameMat);
                lens.position.set(x, 0, 0.25);
                group.add(lens);
            });
            // Bridge
            const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4), frameMat);
            bridge.rotation.z = Math.PI / 2;
            bridge.position.set(0, 0, 0.28);
            group.add(bridge);
            break;
        }
        case 'cape': {
            const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 });
            const capeGeo = new THREE.PlaneGeometry(bodyType.bodyW * 1.4, bodyType.bodyH * 1.2);
            const cape = new THREE.Mesh(capeGeo, mat);
            cape.position.set(0, bodyType.legH + bodyType.bodyH * 0.5, -bodyType.bodyD / 2 - 0.05);
            cape.rotation.x = 0.15; // Slight flare
            group.add(cape);
            break;
        }
        case 'belt': {
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
            const belt = new THREE.Mesh(new THREE.CylinderGeometry(bodyType.bodyW / 2 + 0.02, bodyType.bodyW / 2 + 0.02, 0.08, 12), mat);
            belt.position.set(0, bodyType.legH + bodyType.bodyH * 0.3, 0);
            group.add(belt);
            // Buckle
            const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.7 }));
            buckle.position.set(0, bodyType.legH + bodyType.bodyH * 0.3, bodyType.bodyW / 2 + 0.02);
            group.add(buckle);
            break;
        }
        case 'medal': {
            const mat = new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.8, roughness: 0.2, emissive: 0xffaa00, emissiveIntensity: 0.2 });
            const medal = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), mat);
            medal.position.set(0.05, bodyType.legH + bodyType.bodyH * 0.7, bodyType.bodyD / 2 + 0.02);
            group.add(medal);
            break;
        }
        case 'wrench': {
            const mat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), mat);
            handle.position.set(bodyType.bodyW / 2 + 0.15, bodyType.legH + bodyType.bodyH * 0.4, 0);
            handle.rotation.z = 0.3;
            group.add(handle);
            const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), mat);
            jaw.position.set(bodyType.bodyW / 2 + 0.3, bodyType.legH + bodyType.bodyH * 0.55, 0);
            group.add(jaw);
            break;
        }
    }
    return group;
}

// Expression (eyes and mouth on the head)
function addFace(headGroup, headR, expression) {
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    switch (expression) {
        case 'stern': {
            // Angled brows, small eyes
            [-0.1, 0.1].forEach((x, i) => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
                eye.position.set(x, headR * 0.15, headR * 0.85);
                headGroup.add(eye);
                // Brow
                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), eyeMat);
                brow.position.set(x, headR * 0.3, headR * 0.88);
                brow.rotation.z = i === 0 ? -0.3 : 0.3;
                headGroup.add(brow);
            });
            break;
        }
        case 'friendly': {
            // Big eyes, smile
            [-0.1, 0.1].forEach(x => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeMat);
                eye.position.set(x, headR * 0.15, headR * 0.85);
                headGroup.add(eye);
                // Highlight
                const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                highlight.position.set(x + 0.02, headR * 0.2, headR * 0.9);
                headGroup.add(highlight);
            });
            // Smile
            const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI), eyeMat);
            smile.position.set(0, -headR * 0.1, headR * 0.88);
            smile.rotation.x = Math.PI;
            headGroup.add(smile);
            break;
        }
        case 'intense': {
            // Narrow eyes, determined
            [-0.1, 0.1].forEach(x => {
                const eye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.03), eyeMat);
                eye.position.set(x, headR * 0.15, headR * 0.85);
                headGroup.add(eye);
            });
            break;
        }
        case 'wise': {
            // Half-closed eyes, calm
            [-0.1, 0.1].forEach(x => {
                const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.025), eyeMat);
                eye.position.set(x, headR * 0.15, headR * 0.85);
                headGroup.add(eye);
            });
            // Slight smile
            const smile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 6, Math.PI), eyeMat);
            smile.position.set(0, -headR * 0.1, headR * 0.88);
            smile.rotation.x = Math.PI;
            headGroup.add(smile);
            break;
        }
        case 'surprised': {
            // Wide round eyes, O mouth
            [-0.1, 0.1].forEach(x => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
                eye.position.set(x, headR * 0.15, headR * 0.85);
                headGroup.add(eye);
            });
            const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
            mouth.position.set(0, -headR * 0.15, headR * 0.88);
            headGroup.add(mouth);
            break;
        }
        case 'smug': {
            // One raised brow, smirk
            const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
            leftEye.position.set(-0.1, headR * 0.15, headR * 0.85);
            headGroup.add(leftEye);
            const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
            rightEye.position.set(0.1, headR * 0.18, headR * 0.85);
            headGroup.add(rightEye);
            // Raised brow
            const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), eyeMat);
            brow.position.set(0.1, headR * 0.32, headR * 0.88);
            brow.rotation.z = -0.2;
            headGroup.add(brow);
            // Smirk
            const smirk = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 6, Math.PI * 0.6), eyeMat);
            smirk.position.set(0.04, -headR * 0.1, headR * 0.88);
            smirk.rotation.x = Math.PI;
            smirk.rotation.z = -0.2;
            headGroup.add(smirk);
            break;
        }
        default: {
            // Basic eyes
            [-0.1, 0.1].forEach(x => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
                eye.position.set(x, headR * 0.15, headR * 0.85);
                headGroup.add(eye);
            });
        }
    }
}

/**
 * Build a character with distinct visual traits.
 * @param {object} config
 * @param {string} config.bodyType - Key from BODY_TYPES (stocky, average, tall, large, small, wide)
 * @param {string} config.headShape - Key from HEAD_SHAPES (round, boxy, tall, flat, pointy)
 * @param {string} config.hat - Hat style (cone, tophat, fedora, helmet, crown, beret, hardhat, none)
 * @param {number} config.hatColor - Hat color hex
 * @param {number} config.bodyColor - Body/clothing color hex
 * @param {number} config.skinColor - Skin/head color hex (default 0xffcc99)
 * @param {string} config.expression - Face expression (stern, friendly, intense, wise, surprised, smug)
 * @param {string[]} config.accessories - Array of accessory types (shield, apron, glasses, cape, belt, medal, wrench)
 * @param {number} config.accessoryColor - Color for accessories
 * @param {string} config.label - Name label text
 * @param {string} config.sublabel - Subtitle text
 * @param {number} config.sublabelColor - Subtitle color (default grey)
 * @param {number} config.armPose - Arm angle in radians (0 = down, PI/2 = out, PI = up)
 * @returns {THREE.Group}
 */
export function buildCharacter(config) {
    const bt = BODY_TYPES[config.bodyType || 'average'];
    const group = new THREE.Group();
    group.scale.setScalar(bt.scale);

    const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor || 0x4488cc, roughness: 0.6, metalness: 0.15 });
    const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor || 0xffcc99, roughness: 0.7 });
    const limbMat = new THREE.MeshStandardMaterial({ color: config.bodyColor || 0x4488cc, roughness: 0.7 });

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.11, bt.legH, 6);
    [-0.12, 0.12].forEach(x => {
        const leg = new THREE.Mesh(legGeo, limbMat);
        leg.position.set(x, bt.legH / 2, 0);
        leg.castShadow = true;
        group.add(leg);
    });

    // Body
    const bodyGeo = new THREE.CylinderGeometry(bt.bodyW / 2 - 0.02, bt.bodyW / 2, bt.bodyH, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bt.legH + bt.bodyH / 2;
    body.castShadow = true;
    group.add(body);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.07, bt.armLen, 6);
    const armPose = config.armPose !== undefined ? config.armPose : Math.PI / 6;
    [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(armGeo, limbMat);
        arm.position.set(side * (bt.bodyW / 2 + 0.08), bt.legH + bt.bodyH * 0.85, 0);
        arm.rotation.z = side * armPose;
        arm.castShadow = true;
        group.add(arm);
    });

    // Head
    const headR = bt.headR;
    const headGeo = (HEAD_SHAPES[config.headShape || 'round'])(headR);
    const head = new THREE.Mesh(headGeo, skinMat);
    const headY = bt.legH + bt.bodyH + headR * 0.9;
    head.position.y = headY;
    head.castShadow = true;
    group.add(head);

    // Face
    const faceGroup = new THREE.Group();
    faceGroup.position.y = headY;
    addFace(faceGroup, headR, config.expression || 'default');
    group.add(faceGroup);

    // Hat
    const hat = createHat(config.hat || 'none', config.hatColor || config.bodyColor || 0x4488cc, headR);
    hat.position.y = headY + headR * 0.8;
    group.add(hat);

    // Accessories
    if (config.accessories) {
        for (const accType of config.accessories) {
            const acc = createAccessory(accType, config.accessoryColor || config.bodyColor || 0x888888, bt);
            group.add(acc);
        }
    }

    // Name label
    if (config.label) {
        const label = createTextSprite(config.label, { x: 0, y: headY + headR + 1.0, z: 0 }, { scale: 1.0 });
        group.add(label);
    }
    if (config.sublabel) {
        const sub = createTextSprite(config.sublabel, { x: 0, y: headY + headR + 0.6, z: 0 }, {
            scale: 0.5, textColor: config.sublabelColor || 'rgba(200,200,200,0.7)',
        });
        group.add(sub);
    }

    return group;
}

// Preset character configs for common enzyme personality types
export const PRESETS = {
    gatekeeper: { bodyType: 'stocky', headShape: 'boxy', hat: 'helmet', expression: 'stern', accessories: ['shield'], armPose: Math.PI / 4 },
    craftsman: { bodyType: 'average', headShape: 'round', hat: 'beret', expression: 'wise', accessories: ['apron'], armPose: Math.PI / 8 },
    detective: { bodyType: 'tall', headShape: 'tall', hat: 'fedora', expression: 'intense', accessories: ['glasses'], armPose: Math.PI / 10 },
    powerhouse: { bodyType: 'large', headShape: 'boxy', hat: 'none', expression: 'stern', accessories: ['belt'], armPose: Math.PI / 3 },
    showman: { bodyType: 'tall', headShape: 'round', hat: 'tophat', expression: 'smug', accessories: ['cape'], armPose: Math.PI / 4 },
    scientist: { bodyType: 'average', headShape: 'tall', hat: 'none', expression: 'friendly', accessories: ['glasses', 'apron'], armPose: Math.PI / 8 },
    proud: { bodyType: 'average', headShape: 'round', hat: 'crown', expression: 'smug', accessories: ['medal'], armPose: Math.PI / 5 },
    worker: { bodyType: 'wide', headShape: 'flat', hat: 'hardhat', expression: 'friendly', accessories: ['belt', 'wrench'], armPose: Math.PI / 6 },
    acrobat: { bodyType: 'small', headShape: 'round', hat: 'none', expression: 'surprised', accessories: [], armPose: Math.PI / 2 },
};

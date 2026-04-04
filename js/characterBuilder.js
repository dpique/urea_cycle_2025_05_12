// js/characterBuilder.js
// Procedural character generator for visually distinct NPCs.
// Each character gets unique body proportions, head shape, accessories, and pose.

import * as THREE from 'three';
import { createTextSprite } from './utils.js';

// Darken a hex color by a factor (0-1)
function darkenColor(hex, factor) {
    const r = ((hex >> 16) & 0xff) * factor;
    const g = ((hex >> 8) & 0xff) * factor;
    const b = (hex & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

// Create a canvas texture for a face (RSC-style painted-on features)
function createFaceTexture(expression, skinColor) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Transparent background (face sits on top of head mesh)
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const eyeY = size * 0.38;
    const mouthY = size * 0.68;

    // Draw based on expression
    ctx.fillStyle = '#222';
    switch (expression) {
        case 'stern':
            // Angry brows, narrow eyes
            ctx.fillRect(cx - 28, eyeY - 2, 18, 7);
            ctx.fillRect(cx + 10, eyeY - 2, 18, 7);
            // Angled brows
            ctx.save();
            ctx.translate(cx - 19, eyeY - 10);
            ctx.rotate(-0.3);
            ctx.fillRect(0, 0, 20, 3);
            ctx.restore();
            ctx.save();
            ctx.translate(cx + 1, eyeY - 12);
            ctx.rotate(0.3);
            ctx.fillRect(0, 0, 20, 3);
            ctx.restore();
            // Flat mouth
            ctx.fillRect(cx - 12, mouthY, 24, 3);
            break;
        case 'friendly':
            // Big round eyes with highlights
            ctx.beginPath();
            ctx.arc(cx - 18, eyeY, 8, 0, Math.PI * 2);
            ctx.arc(cx + 18, eyeY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx - 15, eyeY - 3, 3, 0, Math.PI * 2);
            ctx.arc(cx + 21, eyeY - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            // Smile
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(cx, mouthY, 12, 0.1, Math.PI - 0.1);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            break;
        case 'intense':
            // Narrow slit eyes
            ctx.fillRect(cx - 28, eyeY, 22, 5);
            ctx.fillRect(cx + 6, eyeY, 22, 5);
            break;
        case 'wise':
            // Half-closed eyes, gentle smile
            ctx.fillRect(cx - 25, eyeY, 18, 4);
            ctx.fillRect(cx + 7, eyeY, 18, 4);
            ctx.beginPath();
            ctx.arc(cx, mouthY, 8, 0.2, Math.PI - 0.2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            break;
        case 'surprised':
            // Wide round eyes, O mouth
            ctx.beginPath();
            ctx.arc(cx - 18, eyeY, 10, 0, Math.PI * 2);
            ctx.arc(cx + 18, eyeY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx - 15, eyeY - 3, 4, 0, Math.PI * 2);
            ctx.arc(cx + 21, eyeY - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            // O mouth
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(cx, mouthY, 7, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'smug':
            // One eye bigger, raised brow, smirk
            ctx.beginPath();
            ctx.arc(cx - 18, eyeY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 18, eyeY - 2, 8, 0, Math.PI * 2);
            ctx.fill();
            // Raised brow
            ctx.fillRect(cx + 8, eyeY - 16, 22, 3);
            // Smirk (asymmetric)
            ctx.beginPath();
            ctx.moveTo(cx - 8, mouthY);
            ctx.quadraticCurveTo(cx + 5, mouthY + 10, cx + 15, mouthY - 2);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            break;
        default:
            // Simple dot eyes
            ctx.beginPath();
            ctx.arc(cx - 16, eyeY, 6, 0, Math.PI * 2);
            ctx.arc(cx + 16, eyeY, 6, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

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
        case 'pirate': {
            // Tricorn pirate hat
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.3, headR * 1.2, 0.06, 3), mat);
            brim.rotation.y = Math.PI / 6;
            group.add(brim);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.5, headR * 0.7, headR * 0.8, 6), mat);
            crown.position.y = headR * 0.4;
            group.add(crown);
            // Skull emblem on front
            const skullMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skullMat);
            skull.position.set(0, headR * 0.35, headR * 0.72);
            group.add(skull);
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
        case 'eyepatch': {
            const patchMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
            const patch = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), patchMat);
            patch.position.set(0.12, bodyType.legH + bodyType.bodyH + bodyType.headR * 0.95, bodyType.headR * 0.9);
            group.add(patch);
            // Strap
            const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, bodyType.headR * 2.5, 4), patchMat);
            strap.position.set(0, bodyType.legH + bodyType.bodyH + bodyType.headR * 0.9, 0);
            strap.rotation.z = Math.PI / 2;
            group.add(strap);
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

    const bodyColor = config.bodyColor || 0x4488cc;
    const pantsColor = config.pantsColor || darkenColor(bodyColor, 0.6);
    const skinColor = config.skinColor || 0xffcc99;

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75, metalness: 0.05 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8, metalness: 0.05 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });

    // RSC-style: boxy geometry, flat shading look

    // Legs -- box geometry (RSC chunky legs)
    const legW = 0.14;
    const legGeo = new THREE.BoxGeometry(legW, bt.legH, legW * 1.1);
    const legs = [];
    [-0.09, 0.09].forEach((x, i) => {
        const leg = new THREE.Mesh(legGeo, pantsMat);
        leg.position.set(x, bt.legH / 2, 0);
        leg.castShadow = true;
        leg.userData.partType = 'leg';
        leg.userData.partSide = i === 0 ? 'left' : 'right';
        leg.userData.restY = bt.legH / 2;
        group.add(leg);
        legs.push(leg);
    });

    // Feet (small boxes)
    [-0.09, 0.09].forEach(x => {
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.06, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 })
        );
        foot.position.set(x, 0.03, 0.03);
        foot.castShadow = true;
        group.add(foot);
    });

    // Body/torso -- box (RSC-style blocky)
    const bodyGeo = new THREE.BoxGeometry(bt.bodyW, bt.bodyH, bt.bodyD);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bt.legH + bt.bodyH / 2;
    body.castShadow = true;
    body.userData.partType = 'body';
    body.userData.restY = bt.legH + bt.bodyH / 2;
    group.add(body);

    // Shoulders (slightly wider than body for RSC look)
    const shoulderGeo = new THREE.BoxGeometry(bt.bodyW + 0.12, 0.08, bt.bodyD + 0.04);
    const shoulder = new THREE.Mesh(shoulderGeo, bodyMat);
    shoulder.position.y = bt.legH + bt.bodyH - 0.04;
    group.add(shoulder);

    // Arms -- box geometry
    const armW = 0.11;
    const armPose = config.armPose !== undefined ? config.armPose : Math.PI / 6;
    const arms = [];
    [-1, 1].forEach((side, i) => {
        // Upper arm
        const armGeo = new THREE.BoxGeometry(armW, bt.armLen * 0.55, armW);
        const arm = new THREE.Mesh(armGeo, bodyMat);
        arm.position.set(side * (bt.bodyW / 2 + armW / 2 + 0.02), bt.legH + bt.bodyH * 0.75, 0);
        arm.rotation.z = side * armPose;
        arm.castShadow = true;
        arm.userData.partType = 'arm';
        arm.userData.partSide = i === 0 ? 'left' : 'right';
        arm.userData.restRotZ = side * armPose;
        group.add(arm);
        arms.push(arm);

        // Hand (skin-colored box)
        const hand = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            skinMat
        );
        hand.position.set(
            side * (bt.bodyW / 2 + armW / 2 + 0.06),
            bt.legH + bt.bodyH * 0.52,
            0
        );
        group.add(hand);
    });

    // Head -- slightly oversized box with rounded edges (RSC iconic)
    const headR = bt.headR;
    const headSize = headR * 2;
    const headGeo = new THREE.BoxGeometry(headSize, headSize * 1.05, headSize * 0.9);
    const head = new THREE.Mesh(headGeo, skinMat);
    const headY = bt.legH + bt.bodyH + headR * 0.95;
    head.position.y = headY;
    head.castShadow = true;
    head.userData.partType = 'head';
    head.userData.restY = headY;
    group.add(head);

    // Canvas-painted face on the front of the head
    const faceGroup = new THREE.Group();
    faceGroup.position.y = headY;
    faceGroup.userData.partType = 'face';
    faceGroup.userData.restY = headY;
    const faceTexture = createFaceTexture(config.expression || 'default', skinColor);
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true });
    const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(headSize * 0.8, headSize * 0.8), faceMat);
    facePlane.position.z = headSize * 0.45 + 0.001;
    faceGroup.add(facePlane);
    group.add(faceGroup);

    // Store references for animation and highlighting
    group.userData.bodyMesh = body;
    group.userData.parts = { body, head, faceGroup, arms, legs };

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

    // Set mainMesh to the body for proper highlight (not a leg)
    group.userData.mainMesh = body;

    return group;
}

/**
 * Update idle animations for a character group.
 * Call this each frame for each NPC. Uses a unique seed per character for variety.
 * @param {THREE.Group} charGroup - The character group from buildCharacter()
 * @param {number} elapsedTime - Total elapsed time
 * @param {number} seed - Unique seed per character (use position.x + position.z or index)
 */
export function updateCharacterIdle(charGroup, elapsedTime, seed = 0) {
    const parts = charGroup.userData.parts;
    if (!parts) return;

    const t = elapsedTime;
    const s = seed;

    // Breathing: body bobs up/down slightly
    if (parts.body) {
        parts.body.position.y = parts.body.userData.restY + Math.sin(t * 1.2 + s) * 0.015;
    }

    // Head: gentle look around (rotate Y) and slight tilt
    if (parts.head) {
        parts.head.position.y = parts.head.userData.restY + Math.sin(t * 1.2 + s) * 0.015;
        // Slow look left/right
        parts.head.rotation.y = Math.sin(t * 0.4 + s * 2.7) * 0.25;
        // Occasional tilt
        parts.head.rotation.z = Math.sin(t * 0.3 + s * 1.3) * 0.06;
    }

    // Face follows head
    if (parts.faceGroup) {
        parts.faceGroup.position.y = parts.head ? parts.head.position.y : parts.faceGroup.userData.restY;
        parts.faceGroup.rotation.y = parts.head ? parts.head.rotation.y : 0;
    }

    // Arms: gentle sway, slightly out of phase with each other
    if (parts.arms) {
        parts.arms.forEach((arm, i) => {
            const restZ = arm.userData.restRotZ || 0;
            const phase = i === 0 ? 0 : Math.PI * 0.7;
            arm.rotation.z = restZ + Math.sin(t * 0.8 + s + phase) * 0.08;
            // Slight forward/back swing
            arm.rotation.x = Math.sin(t * 0.5 + s * 1.5 + phase) * 0.06;
        });
    }

    // Weight shift: whole character sways very slightly side to side
    charGroup.rotation.z = Math.sin(t * 0.35 + s * 3.1) * 0.015;
    // Tiny bounce
    charGroup.position.y = (charGroup.userData.restPosY || charGroup.position.y) + Math.sin(t * 1.8 + s * 0.7) * 0.008;
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
    pirate: { bodyType: 'stocky', headShape: 'boxy', hat: 'pirate', expression: 'intense', accessories: ['eyepatch', 'belt'], armPose: Math.PI / 5 },
};

// js/enhancedNPCManager.js
import * as THREE from 'three';
import { faceGenerator } from './faceGenerator.js';
import * as CONSTANTS from './constants.js';

/**
 * Enhanced NPC Manager with improved face generation
 * Extends the existing NPC system with better character faces
 */

export class EnhancedNPCManager {
    constructor() {
        this.npcs = new Map();
        this.faceGenerator = faceGenerator;
    }

    /**
     * Create an enhanced NPC with a procedural face
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {THREE.Vector3} position - NPC position
     * @param {Object} config - NPC configuration
     * @returns {THREE.Group} Complete NPC group
     */
    createEnhancedNPC(scene, position, config = {}) {
        const npcGroup = new THREE.Group();
        npcGroup.position.copy(position);
        
        // Create body (reuse existing body creation logic)
        const body = this.createBody(config);
        npcGroup.add(body);

        // Create enhanced face
        const face = this.createEnhancedFace(config);
        face.position.y = config.bodyHeight || 1.2;
        npcGroup.add(face);

        // Add accessories/clothing
        this.addAccessories(npcGroup, config);

        // Set up NPC data
        npcGroup.userData = {
            name: config.name || 'NPC',
            type: config.type || 'generic',
            dialogue: config.dialogue || [],
            isInteractive: config.isInteractive !== false,
            ...config.userData
        };

        scene.add(npcGroup);
        this.npcs.set(config.name || 'npc', npcGroup);
        
        return npcGroup;
    }

    /**
     * Create the NPC body
     */
    createBody(config) {
        const bodyGroup = new THREE.Group();
        
        // Body material
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: config.bodyColor || 0x4a3c28,
            roughness: 0.7,
            metalness: 0.1
        });

        // Main body
        const bodyGeometry = new THREE.CylinderGeometry(
            config.bodyRadius || 0.3,
            config.bodyRadius || 0.35,
            config.bodyHeight || 1.2,
            8
        );
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = (config.bodyHeight || 1.2) / 2;
        body.castShadow = true;
        bodyGroup.add(body);

        // Arms
        const armMaterial = new THREE.MeshStandardMaterial({
            color: config.armColor || 0x8B7355,
            roughness: 0.6
        });

        const leftArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6),
            armMaterial
        );
        leftArm.position.set(-0.28, 0.9, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        bodyGroup.add(leftArm);

        const rightArm = leftArm.clone();
        rightArm.position.x = 0.28;
        rightArm.rotation.z = -Math.PI / 4;
        bodyGroup.add(rightArm);

        // Legs
        const legMaterial = new THREE.MeshStandardMaterial({
            color: config.legColor || 0x654321,
            roughness: 0.7
        });

        const leftLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6),
            legMaterial
        );
        leftLeg.position.set(-0.15, 0.4, 0);
        leftLeg.castShadow = true;
        bodyGroup.add(leftLeg);

        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.15;
        bodyGroup.add(rightLeg);

        return bodyGroup;
    }

    /**
     * Create an enhanced face using the face generator
     */
    createEnhancedFace(config) {
        const faceOptions = {
            headRadius: config.headRadius || 0.22,
            headSegments: config.headSegments || 8,
            eyeSize: config.eyeSize || 0.04,
            eyeDistance: config.eyeDistance || 0.08,
            eyeHeight: config.eyeHeight || 0.05,
            hasNose: config.hasNose !== false,
            hasMouth: config.hasMouth !== false,
            hasHair: config.hasHair !== false,
            hasEars: config.hasEars !== false,
            ...config.faceOptions
        };

        // Custom skin tone if provided
        if (config.skinColor) {
            faceOptions.skinMaterial = new THREE.MeshStandardMaterial({
                color: config.skinColor,
                roughness: 0.6,
                metalness: 0.1
            });
        }

        // Custom hair color if provided
        if (config.hairColor) {
            faceOptions.hairMaterial = new THREE.MeshStandardMaterial({
                color: config.hairColor,
                roughness: 0.8
            });
        }

        return this.faceGenerator.generateFace(faceOptions);
    }

    /**
     * Add accessories and clothing to the NPC
     */
    addAccessories(npcGroup, config) {
        if (config.hat) {
            const hat = this.createHat(config.hat);
            hat.position.y = 1.8;
            npcGroup.add(hat);
        }

        if (config.glasses) {
            const glasses = this.createGlasses(config.glasses);
            glasses.position.set(0, 1.45, 0.2);
            npcGroup.add(glasses);
        }

        if (config.beard) {
            const beard = this.createBeard(config.beard);
            beard.position.set(0, 1.2, 0.2);
            npcGroup.add(beard);
        }
    }

    /**
     * Create a hat accessory
     */
    createHat(config) {
        const hatGeometry = new THREE.CylinderGeometry(
            config.radius || 0.24,
            config.radius || 0.20,
            config.height || 0.25,
            8
        );
        const hatMaterial = new THREE.MeshStandardMaterial({
            color: config.color || 0x654321,
            roughness: 0.6
        });
        return new THREE.Mesh(hatGeometry, hatMaterial);
    }

    /**
     * Create glasses accessory
     */
    createGlasses(config) {
        const glassesGroup = new THREE.Group();
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: config.color || 0x000000,
            roughness: 0.3
        });

        // Left lens frame
        const leftFrame = new THREE.Mesh(
            new THREE.RingGeometry(0.06, 0.08, 8),
            frameMaterial
        );
        leftFrame.position.set(-0.08, 0, 0);
        glassesGroup.add(leftFrame);

        // Right lens frame
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(0.08, 0, 0);
        glassesGroup.add(rightFrame);

        // Bridge
        const bridge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4),
            frameMaterial
        );
        bridge.rotation.z = Math.PI / 2;
        glassesGroup.add(bridge);

        return glassesGroup;
    }

    /**
     * Create a beard accessory
     */
    createBeard(config) {
        const beardGeometry = new THREE.SphereGeometry(
            config.radius || 0.08,
            6,
            4
        );
        const beardMaterial = new THREE.MeshStandardMaterial({
            color: config.color || 0x4A3C28,
            roughness: 0.8
        });
        const beard = new THREE.Mesh(beardGeometry, beardMaterial);
        beard.scale.set(1.2, 0.6, 0.8);
        return beard;
    }

    /**
     * Create preset NPCs for the urea cycle game
     */
    createUreaCycleNPCs(scene) {
        const npcs = [];

        // Enhanced Professor Hepaticus
        const professor = this.createEnhancedNPC(scene, new THREE.Vector3(0, 0, 0), {
            name: 'Professor Hepaticus',
            type: 'professor',
            bodyColor: 0x4a3c28,
            skinColor: 0x8B7355,
            hairColor: 0x2F1B14,
            hasHair: true,
            hasNose: true,
            hasEars: true,
            hat: {
                color: 0x654321,
                radius: 0.24,
                height: 0.25
            },
            glasses: {
                color: 0x000000
            },
            beard: {
                color: 0x2F1B14,
                radius: 0.08
            }
        });
        npcs.push(professor);

        // Enhanced Nagesh (Coffee Brewer)
        const nagesh = this.createEnhancedNPC(scene, new THREE.Vector3(5, 0, 0), {
            name: 'Nagesh',
            type: 'coffee_brewer',
            bodyColor: 0x4a3c28,
            skinColor: 0x8B7355,
            hairColor: 0x654321,
            hasHair: true,
            hasNose: true,
            hasEars: true,
            hat: {
                color: 0x654321,
                radius: 0.24,
                height: 0.25
            },
            faceOptions: {
                preset: 'friendly'
            }
        });
        npcs.push(nagesh);

        // Enhanced Casper (CPS1)
        const casper = this.createEnhancedNPC(scene, new THREE.Vector3(-5, 0, 0), {
            name: 'Casper',
            type: 'enzyme',
            bodyColor: 0x2F4F4F,
            skinColor: 0x8B7355,
            hairColor: 0x000000,
            hasHair: true,
            hasNose: false,
            hasEars: true,
            faceOptions: {
                eyeSize: 0.06,
                eyeHeight: 0.08,
                mouthWidth: 0.08,
                mouthHeight: -0.02
            }
        });
        npcs.push(casper);

        return npcs;
    }

    /**
     * Update NPC animations
     */
    updateNPCs(delta, elapsedTime) {
        this.npcs.forEach((npc, name) => {
            // Add subtle breathing animation
            const breathingScale = 1 + Math.sin(elapsedTime * 0.5) * 0.01;
            npc.scale.y = breathingScale;

            // Add slight head movement
            const head = npc.children.find(child => child.name === 'head');
            if (head) {
                head.rotation.y = Math.sin(elapsedTime * 0.3) * 0.05;
            }

            // Add blinking animation
            const leftEye = npc.children.find(child => child.name === 'leftEye');
            const rightEye = npc.children.find(child => child.name === 'rightEye');
            if (leftEye && rightEye) {
                const blinkScale = Math.sin(elapsedTime * 2) > 0.8 ? 0.1 : 1;
                leftEye.scale.y = blinkScale;
                rightEye.scale.y = blinkScale;
            }
        });
    }

    /**
     * Get NPC by name
     */
    getNPC(name) {
        return this.npcs.get(name);
    }

    /**
     * Get all NPCs
     */
    getAllNPCs() {
        return Array.from(this.npcs.values());
    }
}

// Export a default instance
export const enhancedNPCManager = new EnhancedNPCManager();

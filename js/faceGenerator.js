// js/faceGenerator.js
import * as THREE from 'three';

/**
 * Procedural Low-Poly Face Generator
 * Creates RuneScape-style character faces with customizable features
 */

export class FaceGenerator {
    constructor() {
        this.defaultMaterials = {
            skin: new THREE.MeshStandardMaterial({ 
                color: 0x8B7355, 
                roughness: 0.6, 
                metalness: 0.1 
            }),
            eye: new THREE.MeshStandardMaterial({ 
                color: 0x000000, 
                roughness: 0.2 
            }),
            pupil: new THREE.MeshStandardMaterial({ 
                color: 0x000000, 
                roughness: 0.1 
            }),
            hair: new THREE.MeshStandardMaterial({ 
                color: 0x4A3C28, 
                roughness: 0.8 
            }),
            mouth: new THREE.MeshStandardMaterial({ 
                color: 0x8B0000, 
                roughness: 0.7 
            })
        };
    }

    /**
     * Generate a complete face with customizable features
     * @param {Object} options - Face configuration options
     * @returns {THREE.Group} Complete face group
     */
    generateFace(options = {}) {
        const config = this.mergeWithDefaults(options);
        const faceGroup = new THREE.Group();

        // Create head base
        const head = this.createHead(config);
        faceGroup.add(head);

        // Add facial features
        this.addEyes(faceGroup, config);
        this.addNose(faceGroup, config);
        this.addMouth(faceGroup, config);
        this.addHair(faceGroup, config);
        this.addEars(faceGroup, config);

        return faceGroup;
    }

    /**
     * Create the main head geometry
     */
    createHead(config) {
        const headGeometry = new THREE.SphereGeometry(
            config.headRadius, 
            config.headSegments, 
            config.headSegments
        );
        
        // Flatten the head slightly for more character-like appearance
        headGeometry.scale(1, 0.9, 1);
        
        const head = new THREE.Mesh(headGeometry, config.skinMaterial);
        head.name = "head";
        head.castShadow = true;
        return head;
    }

    /**
     * Add eyes to the face
     */
    addEyes(faceGroup, config) {
        const eyeGeometry = new THREE.SphereGeometry(config.eyeSize, 6, 4);
        const pupilGeometry = new THREE.SphereGeometry(config.eyeSize * 0.6, 4, 3);

        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, config.eyeMaterial);
        leftEye.position.set(
            -config.eyeDistance, 
            config.eyeHeight, 
            config.eyeDepth
        );
        leftEye.name = "leftEye";
        faceGroup.add(leftEye);

        // Left pupil
        const leftPupil = new THREE.Mesh(pupilGeometry, config.pupilMaterial);
        leftPupil.position.copy(leftEye.position);
        leftPupil.position.z += config.eyeSize * 0.1;
        leftPupil.scale.set(0.8, 0.8, 0.8);
        faceGroup.add(leftPupil);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, config.eyeMaterial);
        rightEye.position.set(
            config.eyeDistance, 
            config.eyeHeight, 
            config.eyeDepth
        );
        rightEye.name = "rightEye";
        faceGroup.add(rightEye);

        // Right pupil
        const rightPupil = new THREE.Mesh(pupilGeometry, config.pupilMaterial);
        rightPupil.position.copy(rightEye.position);
        rightPupil.position.z += config.eyeSize * 0.1;
        rightPupil.scale.set(0.8, 0.8, 0.8);
        faceGroup.add(rightPupil);
    }

    /**
     * Add nose to the face
     */
    addNose(faceGroup, config) {
        if (!config.hasNose) return;

        const noseGeometry = new THREE.ConeGeometry(
            config.noseSize, 
            config.noseHeight, 
            4
        );
        const nose = new THREE.Mesh(noseGeometry, config.skinMaterial);
        nose.position.set(0, config.noseHeight, config.noseDepth);
        nose.rotation.x = Math.PI;
        nose.name = "nose";
        faceGroup.add(nose);
    }

    /**
     * Add mouth to the face
     */
    addMouth(faceGroup, config) {
        if (!config.hasMouth) return;

        const mouthGeometry = new THREE.SphereGeometry(
            config.mouthWidth, 
            6, 
            3
        );
        const mouth = new THREE.Mesh(mouthGeometry, config.mouthMaterial);
        mouth.position.set(0, config.mouthHeight, config.mouthDepth);
        mouth.scale.set(1, 0.3, 0.5);
        mouth.name = "mouth";
        faceGroup.add(mouth);
    }

    /**
     * Add hair to the face
     */
    addHair(faceGroup, config) {
        if (!config.hasHair) return;

        const hairGeometry = new THREE.SphereGeometry(
            config.headRadius * 1.1, 
            config.headSegments, 
            config.headSegments
        );
        const hair = new THREE.Mesh(hairGeometry, config.hairMaterial);
        hair.position.y = config.hairHeight;
        hair.scale.set(1, 0.6, 1);
        hair.name = "hair";
        faceGroup.add(hair);
    }

    /**
     * Add ears to the face
     */
    addEars(faceGroup, config) {
        if (!config.hasEars) return;

        const earGeometry = new THREE.SphereGeometry(
            config.earSize, 
            4, 
            3
        );

        // Left ear
        const leftEar = new THREE.Mesh(earGeometry, config.skinMaterial);
        leftEar.position.set(
            -config.earDistance, 
            config.earHeight, 
            config.earDepth
        );
        leftEar.scale.set(0.3, 0.8, 0.2);
        leftEar.name = "leftEar";
        faceGroup.add(leftEar);

        // Right ear
        const rightEar = new THREE.Mesh(earGeometry, config.skinMaterial);
        rightEar.position.set(
            config.earDistance, 
            config.earHeight, 
            config.earDepth
        );
        rightEar.scale.set(0.3, 0.8, 0.2);
        rightEar.name = "rightEar";
        faceGroup.add(rightEar);
    }

    /**
     * Merge user options with default configuration
     */
    mergeWithDefaults(options) {
        return {
            // Head properties
            headRadius: options.headRadius || 0.25,
            headSegments: options.headSegments || 8,
            
            // Eye properties
            eyeSize: options.eyeSize || 0.04,
            eyeDistance: options.eyeDistance || 0.08,
            eyeHeight: options.eyeHeight || 0.05,
            eyeDepth: options.eyeDepth || 0.18,
            
            // Nose properties
            hasNose: options.hasNose !== false,
            noseSize: options.noseSize || 0.02,
            noseHeight: options.noseHeight || 0.02,
            noseDepth: options.noseDepth || 0.2,
            
            // Mouth properties
            hasMouth: options.hasMouth !== false,
            mouthWidth: options.mouthWidth || 0.06,
            mouthHeight: options.mouthHeight || -0.05,
            mouthDepth: options.mouthDepth || 0.19,
            
            // Hair properties
            hasHair: options.hasHair !== false,
            hairHeight: options.hairHeight || 0.15,
            
            // Ear properties
            hasEars: options.hasEars !== false,
            earSize: options.earSize || 0.03,
            earDistance: options.earDistance || 0.2,
            earHeight: options.earHeight || 0.0,
            earDepth: options.earDepth || 0.15,
            
            // Materials
            skinMaterial: options.skinMaterial || this.defaultMaterials.skin,
            eyeMaterial: options.eyeMaterial || this.defaultMaterials.eye,
            pupilMaterial: options.pupilMaterial || this.defaultMaterials.pupil,
            hairMaterial: options.hairMaterial || this.defaultMaterials.hair,
            mouthMaterial: options.mouthMaterial || this.defaultMaterials.mouth
        };
    }

    /**
     * Create a preset character face
     */
    createPresetFace(preset = 'default') {
        const presets = {
            'default': {},
            'friendly': {
                eyeSize: 0.05,
                eyeHeight: 0.08,
                mouthWidth: 0.08,
                mouthHeight: -0.02
            },
            'stern': {
                eyeSize: 0.03,
                eyeHeight: 0.02,
                mouthWidth: 0.04,
                mouthHeight: -0.08,
                hasNose: true
            },
            'elderly': {
                headRadius: 0.24,
                eyeSize: 0.035,
                eyeHeight: 0.03,
                mouthWidth: 0.05,
                mouthHeight: -0.06,
                hasHair: false
            },
            'child': {
                headRadius: 0.2,
                eyeSize: 0.06,
                eyeHeight: 0.08,
                mouthWidth: 0.07,
                mouthHeight: -0.01
            }
        };

        return this.generateFace(presets[preset] || presets.default);
    }

    /**
     * Create a random face with varied features
     */
    createRandomFace() {
        const randomOptions = {
            headRadius: 0.2 + Math.random() * 0.1,
            eyeSize: 0.03 + Math.random() * 0.04,
            eyeHeight: -0.02 + Math.random() * 0.1,
            eyeDistance: 0.06 + Math.random() * 0.04,
            mouthWidth: 0.04 + Math.random() * 0.06,
            mouthHeight: -0.1 + Math.random() * 0.08,
            hasHair: Math.random() > 0.3,
            hasNose: Math.random() > 0.4,
            hasEars: Math.random() > 0.2
        };

        // Random skin tone
        const skinTones = [
            0x8B7355, // Default
            0xF4C2A1, // Light
            0xD2691E, // Medium
            0x8B4513, // Dark
            0x2F1B14  // Very Dark
        ];
        randomOptions.skinMaterial = new THREE.MeshStandardMaterial({
            color: skinTones[Math.floor(Math.random() * skinTones.length)],
            roughness: 0.6,
            metalness: 0.1
        });

        return this.generateFace(randomOptions);
    }
}

// Export a default instance for easy use
export const faceGenerator = new FaceGenerator();

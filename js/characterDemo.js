// js/characterDemo.js
import * as THREE from 'three';
import { faceGenerator } from './faceGenerator.js';
import { enhancedNPCManager } from './enhancedNPCManager.js';

/**
 * Demo script showing how to use the new character generation tools
 * This can be integrated into your existing game
 */

export function createCharacterDemo(scene) {
    console.log('Creating character demo...');
    
    // Create a row of different character types
    const characters = [];
    const startX = -10;
    const spacing = 3;

    // 1. Default face
    const defaultFace = faceGenerator.createPresetFace('default');
    defaultFace.position.set(startX, 1.5, 0);
    scene.add(defaultFace);
    characters.push(defaultFace);

    // 2. Friendly face
    const friendlyFace = faceGenerator.createPresetFace('friendly');
    friendlyFace.position.set(startX + spacing, 1.5, 0);
    scene.add(friendlyFace);
    characters.push(friendlyFace);

    // 3. Stern face
    const sternFace = faceGenerator.createPresetFace('stern');
    sternFace.position.set(startX + spacing * 2, 1.5, 0);
    scene.add(sternFace);
    characters.push(sternFace);

    // 4. Elderly face
    const elderlyFace = faceGenerator.createPresetFace('elderly');
    elderlyFace.position.set(startX + spacing * 3, 1.5, 0);
    scene.add(elderlyFace);
    characters.push(elderlyFace);

    // 5. Child face
    const childFace = faceGenerator.createPresetFace('child');
    childFace.position.set(startX + spacing * 4, 1.5, 0);
    scene.add(childFace);
    characters.push(childFace);

    // 6. Random face
    const randomFace = faceGenerator.createRandomFace();
    randomFace.position.set(startX + spacing * 5, 1.5, 0);
    scene.add(randomFace);
    characters.push(randomFace);

    // 7. Enhanced NPC with accessories
    const enhancedNPC = enhancedNPCManager.createEnhancedNPC(scene, new THREE.Vector3(startX + spacing * 6, 0, 0), {
        name: 'Demo NPC',
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

    // Add labels for each character
    characters.forEach((character, index) => {
        const label = createTextLabel(character.position, `Character ${index + 1}`);
        scene.add(label);
    });

    return characters;
}

/**
 * Create a text label for a character
 */
function createTextLabel(position, text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 1;
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
}

/**
 * Animation function for the demo characters
 */
export function animateDemoCharacters(characters, elapsedTime) {
    characters.forEach((character, index) => {
        // Add subtle floating animation
        character.position.y = 1.5 + Math.sin(elapsedTime * 0.5 + index) * 0.1;
        
        // Add rotation
        character.rotation.y = elapsedTime * 0.1 + index;
    });
}

/**
 * Integration example for your existing game
 */
export function integrateWithExistingGame() {
    console.log(`
    To integrate these new character tools into your existing game:
    
    1. Import the modules in your main.js:
       import { faceGenerator } from './js/faceGenerator.js';
       import { enhancedNPCManager } from './js/enhancedNPCManager.js';
    
    2. Replace existing NPC creation with enhanced versions:
       const npc = enhancedNPCManager.createEnhancedNPC(scene, position, config);
    
    3. Use faceGenerator for custom faces:
       const face = faceGenerator.createPresetFace('friendly');
       const randomFace = faceGenerator.createRandomFace();
    
    4. Update your NPC animation loop:
       enhancedNPCManager.updateNPCs(delta, elapsedTime);
    
    5. For AI-generated faces, use external tools like:
       - Bylo.ai for photo-to-low-poly conversion
       - 3DAIStudio for text-to-3D generation
       - Export as OBJ/GLTF and import into Three.js
    `);
}

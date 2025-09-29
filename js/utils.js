// js/utils.js
import * as THREE from 'three';

export function createTextSprite(text, position, parameters = {}) {
    const fontFace = parameters.fontFace || "Arial";
    const fontSize = parameters.fontSize || 48;
    const scaleFactor = parameters.scale || 1.0;
    const color = parameters.textColor || "rgba(255, 255, 255, 0.95)";
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = "Bold " + fontSize + "px " + fontFace;
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const padding = fontSize * 0.2;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;
    context.font = "Bold " + fontSize + "px " + fontFace;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(scaleFactor * aspect, scaleFactor, 1);
    sprite.position.set(position.x, position.y, position.z);
    return sprite;
}

const simpleParticleSystems = [];
export function createSimpleParticleSystem(scene, count, color, size, speed, lifetime, emitterPosition, emissionArea) {
    const particlesGeo = new THREE.BufferGeometry();
    const particleVertices = [];
    const particleLifetimes = [];
    const particleVelocities = [];

    for (let i = 0; i < count; i++) {
        particleVertices.push(
            emitterPosition.x + (Math.random() - 0.5) * emissionArea.x,
            emitterPosition.y + (Math.random() - 0.5) * emissionArea.y,
            emitterPosition.z + (Math.random() - 0.5) * emissionArea.z
        );
        particleLifetimes.push(Math.random() * lifetime);
        particleVelocities.push(
            (Math.random() - 0.5) * speed,
            Math.random() * speed, // Mostly upward
            (Math.random() - 0.5) * speed
        );
    }
    particlesGeo.setAttribute('position', new THREE.Float32BufferAttribute(particleVertices, 3));
    const particlesMat = new THREE.PointsMaterial({ color: color, size: size, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(particlesGeo, particlesMat);
    points.userData = {
        lifetimes: particleLifetimes,
        velocities: particleVelocities,
        maxLifetime: lifetime,
        baseSpeed: speed,
        basePosition: emitterPosition.clone(),
        emissionArea: emissionArea.clone()
    };
    scene.add(points);
    simpleParticleSystems.push(points);
    return points;
}

export function updateSimpleParticleSystems(delta) {
    simpleParticleSystems.forEach(system => {
        if (!system.parent) { // If system was removed from scene, remove from array
            const index = simpleParticleSystems.indexOf(system);
            if (index > -1) simpleParticleSystems.splice(index, 1);
            return;
        }
        const positions = system.geometry.attributes.position.array;
        const lifetimes = system.userData.lifetimes;
        const velocities = system.userData.velocities;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            lifetimes[i] -= delta;
            if (lifetimes[i] <= 0) {
                positions[i * 3] = system.userData.basePosition.x + (Math.random() - 0.5) * system.userData.emissionArea.x;
                positions[i * 3 + 1] = system.userData.basePosition.y + (Math.random() - 0.5) * system.userData.emissionArea.y;
                positions[i * 3 + 2] = system.userData.basePosition.z + (Math.random() - 0.5) * system.userData.emissionArea.z;
                lifetimes[i] = system.userData.maxLifetime * Math.random();
                velocities[i * 3] = (Math.random() - 0.5) * system.userData.baseSpeed;
                velocities[i * 3 + 1] = Math.random() * system.userData.baseSpeed;
                velocities[i * 3 + 2] = (Math.random() - 0.5) * system.userData.baseSpeed;
            }
            positions[i * 3] += velocities[i * 3] * delta;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
        }
        system.geometry.attributes.position.needsUpdate = true;
    });
}

export function createLightningBoltGeometry() {
    const points = [ new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(-0.4, 0.4, 0.2), new THREE.Vector3(0, 0.2, -0.2), new THREE.Vector3(0.4, 0, 0.2), new THREE.Vector3(0, -0.2, -0.2), new THREE.Vector3(-0.4, -0.4, 0.2), new THREE.Vector3(0, -0.8, 0) ];
    const geometry = new THREE.BufferGeometry(); const vertices = []; const thickness = 0.15;
    for (let i = 0; i < points.length - 1; i++) { const p1 = points[i]; const p2 = points[i + 1]; const direction = new THREE.Vector3().subVectors(p2, p1).normalize(); const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).multiplyScalar(thickness); vertices.push( p1.x + perpendicular.x, p1.y + perpendicular.y, p1.z + thickness, p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z + thickness, p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z + thickness ); vertices.push( p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z + thickness, p2.x - perpendicular.x, p2.y - perpendicular.y, p2.z + thickness, p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z + thickness ); vertices.push( p1.x + perpendicular.x, p1.y + perpendicular.y, p1.z - thickness, p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z - thickness, p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z - thickness ); vertices.push( p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z - thickness, p2.x - perpendicular.x, p2.y - perpendicular.y, p2.z - thickness, p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z - thickness ); vertices.push( p1.x + perpendicular.x, p1.y + perpendicular.y, p1.z + thickness, p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z + thickness, p1.x + perpendicular.x, p1.y + perpendicular.y, p1.z - thickness ); vertices.push( p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z + thickness, p2.x + perpendicular.x, p2.y + perpendicular.y, p2.z - thickness, p1.x + perpendicular.x, p1.y + perpendicular.y, p1.z - thickness ); vertices.push( p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z + thickness, p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z - thickness, p2.x - perpendicular.x, p2.y - perpendicular.y, p2.z + thickness ); vertices.push( p1.x - perpendicular.x, p1.y - perpendicular.y, p1.z - thickness, p2.x - perpendicular.x, p2.y - perpendicular.y, p2.z - thickness, p2.x - perpendicular.x, p2.y - perpendicular.y, p2.z + thickness ); }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals(); return geometry;
}

// Collection Effect - creates a burst of particles and floating text
export function createCollectionEffect(scene, position, color, itemName) {
    // Create particle burst
    const burstParticles = createSimpleParticleSystem(
        scene, 
        20,  // count
        color, 
        0.15,  // size
        3.0,   // speed
        1.0,   // lifetime
        position,
        new THREE.Vector3(0.2, 0.2, 0.2)  // emission area
    );
    
    // Create floating text sprite
    const textSprite = createTextSprite(
        `+${itemName}`,
        new THREE.Vector3(position.x, position.y + 1, position.z),
        { 
            fontSize: 36,
            scale: 2.0,
            textColor: `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 1.0)`
        }
    );
    scene.add(textSprite);
    
    // Animate text floating up and fading out
    let elapsedTime = 0;
    const animateDuration = 2.0;
    
    const animateText = () => {
        elapsedTime += 0.016; // ~60fps
        const progress = elapsedTime / animateDuration;
        
        if (progress < 1.0) {
            textSprite.position.y = position.y + 1 + progress * 1.5;
            textSprite.material.opacity = 1.0 - progress;
            requestAnimationFrame(animateText);
        } else {
            scene.remove(textSprite);
            textSprite.material.dispose();
        }
    };
    
    animateText();
    
    // Remove burst particles after lifetime
    setTimeout(() => {
        scene.remove(burstParticles);
        burstParticles.geometry.dispose();
        burstParticles.material.dispose();
        const index = simpleParticleSystems.indexOf(burstParticles);
        if (index > -1) simpleParticleSystems.splice(index, 1);
    }, 1500);
}

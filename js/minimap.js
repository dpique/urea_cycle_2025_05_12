import * as THREE from 'three';
import * as CONSTANTS from './constants.js';

let minimapCanvas, minimapCtx;
let minimapContainer;
let isMinimapVisible = true;
const pathHistory = [];
const MAX_PATH_POINTS = 500;

// Smoothed rotation for minimap
let smoothedRotation = 0;
const ROTATION_SMOOTH_FACTOR = 0.1; // Same as player slerp factor in playerManager.js

export function initMinimap() {
    minimapCanvas = document.getElementById('minimapCanvas');
    minimapContainer = document.getElementById('minimapContainer');
    
    if (!minimapCanvas || !minimapContainer) return;
    
    minimapCanvas.width = 190;
    minimapCanvas.height = 190;
    minimapCtx = minimapCanvas.getContext('2d');
    
    // Start with minimap visible
    minimapContainer.classList.remove('hidden');
}

export function toggleMinimap() {
    if (!minimapContainer) return;
    
    isMinimapVisible = !isMinimapVisible;
    if (isMinimapVisible) {
        minimapContainer.classList.remove('hidden');
    } else {
        minimapContainer.classList.add('hidden');
    }
}

export function updateMinimap(player, npcs, resources) {
    if (!minimapCtx || !isMinimapVisible) return;
    
    // Clear canvas
    minimapCtx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    minimapCtx.fillRect(0, 0, 190, 190);
    
    // Calculate scale - show a 40x40 unit area around player
    const viewSize = 40;
    const scale = 180 / viewSize;
    const centerX = 95; // Center of minimap
    const centerY = 95;
    
    // Get player rotation by calculating from forward vector
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(player.quaternion);
    const targetRotation = Math.atan2(forward.x, forward.z);
    
    // Smooth the rotation to match player turning smoothness
    // Handle angle wrapping for smooth interpolation
    let rotationDiff = targetRotation - smoothedRotation;
    if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    
    smoothedRotation += rotationDiff * ROTATION_SMOOTH_FACTOR;
    
    // Use smoothed rotation for all minimap calculations
    const playerRotation = smoothedRotation;
    
    // Helper function to convert world coords to minimap coords (player-centric rotation)
    const worldToMinimap = (worldX, worldZ) => {
        const relativeX = worldX - player.position.x;
        const relativeZ = worldZ - player.position.z;
        
        // Rotate world around player so player always faces up
        const cos = Math.cos(playerRotation);
        const sin = Math.sin(playerRotation);
        
        // Perform the rotation
        const rotatedX = relativeX * cos - relativeZ * sin;
        const rotatedZ = relativeX * sin + relativeZ * cos;
        
        return {
            x: centerX - rotatedX * scale, // <--- CHANGE IS HERE! Negate rotatedX
            y: centerY - rotatedZ * scale
        };
    };
    
    // Save context for rotating zones
    minimapCtx.save();
    
    // Draw zones as polygons that will rotate with the map
    // Helper to draw a rotated rectangle zone
    const drawZone = (x1, z1, x2, z2, color) => {
        const corners = [
            worldToMinimap(x1, z1),
            worldToMinimap(x2, z1),
            worldToMinimap(x2, z2),
            worldToMinimap(x1, z2)
        ];
        
        minimapCtx.fillStyle = color;
        minimapCtx.beginPath();
        minimapCtx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
            minimapCtx.lineTo(corners[i].x, corners[i].y);
        }
        minimapCtx.closePath();
        minimapCtx.fill();
    };
    
    // Mitochondria zone
    drawZone(CONSTANTS.MIN_X, -30, CONSTANTS.MITO_ZONE_MAX_X, 30, 'rgba(139, 69, 19, 0.3)');
    
    // Cytosol zone
    drawZone(CONSTANTS.CYTO_ZONE_MIN_X, -30, CONSTANTS.MAX_X, 30, 'rgba(34, 139, 34, 0.3)');
    
    // Draw river
    drawZone(
        CONSTANTS.RIVER_CENTER_X - CONSTANTS.RIVER_WIDTH/2, -30,
        CONSTANTS.RIVER_CENTER_X + CONSTANTS.RIVER_WIDTH/2, 30,
        'rgba(70, 130, 180, 0.5)'
    );
    
    // Draw bridge as a rotated rectangle
    const bridgeCorners = [
        worldToMinimap(CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2, CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH/2),
        worldToMinimap(CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2, CONSTANTS.BRIDGE_CENTER_Z - CONSTANTS.BRIDGE_WIDTH/2),
        worldToMinimap(CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2, CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH/2),
        worldToMinimap(CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2, CONSTANTS.BRIDGE_CENTER_Z + CONSTANTS.BRIDGE_WIDTH/2)
    ];
    minimapCtx.fillStyle = 'rgba(139, 69, 19, 0.7)'; // Saddle brown
    minimapCtx.beginPath();
    minimapCtx.moveTo(bridgeCorners[0].x, bridgeCorners[0].y);
    for (let i = 1; i < bridgeCorners.length; i++) {
            minimapCtx.lineTo(bridgeCorners[i].x, bridgeCorners[i].y);
    }
    minimapCtx.closePath();
    minimapCtx.fill();
    
    // Draw alcove outline
    minimapCtx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    minimapCtx.lineWidth = 1;
    const alcoveCorners = [
        worldToMinimap(CONSTANTS.MIN_X, CONSTANTS.ALCOVE_Z_START),
        worldToMinimap(CONSTANTS.ALCOVE_OPENING_X_PLANE, CONSTANTS.ALCOVE_Z_START),
        worldToMinimap(CONSTANTS.ALCOVE_OPENING_X_PLANE, CONSTANTS.ALCOVE_Z_END),
        worldToMinimap(CONSTANTS.MIN_X, CONSTANTS.ALCOVE_Z_END)
    ];
    minimapCtx.beginPath();
    minimapCtx.moveTo(alcoveCorners[0].x, alcoveCorners[0].y);
    for (let i = 1; i < alcoveCorners.length; i++) {
        minimapCtx.lineTo(alcoveCorners[i].x, alcoveCorners[i].y);
    }
    minimapCtx.closePath();
    minimapCtx.stroke();
    
    minimapCtx.restore();
    
    // Draw artificial trails connecting key locations
    drawArtificialTrails(minimapCtx, worldToMinimap);
    
    // Removed player path history - no longer needed
    
    // Draw NPCs
    if (npcs) {
        npcs.forEach(npc => {
            if (npc.visible) {
                const pos = worldToMinimap(npc.position.x, npc.position.z);
                minimapCtx.fillStyle = '#FFD700'; // Gold for NPCs
                minimapCtx.beginPath();
                minimapCtx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                minimapCtx.fill();
                
                // Draw NPC name (abbreviated)
                minimapCtx.fillStyle = '#FFD700';
                minimapCtx.font = '8px Arial';
                minimapCtx.textAlign = 'center';
                const name = npc.userData.name || '';
                const abbrev = name.split(' ').map(word => word[0]).join('');
                minimapCtx.fillText(abbrev, pos.x, pos.y - 5);
            }
        });
    }
    
    // Draw resources
    if (resources) {
        resources.forEach(resource => {
            if (resource.visible) {
                const pos = worldToMinimap(resource.position.x, resource.position.z);
                minimapCtx.fillStyle = '#00CED1'; // Dark turquoise for resources
                minimapCtx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
            }
        });
    }
    
    // Draw player at center (always pointing up since map rotates)
    minimapCtx.fillStyle = '#0099FF';
    minimapCtx.beginPath();
    minimapCtx.moveTo(centerX, centerY - 8);
    minimapCtx.lineTo(centerX - 5, centerY + 4);
    minimapCtx.lineTo(centerX + 5, centerY + 4);
    minimapCtx.closePath();
    minimapCtx.fill();
    
    // Player dot in center
    minimapCtx.beginPath();
    minimapCtx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    minimapCtx.fill();
    
    // Draw rotating North indicator
    minimapCtx.save();
    minimapCtx.translate(centerX, centerY);
    minimapCtx.rotate(playerRotation);  // Rotate opposite to show where north is
    
    // North arrow at edge of minimap
    minimapCtx.fillStyle = '#FF0000';
    minimapCtx.strokeStyle = '#FF0000';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -85);
    minimapCtx.lineTo(-4, -75);
    minimapCtx.lineTo(4, -75);
    minimapCtx.closePath();
    minimapCtx.fill();
    
    // N letter
    minimapCtx.font = 'bold 12px Arial';
    minimapCtx.textAlign = 'center';
    minimapCtx.fillText('N', 0, -70);
    
    minimapCtx.restore();
    
    // Border
    minimapCtx.strokeStyle = '#555';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, 190, 190);
}

export function addToPathHistory(position) {
    // Only add point if it's far enough from the last point
    if (pathHistory.length === 0 || 
        Math.abs(position.x - pathHistory[pathHistory.length - 1].x) > 0.5 ||
        Math.abs(position.z - pathHistory[pathHistory.length - 1].z) > 0.5) {
        
        pathHistory.push({ x: position.x, z: position.z });
        
        // Limit path history size
        if (pathHistory.length > MAX_PATH_POINTS) {
            pathHistory.shift();
        }
    }
}

export function clearPathHistory() {
    pathHistory.length = 0;
}

function drawArtificialTrails(ctx, worldToMinimap) {
    // Define trail paths between key NPCs in quest order
    const trails = [
        // Mitochondria trails
        { from: { x: CONSTANTS.MIN_X + 10, z: -8 }, to: { x: CONSTANTS.MIN_X + 15, z: 15 } }, // Prof to Casper
        { from: { x: CONSTANTS.MIN_X + 15, z: 15 }, to: { x: CONSTANTS.MIN_X + 20, z: -10 } }, // Casper to Otis
        { from: { x: CONSTANTS.MIN_X + 20, z: -10 }, to: { x: CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2 - 2, z: 0 } }, // Otis to Usher
        
        // Bridge crossing trail
        { from: { x: CONSTANTS.BRIDGE_CENTER_X - CONSTANTS.BRIDGE_LENGTH/2, z: 0 }, to: { x: CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2, z: 0 } }, // Across bridge
        
        // Cytosol trails
        { from: { x: CONSTANTS.BRIDGE_CENTER_X + CONSTANTS.BRIDGE_LENGTH/2, z: 0 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 10, z: -15 } }, // Bridge to Donkey
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 10, z: -15 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 25, z: 15 } }, // Donkey to Aslan
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 25, z: 15 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 20, z: 0 } }, // Aslan to Fumarase
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 20, z: 0 }, to: { x: CONSTANTS.CYTO_ZONE_MIN_X + 5, z: CONSTANTS.BRIDGE_CENTER_Z + 2 } }, // Fumarase to Shuttle
        { from: { x: CONSTANTS.CYTO_ZONE_MIN_X + 5, z: CONSTANTS.BRIDGE_CENTER_Z + 2 }, to: { x: CONSTANTS.MAX_X - 15, z: -10 } }, // Shuttle to Argus
        { from: { x: CONSTANTS.MAX_X - 15, z: -10 }, to: { x: CONSTANTS.MAX_X - 5, z: CONSTANTS.MAX_Z - 5 } } // Argus to Waste
    ];
    
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]); // Dotted line
    
    trails.forEach(trail => {
        const from = worldToMinimap(trail.from.x, trail.from.z);
        const to = worldToMinimap(trail.to.x, trail.to.z);
        
        // Only draw if both points are within visible range
        if (Math.abs(from.x - 95) < 90 && Math.abs(from.y - 95) < 90 &&
            Math.abs(to.x - 95) < 90 && Math.abs(to.y - 95) < 90) {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }
    });
    
    ctx.setLineDash([]); // Reset to solid line
}
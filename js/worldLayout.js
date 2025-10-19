// js/worldLayout.js
// Centralized world layout configuration using zone-based positioning
import * as CONSTANTS from './constants.js';

// Define major zones with anchor points
// All positions are defined relative to these zone centers for easier management
export const ZONES = {
    // Professor's study area in the alcove
    PROFESSOR_STUDY: {
        center: {
            x: CONSTANTS.MIN_X + 20,
            z: -16
        },
        radius: 5
    },

    // Calvin's chemistry station in the alcove
    ALCOVE_STATION: {
        center: {
            x: CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_DEPTH / 2,
            z: CONSTANTS.ALCOVE_Z_CENTER
        },
        radius: CONSTANTS.ALCOVE_WIDTH / 2
    },

    // Animal graveyard in mitochondria
    GRAVEYARD: {
        center: {
            x: CONSTANTS.GRAVEYARD_CENTER_X,
            z: CONSTANTS.GRAVEYARD_CENTER_Z
        },
        bounds: {
            width: CONSTANTS.GRAVEYARD_WIDTH,
            depth: CONSTANTS.GRAVEYARD_DEPTH
        }
    },

    // Bridge crossing the river
    BRIDGE: {
        center: {
            x: CONSTANTS.BRIDGE_CENTER_X,
            z: CONSTANTS.BRIDGE_CENTER_Z
        },
        height: CONSTANTS.BRIDGE_HEIGHT
    },

    // Western cytosol area (just across the river)
    CYTOSOL_WEST: {
        center: {
            x: CONSTANTS.CYTO_ZONE_MIN_X + 20,
            z: 0
        },
        radius: 15
    },

    // Central cytosol area
    CYTOSOL_CENTRAL: {
        center: {
            x: CONSTANTS.CYTO_ZONE_MIN_X + 50,
            z: 10
        },
        radius: 10
    },

    // Eastern cytosol area (far side)
    CYTOSOL_EAST: {
        center: {
            x: CONSTANTS.MAX_X - 20,
            z: -10
        },
        radius: 10
    }
};

// NPC positions relative to zones
// Each NPC has: zone (anchor point), offset from zone center, and pacing radius
export const NPC_LAYOUT = {
    PROFESSOR: {
        zone: 'PROFESSOR_STUDY',
        offset: { x: 0, z: 0 },  // At zone center
        paceRadius: 3
    },

    OTIS: {
        zone: 'BRIDGE',
        offset: { x: -CONSTANTS.BRIDGE_LENGTH / 2 - 10, z: 4 },  // West side of bridge, near Usher
        paceRadius: 0  // Stationary
    },

    CASPER: {
        zone: 'GRAVEYARD',
        offset: { x: 0, z: 0 },  // At graveyard center
        paceRadius: 0  // Stationary (floats in place)
    },

    NAGESH: {
        zone: 'GRAVEYARD',
        offset: { x: 0, z: -(CONSTANTS.GRAVEYARD_DEPTH / 2 + 14) },  // Further south to make room for gate
        paceRadius: 3
    },

    USHER: {
        zone: 'BRIDGE',
        offset: { x: 0, z: 0 },  // Starts at bridge center (patrols along bridge)
        paceRadius: 0  // Uses custom patrol logic
    },

    DONKEY: {
        zone: 'CYTOSOL_WEST',
        offset: { x: 0, z: 10 },  // North of zone center
        paceRadius: 4
    },

    SHUTTLE_DRIVER: {
        zone: 'CYTOSOL_WEST',
        offset: { x: -10, z: 10 },  // Northwest of zone center, near bridge
        paceRadius: 1
    },

    FUMARASE: {
        zone: 'CYTOSOL_WEST',
        offset: { x: -4, z: -16 },  // Southwest of zone center
        paceRadius: 0  // Stationary
    },

    ASLAN: {
        zone: 'CYTOSOL_CENTRAL',
        offset: { x: 0, z: 0 },  // At zone center
        paceRadius: 4
    },

    ARGUS: {
        zone: 'CYTOSOL_EAST',
        offset: { x: 0, z: 0 },  // At zone center
        paceRadius: 3.6
    },

    RIVER_GUARDIAN: {
        zone: 'BRIDGE',
        offset: {
            x: CONSTANTS.RIVER_GUARDIAN_X - CONSTANTS.BRIDGE_CENTER_X,
            z: CONSTANTS.RIVER_GUARDIAN_Z - CONSTANTS.BRIDGE_CENTER_Z
        },
        paceRadius: 0  // Stationary (floats)
    }
};

// Static object positions (non-NPC interactive objects)
export const STATIC_OBJECTS = {
    CALVIN: {
        zone: 'ALCOVE_STATION',
        offset: { x: 0, z: 0 }
    },

    CO2_VENTS: {
        zone: 'ALCOVE_STATION',
        offset: {
            x: CONSTANTS.CO2_VENTS_X - (CONSTANTS.ALCOVE_INTERIOR_BACK_X + CONSTANTS.ALCOVE_DEPTH / 2),
            z: CONSTANTS.CO2_VENTS_Z - CONSTANTS.ALCOVE_Z_CENTER
        }
    },

    WASTE_BUCKET: {
        zone: 'CYTOSOL_EAST',
        offset: { x: 10, z: -10 }
    }
};

// Resource spawn patterns
// Resources can be placed at specific locations or spawned procedurally
export const RESOURCE_SPAWNS = {
    // ATP spawns
    ATP_ALCOVE: {
        zone: 'ALCOVE_STATION',
        offset: { x: 3, z: CONSTANTS.ALCOVE_Z_START + 1 - CONSTANTS.ALCOVE_Z_CENTER }
    },

    ATP_MITO: {
        zone: 'GRAVEYARD',
        offset: { x: 10, z: -6 }
    },

    ATP_CYTO: {
        zone: 'CYTOSOL_WEST',
        offset: { x: 0, z: -16 }
    },

    // NH3 spawns procedurally within graveyard bounds (handled in worldManager)

    // Water near River Guardian
    WATER: {
        zone: 'BRIDGE',
        offset: {
            x: CONSTANTS.RIVER_GUARDIAN_X - CONSTANTS.BRIDGE_CENTER_X + 1.5,
            z: CONSTANTS.RIVER_GUARDIAN_Z - CONSTANTS.BRIDGE_CENTER_Z
        }
    }
};

// Tree placement patterns - absolute positions in mitochondria
// (Cytosol trees are procedurally placed)
export const TREE_PLACEMENTS = {
    MITO_TREES: [
        { x: CONSTANTS.MIN_X + 10, z: 20 },
        { x: CONSTANTS.MIN_X + 50, z: -40 },
        { x: CONSTANTS.MIN_X + 36, z: 10 },
        { x: CONSTANTS.MIN_X + 60, z: -10 }
    ]
};

// Helper function to get world position from zone + offset
export function getWorldPosition(layoutEntry) {
    const zone = ZONES[layoutEntry.zone];
    if (!zone) {
        console.error(`Unknown zone: ${layoutEntry.zone}`);
        return { x: 0, z: 0 };
    }
    return {
        x: zone.center.x + (layoutEntry.offset?.x || 0),
        z: zone.center.z + (layoutEntry.offset?.z || 0)
    };
}

// Helper function to get world bounds for a zone
export function getZoneBounds(zoneName) {
    const zone = ZONES[zoneName];
    if (!zone) {
        console.error(`Unknown zone: ${zoneName}`);
        return null;
    }

    if (zone.bounds) {
        // Zone has explicit bounds (like graveyard)
        return {
            minX: zone.center.x - zone.bounds.width / 2,
            maxX: zone.center.x + zone.bounds.width / 2,
            minZ: zone.center.z - zone.bounds.depth / 2,
            maxZ: zone.center.z + zone.bounds.depth / 2
        };
    } else if (zone.radius) {
        // Zone has circular radius
        return {
            minX: zone.center.x - zone.radius,
            maxX: zone.center.x + zone.radius,
            minZ: zone.center.z - zone.radius,
            maxZ: zone.center.z + zone.radius
        };
    }

    return null;
}

// Helper to get NPC pacing bounds based on their layout config
export function getNPCPacingBounds(npcKey) {
    const layout = NPC_LAYOUT[npcKey];
    if (!layout || !layout.paceRadius) {
        return null;
    }

    const worldPos = getWorldPosition(layout);
    return {
        minX: worldPos.x - layout.paceRadius,
        maxX: worldPos.x + layout.paceRadius,
        minZ: worldPos.z - layout.paceRadius,
        maxZ: worldPos.z + layout.paceRadius
    };
}

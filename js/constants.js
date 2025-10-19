// js/constants.js

// --- Scene Style Constants ---
export const MITO_PATH_COLOR = 0x9B7653; // Dirt path brown for mito "floor"
export const GRASS_COLOR = 0x77B053; // Grassy green for general ground
export const RIVER_COLOR = 0x4682B4; // Steel blue for river
export const BRIDGE_COLOR = 0x8B4513; // Saddle brown for bridge
export const WALL_GENERAL_COLOR = 0x999999;
export const ROCK_COLOR = 0x5A5A5A; // Darker rock for cave
export const CAVE_FLOOR_COLOR = 0x4A4A4A; // Darker floor for cave
export const WATER_COLOR = 0x3399FF;
export const BRAZIER_COLOR = 0xB87333;
export const EMBER_COLOR = 0xFF4500;
export const SMOKE_COLOR = 0x888888;
export const BICARBONATE_COLOR = 0xADD8E6;
export const CAVA_SHRINE_CRYSTAL_COLOR = 0x7FFFD4; // Aquamarine for CAVA crystal

// Resource Colors
export const CARB_PHOS_COLOR = 0xff3333;
export const CITRULLINE_COLOR = 0xff8c00;
export const ARG_SUCC_COLOR = 0x33ff33;
export const ARGININE_COLOR = 0x6666ff;
export const UREA_COLOR = 0xdddddd;
export const ORNITHINE_COLOR = 0xaaccaa;
export const FUMARATE_COLOR = 0xcccccc;
export const ASPARTATE_COLOR = 0xffaaff;
export const ATP_COLOR = 0xffffaa;
export const NH3_COLOR = 0xffaaaa;
export const MALATE_COLOR = 0x90EE90; // Light green for Malate


// --- Layout Constants ---
export const MIN_X = -80; export const MAX_X = 80; // Much larger world for exploration
export const MIN_Z = -60; export const MAX_Z = 60; // Much larger world

export const RIVER_CENTER_X = 0; // River runs along X=0 (north-south)
export const RIVER_WIDTH = 16.0;  // Width of the river visual - wider to prevent jumping

export const BRIDGE_LENGTH = 16.0;  // Length of the bridge (spanning the river, so along X-axis)
export const BRIDGE_WIDTH = 5.0;   // Width of the bridge path (along Z-axis)
export const BRIDGE_HEIGHT = 1.0;  // How high the bridge is from ground
export const BRIDGE_CENTER_X = RIVER_CENTER_X; // Bridge centered on river
export const BRIDGE_CENTER_Z = 0; // Bridge centered along Z

export const PORTAL_ON_BRIDGE_OFFSET_X = 0; // Portal is in the middle of the bridge length

export const TOTAL_WIDTH = MAX_X - MIN_X;
export const TOTAL_DEPTH = MAX_Z - MIN_Z;

// Effective "Mitochondria" area ends before river, "Cytosol" starts after
export const MITO_ZONE_MAX_X = RIVER_CENTER_X - RIVER_WIDTH / 2;
export const CYTO_ZONE_MIN_X = RIVER_CENTER_X + RIVER_WIDTH / 2;
export const MITO_WIDTH = MITO_ZONE_MAX_X - MIN_X;
export const CYTO_WIDTH = MAX_X - CYTO_ZONE_MIN_X;


export const WALL_HEIGHT = 3.6; // Slightly taller walls
export const WALL_THICKNESS = 1.0;

// Alcove Dimensions
export const ALCOVE_DEPTH = 16; // Enlarged from 5
export const ALCOVE_WIDTH = 20; // Enlarged from 7
export const ALCOVE_Z_CENTER = 0;
export const ALCOVE_Z_START = ALCOVE_Z_CENTER - ALCOVE_WIDTH / 2;
export const ALCOVE_Z_END = ALCOVE_Z_CENTER + ALCOVE_WIDTH / 2;
export const ALCOVE_INTERIOR_BACK_X = MIN_X + WALL_THICKNESS / 2;
export const ALCOVE_OPENING_X_PLANE = MIN_X + WALL_THICKNESS / 2 + ALCOVE_DEPTH;
export const CAVE_SLOPE_DROP = 2.0;

// River Guardian position constants
export const RIVER_GUARDIAN_X = RIVER_CENTER_X - RIVER_WIDTH / 2 - 4; // Just west of river edge
export const RIVER_GUARDIAN_Z = -30; // South of the bridge, easily accessible

// CO2 Vents position constants
export const CO2_VENTS_X = ALCOVE_INTERIOR_BACK_X + ALCOVE_DEPTH / 2 + 1.0;
export const CO2_VENTS_Z = ALCOVE_Z_END - 2.4; 

// --- Player Constants ---
export const PLAYER_SPEED = 10.0;
export const PLAYER_RADIUS = 0.7;
export const PLAYER_WALK_CYCLE_DURATION = 0.5;
export const PLAYER_MAX_LIMB_SWING = Math.PI / 6;
export const PLAYER_MAX_ARM_SWING = Math.PI / 8;
export const PLAYER_HEAD_HEIGHT = 0.4;
export const PLAYER_BODY_HEIGHT = 0.8;
export const PLAYER_LIMB_RADIUS = 0.1;
export const PLAYER_ARM_LENGTH = 0.6;
export const PLAYER_LEG_HEIGHT = 0.7;
export const PLAYER_TOTAL_HEIGHT = PLAYER_LEG_HEIGHT + PLAYER_BODY_HEIGHT + PLAYER_HEAD_HEIGHT;


// --- Interaction Constants ---
export const INTERACTION_RADIUS_SQ = 4.0 * 4.0; 

// --- Quest States ---
export const QUEST_STATE = Object.freeze({
    NOT_STARTED: 'NOT_STARTED',
    STEP_0_MEET_CASPER: 'STEP_0_MEET_CASPER', // Meet Casper at graveyard
    STEP_1_COLLECT_NH3: 'STEP_1_COLLECT_NH3', // Collect NH3 from graveyard
    STEP_0_GATHER_WATER_CO2: 'STEP_0_GATHER_WATER_CO2', // Casper tells about CAVA shrine
    STEP_0_COLLECT_WATER: 'STEP_0_COLLECT_WATER',
    STEP_0A_GATHER_CO2: 'STEP_0A_GATHER_CO2',
    STEP_0B_MAKE_BICARBONATE: 'STEP_0B_MAKE_BICARBONATE',
    STEP_0C_COLLECT_BICARBONATE: 'STEP_0C_COLLECT_BICARBONATE',
    STEP_1A_COLLECT_FIRST_ATP: 'STEP_1A_COLLECT_FIRST_ATP',
    STEP_1B_COLLECT_SECOND_ATP: 'STEP_1B_COLLECT_SECOND_ATP',
    STEP_1C_CASPER_NEEDS_COFFEE: 'STEP_1C_CASPER_NEEDS_COFFEE', // Casper needs coffee to focus
    STEP_1D_TALK_TO_NAGESH: 'STEP_1D_TALK_TO_NAGESH', // Talk to Nagesh about coffee
    STEP_1E_COLLECT_COFFIN_GROUNDS: 'STEP_1E_COLLECT_COFFIN_GROUNDS', // Collect Acidic Coffin Grounds (acetyl-CoA)
    STEP_1F_COLLECT_GLUTAMINE: 'STEP_1F_COLLECT_GLUTAMINE', // Collect Glutamate (Ghoul Milk)
    STEP_1G_NAGESH_MAKES_NAG: 'STEP_1G_NAGESH_MAKES_NAG', // Nagesh makes Ghoul's Coffee (NAG)
    STEP_1H_COLLECT_NAG: 'STEP_1H_COLLECT_NAG', // Collect Ghoul's Coffee
    STEP_2_MAKE_CARB_PHOS: 'STEP_2_MAKE_CARB_PHOS', 
    STEP_3_COLLECT_CARB_PHOS: 'STEP_3_COLLECT_CARB_PHOS',
    STEP_4_MEET_USHER: 'STEP_4_MEET_USHER',
    STEP_5_MAKE_CITRULLINE: 'STEP_5_MAKE_CITRULLINE', 
    STEP_6_TALK_TO_USHER_PASSAGE: 'STEP_6_TALK_TO_USHER_PASSAGE',
    STEP_7_OPEN_PORTAL: 'STEP_7_OPEN_PORTAL',
    STEP_8_COLLECT_CITRULLINE: 'STEP_8_COLLECT_CITRULLINE', // Collect the transported Citrulline in Cytosol
    STEP_8A_COLLECT_ATP: 'STEP_8A_COLLECT_ATP', // Collect ATP in Cytosol
    STEP_8B_GET_ASPARTATE: 'STEP_8B_GET_ASPARTATE', // Get Aspartate from the Malate-Aspartate Shuttle
    STEP_9_TALK_TO_DONKEY: 'STEP_9_TALK_TO_DONKEY', 
    STEP_10_TALK_TO_ASLAN: 'STEP_10_TALK_TO_ASLAN',
    STEP_10B_COLLECT_PRODUCTS: 'STEP_10B_COLLECT_PRODUCTS', // Collect Arginine and Fumarate
    STEP_11_CONVERT_FUMARATE_TO_MALATE: 'STEP_11_CONVERT_FUMARATE_TO_MALATE', // Take Fumarate to Fumarase
    STEP_11A_COLLECT_MALATE: 'STEP_11A_COLLECT_MALATE', // Collect the Malate
    STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE: 'STEP_11B_TRANSPORT_MALATE_GET_ASPARTATE', // Take Malate to Shuttle
    STEP_12_TALK_TO_ARGUS: 'STEP_12_TALK_TO_ARGUS',     
    STEP_13_DISPOSE_UREA: 'STEP_13_DISPOSE_UREA',
    STEP_14_RIVER_CHALLENGE: 'STEP_14_RIVER_CHALLENGE',
    COMPLETED: 'COMPLETED'
});

// NPC Names (for userData and easy reference)
export const NPC_NAMES = Object.freeze({
    PROFESSOR_HEPATICUS: "Professor Hepaticus",
    ORNITHINE_USHER: "Ornithine Usher",
    ASLAN: "Aslan, the Chomper (ASL)",
    DONKEY: "Donkey, the Synthesizer (ASS)",
    ARGUS: "Argus, the Finalizer (ARG1)",
    OTIS_OTC: "Otis (OTC)",
    CASPER_CPS1: "Casper the Ghost (CPS1)",
    FUMARASE_ENZYME: "Fumarate Hydratase",
    SHUTTLE_DRIVER: "Malcolm the Shuttle Driver",
    NAGESH_NAGS: "Nagesh (NAGS)"
});

// Graveyard Constants
export const GRAVEYARD_CENTER_X = MIN_X + 40;
export const GRAVEYARD_CENTER_Z = 30;
export const GRAVEYARD_WIDTH = 50;
export const GRAVEYARD_DEPTH = 40;

// Nagesh's Coffee Brewing Station - now part of Nagesh's character model

// Amino Acid Data - animal graveyard tombstones
export const AMINO_ACIDS = Object.freeze([
    // Glucogenic only
    { name: "Alanine", animalName: "Alanine the Albatross", type: "glucogenic" },
    { name: "Arginine", animalName: "Arginine the Arctic Fox", type: "glucogenic" },
    { name: "Asparagine", animalName: "Asparagine the Asp", type: "glucogenic" },
    { name: "Aspartate", animalName: "Aspartate the Asp", type: "glucogenic" },
    { name: "Cysteine", animalName: "Cysteine the Cygnet", type: "glucogenic" },
    { name: "Glutamate", animalName: "Glutamate the Goat", type: "glucogenic" },
    { name: "Glutamine", animalName: "Glutamine the Gnu", type: "glucogenic" },
    { name: "Glycine", animalName: "Glycine the Giraffe", type: "glucogenic" },
    { name: "Histidine", animalName: "Histidine the Hippo", type: "glucogenic" },
    { name: "Methionine", animalName: "Methionine the Mole", type: "glucogenic" },
    { name: "Proline", animalName: "Proline the Panda", type: "glucogenic" },
    { name: "Serine", animalName: "Serine the Sea Lion", type: "glucogenic" },
    { name: "Valine", animalName: "Valine the Viper", type: "glucogenic" },

    // Ketogenic only
    { name: "Leucine", animalName: "Leucine the Lion", type: "ketogenic", producesAcetylCoA: true },
    { name: "Lysine", animalName: "Lysine the Lynx", type: "ketogenic", producesAcetylCoA: true },

    // Both glucogenic and ketogenic
    { name: "Isoleucine", animalName: "Isoleucine the Iguana", type: "both", producesAcetylCoA: true },
    { name: "Phenylalanine", animalName: "Phenylalanine the Pheasant", type: "both", producesAcetylCoA: true },
    { name: "Threonine", animalName: "Threonine the Toucan", type: "both", producesAcetylCoA: true },
    { name: "Tryptophan", animalName: "Tryptophan the Triceratops", type: "both", producesAcetylCoA: true },
    { name: "Tyrosine", animalName: "Tyrosine the Tyrannosaurus", type: "both" }
]);

// Resource Colors - adding new ones
export const ACETYL_COA_COLOR = 0x3d2817; // Dark brown like coffee grounds
export const NAG_COLOR = 0x4a3728; // Coffee color
export const GLUTAMATE_COLOR = 0xe8e8e8; // Milky white
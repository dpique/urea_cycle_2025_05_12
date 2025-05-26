// js/constants.js

// --- Scene Style Constants ---
export const MITO_PRIMARY_COLOR = 0x604040;
export const MITO_SECONDARY_COLOR = 0x886666;
export const CYTO_PRIMARY_COLOR = 0x556677;
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


// --- Layout Constants ---
export const MIN_X = -15; export const MAX_X = 15;
export const MIN_Z = -10; export const MAX_Z = 10;
export const DIVIDING_WALL_X = 0;
export const TOTAL_WIDTH = MAX_X - MIN_X;
export const TOTAL_DEPTH = MAX_Z - MIN_Z;
export const MITO_WIDTH = DIVIDING_WALL_X - MIN_X;
export const CYTO_WIDTH = MAX_X - DIVIDING_WALL_X;

export const WALL_HEIGHT = 1.5;
export const WALL_THICKNESS = 0.5;
export const PORTAL_GAP_WIDTH = 3.0;
export const PORTAL_WALL_X = DIVIDING_WALL_X;
export const PORTAL_WALL_CENTER_Z = 0;

// Alcove Dimensions - EXPANDED
export const ALCOVE_DEPTH = 5; 
export const ALCOVE_WIDTH = 7; 
export const ALCOVE_Z_CENTER = 0;
export const ALCOVE_Z_START = ALCOVE_Z_CENTER - ALCOVE_WIDTH / 2;
export const ALCOVE_Z_END = ALCOVE_Z_CENTER + ALCOVE_WIDTH / 2;
export const ALCOVE_INTERIOR_BACK_X = MIN_X + WALL_THICKNESS / 2; 
export const ALCOVE_OPENING_X_PLANE = MIN_X + WALL_THICKNESS / 2 + ALCOVE_DEPTH;
export const CAVE_SLOPE_DROP = 1.0; 

// --- Player Constants ---
export const PLAYER_SPEED = 5.0;
export const PLAYER_RADIUS = 0.35;
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
export const INTERACTION_RADIUS_SQ = 2.0 * 2.0; 

// --- Quest States ---
export const QUEST_STATE = Object.freeze({
    NOT_STARTED: 'NOT_STARTED',
    STEP_0_GATHER_WATER_CO2: 'STEP_0_GATHER_WATER_CO2',
    STEP_0B_MAKE_BICARBONATE: 'STEP_0B_MAKE_BICARBONATE',
    STEP_0C_COLLECT_BICARBONATE: 'STEP_0C_COLLECT_BICARBONATE',
    STEP_1_GATHER_MITO_REMAINING: 'STEP_1_GATHER_MITO_REMAINING',
    STEP_2_MAKE_CARB_PHOS: 'STEP_2_MAKE_CARB_PHOS', // Will interact with Casper (CPS1)
    STEP_3_COLLECT_CARB_PHOS: 'STEP_3_COLLECT_CARB_PHOS',
    STEP_4_MEET_USHER: 'STEP_4_MEET_USHER',
    STEP_5_MAKE_CITRULLINE: 'STEP_5_MAKE_CITRULLINE', // Will interact with Otis (OTC)
    STEP_6_TALK_TO_USHER_PASSAGE: 'STEP_6_TALK_TO_USHER_PASSAGE',
    STEP_7_OPEN_PORTAL: 'STEP_7_OPEN_PORTAL',
    STEP_8_GATHER_CYTO: 'STEP_8_GATHER_CYTO',
    STEP_9_TALK_TO_DONKEY: 'STEP_9_TALK_TO_DONKEY', 
    STEP_10_TALK_TO_ASLAN: 'STEP_10_TALK_TO_ASLAN',   
    STEP_11_FURNACE_FUMARATE: 'STEP_11_FURNACE_FUMARATE',
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
    OTIS_OTC: "Otis (OTC)", // New character for Ornithine Transcarbamoylase
    CASPER_CPS1: "Casper (CPS1)" // New character for Carbamoyl Phosphate Synthetase I
});
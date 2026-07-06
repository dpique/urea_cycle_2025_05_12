// src/art/palette.js
// The single source of truth for color in Metabolon. Every material, sky, gauge,
// molecule, and HUD element pulls from here. Sharing one palette is the main reason
// the game reads as one crafted place rather than a pile of random primitives.

// --- Core neutrals (warm, hand-built feeling) ---
export const NEUTRAL = {
  cream: 0xf3e9d2, // primary floor / plaza
  sand: 0xe8d5a8,
  stone: 0xc9b896,
  stoneDark: 0x9d8c6e,
  wood: 0x8a5a3b,
  woodDark: 0x633f28,
  charcoal: 0x3a3530,
  ink: 0x241f1b,
  white: 0xf7f3ea,
};

// --- Sky gradients per mood (top, bottom) ---
export const SKY = {
  atrium: { top: 0x7ec8e3, bottom: 0xf6e7c8 }, // calm warm daylight
  furnace: { top: 0xf4a259, bottom: 0xffe3b0 }, // warm energetic amber
  nitrogen: { top: 0x6a8caf, bottom: 0xdfe7d6 }, // cooler, faintly sickly green horizon
};

// --- Metabolic currencies. These colors are law: the same currency is the same
// color on a carried token, in the HUD readout, and in any particle effect. ---
export const CURRENCY = {
  ATP: 0xffcf3f, // gold — energy
  ADP: 0xd9a441,
  NADH: 0x4f9dde, // blue — reducing power
  'NAD+': 0x8fb8dc,
  NADPH: 0x33c2b0, // teal
  FADH2: 0xf2803c, // orange
  GTP: 0x63c76a, // green
  Pi: 0xb0b7c3, // inorganic phosphate — cool gray
  carbon: 0x5b5750, // carbon skeletons
  nitrogen: 0x9b6bd6, // violet — nitrogen load
};

// --- Element colors for molecule models (stylized CPK, tuned to read on cream) ---
export const ELEMENT = {
  C: 0x4a4640, // carbon — dark warm gray
  O: 0xe0503a, // oxygen — red
  N: 0x4f7ad0, // nitrogen — blue
  H: 0xf2efe6, // hydrogen — off white
  P: 0xf0a83c, // phosphorus — orange
  S: 0xe8c84a, // sulfur — yellow
  bond: 0xcfc7b6, // stick color
};

// --- Purpose gauges. Each pathway's reason to exist is one of these meters. ---
export const GAUGE = {
  energy: { fill: 0xffcf3f, track: 0x6b5a2a, label: 'ENERGY' }, // ATP charge
  toxicity: { fill: 0x8ed64a, track: 0x3f5a2b, label: 'AMMONIA' }, // toxic green rising = bad
  health: { fill: 0xff5a6e, track: 0x5a2530, label: 'CELL' },
};

// --- District theme sets. A world inherits a base language and varies one accent. ---
export const DISTRICT = {
  atrium: {
    sky: SKY.atrium,
    fog: 0xe9dcbf,
    ground: NEUTRAL.cream,
    groundAccent: NEUTRAL.sand,
    accent: 0x6cc0c0, // calm teal signage
    prop: NEUTRAL.stone,
  },
  furnace: {
    sky: SKY.furnace,
    fog: 0xf3cf9a,
    ground: 0xe6c38a, // warm packed earth
    groundAccent: 0xd1a462,
    accent: 0xe0503a, // furnace red
    prop: 0x9a6b3f,
  },
  nitrogen: {
    sky: SKY.nitrogen,
    fog: 0xcdd6c4,
    ground: 0xcdd2c0, // pale, slightly toxic stone
    groundAccent: 0xb3bda3,
    accent: 0x8ed64a, // ammonia green
    prop: 0x7c8a6a,
  },
};

// --- Molecule signature colors (for the iconic carried-companion form) ---
export const MOLECULE_TINT = {
  glucose: 0xf2c94c,
  ammonia: 0x8ed64a,
  urea: 0xdfe7ee,
  pyruvate: 0xef8354,
  atpToken: CURRENCY.ATP,
};

// Convenience: convert a 0xRRGGBB int to a CSS hex string for the HUD.
export function css(hexInt) {
  return '#' + hexInt.toString(16).padStart(6, '0');
}

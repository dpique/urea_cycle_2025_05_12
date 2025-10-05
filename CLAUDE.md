# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational 3D browser game called "Metabolon" that teaches the Urea Cycle through interactive gameplay. It uses Three.js for 3D graphics and is served as a static HTML/JavaScript application without a build system.

## Development Setup

Since this is a static web application without a build system, development is straightforward:

1. **Run locally**: Use any static web server (e.g., `python -m http.server 8000` or VS Code's Live Server extension)
2. **No build process**: Changes to JS/HTML/CSS files are immediately reflected on refresh
3. **No package.json**: Dependencies are loaded via CDN (Three.js v0.160.0)

## Architecture

### File Structure

- `index.html` - Main entry point with UI overlays
- `main.js` - Game initialization and main loop
- `style.css` - Styling for UI elements
- `js/` - Modular game systems:
  - `constants.js` - All game constants (colors, dimensions, states)
  - `sceneSetup.js` - Three.js scene initialization
  - `worldManager.js` - World objects (walls, resources, portals)
  - `playerManager.js` - Player character and movement
  - `npcManager.js` - Non-player characters
  - `questManager.js` - Quest logic and progression
  - `interactionManager.js` - Object interactions
  - `uiManager.js` - UI updates and dialogs
  - `audioManager.js` - Sound management
  - `utils.js` - Utility functions

### Key Game Flow

1. Player navigates between Mitochondria and Cytosol areas separated by a river
2. Collects resources (NH3, ATP, etc.) to complete Urea Cycle biochemistry
3. Interacts with enzyme NPCs (CPS1, OTC, ASL, ASS, ARG1) to transform molecules
4. Uses portals and bridges to transport molecules between cellular compartments
5. Completes quiz challenges to demonstrate understanding

### Important Patterns

- **State Management**: Central `gameState` object in main.js
- **Constants**: All magic numbers and strings defined in constants.js
- **Collision Detection**: Bounding box system for walls and objects
- **Quest System**: State machine pattern with defined progression steps
- **UI Updates**: Centralized through uiManager.js functions

### Adding New Features

- **New NPCs**: Add to `npcManager.js` and define in `CONSTANTS.NPC_NAMES`
- **New Resources**: Define colors in constants.js, add spawn logic in worldManager.js
- **New Quest Steps**: Update `CONSTANTS.QUEST_STATE` and `ureaCycleQuestData`
- **New Interactions**: Add cases in `interactionManager.js`

// src/main.js
// Boot. Initialize the core systems, register the three worlds, restore or seed the
// shared economy, attach the companion, load the hub, and start the loop.

import { initRenderer, scene } from './core/renderer.js';
import { initInput } from './core/input.js';
import { initPlayer } from './core/player.js';
import { initHud } from './core/hud.js';
import { initDialogue } from './core/dialogue.js';
import { initInteraction } from './core/interaction.js';
import { makeCompanion } from './art/character.js';
import * as economy from './core/economy.js';
import * as save from './core/save.js';
import { registerWorld, loadWorld } from './core/router.js';
import { startEngine, attachCompanion } from './core/engine.js';

import * as hub from './worlds/hub.world.js';
import * as glycolysis from './worlds/glycolysis.world.js';
import * as ureaCycle from './worlds/ureaCycle.world.js';

const bar = document.getElementById('loadingBar');
const status = document.getElementById('loadingStatus');
function progress(pct, msg) {
  if (bar) bar.style.width = pct + '%';
  if (status && msg) status.textContent = msg;
}

function fatal(err) {
  console.error(err);
  const screen = document.getElementById('errorScreen');
  const msg = document.getElementById('errorMessage');
  if (msg) msg.textContent = String(err?.message || err);
  if (screen) screen.classList.remove('hidden');
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');
}
window.addEventListener('error', (e) => fatal(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => fatal(e.reason));

try {
  progress(12, 'Building the cell…');
  const canvas = document.getElementById('gameCanvas');
  initRenderer(canvas);
  initInput(canvas);

  progress(30, 'Waking the player…');
  initPlayer(scene);

  progress(45, 'Fitting the heads-up display…');
  initHud();
  initDialogue();
  initInteraction(scene);

  progress(60, 'Summoning Coa…');
  attachCompanion(makeCompanion());

  progress(72, 'Stocking the economy…');
  if (save.hasSave()) save.load();
  else economy.seed();

  progress(84, 'Registering districts…');
  registerWorld('hub', hub);
  registerWorld('glycolysis', glycolysis);
  registerWorld('urea-cycle', ureaCycle);

  progress(94, 'Opening The Atrium…');
  // deep-link a world with ?world=<id> (also used by the headless smoke test)
  const wanted = new URLSearchParams(location.search).get('world');
  loadWorld(['hub', 'glycolysis', 'urea-cycle'].includes(wanted) ? wanted : 'hub');

  progress(100, 'Ready');
  const loading = document.getElementById('loading');
  setTimeout(() => loading && loading.classList.add('hidden'), 350);

  document.getElementById('help-close')?.addEventListener('click', () => {
    document.getElementById('help').hidden = true;
  });

  startEngine();
  document.body.dataset.ready = '1'; // boot-complete signal for smoke tests
  console.log('Metabolon v2 initialized.');
} catch (err) {
  fatal(err);
  throw err;
}

// src/core/pathway.js
// The declarative pathway runner — the reuse win. A pathway is a data definition (steps
// with inputs, outputs, dialogue, mini-game, and a board fact) plus a set of placements
// (where each station stands in the world). This runner builds the stations, drives the
// carry -> operate -> transform -> produce -> advance loop, syncs the HUD pathway diagram
// and the shared economy, then runs the end-of-world Reality Check and grants the reward.
//
// Worlds stay thin: they build terrain, hand a def + placements to startPathway, and add
// any extra "source" stations (ATP crystals, an ingredient brewer) on their own.

import * as THREE from 'three';
import * as mat from '../art/materials.js';
import * as economy from './economy.js';
import * as hud from './hud.js';
import * as dialogue from './dialogue.js';
import * as minigame from './minigame.js';
import * as interaction from './interaction.js';
import { textSprite } from '../art/props.js';
import * as stations from '../art/stations.js';
import { makeCharacter } from '../art/character.js';
import { make as makeMolecule } from '../art/molecule.js';
import { setCarriedMolecule, clearCarried } from './player.js';

// Display names for molecules and items used in prompts.
export const NAMES = {
  glucose: 'Glucose',
  g6p: 'Glucose-6-P',
  f6p: 'Fructose-6-P',
  f16bp: 'Fructose-1,6-BP',
  dhap: 'DHAP',
  g3p: 'G3P',
  bpg13: '1,3-BPG',
  pg3: '3-Phosphoglycerate',
  pg2: '2-Phosphoglycerate',
  pep: 'PEP',
  pyruvate: 'Pyruvate',
  ammonia: 'Ammonia (NH₃)',
  carbamoylPhosphate: 'Carbamoyl phosphate',
  citrulline: 'Citrulline',
  argininosuccinate: 'Argininosuccinate',
  arginine: 'Arginine',
  urea: 'Urea',
  ornithine: 'Ornithine',
  aspartate: 'Aspartate',
  fumarate: 'Fumarate',
  nag: 'N-acetylglutamate (NAG)',
  NAG: 'NAG',
};
const disp = (k) => NAMES[k] || k;

export function startPathway(ctx, config) {
  const { def, placements, onProgress = () => {}, onComplete = () => {} } = config;
  const root = ctx.worldRoot;
  const accent = def.accent ?? 0x6cc0c0;
  let current = 0;
  const stationGroups = [];

  // --- build a station per step ---
  def.steps.forEach((step, i) => {
    const place = placements[i] || { pos: new THREE.Vector3(0, 0, i * 6) };
    const g = new THREE.Group();
    g.position.copy(place.pos);
    if (place.facing != null) g.rotation.y = place.facing;

    g.add(stations.pad(accent, place.padRadius ?? 1.9));

    // the station body: humanoid enzyme or machine
    let body;
    if (step.station.kind === 'character') {
      body = makeCharacter(step.station.preset, { scale: place.scale });
    } else {
      const build = stations[step.station.machine] || stations.workbench;
      body = build(step.station.color ?? accent);
      if (place.scale) body.scale.multiplyScalar(place.scale);
    }
    body.position.y = 0.28; // sit on the pad
    g.add(body);
    g.userData.body = body;

    // floating name label
    const label = textSprite(step.station.label || step.title, { scale: 0.62, color: '#2a2420', bg: 'rgba(255,255,255,0.82)' });
    label.position.set(0, (step.station.kind === 'character' ? 2.5 : 2.4), 0);
    g.add(label);

    root.add(g);
    stationGroups.push(g);

    // interactable
    g.userData.name = step.station.label || step.title;
    g.userData.prompt = step.station.prompt || `Press E — ${step.station.label || step.title}`;
    g.userData.interactRadius = place.radius ?? 3.4;
    g.userData.indicatorHeight = step.station.kind === 'character' ? 2.7 : 2.6;
    g.userData.anchor = place.pos.clone();
    g.userData.onInteract = () => handleStep(i);
    interaction.addInteractable(g);
  });

  // --- a beacon marks the current objective station ---
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.35, 6, 12, 1, true),
    mat.glass(accent, 0.22)
  );
  beam.position.y = 3;
  beacon.add(beam);
  root.add(beacon);
  const moveBeacon = () => {
    if (current < stationGroups.length) {
      beacon.visible = true;
      beacon.position.copy(stationGroups[current].position);
    } else {
      beacon.visible = false;
    }
  };

  // --- start state: carry the first substrate ---
  setCarriedMolecule(makeMolecule(def.startMolecule));
  hud.setCarried(disp(def.startMolecule));
  hud.setPathway(def.steps.map((s) => ({ label: s.title })), 0);
  hud.setObjective(def.startObjective);
  moveBeacon();
  onProgress(0);

  // --- the reaction handler ---
  function handleStep(i) {
    const step = def.steps[i];
    const speaker = step.speaker || step.title;
    const color = step.color ?? accent;

    if (i < current) {
      dialogue.show({ speaker, color, lines: [step.doneLine || `Done here. ${step.teach || ''}`] });
      return;
    }
    if (i > current) {
      dialogue.show({
        speaker,
        color,
        lines: step.previewLines || [step.lines[0], `Come back once you are carrying ${disp(prevProduct(i))}.`],
      });
      return;
    }

    // current step — check requirements
    const missing = requirementsMissing(step);
    if (missing) {
      dialogue.show({ speaker, color, lines: [step.lines[0], missing] });
      return;
    }

    const actionLabel = step.actionLabel || 'Operate';
    dialogue.show({
      speaker,
      color,
      lines: step.lines,
      choices: [
        { text: actionLabel, action: () => beginReaction(i) },
        { text: 'Not yet', action: null },
      ],
    });
  }

  function prevProduct(i) {
    // the molecule the player should be carrying arriving at step i
    if (i === 0) return def.startMolecule;
    return def.steps[i - 1].product || def.startMolecule;
  }

  function requirementsMissing(step) {
    for (const [name, n] of Object.entries(step.requires || {})) {
      if (economy.CURRENCY_ORDER.includes(name)) {
        if (!economy.hasCurrency(name, n)) return needMsg(step, name, n);
      } else {
        if (economy.itemCount(name) < n) return needMsg(step, name, n);
      }
    }
    return null;
  }
  function needMsg(step, name, n) {
    if (step.needHint) return step.needHint;
    const where = step.needFrom ? ` ${step.needFrom}` : '';
    return `I need ${n} ${disp(name)} first.${where}`;
  }

  async function beginReaction(i) {
    const step = def.steps[i];

    // mini-game gate (spend nothing until it succeeds)
    if (step.minigame) {
      const mg = step.minigame;
      const ok = mg.type === 'hold' ? await minigame.hold(mg) : await minigame.timing(mg);
      if (!ok) {
        hud.toast(step.failText || 'Missed it — try again.', 2600, 'warn');
        return;
      }
    }

    // spend requirements
    for (const [name, n] of Object.entries(step.requires || {})) {
      if (economy.CURRENCY_ORDER.includes(name)) economy.spendCurrency(name, n);
      else economy.takeItem(name, n);
    }
    // produce currencies / items
    for (const [name, n] of Object.entries(step.gives || {})) economy.addCurrency(name, n);
    for (const [name, n] of Object.entries(step.itemGives || {})) economy.addItem(name, n);

    // transform the carried molecule
    if (step.product) {
      setCarriedMolecule(makeMolecule(step.product));
      hud.setCarried(disp(step.product));
    } else if (step.clearsCarried) {
      clearCarried();
      hud.setCarried(null);
    }

    ctx.audio?.blip?.(step.minigame ? 660 : 520);
    if (step.teach) hud.toast(step.teach, 4200, 'teach');

    current = i + 1;
    hud.updatePathway(def.steps.map((s) => ({ label: s.title })), current);
    hud.setObjective(current < def.steps.length ? (def.steps[current].objective || `Go to ${def.steps[current].title}`) : 'Pathway complete');
    moveBeacon();
    onProgress(current);

    if (current >= def.steps.length) finish();
  }

  function finish() {
    hud.setObjective('Pathway complete — run the Reality Check');
    setTimeout(() => {
      dialogue.quiz({
        title: def.quiz?.title || 'Reality Check',
        color: accent,
        questions: def.quiz?.questions || [],
        onComplete: (res) => {
          if (res.passed) {
            if (def.reward?.ability) economy.grantAbility(def.reward.ability);
            economy.markWorldComplete(def.id);
            hud.banner(def.reward?.title || 'Pathway mastered', def.reward?.message || '');
          } else {
            hud.toast('Revisit the stations, then talk to your guide to try the Reality Check again.', 5200, 'warn');
          }
          onComplete(res);
        },
      });
    }, 700);
  }

  // expose a controller
  return {
    get current() {
      return current;
    },
    isComplete: () => current >= def.steps.length,
    retryQuiz: () => finish(),
    update: (dt, t) => {
      for (const g of stationGroups) g.userData.body?.userData?.animate?.(t);
      beacon.rotation.y = t;
      if (beacon.visible) beacon.position.y = Math.sin(t * 2) * 0.1;
    },
  };
}

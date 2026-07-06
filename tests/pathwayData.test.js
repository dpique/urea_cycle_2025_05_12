// tests/pathwayData.test.js
// Data-integrity guardrails for the declarative pathways. These catch the mistakes that
// a build cannot: a station pointing at a character preset or machine that does not exist,
// a step producing a molecule the model builder cannot render, or a quiz answer index out
// of range. No WebGL is touched — only exported name lists are read.

import { describe, it, expect } from 'vitest';
import { glycolysis } from '../src/data/pathways/glycolysis.js';
import { ureaCycle } from '../src/data/pathways/ureaCycle.js';
import { CHARACTER_PRESETS } from '../src/art/character.js';
import * as stations from '../src/art/stations.js';
import { KNOWN as MOLECULES } from '../src/art/molecule.js';
import * as economy from '../src/core/economy.js';

const machineNames = Object.keys(stations);
const pathways = [glycolysis, ureaCycle];

describe.each(pathways.map((p) => [p.name, p]))('%s definition', (_name, def) => {
  it('has an id, a start molecule the builder can render, and at least one step', () => {
    expect(def.id).toBeTruthy();
    expect(MOLECULES).toContain(def.startMolecule);
    expect(def.steps.length).toBeGreaterThan(0);
  });

  it('every station references a real character preset or machine builder', () => {
    for (const step of def.steps) {
      if (step.station.kind === 'character') {
        expect(CHARACTER_PRESETS).toContain(step.station.preset);
      } else {
        expect(machineNames).toContain(step.station.machine);
      }
    }
  });

  it('every produced molecule is renderable (or the step clears the carried molecule)', () => {
    for (const step of def.steps) {
      if (step.clearsCarried) continue;
      expect(MOLECULES).toContain(step.product);
    }
  });

  it('every mini-game is a known type', () => {
    for (const step of def.steps) {
      if (step.minigame) expect(['timing', 'hold']).toContain(step.minigame.type);
    }
  });

  it('the Reality Check answers are in range and each has an explanation', () => {
    for (const q of def.quiz.questions) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.explain.length).toBeGreaterThan(10);
    }
  });

  it('grants a reward ability on completion', () => {
    expect(def.reward.ability).toBeTruthy();
  });
});

describe('shared economy', () => {
  it('seeds ATP and spends only when affordable', () => {
    economy.seed();
    expect(economy.currency('ATP')).toBe(6);
    expect(economy.spendCurrency('ATP', 2)).toBe(true);
    expect(economy.currency('ATP')).toBe(4);
    expect(economy.spendCurrency('ATP', 99)).toBe(false);
    expect(economy.currency('ATP')).toBe(4);
  });

  it('tracks items and abilities across the shared inventory', () => {
    economy.addItem('NAG', 1);
    expect(economy.itemCount('NAG')).toBe(1);
    expect(economy.takeItem('NAG', 1)).toBe(true);
    expect(economy.takeItem('NAG', 1)).toBe(false);
    economy.grantAbility('glucose-handling');
    expect(economy.hasAbility('glucose-handling')).toBe(true);
  });
});

describe('urea cycle biochemistry checkpoints', () => {
  it('CPS1 requires NAG and 2 ATP (rate-limiting, NAG-activated)', () => {
    const cps1 = ureaCycle.steps.find((s) => s.key === 'cps1');
    expect(cps1.requires.NAG).toBe(1);
    expect(cps1.requires.ATP).toBe(2);
  });
  it('ASS pulls in the second nitrogen via aspartate and costs ATP', () => {
    const ass = ureaCycle.steps.find((s) => s.key === 'ass');
    expect(ass.requires.aspartate).toBe(1);
    expect(ass.requires.ATP).toBe(1);
  });
  it('ASL yields fumarate — the link to the TCA cycle', () => {
    const asl = ureaCycle.steps.find((s) => s.key === 'asl');
    expect(asl.itemGives.fumarate).toBe(1);
  });
});

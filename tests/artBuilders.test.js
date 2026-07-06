// tests/artBuilders.test.js
// Executes every art builder to catch Three.js API misuse in code paths the boot smoke
// test does not reach (all enzyme characters, every molecule model, every machine). No
// WebGL is needed — geometry and material construction is pure math. The 2D canvas that
// text sprites need is stubbed so jsdom does not throw.

import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  // jsdom has no 2D canvas; stub just enough for CanvasTexture-backed text sprites.
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      measureText: (t) => ({ width: (t ? t.length : 0) * 10 }),
      fillText: () => {},
      strokeText: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arcTo: () => {},
      closePath: () => {},
      fill: () => {},
    };
  };
});

const isObj3D = (o) => o && o.isObject3D === true;

describe('character builder', () => {
  it('builds every enzyme preset and the companion', async () => {
    const { makeCharacter, CHARACTER_PRESETS, makeCompanion } = await import('../src/art/character.js');
    for (const preset of CHARACTER_PRESETS) {
      const c = makeCharacter(preset);
      expect(isObj3D(c), `preset ${preset}`).toBe(true);
    }
    expect(isObj3D(makeCompanion())).toBe(true);
  });
});

describe('molecule builder', () => {
  it('builds every known molecule model', async () => {
    const mol = await import('../src/art/molecule.js');
    for (const name of mol.KNOWN) {
      expect(isObj3D(mol.make(name)), `molecule ${name}`).toBe(true);
    }
  });
});

describe('station builders', () => {
  it('builds every machine and station prop', async () => {
    const s = await import('../src/art/stations.js');
    const calls = {
      pad: () => s.pad(),
      workbench: () => s.workbench(),
      press: () => s.press(),
      splitter: () => s.splitter(),
      extractor: () => s.extractor(),
      lever: () => s.lever(),
      cannon: () => s.cannon(),
      kettle: () => s.kettle(),
      membraneGate: () => s.membraneGate(),
      wasteChute: () => s.wasteChute(),
    };
    for (const [name, fn] of Object.entries(calls)) {
      expect(isObj3D(fn()), `station ${name}`).toBe(true);
    }
  });
});

describe('prop builders', () => {
  it('builds the reusable prop kit', async () => {
    const p = await import('../src/art/props.js');
    expect(isObj3D(p.textSprite('Test'))).toBe(true);
    expect(isObj3D(p.groundDisc(10, 0xffffff))).toBe(true);
    expect(isObj3D(p.groundPlane(10, 10, 0xffffff))).toBe(true);
    expect(isObj3D(p.padRing(1, 2, 0xffffff))).toBe(true);
    expect(isObj3D(p.crystal(2, 0xffffff))).toBe(true);
    expect(isObj3D(p.rock(1))).toBe(true);
    expect(isObj3D(p.tree(4))).toBe(true);
    expect(isObj3D(p.pipe(3))).toBe(true);
    expect(isObj3D(p.tank())).toBe(true);
    expect(isObj3D(p.barrel())).toBe(true);
    expect(isObj3D(p.lantern())).toBe(true);
    expect(isObj3D(p.sign('Hi'))).toBe(true);
    expect(isObj3D(p.railing(6))).toBe(true);
    expect(isObj3D(p.stairs())).toBe(true);
    expect(isObj3D(p.groundArrow(0xffffff))).toBe(true);
    expect(isObj3D(p.cloud())).toBe(true);
    expect(isObj3D(p.heightField(20, 20, 4, 4, () => 1, 0xffffff))).toBe(true);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { pointInHost, startGameVfx } from '../webapp/vfx.js';

test('VFX anchor stays attached to controls inside a scrolled overlay panel', () => {
  const target = {
    getBoundingClientRect() {
      return { left: 120, top: 250, width: 40, height: 20 };
    },
  };
  const host = {
    scrollLeft: 12,
    scrollTop: 80,
    getBoundingClientRect() {
      return { left: 100, top: 200, width: 320, height: 500 };
    },
  };

  assert.deepEqual(pointInHost(target, host), { x: 52, y: 140 });
});

test('reduced-motion clients do not install the global VFX mutation observer', () => {
  const body = { dataset: {} };
  const rootDocument = {
    body,
    defaultView: {
      matchMedia: () => ({ matches: true }),
      MutationObserver: class MutationObserver {
        constructor() {
          throw new Error('observer must not be constructed');
        }
      },
    },
  };

  assert.doesNotThrow(() => startGameVfx(rootDocument));
  assert.equal(body.dataset.vfxRuntime, undefined);
});

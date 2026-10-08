import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openingDelay } from '../webapp/chest-art.js';

test('chest opening respects reduced motion', () => {
  const previous = globalThis.matchMedia;
  try {
    globalThis.matchMedia = () => ({ matches: false });
    assert.ok(openingDelay() > 0 && openingDelay() < 1000);
    globalThis.matchMedia = () => ({ matches: true });
    assert.equal(openingDelay(), 0);
  } finally { globalThis.matchMedia = previous; }
});

test('both chest states ship transparent WebP within mobile budgets', () => {
  for (const state of ['closed', 'open']) {
    for (const [size, budget] of [[128,18000],[256,45000],[512,130000]]) {
      const data = fs.readFileSync(new URL(`../webapp/art/chests/v1/${state}-${size}.webp`, import.meta.url));
      assert.equal(data.toString('ascii',0,4), 'RIFF');
      assert.equal(data.toString('ascii',8,16), 'WEBPVP8X');
      assert.ok(data[20] & 16, 'alpha channel retained');
      assert.equal(data.readUIntLE(24,3) + 1, size);
      assert.equal(data.readUIntLE(27,3) + 1, size);
      assert.ok(data.length <= budget);
    }
  }
});

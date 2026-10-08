import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildingTier, buildingArtSources } from '../webapp/art/world-buildings.js';
import { REVIEWED_WORLD_BUILDINGS } from '../webapp/art/world-buildings-manifest.js';
import { buildArtUrl } from '../webapp/art/builds-art.js';

test('building tiers change at levels 11 and 21 with safe invalid-level defaults', () => {
  for (const [level, expected] of [[undefined,'small'],[-5,'small'],['bad','small'],[10,'small'],[11,'grand'],[20,'grand'],[21,'royal'],[999,'royal']]) {
    assert.equal(buildingTier(level), expected);
  }
});

test('reviewed building paintings have both transparent mobile files within budget', () => {
  for (const key of REVIEWED_WORLD_BUILDINGS) {
    assert.match(key, /^(palace|academy|forge|goldMine|crystalLake|ironDeposit|traineeArea)\/(small|grand|royal)$/);
    for (const [size, budget] of [[256,45000],[512,130000]]) {
      const data = fs.readFileSync(new URL(`../webapp/art/world/v1/builds/${key}-${size}.webp`, import.meta.url));
      assert.equal(data.toString('ascii', 8, 16), 'WEBPVP8X');
      assert.ok(data[20] & 16, `${key} retains alpha`);
      assert.equal(data.readUIntLE(24, 3) + 1, size);
      assert.equal(data.readUIntLE(27, 3) + 1, size);
      assert.ok(data.length <= budget);
    }
  }
});

test('only reviewed tiers replace legacy art and grid thumbnails stay at 256px', () => {
  assert.equal(buildingArtSources('unknown').url, null);
  for (const id of ['palace','academy','forge','goldMine','crystalLake','ironDeposit','traineeArea']) {
    for (const [tier,level] of [['small',1],['grand',11],['royal',21]]) {
      const art = buildingArtSources(id, level);
      if (REVIEWED_WORLD_BUILDINGS.includes(`${id}/${tier}`)) {
        assert.equal(art.url, `/art/world/v1/builds/${id}/${tier}-256.webp`);
        assert.equal(art.srcset, null);
        assert.match(buildingArtSources(id, level, null, { detail: true }).url, /-512.webp$/);
      } else {
        assert.equal(art.url, buildArtUrl(id, level));
        assert.equal(art.painted, false);
      }
    }
  }
});

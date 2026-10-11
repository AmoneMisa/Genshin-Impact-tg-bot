import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import art from '../webapp/l2-boss-art.js';
import {bossArtUrl} from '../webapp/boss-stage.js';
import {worldBossList, epicList} from '../functions/game/boss/epicBosses.js';
import {EPIC_NPC, worldRows} from '../functions/game/boss/worldBosses.js';

test('every epic lists its real location and a locally stored original NPC image', () => {
  for (const row of epicList({})) {
    assert.ok(row.location, row.name);
    assert.ok(art[row.name], row.name);
    assert.equal(row.image, bossArtUrl(row.name));
    assert.equal(EPIC_NPC[art[row.name].npcId], row.name);
  }
});

test('raid images match NPC ids, resolve in battle, and missing originals are recorded', () => {
  const manifest = JSON.parse(fs.readFileSync('webapp/art/bosses/l2/manifest.json', 'utf8'));
  const missing = new Set(manifest.missing.map(row => row.id));
  const list = worldBossList();
  for (const row of worldRows) {
    const entry = list.find(entry => entry.name === row.name);
    if (!art[row.name]) {
      assert.ok(missing.has(row.id), row.name);
      assert.equal(entry.image, null);
      continue;
    }
    assert.equal(art[row.name].npcId, row.id);
    assert.equal(entry.image, bossArtUrl(row.name));
    assert.ok(!missing.has(row.id));
  }
  for (const entry of Object.values(art)) {
    const data = fs.readFileSync(`webapp${entry.image}`);
    assert.ok(data.length > 1000, entry.image);
    assert.notEqual(data.length, 10356, 'L2on placeholder must never ship');
    assert.notEqual(data.length, 54746, 'Wiki placeholder must never ship');
  }
});

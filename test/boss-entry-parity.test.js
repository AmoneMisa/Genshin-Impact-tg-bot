import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBossEntryState } from '../webapp/boss.js';

test('boss entry keeps an already active shared boss without summoning', async () => {
  const activeBoss = { active: true, boss: { id: 'boss-1' } };
  const calls = [];
  const api = async (path, options) => {
    calls.push([path, options]);
    return activeBoss;
  };

  assert.deepEqual(await loadBossEntryState(api), {
    boss: activeBoss,
    summoned: false,
    state: null,
  });
  assert.deepEqual(calls, [['/api/boss', undefined]]);
});

test('boss entry never summons by itself: the clan boss needs a Clan Boss Sigil and a world boss is chosen from the list', async () => {
  const inactive = { active: false };
  const calls = [];
  const api = async (path, options) => { calls.push([path, options]); return inactive; };

  assert.deepEqual(await loadBossEntryState(api), { boss: inactive, summoned: false, state: null });
  assert.deepEqual(calls, [['/api/boss', undefined]]);
});

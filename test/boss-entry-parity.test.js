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

test('boss entry preserves legacy auto-summon when no boss is active', async () => {
  const inactive = { active: false };
  const summonedBoss = { active: true, boss: { id: 'boss-2' } };
  const bootstrapState = { context: { chatId: -1001 } };
  const calls = [];
  const api = async (path, options) => {
    calls.push([path, options]);
    if (path === '/api/boss') return inactive;
    return { boss: summonedBoss, state: bootstrapState };
  };

  assert.deepEqual(await loadBossEntryState(api), {
    boss: summonedBoss,
    summoned: true,
    state: bootstrapState,
  });
  assert.deepEqual(calls, [
    ['/api/boss', undefined],
    ['/api/boss/summon', { method: 'POST' }],
  ]);
});

test('boss entry tolerates a concurrent summon by another player', async () => {
  const concurrentBoss = { active: true, boss: { id: 'boss-race' } };
  let call = 0;
  const api = async () => {
    call += 1;
    if (call === 1) return { active: false };
    const error = new Error('Босс уже призван.');
    error.payload = { reason: 'already_summoned', boss: concurrentBoss };
    throw error;
  };

  assert.deepEqual(await loadBossEntryState(api), {
    boss: concurrentBoss,
    summoned: false,
    state: null,
  });
});

test('boss entry does not hide unrelated summon failures', async () => {
  const expected = new Error('network failure');
  let call = 0;
  const api = async () => {
    call += 1;
    if (call === 1) return { active: false };
    throw expected;
  };

  await assert.rejects(() => loadBossEntryState(api), error => error === expected);
});

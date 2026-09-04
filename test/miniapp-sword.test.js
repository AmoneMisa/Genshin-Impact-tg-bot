import test from 'node:test';
import assert from 'node:assert/strict';
import { getSwordState, rollSword } from '../functions/game/sword/swordCore.js';
import { getMiniAppSwordDashboard, getSwordRanking } from '../miniapp/sword.js';

const NOW = 1_800_000_000_000;
const RESET = NOW + 60_000;

test('sword roll mutates length and starts cooldown', () => {
  const session = { sword: 20, timerSwordCallback: 0, swordImmune: false, immuneToUpSword: false };
  const calls = [];
  const result = rollSword(session, {
    now: NOW,
    resetAt: RESET,
    randomInt(min, max) {
      calls.push([min, max]);
      return 7;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.delta, 7);
  assert.equal(result.previousLength, 20);
  assert.equal(session.sword, 27);
  assert.equal(session.timerSwordCallback, RESET);
  assert.deepEqual(calls, [[-10, 15]]);
  assert.equal(result.sword.canRoll, false);
});

test('decrease immunity consumes itself and prevents negative range', () => {
  const session = { sword: 5, timerSwordCallback: 0, swordImmune: true, immuneToUpSword: false };
  const result = rollSword(session, {
    now: NOW,
    resetAt: RESET,
    randomInt(min, max) {
      assert.deepEqual([min, max], [0, 15]);
      return 0;
    },
  });

  assert.equal(result.modifier, 'decrease_immune');
  assert.equal(result.delta, 0);
  assert.equal(session.sword, 5);
  assert.equal(session.swordImmune, false);
});

test('force decrease consumes itself and uses only negative range', () => {
  const session = { sword: 5, timerSwordCallback: 0, swordImmune: false, immuneToUpSword: true };
  const result = rollSword(session, {
    now: NOW,
    resetAt: RESET,
    randomInt(min, max) {
      assert.deepEqual([min, max], [-10, -1]);
      return -4;
    },
  });

  assert.equal(result.modifier, 'force_decrease');
  assert.equal(result.delta, -4);
  assert.equal(session.sword, 1);
  assert.equal(session.immuneToUpSword, false);
});

test('cooldown rejects a second roll without mutating state', () => {
  const session = { sword: 12, timerSwordCallback: RESET, swordImmune: true, immuneToUpSword: false };
  const before = structuredClone(session);
  const result = rollSword(session, { now: NOW, resetAt: RESET + 1000, randomInt: () => 15 });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'cooldown');
  assert.deepEqual(session, before);
  assert.equal(result.sword.remainMs, 60_000);
});

test('sword state safely normalizes legacy missing values', () => {
  assert.deepEqual(getSwordState({}, NOW), {
    length: 0,
    resetAt: 0,
    remainMs: 0,
    canRoll: true,
    decreaseImmune: false,
    forceDecrease: false,
  });
});

test('sword ranking preserves legacy group list semantics and sorts descending', () => {
  const chat = {
    members: [
      { userId: 3, sword: -5, userChatData: { user: { first_name: 'Третий' } } },
      { userId: 1, sword: 42, userChatData: { user: { username: 'leader' } } },
      { userId: 2, sword: 42, userChatData: { user: { first_name: 'Второй' } } },
      { userId: 4, userChatData: { user: { first_name: 'Без меча' } } },
    ],
  };

  assert.deepEqual(getSwordRanking(chat, 2), [
    { userId: 1, name: 'leader', length: 42, isCurrent: false, rank: 1 },
    { userId: 2, name: 'Второй', length: 42, isCurrent: true, rank: 2 },
    { userId: 3, name: 'Третий', length: -5, isCurrent: false, rank: 3 },
  ]);
});

test('Mini App sword dashboard combines personal cooldown with group ranking', () => {
  const chat = {
    members: [
      {
        userId: 10,
        sword: 15,
        timerSwordCallback: RESET,
        swordImmune: true,
        immuneToUpSword: false,
        userChatData: { user: { first_name: 'Игрок' } },
      },
      { userId: 11, sword: 20, userChatData: { user: { first_name: 'Лидер' } } },
    ],
  };

  const dashboard = getMiniAppSwordDashboard(chat, 10, NOW);
  assert.equal(dashboard.length, 15);
  assert.equal(dashboard.canRoll, false);
  assert.equal(dashboard.remainMs, 60_000);
  assert.equal(dashboard.ranking[0].name, 'Лидер');
  assert.equal(dashboard.ranking[1].isCurrent, true);
});

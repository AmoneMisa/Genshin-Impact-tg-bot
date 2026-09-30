import test from 'node:test';
import assert from 'node:assert/strict';
import { getStealState, stealForMiniApp } from '../miniapp/steal.js';

function member(userId, overrides = {}) {
  const base = {
    userId,
    userChatData: {
      status: 'member',
      user: { first_name: `Player ${userId}`, is_bot: false },
    },
    game: {
      chanceToSteal: 2,
      stealImmuneTimer: 0,
      stats: { lvl: 10, currentExp: 0 },
      gameClass: { stats: { name: 'warrior' }, skills: [{ damageModifier: 1 }] },
      inventory: { gold: 1000, ironOre: 100, crystals: 10 },
    },
  };
  return {
    ...base,
    ...overrides,
    userChatData: { ...base.userChatData, ...(overrides.userChatData || {}) },
    game: { ...base.game, ...(overrides.game || {}) },
  };
}

function chat(...members) {
  return { members };
}

test('steal state initializes two attempts and hides unavailable targets', () => {
  const attacker = member(1, { game: { chanceToSteal: undefined } });
  const visible = member(2);
  const bot = member(3, { userChatData: { user: { first_name: 'Bot', is_bot: true } } });
  const left = member(4, { userChatData: { status: 'left' } });
  const state = getStealState(chat(attacker, visible, bot, left), 1, 1000);

  assert.equal(state.attempts, 2);
  assert.deepEqual(state.targets.map(target => target.id), ['2']);
  assert.equal(attacker.game.chanceToSteal, 2);
});

test('protected target is rejected before battle simulation and does not consume an attempt', () => {
  const attacker = member(1);
  const target = member(2, { game: { stealImmuneTimer: 5000 } });
  let battleCalled = false;

  const result = stealForMiniApp(chat(attacker, target), 1, 2, {
    now: 1000,
    steal: () => {
      battleCalled = true;
      return { resultCode: 0 };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'target_shielded');
  assert.equal(result.shieldRemainingMs, 4000);
  assert.equal(attacker.game.chanceToSteal, 2);
  assert.equal(battleCalled, false);
});

test('failed combat consumes one attempt and drops attacker shield', () => {
  const attacker = member(1, { game: { stealImmuneTimer: 9000 } });
  const target = member(2);
  const result = stealForMiniApp(chat(attacker, target), 1, 2, {
    now: 1000,
    steal: () => ({ resultCode: 2, remainHp: 700 }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'defended');
  assert.equal(result.attempts, 1);
  assert.equal(attacker.game.chanceToSteal, 1);
  assert.equal(attacker.game.stealImmuneTimer, 0);
});

test('successful theft exposes rewards and consumes one attempt', () => {
  const attacker = member(1);
  const target = member(2);
  const result = stealForMiniApp(chat(attacker, target), 1, 2, {
    now: 1000,
    steal: () => ({
      resultCode: 0,
      goldToSteal: 130,
      ironOreToSteal: 13,
      crystalsToSteal: 2,
      gainedExp: 9500,
      remainHp: 50,
    }),
  });

  assert.deepEqual(result, {
    ok: true,
    outcome: 'stolen',
    targetId: '2',
    targetName: 'Player 2',
    gold: 130,
    ironOre: 13,
    crystals: 2,
    gainedExp: 9500,
    remainHp: 50,
    attempts: 1,
  });
});

test('theft rejects self, exhausted attempts and attacker without combat class', () => {
  const attacker = member(1);
  const target = member(2);
  assert.equal(stealForMiniApp(chat(attacker, target), 1, 1).reason, 'self_target');

  attacker.game.chanceToSteal = 0;
  assert.equal(stealForMiniApp(chat(attacker, target), 1, 2).reason, 'no_attempts');

  attacker.game.chanceToSteal = 2;
  attacker.game.gameClass.skills = [];
  assert.equal(stealForMiniApp(chat(attacker, target), 1, 2).reason, 'no_combat_class');
});

test('a player seated at a gold table cannot be robbed and is marked in the list', () => {
  const attacker = member(1);
  const seated = member(2);
  const room = chat(attacker, seated);
  const now = Date.now();
  room.game = { pointsMiniApp: { phase: 'lobby', lobbyEndsAt: now + 25_000, gameSessionLastUpdateAt: now, players: { 2: { bet: 500 } } } };

  assert.equal(getStealState(room, 1, now).targets[0].inTable, '21 очко');
  const result = stealForMiniApp(room, 1, 2, { now, steal: () => { throw new Error('must not steal'); } });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'target_in_table_game');
  assert.equal(attacker.game.chanceToSteal, 2);
  assert.equal(seated.game.inventory.gold, 1000);
});

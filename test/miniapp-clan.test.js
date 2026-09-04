import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerClanQuiz,
  contributeToClan,
  normalizeClanName,
  parseClanAmount,
} from '../miniapp/clan.js';

function makeClan() {
  return {
    level: 1,
    xp: 0,
    buildings: {},
    warehouse: { gold: 100, crystals: 5, ironOre: 2 },
    members: [{ userId: 1, role: 'owner', contribution: 0 }],
    quiz: {
      lastResetAt: 1,
      questionIndex: 0,
      participants: {},
    },
  };
}

function makePlayer() {
  return {
    game: {
      inventory: { gold: 1_000, crystals: 20, ironOre: 10 },
    },
  };
}

test('clan names are normalized and bounded', () => {
  assert.equal(normalizeClanName('  Tea   House  '), 'Tea House');
  assert.equal(normalizeClanName(''), null);
  assert.equal(normalizeClanName('x'.repeat(41)), null);
});

test('clan contribution parser rejects fractional and unsafe values', () => {
  assert.equal(parseClanAmount('100'), 100);
  assert.equal(parseClanAmount('-1'), null);
  assert.equal(parseClanAmount('1.5'), null);
  assert.equal(parseClanAmount('10gold'), null);
  assert.equal(parseClanAmount(Number.MAX_SAFE_INTEGER + 1), null);
});

test('clan contribution moves the exact resource and credits contribution', () => {
  const clan = makeClan();
  const player = makePlayer();
  const result = contributeToClan(clan, player, 1, 'gold', 250);

  assert.equal(result.ok, true);
  assert.equal(player.game.inventory.gold, 750);
  assert.equal(clan.warehouse.gold, 350);
  assert.equal(clan.members[0].contribution, 250);
  assert.equal(clan.xp, 25);
});

test('clan contribution rejects insufficient balance without mutation', () => {
  const clan = makeClan();
  const player = makePlayer();
  const beforeClan = structuredClone(clan);
  const beforePlayer = structuredClone(player);
  const result = contributeToClan(clan, player, 1, 'crystals', 21);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_enough_resource');
  assert.deepEqual(clan, beforeClan);
  assert.deepEqual(player, beforePlayer);
});

test('correct clan quiz answer keeps legacy gold xp and contribution reward', () => {
  const clan = makeClan();
  const player = makePlayer();
  const result = answerClanQuiz(clan, player, 1, 1);

  assert.equal(result.ok, true);
  assert.equal(result.correct, true);
  assert.equal(player.game.inventory.gold, 1_100);
  assert.equal(clan.members[0].contribution, 10);
  assert.equal(clan.xp, 50);
  assert.equal(clan.quiz.participants['1'].correct, true);
});

test('clan quiz cannot be rewarded twice on the same reset', () => {
  const clan = makeClan();
  const player = makePlayer();
  answerClanQuiz(clan, player, 1, 1);
  const gold = player.game.inventory.gold;
  const second = answerClanQuiz(clan, player, 1, 1);

  assert.equal(second.ok, false);
  assert.equal(second.reason, 'already_answered');
  assert.equal(player.game.inventory.gold, gold);
});

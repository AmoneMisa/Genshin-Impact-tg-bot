import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAN_PVP_COOLDOWN,
  CLAN_WAR_ATTACK_COOLDOWN,
  CLAN_WAR_DURATION,
  createWarPair,
  resolveClanDuel,
  resolveWarPair,
  strikeClanWar,
} from '../miniapp/clanCompetition.js';

function combatSession(userId) {
  return {
    userId,
    game: {
      gameClass: {
        skills: [{ name: 'hit' }],
      },
    },
  };
}

function clan(id, owner, memberIds = [owner]) {
  return {
    _id: id,
    name: `Clan ${id}`,
    owner,
    level: 1,
    xp: 0,
    members: memberIds.map(userId => ({ userId, role: userId === owner ? 'owner' : 'member', contribution: 0, upgrades: {} })),
    warehouse: { gold: 0, crystals: 0, ironOre: 0 },
    buildings: {},
    pvp: {},
    guildWar: null,
  };
}

test('friendly clan duel updates both records and winner contribution only', () => {
  const guild = clan('aaaaaaaaaaaaaaaaaaaaaaaa', 1, [1, 2]);
  const result = resolveClanDuel(guild, 1, 2, combatSession(1), combatSession(2), {
    now: 1_000,
    duel: () => ({ result: 0, attackerPercent: 73, defenderPercent: 0 }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.result, 'win');
  assert.deepEqual(guild.pvp.records['1'], { wins: 1, losses: 0, draws: 0 });
  assert.deepEqual(guild.pvp.records['2'], { wins: 0, losses: 1, draws: 0 });
  assert.equal(guild.members[0].contribution, 2);
  assert.equal(guild.pvp.cooldowns['1'], 1_000 + CLAN_PVP_COOLDOWN);
});

test('friendly clan duel enforces challenger cooldown without changing ladder', () => {
  const guild = clan('aaaaaaaaaaaaaaaaaaaaaaaa', 1, [1, 2]);
  guild.pvp = { records: {}, cooldowns: { '1': 5_000 } };
  const before = structuredClone(guild);
  const result = resolveClanDuel(guild, 1, 2, combatSession(1), combatSession(2), {
    now: 4_000,
    duel: () => ({ result: 0, attackerPercent: 100, defenderPercent: 0 }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'pvp_cooldown');
  assert.equal(result.cooldownRemainingMs, 1_000);
  assert.deepEqual(guild, before);
});

test('clan war pair gets the same id and exact 24 hour deadline', () => {
  const left = clan('aaaaaaaaaaaaaaaaaaaaaaaa', 1);
  const right = clan('bbbbbbbbbbbbbbbbbbbbbbbb', 2);
  const result = createWarPair(left, right, 10_000, 'war-test');

  assert.equal(result.ok, true);
  assert.equal(left.guildWar.warId, 'war-test');
  assert.equal(right.guildWar.warId, 'war-test');
  assert.equal(left.guildWar.opponentClanId, String(right._id));
  assert.equal(right.guildWar.opponentClanId, String(left._id));
  assert.equal(left.guildWar.endsAt, 10_000 + CLAN_WAR_DURATION);
});

test('clan war strike adds server damage to score, participant points and contribution', () => {
  const guild = clan('aaaaaaaaaaaaaaaaaaaaaaaa', 1);
  const enemy = clan('bbbbbbbbbbbbbbbbbbbbbbbb', 2);
  createWarPair(guild, enemy, 1_000, 'war-test');
  const result = strikeClanWar(guild, combatSession(1), 1, 3, {
    now: 2_000,
    attack: () => ({ dmg: 123, isCrit: true, defeated: false }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.points, 123);
  assert.equal(result.isCrit, true);
  assert.equal(guild.guildWar.score, 123);
  assert.equal(guild.guildWar.participants['1'], 123);
  assert.equal(guild.guildWar.cooldowns['1'], 2_000 + CLAN_WAR_ATTACK_COOLDOWN);
  assert.equal(guild.members[0].contribution, 1);
});

test('war resolution rewards winner and clears both war states', () => {
  const left = clan('aaaaaaaaaaaaaaaaaaaaaaaa', 1);
  const right = clan('bbbbbbbbbbbbbbbbbbbbbbbb', 2);
  left.level = 2;
  left.xp = 1_000;
  createWarPair(left, right, 1_000, 'war-test');
  left.guildWar.score = 900;
  right.guildWar.score = 400;

  const result = resolveWarPair(left, right);

  assert.equal(result.ok, true);
  assert.equal(result.outcome, 'win');
  assert.equal(result.reward.gold, 10_000);
  assert.equal(result.reward.crystals, 20);
  assert.equal(result.reward.clanXp, 500);
  assert.equal(left.warehouse.gold, 10_000);
  assert.equal(left.warehouse.crystals, 20);
  assert.equal(left.xp, 1_500);
  assert.equal(right.xp, 100);
  assert.equal(left.guildWar, null);
  assert.equal(right.guildWar, null);
});

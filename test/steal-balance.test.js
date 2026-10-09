import test from 'node:test';
import assert from 'node:assert/strict';
import withSeed from './helpers/seededRandom.js';
import stealResources, { fightRaid, CRUSHING_WIN_SHARE, NARROW_WIN_SHARE, EXP_LEVEL_DIFF_CAP, RAID_SECONDS } from '../functions/game/builds/stealResources.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import buildsTemplate from '../template/buildsTemplate.js';

function player(className, lvl = 40, inventory = {}) {
  const session = {
    userId: 1, userChatData: { user: { id: 1 } },
    game: {
      stats: { lvl, currentExp: 1_000_000 },
      inventory: { gold: 1_000_000, crystals: 5_000, ironOre: 10_000, arena: { items: [{ tokens: 0 }, { pvpSign: null }] }, ...inventory },
      builds: { palace: { currentLvl: 1 } },
      gameClass: { stats: { name: 'noClass' } }, effects: [], equipmentStats: {}, stealImmuneTimer: 0,
    },
  };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}

const BASES = ['warrior', 'mage', 'priest', 'archer', 'rogue', 'berserk'];

test('a raid is the shared auto-fight: both sides play, and the winner is whoever hurt the other more', () => withSeed(21, () => {
  const raid = fightRaid(player('archer', 60), player('mage', 60));
  assert.equal(typeof raid.won, 'boolean');
  assert.ok(raid.attackerPercent < 100 || raid.defenderPercent < 100);
  assert.ok(raid.attackerPercent <= 100 && raid.defenderPercent <= 100);
  assert.equal(RAID_SECONDS, 60);
  // Against a far stronger target the raid is lost, against a far weaker one it is won.
  assert.equal(fightRaid(player('warrior', 20), player('warrior', 90)).won, false);
  assert.equal(fightRaid(player('warrior', 90), player('warrior', 20)).won, true);
}));

test('no class is immune to raids and none is a permanent victim (the old rule: tanks 99% safe, glass 40%)', () => withSeed(8, () => {
  const wins = {};
  const defended = {};
  const runs = 14;
  for (const lvl of [20, 40, 60, 90]) {
    for (const attacker of BASES) {
      for (const target of BASES) {
        if (attacker === target) continue;
        for (let i = 0; i < runs; i++) {
          const won = fightRaid(player(attacker, lvl), player(target, lvl)).won ? 1 : 0;
          wins[attacker] = (wins[attacker] || 0) + won;
          defended[target] = (defended[target] || 0) + (1 - won);
        }
      }
    }
  }
  const total = 4 * 5 * runs;
  for (const name of BASES) {
    const attackRate = wins[name] / total;
    const defendRate = defended[name] / total;
    assert.ok(attackRate > 0.3 && attackRate < 0.7, `${name} raids succeed ${(attackRate * 100).toFixed(0)}% of the time`);
    assert.ok(defendRate > 0.3 && defendRate < 0.7, `${name} defends ${(defendRate * 100).toFixed(0)}% of the time`);
  }
}));

test('a lost raid takes nothing; a won one takes a share of what is above the palace guard', () => withSeed(4, () => {
  const loser = stealResources(player('warrior', 20), player('warrior', 90));
  assert.equal(loser.resultCode, 2);
  assert.ok(Number.isFinite(loser.defenderPercent));

  const attacker = player('warrior', 90);
  const target = player('warrior', 20);
  const goldBefore = target.game.inventory.gold;
  const result = stealResources(attacker, target);
  assert.equal(result.resultCode, 0);
  const share = result.crushing ? CRUSHING_WIN_SHARE : NARROW_WIN_SHARE;
  assert.equal(share, CRUSHING_WIN_SHARE, 'a level-90 raider crushes a level-20 target');
  const guarded = Math.ceil(buildsTemplate.palace.bonusEffect.guardedGold * 1.017 * 1);
  assert.ok(result.goldToSteal <= Math.ceil((goldBefore - 0) * CRUSHING_WIN_SHARE));
  assert.ok(result.goldToSteal >= Math.floor((goldBefore - guarded * 2) * CRUSHING_WIN_SHARE * 0.9));
  assert.equal(target.game.inventory.gold, goldBefore - result.goldToSteal);
  assert.ok(target.game.stealImmuneTimer > Date.now(), 'the victim is shielded for a while');
}));

test('an immune target is not raided, and a narrow win takes less than a crushing one', () => withSeed(2, () => {
  const target = player('priest', 40);
  target.game.stealImmuneTimer = Date.now() + 60_000;
  assert.equal(stealResources(player('archer', 90), target).resultCode, 1);
  assert.ok(NARROW_WIN_SHARE < CRUSHING_WIN_SHARE);
}));

test('the exp reward cannot be farmed by hitting far higher-level targets', () => withSeed(6, () => {
  const near = player('warrior', 80);
  near.game.stats.currentExp = 5_000_000;
  const targetNear = player('warrior', 20);
  const result = stealResources(near, targetNear);
  assert.equal(result.resultCode, 0);
  // Largest term the formula can produce: 9500 + 7.7% of the current exp bar per capped level.
  // ... times the x5 rate and the best Vitality bonus (x3).
  assert.ok(result.gainedExp <= (9500 + 5_000_000 * 0.077 * EXP_LEVEL_DIFF_CAP + 1) * 15);
  assert.ok(result.gainedExp >= 9500 * 5);
}));

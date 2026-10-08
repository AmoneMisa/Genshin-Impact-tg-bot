import test from 'node:test';
import withSeed from './helpers/seededRandom.js';
import assert from 'node:assert/strict';
import pvpSignTemplate from '../template/pvpSignTemplate.js';
import classStats from '../template/classStatsTemplate.js';
import generateArenaBot from '../functions/game/arena/generateArenaBot.js';
import playerDamagePlayer from '../functions/game/arena/playerDamagePlayer.js';
import getPvpSign from '../functions/game/arena/getPvpSign.js';
import { classFamily, isMagicClass } from '../functions/game/classes/classFamily.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';

function player(className, lvl = 30, extra = {}) {
  const session = {
    userChatData: { user: { id: 1 } },
    game: { stats: { lvl }, inventory: { gold: 0, arena: { items: [{ tokens: 0 }, { pvpSign: null }] } }, gameClass: { stats: { name: 'noClass' } }, effects: [], equipmentStats: {}, ...extra },
  };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}

test('the arena medal grows with every upgrade, stays small, and works the same for every class', () => {
  const tiers = [pvpSignTemplate, ...pvpSignTemplate.upgrades];
  const value = (tier, name) => tier.effects.find(effect => effect.name === name).value;
  for (let i = 1; i < tiers.length; i++) {
    assert.ok(value(tiers[i], 'increasePvpDamage') > value(tiers[i - 1], 'increasePvpDamage'), `damage step ${i}`);
    assert.ok(value(tiers[i], 'decreaseIncomingPvpDamage') > value(tiers[i - 1], 'decreaseIncomingPvpDamage'), `defence step ${i}`);
  }
  const best = tiers.at(-1);
  assert.ok(value(best, 'increasePvpDamage') <= 1.2 && value(best, 'decreaseIncomingPvpDamage') <= 0.2, 'a maxed medal is a tie-breaker, not a class');

  // The medal reads the same numbers whatever the class.
  const medal = { effects: tiers[3].effects };
  for (const name of ['warrior', 'archer', 'rogue', 'titan', 'saint']) {
    const session = player(name, 40);
    session.game.inventory.arena = { items: [{ tokens: 0 }, { pvpSign: medal }], pvpSign: medal };
    assert.deepEqual(getPvpSign(session), { increasePvpDamage: value(tiers[3], 'increasePvpDamage'), decreaseIncomingPvpDamage: value(tiers[3], 'decreaseIncomingPvpDamage') }, name);
  }
});

test('class families: every profession belongs to its base class, and casters never miss', () => {
  for (const item of classStats.filter(entry => entry.name !== 'noClass')) {
    let root = item;
    while (root.parent) root = classStats.find(entry => entry.name === root.parent);
    assert.equal(classFamily(item.name), root.name, item.name);
    assert.equal(item.family, root.name);
  }
  for (const name of ['mage', 'archmage', 'soulReaper', 'priest', 'saint', 'inquisitor']) assert.equal(isMagicClass(name), true, name);
  for (const name of ['warrior', 'titan', 'archer', 'hawkeye', 'rogue', 'assassin', 'berserk']) assert.equal(isMagicClass(name), false, name);
});

test('arena bots take damage (their incoming-damage reduction used to be 100%, so they could not be hurt)', () => {
  for (const className of ['warrior', 'archer', 'rogue']) {
    const bot = generateArenaBot(1000);
    const [, botHp] = playerDamagePlayer(player(className, 90), bot, true, false, 60, true);
    const [, botHpUntouched] = playerDamagePlayer(player(className, 1), { ...bot, gameClass: { ...bot.gameClass } }, true, false, 0, true);
    assert.ok(botHp < botHpUntouched * 0.9, `${className}: ${botHp} vs untouched ${botHpUntouched}`);
  }
});

test('arena bots only come in professions they could have reached at their level', () => {
  const levels = new Map(classStats.map(item => [item.name, item.promoteLvl || 0]));
  for (let i = 0; i < 300; i++) {
    for (const rating of [1000, 1301, 1500]) {
      const bot = generateArenaBot(rating);
      assert.ok(levels.get(bot.gameClass.stats.name) <= bot.stats.lvl, `${bot.gameClass.stats.name} at ${bot.stats.lvl}`);
    }
  }
});

test('mage-line bots with shield skills no longer crash the simulation', () => {
  for (let i = 0; i < 40; i++) {
    const bot = generateArenaBot(1550);
    assert.doesNotThrow(() => playerDamagePlayer(player('archmage', 75), bot, true, false, 60, true));
  }
});

// ---- the auto-fight: both sides play, CP is spent before HP, effects are modelled ----

import clanDuel from '../functions/game/clans/clanDuel.js';
import getBattleResult from '../functions/game/arena/getBattleResult.js';
import { poolPercent } from '../functions/game/arena/playerDamagePlayer.js';

function fight(attackerClass, defenderClass, lvl = 40, runs = 12) {
  let attackerLoss = 0;
  let defenderLoss = 0;
  for (let i = 0; i < runs; i++) {
    const { attackerPercent, defenderPercent } = clanDuel(player(attackerClass, lvl), player(defenderClass, lvl));
    attackerLoss += 100 - attackerPercent;
    defenderLoss += 100 - defenderPercent;
  }
  return { attackerLoss: attackerLoss / runs, defenderLoss: defenderLoss / runs };
}

test('the defender fights back: the attacker takes damage too', () => withSeed(5, () => {
  const { attackerLoss, defenderLoss } = fight('archer', 'archer');
  assert.ok(attackerLoss > 3, `the attacker lost only ${attackerLoss.toFixed(1)}%`);
  assert.ok(defenderLoss > 3, `the defender lost only ${defenderLoss.toFixed(1)}%`);
}));

test('a duel is decided by who hurt whom, not by what a fighter paid for its own skills', () => withSeed(5, () => {
  // A berserk pays hp for every skill; against a tanky target that used to cost it every duel.
  const { attackerLoss } = fight('berserk', 'priest', 40, 20);
  assert.ok(attackerLoss < 10, `berserk lost ${attackerLoss.toFixed(1)}% to damage taken`);
  assert.deepEqual(
    [poolPercent({ taken: 0, maxHp: 100, maxCp: 100 }), poolPercent({ taken: 100, maxHp: 100, maxCp: 100 }), poolPercent({ taken: 999, maxHp: 100, maxCp: 100 })],
    [100, 50, 0]);
}));

test('damage is taken from CP first, then HP (Lineage-style)', () => withSeed(11, () => {
  // Over a minute the damage lands on the CP pool: a typical duel leaves hp untouched.
  const bot = generateArenaBot(1000);
  const attacker = player('archer', 60);
  const [, defenderHp, details] = playerDamagePlayer(attacker, bot, true, false, 60, true);
  assert.ok(details.defender.taken > 0);
  assert.ok(details.defender.cp < details.defender.maxCp || details.defender.hp < details.defender.maxHp);
  assert.ok(details.defender.cp < details.defender.maxCp, 'cp was spent');
  // HP is only touched once the CP pool is gone.
  assert.ok(defenderHp >= bot.gameClass.stats.hp || details.defender.cp === 0, 'hp dropped while cp was left');
  const light = generateArenaBot(1000);
  const [, lightHp, lightDetails] = playerDamagePlayer(player('warrior', 20), light, true, false, 60, true);
  // `taken` is net of regeneration, so a light attacker may even net out at zero - but never touches hp.
  assert.ok(lightDetails.defender.taken >= 0 && lightHp >= light.gameClass.stats.hp, 'a light attacker only dents the cp');
}));

test('a fallen fighter stays down; the fight ends when someone drops', () => {
  const fragile = player('mage', 20);
  fragile.game.gameClass.stats.hp = 1;
  fragile.game.gameClass.stats.cp = 0;
  const [attackerHp] = playerDamagePlayer(fragile, player('archer', 60), false, false, 60, false);
  assert.equal(attackerHp, 0);
  const { result } = clanDuel(fragile, player('archer', 60));
  assert.equal(result, 1);
});

test('arena results: a stronger attacker wins, a far weaker one loses', () => {
  const bot = () => generateArenaBot(1000);
  const win = getBattleResult(player('archer', 90), bot(), true);
  assert.equal(win[0], 0);
  assert.ok(win[1] <= 100);
  const lose = getBattleResult(player('archer', 5), generateArenaBot(1550), true);
  assert.equal(lose[0], 1);
});

test('profession skills are modelled in the duel: a stun, a curse and multi-hit change the outcome', () => withSeed(5, () => {
  const plain = fight('mage', 'priest', 40, 16).defenderLoss;
  const arch = fight('archmage', 'priest', 60, 16).defenderLoss;
  assert.ok(arch > plain, `archmage ${arch.toFixed(1)} vs mage ${plain.toFixed(1)}`);
}));

// ---- skill upgrades count in duels ----
test('skill levels and enchant routes make a fighter stronger in the arena and in raids, not only against bosses', () => {
  const duelLoss = (enchant) => withSeed(77, () => {
    let loss = 0;
    for (let i = 0; i < 12; i++) {
      const me = player('archmage', 70);
      for (const skill of me.game.gameClass.skills) {
        skill.enchantLevel = enchant;
        if (enchant) { skill.routeKind = 'power'; skill.routeLevel = 5; }
      }
      loss += 100 - clanDuel(me, player('archmage', 70)).defenderPercent;
    }
    return loss / 12;
  });
  const plain = duelLoss(0);
  const upgraded = duelLoss(10);
  assert.ok(upgraded > plain * 1.15, `plain ${plain.toFixed(1)}% vs upgraded ${upgraded.toFixed(1)}%`);
});

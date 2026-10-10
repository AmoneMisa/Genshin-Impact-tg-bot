import test from 'node:test';
import assert from 'node:assert/strict';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import { PASSIVES, getPassivesState, learnPassive, passiveModifiers, PASSIVE_COST } from '../functions/game/player/passiveSkills.js';
import { CLAN_SKILLS, getClanSkillsState, learnClanSkill, syncClanPerks, clanPerkModifiers } from '../functions/game/clans/clanPerks.js';

const player = (className = 'warrior', overrides = {}) => ({
  game: { gameClass: { stats: { name: className } }, stats: { lvl: 80 }, inventory: { sp: 1000, gold: 1_000_000 }, equipmentStats: {}, ...overrides },
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('every class family has passives and the stats are real', () => {
  for (const family of ['warrior', 'berserk', 'archer', 'rogue', 'mage', 'priest']) {
    assert.ok(getPassivesState(player(family)).passives.length >= 3, family);
  }
  assert.ok(PASSIVES.every(passive => passive.per !== 0));
});

test('learning a passive costs SP and gold and respects the level gate', () => {
  const session = player();
  assert.equal(learnPassive(session, 'weapon-mastery').ok, true);
  assert.equal(session.game.inventory.sp, 1000 - PASSIVE_COST[0].sp);
  assert.equal(session.game.inventory.gold, 1_000_000 - PASSIVE_COST[0].gold);
  assert.equal(learnPassive(session, 'magic-mastery').reason, 'unknown_passive');

  const low = player('warrior', { stats: { lvl: 12 } });
  learnPassive(low, 'weapon-mastery');
  assert.equal(learnPassive(low, 'weapon-mastery').reason, 'level_too_low');
  assert.equal(learnPassive(player('warrior', { inventory: { sp: 0, gold: 99999 } }), 'weapon-mastery').reason, 'not_enough_sp');
});

test('passives feed the stat pipeline and switch off with the class family', () => {
  const session = player();
  const before = getEquipStatByName(session, 'attackMul', true);
  for (let i = 0; i < 3; i += 1) learnPassive(session, 'weapon-mastery');
  near(getEquipStatByName(session, 'attackMul', true), before * 1.06);
  session.game.gameClass.stats.name = 'mage';
  near(getEquipStatByName(session, 'attackMul', true), before);
  assert.deepEqual(passiveModifiers(session), {});
});

test('clan skills cost gold and an egg, and reach members through game.clanPerks', () => {
  const clan = { level: 6, reputation: 9000, warehouse: { gold: 100000, egg_wyvern: 1 }, skills: {} };
  const id = CLAN_SKILLS[0].id;
  assert.equal(getClanSkillsState(clan).skills[0].canLearn, true);
  assert.equal(learnClanSkill(clan, id).ok, true);
  assert.equal(clan.warehouse.egg_wyvern, 0);
  assert.equal(learnClanSkill(clan, id).reason, 'not_enough_eggs');

  const session = player();
  const base = getEquipStatByName(session, 'attackMul', true);
  assert.equal(syncClanPerks(session, clan), true);
  near(getEquipStatByName(session, 'attackMul', true), base * 1.01);
  syncClanPerks(session, null);
  assert.deepEqual(clanPerkModifiers(session), {});
});

import { augmentItem, canAugment, lifestoneKey } from '../functions/game/equipment/augment.js';

test('a Life Stone adds a bonus to a weapon and another one re-rolls it', () => {
  const weapon = { name: 'Sword', mainType: 'weapon', grade: 'S', slots: ['rightHand'], kind: 'oneHandedSword', uid: 'w1' };
  const session = player('warrior', { inventory: { gold: 0, materials: { [lifestoneKey('S')]: 2, craft_gem_C: 100 } }, equipmentStats: { rightHand: { ...weapon } } });
  weapon.isUsed = true;
  session.game.inventory.equipment = { items: [weapon] };
  assert.equal(canAugment(weapon), true);
  assert.equal(canAugment({ ...weapon, mainType: 'armor' }), false);

  const first = augmentItem(session, weapon, { random: () => 0 });
  assert.equal(first.ok, true);
  assert.equal(weapon.augment.name, 'attackMul');
  assert.equal(session.game.equipmentStats.rightHand.augment.name, 'attackMul');
  near(getEquipStatByName(session, 'attackMul', true), 1 + weapon.augment.value);
  assert.equal(session.game.inventory.materials.craft_gem_C, 100 - 25);

  const second = augmentItem(session, weapon, { random: () => 0.5 });
  assert.equal(second.replaced.name, 'attackMul');
  assert.equal(second.augment.name, 'accuracy');
  assert.equal(augmentItem(session, weapon).reason, 'no_lifestone');
});

import { applyRtaResult, eloChange, ensureRta, fightSquads, RTA_START_RATING, RTA_WIN_GOLD } from '../miniapp/clanRta.js';

const fighter = (name, power) => ({ name, power, snapshot: { power } });
const clanDoc = name => ({ name, level: 1, xp: 0, warehouse: { gold: 0 }, buildings: {}, rta: {} });
// The stronger fighter wins.
const strongerWins = (a, b) => ({ result: a.power > b.power ? 0 : a.power < b.power ? 1 : 2 });

test('RTA: Elo moves rating from the loser to the winner and an upset pays more', () => {
  assert.equal(eloChange(1000, 1000, 1), 16);
  assert.equal(eloChange(1000, 1000, 0.5), 0);
  assert.ok(eloChange(800, 1200, 1) > eloChange(1200, 800, 1));
});

test('RTA: squads fight strongest against strongest and the team with more wins takes the battle', () => {
  const fight = fightSquads(
    [fighter('a1', 100), fighter('a2', 80), fighter('a3', 10)],
    [fighter('d1', 90), fighter('d2', 70), fighter('d3', 20)],
    strongerWins,
  );
  assert.deepEqual(fight.rounds.map(round => round.winner), ['attacker', 'attacker', 'defender']);
  assert.equal(fight.result, 'win');
  assert.equal(fightSquads([fighter('a', 1)], [fighter('d', 9), fighter('e', 1)], strongerWins).rounds.length, 1);
});

test('RTA: a won battle changes both ratings, pays the winner and starts the cooldown', () => {
  const winner = clanDoc('Winners');
  const loser = clanDoc('Losers');
  const fight = { result: 'win', wins: 3, losses: 2 };
  const applied = applyRtaResult(winner, loser, fight, 1000);
  assert.equal(applied.change, 16);
  assert.equal(winner.rta.rating, RTA_START_RATING + 16);
  assert.equal(loser.rta.rating, RTA_START_RATING - 16);
  assert.equal(winner.warehouse.gold, RTA_WIN_GOLD);
  assert.equal(loser.warehouse.gold, 0);
  assert.ok(winner.rta.cooldownUntil > 1000);
  assert.equal(loser.rta.history[0].result, 'loss');
  assert.equal(ensureRta(winner).wins, 1);
});

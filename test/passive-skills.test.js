import test from 'node:test';
import assert from 'node:assert/strict';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import {
  PASSIVE_SKILL_NAMES, SP_SCALE, getPassivesState, learnPassive, passiveModifiers, passiveTree,
} from '../functions/game/player/passiveSkills.js';
import { CLAN_SKILLS, getClanSkillsState, learnClanSkill, syncClanPerks, clanPerkModifiers, clanSkillLevel } from '../functions/game/clans/clanPerks.js';

const player = (className = 'duelist', overrides = {}) => ({
  game: { gameClass: { stats: { name: className, family: 'berserk' } }, stats: { lvl: 85 }, inventory: { sp: 100_000, gold: 1_000_000, materials: {} }, equipmentStats: {}, ...overrides },
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const idOf = (session, name) => getPassivesState(session).passives.find(passive => passive.name === name).id;

test('a class learns the real passives of its own tree and of its parents', () => {
  const duelist = getPassivesState(player('duelist')).passives.map(passive => passive.name);
  assert.ok(duelist.includes('Sword/Blunt Weapon Mastery') && duelist.includes('Heavy Armor Mastery'));
  const archmage = getPassivesState(player('archmage')).passives.map(passive => passive.name);
  assert.ok(archmage.includes('Boost Mana') && archmage.includes('Robe Mastery'));
  assert.ok(!archmage.includes('Sword/Blunt Weapon Mastery'));
  const kamael = getPassivesState(player('doombringer')).passives.map(passive => passive.name);
  assert.ok(kamael.length > 10);
  assert.ok(PASSIVE_SKILL_NAMES.length > 100);
});

test('learning a passive costs the real SP price (scaled), respects the level gate and the order of levels', () => {
  const session = player('duelist');
  const id = idOf(session, 'Sword/Blunt Weapon Mastery');
  const row = passiveTree(88).find(entry => String(entry.id) === id).levels[0];
  const result = learnPassive(session, id);
  assert.equal(result.ok, true);
  assert.equal(result.level, 1);
  assert.equal(session.game.inventory.sp, 100_000 - row.sp);
  assert.ok(row.sp >= 1 && SP_SCALE < 1);
  assert.equal(learnPassive(session, 'nonsense').reason, 'unknown_passive');
  assert.equal(learnPassive(session, id).level, 2, 'one level at a time');

  const low = player('duelist', { stats: { lvl: 12 } });
  assert.equal(learnPassive(low, idOf(low, 'Sword/Blunt Weapon Mastery')).reason, 'level_too_low');
  const poor = player('duelist', { inventory: { sp: 0, gold: 0, materials: {} } });
  assert.equal(learnPassive(poor, idOf(poor, 'Sword/Blunt Weapon Mastery')).reason, 'not_enough_sp');
});

test('a passive that needs its spellbook takes the real item', () => {
  const session = player('duelist');
  const id = idOf(session, 'Divine Inspiration');
  assert.equal(learnPassive(session, id).reason, 'not_enough_items');
  session.game.inventory.materials.l2_8618 = 1;
  assert.equal(learnPassive(session, id).ok, true);
  assert.equal(session.game.inventory.materials.l2_8618, 0);
});

test('passives feed the stat pipeline, need the right weapon and switch off with the class', () => {
  const session = player('duelist');
  const before = getEquipStatByName(session, 'attackMul', true);
  const id = idOf(session, 'Sword/Blunt Weapon Mastery');
  for (let i = 0; i < 12; i += 1) assert.equal(learnPassive(session, id).ok, true);
  // a sword mastery counts only with a sword in hand
  near(getEquipStatByName(session, 'attackMul', true), before);
  session.game.equipmentStats = { rightHand: { mainType: 'weapon', kind: 'oneHandedSword', slots: ['rightHand'], characteristics: {}, stats: [] } };
  assert.ok(getEquipStatByName(session, 'attackMul', true) > before);
  assert.ok(passiveModifiers(session).attackMul > 0);
  session.game.gameClass.stats.name = 'archmage';
  assert.equal(passiveModifiers(session).attackMul || 0, 0);
});

test('clan skills are the real tree: real level, scaled reputation, gold and an egg from the warehouse', () => {
  const body = CLAN_SKILLS.find(entry => entry.name === 'Clan Body');
  assert.ok(body && body.maxLevel === 3);
  assert.ok(CLAN_SKILLS.some(entry => entry.name === 'Clan Might') && CLAN_SKILLS.length >= 20);
  const clan = { level: 5, reputation: 900, warehouse: { gold: 100000, egg_wyvern: 1 }, skills: {} };
  const state = getClanSkillsState(clan).skills.find(skill => skill.id === body.id);
  assert.equal(state.canLearn, true);
  assert.equal(learnClanSkill({ ...clan, level: 4 }, body.id).reason, 'clan_level_too_low');
  assert.equal(learnClanSkill(clan, body.id).ok, true);
  assert.equal(clan.warehouse.egg_wyvern, 0);
  assert.equal(learnClanSkill(clan, body.id).reason, 'clan_level_too_low', 'level 2 asks for a higher clan');
  clan.level = 7;
  assert.equal(learnClanSkill(clan, body.id).reason, 'not_enough_reputation');
  assert.equal(clanSkillLevel(clan, body.id), 1);

  const session = player('duelist');
  const base = getEquipStatByName(session, 'maxHpMul', true);
  assert.equal(syncClanPerks(session, clan), true);
  near(getEquipStatByName(session, 'maxHpMul', true), base * 1.025);
  syncClanPerks(session, null);
  assert.deepEqual(clanPerkModifiers(session), {});
});

test('a clan skill meant for casters does not reach a fighter and the other way round', () => {
  const might = CLAN_SKILLS.find(entry => entry.name === 'Clan Might');
  const empower = CLAN_SKILLS.find(entry => entry.name === 'Clan Empower');
  const fighter = player('duelist');
  fighter.game.clanPerks = { [might.id]: 2, [empower.id]: 2 };
  near(clanPerkModifiers(fighter).attackMul, might.per * 2);
  const caster = player('archmage');
  caster.game.gameClass.stats.family = 'mage';
  caster.game.clanPerks = { [might.id]: 2, [empower.id]: 2 };
  near(clanPerkModifiers(caster).attackMul, empower.per * 2);
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

import ensureClanPerks from '../functions/game/clans/ensureClanPerks.js';
import getAttack from '../functions/game/player/getters/getAttack.js';

test('a fighter is refreshed with the current clan skills before a combat reads its stats', async () => {
  const might = CLAN_SKILLS.find(entry => entry.name === 'Clan Might');
  const clan = { level: 8, skills: { [might.id]: 3 } };
  const session = player('duelist');
  session.game.clanPerks = {};
  session.game.gameClass.stats.attack = 1000;
  const before = getAttack(session);
  assert.equal(await ensureClanPerks(session, 1, clan), true);
  assert.ok(getAttack(session) > before, 'the clan skill reaches the attack');
  // a clan that is gone takes the perks away; a lookup that fails keeps the fight going
  assert.equal(await ensureClanPerks(session, 1, null), true);
  assert.deepEqual(session.game.clanPerks, {});
  assert.equal(await ensureClanPerks(null, 1, clan), false);
});

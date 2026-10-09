import test from 'node:test';
import assert from 'node:assert/strict';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import { AUGMENT_GOLD, augmentGold, augmentInfo, augmentItem, canAugment, lifestoneKey } from '../functions/game/equipment/augment.js';
import { activateSkill, chanceSkillFactor, equippedChanceSkills, LS_SKILLS, passiveSkillModifiers } from '../functions/game/equipment/lifestoneSkills.js';
import { addAttribute, attackFactor, attributeKey, attributeProfile, clearAttribute, normalizeElement, pvpFactor, resistFactor } from '../functions/game/equipment/attributes.js';
import { rollAttributeDrops } from '../functions/game/equipment/enchantDrops.js';
import { baseStatDelta, getBaseStatsState, statTotal } from '../functions/game/player/baseStats.js';
import materials from '../template/materialsTemplate.js';

const player = (className = 'warrior', overrides = {}) => ({
  game: { gameClass: { stats: { name: className } }, stats: { lvl: 80 }, inventory: { gold: 10_000_000, materials: {} }, equipmentStats: {}, ...overrides },
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const wear = (session, item) => {
  item.isUsed = true;
  for (const slot of item.slots) session.game.equipmentStats[slot] = item;
  session.game.inventory.equipment = { items: [...(session.game.inventory.equipment?.items || []), item] };
  return item;
};
const give = (session, key, amount = 1) => { session.game.inventory.materials[key] = (session.game.inventory.materials[key] || 0) + amount; };
const sword = (extra = {}) => ({ name: 'Sword', mainType: 'weapon', grade: 'S', slots: ['rightHand'], kind: 'oneHandedSword', classOwner: ['warrior'], uid: 'w1', ...extra });
const ring = (extra = {}) => ({ name: 'Ring', mainType: 'jewelry', grade: 'S', slots: ['ring1'], kind: 'ring', uid: 'j1', ...extra });
const armor = (extra = {}) => ({ name: 'Plate', mainType: 'armor', grade: 'S', slots: ['up'], kind: 'heavy', uid: 'a1', ...extra });

test('every stone tier and attribute stone is a real material', () => {
  for (const tier of ['normal', 'mid', 'high', 'top']) {
    for (const grade of ['C', 'S84']) assert.ok(materials.some(entry => entry.key === lifestoneKey(grade, tier)), `${tier} ${grade}`);
  }
  assert.equal(lifestoneKey('S'), 'lifestone_S');
  for (const tier of ['stone', 'crystal', 'jewel']) assert.ok(materials.some(entry => entry.key === attributeKey(tier, 'fire')));
});

test('jewellery can be augmented, weapons and jewellery only, epics never', () => {
  assert.equal(canAugment(ring()), true);
  assert.equal(canAugment(armor()), false);
  assert.equal(canAugment(ring({ epic: true })), false);
  assert.equal(canAugment(sword({ epicWeapon: 'x' })), false);
  const session = player();
  assert.equal(augmentItem(session, ring({ epic: true })).reason, 'epic_item');
});

test('a jewellery stone adds whole points of a base stat that reach the stat pipeline', () => {
  const session = player();
  const item = wear(session, ring());
  give(session, lifestoneKey('S'));
  const result = augmentItem(session, item, { random: () => 0 });
  assert.equal(result.ok, true);
  assert.equal(item.augment.name, 'STR');
  assert.ok(Number.isInteger(item.augment.value) && item.augment.value >= 1);
  assert.equal(getEquipStatByName(session, 'STR'), item.augment.value);
  assert.equal(statTotal(session, 'STR'), 40 + item.augment.value);
});

test('better stones cost more gold, give more and can add a weapon skill', () => {
  assert.ok(augmentGold('S', 'top') > augmentGold('S', 'mid') && augmentGold('S', 'mid') > AUGMENT_GOLD.S);
  const session = player();
  const weapon = wear(session, sword());
  give(session, lifestoneKey('S', 'top'));
  const result = augmentItem(session, weapon, { tier: 'top', random: () => 0.1 });
  assert.equal(result.ok, true);
  assert.equal(session.game.inventory.gold, 10_000_000 - augmentGold('S', 'top'));
  assert.ok(weapon.augment.skill, 'a top stone gave a skill');
  assert.equal(weapon.augment.tier, 'top');
  assert.equal(session.game.equipmentStats.rightHand.augment.skill.id, weapon.augment.skill.id);

  // A plain stone never gives a skill.
  const plain = player();
  const other = wear(plain, sword({ uid: 'w2' }));
  give(plain, lifestoneKey('S'));
  augmentItem(plain, other, { random: () => 0 });
  assert.equal(other.augment.skill, undefined);
  assert.equal(augmentItem(plain, other).reason, 'no_lifestone');
  assert.equal(augmentInfo(plain, other).tiers.length, 4);
});

test('passive, chance and active weapon skills do what they say', () => {
  const session = player();
  const weapon = wear(session, sword());
  const before = getEquipStatByName(session, 'attackMul', true);
  weapon.augment = { name: 'accuracy', value: 1, tier: 'top', skill: { id: 'passive_duel_might', level: 3 } };
  session.game.equipmentStats.rightHand = weapon;
  near(passiveSkillModifiers(session).attackMul, 0.045);
  near(getEquipStatByName(session, 'attackMul', true), before * 1.045);

  weapon.augment.skill = { id: 'chance_critical_anger', level: 1 };
  const chances = equippedChanceSkills(session);
  assert.equal(chances.length, 1);
  near(chanceSkillFactor(chances, () => 0), 1.2);
  near(chanceSkillFactor(chances, () => 0.99), 1);

  weapon.augment.skill = { id: 'active_might', level: 2 };
  const now = Date.now();
  assert.equal(activateSkill(session, weapon, now).ok, true);
  near(getEquipStatByName(session, 'attackMul', true), before * 1.08);
  assert.equal(activateSkill(session, weapon, now + 1000).reason, 'skill_cooldown');
  assert.equal(activateSkill(session, { ...weapon, uid: 'other', slots: ['leftHand'] }, now + 10 ** 8).reason, 'not_equipped');
  assert.ok(LS_SKILLS.every(skill => skill.name && skill.kind));
});

test('attributes: stones add points up to the tier cap, only one element per item', () => {
  const session = player();
  const weapon = wear(session, sword());
  give(session, attributeKey('stone', 'fire'), 8);
  give(session, attributeKey('stone', 'water'));
  for (let i = 0; i < 5; i += 1) assert.equal(addAttribute(session, weapon, 'fire', 'stone').ok, true);
  assert.equal(weapon.attribute.value, 25);
  assert.equal(addAttribute(session, weapon, 'fire', 'stone').reason, 'attribute_tier_max');
  assert.equal(addAttribute(session, weapon, 'water', 'stone').reason, 'wrong_element');
  assert.equal(addAttribute(session, weapon, 'fire', 'crystal').reason, 'no_attribute_stone');
  assert.equal(session.game.equipmentStats.rightHand.attribute.value, 25);
  assert.equal(addAttribute(session, armor({ grade: 'D' }), 'fire', 'stone').reason, 'not_attributable');

  assert.equal(clearAttribute(session, weapon).ok, true);
  assert.equal(weapon.attribute, null);
});

test('attributes: weapon element hits harder, armor resists, opposites are weak', () => {
  near(attackFactor({ element: 'fire', value: 100 }), 1.15);
  near(attackFactor({ element: 'fire', value: 100 }, 'water'), 1.225);
  near(attackFactor({ element: 'fire', value: 100 }, 'fire'), 1.075);
  assert.equal(attackFactor(null, 'fire'), 1);
  near(resistFactor({ fire: 50 }, 'fire'), 0.9);
  assert.equal(resistFactor({ fire: 50 }, 'water'), 1);
  near(resistFactor({ fire: 9999 }, 'fire'), 0.7);

  const session = player();
  wear(session, sword({ attribute: { element: 'wind', value: 60 } }));
  wear(session, armor({ attribute: { element: 'fire', value: 30 } }));
  wear(session, armor({ uid: 'a2', slots: ['helmet'], attribute: { element: 'fire', value: 20 } }));
  const profile = attributeProfile(session);
  assert.deepEqual(profile.attack, { element: 'wind', value: 60 });
  assert.equal(profile.resist.fire, 50);
  near(pvpFactor(profile, { resist: { wind: 100 } }), (1 + 60 * 0.0015) * 0.8);
  assert.equal(normalizeElement('lightning'), 'wind');
  assert.equal(normalizeElement('ice'), 'water');
  assert.equal(normalizeElement('earth'), 'earth');
  assert.equal(normalizeElement('nonsense'), null);
});

test('bosses drop the attribute stones of their own element', () => {
  const member = { game: { stats: { lvl: 82 }, inventory: {} } };
  const drops = rollAttributeDrops(member, { element: 'fire', tier: 3, place: 1, random: () => 0 });
  assert.deepEqual(drops.map(drop => drop.item), ['attr_stone_fire', 'attr_crystal_fire', 'attr_jewel_fire']);
  assert.deepEqual(rollAttributeDrops(member, { element: 'fire', tier: 1, place: 1, random: () => 0 }).map(drop => drop.item), ['attr_stone_fire']);
  assert.deepEqual(rollAttributeDrops(member, { element: null, random: () => 0 }), []);
  assert.deepEqual(rollAttributeDrops({ game: { stats: { lvl: 5 }, inventory: {} } }, { element: 'fire', random: () => 0 }), []);
});

test('base stats: gear points feed attack, hp and cooldowns like Lineage II, and nothing changes without them', () => {
  const warrior = player('warrior');
  assert.equal(baseStatDelta(warrior, 'attackMul'), 0);
  assert.equal(getEquipStatByName(warrior, 'attackMul', true), 1);
  wear(warrior, ring({ augment: { name: 'STR', value: 4, tier: 'normal' } }));
  assert.ok(baseStatDelta(warrior, 'attackMul') > 0.05 && baseStatDelta(warrior, 'attackMul') < 0.1);
  assert.equal(baseStatDelta(warrior, 'maxHpMul'), 0);

  // INT is the attack stat of a mage, STR of a warrior.
  const mage = player('mage');
  wear(mage, ring({ augment: { name: 'STR', value: 4, tier: 'normal' } }));
  assert.equal(baseStatDelta(mage, 'attackMul'), 0);
  wear(mage, ring({ uid: 'j2', slots: ['ring2'], augment: { name: 'INT', value: 4, tier: 'normal' } }));
  assert.ok(baseStatDelta(mage, 'attackMul') > 0);

  const witty = player('mage');
  wear(witty, ring({ augment: { name: 'WIT', value: 3, tier: 'normal' } }));
  assert.ok(baseStatDelta(witty, 'skillCooltimeMul') < 0 && baseStatDelta(witty, 'skillCooltimeMul') >= -0.4);
  assert.ok(getEquipStatByName(witty, 'skillCooltimeMul', true) < 1);

  const state = getBaseStatsState(warrior);
  assert.deepEqual(state.map(stat => stat.id), ['STR', 'DEX', 'CON', 'INT', 'WIT', 'MEN']);
  assert.equal(state[0].total, 44);
  assert.equal(state[0].bonus, 4);
});

import { buyClanShopItem } from '../miniapp/clanActivities.js';
import { buyLuckItem } from '../miniapp/luck.js';
import { getMaterialCount } from '../functions/game/player/materials.js';
import { LIFESTONE_SHOP } from '../template/augmentData.js';
import clanShop from '../dictionaries/clanShop.js';
import luckShop from '../template/luckShop.js';
import shopTemplate from '../template/shopTemplate.js';

test('Life Stones are sold by quality: mid in the gold shop (to S), high in the clan shop (to S80), top for coins (to S84)', async () => {
  assert.deepEqual(Object.keys(LIFESTONE_SHOP.mid), ['C', 'B', 'A', 'S']);
  assert.deepEqual(Object.keys(LIFESTONE_SHOP.high), ['C', 'B', 'A', 'S', 'S80']);
  assert.deepEqual(Object.keys(LIFESTONE_SHOP.top), ['C', 'B', 'A', 'S', 'S80', 'S84']);
  assert.equal(shopTemplate.filter(item => item.command.startsWith('lifestoneMid-')).length, 4);

  // The purchase itself goes through shopSellItem (it looks the buyer's name up in the database).
  const mid = shopTemplate.find(item => item.command === 'lifestoneMid-S');
  assert.deepEqual(mid.material, { key: lifestoneKey('S', 'mid'), amount: 1 });
  assert.equal(mid.cost, LIFESTONE_SHOP.mid.S);
  assert.equal(mid.category, 'stones');

  const clan = { owner: 1, level: 5, warehouse: { gold: 10_000_000, crystals: 1000 }, members: [{ userId: 1, role: 'owner' }] };
  const member = { game: { inventory: { materials: {} } } };
  const key = 'lifestone-high-S80';
  assert.ok(clanShop.some(item => item.key === key));
  assert.ok(!clanShop.some(item => item.key === 'lifestone-high-S84'));
  const got = buyClanShopItem(clan, member, 1, key, { now: 1_000 });
  assert.equal(got.ok, true);
  assert.equal(getMaterialCount(member, lifestoneKey('S80', 'high')), 1);
  assert.equal(clan.warehouse.gold, 10_000_000 - LIFESTONE_SHOP.high.S80.gold);
  assert.equal(clan.warehouse.crystals, 1000 - LIFESTONE_SHOP.high.S80.crystals);

  const donor = { userId: 1, game: { stats: { lvl: 90 }, inventory: { luckCoins: 100, materials: {}, equipment: { items: [] } } } };
  assert.ok(luckShop.some(item => item.id === 'lifestone-top-S84'));
  const paid = buyLuckItem(donor, 'lifestone-top-S84');
  assert.equal(paid.ok, true);
  assert.equal(getMaterialCount(donor, lifestoneKey('S84', 'top')), 1);
  assert.equal(donor.game.inventory.luckCoins, 100 - LIFESTONE_SHOP.top.S84);
});

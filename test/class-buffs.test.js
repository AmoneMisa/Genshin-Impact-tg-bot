import test from 'node:test';
import assert from 'node:assert/strict';
import buffPotions from '../template/buffPotions.js';
import { BUFF_LEVEL_FACTOR, buffLevelAt, canBuffOthers, classBuffsFor } from '../template/classBuffs.js';
import { applyPotionBuff, addBuffPotion, potionStatBonus, activePotionBuffs } from '../functions/game/player/potionBuffs.js';
import { castClassBuff, getClassBuffsState, describeBuff, BUFF_CAST_COOLDOWN_MS } from '../miniapp/buffs.js';
import { rollBuffPotionDrop, giveBuffPotionDrop, BUFF_POTION_DROP_CHANCE } from '../functions/game/boss/buffPotionDrops.js';
import { openChest } from '../miniapp/chest.js';
import clanShop from '../dictionaries/clanShop.js';
import giveClanShopPotion from '../functions/game/clans/giveClanShopPotion.js';
import potionsTemplate from '../template/potionsInInventoryTemplate.js';

const NOW = 1_800_000_000_000;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !~ ${expected}`);

function player(className, level, extra = {}) {
  const members = [];
  const member = {
    userId: extra.userId ?? 1,
    userChatData: { user: { first_name: extra.name || 'Caster' } },
    game: {
      effects: [],
      equipmentStats: {},
      stats: { lvl: level },
      gameClass: { stats: { name: className, translateName: className, hp: 500, maxHp: 500, mp: extra.mp ?? 1000, maxMp: 1000 }, skills: [] },
      inventory: { gold: 0, potions: { items: [] } },
    },
    ownerDocument: () => ({ members }),
  };
  members.push(member);
  return { member, members };
}

test('classes inherit buffs and keep the earlier unlock', () => {
  assert.deepEqual(Object.keys(classBuffsFor('noClass')), []);
  assert.deepEqual(classBuffsFor('warrior').might, [8, 28, 48]);
  // A promoted class gets its parent's buffs plus its own.
  assert.deepEqual(classBuffsFor('crusader').might, [8, 28, 48]);
  assert.deepEqual(classBuffsFor('crusader').haste, [24, 44]);
  assert.deepEqual(classBuffsFor('phoenixKnight').haste, [24, 44]);
  // Own entries can unlock earlier / go higher than the parent's.
  assert.deepEqual(classBuffsFor('saint').shield, [6, 20, 40]);
  assert.deepEqual(classBuffsFor('bastion').shield, [10, 30, 42]);
  assert.deepEqual(classBuffsFor('bastion').might, [8, 28, 48]);
});

test('buff level grows with the character level and every list is ascending', () => {
  assert.equal(buffLevelAt('warrior', 'might', 7), 0);
  assert.equal(buffLevelAt('warrior', 'might', 8), 1);
  assert.equal(buffLevelAt('warrior', 'might', 28), 2);
  assert.equal(buffLevelAt('warrior', 'might', 99), 3);
  assert.equal(buffLevelAt('mage', 'focus', 99), 2);
  for (const className of Object.keys(classBuffsFor('titan')).length ? ['titan', 'saint', 'phantomDancer', 'bastion', 'rogue'] : []) {
    for (const [buff, levels] of Object.entries(classBuffsFor(className))) {
      assert.deepEqual([...levels].sort((a, b) => a - b), levels, `${className}.${buff}`);
      assert.ok(buffPotions.some(potion => potion.id === buff), buff);
    }
  }
  assert.equal(canBuffOthers('saint'), true);
  assert.equal(canBuffOthers('warrior'), false);
});

test('a weaker class buff scales the potion and never downgrades a stronger one', () => {
  const { member } = player('warrior', 30);
  applyPotionBuff(member, 'might', NOW, { factor: BUFF_LEVEL_FACTOR[1] });
  near(potionStatBonus(member, 'attackMul', true, NOW), 1 + 0.15 * 0.5);
  applyPotionBuff(member, 'might', NOW, { factor: BUFF_LEVEL_FACTOR[3] });
  assert.equal(potionStatBonus(member, 'attackMul', true, NOW), 1.15);
  // A level I recast keeps level III running but extends its time.
  applyPotionBuff(member, 'might', NOW + 600_000, { factor: BUFF_LEVEL_FACTOR[1] });
  assert.equal(potionStatBonus(member, 'attackMul', true, NOW + 600_000), 1.15);
  assert.equal(activePotionBuffs(member, NOW + 1_700_000).length, 1);
  // A potion (factor 1) refreshes whatever was there.
  applyPotionBuff(member, 'focus', NOW, { factor: 0.5 });
  applyPotionBuff(member, 'focus', NOW + 1000);
  assert.equal(potionStatBonus(member, 'criticalChance', false, NOW + 1000), 15);
  assert.equal(describeBuff(buffPotions[0], 0.5), 'Атака +7.5%');
});

test('casting spends mana, starts the cooldown and applies the buff at the buff level', () => {
  const { member } = player('warrior', 30);
  const cast = castClassBuff(member, 'might', null, NOW);
  assert.equal(cast.ok, true);
  assert.equal(cast.level, 2);
  assert.equal(member.game.gameClass.stats.mp, 1000 - cast.spent);
  near(potionStatBonus(member, 'attackMul', true, NOW), 1 + 0.15 * BUFF_LEVEL_FACTOR[2]);
  assert.equal(castClassBuff(member, 'might', null, NOW + 1000).reason, 'cooldown');
  assert.equal(castClassBuff(member, 'might', null, NOW + BUFF_CAST_COOLDOWN_MS + 1).ok, true);
});

test('casting is refused when it cannot work', () => {
  const low = player('warrior', 5).member;
  assert.equal(castClassBuff(low, 'might', null, NOW).reason, 'not_learned');
  assert.equal(castClassBuff(low, 'nope', null, NOW).reason, 'unknown_buff');
  const poor = player('warrior', 30, { mp: 3 }).member;
  assert.equal(castClassBuff(poor, 'might', null, NOW).reason, 'not_enough_mp');
  const dead = player('warrior', 30).member;
  dead.game.gameClass.stats.hp = 0;
  assert.equal(castClassBuff(dead, 'might', null, NOW).reason, 'player_dead');
  assert.equal(castClassBuff(player('warrior', 30).member, 'might', '2', NOW).reason, 'self_only');
});

test('support classes buff other players of the chat, at a higher mana price', () => {
  const { member: priest, members } = player('saint', 50);
  const ally = { userId: 2, userChatData: { user: { first_name: 'Ally' } }, game: { effects: [] } };
  const bot = { userId: 3, userChatData: { user: { is_bot: true } }, game: {} };
  members.push(ally, bot);
  assert.equal(castClassBuff(priest, 'shield', '9', NOW).reason, 'unknown_player');
  assert.equal(castClassBuff(priest, 'shield', '3', NOW).reason, 'unknown_player');
  const self = castClassBuff(priest, 'haste', null, NOW);
  const other = castClassBuff(priest, 'shield', '2', NOW);
  assert.equal(other.ok, true);
  assert.equal(other.onSelf, false);
  assert.equal(other.targetName, 'Ally');
  assert.ok(other.spent > self.spent - 1);
  near(potionStatBonus(ally, 'defenceMul', true, NOW), 1 + 0.15 * BUFF_LEVEL_FACTOR[3]);
  assert.equal(potionStatBonus(priest, 'defenceMul', true, NOW), 1);
});

test('the buffs screen lists learned buffs with their unlock levels', () => {
  const { member } = player('priest', 30);
  const state = getClassBuffsState(member, NOW);
  assert.equal(state.support, true);
  assert.deepEqual(state.buffs.map(buff => buff.id).sort(), ['haste', 'might', 'shield', 'wind-walk']);
  const might = state.buffs.find(buff => buff.id === 'might');
  assert.equal(might.level, 2);
  assert.equal(might.nextLevelAt, 50);
  assert.equal(state.players.length, 1);
  assert.deepEqual(getClassBuffsState(player('noClass', 80).member, NOW).buffs, []);
});

test('buff potions drop from bosses: small chance, better for the top, epic top places always', () => {
  const always = () => 0;
  const never = () => 0.999;
  assert.equal(typeof rollBuffPotionDrop({ tier: 1, place: 9 }, always), 'string');
  assert.equal(rollBuffPotionDrop({ tier: 1, place: 9 }, never), null);
  // Place 5 uses the base chance, place 1 gets 1.5x.
  const justAbove = BUFF_POTION_DROP_CHANCE[1] * 1.2;
  assert.equal(rollBuffPotionDrop({ tier: 1, place: 5 }, () => justAbove), null);
  assert.notEqual(rollBuffPotionDrop({ tier: 1, place: 1 }, () => justAbove), null);
  assert.ok(BUFF_POTION_DROP_CHANCE[3] > BUFF_POTION_DROP_CHANCE[1]);
  assert.notEqual(rollBuffPotionDrop({ tier: 3, place: 3, epic: true }, never), null);
  assert.equal(rollBuffPotionDrop({ tier: 3, place: 4, epic: true }, never), null);

  const { member } = player('warrior', 30);
  const line = giveBuffPotionDrop(member, { tier: 1, place: 1 }, always);
  assert.equal(line.icon, '🧪');
  const stack = member.game.inventory.potions.items.find(item => item.id === 'might');
  assert.equal(stack.count, 1);
  giveBuffPotionDrop(member, { tier: 1, place: 1 }, always);
  assert.equal(stack.count, 2);
  assert.equal(addBuffPotion(member, 'unknown'), null);
});

test('chests can hold a buff potion', () => {
  let found = null;
  for (let attempt = 0; attempt < 600 && !found; attempt++) {
    const { member } = player('warrior', 10);
    member.chestTries = 1;
    member.game.stats.currentExp = 0;
    member.game.stats.needExp = 1e12;
    const result = openChest(member, 1, 1 + (attempt % 9));
    if (result.prize.type === 'buffPotion') found = { result, member };
  }
  assert.ok(found, 'no buff potion in 600 chests');
  assert.equal(found.result.prize.amount, 1);
  assert.match(found.result.prize.label, /^Зелье /);
  assert.equal(found.member.game.inventory.potions.items.reduce((sum, item) => sum + item.count, 0), 1);
});

test('the clan shop sells every buff potion and delivers it by id', () => {
  for (const potion of buffPotions) {
    const entry = clanShop.find(item => item.key === `buff-${potion.id}`);
    assert.ok(entry, potion.id);
    assert.ok(potionsTemplate.some(item => item.id === potion.id));
  }
  const { member } = player('warrior', 10);
  const might = clanShop.find(item => item.key === 'buff-might');
  const haste = clanShop.find(item => item.key === 'buff-haste');
  assert.equal(giveClanShopPotion(member, might.potion), true);
  assert.equal(giveClanShopPotion(member, might.potion), true);
  assert.equal(giveClanShopPotion(member, haste.potion), true);
  const items = member.game.inventory.potions.items;
  assert.deepEqual(items.map(item => [item.id, item.count]), [['might', 2], ['haste', 1]]);
});

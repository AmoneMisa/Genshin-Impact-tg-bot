import test from 'node:test';
import assert from 'node:assert/strict';
import Chat from '../db/models/Chat.js';
import userTemplate from '../template/userTemplate.js';
import bossSendLoot from '../functions/game/boss/bossSendLoot.js';
import { BUFF_POTION_IDS } from '../functions/game/player/potionBuffs.js';

function member(userId, className = 'warrior') {
  const game = structuredClone(userTemplate.game ?? userTemplate);
  game.stats = { lvl: 30, currentExp: 0, needExp: 1e12 };
  game.gameClass = { ...(game.gameClass || {}), stats: { name: className, hp: 100, maxHp: 100, mp: 10, maxMp: 10 }, skills: [] };
  game.inventory = { ...(game.inventory || {}), gold: 0, crystals: 0, equipment: { items: [] }, potions: { items: [] }, materials: { items: [] } };
  return { userId, game, userChatData: { user: { first_name: `P${userId}` } } };
}

const potionCount = player => player.game.inventory.potions.items.reduce((sum, item) => sum + (BUFF_POTION_IDS.includes(item.id) ? item.count : 0), 0);

async function kill(t, bossName, fighters, random) {
  const members = fighters.map(id => member(id));
  let saved = 0;
  t.mock.method(Chat, 'findOne', async () => ({ members, save: async () => { saved++; } }));
  t.mock.method(Math, 'random', random);
  const boss = {
    name: bossName,
    stats: { lvl: 5 },
    currentHp: 0,
    hp: 1000,
    listOfDamage: fighters.map((id, index) => ({ id, damage: 1000 - index * 100 })),
    minions: [],
  };
  const loot = await bossSendLoot(boss, 1);
  return { loot, members, saved };
}

test('a boss kill puts buff potions into the winners inventories and the loot report', async t => {
  const { loot, members, saved } = await kill(t, 'queenAnt', [1, 2, 3, 4], () => 0.01);
  assert.equal(saved > 0, true);
  for (const player of members) {
    assert.equal(potionCount(player), 1, `player ${player.userId}`);
    const line = loot[player.userId].items.find(item => item.item.startsWith('potion-'));
    assert.ok(line, 'potion listed in the loot');
    assert.match(line.name, /^Зелье /);
    assert.equal(line.amount, 1);
  }
});

test('with unlucky rolls only the epic boss top three still get a potion', async t => {
  const { members } = await kill(t, 'queenAnt', [1, 2, 3, 4, 5], () => 0.999);
  assert.deepEqual(members.map(potionCount), [1, 1, 1, 0, 0]);
});

test('everyone who fights an epic boss gets Coins of Luck, scaled by the boss, and shown in the loot', async t => {
  const { loot, members } = await kill(t, 'queenAnt', [1, 2, 3, 4, 5], () => 0.999);
  for (const player of members) {
    assert.equal(player.game.inventory.luckCoins, 5, `player ${player.userId}`);
    assert.equal(loot[player.userId].luckCoins, 5);
    assert.deepEqual(loot[player.userId].items.find(item => item.item === 'luckCoins').amount, 5);
  }
});

test('epic bosses pay 5 to 50 coins and ordinary bosses none', async t => {
  const { EPIC_LUCK_COINS, epicLuckCoins } = await import('../functions/game/boss/epicBosses.js');
  const values = Object.values(EPIC_LUCK_COINS);
  assert.equal(Math.min(...values), 5);
  assert.equal(Math.max(...values), 50);
  assert.deepEqual([...values].sort((a, b) => a - b), values, 'the harder the boss, the more coins');
  assert.equal(epicLuckCoins('someOrdinaryBoss'), 0);

  const { members } = await kill(t, 'kivaha', [1, 2], () => 0.999);
  assert.deepEqual(members.map(player => player.game.inventory.luckCoins ?? 0), [0, 0]);
});

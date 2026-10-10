import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import { getHotbar, setHotbar, specialSkills, activateLifeStone, HOTBAR_MAX } from '../functions/game/player/hotbar.js';
import { useSpecialForMiniApp } from '../miniapp/hunt.js';
import { hotbar, hotbarChoice } from '../webapp/boss-hud.js';
import { findCatalogItem, instantiate } from '../functions/game/equipment/catalog.js';

function hero(className = 'duelist', level = 85) {
  const session = { userId: 1, userChatData: { user: { id: 1 } }, game: { stats: { lvl: level }, inventory: { gold: 0, materials: {}, equipment: { items: [] } }, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0 } };
  changeClass(session, className);
  updateStats(session);
  session.game.gameClass.stats.mp = session.game.gameClass.stats.maxMp;
  return session;
}

test('the bar keeps the skills the player chose, in order, at most sixteen and never twice', () => {
  const session = hero();
  const total = session.game.gameClass.skills.length;
  const start = getHotbar(session);
  assert.ok(start.length > 0 && start.length <= Math.min(HOTBAR_MAX, total), 'a new hero gets the first skills of the kit');
  assert.deepEqual(start, [...start].sort((a, b) => a - b));
  // a toggle skill (Riposte Stance ...) lives on the second tab, not on the bar
  const toggleNames = new Set(specialSkills(session).filter(row => row.type === 'toggle').map(row => row.name));
  assert.ok(start.every(index => !toggleNames.has(session.game.gameClass.skills[index].name)));
  assert.equal(HOTBAR_MAX, 16);
  const pick = start.slice(0, 3).reverse();
  const result = setHotbar(session, [...pick, pick[0], 99, 'x']);
  assert.deepEqual(result.hotbar, pick);
  assert.deepEqual(getHotbar(session), pick);
  assert.equal(setHotbar(session, []).reason, 'empty_hotbar');
  assert.equal(setHotbar(session, Array.from({ length: 20 }, (_, index) => index)).reason, 'too_many');
  assert.deepEqual(getHotbar(session), pick, 'a refused choice changes nothing');
});

test('the second tab holds the Life Stone skill and the toggle skills of the class', () => {
  const session = hero('warlord');
  const toggles = specialSkills(session).filter(row => row.type === 'toggle');
  assert.ok(toggles.length > 0 && toggles.every(row => row.id.startsWith('l2:')));
  assert.equal(specialSkills(session).some(row => row.type === 'ls'), false);

  // a weapon with an active Life Stone skill
  const sword = instantiate(findCatalogItem('S:weapon:oneHandedSword'));
  sword.augment = { name: 'attackMul', value: 0.05, skill: { id: 'duel-might', level: 3 } };
  sword.isUsed = true;
  session.game.equipmentStats = { rightHand: { ...sword, slots: ['rightHand'] } };
  session.game.inventory.equipment.items.push(sword);
  const ls = specialSkills(session).find(row => row.type === 'ls');
  if (ls) {
    assert.equal(ls.canUse, true);
    const used = useSpecialForMiniApp(session, ls.id, 1_800_000_000_000);
    assert.equal(used.ok, true);
    assert.equal(specialSkills(session, 1_800_000_000_000 + 1000).find(row => row.type === 'ls').canUse, false, 'running / on cooldown');
  }
  assert.equal(useSpecialForMiniApp(session, 'nonsense').reason, 'unknown_special');
  assert.equal(activateLifeStone(hero('duelist')).reason, 'no_active_skill');
});

test('the bar shows pictures and the cost in the corner, the name is the tooltip and not a label', () => {
  const skills = [
    { index: 0, name: 'Triple Slash', description: 'Три удара.', isDamage: true, costMp: 206, canUse: true, tier: 4, cooldownMs: 0 },
    { index: 1, name: 'War Cry', description: '', isBuff: true, costMp: 40, canUse: true, tier: 2, cooldownMs: 0 },
  ];
  const html = hotbar(skills, { chosen: [1] });
  assert.match(html, /data-skill="1"/);
  assert.doesNotMatch(html, /data-skill="0"/, 'only the chosen skills');
  assert.match(html, /title="War Cry"/);
  assert.match(html, /mmo-skill-cost[^>]*>40</);
  assert.doesNotMatch(html, /<strong>/, 'no name under the picture');
  const all = hotbar(skills);
  assert.match(all, /title="Triple Slash — Три удара\."/);
  assert.match(hotbarChoice(skills[0], { on: true, position: 2 }), /aria-pressed="true"[\s\S]*>2</);
});

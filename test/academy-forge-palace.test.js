import test from 'node:test';
import assert from 'node:assert/strict';
import {getAcademyState, claimBounty, recordAcademyEvent, bountyQuality, bountyReward, startPassQuest, claimPass, hasEpicPass, consumeEpicPass, passTarget, passFee} from '../functions/game/academy/academy.js';
import {forgeBonuses, FORGE_MAX, reduceNeeds} from '../functions/game/builds/forgeBonuses.js';
import {inventoryCapacity, warehouseCapacity, inventorySlotsUsed, hasInventoryRoom} from '../functions/game/builds/palaceCapacity.js';
import {enchantChance} from '../functions/game/equipment/enchantItem.js';
import {enchantExtras, itemExtras, masterworkProfile} from '../functions/game/equipment/itemBonuses.js';

const hero = (builds = {}, extra = {}) => ({
    userId: 7,
    game: {stats: {lvl: 50}, builds, inventory: {gold: 10_000_000, materials: {}, equipment: {items: []}, potions: {items: []}}, ...extra},
});

test('forge bonuses grow evenly to the stated totals at level 30', () => {
    const none = forgeBonuses(hero({forge: {currentLvl: 1}}));
    assert.equal(none.craft, 0);
    assert.equal(none.saveShare, 0);
    const top = forgeBonuses(hero({forge: {currentLvl: 30}}));
    assert.equal(top.craft, FORGE_MAX.craft);
    assert.equal(top.enchant, 0.08);
    assert.equal(top.masterwork, 0.05);
    assert.equal(top.doubleCraft, 0.05);
    assert.equal(top.crystals, 0.1);
    assert.equal(top.saveChance, 0.15);
    assert.ok(Math.abs(top.saveShare - 0.4) < 1e-9);
    const first = forgeBonuses(hero({forge: {currentLvl: 2}}));
    assert.ok(Math.abs(first.saveShare - (0.05 + 0.35 / 29)) < 1e-9);
    assert.deepEqual(reduceNeeds({a: 10, b: 1}, 0.4), {a: 6, b: 1});
});

test('the forge raises the risky enchant roll but not the safe levels', () => {
    const risky = {grade: 'D', mainType: 'weapon', enchant: 10, category: 'sword'};
    const base = enchantChance(risky);
    assert.ok(enchantChance(risky, hero({forge: {currentLvl: 30}})) - base > 0.0799);
    assert.equal(enchantChance({grade: 'D', mainType: 'weapon', enchant: 0}, hero({forge: {currentLvl: 30}})), 1);
});

test('a masterwork item improves its own stats by an amount that is fixed per item', () => {
    const a = {id: 'sword-a', mainType: 'weapon', characteristics: {power: 100, accuracy: 10}};
    const b = {id: 'sword-b', mainType: 'weapon', characteristics: {power: 100, accuracy: 10}};
    assert.deepEqual(itemExtras(a), {}, 'an ordinary item has no extras');
    assert.equal(enchantExtras({...a, masterwork: true}).power, undefined);
    const mwA = itemExtras({...a, masterwork: true});
    const profile = masterworkProfile(a);
    assert.ok(Math.abs(mwA.power - 100 * profile.main) < 1e-9);
    assert.ok(profile.main >= 0.06 && profile.main <= 0.14);
    assert.ok(mwA[profile.extra.stat] >= profile.extra.value);
    assert.deepEqual(itemExtras({...a, masterwork: true}), mwA, 'stable for the same item');
    assert.notDeepEqual(masterworkProfile(a), masterworkProfile(b), 'items have different bonuses');
});

test('palace level sets inventory (80..250) and warehouse (60..500) size', () => {
    assert.equal(inventoryCapacity(hero({palace: {currentLvl: 1}})), 80);
    assert.equal(inventoryCapacity(hero({palace: {currentLvl: 30}})), 250);
    assert.equal(warehouseCapacity(hero({palace: {currentLvl: 1}})), 60);
    assert.equal(warehouseCapacity(hero({palace: {currentLvl: 30}})), 500);
    const full = hero({palace: {currentLvl: 1}});
    full.game.inventory.equipment.items = Array.from({length: 80}, (_, index) => ({uid: String(index)}));
    assert.equal(inventorySlotsUsed(full.game.inventory), 80);
    assert.equal(hasInventoryRoom(full), false);
});

test('academy orders grow with the building level and are paid once', () => {
    const low = hero({academy: {currentLvl: 1}});
    const high = hero({academy: {currentLvl: 30}});
    assert.equal(bountyQuality(low), 1);
    assert.equal(bountyQuality(high), 5);
    assert.ok(bountyReward('day', 5, 50).gold > bountyReward('day', 1, 50).gold);
    const now = Date.UTC(2026, 9, 10, 12);
    const state = getAcademyState(low, now);
    assert.equal(state.bounties.day.quests.length, 3);
    assert.equal(state.bounties.week.quests.length, 2);
    const quest = state.bounties.day.quests[0];
    assert.equal(claimBounty(low, 'day', quest.id, now).reason, 'bounty_not_done');
    const eventOf = {mobKills: 'mob_kill', bossKills: 'boss_kill', crafts: 'craft', enchants: 'enchant'}[quest.kind];
    recordAcademyEvent(low, eventOf, {count: quest.target, now});
    const gold = low.game.inventory.gold;
    const paid = claimBounty(low, 'day', quest.id, now);
    assert.equal(paid.ok, true);
    assert.equal(low.game.inventory.gold, gold + paid.reward.gold);
    assert.equal(claimBounty(low, 'day', quest.id, now).reason, 'already_claimed');
});

test('an epic pass is earned by killing bosses and spent on the summon', () => {
    const player = hero({academy: {currentLvl: 1}});
    player.game.stats.lvl = 85;
    const name = 'queenAnt';
    assert.ok(passTarget(name) > 0);
    assert.equal(startPassQuest(player, name).ok, true);
    assert.equal(claimPass(player, name).reason, 'quest_not_complete');
    for (let kill = 0; kill < passTarget(name); kill++) recordAcademyEvent(player, 'boss_kill', {boss: {epic: false}});
    const gold = player.game.inventory.gold;
    assert.equal(claimPass(player, name).ok, true);
    assert.equal(player.game.inventory.gold, gold - passFee(name));
    assert.equal(hasEpicPass(player, name), true);
    assert.equal(consumeEpicPass(player, name), true);
    assert.equal(hasEpicPass(player, name), false);
});

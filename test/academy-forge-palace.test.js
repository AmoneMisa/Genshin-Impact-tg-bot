import test from 'node:test';
import assert from 'node:assert/strict';
import {getAcademyState, claimBounty, recordAcademyEvent, bountyQuality, bountyReward, startPassQuest, talkPassQuest, advancePassQuest, hasEpicPass, consumeEpicPass, grantEpicPass} from '../functions/game/academy/academy.js';
import {needsPass, partyNeeded} from '../template/epicPasses.js';
import {forgeBonuses, FORGE_MAX, reduceNeeds} from '../functions/game/builds/forgeBonuses.js';
import {inventoryCapacity, warehouseCapacity, inventorySlotsUsed, hasInventoryRoom} from '../functions/game/builds/palaceCapacity.js';
import {enchantChance} from '../functions/game/equipment/enchantItem.js';
import {enchantExtras, itemExtras, masterworkProfile, isMasterworkClass, masterworkName} from '../functions/game/equipment/itemBonuses.js';

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

test('masterwork follows the l2j list: its own stats, fixed per item, with a yellow-name postfix', () => {
    const ring = {id: 'ring', name: 'Majestic Ring', mainType: 'jewelry', characteristics: {defence: 10, maxMpMul: 1.1}};
    assert.equal(isMasterworkClass(ring), true);
    assert.equal(isMasterworkClass({name: 'Long Sword'}), false);
    assert.deepEqual(itemExtras(ring), {}, 'an ordinary copy has no extras');
    const mw = {...ring, masterwork: true};
    const extras = itemExtras(mw);
    // the l2j entry of the Majestic Ring names Max MP
    assert.ok(extras.maxMpMul > 0, 'the named stat is improved');
    assert.equal(extras.defence, undefined, 'a stat the entry does not name is left alone');
    assert.deepEqual(itemExtras(mw), extras, 'stable for the same item');
    assert.equal(masterworkName(mw), 'Majestic Ring - MW');
    assert.equal(masterworkName(ring), 'Majestic Ring');
    const other = {...mw, id: 'ring2', name: 'Avadon Breastplate', mainType: 'armor', characteristics: {defence: 100, maxHpMul: 1.1}};
    assert.notDeepEqual(masterworkProfile(mw), masterworkProfile(other), 'items have different bonuses');
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

test('an epic pass is earned by a quest of dialogs, farming and drops, bound to the hero', () => {
    const player = hero({academy: {currentLvl: 1}});
    player.game.stats.lvl = 85;
    const name = 'baium';
    assert.equal(needsPass(name), true);
    assert.equal(needsPass('zaken'), false);
    assert.equal(partyNeeded('zaken'), 2);
    assert.equal(partyNeeded('orfen'), 0);
    assert.equal(startPassQuest(player, name).ok, true);
    let guard = 0;
    while (player.game.academy.passQuests[name] && guard++ < 20) {
        const view = getAcademyState(player).passes.find(pass => pass.name === name);
        const step = view.step;
        if (step.type === 'talk') {
            const talked = talkPassQuest(player, name);
            assert.equal(talked.ok, true);
            assert.ok(talked.lines.length > 0);
            continue;
        }
        // the step does not move on the wrong events
        assert.equal(advancePassQuest(player, name).reason, 'quest_not_complete');
        for (let n = 0; n < 400 && !getAcademyState(player).passes.find(pass => pass.name === name).step.done; n++) {
            recordAcademyEvent(player, 'mob_kill', {mob: {level: 20}, random: () => 0});
            recordAcademyEvent(player, 'mob_kill', {mob: {level: 80}, random: () => 0});
            recordAcademyEvent(player, 'boss_kill', {boss: {epic: false}});
        }
        assert.equal(advancePassQuest(player, name).ok, true);
    }
    assert.equal(hasEpicPass(player, name), true);
    assert.equal(grantEpicPass(player, name), false, 'one pass at a time');
    // it is not an item: nothing in the stocks that trade, mail, warehouse and auction move carries it
    assert.equal(JSON.stringify(player.game.inventory).includes(name), false);
    assert.equal(consumeEpicPass(player, name), true);
    assert.equal(hasEpicPass(player, name), false);
    assert.equal(grantEpicPass(player, name), true, 'a bought pass');
});

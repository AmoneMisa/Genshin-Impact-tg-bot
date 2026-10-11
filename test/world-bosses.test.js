import test from 'node:test';
import assert from 'node:assert/strict';
import bossTemplates from '../template/bossTemplate.js';
import {worldTemplates, worldScopeId, scopeOfName, LEVEL_GAP, dropsOf, eggOf, worldRows} from '../functions/game/boss/worldBosses.js';
import {worldBossList, epicEgg, getEpicTemplate} from '../functions/game/boss/epicBosses.js';
import {getBossAttacks} from '../template/bossAttacksTemplate.js';
import {isClanScope} from '../functions/game/clans/clanScope.js';
import {claimBounty, TOKEN_CHANCE} from '../functions/game/academy/academy.js';
import {getMaterialCount} from '../functions/game/player/materials.js';
import isPlayerCanUseSkill from '../functions/game/player/isPlayerCanUseSkill.js';
import {materialInfo} from '../functions/game/player/materials.js';

test('every raid boss of the data is a world boss with a level range, a location, its own drop and skills', () => {
    const raids = bossTemplates.filter(boss => boss.world?.raid);
    assert.ok(raids.length > 200);
    assert.equal(new Set(raids.map(boss => boss.name)).size, raids.length);
    for (const boss of raids) {
        assert.ok(boss.epic.minLevel <= boss.world.level && boss.world.level <= boss.epic.maxLevel, boss.name);
        assert.ok(boss.world.location.length > 3 && boss.world.hp > 0, boss.name);
        assert.ok(boss.drops.items.length >= 2, boss.name);
        assert.ok(getBossAttacks(boss.name).some(attack => attack.target === 'single'), boss.name);
    }
});

test('the epics keep their game rules and get the real level, range and drop', () => {
    const valakas = getEpicTemplate('valakas');
    assert.equal(valakas.world.level, 85);
    assert.equal(valakas.epic.minLevel, 85 - LEVEL_GAP);
    assert.equal(valakas.epic.maxLevel, 85 + LEVEL_GAP);
    assert.ok(valakas.drops.items.some(item => item.item.startsWith('l2_')), 'real drop list');
    assert.ok(valakas.drops.items.some(item => item.item === 'essence_valakas'), 'own drops stay');
    assert.ok(epicEgg('valakas'));
});

test('life stones for the farm and eggs for the clans come with the level', () => {
    const low = worldRows.find(row => row.level < 40), high = worldRows.find(row => row.level >= 78);
    assert.ok(dropsOf(low).items.some(item => item.item.startsWith('lifestone_')));
    assert.ok(dropsOf(high).items.some(item => /^lifestone_S/.test(item.item)));
    assert.equal(eggOf(30), null);
    assert.equal(eggOf(45).key, 'egg_wyvern');
    assert.equal(eggOf(65).key, 'egg_dragon');
    assert.equal(eggOf(80).key, 'egg_ancient');
    assert.ok(materialInfo(dropsOf(high).items.find(item => item.item.startsWith('l2_')).item).name);
});

test('world bosses have their own hidden chat, apart from the clan ones and without messages to Telegram', () => {
    const scope = worldScopeId(25102);
    assert.ok(scope < -5e12 && isClanScope(scope));
    assert.equal(scopeOfName('Shacram'), scope);
    assert.equal(scopeOfName('valakas') < 0, true);
    assert.equal(scopeOfName('no such boss'), null);
});

test('the list shows where a boss stands, its respawn and whether it is being fought', () => {
    const now = 1_800_000_000_000;
    const list = worldBossList({Shacram: {killedAt: now - 1000, respawnAt: now + 5000, kills: 2}}, {Shacram: 40}, now);
    const row = list.find(entry => entry.name === 'Shacram');
    assert.equal(row.level, 45);
    assert.equal(row.remainMs, 5000);
    assert.equal(row.available, false);
    assert.equal(row.fighting, true);
    assert.equal(row.hpPercent, 40);
    assert.ok(row.location.includes('Shacram'));
});

test('a petrified hero cannot use a skill; bounties give the clan boss sigil rarely', () => {
    const session = {game: {petrifiedUntil: Date.now() + 60_000, stats: {lvl: 50}, gameClass: {stats: {}}, effects: []}};
    assert.equal(isPlayerCanUseSkill(session, {needLvl: 1, effect: 'common_attack'}), 5);

    const hero = {game: {stats: {lvl: 10}, inventory: {materials: {}}, academy: {}}};
    const bounty = {game: {stats: {lvl: 10}, inventory: {materials: {}}}};
    assert.ok(TOKEN_CHANCE.daily > 0 && TOKEN_CHANCE.daily < 0.2 && TOKEN_CHANCE.weekly > TOKEN_CHANCE.daily);
    assert.ok(hero && bounty);
    assert.equal(getMaterialCount(hero, 'clan_boss_token'), 0);
});

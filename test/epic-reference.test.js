import test from 'node:test';
import assert from 'node:assert/strict';
import REFERENCE from '../template/l2EpicReference.js';
import WORLD from '../template/worldBosses.js';
import {EPIC_JEWELRY} from '../template/l2EpicJewelry.js';
import {EPIC_NPC, epicWeaponChance} from '../functions/game/boss/worldBosses.js';
import {getEpicTemplate, epicList, rollEpicWeapon} from '../functions/game/boss/epicBosses.js';
import {itemRow, lootInfo} from '../functions/game/hunt/lootTable.js';
import {findEpicItem} from '../functions/game/equipment/catalog.js';
import {l2RawStat,l2Resistance,l2StatBonus,equippedEpicEffects,removeL2Effects} from '../functions/game/player/l2Effects.js';

const equipped = (...names) => ({game:{gameClass:{stats:{name:'mage'}},equipmentStats:Object.fromEntries(names.map((name,index)=>[index,{...findEpicItem(name),isFilled:true}]))}});

test('all 13 requested variants retain their verified High Five base stats', () => {
    assert.equal(Object.keys(REFERENCE).length,13);
    for (const row of Object.values(REFERENCE)) {
        const stored=WORLD.find(npc=>npc.id===row.id);
        for (const [stat,value] of Object.entries(row.stats)) assert.equal(stored[stat],value,`${row.name}: ${stat}`);
    }
    assert.equal(EPIC_NPC[29047],'frintezza');
    assert.equal(getEpicTemplate('frintezza').world.hp,3842433);
});

test('epic jewel rolls match the source and do not also grant a material copy', () => {
    for (const [id,name] of Object.entries(EPIC_NPC)) {
        const row=REFERENCE[id],boss=getEpicTemplate(name);
        const jewel=row.drops.find(drop=>drop.id===row.jewelId);
        if (jewel) assert.equal(boss.epic.jewelChance,jewel.chance/100,name);
        assert.ok(!boss.drops.items.some(drop=>drop.item===`l2_${row.jewelId}`),name);
    }
    // Freya's outer weapon group is 30%; 4.55% inside it is 1.365% per kill.
    const freya=getEpicTemplate('freya');
    assert.equal(freya.drops.items.find(drop=>drop.item===lootInfo(15560).key).chance,0.01365);
});

test('custom RB weapons stay available and are rarer than every original weapon', () => {
    const listing=epicList({epicBosses:{}});
    for (const [id,name] of Object.entries(EPIC_NPC)) {
        const chance=epicWeaponChance(name);
        const original=REFERENCE[id].drops.filter(drop=>itemRow(drop.id)?.type==='Weapon');
        assert.ok(chance>0 && original.every(drop=>chance<drop.chance/100),name);
        assert.equal(listing.find(row=>row.name===name).weaponChance,chance);
    }
    const boss=getEpicTemplate('valakas');
    const fighter={id:1,damage:100,level:84,className:'noClass'};
    assert.ok(rollEpicWeapon(boss,[fighter],()=>0)?.item.epicWeapon);
    assert.equal(rollEpicWeapon(boss,[fighter],()=>epicWeaponChance('valakas')),null);
});

test('each catalog epic has the original grade, M.Def, MP, item ID and readable passives', () => {
    for (const name of Object.values(EPIC_NPC)) {
        const item=findEpicItem(name),original=EPIC_JEWELRY[item.lineage.itemId];
        assert.equal(item.grade,original.grade);
        assert.equal(item.lineage.mDef,original.mDef);
        assert.equal(item.characteristics.maxMp,original.maxMp);
        assert.ok(item.description.includes(`M.Def ${original.mDef}`));
    }
});

test('equipped epic passives affect stats, resistances and costs without stacking duplicates or using buff slots', () => {
    const freya=equipped('freyaExtreme');
    assert.equal(l2RawStat(freya,'waterRes'),15);
    assert.equal(l2RawStat(freya,'reflectDam'),4);
    assert.equal(l2RawStat(freya,'regMp'),0.46);
    assert.equal(l2Resistance(freya,'BLEED'),25);
    assert.equal(l2Resistance(freya,'PARALYZE'),20);
    assert.equal(l2RawStat(freya,'MEN'),2);
    assert.equal(l2RawStat(freya,'CON'),1);
    assert.equal(l2RawStat(freya,'STR'),-1);
    assert.equal(l2StatBonus(freya,'skillMpCostMul',true),0.95);
    assert.equal(l2StatBonus(freya,'skillCooltimeMul',true),0.95);
    assert.equal(l2StatBonus(freya,'healPowerMul',true),1.15);
    assert.equal(l2RawStat(freya,'maxMp'),0,'MP must not be counted twice');
    assert.equal(removeL2Effects(freya,{kind:'buff'}),0);
    assert.equal(l2RawStat(freya,'waterRes'),15);
    delete freya.game.equipmentStats[0];
    assert.equal(l2RawStat(freya,'waterRes'),0);
    const rings=equipped('queenAnt','queenAnt');
    assert.equal(equippedEpicEffects(rings).length,1);
    assert.equal(l2RawStat(rings,'critDmg',true),1.15);
    const valakas=equipped('valakas');
    assert.equal(l2RawStat(valakas,'maxHp'),445);
    assert.equal(l2RawStat(valakas,'mAtk',true),1.08);
    assert.equal(l2RawStat(equipped('antharas'),'absorbDam'),4);
});

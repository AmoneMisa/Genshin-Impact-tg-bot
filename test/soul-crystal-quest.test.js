import test from 'node:test';
import assert from 'node:assert/strict';
import {startSoulCrystalQuest,soulCrystalQuestState} from '../functions/game/equipment/soulCrystalQuest.js';
import {absorbHuntSoul,absorbRaidSouls,soulCrystalState} from '../functions/game/equipment/soulCrystals.js';
import {getAcademyState} from '../functions/game/academy/academy.js';
const hero=(level=47)=>({userId:1,game:{stats:{lvl:level},inventory:{gold:0,materials:{},equipment:{items:[]}},gameClass:{stats:{name:'humanMystic'}}}});

test('Academy quest requires level 40 and grants one starter only once',()=>{
    const low=hero(39);assert.equal(startSoulCrystalQuest(low).reason,'soul_level');assert.equal(soulCrystalQuestState(low).active,false);
    const s=hero();assert.equal(getAcademyState(s).soulQuest.canStart,true);assert.equal(startSoulCrystalQuest(s,'green',123).ok,true);
    assert.equal(s.game.inventory.materials.soul_green_0,1);assert.equal(getAcademyState(s).soulQuest.active,true);
    assert.equal(startSoulCrystalQuest(s,'red').reason,'already_active');assert.equal(s.game.inventory.materials.soul_red_0,undefined);
    assert.equal(soulCrystalQuestState(JSON.parse(JSON.stringify(s))).active,true);
});
test('automatic absorption requires an active quest and exactly one crystal, no manual charge',()=>{
    const s=hero();s.game.inventory.materials.soul_red_0=1;
    const killed=()=>({mobId:'20584',hp:100,currentHp:0});
    assert.equal(absorbHuntSoul(s,killed(),()=>0),null);
    startSoulCrystalQuest(s,'blue',123);assert.equal(s.game.inventory.materials.soul_blue_0,undefined);
    s.game.inventory.materials.soul_green_0=1;assert.equal(soulCrystalState(s).multiple,true);assert.equal(absorbHuntSoul(s,killed(),()=>0),null);
    delete s.game.inventory.materials.soul_green_0;s.game.inventory.materials.soul_red_0=2;assert.equal(absorbHuntSoul(s,killed(),()=>0),null);
    s.game.inventory.materials.soul_red_0=1;const mob=killed();assert.equal(absorbHuntSoul(s,mob,()=>0).stage,1);assert.equal(absorbHuntSoul(s,mob,()=>0),null);
});
test('no quest or several crystals also prevent raid progression',()=>{
    const s=hero(80);s.game.inventory.materials.soul_red_16=1;assert.deepEqual(absorbRaidSouls([s],'antharas',()=>0),[]);
    startSoulCrystalQuest(s,'red',123);s.game.inventory.materials.soul_blue_0=1;assert.deepEqual(absorbRaidSouls([s],'antharas',()=>0),[]);
    delete s.game.inventory.materials.soul_blue_0;assert.equal(absorbRaidSouls([s],'antharas',()=>0)[0].stage,17);
});

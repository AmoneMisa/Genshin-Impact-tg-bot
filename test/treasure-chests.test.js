import {treasureHero,memoryTreasureStore,NOW,slot} from './helpers/treasures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chestSlots,chestSpawn,chestLevelAllowed,unlockState,TREASURE_DATA as DATA} from '../functions/game/hunt/treasureRules.js';
import {hydrateTreasures,treasureAction,treasureDto} from '../miniapp/treasures.js';
import {moveHuntField} from '../functions/game/hunt/huntFight.js';
import {buyEntry,merchantStock} from '../functions/game/shop/merchants.js';
import {ITEM_ICONS} from '../webapp/art/l2-gameplay-icons.js';
test('source treasure territories, NPCs, drops and original icons are retained',()=>{
 assert.equal(DATA.groups.length,129);assert.equal(chestSlots.length,134);assert.equal(Object.keys(DATA.npcs).length,22);
 for(const g of DATA.groups)for(const t of g.territories){assert.ok(t.polygon.length>=3);if(t.gate){assert.equal(t.gate.sourcePosition,null);assert.equal(t.gate.geometry,'adapted');assert.ok(!/^(catacomb-|necropolis-)/.test(t.gate.zone));}}
 for(const key of ['l2_1661','l2_21746'])assert.ok(fs.existsSync('webapp/art/l2-extra/'+ITEM_ICONS[key]+'-32.webp'));
 assert.equal(chestLevelAllowed(77,83),true);assert.equal(chestLevelAllowed(78,84),false);assert.equal(chestLevelAllowed(78,83),true);
});
test('a purchased key casts for 500ms, grants no XP/SP, and only one of two simultaneous openers receives loot',async()=>{
 const a=treasureHero(),b=treasureHero(2),store=memoryTreasureStore(),start={chest:slot.id,method:'key'};
 assert.equal((await treasureAction(a,start,NOW,store)).until,NOW+500);assert.equal(a.game.inventory.materials.l2_21746,2);
 assert.equal((await treasureAction(b,start,NOW,store)).ok,true);
 await hydrateTreasures(a,NOW+499,store,()=>0);assert.equal(store.rows.get(slot.id).openedAt,0);
 await Promise.all([hydrateTreasures(a,NOW+500,store,()=>0),hydrateTreasures(b,NOW+500,store,()=>0)]);
 assert.equal([a,b].filter(s=>s.game.hunt.lastLoot).length,1);assert.equal(a.game.hunt.lastLoot.exp,0);assert.equal(a.game.hunt.lastLoot.sp,0);
 assert.equal(a.game.stats.currentExp,0);assert.equal(a.game.inventory.sp,1e6);assert.equal(a.game.l2CastAt[22271],NOW+8000);
 assert.ok(a.game.hunt.lastLoot.items.some(i=>/^scroll_/.test(i.item)));
 assert.equal((await treasureAction(a,start,NOW+501,store)).ok,false);
 const before=JSON.stringify(a.game.inventory);await hydrateTreasures(a,NOW+502,store,()=>0);assert.equal(JSON.stringify(a.game.inventory),before);
 assert.equal(store.rows.get(slot.id).respawnAt,NOW+500+7200000);
});
test('native Unlock learning, Thief Key cost, MP, reuse, class restrictions and movement cancellation are enforced',async()=>{
 const s=treasureHero(),store=memoryTreasureStore(),base={chest:slot.id};
 assert.equal(unlockState(s).next.sp,3400);assert.equal((await treasureAction(s,{...base,method:'unlock'},NOW,store)).reason,'chest_unlock_unavailable');
 const sp=s.game.inventory.sp;assert.equal((await treasureAction(s,{...base,method:'learn'},NOW,store)).ok,true);assert.equal(s.game.inventory.sp,sp-3400);
 const mp=s.game.gameClass.stats.mp;assert.equal((await treasureAction(s,{...base,method:'unlock'},NOW,store)).until,NOW+2500);
 assert.equal(s.game.inventory.materials.l2_1661,98);assert.equal(s.game.gameClass.stats.mp,mp-19);assert.equal(s.game.l2CastAt[27],NOW+30000);
 assert.equal(moveHuntField(s,{x:.5,y:.95},NOW+1).ok,true);assert.equal(s.game.hunt.field.treasureCast,undefined);
 await hydrateTreasures(s,NOW+2500,store,()=>0);assert.equal(store.rows.get(slot.id).openedAt,0);
 const other=treasureHero(2,'humanFighter');other.game.l2UtilitySkills={27:14};assert.equal(unlockState(other).eligible,false);
 assert.equal((await treasureAction(other,{...base,method:'unlock'},NOW,store)).reason,'chest_unlock_unavailable');
});
test('remote, missing key, wrong level and unavailable learning attempts do not spend resources',async()=>{
 const s=treasureHero(),store=memoryTreasureStore(),base={chest:slot.id,method:'key'};
 s.game.hunt.field.x=0;assert.equal((await treasureAction(s,base,NOW,store)).reason,'chest_too_far');
 Object.assign(s.game.hunt.field,chestSpawn(slot,0).gate.point);s.game.inventory.materials.l2_21746=0;
 assert.equal((await treasureAction(s,base,NOW,store)).reason,'chest_key_required');
 s.game.stats.lvl=1;assert.equal((await treasureAction(s,base,NOW,store)).reason,'chest_level');
 assert.equal(s.game.inventory.gold,1e6);assert.equal(s.game.inventory.sp,1e6);
});
test('save/load preserves an in-progress cast and the two-hour respawn cycles a global slot once',async()=>{
 let s=treasureHero();const store=memoryTreasureStore();await treasureAction(s,{chest:slot.id,method:'key'},NOW,store);
 s=JSON.parse(JSON.stringify(s));await hydrateTreasures(s,NOW+500,store,()=>0);assert.ok(s.game.hunt.lastLoot);
 await hydrateTreasures(s,NOW+500+7200000-1,store);assert.equal(store.rows.get(slot.id).cycle,0);
 await hydrateTreasures(s,NOW+500+7200000,store);assert.equal(store.rows.get(slot.id).cycle,1);
 await hydrateTreasures(s,NOW+501+7200000,store);assert.equal(store.rows.get(slot.id).cycle,1);
});
test('keys are sold in the common merchant grid at native source prices',()=>{
 const s=treasureHero(),stock=merchantStock().alchemist;
 for(const [id,price] of [[1661,1000],[21746,1800]]){
  const entry=stock.find(e=>e.id==='treasure-key:'+id);assert.equal(entry.cost.gold,price);
  const gold=s.game.inventory.gold,count=s.game.inventory.materials['l2_'+id];assert.equal(buyEntry(s,'alchemist',entry.id,1).ok,true);
  assert.equal(s.game.inventory.gold,gold-price);assert.equal(s.game.inventory.materials['l2_'+id],count+1);
 }
});

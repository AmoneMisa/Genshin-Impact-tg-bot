import test from 'node:test';
import assert from 'node:assert/strict';
import { createForgeState, makeForgeItem, forgeGear, forgeCombatStats, craftForgeItem, refineMasterwork, unsealForgeItem, unsealPreview, installSa, removeSa, installShoulder, exchangeSealStones, sealExchangePreview, farmCatacomb, equipForgeItem, fullHighGradeSet, addRaidReward, blessEpic, forgeItemStats, forgeItemInfo } from '../webapp/design/economy-model.js';

function blockedWithoutMutation(state,action){const before=structuredClone(state);assert.equal(action().ok,false);assert.deepEqual(state,before);}
function completeDynasty(state){refineMasterwork(state,'forge-1');unsealForgeItem(state,'forge-1');unsealForgeItem(state,'forge-2');equipForgeItem(state,'forge-1');equipForgeItem(state,'forge-2');}
test('cloak requires a matching full S80+ set, and breaking it removes the cloak without deleting it',()=>{
  const state=createForgeState(),cloak=addRaidReward(state,'cloakFreya').item;
  assert.deepEqual(unsealPreview(state,cloak.uid).cost,{gold:200000});
  blockedWithoutMutation(state,()=>equipForgeItem(state,cloak.uid));unsealForgeItem(state,cloak.uid);
  blockedWithoutMutation(state,()=>equipForgeItem(state,cloak.uid));completeDynasty(state);
  assert.equal(fullHighGradeSet(state),'dynasty');assert.equal(equipForgeItem(state,cloak.uid).ok,true);
  assert.equal(forgeCombatStats(state).waterResist,15);
  const result=equipForgeItem(state,'forge-1');assert.deepEqual(result.removedCloaks,[cloak.uid]);assert.equal(cloak.equipped,false);assert.equal(forgeGear(state,cloak.uid),cloak);
  assert.equal(forgeCombatStats(state).waterResist,undefined);
});
test('mixed sets, sealed parts, Foundation and low grades never open the cloak slot; a complete S84 set does',()=>{
  const state=createForgeState();completeDynasty(state);
  const boots=forgeGear(state,'forge-6');boots.templateId='elegiaBoots';assert.equal(fullHighGradeSet(state),null);
  boots.templateId='dynastyBoots';boots.sealed=true;assert.equal(fullHighGradeSet(state),null);
  boots.sealed=false;boots.quality='foundation';assert.equal(fullHighGradeSet(state),null);
  boots.quality='ordinary';forgeGear(state,'forge-1').templateId='arcanaGloves';assert.equal(fullHighGradeSet(state),null);
  state.gear=['elegia','elegiaHelmet','elegiaGloves','elegiaBoots'].map((id,i)=>makeForgeItem(id,`s84-${i}`,{sealed:false,equipped:true}));assert.equal(fullHighGradeSet(state),'elegia');
  const cloak=addRaidReward(state,'cloakZaken','soul').item;assert.equal(cloak.bound,true);assert.equal(cloak.sealed,false);assert.equal(equipForgeItem(state,cloak.uid).ok,true);
  // Defend the stat calculation against stale/corrupt equipment state too.
  state.gear[0].sealed=true;assert.equal(forgeCombatStats(state).darkResist,undefined);
});
test('Blessed epic consumes only the matching boss soul and adena and preserves item identity and enchant',()=>{
  const state=createForgeState(),item=addRaidReward(state,'freya').item;item.enchant=5;item.bound=true;
  const before=structuredClone(item),gold=state.gold,aa=state.aa;
  state.materials.soul_freya=0;blockedWithoutMutation(state,()=>blessEpic(state,item.uid));state.materials.soul_freya=1;
  equipForgeItem(state,item.uid);blockedWithoutMutation(state,()=>blessEpic(state,item.uid));equipForgeItem(state,item.uid);
  assert.equal(blessEpic(state,item.uid).ok,true);assert.equal(item.uid,before.uid);assert.equal(item.enchant,5);assert.equal(item.bound,true);
  assert.equal(state.materials.soul_freya,0);assert.equal(state.materials.soul_beleth,2);assert.equal(state.gold,gold-1000000);assert.equal(state.aa,aa);
  assert.equal(forgeItemStats(item).mDef,142);blockedWithoutMutation(state,()=>blessEpic(state,item.uid));
  blockedWithoutMutation(state,()=>blessEpic(state,'forge-0'));blockedWithoutMutation(state,()=>blessEpic(state,'missing'));
});
test('the preview can craft and unseal every piece of its S84 set before equipping a cloak',()=>{
  const state=createForgeState();
  for(const id of ['elegia','elegiaHelmet','elegiaGloves','elegiaBoots']){
    const result=craftForgeItem(state,id);assert.equal(result.ok,true);
    assert.equal(unsealForgeItem(state,result.item.uid).ok,true);assert.equal(equipForgeItem(state,result.item.uid).ok,true);
  }
  assert.equal(fullHighGradeSet(state),'elegia');const cloak=addRaidReward(state,'cloakFreya','soul').item;assert.equal(equipForgeItem(state,cloak.uid).ok,true);
});
test('Blessed replaces normal epic bonuses; Beleth is wearable and Zaken has its upgraded grade',()=>{
  const state=createForgeState(),item=addRaidReward(state,'freya').item;equipForgeItem(state,item.uid);
  const normal=forgeCombatStats(state);assert.equal(normal.maxMp,state.baseCombat.maxMp+50);assert.equal(normal.mpRegen,3.2);
  equipForgeItem(state,item.uid);blessEpic(state,item.uid);equipForgeItem(state,item.uid);
  const blessed=forgeCombatStats(state);assert.equal(blessed.maxMp,normal.maxMp);assert.equal(blessed.mpRegen,3.5);assert.equal(blessed.mDef,normal.mDef+18);
  const beleth=addRaidReward(state,'beleth').item;blessEpic(state,beleth.uid);equipForgeItem(state,beleth.uid);assert.equal(forgeCombatStats(state).maxHp,state.baseCombat.maxHp+160);
  const zaken=addRaidReward(state,'zaken').item;blessEpic(state,zaken.uid);assert.equal(forgeItemInfo(zaken).grade,'S84');
});
test('seal stones convert at 3/5/10 without consuming regular adena',()=>{
  const state=createForgeState(),before=structuredClone(state);const result=exchangeSealStones(state,{blue:100,green:50,red:20});
  assert.equal(result.aa,750);assert.equal(state.aa,before.aa+750);assert.equal(state.gold,before.gold);
  assert.equal(state.seals.blue,before.seals.blue-100);assert.equal(state.seals.green,before.seals.green-50);assert.equal(state.seals.red,before.seals.red-20);
});
test('exchange rejects fractions, negatives, unknown stones, empty exchange and unavailable quantities',()=>{
  const state=createForgeState();
  for(const counts of [{blue:1.5},{blue:-1},{blue:Infinity},{blue:30000},{blue:NaN},{purple:1},{}])blockedWithoutMutation(state,()=>exchangeSealStones(state,counts));
  assert.equal(sealExchangePreview(state,{blue:state.seals.blue,green:state.seals.green,red:state.seals.red}).aa,175000);
});
test('foundation craft, refinement and high-grade unsealing preserve identity and quality',()=>{
  const state=createForgeState(),start=structuredClone(state);const result=craftForgeItem(state,'dynastyGloves','foundation'),item=result.item;
  assert.equal(result.ok,true);assert.equal(item.sealed,true);assert.equal(item.quality,'foundation');assert.equal(state.gear.length,start.gear.length+1);
  blockedWithoutMutation(state,()=>equipForgeItem(state,item.uid));blockedWithoutMutation(state,()=>unsealForgeItem(state,item.uid));
  const uid=item.uid;assert.equal(refineMasterwork(state,uid).ok,true);assert.equal(item.quality,'masterwork');assert.equal(item.sealed,true);
  const aa=state.aa,gemS=state.materials.gemS,gold=state.gold;
  assert.equal(unsealForgeItem(state,uid).ok,true);assert.equal(item.uid,uid);assert.equal(item.quality,'masterwork');assert.equal(item.sealed,false);
  assert.equal(state.aa,aa);assert.equal(state.materials.gemS,gemS-8);assert.equal(state.gold,gold-180000);
  blockedWithoutMutation(state,()=>unsealForgeItem(state,uid));blockedWithoutMutation(state,()=>refineMasterwork(state,uid));
});
test('failed crafting consumes one attempt and produces no gear; 100 percent recipes cannot fail',()=>{
  const state=createForgeState(),before=structuredClone(state);const result=craftForgeItem(state,'dynasty','failure');
  assert.equal(result.failed,true);assert.equal(state.gear.length,before.gear.length);assert.equal(state.gold,before.gold-180000);assert.equal(state.materials.parts,before.materials.parts-30);
  blockedWithoutMutation(state,()=>craftForgeItem(state,'arcanaRing','failure'));
  blockedWithoutMutation(state,()=>craftForgeItem(state,'missing','ordinary'));
  blockedWithoutMutation(state,()=>craftForgeItem(state,'dynasty','unknown'));state.materials.parts=0;
  blockedWithoutMutation(state,()=>craftForgeItem(state,'dynasty','ordinary'));
});
test('A/S spend only AA; S80/S84 spend Gemstone S and normal adena',()=>{
  const state=createForgeState();const ring=forgeGear(state,'forge-3'),boots=forgeGear(state,'forge-4');
  assert.deepEqual(unsealPreview(state,ring.uid).cost,{aa:25000});assert.deepEqual(unsealPreview(state,boots.uid).cost,{gold:360000,materials:{gemS:16}});
  const gold=state.gold,stones=state.materials.gemS;assert.equal(unsealForgeItem(state,ring.uid).ok,true);assert.equal(state.gold,gold);assert.equal(state.materials.gemS,stones);
  state.aa=0;assert.equal(unsealForgeItem(state,boots.uid).ok,true);assert.equal(state.aa,0);
  const dynasty=forgeGear(state,'forge-2');state.materials.gemS=0;blockedWithoutMutation(state,()=>unsealForgeItem(state,dynasty.uid));
});
test('SA checks exact crystal color and stage, preserves enchant and does not refund crystals on removal',()=>{
  const state=createForgeState(),weapon=forgeGear(state,'forge-0');blockedWithoutMutation(state,()=>installSa(state,weapon.uid,'acumen'));
  equipForgeItem(state,weapon.uid);state.soulCrystals['red:13']=0;state.soulCrystals['red:14']=1;
  blockedWithoutMutation(state,()=>installSa(state,weapon.uid,'acumen'));
  state.soulCrystals['red:13']=1;weapon.quality='masterwork';
  assert.equal(installSa(state,weapon.uid,'acumen').ok,true);assert.equal(weapon.enchant,6);assert.equal(weapon.quality,'masterwork');assert.equal(state.soulCrystals['red:13'],0);
  blockedWithoutMutation(state,()=>installSa(state,weapon.uid,'mana'));assert.equal(removeSa(state,weapon.uid).ok,true);
  assert.equal(state.soulCrystals['red:13'],0);assert.equal(weapon.enchant,6);assert.equal(weapon.sa,null);
  blockedWithoutMutation(state,()=>installSa(state,'forge-3','acumen'));blockedWithoutMutation(state,()=>removeSa(state,'missing'));
});
test('shoulders require an unsealed dynasty body and class-compatible tier I before tier II',()=>{
  const state=createForgeState(),body=forgeGear(state,'forge-2');
  blockedWithoutMutation(state,()=>installShoulder(state,body.uid,'enchanter',1));unsealForgeItem(state,body.uid);
  blockedWithoutMutation(state,()=>installShoulder(state,body.uid,'healer',1));blockedWithoutMutation(state,()=>installShoulder(state,body.uid,'enchanter',2));
  blockedWithoutMutation(state,()=>installShoulder(state,'forge-3','enchanter',1));blockedWithoutMutation(state,()=>installShoulder(state,'missing','enchanter',1));
  body.enchant=5;body.quality='masterwork';const uid=body.uid;
  assert.equal(installShoulder(state,uid,'enchanter',1).ok,true);assert.equal(body.shoulder.tier,1);assert.equal(state.materials.essence1,2);
  assert.equal(installShoulder(state,uid,'enchanter',2).ok,true);assert.equal(body.shoulder.tier,2);assert.equal(state.materials.essence2,1);
  assert.equal(body.uid,uid);assert.equal(body.enchant,5);assert.equal(body.quality,'masterwork');
  blockedWithoutMutation(state,()=>installShoulder(state,uid,'enchanter',2));
});
test('catacomb victory consumes HP and energy, awards stones and can be exchanged',()=>{
  const state=createForgeState(),before=structuredClone(state);const result=farmCatacomb(state,'witch');
  assert.equal(result.ok,true);assert.equal(state.energy,10);assert.equal(state.hp,before.hp-140);assert.equal(state.seals.red,before.seals.red+60);
  assert.equal(exchangeSealStones(state,result.drops).aa,2200);
  state.energy=0;blockedWithoutMutation(state,()=>farmCatacomb(state,'witch'));
  state.energy=12;state.level=1;blockedWithoutMutation(state,()=>farmCatacomb(state,'witch'));
  state.level=84;state.hp=140;blockedWithoutMutation(state,()=>farmCatacomb(state,'witch'));
});
test('separate combat stats count only usable equipped items, SA and shoulder effects',()=>{
  const state=createForgeState(),before=forgeCombatStats(state);assert.equal(before.pAtk,411);assert.equal(before.mAtk,619);
  equipForgeItem(state,'forge-0');installSa(state,'forge-0','acumen');equipForgeItem(state,'forge-0');
  const saStats=forgeCombatStats(state);assert.equal(saStats.castingSpeed,747.5);assert.equal(saStats.pAtk,before.pAtk);
  unsealForgeItem(state,'forge-2');installShoulder(state,'forge-2','enchanter',1);equipForgeItem(state,'forge-2');
  assert.equal(forgeCombatStats(state).mAtk,saStats.mAtk,'shoulder bonuses require the full set');
  refineMasterwork(state,'forge-1');unsealForgeItem(state,'forge-1');equipForgeItem(state,'forge-1');
  const shoulders=forgeCombatStats(state);assert.ok(shoulders.mAtk>saStats.mAtk);assert.ok(shoulders.pDef>saStats.pDef);assert.equal(shoulders.pAtk,saStats.pAtk);
  state.family='priest';assert.equal(forgeCombatStats(state).mAtk,saStats.mAtk,'incompatible class disables installed shoulders');state.family='mage';
  state.gear.push(makeForgeItem('elegiaBoots','corrupt',{equipped:true,sealed:true,quality:'foundation'}));assert.deepEqual(forgeCombatStats(state),shoulders);
});
test('equipping another item in the same slot replaces the previous item without duplicating bonuses',()=>{
  const state=createForgeState();refineMasterwork(state,'forge-1');unsealForgeItem(state,'forge-1');equipForgeItem(state,'forge-1');
  const second=craftForgeItem(state,'arcanaGloves').item;unsealForgeItem(state,second.uid);equipForgeItem(state,second.uid);
  assert.equal(forgeGear(state,'forge-1').equipped,false);assert.equal(state.gear.filter(item=>item.equipped&&item.templateId.includes('Gloves')).length,1);
});

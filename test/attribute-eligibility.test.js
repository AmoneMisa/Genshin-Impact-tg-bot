import test from 'node:test';
import assert from 'node:assert/strict';
import {attributeEligibility,addAttribute,attributeInfo} from '../functions/game/equipment/attributes.js';
import {attributeItemAvailability} from '../webapp/forge.js';
const weapon=()=>({mainType:'weapon',grade:'S',custom:true});
const armor=()=>({mainType:'armor',category:'body',grade:'S',custom:true});
test('preview and server reject incompatible elements and caps without spending',()=>{
 const session={game:{inventory:{materials:{attr_stone_fire:10}}}};
 const cases=[[{...weapon(),attribute:{element:'water',value:20}},'wrong_element'],[{...weapon(),attribute:{element:'fire',value:150}},'attribute_tier_max'],[{...armor(),attributes:{fire:6}},'opposite_element'],[{...armor(),attributes:{wind:6,holy:6,dark:6}},'attribute_slots_full'],[{...weapon(),timed:true},'timed_item'],[{...weapon(),grade:'A'},'not_attributable']];
 for(const [item,reason] of cases){
  const before=structuredClone(item);assert.equal(attributeEligibility(item,'fire','stone').reason,reason);
  assert.equal(addAttribute(session,item,'fire','stone').reason,reason);assert.deepEqual(item,before);
  assert.equal(attributeItemAvailability({attribute:attributeInfo(session,item)},'attr_stone_fire').ok,false);
 }
 assert.equal(session.game.inventory.materials.attr_stone_fire,10);
});
test('armor uses the opposing defense and a stronger crystal remains usable above stone cap',()=>{
 assert.equal(attributeEligibility({...armor(),attributes:{water:60}},'fire','stone').ok,false);
 assert.equal(attributeEligibility({...armor(),attributes:{water:60}},'fire','crystal').ok,true);
 assert.equal(attributeEligibility({...weapon(),attribute:{element:'fire',value:150}},'fire','crystal').ok,true);
 assert.equal(attributeEligibility({...armor(),attributes:{water:6,earth:6,holy:6}},'fire','stone').ok,true);
});

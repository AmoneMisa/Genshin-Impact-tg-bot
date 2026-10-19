import assert from 'node:assert/strict';
import {chestSlots,chestSpawn,TREASURE_DATA as DATA} from '../../functions/game/hunt/treasureRules.js';
import {enterHuntField} from '../../functions/game/hunt/huntFight.js';
import {ensureWorld} from '../../functions/game/world/world.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
export const NOW=1800000000000;
export const slot=chestSlots.find(s=>chestSpawn(s,0).gate&&DATA.npcs[chestSpawn(s,0).npc.id].level>=72);
export function treasureHero(userId=1,name='adventurer'){
 const spawn=chestSpawn(slot,0),s={userId,game:{stats:{lvl:DATA.npcs[spawn.npc.id].level,currentExp:0},inventory:{gold:1e6,sp:1e6,materials:{l2_1661:100,l2_21746:3},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 change(s,name);update(s);ensureWorld(s,NOW);assert.equal(enterHuntField(s,spawn.gate.zone,{now:NOW,floor:spawn.gate.floor}).ok,true);
 Object.assign(s.game.world,{mode:'location',location:spawn.gate.zone});Object.assign(s.game.hunt.field,{room:spawn.gate.room,...spawn.gate.point,seenAt:NOW});
 s.game.hunt.field.mobs.forEach(m=>Object.assign(m,{aggressive:false,aggro:false}));return s;
}
export function memoryTreasureStore(){
 const rows=new Map();const matches=(r,q)=>Object.entries(q).every(([k,v])=>typeof v==='object'?('$gt'in v?r[k]>v.$gt:'$lte'in v?r[k]<=v.$lte:v.$in.includes(r[k])):r[k]===v);
 return {rows,find:q=>({lean:async()=>[...rows.values()].filter(r=>matches(r,q)).map(r=>structuredClone(r))}),
  bulkWrite:async ops=>{for(const {updateOne:o} of ops)if(!rows.has(o.filter._id))rows.set(o.filter._id,{_id:o.filter._id,...o.update.$setOnInsert});},
  findOneAndUpdate:async(q,update)=>{const r=rows.get(q._id);if(!r||!matches(r,q))return null;Object.assign(r,update.$set||{});for(const [k,v] of Object.entries(update.$inc||{}))r[k]+=v;return structuredClone(r);}};
}

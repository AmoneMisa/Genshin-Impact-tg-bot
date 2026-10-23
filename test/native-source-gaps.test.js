import test from 'node:test';
import assert from 'node:assert/strict';
import policy from '../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {enterHuntField,ensureHunt} from '../functions/game/hunt/huntFight.js';
import {nativeSourceGap,activateNativeField,nativeFieldBuckets} from '../functions/game/world/nativeFieldSpace.js';
import {populationSlots} from '../functions/game/hunt/sourcePopulation.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
for(const [zone,meta]of Object.entries(policy.fields).filter(([,f])=>f.sourceGaps?.length))test(`${zone}: documented source gaps cannot become substitute NPCs`,()=>{
 for(const room of LOCATION_LEVELS[zone].floors[0].rooms)for(const slot of populationSlots(room)){
  const gap=nativeSourceGap(zone,slot);if(!gap)continue;
  const source=gap.kind==='point'?gap.source:{x:slot.polygon[0][0],y:slot.polygon[0][1],z:Math.trunc((slot.minZ+slot.maxZ)/2)},ground=worldGeodata.point(source);assert.ok(ground);
  const s={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'location',location:zone,city:meta.city}}};
  change(s,'humanFighter');update(s);assert.equal(enterHuntField(s,zone,{now:NOW,random:()=>.5}).ok,true);
  // Trusted observation fixture, not an authorized movement into water/holdings.
  activateNativeField(s.game.hunt,ground,NOW);ensureHunt(s,NOW,()=>.5);
  const f=s.game.hunt.field,key=room.id+':'+slot.slot;
  assert.equal(f.native.missing[key],'source_ground_unavailable');
  assert.equal(nativeFieldBuckets(f).flatMap(b=>b.mobs||[]).some(m=>m.sourceRoom===room.id&&m.sourceSlot===slot.slot),false);
  const saved=JSON.parse(JSON.stringify(s));ensureHunt(saved,NOW+1,()=>.9);assert.equal(saved.game.hunt.field.native.missing[key],'source_ground_unavailable');
  assert.equal(nativeFieldBuckets(saved.game.hunt.field).flatMap(b=>b.mobs||[]).some(m=>m.sourceRoom===room.id&&m.sourceSlot===slot.slot),false);
 }
});

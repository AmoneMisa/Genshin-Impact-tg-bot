import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_EXTENSION} from '../template/worldExtension.js';
import {getZones,getZone} from '../functions/game/hunt/huntMobs.js';
import {roomLayout} from '../functions/game/hunt/huntRooms.js';
import {continuousField,fieldStream} from '../functions/game/world/continuousField.js';
import {enterHuntField,moveHuntField,advanceHunt} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

const NOW=1800000000000;
const outdoor=WORLD_EXTENSION.filter(r=>r.zone.kind==='field'&&r.levels.floors.length===1);
function quiet(field){
 for(const m of [field,...Object.values(field.rooms||{})].flatMap(r=>r.mobs||[]))Object.assign(m,{aggressive:false,aggro:false,aggroRange:0,nextAttackAt:NOW+1e12});
}
for(const row of outdoor)test(`${row.zone.id}: continuous terrain preserves source actors and saved walking`,async()=>{
 const id=row.zone.id,zone=getZone(id),layout=roomLayout(zone),source=JSON.stringify(row);
 assert.equal(row.levels.source.coordinateSpace,'surface');
 assert.equal(row.levels.source.geodataAvailable,false);
 assert.ok(continuousField(zone,layout));
 const session={userId:1,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(session,'humanFighter');updateStats(session);
 assert.ok(enterHuntField(session,id,{now:NOW,random:()=>.5}).ok);
 session.game.world={mode:'location',location:id};
 const field=session.game.hunt.field;let now=NOW;
 // Silent Valley's source groups leave its entrance and first neighbours empty.
 if(id==='silent-valley'){
  quiet(field);assert.ok(moveHuntField(session,'room:r1c0',now).ok);
  now+=30000;advanceHunt(session,now,()=>.5);quiet(field);
 }
 const current=layout.rooms.find(r=>r.id===field.room);
 assert.ok(layout.rooms.some(r=>r.row===current.row&&r.col===current.col+1));
 Object.assign(field,{x:.96,y:.7});quiet(field);
 const dto=(await getHuntState(session,now)).field;
 assert.equal(dto.continuous.space,id);assert.ok(dto.continuous.tiles.length<=9);
 quiet(field);
 const actor=[field,...Object.values(field.rooms)].flatMap(r=>r.mobs||[])[0];assert.ok(actor);actor.currentHp=1;
 const original={id:actor.instanceId,position:actor.sourcePosition,territory:actor.sourceTerritory,slot:actor.sourceSlot,room:actor.sourceRoom};
 const oldRoom=field.room;
 assert.ok(moveHuntField(session,{x:1.04,y:.7},now).ok);
 const saved=JSON.parse(JSON.stringify(session));quiet(saved.game.hunt.field);
 advanceHunt(saved,now+30000,()=>.5);quiet(saved.game.hunt.field);
 const next=saved.game.hunt.field;
 assert.equal(next.room,layout.rooms.find(r=>r.row===current.row&&r.col===current.col+1).id);
 const resident=[next,...Object.values(next.rooms)].flatMap(r=>r.mobs||[]).find(m=>m.instanceId===original.id);
 assert.ok(next.rooms[oldRoom]);
 assert.equal(resident.currentHp,1);
 assert.deepEqual({id:resident.instanceId,position:resident.sourcePosition,territory:resident.sourceTerritory,slot:resident.sourceSlot,room:resident.sourceRoom},original);
 const banks=JSON.stringify(next.rooms);
 await getHuntState(saved,now+30000);assert.equal(JSON.stringify(next.rooms),banks);
 assert.equal(saved.game.hunt.kills,0);
 assert.equal(JSON.stringify(row),source,'rendering and travel never rewrite source geometry or statistics');
});

test('every outdoor catalogue zone streams; floors, caves, ships and instances remain isolated',()=>{
 assert.equal(outdoor.length,11);
 const zones=getZones().filter(z=>!z.instance),streamed=zones.filter(z=>continuousField(z,roomLayout(z)));
 assert.equal(streamed.length,39);
 assert.equal(zones.filter(z=>z.kind!=='catacomb'&&z.floors===1).length,streamed.length);
 for(const z of getZones()){
  const layout=roomLayout(z);
  if(continuousField(z,layout))for(const r of layout.rooms){
   const tiles=fieldStream(z,layout,r).tiles;
   assert.ok(tiles.length<=9);
   assert.equal(new Set(tiles.map(t=>`${t.dx}:${t.dy}`)).size,tiles.length);
   assert.ok(tiles.every(t=>Math.abs(t.dx)<=1&&Math.abs(t.dy)<=1));
  }
  else assert.equal(fieldStream(z,layout,layout.rooms[0]),null,z.id);
 }
});

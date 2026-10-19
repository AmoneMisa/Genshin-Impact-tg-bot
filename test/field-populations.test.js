import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {FIELD_POPULATIONS} from '../template/fieldPopulations.js';
import {LOCATIONS} from '../template/worldMap.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {roomLayout,adjacent} from '../functions/game/hunt/huntRooms.js';
import {enterHuntField,ensureHunt,advanceHunt} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';
import {visibleFieldMobs} from '../webapp/hunt-visible-actors.js';
import {roomSceneUrl} from '../webapp/room-scene-art.js';
import {lootRows} from '../functions/game/hunt/lootTable.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(id,targetMobId=null){
 const s={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);assert.ok(enterHuntField(s,id,{now:NOW,random:()=>.5,targetMobId}).ok);return s;
}
for(const [id,data] of Object.entries(FIELD_POPULATIONS))test(`${id}: original slots, bounded room rendering and persistent source respawn`,async()=>{
 const zone=getZone(id),floor=data.floors[0],layout=roomLayout(zone),entrance=hero(id);
 assert.equal(entrance.game.hunt.field.mobs.length,floor.rooms.find(r=>r.id===layout.startId).cap);
 const s=hero(id,data.mobs[0].id),f=s.game.hunt.field,room=floor.rooms.find(r=>r.id===f.room);
 assert.equal(data.source.geodataAvailable,false);
 assert.equal(zone.min,Math.min(...data.mobs.map(m=>m.level)));
 assert.equal(zone.max,Math.max(...data.mobs.map(m=>m.level)));
 assert.equal(LOCATIONS.find(l=>l.id===id).levelMax,zone.max);
 assert.equal(layout.rooms.length,12);
 const reached=new Set([layout.startId]);let before=-1;
 while(before!==reached.size){before=reached.size;for(const r of layout.rooms)if(layout.rooms.some(a=>reached.has(a.id)&&adjacent(a,r)))reached.add(r.id);}
 assert.equal(reached.size,layout.rooms.length);
 assert.equal(f.mobs.length,room.cap);
 for(const room of layout.rooms){
  assert.equal(room.cap,room.spawns.reduce((n,r)=>n+r.count,0));
  for(const spawn of room.spawns){assert.ok(spawn.sourceFile);assert.ok(spawn.respawnMs>=0);assert.ok(zone.mobs.some(m=>m.id===spawn.id));}
 }
 for(const mob of f.mobs){assert.ok(mob.sourcePosition||mob.sourceTerritory);assert.equal(mob.aiDataMissing,false);}
 for(const def of zone.mobs)assert.ok(Array.isArray(lootRows(def.id)));
 const current=f.mobs[0];assert.ok(current,'entrance contains source population');
 current.currentHp=Math.max(1,current.hp-1);
 f.respawns.push({at:NOW+60000,room:f.room,sourceSlot:current.sourceSlot});f.mobs.shift();
 s.game.hunt.mob=null;f.target=null;
 const restored=JSON.parse(JSON.stringify(s));ensureHunt(restored);
 restored.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;m.nextAttackAt=NOW+1e9;});
 advanceHunt(restored,NOW+60001,()=>.5);
 assert.equal(restored.game.hunt.field.mobs.length,room.cap);
 const fresh=restored.game.hunt.field.mobs.at(-1);assert.equal(fresh.mobId,current.mobId);assert.equal(fresh.sourceRespawnMs,current.sourceRespawnMs);
 const dto=await getHuntState(restored,NOW+60001);assert.ok(visibleFieldMobs(dto.field).length<=24);
 for(const compact of [false,true])assert.ok(fs.statSync('webapp'+roomSceneUrl(floor.environment,{compact,sceneKey:dto.field.sceneKey})).size<(compact?180000:800000));
 const sourceRoot=fs.existsSync('.tmp/world-source/h5-data')?fs.readdirSync('.tmp/world-source/h5-data',{withFileTypes:true}).find(d=>d.isDirectory()):null;
 if(sourceRoot){
  const base='.tmp/world-source/h5-data/'+sourceRoot.name+'/L2J_Mobius_CT_2.6_HighFive/dist/game/data/';
  for(const [path,hash] of Object.entries(data.source.files))if(fs.existsSync(base+path))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+path)).digest('hex'),hash);
 }
});

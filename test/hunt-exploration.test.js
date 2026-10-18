import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HUNT_EXPLORATION,explorationSection} from '../template/huntExploration.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {roomLayout,adjacent} from '../functions/game/hunt/huntRooms.js';
import {findPath,insideObstacle} from '../functions/game/world/navigation.js';
import {enterHuntField,moveHuntField,advanceHunt,ensureHunt} from '../functions/game/hunt/huntFight.js';
import {getHuntState} from '../miniapp/hunt.js';
import {roomSceneUrl} from '../webapp/room-scene-art.js';
import {clampRoomCamera,isoSceneBounds} from '../webapp/hunt-isometric.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

const NOW=Date.now();
function fixture(id){
 const s={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);assert.ok(enterHuntField(s,id,{now:NOW,random:()=>.5}).ok);return s;
}
function quiet(field){field.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;m.nextAttackAt=NOW+1e6;});}
function walk(s,id,now){
 quiet(s.game.hunt.field);assert.ok(moveHuntField(s,'room:'+id,now).ok);
 assert.notEqual(s.game.hunt.field.room,id,'room transitions require walking to the exit');
 advanceHunt(s,now+20000,()=>.5);assert.equal(s.game.hunt.field.room,id);
}
test('thirty-six painted zones have reachable adapted sections and preserve dungeon networks',()=>{
 assert.equal(HUNT_EXPLORATION.length,36);
 for(const {id} of HUNT_EXPLORATION){
  const zone=getZone(id),layout=roomLayout(zone);assert.ok(zone);assert.ok(layout.map);
  assert.equal(layout.rooms.length,zone.kind==='catacomb'?12:3);
  const reached=new Set([layout.startId]);let previous=0;
  while(previous!==reached.size){previous=reached.size;for(const room of layout.rooms)if(layout.rooms.some(r=>reached.has(r.id)&&adjacent(r,room)))reached.add(room.id);}
  assert.equal(reached.size,layout.rooms.length);
  assert.equal(new Set(layout.rooms.map(r=>r.sceneVariant)).size,3);
  for(const room of layout.rooms){
   assert.equal(room.layoutSource,'adapted');assert.ok(room.landmark);
   for(const neighbour of layout.rooms.filter(r=>adjacent(room,r))){
    const door={x:neighbour.col>room.col?.95:neighbour.col<room.col?.05:.5,y:neighbour.row>room.row?.95:neighbour.row<room.row?.05:.5};
    assert.equal(insideObstacle(door,room.walls),false);assert.ok(findPath({x:.5,y:.5},door,room.walls)?.length,id+'/'+room.id);
   }
  }
 }
 assert.equal(explorationSection('unknown','r0c0'),null);
 assert.equal(explorationSection('hot-springs','../../bad'),null);
});
test('a fork is explored by walking; revisits preserve monsters and fog, and reject a diagonal shortcut',async()=>{
 const s=fixture('plains-of-dion'),field=s.game.hunt.field;quiet(field);
 const original=field.mobs.map(m=>m.instanceId);field.mobs[0].currentHp-=1;
 const hp=field.mobs[0].currentHp;
 let dto=await getHuntState(s,NOW);
 assert.equal(dto.field.exits.length,2);assert.ok(dto.field.map.rooms.filter(r=>!r.visited).every(r=>r.name===''&&r.mobs===null));
 walk(s,'r0c1',NOW+1);dto=await getHuntState(s,NOW+20001);
 assert.match(dto.field.sceneKey,/:area-1$/);assert.equal(dto.field.exits.length,1);
 assert.equal(moveHuntField(s,'room:r1c0',NOW+20002).reason,'room_not_adjacent');
 walk(s,'r0c0',NOW+20003);assert.deepEqual(field.mobs.map(m=>m.instanceId),original);assert.equal(field.mobs[0].currentHp,hp);
 walk(s,'r1c0',NOW+40004);dto=await getHuntState(s,NOW+60004);assert.match(dto.field.sceneKey,/:area-2$/);
 assert.equal(dto.field.map.rooms.filter(r=>r.visited).length,3);
 const saved=JSON.parse(JSON.stringify(s));ensureHunt(saved);assert.equal(saved.game.hunt.field.room,'r1c0');assert.equal(saved.game.hunt.field.visited.length,3);
});
test('adjacent scenery URLs are distinct, bounded and cannot alter epic arenas',()=>{
 for(const {id} of HUNT_EXPLORATION)for(const compact of [false,true]){
  const urls=[0,1,2].map(n=>roomSceneUrl('woodland',{compact,sceneKey:id+':r0c'+n+(n?':area-'+n:'')}));
  assert.equal(new Set(urls).size,3);assert.match(urls[1],new RegExp(id+'-area-1'+(compact?'-mobile':'')+'-v'+(id==='plains-of-dion'?2:1)+'.webp$'));
 }
 assert.equal(roomSceneUrl('volcanic',{sceneKey:'valakas:r0c1:area-1'}),'/art/world/scenes/epic-valakas-v1.webp');
 assert.equal(roomSceneUrl('woodland',{sceneKey:'plains-of-dion:r0c1:area-999'}),'/art/world/scenes/plains-of-dion-v1.webp');
 assert.equal(roomSceneUrl('woodland',{sceneKey:'constructor:r0c1:area-1'}),'/art/world/scenes/woodland-v1.webp');
});
test('aggressive monsters follow through a new section without restoring health or duplicating',()=>{
 const s=fixture('plains-of-dion'),field=s.game.hunt.field;quiet(field);
 const pursuer=field.mobs[0];pursuer.currentHp-=1;pursuer.aggro=true;pursuer.aggressive=true;
 Object.assign(field,{x:.95,y:.5});Object.assign(pursuer,{x:.94,y:.5});
 assert.ok(moveHuntField(s,'room:r0c1',NOW+1).ok);advanceHunt(s,NOW+1000,()=>.5);
 assert.equal(field.room,'r0c1');const moved=field.mobs.filter(m=>m.instanceId===pursuer.instanceId);
 assert.equal(moved.length,1);assert.equal(moved[0].currentHp,pursuer.currentHp);assert.ok(moved[0].aggro);
 assert.equal(field.rooms.r0c0.mobs.some(m=>m.instanceId===pursuer.instanceId),false);
});
test('every new section ships both bounded image variants',()=>{
 for(const {id} of HUNT_EXPLORATION)for(const section of [1,2])for(const compact of [false,true]){
  const url=roomSceneUrl('woodland',{sceneKey:id+':r0c1:area-'+section,compact});
  assert.ok(fs.statSync(new URL('../webapp'+url,import.meta.url)).size<(compact?180000:800000),url);
 }
});
test('camera entry focus and dragging cannot uncover blank space past the scene',()=>{
 for(const viewport of [{width:320,height:730},{width:390,height:730},{width:1100,height:900}])for(const offset of [-2000,2000]){
  const camera=clampRoomCamera({zoom:1,x:offset,y:offset},viewport),b=isoSceneBounds(viewport);
  assert.ok(b.x+camera.x<=.01&&b.x+b.width+camera.x>=viewport.width-.01);
  assert.ok(b.y+camera.y<=.01&&b.y+b.height+camera.y>=viewport.height-.01);
  assert.deepEqual(clampRoomCamera(camera,viewport),camera);
 }
});

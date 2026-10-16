import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRoomScene,paintedRoomScene,roomSceneUrl,ROOM_SCENES} from '../webapp/room-scene-art.js';

test('Blazing Swamp uses its location study without changing the Valakas arena',()=>{
 assert.equal(roomSceneUrl('volcanic',{sceneKey:'blazing-swamp:r0c0'}),'/art/world/scenes/blazing-swamp-v2.webp');
 assert.equal(roomSceneUrl('volcanic',{sceneKey:'blazing-swamp:r2c1',compact:true}),'/art/world/scenes/blazing-swamp-mobile-v2.webp');
 assert.equal(roomSceneUrl('volcanic',{sceneKey:'valakas'}),'/art/world/scenes/volcanic-v1.webp');
 assert.equal(roomSceneUrl('volcanic',{sceneKey:'forge-of-gods:r0c0'}),'/art/world/scenes/volcanic-v1.webp');
});

test('location studies apply to every room of their zone while other zones retain their themes',()=>{
 for(const [zone,environment] of [['hot-springs','springs'],['outlaw-forest','woodland'],['wall-of-argos','desert']]){
  for(const room of ['r0c0','r1c2'])for(const compact of [false,true]){
   assert.equal(roomSceneUrl(environment,{sceneKey:`${zone}:${room}`,compact}),`/art/world/scenes/${zone}${compact?'-mobile':''}-v2.webp`);
  }
  assert.equal(roomSceneUrl(environment,{sceneKey:'another-zone:r0c0'}),`/art/world/scenes/${environment}-v1.webp`);
 }
});

test('scene loading reuses requests, bounds decoded images and tolerates missing art',async()=>{
 const previous=globalThis.Image,requests=[];
 globalThis.Image=class{
  set src(url){requests.push(url);queueMicrotask(()=>url.includes('cavern')?this.onerror?.():this.onload?.());}
 };
 try{
  const first=loadRoomScene('volcanic',{compact:true});
  assert.equal(first,loadRoomScene('volcanic',{compact:true}));await first;
  assert.ok(paintedRoomScene('volcanic',{compact:true}));
  assert.equal(requests.length,1);assert.match(requests[0],/volcanic-mobile-v1.webp$/);
  await loadRoomScene('catacomb');await loadRoomScene('woodland');
  assert.equal(paintedRoomScene('volcanic',{compact:true}),null,'old decoded scenery is released');
  assert.ok(paintedRoomScene('catacomb'));assert.ok(paintedRoomScene('woodland'));
  assert.equal(await loadRoomScene('cavern'),null,'failed decoration does not block the room');
  assert.equal(await loadRoomScene('unknown'),null);assert.equal(roomSceneUrl('unknown'),null);
  assert.equal(ROOM_SCENES.length,10);
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});

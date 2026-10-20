import test from 'node:test';
import assert from 'node:assert/strict';
import {CITIES,CITY_NPCS} from '../template/worldMap.js';
import source from '../template/nativeWorld.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import {nativeStep,nativeSegment} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {findCityPath,advanceCityPath,cityNavigationStatus,ensureCityOrigin} from '../functions/game/world/cityNavigation.js';
import {worldAction,worldState,advanceWorld,ensureWorld} from '../functions/game/world/world.js';
import {CITY_GEOMETRY,CITY_SOURCE_NPCS} from '../template/cityPopulation.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import {atlasHtml} from '../webapp/atlas-ui.js';
const NOW=1800000000000,size=c=>c.size||14000,local=(c,p)=>({x:.5+(p.x-c.x)/size(c),y:.5+(p.y-c.y)/size(c),z:p.z});
const giran=CITIES.find(c=>c.id==='giran');
test('all towns have reachable original residents and source volumes preserve correct NPC city membership',()=>{
 assert.equal(Object.keys(CITY_GEOMETRY).length,19);
 assert.equal(new Set(CITY_SOURCE_NPCS.map(n=>[n.npcId,n.x,n.y,n.z].join(':'))).size,CITY_SOURCE_NPCS.length);
 assert.equal(CITY_NPCS.find(n=>n.name==='Ranspo').city,'dion');
 assert.ok(CITY_NPCS.some(n=>n.city==='giran'&&n.name==='Galladucci'&&n.npcId===30097));
 for(const city of CITIES){
  const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:city.id,x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
  change(s,'humanFighter');update(s);ensureWorld(s,NOW);
  const w=s.game.world,origin={x:city.x+(w.x-.5)*size(city),y:city.y+(w.y-.5)*size(city)};
  const residents=CITY_NPCS.filter(n=>n.city===city.id&&Number.isFinite(n.z)).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));
  assert.ok(residents.length,city.id+' residents');
  const reachable=residents.slice(0,12).find(n=>worldAction(s,{action:'approach_npc',npc:n.id},NOW).ok);
  assert.ok(reachable,city.id+' reachable local NPC');advanceWorld(s,NOW+1000000);
  const p=local(city,reachable);assert.ok(Math.hypot(w.x-p.x,w.y-p.y)*size(city)<=180,city.id+' original NPC arrival');
  assert.equal(s.game.inventory.gold,1000000);
  assert.ok(worldState(s,NOW+1000000).cities.every(c=>!('arrivals' in c)),'source arrival lists stay on the server');
 }
});
test('old unspecified town centres use an original arrival once while saved positions and active paths are retained',()=>{
 for(const city of CITIES.filter(c=>c.arrivals?.length)){
  const actor={mode:'city',x:.5,y:.5,path:[]};ensureCityOrigin(actor,city);
  const point={x:city.x+(actor.x-.5)*size(city),y:city.y+(actor.y-.5)*size(city)};
  assert.ok(city.arrivals.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<1e-6),city.id+' original arrival');
  const saved=structuredClone(actor);ensureCityOrigin(actor,city);assert.deepEqual(actor,saved);
  const walking={mode:'city',x:.5,y:.5,path:[{x:.6,y:.5}]};ensureCityOrigin(walking,city);assert.equal(walking.x,.5);assert.equal(walking.z,undefined);
 }
});
test('every catalogue town has original ground data and accepts a verified local ground step',()=>{
 for(const city of CITIES){
  assert.ok(cityNavigationStatus(city),city.id);
  const anchor=source.towns[city.id]||{...city,z:city.z??CITY_NPCS.find(n=>n.city===city.id&&Number.isFinite(n.z)).z};
  const point=worldGeodata.point(anchor),from={gx:Math.floor(point.x/16),gy:Math.floor(point.y/16),z:point.z,nswe:point.nswe};
  const next=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>nativeStep(worldGeodata,from,dx,dy,nativeGroundAllowed)).find(Boolean);
  assert.ok(next,city.id+' source entrance is walkable');
  const actor={...local(city,point),moveAt:NOW,path:[]},to=local(city,{x:next.gx*16+8,y:next.gy*16+8,z:next.z});
  actor.path=findCityPath(actor,city,to);assert.ok(actor.path,city.id+' original local path');
  advanceCityPath(actor,city,NOW+10000,100);assert.ok(Math.hypot(actor.x-to.x,actor.y-to.y)<1e-9);assert.equal(actor.z,next.z);
 }
});
test('a Giran building cell is rejected instead of being crossed on the old empty room grid',()=>{
 const start=worldGeodata.point(source.towns.giran);let blocked;
 for(let dx=-3000;dx<3000&&!blocked;dx+=64)for(let dy=-3000;dy<3000;dy+=64){
  const p=worldGeodata.point({x:start.x+dx,y:start.y+dy,z:start.z});if(p&&!p.nswe){blocked=p;break;}
 }
 assert.ok(blocked,'original blocked building cell exists');
 const actor={...local(giran,start),moveAt:NOW,path:[]},before={...actor};
 assert.equal(findCityPath(actor,giran,local(giran,blocked)),null);assert.deepEqual(actor,before);
});
test('native town movement preserves the distance budget, height and original leg after save/load and immobilization',()=>{
 const start=worldGeodata.point(source.towns.giran);
 const goal=[[1000,0],[0,1000],[-1000,0],[0,-1000]].map(([dx,dy])=>({...start,x:start.x+dx,y:start.y+dy})).find(p=>nativeSegment(start,p,{reversible:true,allowed:nativeGroundAllowed}));
 assert.ok(goal);const a={...local(giran,start),path:[],moveAt:NOW};a.path=findCityPath(a,giran,local(giran,goal));const b=JSON.parse(JSON.stringify(a));
 advanceCityPath(a,giran,NOW+3500,100);for(let i=1;i<=7;i++)advanceCityPath(b,giran,NOW+i*500,100);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-9);assert.equal(a.z,b.z);
 assert.ok(Math.abs(Math.hypot(a.x-local(giran,start).x,a.y-local(giran,start).y)*size(giran)-350)<1e-6);
 const paused=JSON.parse(JSON.stringify(a));advanceCityPath(paused,giran,NOW+60000,0);assert.equal(paused.x,a.x);assert.equal(paused.y,a.y);
 advanceCityPath(paused,giran,NOW+61000,100);assert.ok(Math.abs(Math.hypot(paused.x-a.x,paused.y-a.y)*size(giran)-100)<1e-6);
});
test('town clicks cannot select a client height and private native city journeys stay off the public DTO',()=>{
 assert.doesNotMatch(atlasHtml(),/data-city-view|Вид города/);
 const s={userId:1,game:{stats:{lvl:85},inventory:{gold:100000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:'giran',x:.5,y:.5,path:[],moveAt:NOW,locks:{}}}};
 change(s,'humanFighter');update(s);
 assert.ok(worldAction(s,{action:'move',point:{x:.51,y:.5,z:1e9},floor:99},NOW).ok);
 assert.ok(s.game.world.cityWalk);assert.ok(s.game.world.path.every(p=>p.z<0));
 assert.equal(JSON.stringify(worldState(s,NOW+500)).includes('cityWalk'),false);
});

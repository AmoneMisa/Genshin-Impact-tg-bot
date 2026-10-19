import test from 'node:test';
import assert from 'node:assert/strict';
import {isoPoint,isoPick,isoTerrain,isoSceneBounds} from '../webapp/hunt-isometric.js';
import {syncClanPerks,clanPerksStale} from '../functions/game/clans/clanPerks.js';
import {fieldPlayerDto} from '../miniapp/hunt.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

test('continuous terrain is clipped into a bounded SVG stream and pointer picking reaches neighbouring cells',()=>{
 const tiles=Array.from({length:9},(_,i)=>({id:`r${Math.floor(i/3)}c${i%3}`,dx:i%3-1,dy:Math.floor(i/3)-1,environment:'woodland',walls:[]}));
 const field={environment:'woodland',sceneKey:'cruma-marshlands:r1c1:floor-1',walls:[],continuous:{tiles}},viewport={width:288,height:520};
 const svg=isoTerrain(field,viewport);
 assert.equal((svg.match(/data-terrain-cell=/g)||[]).length,9);assert.equal((svg.match(/<clipPath /g)||[]).length,9);
 assert.ok((svg.match(/<polygon /g)||[]).length<100,'missing images still have bounded lightweight geometry');
 const target={x:1.02,y:.7},camera={x:-100,y:45,zoom:1.3};
 const picked=isoPick(isoPoint(target,viewport,camera),viewport,camera);assert.ok(Math.abs(picked.x-target.x)<1e-10&&Math.abs(picked.y-target.y)<1e-10);
});

test('isometric movement picking preserves game coordinates after pan, zoom and viewport changes',()=>{
 for(const viewport of [{width:278,height:440},{width:348,height:425},{width:534,height:360}])
 for(const camera of [{},{x:80,y:-40,zoom:1.5},{x:-25,y:35,zoom:.75}])
 for(const point of [{x:.05,y:.5},{x:.5,y:.975},{x:.2,y:.3},{x:.75,y:.85}]){
  const picked=isoPick(isoPoint(point,viewport,camera),viewport,camera);
  assert.ok(Math.abs(picked.x-point.x)<1e-9);assert.ok(Math.abs(picked.y-point.y)<1e-9);
 }
 const v={width:348,height:425};
 assert.ok(isoPoint({x:1,y:0},v).x>isoPoint({x:0,y:1},v).x);
 assert.ok(isoPoint({x:1,y:1},v).y>isoPoint({x:0,y:0},v).y);
 const outside=isoPick({x:0,y:0},v);assert.ok(outside.x<0||outside.y<0);
});

test('terrain uses natural rubble rather than box walls without modifying collision geometry',()=>{
 const field={walls:[{x:.35,y:.6,w:.12,h:.12},{x:.27,y:.23,w:.065,h:.065,kind:'pillar'}]},before=JSON.stringify(field);
 const svg=isoTerrain(field,{width:348,height:425});
 assert.doesNotMatch(svg,/hunt-iso-wall|iso-front|iso-side|iso-top/);assert.match(svg,/hunt-iso-pillar/);assert.match(svg,/data-rubble-prop/);assert.match(svg,/data-stone-fallback/);
 assert.equal(JSON.stringify(field),before);
 assert.match(svg,/<image data-room-prop-art href="\/art\/world\/room-props-v1.webp"/);
 assert.match(svg,/viewBox="170 0 230 512"/,'pillar uses its source atlas region');
 assert.doesNotMatch(svg,/<canvas|<animate|<script/);
});

test('full-scene paintings preserve isometric anchors outside the initial viewport',()=>{
 for(const viewport of [{width:278,height:440},{width:348,height:425},{width:760,height:1000}]){
  const b=isoSceneBounds(viewport);
  for(const [world,pixel] of [[{x:0,y:0},[768,150]],[{x:1,y:0},[1408,520]],[{x:1,y:1},[768,890]],[{x:0,y:1},[128,520]]]){
   const expected=isoPoint(world,viewport);
   assert.ok(Math.abs(b.x+pixel[0]*b.width/1536-expected.x)<1);
   assert.ok(Math.abs(b.y+pixel[1]*b.height/1024-expected.y)<1);
  }
  assert.ok(b.width>viewport.width);
 }
 assert.match(isoTerrain({environment:'volcanic'},{width:348,height:425}),/image href="\/art\/world\/scenes\/volcanic-mobile-v1.webp"/);
});

test('map clan label follows the synchronized real clan and clears on leaving',()=>{
 const s={userId:1,userChatData:{user:{id:1,first_name:'A'}},game:{stats:{lvl:80},effects:[],inventory:{},equipmentStats:{}}};
 changeClass(s,'humanFighter');updateStats(s);
 assert.equal(clanPerksStale(s,100),true);
 syncClanPerks(s,{name:'Moon Guard',skills:{}},100);
 assert.equal(fieldPlayerDto(s).clanName,'Moon Guard');assert.equal(clanPerksStale(s,101),false);
 assert.equal(syncClanPerks(s,{name:'Renamed',skills:{}},102),true);assert.equal(fieldPlayerDto(s).clanName,'Renamed');
 syncClanPerks(s,null,103);assert.equal(fieldPlayerDto(s).clanName,null);
});

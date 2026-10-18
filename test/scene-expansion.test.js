import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CITIES} from '../template/worldMap.js';
import {getZones} from '../functions/game/hunt/huntMobs.js';
import {SCENE_STUDIES,sceneStudy,sceneStudyUrl,GRACIA_STUDIES} from '../webapp/scene-catalog.js';
import {roomSceneUrl,roomArtField} from '../webapp/room-scene-art.js';
import {scenePreviewHtml,graciaOverviewHtml} from '../webapp/location-art.js';
import {atlasObjects} from '../webapp/atlas-objects.js';

test('scene expansion covers individual hunting studies, ten epics and every atlas city',()=>{
 assert.equal(new Set(SCENE_STUDIES.map(s=>s.id)).size,82);
 for(const [category,count] of Object.entries({hunting:47,epic:10,city:18,interior:3}))assert.equal(SCENE_STUDIES.filter(s=>s.category===category).length,count);
 const zones=new Set(getZones().map(z=>z.id));
 for(const scene of SCENE_STUDIES.filter(s=>s.category==='hunting'))assert.ok(zones.has(scene.id));
 assert.deepEqual(SCENE_STUDIES.filter(s=>s.category==='city').map(s=>s.id).sort(),CITIES.map(c=>c.id).sort());
});
test('individual epic and hunting scenes resolve consistently across rooms and viewport sizes',()=>{
 for(const scene of SCENE_STUDIES)for(const compact of [false,true]){
  const url=sceneStudyUrl(scene.id,{compact});
  assert.equal(roomSceneUrl(scene.environment,{compact,sceneKey:scene.id+':r1c2'}),url);
  assert.ok(url.endsWith((compact?'-mobile':'')+'-v1.webp'));
 }
 assert.equal(sceneStudyUrl('freyaExtreme'),sceneStudyUrl('freya'));
 assert.equal(sceneStudy('../evil'),null);assert.equal(scenePreviewHtml('../evil'),'');
});
test('Gracia art does not invent atlas coordinates, markers or teleport actions',()=>{
 assert.equal(GRACIA_STUDIES.length,4);
 const html=graciaOverviewHtml();assert.equal((html.match(/<figure/g)||[]).length,4);
 assert.match(html,/Маршруты и точки входа пока не добавлены/);
 assert.doesNotMatch(html,/<button|data-travel|data-quick/);
 for(const scene of GRACIA_STUDIES)assert.equal('x' in scene||'y' in scene,false);
 assert.deepEqual(atlasObjects({locations:[{id:'example',region:'aden'}]},'gracia','aden'),[]);
});
test('all scene variants exist within the mobile download budget',()=>{
 for(const scene of SCENE_STUDIES)for(const compact of [true,false]){
  const file=new URL('../webapp'+sceneStudyUrl(scene.id,{compact}),import.meta.url);
  assert.ok(fs.statSync(file).size<(compact?180000:800000),scene.id+' image size');
 }
});
test('single-image instances fall back to their base scene for unsupported area variants',()=>{
 for(const scene of SCENE_STUDIES.filter(s=>s.sections===1)){
  assert.ok(getZones().find(z=>z.id===scene.id)?.instance,scene.id);
  for(const compact of [false,true])for(const area of [1,2])assert.equal(roomSceneUrl(scene.environment,{sceneKey:scene.id+':r0c0:area-'+area,compact}),sceneStudyUrl(scene.id,{compact}));
 }
});
test('art themes preserve authoritative field geometry and do not mutate it',()=>{
 const field=Object.freeze({sceneKey:'garden-of-eva:r1c2',environment:'woodland',walls:[Object.freeze({kind:'tree',x:.1,y:.2,w:.3,h:.4})]});
 const painted=roomArtField(field);assert.equal(painted.environment,'catacomb');assert.equal(painted.walls[0].kind,'pillar');
 assert.deepEqual({...painted.walls[0],kind:'tree'},field.walls[0]);assert.equal(field.environment,'woodland');assert.equal(field.walls[0].kind,'tree');
 assert.equal(roomArtField({sceneKey:'unlisted'}).sceneKey,'unlisted');
});

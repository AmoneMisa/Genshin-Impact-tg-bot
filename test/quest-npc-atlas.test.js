import test from 'node:test';import assert from 'node:assert/strict';
import {quickTravelDestinations} from '../webapp/quick-travel-menu.js';
import {movementHtml,atlasHtml} from '../webapp/atlas-ui.js';
import {atlasObjects} from '../webapp/atlas-objects.js';
const npc={id:'130:hellbound:galate',npcReference:'hellbound:galate',name:'Galate',region:'heine',x:112017,y:219528,z:-3671,quests:['Путь на Хеллбаунд']};
const state={player:{city:'gludin',mode:'city',hp:100},cities:[],locations:[],questTargets:[npc],quickTravel:{locations:[]},gold:0};
test('NPC objectives share the Atlas quest filter with original XYZ and do not need a paid quote',()=>{
 const [target]=atlasObjects(state,'quests','heine');assert.equal(target.kind,'quest');assert.equal(target.npcReference,npc.npcReference);assert.equal(target.x,npc.x);assert.equal(target.z,npc.z);
 assert.deepEqual(atlasObjects(state,'quests','gludin'),[]);assert.equal(atlasObjects(state,'quests','gludin',true).length,1);
 const [row]=quickTravelDestinations(state,'quests');assert.equal(row.kind,'questNpc');assert.equal(row.gold,null);assert.equal(row.unavailable,true);
 const html=movementHtml(state,{section:'quests',selected:row});assert.match(html,/data-quest-npc="hellbound:galate"/);assert.doesNotMatch(html,/data-quick-confirm/);assert.match(html,/Показать цель/);assert.match(atlasHtml(),/value="quests">Цели квестов/);
 const busy=movementHtml(state,{section:'quests',selected:row,busy:true});assert.match(busy,/data-quest-npc="hellbound:galate" disabled/);
});

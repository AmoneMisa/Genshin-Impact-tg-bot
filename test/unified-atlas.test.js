import test from 'node:test';
import assert from 'node:assert/strict';
import necropolises from '../template/necropolisesTemplate.js';
import {LOCATIONS,worldState,quickTravel} from '../functions/game/world/world.js';
import {getZone} from '../functions/game/hunt/huntMobs.js';
import {questTargets} from '../functions/game/world/questTargets.js';
import {atlasObjects} from '../webapp/atlas-objects.js';
import {quickTravelDestinations} from '../webapp/quick-travel-menu.js';
import change from '../functions/game/player/changePlayerGameClass.js';
import update from '../functions/game/player/updatePlayerStats.js';
import {enterBossFromAtlas} from '../miniapp/boss.js';
import {worldBossList} from '../functions/game/boss/epicBosses.js';
import bossPositions from '../template/worldBossMap.js';
import fs from 'node:fs';
function hero(){const s={userId:1,game:{stats:{lvl:76},inventory:{gold:1000000,materials:{},equipment:{items:[]}},effects:[],equipmentStats:{},builds:{}}};change(s,'warrior');update(s);return s;}
test('all fourteen Seven Signs dungeons have real encounter data and a single atlas entry',()=>{
 const entries=LOCATIONS.filter(l=>l.dungeonType);assert.equal(entries.length,14);assert.equal(necropolises.length,8);
 for(const n of necropolises){const l=LOCATIONS.find(l=>l.id===n.id);assert.deepEqual({x:l.x,y:l.y},n.entrance);assert.ok(n.mobs.length>=3);assert.ok(n.mobs.every(m=>Number.isFinite(m.expShare)&&m.hp>0));assert.equal(getZone(n.id),n);}
 assert.equal(atlasObjects({locations:LOCATIONS},'dungeons',null,true).length,14);
 assert.ok(atlasObjects({locations:LOCATIONS},'hunt',null,true).every(l=>!l.dungeonType));
});
test('quest teleport only accepts active objectives and places the requested NPC in the encounter',()=>{
 const s=hero();s.game.academy={passQuests:{baium:{step:1,progress:0}}};const targets=questTargets(s,LOCATIONS);assert.ok(targets.length);const q=targets[0];
 const before=s.game.inventory.gold;assert.equal(quickTravel(s,{quest:'forged'}).ok,false);assert.equal(s.game.inventory.gold,before);
 assert.equal(quickTravel(s,{quest:q.id}).ok,true);assert.equal(s.game.world.location,q.location);assert.equal(s.game.hunt.mob.mobId,q.mobId);
 const dto=worldState(s);assert.ok(quickTravelDestinations(dto,'quests').some(row=>row.id===q.id));
 delete s.game.academy.passQuests.baium;assert.equal(questTargets(s,LOCATIONS).length,0);
});
test('raids and epics are separate filters on the same world coordinates, including respawning bosses',()=>{
 const state={bosses:[{name:'raid',raid:true,map:{x:1,y:2,region:'aden'},available:false,level:40},{name:'epic',raid:false,map:{x:3,y:4,region:'giran'},available:true,level:80}]};
 assert.deepEqual(atlasObjects(state,'raids','aden').map(b=>b.id),['raid']);assert.deepEqual(atlasObjects(state,'epics','aden',true).map(b=>b.id),['epic']);
 assert.equal(quickTravelDestinations(state,'raids')[0].unavailable,true);
});
test('all supported epics have source positions; unmapped raids are listed but cannot teleport',async()=>{
 const bosses=worldBossList();assert.equal(bosses.filter(b=>!b.raid&&b.map).length,11);assert.ok(bosses.filter(b=>b.raid&&b.map).length>180);
 const missing=bosses.find(b=>!b.map);assert.ok(missing);
 assert.equal(quickTravelDestinations({bosses},'raids').find(q=>q.id===missing.name).unavailable,true);
 assert.equal((await enterBossFromAtlas(hero(),-123,missing.name)).reason,'boss_location_unknown');
});
test('scripted raids retain original room and summon coordinates without enabling obsolete H5 NPCs',()=>{
 const point=id=>{const {x,y,z}=bossPositions[id];return {x,y,z};};
 assert.deepEqual(point(25333),{x:-109912,y:-181520,z:-6752});
 assert.deepEqual(point(25328),{x:59090,y:-42188,z:-3003});
 assert.deepEqual(point(25531),{x:152759,y:145949,z:-12588});
 assert.deepEqual(point(25609),{x:-44767,y:247419,z:-14183});
 assert.deepEqual(bossPositions[25528].room,point(25528));
 assert.equal(bossPositions[25718].spots.length,4);
 assert.deepEqual(bossPositions[25738].spawnRadius,{min:250,max:500});
 assert.ok(bossPositions[25667].spots.length>1);
 assert.equal(bossPositions[25217],undefined); // Original SQL explicitly removed Cursed Clara in H5.
 const bosses=worldBossList(),rows=quickTravelDestinations({bosses},'raids');
 assert.equal(bosses.filter(b=>b.map).length,254);
 for(const id of [25333,25531,25609,25718]){const b=bosses.find(b=>b.map?.source===bossPositions[id].source);assert.ok(b);assert.equal(rows.find(q=>q.id===b.name).missingSpawn,false);}
 const report=JSON.parse(fs.readFileSync(new URL('../docs/atlas-redesign/missing-raid-spawns.json',import.meta.url)));
 assert.equal(report.length,bosses.filter(b=>!b.map).length);
 assert.equal(report.find(b=>b.id===25217).reason,'removed-in-high-five');
 assert.ok(bosses.filter(b=>b.map).every(b=>b.map.source&&['x','y','z'].every(k=>Number.isFinite(b.map[k]))));
});
test('direct boss entry rejects death, combat and siege before any encounter or payment mutation',async()=>{
 for(const kind of ['dead','combat','siege']){const s=hero();worldState(s);if(kind==='dead')s.game.gameClass.stats.hp=0;if(kind==='combat')s.game.stats.inFightTimer=Date.now()+60000;if(kind==='siege')s.game.world.mode='siege';const before=s.game.inventory.gold;const result=await enterBossFromAtlas(s,-123,'queenAnt');assert.equal(result.ok,false);assert.equal(result.reason,{dead:'dead',combat:'quick_travel_combat',siege:'quick_travel_siege'}[kind]);assert.equal(s.game.inventory.gold,before);assert.notEqual(s.game.world.mode,'boss');}
});

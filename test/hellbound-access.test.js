import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import source from '../template/hellboundAccess.js';
import {worldAction,worldState,ensureWorld,advanceWorld,CITY_NPCS,cityPoint,CITIES} from '../functions/game/world/world.js';
import {hellboundAccessDto} from '../functions/game/world/hellboundAccess.js';
import {worldGeodata} from '../functions/game/world/l2jGeodata.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,casian=source.npcs.find(n=>n.npcId===30612),galate=source.npcs.find(n=>n.npcId===32292),gates=source.npcs.filter(n=>n.npcId===32314);
function hero(level=85,stage=1){const s={userId:1,game:{stats:{lvl:level,currentExp:0},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};const chat={game:{hellbound:{level:stage}},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);ensureWorld(s,NOW);return s;}
function at(s,n){Object.assign(s.game.world,{mode:'native',city:n.region==='heine'?'heine':'gludio',nativePosition:{x:n.x,y:n.y,z:n.z},path:[],location:null});delete s.game.world.walkHome;}
function act(s,n,event,body={}){return worldAction(s,{action:'hellbound_npc',npc:n.id,event,...body},NOW);}
function complete(s){for(const [n,event]of [[casian,'start'],[galate,'report'],[casian,'crystal'],[galate,'complete']]){at(s,n);assert.equal(act(s,n,event).ok,true,event);}}
test('pinned quest/warpgate/spawn files retain original bytes; all four NPC positions have geodata',()=>{
 for(const [name,m]of Object.entries(source.source.files))assert.equal(createHash('sha256').update(fs.readFileSync('art-source/world/hellbound/'+name)).digest('hex'),m.sha256,name);
 assert.equal(source.npcs.length,4);for(const n of source.npcs)assert.ok(worldGeodata.point(n),n.id);
});
test('quest 130 requires actual NPC proximity, level and unlocked server stage',()=>{
 const s=hero();assert.equal(act(s,casian,'start').reason,'npc_too_far');at(s,casian);s.game.world.nativePosition.x+=source.interactionDistance+1;assert.equal(act(s,casian,'start').reason,'npc_too_far');
 const low=hero(77);at(low,casian);assert.equal(act(low,casian,'start').reason,'hellbound_level_required');assert.equal(low.game.worldQuests,undefined);
 const locked=hero(85,0);at(locked,casian);assert.equal(act(locked,casian,'start',{stage:11,completedAt:NOW}).reason,'hellbound_locked');assert.equal(locked.game.worldQuests,undefined);
});
test('quest talks enforce order, issue one original item and complete permanently without invented rewards',()=>{
 const s=hero();at(s,galate);assert.equal(act(s,galate,'complete',{condition:3,items:{12823:1}}).reason,'quest_step_required');
 at(s,casian);assert.ok(act(s,casian,'start').ok);assert.equal(act(s,casian,'crystal').reason,'quest_step_required');at(s,galate);assert.ok(act(s,galate,'report').ok);at(s,casian);assert.ok(act(s,casian,'crystal').ok);assert.equal(s.game.worldQuests[130].items[12823],1);assert.equal(act(s,casian,'crystal').ok,false);
 s.game=JSON.parse(JSON.stringify(s.game));at(s,galate);delete s.game.worldQuests[130].items[12823];assert.equal(act(s,galate,'complete').reason,'quest_item_required');s.game.worldQuests[130].items[12823]=1;assert.ok(act(s,galate,'complete').ok);
 assert.equal(s.game.worldQuests[130].items[12823],undefined);assert.equal(s.game.inventory.gold,1000000);assert.equal(s.game.stats.currentExp,0);assert.equal(act(s,galate,'complete').reason,'quest_completed');
});
test('only an admitted nearby warpgate enters Hellbound; custom city and quick teleports cannot bypass it',()=>{
 const s=hero();at(s,gates[1]);assert.equal(act(s,gates[1],'enter',{quest:130,completed:true}).reason,'hellbound_quest_required');
 assert.equal(worldAction(s,{action:'quick_travel',location:'hellbound',portal:true},NOW).reason,'hellbound_portal_required');
 assert.equal(worldState(s,NOW).quickTravel.locations.some(l=>l.id==='hellbound'),false);
 complete(s);s.game=JSON.parse(JSON.stringify(s.game));for(const n of gates){at(s,n);assert.ok(act(s,n,'enter').ok);assert.equal(s.game.world.location,'hellbound');assert.deepEqual(s.game.world.lastTeleport.point,source.entry);assert.equal(s.game.inventory.gold,1000000);assert.equal(worldAction(s,{action:'walk_exit'},NOW).reason,'hellbound_portal_required');}
 const locked=hero(85,0);locked.game.worldQuests={130:{completedAt:NOW}};at(locked,gates[1]);assert.equal(act(locked,gates[1],'enter').reason,'hellbound_locked');
});
test('NPC walking uses a verified source target, ignores client XYZ and cancels a return cast',()=>{
 const s=hero();at(s,galate);s.game.world.nativePosition.x+=source.interactionDistance+20;s.game.world.channel={until:NOW+15000,hp:s.game.gameClass.stats.hp};
 const result=worldAction(s,{action:'hellbound_walk',npc:galate.id,point:{x:1e9,y:1e9,z:1e9}},NOW);assert.equal(result.ok,true);assert.equal(s.game.world.channel,null);const path=s.game.world.walkHome.native.path;assert.equal(path.at(-1).x,galate.x);assert.equal(path.at(-1).y,galate.y);
 assert.ok(hellboundAccessDto(s).npcs.every(n=>typeof n.near==='boolean'));
});

test('original Gludin Wastelands fare and verified walk reach Casian without a fabricated shortcut',()=>{
 const s=hero(),gk=CITY_NPCS.find(n=>n.npcId===source.approach.npcId&&n.gateway),w=s.game.world;
 Object.assign(w,{mode:'city',city:'gludin',...cityPoint(CITIES.find(c=>c.id==='gludin'),gk),z:gk.z});const gold=s.game.inventory.gold;
 assert.equal(worldAction(s,{action:'hellbound_route',npc:casian.id,gold:0,point:{x:1,y:1,z:1}},NOW).ok,true);
 assert.equal(gold-s.game.inventory.gold,source.approach.fee);assert.deepEqual(w.nativePosition,{x:source.approach.x,y:source.approach.y,z:source.approach.z});
 const walk=worldAction(s,{action:'hellbound_walk',npc:casian.id},NOW+1);assert.equal(walk.ok,true,JSON.stringify(walk));const until=w.walkHome.until;advanceWorld(s,until+1);
 assert.equal(hellboundAccessDto(s,until+1).npcs.find(n=>n.id===casian.id).near,true);assert.equal(act(s,casian,'start').ok,true);
});

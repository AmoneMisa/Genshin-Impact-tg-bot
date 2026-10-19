import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DRAGON_VORTICES,DRAGON_BONE_DROPS} from '../template/dragonVortex.js';
import {rollVortexBoss,nearVortex} from '../functions/game/world/dragonVortex.js';
import {dragonVortexAction,vortexEncounterFor} from '../miniapp/dragonVortex.js';
import {enterBossFromAtlas,summonBossForMiniApp} from '../miniapp/boss.js';
import {lootRows,itemRow} from '../functions/game/hunt/lootTable.js';
import {ITEM_ICONS} from '../webapp/art/l2-gameplay-icons.js';
import {RAID_LOCATIONS} from '../template/raidLocations.js';
import {locationRaids} from '../functions/game/hunt/locationLevels.js';
import {locationBossGate} from '../functions/game/world/zakenShip.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import {ensureWorld} from '../functions/game/world/world.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000;
function hero(id=1){
 const s={userId:id,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e6,materials:{l2_17248:3},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);ensureWorld(s,NOW);enterHuntField(s,'dragon-valley',{now:NOW});
 Object.assign(s.game.world,{mode:'location',location:'dragon-valley'});
 const v=DRAGON_VORTICES[0];Object.assign(s.game.hunt.field,{room:v.room,...v.point});
 s.game.hunt.field.mobs.forEach(m=>Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:NOW+1e9}));
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;return s;
}
function services(){
 const records=new Map(),calls=[];let seq=0;
 return {records,calls,store:{findById:async id=>records.get(id),
  updateOne:async({_id},{$set})=>records.set(_id,{_id,...structuredClone($set)}),
  findOneAndUpdate:async(query,{$set})=>{if(records.get(query._id)?.data.until>query.$or[0]['data.until'].$lte)throw Object.assign(new Error('duplicate'),{code:11000});records.set(query._id,{_id:query._id,...structuredClone($set)});},
  deleteOne:async query=>{if(records.get(query._id)?.data.reservation===query['data.reservation'])records.delete(query._id);}},session:async()=>{},scope:()=>-8000000000000-(++seq),random:()=>.99,
  summon:async(scope,template)=>{calls.push({scope,name:template.name});return {aliveTime:NOW+900000};},alive:async()=>({name:'Emerald Horn'})};
}
test('the complete source lottery has 3/5/7/10/20/22/33 percent weights',()=>{
 const counts={};for(let i=0;i<100;i++){const id=rollVortexBoss(()=>i/100);counts[id]=(counts[id]||0)+1;}
 assert.deepEqual(counts,{25724:3,25722:5,25723:7,25721:10,25720:20,25719:22,25718:33});
 assert.equal(DRAGON_VORTICES.length,4);assert.equal(new Set(DRAGON_VORTICES.map(v=>v.source.x)).size,4);
 for(const [id,chance] of Object.entries(DRAGON_BONE_DROPS))assert.equal(lootRows(id).find(r=>r.id===17248).chance,chance);
 assert.equal(itemRow(17248).name,'Large Dragon Bone');
 for(const id of [17248,17249])assert.ok(fs.existsSync('webapp/art/l2-extra/'+ITEM_ICONS['l2_'+id]+'-32.webp'));
});
test('summon consumes one bone, shares source NPC cooldown and keeps repeated species in distinct fights',async()=>{
 const a=hero(),b=hero(2),d=services(),vortex=DRAGON_VORTICES[0].id;
 assert.equal((await dragonVortexAction(a,{vortex},NOW,d)).ok,true);
 const first={...a.game.world.vortexEncounter};assert.equal(a.game.inventory.materials.l2_17248,2);
 assert.equal((await dragonVortexAction(b,{vortex},NOW+59999,d)).reason,'vortex_cooldown');assert.equal(b.game.inventory.materials.l2_17248,3);
 assert.equal((await dragonVortexAction(b,{vortex,encounter:first.id},NOW+1,d)).ok,true);assert.equal(b.game.world.vortexEncounter.scope,first.scope);
 assert.equal((await dragonVortexAction(b,{vortex},NOW+60000,d)).ok,true);
 assert.notEqual(b.game.world.vortexEncounter.scope,first.scope);assert.equal(d.calls.length,2);
 assert.equal((await vortexEncounterFor(a,first.name,first.scope,NOW,d.store)).source.x,DRAGON_VORTICES[0].spawn.x);
 assert.equal(await vortexEncounterFor(a,first.name,first.scope,NOW+900000,d.store),null);
});
test('remote, empty bag, expired encounter and uninvoked Atlas routes cannot summon for free',async()=>{
 const s=hero(),d=services(),vortex=DRAGON_VORTICES[0].id;
 s.game.hunt.field.x=0;assert.equal(nearVortex(s,vortex),null);
 assert.equal((await dragonVortexAction(s,{vortex},NOW,d)).reason,'npc_too_far');
 Object.assign(s.game.hunt.field,DRAGON_VORTICES[0].point);s.game.inventory.materials.l2_17248=0;
 assert.equal((await dragonVortexAction(s,{vortex},NOW,d)).reason,'vortex_bone_required');
 assert.equal((await dragonVortexAction(s,{vortex,encounter:'forged'},NOW,d)).reason,'vortex_required');assert.equal(d.calls.length,0);
 assert.equal((await enterBossFromAtlas(s,-1,'Emerald Horn',NOW)).reason,'vortex_required');
 assert.equal((await summonBossForMiniApp(s,-1,'Emerald Horn')).reason,'vortex_required');
});
test('a failed spawn releases only its own reservation and does not consume a bone',async()=>{
 const s=hero(),d=services(),vortex=DRAGON_VORTICES[0].id;
 d.summon=async()=>{throw new Error('spawn unavailable');};
 await assert.rejects(dragonVortexAction(s,{vortex},NOW,d),/spawn unavailable/);
 assert.equal(s.game.inventory.materials.l2_17248,3);assert.equal(d.records.size,0);
});
test('all four subclass raid source spawns have usable local gates on their proper floors',()=>{
 for(const [id,zone,floor] of [[25035,'fields-of-massacre',1],[25220,'tower-of-insolence',3],[25054,'tower-of-insolence',8],[25126,'tower-of-insolence',11]]){
  const s=hero(),r=RAID_LOCATIONS[id];assert.equal(r.zone,zone);assert.equal(r.gate.floor,floor);assert.ok(r.sourcePosition.x);
  s.game.hunt=null;assert.equal(enterHuntField(s,zone,{now:NOW,floor}).ok,true);Object.assign(s.game.world,{mode:'location',location:zone});Object.assign(s.game.hunt.field,{room:r.gate.room,...r.gate.point});
  assert.ok(locationRaids(zone,s.game.hunt.field).some(p=>p.name===r.name));assert.equal(locationBossGate(s,r.name,NOW),true,JSON.stringify({id,zone:s.game.hunt.zone,world:s.game.world.location,floor:s.game.hunt.field.floor}));
  s.game.hunt.field.x=0;assert.equal(locationBossGate(s,r.name,NOW),false);
 }
});

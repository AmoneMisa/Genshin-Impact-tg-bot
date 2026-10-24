import test from 'node:test';import assert from 'node:assert/strict';
import {worldAction,worldState,advanceWorld,ensureWorld} from '../functions/game/world/world.js';
import {nativeFieldBuckets,nativeActorPoint,placeNativeActor,nativeSourceGap} from '../functions/game/world/nativeFieldSpace.js';
import {nativeIsland} from '../functions/game/world/nativeTravel.js';
import {regionAccessBlock} from '../functions/game/world/regionAccess.js';
import {findNativePath} from '../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../functions/game/world/nativeGround.js';
import {populationSlots} from '../functions/game/hunt/sourcePopulation.js';
import {LOCATION_LEVELS} from '../template/locationLevels.js';
import {LOCATIONS} from '../template/worldMap.js';
import registry from '../template/nativeFieldPilot.js';
import source from '../template/hellboundAccess.js';
import minions from '../template/nativeMinions.js';
import change from '../functions/game/player/changePlayerGameClass.js';import update from '../functions/game/player/updatePlayerStats.js';
const NOW=1800000000000,gate=source.npcs.find(n=>n.id==='hellbound:heine-gate');
const actors=s=>nativeFieldBuckets(s.game.hunt.field).flatMap(b=>b.mobs||[]);
function fixture(){
 const chat={game:{hellbound:{level:1}}},s={userId:1,ownerDocument:()=>chat,game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,worldQuests:{130:{completedAt:NOW-1}}}};
 change(s,'humanFighter');update(s);ensureWorld(s,NOW);return {s,chat};
}
function enter(s,now=NOW){Object.assign(s.game.world,{mode:'native',city:'heine',nativePosition:{x:gate.x,y:gate.y,z:gate.z},location:null,path:[]});assert.ok(worldAction(s,{action:'hellbound_npc',npc:gate.id,event:'enter'},now).ok);worldState(s,now);quiet(s,now);}
function quiet(s,now){for(const m of actors(s))Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});}
test('Hellbound registers every original surface slot and keeps phase capacity separate from alternative records',()=>{
 const meta=registry.fields.hellbound;assert.equal(meta.count,457);assert.equal(meta.fixedCount,457);assert.equal(meta.initialCapacity,344);assert.equal(meta.availableCapacity,343);
 let unavailable=0;for(const r of LOCATION_LEVELS.hellbound.floors[0].rooms)for(const p of r.spawns){if(nativeSourceGap('hellbound',p)){unavailable+=p.count;assert.equal(placeNativeActor({},p),false);}else assert.ok(placeNativeActor({},p),JSON.stringify(p));}
 assert.equal(unavailable,1);assert.deepEqual(Object.values(meta.phaseCapacity),[0,222,237,238,239,249,242,275,275,286,344,344]);
});
test('an admitted gate enters original XYZ and active NPCs directly in the same public native field',()=>{
 const {s}=fixture();enter(s);const dto=worldState(s,NOW);assert.equal(dto.nativeField.zone,'hellbound');assert.deepEqual(dto.nativeField.point,source.entry);assert.equal(nativeIsland(s),'hellbound');assert.ok(dto.nativeField.actors.length>0&&dto.nativeField.actors.length<=48);assert.equal(s.game.inventory.gold,1e6);
 const active=new Set(LOCATION_LEVELS.hellbound.floors[0].rooms.flatMap(r=>populationSlots(r,s,'hellbound').map(p=>r.id+':'+p.slot)));
 assert.ok(actors(s).every(m=>m.native&&active.has(m.sourceMinion?.owner||m.sourceRoom+':'+m.sourceSlot)));assert.equal(new Set(actors(s).map(m=>m.sourceRoom+':'+m.sourceSlot)).size,actors(s).length);
 for(const m of actors(s).filter(m=>m.sourceMinion))assert.ok(minions.masters[m.sourceMinion.masterId].entries.some(e=>e.id===m.mobId));
 assert.equal(worldAction(s,{action:'native_walk_city',city:'heine'},NOW).ok,false);assert.equal(worldAction(s,{action:'hellbound_walk',npc:'hellbound:casian'},NOW).reason,'hellbound_ground_required');
 const location=LOCATIONS.find(l=>l.id==='hellbound');assert.equal(regionAccessBlock(s,location,{walking:true}),null);delete s.game.world.nativeIsland;assert.equal(regionAccessBlock(s,location,{walking:true}),'hellbound_portal_required');
});
test('world movement uses geodata, survives serialization and stops without a room transition',()=>{
 let {s,chat}=fixture();enter(s);const from=worldState(s,NOW).player.worldPoint,goal=[[200,0],[-200,0],[0,200],[0,-200]].map(([x,y])=>({x:from.x+x,y:from.y+y,z:from.z})).find(p=>findNativePath(from,p,{allowed:nativeGroundAllowed,maxNodes:6000,reversible:true}).ok);assert.ok(goal);
 assert.ok(worldAction(s,{action:'native_move',point:{...goal,z:1e9}},NOW).ok);const until=s.game.hunt.field.native.journey.until;
 s=JSON.parse(JSON.stringify(s));s.ownerDocument=()=>chat;quiet(s,NOW);advanceWorld(s,until+1);const after=nativeActorPoint(s.game.hunt.field);assert.ok(Math.hypot(after.x-from.x,after.y-from.y)>0);assert.ok(Math.abs(after.z-from.z)<300);assert.equal(s.game.world.location,'hellbound');assert.equal(s.game.hunt.field.native.journey,undefined);
});
test('source Southern Wasteland escape consumes once and restores the same NPC bank on another gate entry',()=>{
 const {s,chat}=fixture();enter(s);const m=actors(s).find(m=>m.currentHp>0),id=m.instanceId;m.currentHp=Math.floor(m.hp/2);const hp=m.currentHp;
 assert.ok(worldAction(s,{action:'escape'},NOW).ok);quiet(s,NOW);advanceWorld(s,NOW+15000);
 assert.equal(s.game.inventory.materials.scroll_escape,1);assert.equal(s.game.world.mode,'native');assert.ok(source.escape.points.some(p=>JSON.stringify(p)===JSON.stringify(s.game.world.nativePosition)));assert.equal(nativeIsland(s),null);assert.ok(s.game.world.nativeFields.hellbound);assert.equal(s.game.hunt.field,null);
 advanceWorld(s,NOW+16000);assert.equal(s.game.inventory.materials.scroll_escape,1);enter(s,NOW+17000);const copies=actors(s).filter(m=>m.instanceId===id);assert.equal(copies.length,1);assert.equal(copies[0].currentHp,hp);assert.equal(s.game.world.nativeFields.hellbound,undefined);
 chat.game.hellbound.level=0;worldState(s,NOW+17001);assert.equal(actors(s).length,0);assert.equal(s.game.hunt.field.native.z,source.entry.z);
});

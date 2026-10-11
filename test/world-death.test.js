import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {ensureWorld,advanceWorld} from '../functions/game/world/world.js';
import {deathChoices,respawnWorld,nearbyCorpse} from '../functions/game/world/death.js';
import {enterHuntField,advanceHunt} from '../functions/game/hunt/huntFight.js';
import {castRevival} from '../functions/game/player/revival.js';
import {fieldPeers,finishL2PvpDeath} from '../functions/game/hunt/fieldPvp.js';
import {settleSiege,reconcileMilitaryOwnership} from '../functions/game/world/siege.js';
import holdings from '../template/worldHoldings.js';
const NOW=1800000000000;
function hero(id=1,name='warrior'){const s={userId:id,userChatData:{user:{id,first_name:'Hero '+id}},game:{stats:{lvl:80},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};changeClass(s,name);updateStats(s);ensureWorld(s,NOW);s.game.gameClass.stats.mp=20000;return s;}
function field(s){enterHuntField(s,'plains-of-dion',{now:NOW});Object.assign(s.game.world,{mode:'location',location:'plains-of-dion',city:'dion'});s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.aggro=false;});}
const clan={_id:'clan',owner:1,level:5};
test('a world corpse stays in its room after the old respawn timeout and is visible to a living player',()=>{
 const a=hero(1),b=hero(2);field(a);field(b);a.game.gameClass.stats.hp=0;a.game.respawnTime=NOW+30000;
 const f=a.game.hunt.field;advanceWorld(a,NOW+3600000);advanceHunt(a,NOW+3600000);
 assert.equal(a.game.gameClass.stats.hp,0);assert.equal(a.game.hunt.field,f);assert.equal(a.game.world.mode,'location');assert.ok(a.game.world.death);
 b.game.hunt.field.seenAt=NOW+3600000;assert.ok(fieldPeers({members:[a,b]},b,NOW+3600000).includes(a));
});
test('death destinations follow actual ownership and reject stale or forged choices without healing',()=>{
 const s=hero(),hall=holdings.find(h=>h.kind==='hall'),fort=holdings.find(h=>h.kind==='fort'),castle=holdings.find(h=>h.kind==='castle');
 const records=[{_id:hall.id,owner:{clanId:'clan'}},{_id:fort.id,owner:{clanId:'clan'}}];s.game.gameClass.stats.hp=0;
 assert.deepEqual(deathChoices(s,null,records,NOW).map(c=>c.label),['В город']);
 assert.deepEqual(deathChoices(s,clan,records,NOW).map(c=>c.label),['В город','В клан холл','В форт']);
 assert.equal(respawnWorld(s,castle.id,clan,records,NOW).reason,'respawn_destination_unavailable');assert.equal(s.game.gameClass.stats.hp,0);
 records[1].owner=null;assert.equal(respawnWorld(s,fort.id,clan,records,NOW).ok,false);
 assert.equal(respawnWorld(s,hall.id,clan,records,NOW).ok,true);assert.equal(s.game.world.mode,'hall');assert.equal(s.game.world.holding,hall.id);assert.equal(s.game.respawnTime,0);
 assert.equal(respawnWorld(s,'city',clan,records,NOW).reason,'not_dead');
});
test('fort and castle return places are inside the owned stronghold',()=>{
 for(const kind of ['fort','castle']){const s=hero(),h=holdings.find(h=>h.kind===kind);s.game.gameClass.stats.hp=0;
 assert.equal(respawnWorld(s,h.id,clan,[{_id:h.id,owner:{clanId:'clan'}}],NOW).ok,true);assert.equal(s.game.world.mode,'stronghold');assert.equal(s.game.world.city,h.region);assert.equal(s.game.world.holding,h.id);}
});
test('older conflicting ownership saves keep the most recently captured military holding',()=>{
 const fort=holdings.find(h=>h.kind==='fort'),castle=holdings.find(h=>h.kind==='castle');
 const records=[{_id:fort.id,owner:{clanId:'clan',capturedAt:NOW+1}},{_id:castle.id,owner:{clanId:'clan',capturedAt:NOW}}];
 reconcileMilitaryOwnership(records);assert.ok(records[0].owner);assert.equal(records[1].owner,null);
});
test('city resurrection range uses city coordinates rather than the smaller room scale',()=>{
 const a=hero(1),b=hero(2);b.game.world.x=a.game.world.x+.1;assert.equal(nearbyCorpse(a,b),false);
 b.game.world.x=a.game.world.x+.02;assert.equal(nearbyCorpse(a,b),true);
});
test('a learned resurrection restores the corpse in place and cannot cross floors or exceed range',()=>{
 const healer=hero(1,'bishop'),fallen=hero(2),chat={members:[healer,fallen]};for(const m of chat.members){m.ownerDocument=()=>chat;field(m);}
 fallen.game.gameClass.stats.hp=0;fallen.game.respawnTime=NOW+60000;advanceWorld(fallen,NOW);const f=fallen.game.hunt.field,mp=healer.game.gameClass.stats.mp;
 f.floor=2;assert.equal(castRevival(healer,1016,2,{now:NOW}).reason,'revival_too_far');assert.equal(healer.game.gameClass.stats.mp,mp);
 f.floor=1;f.x=.05;assert.equal(castRevival(healer,1016,2,{now:NOW}).ok,false);
 f.x=.5;assert.equal(castRevival(healer,1016,2,{now:NOW}).ok,true);assert.equal(fallen.game.hunt.field,f);assert.ok(fallen.game.gameClass.stats.hp>0);assert.equal(fallen.game.world.death,undefined);assert.equal(fallen.game.respawnTime,0);
 advanceWorld(fallen,NOW+1);assert.equal(fallen.game.world.mode,'location');
});
test('PvP death retains the corpse and getting the opposite military holding releases the old one',()=>{
 const a=hero(1),b=hero(2),chat={members:[a,b]};field(a);field(b);b.game.gameClass.stats.hp=0;const f=b.game.hunt.field;
 finishL2PvpDeath(chat,a,b,NOW);assert.equal(b.game.hunt.field,f);
 const fort=holdings.find(h=>h.kind==='fort'),castle=holdings.find(h=>h.kind==='castle'),hall=holdings.find(h=>h.kind==='hall');
 const records=[{_id:fort.id,owner:{clanId:'clan'}},{_id:castle.id,owner:null},{_id:hall.id,owner:{clanId:'clan'}}];
 records[1].siege={kind:'castle',endsAt:NOW,winner:{clanId:'clan'},settled:false};settleSiege(records[1],NOW,records);
 assert.equal(records[0].owner,null);assert.equal(records[1].owner.clanId,'clan');assert.equal(records[2].owner.clanId,'clan');
 records[0].siege={kind:'fort',endsAt:NOW+100,winner:{clanId:'clan'},settled:false};settleSiege(records[0],NOW,records);
 assert.equal(records[1].owner,null);assert.equal(records[0].owner.clanId,'clan');
});

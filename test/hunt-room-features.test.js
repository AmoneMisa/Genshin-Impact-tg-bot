import test from 'node:test';
import assert from 'node:assert/strict';
import {getZone,getZones} from '../functions/game/hunt/huntMobs.js';
import {roomLayout,slotPositions} from '../functions/game/hunt/huntRooms.js';
import {findPath,insideObstacle,nearestOpenPoint} from '../functions/game/world/navigation.js';
import {clearLine} from '../functions/game/hunt/huntSpatial.js';
import {enterHuntField,moveHuntField,ensureHunt,useHuntSkill,advanceHunt} from '../functions/game/hunt/huntFight.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {useFieldPvpSkill} from '../functions/game/hunt/fieldPvp.js';
import {getHuntState} from '../miniapp/hunt.js';

const NOW=Date.now();
function fixture(id=1){const s={userId:id,userChatData:{user:{id}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};changeClass(s,'humanFighter');updateStats(s);enterHuntField(s,'catacomb-forbidden-path',{now:NOW,random:()=>.5});s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.nextAttackAt=NOW+1e6;});return s;}

test('all adapted zones describe their visual environment and spawns avoid real obstacles',()=>{
 for(const zone of getZones())for(const room of roomLayout(zone).rooms){
  assert.equal(room.layoutSource,'adapted');assert.ok(room.environment);
  for(const slot of slotPositions(room.cap))assert.equal(insideObstacle(nearestOpenPoint(slot,room.walls),room.walls),false);
 }
 const crypt=roomLayout(getZone('necropolis-disciples')).rooms[0];assert.equal(crypt.environment,'necropolis');assert.ok(crypt.walls.some(w=>w.kind==='sarcophagus'));
 const field=roomLayout(getZone('hot-springs')).rooms[0];assert.equal(field.environment,'springs');assert.equal(field.walls.some(w=>w.kind==='pillar'),false);
});

test('a displayed pillar blocks clicks and line of sight; paths go around its footprint',()=>{
 const s=fixture(),f=s.game.hunt.field,p=f.walls.find(w=>w.kind==='pillar');
 const from={x:p.x-.1,y:p.y+p.h/2},to={x:p.x+p.w+.1,y:from.y};
 assert.equal(clearLine(from,to,f.walls),false);
 Object.assign(f,from);assert.equal(moveHuntField(s,{x:p.x+p.w/2,y:p.y+p.h/2},NOW).reason,'path_blocked');
 const path=findPath(from,to,f.walls);assert.ok(path?.length);
 let at=from;for(const point of path){assert.equal(clearLine(at,point,f.walls),true);at=point;}
});

test('old saved rooms migrate once, clear stale actions and move trapped actors outside columns',()=>{
 const s=fixture(),f=s.game.hunt.field,p=f.walls.find(w=>w.kind==='pillar');
 Object.assign(f,{x:p.x+.01,y:p.y+.01,path:[{x:.8,y:.8}],pendingRoom:'r0c1',autoAttack:{},action:{},walls:[],layoutVersion:1});
 ensureHunt(s);assert.equal(f.layoutVersion,2);assert.equal(insideObstacle(f,f.walls),false);assert.equal(f.pendingRoom,undefined);assert.equal(f.action,undefined);assert.deepEqual(f.path,[]);
 const walls=f.walls;ensureHunt(s);assert.equal(f.walls,walls);
});

test('queued area kills publish one complete loot event and distinct same-time log ids',async()=>{
 const s=fixture(),h=s.game.hunt,f=h.field;
 s.game.gameClass.skills=[{...s.game.gameClass.skills[1],name:'Whirlwind',l2Id:9,tier:undefined,cost:10,cooldown:2}];
 Object.assign(f,{x:.5,y:.5});Object.assign(f.mobs[0],{x:.51,y:.5,currentHp:1});Object.assign(f.mobs[1],{x:.52,y:.51,currentHp:1});Object.assign(f.mobs[2],{x:.2,y:.3});
 assert.ok(useHuntSkill(s,0,{now:NOW,random:()=>0}).queued);f.seenAt=NOW+721;advanceHunt(s,NOW+721,()=>0);
 assert.equal(h.kills,2);const loot=h.log.filter(l=>l.text.startsWith('Получено:'));assert.equal(loot.length,1);
 assert.match(loot[0].text,/опыта.*SP/);assert.match(loot[0].text,/×\d+/);
 assert.equal(new Set(h.log.map(l=>l.id)).size,h.log.length);
 const gold=s.game.inventory.gold;advanceHunt(s,NOW+722,()=>0);assert.equal(s.game.inventory.gold,gold);assert.equal(h.log.filter(l=>l.text.startsWith('Получено:')).length,1);
 assert.equal(f.lastStrike.spatial.radius,200);assert.equal(f.lastStrike.targets.length,2);
 const dto=await getHuntState(s,NOW+722);const event=dto.log.find(l=>l.loot);
 assert.ok(event.id);assert.deepEqual(event.loot.items,h.lastLoot.items);assert.deepEqual(dto.lastLoot,h.lastLoot);
});

test('PvP cannot cast through a column, with no MP cost or PvP flag on rejection',()=>{
 const a=fixture(1),b=fixture(2),f=a.game.hunt.field,p=f.walls.find(w=>w.kind==='pillar');
 Object.assign(f,{x:p.x-.04,y:p.y+p.h/2});Object.assign(b.game.hunt.field,{x:p.x+p.w+.04,y:f.y});
 const mp=a.game.gameClass.stats.mp;
 const result=useFieldPvpSkill({members:[a,b]},a,2,0,{now:NOW,force:true,random:()=>.5});
 assert.equal(result.reason,'pvp_line_of_sight');assert.equal(a.game.gameClass.stats.mp,mp);assert.equal(a.game.worldPvp?.flagUntil||0,0);
});

test('a healing skill restores the player and publishes its own non-damage effect',()=>{
 const s=fixture();changeClass(s,'priest');updateStats(s);s.game.gameClass.stats.hp=Math.floor(s.game.gameClass.stats.hp/2);
 const hp=s.game.gameClass.stats.hp,result=useHuntSkill(s,1,{now:NOW,random:()=>.5});
 assert.equal(result.ok,true);assert.ok(s.game.gameClass.stats.hp>hp);
 assert.equal(s.game.hunt.field.lastStrike.kind,'heal');assert.equal(s.game.hunt.field.lastStrike.targets.length,0);
});

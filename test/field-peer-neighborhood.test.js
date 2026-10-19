import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {enterHuntField,ensureHunt,moveHuntField} from '../functions/game/hunt/huntFight.js';
import {peerPosition,actorEntries} from '../functions/game/hunt/huntNeighborhood.js';
import {fieldPeers,useFieldPvpSkill} from '../functions/game/hunt/fieldPvp.js';
import {fieldPvpStatus} from '../functions/game/hunt/fieldPvpState.js';
import {getHuntState,getHuntDropForMiniApp} from '../miniapp/hunt.js';
import {visibleFieldPlayers} from '../webapp/hunt-visible-actors.js';
const NOW=1800000000000;
function fixture(zone='cruma-marshlands'){
 const chat={members:[]};
 for(const userId of [1,2]){
  const s={userId,userChatData:{user:{id:userId}},ownerDocument:()=>chat,game:{stats:{lvl:85,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
  changeClass(s,'mage');updateStats(s);assert.ok(enterHuntField(s,zone,{now:NOW,random:()=>.5}).ok);s.game.world={mode:'location',location:zone};ensureHunt(s,NOW,()=>.5);
  const f=s.game.hunt.field;for(const m of [...f.mobs,...Object.values(f.rooms).flatMap(r=>r.mobs||[])]){m.aggressive=false;m.aggro=false;m.aggroRange=0;m.nextAttackAt=NOW+1e12;}
  chat.members.push(s);
 }
 const [a,b]=chat.members,af=a.game.hunt.field,bf=b.game.hunt.field;
 Object.assign(af,{x:.96,y:.6});bf.rooms[bf.room]={mobs:bf.mobs};bf.mobs=bf.rooms.r0c1?.mobs||[];delete bf.rooms.r0c1;
 Object.assign(bf,{room:'r0c1',x:.04,y:.6});ensureHunt(b,NOW,()=>.5);
 return {chat,a,b};
}
test('nearby players use a common surface position while floor, instance, zone and dungeon boundaries remain separate',()=>{
 const {a,b}=fixture();assert.deepEqual(peerPosition(a,b),{x:1.04,y:.6});assert.equal(b.game.hunt.field.x,.04);
 for(const mutate of [()=>b.game.hunt.field.floor=2,()=>b.game.world.instanceId='private',()=>b.game.hunt.zone='hellbound',()=>b.game.hunt.field.room='r2c3']){
  const old=JSON.parse(JSON.stringify(b.game));mutate();assert.equal(peerPosition(a,b),null);b.game=old;
 }
 const dungeon=fixture('catacomb-branded');assert.equal(peerPosition(dungeon.a,dungeon.b),null);
});
test('presence excludes hidden, bot, absent and far peers, and DTO projects only the viewer coordinates',async()=>{
 const {chat,a,b}=fixture();assert.deepEqual(fieldPeers(chat,a,NOW),[b]);
 const dto=await getHuntState(a,NOW,fieldPeers(chat,a,NOW));assert.equal(dto.players[0].x,1.04);assert.equal(b.game.hunt.field.x,.04);
 b.isHided=true;assert.deepEqual(fieldPeers(chat,a,NOW),[]);delete b.isHided;
 b.userChatData.user.is_bot=true;assert.deepEqual(fieldPeers(chat,a,NOW),[]);delete b.userChatData.user.is_bot;
 b.game.hunt.field.seenAt=NOW-20001;assert.deepEqual(fieldPeers(chat,a,NOW),[]);
});
test('cross-cell PvP preserves force and flag rules, CP absorption and canonical target coordinates',()=>{
 const {chat,a,b}=fixture(),mp=a.game.gameClass.stats.mp,cp=b.game.gameClass.stats.cp;
 a.game.gameClass.skills[0].cooldown=3;
 assert.equal(useFieldPvpSkill(chat,a,2,0,{now:NOW}).reason,'pvp_force_required');assert.equal(a.game.gameClass.stats.mp,mp);
 const hit=useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true,random:()=>.5});assert.equal(hit.ok,true);assert.ok(hit.cpLost>0);
 assert.equal(b.game.gameClass.stats.cp,cp-hit.cpLost);assert.equal(fieldPvpStatus(a,NOW).status,'flagged');assert.equal(fieldPvpStatus(b,NOW).status,'neutral');
 assert.equal(b.game.hunt.field.x,.04);assert.equal(useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true}).reason,'cooldown');
});
test('surface PvP applies native skill range and both authoritative wall sets before spending resources',()=>{
 const {chat,a,b}=fixture(),mp=a.game.gameClass.stats.mp,cp=b.game.gameClass.stats.cp;
 b.game.hunt.field.x=.5;assert.equal(useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true}).reason,'pvp_out_of_range');
 b.game.hunt.field.x=.04;b.game.hunt.field.walls=[{x:0,y:.2,w:.02,h:.7}];
 assert.equal(useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true}).reason,'pvp_line_of_sight');
 assert.equal(a.game.gameClass.stats.mp,mp);assert.equal(b.game.gameClass.stats.cp,cp);
});
test('unknown surface skill geometry and different authoritative realms cannot bypass the boundary checks',()=>{
 const {chat,a,b}=fixture();a.game.gameClass.skills.push({name:'Unknown',needLvl:1,isDealDamage:true,cost:10,cooldown:2,damageModifier:1});
 assert.equal(useFieldPvpSkill(chat,a,2,a.game.gameClass.skills.length-1,{now:NOW,force:true}).reason,'combat_data_missing');
 for(const change of [()=>b.game.hunt.field.floor=2,()=>b.game.world.instanceId='other',()=>b.game.hunt.zone='other']){
  const before=JSON.parse(JSON.stringify(b.game));change();assert.equal(useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true}).reason,'pvp_not_here');b.game=before;
 }
});
test('a cross-cell PK is paid once and death cancels a queued crossing',()=>{
 const {chat,a,b}=fixture();assert.ok(moveHuntField(b,{x:-.1,y:.6},NOW).ok);assert.ok(b.game.hunt.field.crossing);
 b.game.gameClass.stats.cp=0;b.game.gameClass.stats.hp=1;
 const hit=useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true,random:()=>.5});assert.equal(hit.killed,true);assert.equal(hit.pk,true);
 assert.equal(a.game.worldPvp.pkKills,1);assert.equal(b.game.hunt.field.crossing,undefined);assert.equal(b.game.hunt.field.path.length,0);
 assert.equal(useFieldPvpSkill(chat,a,2,0,{now:NOW,force:true}).ok,false);assert.equal(a.game.worldPvp.pkKills,1);
});
test('peer payload and rendering are bounded, preserving a chosen player within the rendered subset',()=>{
 const {chat,a,b}=fixture();for(let i=3;i<=100;i++)chat.members.push({...b,userId:i,game:{...b.game,hunt:{...b.game.hunt,field:{...b.game.hunt.field,x:(i%10)*.01+.01}}}});
 const peers=fieldPeers(chat,a,NOW);assert.equal(peers.length,48);
 const rows=peers.map(s=>({userId:s.userId,...peerPosition(a,s)})),selected=String(rows.at(-1).userId);
 for(const limit of [8,16]){const rendered=visibleFieldPlayers(rows,a.game.hunt.field,limit,selected);assert.equal(rendered.length,limit);assert.equal(String(rendered[0].userId),selected);}
});
test('neighbour drop preview resolves the same canonical NPC and refuses distant bank IDs',()=>{
 const {a}=fixture(),f=a.game.hunt.field,m=f.rooms.r0c1.mobs[0];assert.ok(m);
 const preview=getHuntDropForMiniApp(a,m.instanceId);assert.equal(preview.ok,true);assert.equal(preview.dropPreview.targetId,m.instanceId);
 const far={...m,instanceId:'outside-window'};f.rooms.r2c3={mobs:[far]};assert.equal(getHuntDropForMiniApp(a,far.instanceId).reason,'no_mob');
 assert.equal(actorEntries(a.game.hunt).filter(r=>r.mob.instanceId===m.instanceId).length,1);
});

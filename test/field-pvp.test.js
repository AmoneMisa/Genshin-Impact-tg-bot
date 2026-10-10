import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import {useFieldPvpSkill,fieldPeers,advanceFieldPvp} from '../functions/game/hunt/fieldPvp.js';
import {fieldPvpStatus,ensureFieldPvp,reduceHuntKarma,PVP_FLAG_MS} from '../functions/game/hunt/fieldPvpState.js';

const NOW=Date.now();
function fixture(){
 const members=[1,2].map(userId=>{
  const s={userId,userChatData:{user:{id:userId,first_name:`Hero ${userId}`}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
  changeClass(s,'mage');updateStats(s);enterHuntField(s,'catacomb-forbidden-path',{now:NOW,random:()=>.5});return s;
 });return {members,a:members[0],b:members[1]};
}
const attack=(chat,force=false,index=0)=>useFieldPvpSkill(chat,chat.a,chat.b.userId,index,{now:NOW,force,random:()=>.5});

test('neutral attack requires force, CP absorbs damage and only the attacker flags',()=>{
 const c=fixture(),cp=getCurrentCp(c.b),hp=getCurrentHp(c.b),mp=c.a.game.gameClass.stats.mp;
 assert.equal(attack(c).reason,'pvp_force_required');assert.equal(c.a.game.gameClass.stats.mp,mp);
 const r=attack(c,true);assert.equal(r.ok,true);assert.ok(r.cpLost>0);assert.equal(c.b.game.gameClass.stats.cp,cp-r.cpLost);assert.equal(c.b.game.gameClass.stats.hp,hp-r.hpLost);
 assert.equal(fieldPvpStatus(c.a,NOW).status,'flagged');assert.equal(fieldPvpStatus(c.b,NOW).status,'neutral');
 assert.equal(fieldPvpStatus(c.a,NOW+PVP_FLAG_MS).status,'neutral');
});
test('return fire flags the victim and killing a flagged player awards PvP',()=>{
 const c=fixture();attack(c,true);
 const response=useFieldPvpSkill(c,c.b,c.a.userId,0,{now:NOW,random:()=>.5});assert.equal(response.ok,true);
 assert.equal(fieldPvpStatus(c.b,NOW).status,'flagged');
 c.a.game.gameClass.skills[0].cooldownReceive=0;c.b.game.gameClass.stats.cp=0;c.b.game.gameClass.stats.hp=1;
 const kill=attack(c);assert.equal(kill.killed,true);assert.equal(kill.pk,false);assert.equal(c.a.game.worldPvp.pvpKills,1);assert.equal(c.a.game.worldPvp.karma,0);
});
test('killing a white player gives PK, karma and a single respawn; red kills are lawful',()=>{
 const c=fixture();c.b.game.gameClass.stats.cp=0;c.b.game.gameClass.stats.hp=1;
 const kill=attack(c,true);assert.equal(kill.pk,true);assert.equal(kill.killed,true);
 assert.equal(fieldPvpStatus(c.a,NOW).status,'pk');assert.equal(c.a.game.worldPvp.pkKills,1);assert.equal(c.a.game.worldPvp.karma,300);
 assert.ok(c.b.game.respawnTime>NOW);assert.equal(c.b.game.hunt.field,null);
 assert.equal(attack(c,true).ok,false);assert.equal(c.a.game.worldPvp.pkKills,1);
 const lawful=fixture();ensureFieldPvp(lawful.b).karma=300;lawful.b.game.gameClass.stats.cp=0;lawful.b.game.gameClass.stats.hp=1;
 assert.equal(attack(lawful).killed,true);assert.equal(fieldPvpStatus(lawful.a,NOW).karma,0);assert.equal(fieldPvpStatus(lawful.a,NOW).status,'neutral');
});
test('server rejects distant, absent, hidden and self targets',()=>{
 const c=fixture();c.b.game.hunt.field.x=.1;c.b.game.hunt.field.y=.15;assert.equal(attack(c,true).reason,'pvp_out_of_range');
 c.b.game.hunt.zone='other';assert.equal(attack(c,true).reason,'pvp_not_here');
 c.b.isHided=true;assert.equal(attack(c,true).reason,'pvp_invalid_target');
 assert.equal(useFieldPvpSkill(c,c.a,c.a.userId,0).reason,'pvp_invalid_target');
});
test('resource, cooldown, stun and silence checks cannot be bypassed with PvP',()=>{
 const c=fixture();c.a.game.gameClass.skills[0].cooldown=3;attack(c,true);assert.equal(attack(c,true).reason,'cooldown');
 c.a.game.gameClass.skills[0].cooldownReceive=0;c.a.game.gameClass.stats.mp=0;assert.equal(attack(c,true).reason,'not_enough_resource');
 ensureFieldPvp(c.a).effects={stunUntil:NOW+1000};assert.equal(attack(c,true).reason,'pvp_stunned');
 c.a.game.worldPvp.effects={debuffs:[{kind:'mute',amount:1,until:NOW+1000}]};assert.equal(attack(c,true).reason,'pvp_silenced');
});
test('shield absorbs a hit before CP and HP',()=>{
 const c=fixture(),hp=getCurrentHp(c.b),cp=getCurrentCp(c.b);
 c.b.game.effects=[{name:'shield',value:1e9,time:0}];const r=attack(c,true);
 assert.equal(r.cpLost,0);assert.equal(r.hpLost,0);assert.equal(c.b.game.gameClass.stats.hp,hp);assert.equal(c.b.game.gameClass.stats.cp,cp);assert.ok(c.b.game.effects[0].value<1e9);
});
test('hostile debuffs persist on the victim and self buffs do not flag their caster',()=>{
 const c=fixture();c.a.game.gameClass.skills.push({name:'Stun',needLvl:1,cooldown:1,cost:0,debuff:{kind:'stun',seconds:5}});
 const hit=attack(c,true,c.a.game.gameClass.skills.length-1);assert.equal(hit.ok,true);assert.ok(c.b.game.worldPvp.effects.stunUntil>NOW);
 const response=useFieldPvpSkill(c,c.b,c.a.userId,0,{now:NOW,random:()=>.5});assert.equal(response.reason,'pvp_stunned');
 const restored=JSON.parse(JSON.stringify(c.b));assert.equal(restored.game.worldPvp.effects.stunUntil,c.b.game.worldPvp.effects.stunUntil);
 const peaceful=fixture();peaceful.a.game.gameClass.skills.push({name:'Guard',needLvl:1,cooldown:1,cost:0,isBuff:true,buffs:[{kind:'guard',amount:20,seconds:10}]});
 assert.equal(attack(peaceful,false,peaceful.a.game.gameClass.skills.length-1).ok,true);assert.equal(fieldPvpStatus(peaceful.a,NOW).status,'neutral');assert.ok(peaceful.a.game.effects.some(e=>e.name==='guard'));
});
test('SA damage over time credits the lethal source once and persists after a reload',()=>{
 const c=fixture();c.b.game.gameClass.stats.cp=3;c.b.game.gameClass.stats.hp=2;
 ensureFieldPvp(c.b).effects={soulDots:[{userId:c.a.userId,damage:10,nextAt:NOW,until:NOW+6000}]};
 const restored=JSON.parse(JSON.stringify(c));assert.equal(advanceFieldPvp(restored,NOW),true);
 assert.equal(restored.members[1].game.gameClass.stats.hp,0);assert.equal(restored.members[0].game.worldPvp.pkKills,1);
 assert.equal(advanceFieldPvp(restored,NOW+3000),false);assert.equal(restored.members[0].game.worldPvp.pkKills,1);
});
test('presence only exposes alive players in the same zone; karma requires rewarded PvE',()=>{
 const c=fixture();assert.equal(fieldPeers(c,c.a,NOW).length,1);assert.equal(fieldPeers(c,c.a,NOW+20001).length,0);
 c.b.game.gameClass.stats.hp=0;assert.equal(fieldPeers(c,c.a,NOW).length,0);
 ensureFieldPvp(c.a).karma=30;assert.equal(reduceHuntKarma(c.a,{exp:0}),0);assert.equal(reduceHuntKarma(c.a,{exp:1}),25);assert.equal(reduceHuntKarma(c.a,{exp:1}),5);
});
test('killing a red (karma) player counts as a PvP kill; SA effects wear off once the victim left the field',()=>{
 const c=fixture();ensureFieldPvp(c.b).karma=300;c.b.game.gameClass.stats.cp=0;c.b.game.gameClass.stats.hp=1;
 assert.equal(attack(c).killed,true);assert.equal(c.a.game.worldPvp.pvpKills,1);assert.equal(c.a.game.worldPvp.pkKills||0,0);
 const d=fixture();d.b.game.gameClass.stats.cp=0;d.b.game.gameClass.stats.hp=2;
 ensureFieldPvp(d.b).effects={soulDots:[{userId:d.a.userId,damage:10,nextAt:NOW,until:NOW+6000}]};
 d.b.game.hunt.field=null;
 assert.equal(advanceFieldPvp(d,NOW),true);assert.equal(d.b.game.gameClass.stats.hp,2);
 assert.deepEqual(d.b.game.worldPvp.effects.soulDots,[]);assert.equal(d.a.game.worldPvp?.pkKills||0,0);
});

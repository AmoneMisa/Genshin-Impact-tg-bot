import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import {setHotbar,getHotbar} from '../functions/game/player/hotbar.js';
import {useCpPotion} from '../functions/game/player/cpPotions.js';
import {huntSuppliesDto,setHuntSupplies,advanceAutoSupplies} from '../miniapp/huntSupplies.js';
import {hotbar} from '../webapp/boss-hud.js';
import {aggroNearby,provokeMob} from '../functions/game/hunt/huntAi.js';
import npcAi from '../template/l2NpcAi.js';

const NOW=1800000000000;
function hero(){
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80},inventory:{materials:{l2_5591:5,l2_5592:5},potions:{items:[{type:'hp',bottleType:'potion',size:'little',power:1000,count:3,name:'Tiny HP Potion'},{type:'mp',bottleType:'potion',size:'little',power:180,count:3,name:'Tiny MP Potion'}]},equipment:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);s.game.hunt={field:{seenAt:NOW}};return s;
}
test('mixed skill/action shortcuts persist in order and render as actionable slots',()=>{
 const s=hero();assert.equal(setHotbar(s,[1,'action:trade','action:attack','action:next-target','action:trade','action:evil']).ok,true);
 assert.deepEqual(getHotbar(JSON.parse(JSON.stringify(s))),[1,'action:trade','action:attack','action:next-target']);
 const html=hotbar([{index:1,name:'Skill',canUse:true}],{chosen:getHotbar(s),slotCount:16,actions:{'action:trade':'<button data-trade>Trade</button>','action:attack':'<button data-attack>Attack</button>','action:next-target':'<button data-next-target>Next</button>'}});
 assert.match(html,/data-trade/);assert.match(html,/data-attack/);assert.match(html,/data-next-target/);
 assert.equal((html.match(/empty-slot/g)||[]).length,12);
 assert.match(hotbar([{index:0,name:'Attack',canUse:true}],{chosen:['action:attack']}),/data-skill="0"/,'raid HUD keeps its existing Attack skill when the hunt shortcut is saved');
});
test('native CP potions check inventory, full CP, death and their own 500 ms reuse',()=>{
 const s=hero(),stats=s.game.gameClass.stats;stats.cp=0;
 assert.equal(useCpPotion(s,'l2_5591',NOW).restored,50);
 assert.equal(useCpPotion(s,'l2_5591',NOW+499).reason,'cooldown');
 assert.equal(s.game.inventory.materials.l2_5591,4);
 assert.equal(useCpPotion(s,'l2_5592',NOW).restored,200);
 assert.equal(useCpPotion(s,'l2_5591',NOW+500).ok,true);
 stats.hp=0;assert.equal(useCpPotion(s,'l2_5592',NOW+1000).reason,'player_dead');
});
test('ACP is opt-in per bottle, validates settings and stops on stale presence or death',()=>{
 const s=hero(),stats=s.game.gameClass.stats;stats.cp=0;
 assert.equal(huntSuppliesDto(s).enabled,false);assert.equal(advanceAutoSupplies(s,NOW),false);
 assert.equal(setHuntSupplies(s,{enabled:true,slot:'cp-small',active:true,threshold:70}).ok,true);
 assert.equal(setHuntSupplies(s,{threshold:100}).ok,false);assert.equal(setHuntSupplies(s,{slot:'arbitrary',active:true}).ok,false);
 assert.equal(advanceAutoSupplies(s,NOW),true);assert.equal(s.game.inventory.materials.l2_5591,4);
 assert.equal(advanceAutoSupplies(s,NOW+100),false);
 assert.equal(advanceAutoSupplies(s,NOW+6000),false,'no catch-up after closing');
 stats.hp=0;assert.equal(advanceAutoSupplies(s,NOW+1000),false);
});
test('automatic HP does not keep consuming bottles while a healing effect is active',()=>{
 const s=hero();s.game.gameClass.stats.hp=1;
 setHuntSupplies(s,{enabled:true,slot:'hp',active:true,threshold:70});
 assert.equal(advanceAutoSupplies(s,NOW),true);
 assert.equal(s.game.inventory.potions.items[0].count,2);
 assert.equal(advanceAutoSupplies(s,NOW+2000),false);
 assert.equal(s.game.inventory.potions.items[0].count,2);
});
test('aggression uses NPC radius and social help requires a matching clan, range and visibility',()=>{
 assert.equal(npcAi['20576'].aggressive,false);assert.deepEqual(npcAi['20576'].clans,['OEL_MAHUM']);
 const actor=extra=>({aiSourceVersion:1,currentHp:100,attackMs:1000,aggro:false,x:.5,y:.5,socialClans:['A'],socialIgnoredIds:[],clanHelpRange:300,...extra});
 const target=actor({mobId:'1'}),friend=actor({x:.55}),stranger=actor({x:.52,socialClans:['B']}),far=actor({x:.9}),ignored=actor({x:.51,socialIgnoredIds:['1']});
 const hunt={field:{x:.5,y:.8,walls:[],mobs:[target,friend,stranger,far,ignored]}};
 provokeMob(hunt,target,NOW);assert.deepEqual(hunt.field.mobs.map(m=>m.aggro),[true,true,false,false,false]);
 target.aggro=false;target.aggressive=true;target.aggroRange=500;
 aggroNearby(hunt,NOW);assert.equal(target.aggro,false);
 hunt.field.y=.7;aggroNearby(hunt,NOW);assert.equal(target.aggro,true);
 target.aggro=false;hunt.field.walls=[{x:.4,y:.59,w:.2,h:.03}];aggroNearby(hunt,NOW);assert.equal(target.aggro,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import {castRevival} from '../functions/game/player/revival.js';
import {respawnWorld} from '../functions/game/world/death.js';
import {regenerateResource} from '../functions/game/player/resourceRegen.js';
import {ONLINE_WINDOW_MS} from '../functions/game/player/onlinePresence.js';
const NOW=Date.now();
function hero(id=1,name='warrior') {
 const s={userId:id,userChatData:{user:{id,first_name:'Hero'}},game:{stats:{lvl:80},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,lastSeenAt:NOW}};
 changeClass(s,name);updateStats(s);return s;
}
test('resurrection always gives 60 percent HP, 30 percent MP and zero CP',()=>{
 const caster=hero(1,'bishop'),target=hero(2);const chat={members:[caster,target]};for(const h of chat.members)h.ownerDocument=()=>chat;
 target.game.hpPotion={amount:1000,delivered:0,startedAt:NOW-5000};target.game.gameClass.stats.hp=0;target.game.gameClass.stats.mp=getMaxMp(target);target.game.gameClass.stats.cp=getMaxCp(target);target.game.respawnTime=NOW+60000;
 assert.equal(castRevival(caster,1016,2,{now:NOW}).ok,true);
 assert.equal(target.game.gameClass.stats.hp,Math.round(getMaxHp(target)*.6));
 assert.equal(target.game.gameClass.stats.mp,Math.round(getMaxMp(target)*.3));
 assert.equal(target.game.hpPotion,undefined);assert.equal(target.game.gameClass.stats.cp,0);assert.equal(target.game.respawnTime,0);
});
test('return to town starts at exactly one HP, without giving CP',()=>{
 const h=hero();h.game.world={mode:'location',city:'dion',path:[]};h.game.gameClass.stats.hp=0;
 assert.equal(respawnWorld(h,'city',null,[],NOW).ok,true);
 assert.equal(h.game.world.mode,'city');assert.equal(h.game.gameClass.stats.hp,1);
 assert.equal(h.game.gameClass.stats.cp,0);assert.equal(h.game.gameClass.stats.mp,Math.round(getMaxMp(h)*.3));
});
test('online resources regenerate per tick and remain capped at their maxima',()=>{
 const h=hero(),stats=h.game.gameClass.stats;Object.assign(stats,{hp:1,mp:0,cp:0,hpRestoreSpeed:10,mpRestoreSpeed:10,cpRestoreSpeed:10});
 for(const kind of ['hp','mp','cp']) {assert.equal(regenerateResource(h,kind,NOW),true);assert.ok(stats[kind]>0);}
 Object.assign(stats,{hp:getMaxHp(h),mp:getMaxMp(h),cp:getMaxCp(h)});
 for(const kind of ['hp','mp','cp'])assert.equal(regenerateResource(h,kind,NOW),false);
});
test('offline and dead heroes do not regenerate; rejoining does not accumulate missed ticks',()=>{
 const h=hero(),stats=h.game.gameClass.stats;Object.assign(stats,{hp:1,mp:0,cp:0,hpRestoreSpeed:10,mpRestoreSpeed:10,cpRestoreSpeed:10});
 h.game.lastSeenAt=NOW-ONLINE_WINDOW_MS-1;
 for(const kind of ['hp','mp','cp'])assert.equal(regenerateResource(h,kind,NOW),false);
 assert.deepEqual([stats.hp,stats.mp,stats.cp],[1,0,0]);
 h.game.lastSeenAt=NOW;regenerateResource(h,'hp',NOW);assert.equal(stats.hp,11);
 stats.hp=0;for(const kind of ['hp','mp','cp'])assert.equal(regenerateResource(h,kind,NOW),false);
 h.game.lastSeenAt=undefined;stats.hp=1;assert.equal(regenerateResource(h,'hp',NOW),false);
});

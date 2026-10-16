import test from 'node:test';
import assert from 'node:assert/strict';
import {huntDropGroups} from '../functions/game/hunt/dropGroups.js';
import {targetCon,shortMobName} from '../webapp/combat-target.js';
import {getShotsState,armShots,setAutoShots,clearShots} from '../functions/game/shots/shots.js';
import {getHuntDropForMiniApp,setAutoShotsForMiniApp} from '../miniapp/hunt.js';
import {customPartRows} from '../functions/game/equipment/customDrops.js';
import {dropPreviewHtml} from '../webapp/loot-notice.js';
import {enterHuntField} from '../functions/game/hunt/huntFight.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

test('target con colours cover every classic three-level boundary without showing numbers',()=>{
 const expected=new Map([[-10,'blue'],[-9,'blue'],[-8,'light-blue'],[-6,'light-blue'],[-5,'green'],[-3,'green'],[-2,'white'],[0,'white'],[2,'white'],[3,'yellow'],[5,'yellow'],[6,'pink'],[8,'pink'],[9,'red'],[10,'red']]);
 for(const [diff,color] of expected)assert.equal(targetCon(50+diff,50),color);
 assert.equal(shortMobName('123456789012345678'),'123456789012345678');
 assert.equal(shortMobName('1234567890123456789'),'12345678901234567…');
 assert.equal(Array.from(shortMobName('🐺'.repeat(25))).length,18);
});
test('drop category probabilities use actual independent rolls and conditional probabilities',()=>{
 const drops=[{key:'a',kind:'material',chance:50,min:1,max:3,name:'A'},{key:'b',kind:'material',chance:20,min:2,max:2,name:'B'}];
 const [group]=huntDropGroups(drops);
 assert.equal(group.chance,60);assert.ok(Math.abs(group.items[0].withinGroupChance-100*5/6)<1e-10);
 assert.ok(Math.abs(group.items[1].withinGroupChance-100/3)<1e-10);
 assert.deepEqual([group.items[0].min,group.items[0].max],[1,3]);
 assert.deepEqual(drops[0],{key:'a',kind:'material',chance:50,min:1,max:3,name:'A'},'grouping never mutates the reward source');
});
test('exclusive custom outcomes are one event; rated rows show guaranteed and possible quantities',()=>{
 const [group]=huntDropGroups([{key:'a',kind:'full',chance:10,rollGroup:'custom',min:1,max:1},{key:'b',kind:'full',chance:20,rollGroup:'custom',min:1,max:1},{key:'c',kind:'full',chance:50,min:1,max:1}]);
 assert.ok(Math.abs(group.chance-65)<1e-10);
 const [rated]=huntDropGroups([{key:'a',kind:'material',chance:350,min:2,max:4},{key:'b',kind:'material',chance:0,min:1,max:1}]);
 assert.equal(rated.chance,100);assert.deepEqual([rated.items[0].min,rated.items[0].max],[6,16]);
 assert.equal(rated.items[1].withinGroupChance,0);
 const [zero]=huntDropGroups([{key:'a',kind:'material',chance:0,min:1,max:1}]);
 assert.equal(zero.chance,0);assert.equal(zero.items[0].withinGroupChance,0);
});
function hero(){
 const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80},inventory:{materials:{soulshot_S:100,blessedshot_S:100},equipment:{items:[]},potions:{items:[]}},effects:[],builds:{},equipmentStats:{}}};
 changeClass(s,'humanFighter');updateStats(s);
 s.game.equipmentStats.weapon={mainType:'weapon',isFilled:true,grade:'S84'};return s;
}
test('two shot modes share one exclusive server selection, use S charges and reject unknown kinds',()=>{
 const s=hero(),physical={isDealDamage:true,damageType:'physical'},magic={isDealDamage:true,damageType:'magic'};
 assert.deepEqual(getShotsState(s).kinds.map(k=>k.id),['soulshot','blessed']);
 assert.equal(getShotsState(s).grade,'S');
 setAutoShots(s,true,'soulshot');assert.equal(armShots(s,physical).kind,'soulshot');clearShots(s);assert.equal(armShots(s,magic),null);
 setAutoShots(s,true,'blessed');assert.equal(armShots(s,physical),null);assert.equal(armShots(s,magic).kind,'blessed');clearShots(s);
 assert.equal(setAutoShotsForMiniApp(s,true,'spiritshot').ok,false);assert.equal(getShotsState(s).selected,'blessed');
 setAutoShots(s,false,'blessed');assert.equal(armShots(s,magic),null);
});
test('selected-target preview is on demand, retains full name and uses real item quantities and art',()=>{
 const s=hero();enterHuntField(s,'catacomb-forbidden-path',{random:()=>.5});
 const target=s.game.hunt.field.mobs[0],before=JSON.stringify(s.game.inventory);
 const result=getHuntDropForMiniApp(s,target.instanceId);
 assert.equal(result.ok,true);assert.equal(result.dropPreview.name,target.name);assert.ok(result.dropPreview.groups.length);
 assert.equal(JSON.stringify(s.game.inventory),before);
 assert.equal(getHuntDropForMiniApp(s,'forged:target').ok,false);
 const html=dropPreviewHtml(result.dropPreview);assert.match(html,/Количество:/);assert.match(html,/Шанс группы:/);assert.match(html,/В группе:/);assert.match(html,/<img/);assert.doesNotMatch(html,/undefined|NaN/);
 const rows=customPartRows(80,'humanFighter');assert.ok(Math.abs(rows.reduce((sum,r)=>sum+r.share,0)-1)<1e-10);
});

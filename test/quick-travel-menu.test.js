import test from 'node:test';import assert from 'node:assert/strict';
import {quickTravelDestinations,QUICK_TRAVEL_LEVELS} from '../webapp/quick-travel-menu.js';
const state={player:{city:'giran',mode:'city'},cities:[{id:'giran',name:'Гиран'},{id:'aden',name:'Аден'}],locations:[{id:'low',name:'Low',region:'giran',levelMin:1,levelMax:19},{id:'high',name:'High',region:'aden',levelMin:80,levelMax:85},{id:'catacomb-witch',name:'Катакомбы',region:'aden',levelMin:60,levelMax:70},{id:'instance',name:'Instance',instance:{},levelMin:20}],quickTravel:{cities:[{id:'giran',gold:60000},{id:'aden',gold:60000}],locations:[{id:'low',gold:27000},{id:'high',gold:30000},{id:'catacomb-witch',gold:40000},{id:'instance',gold:90000}]}};
test('towns, hunting fields and catacombs are separate and include all regions',()=>{
 assert.deepEqual(quickTravelDestinations(state,'cities').map(q=>q.id),['aden']);
 assert.deepEqual(quickTravelDestinations(state,'hunting').map(q=>q.id),['low','high']);
 assert.deepEqual(quickTravelDestinations(state,'catacombs').map(q=>q.id),['catacomb-witch']);
 assert.equal(quickTravelDestinations(state,'hunting')[1].gold,30000);
});
test('hunting level sections partition destinations without duplicates or missing places',()=>{
 const ids=QUICK_TRAVEL_LEVELS.filter(b=>b.min).flatMap(b=>quickTravelDestinations(state,'hunting',b.id).map(q=>q.id));
 assert.deepEqual(ids,['low','high']);assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(quickTravelDestinations(state,'hunting','76').map(q=>q.id),['high']);
});
test('active quest objectives stay visible when only their native walking route is available',()=>{
 const target={id:'low:1',location:'low',name:'Quest monster'},s={...state,questTargets:[target],nativeWalk:{low:{enabled:true}},quickTravel:{...state.quickTravel,locations:[]}};
 const [row]=quickTravelDestinations(s,'quests');assert.equal(row.id,target.id);assert.equal(row.location,'low');assert.equal(row.kind,'quest');assert.equal(row.gold,null);assert.ok(row.walkingOnly&&row.unavailable);
 assert.deepEqual(quickTravelDestinations({...s,questTargets:[]},'quests'),[]);
 assert.deepEqual(quickTravelDestinations({...s,nativeWalk:{}},'quests'),[]);
});
test('a paid quest destination is listed once when a walking route also exists',()=>{
 const s={...state,questTargets:[{id:'low:1',location:'low',name:'Quest monster'}],nativeWalk:{low:{enabled:true}}};
 const rows=quickTravelDestinations(s,'quests');assert.equal(rows.length,1);assert.equal(rows[0].gold,27000);assert.ok(!rows[0].unavailable);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {transferStock} from '../miniapp/itemTransfer.js';
import {moveWarehouse,warehouseDto} from '../miniapp/warehouse.js';
import {actTrade,tradeState,TRADE_MS} from '../miniapp/trade.js';
const item=()=>({uid:'blade',name:'Arcana Mace',mainType:'weapon',grade:'S',enchant:7,sa:{type:'Acumen',level:13},augmentation:{skill:'Heal'},attribute:{fire:150}});
const player=id=>({userId:id,game:{inventory:{gold:100,equipment:{items:[]},materials:{iron:10},potions:{items:[]}}}});
const request=(kind,ref,count=1)=>({kind,ref,count});
test('personal warehouse preserves equipment upgrades and prevents equipped transfers',()=>{
 const p=player(1),original=item();p.game.inventory.equipment.items.push(original);
 assert.equal(moveWarehouse(p,null,{scope:'character',direction:'deposit',...request('equipment','blade')}).ok,true);
 assert.deepEqual(p.game.warehouse.equipment.items[0],original);
 assert.equal(p.game.inventory.equipment.items.length,0);
 assert.equal(moveWarehouse(p,null,{scope:'character',direction:'withdraw',...request('equipment','blade')}).ok,true);
 assert.deepEqual(p.game.inventory.equipment.items[0],original);
 p.game.inventory.equipment.items[0].isUsed=true;
 assert.equal(moveWarehouse(p,null,{direction:'deposit',...request('equipment','blade')}).ok,false);
});
test('all clan members deposit; only leader and first two co-leaders withdraw',()=>{
 const clan={owner:1,members:[{userId:1,role:'owner'},{userId:2,role:'officer'},{userId:3,role:'officer'},{userId:4,role:'member'},{userId:5,role:'officer'}],warehouse:{gold:100}};
 for(const id of [1,2,3,4,5]){
  const p=player(id);
  assert.equal(moveWarehouse(p,clan,{scope:'clan',direction:'deposit',...request('currency','gold',10)}).ok,true);
  assert.equal(warehouseDto(p,clan,'clan').canWithdraw,id<=3);
  assert.equal(moveWarehouse(p,clan,{scope:'clan',direction:'withdraw',...request('currency','gold',1)}).ok,id<=3);
 }
 assert.equal(moveWarehouse(player(6),clan,{scope:'clan',direction:'deposit',...request('currency','gold')}).ok,false);
 assert.equal(clan.warehouse.history.length,8);
});
test('invalid counts, overflowing destinations, duplicate equipment and capacity leave stocks unchanged',()=>{
 for(const target of [{gold:Number.MAX_SAFE_INTEGER},{gold:'3'},{gold:-1}]){
  const source={gold:10};const before=structuredClone([source,target]);
  assert.equal(transferStock(source,target,request('currency','gold')).ok,false);assert.deepEqual([source,target],before);
 }
 assert.equal(transferStock({gold:10},{},request('currency','gold',1.5)).ok,false);
 assert.equal(transferStock({gold:10},{materials:{iron:1}},request('currency','gold'),{limit:1}).reason,'warehouse_full');
 assert.equal(transferStock({equipment:{items:[item()]}},{equipment:{items:[item()]}},request('equipment','blade')).reason,'duplicate_item');
});
test('potion and material stacks merge without duplicating counts',()=>{
 const source={materials:{iron:10},potions:{items:[{id:'heal',count:5}]}},target={materials:{iron:2},potions:{items:[{id:'heal',count:1}]}};
 assert.equal(transferStock(source,target,request('material','iron',4)).ok,true);
 assert.equal(transferStock(source,target,request('potion','heal',3)).ok,true);
 assert.equal(source.materials.iron,6);assert.equal(target.materials.iron,6);
 assert.equal(source.potions.items[0].count,2);assert.equal(target.potions.items[0].count,4);
});
test('clan storage rejects augmented equipment; personal storage still accepts it and legacy items can be withdrawn',()=>{
 for(const field of ['augment','augmentation']){
  const p=player(1),equipment=item();delete equipment.augmentation;equipment[field]={name:'attack',value:0.05};p.game.inventory.equipment.items.push(equipment);
  const clan={owner:1,members:[{userId:1,role:'owner'}],warehouse:{}};
  const body={scope:'clan',direction:'deposit',...request('equipment','blade')},before=structuredClone([p,clan]);
  assert.equal(warehouseDto(p,clan,'clan').inventory.some(r=>r.ref==='blade'),false);
  assert.equal(moveWarehouse(p,clan,body).reason,'augmented_item');assert.deepEqual([p,clan],before);
  assert.equal(moveWarehouse(p,null,{...body,scope:'character'}).ok,true);
  clan.warehouse={equipment:{items:[equipment]}};
  assert.equal(moveWarehouse(p,clan,{...body,direction:'withdraw'}).ok,true);
 }
});
function setup(){const chat={members:[player(1),player(2),player(3)],game:{}};actTrade(chat,1,{action:'request',targetId:2},1000);const t=chat.game.trades[0];actTrade(chat,2,{action:'join',id:t.id},1001);return {chat,t};}
const act=(chat,t,id,action,extra={},now=1002)=>actTrade(chat,id,{id:t.id,revision:t.revision,action,...extra},now);
test('trade requires both confirmations, resets them on changes and completes once',()=>{
 const {chat,t}=setup();chat.members[0].game.inventory.equipment.items.push(item());
 assert.equal(act(chat,t,1,'offer',{items:[request('equipment','blade')]}).ok,true);
 assert.equal(act(chat,t,1,'confirm').ok,true);
 assert.equal(chat.members[0].game.inventory.equipment.items.length,1);
 assert.equal(act(chat,t,2,'offer',{items:[request('currency','gold',20)]}).ok,true);
 assert.deepEqual(t.accepted,{});
 assert.equal(act(chat,t,2,'confirm').ok,true);
 assert.equal(act(chat,t,1,'confirm').completed,true);
 assert.deepEqual(chat.members[1].game.inventory.equipment.items[0],item());
 assert.equal(chat.members[0].game.inventory.gold,120);assert.equal(chat.members[1].game.inventory.gold,80);
 assert.equal(act(chat,t,1,'confirm').reason,'trade_closed');
});
test('outsiders, stale revisions, malformed offers and changed equipment cannot complete trades',()=>{
 const {chat,t}=setup();chat.members[0].game.inventory.equipment.items.push(item());
 assert.equal(act(chat,t,3,'cancel').ok,false);
 assert.equal(act(chat,t,1,'offer',{items:[null]}).ok,false);
 act(chat,t,1,'offer',{items:[request('equipment','blade')]});
 assert.equal(actTrade(chat,1,{action:'confirm',id:t.id,revision:0},1002).reason,'trade_changed');
 assert.equal('fingerprint' in tradeState(chat,1,1002).trade.offers[1][0],false);
 chat.members[0].game.inventory.equipment.items[0].enchant++;
 assert.equal(act(chat,t,2,'confirm').reason,'trade_items_changed');
 assert.equal(chat.members[1].game.inventory.equipment.items.length,0);
});
test('reserved gold of either participant is protected and a failed transfer rolls back',()=>{
 const {chat,t}=setup();act(chat,t,2,'offer',{items:[request('currency','gold',20)]});
 chat.game.points={players:{2:{}},gameSessionLastUpdateAt:1002};
 assert.equal(act(chat,t,1,'confirm').reason,'in_table_game');
 delete chat.game.points;
 act(chat,t,1,'confirm');chat.members[0].game.inventory.gold=Number.MAX_SAFE_INTEGER;
 const before=structuredClone(chat.members);
 assert.equal(act(chat,t,2,'confirm').ok,false);assert.deepEqual(chat.members,before);
});
test('cancelled and expired trades never move possessions; busy players cannot open another',()=>{
 const {chat,t}=setup();act(chat,t,1,'offer',{items:[request('currency','gold',20)]});
 assert.equal(actTrade(chat,3,{action:'request',targetId:1},1002).reason,'trade_busy');
 assert.equal(act(chat,t,1,'confirm',{},1000+TRADE_MS).reason,'trade_closed');
 assert.equal(chat.members[0].game.inventory.gold,100);
 assert.equal(act(chat,t,2,'cancel').ok,true);
 assert.equal(act(chat,t,1,'confirm').reason,'trade_closed');
});

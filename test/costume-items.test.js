import test from 'node:test';
import assert from 'node:assert/strict';
import {COSTUME_CATALOG,COSTUME_REWARD_IDS} from '../template/costumeCatalog.js';
import {buyShopItem,getShopState} from '../miniapp/shop.js';
import {makeCostumeItem,activeCostume,reconcileCostumeSlot} from '../functions/game/equipment/costumeItems.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import {getEquipmentState,performEquipmentAction} from '../miniapp/equipment.js';
import {expireTimedItems} from '../functions/game/equipment/timedItems.js';
import {transferStock,stockRows} from '../miniapp/itemTransfer.js';
import {grantRandomCostume} from '../miniapp/costumes.js';
import {claimBonus,BONUS_PRIZES} from '../miniapp/bonus.js';
import {openChest} from '../miniapp/chest.js';
import {createLot,buyLot,cancelLot,sellableItems} from '../miniapp/auction.js';
import {actMail,expirePlayerMail} from '../miniapp/mail.js';
import {fullBodyHeroUrl} from '../webapp/art/world-art.js';
const now=Date.now();
const player=(gender='male')=>({gender,userId:1,chestTries:1,game:{stats:{lvl:1},race:'elf',bonusChances:1,gameClass:{stats:{name:'elvenFighter'}},equipmentStats:{},inventory:{luckCoins:1000,gold:10000,equipment:{items:[]},potions:{items:[]},materials:{}}}});

test('all 61 costumes sell as physical items for 50–125 CoL, with matching gender only',async()=>{
 assert.equal(COSTUME_CATALOG.length,61);
 for(const c of COSTUME_CATALOG){
  assert.ok(c.cost>=50&&c.cost<=125);
  const s=player(c.gender),shop=getShopState(s);
  assert.ok(shop.categories.some(c=>c.id==='costumes'));
  assert.ok(shop.items.filter(i=>i.costumeId).every(i=>i.costumeGender===c.gender));
  const result=await buyShopItem(s,'costume:'+c.id,now);assert.equal(result.ok,true);
  const item=s.game.inventory.equipment.items[0];assert.equal(item.costumeId,c.id);
  assert.equal(item.timed,false);assert.deepEqual(item.slots,['costume']);assert.equal(item.tradeable,true);
  assert.equal(s.game.inventory.luckCoins,1000-c.cost);assert.equal(s.game.costumes,undefined);
  const wrong=player(c.gender==='female'?'male':'female');
  assert.equal((await buyShopItem(wrong,'costume:'+c.id)).reason,'costume_gender');
  assert.equal(wrong.game.inventory.luckCoins,1000);
 }
});
test('full bag and insufficient CoL never charge or grant',async()=>{
 const s=player();s.game.inventory.equipment.items=Array.from({length:80},()=>({}));
 assert.equal((await buyShopItem(s,'costume:midnight-formal')).reason,'inventory_full');
 assert.equal(s.game.inventory.luckCoins,1000);
 s.game.inventory.equipment.items=[];s.game.inventory.luckCoins=0;
 assert.equal((await buyShopItem(s,'costume:midnight-formal')).reason,'not_enough_coins');
 assert.equal(s.game.inventory.equipment.items.length,0);
});
test('both directions reject wrong-gender equip via the normal equipment action',()=>{
 for(const c of COSTUME_CATALOG){
  const s=player(c.gender==='female'?'male':'female'),item=makeCostumeItem(c.id);
  s.game.inventory.equipment.items.push(item);
  const row=getEquipmentState(s).items[0];assert.equal(row.canUse,false);
  assert.equal(performEquipmentAction(s,row.key,'equip').reason,'costume_gender');
  assert.equal(activeCostume(s),null);assert.equal(item.isUsed,false);
 }
});
test('costume slot replaces only costumes, preserves armor, updates race-specific appearance',()=>{
 const s=player(),a=makeCostumeItem('midnight-formal'),b=makeCostumeItem('off-duty-avenue');
 s.game.inventory.equipment.items.push(a,b);s.game.equipmentStats.up={uid:'armor'};
 assert.equal(equipItem(s,a),0);assert.equal(activeCostume(s).id,a.costumeId);
 assert.equal(equipItem(s,b),0);assert.equal(a.isUsed,false);assert.equal(b.isUsed,true);
 assert.equal(s.game.equipmentStats.up.uid,'armor');
 assert.match(fullBodyHeroUrl({race:'elf',gender:'male',costume:activeCostume(s)}),/off-duty-avenue-elf-male/);
 s.gender='female';reconcileCostumeSlot(s);assert.equal(activeCostume(s),null);assert.equal(b.isUsed,false);
 assert.equal(s.game.inventory.equipment.items.length,2);
});
test('ten prize costumes generate unique bound items for both genders at 24h and 7d boundaries',()=>{
 assert.equal(COSTUME_REWARD_IDS.length,10);
 for(const gender of ['male','female'])for(const days of [1,7])for(let index=0;index<5;index++){
  const s=player(gender),random=(min,max)=>min===1?days:index;
  const a=grantRandomCostume(s,{now,random}),b=grantRandomCostume(s,{now,random});
  assert.equal(a.gender,gender);assert.equal(a.expiresAt,now+days*86400000);assert.notEqual(a.uid,b.uid);
  assert.equal(s.game.inventory.equipment.items.length,2);
  const item=s.game.inventory.equipment.items[0];
  assert.equal(item.bound,true);assert.equal(item.noTrade,true);assert.equal(item.tradeable,false);
 }
});
test('wheel and chests grant costumes at 5%, consume once, preserve attempts on full bag',()=>{
 assert.equal(BONUS_PRIZES.reduce((sum,p)=>sum+p.chance,0),100);
 for(const source of ['wheel','chest'])for(const full of [false,true]){
  const s=player('female');if(full)s.game.inventory.equipment.items=Array.from({length:80},()=>({}));
  const result=source==='wheel'?claimBonus(s,{randomInt:()=>99,costumeRandom:min=>min,now}):openChest(s,1,1,{randomInt:()=>70,costumeRandom:min=>min,now});
  assert.equal(result.ok,!full);
  if(full){assert.equal(result.reason,'inventory_full');assert.equal(s.game.bonusChances,1);assert.equal(s.chestCounter||0,0);}
  else {assert.equal(result.prize.gender,'female');assert.equal(result.prize.expiresAt,now+86400000);}
 }
});
test('temporary costume cannot transfer and is unequipped and removed at expiration',()=>{
 const s=player(),item=makeCostumeItem('midnight-formal',{now,days:1}),target={};s.game.inventory.equipment.items.push(item);
 assert.equal(transferStock(s.game.inventory,target,{kind:'equipment',ref:item.uid,count:1}).ok,false);
 assert.equal(s.game.inventory.equipment.items.length,1);assert.deepEqual(target,{});
 assert.equal(equipItem(s,item),0);
 assert.equal(activeCostume(s,now+86400000),null);
 expireTimedItems(s,now+86400000);assert.equal(s.game.inventory.equipment.items.length,0);
 assert.equal(s.game.equipmentStats.costume,null);
 const expired=makeCostumeItem('midnight-formal',{now:now-2*86400000,days:1});
 target.equipment={items:[expired]};assert.equal(stockRows(target).length,0);
 assert.equal(transferStock(target,{}, {kind:'equipment',ref:expired.uid,count:1}).ok,false);
});
test('permanent costumes auction normally, while new and legacy temporary lots cannot sell',async()=>{
 const seller=player(),buyer=player('female');buyer.userId=2;
 const chat={chatId:1,members:[seller,buyer]};for(const s of chat.members)s.ownerDocument=()=>chat;
 const lots=new Map();const store={countActiveBySeller:async()=>0,create:async data=>{const lot={...data,id:'one'};lots.set('one',lot);return lot;},findById:async id=>lots.get(id),claim:async(id,from,to,extra)=>{const l=lots.get(id);if(l.status!==from)return null;Object.assign(l,{status:to,...extra});return l;}};
 const temporary=makeCostumeItem('midnight-formal',{now,days:1});
 seller.game.inventory.equipment.items.push(temporary);
 assert.equal((await createLot(seller,store,{kind:'equipment',ref:temporary.uid,count:1,price:100},now)).reason,'timed_item');
 Object.assign(temporary,{bound:false,noTrade:false,tradeable:true});
 assert.equal(sellableItems(seller).length,0);
 assert.equal((await createLot(seller,store,{kind:'equipment',ref:temporary.uid,count:1,price:100},now)).reason,'timed_item');
 seller.game.inventory.equipment.items=[];
 lots.set('old',{id:'old',kind:'equipment',payload:{item:temporary},status:'active',expiresAt:now+86400000,sellerId:1,price:100,view:{title:temporary.name}});
 assert.equal((await buyLot(buyer,store,'old',now+1)).reason,'item_unavailable');assert.equal(buyer.game.inventory.gold,10000);
 assert.equal((await cancelLot(seller,store,'old')).ok,true);
 assert.equal(seller.game.inventory.equipment.items[0].uid,temporary.uid);
 const item=makeCostumeItem('midnight-formal',{now});seller.game.inventory.equipment.items.push(item);
 const listed=await createLot(seller,store,{kind:'equipment',ref:item.uid,count:1,price:100},now);
 assert.equal(listed.ok,true);
 assert.equal((await buyLot(buyer,store,'one',now+1)).ok,true);
 const delivered=buyer.game.inventory.equipment.items[0];assert.equal(delivered.uid,item.uid);assert.equal(delivered.expiresAt,item.expiresAt);
 assert.equal(equipItem(buyer,delivered),5);
});
test('mail transfers permanent costume once, including COD',()=>{
 for(const type of ['regular','payment']){
  const sender=player(),receiver=player('female');receiver.userId=2;
  const chat={game:{},members:[sender,receiver]}, item=makeCostumeItem('midnight-formal',{now});sender.game.inventory.equipment.items.push(item);
  const result=actMail(chat,1,{action:'send',to:'2',title:'Costume',text:'Gift',type,price:type==='payment'?500:0,items:[{kind:'equipment',ref:item.uid,count:1}]},now);
  assert.equal(result.ok,true);
  const at=now+1,before=receiver.game.inventory.gold;
  const claim=actMail(chat,2,{action:'claim',id:result.id},at);
  assert.equal(claim.ok,true);assert.equal(receiver.game.inventory.gold,before-(type==='payment'?500:0));
  assert.equal(receiver.game.inventory.equipment.items[0].uid,item.uid);assert.equal(actMail(chat,2,{action:'claim',id:result.id},at).ok,false);
 }
});

test('timed and shadow items cannot transfer even with legacy tradeable flags',()=>{
 for(const flags of [{timed:true},{shadow:true},{timed:true,expiresAt:0}]){
  const s=player(),item={...makeCostumeItem('midnight-formal'),...flags,bound:false,noTrade:false,tradeable:true};
  s.game.inventory.equipment.items.push(item);const before=structuredClone(s.game.inventory);
  assert.equal(stockRows(s.game.inventory).length,1); // Only adena is available.
  assert.equal(transferStock(s.game.inventory,{}, {kind:'equipment',ref:item.uid,count:1}).ok,false);
  const receiver=player();receiver.userId=2;const chat={game:{},members:[s,receiver]};
  assert.equal(actMail(chat,1,{action:'send',to:'2',title:'Bound',text:'',type:'regular',items:[{kind:'equipment',ref:item.uid,count:1}]},now).ok,false);
  assert.deepEqual(s.game.inventory,before);
 }
});
test('legacy mailed timed costumes cannot be claimed or charged and return only to sender',()=>{
 for(const expiredMail of [false,true]){
  const sender=player(),receiver=player();receiver.userId=2;
  const item={...makeCostumeItem('midnight-formal',{now,days:1}),bound:false,noTrade:false,tradeable:true};
  const letter={id:'legacy',from:'1',to:'2',status:'pending',price:500,stock:{equipment:{items:[item]}},expiresAt:now+86400000};
  const chat={game:{playerMail:[letter]},members:[sender,receiver]};
  assert.equal(actMail(chat,2,{action:'claim',id:'legacy'},now).reason,'item_unavailable');
  assert.equal(receiver.game.inventory.gold,10000);assert.equal(receiver.game.inventory.equipment.items.length,0);
  if(expiredMail)assert.equal(expirePlayerMail(chat,letter.expiresAt),true);
  else assert.equal(actMail(chat,2,{action:'delete',id:'legacy'},now).ok,true);
  assert.equal(letter.status,'returned');assert.equal(sender.game.inventory.equipment.items[0].uid,item.uid);
  assert.equal(sender.game.inventory.equipment.items[0].bound,true);
  assert.equal(letter.stock.equipment.items.length,0);
 }
});

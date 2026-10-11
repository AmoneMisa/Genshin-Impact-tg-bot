import test from 'node:test';
import assert from 'node:assert/strict';
import {claimLoginReward,getLoginRewardsState,redeemLoginItem,dailyLoginReward,monthBoxPool,loginGrade} from '../functions/game/login/loginRewards.js';
import {loginPeriod,loginKey,shotCouponAmount,LOGIN_DAY_MS} from '../template/loginRewards.js';
import {SHOT_GRADES,shotKey} from '../template/shotsData.js';
import {getMaterialCount,materialInfo} from '../functions/game/player/materials.js';
import {enchantItem,crystallizeItem,blessedTypedKey} from '../functions/game/equipment/enchantItem.js';
import {expireTimedItems,grantTimedItem} from '../functions/game/equipment/timedItems.js';
import {findCatalogItem,instantiate} from '../functions/game/equipment/catalog.js';
import {attributeKey,addAttribute} from '../functions/game/equipment/attributes.js';
import {validateStock,stockRows,transferStock} from '../miniapp/itemTransfer.js';
import {sellableItems,createLot} from '../miniapp/auction.js';
import {gainExp} from '../functions/game/player/vitality.js';
import {forgeBonuses} from '../functions/game/builds/forgeBonuses.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import {installWeaponSa} from '../functions/game/equipment/soulCrystals.js';
import {getInventoryState,sellLoot,discardInventoryItem,useInventoryPotion} from '../miniapp/inventory.js';
import {personalBadges} from '../miniapp/notifications.js';
import {getCraftState} from '../miniapp/equipment.js';

const now=Date.parse('2026-10-01T00:00:00Z');
const hero=(level=76)=>({userId:42,ownerDocument:()=>({chatId:123}),game:{stats:{lvl:level,currentExp:0},equipmentStats:{},gameClass:{stats:{name:'humanWizard',hp:1000,maxHp:2000,mp:500,maxMp:1000},skills:[]},inventory:{gold:0,ancientAdena:0,fame:0,luckCoins:0,ironOre:0,materials:{},equipment:{items:[]},potions:{items:[]}}}});
const voucher=(s,kind,grade='S',count=1)=>{const key=loginKey(kind,grade);s.game.inventory.materials[key]=count;return key;};

test('calendar rolls at 03:00 Moscow, including year and leap-month boundaries',()=>{
    const before=loginPeriod(Date.parse('2026-09-30T23:59:59.999Z')),after=loginPeriod(now);
    assert.equal(before.month,'2026-09');assert.equal(before.day,30);assert.equal(before.nextResetAt,now);
    assert.equal(after.month,'2026-10');assert.equal(after.day,1);assert.equal(after.days,31);
    assert.equal(loginPeriod(Date.parse('2028-02-10T00:00:00Z')).days,29);
    assert.equal(loginPeriod(Date.parse('2027-02-10T00:00:00Z')).days,28);
    assert.equal(loginPeriod(Date.parse('2027-01-01T00:00:00Z')).month,'2027-01');
});
test('read-only calendar does not initialize counters or grant rewards',()=>{
    const s=hero(),before=structuredClone(s.game);const view=getLoginRewardsState(s,now);
    assert.deepEqual(s.game,before);assert.equal(view.canClaim,true);assert.equal(view.days.length,31);
    assert.equal(view.days[0].status,'today');assert.equal(view.days.at(-1).rewards[0].key,'login_box_S');
});
test('an open calendar from yesterday cannot claim another date silently',()=>{
    const s=hero();assert.equal(claimLoginReward(s,now,{month:'2026-09',day:30}).reason,'day_changed');assert.equal(s.game.loginRewards,undefined);
    assert.equal(claimLoginReward(s,now,{month:'2026-10',day:1}).ok,true);
});
test('one claim a day, no catching up, month reset preserves coupons and runes',()=>{
    const s=hero();assert.equal(claimLoginReward(s,now).ok,true);assert.equal(claimLoginReward(s,now).reason,'already_claimed');
    assert.equal(getMaterialCount(s,'login_shots_S'),1);assert.equal(claimLoginReward(s,now+2*LOGIN_DAY_MS).ok,true);
    const view=getLoginRewardsState(s,now+2*LOGIN_DAY_MS);assert.equal(view.days[1].status,'missed');
    s.game.loginRewards.runes={exp:now+100*LOGIN_DAY_MS};
    claimLoginReward(s,Date.parse('2026-11-01T00:00:00Z'));assert.deepEqual(s.game.loginRewards.claimed,[1]);
    assert.equal(s.game.loginRewards.runes.exp,now+100*LOGIN_DAY_MS);assert.equal(getMaterialCount(s,'login_shots_S'),2);
});
test('full bag rejects claim without recording the date',()=>{
    const s=hero();s.game.inventory.equipment.items=Array.from({length:80},()=>({}));
    assert.equal(claimLoginReward(s,now).reason,'inventory_full');assert.equal(s.game.loginRewards,undefined);
    s.game.inventory.equipment.items.pop();assert.equal(claimLoginReward(s,now).ok,true);
});
test('expired shadow items release inventory space before a login reward is granted',()=>{
    const s=hero();s.game.inventory.equipment.items=Array.from({length:80},()=>({timed:true,shadow:true,expiresAt:now-1,name:'Expired'}));
    assert.equal(claimLoginReward(s,now).ok,true);assert.equal(s.game.inventory.equipment.items.length,0);assert.equal(getMaterialCount(s,'login_shots_S'),1);
});
for(const [level,grade] of [[1,'noGrade'],[20,'D'],[40,'C'],[52,'B'],[61,'A'],[76,'S'],[80,'S80'],[84,'S84']])test(`grade ${grade}: calendar and coupon economy`,()=>{
    const s=hero(level);assert.equal(loginGrade(s),grade);claimLoginReward(s,now);
    const key=loginKey('shots',grade);s.game.stats.lvl=85;
    assert.equal(getLoginRewardsState(s,now).days[0].rewards[0].key,key,'received reward keeps its original grade');
    const choices=getLoginRewardsState(s,now).coupons.find(c=>c.key===key).choices;assert.equal(choices.length,24);
    for(const kind of ['soulshot','spiritshot','blessed'])for(const target of SHOT_GRADES)assert.ok(shotCouponAmount(grade,target,kind)>0);
    assert.equal(redeemLoginItem(s,key,`blessed:${grade}`,{now}).ok,true);
    assert.equal(getMaterialCount(s,shotKey('blessed',grade)),shotCouponAmount(grade,grade,'blessed'));
    assert.equal(getMaterialCount(s,`blessed_${grade}`),0);
});
test('S shot anchors and invalid choices preserve the voucher',()=>{
    assert.equal(shotCouponAmount('S','S','blessed'),60);assert.equal(shotCouponAmount('S','S','soulshot'),80);assert.equal(shotCouponAmount('S','S','spiritshot'),90);
    const s=hero(),key=voucher(s,'shots');assert.equal(redeemLoginItem(s,key,'__proto__',{now}).reason,'invalid_choice');assert.equal(getMaterialCount(s,key),1);
    assert.equal(shotCouponAmount('constructor','S','blessed'),0);
});
test('redeem can replace the last voucher slot but cannot overfill a bag',()=>{
    const s=hero(),key=voucher(s,'shots','S',2);s.game.inventory.equipment.items=Array.from({length:79},()=>({}));
    assert.equal(redeemLoginItem(s,key,'soulshot:S',{now}).reason,'inventory_full');assert.equal(getMaterialCount(s,key),2);
    s.game.inventory.materials[key]=1;assert.equal(redeemLoginItem(s,key,'soulshot:S',{now}).ok,true);
});
for(const grade of ['C','B','A'])for(const part of ['weapon','armor','jewelry'])test(`shadow ${grade} ${part}: choice, +6, expiry and restrictions`,()=>{
    const s=hero(85),key=voucher(s,`shadow_${part}`,grade),coupon=getLoginRewardsState(s,now).coupons[0];
    const choice=part==='jewelry'?'set':coupon.choices[0].id;
    assert.equal(redeemLoginItem(s,key,choice,{now}).ok,true);const items=s.game.inventory.equipment.items;
    assert.ok(items.length);if(part==='jewelry')assert.equal(items.length,5);
    for(const item of items){assert.equal(item.enchant,6);assert.equal(item.bound,true);assert.equal(item.expiresAt,now+7*LOGIN_DAY_MS);
        assert.equal(enchantItem(s,item).ok,false);assert.equal(crystallizeItem(s,item).ok,false);assert.equal(installWeaponSa(s,item,'bad').ok,false);
        assert.equal(validateStock(s.game.inventory,{kind:'equipment',ref:item.uid,count:1}).ok,false);}
    assert.equal(sellableItems(s).length,0);const count=items.length;assert.equal(expireTimedItems(s,now+7*LOGIN_DAY_MS).length,count);assert.equal(items.length,0);
});
test('low-level player keeps shadow coupon without starting a timer',()=>{
    const s=hero(20),key=voucher(s,'shadow_weapon','A');const before=structuredClone(s.game.inventory);
    assert.equal(redeemLoginItem(s,key,'A:weapon:mace',{now}).reason,'level_too_low');assert.deepEqual(s.game.inventory,before);
});
test('renting normal gear never extends login shadow copy',()=>{
    const s=hero(85),key=voucher(s,'shadow_weapon','C');redeemLoginItem(s,key,'C:weapon:mace',{now});
    const shadow=s.game.inventory.equipment.items[0],rented=grantTimedItem(s,shadow.id,7,now);
    assert.equal(rented.extended,false);assert.notEqual(rented.item.uid,shadow.uid);assert.equal(shadow.expiresAt,now+7*LOGIN_DAY_MS);
});
test('bound materials stay usable while stock, auction and sale reject them',async()=>{
    const s=hero();s.game.inventory.materials.bound_blessed_weapon_S=2;
    assert.equal(materialInfo('bound_blessed_weapon_S').bound,true);assert.equal(stockRows(s.game.inventory).length,0);
    assert.equal(validateStock(s.game.inventory,{kind:'material',ref:'bound_blessed_weapon_S',count:1}).ok,false);
    assert.equal(transferStock(s.game.inventory,hero().game.inventory,{kind:'material',ref:'bound_blessed_weapon_S',count:1}).ok,false);
    assert.equal(sellLoot(s,'bound_blessed_weapon_S').ok,false);
    const item=instantiate(findCatalogItem('S:weapon:mace'));s.game.inventory.equipment.items.push(item);
    assert.equal(enchantItem(s,item,{scroll:'blessedTyped'}).ok,true);assert.equal(item.enchant,1);assert.equal(getMaterialCount(s,'bound_blessed_weapon_S'),1);
    assert.equal(getInventoryState(s).equipment[0].scrolls.blessedTyped,1);
    const store={countActiveBySeller:async()=>0,create:async()=>{throw Error('bound item must not reach auction store');}};
    assert.equal((await createLot(s,store,{kind:'material',ref:'bound_blessed_weapon_S',count:1,price:1},now)).reason,'item_unavailable');
    const coupon=voucher(s,'shots');assert.equal((await createLot(s,store,{kind:'material',ref:coupon,count:1,price:1},now)).reason,'item_unavailable');
});
test('bound attribute stones are counted and spent before regular stones',()=>{
    const s=hero(),item=instantiate(findCatalogItem('S:weapon:mace'));const key=attributeKey('stone','fire');
    s.game.inventory.materials[`bound_${key}`]=1;s.game.inventory.materials[key]=2;
    assert.equal(addAttribute(s,item,'fire','stone').ok,true);assert.equal(getMaterialCount(s,`bound_${key}`),0);assert.equal(getMaterialCount(s,key),2);
});
test('month-end box exists on the real last day in every month length',()=>{
    for(const days of [28,29,30,31]){assert.deepEqual(dailyLoginReward(days,days,'C'),{materials:{login_box_C:1}});assert.ok(!Object.keys(dailyLoginReward(days-1,days,'C').materials||{}).includes('login_box_C'));}
});
test('every eligible box outcome pays exactly once; attributes remain bound',()=>{
    for(const grade of SHOT_GRADES){const pool=monthBoxPool(grade),total=pool.reduce((sum,r)=>sum+r.weight,0);let previous=0;
        for(const prize of pool){const s=hero(85),key=voucher(s,'box',grade),roll=(previous+prize.weight/2)/total;let first=true;
            const result=redeemLoginItem(s,key,'',{now,random:()=>{if(first){first=false;return roll;}return .01;}});
            assert.equal(result.ok,true,`${grade}/${prize.id}`);assert.equal(getMaterialCount(s,key),0);assert.equal(redeemLoginItem(s,key,'',{now}).ok,false);
            if(prize.days){const item=s.game.inventory.equipment.items[0];assert.equal(item.mainType,'jewelry');assert.equal(item.enchant,8);assert.equal(item.expiresAt,now+prize.days*LOGIN_DAY_MS);assert.ok(item.shadow);}
            if(prize.tier){assert.equal(Object.values(s.game.inventory.materials).reduce((sum,v)=>sum+v,0),prize.count);assert.ok(Object.keys(s.game.inventory.materials).filter(k=>s.game.inventory.materials[k]>0).every(k=>k.startsWith('bound_attr_')));}
            previous+=prize.weight;
        }
    }
});
test('a full bag retains a box roll without re-rolling, timer starts on delivery',()=>{
    const s=hero(85),key=voucher(s,'box','S84',2);s.game.inventory.equipment.items=Array.from({length:79},()=>({}));
    const pool=monthBoxPool('S84'),total=pool.reduce((sum,r)=>sum+r.weight,0);const before=pool.slice(0,pool.findIndex(r=>r.id==='epic3')).reduce((sum,r)=>sum+r.weight,0);
    let first=true;const random=()=>{if(first){first=false;return (before+1)/total;}return .01;};
    const failed=redeemLoginItem(s,key,'',{now,random});assert.equal(failed.reason,'inventory_full');assert.equal(failed.changed,true);assert.equal(getMaterialCount(s,key),2);
    assert.ok(getLoginRewardsState(s,now).coupons[0].pendingReward.length);
    s.game.inventory.equipment.items.pop();const later=now+LOGIN_DAY_MS;
    assert.equal(redeemLoginItem(s,key,'',{now:later,random:()=>{throw Error('reroll');}}).ok,true);
    const item=s.game.inventory.equipment.items.at(-1);assert.equal(item.expiresAt,later+3*LOGIN_DAY_MS);assert.equal(s.game.loginRewards.boxRolls[key],undefined);
});
test('runes extend duration without stacking strength and affect XP, drop and craft',()=>{
    const s=hero(76),exp=voucher(s,'rune_exp','S',2);redeemLoginItem(s,exp,'',{now});redeemLoginItem(s,exp,'',{now});
    assert.equal(s.game.loginRewards.runes.exp,now+4*LOGIN_DAY_MS);s.game.vitality={points:0,at:now};
    assert.equal(gainExp(s,100,{now}).gained,750);s.game.vitality={points:0,at:now+4*LOGIN_DAY_MS};
    assert.equal(gainExp(s,100,{now:now+4*LOGIN_DAY_MS}).gained,500);
    const live=Date.now();redeemLoginItem(s,voucher(s,'rune_drop'),'',{now:live});redeemLoginItem(s,voucher(s,'rune_craft'),'',{now:live});
    assert.equal(getEquipStatByName(s,'dropRateMul',true),1.5);assert.equal(forgeBonuses(s).craft,.05);
    delete s.game.equipmentStats;assert.equal(getEquipStatByName(s,'dropRateMul',true),1.5);
    s.game.loginRewards.runes.drop=live-1;s.game.loginRewards.runes.craft=live-1;assert.equal(getEquipStatByName(s,'dropRateMul',true),1);assert.equal(forgeBonuses(s).craft,0);
});
test('craft screen reports the same rune bonus that actual crafting uses',()=>{
    const s=hero(40);const before=getCraftState(s).recipes;assert.ok(before.length);
    redeemLoginItem(s,voucher(s,'rune_craft','C'));
    const after=getCraftState(s).recipes;
    for(const recipe of after){const previous=before.find(r=>r.id===recipe.id);assert.equal(recipe.successRate,Math.min(1,previous.successRate+.05));}
});
test('buff, fishing and fame vouchers deliver their functional game rewards',()=>{
    const s=hero();assert.equal(redeemLoginItem(s,voucher(s,'buff'),'might',{now}).ok,true);assert.equal(s.game.inventory.potions.items[0].type,'buff');
    assert.equal(redeemLoginItem(s,voucher(s,'fishing'),'',{now}).ok,true);assert.equal(getMaterialCount(s,'l2_7609'),400);
    assert.equal(redeemLoginItem(s,voucher(s,'fame'),'',{now}).ok,true);assert.equal(s.game.inventory.fame,50);
});
test('blessed resurrection is spent only on a fallen hero and clears death flags',()=>{
    const s=hero(),key=voucher(s,'resurrection');assert.equal(redeemLoginItem(s,key,'',{now}).reason,'not_fallen');
    s.game.gameClass.stats.hp=0;s.game.respawnTime=now+LOGIN_DAY_MS;s.game.world={died:true,death:{}};s.game.l2PendingDeath={};
    assert.equal(redeemLoginItem(s,key,'',{now}).ok,true);assert.ok(s.game.gameClass.stats.hp>0);assert.equal(s.game.respawnTime,0);assert.equal(s.game.world.death,undefined);assert.equal(getMaterialCount(s,key),0);
});
test('login items expose an inventory Use action and allow deliberate discard',()=>{
    const s=hero(),key=voucher(s,'shots');assert.equal(getInventoryState(s).materials[0].usable,true);assert.equal(getInventoryState(s).materials[0].bound,true);
    assert.equal(discardInventoryItem(s,{kind:'material',ref:key}).ok,true);assert.equal(getMaterialCount(s,key),0);
});
test('white healing reward uses its real L2 icon and restores health; daily badge clears',()=>{
    const s=hero(),date=Date.parse('2026-10-09T00:00:00Z');assert.equal(claimLoginReward(s,date).ok,true);
    const potion=getInventoryState(s).potions[0];assert.equal(potion.artKey,'l2_1539');assert.equal(potion.name,'Greater Healing Potion');
    assert.equal(useInventoryPotion(s,'0').ok,true);assert.ok(s.game.gameClass.stats.hp>1000);
    s.game.loginRewards={};assert.equal(personalBadges(s).loginRewards,1);claimLoginReward(s,Date.now());assert.equal(personalBadges(s).loginRewards,0);
});

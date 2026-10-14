import {restoreRevivalVitals} from '../player/revivalVitals.js';
import {SHOT_GRADES, SHOT_CHARGE_GRADES, SHOT_KINDS, gradeLabel, shotKey} from '../../../template/shotsData.js';
import {loginKey,loginItemInfo,loginPeriod,LOGIN_DAY_MS,shotCouponAmount,LOGIN_KINDS} from '../../../template/loginRewards.js';
import {getMaterialCount,addMaterial,spendMaterials,materialInfo} from '../player/materials.js';
import {getCatalog,instantiate,gradeInfo} from '../equipment/catalog.js';
import {inventorySlotsUsed,inventoryCapacity} from '../builds/palaceCapacity.js';
import buffPotions from '../../../template/buffPotions.js';
import fishing from '../../../template/fishingData.js';
import {ELEMENTS,attributeKey} from '../../../template/augmentData.js';
import {isFallen} from '../player/revival.js';
import {expireTimedItems} from '../equipment/timedItems.js';

const amount=(value)=>Math.max(0,Math.floor(Number(value)||0));
export function loginGrade(session) {
    const level=Math.max(1,Math.min(85,amount(session?.game?.stats?.lvl)||1));
    return SHOT_GRADES.find(g=>gradeInfo(g).lvl.from<=level&&level<=gradeInfo(g).lvl.to)||'noGrade';
}
const index=g=>SHOT_GRADES.indexOf(g);
const mat=(kind,grade,count=1)=>({materials:{[loginKey(kind,grade)]:count}});
const shadow=(grade)=>({materials:Object.fromEntries(['weapon','armor','jewelry'].map(part=>[loginKey(`shadow_${part}`,grade),1]))});
const shadowForGrade=(grade,target)=>index(grade)<index('C')?mat('shots',grade):shadow(SHOT_GRADES[Math.min(index(grade),index(target))]);
export const LOGIN_GOLD = Object.freeze([750,2500,8000,16000,30000,50000,75000,100000]);
export const LOGIN_AA = Object.freeze([1000,3000,8000,16000,24000,40000,60000,80000]);
const FAME=[5,10,20,30,40,50,60,70], PROOFS=[10,25,50,100,200,400,600,800];

export function dailyLoginReward(day,days,grade) {
    if(day===days)return mat('box',grade);
    const g=index(grade), fishGrade=SHOT_GRADES[Math.min(g,5)];
    const rewards=[
        mat('shots',grade),mat('fame',grade),{materials:{[`l2_${fishing.shots[fishGrade]}`]:100+g*20}},
        mat('buff',grade,2),{currencies:{ironOre:30+g*20}},mat('fishing',grade),shadowForGrade(grade,'C'),
        mat('shots',grade),{potions:[{id:'login-white-heal',artKey:'l2_1539',name:'Greater Healing Potion',type:'hp',bottleType:'potion',size:'large',power:500,count:5+g}]},
        mat('resurrection',grade),mat('rune_exp',grade),mat('fame',grade),mat('shots',grade),shadowForGrade(grade,'B'),
        mat('fishing',grade),mat('buff',grade,3),{currencies:{ironOre:60+g*30}},mat('rune_drop',grade),
        mat('shots',grade,2),mat('fame',grade,2),shadowForGrade(grade,'A'),mat('resurrection',grade,2),mat('rune_craft',grade),
        {materials:{[`l2_${fishing.shots[fishGrade]}`]:200+g*30}},mat('fishing',grade,2),mat('buff',grade,3),
        mat('shots',grade,2),{currencies:{ironOre:90+g*40}},mat('fame',grade,2),mat('shots',grade,2),
    ];
    return structuredClone(rewards[day-1]);
}

const standardItems=grade=>getCatalog().filter(i=>i.grade===grade&&!i.custom&&!i.epic&&!i.cloak&&i.id.startsWith(`${grade}:`));
// "Epic" in the attendance box means raid jewellery; it fits every character class.
const epicItems=grade=>getCatalog().filter(i=>i.epic&&i.mainType==='jewelry'&&!i.cloak&&index(i.grade)<=index(grade));
export function monthBoxPool(grade) {
    const g=index(grade), pool=[
        {id:'fame',weight:12,reward:mat('fame',grade,5)},
        {id:'boss',weight:5,reward:{materials:{clan_boss_token:1}}},
        ...[[3,5],[5,3],[7,2]].map(([count,weight])=>({id:`col${count}`,weight,reward:{currencies:{luckCoins:count}}})),
        {id:'aa',weight:14,reward:{currencies:{ancientAdena:LOGIN_AA[g]}}},
        {id:'gold',weight:16,reward:{currencies:{gold:LOGIN_GOLD[g]}}},
    ];
    if(epicItems(grade).length)pool.push({id:'epic3',weight:6,days:3},{id:'epic7',weight:3,days:7});
    if(g>=5)pool.push({id:'mastery',weight:6,reward:{materials:{l2_9627:10}}},{id:'giants',weight:8,reward:{materials:{l2_6622:20}}},{id:'stones',weight:8,tier:'stone',count:10},{id:'crystals',weight:5,tier:'crystal',count:6});
    if(g>=1)pool.push(
        {id:'blessedArmor',weight:10,reward:{materials:{[`bound_blessed_armor_${grade}`]:3}}},
        {id:'blessedWeapon',weight:7,reward:{materials:{[`bound_blessed_weapon_${grade}`]:2}}},
        {id:'destructionArmor',weight:5,reward:{materials:{[`bound_safe_armor_${grade}`]:2}}},
        {id:'destructionWeapon',weight:3,reward:{materials:{[`bound_safe_weapon_${grade}`]:1}}},
    );
    return pool;
}
const BOX_NAMES={epic3:'Теневой эпик +8 · 3 дня',epic7:'Теневой эпик +8 · 7 дней',stones:'10 случайных камней атрибута',crystals:'6 случайных кристаллов атрибута'};
function rewardRows(reward={}) {
    const names={gold:'Адена',ancientAdena:'Древняя адена',ironOre:'Железная руда',luckCoins:'COL',fame:'Слава'};
    return [...Object.entries(reward.materials||{}).map(([key,count])=>({key,count,name:materialInfo(key).name,icon:materialInfo(key).icon})),
        ...Object.entries(reward.currencies||{}).map(([key,count])=>({key,count,name:names[key],icon:'✦'})),
        ...(reward.potions||[]).map(p=>({key:p.artKey||p.id,count:p.count,name:p.name,icon:'🧪'})),
        ...(reward.equipment||[]).map(p=>({key:p.id,count:1,name:`${p.name} +${p.enchant}`,icon:'💍'})),
        ...(reward.epic&&!reward.equipment?.length?[{key:reward.epic.id,count:1,name:`${getCatalog().find(i=>i.id===reward.epic.id)?.name} +8 · ${reward.epic.days} дн.`,icon:'💍'}]:[])];
}
function itemChoices(info) {
    if(info.kind==='shots')return SHOT_CHARGE_GRADES.flatMap(grade=>SHOT_KINDS.map(kind=>({id:`${kind.id}:${grade}`,grade,kind:kind.id,name:`${kind.label} ${gradeLabel(grade)}`,count:shotCouponAmount(info.grade,grade,kind.id)})));
    if(info.kind==='buff')return buffPotions.filter(p=>!p.donateOnly).map(p=>({id:p.id,name:p.name,count:1}));
    if(info.kind==='shadow_weapon')return standardItems(info.grade).filter(i=>i.mainType==='weapon').map(i=>({id:i.id,name:i.name,count:1}));
    if(info.kind==='shadow_armor')return ['heavy','light','robe'].map(id=>({id,name:({heavy:'Тяжёлая броня',light:'Лёгкая броня',robe:'Мантия'})[id],count:standardItems(info.grade).filter(i=>i.mainType==='armor'&&i.kind===id).length}));
    if(info.kind==='shadow_jewelry')return ['ring','earring','necklace','set'].map(id=>({id,name:({ring:'Два кольца',earring:'Две серьги',necklace:'Ожерелье',set:'Полный комплект бижутерии'})[id],count:id==='set'?5:id==='necklace'?1:2}));
    return [];
}
// Legacy records contain calendar dates. Preserve their number of paid rewards,
// but convert those dates to a consecutive sequence without paying them again.
function progress(session,period) {
    const stored=session?.game?.loginRewards;
    if(stored?.month!==period.month)return {claimed:[],received:{},lastClaimDay:0};
    const previous=[...new Set((stored.claimed||[]).filter(day=>Number.isInteger(day)&&day>=1&&day<=period.days))].sort((a,b)=>a-b);
    if(stored.version===2)return {claimed:previous,received:stored.received||{},lastClaimDay:amount(stored.lastClaimDay)};
    return {claimed:previous.map((_,i)=>i+1),received:Object.fromEntries(previous.map((day,i)=>[i+1,stored.received?.[day]])),lastClaimDay:previous.at(-1)||0};
}
export const LOGIN_TICKET_LIFETIME=10*LOGIN_DAY_MS;
export function canClaimLoginReward(session,now=Date.now()) {
    const period=loginPeriod(now),current=progress(session,period);
    return current.lastClaimDay!==period.day&&current.claimed.length<period.days;
}
const liveTickets=(session,now)=>(session?.game?.loginRewards?.tickets||[]).filter(t=>Number.isFinite(t.expiresAt)&&t.expiresAt>now).sort((a,b)=>a.expiresAt-b.expiresAt);
export function grantLoginTicket(session,now=Date.now()) {
    session.game.loginRewards||={};
    const ticket={grantedAt:now,expiresAt:now+LOGIN_TICKET_LIFETIME};
    session.game.loginRewards.tickets=[...liveTickets(session,now),ticket];
    return ticket;
}
export function getLoginRewardsState(session,now=Date.now()) {
    const period=loginPeriod(now), grade=loginGrade(session), stored=session?.game?.loginRewards;
    const {claimed,received,lastClaimDay}=progress(session,period),nextDay=claimed.length+1;
    const canClaim=lastClaimDay!==period.day&&nextDay<=period.days;
    const missedDays=Math.max(0,period.day-claimed.length-(canClaim?1:0)),tickets=liveTickets(session,now);
    const pool=monthBoxPool(grade),weight=pool.reduce((sum,r)=>sum+r.weight,0);
    return {...period,serverNow:now,grade:gradeLabel(grade),canClaim,nextDay,missedDays,tickets,canFill:!canClaim&&missedDays>0&&tickets.length>0,
        days:Array.from({length:period.days},(_,i)=>({day:i+1,status:claimed.includes(i+1)?'claimed':i+1===nextDay&&canClaim?'today':i+1<=claimed.length+missedDays?'missed':'future',
            rewards:rewardRows(received[i+1]?.reward||dailyLoginReward(i+1,period.days,grade)),
            boxPool:i+1===period.days?boxPoolRows(received[i+1]?.grade||grade):null})),
        coupons:Object.keys(session?.game?.inventory?.materials||{}).map(loginItemInfo).filter(info=>info&&getMaterialCount(session,info.key)>0)
            .map(info=>({...info,count:getMaterialCount(session,info.key),choices:itemChoices(info),needLevel:info.kind.startsWith('shadow_')?gradeInfo(info.grade).lvl.from:1,
                pendingReward:stored?.boxRolls?.[info.key]?rewardRows(stored.boxRolls[info.key]):null,
                boxPool:info.kind==='box'?boxPoolRows(info.grade):null})),
        boxPool:pool.map(r=>({id:r.id,name:BOX_NAMES[r.id]||rewardRows(r.reward).map(i=>`${i.name} ×${i.count}`).join(', '),chance:Math.round(r.weight/weight*10000)/100})),
        runes:Object.entries(stored?.runes||{}).filter(([,until])=>until>now).map(([kind,until])=>({kind,until,name:LOGIN_KINDS[`rune_${kind}`]})),
    };
}
function boxPoolRows(grade){const pool=monthBoxPool(grade),total=pool.reduce((sum,r)=>sum+r.weight,0);return pool.map(r=>({id:r.id,name:BOX_NAMES[r.id]||rewardRows(r.reward).map(i=>`${i.name} ×${i.count}`).join(', '),chance:Math.round(r.weight/total*10000)/100}));}

/** Validate all slots and counters before committing a reward or spending a voucher. */
function grant(session,reward,consumeKey=null,now=Date.now()) {
    const inv=session?.game?.inventory;
    if(!inv)return {ok:false,reason:'inventory_missing'};
    const materialEntries=Object.entries(reward.materials||{}), currencies=Object.entries(reward.currencies||{});
    if([...materialEntries.map(([k,v])=>[amount(inv.materials?.[k]),v]),...currencies.map(([k,v])=>[amount(inv[k]),v])]
        .some(([owned,count])=>!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(owned+count)))return {ok:false,reason:'invalid_count'};
    const changed=expireTimedItems(session,now).length>0;
    const extra=materialEntries.filter(([key])=>getMaterialCount(session,key)<1).length+(reward.equipment||[]).length
        +(reward.potions||[]).filter(p=>!(inv.potions?.items||[]).some(i=>i.id===p.id&&i.count>0)).length
        -(consumeKey&&getMaterialCount(session,consumeKey)===1?1:0);
    if(inventorySlotsUsed(inv)+extra>inventoryCapacity(session))return {ok:false,reason:'inventory_full',changed};
    if(consumeKey&&!spendMaterials(session,{[consumeKey]:1}))return {ok:false,reason:'coupon_missing'};
    for(const [key,count] of materialEntries)addMaterial(session,key,count);
    for(const [key,count] of currencies)inv[key]=amount(inv[key])+count;
    if(reward.equipment?.length){inv.equipment||={items:[]};inv.equipment.items||=[];inv.equipment.items.push(...reward.equipment);}
    for(const potion of reward.potions||[]){inv.potions||={items:[]};inv.potions.items||=[];const own=inv.potions.items.find(p=>p.id===potion.id);if(own)own.count=amount(own.count)+potion.count;else inv.potions.items.push(structuredClone(potion));}
    return {ok:true,rewards:rewardRows(reward),changed};
}
export function claimLoginReward(session,now=Date.now(),expectedPeriod=null,{ticket=false}={}) {
    const period=loginPeriod(now), stored=session?.game?.loginRewards;
    if(expectedPeriod&&(expectedPeriod.month!==period.month||expectedPeriod.day!==period.day))return {ok:false,reason:'day_changed'};
    const current=progress(session,period),day=current.claimed.length+1;
    const view=getLoginRewardsState(session,now);
    if(ticket&&!view.canFill)return {ok:false,reason:!view.tickets.length?'ticket_missing':'no_missed_days'};
    if(!ticket&&!view.canClaim)return {ok:false,reason:'already_claimed'};
    const grade=loginGrade(session),reward=dailyLoginReward(day,period.days,grade);
    const result=grant(session,reward,null,now);
    if(!result.ok)return result;
    session.game.loginRewards||={};
    Object.assign(session.game.loginRewards,{version:2,month:period.month,claimed:[...current.claimed,day],received:{...current.received,[day]:{grade,reward:structuredClone(reward)}},lastClaimDay:ticket?current.lastClaimDay:period.day});
    if(ticket)session.game.loginRewards.tickets=liveTickets(session,now).slice(1);
    return {...result,action:ticket?'fill':'claim',rewardDay:day};
}
const shadowItem=(definition,days,enchant,now)=>({...instantiate(definition),shadow:true,bound:true,noTrade:true,tradeable:false,timed:true,enchant,expiresAt:now+days*LOGIN_DAY_MS});
function rollBox(grade,now,random) {
    const pool=monthBoxPool(grade);let roll=random()*pool.reduce((sum,r)=>sum+r.weight,0);
    const pick=pool.find(r=>(roll-=r.weight)<0)||pool.at(-1);
    if(pick.reward)return structuredClone(pick.reward);
    if(pick.days){const choices=epicItems(grade),item=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];return {epic:{id:item.id,days:pick.days},equipment:[]};}
    const materials={};for(let i=0;i<pick.count;i++){const element=ELEMENTS[Math.min(ELEMENTS.length-1,Math.floor(random()*ELEMENTS.length))];const key=`bound_${attributeKey(pick.tier,element.id)}`;materials[key]=(materials[key]||0)+1;}
    return {materials};
}
export function redeemLoginItem(session,key,choice='',{now=Date.now(),random=Math.random}={}) {
    const info=loginItemInfo(key);
    if(!info||getMaterialCount(session,key)<1)return {ok:false,reason:'coupon_missing'};
    const kind=info.kind, grade=info.grade, g=index(grade);
    if(kind.startsWith('shadow_')&&amount(session.game.stats?.lvl)<gradeInfo(grade).lvl.from)return {ok:false,reason:'level_too_low'};
    let reward;
    if(kind==='shots'){
        const option=itemChoices(info).find(o=>o.id===choice);if(!option)return {ok:false,reason:'invalid_choice'};
        reward={materials:{[shotKey(option.kind,option.grade)]:option.count}};
    }else if(kind==='buff'){
        const potion=buffPotions.find(p=>p.id===choice);if(!potion)return {ok:false,reason:'invalid_choice'};
        reward={potions:[{...potion,count:1}]};
    }else if(kind.startsWith('shadow_')){
        if(!itemChoices(info).some(o=>o.id===choice))return {ok:false,reason:'invalid_choice'};
        let items=standardItems(grade);
        if(kind==='shadow_weapon')items=items.filter(i=>i.id===choice);
        else if(kind==='shadow_armor')items=items.filter(i=>i.mainType==='armor'&&i.kind===choice);
        else {items=items.filter(i=>i.mainType==='jewelry'&&(choice==='set'||i.category===choice));items=items.flatMap(i=>i.category==='necklace'?[i]:[i,i]);}
        if(!items.length)return {ok:false,reason:'invalid_choice'};
        reward={equipment:items.map(i=>shadowItem(i,7,6,now))};
    }else if(kind==='fame')reward={currencies:{fame:FAME[g]}};
    else if(kind==='fishing')reward={materials:{[`l2_${fishing.proofItem}`]:PROOFS[g]}};
    else if(kind.startsWith('rune_')){
        if(!spendMaterials(session,{[key]:1}))return {ok:false,reason:'coupon_missing'};
        session.game.loginRewards||={};session.game.loginRewards.runes||={};
        const type=kind.slice(5),duration=(type==='craft'?1:2)*LOGIN_DAY_MS;
        const until=Math.max(now,amount(session.game.loginRewards.runes[type]))+duration;
        session.game.loginRewards.runes[type]=until;
        return {ok:true,action:'redeem',until,rewards:[{name:info.name,count:1,icon:info.icon}]};
    }else if(kind==='resurrection'){
        if(!isFallen(session,now))return {ok:false,reason:'not_fallen'};
        spendMaterials(session,{[key]:1});restoreRevivalVitals(session);
        session.game.respawnTime=0;delete session.game.l2PendingDeath;
        if(session.game.world){delete session.game.world.died;delete session.game.world.death;}
        if(session.game.hunt?.field){const field=session.game.hunt.field;field.path=[];delete field.pendingRoom;field.seenAt=now;field.moveAt=now;session.game.hunt.lastActionAt=now;for(const mob of field.mobs||[])mob.aggro=false;}
        return {ok:true,action:'redeem',rewards:[{name:info.name,count:1,icon:info.icon}]};
    }else if(kind==='box'){
        session.game.loginRewards||={};session.game.loginRewards.boxRolls||={};
        const stored=session.game.loginRewards.boxRolls;
        stored[key]||=rollBox(grade,now,random);
        reward=structuredClone(stored[key]);
        // The pending roll survives a full bag; its rental starts only on successful delivery.
        if(reward.epic)reward.equipment=[shadowItem(getCatalog().find(i=>i.id===reward.epic.id),reward.epic.days,8,now)];
        const result=grant(session,reward,key,now);
        if(result.ok)delete stored[key];
        return {...result,changed:true,action:'redeem'};
    }else return {ok:false,reason:'invalid_choice'};
    return {...grant(session,reward,key,now),action:'redeem'};
}

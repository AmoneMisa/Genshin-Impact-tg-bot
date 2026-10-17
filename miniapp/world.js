import WorldHolding from '../db/models/WorldHolding.js';
import {memberName} from './social.js';
import holdings from '../template/worldHoldings.js';
import getClan from '../functions/game/clans/getClan.js';
import {siegeAction,settleSiege,reconcileMilitaryOwnership} from '../functions/game/world/siege.js';
import {addMaterial} from '../functions/game/player/materials.js';
import {worldState,worldAction,advanceWorld,enterWorldInstance,bindWorldInstances} from '../functions/game/world/world.js';
import {getZoneLoot} from './hunt.js';
import {worldShopAction,worldShopState} from '../functions/game/world/shops.js';
import {attachPartyPeers} from './party.js';
import {loadWorldInstances} from './worldInstances.js';
import {CITY_NPCS,CITIES,cityPoint,citySize,ensureWorld} from '../functions/game/world/world.js';
import {hallAction,hallState} from '../functions/game/world/hall.js';
import {deathChoices,respawnWorld} from '../functions/game/world/death.js';
import {castRevival,reviveEntries} from '../functions/game/player/revival.js';
import {revivalPosition} from '../functions/game/world/death.js';
import {enterHolding,leaveHolding} from '../functions/game/world/holdingEntry.js';
import {withLock} from '../functions/general/chatLock.js';
import {hallScenario,ensureHallContest,advanceHallContest,hallContestState} from '../functions/game/world/hallConquest.js';
import {syncClanPerks} from '../functions/game/clans/clanPerks.js';
import ClanHallAuction from '../db/models/ClanHallAuction.js';

export async function worldRequestState(session,body,now=Date.now()){
    return withLock('world:holdings',()=>lockedWorldRequestState(session,body,now));
}
async function lockedWorldRequestState(session,body,now){
    ensureWorld(session,now);await loadWorldInstances(session);await attachPartyPeers(session);
    const chat=session.ownerDocument(),clan=await getClan(Number(session.userId));bindWorldInstances(chat,now);
    let result={ok:true};const records=await WorldHolding.find().exec();reconcileMilitaryOwnership(records);
    for(const h of holdings.filter(hallScenario)){
        let r=records.find(r=>r._id===h.id);if(!r){r=new WorldHolding({_id:h.id});records.push(r);}
        ensureHallContest(r,h,now);advanceHallContest(r,h,now,records);
    }
    if(session.game.world.mode==='siege'){
        const id=session.game.world.holding,holding=holdings.find(h=>h.id===id),record=holding&&records.find(r=>r._id===id);
        if(record){siegeAction(record,holding,session,clan,{action:'siege_tick'},now,records);record.markModified('siege');}
    }
    if(body?.action==='holding_enter'){
        advanceWorld(session,now);const h=holdings.find(h=>h.id===body.holding&&h.kind!=='hall'),record=h&&records.find(r=>r._id===h.id);
        result=!h?{ok:false,reason:'unknown_holding'}:!clan||String(record?.owner?.clanId)!==String(clan._id)?{ok:false,reason:'holding_access_denied'}:session.game.gameClass?.stats?.hp<=0?{ok:false,reason:'dead'}:record?.siege&&!record.siege.settled&&now>=record.siege.startsAt&&now<record.siege.endsAt?{ok:false,reason:'holding_in_siege'}:enterHolding(session,h,'stronghold',now);
    }
    else if(body?.action==='respawn')result=respawnWorld(session,body.destination,clan,records,now);
    else if(body?.action==='revive'){advanceWorld(session,now);result=castRevival(session,body.skillId,body.userId,{now});}
    else if(body?.action?.startsWith('siege_')){
        advanceWorld(session,now);
        const holding=holdings.find(h=>h.id===body.holding);
        if(!holding)return {ok:false,reason:'unknown_holding',world:worldState(session,now)};
        let record=records.find(r=>r._id===holding.id);
        if(!record){record=new WorldHolding({_id:holding.id});records.push(record);}
        const auctionReserved=body.action==='siege_register'&&hallScenario(holding)&&clan&&await ClanHallAuction.exists({$or:[{'bid.clanId':String(clan._id)},{'owner.clanId':String(clan._id),'owner.until':{$gt:now}}]});
        result=auctionReserved?{ok:false,reason:'hall_already_reserved'}:siegeAction(record,holding,session,clan,body,now,records);record.revision++;record.markModified('siege');
    }else if(body?.action?.startsWith('hall_')){
        advanceWorld(session,now);
        const holding=holdings.find(h=>h.id===body.holding&&h.kind==='hall');
        if(!holding)result={ok:false,reason:'unknown_holding'};
        else result=hallAction(session,clan,holding,records.find(r=>r._id===holding.id),body,now);
        if(result.ok&&body.action==='hall_upgrade'){await clan.save();syncClanPerks(session,clan,now);}
    }else if(body?.action?.startsWith('shop_')){
        const w=session.game.world,npc=CITY_NPCS.find(n=>n.id===body.npc),city=CITIES.find(c=>c.id===w.city);
        const point=npc&&city&&cityPoint(city,npc);
        const accessible=w.mode==='city'&&npc?.city===w.city&&!npc.gateway&&!npc.instanceGateway&&point&&Math.hypot(w.x-point.x,w.y-point.y)*citySize(city)<=180&&!w.path?.length&&session.game.gameClass?.stats?.hp>0;
        result=accessible?worldShopAction(session,body,now):{ok:false,reason:'npc_too_far'};
    }
    else if(body?.action==='instance_enter')result=enterWorldInstance(chat,session,body.location,now);
    else if(body)result=worldAction(session,body,now);
    bindWorldInstances(chat,now);
    if(session.game.world.mode==='stronghold'){
        const h=holdings.find(h=>h.id===session.game.world.holding),record=h&&records.find(r=>r._id===h.id);
        if(h&&(!clan||String(record?.owner?.clanId)!==String(clan._id)))leaveHolding(session,h,{force:true,now});
    }
    const world=worldState(session,now);
    for(const record of records){
        if(session.game.world.holding===record._id&&session.game.world.mode==='siege'){
            siegeAction(record,holdings.find(h=>h.id===record._id),session,clan,{action:'siege_tick'},now);record.markModified('siege');
        }
        settleSiege(record,now,records);
        const ledger=session.game.world.claimedSiegeRewards||={};
        for(const reward of [...(record.rewards||[]),...Object.values(record.siege?.rewarded||{})])if(reward.userId===String(session.userId)&&!ledger[reward.event]){addMaterial(session,'l2_9912',reward.epaulets);session.game.inventory.fame=(Number(session.game.inventory.fame)||0)+reward.fame;ledger[reward.event]=now;}
    }
    // Release the conflicting stronghold before persisting the newly captured one.
    for(const record of [...records].sort((a,b)=>Number(Boolean(a.owner))-Number(Boolean(b.owner))))if(record.isNew||record.isModified('owner')||record.isModified('siege')||record.isModified('revision'))await record.save();
    if(world.death)world.death.choices=deathChoices(session,clan,records,now);
    const hall=holdings.find(h=>h.id===session.game.world.holding&&h.kind==='hall');
    if(hall&&session.game.world.mode==='hall'){
        const record=records.find(r=>r._id===hall.id);
        hallAction(session,clan,hall,record,{action:'hall_tick'},now);
        world.player={...world.player,x:session.game.world.x,y:session.game.world.y,path:session.game.world.path};
        world.hall=hallState(session,clan,hall,record,now);
        if(!world.hall.allowed){leaveHolding(session,hall,{force:true,now});Object.assign(world.player,session.game.world);}
    }
    world.holdings=holdings.map(h=>{const r=records.find(r=>r._id===h.id);const s=r?.siege,contest=hallContestState(r,h,session,clan,now);return {...h,scene:hallScenario(h)?.asset||null,contest,canEnter:h.kind==='hall'?hallState(session,clan,h,r,now).allowed:Boolean(clan&&String(r?.owner?.clanId)===String(clan._id)),owner:r?.owner||null,siege:s?{id:s.id,startsAt:s.startsAt,endsAt:s.endsAt,settled:s.settled,objectives:contest?.objectives||s.objectives,channel:s.channel,players:Object.entries(s.players).filter(([,p])=>p.seenAt>=now-10000&&p.hp>0).slice(0,48).map(([userId,p])=>({userId,name:p.name,x:p.x,y:p.y,clanId:p.clanId,hp:p.hp})),registered:Boolean(clan&&s.registrations[String(clan._id)]),player:s.players[String(session.userId)]||null}:null};});
    if(world.player.mode==='siege')world.conquestSkills=(session.game.gameClass.skills||[]).map((s,index)=>({index,name:s.name}));
    world.shop=worldShopState(session);
    world.resurrections=reviveEntries(session,now).filter(s=>s.level>0);
    const position=revivalPosition(session);
    world.corpses=[...(chat.members||[]),...(chat.$locals?.guests||[])].filter(m=>m!==session&&!m.isHided&&!m.userChatData?.user?.is_bot&&m.game?.gameClass?.stats?.hp<=0&&position&&revivalPosition(m)?.space===position.space).map(m=>({userId:String(m.userId),name:memberName(m),...revivalPosition(m)}));
    return {...result,world};
}

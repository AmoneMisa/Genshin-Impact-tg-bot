import {findPath,advancePath} from './navigation.js';
import {LOCATIONS} from '../../../template/worldMap.js';
import holdings from '../../../template/worldHoldings.js';
import {enterHuntField} from '../hunt/huntFight.js';
import getSpeed from '../player/getters/getSpeed.js';
import {applyL2Effect,l2ActionBlock,l2MoveMultiplier} from '../player/l2Effects.js';
import {addMaterial} from '../player/materials.js';
import {enterHolding,leaveHolding} from './holdingEntry.js';
import {hallLevel,getClanHallState,upgradeHall} from '../clans/clanHall.js';
import {hallScenario} from './hallConquest.js';
export const HALL_NPCS=[{id:'shop',name:'Управляющий',role:'Магазин',x:.25,y:.4},{id:'buffer',name:'Помощник клана',role:'Баффер',x:.5,y:.3},{id:'teleport',name:'Хранитель холла',role:'Специальный телепорт',x:.75,y:.4}];
export const HALL_WALLS=[{x:.35,y:.55,w:.3,h:.1}];
// Explicit per-region tariffs of this game's hall economy; no retail-price claim.
const tariffs={aden:500,rune:500,giran:750,goddard:750,dion:1000,gludio:1000,oren:750,gludin:750,schuttgart:750};
const owned=(holding,record,clan,now)=>Boolean(clan&&((record?.owner?.clanId===String(clan._id))||(!holding.conquerable&&holdings.find(h=>h.kind==='hall'&&!h.conquerable&&h.region===holding.region)?.id===holding.id&&clan.hall?.estate?.until>now&&clan.hall.estate.id===holding.region)));
export function hallAction(session,clan,holding,record,body,now=Date.now()){
    if(!owned(holding,record,clan,now))return {ok:false,reason:'hall_access_denied'};
    const w=session.game.world;
    if(!(session.game.gameClass?.stats?.hp>0))return {ok:false,reason:"dead"};
    if(body.action==='hall_enter'){
        const result=enterHolding(session,holding,'hall',now);if(result.ok)w.hallRoom=holding.conquerable?'courtyard':'interior';return result;
    }
    if(w.mode!=='hall'||w.holding!==holding.id)return {ok:false,reason:'hall_access_denied'};
    advancePath(w,now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now));
    if(body.action==='hall_upgrade'){
        const manager=String(clan.owner)===String(session.userId)||clan.members?.some(m=>String(m.userId)===String(session.userId)&&m.role==='officer');
        return manager?upgradeHall(clan,now):{ok:false,reason:'not_allowed'};
    }
    if(body.action==='hall_room'){
        if(!holding.conquerable)return {ok:false,reason:'invalid_action'};
        const courtyard=w.hallRoom==='courtyard',door={x:.5,y:courtyard?.1:.9};
        if(Math.hypot(w.x-door.x,w.y-door.y)>.1)return {ok:false,reason:'entrance_required'};
        w.hallRoom=courtyard?'interior':'courtyard';Object.assign(w,{x:.5,y:courtyard?.9:.1,path:[],moveAt:now});return {ok:true};
    }
    if(body.action==='hall_move'){
        const block=l2ActionBlock(session,{move:true},now);if(block)return {ok:false,reason:block};
        const path=findPath(w,{x:Number(body.point?.x),y:Number(body.point?.y)},w.hallRoom==='courtyard'?[]:HALL_WALLS);if(!path)return {ok:false,reason:'path_blocked'};w.path=path;w.channel=null;w.moveAt=now;return {ok:true};
    }
    if(body.action==='hall_leave'){
        if(holding.conquerable&&w.hallRoom!=='courtyard')return {ok:false,reason:'hall_courtyard_required'};
        return leaveHolding(session,holding,{now});
    }
    if(w.hallRoom==='courtyard')return {ok:false,reason:'hall_interior_required'};
    const npc=HALL_NPCS.find(n=>n.id===body.npc);
    if(!npc||Math.hypot(w.x-npc.x,w.y-npc.y)>.12)return {ok:false,reason:'npc_too_far'};
    if(body.action==='hall_buff'&&npc.id==='buffer'){
        if(!(session.game.inventory.gold>=5000))return {ok:false,reason:'not_enough_gold'};
        session.game.inventory.gold-=5000;for(const [id,level] of [[1068,3],[1040,3],[1204,2]])applyL2Effect(session,session,id,level,{now,guaranteed:true});return {ok:true};
    }
    if(body.action==='hall_scroll'&&npc.id==='shop'){
        if(!(session.game.inventory.gold>=500))return {ok:false,reason:'not_enough_gold'};session.game.inventory.gold-=500;addMaterial(session,'scroll_escape',1);return {ok:true};
    }
    if(body.action==='hall_teleport'&&npc.id==='teleport'){
        const location=LOCATIONS.find(l=>l.id===body.location&&!l.instance&&(l.region===holding.region||['giants-cave','tower-of-insolence'].includes(l.id)));
        if(!location)return {ok:false,reason:'unknown_zone'};
        const gold=tariffs[holding.region]||1000;if(!(session.game.inventory.gold>=gold))return {ok:false,reason:'not_enough_gold'};
        const result=enterHuntField(session,location.id,{now});if(!result.ok)return result;session.game.inventory.gold-=gold;w.mode='location';w.location=location.id;w.city=location.region;w.path=[];w.holding=null;return {ok:true};
    }
    return {ok:false,reason:'invalid_action'};
}
export function hallState(session,clan,holding,record,now){const courtyard=session.game.world?.hallRoom==='courtyard',allowed=owned(holding,record,clan,now);return {allowed,level:hallLevel(clan),room:courtyard?'courtyard':'interior',scene:hallScenario(holding)?.asset||null,development:allowed?getClanHallState(clan,now):null,canManage:allowed&&(String(clan.owner)===String(session.userId)||clan.members?.some(m=>String(m.userId)===String(session.userId)&&m.role==='officer')),npcs:courtyard?[]:HALL_NPCS,walls:courtyard?[]:HALL_WALLS,price:tariffs[holding.region]||1000,teleports:LOCATIONS.filter(l=>!l.instance&&(l.region===holding.region||['giants-cave','tower-of-insolence'].includes(l.id))).map(l=>({id:l.id,name:l.name}))};}

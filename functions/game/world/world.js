import {CITIES, REGIONS, LOCATIONS, CITY_NPCS} from '../../../template/worldMap.js';
import {pointInPolygon, findPath, advancePath} from './navigation.js';
import getSpeed from '../player/getters/getSpeed.js';
import {l2MoveMultiplier,l2ActionBlock} from '../player/l2Effects.js';
import {enterHuntField, advanceHunt, moveHuntField, resetInstanceRoom} from '../hunt/huntFight.js';
import {spendMaterials, addMaterial} from '../player/materials.js';
import {getZone} from '../hunt/huntMobs.js';
import holdings from '../../../template/worldHoldings.js';
import {partyMembers} from '../party/party.js';
import {markWorldDeath} from './death.js';

export {CITIES,REGIONS,LOCATIONS,CITY_NPCS};
export const CITY_SIZE=14000;
const cityOf = w => CITIES.find(c=>c.id===w.city) || CITIES[1];
const alive=s=>s.game.gameClass?.stats?.hp>0;
export function ensureWorld(session,now=Date.now()) {
    const existing=session.game.hunt?.field;
    if(!session.game.world){const location=existing&&LOCATIONS.find(l=>l.id===session.game.hunt.zone);session.game.world={version:1,city:location?.region||'giran',location:location?.id||null,mode:location?'location':'city',x:.5,y:.5,moveAt:now,path:[],locks:{}};}
    return session.game.world;
}
export function terrainAt(x,y){const point={x,y};return {location:LOCATIONS.find(l=>pointInPolygon(point,l.polygon))?.id||null,region:REGIONS.find(r=>pointInPolygon(point,r.polygon))?.id||null};}
export function cityPoint(city,npc){return {x:.5+(npc.x-city.x)/CITY_SIZE,y:.5+(npc.y-city.y)/CITY_SIZE};}
function arriveCity(session,world){world.mode='city';world.location=null;world.holding=null;world.instanceId=null;world.x=.5;world.y=.5;world.path=[];world.channel=null;world.pending=null;world.readyHolding=null;session.game.hunt&&(session.game.hunt.field=null,session.game.hunt.mob=null);}
export function advanceWorld(session,now=Date.now()) {
    const w=ensureWorld(session,now);
    if(!alive(session)){markWorldDeath(session,now);return w;}
    if(w.died){delete w.died;delete w.death;}
    if(w.mode==='location')advanceHunt(session,now);
    if(!alive(session)){markWorldDeath(session,now);return w;}
    if(w.channel){
        if(Number(session.game.gameClass.stats.hp)<w.channel.hp||l2ActionBlock(session,{move:true},now)){w.channel=null;return w;}
        if(now>=w.channel.until){if(spendMaterials(session,{scroll_escape:1}))arriveCity(session,w);else w.channel=null;}
    }
    if(['hall','stronghold'].includes(w.mode))advancePath(w,now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now));
    if(w.mode==='city'){
        advancePath(w,now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now),CITY_SIZE);
        if(!w.path.length&&w.pending){const pending=w.pending;w.pending=null;const location=LOCATIONS.find(l=>l.id===pending.location),npc=CITY_NPCS.find(n=>n.id===pending.npc);
            if(pending.city&&npc&&npc.city===w.city&&nearNpc(w,npc)&&session.game.inventory.gold>=pending.gold){session.game.inventory.gold-=pending.gold;w.city=pending.city;arriveCity(session,w);}
            else if(location&&npc&&npc.city===w.city&&npc.gateway&&nearNpc(w,npc)&&Number(session.game.inventory.gold)>=location.teleportGold){
                const entered=enterHuntField(session,location.id,{now});
                if(entered.ok){session.game.inventory.gold-=location.teleportGold;w.city=location.region;w.mode='location';w.location=location.id;w.x=.5;w.y=.95;w.lastTeleport={to:location.id,gold:location.teleportGold,at:now};}
            }
        }
    }
    return w;
}
function nearNpc(world,npc){const p=cityPoint(cityOf(world),npc);return Math.hypot(world.x-p.x,world.y-p.y)*CITY_SIZE<=180;}
export function worldAction(session,body,now=Date.now()){
    const w=advanceWorld(session,now);
    if(!alive(session))return {ok:false,reason:'dead'};
    if(body.action==='move'){
        w.channel=null;w.pending=null;
        if(w.mode==='location')return moveHuntField(session,body.point,now);
        if(!['city','stronghold'].includes(w.mode))return {ok:false,reason:'no_field'};
        const blocked=l2ActionBlock(session,{move:true},now);if(blocked)return {ok:false,reason:blocked};
        const path=findPath(w,{x:Number(body.point?.x),y:Number(body.point?.y)});
        if(!path)return {ok:false,reason:'path_blocked'};w.path=path;w.moveAt=now;return {ok:true};
    }
    if(body.action==='travel'){
        if(w.mode!=='city')return {ok:false,reason:'gatekeeper_required'};
        const location=LOCATIONS.find(l=>l.id===body.location),npc=CITY_NPCS.find(n=>n.city===w.city&&n.gateway);
        if(!location||!npc)return {ok:false,reason:'unknown_zone'};
        if(location.instance)return {ok:false,reason:'instance_npc_required'};
        if(Number(session.game.inventory.gold)<location.teleportGold)return {ok:false,reason:'not_enough_gold'};
        const path=findPath(w,cityPoint(cityOf(w),npc));if(!path)return {ok:false,reason:'path_blocked'};
        w.path=path;w.moveAt=now;w.pending={npc:npc.id,location:location.id};w.channel=null;return {ok:true};
    }
    if(body.action==='travel_city'){
        const city=CITIES.find(c=>c.id===body.city),npc=CITY_NPCS.find(n=>n.city===w.city&&n.gateway);
        if(w.mode!=='city'||!city||!npc||city.id===w.city)return {ok:false,reason:'gatekeeper_required'};
        if(!(session.game.inventory.gold>=20000))return {ok:false,reason:'not_enough_gold'};
        w.path=findPath(w,cityPoint(cityOf(w),npc))||[];w.moveAt=now;w.pending={npc:npc.id,city:city.id,gold:20000};return {ok:true};
    }
    if(body.action==='escape'){
        if(w.mode==='city')return {ok:false,reason:'already_in_city'};
        if(w.channel)return {ok:false,reason:'channel_busy'};
        if(!(session.game.inventory.materials?.scroll_escape>0))return {ok:false,reason:'no_escape_scroll'};
        const field=session.game.hunt?.field;if(field){field.path=[];delete field.pendingRoom;}
        w.path=[];w.pending=null;w.channel={until:now+15000,hp:Number(session.game.gameClass.stats.hp)};return {ok:true};
    }
    if(body.action==='holding_travel'){
        const h=holdings.find(h=>h.id===body.holding);
        if(!h||w.mode!=='city'||w.city!==h.region)return {ok:false,reason:'holding_region_required'};
        const c=cityOf(w);w.path=[];w.pending=null;w.channel=null;w.mode='road';
        w.walkHome={until:now+Math.max(1000,Math.hypot(h.x-c.x,h.y-c.y)/Math.max(1,getSpeed(session))*1000),holding:h.id};return {ok:true};
    }
    if(body.action==='walk_exit'){
        if(['siege','stronghold'].includes(w.mode)){
            if(Math.hypot(w.x-.5,w.y-.95)>.08)return {ok:false,reason:'entrance_required'};
            const h=holdings.find(h=>h.id===w.holding),c=cityOf(w);if(!h)return {ok:false,reason:'unknown_holding'};
            w.walkHome={until:now+Math.max(1000,Math.hypot(h.x-c.x,h.y-c.y)/Math.max(1,getSpeed(session))*1000)};w.mode='road';w.holding=null;w.channel=null;return {ok:true};
        }
        const f=session.game.hunt?.field;
        if(w.mode!=='location'||!f||f.room!=='r0c0'||Math.hypot(f.x-.5,f.y-.95)>.08)return {ok:false,reason:'entrance_required'};
        if(f.mobs.some(m=>m.aggro&&m.currentHp>0))return {ok:false,reason:'room_in_combat'};
        // Exit route ends at the associated settlement; duration uses original world distance.
        const l=LOCATIONS.find(l=>l.id===w.location),c=cityOf(w);w.walkHome={until:now+Math.hypot(l.x-c.x,l.y-c.y)/Math.max(1,getSpeed(session))*1000};w.mode='road';session.game.hunt.field=null;session.game.hunt.mob=null;return {ok:true};
    }
    if(body.action==='buy_scroll'){
        const npc=CITY_NPCS.find(n=>n.id===body.npc);if(w.mode!=='city'||!npc||npc.gateway||npc.instanceGateway||npc.city!==w.city||!nearNpc(w,npc))return {ok:false,reason:'npc_too_far'};
        if(!(session.game.inventory.gold>=1000))return {ok:false,reason:'not_enough_gold'};session.game.inventory.gold-=1000;addMaterial(session,'scroll_escape',1);return {ok:true};
    }
    if(body.action==='floor'){
        const f=session.game.hunt?.field,l=LOCATIONS.find(l=>l.id===w.location),floor=Number(body.floor);
        if(!f||!Number.isInteger(floor)||floor<1||floor>l.floors||Math.abs(floor-(f.floor||1))!==1)return {ok:false,reason:'invalid_floor'};
        if(l.instance?.kind==='labyrinth'&&floor>(f.floor||1)&&f.mobs.some(m=>m.currentHp>0))return {ok:false,reason:'objectives_remaining'};
        if(Math.hypot(f.x-.9,f.y-.1)>.1)return {ok:false,reason:'stairs_required'};
        const old=f.floor||1;f.floors||={};f.floors[old]={mobs:f.mobs,room:f.room,rooms:f.rooms,respawns:f.respawns,visited:f.visited,walls:f.walls};
        const stored=f.floors[floor];
        if(stored)Object.assign(f,stored);else {session.game.hunt.field=null;session.game.hunt.mob=null;const r=enterHuntField(session,w.location,{now});if(!r.ok){session.game.hunt.field=f;return r;}Object.assign(f,session.game.hunt.field);session.game.hunt.field=f;}
        if(!stored)resetInstanceRoom(session,f.room,now,floor);
        f.floor=floor;f.x=.9;f.y=.1;f.path=[];delete f.pendingRoom;session.game.hunt.mob=f.mobs.find(m=>m.instanceId===f.target)||null;return {ok:true};
    }
    return {ok:false,reason:'invalid_action'};
}
export function enterWorldInstance(chat,session,locationId,now=Date.now()){
    const w=advanceWorld(session,now),l=LOCATIONS.find(l=>l.id===locationId),rule=l?.instance;
    const npc=l&&CITY_NPCS.find(n=>n.id===l.npc);
    if(!rule||!npc||w.mode!=='city'||w.city!==npc.city||!nearNpc(w,npc))return {ok:false,reason:'instance_npc_required'};
    const members=partyMembers(chat,session);
    if(String(session.game.party?.leaderId)!==String(session.userId)||members.length<rule.partyMin||members.length>rule.partyMax)return {ok:false,reason:'instance_party_required'};
    if(members.some(m=>!m.game.gameClass?.skills?.length))return {ok:false,reason:'no_class'};
    if(members.some(m=>!alive(m)||m.game.world?.mode!=='city'||m.game.world.city!==npc.city||!nearNpc(m.game.world,npc)))return {ok:false,reason:'party_not_ready'};
    if(rule.kind!=='rift'&&members.some(m=>Math.abs(Number(m.game.stats.lvl)-rule.level)>5))return {ok:false,reason:'instance_level'};
    if(rule.kind==='rift'&&members.some(m=>Number(m.game.stats.lvl)<l.levelMin-5||Number(m.game.stats.lvl)>l.levelMax+5))return {ok:false,reason:'instance_level'};
    const group=rule.kind==='rift'?'rift':rule.kind;
    if(members.some(m=>m.game.world.locks?.[group]>now||m.game.world.instanceId))return {ok:false,reason:'instance_locked'};
    if(rule.fragments&&members.some(m=>!(m.game.inventory.materials?.l2_7079>=rule.fragments)))return {ok:false,reason:'no_rift_fragments'};
    const store=chat.game.worldInstances||={};
    for(const [id,instance] of Object.entries(store))if(instance.until<=now)delete store[id];
    if(Object.keys(store).length>=64)return {ok:false,reason:'instance_busy'};
    const id=`${group}:${session.game.party.id}:${now}`;
    const reset=new Date(now);reset.setUTCHours(3,30,0,0);if(reset.getTime()<=now)reset.setUTCDate(reset.getUTCDate()+1);
    for(const m of members){
        if(rule.fragments)spendMaterials(m,{l2_7079:rule.fragments});
        const mw=m.game.world;mw.instanceId=id;mw.location=l.id;mw.mode='location';mw.path=[];mw.pending=null;mw.channel=null;mw.locks||={};if(rule.kind!=='rift')mw.locks[group]=reset.getTime();
        m.game.hunt&&(m.game.hunt.field=null,m.game.hunt.mob=null);
        enterHuntField(m,l.id,{now});m.needsSave=true;
    }
    store[id]={id,location:l.id,until:now+rule.durationMs,members:members.map(m=>String(m.userId)),rooms:{},stage:0,nextJumpAt:rule.kind==='rift'?now+300000:null,createdAt:now};
    bindWorldInstances(chat,now);return {ok:true,instanceId:id};
}
export function bindWorldInstances(chat,now=Date.now()) {
    const store=chat.game?.worldInstances||{};
    const all=[...(chat.members||[]),...(chat.$locals?.guests||[])];
    for(const instance of Object.values(store))if(instance.nextJumpAt&&instance.nextJumpAt<=now&&instance.until>now){
        instance.stage++;instance.nextJumpAt=now+300000;const zone=getZone(instance.location),rooms=zone?.riftRooms||[];const room=rooms[instance.stage%rooms.length];
        if(room){instance.rooms={};for(const member of all)if(member.game.world?.instanceId===instance.id&&member.game.hunt?.field){resetInstanceRoom(member,room.id,now);member.needsSave=true;}}
    }
    for(const m of all){
        const w=m.game?.world,instance=w?.instanceId&&store[w.instanceId];
        if(!w?.instanceId)continue;
        if(!instance||instance.until<=now||!instance.members.includes(String(m.userId))){arriveCity(m,w);m.needsSave=true;continue;}
        const f=m.game.hunt?.field;if(!f)continue;
        const key=`${f.floor||1}:${f.room}`;
        const room=instance.rooms[key]||={mobs:f.mobs,respawns:[]};f.mobs=room.mobs;f.respawns=room.respawns;
        m.game.hunt.mob=f.mobs.find(mob=>mob.instanceId===f.target)||null;m.needsSave=true;
    }
}
export function worldState(session,now=Date.now()){
    const w=advanceWorld(session,now);if(w.mode==='road'&&w.walkHome?.until<=now){const holding=w.walkHome.holding;arriveCity(session,w);w.readyHolding=holding||null;delete w.walkHome;}
    const {mode,city,location,x,y,path,moveAt,pending,channel,walkHome,holding,instanceId,readyHolding}=w;
    return {now,death:w.death?{...w.death}:null,player:{userId:String(session.userId),mode,city,location,x,y,path,moveAt,pending,channel,walkHome,holding,instanceId,readyHolding,runSpeed:getSpeed(session)*l2MoveMultiplier(session,now),hp:session.game.gameClass?.stats?.hp,level:session.game.stats?.lvl},cities:CITIES,regions:REGIONS,locations:LOCATIONS,npcs:CITY_NPCS,gold:session.game.inventory.gold,scrolls:session.game.inventory.materials?.scroll_escape||0};
}

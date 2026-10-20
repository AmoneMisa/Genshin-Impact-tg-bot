import {findCityPath,advanceCityPath,ensureCityOrigin} from './cityNavigation.js';
import {CITIES, REGIONS, LOCATIONS, CITY_NPCS} from '../../../template/worldMap.js';
import {teleportPrice} from '../runes/labRunes.js';
import {pointInPolygon, findPath, advancePath} from './navigation.js';
import getSpeed from '../player/getters/getSpeed.js';
import {l2MoveMultiplier,l2ActionBlock} from '../player/l2Effects.js';
import {enterHuntField, advanceHunt, moveHuntField, resetInstanceRoom,stopHuntAction,changeHuntFloor} from '../hunt/huntFight.js';
import {levelTransitions} from '../hunt/locationLevels.js';
import {spendMaterials, addMaterial} from '../player/materials.js';
import {getZone} from '../hunt/huntMobs.js';
import holdings from '../../../template/worldHoldings.js';
import {partyMembers} from '../party/party.js';
import {markWorldDeath} from './death.js';
import {questTargets} from './questTargets.js';
import {outdoorPoint,arriveHoldingEntrance,leaveHolding,ENTRANCE_SIZE} from './holdingEntry.js';
import {locationTravelQuote} from './locationTravel.js';
import {townTravelQuote} from './townTravel.js';
import {createShipVoyage,shipInstance,lightShipCandle,tickShip} from './zakenShip.js';
import {SEED_MODES} from '../../../template/seedInstances.js';
import {seedModeAt,seedAdmission,seedFloorBlock,seedAssemblyAction} from './seedInstances.js';
import {getMaterialCount} from '../player/materials.js';
import {regionAccessBlock,spendRegionFare,regionLinks} from './regionAccess.js';
import {nativeRoute,nativeTravel,nativeFreeWalk,nativeWalkOptions,nativeWalkCities,nativeWorldPoint,nativeIsland,nativeIslandPort} from './nativeTravel.js';
import {advanceNativeJourney,nativeJourneyDto,nativeJourneyPosition} from './nativeJourney.js';
import {saveNativeField,restoreNativeField} from './nativeFieldBanks.js';
import {nativeCityAt} from './nativeTownGraph.js';
import {airshipJourneyPosition} from './graciaTravel.js';
import {ferryOptions,buyFerryTicket,boardFerry,advanceFerry,leaveFerry,ferryJourneyPosition,ferryJourneyDto} from './ferryTravel.js';

export {CITIES,REGIONS,LOCATIONS,CITY_NPCS};
const PUBLIC_CITIES=CITIES.map(({arrivals,arrivalSource,...city})=>city);
export const CITY_SIZE=14000;
export const citySize=city=>city?.size||CITY_SIZE;
const cityOf = w => CITIES.find(c=>c.id===w.city) || CITIES[1];
const alive=s=>s.game.gameClass?.stats?.hp>0;
function beginNativeCityWalk(session,target,now){
    const denied=quickTravelBlock(session,now);if(denied)return {ok:false,reason:denied};
    const city=CITIES.find(c=>c.id===target);if(!city)return {ok:false,reason:'unknown_zone'};
    const result=nativeTravel(session,{city:city.id},now,getSpeed(session)*l2MoveMultiplier(session,now));if(!result.ok)return result;
    const w=session.game.world;if(w.mode==='location')saveNativeField(session,now);
    if(session.game.hunt){session.game.hunt.field=null;session.game.hunt.mob=null;}
    Object.assign(w,{mode:'road',location:null,walkHome:result.trip,path:[],pending:null,channel:null});delete w.nativePosition;delete w.cityWalk;return {ok:true};
}
export function ensureWorld(session,now=Date.now()) {
    const existing=session.game.hunt?.field;
    if(!session.game.world){const location=existing&&LOCATIONS.find(l=>l.id===session.game.hunt.zone);session.game.world={version:1,city:location?.region||'giran',location:location?.id||null,mode:location?'location':'city',x:.5,y:.5,moveAt:now,path:[],locks:{}};}
    ensureCityOrigin(session.game.world,cityOf(session.game.world));
    return session.game.world;
}
export function terrainAt(x,y){const point={x,y};return {location:LOCATIONS.find(l=>pointInPolygon(point,l.polygon))?.id||null,region:REGIONS.find(r=>pointInPolygon(point,r.polygon))?.id||null};}
const cityTarget=(city,npc)=>({...cityPoint(city,npc),...(Number.isFinite(npc.z)?{z:npc.z}:{})});
export function cityPoint(city,npc){return {x:.5+(npc.x-city.x)/citySize(city),y:.5+(npc.y-city.y)/citySize(city)};}
function arriveCity(session,world,now=Date.now()){if(world.mode==='location')saveNativeField(session,now);world.mode='city';world.location=null;world.holding=null;world.instanceId=null;world.entryOrigin=null;delete world.holdingReturn;delete world.walkHome;delete world.nativePosition;delete world.nativeIsland;delete world.cityWalk;delete world.z;world.x=.5;world.y=.5;world.path=[];world.channel=null;world.pending=null;world.readyHolding=null;session.game.hunt&&(session.game.hunt.field=null,session.game.hunt.mob=null);}
function enterPublicField(session,id,{departure,...options}){
    const result=enterHuntField(session,id,options);if(!result.ok)return result;
    session.game.world.nativeIsland=nativeRoute(id)?.island||null;
    if(departure)saveNativeField(session,options.now,departure);
    if(nativeRoute(id)){
        if(options.targetMobId){if(session.game.world.nativeFields)delete session.game.world.nativeFields[id];}
        else restoreNativeField(session,id,options.now);
    }
    return result;
}
function stopNativeWalk(w){
    if(w.mode!=='road'||!w.walkHome?.native)return false;
    w.nativePosition={...w.walkHome.native.point};w.mode='native';w.location=null;w.path=[];delete w.walkHome;return true;
}
export function advanceWorld(session,now=Date.now()) {
    const w=ensureWorld(session,now);
    if(!alive(session)){markWorldDeath(session,now);return w;}
    advanceFerry(session,now);
    let nativeDone=false;
    if(w.mode==='road'&&w.walkHome?.native)nativeDone=advanceNativeJourney(w.walkHome,now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now));
    if(w.mode==='road'&&(w.walkHome?.native?nativeDone:w.walkHome?.until<=now)){
        const trip=w.walkHome;
        if(trip.holding){const h=holdings.find(h=>h.id===trip.holding);if(h)arriveHoldingEntrance(session,h,now);}
        else if(trip.location){
            const l=LOCATIONS.find(l=>l.id===trip.location);
            if(l&&!regionAccessBlock(session,l,{walking:true,now})&&enterPublicField(session,l.id,{now}).ok){
                Object.assign(w,{city:l.region,mode:'location',location:l.id,path:[],pending:null,channel:null});
            }else arriveCity(session,w,now);
        }else if(trip.native&&!trip.city){
            if(trip.port){w.city=trip.portCity||trip.port;w.nativeIsland=trip.island||null;}
            const city=nativeCityAt(trip.native.point);
            if(city){w.city=city.id;arriveCity(session,w,now);Object.assign(w,cityPoint(city,trip.native.point),{z:trip.native.point.z});}
            else Object.assign(w,{mode:'native',location:null,nativePosition:{...trip.native.point},path:[],pending:null,channel:null});
        }
        else {if(trip.city)w.city=trip.city;arriveCity(session,w,now);if(trip.native){Object.assign(w,cityPoint(cityOf(w),trip.native.point));w.z=trip.native.point.z;}if(trip.arrivalPoint){Object.assign(w,cityPoint(cityOf(w),trip.arrivalPoint));w.z=trip.arrivalPoint.z;}}
        delete w.walkHome;
    }
    if(w.died){delete w.died;delete w.death;}
    if(w.mode==='location')advanceHunt(session,now);
    if(!alive(session)){markWorldDeath(session,now);return w;}
    if(w.channel){
        if(Number(session.game.gameClass.stats.hp)<w.channel.hp||l2ActionBlock(session,{move:true},now)){w.channel=null;return w;}
        if(now>=w.channel.until){if(spendMaterials(session,{scroll_escape:1}))arriveCity(session,w,now);else w.channel=null;}
    }
    if(['hall','stronghold','entrance'].includes(w.mode))advancePath(w,now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now));
    if(w.mode==='city'){
        advanceCityPath(w,cityOf(w),now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now));
        if(!w.path.length&&w.pending){const pending=w.pending;w.pending=null;const location=LOCATIONS.find(l=>l.id===pending.location),npc=CITY_NPCS.find(n=>n.id===pending.npc);
            if(pending.holding){const h=holdings.find(h=>h.id===pending.holding),point=outdoorPoint(session);if(h?.entry&&point&&Math.hypot(point.x-h.entry.x,point.y-h.entry.y)<=180)w.readyHolding=h.id;}
            else if(pending.city&&npc&&npc.city===w.city&&nearNpc(w,npc)&&session.game.inventory.gold>=pending.gold){
                const current=townTravelQuote(session,pending.city,now);
                if(!current||current.gold!==pending.gold)return w;
                if(current.mode==='airship'){if(quickTravelBlock(session,now))return w;w.mode='road';w.walkHome={until:current.until,city:pending.city,kind:'airship',departureAt:current.departureAt,arrivalPoint:current.arrivalPoint};w.path=[];return w;}
                session.game.inventory.gold-=pending.gold;w.city=pending.city;arriveCity(session,w,now);
                if(pending.arrival){Object.assign(w,cityPoint(cityOf(w),pending.arrival));w.z=pending.arrival.z;}
                const target=CITY_NPCS.find(n=>n.id===pending.approachNpc&&n.city===w.city);
                if(target){w.path=findCityPath(w,cityOf(w),cityTarget(cityOf(w),target))||[];w.moveAt=now;}
            }
            else if(location&&npc&&npc.city===w.city&&npc.gateway&&nearNpc(w,npc)&&locationTravelQuote(session,location,npc,now)&&Number(session.game.inventory.gold)>=locationTravelQuote(session,location,npc,now).gold){
                const quote=locationTravelQuote(session,location,npc,now);
                if(regionAccessBlock(session,location)||quote.item!==57&&getMaterialCount(session,'l2_'+quote.item)<quote.count)return w;
                const entered=enterPublicField(session,location.id,{now});
                if(entered.ok){const fare=locationTravelQuote(session,location,npc,now).gold;if(quote.item!==57)spendMaterials(session,{['l2_'+quote.item]:quote.count});session.game.inventory.gold-=fare;w.city=location.region;w.mode='location';w.location=location.id;w.x=.5;w.y=.95;w.lastTeleport={to:location.id,gold:fare,at:now};}
            }
        }
    }
    return w;
}
function nearNpc(world,npc){const p=cityPoint(cityOf(world),npc);return Math.hypot(world.x-p.x,world.y-p.y)*citySize(cityOf(world))<=180;}
export const QUICK_TRAVEL_MULTIPLIER=3;
export const quickTravelPrice=target=>Math.max(1,Math.ceil(Number(target.teleportGold||20000)*QUICK_TRAVEL_MULTIPLIER));
export function quickCityGold(session,city,now=Date.now()){
    const from=cityOf(ensureWorld(session,now));
    if(!from.parentRegion&&!city.parentRegion)return teleportPrice(session,quickTravelPrice(city),now);
    const route=townTravelQuote(session,city.id,now);
    return route?.mode==='teleport'?teleportPrice(session,route.fee*QUICK_TRAVEL_MULTIPLIER,now):null;
}
export function siegePoint(point){return holdings.some(h=>['castle','fort'].includes(h.kind)&&pointInPolygon(point,h.polygon));}
export function quickTravelBlock(session,now=Date.now()){
    const w=ensureWorld(session,now),hunt=session.game.hunt;
    if(!alive(session)||session.game.respawnTime>now)return 'dead';
    if(w.walkHome?.kind==='ferry')return 'transport_in_progress';
    if(['siege','stronghold'].includes(w.mode))return 'quick_travel_siege';
    const location=LOCATIONS.find(l=>l.id===w.location),city=cityOf(w);
    const point=nativeWorldPoint(session)||outdoorPoint(session)||location;
    if(point&&siegePoint(point))return 'quick_travel_siege';
    if(session.game.stats?.inFightTimer>now||hunt?.field?.mobs?.some(m=>m.aggro&&m.currentHp>0)||(!hunt?.field&&hunt?.mob?.currentHp>0))return 'quick_travel_combat';
    return l2ActionBlock(session,{move:true},now)||null;
}
export function quickTravel(session,body,now=Date.now()){
    const quest=body.quest&&questTargets(session,LOCATIONS).find(q=>q.id===body.quest);
    if(body.quest&&!quest)return {ok:false,reason:'unknown_zone'};
    if(quest)body={...body,location:quest.location};
    if(body.holding)return {ok:false,reason:'quick_travel_siege'};
    if(body.city&&body.location)return {ok:false,reason:'unknown_zone'};
    const blocked=quickTravelBlock(session,now);if(blocked)return {ok:false,reason:blocked};
    const city=body.city&&CITIES.find(c=>c.id===body.city),location=body.location&&LOCATIONS.find(l=>l.id===body.location);
    if(Boolean(city)===Boolean(location))return {ok:false,reason:body.holding?'quick_travel_siege':'unknown_zone'};
    const target=city||location;
    if(siegePoint(target))return {ok:false,reason:'quick_travel_siege'};
    if(location?.instance)return {ok:false,reason:'instance_npc_required'};
    if(location){const denied=regionAccessBlock(session,location);if(denied)return {ok:false,reason:denied};}
    const w=ensureWorld(session,now);
    if(city&&w.mode==='city'&&w.city===city.id)return {ok:false,reason:'already_in_city'};
    const gold=city?quickCityGold(session,city,now):teleportPrice(session,quickTravelPrice(target),now);
    if(gold===null)return {ok:false,reason:'city_route_unavailable'};
    if(!(Number(session.game.inventory.gold)>=gold))return {ok:false,reason:'not_enough_gold'};
    if(location){
        const previous=session.game.hunt;
        session.game.hunt=null;
        const entered=enterPublicField(session,location.id,{now,targetMobId:quest?.mobId,departure:w.mode==='location'?previous:null});
        if(!entered.ok){session.game.hunt=previous;return entered;}
        spendRegionFare(session,location);Object.assign(w,{city:location.region,mode:'location',location:location.id,x:.5,y:.95});
    }else {w.city=city.id;arriveCity(session,w,now);}
    Object.assign(w,{path:[],pending:null,channel:null,holding:null,instanceId:null,readyHolding:null,moveAt:now});delete w.walkHome;
    session.game.inventory.gold-=gold;w.lastTeleport={to:target.id,gold,at:now,quick:true};session.needsSave=true;
    return {ok:true,gold};
}
export function worldAction(session,body,now=Date.now()){
    if(body.action==='quick_travel')return quickTravel(session,body,now);
    const w=advanceWorld(session,now);
    if(!alive(session))return {ok:false,reason:'dead'};
    if(body.action==='ferry_leave')return leaveFerry(session,now);
    if(['ferry_ticket','ferry_board','ferry_walk'].includes(body.action)){
        const denied=quickTravelBlock(session,now);if(denied)return {ok:false,reason:denied};
        if(body.action==='ferry_ticket')return buyFerryTicket(session,body.port);
        if(body.action==='ferry_board'){
            const result=boardFerry(session,body.port,now);if(!result.ok)return result;
            Object.assign(w,{mode:'road',walkHome:result.trip,path:[],pending:null,channel:null,location:null});delete w.nativePosition;delete w.cityWalk;return {ok:true};
        }
        const result=nativeTravel(session,{port:body.port,stop:body.stop},now,getSpeed(session)*l2MoveMultiplier(session,now));if(!result.ok)return result;
        if(w.mode==='location')saveNativeField(session,now);
        if(session.game.hunt){session.game.hunt.field=null;session.game.hunt.mob=null;}
        Object.assign(w,{mode:'road',walkHome:result.trip,path:[],pending:null,channel:null,location:null});delete w.nativePosition;delete w.cityWalk;return {ok:true};
    }
    if(body.action==='native_stop'){
        return stopNativeWalk(w)?{ok:true}:{ok:false,reason:'no_field'};
    }
    if(body.action==='native_move'){
        const denied=quickTravelBlock(session,now);if(denied)return {ok:false,reason:denied};
        const result=nativeFreeWalk(session,body.point,now,getSpeed(session)*l2MoveMultiplier(session,now));
        if(!result.ok)return result;
        Object.assign(w,{mode:'road',location:null,walkHome:result.trip,path:[],pending:null,channel:null});delete w.nativePosition;delete w.cityWalk;return {ok:true};
    }
    if(body.action==='native_walk_city'){
        return beginNativeCityWalk(session,body.city,now);
    }
    if(body.action==='approach_npc'){
        const target=CITY_NPCS.find(n=>n.id===body.npc);
        if(!target)return {ok:false,reason:'unknown_npc'};
        if(w.mode!=='city')return {ok:false,reason:'return_to_city'};
        const blocked=l2ActionBlock(session,{move:true},now);if(blocked)return {ok:false,reason:blocked};
        const gate=CITY_NPCS.find(n=>n.city===w.city&&n.gateway);
        const remote=target.city!==w.city;
        if(remote&&!gate)return {ok:false,reason:'gatekeeper_required'};
        const quote=remote?townTravelQuote(session,target.city,now):null;
        if(remote&&quote?.mode!=='teleport')return {ok:false,reason:'city_route_unavailable'};
        if(remote&&session.game.inventory.gold<quote.gold)return {ok:false,reason:'not_enough_gold'};
        const path=findCityPath(w,cityOf(w),cityTarget(cityOf(w),remote?gate:target));
        if(!path)return {ok:false,reason:'path_blocked'};
        w.path=path;w.moveAt=now;w.channel=null;
        w.pending=remote?{npc:gate.id,city:target.city,gold:quote.gold,arrival:quote,approachNpc:target.id}:null;
        return {ok:true};
    }
    if(body.action==='move'){
        w.channel=null;w.pending=null;
        if(w.mode==='location')return moveHuntField(session,body.point,now);
        if(!['city','stronghold','entrance'].includes(w.mode))return {ok:false,reason:'no_field'};
        const blocked=l2ActionBlock(session,{move:true},now);if(blocked)return {ok:false,reason:blocked};
        const point={x:Number(body.point?.x),y:Number(body.point?.y)};
        if(w.mode==='city'){
            const city=cityOf(w),ground={x:city.x+(point.x-.5)*citySize(city),y:city.y+(point.y-.5)*citySize(city)};
            const outside=city.boundarySource&&!pointInPolygon(ground,city.polygon)||point.x<.02||point.x>.98||point.y<.02||point.y>.98;
            if(outside){
                const result=nativeFreeWalk(session,ground,now,getSpeed(session)*l2MoveMultiplier(session,now));if(!result.ok)return result;
                Object.assign(w,{mode:'road',location:null,walkHome:result.trip,path:[],pending:null,channel:null});delete w.cityWalk;delete w.nativePosition;return {ok:true};
            }
        }
        const path=w.mode==="city"?findCityPath(w,cityOf(w),point):findPath(w,point);
        if(!path)return {ok:false,reason:'path_blocked'};w.path=path;w.moveAt=now;return {ok:true};
    }
    if(body.action==='walk_location'){
        const location=LOCATIONS.find(l=>l.id===body.location),city=cityOf(w);
        if(location&&nativeRoute(location.id)&&['city','location','native'].includes(w.mode)){
            const denied=quickTravelBlock(session,now)||regionAccessBlock(session,location,{walking:true,now});if(denied)return {ok:false,reason:denied};
            const result=nativeTravel(session,{location:location.id},now,getSpeed(session)*l2MoveMultiplier(session,now));
            if(!result.ok)return result;
            if(w.mode==='location')saveNativeField(session,now);
            if(session.game.hunt){session.game.hunt.field=null;session.game.hunt.mob=null;}
            Object.assign(w,{mode:'road',walkHome:result.trip,path:[],pending:null,channel:null});delete w.nativePosition;return {ok:true};
        }
        if(!location?.entrySource||location.continent==='gracia'||location.access?.kind==='linked'||location.instance||w.mode!=='city'||![city.id,city.parentRegion].includes(location.region))return {ok:false,reason:'location_path_required'};
        const denied=quickTravelBlock(session,now)||regionAccessBlock(session,location,{walking:true,now});if(denied)return {ok:false,reason:denied};
        const start=outdoorPoint(session),duration=Math.max(1000,Math.hypot(start.x-location.x,start.y-location.y)/Math.max(1,getSpeed(session))*1000);
        w.mode='road';w.path=[];w.pending=null;w.channel=null;w.walkHome={until:now+duration,location:location.id,kind:'walk',routeGeometry:'adapted-direct-distance'};return {ok:true};
    }
    if(body.action==='travel'){
        if(w.mode!=='city')return {ok:false,reason:'gatekeeper_required'};
        const location=LOCATIONS.find(l=>l.id===body.location),npc=CITY_NPCS.find(n=>n.city===w.city&&n.gateway);
        if(!location||!npc)return {ok:false,reason:'unknown_zone'};
        if(location.instance)return {ok:false,reason:'instance_npc_required'};
        const denied=regionAccessBlock(session,location);if(denied)return {ok:false,reason:denied};
        const quote=locationTravelQuote(session,location,npc,now);if(!quote)return {ok:false,reason:'city_route_unavailable'};
        if(quote.item!==57&&getMaterialCount(session,'l2_'+quote.item)<quote.count)return {ok:false,reason:'entry_material_required'};
        if(Number(session.game.inventory.gold)<quote.gold)return {ok:false,reason:'not_enough_gold'};
        const path=findCityPath(w,cityOf(w),cityTarget(cityOf(w),npc));if(!path)return {ok:false,reason:'path_blocked'};
        w.path=path;w.moveAt=now;w.pending={npc:npc.id,location:location.id};w.channel=null;return {ok:true};
    }
    if(body.action==='travel_city'){
        const city=CITIES.find(c=>c.id===body.city);let npc=CITY_NPCS.find(n=>n.city===w.city&&n.gateway);
        if(w.mode!=='city'||!city||city.id===w.city)return {ok:false,reason:'gatekeeper_required'};
        const quote=townTravelQuote(session,city.id,now);if(!quote)return {ok:false,reason:'city_route_unavailable'};
        if(quote.mode==='airship'){const blocked=quickTravelBlock(session,now);if(blocked)return {ok:false,reason:blocked};}
        if(quote.npc)npc=CITY_NPCS.find(n=>n.id===quote.npc&&n.city===w.city);
        if(quote.mode==='walk'){
            return beginNativeCityWalk(session,city.id,now);
        }
        if(!npc)return {ok:false,reason:'gatekeeper_required'};
        if(!(session.game.inventory.gold>=quote.gold))return {ok:false,reason:'not_enough_gold'};
        const path=findCityPath(w,cityOf(w),cityTarget(cityOf(w),npc));if(!path)return {ok:false,reason:'path_blocked'};
        w.path=path;w.moveAt=now;w.pending={npc:npc.id,city:city.id,gold:quote.gold,arrival:quote};return {ok:true};
    }
    if(body.action==='escape'){
        if(w.mode==='city')return {ok:false,reason:'already_in_city'};
        if(w.channel)return {ok:false,reason:'channel_busy'};
        if(!(session.game.inventory.materials?.scroll_escape>0))return {ok:false,reason:'no_escape_scroll'};
        const field=session.game.hunt?.field;if(field)stopHuntAction(field,now);
        stopNativeWalk(w);
        w.path=[];w.pending=null;w.channel={until:now+15000,hp:Number(session.game.gameClass.stats.hp)};return {ok:true};
    }
    if(body.action==='holding_travel'){
        const h=holdings.find(h=>h.id===body.holding);
        if(!h||w.mode!=='city'||(w.city!==h.region&&cityOf(w).parentRegion!==h.region))return {ok:false,reason:'holding_region_required'};
        if(!h.entry)return {ok:false,reason:'holding_entry_missing'};
        const start=outdoorPoint(session),target=cityPoint(cityOf(w),h.entry),path=findCityPath(w,cityOf(w),target);
        w.pending=null;w.channel=null;w.readyHolding=null;
        if(path){w.path=path;w.moveAt=now;w.pending={holding:h.id};}
        else {w.path=[];w.mode='road';w.walkHome={until:now+Math.max(1000,Math.hypot(h.entry.x-start.x,h.entry.y-start.y)/Math.max(1,getSpeed(session))*1000),holding:h.id};}
        return {ok:true};
    }
    if(body.action==='walk_exit'){
        if(w.mode==='native'){const port=nativeIslandPort(session);return worldAction(session,port?{action:'ferry_walk',port,stop:'vendor'}:{action:'native_walk_city',city:w.city},now);}
        const native=nativeRoute(w.location);
        if(w.mode==='location'&&native?.isolatedPort)return worldAction(session,{action:'ferry_walk',port:native.isolatedPort,stop:'vendor'},now);
        if(w.mode==='location'&&native?.returnPath)return worldAction(session,{action:'native_walk_city',city:native.city},now);
        if(['hall','stronghold','siege'].includes(w.mode))return leaveHolding(session,holdings.find(h=>h.id===w.holding),{now});
        if(w.mode==='entrance'){
            const from=outdoorPoint(session),city=cityOf(w);w.walkHome={until:now+Math.max(1000,Math.hypot(from.x-city.x,from.y-city.y)/Math.max(1,getSpeed(session))*1000)};w.mode='road';w.holding=null;w.readyHolding=null;w.path=[];return {ok:true};
        }
        const f=session.game.hunt?.field;
        if(w.mode!=='location'||!f||f.room!=='r0c0'||Math.hypot(f.x-.5,f.y-.95)>.08)return {ok:false,reason:'entrance_required'};
        if(f.mobs.some(m=>m.aggro&&m.currentHp>0))return {ok:false,reason:'room_in_combat'};
        // Exit route ends at the associated settlement; duration uses original world distance.
        const l=LOCATIONS.find(l=>l.id===w.location),c=cityOf(w);w.walkHome={until:now+Math.hypot(l.x-c.x,l.y-c.y)/Math.max(1,getSpeed(session))*1000};w.mode='road';session.game.hunt.field=null;session.game.hunt.mob=null;return {ok:true};
    }
    if(body.action==='pagan_church'){
        const npc=CITY_NPCS.find(n=>n.service==='pagan-church');
        if(w.mode!=='city'||w.city!==npc.city||!nearNpc(w,npc))return {ok:false,reason:'npc_too_far'};
        const denied=quickTravelBlock(session,now);if(denied)return {ok:false,reason:denied};
        const result=enterHuntField(session,'pagan-temple',{now,floor:3});
        if(result.ok)Object.assign(w,{mode:'location',location:'pagan-temple',instanceId:null,path:[],pending:null,channel:null});
        return result;
    }
    if(body.action==='buy_scroll'){
        const npc=CITY_NPCS.find(n=>n.id===body.npc);if(w.mode!=='city'||!npc||npc.gateway||npc.instanceGateway||npc.city!==w.city||!nearNpc(w,npc))return {ok:false,reason:'npc_too_far'};
        if(!(session.game.inventory.gold>=1000))return {ok:false,reason:'not_enough_gold'};session.game.inventory.gold-=1000;addMaterial(session,'scroll_escape',1);return {ok:true};
    }
    if(['seed_assembly','seed_join'].includes(body.action))return seedAssemblyAction(session,body,now);
    if(body.action==='seed_quest'){
        const f=session.game.hunt?.field,id=Number(body.quest),lvl=Number(session.game.stats?.lvl);
        if(w.mode!=='location'||w.location!=='seed-of-infinity'||f?.floor!==1||f.room!=='r0c0'||Math.hypot(f.x-.9,f.y-.1)>.1)return {ok:false,reason:'npc_too_far'};
        if(![694,696].includes(id)||lvl<75||id===694&&lvl>82)return {ok:false,reason:'instance_level'};
        if(id===696&&!getMaterialCount(session,'l2_13691')&&!getMaterialCount(session,'l2_13692'))return {ok:false,reason:'seed_mark_required'};
        (w.seedQuests||={})[id]=1;return {ok:true};
    }
    if(body.action==='floor'){
        const f=session.game.hunt?.field,l=LOCATIONS.find(l=>l.id===w.location),floor=Number(body.floor);
        if(w.mode!=='location'||!f||!l||session.game.hunt.zone!==l.id||!Number.isInteger(floor)||floor<1||floor>l.floors||floor===(f.floor||1))return {ok:false,reason:'invalid_floor'};
        const blocked=l2ActionBlock(session,{move:true},now);if(blocked)return {ok:false,reason:blocked};
        if(l.access?.kind==='seed-instance'){
            if(f.floor===1&&floor>1){
                const d=levelTransitions(l.id,f)?.destinations.find(d=>d.floor===floor);
                if(!d?.near)return {ok:false,reason:'stairs_required'};
                return enterSeedExpedition(session,seedModeAt(l.id,floor),now);
            }
            const denied=seedFloorBlock(session,l.id,floor,now);if(denied)return {ok:false,reason:denied};
        }
        if(l.instance?.kind==='labyrinth'&&floor>(f.floor||1)&&f.mobs.some(m=>m.currentHp>0))return {ok:false,reason:'objectives_remaining'};
        const transitions=levelTransitions(l.id,f),destination=transitions?.destinations.find(d=>d.floor===floor);
        if(transitions&&!destination||!transitions&&Math.abs(floor-(f.floor||1))!==1)return {ok:false,reason:'invalid_floor'};
        if(transitions?!destination?.near:Math.hypot(f.x-.9,f.y-.1)>.1)return {ok:false,reason:'stairs_required'};
        if(destination?.mode==='teleport'){const denied=quickTravelBlock(session,now);if(denied)return {ok:false,reason:denied};}
        const gold=destination?.gold||0;if(session.game.inventory.gold<gold)return {ok:false,reason:'not_enough_gold'};
        if(l.id==='devils-isle'&&floor>=4&&!shipInstance(session)){
            if(f.floor!==3||floor!==4)return {ok:false,reason:'ship_required'};
            return enterZakenShip(session,now);
        }
        const result=changeHuntFloor(session,floor,{now,arrival:destination?.arrival});
        if(result.ok){if(l.access?.kind==='seed-instance'&&floor===1)w.instanceId=null;session.game.inventory.gold-=gold;if(l.id==='devils-isle'&&floor===3)w.instanceId=null;}
        return result;
    }
    if(body.action==='location_link'){
        const f=session.game.hunt?.field,l=LOCATIONS.find(l=>l.id===body.location),link=f&&regionLinks(w.location,f).find(p=>p.location===body.location);
        if(w.mode!=='location'||!link?.near||!l)return {ok:false,reason:'location_path_required'};
        const blocked=quickTravelBlock(session,now)||regionAccessBlock(session,l,{linked:true,now});if(blocked)return {ok:false,reason:blocked};
        const members=l.access?.partyMin?partyMembers(session.ownerDocument?.(),session):[session];
        if(l.access?.partyMin&&(String(session.game.party?.leaderId)!==String(session.userId)||members.length<l.access.partyMin))return {ok:false,reason:'instance_party_required'};
        for(const member of members){
            const field=member.game.hunt?.field,peer=field&&regionLinks(member.game.world?.location,field).find(p=>p.location===l.id);
            if(!peer?.near||member.game.world?.location!==w.location||!alive(member))return {ok:false,reason:'party_not_ready'};
            const denied=quickTravelBlock(member,now)||regionAccessBlock(member,l,{linked:true,now});if(denied)return {ok:false,reason:denied};
        }
        for(const member of members){member.game.hunt=null;enterHuntField(member,l.id,{now});Object.assign(member.game.world,{location:l.id,city:l.region,instanceId:null,path:[],pending:null,channel:null});member.needsSave=true;}
        return {ok:true};
    }
    if(body.action==='ship_candle'){
        const denied=l2ActionBlock(session,{move:true},now);if(denied)return {ok:false,reason:denied};
        if(!alive(session))return {ok:false,reason:'dead'};
        return lightShipCandle(session,Number(body.candle),now);
    }
    return {ok:false,reason:'invalid_action'};
}
export function enterSeedExpedition(session,key,now=Date.now()){
 const world=session.game.world,existing=session.ownerDocument?.()?.game?.worldInstances?.[world.seedVoyage];
 if(SEED_MODES[key]&&existing?.kind==='seed'&&existing.seedMode===key&&existing.location===world.location&&existing.until>now&&existing.members.includes(String(session.userId))){
  const blocked=quickTravelBlock(session,now);if(blocked)return {ok:false,reason:blocked};
  const start=SEED_MODES[key].startFloor;
  changeHuntFloor(session,start,{now});world.instanceId=existing.id;session.needsSave=true;bindWorldInstances(session.ownerDocument(),now);return {ok:true,instanceId:existing.id};
 }
 const entry=seedAdmission(session,key,now);if(!entry.ok)return entry;
 const {members,mode,assembly}=entry,chat=session.ownerDocument(),store=chat.game.worldInstances||={};
 if(Object.values(store).filter(i=>i.until>now).length>=64)return {ok:false,reason:'instance_busy'};
 const id=assembly?.id||`seed:${key}:${session.game.party.id}:${now}`;
 const instance={id,kind:'seed',seedMode:key,location:mode.location,until:now+mode.durationMs,members:members.map(m=>String(m.userId)),rooms:{},defeated:{},createdAt:now};
 store[id]=instance;
 for(const member of members){
  member.game.hunt.field.floorStates={};
  changeHuntFloor(member,mode.startFloor,{now});
  const w=member.game.world;w.instanceId=id;w.seedVoyage=id;w.seedAssembly=null;
  if(key!=='tiat')(w.locks||={})['seed:'+mode.instanceId]=now+86400000;
  member.needsSave=true;
 }
 bindWorldInstances(chat,now);return {ok:true,instanceId:id};
}
export function enterZakenShip(session,now=Date.now(),random=Math.random){
 const chat=session.ownerDocument?.();if(!chat)return {ok:false,reason:'ship_required'};
 const members=session.game.party?partyMembers(chat,session):[session];
 if(session.game.party&&String(session.game.party.leaderId)!==String(session.userId))return {ok:false,reason:'instance_party_required'};
 if(!members.length||members.some(m=>{
  const w=m.game.world,f=m.game.hunt?.field,d=f&&levelTransitions('devils-isle',f)?.destinations.find(d=>d.floor===4);
  return !alive(m)||w?.mode!=='location'||w.location!=='devils-isle'||f?.floor!==3||!d?.near||quickTravelBlock(m,now)||w.instanceId;
 }))return {ok:false,reason:'party_not_ready'};
 const store=chat.game.worldInstances||={};
 let instance=store[session.game.world.zakenVoyage];
 if(!instance||instance.until<=now||members.some(m=>!instance.members.includes(String(m.userId)))){
  if(Object.values(store).filter(i=>i.until>now).length>=64)return {ok:false,reason:'instance_busy'};
  const id=`zaken-ship:${session.game.party?.id||session.userId}:${now}`;
  instance=createShipVoyage(id,members,now,random);store[id]=instance;
 }
 for(const m of members){changeHuntFloor(m,4,{now});m.game.world.instanceId=instance.id;m.game.world.zakenVoyage=instance.id;m.needsSave=true;}
 bindWorldInstances(chat,now);return {ok:true,instanceId:instance.id};
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
    for(const instance of Object.values(store)){
        tickShip(instance,now);
        if(instance.kind==='seed'&&['tiat','erosion'].includes(instance.seedMode)&&instance.completedAt&&!instance.lockApplied){
            const finish=new Date(instance.completedAt);finish.setUTCHours(3,30,0,0);if(finish.getTime()<=instance.completedAt)finish.setUTCDate(finish.getUTCDate()+1);let reset=finish.getTime();
            if(instance.seedMode==='tiat'){
                const date=new Date(instance.completedAt);date.setUTCHours(3,30,0,0);
                while(date.getTime()<=instance.completedAt||![3,6].includes(date.getUTCDay()))date.setUTCDate(date.getUTCDate()+1);
                reset=date.getTime();
            }
            for(const member of all)if(instance.members.includes(String(member.userId))){
                const world=member.game.world;(world.locks||={})['seed:'+(instance.seedMode==='tiat'?110:instance.seedMode==='suffering'?115:instance.seedMode==='erosion'?119:121)]=reset;
                member.needsSave=true;
            }
            instance.lockApplied=true;
        }
    }
    for(const instance of Object.values(store))if(instance.nextJumpAt&&instance.nextJumpAt<=now&&instance.until>now){
        instance.stage++;instance.nextJumpAt=now+300000;const zone=getZone(instance.location),rooms=zone?.riftRooms||[];const room=rooms[instance.stage%rooms.length];
        if(room){instance.rooms={};for(const member of all)if(member.game.world?.instanceId===instance.id&&member.game.hunt?.field){resetInstanceRoom(member,room.id,now);member.needsSave=true;}}
    }
    for(const m of all){
        const w=m.game?.world,instance=w?.instanceId&&store[w.instanceId];
        if(!w?.instanceId)continue;
        if(!instance||instance.until<=now||!instance.members.includes(String(m.userId))){
            if(instance?.kind==='seed'&&instance.members.includes(String(m.userId))&&m.game.hunt?.field){changeHuntFloor(m,1,{now});w.instanceId=null;}
            else arriveCity(m,w);
            m.needsSave=true;continue;
        }
        const f=m.game.hunt?.field;if(!f)continue;
        const key=`${f.floor||1}:${f.room}`;
        const room=instance.rooms[key]||={mobs:f.mobs,respawns:[]};f.mobs=room.mobs;f.respawns=room.respawns;
        m.game.hunt.mob=f.mobs.find(mob=>mob.instanceId===f.target)||null;m.needsSave=true;
    }
}
export function worldState(session,now=Date.now()){
    const w=advanceWorld(session,now);
    const {mode,city,location,x,y,path,moveAt,pending,channel,walkHome,holding,instanceId,readyHolding,boss,bossPosition,bossRoom}=w;
    const nativePosition=mode==='road'?(ferryJourneyPosition(walkHome,now)||airshipJourneyPosition(walkHome,now)||nativeJourneyPosition(walkHome)):mode==='native'?{worldPoint:w.nativePosition,worldPath:[]}:null;
    return {now,walkingExit:nativeIsland(session)?'port':null,ferries:ferryOptions(session,now),nativeWalk:nativeWalkOptions(session),nativeWalkCities:nativeWalkCities(session),locationTravel:Object.fromEntries(LOCATIONS.map(l=>[l.id,locationTravelQuote(session,l,CITY_NPCS.find(n=>n.city===w.city&&n.gateway),now)])),cityTravel:Object.fromEntries(CITIES.map(c=>[c.id,townTravelQuote(session,c.id,now)])),questTargets:questTargets(session,LOCATIONS),quickTravel:{multiplier:QUICK_TRAVEL_MULTIPLIER,blocked:quickTravelBlock(session,now),cities:CITIES.flatMap(c=>{const gold=quickCityGold(session,c,now);return gold===null?[]:[{id:c.id,gold}];}),locations:LOCATIONS.filter(l=>!l.instance&&!siegePoint(l)&&!regionAccessBlock(session,l,{now})).map(l=>({id:l.id,gold:teleportPrice(session,quickTravelPrice(l),now)}))},death:w.death?{...w.death}:null,player:{hallRoom:w.hallRoom,areaSize:mode==='city'?citySize(cityOf(w)):ENTRANCE_SIZE,entryOrigin:mode==='entrance'?w.entryOrigin:null,userId:String(session.userId),mode,city,location,x,y,path,moveAt,pending,channel,walkHome:nativeJourneyDto(ferryJourneyDto(walkHome)),holding,instanceId,readyHolding,...nativePosition,runSpeed:walkHome?.native&&l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now),boss,bossPosition,bossRoom,hp:session.game.gameClass?.stats?.hp,level:session.game.stats?.lvl},cities:PUBLIC_CITIES,regions:REGIONS,locations:LOCATIONS,npcs:CITY_NPCS,gold:session.game.inventory.gold,scrolls:session.game.inventory.materials?.scroll_escape||0};
}

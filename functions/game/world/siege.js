// Reality of Lineage encounter scale. Original ownership boundaries come from H5 XML.
import {findPath,advancePath} from './navigation.js';
import getSpeed from '../player/getters/getSpeed.js';
import {l2ActionBlock,l2MoveMultiplier} from '../player/l2Effects.js';
import holdings from '../../../template/worldHoldings.js';
import {enterHolding} from './holdingEntry.js';
import {hallScenario,hallConquestAction,advanceHallContest} from './hallConquest.js';
const memberId=s=>String(s.userId),clanId=c=>String(c?._id||'');
export const SIEGE_RULES={fort:{minClanLevel:4,waitMs:3600000,durationMs:3600000,channelMs:60000},castle:{minClanLevel:5,waitMs:86400000,durationMs:7200000,channelMs:180000},hall:{minClanLevel:4,waitMs:86400000,durationMs:3600000,channelMs:60000}};
const objectives=kind=>[{id:'gate',name:'Ворота',x:.5,y:.8,hp:5000,maxHp:5000},...['captain','commander','mage'].map((id,i)=>({id,name:['Капитан гарнизона','Командир','Маг гарнизона'][i],x:.25+i*.25,y:.5,hp:2500,maxHp:2500,reward:kind==='fort'?25:0})),{id:'artifact',name:kind==='castle'?'Священный артефакт':'Командный флаг',x:.5,y:.12,hp:1,maxHp:1}];
export function reconcileMilitaryOwnership(records){
    const groups=new Map();for(const r of records){const kind=holdings.find(h=>h.id===r._id)?.kind;if(!r.owner||!['fort','castle'].includes(kind))continue;const cid=String(r.owner.clanId);if(!groups.has(cid))groups.set(cid,[]);groups.get(cid).push({record:r,kind});}
    for(const rows of groups.values())if(new Set(rows.map(r=>r.kind)).size>1){rows.sort((a,b)=>(Number(b.record.owner.capturedAt)||0)-(Number(a.record.owner.capturedAt)||0)||Number(b.kind==='castle')-Number(a.kind==='castle'));const keep=rows[0].kind;for(const r of rows)if(r.kind!==keep){r.record.owner=null;r.record.markModified?.('owner');}}
}
export function settleSiege(record,now=Date.now(),records=[]){
    const hall=holdings.find(h=>h.id===record._id&&hallScenario(h));
    if(hall){advanceHallContest(record,hall,now,records);return;}
    const s=record.siege;if(!s)return;
    if(s.channel){const p=s.players[s.channel.userId];const valid=p&&p.seenAt>=now-10000&&Math.hypot(p.x-.5,p.y-.12)<.08&&p.hp>=s.channel.hp&&p.clanId===s.channel.clan.clanId&&p.leader;if(!valid)s.channel=null;else if(now>=s.channel.until){s.winner=s.channel.clan;s.channel=null;}}
    if((now>=s.endsAt||(s.winner&&s.kind!=='castle'))&&!s.settled){if(s.winner){
        const opposite=s.kind==='castle'?'fort':s.kind==='fort'?'castle':null;
        if(opposite)for(const other of records)if(other!==record&&other.owner?.clanId===s.winner.clanId&&holdings.find(h=>h.id===other._id)?.kind===opposite){other.owner=null;other.markModified?.('owner');}
        record.owner={...s.winner,capturedAt:now};record.markModified?.('owner');
    }s.settled=true;record.markModified?.('siege');}
}
export function siegeAction(record,holding,session,clan,body,now=Date.now(),records=[]){
    if(hallScenario(holding))return hallConquestAction(record,holding,session,clan,body,now,records);
    const rule=SIEGE_RULES[holding.kind],cid=clanId(clan),uid=memberId(session);
    if(!clan||!cid)return {ok:false,reason:'not_in_clan'};
    if(body.action==='siege_register'||body.action==='siege_enter')settleSiege(record,now,records);
    if(body.action==='siege_register'){
        if(!holding.conquerable)return {ok:false,reason:'hall_auction_required'};
        if(Number(clan.level)<rule.minClanLevel||String(clan.owner)!==uid)return {ok:false,reason:'siege_leader_required'};
        if(!record.siege||record.siege.settled){record.rewards||=[];for(const reward of Object.values(record.siege?.rewarded||{}))if(!record.rewards.some(r=>r.event===reward.event))record.rewards.push(reward);}
        if(!record.siege||record.siege.settled)record.siege={kind:holding.kind,id:`${holding.id}:${now}`,startsAt:now+rule.waitMs,endsAt:now+rule.waitMs+rule.durationMs,registrations:{},players:{},objectives:objectives(holding.kind),rewarded:{},winner:null};
        if(now>=record.siege.startsAt)return {ok:false,reason:'siege_registration_closed'};
        record.siege.registrations[cid]={clanId:cid,name:clan.name,side:body.side==='defender'?'defender':'attacker'};return {ok:true};
    }
    const s=record.siege;
    if(!s||s.settled||now<s.startsAt||now>=s.endsAt)return {ok:false,reason:'siege_closed'};
    if(!s.registrations[cid])return {ok:false,reason:'siege_not_registered'};
    const world=session.game.world;
    if(body.action==='siege_enter'){
        if(!(session.game.gameClass.stats.hp>0))return {ok:false,reason:'dead'};
        const entered=enterHolding(session,holding,'siege',now);if(!entered.ok)return entered;
        s.players[uid]={x:.5,y:.95,path:[],moveAt:now,seenAt:now,hp:session.game.gameClass.stats.hp,clanId:cid};return {ok:true};
    }
    const p=s.players[uid];
    if(world?.holding!==holding.id||world.mode!=='siege'||!p||session.game.gameClass.stats.hp<=0)return {ok:false,reason:'not_in_siege'};
    if(l2ActionBlock(session,{move:true},now)){p.path=[];if(s.channel?.userId===uid)s.channel=null;}
    advancePath(p,now,l2ActionBlock(session,{move:true},now)?0:getSpeed(session)*l2MoveMultiplier(session,now));p.seenAt=now;p.hp=session.game.gameClass.stats.hp;p.clanId=cid;p.leader=String(clan.owner)===uid;
    world.x=p.x;world.y=p.y;
    if(s.channel?.userId===uid&&(p.clanId!==s.channel.clan.clanId||!p.leader||l2ActionBlock(session,{attack:true},now)))s.channel=null;
    if(p.pendingDamage){session.game.gameClass.stats.hp=Math.max(0,session.game.gameClass.stats.hp-p.pendingDamage);p.hp=session.game.gameClass.stats.hp;p.pendingDamage=0;if(!p.hp){session.game.respawnTime=now+30000;return {ok:false,reason:'dead'};}}
    if(body.action==='siege_move'){
        const blocked=l2ActionBlock(session,{move:true},now);if(blocked)return {ok:false,reason:blocked};
        const path=findPath(p,{x:Number(body.point?.x),y:Number(body.point?.y)},s.objectives[0].hp>0?[{x:0,y:.72,w:.42,h:.06},{x:.58,y:.72,w:.42,h:.06}]:[]);
        if(!path)return {ok:false,reason:'path_blocked'};p.path=path;p.moveAt=now;if(s.channel?.userId===uid)s.channel=null;return {ok:true};
    }
    if(body.action==='siege_interrupt'){
        const blocked=l2ActionBlock(session,{attack:true},now);if(blocked)return {ok:false,reason:blocked};
        const target=s.players[String(body.userId)];
        if(!target||target.clanId===cid||target.hp<=0||target.seenAt<now-10000)return {ok:false,reason:'pvp_invalid_target'};
        if(Math.hypot(p.x-target.x,p.y-target.y)>.15)return {ok:false,reason:'target_too_far'};
        if(p.nextAttackAt>now)return {ok:false,reason:'cooldown'};p.nextAttackAt=now+2000;
        target.pendingDamage=(target.pendingDamage||0)+Math.max(10,Math.min(500,Number(session.game.gameClass.stats.attack)||100));
        if(s.channel?.userId===String(body.userId))s.channel=null;return {ok:true};
    }
    if(body.action==='siege_attack'){
        const blocked=l2ActionBlock(session,{attack:true},now);if(blocked)return {ok:false,reason:blocked};
        if(s.registrations[cid].side!=='attacker')return {ok:false,reason:'siege_attacker_required'};
        const target=s.objectives.find(o=>o.id===body.target&&o.id!=='artifact');
        if(!target||target.hp<=0)return {ok:false,reason:'objective_dead'};
        if(Math.hypot(p.x-target.x,p.y-target.y)>.15)return {ok:false,reason:'target_too_far'};
        if(p.nextAttackAt>now)return {ok:false,reason:'cooldown'};p.nextAttackAt=now+2000;
        const damage=Math.max(10,Math.min(500,Number(session.game.gameClass.stats.attack)||100));target.hp=Math.max(0,target.hp-damage);
        if(target.id!=='gate'){session.game.gameClass.stats.hp=Math.max(0,session.game.gameClass.stats.hp-20);p.hp=session.game.gameClass.stats.hp;if(!p.hp)session.game.respawnTime=now+30000;}
        if(s.channel?.userId===uid)s.channel=null;
        if(target.hp===0&&!s.rewarded[target.id])s.rewarded[target.id]={userId:uid,epaulets:target.reward||0,fame:10,event:`${s.id}:${target.id}`};
        return {ok:true,damage};
    }
    if(body.action==='siege_capture'){
        if(String(clan.owner)!==uid||s.registrations[cid].side!=='attacker')return {ok:false,reason:'siege_leader_required'};
        if(s.objectives.some(o=>o.id!=='artifact'&&o.hp>0))return {ok:false,reason:'objectives_remaining'};
        if(Math.hypot(p.x-.5,p.y-.12)>.08)return {ok:false,reason:'target_too_far'};
        if(s.channel)return {ok:false,reason:'artifact_busy'};
        p.path=[];s.channel={userId:uid,hp:p.hp,until:now+rule.channelMs,clan:{clanId:cid,name:clan.name}};return {ok:true};
    }
    return {ok:true};
}

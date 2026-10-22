// Encounter behaviour on our combat scale; NPC stats and drops remain the HF source data.
export const AI_ROLES = ['fighter', 'healer', 'mage'];
export const AI_LABELS = {fighter: 'Воин', healer: 'Целитель', mage: 'Маг'};
import {isBossStunned} from '../boss/bossDebuffs.js';
import {l2HasControl,l2MoveMultiplier} from '../player/l2Effects.js';
import {findPath,advancePath} from '../world/navigation.js';
import {battleField,neighborhood,actorEntries} from './huntNeighborhood.js';
import {pursueNeighborhood} from './huntPursuit.js';
import {clearLine} from './huntSpatial.js';
import {npcBehaviour,NPC_AI_VERSION} from './huntMobs.js';
import {nativeFieldActors,nativeMobMovement,moveNativeActor,advanceNativeActor,nativeCombatLine} from '../world/nativeFieldSpace.js';

export function huntDebuff(session, kind, now) {
    return (session.game.hunt?.playerDebuffs || []).find(e => e.kind === kind && e.until > now)?.amount || 0;
}

export function mobBuff(mob, kind, now) {
    return (mob.buffs || []).find(e => e.kind === kind && e.until > now)?.amount || 0;
}

export function aggroNearby(hunt, now,session=null) {
    if(session&&['SilentMove','Hide','FakeDeath'].some(kind=>l2HasControl(session,kind,now)))return;
    const field=battleField(hunt);
    for (const mob of field?.mobs || []) {
        if(mob.aiSourceVersion!==NPC_AI_VERSION)Object.assign(mob,npcBehaviour(mob.mobId));
        if (mob.currentHp <= 0 || mob.aggro || !mob.aggressive) continue;
        const distance = Math.hypot(mob.x - hunt.field.x, mob.y - hunt.field.y);
        if (mob.aggroRange>0 && distance <= mob.aggroRange/2000 && clearLine(mob,field,field.walls)) {
            mob.aggro = true;
            mob.nextAttackAt = now + mob.attackMs;
            mob.lastMoveAt = now;
        }
    }
}

export function provokeMob(hunt, target, now) {
    const field=battleField(hunt);
    for (const mob of field?.mobs || []) {
        if (mob.currentHp <= 0 || mob.aggro) continue;
        if(mob.aiSourceVersion!==NPC_AI_VERSION)Object.assign(mob,npcBehaviour(mob.mobId));
        if(target.aiSourceVersion!==NPC_AI_VERSION)Object.assign(target,npcBehaviour(target.mobId));
        const social=mob.clanHelpRange>0&&mob.socialClans?.some(clan=>target.socialClans?.includes(clan))&&!mob.socialIgnoredIds?.includes(String(target.mobId));
        if (mob === target || mob.instanceId&&mob.instanceId===target.instanceId || social && Math.hypot(mob.x - target.x, mob.y - target.y) <= mob.clanHelpRange/2000 && clearLine(mob,target,field.walls)) {
            mob.aggro = true;
            mob.nextAttackAt = now + mob.attackMs;
            mob.lastMoveAt = now;
        }
    }
}

export function pursuePlayer(hunt, now) {
    if(hunt.field?.native)return pursueNative(hunt,now);
    if(neighborhood(hunt))return pursueNeighborhood(hunt,now);
    let moved = false;
    for (const mob of hunt.field?.mobs || []) {
        if (!mob.aggro || mob.currentHp <= 0) continue;
        const seconds = Math.max(0, Math.min(5, (now - (mob.lastMoveAt ?? now)) / 1000));
        mob.lastMoveAt = now;
        if (isBossStunned(mob, now)||l2HasControl(mob,'Root',now)||l2HasControl(mob,'ImmobileBuff',now)) continue;
        const dx = hunt.field.x - mob.x, dy = hunt.field.y - mob.y, distance = Math.hypot(dx, dy);
        const stop = mob.ai === 'mage' ? .4 : .2;
        const step = Math.min(Math.max(0, distance - stop), seconds * .09*l2MoveMultiplier(mob,now));
        if (step > 0) {
            if(hunt.field.walls?.length){
                if(!mob.path?.length||Math.hypot((mob.destination?.x||0)-hunt.field.x,(mob.destination?.y||0)-hunt.field.y)>.08){mob.destination={x:hunt.field.x,y:hunt.field.y};mob.path=findPath(mob,mob.destination,hunt.field.walls)||[];mob.moveAt=now-seconds*1000;}
                mob.moveAt=now-seconds*1000;
                advancePath(mob,now,seconds>0?step/seconds*2000:0);
            }else{mob.x += dx / distance * step; mob.y += dy / distance * step;}
            moved = true;
        }
    }
    return moved;
}

export function canMobReach(hunt, mob,session=null,now=Date.now()) {
    if(session&&['Hide','FakeDeath'].some(kind=>l2HasControl(session,kind,now)))return false;
    if(hunt.field?.native)return Boolean(nativeMobMovement(mob)&&Math.hypot(mob.x-hunt.field.x,mob.y-hunt.field.y)*2000<=nativeMobMovement(mob).attackRange&&nativeCombatLine(mob,hunt.field));
    if (!hunt.field || !mob.ai) return true;
    return Math.hypot(mob.x - hunt.field.x, mob.y - hunt.field.y) <= (mob.ai === 'mage' ? .45 : .26);
}

/** One scheduled turn, interrupted by stun/silence in the fight loop. */
export function mobAiTurn(session, mob, at, note) {
    if(session.game.hunt?.field?.native)return false;
    if (!mob.ai) return false;
    mob.buffs = (mob.buffs || []).filter(e => e.until > at);
    mob.turn = (mob.turn || 0) + 1;
    if (at < (mob.nextAbilityAt || 0)) return false;
    const combat=['healer','mage'].includes(mob.ai)?battleField(session.game.hunt):null,allies = combat?.mobs || [mob];
    if (mob.ai === 'healer') {
        // Keep the existing adapted healer role scoped to its own cell; no new heal range is invented.
        const owners=new Map(actorEntries(session.game.hunt).map(a=>[a.mob.instanceId,a.room.id])),owner=owners.get(mob.instanceId);
        const ally = allies.filter(m => (!owner||owners.get(m.instanceId)===owner)&&m.currentHp > 0 && m.currentHp < m.hp * .75&&clearLine(mob,m,combat?.walls)).sort((a, b) => a.currentHp / a.hp - b.currentHp / b.hp)[0];
        if (ally) {
            const heal = Math.min(ally.hp - ally.currentHp, Math.round(ally.hp * .12));
            ally.currentHp += heal;
            mob.nextAbilityAt = at + 16000;
            note('✚', `${mob.name} лечит ${ally.name}: +${heal} HP.`,{combat:{kind:'heal',actor:mob.name,target:ally.name,amount:heal}});
            return true;
        }
    }
    if (mob.ai === 'mage' && mob.turn % 3 === 0&&(!neighborhood(session.game.hunt)||canMobReach(session.game.hunt,mob,session,at))&&clearLine(mob,combat||mob,combat?.walls)) {
        const hunt = session.game.hunt;
        hunt.playerDebuffs = (hunt.playerDebuffs || []).filter(e => e.until > at && e.kind !== 'weaken');
        hunt.playerDebuffs.push({kind: 'weaken', amount: .15, until: at + 8000});
        mob.nextAbilityAt = at + 18000;
        note('✦', `${mob.name} ослабляет твои атаки на 15%.`);
        return true;
    }
    if (!mobBuff(mob, 'power', at)) {
        mob.buffs.push({kind: 'power', amount: .15, until: at + 12000});
        mob.nextAbilityAt = at + 22000;
        note('↑', `${mob.name} усиливает свои атаки на 15%.`);
        return true;
    }
    return false;
}

/** The native pilot uses source run speed/reach; source geometry owns each movement leg. */
function pursueNative(hunt,now){
 let searches=0,moved=false;
 for(const mob of nativeFieldActors(hunt)){
  const seconds=Math.max(0,Math.min(5,(now-(mob.lastMoveAt??now))/1000));mob.lastMoveAt=now;
  if(!mob.aggro||isBossStunned(mob,now)||l2HasControl(mob,'Root',now)||l2HasControl(mob,'ImmobileBuff',now)){delete mob.native.journey;mob.path=[];continue;}
  const source=nativeMobMovement(mob);if(!source)continue;
  const distance=Math.hypot(mob.x-hunt.field.x,mob.y-hunt.field.y)*2000;
  if(distance<=source.attackRange&&nativeCombatLine(mob,hunt.field)){delete mob.native.journey;mob.path=[];continue;}
  const destination=mob.native.destination;
  if(!mob.native.journey||!destination||Math.hypot(destination.x-hunt.field.x,destination.y-hunt.field.y)*2000>80){
   if(searches++>=12)continue;
   const result=moveNativeActor(mob,hunt.field,now-seconds*1000,source.runSpeed);
   if(!result.ok)continue;mob.native.destination={x:hunt.field.x,y:hunt.field.y};
  }
  const speed=Math.min(source.runSpeed*l2MoveMultiplier(mob,now),seconds>0?Math.max(0,distance-source.attackRange)/seconds:0);
  advanceNativeActor(mob,now,speed);moved=true;
 }
 return moved;
}

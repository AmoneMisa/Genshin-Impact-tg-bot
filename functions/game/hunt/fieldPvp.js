// Live per-skill PvP in hunting locations. All participants must come from one freshly loaded Chat.
import {advanceHunt} from './huntFight.js';
import {HUNT} from './huntConfig.js';
import {ensureFieldPvp, fieldIsPresent, fieldPvpStatus, fieldPvpEffect, fieldPvpSkillBlock, fieldPvpLog, PVP_FLAG_MS} from './fieldPvpState.js';
import castSkill from '../player/castSkill.js';
import isPlayerCanUseSkill from '../player/isPlayerCanUseSkill.js';
import skillUsagePayCost from '../player/skillUsagePayCost.js';
import setSkillCooldown from '../player/setSkillCooldown.js';
import {getEffectiveSkillCost} from '../player/skillEnchant.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getCurrentHp from '../player/getters/getCurrentHp.js';
import getCurrentCp from '../player/getters/getCurrentCp.js';
import getMaxCp from '../player/getters/getMaxCp.js';
import getDefence from '../player/getters/getDefence.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import getAccuracy from '../player/getters/getAccuracy.js';
import getEvasion from '../player/getters/getEvasion.js';
import {guardReduction,evadeChance} from '../player/skillEffects.js';
import {isMagicClass} from '../classes/classFamily.js';
import {attributeProfile} from '../equipment/attributes.js';
import {armShots,clearShots} from '../shots/shots.js';
import {tickSoulDots} from '../equipment/soulCrystalCombat.js';

const id = s => String(s.userId);
const member = (chat,userId) => chat.members?.find(s => id(s) === String(userId));
const name = s => s.userChatData?.user?.first_name || s.userChatData?.user?.username || `Игрок ${s.userId}`;

export function fieldPeers(chat, session, now = Date.now()) {
    if (!fieldIsPresent(session,now)) return [];
    return (chat.members || []).filter(s => id(s) !== id(session) && !s.isHided && !s.userChatData?.user?.is_bot && fieldIsPresent(s,now) && s.game.hunt.zone === session.game.hunt.zone);
}

function proxyFor(defender, now) {
    const effects = ensureFieldPvp(defender).effects ||= {};
    return {
        name:'field-player', hp:getMaxHp(defender)+getMaxCp(defender), currentHp:Math.max(0,getCurrentHp(defender))+Math.max(0,getCurrentCp(defender)),
        stats:{lvl:defender.game.stats.lvl}, minions:[], listOfDamage:[], ...effects,
        playerTarget:{defence:Math.max(1,getDefence(defender)), attributes:attributeProfile(defender), incoming:getIncomingDamageModifier(defender), guard:guardReduction(defender,now), shield:Math.max(0,(defender.game.effects || []).find(e=>e.name==='shield')?.value || 0)},
    };
}

function saveEffects(defender, proxy) {
    ensureFieldPvp(defender).effects = {debuffs:proxy.debuffs || [],stunUntil:proxy.stunUntil || 0,stunImmuneUntil:proxy.stunImmuneUntil || 0,soulDots:proxy.soulDots || []};
    const shield = (defender.game.effects || []).find(e=>e.name==='shield');
    if (shield) shield.value = proxy.playerTarget.shield;
}

/** PvP damages CP before HP. A dead target is handled once, while holding the chat lock. */
function takeDamage(chat, attacker, defender, damage, now) {
    const stats = defender.game.gameClass.stats;
    const hpBefore = getCurrentHp(defender);
    const cpBefore = Math.max(0,getCurrentCp(defender));
    const cpLost = Math.min(cpBefore,Math.max(0,damage));
    const hpLost = Math.min(hpBefore,Math.max(0,damage-cpLost));
    stats.cp = cpBefore-cpLost; stats.hp = hpBefore-hpLost;
    const killed = hpBefore > 0 && stats.hp <= 0;
    let pk = false;
    if (killed) {
        const victimStatus = fieldPvpStatus(defender,now).status;
        if (attacker && id(attacker)!==id(defender)) {
            const state = ensureFieldPvp(attacker);
            pk = victimStatus === 'neutral';
            if (pk) {state.pkKills=(state.pkKills || 0)+1; state.karma=(state.karma || 0)+300*state.pkKills;}
            else state.pvpKills=(state.pvpKills || 0)+1;
            fieldPvpLog(attacker,`${name(defender)} повержен${pk?' · PK':''}.`,now);
        }
        const state = ensureFieldPvp(defender);
        state.flagUntil=0;state.effects={};state.deathAt=now;
        defender.game.respawnTime=now+HUNT.respawnMs;
        defender.game.hunt.field=null;defender.game.hunt.mob=null;
        fieldPvpLog(defender,`${attacker?name(attacker):'Игрок'} убил тебя${pk?' · PK':''}.`,now);
    }
    return {cpLost,hpLost,killed,pk};
}

/** Settle damaging SA effects for every member before actions or state responses. */
export function advanceFieldPvp(chat, now = Date.now()) {
    let changed=false;
    for(const defender of chat.members || []) {
        const dots=defender.game?.worldPvp?.effects?.soulDots;
        if(!dots?.length || !(defender.game.gameClass?.stats?.hp>0))continue;
        // A fighter who left the field (or went idle) is no longer in the fight: the effects wear off, no kills are credited.
        if(!fieldIsPresent(defender,now)){defender.game.worldPvp.effects.soulDots=[];changed=true;continue;}
        const proxy=proxyFor(defender,now);
        // Each source resolves separately, preserving lethal damage credit in a multi-attacker fight.
        for(const dot of [...dots]) {
            proxy.soulDots=[dot];proxy.listOfDamage=[];
            const damage=tickSoulDots(proxy,now);
            if(damage>0){
                const hit=takeDamage(chat,member(chat,dot.userId),defender,damage,now);changed=true;
                if(hit.killed)break;
            }
        }
        if(defender.game.gameClass.stats.hp>0){proxy.soulDots=dots.filter(d=>d.nextAt<=d.until);saveEffects(defender,proxy);}
    }
    return changed;
}

export function useFieldPvpSkill(chat, attacker, targetId, skillIndex, {now=Date.now(),force=false,random=Math.random}={}) {
    const defender=member(chat,targetId);
    if(!defender || id(defender)===id(attacker) || defender.isHided || defender.userChatData?.user?.is_bot) return {ok:false,reason:'pvp_invalid_target'};
    advanceFieldPvp(chat,now);
    advanceHunt(attacker,now,random);advanceHunt(defender,now,random);
    const fail=reason=>({ok:false,reason,changed:true});
    if(!fieldIsPresent(attacker,now) || !fieldIsPresent(defender,now) || attacker.game.hunt.zone !== defender.game.hunt.zone) return fail('pvp_not_here');
    const skill=attacker.game.gameClass.skills?.[skillIndex];
    if(!Number.isInteger(skillIndex) || !skill)return fail('invalid_skill');
    const block=fieldPvpSkillBlock(attacker,skill,now);if(block)return fail(block);
    const usable=isPlayerCanUseSkill(attacker,skill);
    if(usable!==0)return fail({1:'not_enough_resource',2:'cooldown',3:'skill_locked'}[usable]);
    const hostile=Boolean(skill.isDealDamage || skill.debuff || skill.debuffs?.length);
    const magic=isMagicClass(attacker.game.gameClass.stats.name);
    const distance=Math.hypot(attacker.game.hunt.field.x-defender.game.hunt.field.x,attacker.game.hunt.field.y-defender.game.hunt.field.y);
    if(hostile && distance > (magic? .65 : .35))return fail('pvp_out_of_range');
    const victimStatus=fieldPvpStatus(defender,now).status;
    if(hostile && victimStatus==='neutral' && !force)return fail('pvp_force_required');

    const cost=getEffectiveSkillCost(skill,getMaxHp(attacker),attacker);
    skillUsagePayCost(attacker,cost.costHp>0?'hp':'mp',cost.costHp>0?cost.costHp:cost.cost);
    const shots=armShots(attacker,skill);
    const proxy=proxyFor(defender,now);
    const accuracy=1-fieldPvpEffect(attacker,'accuracyDown',now);
    const hitChance=magic?1:Math.max(.2,Math.min(.98,.88+(getAccuracy(attacker)*accuracy-getEvasion(defender))/100));
    const missed=hostile && (random()>hitChance || random()<evadeChance(defender,now));
    let result;
    try {result=missed?{type:'damage',dmg:0,dealt:0,missed:true}:castSkill(attacker,proxy,skill,{now});}
    finally {clearShots(attacker);}
    setSkillCooldown(skill,attacker);
    if(fieldPvpEffect(attacker,'slow',now)>0)skill.cooldownReceive+=skill.cooldown*1000*fieldPvpEffect(attacker,'slow',now);
    let hit={cpLost:0,hpLost:0,killed:false,pk:false};
    if(hostile){
        if(victimStatus!=='pk')ensureFieldPvp(attacker).flagUntil=now+PVP_FLAG_MS;
        attacker.game.stats.inFightTimer=now+90000;defender.game.stats.inFightTimer=now+90000;
        attacker.game.hunt.lastActionAt=now;defender.game.hunt.lastActionAt=now;
        hit=takeDamage(chat,attacker,defender,result.dealt || 0,now);
        if(!hit.killed)saveEffects(defender,proxy);
        const loss=result.missed?'Промах':[[hit.cpLost,'CP'],[hit.hpLost,'HP']].filter(([amount])=>amount>0).map(([amount,resource])=>`−${amount} ${resource}`).join(' · ') || (result.type==='debuff'?'Враг ослаблен':'Урон поглощён');
        fieldPvpLog(defender,`${name(attacker)} атакует: ${loss}.`,now);
        fieldPvpLog(attacker,`${name(defender)}: ${loss}.`,now);
    }
    return {ok:true,result:{...result,...hit},...hit,shots:shots || null,changed:true};
}

import bossReflectDamage from '../boss/bossReflectDamage.js';
import {applySoulHit,tickSoulDots} from '../equipment/soulCrystalCombat.js';
import calcDamage from '../boss/calcDamage.js';
import getBossDefence from '../boss/getBossStats/getBossDefence.js';
import userVampireSkill from './userVampireSkill.js';
import getMaxHp from './getters/getMaxHp.js';
import {l2RawStat,l2OnDamageReceived,l2PreventDeath,l2OnHostileAction} from './l2Effects.js';
import { applyBossDebuff } from '../boss/bossDebuffs.js';
import { advanceBossPhases } from '../boss/bossPhases.js';
import { applySkillBuffs } from './skillEffects.js';
import { getRouteBonus } from './skillRoutes.js';
import {
    aliveRequiredUnits, armorShield, bossTemplateFor, damageUnit, findUnit, unitRewards,
} from '../boss/bossUnits.js';

function creditDamage(boss, userId, dmg) {
    if (dmg <= 0) return;
    let findPlayer = boss.listOfDamage.find(player => player.id === userId);
    if (!findPlayer) {
        boss.listOfDamage.push({id: userId, damage: dmg});
    } else {
        findPlayer.damage += dmg;
    }
}

/**
 * Hits the boss - or one of its minions, when `targetId` names a live one - with
 * a damage skill. A multi-hit skill rolls every hit (and crit) separately.
 *
 * While a required unit (hydra head, twin) lives the boss cannot drop below 1 hp
 * and further hits on it deal nothing (`locked`); minions shield the boss by
 * `combat.armored` (`shielded`).
 *
 * Returns {isHasCritical, dmg, hits[], vampire, reflectDamage, target, ...}:
 * `dmg` is what the skill rolled in total, `dealt` what actually landed.
 */
export default function (session, boss, skill, {targetId = null, now = Date.now()} = {}) {
    l2OnHostileAction(session,now);
    if (!boss) {
        throw new Error("Босс не найден!");
    }
    tickSoulDots(boss,now);

    const template = bossTemplateFor(boss);
    const unit = targetId && targetId !== 'boss' ? findUnit(boss, targetId) : null;
    const hpShare = unit
        ? unit.currentHp / unit.hp
        : (boss.hp > 0 ? boss.currentHp / boss.hp : 1);
    const defence = unit ? getBossDefence(boss, template) * unit.defMul : undefined;

    const hitCount = Math.max(1, Math.floor(skill.hits || 1));
    const hits = [];
    let isHasCritical = false;
    let total = 0;
    for (let i = 0; i < hitCount; i++) {
        const {dmg, isHasCritical: crit} = calcDamage(session, skill, boss, {consume: i === 0, defence, hpShare, now});
        hits.push({dmg, crit});
        total += dmg;
        isHasCritical = isHasCritical || crit;
    }

    let playerStats = session.game.gameClass.stats;
    const userId = session.userChatData.user.id;
    const result = {isHasCritical, dmg: total, dealt: 0, hits, vampire: 0, reflectDamage: 0, target: 'boss'};

    if (unit) {
        const dealt = Math.min(total, unit.currentHp);
        const hurt = damageUnit(boss, unit, dealt, template);
        creditDamage(boss, userId, dealt);
        result.dealt = dealt;
        result.target = {id: unit.id, name: unit.name, icon: unit.icon, hp: unit.currentHp, maxHp: unit.hp};
        if (hurt.killed) {
            result.unitKilled = {...unitRewards(unit, template), name: unit.name, reaction: hurt.reaction};
        }
    } else {
        const shield = armorShield(boss, template);
        let landing = Math.ceil(total * (1 - shield));
        if (boss.playerTarget) {
            const absorbed = Math.min(boss.playerTarget.shield, landing);
            boss.playerTarget.shield -= absorbed;
            landing -= absorbed;
            result.shieldAbsorbed = absorbed;
        }
        const floor = aliveRequiredUnits(boss).length ? 1 : 0;
        const dealt = Math.max(0, Math.min(landing, boss.currentHp - floor));
        boss.currentHp -= dealt;
        creditDamage(boss, userId, dealt);
        result.dealt = dealt;
        result.shielded = shield > 0;
        result.locked = floor === 1 && boss.currentHp <= 1 && dealt < landing;
    }

    const soul=unit?{drain:0,effects:[]}:applySoulHit(session,boss,{critical:isHasCritical,dealt:result.dealt,now});
    result.soulEffects=soul.effects;
    const vampirePower = (skill.vampirePower || 0) + getRouteBonus(skill).vampire + soul.drain + (skill.effect==='common_attack'?l2RawStat(session,'absorbDam',false,now)/100:0);
    if (vampirePower > 0 && result.dealt > 0) {
        result.vampire = userVampireSkill({vampirePower}, result.dealt);
        playerStats.hp = Math.ceil(Math.min(
            playerStats.hp + result.vampire,
            getMaxHp(session, session.game.gameClass)
        ));
    }

    const debuffs = [...(skill.debuff ? [skill.debuff] : []), ...(skill.debuffs || [])];
    if (debuffs.length) {
        const power = (1 + 0.05 * (skill.enchantLevel || 0)) * (1 + getRouteBonus(skill).debuff);
        result.debuffs = debuffs.map(debuff => applyBossDebuff(boss, debuff, now, power, getRouteBonus(skill).duration)).filter(Boolean);
    }
    if (skill.buffs?.length) {
        applySkillBuffs(session, skill, skill.buffs, now);
    }

    if(!unit&&!boss.playerTarget)l2OnDamageReceived(boss,session,result.dealt,now);
    const nativeReflect=!unit&&!boss.playerTarget&&skill.effect==='common_attack'?Math.ceil(result.dealt*Math.min(100,l2RawStat(boss,'reflectDam',false,now))/100):0;
    if (nativeReflect>0 || (!unit && boss.skill?.effect && (boss.skill.effect.includes("reflect") || boss.skill.effect.includes("rage")))) {
        result.reflectDamage = nativeReflect+(boss.skill?.effect?bossReflectDamage(boss, result.dealt):0);
        playerStats.hp -= Math.min(playerStats.hp, result.reflectDamage);
        session.game.gameClass.stats.hp = playerStats.hp;

        if (playerStats.hp === 0&&!l2PreventDeath(session,now)) {
            session.game.respawnTime = new Date().getTime() + 60 * 1000; // Минута на респаун персонажа
        }
    }

    result.events = advanceBossPhases(boss, now, template);
    if (result.events.length) {
        boss.markModified?.('minions');
        boss.markModified?.('eventLog');
    }

    session.game.stats.inFightTimer = new Date().getTime() + 1.5 * 60 * 1000;
    return result;
};

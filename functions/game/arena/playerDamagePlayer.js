import {applySoulHit,tickSoulDots,applySoulSpell,soulBackCritical} from '../equipment/soulCrystalCombat.js';
import { dealsDamage } from '../player/skillSimulation.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getMaxCp from '../player/getters/getMaxCp.js';
import getCurrentHp from '../player/getters/getCurrentHp.js';
import getMaxMp from '../player/getters/getMaxMp.js';
import getCurrentMp from '../player/getters/getCurrentMp.js';
import getMpRestoreSpeed from '../player/getters/getMpRestoreSpeed.js';
import getHpRestoreSpeed from '../player/getters/getHpRestoreSpeed.js';
import getCpRestoreSpeed from '../player/getters/getCpRestoreSpeed.js';
import limit from '../../misc/limit.js';
import getAccuracy from '../player/getters/getAccuracy.js';
import getEvasion from '../player/getters/getEvasion.js';
import chanceToHitTemplate from '../../../template/chanceToHitTemplate.js';
import getBlock from '../player/getters/getBlock.js';
import getEquipStatByName from '../player/getters/getEquipStatByName.js';
import getRandomWithoutFloor from '../../getters/getRandomWithoutFloor.js';
import getCriticalChanceMultiplier from '../player/getters/getCriticalChanceMultiplier.js';
import getCriticalChance from '../player/getters/getCriticalChance.js';
import getCriticalDamage from '../player/getters/getCriticalDamage.js';
import getCriticalDamageMultiplier from '../player/getters/getCriticalDamageMultiplier.js';
import getAttack from '../player/getters/getAttack.js';
import getDamageMultiplier from '../player/getters/getDamageMultiplier.js';
import getDefence from '../player/getters/getDefence.js';
import getAdditionalDamageMul from '../player/getters/getAdditionalDamageMul.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import getPvpSign from '../arena/getPvpSign.js';
import { getEffectiveSkillCost, getSkillCooldownMultiplier, getSkillPowerMultiplier } from '../player/skillEnchant.js';
import { getRouteBonus } from '../player/skillRoutes.js';
import { isMagicClass } from '../classes/classFamily.js';
import getRandom from '../../getters/getRandom.js';
import { attributeProfile, pvpFactor } from '../equipment/attributes.js';
import { chanceSkillFactor, equippedChanceSkills } from '../equipment/lifestoneSkills.js';
import lodash from 'lodash';

/**
 * Share (0..100) of a fighter's combined hp + cp pool that the opponent has NOT taken
 * (net of healing and regeneration). Costs a fighter pays for its own skills do not count
 * here - they only matter through survival - so paying in hp is not an automatic loss.
 */
export function poolPercent({taken, maxHp, maxCp}) {
    return Math.max(0, 100 - taken / ((maxHp + maxCp) || 1) * 100);
}

// options.defenderActs = false makes the defender a passive target (a raid on someone who is away).
export default function (attacker, defender, defenderIsBot = false, attackerIsBot = false, battleTime = 5 * 60, isArena = false, {defenderActs = true} = {}) {
    let defenderObj;

    if (defenderIsBot) {
        defenderObj = {
            className: defender.gameClass.stats.name,
            lvl: defender.stats.lvl,
            effects: null,
            randomWeaponDamage: getEquipStatByName(defender, "randomDamage"),
            hp: getCurrentHp(defender, defender.gameClass),
            maxHp: getMaxHp(defender, defender.gameClass),
            cp: getMaxCp(defender, defender.gameClass),
            maxCp: getMaxCp(defender, defender.gameClass),
            mp: getMaxMp(defender, defender.gameClass),
            maxMp: getMaxMp(defender, defender.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(defender, defender.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(defender, defender.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(defender, defender.gameClass),
            skills: [...defender.gameClass.skills].sort(compareSkills).reverse(),
            evasion: getEvasion(defender, defender.gameClass),
            block: getBlock(defender, defender.gameClass),
            accuracy: getAccuracy(defender, defender.gameClass),
            criticalChance: Math.min(getCriticalChance(defender, defender.gameClass) + getCriticalChanceMultiplier(defender), 100),
            criticalDamage: getCriticalDamage(defender, defender.gameClass) * getCriticalDamageMultiplier(defender),
            attack: getAttack(defender, defender.gameClass),
            damageMultiplier: 1,
            defence: getDefence(defender, defender.gameClass),
            additionalDamageMul: getAdditionalDamageMul(defender, defender.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(defender, defender.gameClass),
            increasePvpDamage: 1,
            decreaseIncomingPvpDamage: 0
        };
    } else {
        defenderObj = {
            className: defender.game.gameClass.stats.name,
            lvl: defender.game.stats.lvl,
            effects: defender.game.effects,
            randomWeaponDamage: getEquipStatByName(defender, "randomDamage"),
            hp: getCurrentHp(defender, defender.game.gameClass),
            maxHp: getMaxHp(defender, defender.game.gameClass),
            cp: getMaxCp(defender, defender.game.gameClass),
            maxCp: getMaxCp(defender, defender.game.gameClass),
            mp: getCurrentMp(defender, defender.game.gameClass),
            maxMp: getMaxMp(defender, defender.game.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(defender, defender.game.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(defender, defender.game.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(defender, defender.game.gameClass),
            skills: [...defender.game.gameClass.skills].sort(compareSkills).reverse(),
            evasion: getEvasion(defender, defender.game.gameClass),
            block: getBlock(defender, defender.game.gameClass),
            accuracy: getAccuracy(defender, defender.game.gameClass),
            criticalChance: Math.min(getCriticalChance(defender, defender.game.gameClass) + getCriticalChanceMultiplier(defender), 100),
            criticalDamage: getCriticalDamage(defender, defender.game.gameClass) * getCriticalDamageMultiplier(defender),
            attack: getAttack(defender, defender.game.gameClass),
            damageMultiplier: getDamageMultiplier(defender.game.effects),
            defence: getDefence(defender, defender.game.gameClass),
            additionalDamageMul: getAdditionalDamageMul(defender, defender.game.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(defender, defender.game.gameClass),
            increasePvpDamage: isArena ? getPvpSign(defender).increasePvpDamage * getEquipStatByName(defender,"pvpDamageMul",true) : 1,
            decreaseIncomingPvpDamage: isArena ? Math.min(0.8, getPvpSign(defender).decreaseIncomingPvpDamage + (Number(getEquipStatByName(defender, "pvpDefence")) || 0)) : 1,
            attributes: attributeProfile(defender),
            chances: equippedChanceSkills(defender)
        };
    }

    defenderObj.cooldowns = defenderObj.skills.map(_ => 0);

    let attackerObj;

    if (attackerIsBot) {
        attackerObj = {
            className: attacker.gameClass.stats.name,
            lvl: attacker.stats.lvl,
            effects: null,
            randomWeaponDamage: getEquipStatByName(attacker, "randomDamage"),
            hp: getCurrentHp(attacker, attacker.gameClass),
            maxHp: getMaxHp(attacker, attacker.gameClass),
            cp: getMaxCp(attacker, attacker.gameClass),
            maxCp: getMaxCp(attacker, attacker.gameClass),
            mp: getMaxMp(attacker, attacker.gameClass),
            maxMp: getMaxMp(attacker, attacker.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(attacker, attacker.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(attacker, attacker.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(attacker, attacker.gameClass),
            skills: [...attacker.gameClass.skills].sort(compareSkills).reverse(),
            evasion: getEvasion(attacker, attacker.gameClass),
            block: getBlock(attacker, attacker.gameClass),
            accuracy: getAccuracy(attacker, attacker.gameClass),
            criticalChance: Math.min(getCriticalChance(attacker, attacker.gameClass) + getCriticalChanceMultiplier(attacker), 100),
            criticalDamage: getCriticalDamage(attacker, attacker.gameClass) * getCriticalDamageMultiplier(attacker),
            attack: getAttack(attacker, attacker.gameClass),
            damageMultiplier: 1,
            defence: getDefence(attacker, attacker.gameClass),
            additionalDamageMul: getAdditionalDamageMul(attacker, attacker.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(attacker, attacker.gameClass),
            increasePvpDamage: 1,
            decreaseIncomingPvpDamage: 0
        };
    } else {
        attackerObj = {
            className: attacker.game.gameClass.stats.name,
            lvl: attacker.game.stats.lvl,
            effects: attacker.game.effects,
            randomWeaponDamage: getEquipStatByName(attacker, "randomDamage"),
            hp: getCurrentHp(attacker, attacker.game.gameClass),
            maxHp: getMaxHp(attacker, attacker.game.gameClass),
            cp: getMaxCp(attacker, attacker.game.gameClass),
            maxCp: getMaxCp(attacker, attacker.game.gameClass),
            mp: getCurrentMp(attacker, attacker.game.gameClass),
            maxMp: getMaxMp(attacker, attacker.game.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(attacker, attacker.game.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(attacker, attacker.game.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(attacker, attacker.game.gameClass),
            skills: [...attacker.game.gameClass.skills].sort(compareSkills).reverse(),
            evasion: getEvasion(attacker, attacker.game.gameClass),
            block: getBlock(attacker, attacker.game.gameClass),
            accuracy: getAccuracy(attacker, attacker.game.gameClass),
            criticalChance: Math.min(getCriticalChance(attacker, attacker.game.gameClass) + getCriticalChanceMultiplier(attacker), 100),
            criticalDamage: getCriticalDamage(attacker, attacker.game.gameClass) * getCriticalDamageMultiplier(attacker),
            attack: getAttack(attacker, attacker.game.gameClass),
            damageMultiplier: getDamageMultiplier(attacker.game.effects),
            defence: getDefence(attacker, attacker.game.gameClass),
            additionalDamageMul: getAdditionalDamageMul(attacker, attacker.game.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(attacker, attacker.game.gameClass),
            increasePvpDamage: isArena ? getPvpSign(attacker).increasePvpDamage * getEquipStatByName(attacker,"pvpDamageMul",true) : 1,
            decreaseIncomingPvpDamage: isArena ? Math.min(0.8, getPvpSign(attacker).decreaseIncomingPvpDamage + (Number(getEquipStatByName(attacker, "pvpDefence")) || 0)) : 1,
            attributes: attributeProfile(attacker),
            chances: equippedChanceSkills(attacker)
        };
    }

    for(const [fighter,session] of [[attackerObj,attacker],[defenderObj,defender]]){
        fighter.soulSession=session?.game?{userId:session.userId,userChatData:session.userChatData,game:{...session.game,saBuffs:[...(session.game.saBuffs||[])],gameClass:{...session.game.gameClass,stats:{...session.game.gameClass.stats}}}}:null;
    }
    attackerObj.cooldowns = attackerObj.skills.map(_ => 0);

    attackerObj.fx = newFx();
    const soulEpoch=Date.now();
    attackerObj.soulEpoch=soulEpoch;defenderObj.soulEpoch=soulEpoch;
    defenderObj.fx = newFx();
    attackerObj.taken = 0;
    defenderObj.taken = 0;

    // Auto-fight: both sides play their skills every second until time runs out or
    // one of them falls. A fallen fighter stays down (no regeneration back to life).
    for (let t = 0; t < battleTime; t++) {
        for(const fighter of [attackerObj,defenderObj]){
            const target={currentHp:fighter.hp+fighter.cp,soulDots:fighter.soulDots||[],listOfDamage:[]};
            const damage=tickSoulDots(target,t*1000);fighter.soulDots=target.soulDots;if(damage)applyDamage(fighter,damage);
        }
        if(attackerObj.hp<=0||defenderObj.hp<=0)break;
        useSkills(attackerObj, defenderObj, isArena, t);
        if (defenderActs && defenderObj.hp > 0) useSkills(defenderObj, attackerObj, isArena, t);

        if (attackerObj.hp <= 0 || defenderObj.hp <= 0) {
            attackerObj.hp = Math.max(0, attackerObj.hp);
            defenderObj.hp = Math.max(0, defenderObj.hp);
            break;
        }

        for (const fighter of [attackerObj, defenderObj]) {
            fighter.mp = Math.min(fighter.maxMp, fighter.mp + fighter.mpRestoreSpeed);
            fighter.cooldowns = fighter.cooldowns.map(cooldown => Math.max(0, cooldown - 1));
            gainHp(fighter, fighter.hpRestoreSpeed);
            gainCp(fighter, fighter.cpRestoreSpeed);
        }
    }

    // [attacker hp, defender hp, details]: damage is taken from CP before HP, so a fair
    // comparison of the two fighters uses both pools (see poolPercent).
    const pools = obj => ({hp: obj.hp, cp: obj.cp, maxHp: obj.maxHp, maxCp: obj.maxCp, taken: obj.taken});
    return [attackerObj.hp, defenderObj.hp, {attacker: pools(attackerObj), defender: pools(defenderObj)}];
}

function compareSkills(skillA, skillB) {
    let damageModifierA = skillA.damageModifier || 0;
    let damageModifierB = skillB.damageModifier || 0;

    return damageModifierA - damageModifierB;
}

// Per-fight state of the profession-skill effects (self buffs, debuffs from the opponent).
export const STUN_IMMUNITY_SECONDS = 20;

function newFx() {
    return {
        damage: null,      // {amount (%), charges}  - next attacks hit harder
        critChance: null,  // {amount (points), charges}
        critDamage: null,  // {amount (%), charges}
        guardUntil: 0, guard: 0,
        evadeUntil: 0, evade: 0,
        hasteUntil: 0, haste: 0,
        stunUntil: 0, stunImmuneUntil: 0,
        armorBreakUntil: 0, armorBreak: 0,
        weakenUntil: 0, weaken: 0,
    };
}

const active = (fx, name, t) => (fx[`${name}Until`] > t ? fx[name] : 0);

function chargeBuff(fx, name) {
    const buff = fx[name];
    if (!buff || buff.charges <= 0) return 0;
    return buff.amount;
}

function spendCharge(fx, name) {
    if (fx[name] && fx[name].charges > 0) fx[name].charges--;
}

/**
 * One attack with `skill`: every hit of a multi-hit skill rolls hit, crit and block on
 * its own. Returns {damage, hits, hit} (damage already includes the arena medal).
 */
function calculateDamage(skill, attackerObj, defenderObj, isArena, t = 0) {
    const magic = isMagicClass(attackerObj.className);
    const hits = Math.max(1, Math.floor(skill.hits || 1));
    let total = 0;
    let landed = 0;
    let critical=false;

    // Charges of damage / crit buffs are spent once per skill, not per hit.
    const buffs = {
        damage: chargeBuff(attackerObj.fx, 'damage'),
        critChance: chargeBuff(attackerObj.fx, 'critChance'),
        critDamage: chargeBuff(attackerObj.fx, 'critDamage'),
    };
    spendCharge(attackerObj.fx, 'damage');
    spendCharge(attackerObj.fx, 'critChance');
    spendCharge(attackerObj.fx, 'critDamage');

    for (let i = 0; i < hits; i++) {
        let damage = 1;
        let isHit = true;

        // Магические классы: см. комментарий в истории - бросок попадания пропускается, только если
        // защитник на 8 и более уровней выше.
        if (!magic || (defenderObj.lvl - attackerObj.lvl < 8)) {
            const diff = limit(attackerObj.accuracy*(1-active(attackerObj.fx,'accuracyDown',t)) - defenderObj.evasion, -25, 10);
            isHit = Math.random() < chanceToHitTemplate[diff + 25] / 100;
        }

        // Defender's dodge from an evade buff.
        const evade = active(defenderObj.fx, 'evade', t);
        if (isHit && evade > 0 && Math.random() < evade) isHit = false;

        if (isHit) {
            damage = calcSkillDamage(skill, attackerObj, defenderObj, buffs, t);
            critical ||= attackerObj.lastCritical;
            // Проверка на блок урона
            const blockRate = (defenderObj.block - 1) / (135 - 1);
            // Минимальный шанс заблокировать урон - 1.75%, максимальный - 65%.
            const blockChance = 0.0175 + (0.65 - 0.0175) * blockRate;

            // Урон может быть уменьшен до 67% в зависимости от величины значения блока.
            if (Math.random() < blockChance) {
                damage *= (1 - (blockRate * 0.67));
            }
            landed++;
        }

        // Добавляем в расчёт рандомный разброс от оружия
        let rndDmg = getRandomWithoutFloor(1 - attackerObj.randomWeaponDamage, 1 + attackerObj.randomWeaponDamage);

        // Добавляем показатели от медали арены, если считаем урон для арены
        if (isArena) {
            damage = Math.ceil(damage * rndDmg * attackerObj.increasePvpDamage * (1 - defenderObj.decreaseIncomingPvpDamage));
        } else {
            // Расчёт по умолчанию
            damage = Math.ceil(damage * rndDmg);
        }
        total += damage;
    }

    return {damage: total, hits, hit: landed > 0,critical};
}

function calcSkillDamage(skill, attackerObj, defenderObj, buffs, t) {
    let dmg;
    // Skill level and enchant route count here too (they used to be ignored outside boss fights).
    let modifier = (skill.damageModifier || 1) * getSkillPowerMultiplier(skill);

    // Execute skills hit harder once the target is low.
    if (skill.executeBelow && defenderObj.hp / defenderObj.maxHp <= skill.executeBelow) {
        modifier *= 1 + (skill.executeBonus || 0);
    }

    const defence = defenderObj.defence * (1 - active(defenderObj.fx, 'armorBreak', t));
    dmg = 70 * attackerObj.attack / defence * modifier * attackerObj.additionalDamageMul;
    dmg *= attackerObj.damageMultiplier;
    dmg *= 1 + buffs.damage / 100;
    // Weapon element against the defender's armor resistance, and Life Stone chance skills.
    dmg *= pvpFactor(attackerObj.attributes, defenderObj.attributes);
    dmg *= chanceSkillFactor(attackerObj.chances);

    const critChance = Math.min(100, (attackerObj.criticalChance + (skill.critChanceBonus || 0) + getRouteBonus(skill).critBonus + buffs.critChance)*(attackerObj.soulSession?soulBackCritical(attackerObj.soulSession,skill):1));
    attackerObj.lastCritical=getRandom(1,100)<=critChance;
    if (attackerObj.lastCritical) {
        dmg *= attackerObj.criticalDamage * (1 + buffs.critDamage / 100);
    }

    if (attackerObj.effects) {
        attackerObj.effects = attackerObj.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

        for (let effect of attackerObj.effects) {
            if (effect.count) {
                effect.count--;
            }
        }
    }

    // The defender's modifier (it used to be the attacker's own, which made it an outgoing bonus),
    // the defender's guard, and the attacker's weaken curse.
    dmg = dmg * defenderObj.incomingDamageModifier;
    dmg *= 1 - active(defenderObj.fx, 'guard', t);
    dmg *= 1 - active(attackerObj.fx, 'weaken', t);
    dmg = Math.ceil(dmg);

    if (lodash.isNaN(dmg) || lodash.isUndefined(dmg)) {
        throw new Error(`Ошибка в подсчёте урона игрока против игрока: ${dmg}`);
    }

    return dmg;
}

function ensureEffects(obj) {
    if (!Array.isArray(obj.effects)) obj.effects = [];
    return obj.effects;
}

/** Shield first, then cp, then hp. */
function applyDamage(obj, damage) {
    const shield = ensureEffects(obj).find(effect => effect.name === "shield" && effect.value > 0);
    if (shield) {
        const absorbed = Math.min(shield.value, damage);
        shield.value -= absorbed;
        damage -= absorbed;
    }
    const damageCp = Math.min(obj.cp, damage);
    obj.cp -= damageCp;
    damage -= damageCp;
    const damageHp = Math.min(obj.hp, damage);
    obj.hp -= damageHp;
    obj.taken += damageCp + damageHp;
}

/** Healing, lifesteal and regeneration give back damage taken from the opponent. */
function gainHp(obj, amount) {
    const gained = Math.max(0, Math.min(obj.maxHp - obj.hp, amount));
    obj.hp += gained;
    obj.taken = Math.max(0, obj.taken - gained);
}

function gainCp(obj, amount) {
    const gained = Math.max(0, Math.min(obj.maxCp - obj.cp, amount));
    obj.cp += gained;
    obj.taken = Math.max(0, obj.taken - gained);
}

function giveShield(obj, amount) {
    const shieldEffect = ensureEffects(obj).find(effect => effect.name === "shield");
    if (!shieldEffect) {
        obj.effects.push({name: "shield", value: amount, time: 0});
    } else {
        shieldEffect.value = amount;
    }
}

function applyBuffs(obj, skill, t) {
    const power = getSkillPowerMultiplier(skill);
    for (const buff of skill.buffs || []) {
        if (['damage', 'critChance', 'critDamage'].includes(buff.kind)) {
            obj.fx[buff.kind] = {amount: buff.amount * power, charges: buff.charges || 1};
        } else if (['guard', 'evade', 'haste'].includes(buff.kind)) {
            obj.fx[buff.kind] = Math.min({guard: 0.8, evade: 0.75, haste: 0.5}[buff.kind], buff.amount / 100 * power);
            obj.fx[`${buff.kind}Until`] = t + (buff.seconds || 10);
        }
    }
}

function applyDebuff(target, debuff, t, power = 1) {
    if (debuff.kind === 'stun') {
        if (target.fx.stunImmuneUntil > t) return;
        target.fx.stunUntil = t + (debuff.seconds || 3);
        target.fx.stunImmuneUntil = target.fx.stunUntil + STUN_IMMUNITY_SECONDS;
    } else if (debuff.kind === 'armorBreak') {
        target.fx.armorBreak = Math.min(0.6, debuff.amount / 100 * power);
        target.fx.armorBreakUntil = t + (debuff.seconds || 10);
    } else if (debuff.kind === 'weaken') {
        target.fx.weaken = Math.min(0.5, debuff.amount / 100 * power);
        target.fx.weakenUntil = t + (debuff.seconds || 10);
    } else if(['slow','accuracyDown','mute'].includes(debuff.kind)){
        target.fx[debuff.kind]=Math.min(debuff.kind==='mute'?1:.5,debuff.amount/100*power);
        target.fx[`${debuff.kind}Until`]=t+(debuff.seconds||10);
    }
}

function restoreMana(obj, share) {
    obj.mp = Math.min(obj.maxMp, obj.mp + Math.ceil(obj.maxMp * share));
}

// One turn of one fighter (a stunned one loses it): the first usable skill is played.
// Damage skills hit the opponent; heals and shields are cast on the caster, only when
// needed (otherwise the next skill is tried); buffs, debuffs and mana returns are
// played when ready. Taunt does nothing in a one-on-one fight.
function useSkills(attackerObj, defenderObj, isArena = false, t = 0) {
    if (attackerObj.fx.stunUntil > t) return;
    const soul=attackerObj.soulSession;
    if(soul)soul.soulNow=attackerObj.soulEpoch+t*1000;
    if(soul){soul.game.gameClass.stats.hp=attackerObj.hp;attackerObj.maxHp=getMaxHp(soul);attackerObj.attack=getAttack(soul);attackerObj.criticalChance=Math.min(getCriticalChance(soul)+getCriticalChanceMultiplier(soul),100);}

    for (let j = 0; j < attackerObj.skills.length; j++) {
        let skill = attackerObj.skills[j];
        const damages = dealsDamage(skill);
        if(isMagicClass(attackerObj.className)&&active(attackerObj.fx,'mute',t)>0)continue;
        const heals = skill.isHeal && !skill.isDealDamage;
        const shields = skill.isShield && !skill.isDealDamage;
        const utility = !damages && !heals && !shields;

        const price = getEffectiveSkillCost(skill, attackerObj.maxHp,soul);
        if (attackerObj.cooldowns[j] <= 0 && attackerObj.hp > price.costHp && attackerObj.mp >= price.cost) {
            const ownHpShare = attackerObj.hp / attackerObj.maxHp;
            const power = getSkillPowerMultiplier(skill);

            if (damages) {
                const result = calculateDamage(skill, attackerObj, defenderObj, isArena, t);
                applyDamage(defenderObj, result.damage);
                if(soul&&result.hit){
                    const target={hp:defenderObj.maxHp,currentHp:defenderObj.hp,soulDots:defenderObj.soulDots||[],debuffs:[],listOfDamage:[]};
                    const sa=applySoulHit(soul,target,{critical:result.critical,dealt:result.damage,now:t*1000});defenderObj.soulDots=target.soulDots;
                    if(sa.drain)gainHp(attackerObj,Math.ceil(result.damage*sa.drain));
                    for(const effect of sa.effects)if(effect.applied)applyDebuff(defenderObj,{kind:effect.kind,amount:(effect.amount||0)*100,seconds:effect.seconds||10},t);
                }

                const vampire = (skill.vampirePower || 0) + getRouteBonus(skill).vampire;
                if (vampire > 0) gainHp(attackerObj, Math.ceil(result.damage * vampire));
                if (result.hit) {
                    for (const debuff of [skill.debuff, ...(skill.debuffs || [])].filter(Boolean)) applyDebuff(defenderObj, debuff, t, power);
                }
                applyBuffs(attackerObj, skill, t);

                if (defenderObj.hp === 0) {
                    return 0;
                }
            } else if (shields) {
                if (ownHpShare >= 0.80) continue;
                giveShield(attackerObj, Math.ceil(attackerObj.maxHp * skill.shieldPower * power));
                if (skill.restoreMp) restoreMana(attackerObj, skill.restoreMp);
            } else if (heals) {
                if (ownHpShare >= 0.60) continue;
                gainHp(attackerObj, Math.ceil(attackerObj.maxHp * skill.healPower * power));
                if (skill.restoreMp) restoreMana(attackerObj, skill.restoreMp);
            } else if (utility) {
                // A buff already running is not recast; a debuff on an already-stunned/cursed target waits.
                if (skill.buffs?.some(buff => ['guard', 'evade', 'haste'].includes(buff.kind) && attackerObj.fx[`${buff.kind}Until`] > t)) continue;
                if (skill.debuff?.kind === 'weaken' && defenderObj.fx.weakenUntil > t) continue;
                if (skill.restoreMp && !skill.buffs && !skill.debuff && attackerObj.mp / attackerObj.maxMp > 0.5) continue;
                if (skill.buffs?.length) applyBuffs(attackerObj, skill, t);
                if (skill.shieldPower) giveShield(attackerObj, Math.ceil(attackerObj.maxHp * skill.shieldPower * power));
                if (skill.debuff) applyDebuff(defenderObj, skill.debuff, t, power);
                if (skill.restoreMp) restoreMana(attackerObj, skill.restoreMp);
            }

            // Haste shortens the cooldown the skill is put on.
            if(soul)applySoulSpell(soul,skill,soul.soulNow);
            const soulSpeed=soul?getEquipStatByName(soul,isMagicClass(attackerObj.className)?'castingSpeedMul':'attackSpeedMul',true):1;
            const soulReuse=soul?getEquipStatByName(soul,'skillCooltimeMul',true):1;
            attackerObj.cooldowns[j] = Math.max(Math.ceil(skill.cooldown*.35),Math.ceil(skill.cooldown * getSkillCooldownMultiplier(skill) * soulReuse/soulSpeed / (1-active(attackerObj.fx,'slow',t)) * (1 - active(attackerObj.fx, 'haste', t))));
            attackerObj.hp -= price.costHp;
            attackerObj.mp -= price.cost;

            break;
        }
    }
}

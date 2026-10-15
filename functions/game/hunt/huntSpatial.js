// Only server-owned H5 metadata may determine attack geometry. Room coordinates use the existing 2000-unit scale.
import {SKILL_SPATIAL, WEAPON_SPATIAL, PLAYER_SPATIAL} from '../../../template/l2CombatSpatial.js';
import classStats from '../../../template/classStatsTemplate.js';
import {resolveClassName} from '../classes/legacyClasses.js';
import {uniqueEquipped} from '../equipment/itemBonuses.js';
import {passiveTree, learnedLevel} from '../player/passiveSkills.js';
import {l2SkillAt} from '../player/skillLevel.js';
import {l2RawStat} from '../player/l2Effects.js';
import getEquipStatByName from '../player/getters/getEquipStatByName.js';
import {ROOM_SIZE} from '../world/navigation.js';
import {skillCombatType} from '../player/combatType.js';

export const BASIC_ATTACK = Object.freeze({name:'Attack', effect:'common_attack', isDealDamage:true,
    damageType:'physical', damageModifier:1, needLvl:1, cost:0, costHp:0, cooldown:0});
export const hostileSkill = skill => Boolean(skill?.isDealDamage || skill?.debuff || skill?.debuffs?.length || skill?.l2Cast?.hostile);
const classId = session => classStats.find(c => c.name === resolveClassName(session.game.gameClass.stats.name))?.l2Id;
export const spatialDistance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)*ROOM_SIZE;

/** Collision checks use the actual room walls, including thin walls between actors in the same pathfinding cell. */
export function clearLine(a,b,walls=[]) {
    return !walls.some(w => {
        let low=0, high=1;
        for(const [axis,min,max] of [['x',w.x,w.x+w.w],['y',w.y,w.y+w.h]]) {
            const delta=b[axis]-a[axis];
            if(Math.abs(delta)<1e-10){if(a[axis]<min||a[axis]>max)return false;continue;}
            const p=(min-a[axis])/delta,q=(max-a[axis])/delta;
            low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));
        }
        return low<=high;
    });
}

export function weaponSpatial(session,now=Date.now()) {
    const weapon=uniqueEquipped(session.game.equipmentStats).find(i=>i.mainType==='weapon');
    const source=weapon ? WEAPON_SPATIAL[weapon.name?.replace(/ - MW$/,'')] : PLAYER_SPATIAL[classId(session)];
    if(!source?.range||!source.speed)return null;
    const damage=String(source.damageRange||'').split(';').map(Number);
    let extra=source.extraTargets||0;
    if(source.type==='POLE') {
        for(const row of passiveTree(classId(session))) {
            const level=learnedLevel(session,row.id);if(!level)continue;
            for(const stat of row.info.stats||[])if(stat.stat==='atkCountMax'&&stat.tag==='add'&&(!stat.when?.length||stat.when.includes('POLE')))
                extra+=Number(stat.value?.[Math.min(level,stat.value.length)-1])||0;
        }
        extra+=l2RawStat(session,'atkCountMax',false,now);
    }
    const speed=source.speed*getEquipStatByName(session,'attackSpeedMul',true)+getEquipStatByName(session,'attackSpeed');
    const reuse=(source.reuse||0)*333*l2RawStat(session,'atkReuse',true,now)/Math.max(1,speed);
    return {type:source.type||'FIST',range:source.range, radius:source.range,
        angle:damage[3]||0,limit:Math.max(1,1+extra),costMp:source.mp||0,
        interval:Math.floor(500000/Math.max(1,speed))+Math.floor(reuse)};
}

export function skillSpatial(session,skill,now=Date.now()) {
    if(skill===BASIC_ATTACK || (!skill.l2Id&&skill.effect==='common_attack')) {
        const w=weaponSpatial(session,now);
        return w ? {target:'ONE',range:w.range,radius:w.type==='POLE'?w.radius:0,angle:w.angle,
            limit:w.type==='POLE'?w.limit:1,windup:0,weapon:true} : null;
    }
    if(!hostileSkill(skill))return {target:'SELF',range:0,radius:0,limit:1,windup:0};
    const source=SKILL_SPATIAL[skill.l2Id||skill.l2Cast?.id];if(!source)return null;
    const level=l2SkillAt(skill.l2Id||skill.l2Cast?.id,session.game.stats.lvl)?.level||1;
    const value=(name,fallback=0)=>{const raw=source[name];return raw?.startsWith('#')?source.tables?.[raw]?.[Math.min(level,source.tables[raw].length)-1]??fallback:raw??fallback;};
    const target=value('targetType','ONE');
    if(!['ONE','AREA','AURA','FRONT_AREA','FRONT_AURA','BEHIND_AREA','BEHIND_AURA'].includes(target))return null;
    const limits=String(value('affectLimit','0')).split('-').map(Number);
    const fan=String(value('fanRange','')).split(',').map(Number);
    return {target,range:Number(value('castRange')),radius:Number(value('affectRange')),
        limit:limits.at(-1)||0,limitMin:limits[0]||0,angle:fan[3]||180,
        windup:Math.ceil(Number(value('hitTime'))/Math.max(.05,getEquipStatByName(session,skillCombatType(skill,session.game.gameClass)==='magic'?'castingSpeedMul':'attackSpeedMul',true)))};
}

export const needsTarget = geometry => geometry.target==='ONE'||geometry.target.endsWith('AREA');
export function inSkillReach(field,mob,geometry) {
    return !needsTarget(geometry) || Boolean(mob&&spatialDistance(field,mob)<=geometry.range+1&&clearLine(field,mob,field.walls));
}

export function spatialTargets(field,mob,geometry,random=Math.random) {
    if(geometry.target==='SELF')return [];
    if(geometry.target==='ONE'&&!geometry.radius)return mob?[mob]:[];
    const center=geometry.weapon||geometry.target.endsWith('AURA')?field:mob;
    if(!center)return [];
    const facing=mob?Math.atan2(mob.y-field.y,mob.x-field.x):(field.facing||0);
    const directional=geometry.weapon||/FRONT|BEHIND/.test(geometry.target);
    const heading=facing+(geometry.target.startsWith('BEHIND')?Math.PI:0);
    const hit=field.mobs.filter(m=>{
        if(m.currentHp<=0||!clearLine(field,m,field.walls))return false;
        if(m===mob&&needsTarget(geometry))return true;
        if(spatialDistance(center,m)>geometry.radius)return false;
        const angle=Math.atan2(m.y-field.y,m.x-field.x)-heading;
        return !directional||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=geometry.angle*Math.PI/360;
    }).sort((a,b)=>(a===mob?-1:b===mob?1:spatialDistance(center,a)-spatialDistance(center,b)));
    const limit=geometry.limitMin ? geometry.limitMin+Math.floor(random()*(geometry.limit-geometry.limitMin+1)) : geometry.limit;
    return limit>0?hit.slice(0,limit):hit;
}

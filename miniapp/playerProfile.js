import classes from '../template/classStatsTemplate.js';
import {playerName,PLAYER_NAME_MAX} from '../functions/game/player/playerName.js';
import {reconcileCostumeSlot} from '../functions/game/equipment/costumeItems.js';
import { RACE_TITLES, L2_CLASS_META, classIdOf, raceOf } from '../template/l2ClassMeta.js';
import {getPlayerCombatStats, getPlayerResourceStats} from './playerCombatStats.js';
import getClassStatsFromTemplate from '../functions/game/player/getters/getGameClassStatsFromTemplate.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import {playerRace} from '../functions/game/player/playerRace.js';
import {getSubclassState,addSubclass,switchProfession,removeSubclass,professionReplacementReason} from '../functions/game/player/subclasses.js';

export const CLASS_CHANGE_COL = 20;
export const GENDER_CHANGE_COL = 7;
export const RACE_CHANGE_COL = 12;
const GENDERS = new Set(['male', 'female']);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function statDto(stats = {}) {
  return {
    attack: number(stats.attack),
    defence: number(stats.defence),
    pAtk: number(stats.pAtk ?? stats.attack),
    mAtk: number(stats.mAtk ?? stats.attack),
    pDef: number(stats.pDef ?? stats.defence),
    mDef: number(stats.mDef ?? stats.defence),
    maxHp: number(stats.maxHp ?? stats.hp),
    maxMp: number(stats.maxMp ?? stats.mp),
    maxCp: number(stats.maxCp ?? stats.cp),
    speed: number(stats.speed),
    criticalChance: number(stats.criticalChance),
    criticalDamage: number(stats.criticalDamage, 1),
    block: number(stats.block),
    accuracy: number(stats.accuracy),
    evasion: number(stats.evasion),
  };
}

const isBaseClass = item => (item.tier || 1) === 1 && !item.legacy;
const promotionLevel = stage => [1,20,40,76][stage];

function earnedProfessionStage(session) {
  const names = [session?.game?.gameClass?.stats?.name, ...(session?.game?.classQuest?.completed || [])];
  return Math.max(0, ...names.map(name=>L2_CLASS_META[classIdOf(name)]?.level || 0));
}

function professionTree(id, stage, level, allowedNames) {
  const node = L2_CLASS_META[id];
  if (!node) return null;
  return {name:node.key,title:node.ru,level:promotionLevel(node.level),
    selectable:node.level===stage && level>=promotionLevel(node.level) && (!allowedNames || allowedNames.has(node.key)),
    children:Object.entries(L2_CLASS_META).filter(([,entry])=>entry.parent===id)
      .map(([child])=>professionTree(Number(child),stage,level,allowedNames))};
}

function baseClassOf(name) {
  let id = classIdOf(name);
  if (!L2_CLASS_META[id]) return null;
  while (L2_CLASS_META[id].parent != null) id = L2_CLASS_META[id].parent;
  return L2_CLASS_META[id].key;
}

function classDto(template, level, stage, includeTree = true, allowedNames) {
  const scaled = getClassStatsFromTemplate(template.name, level) || template;
  return {
    name: template.name,
    title: template.translateName,
    race: template.race || null,
    raceTitle: template.race ? RACE_TITLES[template.race] : null,
    tier: template.tier || 1,
    description: template.description,
    stats: {...statDto(scaled),criticalChance:Math.min(500,Math.max(0,Math.floor(number(scaled.criticalChance)*10)))},
    ...(includeTree ? {professions:professionTree(classIdOf(template.name),stage,level,allowedNames)} : {}),
  };
}

export function getPlayerProfileState(session, now = Date.now()) {
  const game = session?.game || {};
  const stats = game.stats || {};
  const current = game.gameClass?.stats || {};
  const level = Math.max(1, number(stats.lvl, 1));
  const currentName = current.name || 'noClass';
  const balance=Math.max(0,number(game.inventory?.luckCoins));
  const classChangeCost=currentName==='noClass'?0:CLASS_CHANGE_COL;
  const professionStage = earnedProfessionStage(session);
  const eligibleClasses = classes.filter(item=>!item.legacy && L2_CLASS_META[classIdOf(item.name)]?.level===professionStage
    && level>=promotionLevel(professionStage) && !professionReplacementReason(session,item.name));

  return {
    level,
    nickname:game.nickname||null,name:playerName(session),nicknameMax:PLAYER_NAME_MAX,
    gender: GENDERS.has(session?.gender) ? session.gender : 'male',
    currentClass: {
      name: currentName,
      title: current.translateName || classes.find(item => item.name === currentName)?.translateName || 'Бродяжка',
      tier: current.tier || classes.find(item => item.name === currentName)?.tier || 1,
      baseClass: baseClassOf(currentName),
      race:playerRace(session),
      raceTitle:RACE_TITLES[playerRace(session)] || null,
      stats: {...statDto(current),...Object.fromEntries(getPlayerCombatStats(session).map(row=>[row.id,row.value])),
        ...getPlayerResourceStats(session)},
    },
    classChangeRemainingMs: 0,
    professionStage,
    subclasses:getSubclassState(session,now),
    eligibleClasses:eligibleClasses.map(item=>classDto(item,level,professionStage,false)),
    luckCoins:balance,
    classChangeCost,
    genderChangeCost:GENDER_CHANGE_COL,
    raceChangeCost:RACE_CHANGE_COL,
    races:Object.entries(RACE_TITLES).map(([name,title])=>({name,title})),
    canChangeClass:balance>=classChangeCost,
    canChangeGender:balance>=GENDER_CHANGE_COL,
    canChangeRace:balance>=RACE_CHANGE_COL,
    classes: classes
      .filter(item => item.name !== 'noClass' && isBaseClass(item))
      .map(item => classDto(item, level, professionStage,true,new Set(eligibleClasses.map(entry=>entry.name)))),
  };
}

export function changePlayerClassForMiniApp(session, className, now = Date.now()) {
  // Paid race/profession changes preserve the highest stage already earned.
  // The next promotion must still be earned through its profession quest.
  const target = classes.find(item => item.name === className && !item.legacy && L2_CLASS_META[classIdOf(item.name)]);
  if (!target) return { ok: false, reason: 'unknown_class' };
  const targetMeta=L2_CLASS_META[classIdOf(target.name)];
  if(targetMeta.level!==earnedProfessionStage(session))return {ok:false,reason:'profession_locked'};
  if(number(session?.game?.stats?.lvl,1)<promotionLevel(targetMeta.level))return {ok:false,reason:'level_too_low'};
  const conflict=professionReplacementReason(session,target.name);if(conflict)return {ok:false,reason:conflict};

  const currentName = session?.game?.gameClass?.stats?.name || 'noClass';
  if (currentName === className) return { ok: false, reason: 'same_class' };

  const cost=currentName==='noClass'?0:CLASS_CHANGE_COL;
  const balance=Math.max(0,number(session.game.inventory?.luckCoins));
  if(balance<cost)return {ok:false,reason:'not_enough_luck_coins',cost,balance,profile:getPlayerProfileState(session,now)};
  changePlayerClass(session, target);
  // A running profession quest belongs to the old class line; earned ones are kept.
  if (session.game?.classQuest) session.game.classQuest.active = null;
  updatePlayerStats(session);
  session.game.race=raceOf(classIdOf(target.name));
  if(cost)session.game.inventory.luckCoins=balance-cost;
  session.changeClassTimer=0;

  return {
    ok: true,
    className,
    classTitle: target.translateName,
    race:raceOf(classIdOf(target.name)),
    raceTitle:RACE_TITLES[raceOf(classIdOf(target.name))],
    spent:cost,
    profile: getPlayerProfileState(session, now),
  };
}

export function changePlayerGenderForMiniApp(session, gender, now = Date.now()) {
  if (!GENDERS.has(gender)) return { ok: false, reason: 'unknown_gender' };
  if((GENDERS.has(session.gender)?session.gender:'male')===gender)return {ok:false,reason:'same_gender'};
  const balance=Math.max(0,number(session.game.inventory?.luckCoins));
  if(balance<GENDER_CHANGE_COL)return {ok:false,reason:'not_enough_luck_coins',cost:GENDER_CHANGE_COL,balance,profile:getPlayerProfileState(session,now)};
  session.gender = gender;
  reconcileCostumeSlot(session);
  session.game.inventory.luckCoins=balance-GENDER_CHANGE_COL;
  return {
    ok: true,
    gender,
    spent:GENDER_CHANGE_COL,
    profile: getPlayerProfileState(session, now),
  };
}

export function changePlayerRaceForMiniApp(session, race, now = Date.now()) {
  if(!Object.hasOwn(RACE_TITLES,race))return {ok:false,reason:'unknown_race'};
  if(playerRace(session)===race)return {ok:false,reason:'same_race'};
  const balance=Math.max(0,number(session?.game?.inventory?.luckCoins));
  if(balance<RACE_CHANGE_COL)return {ok:false,reason:'not_enough_luck_coins',cost:RACE_CHANGE_COL,balance,profile:getPlayerProfileState(session,now)};
  session.game.race=race;
  session.game.inventory.luckCoins=balance-RACE_CHANGE_COL;
  return {ok:true,race,raceTitle:RACE_TITLES[race],spent:RACE_CHANGE_COL,profile:getPlayerProfileState(session,now)};
}

export function changePlayerSubclassForMiniApp(session, body, now = Date.now()) {
  const result=body.action==='add' ? addSubclass(session,body.className,now)
    : body.action==='switch' ? switchProfession(session,body.index,now)
    : body.action==='remove' ? removeSubclass(session,body.index,now) : {ok:false,reason:'unknown_subclass_action'};
  return result.ok ? {...result,profile:getPlayerProfileState(session,now)} : result;
}

import { l2SkillAt } from '../functions/game/player/skillLevel.js';
import Chat from '../db/models/Chat.js';
import getAliveBoss from '../functions/game/boss/getBossStatus/getAliveBoss.js';
import summonBoss from '../functions/game/boss/summonBoss.js';
import { worldBossList, worldBossTemplates, epicStatus, getEpicTemplate } from '../functions/game/boss/epicBosses.js';
import { attackLogDto, bossAttacksDto } from './bossEffects.js';
import { getInventoryState } from './inventory.js';
import potionsTemplate from '../template/potionsInInventoryTemplate.js';
import getBossLoot from '../functions/game/boss/getters/getBossLoot.js';
import { BUFF_POTION_DROP_CHANCE } from '../functions/game/boss/buffPotionDrops.js';
import bossSendLoot from '../functions/game/boss/bossSendLoot.js';
import castSkill from '../functions/game/player/castSkill.js';
import { skillTags } from './skills.js';
import { potionShare } from '../functions/game/player/potionRestore.js';
import { addMaterial, materialInfo } from '../functions/game/player/materials.js';
import { recordQuestEvent } from '../functions/game/classes/classQuests.js';
import { hasEpicPass, consumeEpicPass } from '../functions/game/academy/academy.js';
import { needsPass, partyNeeded, leaderOnly } from '../template/epicPasses.js';
import { partyState } from '../functions/game/party/party.js';
import { LEVEL_GAP, scopeOfName, INSTANCE_LOCK_MS, BOSS_GCD_MS, instanceScopeId, EPIC_RULES } from '../functions/game/boss/worldBosses.js';
import Boss from '../db/models/Boss.js';
import { getMaterialCount, spendMaterials } from '../functions/game/player/materials.js';
import { bossDebuffList, isBossStunned } from '../functions/game/boss/bossDebuffs.js';
import { aliveRequiredUnits, aliveUnits, armorShield, bossTemplateFor, findUnit } from '../functions/game/boss/bossUnits.js';
import { EVENT_LOG_SIZE } from '../functions/game/boss/bossPhases.js';
import isPlayerCanUseSkill from '../functions/game/player/isPlayerCanUseSkill.js';
import skillUsagePayCost from '../functions/game/player/skillUsagePayCost.js';
import setSkillCooldown from '../functions/game/player/setSkillCooldown.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';
import getUserName from '../functions/getters/getUserName.js';
import {playerName,limitPlayerName} from '../functions/game/player/playerName.js';
import saveSession from '../functions/getters/saveSession.js';
import { getEffectiveSkillCost } from '../functions/game/player/skillEnchant.js';
import { bossStatusesDto, playerEffectsDto } from './bossEffects.js';
import { armShots, clearShots, getShotsState } from '../functions/game/shots/shots.js';
import { hasAmmo, spendAmmo } from '../functions/game/shots/ammo.js';
import {getHotbar,HOTBAR_MAX} from '../functions/game/player/hotbar.js';
import {battleSpecialDto,excludeToggleSkills} from './battleSpecial.js';
import {quickTravelBlock,siegePoint,ensureWorld,CITIES} from '../functions/game/world/world.js';
import bossPositions from '../template/worldBossMap.js';
import {locationBossGate} from '../functions/game/world/zakenShip.js';

export async function enterBossFromLocation(session,chatId,name,now=Date.now()){
 if(!locationBossGate(session,name,now))return {ok:false,reason:'boss_gate_required'};
 return enterBossFromAtlas(session,chatId,name,now);
}

/** Direct map entry uses the same encounter, party/pass/lock rules as the existing boss entry. */
export async function enterBossFromAtlas(session,chatId,name,now=Date.now()){
 const blocked=quickTravelBlock(session,now);if(blocked)return {ok:false,reason:blocked};
 const template=getEpicTemplate(name),point=template&&bossPositions[template.world?.npcId];
 if(!template)return {ok:false,reason:'unknown_epic'};
 if(!point)return {ok:false,reason:'boss_location_unknown'};
 if(template.world?.raid&&point.instance)return {ok:false,reason:'instance_npc_required'};
 if(siegePoint(point))return {ok:false,reason:'quick_travel_siege'};
 const level=number(session.game.stats?.lvl,1);
 if(level<template.epic.minLevel)return {ok:false,reason:'epic_level_too_low'};
 if(template.epic.maxLevel&&level>template.epic.maxLevel)return {ok:false,reason:'epic_level_too_high'};
 const alive=await getAliveBoss(chatId);
 const joining=alive?.name===name&&!(await expireBossIfNeeded(alive,chatId));
 if(joining&&partyNeeded(name)){const group=partyState(await Chat.findOne({chatId:Number(chatId)}),session);if(!group||group.members.length<partyNeeded(name))return {ok:false,reason:'epic_party_required',partyMin:partyNeeded(name)};}
 const result=joining?{ok:true,action:'join',boss:await getBossState(session,chatId)}:await summonBossForMiniApp(session,chatId,name);
 if(!result.ok)return result;
 const city=[...CITIES].sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
 Object.assign(ensureWorld(session,now),{mode:'boss',boss:name,city:city.id,location:null,path:[],pending:null,channel:null,holding:null,instanceId:null,readyHolding:null,bossPosition:{x:point.x,y:point.y},bossRoom:point.room||{x:point.x,y:point.y,z:point.z},x:.5,y:.5});
 if(session.game.hunt){session.game.hunt.field=null;session.game.hunt.mob=null;}
 session.needsSave=true;
 return result;
}

export { bossStatusesDto, playerEffectsDto };

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percent(current, max) {
  return max > 0 ? Math.max(0, Math.min(100, current / max * 100)) : 0;
}

export function skillDto(session, skill, index, now = Date.now()) {
  const cooldownUntil = number(skill?.cooldownReceive);
  const cooldownMs = Math.max(0, cooldownUntil - now);
  const hp = getCurrentHp(session, session.game.gameClass);
  const mp = getCurrentMp(session, session.game.gameClass);
  const effectiveCost = getEffectiveSkillCost(skill, getMaxHp(session, session.game.gameClass), session);
  const costHp = Math.max(0, number(effectiveCost.costHp));
  const costMp = Math.max(0, number(effectiveCost.cost));
  const needLevel = Math.max(0, number(skill?.needLvl));
  const locked = needLevel > number(session?.game?.stats?.lvl, 1);
  // the real Lineage II skill: its level for this hero and the power of that level
  const real = l2SkillAt(skill?.l2Id, number(session?.game?.stats?.lvl, 1));

  return {
    l2Id: skill?.l2Id ?? null,
    l2Power: real && real.power >= 1 ? Math.round(real.power) : null,
    l2Level: real ? real.level : null,
    l2MaxLevel: real ? real.maxLevel : null,
    slot: Number.isFinite(Number(skill?.slot)) ? Number(skill.slot) : index,
    index,
    name: skill?.name || `Навык ${index + 1}`,
    description: skill?.description || '',
    isDamage: Boolean(skill?.isDealDamage),
    isHeal: Boolean(skill?.isHeal),
    isShield: Boolean(skill?.isShield),
    isBuff: Boolean(skill?.isBuff || skill?.buffs?.length),
    isDebuff: Boolean(skill?.debuff && !skill?.isDealDamage),
    tags: skillTags(skill),
    tier: Math.max(1, number(skill?.tier, 1)),
    locked,
    needLevel,
    enchantLevel: Math.max(0, number(skill?.enchantLevel)),
    costHp,
    costMp,
    cooldownMs,
    cooldownUntil,
    canUse: !locked && cooldownMs <= 0 && hp > costHp && mp >= costMp && hasAmmo(session, skill),
  };
}

function lootRange(values) {
  const rows = (values || []).flatMap(item => {
    if (typeof item === 'number') return [item];
    if (item?.value) return [number(item.value.minAmount), number(item.value.maxAmount)];
    return [number(item?.minAmount), number(item?.maxAmount)];
  }).filter(value => Number.isFinite(value));

  if (!rows.length) return null;
  return { min: Math.min(...rows), max: Math.max(...rows) };
}

/** Chance of a buff potion per fighter and whether the top places always get one. */
function buffPotionLoot(boss) {
  const template = bossTemplateFor(boss);
  const chance = BUFF_POTION_DROP_CHANCE[template?.tier || 1] ?? BUFF_POTION_DROP_CHANCE[1];
  return { percent: Math.round(chance * 100), guaranteedTop: Boolean(template?.epic) };
}

function lootDto(boss) {
  try {
    const loot = getBossLoot(boss);
    return {
      gold: lootRange(loot.gold),
      moonDew: lootRange(loot.moonDew),
      experience: lootRange(loot.experience),
      equipment: Array.isArray(loot.equipment) ? loot.equipment.length : 0,
      buffPotion: buffPotionLoot(boss),
    };
  } catch {
    return null;
  }
}

/**
 * Everyone who has hit the boss, ranked by damage, with what the party frames
 * need: class portrait, level, live HP and damage share. One chat lookup serves
 * all participants (getSession would create missing members, so it isn't used).
 */
async function participantsDto(boss, chatId, viewerId) {
  const rows = [...(boss?.listOfDamage || [])].sort((a, b) => number(b.damage) - number(a.damage)).slice(0, 20);
  if (!rows.length) return [];
  const chat = await Chat.findOne({ chatId: Number(chatId) }, { members: 1 }).lean().catch(() => null);
  const members = new Map((chat?.members || []).map(member => [String(member.userId), member]));
  const total = rows.reduce((sum, row) => sum + number(row.damage), 0) || 1;
  const result = [];
  for (const row of rows) {
    const member = members.get(String(row.id));
    const gameClass = member?.game?.gameClass;
    let hpPercent = null;
    try {
      if (member?.game) hpPercent = percent(getCurrentHp(member, gameClass), getMaxHp(member, gameClass));
    } catch { hpPercent = null; }
    result.push({
      userId: row.id,
      name: member?playerName(member):limitPlayerName(await getUserName(row.id, 'name') || `Игрок ${row.id}`),
      damage: number(row.damage),
      share: Math.round((number(row.damage) / total) * 1000) / 10,
      className: gameClass?.stats?.name || 'noClass',
      gender: member?.gender === 'female' ? 'female' : 'male',
      level: number(member?.game?.stats?.lvl, 1),
      hpPercent,
      isYou: viewerId != null && String(row.id) === String(viewerId),
    });
  }
  return result;
}

async function expireBossIfNeeded(boss, chatId, now = Date.now()) {
  if (!boss || !boss.hp || !boss.currentHp || number(boss.aliveTime) > now) return false;

  const chat = await Chat.findOne({ chatId: Number(chatId) });
  if (chat) {
    for (const player of boss.listOfDamage || []) {
      const member = chat.members.find(item => String(item.userId) === String(player.id));
      if (member?.game?.gameClass?.stats) {
        member.game.gameClass.stats.hp = 0;
        member.game.respawnTime = now + 60 * 1000;
      }
    }
    await chat.save();
  }

  boss.skill = null;
  boss.currentHp = 0;
  boss.hp = 0;
  boss.listOfDamage = [];
  boss.markModified('skill');
  boss.markModified('listOfDamage');
  await boss.save();
  return true;
}

/**
 * Every potion kind for the fight's quick-use bar: owned ones carry their
 * inventory key and count, missing ones show as empty (count 0, key null).
 */
export function potionBarDto(session) {
  const owned = getInventoryState(session).potions;
  const same = (a, b) => a.type === b.type && (a.bottleType || 'potion') === (b.bottleType || 'potion') && number(a.power) === number(b.power);
  // Buff potions are drunk from the inventory before the fight; the quick bar holds restoring potions only.
  const restoring = potion => potion.type !== 'buff';
  const bar = potionsTemplate.filter(restoring).map(template => {
    const item = owned.find(potion => same(potion, template) && potion.count > 0) || owned.find(potion => same(potion, template));
    return {
      key: item && item.count > 0 ? item.key : null,
      id: template.id || null,
      size: template.size || '',
      type: template.type,
      bottleType: template.bottleType,
      power: number(template.power),
      share: Math.round(potionShare(template) * 100),
      name: template.name,
      count: item ? item.count : 0,
    };
  });
  const extra = owned.filter(potion => restoring(potion) && potion.count > 0 && !potionsTemplate.some(template => same(potion, template)));
  return [...bar, ...extra.map(({ key, id, size, type, bottleType, power, share, name, count }) => ({ key, id, size, type, bottleType, power, share, name, count }))];
}

/** Minions, phases, charging ultimate, stun and debuffs of the encounter. */
function encounterDto(boss, now) {
  const template = bossTemplateFor(boss);
  const lockedBy = aliveRequiredUnits(boss).length;
  const charging = boss.charging && number(boss.charging.readyAt) > 0 ? boss.charging : null;
  return {
    title: template?.title || '',
    element: template?.element || '',
    tier: number(template?.tier, 1),
    pair: Boolean(template?.pair),
    enrage: Math.round(number(boss.enrage) * 100),
    shielded: Math.round(armorShield(boss, template) * 100),
    locked: lockedBy > 0 && number(boss.currentHp) <= 1,
    requiredAlive: lockedBy,
    phase: { current: number(boss.phaseIndex), total: (template?.phases || []).length },
    charging: charging ? { key: String(charging.key), readyInMs: Math.max(0, number(charging.readyAt) - now) } : null,
    stunned: isBossStunned(boss, now),
    debuffs: bossDebuffList(boss, now),
    minions: (boss.minions || []).map(unit => ({
      id: String(unit.id),
      key: String(unit.key),
      name: String(unit.name || ''),
      icon: String(unit.icon || '👾'),
      kind: String(unit.kind || 'minion'),
      required: Boolean(unit.required),
      description: String(unit.description || ''),
      hp: number(unit.hp),
      currentHp: Math.max(0, number(unit.currentHp)),
      hpPercent: percent(Math.max(0, number(unit.currentHp)), number(unit.hp)),
      alive: number(unit.currentHp) > 0,
    })).filter(unit => unit.alive || unit.kind !== 'minion'),
    events: (Array.isArray(boss.eventLog) ? boss.eventLog : []).slice(0, EVENT_LOG_SIZE).map(event => ({
      icon: String(event.icon || '⚠️'),
      text: String(event.text || ''),
      agoMs: Math.max(0, now - number(event.at)),
    })),
  };
}

export async function getBossState(session, chatId, now = Date.now()) {
  let boss = await getAliveBoss(chatId);
  if (boss && await expireBossIfNeeded(boss, chatId, now)) boss = null;

  const maxHp = getMaxHp(session, session.game.gameClass);
  const maxMp = getMaxMp(session, session.game.gameClass);
  const currentHp = getCurrentHp(session, session.game.gameClass);
  const currentMp = getCurrentMp(session, session.game.gameClass);
  const skills = (session?.game?.gameClass?.skills || []).map((skill, index) => skillDto(session, skill, index, now));

  const maxCp = number(getMaxCp(session, session.game.gameClass), 0);
  const currentCp = number(getCurrentCp(session, session.game.gameClass), 0);
  const respawnRemainMs = Math.max(0, number(session?.game?.respawnTime) - now);
  const special = battleSpecialDto(session,now);
  const player = {
    name: playerName(session),
    level: number(session?.game?.stats?.lvl, 1),
    cp: currentCp,
    maxCp,
    cpPercent: percent(currentCp, maxCp),
    effects: playerEffectsDto(session?.game?.effects, respawnRemainMs),
    // For the battle scene: which class portrait and skill animations to show.
    className: session?.game?.gameClass?.stats?.name || 'noClass',
    gender: session?.gender === 'female' ? 'female' : 'male',
    hp: currentHp,
    maxHp,
    hpPercent: percent(currentHp, maxHp),
    mp: currentMp,
    maxMp,
    mpPercent: percent(currentMp, maxMp),
    respawnRemainMs,
    skills: excludeToggleSkills(skills,special,session),
    hotbar: getHotbar(session),
    hotbarMax: HOTBAR_MAX,
    special,
    // Potions for the quick-use bar in the fight.
    potions: potionBarDto(session),
    shots: getShotsState(session),
  };

  if (!boss) {
    return { active: false, player };
  }

  return {
    active: true,
    player,
    boss: {
      id: String(boss._id),
      name: boss.name,
      sceneKey:boss.world?.sceneKey,environment:boss.world?.environment,
      nameCall: boss.nameCall || boss.name,
      description: boss.description || '',
      level: number(boss.stats?.lvl, 1),
      // Bosses level up the more often the chat summons them.
      summons: { current: number(boss.stats?.currentSummons), need: number(boss.stats?.needSummons) },
      hp: number(boss.hp),
      currentHp: number(boss.currentHp),
      hpPercent: percent(number(boss.currentHp), number(boss.hp)),
      aliveTime: number(boss.aliveTime),
      remainMs: Math.max(0, number(boss.aliveTime) - now),
      skill: boss.skill ? {
        name: boss.skill.name || '',
        description: boss.skill.description || '',
        effects: Array.isArray(boss.skill.effect) ? boss.skill.effect : [],
      } : null,
      loot: lootDto(boss),
      statuses: bossStatusesDto(boss),
      damageList: await participantsDto(boss, chatId, session?.userId),
      attacks: bossAttacksDto(boss.name),
      attackLog: attackLogDto(boss.attackLog, session?.userId, now),
      nextAttackMs: Math.max(0, number(boss.nextAttackAt) - now),
      ...encounterDto(boss, now),
    },
  };
}

const lockOf = (session, name) => session?.game?.instanceLocks?.[name] || null;

/** The world bosses (epics and raid bosses of the real data) with where they stand, their respawn timers and fights. */
export async function getEpicState(session = null, now = Date.now()) {
  const templates = worldBossTemplates();
  const scopes = templates.filter(template => !EPIC_RULES[template.name]?.instance).map(template => scopeOfName(template.name)).filter(id => id !== null);
  const partyId = session?.game?.party?.id || null;
  // the copies of the instanced bosses of the hero's party
  const instances = partyId ? templates.filter(template => EPIC_RULES[template.name]?.instance).map(template => ({ name: template.name, scope: instanceScopeId(template.name, partyId) })) : [];
  const [chats, alive] = await Promise.all([
    Chat.find({ chatId: { $in: scopes } }, { chatId: 1, epicBosses: 1 }).lean(),
    Boss.find({ chatId: { $in: [...scopes, ...instances.map(item => item.scope)] }, currentHp: { $gt: 0 }, aliveTime: { $gt: now } }, { name: 1, hp: 1, currentHp: 1 }).lean(),
  ]);
  const records = {};
  for (const chat of chats) Object.assign(records, chat.epicBosses || {});
  const fighting = Object.fromEntries(alive.map(boss => [boss.name, percent(number(boss.currentHp), number(boss.hp))]));
  const list = worldBossList(records, fighting, now).map(entry => {
    const rules = EPIC_RULES[entry.name] || {};
    const extra = { adaptive: Boolean(rules.adaptive), instance: Boolean(rules.instance) };
    if (!rules.instance) return { ...entry, ...extra };
    // an instance has no shared timer: the hero's own lock of three days decides
    const lock = lockOf(session, entry.name);
    const remainMs = Math.max(0, number(lock?.until) - now);
    return { ...entry, ...extra, available: remainMs === 0, remainMs, respawnAt: remainMs ? number(lock.until) : 0, hasParty: Boolean(partyId) };
  });
  return { bosses: list };
}

// An unfought ordinary boss (nobody has hit it yet) makes way for an epic challenge.
async function clearUnfoughtBoss(boss) {
  if (!boss || (boss.listOfDamage || []).length) return false;
  boss.skill = null;
  boss.currentHp = 0;
  boss.hp = 0;
  boss.markModified('skill');
  await boss.save();
  return true;
}

/** The material that calls the clan boss. */
export const CLAN_BOSS_TOKEN = 'clan_boss_token';

export async function summonBossForMiniApp(session, chatId, epicName = null, {memberCount = null} = {}) {
  let epicTemplate = null;
  let passHolder = session;
  // the clan boss (not a world boss) is called with a Clan Boss Sigil
  if (!epicName && getMaterialCount(session, CLAN_BOSS_TOKEN) < 1) {
    return { ok: false, reason: 'no_summon_item', boss: await getBossState(session, chatId) };
  }
  if (epicName) {
    epicTemplate = getEpicTemplate(epicName);
    if (!epicTemplate) return { ok: false, reason: 'unknown_epic', boss: await getBossState(session, chatId) };
    if(epicTemplate.world?.raid&&bossPositions[epicTemplate.world.npcId]?.instance)return {ok:false,reason:'instance_npc_required'};
    if (number(session?.game?.stats?.lvl, 1) < epicTemplate.epic.minLevel) {
      return { ok: false, reason: 'epic_level_too_low', requiredLevel: epicTemplate.epic.minLevel, boss: await getBossState(session, chatId) };
    }
    if (epicTemplate.epic.maxLevel && number(session?.game?.stats?.lvl, 1) > epicTemplate.epic.maxLevel) {
      return { ok: false, reason: 'epic_level_too_high', maxLevel: epicTemplate.epic.maxLevel, boss: await getBossState(session, chatId) };
    }
    const chat = await Chat.findOne({ chatId: Number(chatId) });
    const partyMin = partyNeeded(epicName);
    const group = partyMin ? partyState(chat, session) : null;
    if (partyMin && (group?.members.length || 0) < partyMin) {
      return { ok: false, reason: 'epic_party_required', minParty: partyMin, boss: await getBossState(session, chatId) };
    }
    // an instance: each hero enters it once in three days (the reward comes with the entry)
    if (epicTemplate.world?.instance) {
      const lockedMember = (group?.members || [session]).find(member => number(lockOf(member, epicName)?.until) > Date.now());
      if (lockedMember) {
        return { ok: false, reason: 'instance_locked', remainMs: number(lockOf(lockedMember, epicName).until) - Date.now(), boss: await getBossState(session, chatId) };
      }
    }
    // the pass: the summoner's own, or only the party leader's for a boss that takes a full party
    passHolder = session;
    if (needsPass(epicName) && leaderOnly(epicName) && group) {
      passHolder = group.members.find(member => String(member.userId) === String(group.leaderId)) || session;
    }
    if (needsPass(epicName) && !hasEpicPass(passHolder, epicName)) {
      return { ok: false, reason: 'epic_pass_required', leaderOnly: leaderOnly(epicName), boss: await getBossState(session, chatId) };
    }
    const status = epicTemplate.world?.instance ? { available: true } : epicStatus(chat, epicName);
    if (!status.available) {
      return { ok: false, reason: 'epic_cooldown', remainMs: status.remainMs, respawnAt: status.respawnAt, boss: await getBossState(session, chatId) };
    }
  }

  const alive = await getAliveBoss(chatId);
  if (alive && !(await expireBossIfNeeded(alive, chatId))) {
    if (!(epicTemplate && await clearUnfoughtBoss(alive))) {
      return { ok: false, reason: 'already_summoned', boss: await getBossState(session, chatId) };
    }
  }

  const boss = await summonBoss(chatId, epicTemplate, {memberCount, heroLevel: number(session?.game?.stats?.lvl, 1)});
  if (epicTemplate?.world?.instance) {
    // every member of the party enters with the summoner: three days until the next entry and the next reward
    const group = partyState(await Chat.findOne({ chatId: Number(chatId) }), session);
    for (const member of group?.members || [session]) {
      if (!member.game.instanceLocks) member.game.instanceLocks = {};
      member.game.instanceLocks[epicName] = { until: Date.now() + INSTANCE_LOCK_MS, scope: chatId };
      if (member !== session) member.needsSave = true;
    }
  }
  if (!epicName) spendMaterials(session, { [CLAN_BOSS_TOKEN]: 1 });
  if (epicName && needsPass(epicName)) {
    consumeEpicPass(passHolder, epicName);
    if (passHolder !== session) passHolder.needsSave = true;
  }
  return {
    ok: true,
    action: 'summon',
    bossId: String(boss._id),
    boss: await getBossState(session, chatId),
  };
}

/** How long the raid curse keeps a hero in stone. */
const PETRIFY_MS = 10 * 60 * 1000;

export async function useBossSkill(session, chatId, userId, rawSkillIndex, targetId = null) {
  const boss = await getAliveBoss(chatId);
  if (!boss || await expireBossIfNeeded(boss, chatId)) {
    return { ok: false, reason: 'no_boss', boss: await getBossState(session, chatId) };
  }

  const currentHp = getCurrentHp(session, session.game.gameClass);
  if (currentHp <= 0) {
    return { ok: false, reason: 'dead', boss: await getBossState(session, chatId) };
  }

  // World bosses: the level rules, the instance lock and a pause between casts.
  const template = bossTemplateFor(boss);
  const world = boss.world || template?.world;
  if (world) {
    const stoneUntil = number(session.game.petrifiedUntil);
    if (stoneUntil > Date.now()) return { ok: false, reason: 'petrified', remainMs: stoneUntil - Date.now(), boss: await getBossState(session, chatId) };
    const heroLevel = number(session.game.stats?.lvl, 1);
    const adaptive = Boolean(world.adaptive);
    // an adaptive epic takes heroes of its original level and above; the others a level range of LEVEL_GAP
    if (adaptive && heroLevel < number(world.baseLevel, world.level)) {
      return { ok: false, reason: 'epic_level_too_low', requiredLevel: number(world.baseLevel, world.level), boss: await getBossState(session, chatId) };
    }
    const gap = Math.abs(heroLevel - number(world.level));
    if (!adaptive && gap > LEVEL_GAP) {
      session.game.petrifiedUntil = Date.now() + PETRIFY_MS;
      boss.listOfDamage = (boss.listOfDamage || []).filter(row => String(row.id) !== String(userId));
      boss.markModified?.('listOfDamage');
      await boss.save();
      return { ok: false, reason: 'petrified', cursed: true, gap, remainMs: PETRIFY_MS, changed: true, boss: await getBossState(session, chatId) };
    }
    if (world.instance) {
      const lock = lockOf(session, boss.name);
      if (lock && number(lock.until) > Date.now() && String(lock.scope) !== String(chatId)) {
        return { ok: false, reason: 'instance_locked', remainMs: number(lock.until) - Date.now(), boss: await getBossState(session, chatId) };
      }
      if (!lock || number(lock.until) <= Date.now()) {
        // a member who joined the party after the entry takes the lock with the first cast
        if (!session.game.instanceLocks) session.game.instanceLocks = {};
        session.game.instanceLocks[boss.name] = { until: Date.now() + INSTANCE_LOCK_MS, scope: chatId };
      }
    }
    const lastCast = number(session.game.lastWorldCastAt);
    if (Date.now() - lastCast < BOSS_GCD_MS) return { ok: false, reason: 'cooldown', boss: await getBossState(session, chatId) };
    session.game.lastWorldCastAt = Date.now();
  }

  const skillIndex = Number(rawSkillIndex);
  const skill = session?.game?.gameClass?.skills?.[skillIndex];
  if (!Number.isInteger(skillIndex) || !skill) {
    return { ok: false, reason: 'invalid_skill', boss: await getBossState(session, chatId) };
  }

  const canUse = isPlayerCanUseSkill(session, skill);
  if (canUse === 3) {
    return { ok: false, reason: 'skill_locked', needLevel: number(skill.needLvl), boss: await getBossState(session, chatId) };
  }
  if (canUse === 1) {
    return { ok: false, reason: 'not_enough_resource', boss: await getBossState(session, chatId) };
  }
  if (canUse === 2) {
    return { ok: false, reason: 'cooldown', boss: await getBossState(session, chatId) };
  }
  if (canUse === 4) {
    return { ok: false, reason: 'no_ammo', boss: await getBossState(session, chatId) };
  }
  if(canUse===5)return {ok:false,reason:'effect_blocked',boss:await getBossState(session,chatId)};

  // A damage skill may be aimed at one of the boss's minions.
  let target = null;
  if (targetId && targetId !== 'boss') {
    target = findUnit(boss, String(targetId));
    if (skill.isDealDamage && !target) {
      return { ok: false, reason: 'target_gone', boss: await getBossState(session, chatId) };
    }
  }

  const { cost, costHp } = getEffectiveSkillCost(skill, getMaxHp(session, session.game.gameClass), session);
  const costCount = costHp > 0 ? costHp : cost;
  const costType = costHp > 0 ? 'hp' : 'mp';
  skillUsagePayCost(session, costType, costCount);
  spendAmmo(session, skill);

  const shots = armShots(session, skill);
  const result = castSkill(session, boss, skill, { targetId: target?.id || null });
  clearShots(session);
  if (shots) result.shots = shots;
  if (skill.isDealDamage) boss.markModified('listOfDamage');
  boss.markModified('minions');
  boss.markModified('debuffs');
  boss.markModified('eventLog');
  setSkillCooldown(skill, session);

  // Quest progress and the minion's own rewards ride on the same save.
  const questGains = recordQuestEvent(session, { type: 'skill', skill }).gains;
  let unitDrops = null;
  if (result.unitKilled) {
    const { sp, items } = result.unitKilled;
    session.game.inventory.sp = number(session.game.inventory.sp) + sp;
    items.forEach(drop => addMaterial(session, drop.item, drop.amount));
    unitDrops = {
      name: result.unitKilled.name,
      sp,
      items: items.map(drop => ({ ...materialInfo(drop.item), amount: drop.amount })),
      reaction: result.unitKilled.reaction?.say || '',
    };
    questGains.push(...recordQuestEvent(session, { type: 'minion_kill', count: 1 }).gains);
    delete result.unitKilled;
  }
  await saveSession(session);

  let killed = false;
  let loot = null;
  if (skill.isDealDamage || result.type === 'debuff') {
    if (skill.isDealDamage && number(boss.currentHp) <= 0) {
      boss.currentHp = 0;
      await boss.save();
      loot = await bossSendLoot(boss, chatId);
      killed = true;
      boss.skill = null;
      boss.currentHp = 0;
      boss.hp = 0;
      boss.listOfDamage = [];
      boss.minions = [];
      boss.markModified('skill');
      boss.markModified('listOfDamage');
      boss.markModified('minions');
    }
    await boss.save();
  }

  return {
    ok: true,
    action: 'skill',
    skillIndex,
    result,
    killed,
    loot: loot?.[userId] || null,
    unitDrops,
    questGains,
    refreshPlayer: killed || Boolean(unitDrops) || questGains.length > 0,
    boss: await getBossState(session, chatId),
  };
}

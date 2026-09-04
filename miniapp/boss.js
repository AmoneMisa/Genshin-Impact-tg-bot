import Boss from '../db/models/Boss.js';
import Chat from '../db/models/Chat.js';
import getAliveBoss from '../functions/game/boss/getBossStatus/getAliveBoss.js';
import summonBoss from '../functions/game/boss/summonBoss.js';
import getBossLoot from '../functions/game/boss/getters/getBossLoot.js';
import bossSendLoot from '../functions/game/boss/bossSendLoot.js';
import userDealDamage from '../functions/game/player/userDealDamage.js';
import isPlayerCanUseSkill from '../functions/game/player/isPlayerCanUseSkill.js';
import skillUsagePayCost from '../functions/game/player/skillUsagePayCost.js';
import setSkillCooldown from '../functions/game/player/setSkillCooldown.js';
import useHealSkill from '../functions/game/player/useHealSkill.js';
import useShieldSkill from '../functions/game/player/useShieldSkill.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getUserName from '../functions/getters/getUserName.js';
import saveSession from '../functions/getters/saveSession.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percent(current, max) {
  return max > 0 ? Math.max(0, Math.min(100, current / max * 100)) : 0;
}

function skillDto(session, skill, index, now = Date.now()) {
  const cooldownUntil = number(skill?.cooldownReceive);
  const cooldownMs = Math.max(0, cooldownUntil - now);
  const hp = getCurrentHp(session, session.game.gameClass);
  const mp = getCurrentMp(session, session.game.gameClass);
  const costHp = Math.max(0, number(skill?.costHp));
  const costMp = Math.max(0, number(skill?.cost));

  return {
    slot: Number.isFinite(Number(skill?.slot)) ? Number(skill.slot) : index,
    index,
    name: skill?.name || `Навык ${index + 1}`,
    description: skill?.description || '',
    isDamage: Boolean(skill?.isDealDamage),
    isHeal: Boolean(skill?.isHeal),
    isShield: Boolean(skill?.isShield),
    costHp,
    costMp,
    cooldownMs,
    cooldownUntil,
    canUse: cooldownMs <= 0 && hp >= costHp && mp >= costMp,
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

function lootDto(boss) {
  try {
    const loot = getBossLoot(boss);
    return {
      gold: lootRange(loot.gold),
      crystals: lootRange(loot.crystals),
      experience: lootRange(loot.experience),
      equipment: Array.isArray(loot.equipment) ? loot.equipment.length : 0,
    };
  } catch {
    return null;
  }
}

async function damageListDto(boss) {
  const rows = [...(boss?.listOfDamage || [])].sort((a, b) => number(b.damage) - number(a.damage));
  const result = [];
  for (const row of rows.slice(0, 20)) {
    result.push({
      userId: row.id,
      name: await getUserName(row.id, 'name') || `Игрок ${row.id}`,
      damage: number(row.damage),
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

export async function getBossState(session, chatId, now = Date.now()) {
  let boss = await getAliveBoss(chatId);
  if (boss && await expireBossIfNeeded(boss, chatId, now)) boss = null;

  const maxHp = getMaxHp(session, session.game.gameClass);
  const maxMp = getMaxMp(session, session.game.gameClass);
  const currentHp = getCurrentHp(session, session.game.gameClass);
  const currentMp = getCurrentMp(session, session.game.gameClass);
  const skills = (session?.game?.gameClass?.skills || []).map((skill, index) => skillDto(session, skill, index, now));

  const player = {
    hp: currentHp,
    maxHp,
    hpPercent: percent(currentHp, maxHp),
    mp: currentMp,
    maxMp,
    mpPercent: percent(currentMp, maxMp),
    respawnRemainMs: Math.max(0, number(session?.game?.respawnTime) - now),
    skills,
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
      nameCall: boss.nameCall || boss.name,
      description: boss.description || '',
      level: number(boss.stats?.lvl, 1),
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
      damageList: await damageListDto(boss),
    },
  };
}

export async function summonBossForMiniApp(session, chatId) {
  const alive = await getAliveBoss(chatId);
  if (alive && !(await expireBossIfNeeded(alive, chatId))) {
    return { ok: false, reason: 'already_summoned', boss: await getBossState(session, chatId) };
  }

  const boss = await summonBoss(chatId);
  return {
    ok: true,
    action: 'summon',
    bossId: String(boss._id),
    boss: await getBossState(session, chatId),
  };
}

export async function useBossSkill(session, chatId, userId, rawSkillIndex) {
  const boss = await getAliveBoss(chatId);
  if (!boss || await expireBossIfNeeded(boss, chatId)) {
    return { ok: false, reason: 'no_boss', boss: await getBossState(session, chatId) };
  }

  const currentHp = getCurrentHp(session, session.game.gameClass);
  if (currentHp <= 0) {
    return { ok: false, reason: 'dead', boss: await getBossState(session, chatId) };
  }

  const skillIndex = Number(rawSkillIndex);
  const skill = session?.game?.gameClass?.skills?.[skillIndex];
  if (!Number.isInteger(skillIndex) || !skill) {
    return { ok: false, reason: 'invalid_skill', boss: await getBossState(session, chatId) };
  }

  const canUse = isPlayerCanUseSkill(session, skill);
  if (canUse === 1) {
    return { ok: false, reason: 'not_enough_resource', boss: await getBossState(session, chatId) };
  }
  if (canUse === 2) {
    return { ok: false, reason: 'cooldown', boss: await getBossState(session, chatId) };
  }

  const costCount = number(skill.costHp) > 0 ? number(skill.costHp) : number(skill.cost);
  const costType = number(skill.costHp) > 0 ? 'hp' : 'mp';
  skillUsagePayCost(session, costType, costCount);

  let result = { type: 'utility' };
  let killed = false;
  let loot = null;

  if (skill.isDealDamage) {
    const damage = userDealDamage(session, boss, skill);
    result = { type: 'damage', ...damage };
    boss.markModified('listOfDamage');
  } else if (skill.isHeal) {
    const heal = useHealSkill(session, skill);
    const maxPlayerHp = getMaxHp(session, session.game.gameClass);
    session.game.gameClass.stats.hp = Math.min(maxPlayerHp, number(session.game.gameClass.stats.hp) + heal);
    result = { type: 'heal', heal };
  } else if (skill.isShield) {
    const shield = useShieldSkill(session, skill);
    if (!Array.isArray(session.game.effects)) session.game.effects = [];
    const shieldEffect = session.game.effects.find(effect => effect.name === 'shield');
    if (shieldEffect) shieldEffect.value = shield;
    else session.game.effects.push({ name: 'shield', value: shield, time: 0 });
    result = { type: 'shield', shield };
  }

  setSkillCooldown(skill, session);
  await saveSession(session);

  if (skill.isDealDamage) {
    if (number(boss.currentHp) <= 0) {
      boss.currentHp = 0;
      await boss.save();
      loot = await bossSendLoot(boss, chatId);
      killed = true;
      boss.skill = null;
      boss.currentHp = 0;
      boss.hp = 0;
      boss.listOfDamage = [];
      boss.markModified('skill');
      boss.markModified('listOfDamage');
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
    refreshPlayer: killed,
    boss: killed ? null : await getBossState(session, chatId),
  };
}

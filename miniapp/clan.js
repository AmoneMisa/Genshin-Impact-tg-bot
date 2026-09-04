import crypto from 'crypto';
import Clan from '../db/models/Clan.js';
import getClan from '../functions/game/clans/getClan.js';
import getUserName from '../functions/getters/getUserName.js';
import addClanXp from '../functions/game/clans/addClanXp.js';
import clanQuiz from '../dictionaries/clanQuiz.js';

const RESOURCES = new Set(['gold', 'crystals', 'ironOre']);
const XP_PER_CONTRIBUTION = 10;
const QUIZ_GOLD_REWARD = 100;
const QUIZ_XP_REWARD = 50;
const QUIZ_CONTRIBUTION_REWARD = 10;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeClanName(rawName) {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 40) return null;
  return name;
}

export function parseClanAmount(rawAmount) {
  if (typeof rawAmount === 'string' && !/^\d+$/.test(rawAmount.trim())) return null;
  const amount = Number(rawAmount);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  return amount;
}

function findMember(clan, userId) {
  return clan?.members?.find(member => String(member.userId) === String(userId)) || null;
}

async function memberDto(member) {
  const name = await getUserName(member.userId, 'name');
  return {
    userId: String(member.userId),
    name: name || `Игрок ${member.userId}`,
    role: member.role || 'member',
    contribution: Math.max(0, number(member.contribution)),
    upgrades: member.upgrades || {},
  };
}

async function clanDto(clan, userId) {
  if (!clan) return null;
  const me = findMember(clan, userId);
  return {
    id: String(clan._id),
    name: clan.name,
    tag: clan.tag || '',
    description: clan.description || '',
    ownerId: String(clan.owner),
    isOwner: String(clan.owner) === String(userId),
    myRole: me?.role || null,
    myContribution: Math.max(0, number(me?.contribution)),
    level: Math.max(1, number(clan.level, 1)),
    xp: Math.max(0, number(clan.xp)),
    reputation: Math.max(0, number(clan.reputation)),
    warehouse: {
      gold: Math.max(0, number(clan.warehouse?.gold)),
      crystals: Math.max(0, number(clan.warehouse?.crystals)),
      ironOre: Math.max(0, number(clan.warehouse?.ironOre)),
    },
    members: await Promise.all((clan.members || []).map(memberDto)),
    entryType: number(clan.entryConditions?.entryType),
    applications: Array.isArray(clan.applications) ? clan.applications.map(String) : [],
    activities: {
      quiz: true,
      boss: Boolean(clan.boss),
      shop: true,
      upgrades: true,
      pvp: true,
      buildings: true,
      war: true,
    },
  };
}

export async function getClanDashboard(userId) {
  const clan = await getClan(userId);
  if (clan) {
    return {
      clan: await clanDto(clan, userId),
      available: [],
    };
  }

  const available = await Clan.find({ 'entryConditions.entryType': { $ne: -1 } })
    .sort({ level: -1, createdAt: 1 })
    .limit(20);

  return {
    clan: null,
    available: available.map(item => ({
      id: String(item._id),
      name: item.name,
      level: Math.max(1, number(item.level, 1)),
      members: item.members?.length || 0,
      entryType: number(item.entryConditions?.entryType),
    })),
  };
}

export async function createClanForMiniApp(userId, rawName) {
  if (await getClan(userId)) return { ok: false, reason: 'already_in_clan' };
  const name = normalizeClanName(rawName);
  if (!name) return { ok: false, reason: 'invalid_name' };

  try {
    const clan = await Clan.create({
      name,
      owner: Number(userId),
      members: [{ userId: Number(userId), role: 'owner' }],
    });
    return { ok: true, clan: await clanDto(clan, userId) };
  } catch (error) {
    if (error?.code === 11000) return { ok: false, reason: 'name_taken' };
    throw error;
  }
}

export async function joinClanForMiniApp(userId, clanId) {
  if (await getClan(userId)) return { ok: false, reason: 'already_in_clan' };
  if (typeof clanId !== 'string' || !/^[a-f0-9]{24}$/i.test(clanId)) {
    return { ok: false, reason: 'invalid_clan' };
  }

  const clan = await Clan.findById(clanId);
  if (!clan) return { ok: false, reason: 'clan_not_found' };
  const entryType = number(clan.entryConditions?.entryType);
  if (entryType === -1) return { ok: false, reason: 'closed' };

  if (entryType === 1) {
    if (!clan.applications.includes(Number(userId))) clan.applications.push(Number(userId));
    await clan.save();
    return { ok: true, applied: true, clanName: clan.name };
  }

  clan.members.push({ userId: Number(userId), role: 'member' });
  await clan.save();
  return { ok: true, applied: false, clan: await clanDto(clan, userId) };
}

export async function leaveClanForMiniApp(userId) {
  const clan = await getClan(userId);
  if (!clan) return { ok: false, reason: 'not_in_clan' };
  if (String(clan.owner) === String(userId)) return { ok: false, reason: 'owner_cannot_leave' };

  clan.members = clan.members.filter(member => String(member.userId) !== String(userId));
  await clan.save();
  return { ok: true, clanName: clan.name };
}

export async function disbandClanForMiniApp(userId) {
  const clan = await getClan(userId);
  if (!clan) return { ok: false, reason: 'not_in_clan' };
  if (String(clan.owner) !== String(userId)) return { ok: false, reason: 'owner_only' };

  const clanName = clan.name;
  await clan.deleteOne();
  return { ok: true, clanName };
}

export async function contributeToClan(clan, playerSession, userId, resource, rawAmount) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  if (!RESOURCES.has(resource)) return { ok: false, reason: 'invalid_resource' };
  const amount = parseClanAmount(rawAmount);
  if (!amount) return { ok: false, reason: 'invalid_amount' };

  const inventory = playerSession?.game?.inventory;
  if (!inventory) return { ok: false, reason: 'player_not_found' };
  const available = Math.max(0, number(inventory[resource]));
  if (available < amount) return { ok: false, reason: 'not_enough_resource', available };

  inventory[resource] = available - amount;
  if (!clan.warehouse) clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
  clan.warehouse[resource] = Math.max(0, number(clan.warehouse[resource])) + amount;

  const member = findMember(clan, userId);
  member.contribution = Math.max(0, number(member.contribution)) + amount;
  const level = addClanXp(clan, Math.floor(amount / XP_PER_CONTRIBUTION));

  return {
    ok: true,
    resource,
    amount,
    remaining: inventory[resource],
    leveledUp: level.leveledUp,
    level: level.level,
  };
}

function randomQuestionIndex() {
  return crypto.randomInt(0, clanQuiz.length);
}

export function prepareClanQuiz(clan, options = {}) {
  if (!clanQuiz.length) return { changed: false, question: null };
  let changed = false;
  if (!clan.quiz || !clan.quiz.lastResetAt) {
    const randomIndex = options.randomIndex || randomQuestionIndex;
    const index = randomIndex();
    if (!Number.isInteger(index) || index < 0 || index >= clanQuiz.length) {
      throw new Error(`Clan quiz RNG returned invalid index ${index}`);
    }
    clan.quiz = { lastResetAt: Date.now(), questionIndex: index, participants: {} };
    changed = true;
  }
  if (!clan.quiz.participants) {
    clan.quiz.participants = {};
    changed = true;
  }
  return { changed, question: clanQuiz[clan.quiz.questionIndex] || clanQuiz[0] };
}

export function getClanQuizState(clan, userId) {
  const question = clanQuiz[clan?.quiz?.questionIndex] || clanQuiz[0];
  if (!question) return { available: false };
  const record = clan?.quiz?.participants?.[String(userId)] || clan?.quiz?.participants?.[userId] || null;
  return {
    available: true,
    question: record ? null : question.question,
    options: record ? [] : [...question.options],
    answered: Boolean(record),
    correct: record?.correct ?? null,
  };
}

export function answerClanQuiz(clan, playerSession, userId, rawIndex) {
  const prepared = prepareClanQuiz(clan);
  const question = prepared.question;
  if (!question) return { ok: false, reason: 'quiz_unavailable' };
  if (clan.quiz.participants[String(userId)] || clan.quiz.participants[userId]) {
    return { ok: false, reason: 'already_answered', quiz: getClanQuizState(clan, userId) };
  }

  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index >= question.options.length) {
    return { ok: false, reason: 'invalid_answer' };
  }

  const correct = index === question.answer;
  clan.quiz.participants[String(userId)] = { correct, answeredAt: Date.now() };
  let leveledUp = false;
  let level = clan.level || 1;

  if (correct) {
    playerSession.game.inventory.gold = Math.max(0, number(playerSession.game.inventory.gold)) + QUIZ_GOLD_REWARD;
    const member = findMember(clan, userId);
    if (member) member.contribution = Math.max(0, number(member.contribution)) + QUIZ_CONTRIBUTION_REWARD;
    const xp = addClanXp(clan, QUIZ_XP_REWARD);
    leveledUp = xp.leveledUp;
    level = xp.level;
  }

  return {
    ok: true,
    correct,
    rightAnswer: question.options[question.answer],
    reward: correct ? { gold: QUIZ_GOLD_REWARD, clanXp: QUIZ_XP_REWARD, contribution: QUIZ_CONTRIBUTION_REWARD } : null,
    leveledUp,
    level,
    quiz: getClanQuizState(clan, userId),
  };
}

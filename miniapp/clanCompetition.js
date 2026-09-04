import crypto from 'crypto';
import Clan from '../db/models/Clan.js';
import getClan from '../functions/game/clans/getClan.js';
import getUserName from '../functions/getters/getUserName.js';
import clanDuel from '../functions/game/clans/clanDuel.js';
import clanBossAttack from '../functions/game/clans/clanBossAttack.js';
import getBuildingBonus from '../functions/game/clans/getBuildingBonus.js';
import addClanXp from '../functions/game/clans/addClanXp.js';

export const CLAN_PVP_COOLDOWN = 60_000;
export const CLAN_WAR_DURATION = 24 * 60 * 60 * 1000;
export const CLAN_WAR_ATTACK_COOLDOWN = 60_000;
const PVP_WIN_CONTRIBUTION = 2;
const WAR_TARGET_BASE_DEFENCE = 30;
const WAR_ATTACK_CONTRIBUTION = 1;
const WAR_WIN_GOLD_PER_LEVEL = 5_000;
const WAR_WIN_CRYSTALS = 20;
const WAR_WIN_XP = 500;
const WAR_CONSOLATION_XP = 100;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findMember(clan, userId) {
  return clan?.members?.find(member => String(member.userId) === String(userId)) || null;
}

function hasCombatClass(session) {
  return Array.isArray(session?.game?.gameClass?.skills) && session.game.gameClass.skills.length > 0;
}

function sessionSnapshot(session) {
  if (typeof session?.toObject === 'function') return session.toObject();
  return structuredClone(session);
}

function ensurePvp(clan) {
  if (!clan.pvp || typeof clan.pvp !== 'object') clan.pvp = {};
  if (!clan.pvp.records || typeof clan.pvp.records !== 'object') clan.pvp.records = {};
  if (!clan.pvp.cooldowns || typeof clan.pvp.cooldowns !== 'object') clan.pvp.cooldowns = {};
  return clan.pvp;
}

function pvpRecord(clan, userId) {
  const pvp = ensurePvp(clan);
  const key = String(userId);
  if (!pvp.records[key]) pvp.records[key] = { wins: 0, losses: 0, draws: 0 };
  return pvp.records[key];
}

function activeChatMembers(playerSession) {
  const chat = typeof playerSession?.ownerDocument === 'function' ? playerSession.ownerDocument() : null;
  return Array.isArray(chat?.members) ? chat.members : [];
}

export function resolveClanDuel(clan, userId, opponentId, attackerSession, defenderSession, options = {}) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  if (String(userId) === String(opponentId)) return { ok: false, reason: 'pvp_self' };
  if (!findMember(clan, opponentId)) return { ok: false, reason: 'pvp_not_clan_member' };
  if (!hasCombatClass(attackerSession)) return { ok: false, reason: 'no_combat_class' };
  if (!hasCombatClass(defenderSession)) return { ok: false, reason: 'pvp_opponent_no_class' };

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const pvp = ensurePvp(clan);
  const cooldownUntil = Math.max(0, number(pvp.cooldowns[String(userId)]));
  if (cooldownUntil > now) {
    return { ok: false, reason: 'pvp_cooldown', cooldownRemainingMs: cooldownUntil - now };
  }

  const duel = options.duel || clanDuel;
  const outcome = duel(sessionSnapshot(attackerSession), sessionSnapshot(defenderSession));
  const mine = pvpRecord(clan, userId);
  const theirs = pvpRecord(clan, opponentId);
  let result;

  if (outcome.result === 0) {
    mine.wins += 1;
    theirs.losses += 1;
    const member = findMember(clan, userId);
    member.contribution = Math.max(0, number(member.contribution)) + PVP_WIN_CONTRIBUTION;
    result = 'win';
  } else if (outcome.result === 1) {
    mine.losses += 1;
    theirs.wins += 1;
    result = 'loss';
  } else {
    mine.draws += 1;
    theirs.draws += 1;
    result = 'draw';
  }

  pvp.cooldowns[String(userId)] = now + CLAN_PVP_COOLDOWN;
  return {
    ok: true,
    result,
    contributionReward: result === 'win' ? PVP_WIN_CONTRIBUTION : 0,
    attackerPercent: number(outcome.attackerPercent),
    defenderPercent: number(outcome.defenderPercent),
  };
}

async function pvpState(clan, playerSession, userId, now) {
  const pvp = ensurePvp(clan);
  const record = pvpRecord(clan, userId);
  const clanMemberIds = new Set((clan.members || []).map(member => String(member.userId)));
  const opponents = [];

  for (const member of activeChatMembers(playerSession)) {
    if (String(member.userId) === String(userId)) continue;
    if (!clanMemberIds.has(String(member.userId))) continue;
    if (!hasCombatClass(member)) continue;
    const status = member.userChatData?.status;
    if (status === 'left' || status === 'kicked') continue;
    const name = await getUserName(member.userId, 'name');
    opponents.push({ userId: String(member.userId), name: name || `Игрок ${member.userId}` });
  }

  return {
    ready: hasCombatClass(playerSession),
    record: {
      wins: Math.max(0, number(record.wins)),
      losses: Math.max(0, number(record.losses)),
      draws: Math.max(0, number(record.draws)),
    },
    cooldownRemainingMs: Math.max(0, number(pvp.cooldowns[String(userId)]) - now),
    opponents,
  };
}

function normalizeWarehouse(clan) {
  if (!clan.warehouse) clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
  return clan.warehouse;
}

function applyWarReward(clan, outcome) {
  if (outcome === 'win') {
    const warehouse = normalizeWarehouse(clan);
    const gold = Math.floor(WAR_WIN_GOLD_PER_LEVEL * Math.max(1, number(clan.level, 1)) * (1 + getBuildingBonus(clan, 'treasury')));
    warehouse.gold = number(warehouse.gold) + gold;
    warehouse.crystals = number(warehouse.crystals) + WAR_WIN_CRYSTALS;
    addClanXp(clan, WAR_WIN_XP);
    return { gold, crystals: WAR_WIN_CRYSTALS, clanXp: WAR_WIN_XP };
  }
  addClanXp(clan, WAR_CONSOLATION_XP);
  return { gold: 0, crystals: 0, clanXp: WAR_CONSOLATION_XP };
}

export function createWarPair(clan, target, now = Date.now(), warId = null) {
  if (!clan || !target) return { ok: false, reason: 'war_target_missing' };
  if (String(clan._id) === String(target._id)) return { ok: false, reason: 'war_self' };
  if (clan.guildWar) return { ok: false, reason: 'war_already_active' };
  if (target.guildWar) return { ok: false, reason: 'war_target_busy' };

  const id = warId || `${now}_${String(clan._id)}_${crypto.randomBytes(4).toString('hex')}`;
  const endsAt = now + CLAN_WAR_DURATION;
  clan.guildWar = {
    warId: id,
    opponentClanId: String(target._id),
    opponentName: target.name,
    startedAt: now,
    endsAt,
    score: 0,
    cooldowns: {},
    participants: {},
  };
  target.guildWar = {
    warId: id,
    opponentClanId: String(clan._id),
    opponentName: clan.name,
    startedAt: now,
    endsAt,
    score: 0,
    cooldowns: {},
    participants: {},
  };
  return { ok: true, warId: id, endsAt };
}

export function resolveWarPair(clan, opponent) {
  const war = clan?.guildWar;
  if (!war) return { ok: false, reason: 'war_not_active' };
  const opponentWar = opponent?.guildWar;
  const sameWar = opponentWar && opponentWar.warId === war.warId;
  const myScore = Math.max(0, number(war.score));
  const opponentScore = sameWar ? Math.max(0, number(opponentWar.score)) : 0;

  if (!opponent || !sameWar) {
    const opponentName = war.opponentName;
    clan.guildWar = null;
    return { ok: true, outcome: 'void', myScore, opponentScore, opponentName, reward: null };
  }

  const outcome = myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'draw';
  const opponentOutcome = outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw';
  const reward = applyWarReward(clan, outcome);
  const opponentReward = applyWarReward(opponent, opponentOutcome);
  const opponentName = opponent.name;
  clan.guildWar = null;
  opponent.guildWar = null;

  return { ok: true, outcome, myScore, opponentScore, opponentName, reward, opponentReward };
}

function buildWarTarget(opponentLevel) {
  return {
    currentHp: Number.POSITIVE_INFINITY,
    defence: WAR_TARGET_BASE_DEFENCE + Math.max(1, number(opponentLevel, 1)) * 3,
    damageByUser: {},
  };
}

export function strikeClanWar(clan, playerSession, userId, opponentLevel, options = {}) {
  if (!clan || !findMember(clan, userId)) return { ok: false, reason: 'not_in_clan' };
  const war = clan.guildWar;
  if (!war) return { ok: false, reason: 'war_not_active' };
  if (!hasCombatClass(playerSession)) return { ok: false, reason: 'no_combat_class' };

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  if (now >= number(war.endsAt)) return { ok: false, reason: 'war_expired' };
  if (!war.cooldowns) war.cooldowns = {};
  if (!war.participants) war.participants = {};
  const key = String(userId);
  const cooldownUntil = Math.max(0, number(war.cooldowns[key]));
  if (cooldownUntil > now) {
    return { ok: false, reason: 'war_cooldown', cooldownRemainingMs: cooldownUntil - now };
  }

  const member = findMember(clan, userId);
  const upgrades = member?.upgrades || {};
  const multiplier = 1 + getBuildingBonus(clan, 'barracks');
  const attack = options.attack || clanBossAttack;
  const strike = attack(playerSession, buildWarTarget(opponentLevel), upgrades, multiplier);
  if (strike.error === 'noClass') return { ok: false, reason: 'no_combat_class' };

  const points = Math.max(0, number(strike.dmg));
  war.score = Math.max(0, number(war.score)) + points;
  war.participants[key] = Math.max(0, number(war.participants[key])) + points;
  war.cooldowns[key] = now + CLAN_WAR_ATTACK_COOLDOWN;
  member.contribution = Math.max(0, number(member.contribution)) + WAR_ATTACK_CONTRIBUTION;

  return {
    ok: true,
    points,
    isCrit: Boolean(strike.isCrit),
    score: war.score,
    contributionReward: WAR_ATTACK_CONTRIBUTION,
  };
}

async function resolveExpiredWar(clan) {
  const war = clan.guildWar;
  if (!war || Date.now() < number(war.endsAt)) return null;
  const opponent = await Clan.findById(war.opponentClanId);
  const resolved = resolveWarPair(clan, opponent);
  await clan.save();
  if (opponent?.guildWar === null || opponent?.isModified?.('guildWar')) await opponent.save();
  return resolved;
}

async function warState(clan, userId, now) {
  let lastResult = null;
  if (clan.guildWar && now >= number(clan.guildWar.endsAt)) {
    lastResult = await resolveExpiredWar(clan);
  }

  if (!clan.guildWar) {
    let targets = [];
    if (String(clan.owner) === String(userId)) {
      const candidates = await Clan.find({ _id: { $ne: clan._id }, guildWar: null }).limit(20);
      targets = candidates
        .filter(candidate => (candidate.members?.length || 0) > 0)
        .map(candidate => ({
          id: String(candidate._id),
          name: candidate.name,
          level: Math.max(1, number(candidate.level, 1)),
          members: candidate.members?.length || 0,
        }));
    }
    return { active: false, canDeclare: String(clan.owner) === String(userId), targets, lastResult };
  }

  const war = clan.guildWar;
  const opponent = await Clan.findById(war.opponentClanId);
  const opponentScore = opponent?.guildWar?.warId === war.warId ? Math.max(0, number(opponent.guildWar.score)) : 0;
  return {
    active: true,
    opponentId: String(war.opponentClanId),
    opponentName: war.opponentName,
    score: Math.max(0, number(war.score)),
    opponentScore,
    startedAt: number(war.startedAt),
    endsAt: number(war.endsAt),
    remainingMs: Math.max(0, number(war.endsAt) - now),
    cooldownRemainingMs: Math.max(0, number(war.cooldowns?.[String(userId)]) - now),
    myPoints: Math.max(0, number(war.participants?.[String(userId)])),
    lastResult,
  };
}

export async function getClanCompetitionState(clan, playerSession, userId, options = {}) {
  if (!clan) return null;
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  return {
    pvp: await pvpState(clan, playerSession, userId, now),
    war: await warState(clan, userId, now),
  };
}

export async function performClanCompetitionAction(userId, playerSession, action, body = {}) {
  const clan = await getClan(userId);
  if (!clan) return { ok: false, reason: 'not_in_clan' };

  if (action === 'pvp_fight') {
    const opponentId = body.opponentId;
    const chatMembers = activeChatMembers(playerSession);
    const defender = chatMembers.find(member => String(member.userId) === String(opponentId));
    if (!defender) return { ok: false, reason: 'pvp_opponent_not_in_chat' };
    const result = resolveClanDuel(clan, userId, opponentId, playerSession, defender);
    if (result.ok) await clan.save();
    if (result.ok) {
      const name = await getUserName(Number(opponentId), 'name');
      result.opponentName = name || `Игрок ${opponentId}`;
    }
    return result;
  }

  if (action === 'war_declare') {
    if (String(clan.owner) !== String(userId)) return { ok: false, reason: 'owner_only' };
    const targetId = String(body.targetId || '');
    if (!/^[a-f0-9]{24}$/i.test(targetId)) return { ok: false, reason: 'war_target_missing' };
    const target = await Clan.findById(targetId);
    if (!target) return { ok: false, reason: 'war_target_missing' };
    const result = createWarPair(clan, target);
    if (result.ok) {
      await clan.save();
      await target.save();
      result.opponentName = target.name;
    }
    return result;
  }

  if (action === 'war_attack') {
    if (!clan.guildWar) return { ok: false, reason: 'war_not_active' };
    if (Date.now() >= number(clan.guildWar.endsAt)) {
      const resolved = await resolveExpiredWar(clan);
      return { ok: false, reason: 'war_expired', resolved };
    }
    const opponent = await Clan.findById(clan.guildWar.opponentClanId);
    const result = strikeClanWar(clan, playerSession, userId, opponent?.level || 1);
    if (result.ok) await clan.save();
    return result;
  }

  return { ok: false, reason: 'unknown_clan_competition' };
}

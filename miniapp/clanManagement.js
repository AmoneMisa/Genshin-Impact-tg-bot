import Clan from '../db/models/Clan.js';
import getClan from '../functions/game/clans/getClan.js';
import getUserName from '../functions/getters/getUserName.js';
import calcReputationPoints from '../functions/game/clans/calcReputationPoints.js';

const KICK_COOLDOWN = 5 * 60 * 1000;
const CLASS_KEYS = ['noClass', 'priest', 'mage', 'archer', 'warrior', 'berserk'];
const CLASS_LABELS = { noClass: 'Бродяжка', priest: 'Прист', mage: 'Маг', archer: 'Лучник', warrior: 'Палладин', berserk: 'Берсерк' };

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findMember(clan, userId) {
  return clan?.members?.find(member => String(member.userId) === String(userId)) || null;
}

function getRole(clan, userId) {
  return findMember(clan, userId)?.role || null;
}

function canManage(clan, userId) {
  const role = getRole(clan, userId);
  return role === 'owner' || role === 'officer';
}

function activeChatMembers(playerSession) {
  const chat = typeof playerSession?.ownerDocument === 'function' ? playerSession.ownerDocument() : null;
  return Array.isArray(chat?.members) ? chat.members : [];
}

export async function getClanManagementState(clan, userId, playerSession = null) {
  if (!clan) return null;
  const manage = canManage(clan, userId);
  const isOwner = String(clan.owner) === String(userId);

  let inviteCandidates = [];
  let kickable = [];
  if (manage) {
    const clanMemberIds = new Set((clan.members || []).map(member => String(member.userId)));
    const candidateMembers = activeChatMembers(playerSession).filter(member =>
      String(member.userId) !== String(userId) && !clanMemberIds.has(String(member.userId))
    );
    const alreadyInClan = await Promise.all(candidateMembers.map(member => getClan(member.userId)));
    const eligible = candidateMembers.filter((member, index) => !alreadyInClan[index]).slice(0, 20);
    inviteCandidates = await Promise.all(eligible.map(async member => ({
      userId: String(member.userId),
      name: (await getUserName(member.userId, 'name')) || `Игрок ${member.userId}`,
    })));

    const myRole = getRole(clan, userId);
    const kickableMembers = (clan.members || []).filter(member =>
      String(member.userId) !== String(userId) && member.role !== 'owner' && (myRole === 'owner' || member.role !== 'officer')
    );
    kickable = await Promise.all(kickableMembers.map(async member => ({
      userId: String(member.userId),
      name: (await getUserName(member.userId, 'name')) || `Игрок ${member.userId}`,
    })));
  }

  let roleTargets = [];
  if (isOwner) {
    const targets = (clan.members || []).filter(member => String(member.userId) !== String(userId) && member.role !== 'owner');
    roleTargets = await Promise.all(targets.map(async member => ({
      userId: String(member.userId),
      role: member.role,
      name: (await getUserName(member.userId, 'name')) || `Игрок ${member.userId}`,
    })));
  }

  return {
    canManage: manage,
    isOwner,
    inviteCandidates,
    kickable,
    roleTargets,
    classOptions: CLASS_KEYS.map(key => ({ key, label: CLASS_LABELS[key] })),
  };
}

// ---- Applications ----
export async function acceptClanApplication(clan, userId, applicantId) {
  if (!clan || !canManage(clan, userId)) return { ok: false, reason: 'owner_only' };
  clan.applications = (clan.applications || []).filter(id => Number(id) !== Number(applicantId));

  if (await getClan(applicantId)) {
    return { ok: false, reason: 'applicant_already_in_clan' };
  }

  clan.members.push({ userId: Number(applicantId), role: 'member' });
  clan.reputation = calcReputationPoints(clan);
  const name = (await getUserName(Number(applicantId), 'name')) || `Игрок ${applicantId}`;
  return { ok: true, applicantId: String(applicantId), message: `${name} принят(а) в клан.` };
}

export function rejectClanApplication(clan, userId, applicantId) {
  if (!clan || !canManage(clan, userId)) return { ok: false, reason: 'owner_only' };
  clan.applications = (clan.applications || []).filter(id => Number(id) !== Number(applicantId));
  return { ok: true, message: 'Заявка отклонена.' };
}

// ---- Invite / kick ----
export async function inviteClanMember(clan, userId, targetId) {
  if (!clan || !canManage(clan, userId)) return { ok: false, reason: 'owner_only' };
  if (await getClan(targetId)) return { ok: false, reason: 'target_already_in_clan' };

  clan.members.push({ userId: Number(targetId), role: 'member' });
  clan.reputation = calcReputationPoints(clan);
  const name = (await getUserName(Number(targetId), 'name')) || `Игрок ${targetId}`;
  return { ok: true, message: `${name} добавлен(а) в клан.` };
}

export async function kickClanMember(clan, userId, targetId) {
  if (!clan || !canManage(clan, userId)) return { ok: false, reason: 'owner_only' };
  const target = findMember(clan, targetId);
  if (!target) return { ok: false, reason: 'target_not_in_clan' };

  const myRole = getRole(clan, userId);
  if (target.role === 'owner' || (target.role === 'officer' && myRole !== 'owner')) {
    return { ok: false, reason: 'kick_insufficient_role' };
  }

  if (!clan.moderation) clan.moderation = {};
  if (!clan.moderation.kickCooldowns) clan.moderation.kickCooldowns = {};
  const now = Date.now();
  const actorKey = String(userId);
  const cooldownUntil = number(clan.moderation.kickCooldowns[actorKey]);
  if (cooldownUntil > now) {
    return { ok: false, reason: 'kick_cooldown', cooldownRemainingMs: cooldownUntil - now };
  }
  clan.moderation.kickCooldowns[actorKey] = now + KICK_COOLDOWN;

  clan.members = clan.members.filter(member => String(member.userId) !== String(targetId));
  clan.reputation = calcReputationPoints(clan);
  const name = (await getUserName(Number(targetId), 'name')) || `Игрок ${targetId}`;
  return { ok: true, message: `${name} исключён(а) из клана.` };
}

// ---- Officer roles ----
export function promoteClanMember(clan, userId, targetId) {
  if (!clan || String(clan.owner) !== String(userId)) return { ok: false, reason: 'owner_only' };
  const member = findMember(clan, targetId);
  if (!member || member.role === 'owner') return { ok: false, reason: 'invalid_role_target' };
  member.role = 'officer';
  return { ok: true, message: 'Участник назначен офицером.' };
}

export function demoteClanMember(clan, userId, targetId) {
  if (!clan || String(clan.owner) !== String(userId)) return { ok: false, reason: 'owner_only' };
  const member = findMember(clan, targetId);
  if (!member || member.role === 'owner') return { ok: false, reason: 'invalid_role_target' };
  member.role = 'member';
  return { ok: true, message: 'Участник разжалован.' };
}

// ---- Settings (owner only) ----
export function updateClanSettings(clan, userId, changes = {}) {
  if (!clan) return { ok: false, reason: 'not_in_clan' };
  if (String(clan.owner) !== String(userId)) return { ok: false, reason: 'owner_only' };

  if (typeof changes.tag === 'string') {
    clan.tag = changes.tag.trim().slice(0, 6);
  }
  if (typeof changes.description === 'string') {
    clan.description = changes.description.trim().slice(0, 200);
  }
  if (!clan.entryConditions) clan.entryConditions = {};
  if ([-1, 0, 1].includes(Number(changes.entryType))) {
    clan.entryConditions.entryType = Number(changes.entryType);
  }
  if (changes.minLevel !== undefined) {
    const value = Number(changes.minLevel);
    if (!Number.isFinite(value) || value < 0) return { ok: false, reason: 'invalid_min_level' };
    clan.entryConditions.minLevel = value;
  }
  if (changes.minGearScore !== undefined) {
    const value = Number(changes.minGearScore);
    if (!Number.isFinite(value) || value < 0) return { ok: false, reason: 'invalid_min_gear_score' };
    clan.entryConditions.minGearScore = value;
  }
  if (changes.allowedClass !== undefined) {
    const value = String(changes.allowedClass || '');
    if (value && !CLASS_KEYS.includes(value)) return { ok: false, reason: 'invalid_class' };
    clan.entryConditions.allowedClass = value;
  }
  if (changes.allowedGender !== undefined) {
    const value = String(changes.allowedGender || '');
    if (value && value !== 'male' && value !== 'female') return { ok: false, reason: 'invalid_gender' };
    clan.entryConditions.allowedGender = value;
  }

  return { ok: true, message: 'Настройки клана обновлены.' };
}

export async function performClanManagementAction(userId, playerSession, action, body = {}) {
  const clan = await getClan(userId);
  if (!clan) return { clan: null, result: { ok: false, reason: 'not_in_clan' } };

  if (action === 'application_accept') return { clan, result: await acceptClanApplication(clan, userId, body.applicantId) };
  if (action === 'application_reject') return { clan, result: rejectClanApplication(clan, userId, body.applicantId) };
  if (action === 'invite') return { clan, result: await inviteClanMember(clan, userId, body.targetId) };
  if (action === 'kick') return { clan, result: await kickClanMember(clan, userId, body.targetId) };
  if (action === 'promote') return { clan, result: promoteClanMember(clan, userId, body.targetId) };
  if (action === 'demote') return { clan, result: demoteClanMember(clan, userId, body.targetId) };
  if (action === 'settings_update') return { clan, result: updateClanSettings(clan, userId, body.changes) };

  return { clan, result: { ok: false, reason: 'unknown_clan_management' } };
}

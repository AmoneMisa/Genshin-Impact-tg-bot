import stealResources from '../functions/game/builds/stealResources.js';

const DEFAULT_ATTEMPTS = 2;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function telegramUser(member) {
  return member?.userChatData?.user || {};
}

function isUnavailable(member) {
  const status = member?.userChatData?.status;
  return Boolean(
    member?.isHided ||
    telegramUser(member).is_bot ||
    status === 'left' ||
    status === 'kicked'
  );
}

function displayName(member) {
  const user = telegramUser(member);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || (user.username ? `@${user.username}` : `Игрок ${member?.userId}`);
}

function shieldRemaining(member, now) {
  return Math.max(0, number(member?.game?.stealImmuneTimer) - now);
}

function hasCombatClass(member) {
  return Array.isArray(member?.game?.gameClass?.skills) && member.game.gameClass.skills.length > 0;
}

export function prepareStealMember(member) {
  if (!member?.game) return false;
  if (member.game.chanceToSteal === undefined || member.game.chanceToSteal === null) {
    member.game.chanceToSteal = DEFAULT_ATTEMPTS;
    return true;
  }
  return false;
}

function targetDto(member, now) {
  const user = telegramUser(member);
  return {
    id: String(member.userId),
    name: displayName(member),
    username: user.username || '',
    level: Math.max(1, number(member?.game?.stats?.lvl, 1)),
    className: member?.game?.gameClass?.stats?.name || 'noClass',
    shieldRemainingMs: shieldRemaining(member, now),
  };
}

export function getStealState(chat, attackerId, now = Date.now()) {
  const members = Array.isArray(chat?.members) ? chat.members : [];
  const attacker = members.find(member => String(member.userId) === String(attackerId));
  if (!attacker) {
    return { available: false, reason: 'attacker_not_found', attempts: 0, shieldRemainingMs: 0, targets: [] };
  }

  prepareStealMember(attacker);
  const targets = members
    .filter(member => String(member.userId) !== String(attackerId))
    .filter(member => !isUnavailable(member))
    .filter(member => member?.game?.inventory)
    .map(member => targetDto(member, now))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return {
    available: true,
    attempts: Math.max(0, number(attacker.game.chanceToSteal, DEFAULT_ATTEMPTS)),
    shieldRemainingMs: shieldRemaining(attacker, now),
    combatReady: hasCombatClass(attacker),
    targets,
  };
}

export function stealForMiniApp(chat, attackerId, targetId, options = {}) {
  const now = options.now ?? Date.now();
  const steal = options.steal || stealResources;
  const members = Array.isArray(chat?.members) ? chat.members : [];
  const attacker = members.find(member => String(member.userId) === String(attackerId));
  const target = members.find(member => String(member.userId) === String(targetId));

  if (!attacker) return { ok: false, reason: 'attacker_not_found' };
  prepareStealMember(attacker);
  if (String(attackerId) === String(targetId)) return { ok: false, reason: 'self_target' };
  if (!target || isUnavailable(target) || !target?.game?.inventory) return { ok: false, reason: 'target_not_found' };
  if (number(attacker.game.chanceToSteal, DEFAULT_ATTEMPTS) <= 0) return { ok: false, reason: 'no_attempts' };
  if (!hasCombatClass(attacker)) return { ok: false, reason: 'no_combat_class' };

  const targetShield = shieldRemaining(target, now);
  if (targetShield > 0) {
    return { ok: false, reason: 'target_shielded', shieldRemainingMs: targetShield };
  }

  const result = steal(attacker, target);
  if (result.resultCode === 1) {
    return {
      ok: false,
      reason: 'target_shielded',
      shieldRemainingMs: shieldRemaining(target, now),
    };
  }

  attacker.game.chanceToSteal = Math.max(0, number(attacker.game.chanceToSteal, DEFAULT_ATTEMPTS) - 1);
  attacker.game.stealImmuneTimer = 0;

  if (result.resultCode === 2) {
    return {
      ok: true,
      outcome: 'defended',
      targetId: String(targetId),
      targetName: displayName(target),
      remainHp: number(result.remainHp),
      attempts: attacker.game.chanceToSteal,
    };
  }

  return {
    ok: true,
    outcome: 'stolen',
    targetId: String(targetId),
    targetName: displayName(target),
    gold: Math.max(0, number(result.goldToSteal)),
    ironOre: Math.max(0, number(result.ironOreToSteal)),
    crystals: Math.max(0, number(result.crystalsToSteal)),
    gainedExp: Math.max(0, number(result.gainedExp)),
    remainHp: number(result.remainHp),
    attempts: attacker.game.chanceToSteal,
  };
}

import { getSwordState, rollSword } from '../functions/game/sword/swordCore.js';

function memberName(member) {
  const user = member?.userChatData?.user || {};
  return String(user.first_name || user.username || member?.userId || 'Игрок');
}

export function getMiniAppSwordState(session, now = Date.now()) {
  return getSwordState(session, now);
}

export function getSwordRanking(chat, userId) {
  const rows = (chat?.members || [])
    .filter(member => member?.sword !== undefined && member?.sword !== null && Number.isFinite(Number(member.sword)))
    .map(member => ({
      userId: Number(member.userId),
      name: memberName(member),
      length: Number(member.sword),
      isCurrent: String(member.userId) === String(userId),
    }))
    .sort((a, b) => b.length - a.length || a.userId - b.userId);

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getMiniAppSwordDashboard(chat, userId, now = Date.now()) {
  const member = chat?.members?.find(item => String(item.userId) === String(userId));
  return {
    ...getMiniAppSwordState(member || {}, now),
    ranking: getSwordRanking(chat, userId),
  };
}

export function rollMiniAppSword(session, options = {}) {
  return rollSword(session, options);
}

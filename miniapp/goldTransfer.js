import { transferGoldInChat } from '../functions/game/gold/transferGold.js';

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

function recipientDto(member) {
  const user = telegramUser(member);
  const username = user.username || '';
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    id: String(member.userId),
    name: fullName || (username ? `@${username}` : `Игрок ${member.userId}`),
    username,
  };
}

export function getGoldTransferState(chat, senderId) {
  const members = Array.isArray(chat?.members) ? chat.members : [];
  const sender = members.find(member => String(member.userId) === String(senderId));
  const senderGold = Math.max(0, number(sender?.game?.inventory?.gold));

  const recipients = members
    .filter(member => String(member.userId) !== String(senderId))
    .filter(member => !isUnavailable(member))
    .map(recipientDto)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return {
    gold: senderGold,
    recipients,
  };
}

export function transferGoldForMiniApp(chat, senderId, recipientId, rawAmount) {
  const result = transferGoldInChat(chat, senderId, recipientId, rawAmount);

  if (!result.ok) {
    return {
      ...result,
      transfer: getGoldTransferState(chat, senderId),
    };
  }

  return {
    ok: true,
    amount: result.amount,
    recipientId: String(result.recipientId),
    senderGold: result.senderGold,
    transfer: getGoldTransferState(chat, senderId),
  };
}

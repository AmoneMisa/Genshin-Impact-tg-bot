import crypto from 'crypto';
import Title from '../db/models/Title.js';

const TITLE_COOLDOWN_MS = 10 * 60 * 1000;
const TITLE_RE = /^[А-Яа-яЁёA-Za-z]+$/u;

function telegramUser(member) {
  return member?.userChatData?.user || {};
}

function memberName(member) {
  const user = telegramUser(member);
  if (user.username) return `@${user.username}`;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || `Игрок ${member?.userId ?? user.id ?? '?'}`;
}

export function normalizeTitle(rawTitle) {
  const title = String(rawTitle ?? '').trim();
  if (!title || title.length > 32 || !TITLE_RE.test(title)) return null;
  return title;
}

export function eligibleTitleMembers(chat) {
  return (Array.isArray(chat?.members) ? chat.members : []).filter(member => {
    const user = telegramUser(member);
    const status = member?.userChatData?.status;
    return !member?.isHided && !user.is_bot && status !== 'left' && status !== 'kicked';
  });
}

export function getTitleCooldown(chat, userId, now = Date.now()) {
  const member = (chat?.members || []).find(item => String(item.userId) === String(userId));
  const until = Number(member?.timerTitleCallback) || 0;
  return {
    until,
    remainingMs: Math.max(0, until - now),
  };
}

function titleDto(item) {
  return {
    id: String(item?._id || ''),
    userId: String(item?.userId || ''),
    nickname: String(item?.nickname || ''),
    title: String(item?.titleName || ''),
    obtainedAt: item?.obtainedAt || item?.createdAt || null,
  };
}

export async function getTitlesState(chatId, userId, chat, options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const TitleModel = options.TitleModel || Title;
  const recent = await TitleModel.find({ chatId: String(chatId) })
    .sort({ obtainedAt: -1 })
    .limit(15);

  return {
    cooldown: getTitleCooldown(chat, userId, now),
    recent: recent.map(titleDto),
    eligibleCount: eligibleTitleMembers(chat).length,
  };
}

export async function assignTitle(chat, userId, rawTitle, options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const title = normalizeTitle(rawTitle);
  if (!title) return { ok: false, reason: 'invalid_title' };

  const sender = (chat?.members || []).find(item => String(item.userId) === String(userId));
  if (!sender) return { ok: false, reason: 'sender_not_found' };

  const cooldown = getTitleCooldown(chat, userId, now);
  if (cooldown.remainingMs > 0) {
    return { ok: false, reason: 'cooldown', cooldown };
  }

  const recipients = eligibleTitleMembers(chat);
  if (!recipients.length) return { ok: false, reason: 'no_recipients' };

  const randomInt = options.randomInt || ((min, max) => crypto.randomInt(min, max + 1));
  const index = randomInt(0, recipients.length - 1);
  if (!Number.isInteger(index) || index < 0 || index >= recipients.length) {
    throw new Error(`Title RNG returned invalid index ${index}`);
  }

  const recipient = recipients[index];
  sender.timerTitleCallback = now + TITLE_COOLDOWN_MS;

  const persistChat = options.persistChat || (() => chat.save());
  await persistChat();

  const TitleModel = options.TitleModel || Title;
  const created = await TitleModel.create({
    chatId: String(chat.chatId ?? chat.id ?? ''),
    userId: String(recipient.userId ?? telegramUser(recipient).id),
    nickname: memberName(recipient),
    titleName: title,
  });

  const oldTitles = await TitleModel.find({ chatId: String(chat.chatId ?? chat.id ?? '') })
    .sort({ obtainedAt: -1 })
    .skip(15);
  for (const oldTitle of oldTitles) await TitleModel.deleteOne({ _id: oldTitle._id });

  return {
    ok: true,
    assigned: titleDto(created),
    recipient: {
      id: String(recipient.userId ?? telegramUser(recipient).id),
      name: memberName(recipient),
    },
    cooldown: getTitleCooldown(chat, userId, now),
  };
}

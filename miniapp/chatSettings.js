import ChatSettings from '../db/models/ChatSettings.js';
import getChatSessionSettings from '../functions/getters/getChatSessionSettings.js';

export const CHAT_SETTING_DEFINITIONS = Object.freeze([
  { key: 'form', label: 'Анкеты' },
  { key: 'boss', label: 'Босс' },
  { key: 'dice', label: 'Кубики' },
  { key: 'points', label: '21 очко' },
  { key: 'slots', label: 'Слоты' },
  { key: 'titles', label: 'Титулы' },
  { key: 'swords', label: 'Мечи' },
  { key: 'chests', label: 'Сундуки' },
  { key: 'mute', label: 'Само-мут' },
  { key: 'whoami', label: 'Свой статус' },
  { key: 'sendGold', label: 'Перевод золота' },
  { key: 'bowling', label: 'Боулинг' },
  { key: 'darts', label: 'Дартс' },
  { key: 'basketball', label: 'Баскетбол' },
  { key: 'football', label: 'Футбол' },
  { key: 'elements', label: 'Элементы' },
  { key: 'horoscope', label: 'Гороскоп' },
  { key: 'bonus', label: 'Бонус' },
]);

const SETTING_KEYS = new Set(CHAT_SETTING_DEFINITIONS.map(item => item.key));

function memberStatus(session) {
  return session?.userChatData?.status || session?.$locals?.telegramMembership?.status || null;
}

export function canManageChatSettings(session, userId, ownerId) {
  const status = memberStatus(session);
  return status === 'administrator' || status === 'creator' || String(userId) === String(ownerId);
}

export function buildChatSettingsState({ chatId, userId, session, ownerId, settings = {} }) {
  const isGroup = String(chatId) !== String(userId);
  return {
    isGroup,
    canManage: isGroup && canManageChatSettings(session, userId, ownerId),
    settings: CHAT_SETTING_DEFINITIONS.map(({ key, label }) => ({
      key,
      label,
      enabled: Number(settings[key] ?? 1) === 1,
    })),
  };
}

export function prepareChatSettingUpdate({ chatId, userId, session, ownerId, key, enabled }) {
  if (String(chatId) === String(userId)) {
    return { ok: false, status: 409, reason: 'group_only' };
  }
  if (!canManageChatSettings(session, userId, ownerId)) {
    return { ok: false, status: 403, reason: 'forbidden' };
  }
  if (typeof key !== 'string' || !SETTING_KEYS.has(key)) {
    return { ok: false, status: 400, reason: 'unknown_setting' };
  }
  if (typeof enabled !== 'boolean') {
    return { ok: false, status: 400, reason: 'enabled_must_be_boolean' };
  }
  return { ok: true, key, enabled, value: enabled ? 1 : 0 };
}

export async function getChatSettingsState({ chatId, userId, session, ownerId }) {
  const settings = await getChatSessionSettings(chatId);
  return buildChatSettingsState({ chatId, userId, session, ownerId, settings });
}

export async function updateChatSettingForMiniApp({ chatId, userId, session, ownerId, key, enabled }) {
  const prepared = prepareChatSettingUpdate({ chatId, userId, session, ownerId, key, enabled });
  if (!prepared.ok) return prepared;

  await ChatSettings.updateOne(
    { chatId },
    { $set: { [`settings.${prepared.key}`]: prepared.value } },
    { upsert: true },
  );

  return {
    ok: true,
    chatSettings: await getChatSettingsState({ chatId, userId, session, ownerId }),
  };
}

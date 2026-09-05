import commands from '../dictionaries/commands.js';
import translation from '../dictionaries/translate.js';
import userTemplate from '../template/userTemplate.js';

const MAX_FIELD_LENGTH = 256;
const EDITABLE_FIELDS = new Set(commands);
const DISPLAY_FIELDS = Object.keys(userTemplate);

function telegramUser(member) {
  return member?.userChatData?.user || {};
}

function memberName(member) {
  const user = telegramUser(member);
  if (user.username) return `@${user.username}`;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || `Игрок ${member?.userId ?? user.id ?? '?'}`;
}

function fieldDto(key, value) {
  return {
    key,
    label: translation[key] || key,
    value: value == null ? '' : String(value),
    editable: EDITABLE_FIELDS.has(key),
  };
}

function profileDto(member, currentUserId) {
  const values = member?.user || {};
  return {
    userId: String(member?.userId ?? telegramUser(member).id ?? ''),
    name: memberName(member),
    isCurrent: String(member?.userId) === String(currentUserId),
    fields: DISPLAY_FIELDS
      .filter(key => values[key] !== null && values[key] !== undefined && String(values[key]).trim() !== '')
      .map(key => fieldDto(key, values[key])),
  };
}

export function getFormsState(chat, userId) {
  const members = Array.isArray(chat?.members) ? chat.members : [];
  const current = members.find(member => String(member.userId) === String(userId));
  const visibleMembers = members.filter(member => {
    const user = telegramUser(member);
    const status = member?.userChatData?.status;
    return !member?.isHided && !user.is_bot && status !== 'left' && status !== 'kicked';
  });

  return {
    fields: commands.map(key => fieldDto(key, current?.user?.[key])),
    profiles: visibleMembers.map(member => profileDto(member, userId)),
  };
}

export function savePersonalForm(chat, userId, rawFields) {
  if (!rawFields || typeof rawFields !== 'object' || Array.isArray(rawFields)) {
    return { ok: false, reason: 'invalid_fields', forms: getFormsState(chat, userId) };
  }

  const member = (chat?.members || []).find(item => String(item.userId) === String(userId));
  if (!member) return { ok: false, reason: 'member_not_found', forms: getFormsState(chat, userId) };

  const entries = Object.entries(rawFields);
  for (const [key, value] of entries) {
    if (!EDITABLE_FIELDS.has(key)) {
      return { ok: false, reason: 'invalid_field', field: key, forms: getFormsState(chat, userId) };
    }
    if (value !== null && typeof value !== 'string') {
      return { ok: false, reason: 'invalid_value', field: key, forms: getFormsState(chat, userId) };
    }
    if (typeof value === 'string' && value.trim().length > MAX_FIELD_LENGTH) {
      return { ok: false, reason: 'value_too_long', field: key, maxLength: MAX_FIELD_LENGTH, forms: getFormsState(chat, userId) };
    }
  }

  if (!member.user || typeof member.user !== 'object') member.user = {};
  for (const [key, value] of entries) {
    const normalized = value === null ? null : value.trim();
    member.user[key] = normalized || null;
  }

  return {
    ok: true,
    action: 'save',
    forms: getFormsState(chat, userId),
  };
}

export function getFormFieldLimit() {
  return MAX_FIELD_LENGTH;
}

import getChatSessionSettings from '../functions/getters/getChatSessionSettings.js';

export const SELF_MUTE_DURATION_SECONDS = 2 * 60;
export const SELF_MUTE_PERMISSIONS = Object.freeze({
  can_send_messages: false,
  can_send_media_messages: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_pin_messages: false,
});

function statusFrom(session, telegramMember) {
  return telegramMember?.status
    || session?.userChatData?.status
    || session?.$locals?.telegramMembership?.status
    || null;
}

function untilFrom(telegramMember) {
  const value = telegramMember?.until_date ?? telegramMember?.untilDate;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function buildSelfMuteState({ chatId, userId, session, settings = {}, telegramMember = null, nowMs = Date.now() }) {
  const isGroup = String(chatId) !== String(userId);
  const status = statusFrom(session, telegramMember);
  const isAdministrator = status === 'administrator' || status === 'creator';
  const enabled = Number(settings.mute ?? 1) === 1;
  const activeUntil = untilFrom(telegramMember);
  const isActive = status === 'restricted' && (activeUntil === 0 || activeUntil > Math.floor(nowMs / 1000));

  let reason = null;
  if (!isGroup) reason = 'group_only';
  else if (!enabled) reason = 'disabled';
  else if (isAdministrator) reason = 'administrator';
  else if (isActive) reason = 'already_muted';

  return {
    isGroup,
    enabled,
    isAdministrator,
    isActive,
    activeUntil: isActive ? activeUntil : 0,
    canMute: reason === null,
    reason,
    durationSeconds: SELF_MUTE_DURATION_SECONDS,
  };
}

export function prepareSelfMute(options) {
  const state = buildSelfMuteState(options);
  if (!state.canMute) {
    const status = state.reason === 'group_only' ? 409 : state.reason === 'disabled' ? 403 : 409;
    return { ok: false, status, reason: state.reason, selfMute: state };
  }

  return {
    ok: true,
    untilDate: Math.floor((options.nowMs ?? Date.now()) / 1000) + SELF_MUTE_DURATION_SECONDS,
    permissions: { ...SELF_MUTE_PERMISSIONS },
    selfMute: state,
  };
}

async function loadRuntimeState({ bot, chatId, userId, session, nowMs }) {
  if (String(chatId) === String(userId)) {
    return buildSelfMuteState({ chatId, userId, session, nowMs });
  }

  const [settings, telegramMember] = await Promise.all([
    getChatSessionSettings(chatId),
    bot.getChatMember(chatId, userId),
  ]);
  return buildSelfMuteState({ chatId, userId, session, settings, telegramMember, nowMs });
}

export async function getSelfMuteStateForMiniApp(context) {
  return loadRuntimeState(context);
}

export async function performSelfMuteForMiniApp(context) {
  const nowMs = Date.now();
  const selfMute = await loadRuntimeState({ ...context, nowMs });
  const prepared = prepareSelfMute({
    ...context,
    settings: { mute: selfMute.enabled ? 1 : 0 },
    telegramMember: {
      status: selfMute.isAdministrator ? 'administrator' : selfMute.isActive ? 'restricted' : 'member',
      until_date: selfMute.activeUntil,
    },
    nowMs,
  });
  if (!prepared.ok) return prepared;

  try {
    const accepted = await context.bot.restrictChatMember(context.chatId, context.userId, {
      permissions: prepared.permissions,
      until_date: prepared.untilDate,
    });
    if (!accepted) {
      return { ok: false, status: 409, reason: 'telegram_rejected', selfMute };
    }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      reason: 'telegram_error',
      error: error?.message || 'Telegram restriction failed',
      selfMute,
    };
  }

  return {
    ok: true,
    untilDate: prepared.untilDate,
    selfMute: {
      ...selfMute,
      canMute: false,
      reason: 'already_muted',
      isActive: true,
      activeUntil: prepared.untilDate,
    },
  };
}

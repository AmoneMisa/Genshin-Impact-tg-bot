function normalizeEnabled(value) {
  if (value === true || value === 1 || value === '1') return true;
  return false;
}

function settingsFor(enabled) {
  return {
    flag: enabled ? 1 : 0,
    button: {
      text: enabled ? 'Вкл' : 'Выкл',
      callback_data: `whatsNew.${enabled ? 1 : 0}`,
    },
  };
}

export function getUpdatesState(session) {
  const enabled = normalizeEnabled(session?.whatsNewSettings?.flag);
  return {
    enabled,
    delivery: 'private',
    scope: 'current_chat_member',
  };
}

export function setUpdatesEnabled(session, enabled) {
  if (typeof enabled !== 'boolean') {
    return { ok: false, reason: 'enabled must be boolean' };
  }

  session.whatsNewSettings = settingsFor(enabled);
  return { ok: true, ...getUpdatesState(session) };
}

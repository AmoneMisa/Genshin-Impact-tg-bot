const MAX_FEEDBACK_LENGTH = 3000;

export function normalizeFeedbackMessage(value) {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'message must be string' };
  }

  const message = value.trim();
  if (!message) return { ok: false, reason: 'Напишите сообщение' };
  if (message.length > MAX_FEEDBACK_LENGTH) {
    return { ok: false, reason: `Сообщение длиннее ${MAX_FEEDBACK_LENGTH} символов` };
  }

  return { ok: true, message };
}

export function formatFeedbackForDeveloper({ message, user, chatId }) {
  const username = user?.username ? `@${user.username}` : 'без username';
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Без имени';
  return [
    '💬 Feedback из Mini App',
    `От: ${name} (${username})`,
    `User ID: ${user?.id ?? 'unknown'}`,
    `Game chat: ${chatId}`,
    '',
    message,
  ].join('\n');
}

export { MAX_FEEDBACK_LENGTH };

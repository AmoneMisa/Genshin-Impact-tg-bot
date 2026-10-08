import bot from '../bot.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';

/**
 * Whether a "/command" message should be answered with the launcher: not /play
 * (own handler), not an owner command, and not addressed to another bot.
 */
export function shouldRedirectCommand(text, { adminPatterns = [], botUsername = '' } = {}) {
  const match = /^\/(\w+)(?:@(\w+))?/.exec(String(text ?? ''));
  if (!match) return false;
  if (match[1].toLowerCase() === 'play') return false;
  if (match[2] && match[2].toLowerCase() !== String(botUsername).toLowerCase()) return false;
  return !adminPatterns.some(pattern => pattern.test(text));
}

function startParam(chatId) {
  return `chat_${chatId}`;
}

export default async function sendMiniAppLauncher(msg) {
  const appUrl = process.env.MINI_APP_URL;
  const shortName = process.env.MINI_APP_SHORT_NAME;
  const param = startParam(msg.chat.id);

  let button = null;

  if (shortName) {
    const me = await bot.getMe();
    button = {
      text: '🎮 Открыть игру',
      url: `https://t.me/${me.username}/${shortName}?startapp=${encodeURIComponent(param)}`,
    };
  } else if (msg.chat.type === 'private' && appUrl) {
    button = {
      text: '🎮 Открыть игру',
      web_app: { url: appUrl },
    };
  }

  if (!button) {
    return sendMessage(
      msg.chat.id,
      'Mini App ещё не привязан в BotFather. Нужны MINI_APP_SHORT_NAME (для групп) и HTTPS URL приложения.',
      { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
    );
  }

  return sendMessage(msg.chat.id, 'Новый игровой интерфейс:', {
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
    reply_markup: { inline_keyboard: [[button]] },
  });
}

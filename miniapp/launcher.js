import bot from '../bot.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import { translateFor } from './language.js';
import { QUICK_COMMAND_NAMES } from './quickCommandList.js';

/**
 * Whether a "/command" message should be answered with the launcher: not /play
 * (own handler), not an owner command, and not addressed to another bot.
 */
export function shouldRedirectCommand(text, { adminPatterns = [], botUsername = '' } = {}) {
  const match = /^\/(\w+)(?:@(\w+))?/.exec(String(text ?? ''));
  if (!match) return false;
  if (['play','admin','unstack','reset_point_game','reset_elements_game',...QUICK_COMMAND_NAMES].includes(match[1].toLowerCase())) return false;
  if (match[2] && match[2].toLowerCase() !== String(botUsername).toLowerCase()) return false;
  return !adminPatterns.some(pattern => pattern.test(text));
}

function startParam(chatId) {
  return `chat_${chatId}`;
}

/** `feature` opens that Mini App screen right after loading (start parameter `chat_<id>_f_<feature>`). */
export default async function sendMiniAppLauncher(msg, {admin=false, feature=null, title=null}={}) {
  const say = text => translateFor(msg.from?.id ?? msg.chat.id, text, msg.from?.language_code);
  const appUrl = process.env.MINI_APP_URL;
  const shortName = process.env.MINI_APP_SHORT_NAME;
  const screen = /^[A-Za-z0-9]+$/.test(String(feature || '')) ? feature : null;
  const param = (admin?'admin_':'')+startParam(msg.chat.id)+(screen?`_f_${screen}`:'');
  const label = screen && title ? `🎮 ${await say(title)}` : await say('🎮 Открыть игру');

  let button = null;

  if (shortName) {
    const me = await bot.getMe();
    button = {
      text: label,
      url: `https://t.me/${me.username}/${shortName}?startapp=${encodeURIComponent(param)}`,
    };
  } else if (msg.chat.type === 'private' && appUrl) {
    button = {
      text: label,
      web_app: { url: admin?new URL('/admin',appUrl).href:screen?`${appUrl}${appUrl.includes('?')?'&':'?'}feature=${screen}`:appUrl },
    };
  }

  if (!button) {
    return sendMessage(
      msg.chat.id,
      await say('Mini App ещё не привязан в BotFather. Нужны MINI_APP_SHORT_NAME (для групп) и HTTPS URL приложения.'),
      { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
    );
  }

  return sendMessage(msg.chat.id, screen ? await say('Открыть в игре:') : await say('Новый игровой интерфейс:'), {
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
    reply_markup: { inline_keyboard: [[button]] },
  });
}

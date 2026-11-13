import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import getSession from '../functions/getters/getSession.js';
import saveSession from '../functions/getters/saveSession.js';
import { withLock } from './http/request.js';
import { checkMiniAppFeatureAccess } from './featureAccess.js';
import { generateHoroscopeForMiniApp } from './horoscope.js';
import sendMiniAppLauncher from './launcher.js';
import { translateFor } from './language.js';

import { HOROSCOPE_COMMAND, GAME_COMMANDS } from './quickCommandList.js';

export { HOROSCOPE_COMMAND, GAME_COMMANDS, QUICK_COMMAND_NAMES, QUICK_MENU } from './quickCommandList.js';

const HOROSCOPE_COOLDOWN_MS = 10_000;
const lastHoroscope = new Map();

const commandPattern = names => new RegExp(`^\\/(?:${names.join('|')})(?:@(\\w+))?(?:\\s|$)`, 'i');
const replyOptions = msg => ({
  ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
  reply_to_message_id: msg.message_id,
  allow_sending_without_reply: true,
});
const addressedToOtherBot = (match, botUsername) => match?.[1] && match[1].toLowerCase() !== String(botUsername || '').toLowerCase();

async function featureBlocked(msg, settingKey) {
  if (!settingKey) return false;
  const access = await checkMiniAppFeatureAccess({ chatId: msg.chat.id, userId: msg.from.id, settingKey });
  if (access.ok) return false;
  const say = text => translateFor(msg.from.id, text, msg.from.language_code);
  await sendMessage(msg.chat.id, await say('Функция отключена администратором этого чата.'), replyOptions(msg));
  return true;
}

/** Generates with the player's saved sign and style and answers with the text itself. */
export async function answerHoroscope(msg, { now = Date.now() } = {}) {
  const chatId = msg.chat.id, userId = msg.from.id, key = `${chatId}:${userId}`;
  const say = text => translateFor(userId, text, msg.from.language_code);
  if (now - (lastHoroscope.get(key) || 0) < HOROSCOPE_COOLDOWN_MS) {
    return sendMessage(chatId, await say('Звёзды ещё думают над прошлым предсказанием. Попробуй через несколько секунд.'), replyOptions(msg));
  }
  lastHoroscope.set(key, now);
  if (await featureBlocked(msg, 'horoscope')) return null;
  const result = await withLock(`${chatId}:${userId}:horoscope`, async () => {
    const session = await getSession(chatId, userId);
    const generated = await generateHoroscopeForMiniApp(session);
    await saveSession(session);
    return generated;
  });
  return sendMessage(chatId, result.text, replyOptions(msg));
}

export async function openGameFromCommand(msg, game) {
  if (await featureBlocked(msg, game.setting)) return null;
  return sendMiniAppLauncher(msg, { feature: game.feature, title: game.title });
}

export function registerQuickCommands(bot) {
  let botUsername = null;
  const me = async () => (botUsername ??= (await bot.getMe()).username);
  const guard = handler => async (msg, match) => {
    if (msg.chat.type === 'channel' || !msg.from) return;
    if (addressedToOtherBot(match, await me())) return;
    try { await handler(msg); } catch (error) { console.error('[quick command]', error); }
  };
  bot.onText(commandPattern([HOROSCOPE_COMMAND.command]), guard(answerHoroscope));
  for (const game of GAME_COMMANDS) bot.onText(commandPattern([game.command, ...(game.aliases || [])]), guard(msg => openGameFromCommand(msg, game)));
}

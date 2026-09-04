import './index.js';
import bot from './bot.js';
import { trustedChats } from './data.js';
import debugMessage from './functions/tgBotFunctions/debugMessage.js';
import sendMessage from './functions/tgBotFunctions/sendMessage.js';
import sendMiniAppLauncher from './miniapp/launcher.js';
import startMiniAppServer from './miniapp/server.js';

function isTrusted(chatId) {
  return trustedChats.includes(String(chatId));
}

const miniAppServer = startMiniAppServer();

bot.onText(/^\/play(?:@\w+)?$/, async (msg) => {
  if (!isTrusted(msg.chat.id)) {
    debugMessage(`${msg.chat.id} - попытка открыть Mini App.`);
    return sendMessage(
      msg.chat.id,
      'К сожалению, этот чат не входит в список доверенных чатов. За разрешением на использование, можете обратиться в личку @WhitesLove.',
      { ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) },
    );
  }

  return sendMiniAppLauncher(msg);
});

bot.getMyCommands()
  .then((commands) => {
    if (commands.some(({ command }) => command === 'play')) return;
    return bot.setMyCommands([
      { command: 'play', description: 'Открыть новый игровой интерфейс' },
      ...commands,
    ]);
  })
  .catch((error) => console.error('[miniapp] unable to register /play:', error));

function closeMiniAppServer() {
  if (miniAppServer?.listening) miniAppServer.close();
}

process.on('SIGTERM', closeMiniAppServer);
process.on('SIGINT', closeMiniAppServer);

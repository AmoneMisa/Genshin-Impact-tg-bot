import './index.js';
import bot from './bot.js';
import { trustedChats } from './data.js';
import debugMessage from './functions/tgBotFunctions/debugMessage.js';
import sendMessage from './functions/tgBotFunctions/sendMessage.js';
import sendMiniAppLauncher from './miniapp/launcher.js';
import startMiniAppServer from './miniapp/chatSettingsServer.js';

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

// The Main Mini App is configured in BotFather, so it remains discoverable
// without racing index.js over setMyCommands. /play still works when typed.

function closeMiniAppServer() {
  if (miniAppServer?.listening) miniAppServer.close();
}

process.on('SIGTERM', closeMiniAppServer);
process.on('SIGINT', closeMiniAppServer);

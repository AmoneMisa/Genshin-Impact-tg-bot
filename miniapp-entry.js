import './index.js';
import bot from './bot.js';
import sendMiniAppLauncher from './miniapp/launcher.js';
import startMiniAppServer from './miniapp/chatSettingsServer.js';

const miniAppServer = startMiniAppServer();

bot.onText(/^\/play(?:@\w+)?$/, async (msg) => {
  return sendMiniAppLauncher(msg);
});

// The Main Mini App is configured in BotFather, so it remains discoverable
// without racing index.js over setMyCommands. /play still works when typed.

function closeMiniAppServer() {
  if (miniAppServer?.listening) miniAppServer.close();
}

process.on('SIGTERM', closeMiniAppServer);
process.on('SIGINT', closeMiniAppServer);

import errorHandler from './errorHandler.js';
errorHandler();

import deleteMessage from './functions/tgBotFunctions/deleteMessage.js';
import onTextsAdmin from './onTextsAdmin/index.js';
import sendMiniAppLauncher, { shouldRedirectCommand } from './miniapp/launcher.js';
import bot from './bot.js';
import getSession from './functions/getters/getSession.js';
import saveSession from './functions/getters/saveSession.js';
import debugMessage from './functions/tgBotFunctions/debugMessage.js';
import { registerStarPayments } from './functions/payments/starsHandlers.js';

import evenSecond from './functions/shedullers/evenSecond.js';
import evenTwoMinutes from './functions/shedullers/evenTwoMinutes.js';
import evenFiveMinutes from './functions/shedullers/evenFiveMinutes.js';
import evenHour from './functions/shedullers/evenHour.js';
import evenDay from './functions/shedullers/evenDay.js';
import evenWeek from './functions/shedullers/evenWeek.js';

import {connectMongo} from "./db/db.js";

// Do not accept Telegram updates until Mongo is connected and migration/import
// has completed. This also makes importing index.js safe for the Mini App entry.
await connectMongo();

await bot.setMyCommands([
    {command: "start", description: "Открыть игру"},
    {command: "play", description: "Открыть игру"},
], {
    scope: {type: "default"}
});

// The game lives in the Mini App. Player text commands are gone: any other
// /command just answers with the launcher. Owner tools in onTextsAdmin and
// /play (miniapp-entry.js) keep their own handlers.
const adminPatterns = [...onTextsAdmin].map(([key]) => key);
let botUsername = null;

bot.onText(/^\/\w+/, async function (msg) {
    if (msg.chat.type === "channel") return;
    botUsername ??= (await bot.getMe()).username.toLowerCase();
    if (!shouldRedirectCommand(msg.text, { adminPatterns, botUsername })) return;
    return sendMiniAppLauncher(msg);
});

for (let [key, value] of onTextsAdmin) {
    bot.onText(key, value);
}

bot.on("new_chat_members", async (msg) => {
    for (let newChatMember of msg.new_chat_members) {
        const session = await getSession(msg.chat.id, newChatMember.id);
        session.isHided = false;
        await saveSession(session);
    }
});

bot.on("left_chat_member", async (msg) => {
    const session = await getSession(msg.chat.id, msg.left_chat_participant.id);
    session.isHided = true;
    await saveSession(session);
});

// Inline buttons of old chat messages: only "close" still works, the rest
// points to the Mini App.
bot.on("callback_query", async (callback) => {
    try {
        if (callback.data === "close") {
            await deleteMessage(callback.message.chat.id, callback.message.message_id);
            await bot.answerCallbackQuery(callback.id);
            return;
        }
        await bot.answerCallbackQuery(callback.id, {
            text: "Игра переехала в Mini App — открой её командой /play",
            show_alert: true,
        });
    } catch (e) {
        console.error(callback.data, e);
    }
});

evenSecond();
evenTwoMinutes();
evenFiveMinutes();
evenHour();
evenDay();
evenWeek();

bot.on('polling_error', (error) => {
    console.error(error);
});

function shutdown() {
    debugMessage("Я отключился");
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await registerStarPayments(bot);

// startPolling() keeps its own loop alive; do not await it at module scope,
// otherwise miniapp-entry.js would never continue to the HTTP server startup.
bot.startPolling().catch(error => {
    console.error('Telegram polling failed to start:', error);
});

console.log("Оно живое");
debugMessage("Оно живое");

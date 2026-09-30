import errorHandler from './errorHandler.js';
errorHandler();

import deleteMessage from './functions/tgBotFunctions/deleteMessage.js';
import callbacks from './callbacks/index.js';
import onTexts from './onTexts/index.js';
import onTextsAdmin from './onTextsAdmin/index.js';
import bot from './bot.js';
import getSession from './functions/getters/getSession.js';
import saveSession from './functions/getters/saveSession.js';
import getChatSessionSettings from './functions/getters/getChatSessionSettings.js';
import debugMessage from './functions/tgBotFunctions/debugMessage.js';
import sendMessage from './functions/tgBotFunctions/sendMessage.js';

import evenSecond from './functions/shedullers/evenSecond.js';
import evenTwoMinutes from './functions/shedullers/evenTwoMinutes.js';
import evenFiveMinutes from './functions/shedullers/evenFiveMinutes.js';
import evenHour from './functions/shedullers/evenHour.js';
import evenDay from './functions/shedullers/evenDay.js';
import evenWeek from './functions/shedullers/evenWeek.js';

import buttonsDictionary from './dictionaries/buttons.js';
import Command from "./db/models/CommandMap.js";
import Chat from "./db/models/Chat.js";
import { goldLockMessage, goldSpendCallback, tableLockFor } from "./functions/game/general/goldLock.js";
import {connectMongo} from "./db/db.js";

// Do not accept Telegram updates until Mongo is connected and migration/import
// has completed. This also makes importing index.js safe for the Mini App entry.
await connectMongo();

async function loadCommands() {
    const commands = await Command.find({});
    const commandMap = {};
    const supergroupCommands = [];

    for (const cmd of commands) {
        commandMap[cmd.command] = cmd.settingKey;
        if (cmd.supergroupOnly) {
            supergroupCommands.push(cmd.command);
        }
    }

    return { commandMap, supergroupCommands };
}

const { commandMap, supergroupCommands } = await loadCommands();

await bot.setMyCommands([
    {command: "start", description: "Список всех основных команд"},
    {command: "help", description: "Помощь"},
    {command: "games", description: "Список игр"},
    {command: "games_player", description: "Команды для управления персонажем"},
    {command: "games_form", description: "Команды для анкет"},
    {command: "reset_games_timers", description: "Сбросить таймеры для персональных игр"},
    {command: "self_mute", description: "Уйти в себя на две минуты"},
    {command: "admin_commands", description: "Список админ команд"},
    {command: "whats_new", description: "Подписаться или отписаться от новостей от разработчика"},
    {command: "feedback", description: "Обратная связь с разработчиком (Работает в тестовом режиме)"},
], {
    scope: {type: "default"}
});

for (let [key, value] of onTexts) {
    bot.onText(key, async function (msg, regExp) {
        if (msg.chat.type === "channel") {
            return sendMessage(msg.chat.id, "Этот бот не доступен для использования в каналах.");
        }

        if (msg.chat.type === "private" && supergroupCommands.includes(regExp[0].replace(/^\//, ''))) {
            return sendMessage(msg.chat.id, "Эта команда не доступна в приватном чате.");
        }

        let command = regExp[0].replace(/^\//, '');
        let settings = await getChatSessionSettings(msg.chat.id);
        let foundSettingKey = null;

        for (let [commandRegexp, settingKey] of Object.entries(commandMap)) {
            commandRegexp = new RegExp(`^${commandRegexp}$`);
            if (commandRegexp.test(command)) {
                foundSettingKey = settingKey;
                break;
            }
        }

        let commandStatus = foundSettingKey !== null ? settings[foundSettingKey] : null;

        if (commandStatus !== null && !commandStatus) {
            await deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(msg.chat.id, `Команда /${command} отключена. Чтобы её включить используйте /settings`, {
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            });
        }

        const session = await getSession(msg.chat.id, msg.from.id);
        const result = regExp.length > 1
            ? await value(msg, session, regExp)
            : await value(msg, session);

        await saveSession(session);
        return result;
    });
}

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

// Gold is frozen while the player sits at a 21 / elements table.
async function goldLockAlert(callback, session) {
    const spend = goldSpendCallback(callback.data);
    if (!spend) return null;
    const chat = spend.chatId && String(spend.chatId) !== String(callback.message.chat.id)
        ? await Chat.findOne({ chatId: spend.chatId })
        : session.ownerDocument();
    const title = tableLockFor(chat, callback.from.id, Date.now(), spend.except);
    return title ? goldLockMessage(title) : null;
}

bot.on("callback_query", async (callback) => {
    const session = await getSession(callback.message.chat.id, callback.from.id);
    const results = [];

    const locked = await goldLockAlert(callback, session).catch(() => null);
    if (locked) {
        await bot.answerCallbackQuery(callback.id, { text: locked, show_alert: true }).catch(() => {});
        return;
    }

    for (let [key, value] of callbacks) {
        let result = null;

        if (key instanceof RegExp) {
            const match = callback.data.match(key);
            if (match) {
                result = Promise.resolve(value(session, callback, match));
            }
        } else if (callback.data === key) {
            result = Promise.resolve(value(session, callback));
        }

        if (result === null) continue;
        results.push(result);
    }

    if (results.length === 0) {
        console.error(callback.data);
        console.error("Нет ни одного обработчика");
        debugMessage(`Произошла ошибка: ${callback.data} - Нет ни одного обработчика`);
        return;
    }

    try {
        await Promise.all(results);
        await saveSession(session);
        await bot.answerCallbackQuery(callback.id);
    } catch (e) {
        console.error(callback.data);
        console.error(e);
        debugMessage(`Произошла ошибка: ${callback.data} - ${e}`);
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

// startPolling() keeps its own loop alive; do not await it at module scope,
// otherwise miniapp-entry.js would never continue to the HTTP server startup.
bot.startPolling().catch(error => {
    console.error('Telegram polling failed to start:', error);
});

console.log("Оно живое");
debugMessage("Оно живое");

require('./errorHandler');

const deleteMessage = require('./functions/tgBotFunctions/deleteMessage');
const callbacks = require('./callbacks');
const onTexts = require('./onTexts');
const onTextsAdmin = require('./onTextsAdmin');
const bot = require('./bot');
const {trustedChats} = require('./data');
const fs = require('fs');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});
const getSession = require('./functions/getters/getSession');
const getChatSessionSettings = require('./functions/getters/getChatSessionSettings');
const debugMessage = require('./functions/tgBotFunctions/debugMessage');
const sendMessage = require('./functions/tgBotFunctions/sendMessage');
const writeFiles = require('./functions/misc/writeFiles');

const evenSecond = require('./functions/shedullers/evenSecond');
const evenMinute = require('./functions/shedullers/evenMinute');
const evenTwoMinutes = require('./functions/shedullers/evenTwoMinutes');
const evenFiveMinutes = require('./functions/shedullers/evenFiveMinutes');
const evenHour = require('./functions/shedullers/evenHour');
const evenDay = require('./functions/shedullers/evenDay');
const evenWeek = require('./functions/shedullers/evenWeek');

const log = intel.getLogger("genshin");
const buttonsDictionary = require("./dictionaries/buttons");

bot.setMyCommands([
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

function isTrusted(chatId) {
    chatId = chatId + "";
    return trustedChats.includes(chatId);
}

const commandMap = {
    "boss": "boss",
    "shop": "boss",
    "exchange": "boss",
    "gacha": "whoami",
    "steal_resources": "whoami",
    "whoami": "whoami",
    "change_gender": "whoami",
    "send_gold": "sendGold",
    "sword": "swords",
    "swords": "swords",
    "mute": "mute",
    "slots": "slots",
    "point": "points",
    "dice": "dice",
    "darts": "darts",
    "bowling": "bowling",
    "basketball": "basketball",
    "football": "football",
    "elements": "elements",
    "horoscope": "horoscope",
    "bonus": "bonus",
    "chest": "chests",
    "title": "titles",
    "titles": "titles",
    "info": "form",
    "form": "form",
    "set[A-Z].*": "form"
};

let supergroupCommands = ["boss", "title", "titles", "info", "form", "sword", "swords", "shop", "send_gold", "mute", "steal_resources", "gacha", "exchange", "change_gender", "bonus"];

for (let [key, value] of onTexts) {
    bot.onText(key, async function (msg, regExp) {
        if (!isTrusted(msg.chat.id)) {
            debugMessage(`${msg.chat.id} - попытка обратиться к боту.`);
            return sendMessage(msg.chat.id, "К сожалению, этот чат не входит в список доверенных чатов. За разрешением на использование, можете обратиться в личку @WhitesLove.", {
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
            });
        }

        if (msg.chat.type === "chanel") {
            return sendMessage(msg.chat.id, "Этот бот не доступен для использования в каналах.");
        }

        if (msg.chat.type === "private" && supergroupCommands.includes(regExp[0].replace(/^\//, ''))) {
            return sendMessage(msg.chat.id, "Эта команда не доступна в приватном чате.");
        }

        let command = regExp[0].replace(/^\//, '');
        let settings = getChatSessionSettings(msg.chat.id);
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

        let session = await getSession(msg.chat.id, msg.from.id);

        if (regExp.length > 1) {
            return value(msg, session, regExp);
        } else {
            return value(msg, session);
        }
    });
}

for (let [key, value] of onTextsAdmin) {
    bot.onText(key, value);
}

bot.on("new_chat_members", async (msg) => {
    for (let newChatMember of msg.new_chat_members) {
        let session = await getSession(msg.chat.id, newChatMember.id);
        session.isHided = false;
    }
});

bot.on("left_chat_member", async (msg) => {
    let session = await getSession(msg.chat.id, msg.left_chat_participant.id);
    session.isHided = true;
});

bot.on("callback_query", async (callback) => {
    if (!isTrusted(callback.message.chat.id)) {
        debugMessage(`${callback.message.chat.id} - попытка обратиться к боту.`);
        return sendMessage(callback.message.chat.id, "К сожалению, этот чат не входит в список доверенных чатов. За разрешением на использование, можете обратиться в личку @WhitesLove.", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        });
    }

    let session = await getSession(callback.message.chat.id, callback.from.id);
    let results = [];

    for (let [key, value] of callbacks) {

        let result = null;

        if (key instanceof RegExp) {
            let match = callback.data.match(key);

            if (match) {
                result = value(session, callback, match) || Promise.resolve();
            }
        } else if (callback.data === key) {
            result = value(session, callback) || Promise.resolve();
        }

        if (result === null) {
            continue;
        }

        result.catch(e => {
            console.error(callback.data);
            console.error(e);
            debugMessage(`Произошла ошибка: ${callback.data} - ${e}`);
        });
        results.push(result);
    }

    if (results.length > 0) {
        Promise.all(results).then(() => {
            bot.answerCallbackQuery(callback.id);
            // log.info('%:2j', session);
        });
    } else {
        console.error(callback.data);
        console.error("Нет ни одного обработчика");
        debugMessage(`Произошла ошибка: ${callback.data} - Нет ни одного обработчика`);
    }
});

evenSecond();
// evenMinute();
evenTwoMinutes();
evenFiveMinutes();
evenHour();
evenDay();
evenWeek();

let setIntervalId = setInterval(() => {
    writeFiles(false);
}, 30000);

let fileTemplate = /^([a-zA-Z]+)-([0-9]+)\.json$/;

function validateBackup(name, array, result) {
    if (result[1].includes(name)) {
        array.push(result[0]);
    }
}

function deleteBackup(array) {
    let countBackups = 2;

    if (array.length > countBackups) {
        fs.unlinkSync(`./${array[0]}`);
        array.shift();
    }
}

(function () {
    let sessionsBackups = [];
    let bossesBackups = [];
    let titlesBackups = [];
    let arenaRatingBackups = [];
    let arenaTempBotsBackups = [];

    fs.readdirSync("./").forEach(file => {
        let result = file.match(fileTemplate);

        if (result !== null) {
            validateBackup("sessions", sessionsBackups, result);
            validateBackup("bosses", bossesBackups, result);
            validateBackup("titles", titlesBackups, result);
            validateBackup("arenaRating", arenaRatingBackups, result);
            validateBackup("arenaTempBots", arenaTempBotsBackups, result);

            deleteBackup(sessionsBackups);
            deleteBackup(bossesBackups);
            deleteBackup(titlesBackups);
            deleteBackup(arenaRatingBackups);
            deleteBackup(arenaTempBotsBackups);
        }
    })
})();

bot.on('polling_error', (error) => {
    console.error(error);
});

function shutdown() {
    clearInterval(setIntervalId);
    debugMessage("Я отключился");
    writeFiles(true);
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);
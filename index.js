require('./errorHandler');

const deleteMessage = require('./functions/tgBotFunctions/deleteMessage');
const callbacks = require('./callbacks');
const onTexts = require('./onTexts');
const onTextsAdmin = require('./onTextsAdmin');
const bot = require('./bot');
const {sessions, bosses, trustedChats} = require('./data');
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
const evenFiveMinutes = require('./functions/shedullers/evenFiveMinutes');
const evenHour = require('./functions/shedullers/evenHour');
const evenDay = require('./functions/shedullers/evenDay');

const log = intel.getLogger("genshin");
const cron = require('node-cron');

const initBossDealDamage = require('./functions/game/boss/initBossDealDamage');
const initHpRegen = require('./functions/game/boss/initHpRegen');
const buttonsDictionary = require("./dictionaries/buttons");
const setTimerForCollectResources = require("./functions/shedullers/timerForAccumulateResources");

bot.setMyCommands([
    {command: "start", description: "Список всех основных команд"},
    {command: "help", description: "Помощь"},
    {command: "games", description: "Список игр"},
    {command: "games_player", description: "Команды для управления персонажем"},
    {command: "games_form", description: "Команды для анкет"},
    {command: "reset_games_timers", description: "Сбросить таймеры для персональных игр"},
    {command: "self_mute", description: "Уйти в себя на две минуты"},
    {command: "admin_commands", description: "Список админ команд"},
], {
    scope: {type: "default"}
});

function isTrusted(chatId) {
    chatId = chatId + "";
    return trustedChats.includes(chatId);
}

(function () {
    for (let sessionId of Object.keys(sessions)) {
        if (!isTrusted(sessionId)) {
            delete sessions[sessionId];
        }
    }
})();

const commandMap = {
    "boss": "boss",
    "shop": "boss",
    "exchange": "boss",
    "steal_resources": "whoami",
    "whoami": "whoami",
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
    "chest": "chests",
    "title": "titles",
    "titles": "titles",
    "info": "form",
    "form": "form",
    "set[A-Z].*": "form"
};

for (let [key, value] of onTexts) {
    bot.onText(key, async function (msg, regExp) {
        if (!isTrusted(msg.chat.id)) {
            debugMessage(`${msg.chat.id} - попытка обратиться к боту.`);
            return sendMessage(msg.chat.id, "К сожалению, этот чат не входит в список доверенных чатов. За разрешением на использование, можете обратиться в личку @WhitesLove.");
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
            return value(msg, regExp, session);
        } else {
            return value(msg, session);
        }
    });
}


initBossDealDamage();
initHpRegen();


for (let [key, value] of onTextsAdmin) {
    bot.onText(key, value);
}

bot.on("callback_query", async (callback) => {
    if (!isTrusted(callback.message.chat.id)) {
        debugMessage(`${callback.message.chat.id} - попытка обратиться к боту.`);
        return sendMessage(callback.message.chat.id, "К сожалению, этот чат не входит в список доверенных чатов. За разрешением на использование, можете обратиться в личку @WhitesLove.");
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
evenMinute();
evenFiveMinutes();
evenHour();
evenDay();

let setIntervalId = setInterval(() => {
    writeFiles(false);
}, 30000);

let fileTemplate = /^([a-z]+)-([0-9]+)\.json$/;

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

    fs.readdirSync("./").forEach(file => {
        let result = file.match(fileTemplate);

        if (result !== null) {
            validateBackup("sessions", sessionsBackups, result);
            validateBackup("bosses", bossesBackups, result);
            validateBackup("titles", titlesBackups, result);

            deleteBackup(sessionsBackups);
            deleteBackup(bossesBackups);
            deleteBackup(titlesBackups);
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
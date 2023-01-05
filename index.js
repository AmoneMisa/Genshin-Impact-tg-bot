const callbacks = require('./callbacks');
const onTexts = require('./onTexts');
const onTextsAdmin = require('./onTextsAdmin');
const bot = require('./bot');
const {sessions, titles, bosses, trustedChats} = require('./data');
const fs = require('fs');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});
const getSession = require('./functions/getSession');
const debugMessage = require('./functions/debugMessage');
const sendMessage = require('./functions/sendMessage');
const log = intel.getLogger("genshin");

const initBossDealDamage = require('./functions/game/boss/initBossDealDamage');
const initHpRegen = require('./functions/game/boss/initHpRegen');

bot.setMyCommands([
    {command: "start", description: "Список всех основных команд"},
    {command: "help", description: "Помощь"},
    {command: "games", description: "Список игр"},
    {command: "games_boss", description: "Команды для босса"},
    {command: "games_form", description: "Команды для анкет"},
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

for (let [key, value] of onTexts) {
    bot.onText(key, async function (msg, regExp) {

        if (!isTrusted(msg.chat.id)) {
            debugMessage(`${msg.chat.id} - попытка обратиться к боту.`);
            return sendMessage(msg.chat.id, "К сожалению, этот чат не входит в список доверенных чатов. За разрешением на использование, можете обратиться в личку @WhitesLove.");
        }

        let session = await getSession(msg.chat.id, msg.from.id);
        if (regExp.length > 1) {
            return value(msg, regExp, session);
        } else {
            return value(msg, session);
        }
    });
}

for (let id of Object.keys(bosses)) {
    initBossDealDamage(id, true);
    initHpRegen(id, true);
}

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
        if ((key instanceof RegExp && key.test(callback.data)) || callback.data === key) {
            results.push(value(session, callback) || Promise.resolve());
        }
    }

    Promise.all(results).then(() => {
        bot.answerCallbackQuery(callback.id);
        // log.info('%:2j', session);
    });
});

function writeFiles(backup) {
    writeFile("sessions", sessions, backup);
    writeFile("bosses", bosses, backup);
    writeFile("titles", titles, backup);
}

function writeFile(name, data, backup) {
    if (backup) {
        fs.renameSync(`./${name}.json`, `./${name}-${(new Date()).getTime()}.json`);
    }

    fs.writeFileSync(`./${name}.json`, JSON.stringify(data));
}

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
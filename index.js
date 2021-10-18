const callbacks = require('./callbacks');
const onTexts = require('./onTexts');
const onTextsAdmin = require('./onTextsAdmin');
const bot = require('./bot');
const {sessions, titles, bosses} = require('./data');
const fs = require('fs');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});
const getSession = require('./functions/getSession');
const debugMessage = require('./functions/debugMessage');
const log = intel.getLogger("genshin");

bot.setMyCommands([
    {command: "start", description: "Список всех основных команд"},
    {command: "info", description: "Инфо о группе"},
    {command: "help", description: "Помощь (много буков)"},
    {command: "menu", description: "Заполнить анкету о себе"},
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "all_swords", description: "Список мечей всей группы"},
    {command: "summon_boss", description: "Призвать босса"},
    {command: "boss_show_hp", description: "Показать Хп босса"},
    {command: "damage_the_boss", description: "Нанести урон боссу"},
    {command: "heal_yourself", description: "Похиллить себя"},
    {command: "boss_my_stats", description: "Моя статистика"},
    {command: "boss_shop", description: "Магазин"},
    {command: "send_gold", description: "Перевести золото"},
    {command: "chest", description: "Открыть сундук"},
    {command: "point", description: "Игра в 21 очко"},
], {
    scope: {type: "default"}
});

for (let [key, value] of onTexts) {
    bot.onText(key, async function (msg, regExp) {
        let session = await getSession(msg.chat.id, msg.from.id);
        if (regExp.length > 1) {
            return value(msg, regExp, session);
        } else {
            return value(msg, session);
        }
    });
}

for (let [key, value] of onTextsAdmin) {
    bot.onText(key, value);
}

bot.on("callback_query", async (callback) => {
    let session = await getSession(callback.message.chat.id, callback.from.id);
    let results = [];

    for (let [key, value] of callbacks) {
        if ((key instanceof RegExp && key.test(callback.data)) || callback.data === key) {
            results.push(value(session, callback) || Promise.resolve());
        }
    }

    Promise.all(results).then(() => {
        bot.answerCallbackQuery(callback.id);
        log.info('%:2j', session);
    });
});

let setIntervalId = setInterval(() => {
    fs.writeFileSync("./sessions.json", JSON.stringify(sessions));
    fs.writeFileSync("./titles.json", JSON.stringify(titles));
    fs.writeFileSync("./bosses.json", JSON.stringify(bosses));
}, 30000);

bot.on('polling_error', (error) => {
    console.error(error);
});

function shutdown() {
    clearInterval(setIntervalId);
    fs.writeFileSync("./sessions.json", JSON.stringify(sessions));
    fs.writeFileSync("./titles.json", JSON.stringify(titles));
    fs.writeFileSync("./bosses.json", JSON.stringify(bosses));
    debugMessage("Я отключился");
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);
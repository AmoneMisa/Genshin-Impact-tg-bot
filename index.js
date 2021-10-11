const callbacks = require('./callbacks');
const onTexts = require('./onTexts');
const bot = require('./bot');
const {chat} = require('./config');
const {sessions, titles, bosses} = require('./data');
// const {sessions, titles} = require('./data');
const fs = require('fs');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});
const getSession = require('./functions/getSession');

const log = intel.getLogger("genshin");

bot.setMyCommands([
    {command: "start", description: "Инфо о группе"},
    {command: "menu", description: "Заполнить анкету о себе"},
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "all_swords", description: "Список мечей всей группы"}
], {
    scope: {type: "default"}
});

bot.setMyCommands([
    {command: "start", description: "Инфо о группе"},
    {command: "menu", description: "Заполнить анкету о себе"},
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "all_swords", description: "Список мечей всей группы"},
    // {command: "summon_boss", description: "Призвать босса"},
    // {command: "boss_show_hp", description: "Показать Хп босса"},
    // {command: "damage_the_boss", description: "Нанести урон боссу"},
    // {command: "boss_my_stats", description: "Моя статистика"},
    // {command: "boss_shop", description: "Магазин"},
    // {command: "send_gold", description: "Перевести золото"},
    // {command: "chest", description: "Открыть сундук"},
], {
    // scope: {type: "chat", chat_id: -585920926}
    scope: {type: "chat", chat_id: chat}
});

for (let [key, value] of onTexts) {
    bot.onText(key, value);
}

bot.on("callback_query", async (callback) => {
    let session = await getSession(sessions, callback.message.chat.id, callback.from.id);
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

bot.on('polling_error', (error) => {
    console.error(error);
});

function shutdown() {
    fs.writeFileSync("./sessions.json", JSON.stringify(sessions));
    fs.writeFileSync("./titles.json", JSON.stringify(titles));
    fs.writeFileSync("./bosses.json", JSON.stringify(bosses));
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);
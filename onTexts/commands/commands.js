const bot = require('../../bot');
const debugMessage = require('../../functions/tgBotFunctions/debugMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');

const gamesCommands = [
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "swords", description: "Список мечей всей группы"},
    {command: "change_class", description: "Изменить класс"},
    {command: "shop", description: "Магазин"},
    {command: "send_gold", description: "Перевести золото"},
    {command: "chest", description: "Открыть сундук"},
    {command: "point", description: "Игра в 21 очко"},
    {command: "slots", description: "Слоты"},
    {command: "dice", description: "Кубики"},
    {command: "bowling", description: "Боулинг"}
];

const formsCommands = [
    {command: "info", description: "Анкеты группы"},
    {command: "form", description: "Заполнить анкету о себе"}
]

const bossCommands = [
    {command: "summon_boss", description: "Призвать босса"},
    {command: "boss_hp", description: "Показать Хп босса"},
    {command: "deal_damage", description: "Нанести урон боссу"},
    {command: "heal", description: "Похиллить себя"},
    {command: "whoami", description: "Моя статистика"},
    {command: "change_class", description: "Изменить класс"},
    {command: "exchange", description: "Обменник кристаллов"},
];

module.exports = [[/(?:^|\s)\/games\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let message = `Список игр бота:\n\n`;
        for (let command of gamesCommands) {
            message += `/${command.command} - ${command.description}\n`;
        }

        sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /games\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}], [/(?:^|\s)\/games_boss\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let message = `Список команд для босса:\n\n`;
        for (let command of bossCommands) {
            message += `/${command.command} - ${command.description}\n`;
        }

        sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /games_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}], [/(?:^|\s)\/games_form\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let message = `Список команд анкет по Геншину:\n\n`;

        for (let command of formsCommands) {
            message += `/${command.command} - ${command.description}\n`;
        }

        sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /games_form\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];
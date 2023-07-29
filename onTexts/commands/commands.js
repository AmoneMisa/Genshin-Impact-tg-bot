const buttonsDictionary = require('../../dictionaries/buttons');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

const gamesCommands = [
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "swords", description: "Список мечей всей группы"},
    {command: "shop", description: "Магазин"},
    {command: "send_gold", description: "Перевести золото"},
    {command: "chest", description: "Открыть сундук"},
    {command: "point", description: "Игра в 21 очко"},
    {command: "slots", description: "Слоты"},
    {command: "dice", description: "Кубики"},
    {command: "bowling", description: "Боулинг"},
    {command: "darts", description: "Дартс"},
    {command: "basketball", description: "Баскетбол"},
    {command: "football", description: "Футбол"},
    {command: "elements", description: "Элементы"},
    {command: "boss", description: "Меню босса"}
];

const formsCommands = [
    {command: "info", description: "Анкеты группы"},
    {command: "form", description: "Заполнить анкету о себе"}
]

const playerCommands = [
    {command: "whoami", description: "Моя статистика и меню персонажа"},
    {command: "steal_resources", description: "Украсть ресурсы у чужого персонажа"},
    {command: "exchange", description: "Обменник кристаллов"},
]

const resetGamesCommands = [
    {command: "reset_darts_game", description: "Сбросить игру в дартс"},
    {command: "reset_dice_game", description: "Сбросить игру в кубики"},
    {command: "reset_bowling_game", description: "Сбросить игру в боулинг"},
    {command: "reset_basketball_game", description: "Сбросить игру в баскетбол"},
    {command: "reset_football_game", description: "Сбросить игру в футбол"}
]

module.exports = [[/(?:^|\s)\/games\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let message = `Список игр бота:\n\n`;
    for (let command of gamesCommands) {
        message += `/${command.command} - ${command.description}\n`;
    }

    return sendMessage(msg.chat.id, message, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], [/(?:^|\s)\/games_player\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let message = `Список команд для игрока:\n\n`;
    for (let command of playerCommands) {
        message += `/${command.command} - ${command.description}\n`;
    }

    return sendMessage(msg.chat.id, message, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], [/(?:^|\s)\/games_form\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let message = `Список команд анкет по Геншину:\n\n`;

    for (let command of formsCommands) {
        message += `/${command.command} - ${command.description}\n`;
    }

    return sendMessage(msg.chat.id, message, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });

}], [/(?:^|\s)\/reset_games_timers\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let message = `Список команд для сброса таймера персональных игр:\n\n`;

    for (let command of resetGamesCommands) {
        message += `/${command.command} - ${command.description}\n`;
    }

    return sendMessage(msg.chat.id, message, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];
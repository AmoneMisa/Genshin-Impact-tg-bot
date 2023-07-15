const bot = require('../bot');
const dictionary = require('../dictionaries/main');
const buttonsDictionary = require('../dictionaries/buttons');

module.exports = [["help", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.main}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Миниигры",
                callback_data: "help_minigames"
            }, {
                text: "Босс",
                callback_data: "help_boss"
            }], [{
                text: "Команда mute",
                callback_data: "help_mute"
            }, {
                text: "Команда form",
                callback_data: "help_form"
            }], [{
                text: "Админ команды",
                callback_data: "help_admin"
            }, {
                text: "Связь с разработчиком",
                callback_data: "help_contact"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], ["help_admin", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.adminCommands}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.minigames}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Кубики",
                callback_data: "help_minigames_dice"
            }, {
                text: "21 очко",
                callback_data: "help_minigames_point"
            }], [{
                text: "Сундучки",
                callback_data: "help_minigames_chest"
            }, {
                text: "Увеличить меч",
                callback_data: "help_minigames_sword"
            }], [{
                text: "Титулы",
                callback_data: "help_minigames_titles"
            }, {
                text: "Слоты",
                callback_data: "help_minigames_slots"
            }], [{
                text: "Боулинг",
                callback_data: "help_minigames_bowling"
            }, {
                text: "Дартс",
                callback_data: "help_minigames_darts"
            }], [{
                text: "Баскетбол",
                callback_data: "help_minigames_basketball"
            }, {
                text: "Футбол",
                callback_data: "help_minigames_football"
            }, {
                text: "Элементы",
                callback_data: "help_minigames_elements"
            }], [{
                text: "Ресурсы (кристаллы)",
                callback_data: "help_minigames_crystals"
            }], [{
                text: "Назад",
                callback_data: "help"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_boss", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.boss}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Магазин",
                callback_data: "help_boss_shop"
            }, {
                text: "Нанести урон",
                callback_data: "help_boss_dealDamage"
            }], [{
                text: "Классы",
                callback_data: "help_boss_class"
            }, {
                text: "Статы",
                callback_data: "help_boss_stats"
            }], [{
                text: "Перевести золото",
                callback_data: "help_boss_sendGold"
            }], [{
                text: "Назад",
                callback_data: "help"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_form", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.form}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Команды анкеты",
                callback_data: "help_form_deep"
            }], [{
                text: "Назад",
                callback_data: "help"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_form_deep", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.helpForm}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_form"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_mute", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.mute}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_contact", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.contact}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_boss_shop", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.bossShop}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_boss"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_boss_dealDamage", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.bossDealDamage}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_boss"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_boss_class", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.class}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_boss"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_boss_stats", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.stats}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_boss"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_boss_sendGold", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.sendGold}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_boss"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_dice", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.dice}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_point", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.point}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_chest", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.chest}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_titles", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.title}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_slots", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.slots}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_sword", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.sword}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_crystals", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.crystals}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_bowling", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.bowling}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_darts", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.darts}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_basketball", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.basketball}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_football", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.football}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], ["help_minigames_elements", function (session, callback) {
    bot.editMessageText(`${dictionary.ru.help.elements}`, {
        message_id: callback.message.message_id,
        chat_id: callback.message.chat.id,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: "help_minigames"
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];
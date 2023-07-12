const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const getCaption = require('../../../functions/game/builds/getCaption');

module.exports = [[/^builds\.[^.]+\.upgrade$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.upgrade$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    let keyboard;
    // условие: если достаточно ресурсов для улучшения, показывать кнопку "улучшить", если нет - не показывать.
    // Если улучшение уже в процессе - добавить кнопку "ускорить улучшение" и изменить заголовок на "Вы уверены?" и цену улучшения

    try {
        await bot.editMessageCaption(getCaption(buildName, "upgrade", build), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`${chatId} - builds.${build}.upgrade - ошибка редактирования заголовка`);
    }
}]];
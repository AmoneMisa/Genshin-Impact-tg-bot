const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const getCaption = require('../../../functions/game/builds/getCaption');

module.exports = [[/^builds\.[^.]+\.status$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.status$/);
    let chatId = callback.message.chat.id;
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    try {
        await bot.editMessageCaption(getCaption(buildName, "status", build), {
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
        debugMessage(`${chatId} - builds.${build}.status - ошибка редактирования заголовка`);
    }
}]];
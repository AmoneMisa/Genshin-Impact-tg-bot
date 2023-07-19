const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const buttonsDictionary = require("../../../dictionaries/buttons");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getCaption = require('../../../functions/game/builds/getCaption');

module.exports = [[/^builds\.[\-0-9]+\.[^.]+\.status$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.status$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (callback.message.photo) {
        await bot.editMessageCaption(getCaption(buildName, "status", build), {
            chat_id: callback.message.chat.id,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        sendMessage(callback.message.chat.id, getCaption(buildName, "status", build), {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `builds.${chatId}.${buildName}.back`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
}]];
import getBuild from '../../../functions/game/builds/getBuild.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import getCaption from '../../../functions/game/builds/getCaption.js';

export default [[/^builds\.[\-0-9]+\.[^.]+\.status$/, async function (session, callback) {
    const [, chatId, buildName] = callback.data.match(/^builds\.([\-0-9]+)\.([^.]+)\.status$/);
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    return editMessageCaption(getCaption(buildName, "status", build), {
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
    }, callback.message.photo);
}], [/^builds\.[\-0-9]+\.palace\.guarded$/, async function (session, callback) {
    const [, chatId] = callback.data.match(/^builds\.([\-0-9]+)\.palace\.guarded$/);
    let messageId = callback.message.message_id;
    let buildName = "palace";
    let build = await getBuild(chatId, callback.from.id, buildName);

    return editMessageCaption(getCaption(buildName, "guarded", build), {
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
    }, callback.message.photo);
}]];
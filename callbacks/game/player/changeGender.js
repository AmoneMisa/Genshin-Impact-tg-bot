const getUserName = require('../../../functions/getters/getUserName');
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const checkUserCall = require("../../../functions/misc/checkUserCall");

const genderTranslateMap = {
    male: "Мужской",
    female: "Женский"
}

module.exports = [[/^gender\.([^.]+)$/, async function (session, callback, [, gender]) {
    if (!checkUserCall(callback, session)) {
        return ;
    }

    session.gender = gender;

    await editMessageCaption(`@${getUserName(session, "nickname")}, твой пол: ${genderTranslateMap[gender]}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    }, callback.message.photo)
        .then(msg => deleteMessageTimeout(msg.chat.id, msg.message_id, 5 * 1000));
}]];


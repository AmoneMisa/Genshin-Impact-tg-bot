const getUserName = require('../../../functions/getters/getUserName');
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

const genderTranslateMap = {
    male: "Мужской",
    female: "Женский"
}

module.exports = [[/^gender\.([^.]+)$/, async function (session, callback, [, gender]) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    session.gender = gender;

    return editMessageText(`@${getUserName(session, "nickname")}, твой пол: ${genderTranslateMap[gender]}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    });
}]];


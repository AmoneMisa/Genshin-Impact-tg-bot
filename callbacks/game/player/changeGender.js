import getUserName from '../../../functions/getters/getUserName.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';

const genderTranslateMap = {
    male: "Мужской",
    female: "Женский"
}

export default [[/^gender\.([^.]+)$/, async function (session, callback, [, gender]) {
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


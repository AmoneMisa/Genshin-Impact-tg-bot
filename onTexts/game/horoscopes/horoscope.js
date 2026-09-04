import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import {generateShortHoroText, kbMain} from "../../../functions/game/horoscope/horoscope.js";

export default [[/(?:^|\s)\/horoscope\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const text = await generateShortHoroText(session);
    console.log(text)
    return sendMessage(msg.chat.id, text, {
        ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
        disable_notification: true,
        reply_markup: kbMain(session)
    });
}]];
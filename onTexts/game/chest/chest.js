import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import getRandomChest from '../../../functions/game/chest/getRandomChest.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getFile from '../../../functions/getters/getFile.js';

export default [[/(?:^|\s)\/chest\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (session.chestTries < 1) {
        await sendMessageWithDelete(msg.from.id, `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Попытка обновляется в 00.00`, {
            disable_notification: true,
        }, 6 * 1000);

        return ;
    }

    let buttons = getRandomChest(msg.chat.id);

    const file = getFile("images/misc", "chestsGame");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: `Выбери три сундучка!`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...buttons
                ]
            }
        });
    } else {
        await sendMessage(msg.from.id, `Выбери три сундучка!`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...buttons
                ]
            }
        });
    }
}]];
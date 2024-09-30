import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getFile from '../../../functions/getters/getFile.js';
import getPlayersListByArenaType from '../../../functions/game/arena/getPlayersListByArenaType.js';
import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';

export default [[/(?:^|\s)\/arena_leaderboard\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let playersList = await getPlayersListByArenaType("common", 1, msg.chat.id);

    const file = getFile("images/misc", "commonArena");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: playersList,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    } else {
        await sendMessage(msg.from.id, playersList, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }
}], [/(?:^|\s)\/arena_expansion_leaderboard\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let playersList = await getPlayersListByArenaType("expansion", 1, msg.chat.id);

    const file = getFile("images/misc", "expansionArena");

    if (file) {
        await sendPhoto(msg.from.id, file, {
            caption: playersList,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }  else {
        await sendMessage(msg.from.id, playersList, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Закрыть",
                    callback_data: "close"
                }]]
            }
        });
    }
}]];
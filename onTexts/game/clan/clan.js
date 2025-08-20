import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getFile from "../../../functions/getters/getFile.js";
import getClan from "../../../functions/game/clans/getClan.js";

export default [[/(?:^|\s)\/clan\b/, async (msg) => {
    let chatId = msg.chat.id;
    await deleteMessage(chatId, msg.message_id);
    let clan = getClan(msg.from.id);

    let keyboard = [[{
        text: "Участники",
        callback_data: "clan.listMembers"
    }, {
        text: "Исследования",
        callback_data: "clan.listInvestigations"
    }, {
        text: "Задания",
        callback_data: "clan.listTasks"
    }], [{
        text: "Хранилище",
        callback_data: "clan.warehouse"
    }, {
        text: "Постройки",
        callback_data: "clan.buildings"
    }]];

    if (clan) {
        if (clan.owner === msg.from.id) {
            keyboard = [...[{
                text: "Расформировать клан",
                callback_data: "clan.reconstruct"
            }]];
        } else if (clan.members.includes(msg.from.id)) {
            keyboard = [...[{
                text: "Покинуть клан",
                callback_data: "clan.leave"
            }]];
        }
    } else {
        keyboard = [[{
            text: "Создать клан",
            callback_data: "clan.create"
        }, {
            text: "Вступить в клан",
            callback_data: "clan.join"
        }]];
    }

    const file = getFile("images/misc", "clan");

    if (file) {
        sendPhoto(msg.chat.id, file, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            caption: ``,
            reply_markup: {
                inline_keyboard: [...keyboard, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
        return;
    }

    sendMessage(msg.chat.id, ``, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        reply_markup: {
            inline_keyboard: [...keyboard, [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];
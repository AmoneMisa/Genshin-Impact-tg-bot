import sendPhoto from '../../../functions/tgBotFunctions/sendPhoto.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getFile from "../../../functions/getters/getFile.js";
import getClan from "../../../functions/game/clans/getClan.js";

export default [[/(?:^|\s)\/clan\b/, async (msg) => {
    let chatId = msg.chat.id;
    await deleteMessage(chatId, msg.message_id);
    let clan = await getClan(msg.from.id);
    let keyboard;

    if (clan) {
        const activityRow = [[{
            text: "Викторина",
            callback_data: "clan.quiz"
        }, {
            text: "Хранилище",
            callback_data: "clan.warehouse"
        }], [{
            text: "Клановый босс",
            callback_data: "clan.boss"
        }, {
            text: "Улучшения",
            callback_data: "clan.upgrades"
        }], [{
            text: "Магазин",
            callback_data: "clan.shop"
        }, {
            text: "Дуэли",
            callback_data: "clan.pvp"
        }], [{
            text: "Постройки",
            callback_data: "clan.buildings"
        }, {
            text: "Войны кланов",
            callback_data: "clan.war"
        }], [{
            text: "Исследования",
            callback_data: "clan.investigations"
        }, {
            text: "Задания",
            callback_data: "clan.tasks"
        }]];

        const role = clan.members.find(m => m.userId === msg.from.id)?.role;
        const canManageClan = role === "owner" || role === "officer";

        if (clan.owner === msg.from.id) {
            keyboard = [[{
                text: "Участники",
                callback_data: "clan.listMembers"
            }], ...activityRow, [{
                text: "Заявки",
                callback_data: "clan.applications"
            }, {
                text: "Пригласить",
                callback_data: "clan.invite"
            }], [{
                text: "Исключить",
                callback_data: "clan.kick"
            }, {
                text: "Роли",
                callback_data: "clan.roles"
            }], [{
                text: "Настройки",
                callback_data: "clan.settings"
            }], [{
                text: "Расформировать клан",
                callback_data: "clan.reconstruct"
            }]];
        } else if (canManageClan) {
            keyboard = [[{
                text: "Участники",
                callback_data: "clan.listMembers"
            }], ...activityRow, [{
                text: "Заявки",
                callback_data: "clan.applications"
            }, {
                text: "Пригласить",
                callback_data: "clan.invite"
            }], [{
                text: "Исключить",
                callback_data: "clan.kick"
            }, {
                text: "Настройки",
                callback_data: "clan.settings"
            }], [{
                text: "Покинуть клан",
                callback_data: "clan.leave"
            }]];
        } else if (clan.members.some(m => m.userId === msg.from.id)) {
            keyboard = [[{
                text: "Участники",
                callback_data: "clan.listMembers"
            }], ...activityRow, [{
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
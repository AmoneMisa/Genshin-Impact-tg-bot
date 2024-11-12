import editMessageCaption from "../../../functions/tgBotFunctions/editMessageCaption.js";
import buttonsDictionary from "../../../dictionaries/buttons.js";
import getClan from "../../../functions/game/clans/getClan.js";

export default [[
    [/^clan\.listMembers$/, async function (session, callback) {
    let clan = getClan(session.userChatData.user.id);
    let message = `Список участников клана ${clan.name}:\n`;

        editMessageCaption(message, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [...keyboard, [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }, callback.message.photo);
    }],

    [/^clan\.listInvestigations$/, async function (session, callback) {
        // Логика для списка исследований клана
    }],

    [/^clan\.listTasks$/, async function (session, callback) {
        // Логика для списка заданий клана
    }],

    [/^clan\.warehouse$/, async function (session, callback) {
        // Логика для работы с хранилищем клана
    }],

    [/^clan\.buildings$/, async function (session, callback) {
        // Логика для работы с постройками клана
    }],

    [/^clan\.reconstruct$/, async function (session, callback) {
        // Логика для расформирования клана
    }],

    [/^clan\.leave$/, async function (session, callback) {
        // Логика для выхода из клана
    }],

    [/^clan\.create$/, async function (session, callback) {
        // Логика для создания клана
    }],

    [/^clan\.join$/, async function (session, callback) {
        // Логика для вступления в клан
    }]
]];

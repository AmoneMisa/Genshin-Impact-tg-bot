const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const controlButtons = require('../../functions/keyboard/controlButtons');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

const buttons = [[{
    "text": "Подписаться на группу",
    "callback_data": "reddit.subscribe"
}], [{
    "text": "Отписаться от группы",
    "callback_data": "reddit.unsubscribe"
}], [{
    "text": "Частота постов",
    "callback_data": "reddit.postsFrequency"
}], [{
    "text": "Тип постов",
    "callback_data": "reddit.postType"
}], [{
    "text": "Поиск",
    "callback_data": "reddit.search"
}], [{
    "text": "К-во постов в поиске",
    "callback_data": "reddit.countPosts"
}], [{
    "text": "Мои подписки",
    "callback_data": "reddit.getSubscribes"
}]];

module.exports = [[/(?:^|\s)\/reddit\b/, (msg, session) => {
    deleteMessage(msg.chat.id, msg.message_id);

    sendMessage(msg.chat.id, "Команды для Reddit", {
        disable_notifications: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("reddit", buttons, 1)]
        }
    });
}]];
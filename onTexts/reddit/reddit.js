const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const sendMessage = require('../../functions/sendMessage');
const controlButtons = require('../../functions/controlButtons');

const buttons = [[{
    "text": "Подписаться на группу",
    "callback_data": "reddit.subscribe"
}], [{
    "text": "Информация о группе",
    "callback_data": "reddit.subredditInfo"
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
}]];

module.exports = [[/(?:^|\s)\/reddit\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, "Команды для Reddit", {
            disable_notifications: true,
            reply_markup: {
                inline_keyboard: [...controlButtons("reddit", buttons, 1)]
            }
        });

    } catch (e) {
        debugMessage(`Command: /reddit\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];
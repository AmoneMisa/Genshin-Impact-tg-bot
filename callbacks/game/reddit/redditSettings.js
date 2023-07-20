const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const bot = require("../../../bot");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const getUserName = require("../../../functions/getters/getUserName");
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

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
}], [{
    "text": "Получение постов",
    "callback_data": "reddit.getPosts"
}]];

module.exports = [["reddit.getPosts", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    let postsButtons = [];
    let tempArray = null;
    let i = 0;

    for (let [key, value] of Object.entries(session.reddit.subscribes)) {
        if (i % 2 === 0) {
            tempArray = [];
            postsButtons.push(tempArray);
        }
        tempArray.push({
            text: key,
            callback_data: `reddit.getPosts.${getUserName(session, "name")}.${value.name}.1`
        });
        i++;
    }

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, ты можешь включить или отключить получение постов с реддита.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons('reddit.getPosts', postsButtons, 1)
        }
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.countPosts", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, количество выдаваемых постов по названию реддита. Разрешены только целочисленные значения от 1 до 100 включительно. Рекомендуемое значение: 5. Значение по умолчанию: 3.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let searchText = parseInt(replyMsg.text);

            if (searchText <= 0) {
                searchText = 1;
            } else if (searchText >= 101) {
                searchText = 100;
            }

            session.reddit.countPosts = searchText;
        });
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.postsFrequency", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, частота выдаваемых постов по названию реддита. Разрешены только целочисленные значения.\n
    Число от 2 до 24 включительно. Рекомендуемое значение: 2. Значение по умолчанию: 2. Текущее значение: ${session.reddit.timer.hour}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let searchText = Math.ceil(parseInt(replyMsg.text));

            if (searchText <= 0) {
                searchText = 2;
            } else if (searchText > 24) {
                searchText = 24;
            }

            session.reddit.timer.hour = searchText;
        });
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.postType", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    const buttons = [[{
        "text": "Горячие (Hot)",
        "callback_data": "reddit.postType.hot"
    }, {
        "text": "Лучшие (Top)",
        "callback_data": "reddit.postType.top"
    }], [{
        "text": "Новые (New)",
        "callback_data": "reddit.postType.new"
    }, {
        "text": "Актуальные",
        "callback_data": "reddit.postType.relevance"
    }], [{
        "text": "По актуальным комментариям",
        "callback_data": "reddit.postType.comments"
    }]];

    return sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, тип выдаваемых постов при поиске.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("reddit", [...buttons], 1)
        }
    }).catch(e => {
        console.error(e);
    });
}], [/^reddit.postType.([^.]+)$/, async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    const [, type] = callback.data.match(/^reddit.postType.([^.]+)$/);
    session.reddit.postType = type;

    return sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, текущий тип выдаваемых постов при поиске: ${type}. По умолчанию: горячие (Hot)`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("reddit", [...buttons], 1)
        }
    }).catch(e => {
        console.error(e);
    });
}], [/^reddit_[^.]+$/, function (session, callback) {
    let [, page] = callback.data.match(/^reddit_([^.]+)$/);
    page = parseInt(page);

    return editMessageText("Команды для Reddit", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("reddit", buttons, page)]
        }
    });
}]];
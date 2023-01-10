const sendMessage = require('../../../functions/sendMessage');
const sendMessageWithDelete = require('../../../functions/sendMessageWithDelete');
const getChatSession = require('../../../functions/getChatSession');
const bot = require('../../../bot');
const snoowrap = require('snoowrap');
const {reddit} = require('../../../config');
const controlButtons = require("../../../functions/controlButtons");
const subscribe = require('../../../functions/reddit/subscribe');

const redd = new snoowrap(reddit);

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

module.exports = [["reddit.search", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, выдача постов по названию реддита`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            const redditPostTemplate = {
                subreddit: null,
                title: null,
                selfText: null,
                url: null
            }
            let searchText = replyMsg.text;
            redd.search({
                sort: session.reddit.postType || "hot",
                limit: session.reddit.countPosts || 3,
                query: searchText
            }).then(res => {
                for (let item of res) {
                    let text = "";
                    let image = null;

                    for (const [key, value] of Object.entries(item)) {
                        if (redditPostTemplate.hasOwnProperty(key)) {
                            if (key === "preview") {
                                image = value.images[0].source.url;
                            } else if (key === "subreddit") {
                                redditPostTemplate["subreddit"] = value.display_name;
                            } else {
                                redditPostTemplate[key] = value;
                            }
                            text += `${redditPostTemplate[key]}\n`;
                        }
                    }
                    if (image !== null) {
                        bot.sendPhoto(callback.from.id, image, {
                            caption: `@${session.userChatData.user.username}, твой результат поиска:\n${text}`,
                            disable_notification: true
                        });
                    } else {
                        sendMessage(callback.from.id, `@${session.userChatData.user.username}, твой результат поиска:\n${text}`, {
                            disable_notification: true,
                            disable_web_page_preview: false
                        });
                    }
                }
            });
        });

    }).catch(e => {
        console.error(e);
    });
}], ["reddit.countPosts", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, количество выдаваемых постов по названию реддита. Разрешены только целочисленные значения от 1 до 100 включительно. Рекомендуемое значение: 5. Значение по умолчанию: 3.`, {
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
}], ["reddit.subscribe", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, введи название реддита, чтобы подписаться.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let searchText = replyMsg.text;
            let rule = /^([-_ a-zA-Z0-9]{4,})+$/mg;
            if (!rule.test(searchText)) {
                return sendMessage(msg.chat.id, "Некорректный ввод. Правила для поиска:\n1) От 4 символов (Знаки препинания не входят).\n2) Любые буквы, числа, пробел, тире (-), нижнее подчёркивание (-)");
            }

            let chatSession = getChatSession(msg.chat.id);

            if (!chatSession["reddit"]) {
                chatSession.reddit = {};
            }

            if (!chatSession["reddit"]["subscribes"]) {
                chatSession.reddit.subscribes = [];
            }

            if (session.reddit["subscribes"].includes(searchText)) {
                return sendMessageWithDelete(msg.chat.id, "Ты уже подписан на этот реддит", {}, 5000);
            }


            if (!chatSession["reddit"]["subscribes"][searchText]) {
                chatSession.reddit.subscribes[searchText] = 1;
            } else {
                chatSession.reddit.subscribes[searchText]++;
            }

            session.reddit["subscribes"].push(searchText);

            subscribe(searchText, "sub").then(res => {
                    sendMessageWithDelete(msg.chat.id, `Ты подписался на реддит: ${searchText}`, {}, 5000);
                }
            ).catch(e => console.error("subscribe Reddit error:", e));
        });
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.unsubscribe", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    if (!session.reddit.subscribes.length) {
        return sendMessage(callback.message.chat.id, "Ты ещё не подписан ни на один реддит.");
    }

    sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, введи название реддита, чтобы отписаться.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let searchText = replyMsg.text;
            let chatSession = getChatSession(msg.chat.id);

            if (!chatSession["reddit"]) {
                chatSession.reddit = {};

                return;
            }

            if (!chatSession["reddit"]["subscribes"]) {
                chatSession.reddit.subscribes = [];

                return;
            }

            chatSession["reddit"]["subscribes"][searchText]--;

            if (chatSession["reddit"]["subscribes"][searchText] <= 0) {
                delete chatSession.reddit.subscribes[searchText];
            }

            if (session.reddit["subscribes"].includes(searchText)) {
                session.reddit["subscribes"] = session.reddit["subscribes"].filter(item => item !== searchText);
                subscribe(searchText, "unsub").then(res => {
                        sendMessageWithDelete(msg.chat.id, `Ты отписался от реддита: ${searchText}`, {}, 5000);
                    }
                ).catch(e => console.error("unsubscribe Reddit error:", e));
            } else {
                sendMessageWithDelete(msg.chat.id, `Ты не подписан на этот реддит: ${searchText}`, {}, 5000);
            }
        });
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.getSubscribes", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    let text = "";
    for (const textElement of session.reddit.subscribes) {
        text += `${textElement} \n`;
    }

    sendMessageWithDelete(callback.message.chat.id, `@${session.userChatData.user.username}, твои подписки:\n${text}`, {
        disable_notification: true
    }, 30000).catch(e => {
        console.error(e);
    });
}], ["reddit.postType", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
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

    return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, тип выдаваемых постов при поиске.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("reddit", [...buttons], 1)
        }
    }).catch(e => {
        console.error(e);
    });
}], [/^reddit.postType.([^.]+)$/, async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    const [, type] = callback.data.match(/^reddit.postType.([^.]+)$/);
    session.reddit.postType = type;

    return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, текущий тип выдаваемых постов при поиске: ${type}. По умолчанию: горячие (Hot)`, {
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

    return bot.editMessageText("Команды для Reddit", {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons("reddit", buttons, page)]
        }
    });
}]];
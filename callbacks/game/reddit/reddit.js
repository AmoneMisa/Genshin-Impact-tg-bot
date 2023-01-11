const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const bot = require('../../../bot');
const snoowrap = require('snoowrap');
const {reddit} = require('../../../config');
const subscribe = require('../../../functions/reddit/subscribe');
const unsubscribe = require('../../../functions/reddit/unsubscribe');
const getUserName = require("../../../functions/getters/getUserName");

const redd = new snoowrap(reddit);

module.exports = [["reddit.search", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    let rule = /^([-_ a-zA-Z0-9]{4,})+$/mg;

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, выдача постов по названию реддита`, {
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
            if (!rule.test(searchText)) {
                return sendMessage(msg.chat.id, "Некорректный ввод. Правила для поиска:\n1) От 4 символов (Знаки препинания не входят).\n2) Любые буквы, числа, пробел, тире (-), нижнее подчёркивание (_)");
            }

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
                            caption: `@${getUserName(session, "nickname")}, твой результат поиска:\n${text}`,
                            disable_notification: true
                        });
                    } else {
                        sendMessage(callback.from.id, `@${getUserName(session, "nickname")}, твой результат поиска:\n${text}`, {
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
}], ["reddit.subscribe", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, введи название реддита, чтобы подписаться.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let searchText = replyMsg.text;
            // symbols: -, _, small and big literals,any digits, min length 4 symbols
            let rule = /^([-_ a-zA-Z0-9]{4,})+$/mg;
            if (!rule.test(searchText)) {
                return sendMessage(msg.chat.id, "Некорректный ввод. Правила для поиска:\n1) От 4 символов (Знаки препинания не входят).\n2) Любые буквы, числа, пробел, тире (-), нижнее подчёркивание (_)");
            }

            if (subscribe(searchText, session, msg.chat.id)) {
                return sendMessageWithDelete(msg.chat.id, `Ты подписался на реддит: ${searchText}`, {}, 5000);
            }
            return sendMessageWithDelete(msg.chat.id, "Ты уже подписан на этот реддит", {}, 5000);
        });
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.unsubscribe", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    if (!session.reddit.subscribes.length) {
        return sendMessage(callback.message.chat.id, "Ты ещё не подписан ни на один реддит.");
    }

    sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, введи название реддита, чтобы отписаться.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let searchText = replyMsg.text;
            if (unsubscribe(searchText, session, msg.chat.id)) {
                return sendMessageWithDelete(msg.chat.id, `Ты отписался от реддита: ${searchText}`, {}, 5000);
            }
            return sendMessageWithDelete(msg.chat.id, `Ты не подписан на этот реддит: ${searchText}`, {}, 5000);
        });
    }).catch(e => {
        console.error(e);
    });
}], ["reddit.getSubscribes", async function (session, callback) {
    if (getUserName(session, "nickname") !== callback.from.username) {
        return;
    }

    let text = "";
    for (const textElement of session.reddit.subscribes) {
        text += `${textElement} \n`;
    }

    sendMessageWithDelete(callback.message.chat.id, `@${getUserName(session, "nickname")}, твои подписки:\n${text}`, {
        disable_notification: true
    }, 30000).catch(e => {
        console.error(e);
    });
}]];
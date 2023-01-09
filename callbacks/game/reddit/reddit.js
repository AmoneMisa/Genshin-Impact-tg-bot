const sendMessage = require('../../../functions/sendMessage');
const bot = require('../../../bot');
const snoowrap = require('snoowrap');
const {reddit} = require('../../../config');
const deleteMessageTimeout = require("../../../functions/deleteMessageTimeout");
const controlButtons = require("../../../functions/controlButtons");

const redd = new snoowrap(reddit);

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

module.exports = [["reddit.search", async function (session, callback) {
    if (session.userChatData.user.username !== callback.from.username) {
        return;
    }

    sendMessage(callback.message.chat.id, "Выдача постов по названию реддита", {
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
            redd.search({sort: "hot", limit: 3, query: searchText}).then(res => {
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
                        bot.sendPhoto(callback.message.chat.id, image, {
                            caption: `@${session.userChatData.user.username}, твой результат поиска:\n${text}`,
                            disable_notification: true
                        });
                    } else {
                        sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, твой результат поиска:\n${text}`, {
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
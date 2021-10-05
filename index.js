const callbacks = require('./callbacks');
const bot = require('./bot');

const dictionary = require('./dictionaries/main');
const translation = require('./dictionaries/translate');
const buttonsDictionary = require('./dictionaries/buttons');
const commands = require('./dictionaries/commands');

const {sessions, titles} = require('./data');
const fs = require('fs');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});

const titlesMessage = require('./functions/titles/titlesMessage');
const titleMessage = require('./functions/titles/titleMessage');
const getSession = require('./functions/getSession');
const setButtons = require('./functions/menu/setButtons');
const sendMessage = require('./functions/sendMessage');

const log = intel.getLogger("genshin");

bot.onText(/(?:^|\s)\/start/, (msg) => {
    getSession(sessions, msg.chat.id, msg.from.id);

    bot.deleteMessage(msg.chat.id, msg.message_id);
    sendMessage(msg.chat.id, `${dictionary["ru"].index}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].info,
                callback_data: "info"
            }], [{
                text: buttonsDictionary["ru"].personal_info,
                callback_data: "personal_info"
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
});

bot.onText(/(?:^|\s)\/menu/, (msg) => {
    bot.deleteMessage(msg.chat.id, msg.message_id);

    let session = getSession(sessions, msg.chat.id, msg.from.id);
    let buttons = setButtons(commands);

    sendMessage(msg.chat.id, `@${session.userChatData.user.username}, ${dictionary["ru"].index}`, {
        disable_notification: true,
        reply_markup: JSON.stringify({
            selective: true,
            keyboard: buttons,
            one_time_keyboard: true
        })
    }).then(msg => {
        session.keyboardMessage = msg;
    })
});

bot.onText(/(?:^|\s)\/set(.*?)\b/, (msg, regResult) => {
    let regResultStr = regResult[1];
    let session = getSession(sessions, msg.chat.id, msg.from.id);

    bot.deleteMessage(session.keyboardMessage.chat.id, session.keyboardMessage.message_id);
    bot.deleteMessage(msg.chat.id, msg.message_id);

    for (let command of commands) {
        if (!command.toLowerCase().includes(regResultStr.toLowerCase())) {
            continue;
        }

        sendMessage(msg.chat.id, `Твой(-я) ${translation[command].toLowerCase()}, @${session.userChatData.user.username}?`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                force_reply: true
            }
        }).then((msg) => {
            let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
                bot.removeReplyListener(id);
                session.user[command] = replyMsg.text;
                bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                bot.deleteMessage(msg.chat.id, msg.message_id);
            });

        }).catch(e => {
            console.error(e);
        });
    }
});

bot.onText(/(?:^|\s)\/title\b/, (msg) => {
    let session = getSession(sessions, msg.chat.id, msg.from.id);
    bot.deleteMessage(msg.chat.id, msg.message_id);

    sendMessage(msg.chat.id, titleMessage(session), {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
});

bot.onText(/(?:^|\s)\/titles/, (msg) => {
    getSession(sessions, msg.chat.id, msg.from.id);
    bot.deleteMessage(msg.chat.id, msg.message_id);

    sendMessage(msg.chat.id, titlesMessage(titles), {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
});

bot.on("callback_query", (callback) => {
    let session = sessions[callback.from.id];
    let results = [];

    for (let [key, value] of callbacks) {
        if ((key instanceof RegExp && key.test(callback.data)) || callback.data === key) {
            results.push(value(session, callback) || Promise.resolve());
        }
    }

    Promise.all(results).then(() => {
        bot.answerCallbackQuery(callback.id);
        log.info('%:2j', session);
    });
});

bot.on('polling_error', (error) => {
    console.error(error);
});

function shutdown() {
    fs.writeFileSync("./sessions.json", JSON.stringify(sessions));
    fs.writeFileSync("./titles.json", JSON.stringify(titles));
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);
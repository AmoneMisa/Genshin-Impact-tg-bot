const callbacks = require('./callbacks');
const bot = require('./bot');
const dictionary = require('./dictionaries/main');
const translation = require('./dictionaries/translate');
const buttonsDictionary = require('./dictionaries/buttons');
const sendMessage = require('./functions/sendMessage');
const {sessions} = require('./data');
const fs = require('fs');
const userTemplate = require('./userTemplate');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});
const commands = ["nickName", "gameId", "rank", "bestCharacter", "favoriteCharacter", "inGameExp", "lvlOfWorld", "favoriteElement", "favoriteLocation", "mostWishesCharacter"];

const log = intel.getLogger("genshin");

bot.onText(/(?:^|\s)\/start/, (msg) => {
    sessions[msg.from.id] = {
        userChatData: (sessions[msg.from.id] && sessions[msg.from.id].userChatData) || {},
        user: (sessions[msg.from.id] && sessions[msg.from.id].user) || userTemplate
    };
    let session = sessions[msg.from.id];
    bot.deleteMessage(msg.chat.id, msg.message_id);
    bot.getChatMember(msg.chat.id, msg.from.id)
        .then((user) => {
            session.userChatData = user;
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
        })
        .catch(e => console.error(e));
});

bot.onText(/(?:^|\s)\/menu/, (msg) => {
    bot.deleteMessage(msg.chat.id, msg.message_id);

    let session = sessions[msg.from.id];
    session.userChatData = session.userChatData || {};
    session.user = session.user || userTemplate;

    function setButtons() {
        let buttons = [];
        let tempArray = [];
        let button = {};
        let i = 0;
        for (let command of commands) {
            if (i % 2 === 0) {
                tempArray = [];
                buttons.push(tempArray);
            }
            button.text = `/set${command[0].toUpperCase()}${command.slice(1)}`;

            tempArray.push(button);
            button = {};
            i++;
        }

        return buttons;
    }

    let buttons = setButtons();

    if (!session.userChatData) {
        bot.getChatMember(msg.chat.id, msg.from.id)
            .then((user) => {
                session.userChatData = user;
                sendMessage(msg.chat.id, `@${session.userChatData.user.username}, ${dictionary["ru"].index}`, {
                    disable_notification: true,
                    reply_markup: JSON.stringify({
                        selective: true,
                        keyboard: buttons,
                        one_time_keyboard: true
                    })
                }).then(msg => {
                    session.keyboardMessage = msg;
                    log.info(session);
                })
            })
            .catch(e => console.error(e));
    } else {
        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, ${dictionary["ru"].index}`, {
            disable_notification: true,
            reply_markup: JSON.stringify({
                selective: true,
                keyboard: buttons,
                one_time_keyboard: true
            })
        }).then(msg => {
            session.keyboardMessage = msg;
            log.info(session);
        })
    }
});

bot.onText(/(?:^|\s)\/set(.*?)\b/, (msg, regResult) => {
    let regResultStr = regResult[1];

    let session = sessions[msg.from.id];
    session.userChatData = session.userChatData || {};
    session.user = session.user || userTemplate;

    log.info(session);
    bot.deleteMessage(session.keyboardMessage.chat.id, session.keyboardMessage.message_id);
    bot.deleteMessage(msg.chat.id, msg.message_id);

    if (!session.userChatData) {
        bot.getChatMember(msg.chat.id, msg.from.id)
            .then((user) => {
                session.userChatData = user;
            })
            .catch(e => console.error(e));
    }

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
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);
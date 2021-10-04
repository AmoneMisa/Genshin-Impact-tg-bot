const callbacks = require('./callbacks');
const bot = require('./bot');
const dictionary = require('./dictionaries/main');
const translation = require('./dictionaries/translate');
const buttonsDictionary = require('./dictionaries/buttons');
const sendMessage = require('./functions/sendMessage');
const {sessions, titles} = require('./data');
const fs = require('fs');
const userTemplate = require('./userTemplate');
const intel = require('intel');
intel.basicConfig({'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s'});
const commands = ["nickName", "gameId", "rank", "bestCharacter", "favoriteCharacter", "inGameExp", "lvlOfWorld", "favoriteElement", "favoriteLocation", "mostWishesCharacter"];
const titlesArray = require('./dictionaries/titles');

const log = intel.getLogger("genshin");

bot.onText(/(?:^|\s)\/start/, (msg) => {
    sessions[msg.from.id] = {
        userChatData: (sessions[msg.from.id] && sessions[msg.from.id].userChatData) || {},
        user: (sessions[msg.from.id] && sessions[msg.from.id].user) || {...userTemplate}
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
    session.user = session.user || {...userTemplate};

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
        })
    }
});

bot.onText(/(?:^|\s)\/set(.*?)\b/, (msg, regResult) => {
    let regResultStr = regResult[1];

    let session = sessions[msg.from.id];
    session.userChatData = session.userChatData || {};
    session.user = session.user || {...userTemplate};

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

let timerTitleCallback;

bot.onText(/(?:^|\s)\/title\b/, (msg) => {
    let session = sessions[msg.from.id];
    session.userChatData = session.userChatData || {};
    session.user = session.user || {...userTemplate};

    bot.deleteMessage(msg.chat.id, msg.message_id);

    if (!session.userChatData) {
        bot.getChatMember(msg.chat.id, msg.from.id)
            .then((user) => {
                session.userChatData = user;
            })
            .catch(e => console.error(e));
    }

    function getTitle() {
        function getRandomIndex(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        let title = titlesArray[getRandomIndex(0, titlesArray.length - 1)];

        titles.unshift({title: title, user: session.userChatData.user.username});

        while (titles.length > 10) {
            titles.pop();
        }

        return title;
    }

    function titleMessage() {
        let newDate = Math.round(new Date().getTime() / 1000);
        if (!timerTitleCallback || (newDate - timerTitleCallback) >= 0) {
            timerTitleCallback = Math.round(new Date().getTime() / 1000 + 70);
            return `Сегодня ты, @${session.userChatData.user.username}, ${getTitle()}!`;
        } else {
            if ((timerTitleCallback - newDate) < 60) {
                return `Команду можно вызывать раз в 10 минут. Осталось: ${(timerTitleCallback - newDate)} сек`;
            } else if ((timerTitleCallback - newDate) > 60) {
                return `Команду можно вызывать раз в 10 минут. Осталось: ${Math.round((timerTitleCallback - newDate) / 60)} мин`;
            }
        }
    }

    sendMessage(msg.chat.id, titleMessage(), {
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
    let session = sessions[msg.from.id];
    session.userChatData = session.userChatData || {};
    session.user = session.user || {...userTemplate};

    bot.deleteMessage(msg.chat.id, msg.message_id);

    if (!session.userChatData) {
        bot.getChatMember(msg.chat.id, msg.from.id)
            .then((user) => {
                session.userChatData = user;
            })
            .catch(e => console.error(e));
    }

    function titlesMessage() {
        let str = "";

        for (let title of Object.values(titles)) {
            str += `${title.user}: ${title.title}`;
        }

        return str;
    }

    sendMessage(msg.chat.id, titlesMessage(), {
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
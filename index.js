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
const swordResult = require('./functions/sword/swordResult');
const swordsMessage = require('./functions/sword/swordsMessage');

const log = intel.getLogger("genshin");

bot.setMyCommands([
    {command: "start", description: "Нажми, чтобы увидеть инфо о группе"},
    {command: "menu", description: "Нажми, чтобы заполнить анкету о себе"},
    {command: "title", description: "Нажми, чтобы получить случайный титул"},
    {command: "titles", description: "Нажми, чтобы получить список титулов группы"},
], {
    scope: {type: "chat", chat_id: -1001526751940}
}).then(() => {
    bot.onText(/(?:^|\s)\/start/, async (msg) => {
        await getSession(sessions, msg.chat.id, msg.from.id);

        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, `${dictionary["ru"].index}`, {
            disable_notification: true,
            reply_markup: {
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

    bot.onText(/(?:^|\s)\/menu/, async (msg) => {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let session = await getSession(sessions, msg.chat.id, msg.from.id);
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

    bot.onText(/(?:^|\s)\/set(.*?)\b/, async (msg, regResult) => {
        let regResultStr = regResult[1];
        let session = await getSession(sessions, msg.chat.id, msg.from.id);

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

    bot.onText(/(?:^|\s)\/title\b/, async (msg) => {
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, titleMessage(msg.chat.id, session), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    });

    bot.onText(/(?:^|\s)\/titles/, async (msg) => {
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, titlesMessage(titles[msg.chat.id]), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    });
}).catch(e => console.error(e));

bot.setMyCommands([
    {command: "sword", description: "Нажми, чтобы увеличить свой меч"},
    {command: "all_swords", description: "Нажми, чтобы увидеть список мечей всей группы"},
], {
    scope: {type: "all_group_chats"}
}).then(() => {
    bot.onText(/(?:^|\s)\/sword\b/, async (msg) => {
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${swordResult(session)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    });

    bot.onText(/(?:^|\s)\/all_swords\b/, async (msg) => {
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${swordsMessage(sessions[msg.chat.id])}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    });
}).catch(e => console.error(e));


bot.on("callback_query", async (callback) => {
    let session = await getSession(sessions, callback.message.chat.id, callback.from.id);
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
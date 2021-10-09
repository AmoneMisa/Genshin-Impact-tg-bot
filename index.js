const callbacks = require('./callbacks');
const bot = require('./bot');
const {chat, myId} = require('./config');

const dictionary = require('./dictionaries/main');
const translation = require('./dictionaries/translate');
const buttonsDictionary = require('./dictionaries/buttons');
const commands = require('./dictionaries/commands');

// const {sessions, titles, bosses} = require('./data');
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
const resetSwordTimer = require('./functions/sword/resetSwordTimer');
// const bossHP = require('./functions/boss/bossHP');
// const bossUsersDamage = require('./functions/boss/bossUsersDamage');
// const bossUserSetDamage = require('./functions/boss/bossUserSetDamage');
// const bossGetStats = require('./functions/boss/bossGetStats');
// const bossGetLoot = require('./functions/boss/bossGetLoot');
// const bossShop = require('./functions/boss/bossShop');
// const bossShopSellItem = require('./functions/boss/bossShopSellItem');

const log = intel.getLogger("genshin");

bot.setMyCommands([
    {command: "start", description: "Инфо о группе"},
    {command: "menu", description: "Заполнить анкету о себе"},
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "all_swords", description: "Список мечей всей группы"}
], {
    scope: {type: "default"}
});

bot.setMyCommands([
    {command: "reset_sword_timer", description: "Сбросить таймер меча"},
    {command: "get_chat_data", description: "Получить данные чата"},
    {command: "get_user_data", description: "Получить данные пользователя"},
    {command: "start", description: "Инфо о группе"},
    {command: "menu", description: "Заполнить анкету о себе"},
    {command: "title", description: "Получить случайный титул"},
    {command: "titles", description: "Список титулов группы"},
    {command: "sword", description: "Увеличить свой меч"},
    {command: "all_swords", description: "Список мечей всей группы"}
], {
    scope: {type: "chat_member", chat_id: chat, user_id: myId}
});

// bot.setMyCommands([
//     {command: "start", description: "Инфо о группе"},
//     {command: "menu", description: "Заполнить анкету о себе"},
//     {command: "title", description: "Получить случайный титул"},
//     {command: "titles", description: "Список титулов группы"},
//     {command: "sword", description: "Увеличить свой меч"},
//     {command: "all_swords", description: "Список мечей всей группы"},
    // {command: "summon_boss", description: "Призвать босса"},
    // {command: "boss_show_hp", description: "Показать Хп босса"},
    // {command: "damage_the_boss", description: "Нанести урон боссу"},
    // {command: "boss_my_stats", description: "Моя статистика"},
    // {command: "boss_shop", description: "Магазин"},
// ], {
//     // scope: {type: "chat", chat_id: -585920926}
//     scope: {type: "chat", chat_id: chat }
// });

bot.onText(/(?:^|\s)\/start/, async (msg) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /start\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/menu/, async (msg) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /menu\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/set(.*?)\b/, async (msg, regResult) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /set${regResult[1]}\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/title\b/, async (msg) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /title\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/titles/, async (msg) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /titles\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/sword\b/, async (msg) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /sword\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/all_swords\b/, async (msg) => {
    try {
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
    } catch (e) {
        sendMessage(myId, `Command: /all_swords\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/reset_sword_timer\b/, async (msg) => {
    try {
        if (msg.from.id !== myId) {
            return ;
        }
        await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);
        await resetSwordTimer(sessions);
        sendMessage(myId, "Сессии сброшены.");

    } catch (e) {
        sendMessage(myId, `Command: /reset_sword_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});

bot.onText(/(?:^|\s)\/get_chat_data\b/, async (msg) => {
    try {
        if (msg.from.id !== myId) {
            return;
        }

        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(myId, `Данные из чата: ${msg.chat.id} - ${msg.chat.title};\n\nmsg: ${msg}\n\n${await bot.getChat(msg.chat.id)}`);

    } catch (e) {
        sendMessage(myId, `Command: /get_chat_data\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});


bot.onText(/(?:^|\s)\/get_user_data(.*?)\b/, async (msg, regResult) => {
    try {
        if (msg.from.id !== myId) {
            return;
        }

        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(myId, `Данные из чата: ${msg.chat.id} - ${msg.chat.title};\n\nmsg: ${msg}\n\n${await bot.getChatMember(msg.chat.id, regResult[1])}`);

    } catch (e) {
        sendMessage(myId, `Command: /get_chat_data\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
});
//
// bot.onText(/(?:^|\s)\/summon_boss\b/, async (msg) => {
//     try {
//         await getSession(sessions, msg.chat.id, msg.from.id);
//         bot.deleteMessage(msg.chat.id, msg.message_id);
//
//         sendMessage(msg.chat.id, `${await bossHP(msg.chat.id, bosses, sessions[msg.chat.id])}`, {
//             disable_notification: true,
//             reply_markup: {
//                 inline_keyboard: [[{
//                     text: buttonsDictionary["ru"].close,
//                     callback_data: "close"
//                 }]]
//             }
//         });
//     } catch (e) {
//         sendMessage(myId, `In: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
//     }
// });
//
// bot.onText(/(?:^|\s)\/damage_the_boss\b/, async (msg) => {
//     try {
//         let session = await getSession(sessions, msg.chat.id, msg.from.id);
//         bot.deleteMessage(msg.chat.id, msg.message_id);
//
//         let callbackSendMessage = (message) => sendMessage(msg.chat.id, message, {
//             disable_notification: true,
//             reply_markup: {
//                 inline_keyboard: [[{
//                     text: buttonsDictionary["ru"].close,
//                     callback_data: "close"
//                 }]]
//             }
//         });
//
//         let boss = bosses[msg.chat.id];
//
//         if (bossUserSetDamage(session, boss, callbackSendMessage)) {
//             bossGetLoot(boss, sessions[msg.chat.id], callbackSendMessage);
//         }
//     } catch (e) {
//         sendMessage(myId, `In: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
//     }
// });
//
// bot.onText(/(?:^|\s)\/boss_show_hp\b/, async (msg) => {
//     try {
//         await getSession(sessions, msg.chat.id, msg.from.id);
//         bot.deleteMessage(msg.chat.id, msg.message_id);
//
//         sendMessage(msg.chat.id, `${bossUsersDamage(bosses[msg.chat.id], sessions[msg.chat.id])}`, {
//             disable_notification: true,
//             reply_markup: {
//                 inline_keyboard: [[{
//                     text: buttonsDictionary["ru"].close,
//                     callback_data: "close"
//                 }]]
//             }
//         });
//     } catch (e) {
//         sendMessage(myId, `In: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
//     }
// });
//
// bot.onText(/(?:^|\s)\/boss_my_stats\b/, async (msg) => {
//     try {
//         let session = await getSession(sessions, msg.chat.id, msg.from.id);
//         bot.deleteMessage(msg.chat.id, msg.message_id);
//
//         sendMessage(msg.chat.id, `${bossGetStats(session)}`, {
//             disable_notification: true,
//             reply_markup: {
//                 inline_keyboard: [[{
//                     text: buttonsDictionary["ru"].close,
//                     callback_data: "close"
//                 }]]
//             }
//         });
//     } catch (e) {
//         sendMessage(myId, `In: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
//     }
// });
//
// bot.onText(/(?:^|\s)\/boss_shop\b/, async (msg) => {
//     try {
//         let session = await getSession(sessions, msg.chat.id, msg.from.id);
//         bot.deleteMessage(msg.chat.id, msg.message_id);
//         bossShop(msg.chat.id, session);
//     } catch (e) {
//         sendMessage(myId, `In: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
//     }
// });
//
// bot.onText(/(?:^|\s)\/buy_(.*?)\b/, async (msg, regResult) => {
//     try {
//         let regResultStr = regResult[1];
//         console.log(regResultStr);
//         let session = await getSession(sessions, msg.chat.id, msg.from.id);
//         bot.deleteMessage(msg.chat.id, msg.message_id);
//         sendMessage(msg.chat.id, bossShopSellItem(session, regResultStr), {
//             disable_notification: true,
//             reply_markup: {
//                 inline_keyboard: [[{
//                         text: buttonsDictionary["ru"].close,
//                         callback_data: "close"
//                     }]
//                 ]
//             }
//         });
//
//     } catch (e) {
//         sendMessage(myId, `In: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
//     }
// });

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
    // fs.writeFileSync("./bosses.json", JSON.stringify(bosses));
    bot.stopPolling();
}

process.on('SIGTERM', shutdown);

process.on('SIGINT', shutdown);
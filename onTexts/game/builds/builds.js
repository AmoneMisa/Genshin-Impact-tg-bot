const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const getBuildList = require('../../../functions/game/builds/getBuildList');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/(?:^|\s)\/builds\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let session = await getSession(msg.chat.id, msg.from.id);
        let id;

        if (!session.game.hasOwnProperty('builds')) {
            session.game.builds = {
                palace: {},
                goldMine: {}
            };
        }

        let buildsList = await getBuildList(msg.chat.id, msg.from.id);
        let buttons = [];
        let tempArray = null;
        let i = 0;

        if (buildsList.length) {
            for (let [key, build] of Object.entries(buildsList)) {
                if (i % 3 === 0) {
                    tempArray = [];
                    buttons.push(tempArray);
                }
                tempArray.push({text: build.name, callback_data: `builds.${key}`});
                i++;
            }
        }

        sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [...buttons]
            }
        }).then(message => id = message.message_id);
    } catch (e) {
        sendMessage(myId, `Command: /builds\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];
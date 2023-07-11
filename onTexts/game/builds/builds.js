const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const getBuildList = require('../../../functions/game/builds/getBuildList');
const getBuildListFromTemplate = require('../../../functions/game/builds/getBuildFromTemplate');
const getUserName = require('../../../functions/getters/getUserName');
const buildsTemplate = require('../../../templates/buildsTemplate');
const buttonsDictionary = require("../../../dictionaries/buttons");

module.exports = [[/(?:^|\s)\/builds\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let session = await getSession(msg.chat.id, msg.from.id);
        let id;

        let buildsList = await getBuildList(msg.chat.id, msg.from.id);
        let defaultBuilds = getBuildListFromTemplate();
        for (let [key, build] of Object.entries(defaultBuilds)) {
            if (buildsList[key]) {
                continue;
            }

            buildsList[key] = build;
        }

        let buttons = [];
        let tempArray = null;
        let i = 0;

        if (Object.entries(buildsList).length) {
            for (let [key, build] of Object.entries(buildsList)) {
                if (i % 3 === 0) {
                    tempArray = [];
                    buttons.push(tempArray);
                }

                tempArray.push({text: buildsTemplate[key].name, callback_data: `builds.${key}`});
                i++;
            }
        }

        buttons.push([{
            text: buttonsDictionary["ru"].close,
            callback_data: "close"
        }]);

        sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери здание, с которым хочешь взаимодействовать`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: buttons
            }
        }).then(message => id = message.message_id);
    } catch (e) {
        sendMessage(myId, `Command: /builds\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];
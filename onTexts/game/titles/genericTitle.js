const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getUserName = require("../../../functions/getters/getUserName");
const getRandom = require("../../../functions/getters/getRandom");
const getMembers = require("../../../functions/getters/getMembers");
const getTime = require("../../../functions/getters/getTime");
const getStringRemainTime = require("../../../functions/getters/getStringRemainTime");
const data = require("../../../data");
const {openAIApiKey} = require("../../../config");
const axios = require("axios");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");

module.exports = [[/(?:^|\s)\/title/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let message;
    let members = getMembers(msg.chat.id);
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided);
    let randomMember = filteredMembers[getRandom(0, filteredMembers.length - 1)];

    async function getFunnyTitle() {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            prompt: "Сгенерируй смешной титул 18+",
            model: "davinci-002\t\n",
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                "Content-Type": "application/json"
            }
        });

        return response.data.choices[0].text.trim();
    }

    let title = await getFunnyTitle();
    if (!title) {
        debugMessage("Произошла ошибка при попытке сгенерировать титул");
        return;
    }

    if (!session.timerTitleCallback || new Date().getTime() >= session.timerTitleCallback) {
        session.timerTitleCallback = new Date().getTime() + 10 * 60 * 1000;
        message = `Сегодня ты, @${getUserName(randomMember, "nickname")} - ${await getFunnyTitle()}`;

        if (!data.titles[msg.chat.id]) {
            data.titles[msg.chat.id] = [];
        }

        data.titles[msg.chat.id].unshift(message.replace("@", ""));

        while (data.titles[msg.chat.id].length > 15) {
            data.titles[msg.chat.id].pop();
        }

    } else {
        let [remain] = getTime(session.timerTitleCallback);
        message = `@${getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${getStringRemainTime(remain)}`;
    }

    await sendMessageWithDelete(msg.chat.id, message, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, 60 * 1000);
}]];
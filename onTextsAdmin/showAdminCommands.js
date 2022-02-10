const sendMessage = require('../functions/sendMessage');
const bot = require('../bot');
const debugMessage = require('../functions/debugMessage');
const getMembers = require('../functions/getMembers');

module.exports = [[/(?:^|\s)\/admin_commands\b/, async (msg) => {
        try {
            let members = getMembers(msg.chat.id);
            if (members[msg.from.id].userChatData.status !== "administrator" && members[msg.from.id].userChatData.status !== "creator") {
                return;
            }

            bot.deleteMessage(msg.chat.id, msg.message_id);
            sendMessage(msg.from.id, "/kill - Убить босса\n" +
                "/set_user_chest_timer - Сбросить таймер сундучка для пользователя\n" +
                "/add_crystals - Добавить кристаллов пользователю\n" +
                "/add_experience - Добавить опыт пользователю\n" +
                "/add_gold - Добавить золота пользователю\n" +
                "/reset_point_game - Сбросить игру в очко\n" +
                "/set_user_sword_timer - Сбросить таймер меча для пользователя\n"
            );

        } catch (e) {
            debugMessage(`Command: /admin_commands\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
            throw e;
        }
    }
]];
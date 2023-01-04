const sendMessage = require('../functions/sendMessage');
const bot = require('../bot');
const debugMessage = require('../functions/debugMessage');
const getMemberStatus = require("../functions/getMemberStatus");

module.exports = [[/(?:^|\s)\/admin_commands\b/, async (msg) => {
        try {
            if (getMemberStatus(msg.chat.id, msg.from.id)) {
                return;
            }

            bot.deleteMessage(msg.chat.id, msg.message_id);
            sendMessage(msg.from.id, "/kill - Убить босса\n" +
                "/receive_user_chest_timer - Сбросить таймер сундучка для пользователя\n" +
                "/add_crystals - Добавить кристаллов пользователю\n" +
                "/add_experience - Добавить опыт пользователю\n" +
                "/add_gold - Добавить золота пользователю\n" +
                "/reset_point_game - Сбросить игру в очко\n" +
                "/receive_user_sword_timer - Сбросить таймер меча для пользователя"
            );

        } catch (e) {
            debugMessage(`Command: /admin_commands\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
            throw e;
        }
    }
]];
const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const getMemberStatus = require("../functions/getters/getMemberStatus");
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/admin_commands\b/, async (msg) => {
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.from.id, "/kill - Убить босса\n" +
        "/receive_user_chest_timer - Сбросить таймер сундучка для пользователя\n" +
        "/add_crystals - Добавить кристаллов пользователю\n" +
        "/add_experience - Добавить опыт пользователю\n" +
        "/add_gold - Добавить золото пользователю\n" +
        "/add_steal_chance - Добавить попыток грабежа пользователю\n" +
        "/update_characteristics - Пересчитать очки характеристик пользователю или всей группе\n" +
        "/add_iron_ore - Добавить железной руды пользователю\n" +
        "/reset_point_game - Сбросить игру в очко\n" +
        "/reset_elements_game - Сбросить игру в элементы\n" +
        "/receive_user_sword_timer - Сбросить таймер меча для пользователя\n" +
        "/boss_settings - Настройки босса\n" +
        "/settings - Настройки бота"
    );
}]];
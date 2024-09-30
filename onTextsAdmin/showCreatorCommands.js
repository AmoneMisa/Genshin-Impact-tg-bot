import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';
import { myId } from '../config.js';

export default [[/(?:^|\s)\/creator_commands\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.from.id, "/send_file - Отправить файл в корень с бэкапом старого\n" +
        "/get_file filename - Получить файл из корня проекта\n" +
        "/get_debug_log - Получить дебаг лог\n" +
        "/get_chat_data - Информация о чате\n" +
        "/hide_dead_souls - Проставить флаги мёртвым душам\n" +
        "/mark_trusted - Добавить чат и его участников в доверенные\n" +
        "/update_characteristics - Пересчитать очки характеристик пользователю или всей группе\n" +
        "/update_boss_model - Обновить модель боссов\n" +
        "/clear_all_sessions - Почистить сессии пользователей от старых полей\n" +
        "/update_all_players_skills - Обновить модель всех скиллов всех пользователей\n" +
        "/update_all_players_characteristic - Обновить модель всех статов всех пользователей\n" +
        "/reset_sword_timer - Сбросить таймеры мечей у всех пользователей\n"+
        "/clear_titles - Очистить титулы от некорректных данных\n" +
        "/clear_boss_sessions - Очистить сессии боссов\n" +
        "/send_new_updates - Отправить новости по поводу бота\n" +
        "/update_users - Обновить поля пользователей\n"
    );
}]];
import deleteMessage from "../../../functions/tgBotFunctions/deleteMessage.js";
import sendMessage from "../../../functions/tgBotFunctions/sendMessage.js";
import {
    generateShortHoroText, getSignByCode,
    getStyleByKey,
    kbMain,
    kbSign,
    kbStyle
} from "../../../functions/game/horoscope/horoscope.js";
import getChatSession from "../../../functions/getters/getChatSession.js";
import loadPlayer from "../../../functions/getters/loadPlayer.js";

export default [[/^horo\.menu\.sign$/, async (session, callback) => {
    const chatId = callback.message.chat.id;
    const msgId = callback.message.message_id;
    await deleteMessage(chatId, msgId).catch(() => {
    });
    const signCode = session.horoscope?.sign || 'aries';
    return sendMessage(chatId, 'Выбери свой знак зодиака:', {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: kbSign(signCode)
    });
}], [/^horo\.menu\.style$/, async (session, callback) => {
    const chatId = callback.message.chat.id;
    const msgId = callback.message.message_id;
    await deleteMessage(chatId, msgId).catch(() => {
    });
    const styleKey = session.horoscope?.style || 'cheeky';
    return sendMessage(chatId, 'Выбери характер ответа:', {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: kbStyle(styleKey)
    });
}], [/^horo\.set\.sign\.[^.]+$/, async (session, callback) => {
    const [, code] = callback.data.match(/^horo\.set\.sign\.([^.]+)$/) || [];

    const chatId = callback.message.chat.id;
    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member) {
        return;
    }
    if (!member.horoscope) {
        member.horoscope = {sign: 'aries', style: 'cheeky'};
    }
    if (code) {
        member.horoscope.sign = code;
    }

    const msgId = callback.message.message_id;
    const text = await generateShortHoroText(member);

    await deleteMessage(chatId, msgId);
    await chat.save();
    return sendMessage(chatId, text, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: kbMain(member)
    });
}], [/^horo\.set\.style\.[^.]+$/, async (session, callback) => {
    const [, key] = callback.data.match(/^horo\.set\.style\.([^.]+)$/) || [];

    const chatId = callback.message.chat.id;
    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member) {
        return;
    }
    if (!member.horoscope) {
        member.horoscope = {sign: 'aries', style: 'cheeky'};
    }
    if (key) {
        member.horoscope.style = key;
    }

    const msgId = callback.message.message_id;
    const text = await generateShortHoroText(member);

    await deleteMessage(chatId, msgId);
    await chat.save();
    return sendMessage(chatId, text, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: kbMain(member)
    });
}], [/^horo\.save$/, async (session, callback) => {
    const sign = getSignByCode(session.horoscope.sign);
    const style = getStyleByKey(session.horoscope.style);

    const chatId = callback.message.chat.id;
    const chat = await getChatSession(chatId);
    const msgId = callback.message.message_id;

    await deleteMessage(chatId, msgId);
    await chat.save();
    return sendMessage(chatId,
        `Сохранил настройки:\n• Знак: ${sign.icon} ${sign.name}\n• Характер ответа: ${style.label}`,
        {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [
                    [{text: 'Изменить знак', callback_data: 'horo.menu.sign'}],
                    [{text: 'Изменить характер', callback_data: 'horo.menu.style'}],
                    [{text: '↩️ Назад', callback_data: 'horo.back'}],
                    [{text: 'Закрыть', callback_data: 'close'}]
                ]
            }
        }
    );
}], [/^horo\.reset$/, async (session, callback) => {
    const chatId = callback.message.chat.id;
    const { chat, member } = await loadPlayer(chatId, session.userId);
    if (!member) {
        return;
    }
    member.horoscope = {sign: 'aries', style: 'cheeky'};

    const msgId = callback.message.message_id;
    const text = await generateShortHoroText(member);

    await deleteMessage(chatId, msgId);
    await chat.save();
    return sendMessage(chatId, `Сброс настроек.\n\n${text}`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: kbMain(member)
    });
}], [/^horo\.back$/, async (session, callback) => {
    const chatId = callback.message.chat.id;
    const msgId = callback.message.message_id;
    const text = await generateShortHoroText(session);

    await deleteMessage(chatId, msgId);
    return sendMessage(chatId, text, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: kbMain(session)
    });
}]
]
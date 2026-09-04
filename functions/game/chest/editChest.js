import bot from "../../../bot.js";
import getEmoji from "../../../functions/getters/getEmoji.js";

export default async function(prizeType, button, session, callback) {
    if (session.chestTries < 1) {
        return;
    }

    session.chestCounter++;

    // ищем кнопку через flatMap + find
    const foundButtonForChange = session.chestButtons
        .flatMap(arr => arr)
        .find(_button => _button.callback_data === button.callback_data);

    if (!foundButtonForChange) {
        throw new Error(`Кнопка с callback_data=${button.callback_data} не найдена`);
    }

    foundButtonForChange.text = getEmoji(prizeType);

    if (!session.chosenChests.includes(button.callback_data)) {
        session.chosenChests.push(button.callback_data);
    }

    try {
        await bot.editMessageReplyMarkup(
            { inline_keyboard: session.chestButtons },
            {
                chat_id: callback.message.chat.id,
                message_id: callback.message.message_id,
            }
        );
    } catch (err) {
        console.error("Ошибка при обновлении клавиатуры сундука:", err);
    }
}
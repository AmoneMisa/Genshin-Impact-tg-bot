import bot from '../../../bot.js';
import getEmoji from '../../../functions/getters/getEmoji.js';

export default async function (prizeType, button, session, callback) {
    if (session.chestTries < 1) {
        return;
    }

    session.chestCounter++;

    let foundButtonForChange;
    for (let buttonsArray of session.chestButtons) {
        for (let _button of buttonsArray) {
            if (_button.callback_data === button.callback_data) {
                foundButtonForChange = _button;
                break;
            }
        }
    }

    foundButtonForChange.text = getEmoji(prizeType);
    session.chosenChests.push(button.callback_data);

    await bot.editMessageReplyMarkup({inline_keyboard: session.chestButtons}, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id
    });
};
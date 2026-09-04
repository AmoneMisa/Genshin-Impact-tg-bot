import Chat from "../../db/models/Chat.js";
import sendMessage from "../../functions/tgBotFunctions/sendMessage.js";
import getMembers from "../../functions/getters/getMembers.js";
import buttonsDictionary from '../../dictionaries/buttons.js';
import controlButtons from "../../functions/keyboard/controlButtons.js";
import buildKeyboard from "../../functions/keyboard/buildKeyboard.js";

export default [[/(?:^|\s)\/send_gold\b/, async (msg) => {
    const chatSession = await Chat.findOne({ chatId: msg.chat.id });

    if (!chatSession) {
        return sendMessage(msg.chat.id, "Чат не найден в базе.");
    }

    let usersList = await getMembers(msg.chat.id).filter(member =>
        member.userId !== msg.from.id &&
        !member.isHided
    );

    if (!usersList.length) {
        await sendMessage(msg.from.id, "Нет никого, кому ты мог бы перевести золото.", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
        return;
    }

    const buttons = buildKeyboard(msg.chat.id, `sendGoldRecipient.${msg.chat.id}`, false, msg.from.id);

    await sendMessage(msg.from.id, "Выбери, кому хочешь перевести золото.", {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: controlButtons(`sendGoldRecipient.${msg.chat.id}`, buttons, 1)
        }
    });
}]];

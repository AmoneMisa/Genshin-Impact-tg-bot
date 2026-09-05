import Chat from "../../../db/models/Chat.js";
import getOffset from "../../getters/getOffset.js";

/**
 * Сбрасывает таймер меча у всех игроков в базе
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (
                member.timerSwordCallback &&
                member.timerSwordCallback > Date.now()
            ) {
                member.timerSwordCallback = getOffset();
                updated = true;
            }
        }

        if (updated) {
            await chat.save();
        }
    }
}

import { myId } from '../../../config.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import resetSwordTimer from '../../../functions/game/sword/resetSwordTimer.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_sword_timer\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }
    await getSession(msg.chat.id, msg.from.id);
    await deleteMessage(msg.chat.id, msg.message_id);
    await resetSwordTimer();
    await sendMessage(myId, "Сессии сброшены.");
}]];
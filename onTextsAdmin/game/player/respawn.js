import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import { myId } from '../../../config.js';
import getSession from '../../../functions/getters/getSession.js';
import getMaxHp from '../../../functions/game/player/getters/getMaxHp.js';

export default [[/(?:^|\s)\/respawn\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    let session = await getSession(msg.chat.id, myId);
    session.game.gameClass.stats.hp = getMaxHp(session, session.game.gameClass);

    await sendMessage(msg.from.id, "Ты воскрес", { disable_notification: true});
}]];
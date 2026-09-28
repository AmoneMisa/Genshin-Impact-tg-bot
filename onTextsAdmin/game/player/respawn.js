import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import { myId } from '../../../config.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import getMaxHp from '../../../functions/game/player/getters/getMaxHp.js';

export default [[/(?:^|\s)\/respawn\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    const { chat, member } = await loadPlayer(msg.chat.id, myId);
    if (!member) {
        return;
    }

    member.game.gameClass.stats.hp = getMaxHp(member, member.game.gameClass);
    await chat.save();

    await sendMessage(msg.from.id, "Ты воскрес", { disable_notification: true});
}]];
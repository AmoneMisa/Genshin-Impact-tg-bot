import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import updateBossModel from '../../../functions/game/boss/updateBossModel.js';

export default [[/(?:^|\s)\/update_boss_model\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    updateBossModel();
    return sendMessage(myId, "Боссы обновлены. Убедиться в результате можно по команде /get_file bosses.json");
}]];
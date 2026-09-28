import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../../../config.js';
import Boss from '../../../db/models/Boss.js';
import Chat from '../../../db/models/Chat.js';

export default [[/(?:^|\s)\/clear_boss_sessions\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    let removed = 0;
    const bosses = await Boss.find({});

    for (const boss of bosses) {
        const chat = await Chat.findOne({ chatId: boss.chatId });

        // Remove bosses whose chat no longer exists or which have no real player base
        // (e.g. a private/DM session with a single member).
        if (!chat || chat.members.length <= 1) {
            await boss.deleteOne();
            removed++;
        }
    }

    await sendMessage(myId, `Очищено boss-сессий: ${removed}.`);
}]];
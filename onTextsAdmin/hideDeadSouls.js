import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import hideDeadSouls from '../functions/misc/hideDeadSouls.js';
import { myId } from '../config.js';

export default [[/(?:^|\s)\/hide_dead_souls\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await hideDeadSouls();
    await sendMessage(myId, "Мёртвые души отфильтрованы.", {});
}]];

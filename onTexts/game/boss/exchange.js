import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../../functions/getters/getUserName.js';
import getEmoji from '../../../functions/getters/getEmoji.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

const CRYSTAL_PRICE = 1500;

export default [[/(?:^|\s)\/exchange ([0-9]+)\b/, async (msg, session, [, amount]) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    const crystals = Math.round(parseInt(amount, 10));
    const totalCost = crystals * CRYSTAL_PRICE;

    if (session.game.inventory.gold < totalCost) {
        return sendMessageWithDelete(
            msg.from.id,
            `${await getUserName(session, "nickname")}, у тебя не хватает ${totalCost - session.game.inventory.gold} золота для этой покупки`,
            {},
            10 * 1000
        );
    }

    session.game.inventory.gold -= totalCost;
    session.game.inventory.crystals = Number(session.game.inventory.crystals) || 0;
    session.game.inventory.crystals += crystals;

    await session.save();

    return sendMessageWithDelete(
        msg.from.id,
        `Ты купил ${getEmoji("crystals")} ${crystals} кристаллов.`,
        { disable_notification: true },
        10 * 1000
    );
}]];
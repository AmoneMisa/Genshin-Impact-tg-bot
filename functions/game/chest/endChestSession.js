import deleteMessageTimeout from "../../../functions/tgBotFunctions/deleteMessageTimeout.js";

const MAX_CHESTS_OPENED = 2;

function resetChestState(session) {
    session.chestCounter = 0;
    session.chosenChests = [];
    session.chestButtons = [];
    session.chestTries = 0;
}

export default function handleChestReset(session, callback) {
    if (session.chestCounter > MAX_CHESTS_OPENED) {
        resetChestState(session);

        if (callback?.message?.chat?.id && callback?.message?.message_id) {
            deleteMessageTimeout(
                callback.message.chat.id,
                callback.message.message_id,
                15 * 1000
            );
        }
    }
}

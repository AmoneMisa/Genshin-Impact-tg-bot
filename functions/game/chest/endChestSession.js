import getOffset from '../../getters/getOffset.js';
import deleteMessageTimeout from '../../../functions/tgBotFunctions/deleteMessageTimeout.js';

export default function (session, callback) {
    if (session.chestCounter > 2) {
        session.chestCounter = 0;
        session.chosenChests = [];
        session.chestButtons = [];
        session.chestTries = 0;
        deleteMessageTimeout(callback.message.chat.id, callback.message.message_id, 15 * 1000);
    }
};
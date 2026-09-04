import { sessions } from '../../data.js';
import gachaTemplate from '../../template/gachaTemplate.js';
import normalizeGachaState, { ensureGachaEntry } from '../game/equipment/normalizeGachaState.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData?.user?.is_bot) {
                continue;
            }

            normalizeGachaState(session);
            for (let value of gachaTemplate) {
                let entry = ensureGachaEntry(session, value.name);
                entry.freeSpins = value.freeSpins;
            }
        }
    }
}
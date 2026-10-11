import getGameClass from './getters/getGameClassFromTemplate.js';
import {syncAutomaticPassives} from './passiveSkills.js';

export default function (session, classStats) {
    session.game.gameClass = getGameClass(classStats.name || classStats);
    syncAutomaticPassives(session);
};

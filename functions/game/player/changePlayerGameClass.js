import {placeNewCharacter} from '../world/creation.js';
import getGameClass from './getters/getGameClassFromTemplate.js';
import {syncAutomaticPassives} from './passiveSkills.js';

export default function (session, classStats, options={}) {
    const first=session.game.gameClass?.stats?.name==='noClass';
    session.game.gameClass = getGameClass(classStats.name || classStats);
    syncAutomaticPassives(session);
    if(first)placeNewCharacter(session,session.game.gameClass.stats.name,options);
};

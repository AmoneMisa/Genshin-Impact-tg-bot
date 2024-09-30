import getGameClass from './getters/getGameClassFromTemplate.js';

export default function (session, classStats) {
    session.game.gameClass = getGameClass(classStats.name || classStats);
};
const enter = require('../../../functions/game/general/enter');

module.exports = [[/points_enter$/, async (session, callback) => {
    enter(session, callback, "points");
}]];
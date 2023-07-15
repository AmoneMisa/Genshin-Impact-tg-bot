const leave = require('../../../functions/game/general/leave');

module.exports = [[/points_leave$/, async (session, callback) => {
    leave(session, callback, "points");
}]];
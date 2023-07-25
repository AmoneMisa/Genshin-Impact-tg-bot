const leave = require('../../../functions/game/general/leave');

module.exports = [[/elements_leave$/, async (session, callback) => {
    await leave(session, callback, "elements");
}]];
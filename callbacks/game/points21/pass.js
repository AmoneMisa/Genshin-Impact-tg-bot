const pass = require('../../../functions/game/general/pass');

module.exports = [[/points_pass$/, async (session, callback) => {
    await pass(session, callback, "points");
}]];
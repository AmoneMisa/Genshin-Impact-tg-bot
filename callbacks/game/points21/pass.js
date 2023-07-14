const pass = require('../../../functions/game/general/pass');

module.exports = [[/points_pass$/, async (session, callback) => {
    pass(session, callback, "points");
}]];
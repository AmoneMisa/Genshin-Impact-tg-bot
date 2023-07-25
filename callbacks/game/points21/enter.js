const enter = require('../../../functions/game/general/enter');

module.exports = [[/points_enter$/, (session, callback) => {
    enter(session, callback, "points");
}]];
const enter = require('../../../functions/game/general/enter');

module.exports = [[/elements_enter$/, (session, callback) => {
    enter(session, callback, "elements");
}]];
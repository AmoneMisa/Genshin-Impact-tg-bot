import enter from '../../../functions/game/general/enter.js';

export default [[/points_enter$/, (session, callback) => {
    enter(session, callback, "points");
}]];
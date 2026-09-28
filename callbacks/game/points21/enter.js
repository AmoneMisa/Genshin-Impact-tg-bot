import enter from '../../../functions/game/general/enter.js';

export default [[/points_enter$/, async (session, callback) => {
    await enter(callback, "points");
}]];
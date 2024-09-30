import pass from '../../../functions/game/general/pass.js';

export default [[/points_pass$/, async (session, callback) => {
    await pass(session, callback, "points");
}]];
import leave from '../../../functions/game/general/leave.js';

export default [[/points_leave$/, async (session, callback) => {
    await leave(session, callback, "points");
}]];
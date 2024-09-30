import leave from '../../../functions/game/general/leave.js';

export default [[/elements_leave$/, async (session, callback) => {
    await leave(session, callback, "elements");
}]];
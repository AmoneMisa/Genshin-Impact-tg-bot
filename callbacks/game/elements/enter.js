import enter from '../../../functions/game/general/enter.js';

export default [[/elements_enter$/, async (session, callback) => {
    await enter(callback, "elements");
}]];
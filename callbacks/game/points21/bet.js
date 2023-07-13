const takeBet = require('../../../functions/game/general/bet');

module.exports = [[/^points_(?:bet|double_bet|xfive_bet|10t_bet|thousand_bet|xten_bet|allin_bet|x20_bet|x50_bet)$/, (session, callback) => {
    const [,  betType] = callback.data.match(/^points_(bet|double_bet|xfive_bet|10t_bet|thousand_bet|xten_bet|allin_bet|x20_bet|x50_bet)$/);

    takeBet(callback, session, "points", betType);
}]];
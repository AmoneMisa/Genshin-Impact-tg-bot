import takeBet from '../../../functions/game/general/bet.js';

export default [[/^elements_(?:bet|double_bet|xfive_bet|10t_bet|thousand_bet|xten_bet|allin_bet|x20_bet|x50_bet)$/, async (session, callback) => {
    const [, betType] = callback.data.match(/^elements_(bet|double_bet|xfive_bet|10t_bet|thousand_bet|xten_bet|allin_bet|x20_bet|x50_bet)$/);

    await takeBet(callback, session, "elements", betType);
}]];
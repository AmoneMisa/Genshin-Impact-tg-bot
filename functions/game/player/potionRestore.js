// Potions used to restore a flat 1000 / 3000 / 8000 hp (180 / 300 mp), which is half a
// level 5 character and 3% of a level 60 one - useless in the fights they are for. A potion
// now restores the larger of its flat power and a share of the player's maximum, so low
// levels are unchanged and high levels get a potion that still matters. Elixirs were
// already percentages.
export const POTION_SHARE = Object.freeze({
    hp: {little: 0.04, small: 0.10, medium: 0.22},
    mp: {little: 0.06, small: 0.10},
});

/** Share of the maximum a flat potion restores (0 when it is a pure flat or an elixir). */
export function potionShare(potion) {
    if (potion?.bottleType === 'elixir') return 0;
    return POTION_SHARE[potion?.type]?.[potion?.size] || 0;
}

/** Points restored before the player's heal-power gear is applied. */
export default function potionRestore(potion, maxValue) {
    const power = Number(potion?.power) || 0;
    if (potion?.bottleType === 'elixir') return maxValue * power / 100;
    return Math.max(power, Math.round(maxValue * potionShare(potion)));
}

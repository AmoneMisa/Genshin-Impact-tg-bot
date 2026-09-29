// Arena season ladder: pure data from the weekly prize template, kept free of
// bot / database imports so it can be used (and tested) on its own.
import arenaWeeklyPrizes from '../template/arenaWeeklyPrizes.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Season ladder for the arena screen: every rank from lowest to highest with its
 * weekly arena-token reward, the player's current one marked.
 */
export function arenaLadder(rank) {
  const index = arenaWeeklyPrizes.findIndex(item => item.rank === rank);
  return {
    ranks: arenaWeeklyPrizes.map((item, i) => ({ rank: item.rank, reward: number(item.reward), current: i === index })),
    weeklyReward: index >= 0 ? number(arenaWeeklyPrizes[index].reward) : 0,
    nextRank: index >= 0 && index < arenaWeeklyPrizes.length - 1 ? arenaWeeklyPrizes[index + 1].rank : null,
  };
}

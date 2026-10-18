// Stakes of online games between players: the currency and the amount in one choice, e.g. `gold:1000`.
export const STAKE_UNITS = { gold: 'адены', luckCoins: 'CoL' };
export const stakeText = ({ currency, amount }) => `${amount.toLocaleString('ru-RU')} ${STAKE_UNITS[currency]}`;
export const STAKE_CHOICES = [['', 'Без ставки'], ...[100, 1000, 10000, 100000, 1000000].map(amount => [`gold:${amount}`, stakeText({ currency: 'gold', amount })]), ...[5, 10, 50, 100].map(amount => [`luckCoins:${amount}`, stakeText({ currency: 'luckCoins', amount })])];

/** The stake of a choice as the server expects it, or nothing. */
export function stakeBodyOf(choice) {
  const [currency, amount] = String(choice || '').split(':');
  return currency ? { stake: { currency, amount: Number(amount) } } : {};
}

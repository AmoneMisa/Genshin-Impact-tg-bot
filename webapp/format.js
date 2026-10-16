// Shared number formatting for the Mini App screens.
const numbers = new Intl.NumberFormat('ru-RU');

export function formatNumber(value) {
  return numbers.format(Number(value) || 0);
}

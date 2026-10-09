import { worldIconHtml } from './art/world-art.js';
import { icon } from './icons.js';

/** The Coin of Luck icon (a reviewed painting); the clover emoji until the art is available. */
export function luckCoinHtml(size = 16) {
  const html = worldIconHtml('currency/luck-coin', size);
  return html ? html.replace('world-painted-icon', 'world-painted-icon luck-coin-icon') : icon('coin','luck-coin-icon');
}

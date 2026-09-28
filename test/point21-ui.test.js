import test from 'node:test';
import assert from 'node:assert/strict';
import { cardHtml, cardBackHtml, clampBet } from '../webapp/point21.js';

test('cards render rank and suit corners, red suits and the deal animation flag', () => {
  const html = cardHtml('10 ♥', { fresh: true, delay: 280 });
  assert.match(html, /point-card red fresh/);
  assert.match(html, /--d:280ms/);
  assert.equal((html.match(/<b>10<i>♥<\/i><\/b>/g) || []).length, 2);
  assert.doesNotMatch(cardHtml('K ♠'), /red|fresh/);
  assert.match(cardBackHtml(), /point-card back/);
});

test('bet stepper clamps to whole coins within the balance', () => {
  assert.equal(clampBet(700, 12450), 700);
  assert.equal(clampBet(-100, 12450), 0);
  assert.equal(clampBet(99999, 12450.7), 12450);
  assert.equal(clampBet('abc', 100), 0);
});

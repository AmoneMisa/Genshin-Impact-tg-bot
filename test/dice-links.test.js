import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiceEntry, diceAppLink } from '../webapp/dice-links.js';

const token = '12345678-1234-1234-1234-123456789abc';

test('dice invitation links keep one format and only point at Telegram', () => {
  assert.deepEqual(parseDiceEntry(`dice_i_${token}`), { token });
  assert.equal(parseDiceEntry('dice_i_nope'), null);
  assert.equal(parseDiceEntry(`gwent_g_i_${token}`), null);
  const url = diceAppLink('https://t.me/test_bot/game', token);
  assert.equal(new URL(url).searchParams.get('startapp'), `dice_i_${token}`);
  assert.equal(diceAppLink('https://evil.test/game', token), null);
  assert.equal(diceAppLink(null, token), null);
});

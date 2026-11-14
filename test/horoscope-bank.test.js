import test from 'node:test';
import assert from 'node:assert/strict';
import BANK from '../template/horoscopeSarcasm.js';
import { generateShortHoroText, pickBankLine, BANK_SHARE } from '../functions/game/horoscope/horoscope.js';

const player = () => ({ userChatData: { user: { username: 'WhitesLove' } }, horoscope: { sign: 'virgo', style: 'sarcastic' } });

test('the sarcasm bank is large, unique and fits a chat message', () => {
  assert.ok(BANK.length >= 90);
  assert.equal(new Set(BANK).size, BANK.length);
  for (const line of BANK) assert.ok(line.length <= 160 && /[А-Яа-яЁё]/.test(line), line);
});

test('bank lines do not repeat for a player until the recent window is used up', async () => {
  const session = player();
  const seen = [];
  for (let i = 0; i < 40; i++) {
    const text = await generateShortHoroText(session, { random: () => (i * 0.37) % BANK_SHARE });
    assert.match(text, /^Предсказание для @WhitesLove:\n\n/);
    seen.push(text.split('\n\n').at(-1));
  }
  assert.equal(new Set(seen).size, 40, 'forty different lines in a row');
  assert.equal(session.horoscope.recent.length, 40);
  assert.ok(seen.every(line => BANK.includes(line)));
});

test('a picked line avoids the recent ones and never repeats the last one', () => {
  const recent = BANK.slice(0, BANK.length - 1);
  assert.equal(pickBankLine(BANK, recent, () => 0), BANK.at(-1));
  assert.notEqual(pickBankLine(BANK, [...BANK], () => 0.99), BANK.at(-1));
});

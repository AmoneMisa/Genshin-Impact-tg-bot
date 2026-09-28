import test from 'node:test';
import assert from 'node:assert/strict';
import { claimBonus, getBonusState } from '../miniapp/bonus.js';
import { eligibleTitleMembers, getTitleCooldown, normalizeTitle } from '../miniapp/titles.js';
import { getHoroscopeState, updateHoroscopeSettings } from '../miniapp/horoscope.js';

function session(chances = 1) {
  return {
    game: {
      bonusChances: chances,
      inventory: { gold: 100, crystals: 10, ironOre: 5 },
    },
  };
}

test('bonus keeps legacy prize chances and mutates only server session', () => {
  const player = session(1);
  const values = [0, 57_500];
  const result = claimBonus(player, { randomInt: () => values.shift() });

  assert.equal(result.ok, true);
  assert.equal(result.prize.name, 'gold');
  assert.equal(result.prize.amount, 57_500);
  assert.equal(player.game.inventory.gold, 57_600);
  assert.equal(player.game.bonusChances, 0);
});

test('bonus rejects exhausted daily attempts without mutation', () => {
  const player = session(0);
  const before = structuredClone(player);
  const result = claimBonus(player, { randomInt: () => { throw new Error('RNG must not run'); } });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_chances');
  assert.deepEqual(player, before);
  assert.equal(getBonusState(player).chances, 0);
});

test('titles enforce the legacy one-word alphabetic contract', () => {
  assert.equal(normalizeTitle('Архонт'), 'Архонт');
  assert.equal(normalizeTitle('Archon'), 'Archon');
  assert.equal(normalizeTitle('Лорд Дропа'), null);
  assert.equal(normalizeTitle('Архонт!'), null);
});

test('titles select only visible active human chat members', () => {
  const chat = {
    members: [
      { userId: 1, userChatData: { user: { id: 1, username: 'ok' } } },
      { userId: 2, isHided: true, userChatData: { user: { id: 2 } } },
      { userId: 3, userChatData: { status: 'left', user: { id: 3 } } },
      { userId: 4, userChatData: { user: { id: 4, is_bot: true } } },
    ],
  };
  assert.deepEqual(eligibleTitleMembers(chat).map(member => member.userId), [1]);
});

test('title cooldown is derived from the invoking Mongo member', () => {
  const chat = { members: [{ userId: 7, timerTitleCallback: 11_000 }] };
  assert.equal(getTitleCooldown(chat, 7, 1_000).remainingMs, 10_000);
});

test('horoscope validates persisted sign and style settings', () => {
  const player = {};
  const defaults = getHoroscopeState(player);
  assert.equal(defaults.sign.code, 'aries');
  assert.equal(defaults.style.key, 'cheeky');

  const updated = updateHoroscopeSettings(player, { sign: 'pisces', style: 'sweet' });
  assert.equal(updated.ok, true);
  assert.equal(player.horoscope.sign, 'pisces');
  assert.equal(player.horoscope.style, 'sweet');

  const invalid = updateHoroscopeSettings(player, { sign: 'ophiuchus' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, 'invalid_sign');
  assert.equal(player.horoscope.sign, 'pisces');
});

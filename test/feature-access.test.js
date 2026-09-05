import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCADE_GAME_SETTINGS,
  evaluateMiniAppFeatureAccess,
  getArcadeSettingKey,
  getMiniAppRouteSettingKey,
  isArcadeSettingRoute,
} from '../miniapp/featureAccess.js';

test('Mini App routes preserve the legacy shared setting matrix', () => {
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/forms'), 'form');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/profile'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/skills'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/inventory'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/equipment'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/builds'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/gacha'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/steal'), 'whoami');

  assert.equal(getMiniAppRouteSettingKey('GET', '/api/boss'), 'boss');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/shop'), 'boss');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/exchange'), 'boss');

  assert.equal(getMiniAppRouteSettingKey('GET', '/api/gold-transfer'), 'sendGold');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/point21'), 'points');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/elements'), 'elements');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/chest'), 'chests');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/sword'), 'swords');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/titles'), 'titles');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/horoscope'), 'horoscope');
  assert.equal(getMiniAppRouteSettingKey('GET', '/api/bonus'), 'bonus');
});

test('Mini App feature gate covers mutations as well as read endpoints', () => {
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/forms/save'), 'form');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/profile/class'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/inventory/use'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/equipment/craft'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/gacha/roll'), 'whoami');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/shop/buy'), 'boss');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/gold-transfer/send'), 'sendGold');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/chest/open'), 'chests');
  assert.equal(getMiniAppRouteSettingKey('POST', '/api/sword/roll'), 'swords');
});

test('arcade actions map every game to its independent legacy toggle', () => {
  assert.deepEqual(Object.keys(ARCADE_GAME_SETTINGS).sort(), [
    'basketball', 'bowling', 'darts', 'dice', 'football', 'slots',
  ]);
  for (const [gameId, settingKey] of Object.entries(ARCADE_GAME_SETTINGS)) {
    assert.equal(getArcadeSettingKey(gameId), settingKey);
  }
  assert.equal(getArcadeSettingKey('unknown'), null);
  assert.equal(isArcadeSettingRoute('POST', '/api/arcade/start'), true);
  assert.equal(isArcadeSettingRoute('POST', '/api/arcade/reset'), true);
  assert.equal(isArcadeSettingRoute('POST', '/api/arcade/roll'), true);
  assert.equal(isArcadeSettingRoute('GET', '/api/arcade'), false);
});

test('disabled group setting is rejected with a stable feature_disabled payload', () => {
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({
      chatId: -1001,
      userId: 7,
      settingKey: 'chests',
      settings: { chests: 0 },
    }),
    {
      ok: false,
      status: 403,
      reason: 'feature_disabled',
      settingKey: 'chests',
      error: 'Функция отключена администратором этого чата.',
    },
  );
});

test('enabled, missing and private settings do not block Mini App access', () => {
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: -1, userId: 7, settingKey: 'boss', settings: { boss: 1 } }),
    { ok: true, settingKey: 'boss' },
  );
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: -1, userId: 7, settingKey: 'boss', settings: {} }),
    { ok: true, settingKey: 'boss' },
  );
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: 7, userId: 7, settingKey: 'boss', settings: { boss: 0 } }),
    { ok: true, settingKey: 'boss' },
  );
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: -1, userId: 7, settingKey: null, settings: { boss: 0 } }),
    { ok: true, settingKey: null },
  );
});

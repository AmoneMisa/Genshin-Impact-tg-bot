import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCADE_GAME_SETTINGS,
  MINI_APP_GROUP_ONLY_ROUTES,
  evaluateMiniAppFeatureAccess,
  getArcadeSettingKey,
  getMiniAppRouteSettingKey,
  isArcadeSettingRoute,
  isMiniAppGroupOnlyRoute,
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

test('Mini App preserves the legacy supergroup-only route matrix', () => {
  assert.equal(MINI_APP_GROUP_ONLY_ROUTES.size, 23);

  for (const [method, pathname] of [
    ['GET', '/api/forms'],
    ['POST', '/api/forms/save'],
    ['POST', '/api/profile/gender'],
    ['GET', '/api/gacha'],
    ['POST', '/api/gacha/resolve'],
    ['GET', '/api/steal'],
    ['GET', '/api/boss'],
    ['GET', '/api/shop'],
    ['GET', '/api/exchange'],
    ['GET', '/api/gold-transfer'],
    ['GET', '/api/bonus'],
    ['GET', '/api/titles'],
    ['GET', '/api/sword'],
  ]) {
    assert.equal(isMiniAppGroupOnlyRoute(method, pathname), true, `${method} ${pathname}`);
  }

  // These all sit behind legacy setting keys, but their entry commands were
  // explicitly allowed in private chats.
  for (const [method, pathname] of [
    ['GET', '/api/profile'],
    ['POST', '/api/profile/class'],
    ['GET', '/api/skills'],
    ['GET', '/api/inventory'],
    ['GET', '/api/equipment'],
    ['GET', '/api/builds'],
    ['GET', '/api/chest'],
    ['GET', '/api/point21'],
    ['GET', '/api/elements'],
    ['GET', '/api/horoscope'],
  ]) {
    assert.equal(isMiniAppGroupOnlyRoute(method, pathname), false, `${method} ${pathname}`);
  }
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

test('private group-only routes are rejected before chat settings are considered', () => {
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({
      chatId: 7,
      userId: 7,
      settingKey: 'whoami',
      groupOnly: true,
      settings: { whoami: 1 },
    }),
    {
      ok: false,
      status: 409,
      reason: 'group_only',
      settingKey: 'whoami',
      error: 'Эта функция доступна только в групповом чате.',
    },
  );
});

test('private-capable routes still bypass group chat settings', () => {
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({
      chatId: 7,
      userId: 7,
      settingKey: 'whoami',
      groupOnly: false,
      settings: { whoami: 0 },
    }),
    { ok: true, settingKey: 'whoami' },
  );
});

test('enabled and missing group settings do not block Mini App access', () => {
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: -1, userId: 7, settingKey: 'boss', settings: { boss: 1 } }),
    { ok: true, settingKey: 'boss' },
  );
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: -1, userId: 7, settingKey: 'boss', settings: {} }),
    { ok: true, settingKey: 'boss' },
  );
  assert.deepEqual(
    evaluateMiniAppFeatureAccess({ chatId: -1, userId: 7, settingKey: null, settings: { boss: 0 } }),
    { ok: true, settingKey: null },
  );
});

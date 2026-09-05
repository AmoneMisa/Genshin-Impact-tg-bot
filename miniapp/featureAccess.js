import getChatSessionSettings from '../functions/getters/getChatSessionSettings.js';

export const MINI_APP_ROUTE_SETTINGS = Object.freeze({
  'GET /api/forms': 'form',
  'POST /api/forms/save': 'form',

  // /whoami was the legacy entry point for the whole player hub: profile,
  // class/character state, inventory, equipment and builds. Gacha and steal
  // also shared the same legacy setting key.
  'GET /api/profile': 'whoami',
  'POST /api/profile/class': 'whoami',
  'POST /api/profile/gender': 'whoami',
  'GET /api/skills': 'whoami',
  'POST /api/skills/enchant': 'whoami',
  'GET /api/inventory': 'whoami',
  'POST /api/inventory/use': 'whoami',
  'GET /api/equipment': 'whoami',
  'POST /api/equipment/action': 'whoami',
  'POST /api/equipment/craft': 'whoami',
  'GET /api/builds': 'whoami',
  'POST /api/builds/action': 'whoami',
  'GET /api/gacha': 'whoami',
  'POST /api/gacha/roll': 'whoami',
  'POST /api/gacha/resolve': 'whoami',
  'GET /api/steal': 'whoami',
  'POST /api/steal/attack': 'whoami',

  // Legacy commandMap intentionally grouped shop and exchange under boss.
  'GET /api/boss': 'boss',
  'POST /api/boss/summon': 'boss',
  'POST /api/boss/skill': 'boss',
  'GET /api/shop': 'boss',
  'POST /api/shop/buy': 'boss',
  'GET /api/exchange': 'boss',
  'POST /api/exchange/buy': 'boss',

  'GET /api/gold-transfer': 'sendGold',
  'POST /api/gold-transfer/send': 'sendGold',
  'GET /api/point21': 'points',
  'POST /api/point21/action': 'points',
  'GET /api/elements': 'elements',
  'POST /api/elements/action': 'elements',
  'GET /api/bonus': 'bonus',
  'POST /api/bonus/claim': 'bonus',
  'GET /api/titles': 'titles',
  'POST /api/titles/assign': 'titles',
  'GET /api/horoscope': 'horoscope',
  'POST /api/horoscope/settings': 'horoscope',
  'POST /api/horoscope/generate': 'horoscope',
  'GET /api/chest': 'chests',
  'POST /api/chest/open': 'chests',
  'GET /api/sword': 'swords',
  'POST /api/sword/roll': 'swords',
});

export const ARCADE_GAME_SETTINGS = Object.freeze({
  dice: 'dice',
  bowling: 'bowling',
  darts: 'darts',
  football: 'football',
  basketball: 'basketball',
  slots: 'slots',
});

export const ARCADE_ACTION_ROUTES = Object.freeze(new Set([
  'POST /api/arcade/start',
  'POST /api/arcade/reset',
  'POST /api/arcade/roll',
]));

export function getMiniAppRouteSettingKey(method, pathname) {
  return MINI_APP_ROUTE_SETTINGS[`${method} ${pathname}`] || null;
}

export function getArcadeSettingKey(gameId) {
  return typeof gameId === 'string' ? ARCADE_GAME_SETTINGS[gameId] || null : null;
}

export function isArcadeSettingRoute(method, pathname) {
  return ARCADE_ACTION_ROUTES.has(`${method} ${pathname}`);
}

export function evaluateMiniAppFeatureAccess({ chatId, userId, settingKey, settings = {} }) {
  if (!settingKey || String(chatId) === String(userId)) {
    return { ok: true, settingKey: settingKey || null };
  }

  const enabled = Number(settings[settingKey] ?? 1) === 1;
  if (enabled) return { ok: true, settingKey };

  return {
    ok: false,
    status: 403,
    reason: 'feature_disabled',
    settingKey,
    error: 'Функция отключена администратором этого чата.',
  };
}

export async function checkMiniAppFeatureAccess({ chatId, userId, settingKey }) {
  if (!settingKey || String(chatId) === String(userId)) {
    return evaluateMiniAppFeatureAccess({ chatId, userId, settingKey });
  }

  const settings = await getChatSessionSettings(chatId);
  return evaluateMiniAppFeatureAccess({ chatId, userId, settingKey, settings });
}

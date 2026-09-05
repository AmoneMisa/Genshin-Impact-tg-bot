import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';

function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

// Older player documents predate equipmentStats. The combat max getters assume
// that snapshot exists, while their shared equipment helper historically
// returns 1 when it does not, which doubles additive max HP/MP/CP modifiers.
// Use raw class stats for those legacy documents; once an equipment snapshot is
// present, the canonical getters remain the source of truth for gear bonuses.
function combatValue(getter, session, fallback = 0) {
  if (!session?.game?.equipmentStats) return number(fallback);
  try {
    return number(getter(session, session?.game?.gameClass), fallback);
  } catch {
    return number(fallback);
  }
}

export const GROUP_ONLY_FEATURE_IDS = Object.freeze([
  'forms',
  'exchange',
  'boss',
  'gacha',
  'steal',
  'shop',
  'transfer',
  'bonus',
  'titles',
  'sword',
  'selfMute',
  'chatSettings',
]);

const GROUP_ONLY_FEATURE_SET = new Set(GROUP_ONLY_FEATURE_IDS);

const FEATURE_CATALOG = Object.freeze([
  { id: 'profile', title: 'Персонаж', subtitle: 'Класс, пол и характеристики', icon: '🧙', status: 'webgl' },
  { id: 'skills', title: 'Навыки', subtitle: 'Прокачка умений и ОП', icon: '⚡', status: 'webgl' },
  { id: 'forms', title: 'Анкеты', subtitle: 'Профили участников группы', icon: '📝', status: 'webgl' },
  { id: 'inventory', title: 'Инвентарь', subtitle: 'Ресурсы и расходники', icon: '🎒', status: 'webgl' },
  { id: 'exchange', title: 'Обменник', subtitle: 'Золото в кристаллы', icon: '💱', status: 'webgl' },
  { id: 'boss', title: 'Босс', subtitle: 'Командный бой', icon: '⚔️', status: 'webgl' },
  { id: 'chest', title: 'Сундуки', subtitle: 'Награды и удача', icon: '🧰', status: 'webgl' },
  { id: 'gacha', title: 'Гача', subtitle: 'Коллекция и редкости', icon: '✨', status: 'webgl' },
  { id: 'equipment', title: 'Снаряжение', subtitle: 'Билд персонажа', icon: '🛡️', status: 'webgl' },
  { id: 'builds', title: 'Постройки', subtitle: 'Ресурсы и развитие', icon: '🏛️', status: 'webgl' },
  { id: 'arena', title: 'Арена', subtitle: 'PvP и рейтинг', icon: '🏆', status: 'webgl' },
  { id: 'steal', title: 'Ограбление', subtitle: 'Украсть ресурсы у игрока', icon: '🦹', status: 'webgl' },
  { id: 'shop', title: 'Магазин', subtitle: 'Покупки и усиления', icon: '🛒', status: 'webgl' },
  { id: 'transfer', title: 'Переводы', subtitle: 'Передать золото игроку', icon: '🪙', status: 'webgl' },
  { id: 'point21', title: '21 очко', subtitle: 'Общий карточный стол', icon: '🃏', status: 'webgl' },
  { id: 'elements', title: 'Стихии', subtitle: 'Реакции и комбинации', icon: '✦', status: 'webgl' },
  { id: 'clan', title: 'Кланы', subtitle: 'Гильдия и активности', icon: '🏰', status: 'webgl' },
  { id: 'bonus', title: 'Бонус', subtitle: 'Ежедневная награда', icon: '🎁', status: 'webgl' },
  { id: 'titles', title: 'Титулы', subtitle: 'Случайный титул игроку', icon: '🏷️', status: 'webgl' },
  { id: 'horoscope', title: 'Гороскоп', subtitle: 'Шуточное предсказание', icon: '🔮', status: 'webgl' },
  { id: 'sword', title: 'Меч', subtitle: 'Ежедневная удача', icon: '🗡️', status: 'webgl' },
  { id: 'arcade', title: 'Аркада', subtitle: 'Кубики, спорт и слоты', icon: '🎲', status: 'webgl' },
  { id: 'selfMute', title: 'Само-мут', subtitle: 'Тишина на две минуты', icon: '🤫', status: 'webgl' },
  { id: 'chatSettings', title: 'Настройки чата', subtitle: 'Доступность команд для группы', icon: '⚙️', status: 'webgl' },
  { id: 'updates', title: 'Что нового', subtitle: 'Уведомления об обновлениях', icon: '🔔', status: 'webgl' },
  { id: 'feedback', title: 'Написать разработчику', subtitle: 'Баг, идея или вопрос', icon: '💬', status: 'webgl' },
  { id: 'help', title: 'Справка', subtitle: 'Гайд и fallback-команды', icon: '❔', status: 'webgl' },
]);

export function isPrivateMiniAppContext(context) {
  const chatId = context?.chatId;
  const userId = context?.user?.id;
  return chatId != null && userId != null && String(chatId) === String(userId);
}

export function createMiniAppFeatures(context) {
  const isPrivate = isPrivateMiniAppContext(context);
  return FEATURE_CATALOG.map(feature => {
    const groupOnly = GROUP_ONLY_FEATURE_SET.has(feature.id);
    const available = !groupOnly || !isPrivate;
    return {
      ...feature,
      groupOnly,
      available,
      unavailableReason: available ? null : 'group_only',
    };
  });
}

export function createMiniAppState(session, context) {
  const game = session?.game || {};
  const inventory = game.inventory || {};
  const stats = game.stats || {};
  const gameClassStats = game.gameClass?.stats || {};

  const rawMaxHp = gameClassStats.maxHp ?? gameClassStats.hp ?? gameClassStats.health ?? 1;
  const rawMaxMp = gameClassStats.maxMp ?? gameClassStats.mp ?? 1;
  const rawMaxCp = gameClassStats.maxCp ?? gameClassStats.cp ?? 1;
  const rawHp = gameClassStats.hp ?? gameClassStats.health ?? 0;
  const rawMp = gameClassStats.mp ?? 0;
  const rawCp = gameClassStats.cp ?? 0;

  const maxHp = Math.max(1, combatValue(getMaxHp, session, rawMaxHp));
  const maxMp = Math.max(1, combatValue(getMaxMp, session, rawMaxMp));
  const maxCp = Math.max(1, combatValue(getMaxCp, session, rawMaxCp));
  const hp = Math.max(0, Math.min(maxHp, combatValue(getCurrentHp, session, rawHp)));
  const mp = Math.max(0, Math.min(maxMp, combatValue(getCurrentMp, session, rawMp)));
  const cp = Math.max(0, Math.min(maxCp, combatValue(getCurrentCp, session, rawCp)));

  return {
    context: {
      chatId: context.chatId,
      chatType: context.chatType || null,
      user: {
        id: context.user?.id || null,
        firstName: context.user?.first_name || '',
        lastName: context.user?.last_name || '',
        username: context.user?.username || '',
      },
    },
    player: {
      level: number(stats.lvl, 1),
      currentExp: number(stats.currentExp),
      needExp: Math.max(1, number(stats.needExp, 1)),
      className: gameClassStats.name || 'noClass',
      classTitle: gameClassStats.translateName || gameClassStats.name || 'Без класса',
      hp,
      maxHp,
      mp,
      maxMp,
      cp,
      maxCp,
      sp: number(inventory.sp),
      attack: number(gameClassStats.damage ?? gameClassStats.attack),
      defense: number(gameClassStats.defense ?? gameClassStats.defence),
      gold: number(inventory.gold),
      crystals: number(inventory.crystals),
      ironOre: number(inventory.ironOre),
      arenaChances: number(game.arenaChances),
      bonusChances: number(game.bonusChances),
      stealChances: number(game.chanceToSteal, 2),
      chestTries: number(session?.chestTries),
      sword: number(session?.sword),
    },
    features: createMiniAppFeatures(context),
  };
}

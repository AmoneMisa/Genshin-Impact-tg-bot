function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function createMiniAppState(session, context) {
  const game = session?.game || {};
  const inventory = game.inventory || {};
  const stats = game.stats || {};
  const gameClass = game.gameClass?.stats || {};

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
      className: gameClass.name || 'noClass',
      hp: number(gameClass.hp ?? gameClass.health),
      attack: number(gameClass.damage ?? gameClass.attack),
      defense: number(gameClass.defense),
      gold: number(inventory.gold),
      crystals: number(inventory.crystals),
      ironOre: number(inventory.ironOre),
      arenaChances: number(game.arenaChances),
      bonusChances: number(game.bonusChances),
      chestTries: number(session?.chestTries),
      sword: number(session?.sword),
    },
    features: [
      { id: 'boss', title: 'Босс', subtitle: 'Командный бой', icon: '⚔️', status: 'webgl' },
      { id: 'chest', title: 'Сундуки', subtitle: 'Награды и удача', icon: '🧰', status: 'webgl' },
      { id: 'gacha', title: 'Гача', subtitle: 'Коллекция и редкости', icon: '✨', status: 'webgl' },
      { id: 'equipment', title: 'Снаряжение', subtitle: 'Билд персонажа', icon: '🛡️', status: 'webgl' },
      { id: 'builds', title: 'Постройки', subtitle: 'Ресурсы и развитие', icon: '🏛️', status: 'webgl' },
      { id: 'arena', title: 'Арена', subtitle: 'PvP и рейтинг', icon: '🏆', status: 'webgl' },
      { id: 'shop', title: 'Магазин', subtitle: 'Покупки и усиления', icon: '🛒', status: 'webgl' },
      { id: 'transfer', title: 'Переводы', subtitle: 'Передать золото игроку', icon: '🪙', status: 'webgl' },
      { id: 'point21', title: '21 очко', subtitle: 'Общий карточный стол', icon: '🃏', status: 'webgl' },
      { id: 'sword', title: 'Меч', subtitle: 'Ежедневная удача', icon: '🗡️', status: 'webgl' },
      { id: 'arcade', title: 'Аркада', subtitle: 'Кубики, спорт и слоты', icon: '🎲', status: 'webgl' },
    ],
  };
}

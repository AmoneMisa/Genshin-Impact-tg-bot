// Chat commands that skip the main menu: the horoscope answers right in the chat,
// game commands open the Mini App straight on their screen.
export const HOROSCOPE_COMMAND = Object.freeze({ command: 'horoscope', description: 'Получить предсказание' });

export const GAME_COMMANDS = Object.freeze([
  { command: 'gwent', feature: 'gwent', title: 'Гвинт', description: 'Сыграть в гвинт' },
  { command: 'dice', feature: 'dicePoker', title: 'Кости', description: 'Сыграть в кости' },
  { command: 'blackjack', aliases: ['21'], feature: 'point21', title: '21 очко', description: 'Сыграть в 21', setting: 'points' },
  { command: 'elements', feature: 'elements', title: 'Стихии', description: 'Сыграть в стихии', setting: 'elements' },
  { command: 'arcade', feature: 'arcade', title: 'Аркада', description: 'Кубики, спорт и слоты' },
  { command: 'chest', feature: 'chest', title: 'Сундуки', description: 'Открыть сундук', setting: 'chests' },
  { command: 'fishing', feature: 'fishing', title: 'Рыбалка', description: 'Порыбачить' },
  { command: 'arena', feature: 'arena', title: 'Арена', description: 'Сразиться на арене' },
].map(Object.freeze));

/** Every command name this module answers, for the generic launcher redirect to skip. */
export const QUICK_COMMAND_NAMES = Object.freeze([HOROSCOPE_COMMAND.command, ...GAME_COMMANDS.flatMap(g => [g.command, ...(g.aliases || [])])]);

/** Menu entries in the order players see them. */
export const QUICK_MENU = Object.freeze([HOROSCOPE_COMMAND, ...GAME_COMMANDS.map(({ command, description }) => ({ command, description }))]);

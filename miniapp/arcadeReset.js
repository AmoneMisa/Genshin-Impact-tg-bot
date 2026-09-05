import { getArcadeState } from './arcade.js';

const RESETTABLE_GAMES = {
  dice: () => ({ bet: 0, dice: 0, counter: 0, isStart: false }),
  bowling: () => ({ bet: 0, skittles: 0, counter: 0, isStart: false }),
  darts: () => ({ bet: 0, dart: 0, counter: 0, isStart: false }),
  football: () => ({ bet: 0, ball: 0, counter: 0, isStart: false }),
  basketball: () => ({ bet: 0, ball: 0, counter: 0, isStart: false }),
};

export function resetArcadeGame(session, gameId) {
  const makeEmpty = RESETTABLE_GAMES[gameId];
  if (!makeEmpty) {
    return {
      ok: false,
      reason: gameId === 'slots' ? 'reset_not_supported' : 'unknown_game',
      arcade: getArcadeState(session),
    };
  }

  if (!session.game) session.game = {};
  session.game[gameId] = makeEmpty();

  return {
    ok: true,
    action: 'reset',
    gameId,
    arcade: getArcadeState(session),
  };
}

export function getResettableArcadeGames() {
  return Object.keys(RESETTABLE_GAMES);
}

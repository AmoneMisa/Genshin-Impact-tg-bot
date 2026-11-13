import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRedirectCommand } from '../miniapp/launcher.js';
import { resolveGameChatId } from '../miniapp/telegramAuth.js';
import { QUICK_MENU, GAME_COMMANDS, QUICK_COMMAND_NAMES } from '../miniapp/quickCommandList.js';
import { createMiniAppFeatures } from '../miniapp/state.js';

test('quick commands have their own handlers instead of the generic launcher', () => {
  for (const text of ['/horoscope', '/gwent@GameBot', '/dice', '/blackjack', '/21', '/arena']) {
    assert.equal(shouldRedirectCommand(text, { botUsername: 'GameBot' }), false, text);
  }
  assert.ok(QUICK_COMMAND_NAMES.includes('21'));
});

test('the command menu follows Telegram rules and every game opens an existing screen', () => {
  for (const { command, description } of QUICK_MENU) {
    assert.match(command, /^[a-z0-9_]{1,32}$/);
    assert.ok(description.length >= 3 && description.length <= 256);
  }
  const ids = new Set(createMiniAppFeatures({}).map(feature => feature.id));
  for (const game of GAME_COMMANDS) assert.ok(ids.has(game.feature), game.feature);
});

test('a screen in the start parameter keeps the game chat', () => {
  assert.equal(resolveGameChatId({ startParam: 'chat_-1001234_f_gwent', user: { id: 5 } }), -1001234);
  assert.equal(resolveGameChatId({ startParam: 'chat_77_f_point21', user: { id: 5 } }), 77);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LegacyTelegramBotAdapter } from '../telegram/legacyBotAdapter.js';

function fakeCore() {
  const calls = [];
  const api = new Proxy({}, {
    get(_target, method) {
      return async (params) => {
        calls.push([String(method), params]);
        return params ?? true;
      };
    },
  });

  return {
    api,
    calls,
    middleware: null,
    errorHandler: null,
    running: false,
    use(fn) { this.middleware = fn; },
    catch(fn) { this.errorHandler = fn; },
    async startPolling() { this.running = true; },
    stop() { this.running = false; },
    isRunning() { return this.running; },
  };
}

test('project is pinned to node-telegram-bot-api 2.1.0', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dependencies['node-telegram-bot-api'], '2.1.0');
});

test('v2 adapter preserves the legacy surface used by the game', async () => {
  const core = fakeCore();
  const bot = new LegacyTelegramBotAdapter('ignored', { core });

  for (const method of [
    'onText', 'on', 'onReplyToMessage', 'startPolling', 'stopPolling',
    'setMyCommands', 'answerCallbackQuery', 'getChatMember', 'sendMessage',
    'sendPhoto', 'sendDocument', 'editMessageText', 'editMessageReplyMarkup',
  ]) {
    assert.equal(typeof bot[method], 'function', `${method} must exist on the adapter`);
  }

  await bot.sendMessage(42, 'hello', { disable_notification: true });
  assert.deepEqual(core.calls.at(-1), ['sendMessage', {
    chat_id: 42,
    text: 'hello',
    disable_notification: true,
  }]);

  await bot.restrictChatMember(42, 7, {
    permissions: { can_send_messages: false },
    until_date: 123,
  });
  assert.deepEqual(core.calls.at(-1), ['restrictChatMember', {
    chat_id: 42,
    user_id: 7,
    permissions: { can_send_messages: false },
    until_date: 123,
  }]);
});

test('v2 updates are dispatched to legacy text, reply and callback handlers', async () => {
  const core = fakeCore();
  const bot = new LegacyTelegramBotAdapter('ignored', { core });
  const seen = [];

  bot.onText(/^\/echo (.+)$/, (_msg, match) => seen.push(`text:${match[1]}`));
  bot.onReplyToMessage(42, 100, () => seen.push('reply'));
  bot.on('callback_query', (query) => seen.push(`callback:${query.data}`));

  await bot.dispatchUpdate({
    update_id: 1,
    message: {
      message_id: 101,
      date: 1,
      chat: { id: 42, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Test' },
      text: '/echo ok',
      reply_to_message: { message_id: 100 },
    },
  });

  await bot.dispatchUpdate({
    update_id: 2,
    callback_query: {
      id: 'cb',
      from: { id: 7, is_bot: false, first_name: 'Test' },
      chat_instance: 'x',
      data: 'button',
    },
  });

  assert.deepEqual(seen, ['reply', 'text:ok', 'callback:button']);
});

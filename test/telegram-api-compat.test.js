import test from 'node:test';
import assert from 'node:assert/strict';
import TelegramBot from 'node-telegram-bot-api';

test('installed Telegram client keeps the legacy surface used by the bot', () => {
  assert.equal(typeof TelegramBot, 'function');

  const bot = new TelegramBot('123456:TEST_TOKEN', { polling: false });
  for (const method of [
    'onText',
    'on',
    'startPolling',
    'stopPolling',
    'setMyCommands',
    'answerCallbackQuery',
    'getChatMember',
    'sendMessage',
    'editMessageText',
    'editMessageReplyMarkup',
  ]) {
    assert.equal(typeof bot[method], 'function', `TelegramBot.${method} must exist`);
  }
});

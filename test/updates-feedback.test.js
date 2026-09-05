import test from 'node:test';
import assert from 'node:assert/strict';
import { getUpdatesState, setUpdatesEnabled } from '../miniapp/updates.js';
import {
  MAX_FEEDBACK_LENGTH,
  normalizeFeedbackMessage,
  formatFeedbackForDeveloper,
} from '../miniapp/feedback.js';

test('updates are disabled by default', () => {
  assert.deepEqual(getUpdatesState({}), {
    enabled: false,
    delivery: 'private',
    scope: 'current_chat_member',
  });
});

test('updates setting keeps legacy flag and button in sync', () => {
  const session = {};

  const enabled = setUpdatesEnabled(session, true);
  assert.equal(enabled.ok, true);
  assert.equal(session.whatsNewSettings.flag, 1);
  assert.equal(session.whatsNewSettings.button.text, 'Вкл');
  assert.equal(session.whatsNewSettings.button.callback_data, 'whatsNew.1');
  assert.equal(getUpdatesState(session).enabled, true);

  const disabled = setUpdatesEnabled(session, false);
  assert.equal(disabled.ok, true);
  assert.equal(session.whatsNewSettings.flag, 0);
  assert.equal(session.whatsNewSettings.button.text, 'Выкл');
  assert.equal(session.whatsNewSettings.button.callback_data, 'whatsNew.0');
  assert.equal(getUpdatesState(session).enabled, false);
});

test('updates setting rejects non-boolean input', () => {
  const session = {};
  assert.deepEqual(setUpdatesEnabled(session, 1), {
    ok: false,
    reason: 'enabled must be boolean',
  });
  assert.equal(session.whatsNewSettings, undefined);
});

test('feedback validation trims valid messages and rejects empty messages', () => {
  assert.deepEqual(normalizeFeedbackMessage('  Нашла баг  '), {
    ok: true,
    message: 'Нашла баг',
  });
  assert.equal(normalizeFeedbackMessage('   ').ok, false);
  assert.equal(normalizeFeedbackMessage(null).ok, false);
});

test('feedback validation enforces the maximum length', () => {
  assert.equal(normalizeFeedbackMessage('a'.repeat(MAX_FEEDBACK_LENGTH)).ok, true);
  const oversized = normalizeFeedbackMessage('a'.repeat(MAX_FEEDBACK_LENGTH + 1));
  assert.equal(oversized.ok, false);
  assert.match(oversized.reason, new RegExp(String(MAX_FEEDBACK_LENGTH)));
});

test('feedback formatter includes Telegram and game-chat context', () => {
  const result = formatFeedbackForDeveloper({
    message: 'Не открывается инвентарь',
    user: {
      id: 42,
      first_name: 'Misa',
      last_name: 'Test',
      username: 'misa_test',
    },
    chatId: -100123,
  });

  assert.match(result, /Misa Test/);
  assert.match(result, /@misa_test/);
  assert.match(result, /User ID: 42/);
  assert.match(result, /Game chat: -100123/);
  assert.match(result, /Не открывается инвентарь/);
});

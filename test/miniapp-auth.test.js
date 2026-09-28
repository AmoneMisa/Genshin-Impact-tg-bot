import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validateTelegramInitData, resolveGameChatId } from '../miniapp/telegramAuth.js';

function signedInitData(botToken, values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    params.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('validates signed Telegram initData and resolves group start param', () => {
  const token = '123:test-token';
  const raw = signedInitData(token, {
    auth_date: Math.floor(Date.now() / 1000),
    user: { id: 42, first_name: 'Test' },
    start_param: 'chat_-100123456',
    chat_type: 'supergroup',
  });

  const validated = validateTelegramInitData(raw, token);
  assert.equal(validated.user.id, 42);
  assert.equal(resolveGameChatId(validated), -100123456);
});

test('rejects tampered Telegram initData', () => {
  const token = '123:test-token';
  const raw = signedInitData(token, {
    auth_date: Math.floor(Date.now() / 1000),
    user: { id: 42, first_name: 'Test' },
  });

  const tampered = raw.replace('Test', 'Hacker');
  assert.throws(() => validateTelegramInitData(tampered, token), /signature is invalid/);
});

test('rejects expired Telegram initData', () => {
  const token = '123:test-token';
  const raw = signedInitData(token, {
    auth_date: Math.floor(Date.now() / 1000) - 7200,
    user: { id: 42, first_name: 'Test' },
  });

  assert.throws(() => validateTelegramInitData(raw, token, 60), /expired/);
});

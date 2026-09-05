import crypto from 'crypto';

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

export function validateTelegramInitData(initData, botToken, maxAgeSeconds = MAX_AUTH_AGE_SECONDS) {
  if (!initData || !botToken) {
    throw new Error('Telegram init data or bot token is missing');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) {
    throw new Error('Telegram init data hash is missing');
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const actual = Buffer.from(receivedHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error('Telegram init data signature is invalid');
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) {
    throw new Error('Telegram init data auth_date is invalid');
  }

  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -30 || age > maxAgeSeconds) {
    throw new Error('Telegram init data is expired');
  }

  const parseJson = (key) => {
    const raw = params.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return {
    user: parseJson('user'),
    chat: parseJson('chat'),
    startParam: params.get('start_param'),
    chatType: params.get('chat_type'),
    chatInstance: params.get('chat_instance'),
    authDate,
  };
}

export function resolveGameChatId(initData) {
  const startParam = initData.startParam || '';
  const match = /^chat_(-?\d+)$/.exec(startParam);
  if (match) return Number(match[1]);
  if (initData.chat?.id) return Number(initData.chat.id);
  if (initData.user?.id) return Number(initData.user.id);
  throw new Error('Unable to resolve game chat');
}

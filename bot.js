import { token } from './config.js';
import LegacyTelegramBotAdapter from './telegram/legacyBotAdapter.js';

// node-telegram-bot-api v2 has a new Bot/Context API. The adapter keeps the
// existing game handlers working while all transport calls go through v2.1.
// Polling still starts explicitly from index.js after Mongo is ready.
export default new LegacyTelegramBotAdapter(token);

import { token } from './config.js';
import TelegramBot from 'node-telegram-bot-api';

// Polling is started explicitly from index.js after Mongo has connected and
// every handler has been registered. This prevents updates from racing startup.
export default new TelegramBot(token, {polling: false});

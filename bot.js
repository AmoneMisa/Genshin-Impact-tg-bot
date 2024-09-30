import {  token  } from './config.js';
import TelegramBot from 'node-telegram-bot-api';
export default new TelegramBot(token, {polling: true});
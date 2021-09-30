const { token } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
module.exports = new TelegramBot(token, {polling: true});
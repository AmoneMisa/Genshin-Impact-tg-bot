import fs from 'node:fs';
import { Bot, InputFile } from 'node-telegram-bot-api';
import { fromPath } from 'node-telegram-bot-api/node';

function clean(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

async function normalizeFile(value, meta = {}) {
  if (value == null) return value;
  if (value instanceof InputFile) return value;

  if (typeof value === 'string') {
    if (fs.existsSync(value)) return fromPath(value);
    return value;
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return new InputFile(value, meta.filename ? { filename: meta.filename } : undefined);
  }

  if (typeof value?.path === 'string' && fs.existsSync(value.path)) {
    return fromPath(value.path);
  }

  if (typeof value?.[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of value) chunks.push(Buffer.from(chunk));
    return new InputFile(Buffer.concat(chunks), meta.filename ? { filename: meta.filename } : undefined);
  }

  return value;
}

function regexMatch(regex, text) {
  regex.lastIndex = 0;
  const match = regex.exec(text);
  regex.lastIndex = 0;
  return match;
}

/**
 * Transitional adapter for node-telegram-bot-api v2.
 *
 * v2 deliberately removed the old TelegramBot surface. The game still has many
 * legacy call sites, so this adapter keeps their positional API while routing
 * every request and update through the v2 Bot/Api implementation. New code
 * should use `bot.api` or v2 Context middleware directly.
 */
export class LegacyTelegramBotAdapter {
  constructor(token, { core } = {}) {
    this.core = core || new Bot(token);
    this.api = this.core.api;
    this.textListeners = [];
    this.eventListeners = new Map();
    this.replyListeners = new Map();

    this.core.use(async (ctx, next) => {
      await this.dispatchUpdate(ctx.update);
      if (next) await next();
    });

    this.core.catch((error) => {
      console.error('[telegram] handler error:', error);
    });
  }

  onText(regexp, callback) {
    this.textListeners.push({ regexp, callback });
    return this;
  }

  on(event, callback) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
    return this;
  }

  once(event, callback) {
    const wrapped = (...args) => {
      this.removeListener(event, wrapped);
      return callback(...args);
    };
    return this.on(event, wrapped);
  }

  removeListener(event, callback) {
    const listeners = this.eventListeners.get(event) || [];
    this.eventListeners.set(event, listeners.filter((listener) => listener !== callback));
    return this;
  }

  onReplyToMessage(chatId, messageId, callback) {
    const key = `${chatId}:${messageId}`;
    const listeners = this.replyListeners.get(key) || [];
    listeners.push(callback);
    this.replyListeners.set(key, listeners);
    return { chatId, messageId };
  }

  removeReplyListener(replyListenerId) {
    if (!replyListenerId) return false;
    const key = `${replyListenerId.chatId}:${replyListenerId.messageId}`;
    return this.replyListeners.delete(key);
  }

  async emitLegacy(event, payload) {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of [...listeners]) await listener(payload);
  }

  async dispatchUpdate(update) {
    if (!update || typeof update !== 'object') return;

    if ('message' in update && update.message) {
      const message = update.message;
      await this.emitLegacy('message', message);

      if (Array.isArray(message.new_chat_members) && message.new_chat_members.length) {
        await this.emitLegacy('new_chat_members', message);
      }
      if (message.left_chat_member) await this.emitLegacy('left_chat_member', message);

      const replyTo = message.reply_to_message?.message_id;
      if (replyTo != null) {
        const key = `${message.chat.id}:${replyTo}`;
        const listeners = this.replyListeners.get(key) || [];
        for (const listener of [...listeners]) await listener(message);
      }

      if (typeof message.text === 'string') {
        for (const { regexp, callback } of [...this.textListeners]) {
          const match = regexMatch(regexp, message.text);
          if (match) await callback(message, match);
        }
      }
    }

    if ('callback_query' in update && update.callback_query) {
      await this.emitLegacy('callback_query', update.callback_query);
    }
    if ('edited_message' in update && update.edited_message) {
      await this.emitLegacy('edited_message', update.edited_message);
    }
    if ('channel_post' in update && update.channel_post) {
      await this.emitLegacy('channel_post', update.channel_post);
    }
    if ('edited_channel_post' in update && update.edited_channel_post) {
      await this.emitLegacy('edited_channel_post', update.edited_channel_post);
    }
  }

  async startPolling(...args) {
    try {
      return await this.core.startPolling(...args);
    } catch (error) {
      await this.emitLegacy('polling_error', error);
      throw error;
    }
  }

  stopPolling() {
    this.core.stop();
    return Promise.resolve();
  }

  isPolling() {
    return this.core.isRunning();
  }

  sendMessage(chatId, text, options = {}) {
    return this.api.sendMessage(clean({ chat_id: chatId, text, ...options }));
  }

  async sendPhoto(chatId, photo, options = {}, fileOptions = {}) {
    return this.api.sendPhoto(clean({ chat_id: chatId, photo: await normalizeFile(photo, fileOptions), ...options }));
  }

  async sendDocument(chatId, document, options = {}, fileOptions = {}) {
    return this.api.sendDocument(clean({ chat_id: chatId, document: await normalizeFile(document, fileOptions), ...options }));
  }

  async sendSticker(chatId, sticker, options = {}) {
    return this.api.sendSticker(clean({ chat_id: chatId, sticker: await normalizeFile(sticker), ...options }));
  }

  async sendAnimation(chatId, animation, options = {}, fileOptions = {}) {
    return this.api.sendAnimation(clean({ chat_id: chatId, animation: await normalizeFile(animation, fileOptions), ...options }));
  }

  async sendAudio(chatId, audio, options = {}, fileOptions = {}) {
    return this.api.sendAudio(clean({ chat_id: chatId, audio: await normalizeFile(audio, fileOptions), ...options }));
  }

  async sendVideo(chatId, video, options = {}, fileOptions = {}) {
    return this.api.sendVideo(clean({ chat_id: chatId, video: await normalizeFile(video, fileOptions), ...options }));
  }

  async sendVoice(chatId, voice, options = {}, fileOptions = {}) {
    return this.api.sendVoice(clean({ chat_id: chatId, voice: await normalizeFile(voice, fileOptions), ...options }));
  }

  async sendVideoNote(chatId, videoNote, options = {}, fileOptions = {}) {
    return this.api.sendVideoNote(clean({ chat_id: chatId, video_note: await normalizeFile(videoNote, fileOptions), ...options }));
  }

  sendDice(chatId, options = {}) {
    return this.api.sendDice(clean({ chat_id: chatId, ...options }));
  }

  sendChatAction(chatId, action, options = {}) {
    return this.api.sendChatAction(clean({ chat_id: chatId, action, ...options }));
  }

  sendLocation(chatId, latitude, longitude, options = {}) {
    return this.api.sendLocation(clean({ chat_id: chatId, latitude, longitude, ...options }));
  }

  sendVenue(chatId, latitude, longitude, title, address, options = {}) {
    return this.api.sendVenue(clean({ chat_id: chatId, latitude, longitude, title, address, ...options }));
  }

  sendContact(chatId, phoneNumber, firstName, options = {}) {
    return this.api.sendContact(clean({ chat_id: chatId, phone_number: phoneNumber, first_name: firstName, ...options }));
  }

  sendPoll(chatId, question, pollOptions, options = {}) {
    const normalizedOptions = (pollOptions || []).map((option) => typeof option === 'string' ? { text: option } : option);
    return this.api.sendPoll(clean({ chat_id: chatId, question, options: normalizedOptions, ...options }));
  }

  async sendMediaGroup(chatId, media, options = {}) {
    const normalized = await Promise.all((media || []).map(async (item) => clean({
      ...item,
      media: await normalizeFile(item.media),
      thumbnail: item.thumbnail ? await normalizeFile(item.thumbnail) : undefined,
    })));
    return this.api.sendMediaGroup(clean({ chat_id: chatId, media: normalized, ...options }));
  }

  editMessageText(text, options = {}) {
    return this.api.editMessageText(clean({ text, ...options }));
  }

  editMessageCaption(caption, options = {}) {
    return this.api.editMessageCaption(clean({ caption, ...options }));
  }

  editMessageReplyMarkup(replyMarkup, options = {}) {
    return this.api.editMessageReplyMarkup(clean({ reply_markup: replyMarkup, ...options }));
  }

  async editMessageMedia(media, options = {}) {
    const normalized = clean({
      ...media,
      media: await normalizeFile(media.media),
      thumbnail: media.thumbnail ? await normalizeFile(media.thumbnail) : undefined,
    });
    return this.api.editMessageMedia(clean({ media: normalized, ...options }));
  }

  deleteMessage(chatId, messageId) {
    return this.api.deleteMessage({ chat_id: chatId, message_id: messageId });
  }

  forwardMessage(chatId, fromChatId, messageId, options = {}) {
    return this.api.forwardMessage(clean({ chat_id: chatId, from_chat_id: fromChatId, message_id: messageId, ...options }));
  }

  copyMessage(chatId, fromChatId, messageId, options = {}) {
    return this.api.copyMessage(clean({ chat_id: chatId, from_chat_id: fromChatId, message_id: messageId, ...options }));
  }

  answerCallbackQuery(callbackQueryId, options = {}) {
    return this.api.answerCallbackQuery(clean({ callback_query_id: callbackQueryId, ...options }));
  }

  getMe() {
    return this.api.getMe();
  }

  getChat(chatId) {
    return this.api.getChat({ chat_id: chatId });
  }

  getChatMember(chatId, userId) {
    return this.api.getChatMember({ chat_id: chatId, user_id: userId });
  }

  getChatMemberCount(chatId) {
    return this.api.getChatMemberCount({ chat_id: chatId });
  }

  getChatAdministrators(chatId) {
    return this.api.getChatAdministrators({ chat_id: chatId });
  }

  getUserProfilePhotos(userId, options = {}) {
    return this.api.getUserProfilePhotos(clean({ user_id: userId, ...options }));
  }

  getFile(fileId) {
    return this.api.getFile({ file_id: fileId });
  }

  getMyCommands(options = {}) {
    return this.api.getMyCommands(options);
  }

  setMyCommands(commands, options = {}) {
    return this.api.setMyCommands(clean({ commands, ...options }));
  }

  restrictChatMember(chatId, userId, options = {}) {
    return this.api.restrictChatMember(clean({ chat_id: chatId, user_id: userId, ...options }));
  }

  banChatMember(chatId, userId, options = {}) {
    return this.api.banChatMember(clean({ chat_id: chatId, user_id: userId, ...options }));
  }

  kickChatMember(chatId, userId, options = {}) {
    return this.banChatMember(chatId, userId, options);
  }

  unbanChatMember(chatId, userId, options = {}) {
    return this.api.unbanChatMember(clean({ chat_id: chatId, user_id: userId, ...options }));
  }

  promoteChatMember(chatId, userId, options = {}) {
    return this.api.promoteChatMember(clean({ chat_id: chatId, user_id: userId, ...options }));
  }

  pinChatMessage(chatId, messageId, options = {}) {
    return this.api.pinChatMessage(clean({ chat_id: chatId, message_id: messageId, ...options }));
  }

  unpinChatMessage(chatId, options = {}) {
    return this.api.unpinChatMessage(clean({ chat_id: chatId, ...options }));
  }

  unpinAllChatMessages(chatId) {
    return this.api.unpinAllChatMessages({ chat_id: chatId });
  }

  setChatPermissions(chatId, permissions, options = {}) {
    return this.api.setChatPermissions(clean({ chat_id: chatId, permissions, ...options }));
  }

  setChatTitle(chatId, title) {
    return this.api.setChatTitle({ chat_id: chatId, title });
  }

  setChatDescription(chatId, description) {
    return this.api.setChatDescription({ chat_id: chatId, description });
  }

  async setChatPhoto(chatId, photo) {
    return this.api.setChatPhoto({ chat_id: chatId, photo: await normalizeFile(photo) });
  }

  deleteChatPhoto(chatId) {
    return this.api.deleteChatPhoto({ chat_id: chatId });
  }

  leaveChat(chatId) {
    return this.api.leaveChat({ chat_id: chatId });
  }
}

export default LegacyTelegramBotAdapter;

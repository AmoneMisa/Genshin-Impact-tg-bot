// Server side of the interface language: remembers each player's choice and
// translates the messages the bot sends on its own (pushes, launcher, news).

import UserLanguage from '../db/models/UserLanguage.js';
import { createTranslator } from '../webapp/i18n/engine.js';

export const LANGUAGES = Object.freeze(['ru', 'uz']);
const translators = new Map();
const known = new Map();

export function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : null;
}

/** Telegram interface language → ours, for people who never opened the picker. */
export function languageFromTelegram(code) {
  return String(code || '').toLowerCase().startsWith('uz') ? 'uz' : 'ru';
}

async function translatorFor(lang) {
  if (lang === 'ru') return null;
  if (!translators.has(lang)) {
    const { default: dictionary } = await import(`../webapp/i18n/${lang}.js`);
    translators.set(lang, createTranslator(dictionary));
  }
  return translators.get(lang);
}

export async function translateText(lang, text) {
  const translate = await translatorFor(lang).catch(() => null);
  return translate ? translate(text) : text;
}

/** Stores the language reported with a Mini App request (cheap: writes only on change). */
export function rememberLanguage(userId, lang) {
  const value = normalizeLanguage(lang);
  if (!value || !userId || known.get(String(userId)) === value) return;
  known.set(String(userId), value);
  UserLanguage.updateOne({ userId: Number(userId) }, { $set: { lang: value } }, { upsert: true }).catch(() => {});
}

export async function languageOf(userId, telegramCode = null) {
  const cached = known.get(String(userId));
  if (cached) return cached;
  const stored = await UserLanguage.findOne({ userId: Number(userId) }).lean().catch(() => null);
  const lang = normalizeLanguage(stored?.lang) || languageFromTelegram(telegramCode);
  known.set(String(userId), lang);
  return lang;
}

/** `text` in the language of `userId`. */
export async function translateFor(userId, text, telegramCode = null) {
  return translateText(await languageOf(userId, telegramCode), text);
}

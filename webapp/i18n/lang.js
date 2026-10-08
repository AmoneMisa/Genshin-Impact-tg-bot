// Which language the player uses: an explicit choice wins, otherwise the
// Telegram interface language.

export const LANGUAGES = Object.freeze([
  { code: 'ru', label: 'Русский' },
  { code: 'uz', label: "O'zbekcha" },
]);

const STORAGE_KEY = 'app-language';

export function normalizeLang(value) {
  return LANGUAGES.some(item => item.code === value) ? value : null;
}

export function detectLanguage({ stored = null, telegramCode = '' } = {}) {
  return normalizeLang(stored) || (String(telegramCode).toLowerCase().startsWith('uz') ? 'uz' : 'ru');
}

export function readStoredLanguage() {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function storeLanguage(code) {
  try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* storage may be unavailable */ }
}

export function currentLanguage() {
  return detectLanguage({
    stored: readStoredLanguage(),
    telegramCode: window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code,
  });
}

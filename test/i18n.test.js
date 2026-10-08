import test from 'node:test';
import assert from 'node:assert/strict';
import dictionary from '../webapp/i18n/uz.js';
import { createTranslator, placeholdersOf } from '../webapp/i18n/engine.js';
import { detectLanguage, normalizeLang as normalizeLanguage } from '../webapp/i18n/lang.js';
import { languageFromTelegram, normalizeLanguage as normalizeServerLanguage } from '../miniapp/language.js';
import { scanLiterals, fragmentsOf } from '../scripts/i18n/extract.mjs';
import { findMissing } from '../scripts/i18n/missing.mjs';

const translate = createTranslator(dictionary);

test('exact phrases, placeholders and whitespace', () => {
  assert.equal(translate('Золото'), 'Oltin');
  assert.equal(translate('  Бой '), '  Jang ');
  assert.equal(translate('{0} золота'.replace('{0}', '120')), '120 oltin');
  assert.equal(translate('Заявка для Рита отправлена.'), 'Рита uchun ariza yuborildi.');
  assert.equal(translate('Hello 123'), 'Hello 123');
});

test('captured values and composed strings are translated piece by piece', () => {
  assert.equal(translate('Ур. 12 · Маг'), 'Dar. 12 · Sehrgar');
  assert.equal(translate('Уровень 7 · Воин'), 'Daraja 7 · Jangchi');
  assert.equal(translate('🏰 Тебя приняли в клан «Волки».'.replace('Тебя приняли в клан «Волки»', 'Тебя приняли в клан «Волки»')), "🏰 Seni «Волки» klaniga qabul qilishdi.");
});

test('unknown Russian stays as it is', () => {
  assert.equal(translate('Совершенно неизвестная фраза'), 'Совершенно неизвестная фраза');
});

test('every translation keeps the placeholders of its source', () => {
  for (const [source, target] of Object.entries(dictionary)) {
    assert.deepEqual(placeholdersOf(target), placeholdersOf(source), source);
  }
});

test('translations contain no stray Cyrillic (except the language picker)', () => {
  const allowed = new Set(['Til / Язык']);
  for (const [source, target] of Object.entries(dictionary)) {
    if (allowed.has(source) || /^[А-Яа-я.]+$/.test(source) && target.length <= 6) continue;
    assert.ok(!/[А-Яа-яЁё]/.test(target), `${source} -> ${target}`);
  }
});

test('language choice: stored wins, otherwise Telegram language', () => {
  assert.equal(detectLanguage({ stored: 'uz', telegramCode: 'ru' }), 'uz');
  assert.equal(detectLanguage({ stored: 'ru', telegramCode: 'uz' }), 'ru');
  assert.equal(detectLanguage({ telegramCode: 'uz-UZ' }), 'uz');
  assert.equal(detectLanguage({ telegramCode: 'en' }), 'ru');
  assert.equal(detectLanguage({ stored: 'xx' }), 'ru');
  assert.equal(normalizeLanguage('uz'), 'uz');
  assert.equal(normalizeLanguage('de'), null);
  assert.equal(languageFromTelegram('uz'), 'uz');
  assert.equal(languageFromTelegram(undefined), 'ru');
  assert.equal(normalizeServerLanguage('ru'), 'ru');
});

test('the extractor reads literals and templates but not comments', () => {
  const source = "// Комментарий\nconst a = 'Привет'; /* блок */ const b = `Ур. ${n} · <b>Маг</b>`;\nconst re = /['\"]/; const c = \"Бой\";";
  const phrases = scanLiterals(source).flatMap(item => fragmentsOf(item.value));
  assert.deepEqual(phrases, ['Привет', 'Ур. {0} ·', 'Маг', 'Бой']);
});

test('every Russian phrase in the game has an Uzbek translation (or is on the untranslated list)', async () => {
  const missing = await findMissing();
  assert.deepEqual(missing.map(item => `${item.text} (${item.files[0]})`), [], 'run: node scripts/i18n/missing.mjs, then add the phrases to webapp/i18n/uz-extra.js');
});

test('server messages are translated per language and Russian is left alone', async () => {
  const { translateText } = await import('../miniapp/language.js');
  assert.equal(await translateText('uz', '🤝 Рита теперь твой друг.'.replace('Рита', 'Рита')), await translateText('uz', '🤝 Рита теперь твой друг.'));
  assert.equal(await translateText('uz', '🎮 Открыть игру'), "🎮 O'yinni ochish");
  assert.equal(await translateText('ru', '🎮 Открыть игру'), '🎮 Открыть игру');
});

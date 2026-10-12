import { memberName } from './social.js';
import {
  generateShortHoroText,
  getSignByCode,
  getStyleByKey,
} from '../functions/game/horoscope/horoscope.js';

export const HOROSCOPE_SIGNS = [
  ['Овен', 'aries', '♈'], ['Телец', 'taurus', '♉'], ['Близнецы', 'gemini', '♊'],
  ['Рак', 'cancer', '♋'], ['Лев', 'leo', '♌'], ['Дева', 'virgo', '♍'],
  ['Весы', 'libra', '♎'], ['Скорпион', 'scorpio', '♏'], ['Стрелец', 'sagittarius', '♐'],
  ['Козерог', 'capricorn', '♑'], ['Водолей', 'aquarius', '♒'], ['Рыбы', 'pisces', '♓'],
].map(([name, code, icon]) => ({ name, code, icon }));

export const HOROSCOPE_STYLES = [
  { key: 'superShort', label: 'Коротко' },
  { key: 'cheeky', label: 'Ироничный' },
  { key: 'sweet', label: 'Тёплый' },
  { key: 'sarcastic', label: 'Саркастичный' },
];

const SIGN_CODES = new Set(HOROSCOPE_SIGNS.map(sign => sign.code));
const STYLE_KEYS = new Set(HOROSCOPE_STYLES.map(style => style.key));

function ensureSettings(session) {
  if (!session.horoscope || typeof session.horoscope !== 'object') {
    session.horoscope = { sign: 'aries', style: 'cheeky' };
  }
  if (!SIGN_CODES.has(session.horoscope.sign)) session.horoscope.sign = 'aries';
  if (!STYLE_KEYS.has(session.horoscope.style)) session.horoscope.style = 'cheeky';
  return session.horoscope;
}

export function getHoroscopeState(session) {
  const settings = ensureSettings(session);
  const sign = getSignByCode(settings.sign);
  const style = getStyleByKey(settings.style);
  return {
    sign,
    style,
    signs: HOROSCOPE_SIGNS,
    styles: HOROSCOPE_STYLES,
    text: settings.prediction?.text || '',
    shared: Boolean(settings.prediction?.sharedAt),
  };
}

export function updateHoroscopeSettings(session, patch = {}) {
  const settings = ensureSettings(session);

  if (patch.sign !== undefined) {
    if (typeof patch.sign !== 'string' || !SIGN_CODES.has(patch.sign)) {
      return { ok: false, reason: 'invalid_sign', horoscope: getHoroscopeState(session) };
    }
    if (settings.sign !== patch.sign) delete settings.prediction;
    settings.sign = patch.sign;
  }

  if (patch.style !== undefined) {
    if (typeof patch.style !== 'string' || !STYLE_KEYS.has(patch.style)) {
      return { ok: false, reason: 'invalid_style', horoscope: getHoroscopeState(session) };
    }
    if (settings.style !== patch.style) delete settings.prediction;
    settings.style = patch.style;
  }

  return { ok: true, horoscope: getHoroscopeState(session) };
}

export function resetHoroscopeSettings(session) {
  session.horoscope = { sign: 'aries', style: 'cheeky' };
  return { ok: true, horoscope: getHoroscopeState(session) };
}

export async function generateHoroscopeForMiniApp(session, { generate = generateShortHoroText, now = Date.now() } = {}) {
  const settings = ensureSettings(session);
  const text = await generate(session);
  settings.prediction = {text, generatedAt: now, sharedAt: null};
  return {
    ok: true,
    text,
    horoscope: getHoroscopeState(session),
  };
}

/** Only the server-generated result can be shared, once per prediction. */
export async function shareHoroscopeForMiniApp(session, { send, now = Date.now() }) {
  const prediction = ensureSettings(session).prediction;
  if (!prediction?.text) return {ok: false, reason: 'no_prediction'};
  if (prediction.sharedAt) return {ok: false, reason: 'already_shared'};
  await send(memberName(session) + ' · шуточный гороскоп\n' + prediction.text);
  prediction.sharedAt = now;
  return {ok: true, horoscope: getHoroscopeState(session)};
}

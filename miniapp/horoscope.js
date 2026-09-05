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
  };
}

export function updateHoroscopeSettings(session, patch = {}) {
  const settings = ensureSettings(session);

  if (patch.sign !== undefined) {
    if (typeof patch.sign !== 'string' || !SIGN_CODES.has(patch.sign)) {
      return { ok: false, reason: 'invalid_sign', horoscope: getHoroscopeState(session) };
    }
    settings.sign = patch.sign;
  }

  if (patch.style !== undefined) {
    if (typeof patch.style !== 'string' || !STYLE_KEYS.has(patch.style)) {
      return { ok: false, reason: 'invalid_style', horoscope: getHoroscopeState(session) };
    }
    settings.style = patch.style;
  }

  return { ok: true, horoscope: getHoroscopeState(session) };
}

export function resetHoroscopeSettings(session) {
  session.horoscope = { sign: 'aries', style: 'cheeky' };
  return { ok: true, horoscope: getHoroscopeState(session) };
}

export async function generateHoroscopeForMiniApp(session) {
  ensureSettings(session);
  const text = await generateShortHoroText(session);
  return {
    ok: true,
    text,
    horoscope: getHoroscopeState(session),
  };
}

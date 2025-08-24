import getUserName from "../../getters/getUserName.js";
import { Ollama } from 'ollama';

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
const client = new Ollama({ host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' });

const HORO_SYSTEM = {
    superShort: `
Ты русскоязычный астрологический ассистент.
Правила: ровно ОДНО предложение в стиле Genshin Impact и предсказания, ≤200 символов. Формат: "<ICON> <SIGN>: <текст>".
Без переносов строк, без списков, без эмодзи, без дисклеймеров. Только итоговая строка.`.trim(),

    cheeky: `
Ты русскоязычный астролог с иронией.
Ровно ОДНО предложение в стиле предсказания, ≤200 символов. Формат: "<ICON> <SIGN>: <текст>".
Разрешены умеренные грубости/мат, сексуальный подтекст, без оскорблений пользователя.
Запрещены бытовые предметы (туалетная бумага, носки и т.п.). Без переносов/эмодзи/дисклеймеров.`.trim(),

    sweet: `
Ты тёплый и ободряющий астролог.
Ровно ОДНО предложение в стиле игр, аниме, манги с упоминанием событий или персонажей из них в стиле предсказания, ≤200 символов. Формат: "<ICON> <SIGN>: <текст>".
Без переносов, без эмодзи, без дисклеймеров. Только итоговая строка.`.trim(),

    sarcastic: `
Ты саркастичный астролог: грубо, но по делу.
Ровно ОДНО предложение в стиле предсказания, ≤200 символов. Формат: "<ICON> <SIGN>: <текст>".
Допускаются грубые слова и маты, сексуальный контент и контекст, но без оскорблений. Без эмодзи/дисклеймеров/бытовой чепухи.`.trim()
};

const HORO_USER = ({ signName, signIcon }) =>
    `Сгенерируй итог в формате: "${signIcon} ${signName}: <одно короткое предложение>" (≤100 символов, без переносов).`;

const SIGNS = [
    ['Овен','aries','♈'], ['Телец','taurus','♉'], ['Близнецы','gemini','♊'],
    ['Рак','cancer','♋'], ['Лев','leo','♌'], ['Дева','virgo','♍'],
    ['Весы','libra','♎'], ['Скорпион','scorpio','♏'], ['Стрелец','sagittarius','♐'],
    ['Козерог','capricorn','♑'], ['Водолей','aquarius','♒'], ['Рыбы','pisces','♓']
];

const STYLES = [
    ['superShort','Коротко'],
    ['cheeky','Ироничный (можно грубо)'],
    ['sweet','Тёплый'],
    ['sarcastic','Саркастичный']
];

export function getSignByCode(code) {
    const item = SIGNS.find(s => s[1] === code);
    return item ? { name: item[0], code: item[1], icon: item[2] } : { name: 'Овен', code: 'aries', icon: '♈' };
}

export function getStyleByKey(key) {
    const item = STYLES.find(s => s[0] === key);
    return item ? { key: item[0], label: item[1] } : { key: 'cheeky', label: 'Ироничный' };
}

function oneSentenceClamp(s, max = 100) {
    let t = String(s).replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
    t = t.split(/(?<=[.!?])\s/)[0] || t;
    if (t.length > max) {
        const cut = t.lastIndexOf(',', max);
        t = (cut > 40 ? t.slice(0, cut) : t.slice(0, max - 1)).trimEnd() + '…';
    }
    return t;
}

async function askLocalLLM(systemPrompt, userPrompt = '') {
    try {
        const res = await client.chat({
            model: OLLAMA_MODEL,
            messages: [
                { role: 'system', content: String(systemPrompt) },
                { role: 'user',   content: String(userPrompt) }
            ],
            stream: false,
            options: {
                temperature: 0.55,
                top_p: 0.85,
                num_predict: 60,
                stop: ['\n']
            }
        });
        return oneSentenceClamp(res?.message?.content ?? '', 100);
    } catch (e) {
        console.error('ollama chat error:', e);
        return '★ Звёзды заняты — попробуй ещё раз позже.';
    }
}

export function kbMain(session) {
    const { horoscope } = session;
    const sign = getSignByCode(horoscope?.sign || 'aries');
    const style = getStyleByKey(horoscope?.style || 'cheeky');

    return {
        selective: true,
        inline_keyboard: [
            [{ text: `Знак зодиака: ${sign.icon} ${sign.name}`, callback_data: 'horo.menu.sign' }],
            [{ text: `Характер ответа: ${style.label}`,        callback_data: 'horo.menu.style' }],
            [
                { text: 'Сохранить настройки', callback_data: 'horo.save' },
                { text: 'Сбросить',            callback_data: 'horo.reset' }
            ],
            [{ text: 'Закрыть', callback_data: 'close' }]
        ]
    };
}

export function kbSign(selectedCode) {
    const rows = [];
    for (let i = 0; i < SIGNS.length; i += 3) {
        rows.push(SIGNS.slice(i, i + 3).map(([name, code, icon]) => ({
            text: `${icon} ${code === selectedCode ? `• ${name} •` : name}`,
            callback_data: `horo.set.sign.${code}`
        })));
    }
    rows.push([{ text: '↩️ Назад', callback_data: 'horo.back' }]);
    return { selective: true, inline_keyboard: rows };
}

export function kbStyle(selectedKey) {
    const rows = [
        STYLES.slice(0,2).map(([key,label]) => ({
            text: key === selectedKey ? `• ${label} •` : label,
            callback_data: `horo.set.style.${key}`
        })),
        STYLES.slice(2,4).map(([key,label]) => ({
            text: key === selectedKey ? `• ${label} •` : label,
            callback_data: `horo.set.style.${key}`
        }))
    ];
    rows.push([{ text: '↩️ Назад', callback_data: 'horo.back' }]);
    return { selective: true, inline_keyboard: rows };
}

export async function generateShortHoroText(session) {
    const handle = getUserName(session, 'nickname');
    const { horoscope } = session;
    const sign  = getSignByCode(horoscope?.sign || 'aries');
    const style = getStyleByKey(horoscope?.style || 'cheeky');
    const system = HORO_SYSTEM[style.key] || HORO_SYSTEM.cheeky;
    const user   = HORO_USER({ signName: sign.name, signIcon: sign.icon });

    const line = await askLocalLLM(system, user);
    return `@${handle}, твой шуточный гороскоп:\n\n${line}`;
}
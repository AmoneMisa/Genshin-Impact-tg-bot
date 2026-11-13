import getUserName from "../../getters/getUserName.js";
import { generateFunnyLine } from '../../llm/freeLlmClient.js';

const HORO_SYSTEM = {
    superShort: `
Ты русскоязычный астролог для игровой Telegram-тусовки.
Дай ровно ОДНО короткое шуточное предсказание. Формат: "<ICON> <SIGN>: <текст>".
Не добавляй другие эмодзи, списки, переносы и дисклеймеры. До 120 символов.`.trim(),

    cheeky: `
Ты русскоязычный астролог с иронией для компании друзей.
Дай ровно ОДНО короткое дерзкое предсказание. Формат: "<ICON> <SIGN>: <текст>".
Можно умеренную грубость, мат и лёгкий сексуальный подтекст, но без оскорбления пользователя. Без переносов. До 120 символов.`.trim(),

    sweet: `
Ты тёплый русскоязычный астролог-гик.
Дай ровно ОДНО смешное доброе предсказание с лёгкой отсылкой к игре, аниме, манге, фильму или сериалу.
Формат: "<ICON> <SIGN>: <текст>". Без переносов и лишних эмодзи. До 120 символов.`.trim(),

    sarcastic: `
Ты саркастичный русскоязычный астролог для компании друзей.
Дай ровно ОДНО едкое, но не злое предсказание. Формат: "<ICON> <SIGN>: <текст>".
Допускаются мат, грубость и взрослый подтекст без травли и оскорбления пользователя. Без переносов. До 120 символов.`.trim()
};

const HORO_USER = ({ signName, signIcon }) =>
    `Сгенерируй новое предсказание для ${signName}. Начни строго с "${signIcon} ${signName}:".`;

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

const FALLBACKS = {
    superShort: [
        'Сегодня удача придёт туда, где ты уже перестал её ждать.',
        'Не спорь с рандомом: сегодня он явно знает о тебе больше.',
        'День хорош для риска, если потом не делать вид, что так и было задумано.',
        'Сегодня повезёт в мелочах — собери их в одну большую удачу.',
        'Лучший ход дня — тот, который ты сделаешь первым.',
        'Звёзды говорят «да». Вопрос выбери сам.',
        'Сегодня даже очередь будет двигаться в твою сторону.'
    ],
    cheeky: [
        'Сегодня судьба даст шанс — постарайся хотя бы не проебать его красиво.',
        'Рандом на твоей стороне, но он тоже немного бухой.',
        'К вечеру всё сложится, хотя сначала будет выглядеть как полный бардак.',
        'Звёзды советуют рискнуть: в худшем случае получится отличная история.',
        'Сегодня ты обаятелен настолько, что даже ошибки сойдут за стиль.',
        'Удача заглянет ненадолго — не заставляй её ждать у двери.',
        'План на день гениален, если не задавать ему лишних вопросов.',
        'Кто-то сегодня оценит тебя по достоинству. Возможно, это будешь ты сам.'
    ],
    sweet: [
        'Сегодня у тебя сюжетная броня: иди туда, куда обычно страшно нажимать.',
        'Твой день похож на редкий дроп: шанс небольшой, а радости будет много.',
        'Вселенная сегодня играет саппорта — не убегай от её баффов.',
        'Сегодня ты главный герой: побочные квесты подождут до вечера.',
        'Чашка чая и пара добрых слов сработают лучше любого зелья.',
        'День подарит маленькую победу — сохрани её в избранное.',
        'Твой уровень обаяния сегодня выше, чем у любого босса локации.',
        'Кто-то рядом давно хочет сказать тебе спасибо — дай ему шанс.'
    ],
    sarcastic: [
        'Звёзды обещают успех; удивительно, но даже без инструкции на три страницы.',
        'Сегодня можно быть гением, главное — не проверять это слишком тщательно.',
        'Судьба приготовила подарок. Чек внутри, как обычно, отсутствует.',
        'Звёзды верят в тебя. Звёзды вообще наивные.',
        'Сегодня всё пойдёт по плану. По чьему именно — уточнять не будем.',
        'Ты на верном пути. Правда, он почему-то идёт по кругу.',
        'Удача сегодня рядом: стоит прямо за спиной и молча осуждает.',
        'Великие дела начинаются с малого. Твои, похоже, на нём и закончатся — зато красиво.'
    ]
};

export function getSignByCode(code) {
    const item = SIGNS.find(s => s[1] === code);
    return item ? { name: item[0], code: item[1], icon: item[2] } : { name: 'Овен', code: 'aries', icon: '♈' };
}

export function getStyleByKey(key) {
    const item = STYLES.find(s => s[0] === key);
    return item ? { key: item[0], label: item[1] } : { key: 'cheeky', label: 'Ироничный' };
}

export function withSignPrefix(line, sign) {
    const prefix = `${sign.icon} ${sign.name}:`;
    const normalized = String(line || '').trim();
    if (normalized.startsWith(prefix)) return normalized;
    // Models sometimes start with another emoji (⚖️ for Libra) or no icon: drop any short lead-in before the sign name.
    const named = new RegExp(`^[^\\p{L}]{0,6}${sign.name}\\s*:\\s*`, 'iu');
    return `${prefix} ${normalized.replace(named, '').replace(/^[♈♉♊♋♌♍♎♏♐♑♒♓]\s*[^:]{1,20}:\s*/, '')}`;
}

function fallbacksFor(style, sign) {
    return (FALLBACKS[style] || FALLBACKS.cheeky).map((line) => `${sign.icon} ${sign.name}: ${line}`);
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

export async function generateShortHoroText(session, { avoid = '' } = {}) {
    const nick = session?.userChatData?.user?.username || await getUserName(session, 'nickname');
    const handle = nick && !/^\d+$/.test(String(nick)) ? `@${nick}` : (await getUserName(session, 'name')) || 'Путник';
    const { horoscope } = session;
    const sign = getSignByCode(horoscope?.sign || 'aries');
    const style = getStyleByKey(horoscope?.style || 'cheeky');
    const system = HORO_SYSTEM[style.key] || HORO_SYSTEM.cheeky;
    const user = HORO_USER({ signName: sign.name, signIcon: sign.icon });

    const generated = await generateFunnyLine({
        system,
        user,
        maxLength: 120,
        temperature: style.key === 'sweet' ? 0.7 : 0.85,
        fallbacks: fallbacksFor(style.key, sign),
        avoid
    });

    const line = withSignPrefix(generated, sign);
    return `${handle}, твой шуточный гороскоп:\n\n${line}`;
}

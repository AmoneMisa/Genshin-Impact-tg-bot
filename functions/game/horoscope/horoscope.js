import getUserName from "../../getters/getUserName.js";
import { generateFunnyLine } from '../../llm/freeLlmClient.js';

// One shared brief plus a tone with examples: without them models wrote broken Russian
// ("перфекционизм-зависимость забита") and odd comparisons.
const HORO_BASE = `
Ты автор шуточных гороскопов для игрового Telegram-чата друзей.
Пиши на живом, грамотном русском языке, как пишет остроумный носитель: без кальки с английского, без выдуманных слов и странных сравнений.
Одна-две фразы: узнаваемая ситуация из жизни читателя или этого чата и неожиданный поворот в конце.
Обращайся к читателю на «ты». Не упоминай астрологию и звёзды слишком часто. До 140 символов.`.trim();

const FORMAT_SIGN = 'Ответь только строкой формата "<ICON> <SIGN>: <текст>", без кавычек, пояснений и других эмодзи.';
const FORMAT_TEXT = 'Ответь только текстом предсказания: без знака зодиака, без кавычек, пояснений и эмодзи.';
/** Styles answered as plain text, without the "♍ Дева:" prefix. */
const PLAIN_STYLES = new Set(['sarcastic']);

const HORO_TONE = {
    superShort: `Тон: коротко и метко, до 70 символов.
Примеры тона:
Звёзды говорят «да». Вопрос выбери сам.
Лучший ход дня — тот, который ты сделаешь первым.`,
    cheeky: `Тон: дерзкий и ироничный, можно лёгкую грубость, но без оскорбления читателя.
Примеры тона:
Рандом на твоей стороне, но он тоже немного бухой.
Сегодня ты обаятелен настолько, что даже ошибки сойдут за стиль.`,
    sweet: `Тон: тёплый и добрый, с лёгкой отсылкой к играм.
Примеры тона:
Сегодня у тебя сюжетная броня: иди туда, куда обычно страшно нажимать.
Твой день похож на редкий дроп: шанс небольшой, а радости будет много.`,
    sarcastic: `Тон: злой дружеский сарказм, как подкол от старого друга. Начни как обычное доброе обещание, совет или предупреждение и обломай его в конце.
Главное правило: вторая часть переворачивает именно то, что обещано в первой, — тот же предмет и та же ситуация, а не новая тема. Шутка должна быть понятна сразу, без объяснений.
Плохо (концовка не связана с началом): Сегодня ты закроешь все свои долги и заживёшь как человек. Но нет, опять приснится хуйня.
Хорошо (переворот того же обещания): Сегодня ты наконец закроешь все свои долги! Новыми долгами.
Можно мат и прямые подколки самого читателя. Нельзя шутить про пол, национальность, здоровье, внешность по таким признакам и ориентацию. Знак зодиака не упоминай.
Примеры тона:
Сегодня ты будешь казаться уверенным и успешным человеком. Никто даже не поймёт, какое ты на самом деле ничтожество!
Перед выходом из дома не забудь посмотреться в зеркало! И да, именно это ебало видят все твои собеседники.
На этой неделе жди движения по карьерной лестнице! Не факт, что это что-то хорошее. Возможно, тебя просто спустят с неё нахуй в подвал.
Проведи вечер в приятной компании. Но только не с мудилами из этого чата!
Тебе будет казаться, что жизнь — какая-то череда пиздеца. Так и есть.`,
};

export const HORO_SYSTEM = Object.fromEntries(Object.entries(HORO_TONE).map(([key, tone]) => [key, `${HORO_BASE}\n${PLAIN_STYLES.has(key) ? FORMAT_TEXT : FORMAT_SIGN}\n${tone}`]));

const HORO_USER = ({ signName, signIcon }, plain = false) => plain
    ? 'Новое предсказание для читателя.'
    : `Новое предсказание для знака ${signName}. Начни строго с "${signIcon} ${signName}:".`;

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
        'Сегодня ты будешь казаться уверенным и успешным человеком. Никто даже не поймёт, какое ты на самом деле ничтожество!',
        'Перед выходом из дома не забудь посмотреться в зеркало! И да, именно это ебало видят все твои собеседники.',
        'Осторожно! Хитростями и уловками тебя будут заставлять работать!',
        'Тебе будет казаться, что жизнь — какая-то череда пиздеца. Так и есть.',
        'Просто постарайся продержаться этот день!..',
        'На этой неделе жди движения по карьерной лестнице! Не факт, что это что-то хорошее. Возможно, тебя просто спустят с неё нахуй в подвал.',
        'Проведи вечер в приятной компании. Но только не с мудилами из этого чата!!!',
        'На этой неделе у тебя появится шанс научиться чему-то новому! Но, как выяснится позже, нахуй ненужному.',
        'Последняя гифка, которую скидывали в этот чат, определит твоё ближайшее будущее.',
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
    const lines = FALLBACKS[style] || FALLBACKS.cheeky;
    return PLAIN_STYLES.has(style) ? [...lines] : lines.map((line) => `${sign.icon} ${sign.name}: ${line}`);
}

/** Plain styles drop any sign lead-in a model still adds. */
function withoutSign(line, sign) {
    return String(line || '').trim()
        .replace(new RegExp(`^[^\\p{L}]{0,6}${sign.name}\\s*:\\s*`, 'iu'), '')
        .replace(/^[♈♉♊♋♌♍♎♏♐♑♒♓]\s*[^:]{1,20}:\s*/, '');
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
    const plain = PLAIN_STYLES.has(style.key);
    const system = HORO_SYSTEM[style.key] || HORO_SYSTEM.cheeky;
    const user = HORO_USER({ signName: sign.name, signIcon: sign.icon }, plain);

    const generated = await generateFunnyLine({
        system,
        user,
        maxLength: 160,
        temperature: style.key === 'sweet' ? 0.8 : 0.9,
        fallbacks: fallbacksFor(style.key, sign),
        // The model writes five variants and keeps the most coherent and funny one.
        variants: 5,
        avoid
    });

    const line = plain ? withoutSign(generated, sign) : withSignPrefix(generated, sign);
    return `Предсказание для ${handle}:\n\n${line}`;
}

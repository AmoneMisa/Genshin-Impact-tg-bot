import ArenaRating from '../../../db/models/ArenaRating.js';

const START_RATING = 1000;
const MODES = new Set(['common', 'expansion']);

function id(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
}

function validateMode(mode) {
    if (!MODES.has(mode)) {
        throw new Error(`Неизвестный тип арены: ${mode}`);
    }
}

export function ratingScope(mode, chatId) {
    validateMode(mode);
    return mode === 'common'
        ? { mode: 'common', chatId: id(chatId) }
        : { mode: 'expansion' };
}

/**
 * Возвращает одну фактическую рейтинговую запись игрока.
 *
 * В старых импортированных данных expansion мог содержать chatId, хотя сама
 * мировая арена является глобальной. Для expansion ищем запись независимо от
 * chatId, а chatId в документе используем только как ссылку на чат, из которого
 * можно загрузить боевой профиль игрока.
 */
export async function getArenaRatingDoc(userId, mode, chatId, { create = true } = {}) {
    validateMode(mode);
    const numericUserId = id(userId);
    const query = mode === 'common'
        ? { userId: numericUserId, chatId: id(chatId), mode: 'common' }
        : { userId: numericUserId, mode: 'expansion' };

    let doc = await ArenaRating.findOne(query).sort({ updatedAt: -1, _id: -1 });
    if (!doc && create) {
        doc = await ArenaRating.create({
            userId: numericUserId,
            chatId: id(chatId),
            mode,
            rating: START_RATING,
        });
    } else if (doc && mode === 'expansion' && doc.chatId == null && chatId != null) {
        doc.chatId = id(chatId);
        await doc.save();
    }
    return doc;
}

/**
 * Возвращает рейтинг без дублей userId. Старые expansion-записи могли быть
 * продублированы по чатам; для таблиц/процентилей один игрок должен считаться
 * ровно один раз. Предпочитаем наиболее свежую запись.
 */
export async function getArenaRatingTable(mode, chatId) {
    validateMode(mode);
    const docs = await ArenaRating.find(ratingScope(mode, chatId)).sort({ updatedAt: -1, _id: -1 });
    const byUser = new Map();

    for (const doc of docs) {
        const key = String(doc.userId);
        if (!byUser.has(key)) byUser.set(key, doc);
    }

    return [...byUser.values()].sort((a, b) => Number(b.rating) - Number(a.rating));
}

export async function getArenaRatingSnapshot(userId, mode, chatId) {
    const doc = await getArenaRatingDoc(userId, mode, chatId);
    const table = await getArenaRatingTable(mode, chatId);
    const index = table.findIndex(item => String(item.userId) === String(userId));
    const total = Math.max(1, table.length);

    return {
        doc,
        rating: Number(doc.rating) || START_RATING,
        position: index >= 0 ? index + 1 : total,
        percentile: index >= 0 ? index / total : 1,
        total,
    };
}

/**
 * Атомарно меняет конкретную найденную запись. Это важно для legacy
 * expansion-данных: update по {userId, mode} мог случайно менять не ту запись.
 */
export async function adjustArenaRating(userId, mode, chatId, delta) {
    const doc = await getArenaRatingDoc(userId, mode, chatId);
    const updated = await ArenaRating.findByIdAndUpdate(
        doc._id,
        { $inc: { rating: Number(delta) || 0 } },
        { new: true }
    );
    return Number(updated?.rating) || START_RATING;
}

export { START_RATING };

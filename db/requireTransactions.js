/** Read-only startup check: reject unsupported databases before importing game data. */
export async function requireTransactions(db) {
    const hello = await db.admin().command({hello: 1});
    if (hello.setName || hello.msg === 'isdbgrid') return;
    const error = new Error('MongoDB запущена без replica set: сохранение игры невозможно. Запустите MongoDB с --replSet rs0, инициализируйте replica set и обновите MONGO_URL. Инструкция: docs/mongodb-replica-set.md');
    error.code = 'MONGO_TRANSACTIONS_REQUIRED';
    throw error;
}

import {forgetSync} from './characterSync.js';

export async function atomicChatSave(chat, options, save, startSession) {
    const previousSession = chat.$session();
    const suppliedSession = options.session || previousSession;
    if (suppliedSession?.inTransaction()) return save.call(chat, {...options,session:suppliedSession});
    const session = suppliedSession || await startSession();
    const revisions = chat.members.map(member => member.syncRev);
    const guests = (chat.$locals?.guests || []).map(guest => ({guest,rev:guest.syncRev,baseline:guest.__baseline}));
    try {
        session.startTransaction();
        const saved = await save.call(chat, {...options, session});
        await session.commitTransaction();
        return saved;
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        chat.members.forEach((member,index) => { member.syncRev = revisions[index];forgetSync(member); });
        guests.forEach(({guest,rev,baseline}) => {guest.syncRev=rev;guest.__baseline=baseline;});
        if (error.code === 20 && /Transaction numbers|replica set/i.test(error.message)) {
            error.status=503;error.reason='database_transactions_required';
            error.message='Для сохранения игры требуется MongoDB replica set. Обратитесь к администратору.';
        }
        if (error.code === 112 || error.name === 'VersionError' || error.hasErrorLabel?.('TransientTransactionError')) {
            error.status=409;error.reason='character_conflict';error.message='Character changed concurrently; refresh and retry the action';
        }
        throw error;
    } finally {chat.$session(previousSession || null);if (!suppliedSession) await session.endSession();}
}

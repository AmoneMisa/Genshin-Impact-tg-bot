export default async function saveSession(session) {
    const chat = session?.ownerDocument?.() || session?.parent?.();
    if (!chat?.save) {
        throw new Error('Cannot persist player session without its parent Chat document');
    }

    const index = chat.members.findIndex(member => member === session || String(member.userId) === String(session.userId));
    if (index < 0) {
        throw new Error(`Player ${session?.userId ?? 'unknown'} is missing from its parent Chat document`);
    }

    // `game` and several legacy feature fields are intentionally Mixed while
    // the old JSON model is being migrated. Mark the whole member dirty so
    // nested mutations are never lost by Mongoose change tracking.
    chat.markModified(`members.${index}`);
    await chat.save();
    return session;
}
